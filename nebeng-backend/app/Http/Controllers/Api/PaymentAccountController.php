<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentAccount;
use Illuminate\Http\Request;

class PaymentAccountController extends Controller
{
    // GET /payment-accounts - daftar rekening/e-wallet milik user yang login
    public function index(Request $request)
    {
        $accounts = PaymentAccount::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($accounts);
    }

    // POST /payment-accounts - tambah rekening/e-wallet baru
    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_type' => 'required|in:bank,ewallet',
            'provider_name' => 'required|string|max:50',
            'account_number' => 'required|string|min:4|max:34',
            'account_holder_name' => 'required|string|max:100',
        ], [
            'account_type.required' => 'Pilih jenis rekening atau e-wallet.',
            'provider_name.required' => 'Nama bank/e-wallet wajib diisi.',
            'account_number.required' => 'Nomor rekening/e-wallet wajib diisi.',
            'account_number.min' => 'Nomor rekening/e-wallet terlalu pendek.',
            'account_holder_name.required' => 'Nama pemilik rekening wajib diisi.',
        ]);

        $account = PaymentAccount::create([
            'user_id' => $request->user()->id,
            'account_type' => $validated['account_type'],
            'provider_name' => $validated['provider_name'],
            'account_number' => $validated['account_number'],
            'account_holder_name' => $validated['account_holder_name'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rekening/e-wallet berhasil disimpan.',
            'account' => $account,
        ], 201);
    }

    // DELETE /payment-accounts/{id} - hapus rekening/e-wallet milik sendiri saja
    public function destroy(Request $request, $id)
    {
        $account = PaymentAccount::where('user_id', $request->user()->id)->findOrFail($id);
        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rekening/e-wallet berhasil dihapus.',
        ]);
    }
}