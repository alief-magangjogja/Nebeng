<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\Request;
use App\Models\Users;
use App\Models\Order;
use App\Models\OrderQrSession;
use App\Models\TripQrSession;
use App\Models\PickupPoint;
use App\Services\Maps\OSRMService;
use App\Services\Pricing\TripPricingService;
use App\Services\NotificationService;
use App\Models\User;
use App\Models\MitraViolation;
use App\Models\RewardTransaction;
use App\Models\SosLog;
use App\Services\OrderCancellationService;

class TripController extends Controller
{
    public function search(Request $request)
    {
        $request->validate([
            'origin_point_id' => 'required|exists:pickup_points,id',
            'destination_point_id' => 'required|exists:pickup_points,id',
            'date' => 'required|date',
        ]);

        $requestedDate = \Carbon\Carbon::parse($request->date)->toDateString();
        $now = now();

        $query = Trip::with([
            'originPoint.city',
            'destinationPoint.city',
            'mitra' => function ($q) {
                $q->withAvg('reviewsAsMitra', 'rating')->withCount('reviewsAsMitra');
            }
        ])
        ->where('origin_point_id', $request->origin_point_id)
        ->where('destination_point_id', $request->destination_point_id)
        ->whereDate('departure_date', $requestedDate)
        ->where('seat_available', '>', 0)
        ->where('status', 'active');

        // Kalau tanggal yang dicari adalah HARI INI, buang trip yang jam
        // keberangkatannya sudah lewat dari waktu sekarang.
        if ($requestedDate === $now->toDateString()) {
            $query->where('departure_time', '>=', $now->toTimeString());
        }

        // FILTER VEHICLE TYPE
        if (
            $request->filled('vehicle_type') &&
            $request->vehicle_type !== 'all'
        ) {
            $query->where(
                'vehicle_type',
                $request->vehicle_type
            );
        }

        $trips = $query
            ->orderBy('departure_time', 'asc')
            ->get();

        return response()->json($trips);
    }

    public function show($id)
    {
        $trip = Trip::with([
            'originPoint.city',
            'destinationPoint.city',
            // mitra.profile WAJIB ikut di-load - dipakai untuk menampilkan
            // QRIS mitra di halaman preview pembayaran customer SEBELUM
            // order dibuat (UploadBuktiPembayaran.jsx mode "buat baru").
            // Tanpa ini, qris_image tidak pernah ikut ke response walau
            // mitra sudah upload QRIS-nya.
            'mitra.profile',
            'orders.user',
            'orders.itemOrder',
            // Dipakai halaman Detail Tebengan mitra untuk menampilkan
            // catatan admin (admin_notes) begitu order berstatus
            // 'disputed' - supaya mitra tahu progres laporannya, bukan
            // cuma pesan pasif "sedang ditinjau" yang tidak pernah berubah.
            'orders.complaint',
            // Dipakai halaman Detail Tebengan mitra untuk menampilkan
            // admin_notes begitu admin sudah meninjau laporan disputed,
            // supaya mitra tidak cuma lihat teks pasif "sedang ditinjau".
            'orders.complaint',
            // Dipakai halaman Detail Aktivitas pos_mitra untuk menampilkan
            // panel verifikasi real-time (jam check-in customer, jam
            // mitra berangkat/tiba, jam barang dikonfirmasi sampai).
            'orders.qrSessions',
            'qrSessions',
        ])->findOrFail($id);

        $tripData = $trip->toArray();

        // ==========================================
        // VERIFIKASI KEBERANGKATAN & KEDATANGAN (level trip)
        // ==========================================
        // Ambil sesi QR yang SUDAH dipakai (is_used) untuk masing-masing
        // purpose. Diambil yang terbaru kalau karena suatu hal ada lebih
        // dari satu (mis. QR lama expired lalu di-generate ulang).
        $departureSession = $trip->qrSessions
            ->where('purpose', 'departure')
            ->where('is_used', true)
            ->sortByDesc('used_at')
            ->first();

        $arrivalSession = $trip->qrSessions
            ->where('purpose', 'arrival')
            ->where('is_used', true)
            ->sortByDesc('used_at')
            ->first();

        $tripData['departure_verified_at'] = $departureSession?->used_at;
        $tripData['arrival_verified_at'] = $arrivalSession?->used_at;

        // ==========================================
        // VERIFIKASI PER-CUSTOMER (check-in di pos asal, & barang sampai
        // di pos tujuan) - digabungkan ke masing-masing order di response
        // supaya frontend tidak perlu request terpisah.
        // ==========================================
        foreach ($tripData['orders'] as $index => $orderArr) {
            $order = $trip->orders[$index];

            $checkinSession = $order->qrSessions
                ->where('purpose', 'checkin')
                ->where('is_used', true)
                ->sortByDesc('used_at')
                ->first();

            $tripData['orders'][$index]['checkin_at'] = $checkinSession?->used_at;
        }

        return response()->json($tripData);
    }

