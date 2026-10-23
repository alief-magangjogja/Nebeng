<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Trip;
use App\Models\OrderComplaint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function dashboard()
    {
        // ================= STATS (1 query gabungan) =================
        $userStats = User::selectRaw("
            COALESCE(SUM(CASE WHEN role = 'mitra' THEN 1 ELSE 0 END), 0) as total_mitra,
            COALESCE(SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END), 0) as total_customer,
            COALESCE(SUM(CASE WHEN role = 'mitra' AND status = 'verified' THEN 1 ELSE 0 END), 0) as verif_mitra,
            COALESCE(SUM(CASE WHEN role = 'customer' AND status = 'verified' THEN 1 ELSE 0 END), 0) as verif_customer
        ")->first();

        // ================= CHART =================
        $ordersByType = Trip::select(
                'vehicle_type',
                DB::raw('count(*) as total')
            )
            ->groupBy('vehicle_type')
            ->get();

        // ================= TOP ROUTE =================
        $topRoutes = Trip::select(
                'origin_point_id',
                'destination_point_id',
                DB::raw('count(*) as total')
            )
            ->with([
                'originPoint:id,pos_name,city_id',
                'originPoint.city:id,name',
                'destinationPoint:id,pos_name,city_id',
                'destinationPoint.city:id,name'
            ])
            ->groupBy('origin_point_id', 'destination_point_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        // ================= TABLE =================
        $latestMitra = User::select('id', 'name', 'email', 'phone', 'status', 'created_at', 'avatar')
            ->where('role', 'mitra')
            ->latest()
            ->limit(5)
            ->get();

        $latestCustomer = User::select('id', 'name', 'email', 'phone', 'status', 'created_at', 'avatar')
            ->where('role', 'customer')
            ->latest()
            ->limit(5)
            ->get();

        return response()->json([
            'stats' => [
                'mitra' => (int) ($userStats->total_mitra ?? 0),
                'customer' => (int) ($userStats->total_customer ?? 0),
                'verif_mitra' => (int) ($userStats->verif_mitra ?? 0),
                'verif_customer' => (int) ($userStats->verif_customer ?? 0),
            ],
            'orders_chart' => $ordersByType,
            'top_routes' => $topRoutes,
            'latest_mitra' => $latestMitra,
            'latest_customer' => $latestCustomer,
        ]);
    }

    public function mitraList(Request $request)
    {
        $query = User::select('id', 'name', 'email', 'phone', 'status', 'mitra_strike_count', 'created_at', 'avatar')
            ->where('role', 'mitra');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', 'verified');
        }

        $mitras = $query->with('profile')->latest()->get();

        // Ambil jumlah teguran per mitra dalam SATU query (hindari N+1)
        // supaya Daftar Mitra bisa langsung menampilkan berapa teguran yang
        // sudah diterima masing-masing, tanpa mitra harus dibuka detailnya.
        $warningCounts = OrderComplaint::whereIn('mitra_id', $mitras->pluck('id'))
            ->where('admin_action', 'warned_mitra')
            ->selectRaw('mitra_id, COUNT(*) as total')
            ->groupBy('mitra_id')
            ->pluck('total', 'mitra_id');

        $mitras->each(function ($mitra) use ($warningCounts) {
            $mitra->mitra_warning_count = $warningCounts[$mitra->id] ?? 0;
            $mitra->mitra_warning_max = 3;
        });

        return $mitras;
    }

    public function customersList(Request $request)
    {
        $query = User::select('id', 'name', 'email', 'phone', 'status', 'customer_strike_count', 'created_at', 'avatar')
            ->where('role', 'customer');

        // kalau ada filter status (dipakai untuk blocked page)
        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            // default (halaman Daftar Customer): hanya yang sudah
            // TERVERIFIKASI. Customer 'unverified'/'pending'/'rejected'
            // ditangani lewat halaman Verifikasi Customer.
            $query->where('status', 'verified');
        }

        return $query->with('profile')->latest()->get();
    }

    // Field data diri/alamat/rekening (tabel user_profiles) yang ikut
    // bisa diisi/diedit admin bareng data akun (users). Dipakai bareng
    // oleh mitra & customer karena strukturnya sama persis.
    private const PROFILE_FIELDS = [
        'full_name', 'nik', 'birth_place', 'birth_date', 'gender',
        'address', 'province', 'city', 'district', 'village',
        'bank_name', 'bank_account_name', 'bank_account_number',
    ];

    private function profileValidationRules(): array
    {
        return [
            'full_name' => 'nullable|string|max:255',
            'nik' => 'nullable|string|max:30',
            'birth_place' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'province' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'village' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:50',
        ];
    }

    // ================= TAMBAH & EDIT AKUN MITRA (MANUAL OLEH ADMIN) =================
    // Dipakai halaman Daftar Mitra supaya admin bisa daftarkan mitra
    // langsung tanpa lewat alur registrasi + upload dokumen verifikasi.
    // Status default 'verified' karena data sudah diinput & divalidasi
    // langsung oleh admin. Sekalian menyimpan data diri/alamat/rekening
    // (tabel user_profiles) supaya admin tidak cuma bisa isi akun dasar.
    public function storeMitra(Request $request)
    {
        $validated = $request->validate(array_merge([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|max:20|unique:users,phone',
            'password' => 'required|string|min:6',
            'status' => 'nullable|in:pending,verified,rejected',
        ], $this->profileValidationRules()));

        $mitra = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => 'mitra',
            'status' => $validated['status'] ?? 'verified',
        ]);

        $mitra->profile()->create(
            collect($validated)->only(self::PROFILE_FIELDS)->toArray()
        );

        return response()->json($mitra->load('profile'), 201);
    }

    public function updateMitra(Request $request, $id)
    {
        $mitra = User::where('role', 'mitra')->findOrFail($id);

        $validated = $request->validate(array_merge([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $mitra->id,
            'phone' => 'required|string|max:20|unique:users,phone,' . $mitra->id,
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|in:pending,verified,rejected',
        ], $this->profileValidationRules()));

        $mitra->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            ...($request->filled('status') ? ['status' => $validated['status']] : []),
            ...($request->filled('password') ? ['password' => Hash::make($validated['password'])] : []),
        ]);

        $mitra->profile()->updateOrCreate(
            ['user_id' => $mitra->id],
            collect($validated)->only(self::PROFILE_FIELDS)->toArray()
        );

        return response()->json($mitra->load('profile'));
    }

    // ================= TAMBAH & EDIT AKUN CUSTOMER (MANUAL OLEH ADMIN) =================
    public function storeCustomer(Request $request)
    {
        $validated = $request->validate(array_merge([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|max:20|unique:users,phone',
            'password' => 'required|string|min:6',
            'status' => 'nullable|in:pending,verified,rejected',
        ], $this->profileValidationRules()));

        $customer = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => 'customer',
            'status' => $validated['status'] ?? 'verified',
        ]);

        $customer->profile()->create(
            collect($validated)->only(self::PROFILE_FIELDS)->toArray()
        );

        return response()->json($customer->load('profile'), 201);
    }

    public function updateCustomer(Request $request, $id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);

        $validated = $request->validate(array_merge([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $customer->id,
            'phone' => 'required|string|max:20|unique:users,phone,' . $customer->id,
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|in:pending,verified,rejected',
        ], $this->profileValidationRules()));

        $customer->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            ...($request->filled('status') ? ['status' => $validated['status']] : []),
            ...($request->filled('password') ? ['password' => Hash::make($validated['password'])] : []),
        ]);

        $customer->profile()->updateOrCreate(
            ['user_id' => $customer->id],
            collect($validated)->only(self::PROFILE_FIELDS)->toArray()
        );

        return response()->json($customer->load('profile'));
    }

    public function blockUser($id)
    {
        $user = User::findOrFail($id);

        $user->update([
            'status' => 'blocked'
        ]);

        return response()->json([
            'message' => 'User berhasil diblokir'
        ]);
    }

    public function unblockUser($id)
    {
        $user = User::findOrFail($id);

        // PENTING: sebelumnya method ini selalu set status='verified' apa
        // pun status asli user itu sebelum diblokir. Kalau yang diblokir
        // adalah mitra/customer yang BELUM PERNAH lolos verifikasi dokumen
        // (masih 'unverified'/'pending'/'rejected'), unblock ini diam-diam
        // "meloloskan" mereka jadi verified tanpa pernah benar-benar
        // melewati pengecekan dokumen oleh admin.
        // Sekarang statusnya dipulihkan sesuai submission verifikasi
        // TERAKHIR milik user itu (kalau ada), bukan asal set 'verified'.
        $latestVerification = \App\Models\Verification::where('user_id', $user->id)
            ->latest()
            ->first();

        $user->update([
            'status' => $latestVerification->status ?? 'unverified'
        ]);

        return response()->json([
            'message' => 'User berhasil dibuka blokirnya'
        ]);
    }
}