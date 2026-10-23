<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\OrderComplaint;
use App\Models\MitraVehicle;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    public function show($id)
    {
        $user = User::with([
            'profile',
            'verification.files'
        ])->findOrFail($id);

        // Hitungan teguran (dari laporan komplain refund) dan strike (dari
        // keterlambatan/pembatalan trip mendadak) - dua konsep BERBEDA,
        // sengaja ditampilkan terpisah supaya admin tidak salah kira
        // keduanya sama.
        $warningCount = $user->role === 'mitra'
            ? OrderComplaint::where('mitra_id', $user->id)->where('admin_action', 'warned_mitra')->count()
            : null;

        // Data kendaraan mitra dikirim di sini supaya halaman Detail Mitra
        // (admin) bisa menampilkan & menyetujui data kendaraan sekaligus
        // dengan verifikasi akun mitra.
        $vehicles = $user->role === 'mitra'
            ? MitraVehicle::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($v) {
                    return [
                        'id' => $v->id,
                        'type' => $v->type,
                        'brand' => $v->brand,
                        'model' => $v->model,
                        'plate_number' => $v->plate_number,
                        'color' => $v->color,
                        'seat_capacity' => $v->seat_capacity,
                        'status' => $v->status,
                        'notes' => $v->notes,
                        'photo' => $v->photo ? asset('storage/' . $v->photo) : null,
                    ];
                })
            : [];

       return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'status' => $user->status,

            'mitra_warning_count' => $warningCount,
            'mitra_warning_max' => $user->role === 'mitra' ? 3 : null,
            'mitra_strike_count' => $user->role === 'mitra' ? $user->mitra_strike_count : null,

            'profile' => [
                'full_name'   => $user->profile->full_name ?? '',
                'birth_place' => $user->profile->birth_place ?? '',
                'birth_date'  => $user->profile->birth_date ?? '',
                'gender'      => $user->profile->gender ?? '',

                'nik' => $user->profile->nik ?? '',
                'religion' => $user->profile->religion ?? '',
                'address' => $user->profile->address ?? '',
                'province' => $user->profile->province ?? '',
                'city' => $user->profile->city ?? '',
                'district' => $user->profile->district ?? '',
                'village' => $user->profile->village ?? '',
                'bank_name' => $user->profile->bank_name ?? '',
                'bank_account_name' => $user->profile->bank_account_name ?? '',
                'bank_account_number' => $user->profile->bank_account_number ?? '',
            ],

            'verification' => $user->verification ? [
                'id' => $user->verification->id,
                'type' => $user->verification->type,
                'status' => $user->verification->status,
                'notes' => $user->verification->notes,

                'files' => $user->verification->files->map(function ($file) {
                    return [
                        'id' => $file->id,
                        'file_type' => $file->file_type,
                        'file_path' => asset('storage/' . $file->file_path),
                    ];
                }),
            ] : null,

            'vehicles' => $vehicles,
        ]);
    }

    public function storeOrUpdate(Request $request, $id)
    {
        $request->validate([
            'full_name'   => 'required',
            'birth_place' => 'required',
            'birth_date'  => 'required|date',
            'gender'      => 'required',
        ]);

        $profile = UserProfile::updateOrCreate(
            ['user_id' => $id],
            [
                'full_name'   => $request->full_name,
                'birth_place' => $request->birth_place,
                'birth_date'  => $request->birth_date,
                'gender'      => $request->gender,
            ]
        );

        return response()->json([
            'message' => 'Profile saved',
            'data' => $profile
        ]);
    }
}