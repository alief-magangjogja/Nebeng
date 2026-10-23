<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * order_qr_sessions sebelumnya cuma dipakai untuk satu keperluan:
     * check-in customer sebelum berangkat (scanCustomerQr). Sekarang
     * tabel yang sama dipakai juga untuk QR konfirmasi barang sampai
     * (per-order, bukan per-trip) - kolom ini membedakan keduanya supaya
     * token dari satu keperluan tidak bisa dipakai/tervalidasi di
     * keperluan lain.
     *
     * Baris lama (yang sudah ada sebelum migration ini) diisi default
     * 'checkin' - sesuai keperluan aslinya sebelum kolom ini ada.
     */
    public function up(): void
    {
        Schema::table('order_qr_sessions', function (Blueprint $table) {
            $table->string('purpose')->default('checkin')->after('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('order_qr_sessions', function (Blueprint $table) {
            $table->dropColumn('purpose');
        });
    }
};