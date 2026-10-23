import { useNavigate as useRouterNavigate } from "react-router-dom";
import { popAndGetPrevious } from "../utils/navigationStack";

// Pengganti drop-in untuk useNavigate() dari react-router-dom.
//
// Semua pemanggilan navigate("/some/path") atau navigate("/some/path", { replace: true })
// tetap berperilaku PERSIS SAMA seperti sebelumnya - TIDAK ADA yang perlu
// diubah di titik pemanggilannya. HANYA navigate(-1) yang perilakunya
// diganti: alih-alih memanggil window.history.back() bawaan (yang bisa
// "lupa" arah kembali setelah iframe mode-preview-mobile dibuat ulang saat
// refresh - lihat utils/navigationStack.js untuk penjelasan lengkap), dia
// sekarang mengambil tujuan "kembali" dari riwayat navigasi buatan sendiri
// yang tersimpan di sessionStorage, yang tetap utuh walau iframe-nya
// berganti instance.
//
// Cara pakai: cukup ganti baris impor dari
//   import { useNavigate } from "react-router-dom";
// menjadi
//   import useAppNavigate from "../../hooks/useAppNavigate"; // sesuaikan jumlah "../"
// lalu baris
//   const navigate = useNavigate();
// menjadi
//   const navigate = useAppNavigate();
// Baris navigate(...) lain di file yang sama TIDAK perlu diubah sama sekali.
export default function useAppNavigate() {
	const routerNavigate = useRouterNavigate();

	return (to, options) => {
		if (to === -1) {
			const previous = popAndGetPrevious();

			if (previous) {
				routerNavigate(previous, { replace: options?.replace });
				return;
			}

			// Tidak ada riwayat sama sekali (mis. halaman ini dibuka langsung
			// lewat URL/refresh tanpa navigasi apa pun sebelumnya di sesi ini)
			// - fallback ke dashboard sesuai role yang login, daripada diam
			// saja atau nyasar keluar aplikasi.
			const role = localStorage.getItem("role");
			const rolePathMap = {
				admin: "/admin/dashboard",
				customer: "/customer/dashboard",
				mitra: "/mitra/dashboard",
				pos_mitra: "/pos-mitra/dashboard",
			};
			routerNavigate(rolePathMap[role] || "/login", { replace: true });
			return;
		}

		routerNavigate(to, options);
	};
}
