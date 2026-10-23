import React from "react";
import MitraLayout from "../../components/dashboard/MitraLayout";
import {
	ChevronLeft,
	MessageSquare,
	User,
	Phone,
	Package,
	ReceiptText,
	Info,
	ArrowRight,
	Navigation,
	Trash2,
	Wallet,
	UploadCloud,
	CheckCircle2,
	AlertTriangle,
	Star,
} from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import SuccessPopup from "../../components/ui/SuccessPopup";
import ConfirmModal from "../../components/ui/ConfirmModal";
import AlertModal from "../../components/ui/AlertModal";
import axios from "../../api/axios";

// Helper: return tailwind classes for status badge color
function getStatusColor(status) {
	if (!status) return "bg-gray-50 text-gray-400";
	const s = String(status).toLowerCase();
	if (s.includes("selesai") || s.includes("completed") || s.includes("done")) return "bg-emerald-50 text-emerald-500";
	if (s.includes("menunggu") || s.includes("pending") || s.includes("waiting")) return "bg-amber-50 text-amber-500";
	if (s.includes("batal") || s.includes("cancel") || s.includes("rejected")) return "bg-rose-50 text-rose-500";
	if (s.includes("konfirmasi") || s.includes("confirmed") || s.includes("accepted")) return "bg-indigo-50 text-indigo-600";
	return "bg-gray-50 text-gray-500";
}

