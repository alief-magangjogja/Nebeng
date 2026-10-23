import AdminLayout from "../../components/dashboard/AdminLayout";
import { Search, Calendar, Download, Eye, Lock, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { exportToCsv } from "../../utils/exportCsv";

export default function BlokirMitra() {
	const [blockedMitraData, setBlockedMitraData] = useState([]);
	const navigate = useNavigate();

	// filter tanggal (kalender) - difilter dari updated_at, yaitu waktu
	// terakhir status user berubah jadi 'blocked'
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [showCalendar, setShowCalendar] = useState(false);

	const filteredMitra = useMemo(() => {
		if (!dateFrom && !dateTo) return blockedMitraData;

		return blockedMitraData.filter((m) => {
			if (!m.updated_at) return true;
			const blockedAt = m.updated_at.slice(0, 10);
			if (dateFrom && blockedAt < dateFrom) return false;
			if (dateTo && blockedAt > dateTo) return false;
			return true;
		});
	}, [blockedMitraData, dateFrom, dateTo]);

	const handleDownload = () => {
		const rows = filteredMitra.map((m) => ({
			ID: m.id,
			Nama: m.name,
			Email: m.email,
			"No. Tlp": m.phone,
			Status: "BLOCK",
			"Tanggal Diblokir": m.updated_at?.slice(0, 10) || "",
		}));
		exportToCsv("blokir-mitra.csv", rows);
	};

	// =========================
	// FETCH DATA MITRA BLOCKED
	// =========================
	useEffect(() => {
		const fetchBlockedMitra = async () => {
			try {
				// PENTING: sebelumnya fetch ke /api/admin/mitra TANPA
				// ?status=blocked - endpoint itu secara default JUSTRU
				// membuang semua user yang statusnya 'blocked' (lihat
				// AdminController::mitraList), jadi .filter() di bawah ini
				// selalu memfilter dari list yang sudah pasti kosong dari
				// mitra blocked. Halaman ini akan SELALU tampil kosong,
				// siapapun yang diblokir. Sekarang minta langsung yang
				// statusnya 'blocked' dari backend.
				const res = await fetch("http://127.0.0.1:8000/api/admin/mitra?status=blocked", {
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
				});

				const data = await res.json();

				// Filter role tetap dipertahankan sebagai pengaman tambahan.
				const blocked = Array.isArray(data) ? data.filter((user) => user.role === "mitra" && user.status === "blocked") : [];

				setBlockedMitraData(blocked);
			} catch (err) {
				console.error(err);
			}
		};

		fetchBlockedMitra();
	}, []);

	// =========================
	// UNBLOCK USER
	// =========================
	const handleUnblock = async (id) => {
		if (!confirm("Yakin ingin membuka blokir mitra ini?")) return;

		try {
			// PENTING: path sebelumnya "/api/admin/unblock/{id}" tidak
			// cocok dengan route backend yang sebenarnya
			// ("/api/admin/unblock-user/{id}", lihat routes/api.php) -
			// akibatnya request ini selalu gagal (404) dan tombol
			// "Buka Blokir" tidak pernah benar-benar bekerja.
			const res = await fetch(`http://127.0.0.1:8000/api/admin/unblock-user/${id}`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
					Accept: "application/json",
				},
			});

			if (res.ok) {
				// refresh data (hapus dari list)
				setBlockedMitraData((prev) => prev.filter((user) => user.id !== id));
			} else {
				console.error("Gagal membuka blokir, status:", res.status);
			}
		} catch (err) {
			console.error(err);
		}
	};

	return (
		<AdminLayout>
			<h1 className="text-2xl font-bold mb-6 text-gray-800">Daftar Blokir Data Mitra</h1>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
				{/* Toolbar */}
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div className="relative w-full md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" />
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
										<label className="text-xs text-gray-500">Dari tanggal diblokir</label>
										<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm mt-1" />
									</div>
									<div>
										<label className="text-xs text-gray-500">Sampai tanggal diblokir</label>
										<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm mt-1" />
									</div>
									<div className="flex gap-2 pt-1">
										<button
											onClick={() => {
												setDateFrom("");
												setDateTo("");
											}}
											className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
										>
											Reset
										</button>
										<button onClick={() => setShowCalendar(false)} className="flex-1 text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600">
											Terapkan
										</button>
									</div>
								</div>
							)}
						</div>

						<button onClick={handleDownload} className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
							Download <Download className="ml-2 w-4 h-4" />
						</button>
					</div>
				</div>

				{/* TABLE */}
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-sky-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
								<th className="px-4 py-4 rounded-l-lg text-center w-24">NO. ID</th>
								<th className="px-4 py-4">NAMA</th>
								<th className="px-4 py-4">EMAIL</th>
								<th className="px-4 py-4 text-center">NO. TLP</th>
								<th className="px-4 py-4 text-center">LAYANAN</th>
								<th className="px-4 py-4 text-center">STATUS</th>
								<th className="px-4 py-4 rounded-r-lg text-center">AKSI</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredMitra.map((mitra, i) => (
								<tr key={i} className="hover:bg-gray-50 transition-colors">
									<td className="px-4 py-5 text-sm text-gray-600 text-center font-medium">{mitra.id}</td>
									<td className="px-4 py-5 text-sm text-gray-700 font-medium">{mitra.name}</td>
									<td className="px-4 py-5 text-sm text-gray-500">{mitra.email}</td>
									<td className="px-4 py-5 text-sm text-gray-500 text-center">{mitra.phone}</td>

									{/* LAYANAN sementara "-" */}
									<td className="px-4 py-5 text-sm text-gray-500 text-center">-</td>

									<td className="px-4 py-5 text-center">
										<span className="bg-red-600 text-white text-[10px] font-bold px-4 py-1 rounded-full inline-block min-w-[80px]">BLOCK</span>
									</td>

									<td className="px-4 py-5 text-center">
										<div className="flex items-center justify-center gap-2">
											{/* DETAIL */}
											<button onClick={() => navigate(`/admin/detail-mitra/${mitra.id}`)} className="p-2 bg-indigo-900 text-white rounded hover:bg-indigo-800 transition-colors shadow-sm">
												<Eye className="w-4 h-4" />
											</button>

											{/* UNBLOCK */}
											<button onClick={() => handleUnblock(mitra.id)} className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm">
												<Lock className="w-4 h-4" />
											</button>
										</div>
									</td>
								</tr>
							))}

							{/* EMPTY STATE */}
							{filteredMitra.length === 0 && (
								<tr>
									<td colSpan="7" className="text-center py-10 text-gray-400">
										Tidak ada mitra yang diblokir
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* PAGINATION (TETAP UI ASLI) */}
				<div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-4 border-t border-gray-100">
					<div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
						<div className="relative border border-gray-200 rounded-md px-2 py-1 flex items-center gap-1 bg-gray-50 cursor-pointer">
							10 <ChevronDown className="w-3 h-3 text-gray-400" />
						</div>
						<span>of {filteredMitra.length} entries</span>
					</div>

					<div className="flex items-center gap-1">
						<button className="p-2 text-gray-300">
							<ChevronLeft className="w-5 h-5" />
						</button>
						<button className="w-8 h-8 flex items-center justify-center rounded bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">1</button>
						<button className="p-2 text-gray-400 hover:text-gray-600">
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}