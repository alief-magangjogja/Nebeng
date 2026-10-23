<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fullName' => 'required|string|max:255',
            'email' => [
                    'required',
                    'email',
                    'regex:/^[a-zA-Z0-9._%+-]+@gmail\.com$/',
                    'unique:users,email'
                ],
            'phone' => 'required|string|max:13|regex:/^[0-9]+$/|unique:users,phone',
            'role' => 'required|in:customer,mitra',
            'password' => 'required|min:6|confirmed'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // ================= ROLE & STATUS =================

        $role = $request->role;

        $status = 'unverified';

        // ================= CREATE USER =================

        $user = User::create([
            'name' => $request->fullName,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => $role,
            'status' => $status
        ]);

        $token = $user->createToken('nebeng_token')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Register berhasil',
            'token' => $token,
            'user' => $user
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'status' => false,
                'message' => 'Email atau password salah'
            ], 401);
        }

        $user = Auth::user();

        // PENTING: mitra yang statusnya 'blocked' TETAP diizinkan login
        // (dapat token seperti biasa) - supaya dia bisa masuk ke halaman
        // Beranda dan melihat popup "Akun Diblokir" beserta form pengajuan
        // banding (lihat mitra/Dashboard.jsx). Sebelumnya login ditolak
        // total di sini untuk SEMUA role yang blocked, jadi mitra tidak
        // pernah bisa sampai ke halaman manapun untuk mengajukan banding.
        //
        // Role lain (customer, pos_mitra, dll) belum punya alur banding,
        // jadi tetap ditolak login sepenuhnya seperti sebelumnya.
        if ($user->status === 'blocked' && $user->role !== 'mitra') {
            return response()->json([
                'message' => 'Akun anda diblokir oleh admin'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => $user
        ]);
    }

    // Sebelumnya TIDAK ADA endpoint logout sama sekali di backend - tombol
    // "Keluar" di semua halaman (customer/mitra/admin/pos-mitra) terlihat
    // berhasil (localStorage token dihapus di frontend, redirect ke login)
    // tapi token Sanctum-nya TIDAK PERNAH dicabut di server. Karena
    // 'expiration' di config/sanctum.php di-set null (token tidak pernah
    // kedaluwarsa otomatis), token yang bocor akan tetap valid SELAMANYA.
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => true,
            'message' => 'Logout berhasil'
        ]);
    }
}