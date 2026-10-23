<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * order.status = 'completed' selama ini berarti PEMBAYARAN selesai
     * (lihat OrderController@confirmPayment / uploadPaymentProof) - bukan
     * berarti barangnya sudah sampai tujuan. Untuk trip barang yang
     * dipakai beberapa customer sekaligus, dua hal ini harus dipisah:
     * kolom baru ini khusus menandai kapan barang order tsb benar-benar
     * dikonfirmasi sampai (lewat scan QR pengiriman per-order), independen
     * dari status pembayarannya.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('delivered_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivered_at');
        });
    }
};