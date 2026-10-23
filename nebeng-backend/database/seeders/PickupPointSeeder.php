<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PickupPoint;

class PickupPointSeeder extends Seeder
{
    public function run(): void
    {
        $points = [

            // YOGYAKARTA
            [
                'city_id' => 1,
                'pos_name' => 'Pos 1',
                'address' => 'Patihan, Kecamatan Kraton, Kota Yogyakarta',
                'latitude' => -7.8103,
                'longitude' => 110.3625,
            ],
            [
                'city_id' => 1,
                'pos_name' => 'Pos 2',
                'address' => 'Terminal Giwangan Yogyakarta',
                'latitude' => -7.8321,
                'longitude' => 110.3853,
            ],
            [
                'city_id' => 1,
                'pos_name' => 'Pos 3',
                'address' => 'Stasiun Tugu Yogyakarta',
                'latitude' => -7.7892,
                'longitude' => 110.3641,
            ],

            // PURWOKERTO
            [
                'city_id' => 2,
                'pos_name' => 'Pos 1',
                'address' => 'Terminal Bulupitu Purwokerto',
                'latitude' => -7.4381,
                'longitude' => 109.2306,
            ],
            [
                'city_id' => 2,
                'pos_name' => 'Pos 2',
                'address' => 'Alun Alun Purwokerto',
                'latitude' => -7.4229,
                'longitude' => 109.2340,
            ],
            [
                'city_id' => 2,
                'pos_name' => 'Pos 3',
                'address' => 'Stasiun Purwokerto',
                'latitude' => -7.4227,
                'longitude' => 109.2280,
            ],

            // SOLO
            [
                'city_id' => 3,
                'pos_name' => 'Pos 1',
                'address' => 'Terminal Tirtonadi Solo',
                'latitude' => -7.5461,
                'longitude' => 110.8272,
            ],
            [
                'city_id' => 3,
                'pos_name' => 'Pos 2',
                'address' => 'Stasiun Solo Balapan',
                'latitude' => -7.5561,
                'longitude' => 110.8256,
            ],
            [
                'city_id' => 3,
                'pos_name' => 'Pos 3',
                'address' => 'Alun Alun Solo',
                'latitude' => -7.5730,
                'longitude' => 110.8281,
            ],
        ];

        foreach ($points as $point) {
            PickupPoint::create($point);
        }
    }
}