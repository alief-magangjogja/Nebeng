<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel kendaraan mitra yang sebenarnya dipakai aplikasi (terhubung
     * langsung ke `users`). Berbeda dari tabel `vehicles` lama yang
     * terhubung ke tabel `drivers` dan tidak pernah dipakai/ada route-nya.
     */
    public function up(): void
    {
        Schema::create('mitra_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // motor | mobil | barang
            $table->string('type');

            $table->string('brand');
            $table->string('model')->nullable();
            $table->string('plate_number');
            $table->string('color')->nullable();

            // hanya relevan untuk type=mobil, dipakai sebagai batas maksimal
            // jumlah penumpang saat mitra membuat tebengan mobil.
            $table->unsignedInteger('seat_capacity')->nullable();

            $table->string('photo')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mitra_vehicles');
    }
};