<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * seat_total & seat_available sebelumnya integer - cukup untuk trip
     * penumpang (jumlah kursi selalu bilangan bulat), tapi trip barang
     * memakai kolom yang sama untuk menyimpan berat (kg) yang bisa
     * pecahan (mis. 0.5 untuk ukuran XXS). Integer membulatkan nilai
     * pecahan saat disimpan, jadi pengurangan seperti 4 - 0.5 = 3.5
     * malah tersimpan sebagai 4 (dibulatkan), seolah tidak berkurang
     * sama sekali.
     */
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->decimal('seat_total', 8, 2)->change();
            $table->decimal('seat_available', 8, 2)->change();
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->integer('seat_total')->change();
            $table->integer('seat_available')->change();
        });
    }
};