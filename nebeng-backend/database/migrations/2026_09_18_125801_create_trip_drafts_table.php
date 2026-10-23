<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Draft trip mitra - kombinasi rute + jam + kendaraan + jenis layanan
     * yang sering dipakai berulang (mis. trip pagi jam 6 setiap hari),
     * supaya mitra tidak perlu isi ulang form dari nol tiap kali. SENGAJA
     * tidak menyimpan tanggal - tanggal keberangkatan trip yang dibuat
     * dari draft selalu ikut tanggal HARI ITU (lihat TripDraftController /
     * applyDraft() di frontend), bukan tanggal saat draft pertama kali
     * disimpan.
     */
    public function up(): void
    {
        Schema::create('trip_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // motor | mobil | barang - dipakai frontend untuk filter draft
            // mana yang relevan ditampilkan (halaman Motor tidak
            // menampilkan draft Mobil/Barang, dst).
            $table->string('category');

            $table->foreignId('origin_point_id')->constrained('pickup_points')->onDelete('cascade');
            $table->foreignId('destination_point_id')->constrained('pickup_points')->onDelete('cascade');

            // jam saja, TANPA tanggal.
            $table->time('departure_time');

            // nullable: kendaraan bisa saja dihapus mitra belakangan -
            // draft tetap ada, tinggal mitra pilih ulang kendaraan saat
            // memakainya kalau yang lama sudah tidak ada.
            $table->foreignId('mitra_vehicle_id')->nullable()->constrained('mitra_vehicles')->onDelete('set null');

            // "Hanya Tebengan" | "Barang dan Tebengan" - null untuk category=barang
            $table->string('tebengan_type')->nullable();

            // hanya relevan untuk category=mobil (motor selalu 1, barang tidak pakai kursi)
            $table->unsignedInteger('seat_count')->nullable();

            $table->string('baggage_capacity')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_drafts');
    }
};