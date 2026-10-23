<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Isi koordinat (latitude/longitude) untuk pickup point yang sudah ada
     * di database tapi belum punya koordinat (dibuat oleh PickupPointSeeder
     * tanpa lat/long, sehingga fitur pembuatan tebengan selalu gagal dengan
     * pesan "Koordinat pickup point belum lengkap").
     *
     * Matching dilakukan berdasarkan kolom `address` supaya aman dijalankan
     * kapan pun tanpa mengubah/menghapus data trip yang sudah ada.
     */
    public function up(): void
    {
        $coordinates = [
            // YOGYAKARTA
            'Patihan, Kecamatan Kraton, Kota Yogyakarta' => ['lat' => -7.8103, 'lng' => 110.3625],
            'Terminal Giwangan Yogyakarta' => ['lat' => -7.8321, 'lng' => 110.3853],
            'Stasiun Tugu Yogyakarta' => ['lat' => -7.7892, 'lng' => 110.3641],

            // PURWOKERTO
            'Terminal Bulupitu Purwokerto' => ['lat' => -7.4381, 'lng' => 109.2306],
            'Alun Alun Purwokerto' => ['lat' => -7.4229, 'lng' => 109.2340],
            'Stasiun Purwokerto' => ['lat' => -7.4227, 'lng' => 109.2280],

            // SOLO
            'Terminal Tirtonadi Solo' => ['lat' => -7.5461, 'lng' => 110.8272],
            'Stasiun Solo Balapan' => ['lat' => -7.5561, 'lng' => 110.8256],
            'Alun Alun Solo' => ['lat' => -7.5730, 'lng' => 110.8281],
        ];

        foreach ($coordinates as $address => $coord) {
            DB::table('pickup_points')
                ->where('address', $address)
                ->whereNull('latitude')
                ->update([
                    'latitude' => $coord['lat'],
                    'longitude' => $coord['lng'],
                ]);
        }
    }

    public function down(): void
    {
        // Sengaja tidak di-rollback (mengembalikan ke NULL akan merusak fitur tebengan lagi)
    }
};