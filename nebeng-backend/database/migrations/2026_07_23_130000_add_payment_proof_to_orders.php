<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // path file bukti transfer/screenshot QRIS yang diupload customer
            $table->string('payment_proof')->nullable()->after('payment_method');

            // unpaid -> belum bayar/belum upload bukti
            // waiting_confirmation -> bukti sudah diupload, menunggu mitra konfirmasi
            // paid -> mitra sudah konfirmasi pembayaran diterima
            $table->string('payment_status')->default('unpaid')->after('payment_proof');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['payment_proof', 'payment_status']);
        });
    }
};