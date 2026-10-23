<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class QrisFileController extends Controller
{
    /**
     * Serve file QRIS mitra lewat route API (bukan file statis langsung),
     * supaya request-nya beneran lewat Laravel dan kena middleware CORS
     * yang sudah dikonfigurasi untuk 'api/*'. File statis di /storage/...
     * tidak pernah melewati Laravel sama sekali (dilayani langsung oleh
     * web server), jadi CORS di config/cors.php tidak akan pernah berlaku
     * untuk itu meskipun 'storage/*' ditambahkan ke daftar paths-nya.
     */
    public function download(Request $request)
    {
        $path = $request->query('path', '');

        // Keamanan: bersihkan path traversal, dan hanya izinkan file yang
        // memang berada di dalam folder qris/ (tempat ProfileController
        // menyimpan upload QRIS mitra).
        $path = str_replace(['..', '\\'], '', $path);
        $path = ltrim($path, '/');

        if (!str_starts_with($path, 'qris/')) {
            abort(403, 'Path tidak valid');
        }

        $disk = Storage::disk('public');

        if (!$disk->exists($path)) {
            abort(404, 'File QRIS tidak ditemukan');
        }

        // PENTING: sengaja TIDAK pakai Storage::response()/download().
        // Method bawaan itu mengembalikan StreamedResponse yang mengirim
        // isi file lewat callback fpassthru() saat response benar-benar
        // di-"send()" ke client - prosesnya baru jalan belakangan, di luar
        // request lifecycle biasa. Kalau ada APAPUN di antaranya yang ikut
        // menyentuh output buffer sebelum callback itu selesai (middleware
        // lain, php.ini seperti zlib.output_compression / ob_gzhandler,
        // atau sekadar konfigurasi server tertentu), isi file bisa
        // tercampur/terpotong dan hasil downloadnya jadi rusak - persis
        // gejala yang dialami di sini.
        //
        // Sebagai gantinya, file dibaca PENUH ke memori dulu (aman untuk
        // gambar QRIS yang ukurannya kecil), lalu dikirim sebagai response
        // biasa (bukan streaming). Header di-set SEKALI saja secara
        // eksplisit lewat method ->header(), tidak ada campuran antara
        // parameter $name bawaan Storage dengan header manual seperti
        // sebelumnya - jadi tidak ada ruang untuk Content-Disposition
        // ganda ataupun konflik header lainnya.
        $fileContents = $disk->get($path);

        // PENTING (baru): validasi isi file BENAR-BENAR PNG yang valid
        // sebelum dikirim ke customer, dengan mengecek 8-byte signature
        // PNG (\x89PNG\r\n\x1a\n) dan memastikan GD masih bisa men-decode
        // isinya. Ini menangani kasus file lama yang di-upload SEBELUM
        // normalisasi GD ditambahkan di ProfileController::uploadQris(),
        // yang bisa saja sudah tersimpan dalam kondisi rusak sejak awal -
        // sehingga endpoint ini sebelumnya akan tetap "berhasil" mengirim
        // file walau isinya memang sudah sampah, dan customer baru sadar
        // setelah download. Kalau validasi gagal, kembalikan error yang
        // jelas alih-alih file korup, supaya mitra tahu harus upload ulang.
        $pngSignature = "\x89PNG\r\n\x1a\n";
        $isValidPng = str_starts_with($fileContents, $pngSignature)
            && @imagecreatefromstring($fileContents) !== false;

        if (!$isValidPng) {
            abort(422, 'File QRIS yang tersimpan rusak/tidak valid. Minta mitra upload ulang QRIS-nya lewat halaman "QRIS Saya".');
        }

        // PENTING: nonaktifkan output compression & buffering KHUSUS untuk
        // response ini, tanpa bergantung ke setting global php.ini.
        // Diagnosis sebelumnya (curl -v + DevTools Network) membuktikan
        // file yang diterima client selalu terpotong di tengah jalan saat
        // pakai `php artisan serve` - response tidak pernah punya
        // Content-Length dan menutup koneksi lebih awal (mode
        // close-delimited). Penyebab paling umum untuk pola ini adalah
        // zlib.output_compression aktif di php.ini (PHP mencoba
        // meng-compress body secara transparan, sehingga ukuran final
        // body tidak lagi sama dengan $fileContents mentah) atau extension
        // seperti Xdebug yang ikut membungkus output buffer. Baris di
        // bawah memastikan tidak ada satu pun output buffer aktif yang
        // "menyandera" body sebelum benar-benar dikirim ke client.
        if (function_exists('ini_set')) {
            @ini_set('zlib.output_compression', '0');
        }
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $mimeType = $disk->mimeType($path) ?: 'application/octet-stream';

        return response($fileContents, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Length', (string) strlen($fileContents))
            ->header('Content-Disposition', 'attachment; filename="QRIS-Pembayaran.png"')
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->header('Connection', 'close');
    }
}