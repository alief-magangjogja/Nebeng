<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PickupPoint;
use App\Models\City;
use Illuminate\Http\Request;

class AdminPickupPointController extends Controller
{
    // Daftar semua pickup point + info kota, buat tabel di admin
    public function index()
    {
        $points = PickupPoint::with('city')
            ->orderBy('city_id')
            ->orderBy('pos_name')
            ->get();

        return response()->json($points);
    }

    // Daftar kota, buat dropdown pilihan kota di form tambah/edit
    public function cities()
    {
        return response()->json(City::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'city_id' => 'required|exists:cities,id',
            'pos_name' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $point = PickupPoint::create($validated);

        return response()->json($point->load('city'), 201);
    }

    public function update(Request $request, $id)
    {
        $point = PickupPoint::findOrFail($id);

        $validated = $request->validate([
            'city_id' => 'required|exists:cities,id',
            'pos_name' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $point->update($validated);

        return response()->json($point->load('city'));
    }

    public function destroy($id)
    {
        $point = PickupPoint::findOrFail($id);

        // Cegah hapus pickup point yang masih dipakai trip aktif,
        // supaya tidak ada trip yang jadi "yatim" (origin/destination hilang)
        $inUse = \App\Models\Trip::where('origin_point_id', $id)
            ->orWhere('destination_point_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'Pickup point ini masih dipakai di data trip, tidak bisa dihapus.',
            ], 422);
        }

        $point->delete();

        return response()->json(['message' => 'Pickup point berhasil dihapus.']);
    }
}