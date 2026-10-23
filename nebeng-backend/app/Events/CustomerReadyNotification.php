<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CustomerReadyNotification implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order;

    public function __construct($order)
    {
        $this->order = $order;
    }

    // Broadcast ke DUA channel sekaligus: mitra yang megang trip ini
    // (biar list "Customer Perjalanan" update tanpa refresh), dan
    // customer yang barusan discan (biar layar QR-nya otomatis
    // berubah jadi "sudah siap" tanpa refresh).
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('mitra.' . $this->order->trip->mitra_id),
            new PrivateChannel('customer.' . $this->order->customer_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'customer-ready';
    }

    public function broadcastWith(): array
    {
        return [
            'message' => 'Customer sudah diverifikasi dan siap berangkat',
            'order_id' => $this->order->id,
            'trip_id' => $this->order->trip_id,
            'customer_id' => $this->order->customer_id,
            'customer_name' => $this->order->customer->name ?? null,
            'readiness_status' => 'ready',
        ];
    }
}