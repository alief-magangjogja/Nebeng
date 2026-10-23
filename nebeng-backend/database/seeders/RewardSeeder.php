<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Reward;

class RewardSeeder extends Seeder
{
    public function run(): void
    {
        $rewards = [
            [
                'title' => 'Mug Nebeng Edisi Spesial',
                'description' => 'Mug keramik eksklusif dengan logo Nebeng, cocok untuk menemani harimu.',
                'image' => 'https://picsum.photos/seed/nebeng-mug/400/400',
                'points_required' => 120,
                'stock' => 50,
                'category' => 'merchandise',
            ],
            [
                'title' => 'T-Shirt Nebeng',
                'description' => 'Kaos katun combed 24s dengan desain eksklusif Nebeng.',
                'image' => 'https://picsum.photos/seed/nebeng-tshirt/400/400',
                'points_required' => 200,
                'stock' => 30,
                'category' => 'merchandise',
            ],
            [
                'title' => 'Tumbler Nebeng',
                'description' => 'Tumbler stainless 500ml, jaga hidrasi selama perjalanan.',
                'image' => 'https://picsum.photos/seed/nebeng-tumbler/400/400',
                'points_required' => 150,
                'stock' => 40,
                'category' => 'merchandise',
            ],
            [
                'title' => 'Voucher Potongan Rp10.000',
                'description' => 'Voucher potongan harga untuk perjalanan berikutnya.',
                'image' => 'https://picsum.photos/seed/nebeng-voucher/400/400',
                'points_required' => 80,
                'stock' => null, // tidak terbatas
                'category' => 'voucher',
            ],
        ];

        foreach ($rewards as $reward) {
            Reward::create($reward);
        }
    }
}