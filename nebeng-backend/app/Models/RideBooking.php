<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideBooking extends Model
{
    //
    public function ride()
{
    return $this->belongsTo(Ride::class);
}

public function user()
{
    return $this->belongsTo(User::class);
}

public function payment()
{
    return $this->hasOne(Payment::class);
}
}
