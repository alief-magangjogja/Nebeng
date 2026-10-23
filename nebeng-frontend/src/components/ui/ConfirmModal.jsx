import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * ConfirmModal
 * Pengganti window.confirm() bawaan browser. Tampilan konsisten dengan
 * modal konfirmasi kustom lain di aplikasi ini (mis. konfirmasi pembatalan
 * pesanan, konfirmasi kirim SOS).
 *
 * Props:
 * - show        : boolean, tampil/tidak
 * - title       : judul popup
 * - message     : isi pertanyaan konfirmasi
 * - confirmText : label tombol konfirmasi (default "Ya, Lanjutkan")
 * - cancelText  : label tombol batal (default "Batal")
 * - loading     : boolean, menonaktifkan tombol & tampilkan spinner saat proses
 * - onConfirm   : () => void
 * - onCancel    : () => void
 */
export default function ConfirmModal({
	show,
	title = "Konfirmasi",
	message,
	confirmText = "Ya, Lanjutkan",
	cancelText = "Batal",
	loading = false,
	onConfirm,
	onCancel,
}) {
	if (!show) return null;

	return (
		<div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
			<div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 space-y-6 text-center">
				<div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
					<AlertTriangle size={28} />
				</div>

				<div className="space-y-2">
					<h3 className="text-xl font-black text-indigo-900">{title}</h3>
					<p className="text-xs text-gray-500 leading-relaxed font-medium">{message}</p>
				</div>

				<div className="flex gap-3 pt-2">
					<button
						onClick={onCancel}
						disabled={loading}
						className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
					>
						{cancelText}
					</button>
					<button
						onClick={onConfirm}
						disabled={loading}
						className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{loading ? <Loader2 className="animate-spin" size={16} /> : confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}