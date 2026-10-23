<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // order | payment | trip | verification | rating | reward | system
            $table->string('category')->default('system');

            $table->string('title');
            $table->text('message');

            // path frontend untuk diarahkan saat notifikasi diklik (opsional)
            $table->string('link')->nullable();

            $table->boolean('is_read')->default(false);

            $table->timestamps();

            $table->index(['user_id', 'is_read']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};