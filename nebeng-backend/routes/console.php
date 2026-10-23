<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cek trip yang lewat jam berangkat tiap 5 menit: 0 customer langsung
// dibatalkan, ada customer tapi mitra tidak berangkat dapat peringatan
// di menit ke-30 lalu auto-dibatalkan + refund penuh di menit ke-60.
// PENTING: scheduler Laravel butuh satu baris cron di server yang
// menjalankan `php artisan schedule:run` tiap menit - tanpa itu, jadwal
// di bawah ini tidak akan pernah benar-benar berjalan sendiri:
//   * * * * * cd /path-ke-project && php artisan schedule:run >> /dev/null 2>&1
Schedule::command('trips:process-expired')->everyFiveMinutes();

// Cek tiap jam: order QRIS yang refund-nya belum ditransfer mitra lebih
// dari 24 jam sejak dibatalkan otomatis ditandai "disputed" - memicu
// soft-lock (mitra tidak bisa buat trip baru) tanpa perlu menunggu
// customer melapor manual. Butuh cron `schedule:run` yang sama seperti
// di atas.
Schedule::command('refunds:process-overdue')->hourly();