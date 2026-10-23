<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Setiap akun pos_mitra terikat ke SATU pos (pickup_point).
            // Kolom ini hanya relevan untuk role = pos_mitra, tetap nullable
            // supaya tidak mengganggu role lain (customer, mitra, admin).
            $table->foreignId('pickup_point_id')
                ->nullable()
                ->after('role')
                ->constrained('pickup_points')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pickup_point_id');
        });
    }
};