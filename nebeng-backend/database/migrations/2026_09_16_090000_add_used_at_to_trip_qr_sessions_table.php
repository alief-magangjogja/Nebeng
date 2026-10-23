<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * trip_qr_sessions selama ini TIDAK punya kolom 'used_at' sama sekali,
     * padahal TripController::scanQr() dan scanDepartureQr() sudah
     * mencoba menyimpannya lewat $session->update(['used_at' => now()]).
     * Karena kolomnya tidak ada, nilai waktu scan itu hilang - hanya flag
     * 'is_used' yang benar-benar tersimpan. Kolom ini diperlukan supaya
     * fitur verifikasi keberangkatan/kedatangan real-time bisa menampilkan
     * jam pastinya, bukan cuma status ya/tidak.
     */
    public function up(): void
    {
        Schema::table('trip_qr_sessions', function (Blueprint $table) {
            $table->timestamp('used_at')->nullable()->after('is_used');
        });
    }

    public function down(): void
    {
        Schema::table('trip_qr_sessions', function (Blueprint $table) {
            $table->dropColumn('used_at');
        });
    }
};