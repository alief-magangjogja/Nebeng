<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BalanceTransaction;
use Illuminate\Http\Request;

class AdminRevenueController extends Controller
{
    /**
     * Laporan pendapatan platform, bisa difilter berdasarkan rentang
     * tanggal. Menggantikan fitur "saldo mitra + tarik saldo" karena
     * pembayaran sekarang pakai QRIS statis yang langsung masuk ke
     * e-wallet/rekening mitra sendiri - uang tidak pernah ditahan atau
     * ditarik lewat platform ini.
     */
    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        $transactions = (clone $query)->orderByDesc('created_at')->paginate(15);

        $totalPendapatan = (clone $query)->sum('amount');

        return response()->json([
            'transactions' => $transactions,
            'total_pendapatan' => $totalPendapatan,
        ]);
    }

    /**
     * Sama seperti index(), tapi tanpa pagination - dipakai buat tombol
     * "Download" di halaman Pendapatan supaya file excel/csv yang
     * dihasilkan berisi SEMUA baris yang cocok dengan filter (tanggal,
     * status, pos), bukan cuma 15 baris yang lagi tampil di layar.
     */
    public function export(Request $request)
    {
        $query = $this->filteredQuery($request);

        $transactions = (clone $query)->orderByDesc('created_at')->get();

        $totalPendapatan = (clone $query)->sum('amount');

        return response()->json([
            'transactions' => $transactions,
            'total_pendapatan' => $totalPendapatan,
        ]);
    }

    /**
     * Query dasar + filter yang dipakai bareng oleh index() dan export()
     * supaya logikanya tidak dobel.
     *
     * Filter yang didukung:
     * - from / to     : rentang tanggal (created_at)
     * - status        : status transaksi (pending | completed | rejected)
     * - pos_id        : filter berdasarkan pos/pickup point asal
     *                    perjalanan yang menghasilkan transaksi ini
     * - mitra_id      : filter berdasarkan mitra penerima
     */
    private function filteredQuery(Request $request)
    {
        $query = BalanceTransaction::with([
            'user:id,name',
            'order' => function ($q) {
                $q->select('id', 'trip_id', 'customer_id');
            },
            'order.trip' => function ($q) {
                $q->select('id', 'origin_point_id');
            },
            'order.trip.originPoint:id,pos_name'
        ])
        ->where('type', 'credit');

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('mitra_id')) {
            $query->where('user_id', $request->mitra_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('pos_id')) {
            $posId = $request->pos_id;
            $query->whereHas('order.trip', function ($q) use ($posId) {
                $q->where('origin_point_id', $posId);
            });
        }

        return $query;
    }
}