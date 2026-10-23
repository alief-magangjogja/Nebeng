<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * BUG YANG DIPERBAIKI: tabel trip_reviews menyimpan rating customer->mitra
     * dan mitra->customer di baris yang sama tanpa penanda arah. Uniqueness
     * check di TripReviewController::store() memakai kombinasi
     * (trip_id, customer_id, mitra_id) untuk KEDUA arah - jadi begitu salah
     * satu pihak (misal customer) kasih rating duluan, pihak satunya (mitra)
     * jadi PERMANEN tidak bisa kasih rating untuk trip yang sama, karena
     * sistem salah kira baris rating customer itu adalah rating dari mitra.
     *
     * Kolom 'type' membedakan arah rating secara eksplisit:
     * - 'customer_to_mitra' : customer menilai mitra
     * - 'mitra_to_customer' : mitra menilai customer
     */
    public function up(): void
    {
        Schema::table('trip_reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('trip_reviews', 'type')) {
                // Default 'customer_to_mitra' untuk data lama - arah asli data
                // lama tidak bisa dipastikan ulang (bug di atas membuat cuma
                // satu arah yang pernah berhasil tersimpan per trip), tapi
                // customer->mitra adalah kasus yang jauh lebih sering terjadi.
                $table->string('type')->default('customer_to_mitra')->after('mitra_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('trip_reviews', function (Blueprint $table) {
            if (Schema::hasColumn('trip_reviews', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};