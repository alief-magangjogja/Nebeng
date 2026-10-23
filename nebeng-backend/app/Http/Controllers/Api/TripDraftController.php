<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TripDraft;
use Illuminate\Http\Request;

class TripDraftController extends Controller
{
    // Daftar draft milik mitra yang sedang login, difilter per kategori
    // (?category=motor|mobil|barang) supaya tiap halaman Nebeng
    // Motor/Mobil/Barang cuma menampilkan draft yang relevan untuknya.
    public function index(Request $request)
    {
        $query = TripDraft::with(['originPoint.city', 'destinationPoint.city', 'vehicle'])
            ->where('user_id', $request->user()->id);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|in:motor,mobil,barang',
            'origin_point_id' => 'required|exists:pickup_points,id',
            'destination_point_id' => 'required|exists:pickup_points,id|different:origin_point_id',
            'departure_time' => 'required|date_format:H:i',
            'mitra_vehicle_id' => 'nullable|exists:mitra_vehicles,id',
            'tebengan_type' => 'nullable|string',
            'seat_count' => 'nullable|integer|min:1',
            'baggage_capacity' => 'nullable|string',
        ]);

        $draft = TripDraft::create($validated + ['user_id' => $request->user()->id]);

        return response()->json([
            'message' => 'Draft berhasil disimpan',
            'draft' => $draft->load(['originPoint.city', 'destinationPoint.city', 'vehicle']),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        // WAJIB scoped ke user_id - tanpa ini mitra lain bisa edit draft
        // orang lain hanya dengan menebak id di URL.
        $draft = TripDraft::where('user_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'category' => 'sometimes|required|in:motor,mobil,barang',
            'origin_point_id' => 'sometimes|required|exists:pickup_points,id',
            'destination_point_id' => 'sometimes|required|exists:pickup_points,id|different:origin_point_id',
            'departure_time' => 'sometimes|required|date_format:H:i',
            'mitra_vehicle_id' => 'nullable|exists:mitra_vehicles,id',
            'tebengan_type' => 'nullable|string',
            'seat_count' => 'nullable|integer|min:1',
            'baggage_capacity' => 'nullable|string',
        ]);

        $draft->update($validated);

        return response()->json([
            'message' => 'Draft berhasil diperbarui',
            'draft' => $draft->fresh()->load(['originPoint.city', 'destinationPoint.city', 'vehicle']),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $draft = TripDraft::where('user_id', $request->user()->id)->findOrFail($id);
        $draft->delete();

        return response()->json(['message' => 'Draft berhasil dihapus']);
    }
}