<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up() : void
{
    Schema::create('verification_files', function (Blueprint $table) {
        $table->id();

        $table->foreignId('verification_id')->constrained()->cascadeOnDelete();

        $table->string('file_type');
        // face | ktp | selfie_ktp | sim | stnk

        $table->string('file_path');

        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('verification_files');
    }
};