    public function store(
        Request $request,
        OSRMService $osrm,
        TripPricingService $pricingService
    )
    {
        // WAJIB: sebelumnya endpoint ini tidak pernah mengecek status
        // verifikasi mitra sama sekali - mitra yang BARU DAFTAR (status
        // masih 'unverified'/'pending'/'rejected') bisa langsung membuat
        // trip dan menerima pesanan, padahal notifikasi persetujuan sendiri
        // eksplisit bilang "Kamu SEKARANG bisa membuat tebengan" (menyiratkan
        // sebelum verified seharusnya belum bisa).
        if (auth()->user()->status !== 'verified') {
            return response()->json([
                'message' => 'Akun mitra Anda belum terverifikasi. Selesaikan verifikasi dokumen terlebih dahulu sebelum membuat layanan tebengan.'
            ], 403);
        }

        if (auth()->user()->status !== 'verified') {
            return response()->json([
                'message' => 'Akun mitra Anda belum terverifikasi. Selesaikan verifikasi dokumen terlebih dahulu sebelum membuat layanan tebengan.'
            ], 403);
        }

        // CATATAN: sengaja TIDAK memblokir pembuatan trip hanya karena
        // qris_image kosong. Metode pembayaran (cash/qris/ewallet) itu
        // dipilih PER ORDER oleh customer (lihat OrderController::store()
        // & ItemOrderController::store()), bukan atribut tetap trip - jadi
        // mitra yang belum/tidak mau pakai QRIS tetap bisa berjualan
        // selama customernya membayar tunai. Validasi "customer pilih QRIS
        // tapi mitra tidak punya QRIS" ditangani di titik yang lebih tepat:
        // saat order/item-order dengan payment_method 'qris' itu dibuat.

        // WAJIB: soft-lock mitra yang masih punya kewajiban refund QRIS
        // berstatus 'disputed' (customer sudah lapor, admin belum/masih
        // meninjau). Platform tidak memegang dana QRIS mitra sendiri
        // (dibayar langsung ke rekening/e-wallet pribadi mitra), jadi
        // tidak bisa memotong saldo secara paksa - satu-satunya leverage
        // yang bisa dipaksakan lewat aplikasi adalah mengunci akses untuk
        // membuat trip baru sampai dispute-nya selesai/diselesaikan admin.
        // Soft-lock mitra yang masih punya kewajiban refund QRIS, dengan DUA
// kondisi terpisah:
// 1. 'disputed' - customer sudah lapor manual, admin belum/sedang meninjau.
// 2. Refund masih pending TAPI sudah lewat 24 jam sejak dibatalkan -
//    dihitung LANGSUNG dari waktu di sini, TIDAK lagi bergantung pada
//    command refunds:process-overdue mengubah status jadi 'disputed'.
//    Ini supaya status 'disputed' + banner "Laporan Sedang Ditinjau"
//    di sisi customer betul-betul murni dari laporan manual, sementara
//    soft-lock pembuatan trip tetap otomatis aktif berbasis waktu.
$overdueCutoff = now()->subHours(24);

$hasOutstandingRefund = Order::whereHas('trip', function ($q) {
        $q->where('mitra_id', auth()->id());
    })
    ->where(function ($q) use ($overdueCutoff) {
        $q->where('refund_status', 'disputed')
          ->orWhere(function ($q2) use ($overdueCutoff) {
              $q2->whereIn('refund_status', ['pending_100_percent', 'pending_50_percent'])
                 ->where('cancelled_at', '<=', $overdueCutoff);
          });
    })
    ->exists();

if ($hasOutstandingRefund) {
    return response()->json([
        'message' => 'Anda memiliki kewajiban refund QRIS yang belum diselesaikan (baik yang sedang dilaporkan customer maupun yang sudah lewat 24 jam belum ditransfer). Selesaikan kewajiban refund tersebut sebelum bisa membuat trip baru.'
    ], 403);
}

// WAJIB: cegah mitra membuat trip baru selama masih punya trip yang
// BELUM SELESAI (status apa pun sebelum 'completed'/'cancelled'/
// 'cancelled_pending_refund') - sebelumnya mitra bisa membuat banyak
// trip sekaligus di hari & jam yang persis sama (lihat riwayat mitra:
// #70 dan #69 sama-sama Jumat 18 September 2026 pukul 15:30:00), yang
// jelas tidak masuk akal karena mitra secara fisik tidak mungkin
// menjalankan dua tebengan bersamaan.
//
// Trip yang TIDAK PERNAH dapat customer otomatis tidak akan mengunci
// mitra selamanya: command terjadwal `trips:process-expired` (jalan
// tiap 5 menit lewat scheduler) akan membatalkan otomatis trip dengan
// 0 customer begitu jam keberangkatannya lewat, jadi mitra otomatis
// bebas membuat trip baru lagi tanpa perlu tindakan manual apa pun.
$unfinishedStatuses = ['active', 'waiting_departure', 'on_the_way', 'arrived_destination'];

$activeTrip = Trip::where('mitra_id', auth()->id())
    ->whereIn('status', $unfinishedStatuses)
    ->orderByDesc('id')
    ->first();

if ($activeTrip) {
    return response()->json([
        'message' => "Anda masih punya trip #{$activeTrip->id} yang belum selesai (status: {$activeTrip->status}). Selesaikan atau tunggu trip tersebut berakhir sebelum membuat trip baru.",
        'active_trip_id' => $activeTrip->id,
    ], 403);
}

try {

            $validated = $request->validate([

                'origin_point_id' =>
                    'required|exists:pickup_points,id',

                'destination_point_id' =>
                    'required|exists:pickup_points,id',

                'departure_date' => 'required|date',

                'departure_time' => 'required',

                'seat_total' =>
                    'required|integer|min:1',

                'vehicle_type' => 'required',

                'tebengan_type' => 'nullable',

                'baggage_capacity' => 'nullable',

                // 🔥 BARU
                'max_cap' =>
                    'nullable|integer|min:1',

                // Kendaraan spesifik (merk/plat) yang dipakai untuk trip ini
                'mitra_vehicle_id' => 'nullable|exists:mitra_vehicles,id',
            ]);

            // ====================================
            // VALIDASI KENDARAAN SPESIFIK YANG DIPILIH
            // ====================================
            $mitraVehicle = null;

            if ($request->filled('mitra_vehicle_id')) {
                $mitraVehicle = \App\Models\MitraVehicle::where('id', $request->mitra_vehicle_id)
                    ->where('user_id', auth()->id())
                    ->first();

                if (!$mitraVehicle) {
                    return response()->json([
                        'message' => 'Kendaraan yang dipilih tidak ditemukan.',
                    ], 422);
                }

                if ($mitraVehicle->status !== 'approved') {
                    return response()->json([
                        'message' => 'Kendaraan yang dipilih belum disetujui admin.',
                    ], 422);
                }

                if ($mitraVehicle->type === 'mobil' && $mitraVehicle->seat_capacity && $request->seat_total > $mitraVehicle->seat_capacity) {
                    return response()->json([
                        'message' => "Jumlah kursi tidak boleh melebihi kapasitas kendaraan terdaftar ({$mitraVehicle->seat_capacity} penumpang).",
                    ], 422);
                }
            }

            // ====================================
            // AMBIL PICKUP POINT
            // ====================================

            $origin = PickupPoint::findOrFail(
                $request->origin_point_id
            );

            $destination = PickupPoint::findOrFail(
                $request->destination_point_id
            );

            // ====================================
            // VALIDASI KOORDINAT
            // ====================================

            if (
                !$origin->latitude ||
                !$origin->longitude ||
                !$destination->latitude ||
                !$destination->longitude
            ) {

                return response()->json([
                    'message' =>
                        'Koordinat pickup point belum lengkap'
                ], 422);
            }

            // ====================================
            // GENERATE ROUTE
            // ====================================

            $route = $osrm->getRoute(

                $origin->latitude,
                $origin->longitude,

                $destination->latitude,
                $destination->longitude
            );

            // ====================================
            // PRICE PASSENGER
            // ====================================

            $passengerPrice = $pricingService->calculate(

                $request->vehicle_type,

                $route['distance_km'] ?? 0,

                null
            );

            // ====================================
            // GOODS VEHICLE TYPE
            // ====================================
            // PENTING: vehicle_type yang dikirim BEDA tergantung asal form:
            // - NebengBarang.jsx (trip barang murni) sudah mengirim string
            //   "Barang-Motor"/"Barang-Mobil" langsung, BUKAN "motor"/"mobil"
            //   polos. Kalau tetap dicek "=== 'motor'", perbandingan ini
            //   selalu gagal dan salah jatuh ke "Barang-Mobil" (tarif lebih
            //   mahal) walaupun kendaraannya Motor.
            // - NebengMotor.jsx/NebengMobil.jsx (mode "Barang dan Tebengan")
            //   mengirim vehicle_type mentah "motor"/"mobil", jadi masih
            //   perlu di-mapping ke "Barang-Motor"/"Barang-Mobil".

            $goodsVehicleType =
                str_starts_with($request->vehicle_type, 'Barang-')
                    ? $request->vehicle_type
                    : ($request->vehicle_type === 'motor'
                        ? 'Barang-Motor'
                        : 'Barang-Mobil');

            // ====================================
            // PRICE GOODS
            // ====================================

            $goodsPrice = $pricingService->calculate(

                $goodsVehicleType,

                $route['distance_km'] ?? 0,

                $request->baggage_capacity
            );

            // ====================================
            // CREATE TRIP
            // ====================================

            if ($request->tebengan_type === "Barang") {

                // =========================
                // KONVERSI KAPASITAS
                // =========================

                // PENTING: mendukung DUA kosakata sekaligus - yang baru
                // (XS/S/M/L/XL, dipakai form NebengBarang.jsx mitra saat
                // ini) dan yang lama (xxs/xs/kecil/sedang/besar, untuk
                // kompatibilitas kalau ada tempat lain yang masih kirim
                // format lama). Tanpa ini, baggage_capacity yang tidak
                // dikenali diam-diam jatuh ke fallback 1kg - itu penyebab
                // trip kapasitas M (5kg) malah tersimpan cuma 1kg.
                $capacityMap = [

                    'XS' => 0.5,
                    'S' => 1,
                    'M' => 5,
                    'L' => 10,
                    'XL' => 15,

                    'xxs' => 0.5,
                    'xs' => 1,
                    'kecil' => 5,
                    'sedang' => 10,
                    'besar' => 15,
                ];

                $capacityValue =
                    $capacityMap[$request->baggage_capacity] ?? 1;

                // =========================
                // KHUSUS NEBENG BARANG
                // =========================

                $tripPassenger = Trip::create([

                    'mitra_id' => auth()->id(),

                    'mitra_vehicle_id' => $mitraVehicle->id ?? null,

                    'vehicle_type' =>
                        $request->vehicle_type,

                    'departure_date' =>
                        $request->departure_date,

                    'departure_time' =>
                        $request->departure_time,

                    // ====================
                    // KAPASITAS BARANG
                    // ====================

                    'seat_total' =>
                        $capacityValue,

                    'seat_available' =>
                        $capacityValue,

                    'origin_point_id' =>
                        $request->origin_point_id,

                    'destination_point_id' =>
                        $request->destination_point_id,

                    'baggage_capacity' =>
                        $request->baggage_capacity,

                    'price' => $goodsPrice,

                    // =========================
                    // MAPS DATA
                    // =========================

                    'estimated_distance_km' =>
                        $route['distance_km'] ?? null,

                    'estimated_duration_min' =>
                        $route['duration_min'] ?? null,

                    'route_geojson' =>
                        isset($route['geometry'])
                            ? json_encode($route['geometry'])
                            : null,

                    'status' => 'active'
                ]);

            } else {

                // =========================
                // TEBENGAN PENUMPANG
                // =========================

                $tripPassenger = Trip::create([

                    'mitra_id' => auth()->id(),

                    'mitra_vehicle_id' => $mitraVehicle->id ?? null,

                    'vehicle_type' =>
                        $request->vehicle_type,

                    'departure_date' =>
                        $request->departure_date,

                    'departure_time' =>
                        $request->departure_time,

                    'seat_total' =>
                        $request->seat_total,

                    'seat_available' =>
                        $request->seat_total,

                    'origin_point_id' =>
                        $request->origin_point_id,

                    'destination_point_id' =>
                        $request->destination_point_id,

                    'baggage_capacity' => null,

                    'price' => $passengerPrice,

                    'estimated_distance_km' =>
                        $route['distance_km'] ?? null,

                    'estimated_duration_min' =>
                        $route['duration_min'] ?? null,

                    'route_geojson' =>
                        isset($route['geometry'])
                            ? json_encode($route['geometry'])
                            : null,

                    'status' => 'active'
                ]);
            }

            // ====================================
            // JIKA BARANG DAN TEBENGAN
            // BUAT TRIP BARANG
            // ====================================
            if (
                $request->tebengan_type ===
                "Barang dan Tebengan"
            ) {

                // Sama seperti mapping di atas - dukung vocab baru
                // (XS/S/M/L/XL) & lama (xxs/xs/kecil/sedang/besar).
                $capacityMap = [

                    'XS' => 0.5,
                    'S' => 1,
                    'M' => 5,
                    'L' => 10,
                    'XL' => 15,

                    'xxs' => 0.5,
                    'xs' => 1,
                    'kecil' => 5,
                    'sedang' => 10,
                    'besar' => 15,
                ];

                $capacityValue =
                    $capacityMap[$request->baggage_capacity] ?? 1;

                Trip::create([

                    'mitra_id' => auth()->id(),

                    'mitra_vehicle_id' => $mitraVehicle->id ?? null,

                    'vehicle_type' => $goodsVehicleType,

                    'departure_date' =>
                        $request->departure_date,

                    'departure_time' =>
                        $request->departure_time,

                    'seat_total' =>
                        $capacityValue,

                    'seat_available' =>
                        $capacityValue,

                    'origin_point_id' =>
                        $request->origin_point_id,

                    'destination_point_id' =>
                        $request->destination_point_id,

                    'baggage_capacity' =>
                        $request->baggage_capacity,

                    'price' => $goodsPrice,

                    'estimated_distance_km' =>
                        $route['distance_km'] ?? null,

                    'estimated_duration_min' =>
                        $route['duration_min'] ?? null,

                    'route_geojson' =>
                        isset($route['geometry'])
                            ? json_encode($route['geometry'])
                            : null,

                    'status' => 'active'
                ]);
            }

            return response()->json([

                'message' =>
                    'Trip berhasil dibuat',

                'trip' => $tripPassenger

            ]);

        } catch (\Exception $e) {

            return response()->json([

                'error' => $e->getMessage(),

                'line' => $e->getLine(),

                'file' => $e->getFile()

            ], 500);
        }
    }

