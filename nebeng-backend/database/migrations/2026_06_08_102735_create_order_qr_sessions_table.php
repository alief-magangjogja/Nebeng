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
    Schema::create('order_qr_sessions', function (Blueprint $table) {

        $table->id();

        $table->foreignId('order_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->string('token')->unique();

        $table->timestamp('expired_at');

        $table->timestamp('used_at')->nullable();

        $table->boolean('is_used')->default(false);

        $table->timestamps();
    });
}

public function down()
{
    Schema::dropIfExists('order_qr_sessions');
}
};
