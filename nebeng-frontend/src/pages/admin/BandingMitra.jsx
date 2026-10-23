import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { ShieldAlert, Clock, CheckCircle2, XCircle, Loader2, User, Mail, Phone } from "lucide-react";

const STATUS_BADGE = {
	pending: { label: "Menunggu Ditinjau", className: "bg-amber-100 text-amber-700" },
	approved: { label: "Disetujui", className: "bg-emerald-100 text-emerald-700" },
	rejected: { label: "Ditolak", className: "bg-red-100 text-red-700" },
};

export default function BandingMitra() {
	const [appeals, setAppeals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState("pending"); // pending | all

	// id banding yang sedang diproses (approve/reject) - dipakai untuk
	// menonaktifkan tombol supaya tidak double-submit.
	const [processingId, setProcessingId] = useState(null);

	// id banding yang textarea penolakannya sedang terbuka + isi catatannya.
	const [rejectingId, setRejectingId] = useState(null);
	const [rejectNotes, setRejectNotes] = useState("");

	const fetchAppeals = async () => {
		try {
			const token = localStorage.getItem("token");

			const res = await fetch("http://127.0.0.1:8000/api/admin/appeals", {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			if (res.ok) {
				const data = await res.json();
				setAppeals(Array.isArray(data) ? data : []);
			}
		} catch (err) {
			console.error("Gagal ambil daftar banding:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAppeals();
	}, []);

	const handleApprove = async (appeal) => {
		if (!confirm(`Setujui banding dari ${appeal.user?.name || "mitra ini"}? Akun mitra akan langsung dibuka blokirnya dan seluruh catatan pelanggaran direset.`)) {
			return;
		}

		setProcessingId(appeal.id);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/appeals/${appeal.id}/approve`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const data = await res.json();

			if (res.ok) {
				fetchAppeals();
			} else {
				alert(data.message || "Gagal menyetujui banding.");
			}
		} catch (err) {
			console.error(err);
			alert("Terjadi kesalahan jaringan.");
		} finally {
			setProcessingId(null);
		}
	};

	const openRejectForm = (appeal) => {
		setRejectingId(appeal.id);
		setRejectNotes("");
	};

	const handleReject = async (appealId) => {
		if (rejectNotes.trim().length < 5) {
			alert("Mohon isi alasan penolakan (minimal 5 karakter) supaya mitra tahu alasannya.");
			return;
		}

		setProcessingId(appealId);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/appeals/${appealId}/reject`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ admin_notes: rejectNotes }),
			});

			const data = await res.json();

			if (res.ok) {
				setRejectingId(null);
				setRejectNotes("");
				fetchAppeals();
			} else {
				alert(data.message || "Gagal menolak banding.");
			}
		} catch (err) {
			console.error(err);
			alert("Terjadi kesalahan jaringan.");
		} finally {
			setProcessingId(null);
		}
	};

	const visibleAppeals = filter === "pending" ? appeals.filter((a) => a.status === "pending") : appeals;

	return (
		<AdminLayout>
			<div className="p-6 md:p-8 space-y-6 font-sans max-w-5xl mx-auto">
				<div className="flex items-center gap-4">
					<div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
						<ShieldAlert size={28} />
					</div>
					<div>
						<h1 className="text-2xl font-black text-gray-800 tracking-tight">Banding Mitra</h1>
						<p className="text-xs text-gray-400 font-medium mt-1">Tinjau pengajuan banding dari mitra yang akunnya diblokir.</p>
					</div>
				</div>

				{/* TAB FILTER */}
				<div className="inline-flex bg-gray-100 rounded-2xl p-1.5 gap-1">
					<button
						onClick={() => setFilter("pending")}
						className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
							filter === "pending" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
						}`}
					>
						Menunggu ({appeals.filter((a) => a.status === "pending").length})
					</button>
					<button
						onClick={() => setFilter("all")}
						className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
							filter === "all" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
						}`}
					>
						Semua Riwayat
					</button>
				</div>

				{loading ? (
					<div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
						<Loader2 className="animate-spin text-indigo-900 mb-3" size={32} />
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat data banding...</p>
					</div>
				) : visibleAppeals.length === 0 ? (
					<div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3">
						<div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
							<CheckCircle2 size={32} />
						</div>
						<h3 className="text-lg font-black text-gray-800">{filter === "pending" ? "Tidak ada banding yang menunggu" : "Belum ada riwayat banding"}</h3>
					</div>
				) : (
					<div className="space-y-4">
						{visibleAppeals.map((appeal) => {
							const badge = STATUS_BADGE[appeal.status] || STATUS_BADGE.pending;

							return (
								<div key={appeal.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<h4 className="font-black text-gray-800 text-sm flex items-center gap-2">
												<User size={14} className="text-gray-400" /> {appeal.user?.name || "Mitra"}
											</h4>
											<p className="text-[10px] text-gray-400 font-bold mt-1 flex items-center gap-3">
												<span className="flex items-center gap-1">
													<Mail size={11} /> {appeal.user?.email || "-"}
												</span>
												<span className="flex items-center gap-1">
													<Phone size={11} /> {appeal.user?.phone || "-"}
												</span>
											</p>
										</div>
										<span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shrink-0 ${badge.className}`}>{badge.label}</span>
									</div>

									<div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
										<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alasan Banding</p>
										<p className="text-xs text-gray-700 leading-relaxed">{appeal.reason}</p>
									</div>

									{appeal.admin_notes && (
										<div className={`rounded-2xl p-4 border ${appeal.status === "rejected" ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
											<p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${appeal.status === "rejected" ? "text-red-600" : "text-emerald-600"}`}>Catatan Admin</p>
											<p className={`text-xs ${appeal.status === "rejected" ? "text-red-700" : "text-emerald-700"}`}>{appeal.admin_notes}</p>
										</div>
									)}

									<div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
										<Clock size={12} />
										Diajukan {new Date(appeal.created_at).toLocaleString("id-ID")}
									</div>

									{appeal.status === "pending" && (
										<div className="pt-2 border-t border-gray-100">
											{rejectingId === appeal.id ? (
												<div className="space-y-3">
													<textarea
														rows={3}
														value={rejectNotes}
														onChange={(e) => setRejectNotes(e.target.value)}
														placeholder="Jelaskan alasan penolakan untuk mitra..."
														className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-red-400 transition-all resize-none"
													/>
													<div className="flex gap-2">
														<button
															onClick={() => handleReject(appeal.id)}
															disabled={processingId === appeal.id}
															className="flex-1 py-2.5 px-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
														>
															{processingId === appeal.id ? "Memproses..." : "Kirim Penolakan"}
														</button>
														<button
															onClick={() => setRejectingId(null)}
															disabled={processingId === appeal.id}
															className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all"
														>
															Batal
														</button>
													</div>
												</div>
											) : (
												<div className="flex flex-wrap gap-2">
													<button
														onClick={() => handleApprove(appeal)}
														disabled={processingId === appeal.id}
														className="flex-1 min-w-[120px] py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
													>
														<CheckCircle2 size={14} /> Setujui & Buka Blokir
													</button>
													<button
														onClick={() => openRejectForm(appeal)}
														disabled={processingId === appeal.id}
														className="flex-1 min-w-[100px] py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
													>
														<XCircle size={14} /> Tolak
													</button>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</AdminLayout>
	);
}