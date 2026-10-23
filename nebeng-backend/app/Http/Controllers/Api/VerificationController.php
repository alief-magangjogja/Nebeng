<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Verification;
use App\Models\VerificationFile;
use Illuminate\Support\Facades\Storage;
use App\Models\UserProfile;
use App\Models\User;
use App\Models\MitraVehicle;
use App\Services\NotificationService;

class VerificationController extends Controller
{
    // 🔹 GET status verifikasi user
    public function status(Request $request)
    {
        $user = $request->user();

        // Ambil SEMUA pengajuan verifikasi milik user, urutkan dari yang
        // paling baru diajukan.
        $verifications = Verification::with('files')
            ->where('user_id', $user->id)
            ->latest()
            ->get();

        // PENTING: kalau ada pengajuan yang sudah disetujui admin (status
        // 'verified'), itu yang harus jadi acuan status akun — walau
        // ternyata bukan pengajuan yang paling baru dibuat. Tanpa ini,
        // pengajuan lama yang sudah 'verified' bisa "tertutup" oleh
        // pengajuan baru (mis. user tidak sengaja submit ulang) yang
        // masih berstatus 'pending', sehingga status akun salah tampil
        // sebagai "Sedang Ditinjau" padahal user itu sudah terverifikasi.
        $verification = $verifications->firstWhere('status', 'verified')
            ?? $verifications->first();

        return response()->json($verification);
    }

