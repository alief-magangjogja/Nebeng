import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

/**
 * AlertModal
 * Pengganti window.alert() bawaan browser. Dipakai untuk menampilkan
 * hasil sukses/gagal dari sebuah aksi (mis. batalkan pesanan, kirim SOS,
 * update status), dengan tampilan yang konsisten dengan modal konfirmasi
 * lain di aplikasi ini.
 *
 * Props:
 * - show        : boolean, tampil/tidak
 * - type        : "success" | "error"
 * - title       : judul popup
 * - message     : isi pesan (biasanya langsung dari response backend)
 * - confirmText : label tombol (default "Oke") - isi dengan sesuatu yang
 *                 lebih spesifik ("Mengerti, Tetap di Halaman Ini") supaya
 *                 pengguna tahu apa yang terjadi setelah menekannya
 * - onClose     : () => void
 */
export default function AlertModal({ show, type = "success", title, message, confirmText = "Oke", onClose }) {
	if (!show) return null;

	const isSuccess = type === "success";

	return (
		<div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
			<div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 space-y-6 text-center animate-in zoom-in-95 duration-200">
				<div
					className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-4 ${
						isSuccess ? "bg-emerald-50 text-emerald-500 ring-emerald-50" : "bg-red-50 text-red-500 ring-red-50"
					}`}
				>
					{isSuccess ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
				</div>

				<div className="space-y-2">
					<h3 className={`text-xl font-black ${isSuccess ? "text-indigo-900" : "text-red-600"}`}>
						{title || (isSuccess ? "Berhasil" : "Terjadi Kesalahan")}
					</h3>
					<p className="text-xs text-gray-500 leading-relaxed font-medium">{message}</p>
				</div>

				<button
					onClick={onClose}
					className={`w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] hover:shadow-xl ${
						isSuccess ? "bg-indigo-900 hover:bg-indigo-800 shadow-indigo-100" : "bg-red-600 hover:bg-red-700 shadow-red-100"
					}`}
				>
					{confirmText}
				</button>
			</div>
		</div>
	);
}