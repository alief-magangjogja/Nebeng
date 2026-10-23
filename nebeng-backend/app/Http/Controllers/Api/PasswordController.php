<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordController extends Controller
{
    public function updatePassword(Request $request)
    {
        try {

            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            $request->validate([
                'old_password' => 'required',
                'new_password' => 'required|min:8|confirmed'
            ]);

            if (!Hash::check($request->old_password, $user->password)) {
                return response()->json([
                    'message' => 'Password lama salah'
                ], 400);
            }

            $user->password = Hash::make($request->new_password);
            $user->save();

            return response()->json([
                'message' => 'Password berhasil diperbarui'
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'message' => 'Update password error',
                'error' => $e->getMessage()
            ], 500);

        }
    }

    // ================= LUPA PASSWORD: KIRIM LINK RESET =================
    // CATATAN: masih pakai mode LOKAL sementara - MAIL_MAILER di .env
    // sudah default 'log', jadi email tidak benar-benar terkirim, tapi
    // isinya (termasuk link reset) ditulis ke storage/logs/laravel.log.
    // Buka file log itu untuk ambil link reset-nya selama belum ada
    // layanan email sungguhan (SMTP/Mailgun/dll) yang dikonfigurasi.
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Sengaja tetap balas "berhasil" walau email tidak ditemukan -
        // supaya orang tidak bisa dipakai untuk mengecek email mana saja
        // yang terdaftar di sistem (praktik keamanan standar).
        if (!$user) {
            return response()->json([
                'message' => 'Kalau email terdaftar, link reset password sudah dikirim.'
            ]);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
        $resetLink = "{$frontendUrl}/reset-password?token={$token}&email=" . urlencode($user->email);

        Mail::raw(
            "Halo {$user->name},\n\nKlik link berikut untuk reset password akun Nebeng. Anda:\n{$resetLink}\n\nLink ini berlaku 60 menit. Kalau Anda tidak meminta reset password, abaikan email ini.",
            function ($message) use ($user) {
                $message->to($user->email)
                        ->subject('Reset Password Akun Nebeng.');
            }
        );

        return response()->json([
            'message' => 'Kalau email terdaftar, link reset password sudah dikirim.'
        ]);
    }

    // ================= LUPA PASSWORD: SUBMIT PASSWORD BARU =================
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json([
                'message' => 'Token reset password tidak valid.'
            ], 400);
        }

        // Token berlaku 60 menit
        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();

            return response()->json([
                'message' => 'Token reset password sudah kedaluwarsa. Silakan ajukan ulang.'
            ], 400);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->password = Hash::make($request->password);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Password berhasil direset. Silakan login dengan password baru Anda.'
        ]);
    }
}