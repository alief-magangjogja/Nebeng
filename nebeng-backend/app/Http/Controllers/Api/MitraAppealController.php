<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MitraAppeal;
use App\Models\Verification;
use Illuminate\Http\Request;

class MitraAppealController extends Controller
{
    // ================= MITRA: AJUKAN BANDING =================
    // Mitra yang statusnya 'blocked' mengajukan banding dengan alasan.
    // Cuma boleh ada 1 banding 'pending' aktif per mitra - kalau masih
    // ada yang menunggu review, tolak pengajuan baru supaya admin tidak
    // kebanjiran duplikat dari mitra yang sama.
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->status !== 'blocked') {
            return response()->json([
                'message' => 'Fitur banding hanya untuk akun yang sedang diblokir.'
            ], 400);
        }

        $alreadyPending = MitraAppeal::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($alreadyPending) {
            return response()->json([
                'message' => 'Kamu masih punya pengajuan banding yang sedang ditinjau. Mohon tunggu hasilnya terlebih dahulu.'
            ], 400);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:2000',
        ]);

        $appeal = MitraAppeal::create([
            'user_id' => $user->id,
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Pengajuan banding berhasil dikirim. Admin akan meninjau dalam waktu maksimal 1x24 jam.',
            'appeal' => $appeal,
        ], 201);
    }

    // ================= MITRA: CEK STATUS BANDING TERAKHIR =================
    // Dipakai halaman Beranda mitra supaya kalau mitra sudah pernah
    // mengajukan banding, tampil status terakhirnya (bukan form kosong
    // lagi) - termasuk kalau baru saja ditolak, supaya mitra tahu alasan
    // penolakannya (admin_notes) dan bisa mengajukan banding baru.
    public function latest(Request $request)
    {
        $user = $request->user();

        $appeal = MitraAppeal::where('user_id', $user->id)
            ->latest()
            ->first();

        return response()->json([
            'appeal' => $appeal,
        ]);
    }

    // ================= ADMIN: DAFTAR BANDING =================
    public function index(Request $request)
    {
        $query = MitraAppeal::with(['user:id,name,email,phone,mitra_strike_count'])
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

    // ================= ADMIN: SETUJUI BANDING =================
    // Menyetujui banding -> akun mitra dibuka blokirnya (dipulihkan sesuai
    // status verifikasi TERAKHIR miliknya, sama seperti logic
    // AdminController::unblockUser supaya konsisten), DAN kedua sumber
    // pelanggaran yang bisa menyebabkan blokir sama-sama "dimaafkan":
    // - mitra_strike_count (dari keterlambatan/pembatalan trip) -> direset ke 0
    // - riwayat teguran komplain (dihitung dari OrderComplaint) -> tidak
    //   dihapus, tapi warnings_reset_at dimajukan ke sekarang supaya
    //   komplain SEBELUM titik ini tidak lagi dihitung sebagai teguran
    //   aktif (lihat OrderComplaintController::countActiveWarnings).
    //
    // PENTING: mitra_strike_count dan warnings_reset_at TIDAK ada di
    // $fillable milik User, jadi sengaja diisi lewat assignment langsung
    // ($user->kolom = nilai; $user->save()) - bukan $user->update([...]) -
    // supaya tidak diam-diam gagal tanpa error akibat mass-assignment guard.
    public function approve(Request $request, $id)
    {
        $appeal = MitraAppeal::with('user')->findOrFail($id);

        if ($appeal->status !== 'pending') {
            return response()->json([
                'message' => 'Banding ini sudah pernah ditinjau sebelumnya.'
            ], 400);
        }

        $user = $appeal->user;

        $latestVerification = Verification::where('user_id', $user->id)
            ->latest()
            ->first();

        $user->status = $latestVerification->status ?? 'unverified';
        $user->mitra_strike_count = 0;
        $user->warnings_reset_at = now();
        $user->save();

        $appeal->update([
            'status' => 'approved',
            'admin_notes' => $request->input('admin_notes'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Banding disetujui. Akun mitra sudah dibuka blokirnya dan seluruh catatan pelanggaran (strike & teguran) direset.',
            'appeal' => $appeal,
        ]);
    }

    // ================= ADMIN: TOLAK BANDING =================
    public function reject(Request $request, $id)
    {
        $appeal = MitraAppeal::findOrFail($id);

        if ($appeal->status !== 'pending') {
            return response()->json([
                'message' => 'Banding ini sudah pernah ditinjau sebelumnya.'
            ], 400);
        }

        $validated = $request->validate([
            'admin_notes' => 'required|string|max:2000',
        ]);

        $appeal->update([
            'status' => 'rejected',
            'admin_notes' => $validated['admin_notes'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Banding ditolak.',
            'appeal' => $appeal,
        ]);
    }
}