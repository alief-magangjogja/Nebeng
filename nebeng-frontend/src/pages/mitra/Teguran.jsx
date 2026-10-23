import React, { useEffect, useState } from "react";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, AlertTriangle, ShieldAlert, Loader2, Clock, Timer, XCircle, MessageSquareWarning } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

// Label & ikon untuk tiap jenis pelanggaran di log terpadu mitra_violations.
const VIOLATION_TYPE_INFO = {
	keterlambatan: { label: "Keterlambatan Berangkat", icon: Timer },
	pembatalan_mendadak: { label: "Pembatalan Mendadak", icon: XCircle },
	komplain: { label: "Teguran Komplain Customer", icon: MessageSquareWarning },
};

export default function Teguran() {
	const navigate = useNavigate();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchWarnings = async () => {
			try {
				const res = await axios.get("/mitra/teguran");
				setData(res.data);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchWarnings();
	}, []);

	const count = data?.warning_count || 0;
	const max = data?.warning_max || 5;
	const remaining = Math.max(0, max - count);

	// Sekarang HANYA ada 1 sumber hitungan (strike keterlambatan +
	// pembatalan mendadak + teguran komplain digabung jadi satu angka
	// yang sama, users.mitra_strike_count) - jadi kalau akun diblokir
	// gara-gara mencapai batas ini, count pasti sudah >= max. Satu-satunya
	// kemungkinan "diblokir tapi count < max" yang tersisa adalah kalau
	// admin blokir manual langsung (tombol "Blokir Mitra"), tanpa lewat
	// pelanggaran sama sekali.
	const blockedDueToViolations = count >= max;

	return (
		<MitraLayout>
			<div className="w-full max-w-screen-md mx-auto px-4 py-6 pb-24">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Teguran</h1>
				</div>

				{loading ? (
					<div className="py-20 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
						<Loader2 size={40} className="mx-auto text-indigo-300 animate-spin mb-4" />
						<p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Memuat data teguran...</p>
					</div>
				) : (
					<div className="space-y-6">
						{/* RINGKASAN POIN TEGURAN */}
						<div
							className={`rounded-[32px] p-8 shadow-sm border-2 ${
								blockedDueToViolations
									? "bg-red-50 border-red-200"
									: count === 0
									? "bg-emerald-50 border-emerald-100"
									: "bg-amber-50 border-amber-200"
							}`}
						>
							<div className="flex items-center gap-4">
								<div
									className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
										blockedDueToViolations ? "bg-red-100 text-red-600" : count === 0 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
									}`}
								>
									{blockedDueToViolations ? <ShieldAlert size={28} /> : <AlertTriangle size={28} />}
								</div>
								<div>
									<p className="text-xs font-black uppercase tracking-widest text-gray-500">Total Pelanggaran Diterima</p>
									<h2 className="text-3xl font-black text-gray-800 tracking-tighter">
										{count} <span className="text-lg text-gray-400">/ {max}</span>
									</h2>
								</div>
							</div>

							<p className="text-xs font-bold mt-4 leading-relaxed text-gray-600">
								{blockedDueToViolations
									? "Akun Anda saat ini disuspend karena sudah mencapai batas maksimal pelanggaran (keterlambatan, pembatalan mendadak, dan/atau teguran komplain). Buka halaman Beranda untuk mengajukan banding."
									: data?.is_blocked
									? "Akun Anda saat ini diblokir langsung oleh admin, bukan dari pelanggaran otomatis di halaman ini. Buka halaman Beranda untuk melihat detail dan mengajukan banding."
									: count === 0
									? "Anda belum pernah mendapat pelanggaran. Pertahankan performa baik Anda!"
									: `Sisa ${remaining} pelanggaran lagi sebelum akun Anda otomatis disuspend. Ini termasuk keterlambatan berangkat, pembatalan mendadak, maupun teguran komplain customer.`}
							</p>
						</div>

						{/* DAFTAR RIWAYAT PELANGGARAN */}
						<div className="space-y-3">
							<h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Riwayat Pelanggaran</h3>

							{data?.warnings?.length > 0 ? (
								data.warnings.map((w) => {
									const typeInfo = VIOLATION_TYPE_INFO[w.type] || { label: "Pelanggaran", icon: AlertTriangle };
									const TypeIcon = typeInfo.icon;

									return (
										<div key={w.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-2">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
													<TypeIcon size={12} />
													{typeInfo.label}
												</div>
												<div className="flex items-center gap-2 text-[11px] text-gray-400 font-bold">
													<Clock size={12} />
													{new Date(w.warned_at).toLocaleDateString("id-ID", {
														day: "2-digit",
														month: "long",
														year: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</div>
											</div>
											<p className="text-sm text-gray-700 font-medium leading-relaxed">{w.reason || "Tidak ada catatan detail."}</p>
										</div>
									);
								})
							) : (
								<div className="py-16 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
									<p className="text-sm font-bold text-gray-400">Belum ada riwayat pelanggaran.</p>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</MitraLayout>
	);
}