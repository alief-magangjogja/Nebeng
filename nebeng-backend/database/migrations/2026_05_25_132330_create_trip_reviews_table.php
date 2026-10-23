<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trip_reviews', function (Blueprint $table) {
            $table->id();

            // relasi trip
            $table->foreignId('trip_id')
                ->constrained('trips')
                ->onDelete('cascade');

            // customer yang memberi rating
            $table->foreignId('customer_id')
                ->constrained('users')
                ->onDelete('cascade');

            // driver / mitra yang dirating
            $table->foreignId('mitra_id')
                ->constrained('users')
                ->onDelete('cascade');

            $table->unsignedTinyInteger('rating');
            $table->text('review')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_reviews');
    }
};