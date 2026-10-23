<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripTracking extends Model
{
    protected $fillable = [
        'trip_id',
        'latitude',
        'longitude',
        'tracked_at'
    ];

    protected $casts = [
        'tracked_at' => 'datetime',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }
}