<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {

            $table->decimal('estimated_distance_km', 8, 2)
                  ->nullable()
                  ->after('departure_time');

            $table->integer('estimated_duration_min')
                  ->nullable()
                  ->after('estimated_distance_km');

            $table->longText('route_geojson')
                  ->nullable()
                  ->after('estimated_duration_min');

        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {

            $table->dropColumn([
                'estimated_distance_km',
                'estimated_duration_min',
                'route_geojson'
            ]);

        });
    }
};