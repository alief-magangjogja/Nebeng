<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripDraft extends Model
{
    protected $fillable = [
        'user_id',
        'category',
        'origin_point_id',
        'destination_point_id',
        'departure_time',
        'mitra_vehicle_id',
        'tebengan_type',
        'seat_count',
        'baggage_capacity',
    ];

    public function originPoint()
    {
        return $this->belongsTo(PickupPoint::class, 'origin_point_id');
    }

    public function destinationPoint()
    {
        return $this->belongsTo(PickupPoint::class, 'destination_point_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(MitraVehicle::class, 'mitra_vehicle_id');
    }
}