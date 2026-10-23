import axios from "axios";

// PENTING: file .env di-gitignore, jadi VITE_API_BASE_URL sering tidak ke-set
// di clone/environment baru. Sebelumnya fallback-nya adalah origin frontend
// sendiri (window.location.origin), yaitu server Vite (http://localhost:5173),
// BUKAN backend Laravel. Akibatnya semua request lewat instance axios ini
// (dipakai di SOS, batalkan pesanan customer, batalkan pesanan mitra, dan
// admin SOS monitor) selalu gagal dengan 404 dari Vite (bukan JSON dari
// Laravel), sehingga error.response.data.message selalu undefined dan yang
// muncul cuma pesan fallback generik di alert(). Fallback sekarang diarahkan
// ke backend Laravel, konsisten dengan seluruh fetch() lain di aplikasi ini.
const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
	withCredentials: true,
	headers: {
		Accept: "application/json",
	},
});

// Aplikasi ini pakai token-based auth (Bearer token dari localStorage),
// bukan cookie/session Sanctum SPA. Sebelumnya instance axios ini tidak
// pernah nempelin token sama sekali ke request manapun - jadi setiap
// endpoint yang butuh login (auth:sanctum), termasuk kirim SOS, selalu
// gagal dengan 401 Unauthorized. Interceptor ini nempelin token secara
// otomatis ke SEMUA request yang lewat instance ini, sama seperti yang
// sudah dilakukan manual di fetch() lain di seluruh aplikasi.
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

export default api;