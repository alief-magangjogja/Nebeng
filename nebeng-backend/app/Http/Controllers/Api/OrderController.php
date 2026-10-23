<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Trip;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\RewardTransaction;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\DriverBalance;
use App\Models\BalanceTransaction;
use App\Events\NewOrderNotification;
use Illuminate\Support\Facades\Storage;
use App\Services\NotificationService;
use App\Services\OrderCancellationService;
use Carbon\Carbon;

class OrderController extends Controller
{
    // Method-method di bawah ini sekarang tinggal delegasi ke Order model
    // (Order::capacityWeight() / Order::wasCapacityReserved()) supaya
    // logikanya bisa dipakai bersama oleh controller ini DAN
    // OrderCancellationService/command auto-cancel trip (yang berjalan
    // di luar konteks controller ini).
    private function capacityWeightForOrder(Order $order): float
    {
        return $order->capacityWeight();
    }

    private function wasCapacityReserved(Order $order): bool
    {
        return $order->wasCapacityReserved();
    }

    public function store(Request $request)
    {
        $request->validate([
            'trip_id' => 'required|exists:trips,id',
            'pickup_address' => 'required|string',
            'drop_address' => 'required|string',
            'payment_method' => 'required|in:cash,qris,ewallet' 
        ]);

        if ($request->payment_method === 'cash' && $request->user()->late_cancel_count >= 3) {
            return response()->json([
                'message' => 'Karena riwayat pembatalan mendadak, akun Anda saat ini hanya bisa memesan dengan pembayaran QRIS.'
            ], 400);
        }

        $trip = Trip::findOrFail($request->trip_id);

        // WAJIB: kalau customer memilih bayar QRIS, mitra trip ini HARUS
        // sudah upload QRIS (statis, milik mitra sendiri - bukan
        // digenerate platform). Tanpa ini, order tetap bisa dibuat dengan
        // payment_method 'qris' walau qris_image mitra kosong, dan
        // customer baru sadar setelah sampai di halaman pembayaran (QRIS
        // kosong, tidak bisa bayar). Mitra tanpa QRIS tetap boleh
        // berjualan selama customer memilih cash/ewallet, jadi
        // pengecekan ini SENGAJA hanya berlaku untuk payment_method
        // 'qris', bukan mem-blokir trip-nya sama sekali.
        if ($request->payment_method === 'qris' && empty($trip->mitra?->profile?->qris_image)) {
            return response()->json([
                'message' => 'Mitra ini belum menyediakan QRIS. Silakan pilih metode pembayaran lain (Tunai).'
            ], 422);
        }    

        // PENTING: cancelOrder() tidak pernah mereset payment_status - jadi
        // order QRIS yang sudah dibayar lalu dibatalkan tetap payment_status
        // = 'paid' selamanya. Tanpa pengecualian status='cancelled' di sini,
        // customer PERMANEN tidak bisa pesan lagi di trip yang sama walau
        // pesanan sebelumnya sudah mereka batalkan sendiri.
        $existingOrder = Order::where('trip_id', $trip->id)
            ->where('customer_id', auth()->id())
            ->where('status', '!=', 'cancelled')
            ->where(function($query) {
                $query->where('payment_status', 'paid')
                      ->orWhere('payment_status', 'waiting_confirmation');
            })
            ->first();

        if ($existingOrder) {
            return response()->json([
                'message' => 'Anda sudah memiliki pesanan aktif pada trip ini. Tidak dapat membuat pesanan ganda.'
            ], 400);
        }

        if ($trip->seat_available <= 0) {
            return response()->json([
                'message' => 'Seat sudah habis'
            ], 400);
        }

        // Sama seperti di atas: order cash yang dibatalkan tetap
        // payment_status = 'unpaid' selamanya (cancelOrder tidak
        // mereset field ini), jadi tanpa pengecualian ini, order LAMA
        // yang sudah dibatalkan malah "dihidupkan kembali" alih-alih
        // membuat order baru yang bersih.
        $pendingOrder = Order::where('trip_id', $trip->id)
            ->where('customer_id', auth()->id())
            ->where('payment_status', 'unpaid')
            ->where('status', '!=', 'cancelled')
            ->first();

        if ($pendingOrder) {
            $pendingOrder->update([
                'pickup_address' => $request->pickup_address,
                'drop_address' => $request->drop_address,
                'payment_method' => $request->payment_method,
            ]);
            $order = $pendingOrder;
        } else {
            $order = Order::create([
                'trip_id' => $trip->id,
                'customer_id' => auth()->id(),
                'pickup_address' => $request->pickup_address,
                'drop_address' => $request->drop_address,
                'price' => $trip->price,
                'payment_method' => $request->payment_method, 
                'status' => 'pending',
                'payment_status' => 'unpaid'
            ]);
        }

        $order->load('trip', 'customer');

        return response()->json([
            'message' => 'Order berhasil dibuat, silakan lanjutkan pembayaran',
            'order' => $order,
        ]);
    }

