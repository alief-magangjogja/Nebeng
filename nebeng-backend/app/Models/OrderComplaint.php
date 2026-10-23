<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderComplaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'customer_id',
        'mitra_id',
        'type',
        'description',
        'customer_proof',
        'status',
        'admin_action',
        'admin_notes',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function mitra()
    {
        return $this->belongsTo(User::class, 'mitra_id');
    }
}