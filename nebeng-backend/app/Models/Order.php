<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Trip;
use App\Models\User;
use App\Models\ItemOrder;
use App\Models\OrderQrSession;

class Order extends Model
{
        protected $fillable = [
            'trip_id',
            'customer_id',
            'pickup_address',
            'drop_address',
            'price',
            'status',
            'item_order_id',
            'payment_method',
            'payment_proof',
            'payment_status',
            'readiness_status',
            'refund_status',
            'refund_percentage',
            'refund_amount',
            'refund_proof',
            'refund_destination',
            'refund_destination_set_at',
            'refund_reference',
            'mitra_refund_confirmed_at',
            'customer_refund_confirmed_at',
            'penalty_amount',
            'cancelled_at',
            'delivered_at',
        ];

    protected $casts = [
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function itemOrder()
    {
        return $this->belongsTo(ItemOrder::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function qrSessions()
    {
        return $this->hasMany(OrderQrSession::class);
    }

    // Satu order maksimal punya satu komplain (unique constraint di
    // migration order_complaints). Dipakai untuk menampilkan admin_notes
    // ke mitra & customer begitu admin sudah meninjau laporan.
    public function complaint()
    {
        return $this->hasOne(OrderComplaint::class);
    }

    // Dipindahkan dari OrderController supaya bisa dipakai bersama oleh
    // controller dan command otomatis (mis. auto-cancel trip yang mitra-nya
    // tidak kunjung berangkat).
    // Mendukung DUA kosakata: yang baru (XS/S/M/L/XL, dipakai form
    // NebengBarang.jsx mitra saat ini) dan yang lama (xxs/xs/kecil/
    // sedang/besar, untuk kompatibilitas data/form lain yang mungkin
    // masih kirim format lama).
    public const CAPACITY_MAP = [
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

    // Order barang (punya item_order_id) -> berat barangnya (kg).
    // Order penumpang biasa -> tetap 1 kursi.
    public function capacityWeight(): float
    {
        if ($this->item_order_id && $this->itemOrder) {
            return self::CAPACITY_MAP[$this->itemOrder->size] ?? 1;
        }

        return 1;
    }

    // Menentukan apakah kapasitas trip untuk order ini SUDAH terpakai
    // (perlu dikembalikan kalau dibatalkan).
    // - Order BARANG: kapasitas dikunci sejak order dibuat -> selalu true.
    // - Order PENUMPANG: kursi baru terkunci setelah payment_status
    //   dikonfirmasi (status jadi 'completed').
    public function wasCapacityReserved(): bool
    {
        if ($this->item_order_id) {
            return true;
        }

        return $this->status === 'completed';
    }
}