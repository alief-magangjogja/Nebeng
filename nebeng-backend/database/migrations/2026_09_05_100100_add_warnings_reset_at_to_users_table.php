<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Titik "reset" perhitungan teguran komplain (OrderComplaint
            // dengan admin_action='warned_mitra'). Teguran itu tidak
            // punya kolom counter sendiri - dihitung on-the-fly dari
            // riwayat komplain. Kalau banding mitra disetujui, kita TIDAK
            // menghapus riwayat komplain lama (biar tetap bisa diaudit),
            // tapi menandai titik waktu ini supaya komplain SEBELUM
            // tanggal ini tidak lagi dihitung sebagai "teguran aktif".
            $table->timestamp('warnings_reset_at')->nullable()->after('mitra_strike_count');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('warnings_reset_at');
        });
    }
};