    public function preview(
        Request $request,
        OSRMService $osrm,
        TripPricingService $pricingService
    )
    {
        $validated = $request->validate([

            'origin_point_id' =>
                'required|exists:pickup_points,id',

            'destination_point_id' =>
                'required|exists:pickup_points,id',

            'vehicle_type' =>
                'required',

            'baggage_capacity' =>
                'nullable'
        ]);

        $origin = PickupPoint::findOrFail(
            $request->origin_point_id
        );

        $destination = PickupPoint::findOrFail(
            $request->destination_point_id
        );

        $route = $osrm->getRoute(
            $origin->latitude,
            $origin->longitude,
            $destination->latitude,
            $destination->longitude
        );

        $price = $pricingService->calculate(

            $request->vehicle_type,

            $route['distance_km'] ?? 0,

            $request->baggage_capacity
        );

        return response()->json([

            'distance_km' =>
                $route['distance_km'] ?? 0,

            'duration_min' =>
                $route['duration_min'] ?? 0,

            'estimated_price' => $price
        ]);
    }

    public function dashboardSummary(Request $request)
    {
        $user = $request->user();

        $balance = \App\Models\DriverBalance::where('user_id', $user->id)
            ->value('balance') ?? 0;

        $now = now();

        $upcomingTrips = Trip::with([
                'originPoint.city',
                'destinationPoint.city',
            ])
            ->where('mitra_id', $user->id)
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->where(function ($q) use ($now) {
                $q->where('departure_date', '>', $now->toDateString())
                  ->orWhere(function ($q2) use ($now) {
                      $q2->where('departure_date', $now->toDateString())
                         ->where('departure_time', '>=', $now->toTimeString());
                  });
            })
            ->orderBy('departure_date', 'asc')
            ->orderBy('departure_time', 'asc')
            ->take(2)
            ->get()
            ->map(function ($trip) {
                return [
                    'id' => $trip->id,
                    'vehicle_type' => $trip->vehicle_type,
                    'departure_date' => $trip->departure_date,
                    'departure_time' => $trip->departure_time,
                    'status' => $trip->status,
                    'origin_point' => $trip->originPoint,
                    'destination_point' => $trip->destinationPoint,
                ];
            });

        // Rating & ulasan yang diterima mitra ini sebagai driver (dari
        // customer). Sebelumnya endpoint ini tidak pernah mengirim data
        // rating sama sekali - kartu "Rating Mitra" di halaman Beranda
        // selalu menampilkan "Belum Ada Rating" hardcoded, padahal
        // review-nya sendiri sudah berhasil tersimpan lewat
        // TripReviewController::store().
        $ratingAvg = $user->reviewsAsMitra()->avg('rating');
        $ratingCount = $user->reviewsAsMitra()->count();

        $latestReviews = $user->reviewsAsMitra()
            ->with('customer:id,name,avatar')
            ->latest()
            ->take(3)
            ->get()
            ->map(function ($review) {
                return [
                    'id' => $review->id,
                    'trip_id' => $review->trip_id,
                    'rating' => $review->rating,
                    'review' => $review->review,
                    'customer_name' => $review->customer->name ?? 'Customer',
                    'customer_avatar' => $review->customer->avatar ?? null,
                    'created_at' => $review->created_at,
                ];
            });

        return response()->json([
            'balance' => $balance,
            'upcoming_trips' => $upcomingTrips,
            'rating_avg' => $ratingAvg ? round($ratingAvg, 1) : null,
            'rating_count' => $ratingCount,
            'latest_reviews' => $latestReviews,
        ]);
    }

