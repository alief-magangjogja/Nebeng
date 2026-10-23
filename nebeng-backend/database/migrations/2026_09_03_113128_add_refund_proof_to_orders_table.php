<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sebelumnya mitraConfirmRefund() cuma butuh 1 klik tombol tanpa bukti
     * apa pun - customer (dan admin kalau terjadi sengketa) harus percaya
     * begitu saja klaim sepihak "sudah transfer" dari mitra. Kolom ini
     * mewajibkan mitra melampirkan bukti transfer (screenshot m-banking/
     * e-wallet/QRIS) setiap kali mengklaim sudah mengembalikan dana,
     * sama seperti customer wajib upload payment_proof saat bayar QRIS.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'refund_proof')) {
                $table->string('refund_proof')->nullable()->after('refund_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'refund_proof')) {
                $table->dropColumn('refund_proof');
            }
        });
    }
};