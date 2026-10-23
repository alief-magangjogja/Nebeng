<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('trips', function (Blueprint $table) {
        $table->id();

        $table->foreignId('mitra_id')->constrained('users')->onDelete('cascade');

        $table->string('vehicle_type'); // motor | mobil | barang

        $table->foreignId('origin_point_id')->constrained('pickup_points')->onDelete('cascade');
        $table->foreignId('destination_point_id')->constrained('pickup_points')->onDelete('cascade');

        $table->decimal('origin_lat', 10, 7)->nullable();
        $table->decimal('origin_lng', 10, 7)->nullable();

        $table->decimal('destination_lat', 10, 7)->nullable();
        $table->decimal('destination_lng', 10, 7)->nullable();

        $table->date('departure_date');
        $table->time('departure_time');

        $table->integer('price');

        $table->integer('seat_total');
        $table->integer('seat_available');

        $table->string('status')->default('active');

        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
