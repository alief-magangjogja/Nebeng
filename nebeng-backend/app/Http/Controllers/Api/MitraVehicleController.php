<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MitraVehicle;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class MitraVehicleController extends Controller
{
    /**
     * Mitra menambahkan data kendaraan (dipanggil saat proses verifikasi
     * akun awal, atau kapan saja setelah itu lewat halaman "Kendaraan" di
     * Profil). Kendaraan baru SELALU berstatus "pending" dan baru bisa
     * dipakai untuk membuat tebengan setelah disetujui admin.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'type' => 'required|in:motor,mobil,barang',
            'brand' => 'required|string|max:100',
            'model' => 'nullable|string|max:100',
            'plate_number' => 'required|string|max:20',
            'color' => 'nullable|string|max:50',

            // wajib diisi khusus untuk mobil (dipakai sebagai batas maksimal
            // jumlah penumpang saat membuat tebengan mobil)
            'seat_capacity' => 'nullable|integer|min:1|max:20',

            'photo' => 'nullable|image|max:4096',
        ]);

        if ($validated['type'] === 'mobil' && empty($validated['seat_capacity'])) {
            return response()->json([
                'message' => 'Kapasitas maksimal penumpang wajib diisi untuk kendaraan mobil.',
            ], 422);
        }

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('mitra_vehicles', 'public');
        }

        $vehicle = MitraVehicle::create([
            ...$validated,
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        // Notifikasi ke semua admin supaya kendaraan baru ini ditinjau
        try {
            $adminIds = User::where('role', 'admin')->pluck('id')->toArray();

            NotificationService::sendToMany(
                $adminIds,
                'Kendaraan Baru Menunggu Persetujuan',
                "{$user->name} menambahkan kendaraan {$vehicle->brand} ({$vehicle->type}) yang perlu ditinjau.",
                'vehicle',
                '/admin/kendaraan-mitra'
            );
        } catch (\Throwable $e) {
            \Log::warning('Gagal kirim notifikasi kendaraan baru: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Kendaraan berhasil ditambahkan dan menunggu persetujuan admin',
            'vehicle' => $vehicle,
        ], 201);
    }

    /**
     * Daftar kendaraan milik mitra yang sedang login (buat halaman
     * "Kendaraan" di Profil mitra) - termasuk yang masih pending/ditolak,
     * supaya mitra bisa lihat status pengajuannya.
     */
    public function myVehicles(Request $request)
    {
        $vehicles = MitraVehicle::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($vehicles);
    }

    /**
     * Kapasitas maksimal kursi mobil mitra (dipakai NebengMobil.jsx saat
     * membuat tebengan supaya jumlah penumpang tidak melebihi kapasitas
     * kendaraan asli yang terdaftar). Hanya menghitung kendaraan yang
     * SUDAH disetujui admin.
     */
    public function myCarCapacity(Request $request)
    {
        $vehicle = MitraVehicle::where('user_id', $request->user()->id)
            ->where('type', 'mobil')
            ->where('status', 'approved')
            ->orderByDesc('created_at')
            ->first();

        return response()->json([
            'has_vehicle' => (bool) $vehicle,
            'seat_capacity' => $vehicle->seat_capacity ?? null,
            'brand' => $vehicle->brand ?? null,
            'model' => $vehicle->model ?? null,
            'plate_number' => $vehicle->plate_number ?? null,
        ]);
    }

    public function update(Request $request, $id)
    {
        $vehicle = MitraVehicle::where('user_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'type' => 'sometimes|in:motor,mobil,barang',
            'brand' => 'sometimes|string|max:100',
            'model' => 'nullable|string|max:100',
            'plate_number' => 'sometimes|string|max:20',
            'color' => 'nullable|string|max:50',
            'seat_capacity' => 'nullable|integer|min:1|max:20',
        ]);

        // Kendaraan yang diedit mitra sendiri harus ditinjau ulang oleh
        // admin (supaya tidak bisa asal ganti data setelah disetujui).
        $validated['status'] = 'pending';
        $validated['notes'] = null;

        $vehicle->update($validated);

        return response()->json([
            'message' => 'Kendaraan berhasil diperbarui dan menunggu persetujuan ulang admin',
            'vehicle' => $vehicle,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $vehicle = MitraVehicle::where('user_id', $request->user()->id)->findOrFail($id);
        $vehicle->delete();

        return response()->json(['message' => 'Kendaraan berhasil dihapus']);
    }

    // ================= ADMIN =================

    /**
     * Daftar seluruh kendaraan mitra untuk halaman Admin > Kendaraan Mitra.
     */
    public function adminIndex(Request $request)
    {
        $query = MitraVehicle::with('user:id,name,avatar');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('brand', 'like', "%{$search}%")
                    ->orWhere('plate_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filter tanggal daftar kendaraan (dipakai tombol "Kalender" di
        // halaman Admin > Kendaraan Mitra). Opsional - tanpa parameter ini
        // hasilnya sama persis seperti sebelumnya.
        if ($dateFrom = $request->query('date_from')) {
        $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $query->orderByDesc('created_at');

        if ($request->boolean('export')) {
            return response()->json($query->get());
        }

        $vehicles = $query->paginate(10);

        return response()->json($vehicles);
    }

    public function adminShow($id)
    {
        $vehicle = MitraVehicle::with('user')->findOrFail($id);

        return response()->json($vehicle);
    }

    /**
     * Admin menyetujui kendaraan -> baru bisa dipakai mitra untuk
     * membuat tebengan setelah ini.
     */
    public function approve($id)
    {
        $vehicle = MitraVehicle::with('user')->findOrFail($id);

        $vehicle->update([
            'status' => 'approved',
            'notes' => null,
        ]);

        try {
            NotificationService::send(
                $vehicle->user_id,
                'Kendaraan Disetujui',
                "Kendaraan {$vehicle->brand} {$vehicle->model} ({$vehicle->plate_number}) kamu sudah disetujui dan bisa dipakai membuat tebengan.",
                'vehicle',
                '/mitra/kendaraan'
            );
        } catch (\Throwable $e) {
            \Log::warning('Gagal kirim notifikasi persetujuan kendaraan: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Kendaraan berhasil disetujui',
            'vehicle' => $vehicle,
        ]);
    }

    /**
     * Admin menolak kendaraan, dengan alasan opsional.
     */
    public function reject(Request $request, $id)
    {
        $vehicle = MitraVehicle::with('user')->findOrFail($id);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $vehicle->update([
            'status' => 'rejected',
            'notes' => $validated['notes'] ?? null,
        ]);

        try {
            NotificationService::send(
                $vehicle->user_id,
                'Kendaraan Ditolak',
                "Kendaraan {$vehicle->brand} {$vehicle->model} ({$vehicle->plate_number}) kamu ditolak." . (!empty($validated['notes']) ? " Alasan: {$validated['notes']}" : ''),
                'vehicle',
                '/mitra/kendaraan'
            );
        } catch (\Throwable $e) {
            \Log::warning('Gagal kirim notifikasi penolakan kendaraan: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Kendaraan ditolak',
            'vehicle' => $vehicle,
        ]);
    }
}