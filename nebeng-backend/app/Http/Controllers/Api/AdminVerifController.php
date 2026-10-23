<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Verification;
use App\Models\MitraVehicle;
use Illuminate\Http\Request;
use App\Services\NotificationService;

class AdminVerifController extends Controller
{
    // =============================
    // 1. GET MITRA PENDING
    // =============================
    public function pending(Request $request)
    {
        $status = $request->query('status') === 'rejected' ? 'rejected' : 'pending';

        $mitra = User::select('id', 'name', 'email', 'phone', 'status', 'created_at', 'avatar')
            ->where('role', 'mitra')
            ->where('status', $status)
            ->latest()
            ->get();

        return response()->json($mitra);
    }

    // =============================
    // 2. GET DETAIL MITRA
    // =============================
    public function show($id)
    {
        $mitra = User::where('role', 'mitra')
            ->findOrFail($id);

        return response()->json($mitra);
    }

    // =============================
    // 3. APPROVE MITRA
    // =============================
    public function approve($id)
    {
        $mitra = User::findOrFail($id);

        $mitra->status = 'verified';
        $mitra->save();

        // Sinkronkan juga baris Verification-nya (dulu tidak pernah
        // disentuh di sini - lihat catatan panjang di reject() di bawah
        // soal kenapa ini penting).
        Verification::where('user_id', $mitra->id)
            ->latest()
            ->first()
            ?->update(['status' => 'verified']);

        NotificationService::send(
            $mitra->id,
            'Verifikasi Disetujui',
            'Selamat! Akun mitra kamu sudah terverifikasi. Kamu sekarang bisa membuat tebengan.',
            'verification',
            '/mitra/dashboard'
        );

        return response()->json([
            'message' => 'Mitra berhasil diverifikasi'
        ]);
    }

    // =============================
    // 4. REJECT / BLOKIR MITRA
    // =============================
    public function reject($id)
    {
        $mitra = User::findOrFail($id);

        $mitra->status = 'rejected';
        $mitra->save();

        // WAJIB: sinkronkan baris Verification-nya juga. Sebelumnya method
        // ini HANYA mengubah User.status, baris di tabel `verifications`
        // tetap 'pending' selamanya. Akibatnya VerificationController::store()
        // (yang menolak submit baru selama masih ada Verification berstatus
        // 'pending' milik user itu) akan PERMANEN menolak mitra ini
        // mengajukan ulang - padahal pesan di halaman StatusAkun.jsx sendiri
        // eksplisit bilang "silakan ajukan ulang".
        Verification::where('user_id', $mitra->id)
            ->latest()
            ->first()
            ?->update(['status' => 'rejected']);

        // Kendaraan yang diajukan bersamaan (masih "pending") ikut ditolak,
        // satu paket dengan penolakan akun mitra - simetris dengan approve()
        // di VerificationController yang sekalian menyetujui kendaraan.
        if ($mitra->role === 'mitra') {
            MitraVehicle::where('user_id', $mitra->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'rejected',
                    'notes' => 'Ditolak otomatis karena verifikasi akun mitra ditolak.',
                ]);
        }

        NotificationService::send(
            $mitra->id,
            'Verifikasi Ditolak',
            'Verifikasi akun mitra kamu ditolak. Silakan ajukan ulang dokumen verifikasi Anda.',
            'verification',
            '/mitra/verification'
        );

        return response()->json([
            'message' => 'Mitra berhasil diblokir'
        ]);
    }

    // =============================
    // GET CUSTOMER PENDING
    // =============================
    public function pendingCustomer(Request $request)
    {
        $status = $request->query('status') === 'rejected' ? 'rejected' : 'pending';

        $customers = User::select('id', 'name', 'email', 'phone', 'status', 'created_at', 'avatar')
            ->where('role', 'customer')
            ->where('status', $status)
            ->latest()
            ->get();

        return response()->json($customers);
    }

    // =============================
    // BLOKIR CUSTOMER
    // =============================
    public function rejectCustomer($id)
    {
        $user = User::findOrFail($id);

        $user->status = 'rejected';
        $user->save();

        // Sama seperti reject() mitra di atas - supaya customer yang
        // ditolak juga bisa mengajukan verifikasi ulang, bukan terkunci
        // permanen.
        Verification::where('user_id', $user->id)
            ->latest()
            ->first()
            ?->update(['status' => 'rejected']);

        NotificationService::send(
            $user->id,
            'Verifikasi Ditolak',
            'Verifikasi akun kamu ditolak. Silakan ajukan ulang dokumen verifikasi Anda.',
            'verification',
            '/customer/verification'
        );

        return response()->json([
            'message' => 'Customer berhasil diblokir'
        ]);
    }
    
}