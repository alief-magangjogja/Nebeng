import AdminLayout from "../../components/dashboard/AdminLayout";
import { Handshake, Users, ShieldCheck, UserCheck, Eye } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";

export default function Dashboard() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user } = useUser();

	const [data, setData] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");

				// dashboard
				const dashboardRes = await fetch("http://127.0.0.1:8000/api/admin/dashboard", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const dashboardJson = await dashboardRes.json();
				setData(dashboardJson);
			} catch (err) {
				console.error(err);
			}
		};

		fetchData();
	}, []);

	const getStatusColor = (status) => {
		if (status === "verified") return "bg-emerald-500";
		if (status === "rejected") return "bg-red-600";
		return "bg-orange-400";
	};

	const vehicleLabels = {
		motor: "Nebeng Motor",
		mobil: "Nebeng Mobil",
		bus: "Nebeng Bus",
		kereta: "Nebeng Kereta",
		kapal: "Nebeng Kapal",
		pesawat: "Nebeng Pesawat",

		"barang-motor": "Barang Motor",
		"barang-mobil": "Barang Mobil",
		"barang-bus": "Barang Bus",
		"barang-kereta": "Barang Kereta",
		"barang-kapal": "Barang Kapal",
		"barang-pesawat": "Barang Pesawat",

		"Barang-Motor": "Barang Motor",
		"Barang-Mobil": "Barang Mobil",
		"Barang-Bus": "Kendaraan Barang (Truk)",
		"Barang-Kereta": "Barang Kereta",
		"Barang-Kapal": "Barang Kapal",
		"Barang-Pesawat": "Barang Pesawat",
	};

	const colors = ["bg-indigo-600", "bg-blue-500", "bg-sky-500", "bg-cyan-500", "bg-emerald-500", "bg-teal-500", "bg-orange-500", "bg-amber-500", "bg-red-500", "bg-pink-500", "bg-violet-500", "bg-fuchsia-500"];

	const chartData =
		data?.orders_chart
			?.filter((item) => item.vehicle_type?.toLowerCase() !== "barang")
			?.map((item, index) => ({
				label: vehicleLabels[item.vehicle_type] || item.vehicle_type,
				val: item.total,
				color: colors[index % colors.length],
			})) || [];

	const totalOrders = chartData.reduce((sum, item) => sum + item.val, 0);

	const maxValue = Math.max(...chartData.map((item) => item.val), 1);

	const yAxis = Array.from({ length: 6 }, (_, i) => Math.round((maxValue / 5) * (5 - i)));

	return (
		<AdminLayout>
			<div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
				{/* Welcome Text for Dashboard Only */}
				{location.pathname.endsWith("/dashboard") && (
					<div className="mb-8 pt-4">
						<h2 className="text-3xl font-black text-indigo-900 tracking-tight">Selamat Datang, {user?.name || "Admin"} 👋</h2>
						<p className="text-gray-400 font-medium mt-1">Siap untuk memantau progress aplikasi hari ini?</p>
					</div>
				)}
				{/* STATS CARDS */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					{[
						{ label: "Total Mitra", val: data?.stats?.mitra || 0, Icon: Handshake },
						{ label: "Total Customer", val: data?.stats?.customer || 0, Icon: Users },
						{ label: "Mitra Terverifikasi", val: data?.stats?.verif_mitra || 0, Icon: ShieldCheck },
						{ label: "Customer Terverifikasi", val: data?.stats?.verif_customer || 0, Icon: UserCheck },
					].map((stat, i) => (
						<div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
							<div>
								<h2 className="text-2xl font-bold text-indigo-900">{stat.val}</h2>
								<p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">{stat.label}</p>
							</div>
							<div className="p-2 bg-indigo-50 rounded-lg">
								<stat.Icon size={24} className="text-indigo-700" />
							</div>
						</div>
					))}
				</div>

				{/* CHART + TUJUAN TERBANYAK */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
					{/* CUSTOM BAR CHART */}
					<div className="lg:col-span-5 bg-white rounded-4xl p-8 shadow-sm border border-gray-100 relative group">
						<div className="flex justify-between items-start mb-8">
							<div>
								<h2 className="text-xl font-black text-indigo-900 tracking-tight">Pesanan</h2>
								<p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">
									Total: <span className="text-indigo-600 font-black">{totalOrders.toLocaleString("id-ID")}</span> Pesanan
								</p>
							</div>

							{/* <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
								<span className="text-gray-500 text-[10px] font-black uppercase tracking-tighter">Jun 2025</span>
							</div> */}
						</div>

						{/* CHART */}
						<div className="relative h-72 w-full">
							{/* GRID + Y AXIS */}
							{/* <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
								{yAxis.map((val, index) => (
									<div key={index} className="flex items-center gap-3">
										<span className="w-8 text-right text-[9px] font-black text-gray-300">{val}</span>

										<div className={`flex-1 h-px ${val === 0 ? "bg-gray-200" : "bg-gray-50"}`}></div>
									</div>
								))}
							</div> */}

							{/* BAR AREA */}
							<div className="absolute inset-0  pr-4 flex items-end justify-around gap-2">
								{chartData.map((bar, i) => {
									const barHeight = (bar.val / maxValue) * 100;

									return (
										<div key={i} className="flex flex-col items-center justify-end h-full flex-1 group/bar">
											{/* VALUE */}
											<div className="mb-2 transition-all duration-300 group-hover/bar:-translate-y-1">
												<span className="text-[10px] md:text-[11px] font-black text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded-md">{bar.val}</span>
											</div>

											{/* BAR */}
											<div className="relative h-[200px] flex items-end">
												<div
													className={`${bar.color}
									w-7 md:w-9
									rounded-t-xl
									shadow-lg
									transition-all
									duration-500
									group-hover/bar:brightness-110
									group-hover/bar:scale-105`}
													style={{
														height: `${barHeight}%`,
														animationDelay: `${i * 100}ms`,
													}}
												>
													<div className="w-full h-full bg-white/10 rounded-t-xl"></div>
												</div>
											</div>

											{/* LABEL */}
											<p className="text-[9px] font-black text-gray-400 mt-3 text-center uppercase tracking-tight leading-tight min-h-[32px] group-hover/bar:text-indigo-600 transition-colors">{bar.label}</p>
										</div>
									);
								})}
							</div>
						</div>

						{/* LEGEND */}
						<div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
							{chartData.map((item, i) => (
								<div key={i} className="flex items-center gap-2">
									<div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>

									<span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{item.label}</span>
								</div>
							))}
						</div>
					</div>

					{/* TUJUAN TERBANYAK TABLE */}
					<div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-sm border border-gray-100 overflow-hidden">
						<div className="flex justify-between items-center mb-6">
							<h2 className="font-bold text-gray-800">Tujuan Terbanyak</h2>
							<span className="text-gray-400 text-xs">Jun 2025</span>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="text-gray-400 text-xs uppercase tracking-wider">
									<tr>
										<th className="text-left font-medium py-3 px-2">No</th>
										<th className="text-left font-medium py-3 px-2">Kota Asal - POS</th>
										<th className="text-left font-medium py-3 px-2">Kota Tujuan - POS</th>
										<th className="text-right font-medium py-3 px-2">Tot. Perjalanan</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{data?.top_routes?.map((row, i) => (
										<tr key={i} className="hover:bg-gray-50 transition-colors">
											<td className="py-4 px-2 font-bold text-gray-700">{i + 1}.</td>
											<td className="py-4 px-2 text-gray-500">
												{row.origin_point?.city?.name} - {row.origin_point?.pos_name}
											</td>
											<td className="py-4 px-2 text-gray-500">
												{row.destination_point?.city?.name} - {row.destination_point?.pos_name}
											</td>
											<td className="py-4 px-2 text-right font-medium text-gray-600">{row.total}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* TABLES SECTION (Mitra & Customer) */}
				<div className="space-y-8 pb-10">
					{/* DATA MITRA */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="p-6 flex justify-between items-center border-b border-gray-50">
							<h2 className="font-bold text-gray-800">Data Mitra</h2>
							<Link to="/admin/mitra" className="text-indigo-600 text-xs font-bold hover:underline">
								Lihat Lebih
							</Link>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left">
								<thead className="bg-sky-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
									<tr>
										<th className="px-6 py-4">NO. ID</th>
										<th className="px-6 py-4">NAMA</th>
										<th className="px-6 py-4">EMAIL</th>
										<th className="px-6 py-4">NO. TLP</th>
										<th className="px-6 py-4 text-center">STATUS</th>
										<th className="px-6 py-4 text-center">AKSI</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{data?.latest_mitra?.map((mitra, i) => (
										<tr key={i} className="hover:bg-gray-50">
											<td className="px-6 py-4 text-sm text-gray-500 font-medium">{i + 1}</td>
											<td className="px-6 py-4 text-sm font-bold text-gray-700">{mitra.name}</td>
											<td className="px-6 py-4 text-sm text-gray-500">{mitra.email}</td>
											<td className="px-6 py-4 text-sm text-gray-500">{mitra.phone}</td>
											{/* <td className="px-6 py-4 text-sm text-gray-500">{mitra.service}</td> */}
											<td className="px-6 py-4 text-center">
												<span className={`${getStatusColor(mitra.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full inline-block min-w-25`}>{mitra.status}</span>
											</td>
											<td className="px-6 py-4 text-center"></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* DATA CUSTOMER */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="p-6 flex justify-between items-center border-b border-gray-50">
							<h2 className="font-bold text-gray-800">Data Customer</h2>
							<Link to="/admin/customer" className="text-indigo-600 text-xs font-bold hover:underline">
								Lihat Lebih
							</Link>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left">
								<thead className="bg-sky-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
									<tr>
										<th className="px-6 py-4 w-16">NO. ID</th>
										<th className="px-6 py-4">NAMA CUSTOMER</th>
										<th className="px-6 py-4">EMAIL</th>
										<th className="px-6 py-4 text-center">NO. TLP</th>
										<th className="px-6 py-4 text-center">STATUS</th>
										<th className="px-6 py-4 text-center">AKSI</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{data?.latest_customer?.map((customer, i) => (
										<tr key={i} className="hover:bg-gray-50">
											<td className="px-6 py-4 text-sm text-gray-500 font-medium">{i + 1}</td>
											<td className="px-6 py-4 text-sm font-bold text-gray-700">{customer.name}</td>
											<td className="px-6 py-4 text-sm text-gray-500">{customer.email}</td>
											<td className="px-6 py-4 text-sm text-gray-500 text-center">{customer.phone}</td>
											<td className="px-6 py-4 text-center">
												<span className={`${getStatusColor(customer.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full`}>{customer.status}</span>
											</td>
											<td className="px-6 py-4 text-center">
												<button onClick={() => navigate(`/admin/detail-customer/${customer.id}`)} className="p-2 bg-indigo-900 text-white rounded-md hover:bg-indigo-800 transition-colors inline-flex items-center justify-center">
													<Eye className="w-4 h-4" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}