import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Path yang wajib selalu tampil sebagai HP.
const FRAMED_PREFIXES = ["/customer", "/mitra"];

// Breakpoint disamakan dengan "md" Tailwind (768px).
const DESKTOP_BREAKPOINT = 768;

// Ukuran "device" virtual — dipakai untuk perhitungan layout/breakpoint
// halaman di dalam iframe. Rasio 440:892 ≈ rasio HP asli.
const DEVICE_WIDTH = 440;
const DEVICE_HEIGHT = 892;

// Jarak aman dari tepi layar. MARGIN_Y dibuat kecil supaya atas-bawah
// mepet penuh (sesuai request), MARGIN_X sedikit lebih longgar karena
// rasio HP memang lebih tinggi daripada lebar, jadi wajar ada sisa
// ruang di kiri-kanan.
const MARGIN_Y = 16; // total atas + bawah
const MARGIN_X = 40; // total kiri + kanan
const MAX_SCALE = 1.15; // boleh sedikit lebih besar dari ukuran asli
const MIN_SCALE = 0.45;

// Nama pesan untuk komunikasi iframe (dalam) <-> jendela luar. Dipakai
// supaya address bar browser tetap mengikuti navigasi yang terjadi DI
// DALAM iframe - lihat penjelasan panjang di bawah komponen ini.
const NAV_SYNC_MESSAGE = "NEBENG_MOBILE_FRAME_NAV";

function computeScale() {
	if (typeof window === "undefined") return MAX_SCALE;
	const availableWidth = window.innerWidth - MARGIN_X;
	const availableHeight = window.innerHeight - MARGIN_Y;
	const scale = Math.min(availableWidth / DEVICE_WIDTH, availableHeight / DEVICE_HEIGHT, MAX_SCALE);
	return Math.max(scale, MIN_SCALE);
}

// Menyuntikkan CSS kecil ke dalam dokumen iframe supaya scrollbar-nya
// (garis panjang di sisi kanan) tidak kelihatan, tapi scroll tetap
// berfungsi normal (via mouse wheel / drag / trackpad).
function hideIframeScrollbar(iframeEl) {
	try {
		const doc = iframeEl.contentDocument;
		if (!doc) return;
		const style = doc.createElement("style");
		style.setAttribute("data-hide-scrollbar", "true");
		style.textContent = `
			html, body {
				scrollbar-width: none; /* Firefox */
				-ms-overflow-style: none; /* Edge lama */
			}
			html::-webkit-scrollbar, body::-webkit-scrollbar,
			*::-webkit-scrollbar {
				width: 0px;
				height: 0px;
				display: none;
			}
			
			/* Mencegah browser melakukan auto-scroll saat input di-fokus (masalah layout naik) */
			html, body, #root {
				position: fixed !important;
				top: 0 !important;
				left: 0 !important;
				width: 100% !important;
				height: 100% !important;
				overflow: hidden !important;
			}
		`;
		doc.head.appendChild(style);
	} catch (err) {
		// Kalau iframe kebetulan beda origin, abaikan saja (di dev/local ini
		// selalu same-origin jadi normalnya tidak akan masuk sini).
	}
}

