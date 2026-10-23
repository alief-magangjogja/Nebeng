import React, { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * SuccessPopup
 * Popup notifikasi sukses (mis. setelah QR berhasil diverifikasi).
 * Tampil di tengah layar, otomatis tertutup setelah beberapa detik,
 * atau bisa ditutup manual.
 *
 * Props:
 * - show        : boolean, tampil/tidak
 * - onClose     : () => void
 * - title       : judul notifikasi
 * - message     : deskripsi singkat
 * - autoCloseMs : durasi sebelum otomatis tertutup (default 4000ms, 0 = tidak auto-close)
 */
export default function SuccessPopup({ show, onClose, title = "Berhasil", message = "", autoCloseMs = 4000 }) {
	useEffect(() => {
		if (!show || !autoCloseMs) return;

		const timer = setTimeout(() => {
			onClose?.();
		}, autoCloseMs);

		return () => clearTimeout(timer);
	}, [show, autoCloseMs, onClose]);

	if (!show) return null;

	return (
		<div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
			<div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative text-center animate-in fade-in zoom-in duration-300">
				<button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center text-gray-500">
					<X size={16} />
				</button>

				<div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
					<CheckCircle2 size={44} strokeWidth={2.2} />
				</div>

				<h2 className="text-xl font-black text-gray-800 mb-2">{title}</h2>
				<p className="text-sm text-gray-500 leading-relaxed">{message}</p>

				<button
					onClick={onClose}
					className="mt-8 w-full py-4 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98]"
				>
					Oke
				</button>
			</div>
		</div>
	);
}