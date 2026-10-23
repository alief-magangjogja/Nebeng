<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - trips.late_warning_sent_at: supaya command auto-cancel tidak
     *   mengirim notifikasi peringatan "belum berangkat" berulang kali
     *   setiap kali cron jalan (dicek tiap beberapa menit).
     * - users.mitra_strike_count: hitungan pelanggaran mitra terkait
     *   keterlambatan/pembatalan trip yang merugikan customer - dipakai
     *   untuk auto-suspend mitra yang berulang kali bermasalah, sama
     *   seperti late_cancel_count di sisi customer.
     */
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            if (!Schema::hasColumn('trips', 'late_warning_sent_at')) {
                $table->timestamp('late_warning_sent_at')->nullable()->after('status');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'mitra_strike_count')) {
                $table->unsignedInteger('mitra_strike_count')->default(0)->after('late_cancel_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            if (Schema::hasColumn('trips', 'late_warning_sent_at')) {
                $table->dropColumn('late_warning_sent_at');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'mitra_strike_count')) {
                $table->dropColumn('mitra_strike_count');
            }
        });
    }
};