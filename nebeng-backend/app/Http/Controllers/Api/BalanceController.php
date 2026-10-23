<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DriverBalance;

class BalanceController extends Controller
{
    public function getBalance(Request $request)
    {
        $user = $request->user();

        // pastikan hanya mitra
        if ($user->role !== 'mitra') {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $balance = DriverBalance::firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 0]
        );

        return response()->json([
            'balance' => $balance->balance
        ]);
    }

    public function history(Request $request)
    {
        $user = $request->user();

        $data = \App\Models\BalanceTransaction::where('user_id', $user->id)
            ->latest()
            ->get();

        return response()->json($data);
    }
}