<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Trip;
use App\Models\DriverBalance;
use App\Models\BalanceTransaction;
use App\Services\NotificationService;

class OrderCancellationService
{
    // Status refund yang MASIH punya kewajiban berjalan (uang belum benar-
    // benar sampai & dikonfirmasi customer, atau sedang disengketakan).
    // Selama ada order dalam status ini, trip terkait TIDAK BOLEH dianggap
    // "selesai dibatalkan" - baru status 'not_applicable' (cash),
    // 'non_refundable', atau 'refunded' yang dianggap tuntas.
    private const OUTSTANDING_REFUND_STATUSES = [
        'pending_100_percent',
        'pending_50_percent',
        'mitra_claimed',
        'disputed',
    ];

    /**
     * Cek apakah sebuah trip yang sudah dibatalkan MASIH punya order dengan
     * kewajiban refund yang belum tuntas. Dipakai untuk menentukan apakah
     * trip boleh langsung berstatus 'cancelled' atau harus mengambang dulu
     * di 'cancelled_pending_refund' sampai semua beres.
     */
    public static function tripHasOutstandingRefund(Trip $trip): bool
    {
        return $trip->orders()
            ->where('status', 'cancelled')
            ->whereIn('refund_status', self::OUTSTANDING_REFUND_STATUSES)
            ->exists();
    }

    /**
     * Setelah SATU order refund-nya tuntas (customer konfirmasi terima,
     * atau admin menandai selesai), cek apakah trip induknya (yang sempat
     * "mengambang" di status cancelled_pending_refund karena order ini)
     * sudah boleh dianggap benar-benar selesai dibatalkan.
     */
    public static function finalizeTripIfSettled(?Trip $trip): void
    {
        if (!$trip || $trip->status !== 'cancelled_pending_refund') {
            return;
        }

        if (!self::tripHasOutstandingRefund($trip)) {
            $trip->update(['status' => 'cancelled']);
        }
    }
    public static function cancelWithFullRefund(Order $order, string $notifTitle, string $notifMessage): void
    {
        if ($order->status === 'cancelled') {
            return;
        }

        $wasCapacityReserved = $order->wasCapacityReserved();
        $capacityAmount = $order->capacityWeight();

        if ($order->payment_method === 'qris') {
            $refundAmount = (int) $order->price;

            // Kalau mitra sudah confirm pembayaran (saldo mitra sudah
            // ditambah), tarik kembali supaya saldo mitra mencerminkan
            // kewajiban refund - sama seperti di cancelOrder().
            if ($order->payment_status === 'paid' && $refundAmount > 0 && $order->trip) {
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
                    'description' => "Potongan saldo untuk refund 100% order #{$order->id} (dibatalkan sistem/mitra)",
                ]);
            }

            $order->update([
                'status' => 'cancelled',
                'refund_status' => 'pending_100_percent',
                'refund_percentage' => 100,
                'refund_amount' => $refundAmount,
                'cancelled_at' => now(),
            ]);
        } else {
            // Cash belum pernah dibayar di muka - tidak ada yang perlu
            // direfund secara nominal, dan TIDAK ada penalti karena ini
            // bukan salah customer.
            $order->update([
                'status' => 'cancelled',
                'refund_status' => 'not_applicable',
                'cancelled_at' => now(),
            ]);
        }

        if ($wasCapacityReserved && $order->trip) {
            $order->trip->increment('seat_available', $capacityAmount);
        }

        \App\Models\OrderQrSession::where('order_id', $order->id)->delete();

        if ($order->customer_id) {
            NotificationService::send(
                $order->customer_id,
                $notifTitle,
                $notifMessage,
                'order',
                $order->trip_id ? "/customer/pesanan/{$order->id}" : null
            );
        }
    }
}