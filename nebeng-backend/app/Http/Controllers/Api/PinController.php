<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class PinController extends Controller
{
    public function checkPin()
    {
        try {

            $user = Auth::user();

            return response()->json([
                'has_pin' => $user->pin ? true : false
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'message' => 'Check PIN error',
                'error' => $e->getMessage()
            ], 500);

        }
    }

    public function updatePin(Request $request)
    {
        try {

            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            // SET PIN PERTAMA
            if (!$user->pin) {

                $request->validate([
                    'new_pin' => 'required|digits:6|confirmed'
                ]);

                $user->pin = Hash::make($request->new_pin);
                $user->save();

                return response()->json([
                    'message' => 'PIN berhasil dibuat'
                ]);
            }

            // UPDATE PIN
            $request->validate([
                'old_pin' => 'required|digits:6',
                'new_pin' => 'required|digits:6|confirmed'
            ]);

            if (!Hash::check($request->old_pin, $user->pin)) {

                return response()->json([
                    'message' => 'PIN lama salah'
                ], 400);

            }

            $user->pin = Hash::make($request->new_pin);
            $user->save();

            return response()->json([
                'message' => 'PIN berhasil diperbarui'
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'message' => 'Update PIN error',
                'error' => $e->getMessage()
            ], 500);

        }
    }

    public function verifyPin(Request $request)
{
    try {

        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 401);
        }

        $request->validate([
            'pin' => 'required|digits:6'
        ]);

        if (!$user->pin) {
            return response()->json([
                'message' => 'PIN belum dibuat'
            ], 400);
        }

        if (!Hash::check($request->pin, $user->pin)) {
            return response()->json([
                'message' => 'PIN salah'
            ], 422);
        }

        return response()->json([
            'message' => 'PIN valid'
        ]);

    } catch (\Exception $e) {

        return response()->json([
            'message' => 'Verify PIN error',
            'error' => $e->getMessage()
        ], 500);

    }
}
}