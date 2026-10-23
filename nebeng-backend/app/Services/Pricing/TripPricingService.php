<?php

namespace App\Services\Pricing;
use App\Models\PricingSetting;



class TripPricingService
{
    private function getSetting(
        string $key,
        $default
    )
    {
        return PricingSetting::where(
            'key',
            $key
        )->value('value') ?? $default;
    }

    public function calculate(
        string $vehicleType,
        float $distanceKm,
        ?string $baggageCapacity = null
    ): int {

        // =========================
        // MOTOR (PENUMPANG)
        // =========================

        if ($vehicleType === 'motor') {

            $pricePerKm = $this->getSetting(
                'motor_price_per_km',
                1500
            );

            $minPrice = $this->getSetting(
                'motor_min_price',
                8000
            );

            $price = $distanceKm * $pricePerKm;

            return max(
                $minPrice,
                round($price)
            );
        }

        // =========================
        // MOBIL (PENUMPANG)
        // =========================

        if ($vehicleType === 'mobil') {

            $pricePerKm = $this->getSetting(
                'mobil_price_per_km',
                2500
            );

            $minPrice = $this->getSetting(
                'mobil_min_price',
                15000
            );

            $price = $distanceKm * $pricePerKm;

            return max(
                $minPrice,
                round($price)
            );
        }

        // =========================
        // BARANG
        // =========================

        if (
            str_starts_with($vehicleType, 'Barang-') ||
            str_starts_with($vehicleType, 'barang-')
        ) {

            $basePrice = 0;
            $pricePerKm = 0;

            switch ($vehicleType) {

                case 'barang-motor':
                case 'Barang-Motor':

                    $basePrice =
                        $this->getSetting(
                            'barang_motor_base_price',
                            8000
                        );

                    $pricePerKm =
                        $this->getSetting(
                            'barang_motor_price_per_km',
                            800
                        );
                    break;

                case 'barang-mobil':
                case 'Barang-Mobil':

                    $basePrice =
                        $this->getSetting(
                            'barang_mobil_base_price',
                            12000
                        );

                    $pricePerKm =
                        $this->getSetting(
                            'barang_mobil_price_per_km',
                            1200
                        );
                    break;

                case 'barang-bus':
                case 'Barang-Bus':

                    $basePrice =
                        $this->getSetting(
                            'barang_bus_base_price',
                            15000
                        );

                    $pricePerKm =
                        $this->getSetting(
                            'barang_bus_price_per_km',
                            1400
                        );
                    break;

                case 'barang-kereta':
                case 'Barang-Kereta':

                    $basePrice =
                        $this->getSetting(
                            'barang_kereta_base_price',
                            18000
                        );

                    $pricePerKm =
                        $this->getSetting(
                            'barang_kereta_price_per_km',
                            1600
                        );
                    break;

                case 'barang-kapal':
                case 'Barang-Kapal':

                    $basePrice =
                        $this->getSetting(
                            'barang_kapal_base_price',
                            25000
                        );

                    $pricePerKm =
                        $this->getSetting(
                            'barang_kapal_price_per_km',
                            2000
                        );
                    break;

                case 'barang-pesawat':
                case 'Barang-Pesawat':

                    $basePrice =
                        $this->getSetting(
                            'barang_pesawat_base_price',
                            35000
                        );

                    $pricePerKm =
                        $this->getSetting(
                            'barang_pesawat_price_per_km',
                            3000
                        );
                    break;

                default:

                    $basePrice = 10000;
                    $pricePerKm = 1000;
            }

            // =========================
            // HITUNG HARGA DASAR
            // =========================

            $price = $basePrice + ($distanceKm * $pricePerKm);

            // =========================
            // MULTIPLIER UKURAN BARANG
            // =========================

            if ($baggageCapacity) {

                // PENTING: sebelumnya pencocokan pakai str_contains() yang
                // cuma cocok untuk kosakata LAMA (xxs/xs/kecil/sedang/besar).
                // Form barang sekarang kirim kosakata BARU (XS/S/M/L/XL) -
                // dari kelimanya, cuma 'XS' yang KEBETULAN cocok (karena
                // substring "xs" ada di dalamnya), sedangkan 'S'/'M'/'L'/'XL'
                // TIDAK PERNAH cocok sama sekali dan jatuh tanpa multiplier
                // apa pun (efeknya seperti dikali 1, mengabaikan tarif yang
                // di-set admin). Sekarang dipetakan dulu ke kunci lama yang
                // merepresentasikan tingkat berat yang SAMA, baru dicocokkan
                // persis (bukan substring) - supaya kedua kosakata konsisten.
                $newToOldKey = [
                    'xs' => 'xxs',   // XS (0.5kg) -> tier xxs
                    's' => 'xs',     // S  (1kg)   -> tier xs
                    'm' => 'kecil',  // M  (5kg)   -> tier kecil
                    'l' => 'sedang', // L  (10kg)  -> tier sedang
                    'xl' => 'besar', // XL (15kg)  -> tier besar
                ];

                $capacity = strtolower(trim($baggageCapacity));

                // Kosakata lama sudah persis namanya sendiri; kosakata baru
                // dipetakan dulu lewat $newToOldKey.
                $oldKey = in_array($capacity, ['xxs', 'xs', 'kecil', 'sedang', 'besar'], true)
                    ? $capacity
                    : ($newToOldKey[$capacity] ?? null);

                $multiplierDefaults = [
                    'xxs' => 0.6,
                    'xs' => 0.8,
                    'kecil' => 1.0,
                    'sedang' => 1.3,
                    'besar' => 1.6,
                ];

                if ($oldKey) {
                    $price *= $this->getSetting(
                        "{$oldKey}_multiplier",
                        $multiplierDefaults[$oldKey]
                    );
                }
            }

            return round($price);
        }

        return 0;
    }
}