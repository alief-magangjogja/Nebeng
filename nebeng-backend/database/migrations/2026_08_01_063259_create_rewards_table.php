<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Katalog reward yang benar-benar tersimpan di database (sebelumnya
        // cuma array hardcode di frontend, makanya admin tidak bisa kelola
        // dan tidak ada validasi stok/poin di sisi server).
        Schema::create('rewards', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->unsignedInteger('points_required');

            // null = stok tidak terbatas
            $table->unsignedInteger('stock')->nullable();

            $table->string('category')->default('merchandise');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Supaya riwayat penukaran tahu persis reward mana yang ditukar
        // (dulu cuma simpan teks bebas di kolom description).
        Schema::table('reward_transactions', function (Blueprint $table) {
            $table->foreignId('reward_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reward_transactions', function (Blueprint $table) {
            $table->dropForeign(['reward_id']);
            $table->dropColumn('reward_id');
        });

        Schema::dropIfExists('rewards');
    }
};