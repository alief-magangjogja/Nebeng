<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\Trip;
use App\Models\TripQrSession;

class MitraTripQrController extends Controller
{
    //
    public function generate($tripId)
    {
        $trip = Trip::findOrFail($tripId);

        // =========================
        // CARI QR YANG MASIH AKTIF
        // =========================
        $existingSession = TripQrSession::where('trip_id', $trip->id)
            ->where('is_used', false)
            ->where('expired_at', '>', now())
            ->where('purpose', 'arrival')
            ->latest()
            ->first();

        // jika masih ada QR aktif
        if ($existingSession) {

            return response()->json([
                'trip_id' => $trip->id,
                'token' => $existingSession->token,
                'expired_at' => $existingSession->expired_at,
                'is_existing' => true,
            ]);
        }

        // =========================
        // GENERATE QR BARU
        // =========================
        $session = TripQrSession::create([
            'trip_id' => $trip->id,
            'token' => Str::random(12),
             'purpose' => 'arrival',
            'expired_at' => Carbon::now()->addHours(3),
        ]);

        return response()->json([
            'trip_id' => $trip->id,
            'token' => $session->token,
            'expired_at' => $session->expired_at,
            'is_existing' => false,
        ]);
    }

    public function generateDepartureQr($tripId)
    {
        $trip = Trip::with('orders')->findOrFail($tripId);

        if ($trip->status !== 'waiting_departure') {
            return response()->json([
                'message' => 'Trip belum siap diberangkatkan'
            ], 400);
        }

        // Jaga-jaga: trip tanpa customer tidak boleh diberangkatkan
        if ($trip->orders->count() === 0) {
            return response()->json([
                'message' => 'Belum ada customer yang memesan tebengan ini.'
            ], 422);
        }

        // Customer harus sudah scan QR check-in di Pos Mitra (readiness_status
        // = 'ready') dulu sebelum mitra boleh berangkat. Sebelumnya di sini
        // cuma dicek ada order-nya atau tidak, tidak dicek apakah
        // customer-nya beneran sudah hadir di pos.
        $notReadyCount = $trip->orders->where('readiness_status', '!=', 'ready')->count();

        if ($notReadyCount > 0) {
            return response()->json([
                'message' => 'Masih ada customer yang belum check-in (scan QR) di Pos Mitra.'
            ], 422);
        }

        $existingSession = TripQrSession::where(
                'trip_id',
                $trip->id
            )
            ->where('purpose', 'departure')
            ->where('is_used', false)
            ->where('expired_at', '>', now())
            ->latest()
            ->first();

        if ($existingSession) {
            return response()->json([
                'trip_id' => $trip->id,
                'token' => $existingSession->token,
                'purpose' => 'departure',
                'expired_at' => $existingSession->expired_at,
                'is_existing' => true,
            ]);
        }

        $session = TripQrSession::create([
            'trip_id' => $trip->id,
            'token' => Str::random(12),
            'purpose' => 'departure',
            'expired_at' => now()->addHours(3),
        ]);

        return response()->json([
            'trip_id' => $trip->id,
            'token' => $session->token,
            'purpose' => 'departure',
            'expired_at' => $session->expired_at,
            'is_existing' => false,
        ]);
    }
}