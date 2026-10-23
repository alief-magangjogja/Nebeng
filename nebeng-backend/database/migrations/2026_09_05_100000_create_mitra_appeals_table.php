<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mitra_appeals', function (Blueprint $table) {
            $table->id();

            // Mitra yang mengajukan banding (akun yang sedang status 'blocked').
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // Alasan/penjelasan yang ditulis mitra kenapa dia merasa
            // pemblokiran ini tidak seharusnya terjadi.
            $table->text('reason');

            // pending -> approved (admin setuju, akun dibuka blokirnya)
            //         -> rejected (admin menolak, akun tetap terblokir)
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');

            // Catatan admin saat approve/reject (opsional, ditampilkan ke mitra).
            $table->text('admin_notes')->nullable();

            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mitra_appeals');
    }
};