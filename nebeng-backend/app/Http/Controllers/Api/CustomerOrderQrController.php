<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderQrSession;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CustomerOrderQrController extends Controller
{
    public function generate($orderId)
    {
        $order = Order::findOrFail($orderId);

        // WAJIB: pastikan order ini benar-benar milik customer yang
        // sedang login. Tanpa ini, siapa pun yang login (termasuk role
        // lain, karena route-nya cuma dilindungi auth:sanctum) bisa
        // generate QR check-in untuk order milik orang lain hanya
        // dengan menebak orderId.
        if ($order->customer_id !== auth()->id()) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // QR dipakai buat check-in SEBELUM/SAAT boarding (di-scan POS Mitra),
        // jadi tidak boleh disyaratkan trip sudah 'completed' - itu baru
        // terjadi setelah perjalanan berakhir. Yang wajar menghalangi
        // generate QR cuma order yang sudah dibatalkan.
        if ($order->status === 'cancelled') {
            return response()->json([
                'message' => 'Order ini sudah dibatalkan'
            ], 400);
        }

        // purpose=checkin WAJIB difilter di sini - sejak ada fitur QR
        // pengiriman barang (purpose=delivery) untuk order yang sama,
        // tanpa filter ini query bisa salah ambil sesi delivery yang
        // masih aktif, padahal yang diminta QR check-in.
        $existing = OrderQrSession::where('order_id', $order->id)
            ->where('purpose', 'checkin')
            ->where('is_used', false)
            ->where('expired_at', '>', now())
            ->latest()
            ->first();

        if ($existing) {
            return response()->json([
                'order_id' => $order->id,
                'token' => $existing->token,
                'expired_at' => $existing->expired_at,
                'is_existing' => true,
            ]);
        }

        $session = OrderQrSession::create([
            'order_id' => $order->id,
            'token' => Str::random(12),
            'purpose' => 'checkin',
            'expired_at' => Carbon::now()->addHours(3),
        ]);

        return response()->json([
            'order_id' => $order->id,
            'token' => $session->token,
            'expired_at' => $session->expired_at,
            'is_existing' => false,
        ]);
    }
}