// Label refund per order (dipakai di panel refund bawah tiap customer)
const REFUND_BADGE = {
	pending_100_percent: { text: "Menunggu Anda Transfer", className: "bg-amber-50 text-amber-600 border-amber-200" },
	pending_50_percent: { text: "Menunggu Anda Transfer", className: "bg-amber-50 text-amber-600 border-amber-200" },
	mitra_claimed: { text: "Menunggu Konfirmasi Customer", className: "bg-indigo-50 text-indigo-600 border-indigo-200" },
	disputed: { text: "Disengketakan - Ditinjau Admin", className: "bg-red-50 text-red-600 border-red-200" },
	refunded: { text: "Refund Selesai", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

// Sama seperti daftar opsi kapasitas di form "Tambah Nebeng Barang"
// (NebengBarang.jsx) - dipakai supaya value mentah (xxs/xs/S/...)
// ditampilkan sebagai label yang enak dibaca, bukan kode singkatnya.
const baggageCapacityLabels = {
	XS: "XS - Maksimal 0.5 Kg",
	S: "S - Maksimal 1 Kg",
	M: "M - Maksimal 5 Kg",
	L: "L - Maksimal 10 Kg",
	XL: "XL - Maksimal 15 Kg",
};

function formatBaggageCapacity(value) {
	if (!value) return "-";
	return baggageCapacityLabels[value] || String(value);
}

// Helper: format datetime API (mis. "2026-09-17T15:10:00.000000Z") jadi jam lokal "15:10"
function formatJam(dateStr) {
	if (!dateStr) return null;

	try {
		return new Date(dateStr).toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch (err) {
		return null;
	}
}

// Badge kecil untuk menampilkan status "sudah terverifikasi jam X" vs "masih menunggu" -
// dipakai sama persis dengan panel di halaman Detail Aktivitas Pos Mitra, supaya kedua
// sisi (mitra & pos mitra) melihat status verifikasi yang identik.
function VerifBadge({ label, done, time, doneText, waitingText }) {
	return (
		<div className="flex items-center justify-between gap-3 text-[11px] py-1.5">
			<span className="font-bold text-gray-500">{label}</span>

			<span className={`font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${done ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
				{done ? `${doneText}${time ? ` • ${time}` : ""}` : waitingText}
			</span>
		</div>
	);
}

// Gabungkan nama kota + nama pos supaya tidak cuma "Yogyakarta - Yogyakarta",
// tapi "Yogyakarta - Pos 1" (jelas pos spesifik mana yang dimaksud).
function formatPointLabel(point) {
	if (!point) return "-";
	const cityName = point.city?.name || "-";
	return point.pos_name ? `${cityName} - ${point.pos_name}` : cityName;
}

export default function DetailTebenganMitra() {
	const navigate = useAppNavigate();
	const { tripId } = useParams();

	const [trip, setTrip] = useState(null);
	const [loading, setLoading] = useState(true);

	const [qrData, setQrData] = useState(null);
	const [showQR, setShowQR] = useState(false);
	const [justCompleted, setJustCompleted] = useState(false);

	// ================= HAPUS TRIP =================
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [alertInfo, setAlertInfo] = useState({ show: false, type: "success", title: "", message: "" });

	// ================= KONFIRMASI TRANSFER REFUND (+ upload bukti) =================
	const [refundModal, setRefundModal] = useState(null); // { orderId, customerName, refundAmount }
	const [refundProofFile, setRefundProofFile] = useState(null);
	const [refundProofPreview, setRefundProofPreview] = useState(null);
	const [refundReferenceInput, setRefundReferenceInput] = useState("");
	const [processingRefund, setProcessingRefund] = useState(false);

	// ================= RATING CUSTOMER (untuk badge + link ke profil) =================
	// Key: customer id -> { avg, count }. Pakai ref (bukan cuma cek state)
	// untuk melacak id yang sudah pernah di-fetch, supaya polling fetchTrip
	// tiap 4 detik TIDAK bikin request rating berulang-ulang ke customer
	// yang sama setiap kali trip di-refresh.
	const [customerRatings, setCustomerRatings] = useState({});
	const fetchedCustomerRatingsRef = useRef(new Set());

	const fetchTrip = useCallback(async () => {
		try {
			const res = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}`);
			const data = await res.json();

			console.log("DATA TRIP:", data);
			setTrip(data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [tripId]);

	useEffect(() => {
		fetchTrip();

		// Auto-refresh berkala supaya status trip (mis. setelah QR di-scan Pos Mitra,
		// atau customer sudah konfirmasi terima refund) selalu terkini tanpa
		// perlu reload manual.
		const interval = setInterval(fetchTrip, 4000);

		return () => clearInterval(interval);
	}, [fetchTrip]);

	// Saat QR kedatangan sedang ditampilkan, begitu status trip berubah jadi
	// "completed" (artinya sudah berhasil di-scan Pos Mitra), tutup modal QR
	// otomatis dan tampilkan notifikasi berhasil.
	useEffect(() => {
		if (showQR && trip?.status === "completed") {
			setShowQR(false);
			setJustCompleted(true);
		}
	}, [trip?.status, showQR]);

	// Ambil rating tiap customer yang order di trip ini, sekali per id saja
	// (lihat fetchedCustomerRatingsRef di atas).
	useEffect(() => {
		if (!trip?.orders?.length) return;

		const uniqueCustomerIds = [...new Set(trip.orders.map((o) => o.user?.id).filter(Boolean))];

		uniqueCustomerIds.forEach(async (id) => {
			if (fetchedCustomerRatingsRef.current.has(id)) return;
			fetchedCustomerRatingsRef.current.add(id);

			try {
				const res = await axios.get(`/customers/${id}/reputation`);
				setCustomerRatings((prev) => ({
					...prev,
					[id]: { avg: res.data.average_rating, count: res.data.total_reviews },
				}));
			} catch (err) {
				console.error("Gagal mengambil rating customer:", err);
				fetchedCustomerRatingsRef.current.delete(id); // supaya bisa dicoba lagi
			}
		});
	}, [trip]);

	if (loading) {
		return (
			<MitraLayout>
				<div className="p-10 text-center">Loading...</div>
			</MitraLayout>
		);
	}

	if (!trip) {
		return (
			<MitraLayout>
				<div className="p-10 text-center">Trip tidak ditemukan</div>
			</MitraLayout>
		);
	}

	// Trip barang (dikirim lewat Motor/Mobil/Bus khusus barang) tidak punya
	// konsep "kursi" - yang relevan adalah kapasitas muatannya.
	const isBarang = trip.vehicle_type?.includes("Barang");

	// Pisahkan order penumpang (check-in di pos asal, dilacak level trip
	// untuk kedatangan) vs order barang (dikonfirmasi sampai per-item di
	// pos tujuan) - dipakai panel verifikasi real-time di bawah.
	const allOrders = trip.orders || [];
	const passengerOrders = allOrders.filter((o) => !o.item_order_id);
	const itemOrders = allOrders.filter((o) => o.item_order_id);

	const handleGenerateQR = async () => {
		try {
			const token = localStorage.getItem("token");

			const response = await fetch(`http://127.0.0.1:8000/api/mitra/trips/${tripId}/generate-qr`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const data = await response.json();
			console.log(data);

			setQrData(data);
			setShowQR(true);
		} catch (error) {
			console.error(error);
		}
	};

	// ================= HAPUS TRIP =================
	// Sudah ada customer -> semua order dibatalkan dengan refund PENUH oleh
	// backend, dan trip akan mengambang di status "Menunggu Refund" (bukan
	// langsung "Dibatalkan") kalau masih ada order QRIS yang perlu direfund.
	// Setelah dihapus, panel refund di bawah (per customer) yang dipakai
	// untuk menuntaskannya - tidak perlu pindah halaman.
	const handleDeleteTrip = async () => {
		try {
			setDeleting(true);
			const res = await axios.delete(`/mitra/trips/${tripId}`);
			setShowDeleteConfirm(false);
			setAlertInfo({ show: true, type: "success", title: "Trip Dihapus", message: res.data.message });
			await fetchTrip();
		} catch (err) {
			setShowDeleteConfirm(false);
			setAlertInfo({
				show: true,
				type: "error",
				title: "Gagal Menghapus",
				message: err.response?.data?.message || "Terjadi kesalahan saat menghapus trip.",
			});
		} finally {
			setDeleting(false);
		}
	};

	// Trip yang sudah selesai/dibatalkan tidak bisa dihapus lagi (aturan
	// yang sama seperti di backend TripController::destroyTrip).
	const canDeleteTrip = trip && !["completed", "cancelled", "cancelled_pending_refund"].includes(trip.status);

	// ================= KONFIRMASI TRANSFER REFUND (+ upload bukti) =================
	const openRefundModal = (order) => {
		setRefundModal({
			orderId: order.id,
			customerName: order.user?.name || "Customer",
			refundAmount: order.refund_amount,
			// Rekening/e-wallet tujuan yang sudah didaftarkan customer
			// resmi lewat form - ditampilkan di sini supaya mitra tidak
			// perlu tanya-tanya dulu lewat chat sebelum transfer.
			refundDestination: order.refund_destination || null,
			// Beda copy modal tergantung ini upload pertama kali atau
			// upload ULANG setelah customer melaporkan belum menerima dana.
			isReupload: order.refund_status === "disputed",
		});
		setRefundProofFile(null);
		setRefundProofPreview(null);
		setRefundReferenceInput("");
	};

	const closeRefundModal = () => {
		setRefundModal(null);
		setRefundProofFile(null);
		setRefundProofPreview(null);
		setRefundReferenceInput("");
	};

	const handleProofChange = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setRefundProofFile(file);
		setRefundProofPreview(URL.createObjectURL(file));
	};

	const submitRefundConfirm = async () => {
		if (!refundModal) return;
		if (!refundProofFile) {
			setAlertInfo({
				show: true,
				type: "error",
				title: "Bukti Transfer Wajib Diupload",
				message: "Lampirkan screenshot bukti transfer (m-banking/e-wallet/QRIS) sebelum konfirmasi.",
			});
			return;
		}
		// WAJIB: nomor referensi/ID transaksi - sesuatu yang bisa
		// dicocokkan admin dengan mutasi rekening kalau terjadi
		// sengketa, bukan cuma percaya screenshot begitu saja.
		if (refundReferenceInput.trim().length < 4) {
			setAlertInfo({
				show: true,
				type: "error",
				title: "Nomor Referensi Wajib Diisi",
				message: "Isi nomor referensi/ID transaksi yang tertera di struk transfer Anda (minimal 4 karakter).",
			});
			return;
		}

		try {
			setProcessingRefund(true);
			const formData = new FormData();
			formData.append("refund_proof", refundProofFile);
			formData.append("refund_reference", refundReferenceInput.trim());

			const res = await axios.post(`/mitra/orders/${refundModal.orderId}/refund-confirm`, formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			closeRefundModal();
			setAlertInfo({ show: true, type: "success", title: "Konfirmasi Terkirim", message: res.data.message });
			await fetchTrip();
		} catch (err) {
			setAlertInfo({
				show: true,
				type: "error",
				title: "Gagal Konfirmasi",
				message: err.response?.data?.message || "Terjadi kesalahan saat mengonfirmasi refund.",
			});
		} finally {
			setProcessingRefund(false);
		}
	};

	return (
		<MitraLayout>
			<div className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-6 pb-24">
				{/* HEADER NAVIGATION */}
				<div className="flex items-center gap-4 mb-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Detail Tebengan</h1>
				</div>

				{/* CARD 1: RINGKASAN & STATUS */}
				<div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 overflow-hidden relative group">
					<div className="flex flex-wrap items-center justify-between gap-3 mb-6">
						<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg">
							{trip.departure_date} | {trip.departure_time} | TRIP-{trip.id}
						</span>
						<span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase ${getStatusColor(trip.status)}`}>{trip.status}</span>
					</div>

					<div className="relative pl-8 space-y-8">
						<div className="absolute left-[13px] top-[10px] bottom-[10px] w-[1.5px] bg-gray-100"></div>
						<div className="relative">
							<div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm"></div>
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-black text-gray-800 text-lg leading-none">{trip.origin_point?.city?.name || "-"}</h3>
								{trip.origin_point?.pos_name && (
									<span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">{trip.origin_point.pos_name}</span>
								)}
							</div>
							<p className="text-xs text-gray-400 mt-1 font-medium">{trip.origin_point.address}</p>

							{/* REAL-TIME: verifikasi keberangkatan (mitra sendiri) + check-in customer */}
							<div className="mt-3 bg-gray-50/70 rounded-2xl px-4 divide-y divide-gray-100">
								<VerifBadge label="Anda (Mitra)" done={!!trip.departure_verified_at} time={formatJam(trip.departure_verified_at)} doneText="Sudah Berangkat" waitingText="Belum Berangkat" />

								{passengerOrders.map((order) => (
									<VerifBadge
										key={order.id}
										label={order.user?.name || "Customer"}
										done={!!order.checkin_at}
										time={formatJam(order.checkin_at)}
										doneText="Check-in"
										waitingText="Belum Check-in"
									/>
								))}
							</div>
						</div>

						<div className="relative">
							<div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-black text-gray-800 text-lg leading-none">{trip.destination_point?.city?.name || "-"}</h3>
								{trip.destination_point?.pos_name && (
									<span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg uppercase">{trip.destination_point.pos_name}</span>
								)}
							</div>
							<p className="text-xs text-gray-400 mt-1 font-medium">{trip.destination_point.address}</p>

							{/* REAL-TIME: verifikasi kedatangan (trip) + barang sampai per-order */}
							<div className="mt-3 bg-gray-50/70 rounded-2xl px-4 divide-y divide-gray-100">
								<VerifBadge label="Kedatangan" done={!!trip.arrival_verified_at} time={formatJam(trip.arrival_verified_at)} doneText="Sudah Tiba" waitingText="Belum Tiba" />

								{itemOrders.map((order) => (
									<VerifBadge
										key={order.id}
										label={`${order.user?.name || "Customer"} (Barang)`}
										done={!!order.delivered_at}
										time={formatJam(order.delivered_at)}
										doneText="Sudah Sampai"
										waitingText="Belum Sampai"
									/>
								))}
							</div>
						</div>
					</div>

					<div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center">
						<span className="text-xs font-bold text-gray-400">{isBarang ? "Estimasi Pendapatan / Pengiriman" : "Estimasi Pendapatan / Kursi"}</span>
						<span className="text-xl font-black text-indigo-900 tracking-tighter">Rp {Number(trip.price).toLocaleString("id-ID")},00</span>
					</div>

					{canDeleteTrip && (
						<button
							onClick={() => setShowDeleteConfirm(true)}
							className="w-full mt-4 py-3.5 rounded-2xl bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
						>
							<Trash2 size={16} /> Hapus Trip Ini
						</button>
					)}
				</div>

				{/* CARD 2: INFORMASI MITRA */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8 flex items-center gap-2">
						<User size={20} className="text-indigo-400" /> Informasi Mitra
					</h3>
					<div className="space-y-4">
						<InfoRow label="Nama Mitra" value={trip.mitra.name} />
						<InfoRow label="Transportasi" value={trip.vehicle_type} />
						{isBarang ? <InfoRow label="Kapasitas Muatan" value={formatBaggageCapacity(trip.baggage_capacity)} /> : <InfoRow label="Jumlah Kursi" value={trip.seat_total} />}
					</div>
				</div>

				{/* CARD 3: INFORMASI TRIP */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8">Informasi Trip</h3>

					<div className="space-y-4">
						<InfoRow label="Kendaraan" value={trip.vehicle_type || "-"} />
						{isBarang ? (
							<InfoRow label="Kapasitas Muatan" value={formatBaggageCapacity(trip.baggage_capacity)} />
						) : (
							<>
								<InfoRow label="Total Kursi" value={trip.seat_total ?? "-"} />
								<InfoRow label="Kursi Tersedia" value={trip.seat_available ?? "-"} />
							</>
						)}
					</div>

					{/* =========================
    FOTO BARANG CUSTOMER
========================= */}
					{isBarang && trip.orders?.some((o) => o.item_order?.image) && (
						<div className="mt-8">
							<h4 className="text-sm font-black text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
								<Package size={16} className="text-indigo-500" />
								Foto Barang Customer
							</h4>

							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								{trip.orders.map((order) => {
									const image = order.item_order?.image;

									if (!image) return null;

									return (
										<div key={order.id} className="relative group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
											<img src={`http://127.0.0.1:8000/storage/${image}`} alt="Barang Customer" className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />

											<div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
												<p className="text-xs font-black text-white truncate">{order.user?.name || "Customer"}</p>

												<p className="text-[10px] text-white/80 truncate">{order.item_order?.size || "-"}</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Optional UI biar tetap ada feel interaktif */}
					{/* LIST PENUMPANG */}
					<div className="mt-8 space-y-4">
						{trip.orders && trip.orders.length > 0 ? (
							trip.orders.map((order) => {
								const refundBadge = REFUND_BADGE[order.refund_status];
								// Disputed sekarang IKUT masuk sini - mitra tetap boleh
								// upload ULANG bukti transfer walau sudah disengketakan,
								// supaya ada jalan keluar konkret alih-alih jalan buntu.
								const needsRefundAction = ["pending_100_percent", "pending_50_percent", "disputed"].includes(order.refund_status);
								const showRefundPanel = order.status === "cancelled" && refundBadge;

								return (
									<div key={order.id} className="w-full p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all group space-y-3">
										<div className="flex items-center justify-between">
											<div
												className="flex items-center gap-4 cursor-pointer"
												onClick={() => order.user?.id && navigate(`/mitra/customer/${order.user.id}`)}
											>
												{/* AVATAR */}
												{order.user?.avatar ? (
													<img src={`http://127.0.0.1:8000/storage/${order.user.avatar}`} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
												) : (
													<div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center font-black text-amber-700 text-lg">{order.user?.name?.charAt(0) || "U"}</div>
												)}

												{/* INFO USER */}
												<div className="text-left">
													<div className="flex items-center gap-2 flex-wrap mb-1">
														<h4 className="font-black text-gray-800 leading-none">{order.user?.name || "User"}</h4>

														{order.user?.id && customerRatings[order.user.id] && (
															customerRatings[order.user.id].count > 0 ? (
																<span className="flex items-center gap-1 text-[11px] font-black text-amber-600">
																	<Star size={11} className="fill-amber-400 text-amber-400" /> {Number(customerRatings[order.user.id].avg).toFixed(1)}
																	<span className="text-[10px] text-gray-400 font-medium">({customerRatings[order.user.id].count})</span>
																</span>
															) : (
																<span className="text-[9px] text-gray-400 font-bold uppercase">Belum ada rating</span>
															)
														)}
													</div>

													<p className="text-xs text-gray-400">{order.user?.email || "-"}</p>

													<p className="text-xs text-gray-400">{order.user?.phone || "-"}</p>

													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															navigate("/mitra/pesan-mitra", {
																state: {
																	customerId: order.user?.id,
																	customerName: order.user?.name,
																},
															});
														}}
														className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-widest flex items-center gap-1 mt-1"
													>
														<MessageSquare size={12} /> Chat customer
													</button>
												</div>
											</div>

											{/* 🔥 STATUS BADGE */}
											<div className="flex flex-col items-end gap-2">
												<span
													className={`text-[10px] font-black px-3 py-1 rounded-full uppercase
						${getStatusColor(order.status)}`}
												>
													{order.status}
												</span>

												<ArrowRight size={20} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
											</div>
										</div>

										{/* ================= PANEL REFUND (khusus order yang dibatalkan) ================= */}
										{showRefundPanel && (
											<div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
												<div className="flex items-center justify-between gap-2">
													<span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase ${refundBadge.className}`}>{refundBadge.text}</span>
													{order.payment_method === "qris" && (
														<span className="text-xs font-bold text-gray-500">
															Refund: <span className="text-gray-800">Rp {Number(order.refund_amount || 0).toLocaleString("id-ID")}</span>
														</span>
													)}
												</div>

												{/* Rekening/e-wallet tujuan yang sudah didaftarkan
												    customer resmi lewat form - supaya mitra tidak perlu
												    tanya dulu lewat chat sebelum transfer. */}
												{needsRefundAction && (
													<div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
														<p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Rekening/E-wallet Tujuan</p>
														{order.refund_destination ? (
															<p className="text-xs font-bold text-gray-700">{order.refund_destination}</p>
														) : (
															<p className="text-xs text-amber-600 font-bold">Belum diisi customer - chat customer dulu sebelum transfer.</p>
														)}
													</div>
												)}

												{needsRefundAction && (
													<button
														onClick={() => openRefundModal(order)}
														className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
													>
														<UploadCloud size={14} /> {order.refund_status === "disputed" ? "Upload Ulang Bukti Transfer" : "Saya Sudah Transfer, Upload Bukti"}
													</button>
												)}

												{order.refund_status === "mitra_claimed" && (
													<div className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
														<CheckCircle2 size={14} /> Bukti transfer sudah dikirim, menunggu customer konfirmasi.
													</div>
												)}

												{order.refund_status === "disputed" && (
													<div className="space-y-2">
														<div className="flex items-center gap-2 text-xs text-red-600 font-bold">
															<AlertTriangle size={14} />
															{order.complaint?.type === "refund_overdue_auto"
																? "Refund telat >24 jam, otomatis ditandai bersengketa oleh sistem. Admin sedang meninjau."
																: order.complaint
																? "Customer melaporkan belum menerima dana. Admin sedang meninjau."
																: "Order ini ditandai bersengketa. Admin sedang meninjau."}
														</div>
														{/* Catatan admin - supaya mitra tahu progres nyata
														    laporannya, bukan cuma pesan pasif yang sama dari
														    awal sampai selesai. */}
														{order.complaint?.admin_notes && (
															<div className="bg-red-50 rounded-xl p-3 border border-red-100">
																<p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">Catatan Admin</p>
																<p className="text-xs text-red-700 leading-relaxed">{order.complaint.admin_notes}</p>
															</div>
														)}
													</div>
												)}

												{order.refund_status === "refunded" && (
													<div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
														<CheckCircle2 size={14} /> Refund selesai - sudah dikonfirmasi diterima customer.
													</div>
												)}
											</div>
										)}
									</div>
								);
							})
						) : (
							<div className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50/50">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-black text-gray-500 text-lg">-</div>
									<div className="text-left">
										<h4 className="font-black text-gray-500 leading-none mb-1">Belum ada customer</h4>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* CARD 4: INFORMASI RUTE (Keberangkatan + Tujuan digabung 1 card) */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8 flex items-center gap-2">
						<Navigation size={20} className="text-indigo-400" /> Informasi Rute
					</h3>

					<div className="space-y-6">
						{/* KEBERANGKATAN */}
						<div className="space-y-4">
							<div className="flex justify-between items-center border-b border-gray-50 pb-4">
								<span className="text-sm font-medium text-gray-400">Pos Keberangkatan :</span>

								<span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase whitespace-nowrap">
									{trip.origin_point?.city?.name || "-"}
									{trip.origin_point?.pos_name ? ` • ${trip.origin_point.pos_name}` : ""}
								</span>
							</div>

							<p className="text-sm font-black text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">{trip.origin_point?.address || "-"}</p>
						</div>

						{/* TUJUAN */}
						<div className="space-y-4 pt-2 border-t-2 border-dashed border-gray-100">
							<div className="flex justify-between items-center border-b border-gray-50 pb-4 pt-2">
								<span className="text-sm font-medium text-gray-400">Pos Tujuan :</span>

								<span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full uppercase whitespace-nowrap">
									{trip.destination_point?.city?.name || "-"}
									{trip.destination_point?.pos_name ? ` • ${trip.destination_point.pos_name}` : ""}
								</span>
							</div>

							<p className="text-sm font-black text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">{trip.destination_point?.address || "-"}</p>
						</div>
					</div>
				</div>

				{/* CARD 5: ESTIMASI PENDAPATAN */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8 flex items-center gap-2">
						<ReceiptText size={20} className="text-indigo-400" /> Estimasi Pendapatan
					</h3>

					{(() => {
						if (isBarang) {
							const usedWeight = (trip.seat_total ?? 0) - (trip.seat_available ?? 0);
							const remainingWeight = trip.seat_available ?? 0;

							return (
								<div className="space-y-5">
									<div className="flex justify-between text-sm">
										<span className="font-medium text-gray-400">Harga per Kg</span>

										<span className="font-black text-gray-800">Rp {Math.round((trip.price || 0) / (trip.seat_total || 1)).toLocaleString("id-ID")}</span>
									</div>

									<div className="flex justify-between text-sm">
										<span className="font-medium text-gray-400">Kapasitas Muatan</span>

										<span className="font-black text-gray-800">{formatBaggageCapacity(trip.baggage_capacity)}</span>
									</div>

									<div className="flex justify-between text-sm">
										<span className="font-medium text-gray-400">Kapasitas Terisi</span>

										<span className="font-black text-gray-800">{usedWeight} Kg</span>
									</div>

									<div className="flex justify-between text-sm">
										<span className="font-medium text-gray-400">Kapasitas Tersisa</span>

										<span className="font-black text-emerald-600">{remainingWeight} Kg</span>
									</div>

									<div className="pt-5 border-t-2 border-gray-100 flex justify-between items-center">
										<span className="text-lg font-black text-indigo-900 uppercase tracking-widest">Potensi Pendapatan Maksimal</span>

										<span className="text-2xl font-black text-emerald-500 tracking-tighter">Rp {Number(trip.price || 0).toLocaleString("id-ID")}</span>
									</div>
								</div>
							);
						}

						// ==========================
						// PENUMPANG
						// ==========================
						return (
							<div className="space-y-5">
								<div className="flex justify-between text-sm">
									<span className="font-medium text-gray-400">Harga per Kursi</span>

									<span className="font-black text-gray-800">Rp {Number(trip.price || 0).toLocaleString("id-ID")}</span>
								</div>

								<div className="flex justify-between text-sm">
									<span className="font-medium text-gray-400">Total Kursi</span>

									<span className="font-black text-gray-800">{trip.seat_total ?? 0} Kursi</span>
								</div>

								<div className="flex justify-between text-sm">
									<span className="font-medium text-gray-400">Kursi Terisi</span>

									<span className="font-black text-gray-800">{(trip.seat_total ?? 0) - (trip.seat_available ?? 0)} Kursi</span>
								</div>

								<div className="flex justify-between text-sm">
									<span className="font-medium text-gray-400">Kursi Tersisa</span>

									<span className="font-black text-gray-800">{trip.seat_available ?? 0} Kursi</span>
								</div>

								<div className="pt-5 border-t-2 border-gray-100 flex justify-between items-center">
									<span className="text-lg font-black text-indigo-900 uppercase tracking-widest">Potensi Maksimal</span>

									<span className="text-2xl font-black text-emerald-500 tracking-tighter">Rp {(trip.price * trip.seat_total).toLocaleString("id-ID")}</span>
								</div>
							</div>
						);
					})()}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* BUTTON PERJALANAN */}
					<button
						onClick={() => navigate(`/mitra/perjalanan/${trip.id}`)}
						className="bg-indigo-900 hover:bg-indigo-800 transition-all text-white px-5 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 active:scale-[0.98]"
					>
						<Navigation size={18} className="rotate-45" />
						Lihat Perjalanan
					</button>

					{/* BUTTON QR */}
					{trip.status === "arrived_destination" && (
						<button
							onClick={handleGenerateQR}
							className="bg-white border border-indigo-100 text-indigo-900 hover:bg-indigo-50 transition-all px-5 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
						>
							Tampilkan QR
						</button>
					)}
				</div>
			</div>
			{/* QR MODAL */}
			{showQR && qrData?.token && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
					<div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
						{/* CLOSE BUTTON */}
						<button onClick={() => setShowQR(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all font-black text-gray-500">
							✕
						</button>

						<h2 className="text-2xl font-black text-indigo-900 text-center mb-2">QR Perjalanan</h2>

						<p className="text-sm text-gray-400 text-center mb-8">Tunjukkan QR ini kepada Pos Mitra</p>

						<div className="flex justify-center">
							<div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
								<QRCode
									value={JSON.stringify({
										type: "trip",
										token: qrData.token,
									})}
									size={240}
								/>
							</div>
						</div>

						<div className="mt-8 text-center">
							<p className="text-xs text-gray-400 font-medium">Berlaku hingga</p>

							<p className="font-black text-indigo-900 mt-1">{new Date(qrData.expired_at).toLocaleString()}</p>
						</div>
					</div>
				</div>
			)}

			<SuccessPopup show={justCompleted} onClose={() => setJustCompleted(false)} title="Perjalanan Selesai" message="QR berhasil diverifikasi Pos Mitra. Perjalanan ini telah selesai." />

			<ConfirmModal
				show={showDeleteConfirm}
				title="Hapus Trip Ini"
				message={
					trip?.orders?.filter((o) => o.status !== "cancelled").length > 0
						? "Trip ini sudah punya pesanan aktif. Menghapusnya akan membatalkan SEMUA pesanan tersebut dengan refund PENUH untuk customer. Anda WAJIB segera transfer dana & upload buktinya di panel refund pada halaman ini sebelum trip ini dianggap benar-benar selesai. Yakin ingin lanjut?"
						: "Trip ini belum ada pesanan. Yakin ingin menghapusnya?"
				}
				confirmText="Ya, Hapus"
				loading={deleting}
				onConfirm={handleDeleteTrip}
				onCancel={() => setShowDeleteConfirm(false)}
			/>

			{/* MODAL KONFIRMASI TRANSFER REFUND + UPLOAD BUKTI */}
			{refundModal && (
				<div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
					<div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 space-y-5">
						<div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
							<Wallet size={28} />
						</div>

						<div className="text-center space-y-1">
							<h3 className="text-xl font-black text-indigo-900">{refundModal.isReupload ? "Upload Ulang Bukti Transfer" : "Konfirmasi Transfer Refund"}</h3>
							<p className="text-xs text-gray-500 leading-relaxed font-medium">
								{refundModal.isReupload ? (
									<>
										Order ini ditandai bersengketa. Lampirkan ulang bukti transfer yang benar untuk{" "}
										<span className="font-black text-gray-700">Rp {Number(refundModal.refundAmount || 0).toLocaleString("id-ID")}</span> ke{" "}
										<span className="font-black text-gray-700">{refundModal.customerName}</span> di bawah ini. Admin & customer akan diberi tahu untuk meninjau ulang.
									</>
								) : (
									<>
										Pastikan Anda sudah benar-benar mentransfer{" "}
										<span className="font-black text-gray-700">Rp {Number(refundModal.refundAmount || 0).toLocaleString("id-ID")}</span> ke{" "}
										<span className="font-black text-gray-700">{refundModal.customerName}</span>, lalu lampirkan bukti transfernya di bawah ini.
									</>
								)}
							</p>
						</div>

						{refundModal.refundDestination && (
							<div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3">
								<p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">Transfer Ke</p>
								<p className="text-xs font-bold text-indigo-800">{refundModal.refundDestination}</p>
							</div>
						)}

						<label className="block cursor-pointer">
							<div className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-4 text-center transition-all bg-gray-50/50">
								{refundProofPreview ? (
									<img src={refundProofPreview} alt="Preview bukti transfer" className="w-full max-h-56 object-contain rounded-xl mx-auto" />
								) : (
									<div className="py-6 space-y-2 text-gray-400">
										<UploadCloud size={28} className="mx-auto" />
										<p className="text-xs font-bold">Klik untuk upload screenshot bukti transfer</p>
									</div>
								)}
							</div>
							<input type="file" accept="image/*" onChange={handleProofChange} className="hidden" />
						</label>

						{/* WAJIB: nomor referensi/ID transaksi - sesuatu yang bisa
						    dicocokkan admin dengan mutasi rekening kalau terjadi
						    sengketa, bukan cuma percaya screenshot begitu saja. */}
						<div className="text-left space-y-1.5">
							<label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nomor Referensi/ID Transaksi</label>
							<input
								type="text"
								value={refundReferenceInput}
								onChange={(e) => setRefundReferenceInput(e.target.value)}
								placeholder="Lihat di struk transfer m-banking/e-wallet Anda"
								className="w-full text-sm rounded-2xl border border-gray-200 p-3.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
							/>
						</div>

						<p className="text-[10px] text-gray-400 text-center leading-relaxed">Klaim palsu tanpa bukti valid dapat dilaporkan customer dan diperiksa Admin.</p>

						<div className="flex gap-3 pt-2">
							<button
								onClick={closeRefundModal}
								disabled={processingRefund}
								className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
							>
								Batal
							</button>
							<button
								onClick={submitRefundConfirm}
								disabled={processingRefund || !refundProofFile || refundReferenceInput.trim().length < 4}
								className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
							>
								{processingRefund ? "Mengirim..." : refundModal.isReupload ? "Kirim Bukti Baru" : "Ya, Saya Sudah Transfer"}
							</button>
						</div>
					</div>
				</div>
			)}

			<AlertModal
				show={alertInfo.show}
				type={alertInfo.type}
				title={alertInfo.title}
				message={alertInfo.message}
				onClose={() => setAlertInfo((prev) => ({ ...prev, show: false }))}
			/>
		</MitraLayout>
	);
}

// Sub-component agar kode lebih bersih
function InfoRow({ label, value }) {
	return (
		<div className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
			<span className="text-sm font-medium text-gray-400">{label}</span>
			<span className="text-sm font-black text-gray-800 uppercase tracking-tight">{value}</span>
		</div>
	);
}