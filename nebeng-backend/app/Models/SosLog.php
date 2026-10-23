<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SosLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'customer_id',
        'status',
        'latitude',
        'longitude',
        'message',
        'admin_notes',
    ];

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }
}