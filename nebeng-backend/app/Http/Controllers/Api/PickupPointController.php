<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PickupPoint;
use App\Models\ItemOrder;


class PickupPointController extends Controller
{
    //
    public function index()
    {
        return PickupPoint::with('city')
            ->get()
            ->sortBy(function ($p) {
                // urutkan berdasarkan nama kota dulu, baru nama pos,
                // supaya pos-pos dari kota yang sama selalu berdekatan
                return $p->city->name . '-' . $p->pos_name;
            })
            ->values()
            ->map(function($p){
                return [
                    'id'=>$p->id,
                    'city'=>$p->city->name,
                    'pos_name'=>$p->pos_name,
                    'address'=>$p->address
                ];
            });
    }
}