    // 🔹 SUBMIT verifikasi
    public function store(Request $request)
    {
        $request->validate([

            // ======================
            // BASIC
            // ======================
            'type' => 'required|string|in:customer,mitra',

            // ======================
            // FILES
            // ======================
            'face' => 'required|image|max:5120',
            'ktp' => 'required|image|max:5120',
            'selfie_ktp' => 'required|image|max:5120',

            // ======================
            // DATA KTP
            // ======================
            'full_name' => 'required|string|max:255',
            'nik' => 'required|string|digits:16|regex:/^[0-9]+$/',
            'birth_place' => 'required|string|max:255',
             'birth_date' => 'required|date|before_or_equal:' . now()->subYears(17)->format('Y-m-d'),
            'gender' => 'required|string|max:255',
            'address' => 'required|string',
            'province' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',

        ]);

        $user = $request->user();

        // =========================
        // CEK VERIFIKASI PENDING
        // =========================
        $existing = Verification::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Masih ada verifikasi yang diproses'
            ], 400);
        }

        // =========================
        // VALIDASI KHUSUS MITRA
        // =========================
        // Catatan: data kendaraan (motor/mobil/barang) TIDAK divalidasi/disimpan
        // di sini. Itu dikirim terpisah oleh frontend ke
        // POST /api/mitra/vehicles (MitraVehicleController) setelah verifikasi
        // utama ini berhasil, dan tersimpan ke tabel `mitra_vehicles`
        // (bukan tabel `vehicles` lama yang terhubung ke `drivers` dan
        // tidak punya kolom user_id/vehicle_type/color sama sekali).
        if ($request->type === 'mitra') {

            $request->validate([

                // FILES
                'sim' => 'required|image|max:10120',
                'skck' => 'required|image|max:10120',
            ]);
        }

        // =========================
        // UPDATE STATUS USER
        // =========================
        $user->update([
            'status' => 'pending'
        ]);

        // =========================
        // SIMPAN PROFILE
        // =========================
        UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            [

                // DATA DIRI
                'full_name' => $request->full_name,
                'nik' => $request->nik,
                'birth_place' => $request->birth_place,
                'birth_date' => $request->birth_date,
                'gender' => $request->gender,
                'address' => $request->address,
                'province' => $request->province,
                'city' => $request->city,
            ]
        );

        // =========================
        // CREATE VERIFICATION
        // =========================
        $verification = Verification::create([
            'user_id' => $user->id,
            'type' => $request->type,
            'status' => 'pending'
        ]);

        // =========================
        // FILE TYPES
        // =========================
        $files = [
            'face',
            'ktp',
            'selfie_ktp'
        ];

        // tambah file khusus mitra
        if ($request->type === 'mitra') {

            $files = array_merge($files, [
                'sim',
                'skck',
            ]);
        }

        // =========================
        // UPLOAD FILES
        // =========================
        foreach ($files as $fileType) {

            if ($request->hasFile($fileType)) {

                $path = $request->file($fileType)
                    ->store('verifications', 'public');

                VerificationFile::create([
                    'verification_id' => $verification->id,
                    'file_type' => $fileType,
                    'file_path' => $path
                ]);
            }
        }

        // Notifikasi admin bersifat "nice to have" - jangan sampai proses
        // verifikasi utama (yang sudah berhasil disimpan di atas) ikut gagal
        // hanya karena ada masalah di sisi notifikasi (mis. migration tabel
        // `notifications` belum dijalankan).
        try {
            $this->notifyAdmins($user->name, $request->type);
        } catch (\Throwable $e) {
            \Log::warning('Gagal kirim notifikasi verifikasi baru: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Verifikasi berhasil dikirim',
            'data' => $verification
        ]);
    }

    // Kirim notifikasi ke semua admin saat ada pengajuan verifikasi baru
    private function notifyAdmins($userName, $type)
    {
        $adminIds = User::where('role', 'admin')->pluck('id')->toArray();

        NotificationService::sendToMany(
            $adminIds,
            'Pengajuan Verifikasi Baru',
            "{$userName} mengajukan verifikasi akun " . ($type === 'mitra' ? 'mitra' : 'customer') . '.',
            'verification',
            $type === 'mitra' ? '/admin/verifikasi-mitra' : '/admin/verifikasi-customer'
        );
    }

    public function approve($id)
    {
        $verification = Verification::findOrFail($id);

        // update status verification
        $verification->update([
            'status' => 'verified'
        ]);

        // update status user
        User::where('id', $verification->user_id)
            ->update([
                'status' => 'verified'
            ]);

        // =========================
        // SEKALIAN SETUJUI KENDARAAN
        // =========================
        // Kendaraan yang diisi mitra saat mengajukan verifikasi (masih
        // "pending") ikut disetujui di sini. Kendaraan yang sudah
        // approved/rejected sebelumnya (mis. ditambahkan lagi lewat halaman
        // "Kendaraan" di Profil setelah akun aktif) TIDAK disentuh - itu
        // tetap lewat MitraVehicleController::approve()/reject() seperti biasa.
        $approvedVehicles = 0;

        if ($verification->type === 'mitra') {
            $approvedVehicles = MitraVehicle::where('user_id', $verification->user_id)
                ->where('status', 'pending')
                ->update(['status' => 'approved', 'notes' => null]);
        }

        try {
            NotificationService::send(
                $verification->user_id,
                'Verifikasi Disetujui',
                $verification->type === 'mitra'
                    ? ($approvedVehicles > 0
                        ? 'Selamat! Akun mitra dan kendaraan kamu sudah terverifikasi. Kamu sekarang bisa membuat tebengan.'
                        : 'Selamat! Akun mitra kamu sudah terverifikasi. Kamu sekarang bisa membuat tebengan.')
                    : 'Selamat! Akun kamu sudah terverifikasi.',
                'verification',
                $verification->type === 'mitra' ? '/mitra/dashboard' : '/customer/dashboard'
            );
        } catch (\Throwable $e) {
            \Log::warning('Gagal kirim notifikasi persetujuan verifikasi: ' . $e->getMessage());
        }

        return response()->json([
            'message' => $approvedVehicles > 0
                ? 'User dan kendaraan berhasil diverifikasi'
                : 'User berhasil diverifikasi'
        ]);
    }

    // 🔹 GANTI 1 dokumen (KTP/SIM/SKCK/selfie_ktp) tanpa perlu mengajukan
    // verifikasi dari awal lagi. Dipakai tombol "Ubah" di halaman
    // "Dokumen" mitra/customer.
    public function updateDocument(Request $request)
    {
        $request->validate([
            'file_type' => 'required|string|in:ktp,selfie_ktp,sim,skck,face',
            'file' => 'required|image|max:10120',
        ]);

        $user = $request->user();

        // Acuannya sama seperti method status(): pengajuan yang sudah
        // 'verified' kalau ada, kalau belum ada baru ambil yang paling
        // baru dibuat. Supaya konsisten dengan dokumen yang mitra lihat
        // di halaman Dokumen.
        $verification = Verification::where('user_id', $user->id)
            ->where('status', 'verified')
            ->latest()
            ->first();

        if (!$verification) {
            $verification = Verification::where('user_id', $user->id)
                ->latest()
                ->first();
        }

        if (!$verification) {
            return response()->json([
                'message' => 'Belum ada data verifikasi untuk diperbarui.',
            ], 404);
        }

        $path = $request->file('file')->store('verifications', 'public');

        $existingFile = VerificationFile::where('verification_id', $verification->id)
            ->where('file_type', $request->file_type)
            ->first();

        if ($existingFile) {
            // Hapus file lama dari storage supaya tidak menumpuk sampah
            if ($existingFile->file_path && Storage::disk('public')->exists($existingFile->file_path)) {
                Storage::disk('public')->delete($existingFile->file_path);
            }

            $existingFile->update(['file_path' => $path]);
            $file = $existingFile;
        } else {
            $file = VerificationFile::create([
                'verification_id' => $verification->id,
                'file_type' => $request->file_type,
                'file_path' => $path,
            ]);
        }

        return response()->json([
            'message' => 'Dokumen berhasil diperbarui',
            'file' => $file,
        ]);
    }
}