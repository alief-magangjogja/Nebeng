import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { RefreshCcw, Clock, CheckCircle2, MessageSquareWarning, ShieldOff, BadgeCheck, Loader2, Wallet, Eye, ImageOff, ShieldAlert, XCircle } from "lucide-react";
import axios from "../../api/axios";
import ConfirmModal from "../../components/ui/ConfirmModal";
import AlertModal from "../../components/ui/AlertModal";

const COMPLAINT_STATUS_BADGE = {
	pending: { label: "Menunggu Ditinjau", className: "bg-amber-100 text-amber-700" },
	reviewed: { label: "Sudah Ditegur", className: "bg-indigo-100 text-indigo-700" },
	resolved: { label: "Selesai", className: "bg-emerald-100 text-emerald-700" },
};

const REFUND_STATUS_BADGE = {
	pending_100_percent: { label: "Menunggu Mitra (100%)", className: "bg-amber-100 text-amber-700" },
	pending_50_percent: { label: "Menunggu Mitra (50%)", className: "bg-amber-100 text-amber-700" },
	mitra_claimed: { label: "Diklaim Mitra, Tunggu Customer", className: "bg-indigo-100 text-indigo-700" },
	disputed: { label: "Disengketakan", className: "bg-red-100 text-red-700" },
};

