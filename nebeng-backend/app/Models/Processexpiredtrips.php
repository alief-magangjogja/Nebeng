<?php

namespace App\Console\Commands;

use App\Models\Trip;
use App\Models\User;
use App\Models\MitraViolation;
use App\Services\NotificationService;
use App\Services\OrderCancellationService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class ProcessExpiredTrips extends Command
{
    protected $signature = 'trips:process-expired';

    protected $description = 'Batalkan otomatis trip yang lewat jam berangkat: 0 customer langsung batal, ada customer tapi mitra tidak berangkat dapat 2 tahap (peringatan 30 menit, auto-batal 1 jam).';

    // Batas pelanggaran (strike/teguran, sudah disatukan jadi satu angka)
    // sebelum mitra otomatis disuspend - sama persis dengan batas yang
    // dipakai OrderComplaintController untuk teguran komplain, supaya
    // keduanya benar-benar 1 sistem yang sama, bukan 2 sistem terpisah.
    private const SUSPEND_THRESHOLD = 5;

    public function handle()
    {
        $now = Carbon::now();

        // Trip yang mitra-nya belum benar-benar berangkat (masih 'active'
        // atau sudah siap-siap 'waiting_departure', tapi belum 'on_the_way'
        // dst) dan jam keberangkatannya sudah lewat.
        $trips = Trip::with(['orders' => function ($q) {
                $q->where('status', '!=', 'cancelled');
            }, 'mitra'])
            ->whereIn('status', ['active', 'waiting_departure'])
            ->get()
            ->filter(function ($trip) use ($now) {
                $departure = Carbon::parse($trip->departure_date . ' ' . $trip->departure_time);
                return $departure->lessThanOrEqualTo($now);
            });

        foreach ($trips as $trip) {
            $departure = Carbon::parse($trip->departure_date . ' ' . $trip->departure_time);
            $minutesLate = $departure->diffInMinutes($now);
            $activeOrders = $trip->orders; // sudah difilter status != cancelled lewat eager load di atas

            // ================= 0 CUSTOMER: LANGSUNG BATAL =================
            if ($activeOrders->isEmpty()) {
                $trip->update(['status' => 'cancelled']);

                $this->info("Trip #{$trip->id} dibatalkan otomatis (0 customer, lewat jam berangkat).");
                continue;
            }

                        // ================= ADA CUSTOMER, TELAT >= 60 MENIT: AUTO-CANCEL =================
            if ($minutesLate >= 60) {
                foreach ($activeOrders as $order) {
                    OrderCancellationService::cancelWithFullRefund(
                        $order,
                        'Pesanan Dibatalkan Otomatis',
                        'Mitra tidak kunjung berangkat hingga 1 jam setelah jadwal. Pesanan Anda dibatalkan otomatis dan Anda berhak atas refund penuh. Trip ini baru benar-benar tuntas setelah mitra transfer & Anda konfirmasi dana diterima.'
                    );
                }

                // Sama seperti mitra hapus trip manual: kalau masih ada
                // kewajiban refund QRIS yang berjalan, trip mengambang
                // dulu di 'cancelled_pending_refund' - bukan langsung
                // dianggap tuntas.
                $needsRefundSettlement = OrderCancellationService::tripHasOutstandingRefund($trip);

                $trip->update([
                    'status' => $needsRefundSettlement
                        ? 'cancelled_pending_refund'
                        : 'cancelled',
                ]);

                if ($trip->mitra) {
                    $trip->mitra->increment('mitra_strike_count');
                    $trip->mitra->refresh();

                    // Catat ke log pelanggaran terpadu (mitra_violations)
                    // supaya mitra bisa lihat kejadian ini di halaman
                    // "Teguran" miliknya - sebelumnya pelanggaran jenis ini
                    // (telat berangkat) TIDAK PERNAH tercatat di manapun
                    // yang bisa dilihat mitra, cuma menambah angka
                    // mitra_strike_count yang tidak ditampilkan ke siapa pun.
                    MitraViolation::create([
                        'user_id' => $trip->mitra_id,
                        'type' => 'keterlambatan',
                        'reason' => "Trip #{$trip->id} - tidak berangkat hingga lebih dari 1 jam setelah jadwal keberangkatan ({$activeOrders->count()} pesanan direfund).",
                    ]);

                    if ($trip->mitra->mitra_strike_count >= self::SUSPEND_THRESHOLD) {
                        $trip->mitra->update(['status' => 'blocked']);
                    }

                    // PENTING: sebelumnya notifikasi ke mitra di sini cuma
                    // membahas strike/pelanggaran, tidak pernah mengingatkan
                    // bahwa masih ada kewajiban transfer refund QRIS yang
                    // menunggu - mitra bisa jadi tidak sadar customer sedang
                    // menunggu uangnya kembali. Tambahkan pengingat eksplisit
                    // kalau memang ada order QRIS yang perlu direfund.
                    $mitraMessage = "Trip #{$trip->id} dibatalkan otomatis karena Anda tidak berangkat hingga 1 jam setelah jadwal. Ini tercatat sebagai pelanggaran pada akun Anda.";

                    if ($needsRefundSettlement) {
                        $mitraMessage .= " Segera transfer refund ke customer yang membayar QRIS lalu upload bukti transfer di halaman Riwayat - trip ini belum dianggap tuntas sebelum itu selesai.";
                    }

                    NotificationService::send(
                        $trip->mitra_id,
                        'Trip Dibatalkan Otomatis',
                        $mitraMessage,
                        'trip',
                        '/mitra/riwayat'
                    );
                }

                $this->warn("Trip #{$trip->id} dibatalkan otomatis (mitra telat >= 60 menit, {$activeOrders->count()} order direfund).");
                continue;
            }

            // ================= ADA CUSTOMER, TELAT >= 30 MENIT: PERINGATAN =================
            if ($minutesLate >= 30 && !$trip->late_warning_sent_at) {
                $trip->update(['late_warning_sent_at' => $now]);

                if ($trip->mitra) {
                    NotificationService::send(
                        $trip->mitra_id,
                        'Segera Berangkat',
                        "Trip #{$trip->id} sudah lewat 30 menit dari jadwal keberangkatan. Segera berangkat, atau trip ini akan dibatalkan otomatis dalam 30 menit lagi.",
                        'trip',
                        "/mitra/perjalanan/{$trip->id}"
                    );
                }

                $this->comment("Trip #{$trip->id}: peringatan 30 menit terkirim ke mitra.");
            }
        }

        $this->info('Selesai memproses trip yang lewat jam berangkat.');
    }
}