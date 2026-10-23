import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";

import { ChevronLeft, User, ReceiptText } from "lucide-react";

import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";

// ================= STATUS COLOR =================
function getStatusColor(status) {
	if (!status) return "bg-gray-50 text-gray-400";

	const s = String(status).toLowerCase();

	if (s.includes("selesai") || s.includes("completed") || s.includes("done")) {
		return "bg-emerald-50 text-emerald-500";
	}

	if (s.includes("menunggu") || s.includes("pending") || s.includes("waiting")) {
		return "bg-amber-50 text-amber-500";
	}

	if (s.includes("batal") || s.includes("cancel") || s.includes("rejected")) {
		return "bg-rose-50 text-rose-500";
	}

	if (s.includes("konfirmasi") || s.includes("confirmed") || s.includes("accepted")) {
		return "bg-indigo-50 text-indigo-600";
	}

	return "bg-gray-50 text-gray-500";
}

export default function DetailOrderAdmin() {
	const navigate = useAppNavigate();

	// ================= PARAMS =================
	const { tripId } = useParams();

	// ================= STATE =================
	const [trip, setTrip] = useState(null);
	const [loading, setLoading] = useState(true);

	// ================= FETCH TRIP =================
	useEffect(() => {
		const fetchTrip = async () => {
			try {
				const res = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}`);

				const data = await res.json();

				console.log("DATA TRIP:", data);

				setTrip(data);
			} catch (err) {
				console.error("Error fetch trip:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchTrip();
	}, [tripId]);

	// ================= LOADING =================
	if (loading) {
		return (
			<AdminLayout>
				<div className="p-10 text-center">Loading...</div>
			</AdminLayout>
		);
	}

	// ================= NOT FOUND =================
	if (!trip) {
		return (
			<AdminLayout>
				<div className="p-10 text-center">Trip tidak ditemukan</div>
			</AdminLayout>
		);
	}

	// ================= DATA =================
	const mitra = trip.mitra || {};

	return (
		<AdminLayout>
			<div className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-6 pb-24">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>

					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Detail Pesanan</h1>
				</div>

				{/* CARD RINGKASAN */}
				<div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 overflow-hidden relative">
					<div className="flex flex-wrap items-center justify-between gap-3 mb-6">
						<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg">
							{trip.departure_date || "-"} | {trip.departure_time || "-"} | TRIP-{trip.id}
						</span>

						<span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase ${getStatusColor(trip.status)}`}>{trip.status || "-"}</span>
					</div>

					<div className="relative pl-8 space-y-8">
						<div className="absolute left-[13px] top-[10px] bottom-[10px] w-[1.5px] bg-gray-100"></div>

						{/* ASAL */}
						<div className="relative">
							<div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm"></div>

							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-black text-gray-800 text-lg leading-none">{trip.origin_point?.city?.name || "-"}</h3>
								{trip.origin_point?.pos_name && (
									<span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">{trip.origin_point.pos_name}</span>
								)}
							</div>

							<p className="text-xs text-gray-400 mt-1 font-medium">{trip.origin_point?.address || "-"}</p>
						</div>

						{/* TUJUAN */}
						<div className="relative">
							<div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>

							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-black text-gray-800 text-lg leading-none">{trip.destination_point?.city?.name || "-"}</h3>
								{trip.destination_point?.pos_name && (
									<span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg uppercase">{trip.destination_point.pos_name}</span>
								)}
							</div>

							<p className="text-xs text-gray-400 mt-1 font-medium">{trip.destination_point?.address || "-"}</p>
						</div>
					</div>

					<div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center">
						<span className="text-xs font-bold text-gray-400">Harga per Kursi</span>

						<span className="text-xl font-black text-indigo-900 tracking-tighter">
							Rp {Number(trip.price || 0).toLocaleString("id-ID")}
							,00
						</span>
					</div>
				</div>

				{/* CARD DRIVER */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8 flex items-center gap-2">
						<User size={20} className="text-indigo-400" />
						Informasi Driver
					</h3>

					<div className="space-y-4">
						<InfoRow label="Nama Driver" value={mitra.name || "-"} />

						<InfoRow label="Email" value={mitra.email || "-"} />

						<InfoRow label="No. HP" value={mitra.phone || "-"} />

						<InfoRow label="Jenis Kendaraan" value={trip.vehicle_type || "-"} />
					</div>
				</div>

				{/* CARD TRIP */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8">Informasi Trip</h3>

					<div className="space-y-4">
						<InfoRow label="Jenis Kendaraan" value={trip.vehicle_type || "-"} />

						<InfoRow label="Total Kursi" value={`${trip.seat_total ?? 0} Kursi`} />

						<InfoRow label="Kursi Tersedia" value={`${trip.seat_available ?? 0} Kursi`} />

						<InfoRow label="Kapasitas Barang" value={trip.baggage_capacity ?? "-"} />

						<InfoRow label="Tanggal Berangkat" value={trip.departure_date || "-"} />

						<InfoRow label="Jam Berangkat" value={trip.departure_time || "-"} />
					</div>
				</div>

				{/* CARD CUSTOMER */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8">Daftar Customer</h3>

					<div className="space-y-4">
						{trip.orders && trip.orders.length > 0 ? (
							trip.orders.map((order) => (
								<div key={order.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
									<div className="flex items-center justify-between gap-4 mb-4">
										<div>
											<h4 className="font-black text-gray-800">{order.user?.name || "-"}</h4>

											<p className="text-sm text-gray-400">{order.user?.email || "-"}</p>

											<p className="text-sm text-gray-400">{order.user?.phone || "-"}</p>
										</div>

										<span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${getStatusColor(order.status)}`}>{order.status || "-"}</span>
									</div>

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div className="bg-white rounded-xl p-3 border border-gray-100">
											<p className="text-gray-400 text-xs mb-1">Order ID</p>

											<p className="font-black text-gray-800">#{order.id}</p>
										</div>

										<div className="bg-white rounded-xl p-3 border border-gray-100">
											<p className="text-gray-400 text-xs mb-1">Total Bayar</p>

											<p className="font-black text-gray-800">Rp {Number(order.price || 0).toLocaleString("id-ID")}</p>
										</div>

										<div className="bg-white rounded-xl p-3 border border-gray-100">
											<p className="text-gray-400 text-xs mb-1">Payment</p>

											<p className="font-black text-gray-800 uppercase">{order.payment_method || "-"}</p>
										</div>

										<div className="bg-white rounded-xl p-3 border border-gray-100">
											<p className="text-gray-400 text-xs mb-1">Status Payment</p>

											<p className="font-black text-gray-800 uppercase">{order.status || "-"}</p>
										</div>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-10 text-gray-400 font-medium">Belum ada customer</div>
						)}
					</div>
				</div>

				{/* CARD TUJUAN */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8">Informasi Tujuan</h3>

					<div className="space-y-4">
						<div className="flex gap-4">
							<span className="text-sm font-medium text-gray-400 w-32 shrink-0">Kota Tujuan :</span>

							<span className="text-sm font-black text-gray-800">
								{trip.destination_point?.city?.name || "-"}
								{trip.destination_point?.pos_name && ` - ${trip.destination_point.pos_name}`}
							</span>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium text-gray-400">Alamat Tujuan :</span>

							<p className="text-sm font-black text-gray-800 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">"{trip.destination_point?.address || "-"}"</p>
						</div>
					</div>
				</div>

				{/* CARD RINGKASAN */}
				<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50">
					<h3 className="text-lg font-black text-indigo-900 mb-8 flex items-center gap-2">
						<ReceiptText size={20} className="text-indigo-400" />
						Ringkasan Trip
					</h3>

					<div className="space-y-5">
						<div className="flex justify-between text-sm">
							<span className="font-medium text-gray-400">Harga per Kursi</span>

							<span className="font-black text-gray-800">Rp {Number(trip.price || 0).toLocaleString("id-ID")}</span>
						</div>

						<div className="flex justify-between text-sm">
							<span className="font-medium text-gray-400">Total Customer</span>

							<span className="font-black text-gray-800">{trip.orders?.length || 0}</span>
						</div>

						<div className="flex justify-between text-sm">
							<span className="font-medium text-gray-400">Status Trip</span>

							<span className="font-black text-gray-800 uppercase">{trip.status || "-"}</span>
						</div>

						<div className="pt-5 border-t-2 border-gray-100 flex justify-between items-center">
							<span className="text-lg font-black text-indigo-900 uppercase tracking-widest">Estimasi Pendapatan</span>

							<span className="text-2xl font-black text-emerald-500 tracking-tighter">Rp {((trip.orders?.length || 0) * (trip.price || 0)).toLocaleString("id-ID")}</span>
						</div>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}

// ================= INFO ROW =================
function InfoRow({ label, value }) {
	return (
		<div className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
			<span className="text-sm font-medium text-gray-400">{label}</span>

			<span className="text-sm font-black text-gray-800 uppercase tracking-tight">{value}</span>
		</div>
	);
}
