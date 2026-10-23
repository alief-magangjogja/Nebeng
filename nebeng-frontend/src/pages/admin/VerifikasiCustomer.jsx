import AdminLayout from "../../components/dashboard/AdminLayout";
import { Search, Calendar, Download, Eye, Lock, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { exportToCsv } from "../../utils/exportCsv";

const TABS = [
	{ value: "pending", label: "Menunggu" },
	{ value: "rejected", label: "Ditolak" },
];

export default function VerifikasiCustomer() {
	const navigate = useNavigate();

	// ================= STATE =================
	const [customerData, setCustomerData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [tab, setTab] = useState("pending");
	const [showStatusMenu, setShowStatusMenu] = useState(false);

	// filter tanggal (kalender)
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [showCalendar, setShowCalendar] = useState(false);

	// ================= FETCH =================
	const fetchCustomer = async (currentTab = tab) => {
		try {
			const res = await fetch(`http://127.0.0.1:8000/api/admin/customer/pending?status=${currentTab}`, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});

			const data = await res.json();
			setCustomerData(Array.isArray(data) ? data : []);
		} catch (err) {
			console.error("Error fetch customer:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		setLoading(true);
		fetchCustomer(tab);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab]);

	// ================= SEARCH + FILTER TANGGAL =================
	const filteredCustomer = useMemo(() => {
		return customerData.filter((c) => {
			const keyword = searchTerm.toLowerCase();
			const matchSearch = c.name?.toLowerCase().includes(keyword) || c.email?.toLowerCase().includes(keyword) || c.phone?.toLowerCase().includes(keyword);

			let matchDate = true;
			if (c.created_at && (dateFrom || dateTo)) {
				const registeredAt = c.created_at.slice(0, 10);
				if (dateFrom && registeredAt < dateFrom) matchDate = false;
				if (dateTo && registeredAt > dateTo) matchDate = false;
			}

			return matchSearch && matchDate;
		});
	}, [customerData, searchTerm, dateFrom, dateTo]);

	// ================= DOWNLOAD CSV =================
	const handleDownload = () => {
		const rows = filteredCustomer.map((c) => ({
			ID: c.id,
			Nama: c.name,
			Email: c.email,
			"No. Tlp": c.phone,
			Role: c.role,
			Status: c.status,
			"Tanggal Pengajuan": c.created_at?.slice(0, 10) || "",
		}));
		exportToCsv("verifikasi-customer.csv", rows);
	};

	// ================= ACTION =================
	const handleReject = async (id) => {
		const confirmBlock = window.confirm("Yakin ingin memblokir customer ini?");
		if (!confirmBlock) return;

		try {
			await fetch(`http://127.0.0.1:8000/api/admin/customer/${id}/reject`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});

			fetchCustomer(tab);
		} catch (err) {
			console.error("Gagal blokir:", err);
		}
	};

	const handleDetail = (id) => {
		navigate(`/admin/detail-customer/${id}`);
	};

	// ================= STATUS BADGE =================
	const getStatusBadge = (status) => {
		switch (status) {
			case "pending":
				return "bg-orange-400";
			case "verified":
				return "bg-green-500";
			case "rejected":
				return "bg-red-500";
			default:
				return "bg-gray-400";
		}
	};

	return (
		<AdminLayout>
			<h1 className="text-2xl font-bold mb-6 text-gray-800">Verifikasi Customer</h1>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
				{/* Toolbar */}
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div className="relative w-full md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input type="text" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" />
					</div>

					<div className="flex items-center gap-3 w-full md:w-auto ml-auto">
						{/* FILTER STATUS (Menunggu / Ditolak) */}
						<div className="relative">
							<button
								onClick={() => {
									setShowStatusMenu((v) => !v);
									setShowCalendar(false);
								}}
								className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 min-w-[170px]"
							>
								<span>
									<span className="text-gray-400">Status: </span>
									<span className="font-semibold">{TABS.find((t) => t.value === tab)?.label}</span>
								</span>
								<ChevronDown className="ml-2 w-4 h-4 text-gray-400 shrink-0" />
							</button>

							{showStatusMenu && (
								<div className="absolute left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
									{TABS.map((t) => (
										<button
											key={t.value}
											onClick={() => {
												setTab(t.value);
												setSearchTerm("");
												setShowStatusMenu(false);
											}}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${tab === t.value ? "text-emerald-600 font-semibold" : "text-gray-600"}`}
										>
											{t.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* FILTER KALENDER */}
						<div className="relative">
							<button
								onClick={() => {
									setShowCalendar((v) => !v);
									setShowStatusMenu(false);
								}}
								className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white"
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
										<button onClick={() => setShowCalendar(false)} className="flex-1 text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600">
											Terapkan
										</button>
									</div>
								</div>
							)}
						</div>

						<button onClick={handleDownload} className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">
							Download <Download className="ml-2 w-4 h-4" />
						</button>
					</div>
				</div>

				{/* TABLE */}
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-sky-50 text-gray-600 text-[11px] font-bold uppercase">
								<th className="px-4 py-4 text-center w-16">NO. ID</th>
								<th className="px-4 py-4">NAMA CUSTOMER</th>
								<th className="px-4 py-4">EMAIL</th>
								<th className="px-4 py-4">NO. TLP</th>
								<th className="px-4 py-4">ROLE</th>
								<th className="px-4 py-4 text-center">STATUS</th>
								<th className="px-4 py-4 text-center">AKSI</th>
							</tr>
						</thead>

						<tbody className="divide-y">
							{!loading && filteredCustomer.length === 0 && (
								<tr>
									<td colSpan={7} className="px-4 py-16 text-center">
										<p className="text-sm font-bold text-gray-500">
											{customerData.length === 0
												? tab === "pending"
													? "Tidak ada customer yang perlu diverifikasi"
													: "Belum ada customer yang ditolak"
												: "Tidak ada customer yang cocok dengan pencarian/filter"}
										</p>
										{customerData.length === 0 && tab === "pending" && <p className="text-xs text-gray-400 mt-1">Semua pengajuan verifikasi customer sudah diproses.</p>}
									</td>
								</tr>
							)}

							{filteredCustomer.map((c, i) => (
								<tr key={c.id}>
									<td className="px-4 py-5 text-center">{i + 1}</td>
									<td className="px-4 py-5">{c.name}</td>
									<td className="px-4 py-5">{c.email}</td>
									<td className="px-4 py-5">{c.phone}</td>
									<td className="px-4 py-5">{c.role}</td>
									<td className="px-4 py-5 text-center">
										<span className={`${getStatusBadge(c.status)} text-white text-xs px-3 py-1 rounded-full`}>{c.status}</span>
									</td>
									<td className="px-4 py-5 text-center">
										<div className="flex justify-center gap-2">
											<button onClick={() => handleDetail(c.id)} className="p-2 bg-indigo-900 text-white rounded">
												<Eye className="w-4 h-4" />
											</button>

											{c.status === "pending" && (
												<button onClick={() => handleReject(c.id)} className="p-2 bg-red-500 text-white rounded">
													<Lock className="w-4 h-4" />
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Footer */}
				<div className="mt-6 text-xs text-gray-400">{filteredCustomer.length} data</div>
			</div>
		</AdminLayout>
	);
}
