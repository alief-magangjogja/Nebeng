<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\OrderComplaint;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class ProcessOverdueRefunds extends Command
{
    protected $signature = 'refunds:process-overdue';

    protected $description = 'Tandai otomatis sebagai "disputed" order QRIS yang refund-nya belum ditransfer mitra melebihi 24 jam sejak pembatalan - supaya soft-lock (tidak bisa buat trip baru) langsung aktif tanpa menunggu customer melapor manual.';

    // Batas waktu wajar bagi mitra untuk mentransfer refund sebelum
    // dianggap terlambat dan otomatis di-eskalasi ke status disputed.
    private const OVERDUE_HOURS = 24;

   public function handle()
{
    $cutoff = Carbon::now()->subHours(self::OVERDUE_HOURS);

    // Hanya order QRIS yang MASIH menunggu mitra transfer (belum
    // sempat klaim sama sekali) dan sudah dibatalkan sejak lebih
    // dari 24 jam lalu.
    //
    // PENTING: command ini TIDAK LAGI mengubah refund_status jadi
    // 'disputed' maupun membuat baris OrderComplaint secara otomatis.
    // Status 'disputed' dan banner "Laporan Sedang Ditinjau Admin"
    // sekarang MURNI hasil laporan manual customer lewat tombol
    // "Laporkan" (lihat OrderComplaintController::store). Soft-lock
    // "mitra tidak bisa buat trip baru" tetap jalan otomatis berbasis
    // waktu - lihat pengecekan overdue langsung di TripController::store,
    // bukan lagi lewat status 'disputed' di sini.
    $overdueOrders = Order::with('trip')
        ->where('payment_method', 'qris')
        ->whereIn('refund_status', ['pending_100_percent', 'pending_50_percent'])
        ->where('cancelled_at', '<=', $cutoff)
        ->get();

    if ($overdueOrders->isEmpty()) {
        $this->info('Tidak ada order dengan refund yang melewati batas 24 jam.');
        return;
    }

    $adminIds = User::where('role', 'admin')->pluck('id')->toArray();

    foreach ($overdueOrders as $order) {
        if (!$order->trip) {
            continue;
        }

        // Sekadar pengingat/notifikasi - TIDAK mengubah refund_status
        // dan TIDAK membuat/mengubah OrderComplaint. Soft-lock mitra
        // sudah otomatis aktif lewat pengecekan waktu di
        // TripController::store, terlepas dari notifikasi ini terkirim
        // atau tidak.
        NotificationService::send(
            $order->trip->mitra_id,
            'Refund Terlambat',
            "Refund untuk order #{$order->id} belum Anda transfer lebih dari " . self::OVERDUE_HOURS . " jam sejak dibatalkan. Anda TIDAK BISA membuat trip baru sampai refund ini selesai ditransfer. Segera transfer & upload bukti di halaman Riwayat.",
            'order',
            '/mitra/riwayat'
        );

        NotificationService::sendToMany(
            $adminIds,
            'Refund Lewat Batas Waktu (Info)',
            "Order #{$order->id} - mitra {$order->trip->mitra_id} belum transfer refund lebih dari " . self::OVERDUE_HOURS . " jam. Mitra sudah otomatis dikunci dari membuat trip baru sampai selesai.",
            'order',
            '/admin/refund'
        );

        $this->warn("Order #{$order->id} sudah lewat " . self::OVERDUE_HOURS . " jam - mitra dikunci otomatis, notifikasi terkirim (tidak membuat komplain).");
    }

    $this->info('Selesai memproses pengingat refund yang melewati batas waktu.');
}
}