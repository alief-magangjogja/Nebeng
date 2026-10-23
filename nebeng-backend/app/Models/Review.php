<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
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
}
