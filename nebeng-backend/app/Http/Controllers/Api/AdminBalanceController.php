<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BalanceTransaction;
use App\Models\DriverBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminBalanceController extends Controller
{
    // List permintaan penarikan saldo yang masih pending, buat direview admin
    public function pendingWithdrawals()
    {
        $withdrawals = BalanceTransaction::with('user')
            ->where('type', 'debit')
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'amount' => $t->amount,
                    'description' => $t->description,
                    'created_at' => $t->created_at,
                    'mitra' => [
                        'id' => $t->user->id ?? null,
                        'name' => $t->user->name ?? '-',
                        'bank_name' => $t->user->profile->bank_name ?? '-',
                        'bank_account_name' => $t->user->profile->bank_account_name ?? '-',
                        'bank_account_number' => $t->user->profile->bank_account_number ?? '-',
                    ],
                ];
            });

        return response()->json($withdrawals);
    }

    // Riwayat semua penarikan (pending/completed/rejected), buat referensi admin
    public function allWithdrawals()
    {
        $withdrawals = BalanceTransaction::with('user')
            ->where('type', 'debit')
            ->latest()
            ->get();

        return response()->json($withdrawals);
    }

    // Admin approve -> baru di sini saldo mitra beneran kepotong
    public function approve($id)
    {
        $transaction = BalanceTransaction::where('type', 'debit')
            ->where('status', 'pending')
            ->findOrFail($id);

        $balance = DriverBalance::where('user_id', $transaction->user_id)->first();

        if (!$balance || $balance->balance < $transaction->amount) {
            return response()->json([
                'message' => 'Saldo mitra sudah tidak mencukupi untuk permintaan ini'
            ], 400);
        }

        DB::transaction(function () use ($balance, $transaction) {
            $balance->decrement('balance', $transaction->amount);

            $transaction->update([
                'status' => 'completed',
                'description' => 'Penarikan saldo (disetujui admin)',
            ]);
        });

        try {
            \App\Services\NotificationService::send(
                $transaction->user_id,
                'Penarikan Saldo Disetujui',
                'Penarikan saldo sebesar Rp ' . number_format($transaction->amount, 0, ',', '.') . ' sudah disetujui dan akan segera masuk ke rekening kamu.',
                'balance',
                '/mitra/riwayat-saldo'
            );
        } catch (\Throwable $e) {
            \Log::warning('Gagal kirim notifikasi approve withdraw: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Penarikan saldo disetujui',
            'data' => $transaction,
        ]);
    }

    // Admin reject -> saldo TIDAK kepotong sama sekali
    public function reject(Request $request, $id)
    {
        $transaction = BalanceTransaction::where('type', 'debit')
            ->where('status', 'pending')
            ->findOrFail($id);

        $transaction->update([
            'status' => 'rejected',
            'description' => 'Penarikan saldo ditolak admin' . ($request->reason ? ': ' . $request->reason : ''),
        ]);

        try {
            \App\Services\NotificationService::send(
                $transaction->user_id,
                'Penarikan Saldo Ditolak',
                'Permintaan penarikan saldo kamu ditolak admin.' . ($request->reason ? ' Alasan: ' . $request->reason : ''),
                'balance',
                '/mitra/riwayat-saldo'
            );
        } catch (\Throwable $e) {
            \Log::warning('Gagal kirim notifikasi reject withdraw: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Penarikan saldo ditolak',
            'data' => $transaction,
        ]);
    }
}