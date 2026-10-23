<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mitra_violations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // 'keterlambatan' (telat berangkat >=60 menit),
            // 'pembatalan_mendadak' (hapus trip <3 jam sebelum jadwal, ada customer),
            // 'komplain' (admin menegur karena komplain refund customer)
            $table->string('type');

            // Penjelasan singkat kejadian - trip terkait / catatan admin.
            $table->text('reason')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mitra_violations');
    }
};