<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;

class AdminOrderController extends Controller
{
    public function index()
    {
        $orders = Order::select([
            'id', 'customer_id', 'trip_id', 'status', 'price',
            'payment_method', 'payment_status', 'payment_proof',
            'refund_status', 'cancelled_at', 'created_at', 'updated_at'
        ])
        ->with([
            'customer:id,name,email,phone,avatar',
            'trip' => function ($q) {
                // Jangan load route_geojson (ribuan koordinat) supaya query & transfer jauh lebih cepat
                $q->select([
                    'id', 'mitra_id', 'vehicle_type', 'departure_date',
                    'departure_time', 'price', 'status',
                    'origin_point_id', 'destination_point_id'
                ]);
            },
            'trip.mitra:id,name,email,phone,avatar',
            'trip.originPoint:id,pos_name,city_id,address',
            'trip.originPoint.city:id,name',
            'trip.destinationPoint:id,pos_name,city_id,address',
            'trip.destinationPoint.city:id,name'
        ])
        ->latest()
        ->get();

        return response()->json($orders);
    }
}