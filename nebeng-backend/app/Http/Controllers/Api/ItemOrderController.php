<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PickupPoint;
use App\Models\ItemOrder;
use App\Models\Trip;
use App\Models\Order;

class ItemOrderController extends Controller
{
    // Konversi ukuran barang -> berat (kg). Dipakai untuk menghitung harga
    // proporsional & mengecek sisa kapasitas muatan trip. Sama persis
    // dengan mapping yang dipakai di TripController saat trip dibuat.
    // Mendukung DUA kosakata: yang baru (XS/S/M/L/XL, dipakai form
    // NebengBarang.jsx mitra saat ini) dan yang lama (xxs/xs/kecil/
    // sedang/besar, untuk kompatibilitas data/form lain yang mungkin
    // masih kirim format lama).
    private const CAPACITY_MAP = [
        'XS' => 0.5,
        'S' => 1,
        'M' => 5,
        'L' => 10,
        'XL' => 15,

        'xxs' => 0.5,
        'xs' => 1,
        'kecil' => 5,
        'sedang' => 10,
        'besar' => 15,
    ];

    public function store(Request $request)
    {
        $validated = $request->validate([

            'trip_id' => 'required|exists:trips,id',

            'origin_point_id' =>
                'required|exists:pickup_points,id',

            'destination_point_id' =>
                'required|exists:pickup_points,id',

            'delivery_date' => 'required|date',

            'size' => 'required|in:dokumen,xxs,xs,kecil,sedang,besar,XS,S,M,L,XL',

            'item_description' => 'nullable|string',

            'payment_method' =>
                'required|in:cash,qris,ewallet',

            'image' => 'nullable|image|max:2048'
        ]);

        // =========================
        // UPLOAD IMAGE
        // =========================

        $imagePath = null;

        if ($request->hasFile('image')) {

            $imagePath = $request
                ->file('image')
                ->store('item_images', 'public');
        }

        // =========================
        // AMBIL TRIP
        // =========================

        $trip = Trip::with([
            'originPoint',
            'destinationPoint'
        ])->findOrFail($validated['trip_id']);

        // Sama seperti di OrderController::store(): mitra tanpa QRIS tetap
        // boleh berjualan, tapi customer tidak boleh bisa pilih 'qris'
        // untuk trip itu.
        if ($validated['payment_method'] === 'qris' && empty($trip->mitra?->profile?->qris_image)) {
            return response()->json([
                'message' => 'Mitra ini belum menyediakan QRIS. Silakan pilih metode pembayaran lain (Tunai).'
            ], 422);
        }

        // ==========================================
        //PENCEGAHAN DUPLIKASI PESANAN (ANTI DOUBLE ORDER)
        // ==========================================
        $existingOrder = Order::where('trip_id', $trip->id)
            ->where('customer_id', auth()->id())
            ->whereIn('status', ['pending', 'completed'])
            ->first();

        if ($existingOrder) {
            return response()->json([
                'message' => 'Anda sudah memiliki pesanan aktif pada trip ini.'
            ], 400);
        }

        // ==========================================
        // HITUNG BERAT & HARGA PROPORSIONAL
        // ==========================================
        // Kapasitas muatan trip barang itu SHARED antar customer (persis
        // seperti kursi penumpang) - bukan sekali pesan langsung habis
        // semua. Harga dihitung proporsional terhadap berat yang benar-
        // benar dipesan customer ini dibanding kapasitas total yang
        // ditawarkan mitra untuk trip ini.
        //
        // seat_available dikunci (dikurangi) langsung setelah Order
        // berhasil dibuat di bawah - lihat komentar "KUNCI KAPASITAS"

        $requestedWeight = self::CAPACITY_MAP[$validated['size']] ?? 0.5;

        $tripCapacity = self::CAPACITY_MAP[$trip->baggage_capacity]
            ?? ($trip->seat_total ?: $requestedWeight);

        if ($trip->seat_available < $requestedWeight) {
            return response()->json([
                'message' => 'Sisa kapasitas muatan trip ini tidak mencukupi untuk ukuran barang yang dipilih.'
            ], 400);
        }

        $itemPrice = $tripCapacity > 0
            ? (int) round(($trip->price / $tripCapacity) * $requestedWeight)
            : $trip->price;

        // =========================
        // CREATE ITEM ORDER
        // =========================

        $itemOrder = ItemOrder::create([

            'user_id' => auth()->id(),

            'origin_point_id' =>
                $validated['origin_point_id'],

            'destination_point_id' =>
                $validated['destination_point_id'],

            'delivery_date' =>
                $validated['delivery_date'],

            'size' => $validated['size'],

            'item_description' =>
                $validated['item_description'] ?? null,

            'image' => $imagePath,

            'status' => 'pending'
        ]);

        // =========================
        // CREATE ORDER
        // =========================

        $order = Order::create([

            'trip_id' => $trip->id,

            'item_order_id' => $itemOrder->id,

            'customer_id' => auth()->id(),

            'pickup_address' =>
                $trip->originPoint->address ?? 'Pickup Point',

            'drop_address' =>
                $trip->destinationPoint->address ?? 'Destination Point',

            // Harga proporsional terhadap berat yang dipesan, BUKAN harga
            // penuh trip lagi.
            'price' => $itemPrice,

            'payment_method' =>
                $validated['payment_method'],

            'status' => 'pending',

            'payment_status' => 'unpaid',
        ]);

        // ==========================================
        // KUNCI KAPASITAS SAAT INI JUGA (booking-lock)
        // ==========================================
        // Beda dengan order penumpang (yang baru mengunci kursi setelah
        // pembayaran dikonfirmasi mitra), order barang mengunci kapasitas
        // SEJAK order dibuat - baik tunai maupun QRIS. Ini supaya "sudah
        // dipesan" dan "sudah dibayar" jadi dua hal yang jelas terpisah:
        // begitu customer commit pesan, kapasitas langsung terpakai dan
        // tidak bisa dobel-janji ke customer lain, terlepas dari kapan
        // mitra sempat konfirmasi pembayarannya.
        //
        // Konsekuensinya: tombol "Konfirmasi Tunai Diterima" di sisi
        // mitra (OrderController@confirmPayment) TIDAK LAGI menyentuh
        // kapasitas - murni soal pencatatan pendapatan sekarang.
        $trip->decrement('seat_available', $requestedWeight);

        return response()->json([

            'message' => 'Order barang berhasil dibuat',

            'order' => $order->load([
                'itemOrder',
                'customer',
                'trip'
            ]),

            'item_order' => $itemOrder

        ]);
    }
    
}