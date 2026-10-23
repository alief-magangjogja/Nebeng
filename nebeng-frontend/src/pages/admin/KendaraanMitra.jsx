import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { Search, Calendar, Download, Eye, ChevronLeft, ChevronRight, Check, X, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { exportToCsv } from "../../utils/exportCsv";

const statusTabs = [
	{ id: "", label: "Semua" },
	{ id: "pending", label: "Menunggu" },
	{ id: "approved", label: "Disetujui" },
	{ id: "rejected", label: "Ditolak" },
];

const statusBadge = {
	pending: { label: "Menunggu", className: "bg-amber-50 text-amber-600", icon: Clock3 },
	approved: { label: "Disetujui", className: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
	rejected: { label: "Ditolak", className: "bg-red-50 text-red-600", icon: XCircle },
};

export default function KendaraanMitra() {
	const [vehicles, setVehicles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

	// filter tanggal (kalender)
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [showCalendar, setShowCalendar] = useState(false);
	const [downloading, setDownloading] = useState(false);

	// Opsi 2 - Modal Detail: tabel utama menampilkan daftar MITRA unik
	// (dikelompokkan dari daftar kendaraan yang di-fetch), lalu klik
	// "Detail Kendaraan" membuka modal berisi semua kendaraan milik mitra
	// itu beserta aksi Setujui/Tolak per kendaraan.
	const [detailGroup, setDetailGroup] = useState(null); // { user, vehicles: [...] }

	const [rejectingVehicle, setRejectingVehicle] = useState(null);
	const [rejectNotes, setRejectNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [processingId, setProcessingId] = useState(null);

	const fetchVehicles = async (page = 1, q = "", status = statusFilter, from = dateFrom, to = dateTo) => {
		setLoading(true);

		try {
			const token = localStorage.getItem("token");

			const params = new URLSearchParams({ page });
			if (q) params.set("search", q);
			if (status) params.set("status", status);
			if (from) params.set("date_from", from);
			if (to) params.set("date_to", to);

			const res = await fetch(`http://127.0.0.1:8000/api/admin/kendaraan-mitra?${params.toString()}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			if (res.ok) {
				const data = await res.json();

				setVehicles(data.data || []);
				setPagination({
					current_page: data.current_page || 1,
					last_page: data.last_page || 1,
					total: data.total || 0,
				});
			}
		} catch (err) {
			console.error("Gagal ambil data kendaraan mitra:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchVehicles(1, search, statusFilter);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [statusFilter]);

	// debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			fetchVehicles(1, search, statusFilter);
		}, 400);

		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	// ================= KELOMPOKKAN KENDARAAN PER MITRA =================
	// Catatan: pengelompokan ini jalan di atas data yang SUDAH terambil dari
	// 1 halaman (page) hasil fetch di atas - jadi 1 mitra dengan >1
	// kendaraan yang kebetulan kendaraannya terpisah di 2 halaman berbeda
	// (jarang terjadi kalau jumlah kendaraan tidak terlalu banyak) akan
	// muncul sebagai 2 baris terpisah. Untuk skala data saat ini itu bukan
	// masalah nyata.
	const groupedMitras = useMemo(() => {
		const map = new Map();

		vehicles.forEach((v) => {
			const key = v.user?.id ?? `no-user-${v.id}`;

			if (!map.has(key)) {
				map.set(key, { user: v.user, vehicles: [] });
			}

			map.get(key).vehicles.push(v);
		});

		return Array.from(map.values());
	}, [vehicles]);

	// Kalau modal detail sedang terbuka dan datanya berubah (mis. setelah
	// approve/reject dari dalam modal itu sendiri), sinkronkan supaya
	// status badge di dalam modal ikut ter-update tanpa perlu tutup-buka lagi.
	useEffect(() => {
		if (!detailGroup) return;

		const updated = groupedMitras.find((g) => (g.user?.id ?? null) === (detailGroup.user?.id ?? null));

		if (updated) setDetailGroup(updated);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [groupedMitras]);

	const handleDownload = async () => {
		setDownloading(true);

		try {
			const token = localStorage.getItem("token");

			const params = new URLSearchParams({ export: "1" });
			if (search) params.set("search", search);
			if (statusFilter) params.set("status", statusFilter);
			if (dateFrom) params.set("date_from", dateFrom);
			if (dateTo) params.set("date_to", dateTo);

			const res = await fetch(`http://127.0.0.1:8000/api/admin/kendaraan-mitra?${params.toString()}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			if (!res.ok) throw new Error("Gagal mengambil data untuk diunduh");

			const allVehicles = await res.json();

			const rows = allVehicles.map((v) => ({
				Nama: v.user?.name || "-",
				Kendaraan: v.type,
				"Merk Kendaraan": `${v.brand ?? ""} ${v.model ?? ""}`.trim(),
				"Plat Nomor": v.plate_number,
				Warna: v.color || "-",
				Kapasitas: v.seat_capacity ? `${v.seat_capacity} orang` : "-",
				Status: statusBadge[v.status]?.label || v.status,
				"Tanggal Daftar": v.created_at?.slice(0, 10) || "",
			}));

			exportToCsv("kendaraan-mitra.csv", rows);
		} catch (err) {
			console.error(err);
			alert("Gagal mengunduh data kendaraan mitra");
		} finally {
			setDownloading(false);
		}
	};

	const handleApprove = async (id) => {
		setProcessingId(id);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/kendaraan-mitra/${id}/approve`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			if (res.ok) {
				fetchVehicles(pagination.current_page, search, statusFilter);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setProcessingId(null);
		}
	};

	const handleReject = async () => {
		if (!rejectingVehicle) return;

		setSaving(true);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/kendaraan-mitra/${rejectingVehicle.id}/reject`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ notes: rejectNotes }),
			});

			if (res.ok) {
				setRejectingVehicle(null);
				setRejectNotes("");
				fetchVehicles(pagination.current_page, search, statusFilter);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setSaving(false);
		}
	};

	return (
		<AdminLayout>
			<h1 className="text-2xl font-bold mb-6 text-gray-800">Kendaraan Mitra</h1>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
				{/* Search & Actions */}
				<div className="flex flex-wrap items-center justify-between gap-4 mb-4">
					<div className="relative w-full md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							placeholder="Search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
						/>
					</div>

					<div className="flex items-center gap-3 w-full md:w-auto ml-auto">
						{/* FILTER KALENDER */}
						<div className="relative">
							<button onClick={() => setShowCalendar((v) => !v)} className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium bg-white hover:bg-gray-50 transition-colors">
								<Calendar className="mr-2 w-4 h-4 text-gray-400" /> Filter
							</button>

							{showCalendar && (
								<div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 space-y-3">
									<div>
										<label className="text-xs text-gray-500">Dari tanggal daftar</label>
										<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm mt-1" />
									</div>
									<div>
										<label className="text-xs text-gray-500">Sampai tanggal daftar</label>
										<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm mt-1" />
									</div>
									<div className="flex gap-2 pt-1">
										<button
											onClick={() => {
												setDateFrom("");
												setDateTo("");
												fetchVehicles(1, search, statusFilter, "", "");
											}}
											className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
										>
											Reset
										</button>
										<button
											onClick={() => {
												setShowCalendar(false);
												fetchVehicles(1, search, statusFilter, dateFrom, dateTo);
											}}
											className="flex-1 text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
										>
											Terapkan
										</button>
									</div>
								</div>
							)}
						</div>

						<button onClick={handleDownload} disabled={downloading} className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
							{downloading ? "Menyiapkan..." : "Download"} <Download className="ml-2 w-4 h-4" />
						</button>
					</div>
				</div>

				{/* FILTER STATUS */}
				<div className="flex flex-wrap gap-2 mb-6">
					{statusTabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setStatusFilter(tab.id)}
							className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${statusFilter === tab.id ? "bg-indigo-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Table - dikelompokkan per mitra (Opsi 2) */}
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-sky-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
								<th className="px-4 py-4 rounded-l-lg">Nama Mitra</th>
								<th className="px-4 py-4 text-center">Jumlah Kendaraan</th>
								<th className="px-4 py-4 text-center">Status</th>
								<th className="px-4 py-4 rounded-r-lg text-center">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{loading ? (
								<tr>
									<td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400 font-medium">
										Memuat data...
									</td>
								</tr>
							) : groupedMitras.length > 0 ? (
								groupedMitras.map((group) => {
									const counts = { pending: 0, approved: 0, rejected: 0 };
									group.vehicles.forEach((v) => {
										if (counts[v.status] !== undefined) counts[v.status] += 1;
									});

									return (
										<tr key={group.user?.id ?? group.vehicles[0]?.id} className="hover:bg-gray-50 transition-colors">
											<td className="px-4 py-4 text-sm font-medium text-gray-700">{group.user?.name || "-"}</td>
											<td className="px-4 py-4 text-sm text-gray-500 text-center">{group.vehicles.length} kendaraan</td>
											<td className="px-4 py-4">
												<div className="flex items-center justify-center gap-1.5 flex-wrap">
													{Object.entries(counts).map(([key, count]) => {
														if (count === 0) return null;
														const badge = statusBadge[key];
														const BadgeIcon = badge.icon;
														return (
															<span key={key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${badge.className}`}>
																<BadgeIcon className="w-3 h-3" /> {count} {badge.label}
															</span>
														);
													})}
												</div>
											</td>
											<td className="px-4 py-4 text-center">
												<button
													onClick={() => setDetailGroup(group)}
													className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition-colors text-xs font-bold"
												>
													<Eye className="w-4 h-4" /> Detail Kendaraan
												</button>
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400 font-medium">
										Belum ada data kendaraan mitra
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-4 border-t border-gray-100">
					<div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
						<span>of {pagination.total} entries</span>
					</div>

					<div className="flex items-center gap-1">
						<button
							onClick={() => pagination.current_page > 1 && fetchVehicles(pagination.current_page - 1, search, statusFilter)}
							disabled={pagination.current_page <= 1}
							className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
						>
							<ChevronLeft className="w-5 h-5" />
						</button>
						<span className="w-8 h-8 flex items-center justify-center rounded bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">{pagination.current_page}</span>
						<span className="text-gray-400 text-xs px-1">/ {pagination.last_page}</span>
						<button
							onClick={() => pagination.current_page < pagination.last_page && fetchVehicles(pagination.current_page + 1, search, statusFilter)}
							disabled={pagination.current_page >= pagination.last_page}
							className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
						>
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>

			{/* MODAL DETAIL KENDARAAN (semua kendaraan milik 1 mitra) */}
			{detailGroup && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
					<div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl max-h-[85vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-5">
							<h3 className="text-lg font-bold text-gray-800">Kendaraan {detailGroup.user?.name || "-"}</h3>
							<button onClick={() => setDetailGroup(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
								<X className="w-4 h-4 text-gray-400" />
							</button>
						</div>

						<div className="space-y-3">
							{detailGroup.vehicles.map((v) => {
								const badge = statusBadge[v.status] || statusBadge.pending;
								const BadgeIcon = badge.icon;

								return (
									<div key={v.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
										<div className="flex items-center justify-between gap-2">
											<span className="text-sm font-bold text-gray-800 capitalize">{v.type}</span>
											<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${badge.className}`}>
												<BadgeIcon className="w-3 h-3" /> {badge.label}
											</span>
										</div>

										<div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-500">
											<p>
												Merk: <span className="font-semibold text-gray-700">{v.brand} {v.model}</span>
											</p>
											<p>
												Plat: <span className="font-semibold text-gray-700 font-mono">{v.plate_number}</span>
											</p>
											<p>
												Warna: <span className="font-semibold text-gray-700">{v.color || "-"}</span>
											</p>
											{v.type === "mobil" && (
												<p>
													Kapasitas: <span className="font-semibold text-gray-700">{v.seat_capacity || "-"} orang</span>
												</p>
											)}
										</div>

										{v.status === "rejected" && v.notes && <p className="text-xs text-red-500">Alasan ditolak: {v.notes}</p>}

										{v.status === "pending" && (
											<div className="flex gap-2 pt-1">
												<button
													onClick={() => handleApprove(v.id)}
													disabled={processingId === v.id}
													className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
												>
													<Check className="w-3.5 h-3.5" /> Setujui
												</button>
												<button
													onClick={() => {
														setDetailGroup(null);
														setRejectingVehicle(v);
													}}
													disabled={processingId === v.id}
													className="flex-1 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
												>
													<X className="w-3.5 h-3.5" /> Tolak
												</button>
											</div>
										)}
									</div>
								);
							})}
						</div>

						<button onClick={() => setDetailGroup(null)} className="mt-5 w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 transition-colors">
							Tutup
						</button>
					</div>
				</div>
			)}

			{/* MODAL TOLAK */}
			{rejectingVehicle && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
					<div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl">
						<h3 className="text-lg font-bold text-gray-800 mb-2">Tolak Kendaraan</h3>
						<p className="text-sm text-gray-500 mb-4">
							{rejectingVehicle.brand} {rejectingVehicle.model} - {rejectingVehicle.plate_number} milik {rejectingVehicle.user?.name}
						</p>

						<label className="text-xs font-bold text-gray-400 uppercase">Alasan Penolakan (opsional)</label>
						<textarea
							value={rejectNotes}
							onChange={(e) => setRejectNotes(e.target.value)}
							rows={3}
							placeholder="Mis. foto STNK buram, plat nomor tidak sesuai, dll."
							className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
						/>

						<div className="flex gap-3 mt-6">
							<button
								onClick={() => {
									setRejectingVehicle(null);
									setRejectNotes("");
								}}
								className="flex-1 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 transition-colors"
							>
								Batal
							</button>
							<button onClick={handleReject} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 font-semibold text-white transition-colors disabled:opacity-50">
								{saving ? "Memproses..." : "Tolak Kendaraan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</AdminLayout>
	);
}