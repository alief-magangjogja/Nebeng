<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // Gambar QRIS statis milik mitra sendiri, ditampilkan ke customer
            // saat memilih metode pembayaran QRIS untuk trip milik mitra ini.
            $table->string('qris_image')->nullable()->after('bank_account_number');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('qris_image');
        });
    }
};