    public function myTrips(Request $request)
    {
        $user = $request->user();

        $trips = \App\Models\Trip::with([
            'originPoint.city',
            'destinationPoint.city',
            // Dipakai halaman Riwayat mitra untuk menampilkan daftar
            // customer yang perlu direfund (kalau trip dihapus) beserta
            // status klaim refund per order + kontak untuk chat.
            'orders.customer',
        ])
        ->where('mitra_id', $user->id)
        ->latest()
        ->get()
        ->map(function ($trip) {

            $rawStatus = $trip->status;

            if ($rawStatus === 'cancelled_pending_refund') {
                $status = 'Menunggu Refund';

            } elseif ($rawStatus === 'cancelled') {
                $status = 'Dibatalkan';

            } elseif ($rawStatus === 'completed') {
                $status = 'Selesai';

            } elseif ($rawStatus === 'active') {
                $status = 'Proses';

            } else {
                $status = 'Proses';
            }

            return [
                'id' => $trip->id,

                'vehicle_type' => $trip->vehicle_type,
                'departure_date' => $trip->departure_date,
                'departure_time' => $trip->departure_time,
                'price' => $trip->price,
                'status' => $status,
                'raw_status' => $rawStatus,

                'seat_total' => $trip->seat_total,
                'seat_available' => $trip->seat_available,

                'origin_point' => $trip->originPoint,
                'destination_point' => $trip->destinationPoint,

                // Hanya order yang sudah dibatalkan yang relevan buat
                // panel refund di halaman Riwayat.
                'orders' => $trip->orders->where('status', 'cancelled')->values()->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'payment_method' => $order->payment_method,
                        'price' => $order->price,
                        'refund_status' => $order->refund_status,
                        'refund_amount' => $order->refund_amount,
                        'refund_proof' => $order->refund_proof,
                        'customer' => $order->customer ? [
                            'id' => $order->customer->id,
                            'name' => $order->customer->name,
                            'avatar' => $order->customer->avatar,
                            'phone' => $order->customer->phone,
                        ] : null,
                    ];
                }),
            ];
        });

        return response()->json($trips);
    }

    public function posMitraTrips(Request $request)
    {
        $pointId = $request->user()->pickup_point_id;

        $trips = \App\Models\Trip::select([
            'id', 'mitra_id', 'vehicle_type', 'departure_date', 'departure_time',
            'price', 'status', 'seat_total', 'seat_available',
            'origin_point_id', 'destination_point_id'
        ])
        ->with([
            'originPoint:id,pos_name,address,city_id',
            'originPoint.city:id,name',
            'destinationPoint:id,pos_name,address,city_id',
            'destinationPoint.city:id,name',
            'mitra:id,name,phone,avatar',
            'orders' => function ($q) {
                $q->select('id', 'trip_id', 'customer_id', 'status', 'price', 'created_at');
            },
            'orders.customer:id,name,phone,avatar'
        ])
        ->where(function ($q) use ($pointId) {
            $q->where('origin_point_id', $pointId)
              ->orWhere('destination_point_id', $pointId);
        })
        ->latest()
        ->get()
        ->map(function ($trip) {

            $rawStatus = $trip->status;

            if ($rawStatus === 'cancelled_pending_refund') {
                $status = 'Menunggu Refund';

            } elseif ($rawStatus === 'cancelled') {
                $status = 'Dibatalkan';

            } elseif ($rawStatus === 'completed') {
                $status = 'Selesai';

            } elseif ($rawStatus === 'active') {
                $status = 'Proses';

            } else {
                $status = 'Proses';
            }

            return [
                'id' => $trip->id,

                'vehicle_type' => $trip->vehicle_type,

                'departure_date' => $trip->departure_date,

                'departure_time' => $trip->departure_time,

                'price' => $trip->price,

                'status' => $status,

                'seat_total' => $trip->seat_total,

                'seat_available' => $trip->seat_available,

                'origin_point' => $trip->originPoint,

                'destination_point' => $trip->destinationPoint,

                'mitra' => $trip->mitra,

                'orders' => $trip->orders,
            ];
        });

        return response()->json($trips);
    }

    public function scanQr(Request $request)
    {
        $validated = $request->validate([
            'qr_token' => 'required|string'
        ]);

        $session = TripQrSession::where('token', $request->qr_token)
            ->where('purpose', 'arrival')
            ->with('trip.orders')
            ->first();

        if (!$session) {
            return response()->json([
                'message' => 'QR tidak valid'
            ], 404);
        }

        if (now()->gt($session->expired_at)) {
            return response()->json([
                'message' => 'QR sudah expired'
            ], 400);
        }

        if ($session->is_used) {
            return response()->json([
                'message' => 'QR sudah digunakan'
            ], 400);
        }

        // QR kedatangan (arrival) hanya boleh discan oleh akun pos_mitra
        // yang memegang pos tujuan (destination_point) dari trip ini.
        if ($denied = $this->denyIfWrongPos($request, $session->trip->destination_point_id)) {
            return $denied;
        }

        $session->update([
            'is_used' => true,
            'used_at' => now(),
        ]);

        $trip = $session->trip;
        
        $trip->update([
            'status' => 'completed'
        ]);

        NotificationService::send(
            $trip->mitra_id,
            'Perjalanan Selesai',
            'Trip kamu telah selesai. Saldo akan bertambah setelah pembayaran dikonfirmasi.',
            'trip',
            "/mitra/riwayat"
        );

        foreach ($trip->orders as $order) {
            // ==========================================
            // 1. HITUNG POIN BERDASARKAN KENDARAAN
            // ==========================================
            $customer = User::find($order->customer_id);
            $points = 0;

            if ($customer) {
                $vType = strtolower($trip->vehicle_type);

                if (str_contains($vType, 'motor')) {
                    $points = 15;
                } elseif (str_contains($vType, 'mobil')) {
                    $points = 25;
                } elseif (str_contains($vType, 'barang')) {
                    $points = 20;
                } else {
                    $points = 15;
                }

                // Tambahkan poin ke database
                $customer->reward_points += $points;
                $customer->save();

                RewardTransaction::create([
                    'user_id' => $customer->id,
                    'type' => 'earn',
                    'points' => $points,
                    'description' => 'Poin dari penyelesaian trip #' . $trip->id
                ]);
            }

            // ==========================================
            // 2. KIRIM SATU NOTIFIKASI GABUNGAN YANG RAPI
            // ==========================================
            $notifMessage = 'Kamu sudah sampai tujuan. Jangan lupa beri penilaian untuk mitra (opsional).';
            if ($points > 0) {
                $notifMessage = "Kamu sudah sampai tujuan dan mendapatkan +{$points} poin reward! Jangan lupa beri penilaian untuk mitra.";
            }

            NotificationService::send(
                $order->customer_id,
                'Perjalanan Selesai',
                $notifMessage,
                'trip',
                "/customer/perjalanan/{$trip->id}"
            );
        }

        NotificationService::send(
            auth()->id(),
            'QR Kedatangan Terverifikasi',
            "Trip #{$trip->id} berhasil diselesaikan.",
            'system',
            '/pos-mitra/aktivitas'
        );

        return response()->json([
            'message' => 'Trip berhasil diselesaikan',
            'trip_id' => $trip->id,
            'status' => 'completed'
        ]);
    }

    public function scanDepartureQr(Request $request)
    {
        $validated = $request->validate([
            'qr_token' => 'required|string'
        ]);

        $session = TripQrSession::where(
                'token',
                $request->qr_token
            )
            ->where('purpose', 'departure')
            ->with('trip')
            ->first();

        if (!$session) {
            return response()->json([
                'message' => 'QR tidak valid'
            ], 404);
        }

        if (now()->gt($session->expired_at)) {
            return response()->json([
                'message' => 'QR sudah expired'
            ], 400);
        }

        if ($session->is_used) {
            return response()->json([
                'message' => 'QR sudah digunakan'
            ], 400);
        }

        // QR keberangkatan (departure) hanya boleh discan oleh akun
        // pos_mitra yang memegang pos asal (origin_point) dari trip ini.
        if ($denied = $this->denyIfWrongPos($request, $session->trip->origin_point_id)) {
            return $denied;
        }

        $session->update([
            'is_used' => true,
            'used_at' => now(),
        ]);

        $session->trip->update([
            'status' => 'on_the_way'
        ]);

        $session->trip->load('orders');

        NotificationService::send(
            $session->trip->mitra_id,
            'Perjalanan Dimulai',
            'QR keberangkatan berhasil diverifikasi. Selamat menempuh perjalanan.',
            'trip',
            "/mitra/perjalanan/{$session->trip->id}"
        );

        foreach ($session->trip->orders as $order) {
            NotificationService::send(
                $order->customer_id,
                'Perjalanan Dimulai',
                'Mitra sudah berangkat. Pantau perjalanan kamu secara langsung.',
                'trip',
                "/customer/perjalanan/{$session->trip->id}"
            );
        }

        NotificationService::send(
            auth()->id(),
            'QR Keberangkatan Terverifikasi',
            "Trip #{$session->trip->id} berhasil diberangkatkan.",
            'system',
            '/pos-mitra/aktivitas'
        );

        return response()->json([
            'message' => 'Perjalanan dimulai',
            'trip_id' => $session->trip->id,
            'status' => 'on_the_way'
        ]);
    }

    public function scanCustomerQr(Request $request)
    {
        $validated = $request->validate([
            'qr_token' => 'required|string'
        ]);

        $session = OrderQrSession::where(
            'token',
            $request->qr_token
        )
        ->where('purpose', 'checkin')
        ->with('order.trip')
        ->first();

        if (!$session) {
            return response()->json([
                'message' => 'QR tidak valid'
            ], 404);
        }

        if (now()->gt($session->expired_at)) {
            return response()->json([
                'message' => 'QR sudah expired'
            ], 400);
        }

        if ($session->is_used) {
            return response()->json([
                'message' => 'QR sudah digunakan'
            ], 400);
        }

        // Verifikasi customer siap berangkat hanya boleh dilakukan oleh
        // akun pos_mitra yang memegang pos asal (origin_point) dari trip
        // yang dipesan customer tersebut.
        if ($denied = $this->denyIfWrongPos($request, $session->order->trip->origin_point_id)) {
            return $denied;
        }

        $session->update([
            'is_used' => true,
            'used_at' => now(),
        ]);

        $session->order->update([
            'readiness_status' => 'ready'
        ]);

        $session->order->load('trip', 'customer');

        NotificationService::send(
            $session->order->trip->mitra_id,
            'Customer Sudah Check-in',
            "{$session->order->customer->name} sudah check-in di Pos Mitra. Cek apakah semua customer sudah siap berangkat.",
            'trip',
            "/mitra/perjalanan/{$session->order->trip_id}"
        );

        return response()->json([
            'message' => 'Customer berhasil diverifikasi',
            'order_id' => $session->order->id,
            'readiness_status' => 'ready'
        ]);
    }

    /**
     * Pastikan akun pos_mitra yang sedang login memegang pos ($expectedPointId)
     * yang sama dengan pos yang tertera di pesanan/trip. Jika tidak cocok
     * (beda pos, walau masih satu kota), tolak dengan pesan yang jelas.
     *
     * Return null jika boleh lanjut, atau JsonResponse (403/400) jika ditolak.
     */
    private function denyIfWrongPos(Request $request, ?int $expectedPointId)
    {
        $user = $request->user();

        if (!$expectedPointId) {
            // Trip/order tidak punya pos yang valid - jangan diloloskan begitu saja.
            return response()->json([
                'message' => 'Data pos pada pesanan ini tidak valid'
            ], 400);
        }

        if (!$user || $user->role !== 'pos_mitra' || !$user->pickup_point_id) {
            return response()->json([
                'message' => 'Akun ini belum terdaftar pada pos manapun'
            ], 403);
        }

        if ((int) $user->pickup_point_id !== (int) $expectedPointId) {
            return response()->json([
                'message' => 'QR ini bukan untuk pos Anda. Pesanan ini hanya bisa diproses di pos yang sesuai.'
            ], 403);
        }

        return null;
    }

    // ================= MITRA: GENERATE QR PENGIRIMAN PER-ORDER =================
    // Beda dengan scanQr() (arrival, per-TRIP, dampaknya ke semua order
    // sekaligus) - QR ini khusus 1 order barang, supaya trip barang yang
    // dipakai beberapa customer bisa dikonfirmasi kedatangan/pengiriman
    // masing-masing secara independen.
    public function generateDeliveryQr(Request $request, $orderId)
    {
        $order = Order::with('trip')->findOrFail($orderId);

        if (!$order->trip || $order->trip->mitra_id !== auth()->id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        if (!$order->item_order_id) {
            return response()->json([
                'message' => 'Fitur QR pengiriman ini khusus untuk order barang.'
            ], 400);
        }

        if ($order->delivered_at) {
            return response()->json([
                'message' => 'Order ini sudah dikonfirmasi sampai sebelumnya.'
            ], 400);
        }

        $token = \Illuminate\Support\Str::random(40);

        $session = OrderQrSession::create([
            'order_id' => $order->id,
            'token' => $token,
            'purpose' => 'delivery',
            'expired_at' => now()->addMinutes(30),
            'is_used' => false,
        ]);

        return response()->json([
            'token' => $session->token,
            'expired_at' => $session->expired_at,
        ]);
    }

    // ================= SCAN QR PENGIRIMAN PER-ORDER =================
    public function scanDeliveryQr(Request $request)
    {
        $validated = $request->validate([
            'qr_token' => 'required|string'
        ]);

        $session = OrderQrSession::where('token', $request->qr_token)
            ->where('purpose', 'delivery')
            ->with('order.trip', 'order.customer')
            ->first();

        if (!$session) {
            return response()->json([
                'message' => 'QR tidak valid'
            ], 404);
        }

        if (now()->gt($session->expired_at)) {
            return response()->json([
                'message' => 'QR sudah expired'
            ], 400);
        }

        if ($session->is_used) {
            return response()->json([
                'message' => 'QR sudah digunakan'
            ], 400);
        }

        $session->update([
            'is_used' => true,
            'used_at' => now(),
        ]);

        $order = $session->order;

        // Cuma menandai ORDER INI - tidak menyentuh order lain di trip
        // yang sama sekalipun trip-nya sama persis.
        $order->update([
            'delivered_at' => now(),
        ]);

        // ==========================================
        // POIN REWARD - khusus customer order ini saja
        // ==========================================
        $customer = $order->customer;

        if ($customer) {
            $points = 20; // sama seperti poin barang di scanQr()

            $customer->reward_points += $points;
            $customer->save();

            RewardTransaction::create([
                'user_id' => $customer->id,
                'type' => 'earn',
                'points' => $points,
                'description' => 'Poin dari barang sampai tujuan - order #' . $order->id,
            ]);
        }

        NotificationService::send(
            $order->customer_id,
            'Barang Sudah Sampai',
            'Barang kamu sudah dikonfirmasi sampai tujuan.' . ($customer ? " Kamu mendapat +20 poin reward!" : ''),
            'trip',
            "/customer/pesanan/{$order->id}"
        );

        // ==========================================
        // Kalau SEMUA order barang di trip ini sudah delivered ATAU
        // dibatalkan, baru trip ditandai selesai. Order yang sudah
        // dibatalkan TIDAK BOLEH ikut dihitung "masih pending" - order
        // itu tidak akan pernah punya delivered_at (memang tidak jadi
        // dikirim), jadi tanpa pengecualian ini trip tidak akan pernah
        // bisa selesai kalau salah satu customer di trip shared ini
        // membatalkan pesanannya.
        // ==========================================
        $trip = $order->trip;

        $stillPending = $trip->orders()
            ->whereNotNull('item_order_id')
            ->whereNull('delivered_at')
            ->where('status', '!=', 'cancelled')
            ->exists();

        if (!$stillPending && $trip->status !== 'completed') {
            $trip->update(['status' => 'completed']);

            NotificationService::send(
                $trip->mitra_id,
                'Perjalanan Selesai',
                'Semua barang di trip #' . $trip->id . ' sudah dikonfirmasi sampai.',
                'trip',
                "/mitra/riwayat"
            );
        }

        return response()->json([
            'message' => 'Barang berhasil dikonfirmasi sampai tujuan',
            'order_id' => $order->id,
            'trip_completed' => !$stillPending,
        ]);
    }

    public function sendSos(Request $request, $tripId)
    {
        $request->validate([
            'latitude' => 'nullable',
            'longitude' => 'nullable',
        ]);

        $trip = Trip::findOrFail($tripId);

        $sos = SosLog::create([
            'trip_id' => $trip->id,
            'customer_id' => $request->user()->id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'message' => 'Darurat! Pengguna mengirim sinyal SOS dari perjalanan.'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'SOS berhasil dikirim ke pusat!',
            'data' => $sos
        ], 200);
    }

    // 2. Digunakan Admin untuk melihat daftar darurat masuk
    public function adminGetSosList()
    {
        $sosList = SosLog::with(['trip.mitra', 'trip.originPoint', 'trip.destinationPoint', 'customer'])
                        ->orderBy('created_at', 'desc')
                        ->get();

        return response()->json($sosList, 200);
    }

    // 3. Digunakan Admin untuk mengirim teguran/tindakan ke Mitra
    public function adminRebukeMitra(Request $request, $sosId)
    {
        $request->validate([
            'admin_notes' => 'required|string'
        ]);

        $sos = SosLog::with('trip.mitra')->findOrFail($sosId);
        $sos->update([
            'admin_notes' => $request->admin_notes,
            'status' => 'reviewed'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Teguran berhasil dicatat dan dikirimkan kepada Mitra.'
        ], 200);
    }

    // 4. Digunakan Admin untuk menandai sinyal SOS sebagai selesai ditangani
    public function adminResolveSos($id)
    {
        $sos = SosLog::findOrFail($id);

        $sos->update([
            'status' => 'resolved',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status SOS berhasil diperbarui menjadi selesai.'
        ], 200);
    }

    // =============================
    // MITRA: HAPUS LAYANAN TEBENGAN (TRIP)
    // - 0 customer -> langsung dibatalkan, tidak ada konsekuensi apa pun.
    // - Sudah ada customer -> semua order dibatalkan dengan refund 100%
    //   (bukan salah customer, jadi tidak ada tier 50%/hangus seperti
    //   pembatalan oleh customer sendiri). Kalau dilakukan mendadak
    //   (< 3 jam sebelum jadwal), dicatat sebagai strike untuk mitra.
    // =============================
        // PENTING: trip TIDAK langsung 'cancelled' kalau masih ada order QRIS
    // yang butuh direfund. Selama mitra belum transfer + upload bukti DAN
    // customer belum konfirmasi dana diterima, trip mengambang di status
    // 'cancelled_pending_refund' - baru dianggap benar-benar terbatalkan
    // (status 'cancelled') setelah semua kewajiban refund tuntas. Lihat
    // OrderCancellationService::finalizeTripIfSettled().
    public function destroyTrip(Request $request, $id)
    {
        $trip = Trip::with(['orders' => function ($q) {
            $q->where('status', '!=', 'cancelled');
        }])->findOrFail($id);

        if ($trip->mitra_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (in_array($trip->status, ['cancelled', 'cancelled_pending_refund', 'completed'])) {
            return response()->json([
                'message' => 'Trip ini sudah tidak bisa dihapus (sudah selesai/dibatalkan sebelumnya).'
            ], 400);
        }

        $activeOrders = $trip->orders;
        $hadCustomers = $activeOrders->isNotEmpty();

        foreach ($activeOrders as $order) {
            OrderCancellationService::cancelWithFullRefund(
                $order,
                'Trip Dibatalkan Mitra',
                'Mitra membatalkan trip ini. Pesanan Anda dibatalkan dan Anda berhak atas refund penuh. Trip ini akan tercatat benar-benar selesai setelah dana diterima dan Anda konfirmasi di halaman Pesanan.'
            );
        }

        // Kalau ada order QRIS yang masih punya kewajiban refund berjalan,
        // trip BELUM boleh dianggap tuntas - mitra wajib menghubungi
        // customer & transfer dulu (lihat halaman Riwayat).
        $needsRefundSettlement = $hadCustomers && OrderCancellationService::tripHasOutstandingRefund($trip);

        $trip->update([
            'status' => $needsRefundSettlement ? 'cancelled_pending_refund' : 'cancelled',
        ]);

        // Kalau ada customer dan dilakukan mendadak (<3 jam sebelum
        // jadwal), catat sebagai strike untuk mitra - sama seperti sistem
        // late_cancel_count di sisi customer.
        if ($hadCustomers) {
            $departure = \Carbon\Carbon::parse($trip->departure_date . ' ' . $trip->departure_time);
            $hoursLeft = now()->diffInHours($departure, false);

            if ($hoursLeft < 3) {
                $mitra = $request->user();
                $mitra->increment('mitra_strike_count');
                $mitra->refresh();

                // Catat ke log pelanggaran terpadu (mitra_violations) -
                // sama seperti telat berangkat, supaya mitra bisa lihat
                // kejadian ini di halaman "Teguran" miliknya.
                MitraViolation::create([
                    'user_id' => $mitra->id,
                    'type' => 'pembatalan_mendadak',
                    'reason' => "Trip #{$trip->id} - dihapus kurang dari 3 jam sebelum jadwal keberangkatan, padahal sudah ada customer.",
                ]);

                if ($mitra->mitra_strike_count >= 5) {
                    $mitra->update(['status' => 'blocked']);
                }
            }
        }

        $message = 'Trip berhasil dihapus.';
        if ($needsRefundSettlement) {
            $message = 'Trip dihapus. Semua pesanan dibatalkan dengan refund penuh, TAPI trip ini belum dianggap tuntas - segera hubungi customer via Chat, transfer dana, lalu upload bukti refund di halaman Riwayat.';
        } elseif ($hadCustomers) {
            $message = 'Trip berhasil dihapus. Semua pesanan yang ada telah dibatalkan (tidak ada dana yang perlu dikembalikan).';
        }

        return response()->json([
            'success' => true,
            'needs_refund_settlement' => $needsRefundSettlement,
            'message' => $message,
        ], 200);
    }
}