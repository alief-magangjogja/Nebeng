<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'customer_id',
        'mitra_id'
    ];

    public function customer()
    {
        return $this->belongsTo(User::class,'customer_id');
    }

    public function mitra()
    {
        return $this->belongsTo(User::class,'mitra_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}