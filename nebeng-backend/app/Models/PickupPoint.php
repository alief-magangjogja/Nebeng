<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PickupPoint extends Model
{
    protected $fillable = [
        'city_id',
        'pos_name',
        'address',
        'latitude',
        'longitude'
    ];

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    // Akun pos_mitra yang memegang pos ini (1 pos = 1 akun).
    public function posMitra()
    {
        return $this->hasOne(User::class, 'pickup_point_id');
    }
}