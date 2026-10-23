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
    Schema::create('customer_violations', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
        $table->string('type'); // 'laporan_palsu' untuk saat ini, bisa ditambah tipe lain nanti
        $table->text('reason')->nullable();
        $table->timestamps();
    });
}

public function down()
{
    Schema::dropIfExists('customer_violations');
}
};
