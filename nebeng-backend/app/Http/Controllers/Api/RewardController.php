<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Reward;
use App\Models\RewardTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RewardController extends Controller
{
    /**
     * Daftar reward yang bisa ditukar (dipakai halaman Poin Hadiah).
     */
    public function index(Request $request)
    {
        $query = Reward::where('is_active', true);

        if ($search = $request->query('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $rewards = $query->orderBy('points_required')->get();

        return response()->json($rewards);
    }

    /**
     * Bikin kode unik yang belum pernah dipakai (dicek ke database
     * supaya tidak ada tabrakan, walaupun kemungkinannya sangat kecil).
     */
    private function generateUniqueCode(): string
    {
        do {
            $code = 'NBG-' . strtoupper(Str::random(8));
        } while (RewardTransaction::where('unique_code', $code)->exists());

        return $code;
    }

    /**
     * Tukar poin dengan reward tertentu. Setelah berhasil, customer dapat
     * kode unik yang nanti ditunjukkan/dimasukkan di Pos Mitra untuk
     * mengambil barangnya.
     */
    public function redeem(Request $request)
    {
        $request->validate([
            'reward_id' => 'required|exists:rewards,id',
        ]);

        $user = $request->user();
        $reward = Reward::findOrFail($request->reward_id);

        if (!$reward->is_active) {
            return response()->json([
                'message' => 'Reward ini sudah tidak tersedia.'
            ], 400);
        }

        if (!is_null($reward->stock) && $reward->stock <= 0) {
            return response()->json([
                'message' => 'Stok reward ini sudah habis.'
            ], 400);
        }

        if ($user->reward_points < $reward->points_required) {
            return response()->json([
                'message' => 'Poin kamu tidak cukup untuk menukar reward ini.'
            ], 400);
        }

        $uniqueCode = $this->generateUniqueCode();
        $transaction = null;

        DB::transaction(function () use ($user, $reward, $uniqueCode, &$transaction) {
            $user->reward_points -= $reward->points_required;
            $user->save();

            if (!is_null($reward->stock)) {
                $reward->decrement('stock');
            }

            $transaction = RewardTransaction::create([
                'user_id' => $user->id,
                'reward_id' => $reward->id,
                'type' => 'redeem',
                'points' => $reward->points_required,
                'description' => 'Penukaran: ' . $reward->title,
                'unique_code' => $uniqueCode,
                'claim_status' => 'unclaimed',
            ]);
        });

        return response()->json([
            'message' => 'Reward berhasil ditukar! Tunjukkan kode unik ini ke Pos Mitra untuk mengambil barangnya.',
            'remaining_points' => $user->fresh()->reward_points,
            'unique_code' => $uniqueCode,
            'reward' => $reward,
        ]);
    }
}