<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\PickupPoint;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@nebeng.com'],
            [
                'name' => 'Alief Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'phone' => '081122334455',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 1 akun pos_mitra per pickup_point. Email: <namakota><nomorpos>@nebeng.com
        // Password default: "password". Dicari via pickup_point_id supaya
        // seed ulang mengubah akun yang sudah ada, bukan bikin duplikat.

        PickupPoint::with('city')->get()->each(function (PickupPoint $point) {
            $cityName = $point->city->name ?? 'Kota';
            $citySlug = strtolower(preg_replace('/[^a-zA-Z]/', '', $cityName));

            preg_match('/\d+/', $point->pos_name, $matches);
            $posNumber = $matches[0] ?? $point->id;

            $email = "{$citySlug}{$posNumber}@nebeng.com";

            User::updateOrCreate(
                [
                    'pickup_point_id' => $point->id,
                    'role' => 'pos_mitra',
                ],
                [
                    'name' => $cityName . ' - ' . $point->pos_name,
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'phone' => '08' . str_pad((string) (9000000000 + $point->id), 10, '0', STR_PAD_LEFT),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        });
    }
}