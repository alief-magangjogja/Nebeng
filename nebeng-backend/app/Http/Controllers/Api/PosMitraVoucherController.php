<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RewardTransaction;

class PosMitraVoucherController extends Controller
{
    /**
     * Cari data penukaran berdasarkan kode unik. Dipakai Pos Mitra untuk
     * cek dulu barang apa & atas nama siapa sebelum diserahkan.
     */
    public function find($code)
    {
        $transaction = RewardTransaction::with(['reward', 'user', 'claimedByUser'])
            ->where('unique_code', strtoupper(trim($code)))
            ->where('type', 'redeem')
            ->first();

        if (!$transaction) {
            return response()->json([
                'message' => 'Kode voucher tidak ditemukan. Periksa kembali kode yang dimasukkan.'
            ], 404);
        }

        return response()->json([
            'id' => $transaction->id,
            'unique_code' => $transaction->unique_code,
            'claim_status' => $transaction->claim_status,
            'claimed_at' => $transaction->claimed_at,
            'claimed_by' => $transaction->claimedByUser?->name,
            'redeemed_at' => $transaction->created_at,
            'reward' => $transaction->reward,
            'customer' => [
                'id' => $transaction->user->id,
                'name' => $transaction->user->name,
                'phone' => $transaction->user->phone,
            ],
        ]);
    }

    /**
     * Pos Mitra konfirmasi sudah menyerahkan barang -> tandai sebagai
     * claimed supaya kode yang sama tidak bisa dipakai lagi (anti-fraud).
     */
    public function claim(Request $request, $code)
    {
        $transaction = RewardTransaction::where('unique_code', strtoupper(trim($code)))
            ->where('type', 'redeem')
            ->first();

        if (!$transaction) {
            return response()->json([
                'message' => 'Kode voucher tidak ditemukan.'
            ], 404);
        }

        if ($transaction->claim_status === 'claimed') {
            return response()->json([
                'message' => 'Voucher ini sudah diklaim sebelumnya pada ' . $transaction->claimed_at->translatedFormat('d M Y, H:i') . '.'
            ], 400);
        }

        $transaction->update([
            'claim_status' => 'claimed',
            'claimed_at' => now(),
            'claimed_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Voucher berhasil diklaim. Silakan serahkan barangnya ke customer.',
        ]);
    }
}