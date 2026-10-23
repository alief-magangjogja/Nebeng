<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * cancelOrder() menulis 'refund_status' ke Order, tapi kolom ini
     * TIDAK PERNAH ada di tabel 'orders' dan tidak ada di $fillable ->
     * Eloquent diam-diam membuang field itu, jadi status refund tiap
     * pembatalan QRIS selalu hilang tanpa ada error yang terlihat.
     *
     * Kolom baru di 'orders':
     * - refund_status: not_applicable | pending_100_percent |
     *   pending_50_percent | non_refundable | refunded
     * - refund_percentage: 0 / 50 / 100
     * - penalty_amount: nominal denda pembatalan cash < 3 jam
     * - cancelled_at: audit trail kapan pembatalan terjadi
     *
     * Kolom baru di 'users':
     * - late_cancel_count: hitungan pembatalan cash mendadak (<3 jam),
     *   dipakai untuk membatasi ke QRIS-only (>=3x) lalu auto-suspend (>=5x)
     *
     * Setiap penambahan kolom dibungkus Schema::hasColumn() supaya migration
     * ini AMAN dijalankan ulang meski sebagian kolom sudah pernah dibuat
     * sebelumnya (mis. dari percobaan migrate yang sempat gagal di tengah jalan).
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'refund_status')) {
                $table->string('refund_status')->nullable()->after('payment_status');
            }
            if (!Schema::hasColumn('orders', 'refund_percentage')) {
                $table->unsignedTinyInteger('refund_percentage')->nullable()->after('refund_status');
            }
            if (!Schema::hasColumn('orders', 'penalty_amount')) {
                $table->unsignedInteger('penalty_amount')->nullable()->after('refund_percentage');
            }
            if (!Schema::hasColumn('orders', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('penalty_amount');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'late_cancel_count')) {
                $table->unsignedInteger('late_cancel_count')->default(0)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $columns = array_filter(
                ['refund_status', 'refund_percentage', 'penalty_amount', 'cancelled_at'],
                fn ($col) => Schema::hasColumn('orders', $col)
            );
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'late_cancel_count')) {
                $table->dropColumn('late_cancel_count');
            }
        });
    }
};