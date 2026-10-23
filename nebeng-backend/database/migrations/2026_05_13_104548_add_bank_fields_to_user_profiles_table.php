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
        Schema::table('user_profiles', function (Blueprint $table) {

            // =========================
            // DATA REKENING
            // =========================
            $table->string('bank_name')->nullable();

            $table->string('bank_account_name')->nullable();

            $table->string('bank_account_number')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {

            $table->dropColumn([
                'bank_name',
                'bank_account_name',
                'bank_account_number'
            ]);
        });
    }
};