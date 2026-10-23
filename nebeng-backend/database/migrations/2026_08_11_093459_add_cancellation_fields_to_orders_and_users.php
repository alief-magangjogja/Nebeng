<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * cancelOrder() sudah lama menulis 'refund_status' ke Order, tapi kolom
     * ini TIDAK PERNAH ada di tabel 'orders' dan tidak ada di $fillable ->
     * Eloquent diam-diam membuang field itu, jadi status refund tiap
     * pembatalan QRIS selalu hilang tanpa ada error yang terlihat.
     *
     * Kolom baru:
     * - refund_status, refund_percentage: catatan tingkat refund QRIS
     * - penalty_amount: nominal denda untuk pembatalan cash < 3 jam
     * - cancelled_at: kapan pembatalan terjadi (audit trail)
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('refund_status')->nullable()->after('payment_status');
            $table->unsignedTinyInteger('refund_percentage')->nullable()->after('refund_status');
            $table->unsignedInteger('penalty_amount')->nullable()->after('refund_percentage');
            $table->timestamp('cancelled_at')->nullable()->after('penalty_amount');
        });

        // Strike counter untuk customer yang sering batalkan pesanan cash
        // mepet waktu keberangkatan -> dipakai untuk membatasi mereka ke
        // metode QRIS (bayar di muka) supaya mitra tidak terus dirugikan.
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('late_cancel_count')->default(0)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['refund_status', 'refund_percentage', 'penalty_amount', 'cancelled_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('late_cancel_count');
        });
    }
};