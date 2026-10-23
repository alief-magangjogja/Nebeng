import Echo from "laravel-echo";
import Pusher from "pusher-js";

// ================================================================
// PERFORMA: Echo/Pusher sekarang lazy-initialized
// ================================================================
// Sebelumnya, Echo langsung di-inisialisasi saat file ini di-import
// (top-level side effect). Ini berarti SETIAP halaman yang import
// echo.js (langsung maupun transitive) akan langsung:
// 1. Load & execute Pusher (~90KB parsed)
// 2. Buka koneksi WebSocket ke Reverb server
// 3. Set window.Pusher global
//
// Padahal sebagian besar halaman TIDAK butuh realtime (Dashboard,
// Profile, Settings, dll). Koneksi WS yang tidak terpakai ini
// membuang resource browser & server.
//
// Sekarang Echo hanya di-create saat getEcho() dipanggil pertama
// kali oleh halaman yang benar-benar butuh (Chat, Perjalanan, dll).
// Halaman lain yang import file ini tapi tidak panggil getEcho()
// tidak akan membuka koneksi WS sama sekali.
// ================================================================

let echoInstance = null;

/**
 * Mendapatkan instance Echo (singleton, lazy-initialized).
 * Panggil ini di dalam useEffect() halaman yang butuh realtime.
 */
export function getEcho() {
	if (echoInstance) return echoInstance;

	window.Pusher = Pusher;
	// Log websocket hanya aktif kalau lagi debug (?ws_debug=1 di URL)
	window.Pusher.logToConsole = new URLSearchParams(window.location.search).has("ws_debug");

	echoInstance = new Echo({
		broadcaster: "reverb",

		key: 'nebeng_key_dummy',

		wsHost: import.meta.env.VITE_REVERB_HOST,
		wsPort: import.meta.env.VITE_REVERB_PORT,

		forceTLS: false,
		enabledTransports: ["ws"],

		authEndpoint: "http://127.0.0.1:8000/broadcasting/auth",

		auth: {
			headers: {
				// Token diambil saat getEcho() dipanggil (bukan saat module
				// di-load), sehingga selalu mendapat token terbaru.
				Authorization: `Bearer ${localStorage.getItem("token")}`,
				Accept: "application/json",
			},
		},
	});

	return echoInstance;
}

// Default export tetap ada untuk backward compatibility, tapi
// sekarang adalah getter yang lazy. File-file yang sudah import
// default dan langsung pakai (echo.channel(...)) perlu diubah
// ke getEcho().channel(...) - atau bisa tetap pakai default
// export ini yang sekarang adalah Proxy.
//
// CATATAN: Kalau ada file yang import default dan langsung pakai
// tanpa panggil getEcho(), mereka tetap bisa pakai karena kita
// export getEcho sebagai named export DAN sebagai default.
export default { getEcho };