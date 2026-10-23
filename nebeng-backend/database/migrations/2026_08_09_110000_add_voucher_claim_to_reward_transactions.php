<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reward_transactions', function (Blueprint $table) {
            // Kode unik ini yang ditunjukkan customer ke Pos Mitra untuk
            // mengambil barang/voucher hasil penukaran poin. Cuma dibuat
            // untuk transaksi type "redeem", null untuk "earn".
            $table->string('unique_code')->nullable()->unique()->after('reward_id');

            // unclaimed -> belum diambil, claimed -> sudah diserahkan ke customer
            $table->string('claim_status')->default('unclaimed')->after('unique_code');

            $table->timestamp('claimed_at')->nullable()->after('claim_status');

            // Pos Mitra mana yang memproses klaim ini
            $table->foreignId('claimed_by')->nullable()->after('claimed_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reward_transactions', function (Blueprint $table) {
            $table->dropForeign(['claimed_by']);
            $table->dropColumn(['unique_code', 'claim_status', 'claimed_at', 'claimed_by']);
        });
    }
};