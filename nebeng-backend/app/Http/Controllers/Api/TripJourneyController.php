<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripTracking;
use Illuminate\Http\Request;

class TripJourneyController extends Controller
{
    // =============================
    // GET JOURNEY DETAIL
    // =============================
    public function show(Request $request, $id)
    {
        $trip = Trip::with([
            'originPoint',
            'destinationPoint',
            'mitra',
            'orders' => function ($query) use ($request) {
                // WAJIB: filter ke order milik customer yang login saja.
                // Trip ini bisa di-share banyak customer sekaligus (barang,
                // atau nebeng motor/mobil dengan beberapa penumpang) -
                // tanpa filter ini, customer A bisa melihat (dan bahkan
                // tidak sengaja memicu aksi terhadap) data order customer B
                // karena frontend mengambil order pertama dari list.
                $query->where('customer_id', $request->user()->id);
            },
        ])->findOrFail($id);

        $latestTracking = TripTracking::where('trip_id', $id)
            ->latest('tracked_at')
            ->first();

        // Dipakai halaman "Perjalanan" customer (PerjalananCustomer.jsx)
        // untuk menyembunyikan/mengganti tombol "Berikan Penilaian" kalau
        // customer ini sudah pernah menilai mitra untuk trip ini.
        $hasReviewedMitra = \App\Models\TripReview::where('trip_id', $id)
            ->where('customer_id', $request->user()->id)
            ->where('type', 'customer_to_mitra')
            ->exists();

        return response()->json([
            'trip' => $trip,
            'origin_point' => $trip->originPoint,
            'destination_point' => $trip->destinationPoint,
            'latest_tracking' => $latestTracking,
            'has_reviewed_mitra' => $hasReviewedMitra,
        ]);
    }

    // =============================
    // UPDATE GPS TRACKING
    // =============================
    public function updateTracking(Request $request, $id)
    {
        $trip = Trip::findOrFail($id);

        if ($trip->status !== 'on_the_way') {
            return response()->json([
                'message' => 'Trip belum dimulai'
            ], 400);
        }

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $tracking = TripTracking::create([
            'trip_id' => $trip->id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'tracked_at' => now(),
        ]);

        return response()->json([
            'message' => 'Tracking updated',
            'data' => $tracking
        ]);
    }

    // =============================
    // GET LATEST LOCATION
    // =============================
    public function latestLocation($id)
    {
        $trip = Trip::find($id);

        $latestTracking = TripTracking::where('trip_id', $id)
            ->latest('tracked_at')
            ->first();

        if (!$latestTracking) {
            // Tetap kirim status trip walau belum ada data GPS,
            // supaya status di sisi customer tetap ter-update.
            return response()->json([
                'message' => 'Belum ada tracking',
                'trip_status' => $trip->status ?? null,
            ], 404);
        }

        return response()->json([
            'latitude' => $latestTracking->latitude,
            'longitude' => $latestTracking->longitude,
            'tracked_at' => $latestTracking->tracked_at,
            'trip_status' => $trip->status ?? null,
        ]);
    }

    // =============================
    // UPDATE STATUS TRIP
    // =============================
    public function updateStatus(Request $request, $id)
    {
        $trip = Trip::with('orders')->findOrFail($id);

        $request->validate([
            'status' => 'required|string'
        ]);

        $allowedStatuses = [
            'waiting_departure',
            'on_the_way',
            'arrived_destination',
            'completed',
            'cancelled'
        ];

        if (!in_array($request->status, $allowedStatuses)) {
            return response()->json([
                'message' => 'Status tidak valid'
            ], 400);
        }

        // =====================================
        // CEGAH KEBERANGKATAN TANPA CUSTOMER
        // =====================================
        // Tidak masuk akal mitra berangkat/membawa
        // sesuatu jika belum ada satupun pesanan
        // (penumpang/pengirim barang) pada trip ini.
        if (
            $request->status === 'waiting_departure' &&
            $trip->orders->count() === 0
        ) {
            return response()->json([
                'message' => 'Belum ada customer yang memesan tebengan ini. Tunggu hingga ada pesanan sebelum berangkat.'
            ], 422);
        }

        // =====================================
        // CEGAH KEBERANGKATAN SEBELUM CUSTOMER CHECK-IN
        // =====================================
        // Customer wajib scan QR kedatangan di Pos Mitra (readiness_status
        // menjadi "ready") sebelum mitra diperbolehkan berangkat.
        if (
            $request->status === 'waiting_departure' &&
            $trip->orders->count() > 0 &&
            $trip->orders->contains(fn ($order) => $order->readiness_status !== 'ready')
        ) {
            return response()->json([
                'message' => 'Masih ada customer yang belum scan QR kedatangan di Pos Mitra. Tunggu hingga semua customer check-in sebelum berangkat.'
            ], 422);
        }

        $trip->status = $request->status;
        $trip->save();

        // Jika trip selesai
        if ($request->status === 'completed') {

            foreach ($trip->orders as $order) {
                $order->status = 'completed';
                $order->save();
            }
        }

        return response()->json([
            'message' => 'Status updated',
            'trip' => $trip
        ]);
    }
}