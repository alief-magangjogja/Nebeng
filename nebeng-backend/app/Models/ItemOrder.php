<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemOrder extends Model
{
    protected $fillable = [
        'user_id',
        'origin_point_id',
        'destination_point_id',
        'delivery_date',
        'size',
        'item_description',
        'image',
        'status'
    ];

    public function order()
{
    return $this->hasOne(Order::class);
}
}
