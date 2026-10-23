import AdminLayout from "../../components/dashboard/AdminLayout";
import { Search, Calendar, Download, Eye, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { exportToCsv } from "../../utils/exportCsv";

// Pilihan filter status order.
const STATUS_OPTIONS = [
	{ value: "", label: "Semua" },
	{ value: "pending", label: "Pending" },
	{ value: "completed", label: "Completed" },
	{ value: "cancelled", label: "Cancelled" },
];

export default function Pesanan() {
	const navigate = useNavigate();

	// ================= STATE =================
	const [orders, setOrders] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	// filter status order
	const [statusFilter, setStatusFilter] = useState("");
	const [showStatusMenu, setShowStatusMenu] = useState(false);

	// filter mitra (driver)
	const [mitraFilter, setMitraFilter] = useState("");
	const [showMitraMenu, setShowMitraMenu] = useState(false);

	// filter pos asal & pos tujuan (pickup point)
	const [posAsalFilter, setPosAsalFilter] = useState("");
	const [showPosAsalMenu, setShowPosAsalMenu] = useState(false);
	const [posTujuanFilter, setPosTujuanFilter] = useState("");
	const [showPosTujuanMenu, setShowPosTujuanMenu] = useState(false);

	// filter rentang tanggal (created_at)
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [showCalendar, setShowCalendar] = useState(false);

	// Tutup semua dropdown filter lain, dipakai tiap kali salah satu
	// dropdown dibuka supaya tidak numpuk kebuka bareng-bareng.
	const closeAllMenus = () => {
		setShowStatusMenu(false);
		setShowMitraMenu(false);
		setShowPosAsalMenu(false);
		setShowPosTujuanMenu(false);
		setShowCalendar(false);
	};

	// ================= FETCH DATA =================
	const fetchOrders = async () => {
		try {
			const res = await fetch("http://127.0.0.1:8000/api/admin/orders", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});

			const data = await res.json();
			setOrders(data);
		} catch (err) {
			console.error("Error fetch orders:", err);
		}
	};

	useEffect(() => {
		fetchOrders();
	}, []);

	// ================= DAFTAR PILIHAN MITRA & POS (dari data order yang sudah ke-fetch) =================
	// Semua dropdown ini diisi otomatis dari data order yang berhasil
	// di-fetch, supaya pilihannya selalu nyesuain sama yang benar-benar
	// ada transaksinya (tidak perlu request tambahan ke server).
	const mitraOptions = useMemo(() => {
		const map = new Map();
		orders.forEach((order) => {
			const mitra = order.trip?.mitra;
			if (mitra?.id && mitra?.name) {
				map.set(mitra.id, mitra.name);
			}
		});
		return Array.from(map, ([id, label]) => ({ id, label }));
	}, [orders]);

	const posAsalOptions = useMemo(() => {
		const map = new Map();
		orders.forEach((order) => {
			const point = order.trip?.origin_point;
			if (point?.id && point?.pos_name) {
				map.set(point.id, `${point.pos_name}${point.city?.name ? " - " + point.city.name : ""}`);
			}
		});
		return Array.from(map, ([id, label]) => ({ id, label }));
	}, [orders]);

	const posTujuanOptions = useMemo(() => {
		const map = new Map();
		orders.forEach((order) => {
			const point = order.trip?.destination_point;
			if (point?.id && point?.pos_name) {
				map.set(point.id, `${point.pos_name}${point.city?.name ? " - " + point.city.name : ""}`);
			}
		});
		return Array.from(map, ([id, label]) => ({ id, label }));
	}, [orders]);

	// ================= SEARCH + SEMUA FILTER =================
	const filteredOrders = useMemo(() => {
		return orders.filter((order) => {
			const keyword = searchTerm.toLowerCase();

			const matchSearch = order.customer?.name?.toLowerCase().includes(keyword) || order.trip?.mitra?.name?.toLowerCase().includes(keyword);

			const matchStatus = !statusFilter || order.status === statusFilter;

			const matchMitra = !mitraFilter || String(order.trip?.mitra?.id) === String(mitraFilter);

			const matchPosAsal = !posAsalFilter || String(order.trip?.origin_point?.id) === String(posAsalFilter);

			const matchPosTujuan = !posTujuanFilter || String(order.trip?.destination_point?.id) === String(posTujuanFilter);

			// filter berdasarkan tanggal order dibuat (created_at)
			let matchDate = true;
			if (order.created_at && (dateFrom || dateTo)) {
				const orderedAt = order.created_at.slice(0, 10); // "YYYY-MM-DD"
				if (dateFrom && orderedAt < dateFrom) matchDate = false;
				if (dateTo && orderedAt > dateTo) matchDate = false;
			}

			return matchSearch && matchStatus && matchMitra && matchPosAsal && matchPosTujuan && matchDate;
		});
	}, [orders, searchTerm, statusFilter, mitraFilter, posAsalFilter, posTujuanFilter, dateFrom, dateTo]);

	// ================= PAGINATION =================
	const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);

	const paginatedOrders = useMemo(() => {
		const start = (currentPage - 1) * rowsPerPage;
		return filteredOrders.slice(start, start + rowsPerPage);
	}, [filteredOrders, currentPage, rowsPerPage]);

	const goToPage = (page) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	// ================= FORMAT =================
	const formatHarga = (harga) => {
		return "Rp. " + Number(harga).toLocaleString("id-ID") + ",00";
	};

	const formatTanggal = (date) => {
		return new Date(date).toLocaleDateString("id-ID", {
			weekday: "long",
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	// ================= DOWNLOAD EXCEL (CSV) =================
	// Export mengikuti hasil filter yang sedang aktif (search, status, pos,
	// tanggal) - bukan cuma data yang tampil di halaman saat ini.
	const handleDownload = () => {
		const rows = filteredOrders.map((order) => ({
			"No. Order": order.id,
			Customer: order.customer?.name || "-",
			Driver: order.trip?.mitra?.name || "-",
			Asal: order.trip?.origin_point?.city?.name || "-",
			"Pos Asal": order.trip?.origin_point?.pos_name || "-",
			Tujuan: order.trip?.destination_point?.city?.name || "-",
			"Pos Tujuan": order.trip?.destination_point?.pos_name || "-",
			Tanggal: order.created_at?.slice(0, 10) || "-",
			Layanan: `Nebeng ${order.trip?.vehicle_type || "-"}`,
			Harga: order.price,
			Status: order.status,
		}));
		exportToCsv("daftar-pesanan.csv", rows);
	};

	// ================= STATUS STYLE =================
	const getStatusStyle = (status) => {
		switch (status) {
			case "pending":
				return "bg-amber-400";
			case "completed":
				return "bg-emerald-500";
			case "cancelled":
				return "bg-red-600";
			default:
				return "bg-gray-500";
		}
	};

	return (
		<AdminLayout>
			<h1 className="text-2xl font-bold mb-6 text-gray-800">Daftar Pesanan</h1>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
				{/* Header Actions */}
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div className="relative w-full md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							placeholder="Search"
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
						/>
					</div>

					<div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
						{/* FILTER STATUS */}
						<div className="relative">
							<button
								onClick={() => {
									const next = !showStatusMenu;
									closeAllMenus();
									setShowStatusMenu(next);
								}}
								className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 min-w-[120px]"
							>
								{STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || "Status"} <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
							</button>

							{showStatusMenu && (
								<div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
									{STATUS_OPTIONS.map((opt) => (
										<button
											key={opt.value}
											onClick={() => {
												setStatusFilter(opt.value);
												setCurrentPage(1);
												setShowStatusMenu(false);
											}}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === opt.value ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
										>
											{opt.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* FILTER MITRA (DRIVER) */}
						<div className="relative">
							<button
								onClick={() => {
									const next = !showMitraMenu;
									closeAllMenus();
									setShowMitraMenu(next);
								}}
								className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 min-w-[140px]"
							>
								{mitraOptions.find((m) => String(m.id) === String(mitraFilter))?.label || "Mitra"} <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
							</button>

							{showMitraMenu && (
								<div className="absolute right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
									<button
										onClick={() => {
											setMitraFilter("");
											setCurrentPage(1);
											setShowMitraMenu(false);
										}}
										className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!mitraFilter ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
									>
										Semua Mitra
									</button>
									{mitraOptions.map((opt) => (
										<button
											key={opt.id}
											onClick={() => {
												setMitraFilter(opt.id);
												setCurrentPage(1);
												setShowMitraMenu(false);
											}}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${String(mitraFilter) === String(opt.id) ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
										>
											{opt.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* FILTER POS ASAL */}
						<div className="relative">
							<button
								onClick={() => {
									const next = !showPosAsalMenu;
									closeAllMenus();
									setShowPosAsalMenu(next);
								}}
								className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 min-w-[150px]"
							>
								{posAsalOptions.find((p) => String(p.id) === String(posAsalFilter))?.label || "Pos Asal"} <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
							</button>

							{showPosAsalMenu && (
								<div className="absolute right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
									<button
										onClick={() => {
											setPosAsalFilter("");
											setCurrentPage(1);
											setShowPosAsalMenu(false);
										}}
										className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!posAsalFilter ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
									>
										Semua Pos Asal
									</button>
									{posAsalOptions.map((opt) => (
										<button
											key={opt.id}
											onClick={() => {
												setPosAsalFilter(opt.id);
												setCurrentPage(1);
												setShowPosAsalMenu(false);
											}}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${String(posAsalFilter) === String(opt.id) ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
										>
											{opt.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* FILTER POS TUJUAN */}
						<div className="relative">
							<button
								onClick={() => {
									const next = !showPosTujuanMenu;
									closeAllMenus();
									setShowPosTujuanMenu(next);
								}}
								className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 min-w-[150px]"
							>
								{posTujuanOptions.find((p) => String(p.id) === String(posTujuanFilter))?.label || "Pos Tujuan"} <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
							</button>

							{showPosTujuanMenu && (
								<div className="absolute right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
									<button
										onClick={() => {
											setPosTujuanFilter("");
											setCurrentPage(1);
											setShowPosTujuanMenu(false);
										}}
										className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!posTujuanFilter ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
									>
										Semua Pos Tujuan
									</button>
									{posTujuanOptions.map((opt) => (
										<button
											key={opt.id}
											onClick={() => {
												setPosTujuanFilter(opt.id);
												setCurrentPage(1);
												setShowPosTujuanMenu(false);
											}}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${String(posTujuanFilter) === String(opt.id) ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
										>
											{opt.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* FILTER KALENDER (rentang tanggal order dibuat) */}
						<div className="relative">
							<button
								onClick={() => {
									const next = !showCalendar;
									closeAllMenus();
									setShowCalendar(next);
								}}
								className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
							>
								<Calendar className="mr-2 w-4 h-4 text-gray-400" /> Filter
							</button>

							{showCalendar && (
								<div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 space-y-3">
									<div>
										<label className="text-xs text-gray-500">Dari tanggal</label>
										<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm mt-1" />
									</div>
									<div>
										<label className="text-xs text-gray-500">Sampai tanggal</label>
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
										<button
											onClick={() => {
												setCurrentPage(1);
												setShowCalendar(false);
											}}
											className="flex-1 text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
										>
											Terapkan
										</button>
									</div>
								</div>
							)}
						</div>

						{(statusFilter || mitraFilter || posAsalFilter || posTujuanFilter || dateFrom || dateTo) && (
							<button
								onClick={() => {
									setStatusFilter("");
									setMitraFilter("");
									setPosAsalFilter("");
									setPosTujuanFilter("");
									setDateFrom("");
									setDateTo("");
									setCurrentPage(1);
								}}
								className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors"
							>
								Reset Filter
							</button>
						)}

						<button onClick={handleDownload} className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
							Download <Download className="ml-2 w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-sky-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
								<th className="px-4 py-4 rounded-l-lg text-center">No. Order</th>
								<th className="px-4 py-4">Nama Costumer</th>
								<th className="px-4 py-4">Nama Driver</th>
								<th className="px-4 py-4">Asal</th>
								<th className="px-4 py-4">Tujuan</th>
								<th className="px-4 py-4">Tanggal</th>
								<th className="px-4 py-4">Layanan</th>
								<th className="px-4 py-4">Harga</th>
								<th className="px-4 py-4 text-center">Status</th>
								<th className="px-4 py-4 rounded-r-lg text-center">Aksi</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100">
							{paginatedOrders.map((order) => (
								<tr key={order.id} className="hover:bg-gray-50 transition-colors">
									<td className="px-4 py-5 text-sm text-gray-600 text-center font-medium">{order.id}</td>

									<td className="px-4 py-5 text-sm text-gray-700 font-medium">{order.customer?.name || "-"}</td>

									<td className="px-4 py-5 text-sm text-gray-500">{order.trip?.mitra?.name || "-"}</td>

									<td className="px-4 py-5 text-sm text-gray-500">
										{order.trip?.origin_point?.city?.name || "-"}
										{order.trip?.origin_point?.pos_name && (
											<span className="block text-[10px] font-bold text-indigo-500 uppercase">{order.trip.origin_point.pos_name}</span>
										)}
									</td>

									<td className="px-4 py-5 text-sm text-gray-500">
										{order.trip?.destination_point?.city?.name || "-"}
										{order.trip?.destination_point?.pos_name && (
											<span className="block text-[10px] font-bold text-orange-500 uppercase">{order.trip.destination_point.pos_name}</span>
										)}
									</td>

									<td className="px-4 py-5 text-sm text-gray-500">{formatTanggal(order.created_at)}</td>

									<td className="px-4 py-5 text-sm text-gray-500">Nebeng {order.trip?.vehicle_type || "-"}</td>

									<td className="px-4 py-5 text-sm text-gray-500">{formatHarga(order.price)}</td>

									<td className="px-4 py-5 text-center">
										<span className={`${getStatusStyle(order.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full inline-block min-w-[85px]`}>{order.status}</span>
									</td>

									<td className="px-4 py-5 text-center">
										<button onClick={() => navigate(`/admin/detail-orders/${order.trip?.id}`)} className="p-2 bg-indigo-900 text-white rounded-md hover:bg-indigo-800 transition-colors inline-flex items-center justify-center">
											<Eye className="w-4 h-4" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-4 border-t border-gray-100">
					<div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
						<select
							value={rowsPerPage}
							onChange={(e) => {
								setRowsPerPage(Number(e.target.value));
								setCurrentPage(1);
							}}
							className="border border-gray-200 rounded-md px-2 py-1 bg-gray-50 text-xs"
						>
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={20}>20</option>
						</select>

						<span>
							{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredOrders.length)} of {filteredOrders.length} entries
						</span>
					</div>

					<div className="flex items-center gap-1">
						<button onClick={() => goToPage(currentPage - 1)} className="p-2 text-gray-400 hover:text-gray-600">
							<ChevronLeft className="w-5 h-5" />
						</button>

						{Array.from({ length: totalPages }, (_, i) => i + 1)
							.slice(0, 5)
							.map((page) => (
								<button
									key={page}
									onClick={() => goToPage(page)}
									className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium
									${currentPage === page ? "bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold" : "text-gray-400 hover:bg-gray-50"}`}
								>
									{page}
								</button>
							))}

						<button onClick={() => goToPage(currentPage + 1)} className="p-2 text-gray-400 hover:text-gray-600">
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}