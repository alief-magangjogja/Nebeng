import React, { useState, useEffect } from "react";
import PosMitraLayout from "../../components/dashboard/PosMitraLayout";
import { Eye, EyeOff, ChevronRight, Bike, Car, Package, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
	const [showBalance, setShowBalance] = useState(true);

	// Saldo
	const [balance, setBalance] = useState(200000);
	const [loadingBalance, setLoadingBalance] = useState(true);

	// Statistik
	const [loadingStats, setLoadingStats] = useState(true);

	const [stats, setStats] = useState({
		nebeng_motor: 0,
		nebeng_mobil: 0,
		nebeng_barang: 0,
	});

	// ===============================
	// STATE TEBENGAN
	// ===============================
	const [upcomingTrips, setUpcomingTrips] = useState([]);
	const [loadingTrips, setLoadingTrips] = useState(true);

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				const token = localStorage.getItem("token");

				const headers = {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				};

				// =========================
				// FETCH STATISTIK
				// =========================
				setLoadingStats(true);

				const statsResponse = await fetch("http://127.0.0.1:8000/api/pos/dashboard-stats", {
					headers,
				});

				if (!statsResponse.ok) {
					throw new Error("Gagal mengambil statistik");
				}

				const statsData = await statsResponse.json();

				setStats({
					nebeng_motor: statsData.nebeng_motor || 0,
					nebeng_mobil: statsData.nebeng_mobil || 0,
					nebeng_barang: statsData.nebeng_barang || 0,
				});

				// =========================
				// FETCH TEBENGAN — LANGSUNG DARI TRIP, BUKAN DARI ORDER
				// (supaya trip yang belum ada customer order-nya pun tetap
				// muncul, sama seperti di dashboard Mitra)
				// =========================
				setLoadingTrips(true);

				const tripsResponse = await fetch("http://127.0.0.1:8000/api/pos-mitra/trips", {
					headers,
				});

				if (!tripsResponse.ok) {
					throw new Error("Gagal mengambil data tebengan");
				}

				const tripsData = await tripsResponse.json();

				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const mappedTrips = tripsData
					.filter((trip) => {
						// hanya trip yang masih aktif (bukan yang sudah
						// dibatalkan/selesai — lihat mapping status di
						// TripController::posMitraTrips)
						if (trip.status !== "Proses") return false;

						const departureDate = new Date(trip.departure_date);
						departureDate.setHours(0, 0, 0, 0);
						return departureDate >= today;
					})
					.sort((a, b) => {
						const dateDiff = new Date(a.departure_date) - new Date(b.departure_date);
						if (dateDiff !== 0) return dateDiff;
						return (a.departure_time || "").localeCompare(b.departure_time || "");
					})
					.slice(0, 5)
					.map((trip) => {
						const departureDate = new Date(trip.departure_date);

						return {
							id: trip.id,

							day: departureDate.toLocaleDateString("id-ID", {
								weekday: "short",
							}),

							date: departureDate.toLocaleDateString("id-ID", {
								day: "2-digit",
								month: "long",
								year: "numeric",
							}),

							time_window: trip.departure_time ? trip.departure_time.slice(0, 5) : "-",

							service_type: trip.vehicle_type === "motor" ? "Nebeng Motor" : trip.vehicle_type === "mobil" ? "Nebeng Mobil" : "Nebeng Barang",

							status: "pending",

							origin: trip.origin_point?.pos_name || trip.origin_point?.city?.name || "Lokasi Penjemputan",

							origin_detail: trip.origin_point?.address || "-",

							destination: trip.destination_point?.pos_name || trip.destination_point?.city?.name || "Lokasi Tujuan",

							destination_detail: trip.destination_point?.address || "-",

							estimated_income: trip.price || 0,
						};
					});

				setUpcomingTrips(mappedTrips);

				// =========================
				// FETCH BALANCE
				// =========================
				setLoadingBalance(true);

				const balanceResponse = await fetch("http://127.0.0.1:8000/api/balance", {
					headers,
				});

				if (balanceResponse.ok) {
					const balanceData = await balanceResponse.json();

					setBalance(balanceData.balance || 0);
				}
			} catch (error) {
				console.error("Gagal memuat dashboard:", error);
			} finally {
				setLoadingStats(false);
				setLoadingBalance(false);
				setLoadingTrips(false);
			}
		};

		fetchDashboardData();
	}, []);

	const formatRupiah = (angka) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(angka);
	};

	return (
		<PosMitraLayout>
			<div className="w-full max-w-md mx-auto md:max-w-7xl px-4 py-4 space-y-6 pb-28 md:pb-12 bg-gray-50 min-h-screen">
				{/* STATISTIK LAYANAN */}
				<div className="space-y-3">
					<div className="flex justify-between items-center">
						<h3 className="font-bold text-gray-800 text-lg">Statistik Layanan</h3>

						<div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-xs text-blue-700 font-medium">
							<Calendar size={14} />
							<span>Realtime</span>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div className="bg-[#eef2ff] p-4 rounded-xl flex items-center gap-3 border border-indigo-50">
							<div className="w-12 h-12 rounded-full bg-[#1e429f] text-white flex items-center justify-center shrink-0">
								<Bike size={24} />
							</div>
							<div className="truncate">
								<p className="text-xl font-bold text-gray-900 leading-none">{loadingStats ? "..." : stats.nebeng_motor}</p>
								<p className="text-xs text-gray-500 font-medium mt-1 truncate">Nebeng Motor</p>
							</div>
						</div>

						<div className="bg-[#eef2ff] p-4 rounded-xl flex items-center gap-3 border border-indigo-50">
							<div className="w-12 h-12 rounded-full bg-[#1e429f] text-white flex items-center justify-center shrink-0">
								<Car size={24} />
							</div>
							<div className="truncate">
								<p className="text-xl font-bold text-gray-900 leading-none">{loadingStats ? "..." : stats.nebeng_mobil}</p>
								<p className="text-xs text-gray-500 font-medium mt-1 truncate">Nebeng Mobil</p>
							</div>
						</div>

						<div className="bg-[#eef2ff] p-4 rounded-xl flex items-center gap-3 border border-indigo-50">
							<div className="w-12 h-12 rounded-full bg-[#1e429f] text-white flex items-center justify-center shrink-0">
								<Package size={24} />
							</div>
							<div className="truncate">
								<p className="text-xl font-bold text-gray-900 leading-none">{loadingStats ? "..." : stats.nebeng_barang}</p>
								<p className="text-xs text-gray-500 font-medium mt-1 truncate">Nebeng Barang</p>
							</div>
						</div>
					</div>
				</div>

				{/* TEBENGAN AKAN DATANG */}
				<div className="space-y-3">
					<div className="flex justify-between items-center">
						<h3 className="font-bold text-gray-800 text-lg">Tebengan akan datang</h3>

						<Link to="/pos-mitra/aktivitas" className="text-gray-600 text-xs font-semibold flex items-center gap-1 hover:text-indigo-600 transition-colors">
							<span>Lihat semua</span>
							<ChevronRight size={16} />
						</Link>
					</div>

					<div className="space-y-4">
						{loadingTrips ? (
							<div className="p-8 text-center text-sm font-medium text-gray-400 bg-white border rounded-2xl">Memuat jadwal tebengan...</div>
						) : upcomingTrips.length > 0 ? (
							upcomingTrips.map((trip) => (
								<Link
									key={trip.id}
									to={`/pos-mitra/detail-aktivitas/${trip.id}`}
									className="block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-100 transition-all active:scale-[0.99]"
								>
									<div className="p-4 space-y-4">
										<div className="flex justify-between items-center text-xs">
											<span className="text-gray-400 font-medium">
												{trip.day}, {trip.date} | {trip.time_window} | {trip.service_type}
											</span>

											<span className="bg-orange-50 text-orange-400 font-bold px-3 py-0.5 rounded-md text-[11px]">{trip.status}</span>
										</div>

										<div className="relative pl-6 space-y-5">
											<div className="absolute left-[5px] top-2 bottom-2 w-[1.5px] bg-gray-200"></div>

											<div className="relative text-xs">
												<div className="absolute -left-[24px] top-1 w-3 h-3 rounded-full border-2 border-blue-700 bg-white z-10"></div>
												<p className="font-bold text-gray-800 leading-none">{trip.origin}</p>
												<p className="text-gray-400 font-medium mt-1 text-[11px]">{trip.origin_detail}</p>
											</div>

											<div className="relative text-xs">
												<div className="absolute -left-[24px] top-1 w-3 h-3 rounded-full border-2 border-red-500 bg-white z-10"></div>
												<p className="font-bold text-gray-800 leading-none">{trip.destination}</p>
												<p className="text-gray-400 font-medium mt-1 text-[11px]">{trip.destination_detail}</p>
											</div>
										</div>
									</div>

									<div className="bg-gray-50/50 border-t border-gray-100 px-4 py-3 flex justify-between items-center text-sm">
										<span className="text-gray-700 font-bold text-xs">Estimasi Pendapatan</span>
										<span className="font-bold text-gray-900">{formatRupiah(trip.estimated_income)}</span>
									</div>
								</Link>
							))
						) : (
							<div className="p-8 text-center text-xs font-bold text-gray-400 bg-white border border-dashed rounded-2xl uppercase tracking-wider">Belum Ada Jadwal Tebengan Terdekat</div>
						)}
					</div>
				</div>
			</div>
		</PosMitraLayout>
	);
}