<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\PersonalAccessToken;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // ========================================================
        // PERFORMA: Deteksi N+1 lazy loading di development
        // ========================================================
        // Sebelumnya versi ini melempar EXCEPTION (preventLazyLoading)
        // setiap kali ada relasi yang diakses tanpa di-eager-load. Karena
        // project ini besar dan banyak controller lama belum sempat
        // dirapikan semua, ini berakibat BANYAK endpoint tiba-tiba error
        // 500 begitu saja (termasuk /api/pos-mitra/trips), tanpa pesan
        // yang kelihatan di frontend - cuma tampil "tidak ada data".
        //
        // Sekarang hanya DICATAT ke log (storage/logs/laravel.log),
        // tidak menghentikan request. Jadi tetap bisa dipakai untuk
        // mengecek N+1 pelan-pelan, tanpa merusak fitur yang sudah jalan.
        Model::handleLazyLoadingViolationUsing(function ($model, $relation) {
            \Illuminate\Support\Facades\Log::warning("Lazy loading terdeteksi: {$relation} pada model " . get_class($model));
        });

        // ========================================================
        // PERFORMA: Hanya kolom yang dibutuhkan di Sanctum token
        // ========================================================
        // Sanctum secara default akan load SEMUA kolom dari tabel
        // personal_access_tokens setiap kali auth:sanctum dipakai.
        // Dengan pruning, token yang sudah expired otomatis dihapus
        // sehingga tabel tidak membengkak dan query auth lebih cepat.
        //
        // Token kedaluwarsa setelah 30 hari tidak dipakai - sebelumnya
        // null (tidak pernah kedaluwarsa) sehingga tabel terus membesar.
        //PersonalAccessToken::$tokenExpirationMinutes = 60 * 24 * 30; // 30 hari

        // ========================================================
        // BROADCAST
        // ========================================================
        Broadcast::routes([
            'middleware' => ['auth:sanctum'],
        ]);

        require base_path('routes/channels.php');
    }
}