<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'full_name',
        'nik',
        'birth_place',
        'birth_date',
        'gender',
        'religion',
        'address',
        'province',
        'city',
        'district',
        'village',
        'bank_name',
        'bank_account_name',
        'bank_account_number',
        'qris_image',
    ];

    protected $casts = [
        'birth_date' => 'date'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}