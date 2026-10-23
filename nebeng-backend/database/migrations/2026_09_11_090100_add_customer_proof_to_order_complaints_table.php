<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sebelumnya customer bisa klik "Belum Diterima" cuma dengan menulis
 * deskripsi bebas tanpa bukti apa pun, sementara mitra WAJIB lampirkan
 * bukti transfer (refund_proof). Ini timpang sebelah - admin tidak
 * punya cara membedakan customer yang benar belum menerima dana dari
 * customer yang iseng/khilaf. Kolom ini memungkinkan customer
 * melampirkan bukti pendukung sendiri (mis. screenshot mutasi
 * rekening/e-wallet yang menunjukkan tidak ada dana masuk sejumlah
 * itu). Nullable - tetap bisa lapor tanpa bukti, tapi absennya bukti
 * ini sendiri jadi sinyal yang ditampilkan ke admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_complaints', function (Blueprint $table) {
            if (!Schema::hasColumn('order_complaints', 'customer_proof')) {
                $table->string('customer_proof')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_complaints', function (Blueprint $table) {
            if (Schema::hasColumn('order_complaints', 'customer_proof')) {
                $table->dropColumn('customer_proof');
            }
        });
    }
};