export default function Refund() {
	const [tab, setTab] = useState("overview"); // overview | complaints

	const [refunds, setRefunds] = useState([]);
	const [loadingRefunds, setLoadingRefunds] = useState(true);

	const [complaints, setComplaints] = useState([]);
	const [loadingComplaints, setLoadingComplaints] = useState(true);

	// action yang mau dijalankan: { id, action, title, message, confirmText } - dipakai untuk ConfirmModal
	const [pendingAction, setPendingAction] = useState(null);
	const [processing, setProcessing] = useState(false);
	const [alertInfo, setAlertInfo] = useState({ show: false, type: "success", title: "", message: "" });

	// --- State Modal "Tolak Laporan" (reject_complaint) ---
	// Aksi ini WAJIB disertai alasan tertulis (admin_notes), beda dari 3
	// aksi lain yang bisa langsung konfirmasi tanpa isi apa pun - jadi
	// dipakai modal terpisah dengan textarea, bukan ConfirmModal biasa.
	const [rejectTarget, setRejectTarget] = useState(null); // complaint object yang mau ditolak laporannya
	const [rejectNotes, setRejectNotes] = useState("");
	const [processingReject, setProcessingReject] = useState(false);

	const fetchRefunds = async () => {
		try {
			const res = await axios.get("/admin/refunds");
			setRefunds(res.data);
		} catch (err) {
			console.error("Gagal mengambil data pantauan refund:", err);
		} finally {
			setLoadingRefunds(false);
		}
	};

	const fetchComplaints = async () => {
		try {
			const res = await axios.get("/admin/complaints");
			setComplaints(res.data);
		} catch (err) {
			console.error("Gagal mengambil data laporan:", err);
		} finally {
			setLoadingComplaints(false);
		}
	};

	useEffect(() => {
		fetchRefunds();
		fetchComplaints();
	}, []);

	// Tombol "Blokir Mitra" dan "Refund Selesai" pesannya tetap statis -
	// hanya "Tegur" yang butuh pesan dinamis (tergantung berapa
	// pelanggaran gabungan - strike + teguran - yang sudah diterima
	// mitra tersebut sebelumnya).
	const openWarnConfirm = (complaint) => {
		const count = complaint.mitra_warning_count ?? 0;
		const max = complaint.mitra_warning_max ?? 5;
		const willAutoBlock = count + 1 >= max;

		setPendingAction({
			id: complaint.id,
			action: "warn",
			title: "Tegur Mitra",
			message: willAutoBlock
				? `Mitra ini sudah menerima ${count} dari ${max} pelanggaran (gabungan strike & teguran). Teguran ke-${count + 1} ini akan membuat akun mitra OTOMATIS DISUSPEND karena mencapai batas maksimal. Lanjutkan?`
				: `Mitra ini sudah menerima ${count} dari ${max} pelanggaran (gabungan strike & teguran). Kirim teguran resmi ke-${count + 1} kepada mitra terkait laporan ini?`,
			confirmText: willAutoBlock ? "Ya, Tegur & Suspend" : "Ya, Tegur Mitra",
		});
	};

	const openBlockConfirm = (complaint) => {
		setPendingAction({
			id: complaint.id,
			action: "block_mitra",
			title: "Blokir Mitra",
			message: "Mitra akan langsung diblokir dan tidak bisa login. Lanjutkan?",
			confirmText: "Ya, Blokir Mitra",
		});
	};

	const openRefundDoneConfirm = (complaint) => {
		setPendingAction({
			id: complaint.id,
			action: "mark_refund_done",
			title: "Tandai Refund Selesai",
			message: "Tandai bahwa dana sudah dikembalikan ke customer?",
			confirmText: "Ya, Tandai Selesai",
		});
	};

	// Buka modal "Tolak Laporan" - beda alur dari 3 aksi di atas karena
	// butuh input alasan (admin_notes wajib diisi di backend).
	const openRejectModal = (complaint) => {
		setRejectTarget(complaint);
		setRejectNotes("");
	};

	const closeRejectModal = () => {
		setRejectTarget(null);
		setRejectNotes("");
	};

	const handleConfirmAction = async () => {
		if (!pendingAction) return;
		try {
			setProcessing(true);
			const res = await axios.post(`/admin/complaints/${pendingAction.id}/action`, {
				action: pendingAction.action,
			});
			setPendingAction(null);
			setAlertInfo({ show: true, type: "success", title: "Berhasil", message: res.data.message });
			fetchComplaints();
			fetchRefunds();
		} catch (err) {
			setPendingAction(null);
			setAlertInfo({
				show: true,
				type: "error",
				title: "Gagal",
				message: err.response?.data?.message || "Terjadi kesalahan saat memproses tindakan.",
			});
		} finally {
			setProcessing(false);
		}
	};

	// Kirim aksi "reject_complaint" - alasan (admin_notes) WAJIB diisi,
	// divalidasi juga di backend sebagai pengaman kedua.
	const handleConfirmReject = async () => {
		if (!rejectTarget) return;

		if (rejectNotes.trim().length < 5) {
			setAlertInfo({
				show: true,
				type: "error",
				title: "Alasan Belum Diisi",
				message: "Jelaskan alasan penolakan laporan ini (mis. bukti mutasi rekening tidak valid/direkayasa), minimal 5 karakter.",
			});
			return;
		}

		try {
			setProcessingReject(true);
			const res = await axios.post(`/admin/complaints/${rejectTarget.id}/action`, {
				action: "reject_complaint",
				admin_notes: rejectNotes,
			});
			closeRejectModal();
			setAlertInfo({ show: true, type: "success", title: "Laporan Ditolak", message: res.data.message });
			fetchComplaints();
			fetchRefunds();
		} catch (err) {
			closeRejectModal();
			setAlertInfo({
				show: true,
				type: "error",
				title: "Gagal",
				message: err.response?.data?.message || "Terjadi kesalahan saat menolak laporan.",
			});
		} finally {
			setProcessingReject(false);
		}
	};

	return (
		<AdminLayout>
			<div className="p-6 md:p-8 space-y-6 font-sans max-w-7xl mx-auto">
				<div className="flex items-center gap-4">
					<div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
						<RefreshCcw size={28} />
					</div>
					<div>
						<h1 className="text-2xl font-black text-gray-800 tracking-tight">Refund & Komplain Mitra</h1>
						<p className="text-xs text-gray-400 font-medium mt-1">Pantauan transparan status refund QRIS antara customer dan mitra.</p>
					</div>
				</div>

				{/* TAB SWITCHER */}
				<div className="inline-flex bg-gray-100 rounded-2xl p-1.5 gap-1">
					<button
						onClick={() => setTab("overview")}
						className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
							tab === "overview" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
						}`}
					>
						<Eye size={14} /> Pantauan Refund
					</button>
					<button
						onClick={() => setTab("complaints")}
						className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
							tab === "complaints" ? "bg-white text-indigo-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
						}`}
					>
						<MessageSquareWarning size={14} /> Laporan Komplain
						{complaints.filter((c) => c.status === "pending").length > 0 && (
							<span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{complaints.filter((c) => c.status === "pending").length}</span>
						)}
					</button>
				</div>

				{/* ================= TAB: PANTAUAN REFUND (transparan, tanpa perlu laporan formal) ================= */}
				{tab === "overview" &&
					(loadingRefunds ? (
						<div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
							<Loader2 className="animate-spin text-indigo-900 mb-3" size={32} />
							<p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat data refund...</p>
						</div>
					) : refunds.length === 0 ? (
						<div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3">
							<div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
								<CheckCircle2 size={32} />
							</div>
							<h3 className="text-lg font-black text-gray-800">Tidak ada refund yang sedang berjalan</h3>
							<p className="text-xs text-gray-400 max-w-sm">Semua pembatalan QRIS sudah tuntas atau memang tidak berhak refund.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{refunds.map((o) => {
								const badge = REFUND_STATUS_BADGE[o.refund_status] || { label: o.refund_status, className: "bg-gray-100 text-gray-600" };
								return (
									<div key={o.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<h4 className="font-black text-gray-800 text-sm">Order #{o.id}</h4>
												<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
													{o.customer?.name || "-"} vs {o.trip?.mitra?.name || "-"}
												</p>
											</div>
											<span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0 whitespace-nowrap ${badge.className}`}>{badge.label}</span>
										</div>

										<div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
											<Wallet size={16} className="text-gray-400 shrink-0" />
											<span className="text-sm font-black text-gray-800">Rp {Number(o.refund_amount).toLocaleString("id-ID")}</span>
										</div>

										<div className="grid grid-cols-2 gap-4 text-xs">
											<div>
												<p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Rekening Tujuan</p>
												<p className="text-gray-700 font-bold break-words">{o.refund_destination || <span className="text-gray-300 italic font-normal">Belum diisi</span>}</p>
											</div>
											<div>
												<p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">No. Referensi</p>
												<p className="text-gray-700 font-mono font-bold break-all">{o.refund_reference || "-"}</p>
											</div>
											<div>
												<p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Mitra Klaim Transfer</p>
												<p className="text-gray-500">{o.mitra_refund_confirmed_at ? new Date(o.mitra_refund_confirmed_at).toLocaleString("id-ID") : "-"}</p>
											</div>
											<div>
												<p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Dibatalkan</p>
												<p className="text-gray-500">{o.cancelled_at ? new Date(o.cancelled_at).toLocaleString("id-ID") : "-"}</p>
											</div>
										</div>

										<div>
											<p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Bukti Transfer</p>
											{o.refund_proof ? (
												<a href={`http://127.0.0.1:8000/storage/${o.refund_proof}`} target="_blank" rel="noopener noreferrer">
													<img
														src={`http://127.0.0.1:8000/storage/${o.refund_proof}`}
														alt="Bukti transfer"
														className="w-full max-h-40 object-contain rounded-xl border border-gray-100 bg-gray-50 hover:opacity-80 transition-opacity"
													/>
												</a>
											) : (
												<span className="flex items-center gap-1.5 text-gray-300 text-[10px] font-bold uppercase">
													<ImageOff size={14} /> Belum Ada
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					))}

				{/* ================= TAB: LAPORAN KOMPLAIN (butuh tindakan admin) ================= */}
				{tab === "complaints" &&
					(loadingComplaints ? (
						<div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
							<Loader2 className="animate-spin text-indigo-900 mb-3" size={32} />
							<p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat laporan...</p>
						</div>
					) : complaints.length === 0 ? (
						<div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3">
							<div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
								<CheckCircle2 size={32} />
							</div>
							<h3 className="text-lg font-black text-gray-800">Belum ada laporan masuk</h3>
							<p className="text-xs text-gray-400 max-w-sm">Semua refund QRIS berjalan lancar tanpa keluhan dari customer.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{complaints.map((c) => {
								const badge = COMPLAINT_STATUS_BADGE[c.status] || COMPLAINT_STATUS_BADGE.pending;
								const isResolved = c.status === "resolved";
								const warningCount = c.mitra_warning_count ?? 0;
								const warningMax = c.mitra_warning_max ?? 5;
								const mitraAtMaxWarnings = warningCount >= warningMax;

								return (
									<div key={c.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<h4 className="font-black text-gray-800 text-sm">Order #{c.order_id}</h4>
												<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
													{c.customer?.name || "Customer"} vs {c.mitra?.name || "Mitra"}
												</p>
											</div>
											<span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shrink-0 ${badge.className}`}>{badge.label}</span>
										</div>

										{/* RIWAYAT PELANGGARAN MITRA (gabungan strike + teguran) - supaya
										    admin tahu seberapa dekat mitra ini ke suspend otomatis */}
										{c.mitra && (
											<div
												className={`flex items-center gap-2 rounded-2xl p-3 border ${
													mitraAtMaxWarnings ? "bg-red-50 border-red-100" : warningCount > 0 ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
												}`}
											>
												<ShieldAlert size={14} className={mitraAtMaxWarnings ? "text-red-500" : warningCount > 0 ? "text-amber-500" : "text-gray-400"} />
												<p className={`text-[11px] font-bold ${mitraAtMaxWarnings ? "text-red-600" : warningCount > 0 ? "text-amber-700" : "text-gray-500"}`}>
													Riwayat Pelanggaran Mitra: {warningCount}/{warningMax}
													{mitraAtMaxWarnings && " - sudah mencapai batas maksimal"}
												</p>
											</div>
										)}

										<div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
											<p className="text-xs text-gray-600 leading-relaxed">{c.description}</p>
										</div>

										{/* BUKTI PENDUKUNG CUSTOMER - supaya laporan tidak cuma
										    klaim sepihak. Absennya bukti di sini juga sinyal
										    penting: kalau mitra sudah klaim transfer (kotak biru di
										    bawah) tapi customer TIDAK melampirkan bukti apa pun,
										    itu layak dipertimbangkan saat menilai kredibilitas
										    laporan. */}
										<div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-2">
											<p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Bukti Pendukung dari Customer</p>
											{c.customer_proof ? (
												<a href={`http://127.0.0.1:8000/storage/${c.customer_proof}`} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-amber-200">
													<img src={`http://127.0.0.1:8000/storage/${c.customer_proof}`} alt="Bukti pendukung dari customer" className="w-full max-h-48 object-contain bg-white" />
												</a>
											) : (
												<p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
													<ImageOff size={12} /> Customer tidak melampirkan bukti apa pun
												</p>
											)}
										</div>

										{/* JEJAK KLAIM MITRA - penting untuk kasus rawan konflik */}
										{c.order?.mitra_refund_confirmed_at && (
											<div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 space-y-3">
												<div>
													<p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Mitra Klaim Sudah Transfer</p>
													<p className="text-xs text-indigo-800">{new Date(c.order.mitra_refund_confirmed_at).toLocaleString("id-ID")}</p>
												</div>
												{c.order?.refund_destination && (
													<p className="text-[11px] text-indigo-700">
														Ke rekening: <span className="font-bold">{c.order.refund_destination}</span>
													</p>
												)}
												{c.order?.refund_reference && (
													<p className="text-[11px] text-indigo-700">
														No. Referensi: <span className="font-bold font-mono">{c.order.refund_reference}</span> - cocokkan dengan mutasi rekening mitra kalau perlu.
													</p>
												)}
												{c.order?.refund_proof ? (
													<a href={`http://127.0.0.1:8000/storage/${c.order.refund_proof}`} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-indigo-100">
														<img src={`http://127.0.0.1:8000/storage/${c.order.refund_proof}`} alt="Bukti transfer dari mitra" className="w-full max-h-48 object-contain bg-white" />
													</a>
												) : (
													<p className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
														<ImageOff size={12} /> Mitra belum melampirkan bukti transfer
													</p>
												)}
											</div>
										)}

										{c.admin_notes && (
											<div className={`rounded-2xl p-4 border ${c.status === "rejected" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
												<p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Catatan Admin</p>
												<p className="text-xs text-amber-800">{c.admin_notes}</p>
											</div>
										)}

										<div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
											<Clock size={12} />
											Dilaporkan {new Date(c.created_at).toLocaleString("id-ID")}
										</div>

										{!isResolved && (
											<div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
												<button
													onClick={() => openWarnConfirm(c)}
													disabled={mitraAtMaxWarnings}
													title={mitraAtMaxWarnings ? "Mitra sudah mencapai batas maksimal pelanggaran - gunakan Blokir Mitra" : ""}
													className="flex-1 min-w-[100px] py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-50"
												>
													<MessageSquareWarning size={14} /> Tegur
												</button>
												<button
													onClick={() => openBlockConfirm(c)}
													className="flex-1 min-w-[100px] py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
												>
													<ShieldOff size={14} /> Blokir Mitra
												</button>
												<button
													onClick={() => openRefundDoneConfirm(c)}
													className="flex-1 min-w-[100px] py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
												>
													<BadgeCheck size={14} /> Refund Selesai
												</button>
												{/* TOLAK LAPORAN - untuk kasus customer diduga curang
												    (mis. upload bukti palsu/tidak relevan). Efeknya:
												    order dikembalikan ke status mitra_claimed (klaim
												    mitra dianggap sah, mitra TIDAK kena penalti), dan
												    customer dapat strike (customer_strike_count) yang
												    bisa berujung suspend otomatis kalau berulang. */}
												<button
													onClick={() => openRejectModal(c)}
													className="flex-1 min-w-[100px] py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-center text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
												>
													<XCircle size={14} /> Tolak Laporan
												</button>
											</div>
										)}
									</div>
								);
							})}
						</div>
					))}
			</div>

			<ConfirmModal
				show={!!pendingAction}
				title={pendingAction?.title || ""}
				message={pendingAction?.message || ""}
				confirmText={pendingAction?.confirmText || ""}
				loading={processing}
				onConfirm={handleConfirmAction}
				onCancel={() => setPendingAction(null)}
			/>

			{/* MODAL TOLAK LAPORAN - butuh textarea alasan, jadi custom (bukan ConfirmModal biasa) */}
			{rejectTarget && (
				<div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-white rounded-[2rem] p-7 w-full max-w-md shadow-2xl border border-gray-100 space-y-5">
						<div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center mx-auto">
							<XCircle size={28} />
						</div>

						<div className="text-center space-y-1.5">
							<h3 className="text-lg font-black text-gray-800">Tolak Laporan Customer</h3>
							<p className="text-xs text-gray-500 leading-relaxed">
								Order #{rejectTarget.order_id} - klaim transfer mitra akan dianggap SAH (status kembali ke "Diklaim Mitra, Tunggu Customer"), mitra TIDAK kena penalti. Customer akan mendapat strike pelanggaran.
							</p>
						</div>

						<div className="text-left space-y-1.5">
							<label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
								Alasan Penolakan (wajib diisi, akan dikirim ke customer)
							</label>
							<textarea
								value={rejectNotes}
								onChange={(e) => setRejectNotes(e.target.value)}
								rows={3}
								placeholder="Contoh: Bukti mutasi rekening yang dilampirkan tidak relevan / tidak menunjukkan data yang valid."
								className="w-full text-xs rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-gray-300"
							/>
						</div>

						<div className="flex gap-3 pt-1">
							<button
								onClick={closeRejectModal}
								disabled={processingReject}
								className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
							>
								Batal
							</button>
							<button
								onClick={handleConfirmReject}
								disabled={processingReject}
								className="flex-1 py-3 rounded-2xl bg-gray-700 hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{processingReject ? <Loader2 className="animate-spin" size={16} /> : "Ya, Tolak Laporan"}
							</button>
						</div>
					</div>
				</div>
			)}

			<AlertModal show={alertInfo.show} type={alertInfo.type} title={alertInfo.title} message={alertInfo.message} onClose={() => setAlertInfo((prev) => ({ ...prev, show: false }))} />
		</AdminLayout>
	);
}