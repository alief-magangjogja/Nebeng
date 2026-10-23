<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sebelumnya nomor rekening/e-wallet tujuan refund cuma disampaikan
 * customer ke mitra lewat chat manual (tidak tersimpan di sistem sama
 * sekali) - begitu terjadi sengketa, admin tidak punya apa pun untuk
 * dicocokkan selain foto bukti transfer mitra. Dua kolom ini menutup
 * celah itu:
 * - refund_destination: rekening/e-wallet tujuan yang didaftarkan
 *   CUSTOMER secara resmi lewat form (bukan chat) - juga ditampilkan
 *   langsung ke mitra di halaman refund, mengurangi ketergantungan chat.
 * - refund_reference: nomor referensi/ID transaksi yang diisi MITRA
 *   saat klaim sudah transfer - sesuatu yang bisa dicocokkan admin
 *   dengan mutasi rekening, bukan cuma percaya foto begitu saja.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'refund_destination')) {
                $table->string('refund_destination')->nullable()->after('refund_amount');
            }
            if (!Schema::hasColumn('orders', 'refund_destination_set_at')) {
                $table->timestamp('refund_destination_set_at')->nullable()->after('refund_destination');
            }
            if (!Schema::hasColumn('orders', 'refund_reference')) {
                $table->string('refund_reference')->nullable()->after('refund_proof');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $columns = array_filter(
                ['refund_destination', 'refund_destination_set_at', 'refund_reference'],
                fn ($col) => Schema::hasColumn('orders', $col)
            );

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};