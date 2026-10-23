<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    //
    public function user()
{
    return $this->belongsTo(User::class);
}

public function vehicles()
{
    return $this->hasMany(Vehicle::class);
}

public function rides()
{
    return $this->hasMany(Ride::class);
}
}
