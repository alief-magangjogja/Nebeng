<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sebelumnya trip tidak menyimpan kendaraan spesifik mana yang dipakai
     * (cuma "vehicle_type" berupa string umum "motor"/"mobil"). Sekarang
     * setiap trip terhubung ke kendaraan spesifik milik mitra (merk, plat
     * nomor, dll) yang dipilih saat membuat tebengan - penting terutama
     * kalau mitra punya lebih dari 1 kendaraan dengan tipe yang sama.
     */
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->foreignId('mitra_vehicle_id')
                ->nullable()
                ->after('mitra_id')
                ->constrained('mitra_vehicles')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropConstrainedForeignId('mitra_vehicle_id');
        });
    }
};