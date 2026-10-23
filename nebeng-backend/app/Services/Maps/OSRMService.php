<?php

namespace App\Services\Maps;

use Illuminate\Support\Facades\Http;

class OSRMService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = 'https://router.project-osrm.org';
    }

    public function getRoute(
        float $originLat,
        float $originLng,
        float $destinationLat,
        float $destinationLng
    ) {

        $url = "{$this->baseUrl}/route/v1/driving/"
            . "{$originLng},{$originLat};"
            . "{$destinationLng},{$destinationLat}";

       $response = Http::withoutVerifying()->get($url, [
            'overview' => 'full',
            'geometries' => 'geojson'
        ]);

        if (!$response->successful()) {
            return null;
        }

        $data = $response->json();

        if (
            !isset($data['routes']) ||
            count($data['routes']) === 0
        ) {
            return null;
        }

        $route = $data['routes'][0];

        return [
            'distance_km' => round($route['distance'] / 1000, 2),
            'duration_min' => round($route['duration'] / 60),
            'geometry' => $route['geometry']
        ];
    }
}