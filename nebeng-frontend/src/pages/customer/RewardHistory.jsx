import React, { useEffect, useState, useMemo } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, Star, ArrowUpRight, ArrowDownLeft, Calendar, Ticket, CheckCircle2, Clock3 } from "lucide-react";

export default function RewardHistory() {
	const navigate = useAppNavigate();
	const [history, setHistory] = useState([]);
	const [points, setPoints] = useState(1000); // Default sesuai visual point card
	const [activeFilter, setActiveFilter] = useState("Semua");

	useEffect(() => {
		const token = localStorage.getItem("token");

		const headers = {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		};

		// ambil total point
		fetch("http://127.0.0.1:8000/api/reward-points", { headers })
			.then((res) => res.json())
			.then((data) => {
				setPoints(data.reward_points || 0);
			})
			.catch((err) => console.error("Point error:", err));

		// ambil history poin
		fetch("http://127.0.0.1:8000/api/reward-history", { headers })
			.then((res) => res.json())
			.then((data) => {
				setHistory(data || []);
			})
			.catch((err) => {
				console.error("Error history:", err);
				setHistory([]);
			});
	}, []);

	const filteredHistory = useMemo(() => {
		if (activeFilter === "Masuk") return history.filter((item) => item.type === "earn");
		if (activeFilter === "Keluar") return history.filter((item) => item.type === "redeem");
		return history;
	}, [history, activeFilter]);

	return (
		<CustomerLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 space-y-8">
				{/* HEADER NAVIGATION */}
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Riwayat Poin</h1>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* SISI KIRI: Total Point Card (4 Kolom) */}
					<div className="lg:col-span-4 lg:sticky lg:top-6">
						<div className="bg-indigo-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden group">
							<div className="relative z-10">
								<div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-500">
									<Star size={28} fill="#fbbf24" className="text-amber-400" />
								</div>
								<p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Total Saldo Poin</p>
								<h2 className="text-4xl font-black tracking-tighter">
									{points.toLocaleString()} <span className="text-sm font-medium text-indigo-300">Point</span>
								</h2>
							</div>
							{/* Dekorasi Ornamen Sesuai Design System */}
							<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
							<div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
						</div>

						{/* Statistik Singkat */}
						<div className="mt-6 bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex justify-around">
							<div className="text-center">
								<p className="text-[10px] font-black text-gray-400 uppercase mb-1">Poin Masuk</p>
								<p className="text-emerald-500 font-bold text-sm">+{history.filter((i) => i.type === "earn").reduce((acc, i) => acc + i.points, 0)}</p>
							</div>
							<div className="w-[1px] bg-gray-100 h-10"></div>
							<div className="text-center">
								<p className="text-[10px] font-black text-gray-400 uppercase mb-1">Poin Keluar</p>
								<p className="text-red-500 font-bold text-sm">-{history.filter((i) => i.type === "redeem").reduce((acc, i) => acc + i.points, 0)}</p>
							</div>
						</div>
					</div>

					{/* SISI KANAN: List Riwayat (8 Kolom) */}
					<div className="lg:col-span-8 space-y-6">
						{/* Filter Tabs */}
						<div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
							{["Semua", "Masuk", "Keluar"].map((f) => (
								<button
									key={f}
									onClick={() => setActiveFilter(f)}
									className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
										activeFilter === f ? "bg-indigo-900 text-white shadow-lg shadow-indigo-100" : "bg-white border border-gray-100 text-gray-400 hover:bg-gray-50"
									}`}
								>
									{f}
								</button>
							))}
						</div>

						{/* History Table/List */}
						<div className="space-y-4">
							{filteredHistory.length > 0 ? (
								filteredHistory.map((item) => (
									<div key={item.id} className="bg-white rounded-[28px] p-4 md:p-5 shadow-sm border border-gray-50 hover:shadow-md transition-all duration-300">
										<div className="flex items-center justify-between gap-3">
											{/* SISI KIRI: Ikon dan Deskripsi */}
											<div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
												<div className={`p-3 rounded-2xl shrink-0 ${item.type === "earn" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}>
													{item.type === "earn" ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
												</div>

												{/* Pembungkus teks dengan min-w-0 agar truncate/wrap bekerja */}
												<div className="min-w-0 flex-1">
													<h4 className="text-sm font-black text-gray-800 break-words line-clamp-2 md:line-clamp-1 mb-1 leading-tight">{item.description}</h4>
													<div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
														<Calendar size={12} className="shrink-0" />
														<span className="truncate">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
													</div>
												</div>
											</div>

											{/* SISI KANAN: Nominal Poin */}
											<div className="text-right shrink-0 ml-2">
												<p className={`text-base md:text-lg font-black tracking-tighter ${item.type === "earn" ? "text-emerald-500" : "text-red-500"}`}>
													{item.type === "earn" ? "+" : "-"}
													{item.points}
												</p>
												<p className="text-[9px] font-black text-gray-300 uppercase">Points</p>
											</div>
										</div>

										{/* KODE UNIK VOUCHER (khusus transaksi redeem) */}
										{item.type === "redeem" && item.unique_code && (
											<div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
												<div className="flex items-center gap-2">
													<Ticket size={14} className="text-indigo-400 shrink-0" />
													<span className="text-xs font-black text-indigo-900 tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg">{item.unique_code}</span>
												</div>

												<div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${item.claim_status === "claimed" ? "text-gray-400" : "text-amber-600"}`}>
													{item.claim_status === "claimed" ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
													{item.claim_status === "claimed" ? "Sudah Diambil" : "Belum Diambil"}
												</div>
											</div>
										)}
									</div>
								))
							) : (
								<div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
									<p className="text-gray-400 font-medium italic">Tidak ada catatan poin {activeFilter.toLowerCase()}...</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}