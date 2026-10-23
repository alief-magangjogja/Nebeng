<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('item_orders', function (Blueprint $table) {
    $table->id();

    $table->foreignId('user_id')->constrained()->cascadeOnDelete();

    $table->foreignId('origin_point_id')->constrained('pickup_points');
    $table->foreignId('destination_point_id')->constrained('pickup_points');

    $table->date('delivery_date');

    $table->enum('size', ['kecil','sedang','besar']);

    $table->text('item_description')->nullable();

    $table->string('image')->nullable();

    $table->enum('status', [
        'pending',
        'matched',
        'in_transit',
        'delivered'
    ])->default('pending');

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_orders');
    }
};
