<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Reward;
use Illuminate\Support\Facades\Storage;

class RewardManagementController extends Controller
{
    // Daftar semua reward (termasuk yang nonaktif) untuk halaman admin
    public function index(Request $request)
    {
        $query = Reward::query();

        if ($search = $request->query('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        $rewards = $query->orderByDesc('created_at')->paginate(10);

        return response()->json($rewards);
    }

    public function show($id)
    {
        return response()->json(Reward::findOrFail($id));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:4096',
            'points_required' => 'required|integer|min:1',
            'stock' => 'nullable|integer|min:0',
            'category' => 'required|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = 'http://127.0.0.1:8000/storage/' . $request->file('image')->store('rewards', 'public');
        }

        $validated['is_active'] = $request->boolean('is_active', true);

        $reward = Reward::create($validated);

        return response()->json([
            'message' => 'Reward berhasil ditambahkan',
            'reward' => $reward,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $reward = Reward::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:4096',
            'points_required' => 'sometimes|integer|min:1',
            'stock' => 'nullable|integer|min:0',
            'category' => 'sometimes|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        if ($request->hasFile('image')) {
            // hapus foto lama kalau itu file upload kita sendiri (bukan URL eksternal)
            if ($reward->image && str_contains($reward->image, '/storage/rewards/')) {
                $oldPath = str_replace('http://127.0.0.1:8000/storage/', '', $reward->image);
                Storage::disk('public')->delete($oldPath);
            }

            $validated['image'] = 'http://127.0.0.1:8000/storage/' . $request->file('image')->store('rewards', 'public');
        }

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $reward->update($validated);

        return response()->json([
            'message' => 'Reward berhasil diperbarui',
            'reward' => $reward,
        ]);
    }

    public function destroy($id)
    {
        $reward = Reward::findOrFail($id);

        if ($reward->image && str_contains($reward->image, '/storage/rewards/')) {
            $oldPath = str_replace('http://127.0.0.1:8000/storage/', '', $reward->image);
            Storage::disk('public')->delete($oldPath);
        }

        $reward->delete();

        return response()->json(['message' => 'Reward berhasil dihapus']);
    }
}