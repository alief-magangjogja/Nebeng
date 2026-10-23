<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripReview;
use App\Models\User;
use Illuminate\Http\Request;
use App\Services\NotificationService;

class TripReviewController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'trip_id' => 'required|exists:trips,id',
            'rating' => 'required|integer|min:1|max:5',
            'review' => 'nullable|string|max:1000',
            'reviewed_user_id' => 'nullable|exists:users,id',
        ]);

        $authUser = auth()->user();

        $trip = Trip::findOrFail($request->trip_id);

        $isMitra = $authUser->id == $trip->mitra_id;

        // =========================
        // CUSTOMER -> MITRA
        // =========================
        if (!$isMitra) {

            // WAJIB: rating cuma boleh diberikan kalau perjalanan BENAR-BENAR
            // sudah selesai DAN order milik customer ini tidak dibatalkan.
            // Sebelumnya tidak ada pengecekan sama sekali - customer/mitra
            // yang tahu URL halaman rating bisa memberi/menerima rating
            // untuk trip yang batal atau bahkan belum berangkat, merusak
            // keakuratan skor reputasi.
            $myOrder = \App\Models\Order::where('trip_id', $trip->id)
                ->where('customer_id', $authUser->id)
                ->first();

            if ($trip->status !== 'completed' || !$myOrder || $myOrder->status === 'cancelled') {
                return response()->json([
                    'message' => 'Rating hanya bisa diberikan setelah perjalanan selesai dan tidak dibatalkan.'
                ], 400);
            }

            // PENTING: uniqueness check WAJIB ikut menyertakan 'type'.
            // Tanpa ini, baris rating dari arah customer->mitra akan
            // dianggap "sudah ada" oleh pengecekan arah mitra->customer
            // (dan sebaliknya) karena keduanya memakai kombinasi
            // (trip_id, customer_id, mitra_id) yang SAMA - akibatnya
            // begitu satu arah submit duluan, arah satunya permanen
            // terkunci untuk trip yang sama.
            $existing = TripReview::where('trip_id', $trip->id)
                ->where('customer_id', $authUser->id)
                ->where('mitra_id', $trip->mitra_id)
                ->where('type', 'customer_to_mitra')
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'Trip sudah pernah diberi rating'
                ], 422);
            }

            $review = TripReview::create([
                'trip_id' => $trip->id,
                'customer_id' => $authUser->id,
                'mitra_id' => $trip->mitra_id,
                'type' => 'customer_to_mitra',
                'rating' => $request->rating,
                'review' => $request->review,
            ]);

            NotificationService::send(
                $trip->mitra_id,
                'Rating Baru',
                "{$authUser->name} memberi kamu rating {$request->rating}/5 untuk perjalanan ini.",
                'rating',
                "/mitra/riwayat"
            );
        }

        // =========================
        // MITRA -> CUSTOMER
        // =========================
        else {

            if (!$request->reviewed_user_id) {
                return response()->json([
                    'message' => 'Customer tujuan wajib dipilih'
                ], 422);
            }

            // WAJIB: sama seperti arah customer->mitra - rating cuma boleh
            // diberikan kalau trip sudah selesai DAN order customer yang
            // direview tidak dibatalkan (mitra tidak boleh menilai
            // customer yang pesanannya sendiri sudah batal).
            $targetOrder = \App\Models\Order::where('trip_id', $trip->id)
                ->where('customer_id', $request->reviewed_user_id)
                ->first();

            if ($trip->status !== 'completed' || !$targetOrder || $targetOrder->status === 'cancelled') {
                return response()->json([
                    'message' => 'Rating hanya bisa diberikan setelah perjalanan selesai dan pesanan customer tidak dibatalkan.'
                ], 400);
            }

            $existing = TripReview::where('trip_id', $trip->id)
                ->where('customer_id', $request->reviewed_user_id)
                ->where('mitra_id', $authUser->id)
                ->where('type', 'mitra_to_customer')
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'Customer sudah pernah diberi rating'
                ], 422);
            }

            $review = TripReview::create([
                'trip_id' => $trip->id,

                // customer yang direview
                'customer_id' => $request->reviewed_user_id,

                // mitra reviewer
                'mitra_id' => $authUser->id,

                'type' => 'mitra_to_customer',

                'rating' => $request->rating,
                'review' => $request->review,
            ]);

            NotificationService::send(
                $request->reviewed_user_id,
                'Rating Baru',
                "Mitra memberi kamu rating {$request->rating}/5 untuk perjalanan ini.",
                'rating',
                "/customer/riwayat"
            );
        }

        return response()->json([
            'message' => 'Review berhasil dikirim',
            'data' => $review
        ]);
    }

    // =========================
    // PROFIL PUBLIK MITRA
    // Dipakai customer untuk lihat reputasi mitra SEBELUM booking:
    // rata-rata rating, jumlah trip selesai, dan ulasan terbaru.
    // =========================
    public function mitraProfile($mitraId)
    {
        $mitra = User::where('id', $mitraId)->where('role', 'mitra')->firstOrFail();

        $reviews = TripReview::where('mitra_id', $mitraId)
            ->where('type', 'customer_to_mitra')
            ->with('customer:id,name,avatar')
            ->latest()
            ->get();

        $totalTrips = Trip::where('mitra_id', $mitraId)
            ->where('status', 'completed')
            ->count();

        return response()->json([
            'mitra' => [
                'id' => $mitra->id,
                'name' => $mitra->name,
                'avatar' => $mitra->avatar,
            ],
            'average_rating' => $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : null,
            'total_reviews' => $reviews->count(),
            'total_trips_completed' => $totalTrips,
            'reviews' => $reviews->take(20)->values(),
        ]);
    }

    // =========================
    // REPUTASI CUSTOMER (dilihat mitra/admin)
    // Rata-rata rating yang diberikan mitra ke customer ini + jumlah
    // ulasan, supaya mitra/admin bisa lihat rekam jejak customer
    // (melengkapi sistem strike pembatalan mendadak yang sudah ada).
    // =========================
    public function customerReputation($customerId)
    {
        $customer = User::where('id', $customerId)->where('role', 'customer')->firstOrFail();

        $reviews = TripReview::where('customer_id', $customerId)
            ->where('type', 'mitra_to_customer')
            ->with('mitra:id,name,avatar')
            ->latest()
            ->get();

        return response()->json([
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'avatar' => $customer->avatar,
            ],
            'average_rating' => $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : null,
            'total_reviews' => $reviews->count(),
            'reviews' => $reviews->take(20)->values(),
        ]);
    }
}