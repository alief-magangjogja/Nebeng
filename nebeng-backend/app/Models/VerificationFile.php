<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VerificationFile extends Model
{
    protected $fillable = [
        'verification_id',
        'file_type',
        'file_path'
    ];

    public function verification()
    {
        return $this->belongsTo(Verification::class);
    }
}