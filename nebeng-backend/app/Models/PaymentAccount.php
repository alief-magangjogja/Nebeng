<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentAccount extends Model
{
    protected $fillable = [
        'user_id',
        'account_type',
        'provider_name',
        'account_number',
        'account_holder_name',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}