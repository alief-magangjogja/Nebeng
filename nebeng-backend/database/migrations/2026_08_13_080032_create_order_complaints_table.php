<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel untuk komplain customer terhadap mitra, khususnya kasus
     * "sudah dibatalkan & berhak refund QRIS, tapi mitra belum
     * mengembalikan dana". Satu order hanya boleh punya satu komplain
     * (unique) supaya tidak spam laporan berulang untuk order yang sama.
     */
    public function up(): void
    {
        Schema::create('order_complaints', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')->unique()->constrained('orders')->onDelete('cascade');
            $table->foreignId('customer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('mitra_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('type')->default('refund_not_received');
            $table->text('description');

            // pending -> baru masuk, belum ditinjau admin
            // reviewed -> sudah ditindak sebagian (mis. mitra ditegur), belum final
            // resolved -> sudah tuntas (refund ditandai selesai / mitra diblokir)
            $table->string('status')->default('pending');

            // warned_mitra | blocked_mitra | marked_refund_done
            $table->string('admin_action')->nullable();
            $table->text('admin_notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_complaints');
    }
};