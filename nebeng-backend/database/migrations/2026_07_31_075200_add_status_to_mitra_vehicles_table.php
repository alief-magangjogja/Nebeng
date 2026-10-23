<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sebelumnya kendaraan yang didaftarkan mitra (baik saat verifikasi
     * awal maupun ditambah belakangan) langsung dianggap terdaftar tanpa
     * ditinjau admin. Sekarang setiap kendaraan baru harus melalui
     * persetujuan admin dulu (status pending -> approved/rejected),
     * persis seperti alur verifikasi akun mitra.
     */
    public function up(): void
    {
        Schema::table('mitra_vehicles', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('photo'); // pending | approved | rejected
            $table->text('notes')->nullable()->after('status'); // alasan penolakan (opsional)
        });
    }

    public function down(): void
    {
        Schema::table('mitra_vehicles', function (Blueprint $table) {
            $table->dropColumn(['status', 'notes']);
        });
    }
};