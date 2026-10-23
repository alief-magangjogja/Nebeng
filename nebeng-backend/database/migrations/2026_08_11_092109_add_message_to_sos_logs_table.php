<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * TripController::sendSos() sudah mengisi kolom 'message' sejak awal,
     * tapi migration create_sos_logs_table tidak pernah membuat kolomnya.
     * Ini menyebabkan SosLog::create() gagal dengan SQL error
     * "Unknown column 'message'" setiap kali SOS dikirim.
     */
    public function up(): void
    {
        Schema::table('sos_logs', function (Blueprint $table) {
            $table->text('message')->nullable()->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('sos_logs', function (Blueprint $table) {
            $table->dropColumn('message');
        });
    }
};