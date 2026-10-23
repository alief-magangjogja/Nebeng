<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            // tambah item_order_id
            $table->foreignId('item_order_id')
                ->nullable()
                ->after('trip_id')
                ->constrained('item_orders')
                ->nullOnDelete();

            // tambah payment_method
            $table->string('payment_method')
                ->nullable()
                ->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            $table->dropForeign(['item_order_id']);
            $table->dropColumn(['item_order_id', 'payment_method']);
        });
    }
};