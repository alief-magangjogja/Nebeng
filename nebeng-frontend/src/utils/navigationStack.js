import { useEffect } from "react";

// Riwayat navigasi buatan sendiri, disimpan di sessionStorage - dipakai
// sebagai pengganti riwayat browser bawaan (window.history) untuk tombol
// "kembali" di seluruh aplikasi.
//
// KENAPA INI PERLU:
// Di mode preview mobile (lihat MobilePreviewFrame.jsx), aplikasi yang
// sesungguhnya jalan DI DALAM <iframe>. Setiap kali jendela luar di-refresh
// (F5), iframe itu DIBUAT ULANG DARI NOL - riwayat navigasi browser bawaan
// milik iframe yang lama (mis. Dashboard -> Riwayat -> Pesanan) IKUT HILANG
// begitu saja, walau URL-nya sendiri berhasil dipertahankan (lihat perbaikan
// sebelumnya di MobilePreviewFrame). Akibatnya navigate(-1) yang mengandalkan
// window.history tidak lagi tahu harus kembali ke mana - kalau dipaksa/di-
// spam, dia tembus ke riwayat milik JENDELA LUAR (bisa nyasar keluar app).
//
// sessionStorage TIDAK ikut hilang saat iframe dibuat ulang (dia levelnya
// per-tab, dipakai bersama oleh semua frame origin yang sama di tab itu,
// dan bertahan lewat refresh) - jadi riwayat navigasi yang kita simpan di
// sini tetap utuh walau iframe-nya berganti instance.

const STORAGE_KEY = "nebeng_nav_stack";
const MAX_STACK_LENGTH = 50;

function readStack() {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		return [];
	}
}

function writeStack(stack) {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
	} catch (err) {
		// Abaikan (mis. sessionStorage penuh/dinonaktifkan browser) - tombol
		// kembali akan fallback ke halaman utama, tidak fatal.
	}
}

// Dipanggil setiap kali route berubah (lihat hook useTrackNavigationStack
// di bawah). Path yang PERSIS SAMA dengan entri paling atas tidak didorong
// lagi, supaya re-render tanpa navigasi asli tidak menambah entri duplikat.
export function pushPath(path) {
	const stack = readStack();
	if (stack[stack.length - 1] === path) return;
	stack.push(path);
	if (stack.length > MAX_STACK_LENGTH) stack.shift();
	writeStack(stack);
}

// Buang entri PALING ATAS (posisi saat ini), lalu kembalikan entri sebelum
// itu sebagai tujuan "kembali". Kalau tidak ada lagi, return null - berarti
// tidak ada riwayat sama sekali (mis. halaman ini dibuka langsung dari
// awal), pemanggil (useAppNavigate) akan fallback ke halaman dashboard.
export function popAndGetPrevious() {
	const stack = readStack();
	stack.pop();
	const previous = stack.length > 0 ? stack[stack.length - 1] : null;
	writeStack(stack);
	return previous;
}

// Hook yang otomatis mendorong path saat ini ke stack setiap kali route
// berubah. Dipasang SEKALI di komponen paling atas (AppRouter di
// Router.jsx) supaya berlaku untuk seluruh aplikasi tanpa perlu dipasang
// manual di tiap halaman.
export function useTrackNavigationStack(location) {
	useEffect(() => {
		pushPath(location.pathname + location.search);
	}, [location.pathname, location.search]);
}