    public function show($id)
    {
        $order = Order::with([
            'trip.originPoint.city',
            'trip.destinationPoint.city',
            'trip.mitra.profile',
            'customer'
        ])->findOrFail($id);

        if ($order->customer_id !== auth()->id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        return response()->json($order);
    }

        public function history(Request $request)
    {
        $user = $request->user();

        $orders = Order::with([
            'trip.originPoint.city',
            'trip.destinationPoint.city',
            'trip.mitra'
        ])
        ->where('customer_id', $user->id)
        ->latest()
        ->get();

        // Dipakai halaman Detail Pesanan customer (Pesanan.jsx) untuk
        // menyembunyikan/mengganti tombol "Berikan Penilaian" kalau
        // customer ini sudah pernah menilai mitra untuk trip tersebut.
        $reviewedTripIds = \App\Models\TripReview::where('customer_id', $user->id)
            ->where('type', 'customer_to_mitra')
            ->pluck('trip_id')
            ->all();

        $orders->each(function ($order) use ($reviewedTripIds) {
            $order->has_reviewed_mitra = in_array($order->trip_id, $reviewedTripIds);
        });

        return response()->json($orders);
    }

    // ================= CUSTOMER: RINGKASAN DASHBOARD (gabungan) =================
    // PENTING: route ini sudah lama didaftarkan di routes/api.php ("endpoint
    // gabungan khusus dashboard") tapi method-nya belum pernah dibuat, jadi
    // request ke /api/dashboard-summary SELALU gagal (fatal error). Dashboard
    // customer (src/pages/customer/Dashboard.jsx) memang sudah punya fallback
    // untuk kasus ini - begitu request ini gagal, dia otomatis fetch ulang ke
    // /api/reward-points + /api/orders/history secara terpisah - jadi datanya
    // tetap benar, hanya saja SETIAP kali dashboard dibuka jadi 1 request yang
    // pasti gagal (plus render halaman error) + 2 request susulan, alih-alih
    // cukup 1 request yang langsung sukses. Method di bawah ini mengembalikan
    // data dengan bentuk yang sama persis dengan gabungan kedua endpoint
    // tersebut (reward_points + 5 order terakhir beserta relasi trip yang
    // dipakai formatActivities() di frontend), supaya tampilan/hasil akhirnya
    // tidak berubah sama sekali - cuma tidak lewat jalur gagal+fallback lagi.
    public function dashboardSummary(Request $request)
    {
        $user = $request->user();

        $recentActivities = Order::with([
            'trip.originPoint.city',
            'trip.destinationPoint.city',
            'trip.mitra'
        ])
        ->where('customer_id', $user->id)
        ->latest()
        ->take(5)
        ->get();

        return response()->json([
            'reward_points' => $user->reward_points,
            'recent_activities' => $recentActivities,
        ]);
    }

    // ================= CUSTOMER: UPLOAD BUKTI PEMBAYARAN QRIS =================
    public function uploadPaymentProof(Request $request, $id)
    {
        $request->validate([
            'payment_proof' => 'required|image|max:4096',
        ]);

        $order = Order::with('trip.destinationPoint', 'itemOrder')->findOrFail($id);

        if ($order->customer_id !== auth()->id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        if ($order->payment_method === 'cash') {
            return response()->json([
                'message' => 'Order ini menggunakan pembayaran tunai, tidak perlu bukti pembayaran.'
            ], 400);
        }

        if ($order->payment_proof) {
            Storage::disk('public')->delete($order->payment_proof);
        }

        $path = $request->file('payment_proof')->store('payment_proofs', 'public');

        $order->update([
            'payment_proof' => $path,
            'payment_status' => 'waiting_confirmation',
            'status' => 'completed'
        ]);

        // Order barang: kapasitas SUDAH dikunci sejak order dibuat
        // (lihat ItemOrderController@store) - jangan dikurangi lagi di
        // sini, nanti dobel kurang.
        // Order penumpang: kursi baru dikunci di sini, seperti semula.
        $trip = $order->trip;
        if ($trip && !$order->item_order_id) {
            $amount = $this->capacityWeightForOrder($order);
            if ($trip->seat_available >= $amount) {
                $trip->decrement('seat_available', $amount);
            }
        }

        broadcast(new NewOrderNotification($order));

        NotificationService::send(
            $order->customer_id,
            'Pesanan Berhasil Dibuat',
            "Bukti pembayaran berhasil dikirim. Pesanan tebengan kamu ke {$order->trip->destinationPoint->pos_name} resmi dibuat. Total Rp" . number_format($order->price, 0, ',', '.') . '.',
            'order',
            "/customer/perjalanan/{$order->trip_id}"
        );

        NotificationService::send(
            $order->trip->mitra_id,
            'Perlu Konfirmasi Pembayaran',
            'Customer sudah upload bukti pembayaran QRIS. Cek dan konfirmasi di halaman perjalanan.',
            'payment',
            "/mitra/perjalanan/{$order->trip_id}"
        );

        $conversation = Conversation::firstOrCreate([
            'customer_id' => auth()->id(),
            'mitra_id' => $trip->mitra_id
        ]);

        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $trip->mitra_id,
            'message' => 'Halo 👋 pesanan trip #' . $order->id . ' bukti pembayaran sudah diupload. Menunggu konfirmasi.'
        ]);

        return response()->json([
            'message' => 'Bukti pembayaran berhasil dikirim. Menunggu konfirmasi mitra.',
            'order' => $order,
            'conversation_id' => $conversation->id
        ]);
    }

