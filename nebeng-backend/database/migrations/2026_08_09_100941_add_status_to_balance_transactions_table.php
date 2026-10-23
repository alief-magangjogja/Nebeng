<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('balance_transactions', function (Blueprint $table) {
            // 'completed' jadi default supaya transaksi lama (mis. pendapatan
            // dari order) yang sudah ada tetap dianggap selesai, tidak perlu
            // diapa-apain lagi. Cuma withdraw baru yang mulai dari 'pending'.
            $table->enum('status', ['pending', 'completed', 'rejected'])
                  ->default('completed')
                  ->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('balance_transactions', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};