<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Melengkapi alur refund QRIS dengan jejak audit dua arah supaya admin
     * bisa melihat transparan siapa bilang apa dan kapan - mengurangi
     * potensi konflik "mitra curang tidak refund" vs "customer bohong
     * bilang belum terima padahal sudah".
     *
     * - refund_amount: nominal refund dalam Rupiah, dihitung sekali saat
     *   pembatalan (supaya tidak perlu dihitung ulang & konsisten)
     * - mitra_refund_confirmed_at: kapan mitra klaim sudah transfer ke customer
     * - customer_refund_confirmed_at: kapan customer konfirmasi dana diterima
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'refund_amount')) {
                $table->unsignedInteger('refund_amount')->nullable()->after('refund_percentage');
            }
            if (!Schema::hasColumn('orders', 'mitra_refund_confirmed_at')) {
                $table->timestamp('mitra_refund_confirmed_at')->nullable()->after('refund_amount');
            }
            if (!Schema::hasColumn('orders', 'customer_refund_confirmed_at')) {
                $table->timestamp('customer_refund_confirmed_at')->nullable()->after('mitra_refund_confirmed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $columns = array_filter(
                ['refund_amount', 'mitra_refund_confirmed_at', 'customer_refund_confirmed_at'],
                fn ($col) => Schema::hasColumn('orders', $col)
            );
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};