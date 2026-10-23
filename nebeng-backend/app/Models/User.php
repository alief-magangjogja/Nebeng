<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\UserProfile;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
     protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'avatar',
        'status',
        'pickup_point_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function driver()
    {
        return $this->hasOne(Driver::class);
    }

    public function bookings()
    {
        return $this->hasMany(RideBooking::class);
    }

    public function rewardTransactions()
    {
        return $this->hasMany(RewardTransaction::class);
    }

    public function balance()
    {
        return $this->hasOne(DriverBalance::class);
    }

    public function balanceTransactions()
    {
        return $this->hasMany(BalanceTransaction::class);
    }

    public function profile()
    {
        return $this->hasOne(UserProfile::class, 'user_id');
    }

    public function verification()
    {
        return $this->hasOne(Verification::class);
    }

    public function trips()
    {
        return $this->hasMany(Trip::class, 'mitra_id');
    }

    // Pos (pickup point) yang dimiliki akun ini. Hanya terisi untuk role 'pos_mitra'.
    public function pickupPoint()
    {
        return $this->belongsTo(\App\Models\PickupPoint::class, 'pickup_point_id');
    }

    public function reviewsAsMitra()
    {
        // WAJIB: filter type - tanpa ini, baris "mitra_to_customer" (mitra
        // menilai CUSTOMER) ikut terhitung di sini padahal mitra_id-nya
        // kebetulan sama (mitra pemilik trip). Akibatnya rata-rata &
        // jumlah ulasan mitra jadi salah di halaman order (Motor/Mobil/
        // Barang) dan kartu rating di dashboard mitra sendiri - keduanya
        // pakai relasi ini lewat withAvg()/withCount(), beda dengan
        // TripReviewController::mitraProfile() yang sudah manual filter
        // type dan karena itu selalu akurat.
        return $this->hasMany(TripReview::class, 'mitra_id')->where('type', 'customer_to_mitra');
    }

    // Riwayat pengajuan banding milik akun ini (khusus mitra yang pernah diblokir).
    public function appeals()
    {
        return $this->hasMany(\App\Models\MitraAppeal::class, 'user_id');
    }

    // Riwayat pelanggaran terpadu (keterlambatan, pembatalan mendadak,
    // teguran komplain) yang menyumbang ke mitra_strike_count.
    public function violations()
    {
        return $this->hasMany(\App\Models\MitraViolation::class, 'user_id');
    }
}