<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PricingSetting;

class AdminPricingController extends Controller
{
    //

    public function index()
    {
        return response()->json(

            PricingSetting::all()
                ->pluck(
                    'value',
                    'key'
                )

        );
    }

    public function update(Request $request)
    {
        $validated = $request->validate([

            'motor_price_per_km' => 'required|numeric|min:0',
            'motor_min_price' => 'required|numeric|min:0',

            'mobil_price_per_km' => 'required|numeric|min:0',
            'mobil_min_price' => 'required|numeric|min:0',

            'barang_motor_base_price' => 'required|numeric|min:0',
            'barang_motor_price_per_km' => 'required|numeric|min:0',

            'barang_mobil_base_price' => 'required|numeric|min:0',
            'barang_mobil_price_per_km' => 'required|numeric|min:0',

            'barang_bus_base_price' => 'required|numeric|min:0',
            'barang_bus_price_per_km' => 'required|numeric|min:0',

            // Kereta/Kapal/Pesawat SUDAH TIDAK ADA lagi di form Admin (kini
            // cuma 3 tipe barang: Motor, Mobil, Kendaraan Barang/Truk) -
            // tapi diubah 'sometimes' (bukan dihapus total) supaya data lama
            // di tabel tidak bermasalah kalau sewaktu-waktu masih dibaca
            // kode lain, dan supaya request dari form BARU (yang tidak lagi
            // mengirim field ini) tidak lagi gagal validasi 422.
            'barang_kereta_base_price' => 'sometimes|numeric|min:0',
            'barang_kereta_price_per_km' => 'sometimes|numeric|min:0',

            'barang_kapal_base_price' => 'sometimes|numeric|min:0',
            'barang_kapal_price_per_km' => 'sometimes|numeric|min:0',

            'barang_pesawat_base_price' => 'sometimes|numeric|min:0',
            'barang_pesawat_price_per_km' => 'sometimes|numeric|min:0',

            'xxs_multiplier' => 'required|numeric|min:0',
            'xs_multiplier' => 'required|numeric|min:0',
            'kecil_multiplier' => 'required|numeric|min:0',
            'sedang_multiplier' => 'required|numeric|min:0',
            'besar_multiplier' => 'required|numeric|min:0',
        ]);

        foreach ($validated as $key => $value) {

            PricingSetting::updateOrCreate(
                [
                    'key' => $key
                ],
                [
                    'value' => $value
                ]
            );
        }

        return response()->json([
            'message' => 'Tarif berhasil diperbarui'
        ]);
    }
}