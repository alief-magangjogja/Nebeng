<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ride extends Model
{
    //
    public function driver()
{
    return $this->belongsTo(Driver::class);
}

public function bookings()
{
    return $this->hasMany(RideBooking::class);
}
}