export default function MobilePreviewFrame({ children }) {
	const location = useLocation();
	const navigate = useNavigate();

	const [isWideScreen, setIsWideScreen] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= DESKTOP_BREAKPOINT : false));
	const [scale, setScale] = useState(computeScale);

	// Menyimpan lebar window terakhir yang benar-benar dipakai untuk
	// menghitung ulang scale. Kita SENGAJA tidak menghitung ulang scale
	// setiap kali event "resize" terjadi - hanya kalau LEBAR window
	// (bukan tinggi) yang berubah. Ini mencegah "kartu HP" ikut
	// mengecil/bergeser kalau ada resize yang cuma mengubah tinggi (misal
	// browser toolbar/devtools muncul-hilang), yang sebelumnya bisa
	// membuat seluruh isi iframe (termasuk nav di dalamnya) terlihat
	// "ikut naik" walau sebenarnya tidak ada masalah pada layout di
	// dalam iframe itu sendiri.
	const lastWidthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 0);

	const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;

	// ================= SINKRONISASI URL (iframe <-> address bar) =================
	// Arsitektur MobilePreviewFrame ini pada dasarnya membuat DUA instance
	// React terpisah: satu di jendela luar (cuma menampilkan kotak + tag
	// <iframe>), satu lagi di DALAM iframe (ini yang jadi aplikasi
	// sungguhan, lengkap dengan router-nya sendiri). Keduanya adalah
	// browsing context yang terpisah total, jadi kalau user klik nav di
	// DALAM iframe, address bar jendela luar TIDAK otomatis ikut berubah -
	// itulah sebabnya sebelumnya "URL tidak berpindah" dan "refresh balik
	// ke halaman awal" (refresh me-reload jendela luar yang URL-nya belum
	// pernah ter-update).
	//
	// Perbaikannya: pakai postMessage sebagai jembatan.
	// - Instance DI DALAM iframe (isInsideIframe = true) melapor ke induk
	//   setiap kali route-nya berubah.
	// - Instance DI LUAR (isInsideIframe = false) mendengarkan laporan itu
	//   lalu menyamakan address bar-nya lewat navigate(..., {replace:true})
	//   - TANPA mengubah src attribute pada elemen <iframe>, supaya iframe
	//     TIDAK ikut reload ulang (dia kan sudah duluan berada di sana).

	// Menandai: perubahan location berikutnya di jendela luar berasal dari
	// sinkronisasi info dari iframe sendiri (bukan navigasi asli dari
	// luar seperti tombol back/forward atau ubah address bar manual) -
	// jadi TIDAK perlu memperbarui src pada <iframe>.
	const skipNextIframeSrcSync = useRef(false);

	// Ini yang benar-benar dipasang sebagai atribut src iframe. Sengaja
	// TIDAK dihitung ulang langsung dari window.location setiap render -
	// hanya diperbarui lewat efek di bawah, supaya kita bisa memilih kapan
	// boleh/tidak boleh menyuruh iframe pindah alamat.
	const [iframeSrc, setIframeSrc] = useState(() => `${window.location.pathname}${window.location.search}`);

	// (A) DI DALAM iframe: setiap route berubah, lapor ke jendela induk.
	useEffect(() => {
		if (!isInsideIframe) return;
		try {
			window.parent.postMessage(
				{
					type: NAV_SYNC_MESSAGE,
					path: `${location.pathname}${location.search}`,
				},
				window.location.origin
			);
		} catch (err) {
			// Beda origin harusnya tidak pernah terjadi di dev/local, tapi
			// jaga-jaga saja supaya tidak melempar error ke user.
		}
	}, [isInsideIframe, location.pathname, location.search]);

	// (B) DI LUAR: dengarkan laporan dari iframe, sinkronkan address bar.
	useEffect(() => {
		if (isInsideIframe) return;

		const handleMessage = (event) => {
			if (event.origin !== window.location.origin) return;
			if (event.data?.type !== NAV_SYNC_MESSAGE) return;

			const newPath = event.data.path;
			const currentPath = `${window.location.pathname}${window.location.search}`;
			if (!newPath || newPath === currentPath) return;

			// Iframe SUDAH berada di path ini (dia yang lapor) - kita cuma
			// menyamakan address bar, bukan menyuruhnya pindah lagi.
			skipNextIframeSrcSync.current = true;
			navigate(newPath, { replace: true });
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [isInsideIframe, navigate]);

	// (C) DI LUAR: setiap kali location jendela luar berubah (baik dari
	// sinkronisasi (B) di atas, ATAUPUN dari navigasi asli seperti
	// back/forward browser atau ubah address bar manual), putuskan apakah
	// <iframe src=...> perlu diperbarui.
	useEffect(() => {
		if (isInsideIframe) return;

		if (skipNextIframeSrcSync.current) {
			// Berasal dari (B) - iframe sudah di sana, jangan set ulang src
			// (kalau di-set ulang ke path yang attribute-nya belum pernah
			// sama, browser akan mengira ini navigasi baru dan me-reload
			// iframe dari awal, padahal isinya sudah benar).
			skipNextIframeSrcSync.current = false;
			return;
		}

		// Perubahan location ini genuinely dari luar (back/forward, ubah
		// address bar manual, dsb) - arahkan iframe supaya ikut menyesuaikan.
		setIframeSrc(`${location.pathname}${location.search}`);
	}, [location.pathname, location.search, isInsideIframe]);

	useEffect(() => {
		const handleResize = () => {
			const currentWidth = window.innerWidth;
			setIsWideScreen(currentWidth >= DESKTOP_BREAKPOINT);

			if (currentWidth !== lastWidthRef.current) {
				lastWidthRef.current = currentWidth;
				setScale(computeScale());
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const isFramedRoute = FRAMED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
	const shouldShowFrame = isWideScreen && isFramedRoute && !isInsideIframe;

	if (!shouldShowFrame) {
		return children;
	}

	const cardWidth = DEVICE_WIDTH * scale;
	const cardHeight = DEVICE_HEIGHT * scale;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#eef1f6]">
			<div
                className="shrink-0 overflow-hidden rounded-lg bg-white shadow-[0_10px_40px_rgba(15,23,42,0.12)] ring-1 ring-black/5"
                style={{ width: cardWidth, height: cardHeight }}
            >
				<iframe
					title="Nebeng - Mobile Preview"
					src={iframeSrc}
					onLoad={(e) => hideIframeScrollbar(e.currentTarget)}
					style={{
						width: DEVICE_WIDTH,
						height: DEVICE_HEIGHT,
						border: "none",
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				/>
			</div>
		</div>
	);
}