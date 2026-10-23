<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderComplaint;
use App\Models\MitraViolation;
use App\Models\CustomerViolation;
use App\Models\User;
use App\Services\OrderCancellationService;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class OrderComplaintController extends Controller
{
    // Batas pelanggaran (strike/teguran, sudah disatukan jadi satu angka)
    // sebelum mitra otomatis disuspend. Dulu teguran komplain punya batas
    // sendiri (3) terpisah dari strike keterlambatan (5) - sekarang
    // KEDUANYA sama-sama menambah kolom users.mitra_strike_count dan
    // sama-sama tunduk ke SATU batas ini, supaya "berapa kali lagi
    // sebelum diblokir" jadi satu angka yang konsisten di mana pun
    // ditampilkan (halaman Teguran mitra, kartu komplain admin, dll).
    //
    // Batas yang SAMA ini juga dipakai untuk strike customer
    // (users.customer_strike_count) saat laporan customer ditolak admin
    // karena bukti tidak valid - lihat case 'reject_complaint' di bawah.
    private const MAX_WARNINGS = 5;

    // ================= CUSTOMER: AJUKAN LAPORAN =================
    public function store(Request $request, $orderId)
    {
        $request->validate([
            'description' => 'required|string|min:10|max:1000',
            // Opsional secara umum, tapi WAJIB untuk kasus mitra_claimed -
            // lihat pengecekan di bawah.
            'customer_proof' => 'nullable|image|max:4096',
        ], [
            'customer_proof.image' => 'Bukti pendukung harus berupa gambar.',
        ]);

        $order = Order::with('trip')->findOrFail($orderId);

        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Order boleh dilaporkan pada 2 kondisi:
        // 1. Sudah lewat waktu wajar tapi mitra belum juga transfer (status masih pending_X_percent)
        // 2. Mitra KLAIM sudah transfer (mitra_claimed), tapi customer merasa belum menerima dana
        if ($order->status !== 'cancelled' || $order->payment_method !== 'qris' || !in_array($order->refund_status, ['pending_100_percent', 'pending_50_percent', 'mitra_claimed'])) {
            return response()->json([
                'message' => 'Order ini tidak memenuhi syarat untuk dilaporkan (bukan pembatalan QRIS yang berhak refund, atau refund sudah selesai).'
            ], 400);
        }

        // WAJIB: bukti pendukung dari customer sendiri (mis. screenshot
        // mutasi rekening/e-wallet yang menunjukkan dana belum masuk)
        // KHUSUS kalau mitra SUDAH mengklaim transfer dengan bukti
        // (mitra_claimed) - ini kasus paling rawan konflik "dia bilang
        // sudah, saya bilang belum", jadi beban pembuktian tidak boleh
        // sepihak ke mitra saja. Kalau order masih menunggu mitra
        // transfer sama sekali (pending_X_percent), belum ada klaim
        // apa pun yang perlu dibantah, jadi bukti tidak diwajibkan di
        // sini.
        if ($order->refund_status === 'mitra_claimed' && !$request->hasFile('customer_proof')) {
            return response()->json([
                'message' => 'Mitra sudah mengklaim transfer disertai bukti. Lampirkan bukti pendukung Anda (mis. screenshot mutasi rekening/e-wallet yang menunjukkan dana belum masuk) supaya laporan ini bisa ditinjau adil oleh Admin.'
            ], 422);
        }

        $existing = OrderComplaint::where('order_id', $order->id)->first();
        if ($existing) {
            // WAJIB: baris order_complaints ini BISA JADI dibuat OTOMATIS
            // oleh sistem (ProcessOverdueRefunds, type 'refund_overdue_auto')
            // saat mitra terlambat transfer >24 jam - BUKAN customer yang
            // melapor. Kalau tetap dibilang "Anda sudah pernah melaporkan",
            // itu janggal dan salah kaprah karena customer belum pernah
            // menekan tombol Laporkan sama sekali. Bedakan pesannya sesuai
            // asal baris ini supaya customer tidak dikira berbohong/lupa.
            $message = $existing->type === 'refund_overdue_auto'
                ? 'Kasus ini sudah otomatis diteruskan sistem ke Admin karena mitra terlambat transfer refund lebih dari 24 jam. Anda belum perlu melapor manual - cukup tunggu, status akan diperbarui di halaman ini.'
                : 'Anda sudah pernah melaporkan order ini sebelumnya. Silakan tunggu admin menindaklanjuti.';

            return response()->json([
                'message' => $message,
                'complaint' => $existing,
            ], 409);
        }

        $proofPath = $request->hasFile('customer_proof')
            ? $request->file('customer_proof')->store('complaint_proofs', 'public')
            : null;

        $complaint = OrderComplaint::create([
            'order_id' => $order->id,
            'customer_id' => $request->user()->id,
            'mitra_id' => $order->trip->mitra_id,
            'type' => 'refund_not_received',
            'description' => $request->description,
            'customer_proof' => $proofPath,
            'status' => 'pending',
        ]);

        // Tandai order sebagai "disputed" supaya langsung terlihat di dashboard
        // admin sebagai kasus yang butuh perhatian - terutama kasus rawan
        // konflik: mitra sudah klaim transfer, tapi customer bilang belum terima.
        $order->update(['refund_status' => 'disputed']);

        return response()->json([
            'success' => true,
            'message' => 'Laporan berhasil dikirim. Admin akan segera meninjau dan menindaklanjuti.',
            'complaint' => $complaint,
        ], 201);
    }

    // ================= CUSTOMER: CEK STATUS LAPORAN UNTUK 1 ORDER =================
    public function show(Request $request, $orderId)
    {
        $complaint = OrderComplaint::where('order_id', $orderId)
            ->where('customer_id', $request->user()->id)
            ->first();

        return response()->json($complaint ?: null, 200);
    }

    // ================= ADMIN: DAFTAR SEMUA LAPORAN =================
    public function adminIndex()
    {
        $complaints = OrderComplaint::with([
            'order' => function ($q) {
                $q->select('id', 'customer_id', 'trip_id', 'status', 'price', 'payment_method', 'refund_status', 'cancelled_at', 'refund_destination', 'refund_reference', 'refund_proof', 'mitra_refund_confirmed_at');
            },
            'customer:id,name,phone,avatar',
            'mitra:id,name,phone,avatar,mitra_strike_count'
        ])
        ->latest()
        ->get();

        // Lampirkan jumlah pelanggaran AKTIF milik masing-masing mitra -
        // sekarang langsung baca dari users.mitra_strike_count (satu
        // sumber gabungan strike+teguran), bukan hitung ulang dari
        // riwayat komplain seperti sebelumnya.
        $complaints->each(function ($complaint) {
            $complaint->mitra_warning_count = $complaint->mitra->mitra_strike_count ?? 0;
            $complaint->mitra_warning_max = self::MAX_WARNINGS;
        });

        return response()->json($complaints);
    }

    // ================= ADMIN: AMBIL TINDAKAN =================
    public function adminAct(Request $request, $id)
    {
        $request->validate([
            'action' => 'required|in:warn,block_mitra,mark_refund_done,reject_complaint',
            'admin_notes' => $request->action === 'reject_complaint' ? 'required|string|max:1000' : 'nullable|string|max:1000',
        ], [
            'admin_notes.required' => 'Alasan penolakan wajib diisi kalau menolak laporan customer.',
        ]);

        $complaint = OrderComplaint::with('order.trip', 'customer', 'mitra')->findOrFail($id);

        switch ($request->action) {
            case 'warn':
                if (!$complaint->mitra) {
                    return response()->json(['message' => 'Data mitra pada komplain ini tidak ditemukan.'], 400);
                }

                $currentCount = $complaint->mitra->mitra_strike_count ?? 0;

                if ($currentCount >= self::MAX_WARNINGS) {
                    return response()->json([
                        'message' => 'Mitra ini sudah mencapai batas maksimal ' . self::MAX_WARNINGS . ' pelanggaran. Gunakan aksi "Blokir Mitra" alih-alih menegur lagi.'
                    ], 400);
                }

                $complaint->update([
                    'status' => 'reviewed',
                    'admin_action' => 'warned_mitra',
                    'admin_notes' => $request->admin_notes,
                ]);

                // Teguran komplain sekarang menambah COUNTER YANG SAMA
                // dengan strike keterlambatan/pembatalan mendadak - lihat
                // komentar MAX_WARNINGS di atas.
                $complaint->mitra->increment('mitra_strike_count');
                $complaint->mitra->refresh();

                $newCount = $complaint->mitra->mitra_strike_count;
                $autoBlocked = false;

                // Catat ke log pelanggaran terpadu supaya mitra bisa lihat
                // teguran ini di halaman "Teguran" miliknya bersebelahan
                // dengan riwayat keterlambatan/pembatalan.
                MitraViolation::create([
                    'user_id' => $complaint->mitra_id,
                    'type' => 'komplain',
                    'reason' => $request->admin_notes ?: 'Teguran terkait keluhan customer tentang proses refund.',
                ]);

                // Begitu pelanggaran ke-N (batas maksimal) tercapai, mitra
                // otomatis disuspend - admin tidak perlu klik "Blokir Mitra"
                // secara terpisah lagi.
                if ($newCount >= self::MAX_WARNINGS) {
                    $complaint->mitra->update(['status' => 'blocked']);
                    $autoBlocked = true;
                }

                NotificationService::send(
                    $complaint->mitra_id,
                    $autoBlocked ? 'Akun Anda Disuspend' : 'Anda Mendapat Teguran',
                    $autoBlocked
                        ? "Anda sudah menerima {$newCount} dari " . self::MAX_WARNINGS . " pelanggaran (termasuk teguran komplain) karena keluhan customer terkait refund. Akun Anda otomatis disuspend. Hubungi admin untuk informasi lebih lanjut."
                        : "Anda mendapat teguran ({$newCount}/" . self::MAX_WARNINGS . ") dari admin terkait keluhan customer" . ($request->admin_notes ? ": {$request->admin_notes}" : ' soal proses refund.') . " Pelanggaran berikutnya (termasuk keterlambatan/pembatalan trip) dapat menyebabkan akun disuspend.",
                    'warning',
                    '/mitra/teguran'
                );

                $message = $autoBlocked
                    ? "Teguran dicatat, dan mitra otomatis disuspend karena sudah mencapai batas " . self::MAX_WARNINGS . " pelanggaran ({$newCount}/" . self::MAX_WARNINGS . ")."
                    : "Teguran berhasil dicatat untuk mitra ({$newCount}/" . self::MAX_WARNINGS . " pelanggaran).";
                break;

            case 'block_mitra':
                if ($complaint->mitra) {
                    $complaint->mitra->update(['status' => 'blocked']);

                    NotificationService::send(
                        $complaint->mitra_id,
                        'Akun Anda Diblokir',
                        'Akun Anda diblokir oleh admin terkait laporan customer. Hubungi admin untuk informasi lebih lanjut.',
                        'warning'
                    );
                }
                $complaint->update([
                    'status' => 'resolved',
                    'admin_action' => 'blocked_mitra',
                    'admin_notes' => $request->admin_notes,
                ]);
                $message = 'Mitra berhasil diblokir.';
                break;

            case 'mark_refund_done':
                if ($complaint->order) {
                    $complaint->order->update(['refund_status' => 'refunded']);
                    OrderCancellationService::finalizeTripIfSettled($complaint->order->trip);
                }
                $complaint->update([
                    'status' => 'resolved',
                    'admin_action' => 'marked_refund_done',
                    'admin_notes' => $request->admin_notes,
                ]);
                $message = 'Refund ditandai sudah selesai diproses.';
                break;

            case 'reject_complaint':
                if (!$complaint->order) {
                    return response()->json(['message' => 'Data order pada komplain ini tidak ditemukan.'], 400);
                }

                // Klaim mitra dianggap SAH - kembalikan refund_status ke
                // mitra_claimed supaya customer tetap bisa konfirmasi/lapor
                // ulang lewat jalur normal, TANPA mitra perlu upload ulang
                // bukti dari nol. Mitra tidak kena penalti sama sekali di
                // jalur ini.
                $complaint->order->update(['refund_status' => 'mitra_claimed']);

                $complaint->update([
                    'status' => 'resolved',
                    'admin_action' => 'rejected_complaint',
                    'admin_notes' => $request->admin_notes,
                ]);

                $newCustomerCount = 0;
                $customerAutoBlocked = false;
                $customer = $complaint->customer;

                if ($customer) {
                    // Strike customer SAMA POLA dengan mitra_strike_count -
                    // supaya customer yang berulang kali mengajukan laporan
                    // dengan bukti tidak valid akhirnya kena konsekuensi
                    // nyata, bukan cuma ditolak tanpa efek apa pun.
                    $customer->increment('customer_strike_count');
                    $customer->refresh();

                    CustomerViolation::create([
                        'user_id' => $customer->id,
                        'type' => 'laporan_palsu',
                        'reason' => $request->admin_notes,
                    ]);

                    $newCustomerCount = $customer->customer_strike_count;

                    if ($newCustomerCount >= self::MAX_WARNINGS) {
                        $customer->update(['status' => 'blocked']);
                        $customerAutoBlocked = true;
                    }

                    NotificationService::send(
                        $customer->id,
                        $customerAutoBlocked ? 'Akun Anda Disuspend' : 'Laporan Anda Ditolak Admin',
                        $customerAutoBlocked
                            ? "Laporan Anda ditolak karena bukti dianggap tidak valid ({$request->admin_notes}). Ini adalah pelanggaran ke-{$newCustomerCount} dari " . self::MAX_WARNINGS . ", akun Anda otomatis disuspend. Hubungi admin untuk informasi lebih lanjut."
                            : "Laporan Anda untuk order #{$complaint->order_id} ditolak admin: {$request->admin_notes}. Klaim transfer mitra dianggap sah. Ini pelanggaran ke-{$newCustomerCount} dari " . self::MAX_WARNINGS . " - laporan berikutnya dengan bukti tidak valid dapat menyebabkan akun disuspend.",
                        'warning',
                        "/customer/pesanan/{$complaint->order_id}"
                    );
                }

                if ($complaint->order->trip && $complaint->order->trip->mitra_id) {
                    NotificationService::send(
                        $complaint->order->trip->mitra_id,
                        'Laporan Customer Ditolak Admin',
                        "Admin menolak laporan customer untuk order #{$complaint->order_id} - klaim transfer Anda dianggap sah. Tunggu konfirmasi customer di halaman Pesanan.",
                        'order',
                        "/mitra/riwayat"
                    );
                }

                $message = "Laporan ditolak. Status order dikembalikan ke 'mitra_claimed'" . ($customer ? ", customer mendapat strike ({$newCustomerCount}/" . self::MAX_WARNINGS . ")" . ($customerAutoBlocked ? ' dan otomatis disuspend.' : '.') : '.');
                break;
        }

        $freshComplaint = $complaint->fresh(['order', 'customer', 'mitra']);
        $freshComplaint->mitra_warning_count = $freshComplaint->mitra->mitra_strike_count ?? 0;
        $freshComplaint->mitra_warning_max = self::MAX_WARNINGS;

        return response()->json([
            'success' => true,
            'message' => $message,
            'complaint' => $freshComplaint,
        ], 200);
    }

    // ================= ADMIN: PANTAUAN TRANSPARAN SEMUA REFUND =================
    // Menampilkan SEMUA order yang refund-nya masih berjalan (belum tuntas),
    // baik yang sudah dilaporkan formal maupun belum, supaya admin bisa
    // memantau proaktif - bukan cuma menunggu ada laporan masuk.
    public function adminRefundOverview()
    {
        $orders = Order::select([
            'id', 'customer_id', 'trip_id', 'status', 'price',
            'payment_method', 'payment_status', 'refund_status',
            'refund_proof', 'refund_amount', 'refund_destination',
            'refund_reference', 'mitra_refund_confirmed_at',
            'cancelled_at', 'created_at'
        ])
        ->with([
            'customer:id,name,phone,avatar',
            'trip' => function ($q) {
                $q->select('id', 'mitra_id', 'vehicle_type', 'departure_date', 'departure_time');
            },
            'trip.mitra:id,name,phone,avatar'
        ])
        ->whereIn('refund_status', ['pending_100_percent', 'pending_50_percent', 'mitra_claimed', 'disputed'])
        ->latest('cancelled_at')
        ->get();

        return response()->json($orders);
    }

    // ================= MITRA: LIHAT RIWAYAT PELANGGARAN SENDIRI =================
    // Dipakai halaman "Teguran" di menu Profil mitra - menampilkan SEMUA
    // pelanggaran (teguran komplain, keterlambatan, pembatalan mendadak)
    // dari log terpadu mitra_violations, plus hitungan saat ini
    // (users.mitra_strike_count) terhadap batas maksimal gabungan.
    public function myWarnings(Request $request)
    {
        $mitra = $request->user();

        $warnings = MitraViolation::where('user_id', $mitra->id)
            ->latest()
            ->get()
            ->map(function ($v) {
                return [
                    'id' => $v->id,
                    'type' => $v->type,
                    'reason' => $v->reason,
                    'warned_at' => $v->created_at,
                ];
            });

        return response()->json([
            'warnings' => $warnings,
            'warning_count' => $mitra->mitra_strike_count ?? 0,
            'warning_max' => self::MAX_WARNINGS,
            'is_blocked' => $mitra->status === 'blocked',
        ]);
    }

    // ================= CUSTOMER: LIHAT RIWAYAT PELANGGARAN SENDIRI =================
    // Simetris dengan myWarnings() milik mitra di atas - menampilkan
    // riwayat laporan customer yang DITOLAK admin (bukti dianggap tidak
    // valid) dari log customer_violations, plus hitungan saat ini
    // (users.customer_strike_count) terhadap batas maksimal.
    public function myViolations(Request $request)
    {
        $customer = $request->user();

        $violations = CustomerViolation::where('user_id', $customer->id)
            ->latest()
            ->get()
            ->map(function ($v) {
                return [
                    'id' => $v->id,
                    'type' => $v->type,
                    'reason' => $v->reason,
                    'created_at' => $v->created_at,
                ];
            });

        return response()->json([
            'violations' => $violations,
            'strike_count' => $customer->customer_strike_count ?? 0,
            'strike_max' => self::MAX_WARNINGS,
            'is_blocked' => $customer->status === 'blocked',
        ]);
    }
}