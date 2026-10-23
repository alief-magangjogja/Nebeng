<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;

class PosDashboardController extends Controller
{
    /**
     * Statistik layanan (Nebeng Motor/Mobil/Barang) HANYA untuk pesanan
     * yang trip-nya melewati pos akun yang sedang login (baik sebagai
     * pos asal/origin maupun pos tujuan/destination).
     * Dioptimasi dengan 1 query JOIN tunggal (bukan 3x whereHas).
     */
    public function stats(Request $request)
    {
        $pointId = $request->user()->pickup_point_id;

        if (!$pointId) {
            return response()->json([
                'nebeng_motor' => 0,
                'nebeng_mobil' => 0,
                'nebeng_barang' => 0,
            ]);
        }

        $stats = Order::where('orders.status', 'completed')
            ->join('trips', 'orders.trip_id', '=', 'trips.id')
            ->where(function ($q) use ($pointId) {
                $q->where('trips.origin_point_id', $pointId)
                  ->orWhere('trips.destination_point_id', $pointId);
            })
            ->selectRaw("
                COALESCE(SUM(CASE WHEN trips.vehicle_type = 'motor' THEN 1 ELSE 0 END), 0) as nebeng_motor,
                COALESCE(SUM(CASE WHEN trips.vehicle_type = 'mobil' THEN 1 ELSE 0 END), 0) as nebeng_mobil,
                COALESCE(SUM(CASE WHEN trips.vehicle_type = 'barang' THEN 1 ELSE 0 END), 0) as nebeng_barang
            ")
            ->first();

        return response()->json([
            'nebeng_motor' => (int) ($stats->nebeng_motor ?? 0),
            'nebeng_mobil' => (int) ($stats->nebeng_mobil ?? 0),
            'nebeng_barang' => (int) ($stats->nebeng_barang ?? 0),
        ]);
    }

    /**
     * Daftar pesanan "akan datang" (status pending) yang trip-nya melewati
     * pos akun yang sedang login.
     */
    public function upcomingOrders(Request $request)
    {
        $pointId = $request->user()->pickup_point_id;

        if (!$pointId) {
            return response()->json([]);
        }

        $orders = Order::select(['id', 'trip_id', 'customer_id', 'status', 'price', 'created_at'])
            ->with([
                'customer:id,name,phone,avatar',
                'trip' => function ($q) {
                    $q->select('id', 'mitra_id', 'vehicle_type', 'departure_date', 'departure_time');
                },
                'trip.mitra:id,name,phone,avatar'
            ])
            ->where('status', 'pending')
            ->whereHas('trip', function ($q) use ($pointId) {
                $q->where('origin_point_id', $pointId)
                  ->orWhere('destination_point_id', $pointId);
            })
            ->latest()
            ->get();

        return response()->json($orders);
    }
}