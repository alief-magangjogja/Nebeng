<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\PickupPoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminPosMitraController extends Controller
{
    // Daftar semua akun pos_mitra + pos (pickup point) yang jadi tanggung
    // jawabnya, buat tabel di admin.
    public function index()
    {
        $accounts = User::with('pickupPoint.city')
            ->where('role', 'pos_mitra')
            ->orderBy('name')
            ->get();

        return response()->json($accounts);
    }

    // Daftar pickup point yang BELUM punya akun pos_mitra (kecuali sedang
    // mode edit - lihat parameter except_user_id) - satu pos cuma boleh
    // dipegang SATU akun pos_mitra, supaya tidak ada 2 akun rebutan pos
    // yang sama.
    public function availablePickupPoints(Request $request)
    {
        $taken = User::where('role', 'pos_mitra')
            ->whereNotNull('pickup_point_id')
            ->when($request->except_user_id, function ($q) use ($request) {
                $q->where('id', '!=', $request->except_user_id);
            })
            ->pluck('pickup_point_id');

        $points = PickupPoint::with('city')
            ->whereNotIn('id', $taken)
            ->orderBy('city_id')
            ->orderBy('pos_name')
            ->get();

        return response()->json($points);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|max:20|unique:users,phone',
            'password' => 'required|string|min:6',
            'pickup_point_id' => 'required|exists:pickup_points,id|unique:users,pickup_point_id',
        ], [
            'pickup_point_id.unique' => 'Pos ini sudah punya akun pos_mitra lain. Satu pos hanya boleh dipegang satu akun.',
        ]);

        $account = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => 'pos_mitra',
            'status' => 'active',
            'pickup_point_id' => $validated['pickup_point_id'],
        ]);

        return response()->json($account->load('pickupPoint.city'), 201);
    }

    public function update(Request $request, $id)
    {
        $account = User::where('role', 'pos_mitra')->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $account->id,
            'phone' => 'required|string|max:20|unique:users,phone,' . $account->id,
            'password' => 'nullable|string|min:6',
            'pickup_point_id' => 'required|exists:pickup_points,id|unique:users,pickup_point_id,' . $account->id,
        ], [
            'pickup_point_id.unique' => 'Pos ini sudah punya akun pos_mitra lain. Satu pos hanya boleh dipegang satu akun.',
        ]);

        $account->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'pickup_point_id' => $validated['pickup_point_id'],
            ...($request->filled('password') ? ['password' => Hash::make($validated['password'])] : []),
        ]);

        return response()->json($account->load('pickupPoint.city'));
    }

    public function destroy($id)
    {
        $account = User::where('role', 'pos_mitra')->findOrFail($id);
        $account->delete();

        return response()->json(['message' => 'Akun pos mitra berhasil dihapus.']);
    }
}