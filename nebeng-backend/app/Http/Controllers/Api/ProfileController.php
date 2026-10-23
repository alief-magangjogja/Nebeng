<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\UserProfile;

class ProfileController extends Controller
{
    // ===============================
    // GET PROFILE USER + PROFILE DATA
    // ===============================
    public function me(Request $request)
    {
        $user = $request->user()->load('profile');

        return response()->json($user);
    }

    public function show(Request $request)
    {
        $user = $request->user()->load('profile');

        return response()->json($user);
    }

    // ===============================
    // UPDATE PROFILE
    // ===============================
    public function update(Request $request)
    {
        $user = $request->user();

                $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'required|string|max:13|regex:/^[0-9]+$/',
            'avatar' => 'nullable|image|max:2048',
        ]);

        // upload avatar
        if ($request->hasFile('avatar')) {

            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }

            $path = $request->file('avatar')->store('avatars', 'public');
            $validated['avatar'] = $path;
        }

        // update tabel users
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'avatar' => $validated['avatar'] ?? $user->avatar,
        ]);

        return response()->json([
            'message' => 'Profil berhasil diperbarui',
            'user' => $user->load('profile')
        ]);
    }

    // ===============================
    // UPLOAD / GANTI QRIS MITRA
    // ===============================
    public function uploadQris(Request $request)
    {
        $request->validate([
            'qris_image' => 'required|image|max:4096',
        ]);

        $user = $request->user();
        $file = $request->file('qris_image');

        // PENTING: sebelumnya file mentah hasil upload langsung disimpan
        // apa adanya lewat ->store(). Beberapa gambar (mis. JPEG dengan
        // colorspace CMYK, atau PNG dengan profil warna tertentu) bisa
        // dibuka lancar di aplikasi viewer bawaan OS (Windows Photos, dsb)
        // - yang codec-nya cenderung toleran - tapi GAGAL/ditolak oleh
        // decoder gambar browser & banyak viewer web lain, sehingga
        // customer tidak bisa melihat QRIS-nya sama sekali walau filenya
        // "sah" dan bisa dibuka mitra sendiri di komputernya.
        //
        // Solusinya: decode ulang gambarnya lewat GD di sini, lalu simpan
        // ULANG sebagai PNG RGB standar (bukan file asli apa adanya).
        // Ini menormalkan APAPUN format/profil warna aslinya jadi satu
        // bentuk yang pasti didukung semua browser. Kalau GD sampai gagal
        // decode sama sekali, berarti filenya memang benar-benar rusak/
        // tidak didukung - mitra langsung diberi tahu untuk upload ulang,
        // bukan tersimpan diam-diam sebagai file yang nanti rusak juga
        // buat customer.
        $imageContent = file_get_contents($file->getRealPath());
        $gdImage = @imagecreatefromstring($imageContent);

        if ($gdImage === false) {
            return response()->json([
                'message' => 'Gambar tidak bisa diproses (format tidak didukung atau file rusak). Coba screenshot ulang atau simpan ulang gambarnya sebagai JPG/PNG, lalu upload lagi.',
            ], 422);
        }

        $width = imagesx($gdImage);
        $height = imagesy($gdImage);

        // Gambar ulang di atas kanvas RGB putih polos (membuang colorspace
        // aneh/profil ICC yang jadi biang masalah, dan sekaligus menangani
        // PNG transparan dengan latar putih yang konsisten).
        $normalized = imagecreatetruecolor($width, $height);
        $white = imagecolorallocate($normalized, 255, 255, 255);
        imagefill($normalized, 0, 0, $white);
        imagecopy($normalized, $gdImage, 0, 0, 0, 0, $width, $height);
        imagedestroy($gdImage);

        $profile = $user->profile;

        if ($profile && $profile->qris_image) {
            Storage::disk('public')->delete($profile->qris_image);
        }

        Storage::disk('public')->makeDirectory('qris');

        $path = 'qris/' . uniqid('qris_') . '.png';
        imagepng($normalized, Storage::disk('public')->path($path));
        imagedestroy($normalized);

        UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            ['qris_image' => $path]
        );

        return response()->json([
            'message' => 'QRIS berhasil disimpan',
            'qris_image' => $path,
        ]);
    }
}