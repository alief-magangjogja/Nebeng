<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderQrSession extends Model
{
    protected $fillable = [
        'order_id',
        'token',
        'expired_at',
        'used_at',
        'is_used',
    ];

    protected $casts = [
        'expired_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}