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
    Schema::table('trip_qr_sessions', function (Blueprint $table) {
        $table->enum('purpose', [
            'departure',
            'arrival'
        ])->default('arrival');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('trip_qr_sessions', function (Blueprint $table) {
            //
        });
    }
};