    // ================= MITRA: KONFIRMASI PEMBAYARAN SUDAH DITERIMA =================
    public function confirmPayment($id)
    {
        $order = Order::with('trip', 'itemOrder')->findOrFail($id);

        if (!$order->trip || $order->trip->mitra_id !== auth()->id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        if ($order->payment_status === 'paid') {
            return response()->json([
                'message' => 'Pembayaran order ini sudah dikonfirmasi sebelumnya.'
            ], 400);
        }

        if ($order->payment_method !== 'cash' && !$order->payment_proof) {
            return response()->json([
                'message' => 'Customer belum mengupload bukti pembayaran.'
            ], 400);
        }

        $order->update(['payment_status' => 'paid']);

        if ($order->payment_method === 'cash' && $order->status !== 'completed') {
            $order->update(['status' => 'completed']);

            // Order barang: kapasitas SUDAH dikunci sejak order dibuat -
            // tombol "Konfirmasi Tunai Diterima" sekarang murni soal
            // pencatatan pendapatan, tidak lagi menyentuh kapasitas.
            // Kalau mitra klik ini sebelum uang benar-benar diterima,
            // dampaknya cuma salah catat pendapatan (bisa dikoreksi),
            // bukan merusak data kapasitas trip.
            // Order penumpang: kursi baru dikunci di sini, seperti semula.
            if (!$order->item_order_id) {
                $amount = $this->capacityWeightForOrder($order);
                if ($order->trip->seat_available >= $amount) {
                    $order->trip->decrement('seat_available', $amount);
                }
            }

            broadcast(new NewOrderNotification($order));
        }

        $mitraId = $order->trip->mitra_id;

        $balance = DriverBalance::firstOrCreate(
            ['user_id' => $mitraId],
            ['balance' => 0]
        );

        $balance->increment('balance', $order->price);

        BalanceTransaction::create([
            'user_id' => $mitraId,
            'order_id' => $order->id,
            'type' => 'credit',
            'amount' => $order->price,
            'description' => 'Pendapatan dari order #' . $order->id . ' (Terkonfirmasi)'
        ]);

        NotificationService::send(
            $order->customer_id,
            'Pembayaran Dikonfirmasi',
            'Mitra telah mengonfirmasi pembayaran kamu. Lanjutkan ke halaman perjalanan.',
            'payment',
            "/customer/perjalanan/{$order->trip_id}"
        );

        NotificationService::send(
            $mitraId,
            'Pendapatan Bertambah',
            'Rp' . number_format($order->price, 0, ',', '.') . " masuk ke pendapatan kamu dari order #{$order->id}.",
            'payment',
            "/mitra/riwayat-saldo"
        );

        return response()->json([
            'message' => 'Pembayaran berhasil dikonfirmasi.',
            'order' => $order,
        ]);
    }

    public function markAsNoShow(Request $request, $id)
    {
        try {
            $order = \App\Models\Order::with('trip')->findOrFail($id);

            // WAJIB: pastikan order ini berada di trip milik mitra yang
            // sedang login. Tanpa ini, mitra manapun bisa menandai order
            // di trip milik MITRA LAIN sebagai tidak hadir.
            if (!$order->trip || $order->trip->mitra_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $order->update([
                'readiness_status' => 'no_show',
            ]);

            \App\Models\OrderQrSession::where('order_id', $id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Customer berhasil ditandai tidak hadir. Anda dapat melanjutkan perjalanan.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses permintaan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function cancelOrder(Request $request, $id)
    {
        $order = Order::with('trip', 'itemOrder')->findOrFail($id);

        // WAJIB: pastikan order ini benar-benar milik customer yang sedang
        // login. Tanpa ini, customer manapun bisa membatalkan pesanan
        // customer LAIN hanya dengan menebak/mengetahui order id.
        if ($order->customer_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // WAJIB: tolak kalau order ini sudah pernah dibatalkan sebelumnya.
        // Sejak kapasitas order barang dikunci saat booking (bukan lagi
        // saat status 'completed'), guard ini penting supaya pembatalan
        // yang somehow terpanggil dua kali tidak mengembalikan kapasitas
        // dua kali juga (double-refund).
        if ($order->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan ini sudah dibatalkan sebelumnya.'
            ], 400);
        }

        // simpan dulu sebelum status order diubah — untuk tahu apakah
        // kapasitas/kursi sudah sempat "terpakai" dan perlu dikembalikan
        $wasSeatReserved = $this->wasCapacityReserved($order);
        
        $departureTime = Carbon::parse($order->trip->departure_date . ' ' . $order->trip->departure_time);
        $now = Carbon::now();
        $hoursDifference = $now->diffInHours($departureTime, false);

        if ($hoursDifference < 0) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan sudah tidak dapat dibatalkan karena waktu keberangkatan telah tiba/lewat.'
            ], 400);
        }

        // ================= PEMBAYARAN TUNAI =================
        if ($order->payment_method === 'cash') {

            $isLateCancel = $hoursDifference < 3;

            $order->update([
                'status' => 'cancelled',
                'refund_status' => 'not_applicable',
                'penalty_amount' => $isLateCancel ? (int) round($order->price * 0.2) : 0,
                'cancelled_at' => $now,
            ]);

            // KEMBALIKAN KURSI/KAPASITAS kalau sebelumnya sudah terpakai
            if ($wasSeatReserved && $order->trip) {
                $amount = $this->capacityWeightForOrder($order);
                $order->trip->increment('seat_available', $amount);
            }

            \App\Models\OrderQrSession::where('order_id', $id)->delete();

            if ($isLateCancel) {
                $customer = User::find($order->customer_id);
                $message = 'Pesanan tunai dibatalkan. Karena dilakukan kurang dari 3 jam sebelum keberangkatan, ini tercatat sebagai pembatalan mendadak.';

                if ($customer) {
                    $customer->increment('late_cancel_count');
                    $customer->refresh();

                    if ($customer->late_cancel_count >= 5) {
                        $customer->update(['status' => 'blocked']);
                        $message = 'Pesanan tunai dibatalkan. Karena riwayat pembatalan mendadak sudah berulang kali, akun Anda telah disuspend. Silakan hubungi admin untuk informasi lebih lanjut.';
                    } elseif ($customer->late_cancel_count >= 3) {
                        $message = 'Pesanan tunai dibatalkan. Karena riwayat pembatalan mendadak, akun Anda sekarang wajib menggunakan QRIS untuk pesanan berikutnya.';
                    }
                }

                return response()->json([
                    'success' => true,
                    'rule' => 'cash_late_cancel_penalty',
                    'message' => $message,
                ], 200);
            }

            return response()->json([
                'success' => true,
                'rule' => 'cash_cancelled',
                'message' => 'Pesanan tunai berhasil dibatalkan.'
            ], 200);
        }

        // ================= PEMBAYARAN QRIS (Sistem Bertingkat) =================
        if ($hoursDifference >= 12) {
            $percentage = 100;
            $rule = 'refund_100';
            $refundStatus = 'pending_100_percent';
            $message = 'Pembatalan berhasil. Anda berhak mendapatkan refund 100% karena dibatalkan lebih dari 12 jam sebelum keberangkatan. Segera hubungi mitra lewat menu Pesan untuk memberikan nomor rekening/e-wallet Anda, lalu konfirmasi di halaman Pesanan setelah dana diterima.';
        } elseif ($hoursDifference >= 3) {
            $percentage = 50;
            $rule = 'refund_50';
            $refundStatus = 'pending_50_percent';
            $message = 'Pembatalan berhasil. Anda berhak mendapatkan refund 50% karena dibatalkan 3-12 jam sebelum keberangkatan. Segera hubungi mitra lewat menu Pesan untuk memberikan nomor rekening/e-wallet Anda, lalu konfirmasi di halaman Pesanan setelah dana diterima.';
        } else {
            $percentage = 0;
            $rule = 'no_refund';
            $refundStatus = 'non_refundable';
            $message = 'Pembatalan berhasil. Karena dilakukan kurang dari 3 jam sebelum keberangkatan, dana QRIS dinyatakan hangus dan tidak ada refund.';
        }

        $refundAmount = (int) round($order->price * $percentage / 100);

        if ($order->payment_status === 'paid' && $refundAmount > 0) {
            $mitraId = $order->trip->mitra_id;

            $balance = DriverBalance::firstOrCreate(
                ['user_id' => $mitraId],
                ['balance' => 0]
            );
            $balance->decrement('balance', $refundAmount);

            BalanceTransaction::create([
                'user_id' => $mitraId,
                'order_id' => $order->id,
                'type' => 'debit',
                'amount' => $refundAmount,
                'description' => "Potongan saldo untuk refund {$percentage}% pembatalan order #{$order->id}",
            ]);
        }

        $order->update([
            'status' => 'cancelled',
            'refund_status' => $refundStatus,
            'refund_percentage' => $percentage,
            'refund_amount' => $refundAmount,
            'cancelled_at' => $now,
        ]);

        // KEMBALIKAN KURSI/KAPASITAS kalau sebelumnya sudah terpakai
        if ($wasSeatReserved && $order->trip) {
            $amount = $this->capacityWeightForOrder($order);
            $order->trip->increment('seat_available', $amount);
        }

        \App\Models\OrderQrSession::where('order_id', $id)->delete();

        return response()->json([
            'success' => true,
            'rule' => $rule,
            'refund_percentage' => $percentage,
            'refund_amount' => $refundAmount,
            'message' => $message,
        ], 200);
    }

    // ================= CUSTOMER: DAFTARKAN REKENING/E-WALLET TUJUAN REFUND =================
    // Sebelumnya nomor rekening/e-wallet tujuan cuma disampaikan lewat
    // chat manual ke mitra - tidak pernah tersimpan di sistem. Ini bikin
    // mitra gampang beralasan "tidak tahu rekeningnya", dan admin tidak
    // punya data apa pun untuk dicocokkan kalau terjadi sengketa.
    // Endpoint ini menyimpannya secara resmi DAN langsung memberi tahu
    // mitra, supaya tidak ada lagi ketergantungan pada chat untuk info
    // sepenting ini.
    public function setRefundDestination(Request $request, $id)
    {
        $request->validate([
            'refund_destination' => 'required|string|min:5|max:150',
        ], [
            'refund_destination.required' => 'Nomor rekening/e-wallet tujuan wajib diisi.',
            'refund_destination.min' => 'Mohon isi selengkap mungkin (nama bank/e-wallet, nomor, dan nama pemilik).',
        ]);

        $order = Order::with('trip')->findOrFail($id);

        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($order->payment_method !== 'qris' || !in_array($order->refund_status, ['pending_100_percent', 'pending_50_percent', 'mitra_claimed', 'disputed'])) {
            return response()->json([
                'message' => 'Order ini tidak sedang dalam proses refund QRIS.'
            ], 400);
        }

        $order->update([
            'refund_destination' => $request->refund_destination,
            'refund_destination_set_at' => now(),
        ]);

        if ($order->trip && $order->trip->mitra_id) {
            NotificationService::send(
                $order->trip->mitra_id,
                'Customer Mengisi Rekening Tujuan Refund',
                "Customer sudah mendaftarkan rekening/e-wallet tujuan untuk refund order #{$order->id}. Cek detailnya di halaman Riwayat sebelum transfer.",
                'order',
                '/mitra/riwayat'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Rekening/e-wallet tujuan berhasil disimpan dan mitra sudah diberi tahu.',
            'order' => $order->fresh(),
        ], 200);
    }

    // ================= MITRA: KLAIM SUDAH TRANSFER REFUND =================
        // ================= MITRA: KLAIM SUDAH TRANSFER REFUND =================
    // WAJIB lampirkan bukti transfer (screenshot m-banking/e-wallet/QRIS) -
    // tanpa ini customer tidak punya dasar apa pun untuk memverifikasi
    // klaim sepihak mitra "sudah transfer".
    public function mitraConfirmRefund(Request $request, $id)
    {
        $request->validate([
            'refund_proof' => 'required|image|max:4096',
            // WAJIB: nomor referensi/ID transaksi yang tertera di struk
            // transfer (bank/e-wallet apa pun selalu punya ini). Foto
            // saja gampang disalahartikan atau dipotong sebagian - nomor
            // referensi ini yang bisa dicocokkan admin dengan mutasi
            // rekening kalau terjadi sengketa, bukan cuma percaya visual.
            'refund_reference' => 'required|string|min:4|max:100',
        ], [
            'refund_proof.required' => 'Bukti transfer refund wajib dilampirkan (screenshot m-banking/e-wallet/QRIS).',
            'refund_proof.image' => 'Bukti transfer refund harus berupa gambar.',
            'refund_reference.required' => 'Nomor referensi/ID transaksi wajib diisi (lihat di struk transfer Anda).',
            'refund_reference.min' => 'Nomor referensi terlalu pendek, pastikan Anda menyalin nomor yang benar dari struk transfer.',
        ]);

        $order = Order::with('trip')->findOrFail($id);

        if ($order->trip->mitra_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // WAJIB: sebelumnya cuma order berstatus pending_100_percent/
        // pending_50_percent yang boleh dikonfirmasi - begitu customer
        // melapor (refund_status jadi 'disputed'), mitra terjebak tanpa
        // jalan keluar apa pun di aplikasi selain menunggu admin
        // "Refund Selesai" atau "Blokir Mitra". Sekarang mitra tetap
        // boleh upload ULANG bukti transfer selama disputed, supaya ada
        // jalan keluar konkret (transfer ulang/lampirkan bukti yang
        // benar) tanpa perlu chat manual di luar sistem.
        $isReupload = $order->refund_status === 'disputed';

        if (!in_array($order->refund_status, ['pending_100_percent', 'pending_50_percent', 'disputed'])) {
            return response()->json([
                'message' => 'Order ini tidak sedang menunggu konfirmasi refund dari Anda.'
            ], 400);
        }

        if ($order->refund_proof) {
            Storage::disk('public')->delete($order->refund_proof);
        }

        $path = $request->file('refund_proof')->store('refund_proofs', 'public');

        $order->update([
            'refund_status' => 'mitra_claimed',
            'mitra_refund_confirmed_at' => now(),
            'refund_proof' => $path,
            'refund_reference' => $request->refund_reference,
        ]);

        // Kalau ini upload ulang dari status disputed, buka lagi
        // laporan customer supaya admin tahu ada bukti baru yang perlu
        // ditinjau - laporan lama jangan dibiarkan "resolved"/"reviewed"
        // begitu saja padahal buktinya baru saja berubah.
        if ($isReupload) {
            $complaint = \App\Models\OrderComplaint::where('order_id', $order->id)->first();

            if ($complaint) {
                $complaint->update([
                    'status' => 'pending',
                ]);
            }

            $adminIds = User::where('role', 'admin')->pluck('id')->toArray();

            NotificationService::sendToMany(
                $adminIds,
                'Mitra Upload Ulang Bukti Refund',
                "Mitra melampirkan bukti transfer baru untuk order #{$order->id} yang sebelumnya disengketakan. Perlu ditinjau ulang.",
                'order',
                '/admin/refund'
            );
        }

        if ($order->customer_id) {
            NotificationService::send(
                $order->customer_id,
                $isReupload ? 'Mitra Melampirkan Bukti Transfer Baru' : 'Mitra Mengklaim Sudah Refund',
                ($isReupload
                    ? 'Mitra mengunggah ulang bukti transfer refund untuk pesanan yang Anda laporkan sebelumnya. '
                    : 'Mitra sudah mentransfer refund ') . 'Rp' . number_format((float) $order->refund_amount, 0, ',', '.') . ' dan melampirkan bukti transfer. Cek dan konfirmasi di halaman Pesanan Anda.',
                'order',
                "/customer/pesanan/{$order->id}"
            );
        }

        return response()->json([
            'success' => true,
            'message' => $isReupload
                ? 'Bukti transfer baru berhasil dikirim. Admin dan customer sudah diberi tahu untuk meninjau ulang.'
                : 'Konfirmasi transfer refund & bukti berhasil dikirim. Menunggu konfirmasi penerimaan dari customer sebelum trip ini dianggap benar-benar tuntas.',
            'order' => $order->fresh(),
        ], 200);
    }

    // ================= CUSTOMER: KONFIRMASI DANA DITERIMA =================
    public function customerConfirmRefund(Request $request, $id)
    {
        $order = Order::with('trip')->findOrFail($id);

        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($order->refund_status !== 'mitra_claimed') {
            return response()->json([
                'message' => 'Belum ada klaim transfer refund dari mitra untuk order ini.'
            ], 400);
        }

        $order->update([
            'refund_status' => 'refunded',
            'customer_refund_confirmed_at' => now(),
        ]);

        // Kalau trip induk order ini sempat "mengambang" di
        // cancelled_pending_refund gara-gara order ini, cek apakah semua
        // order lain di trip yang sama sudah tuntas juga - kalau iya,
        // trip baru sekarang benar-benar dianggap 'cancelled'.
        OrderCancellationService::finalizeTripIfSettled($order->trip);

        return response()->json([
            'success' => true,
            'message' => 'Terima kasih sudah konfirmasi. Refund untuk order ini dinyatakan selesai.',
            'order' => $order->fresh(),
        ], 200);
    }
}