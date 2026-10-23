import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, ArrowRight, Navigation, MapPin, Clock, Users, Filter, Search, ArrowUpDown, CheckCircle2, Star } from "lucide-react";

export default function OrderMotor() {
	const [searchParams] = useSearchParams();

	const origin_id = searchParams.get("origin_id");
	const destination_id = searchParams.get("destination_id");
	const date = searchParams.get("date");

	const [searchTerm, setSearchTerm] = useState("");
	const [sortBy, setSortBy] = useState("default");
	const [rides, setRides] = useState([]);
	const [originInfo, setOriginInfo] = useState(null);
	const [destinationInfo, setDestinationInfo] = useState(null);

	// Ambil nama kota & pos asli sesuai origin_id/destination_id di URL
	useEffect(() => {
		const fetchPoints = async () => {
			try {
				const res = await fetch("http://127.0.0.1:8000/api/pickup-points");
				const data = await res.json();

				setOriginInfo(data.find((p) => String(p.id) === String(origin_id)) || null);
				setDestinationInfo(data.find((p) => String(p.id) === String(destination_id)) || null);
			} catch (err) {
				console.error("Error fetch pickup points:", err);
			}
		};

		if (origin_id && destination_id) fetchPoints();
	}, [origin_id, destination_id]);

	useEffect(() => {
		const fetchTrips = async () => {
			if (!origin_id || !destination_id || !date) return;

			try {
				const response = await fetch("http://127.0.0.1:8000/api/trips/search", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify({
						origin_point_id: origin_id,
						destination_point_id: destination_id,
						date: date,
						vehicle_type: "motor",
					}),
				});

				const data = await response.json();

				const formattedTrips = data
					.filter((trip) => trip.seat_available > 0)
					.map((trip) => ({
						id: trip.id,

						from: trip.origin_point.city.name,
						fromPos: trip.origin_point.pos_name,
						fromDetail: trip.origin_point.address,

						to: trip.destination_point.city.name,
						toPos: trip.destination_point.pos_name,
						toDetail: trip.destination_point.address,

						time: trip.departure_time,
						date: trip.departure_date,
						price: trip.price,

						// PENTING: sebelumnya field ini tidak pernah diisi sama
						// sekali, padahal dipakai untuk fitur cari nama driver
						// (ride.driver.toLowerCase() akan crash kalau undefined).
						mitraId: trip.mitra?.id ?? null,
						driver: trip.mitra?.name ?? "Mitra",
						mitraRating: trip.mitra?.reviews_as_mitra_avg_rating != null ? Number(trip.mitra.reviews_as_mitra_avg_rating).toFixed(1) : null,
						mitraReviewCount: trip.mitra?.reviews_as_mitra_count ?? 0,
					}));

				setRides(formattedTrips);
			} catch (error) {
				console.error("Error fetch trips:", error);
			}
		};

		fetchTrips();
	}, [origin_id, destination_id, date]);

	const processedRides = useMemo(() => {
		let result = [...rides];

		// FILTER SEARCH DRIVER
		if (searchTerm) {
			result = result.filter((ride) => (ride.driver || "").toLowerCase().includes(searchTerm.toLowerCase()));
		}

		// SORTING
		if (sortBy === "termurah") {
			result.sort((a, b) => a.price - b.price);
		} else if (sortBy === "tercepat") {
			result.sort((a, b) => a.time.localeCompare(b.time));
		}

		return result;
	}, [rides, searchTerm, sortBy]);

	return (
		<CustomerLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6">
				{/* HEADER: Navigasi Rute */}
				<div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="flex items-center gap-4">
						<Link to="/customer/nebeng-motor">
							<button aria-label="Kembali" className="p-2 md:p-3 bg-gray-50 rounded-2xl hover:bg-indigo-900 hover:text-white transition-all duration-300 shadow-sm group">
								<ChevronLeft size={20} className="group-active:-translate-x-1 transition-transform" />
							</button>
						</Link>
							<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-base font-black text-indigo-900 tracking-tight">{originInfo ? originInfo.city : "-"}</span>
								{originInfo && <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase shrink-0">{originInfo.pos_name}</span>}
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<ArrowRight size={12} className="text-gray-300 shrink-0" />
								<span className="text-base font-black text-indigo-900 tracking-tight">{destinationInfo ? destinationInfo.city : "-"}</span>
								{destinationInfo && <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg uppercase shrink-0">{destinationInfo.pos_name}</span>}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-3 w-full md:w-auto justify-end">
						<div className="relative flex-1 md:flex-none">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
							<input
								type="text"
								placeholder="Cari nama driver..."
								className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full md:w-64"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<select
							className="bg-indigo-50 text-indigo-900 px-3 md:px-4 py-2.5 rounded-2xl text-sm font-bold outline-none border-none cursor-pointer hover:bg-indigo-100 transition-colors"
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
						>
							<option value="default">Urutkan</option>
							<option value="termurah">Termurah</option>
							<option value="tercepat">Lebih awal</option>
						</select>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* SIDEBAR */}
					<div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
						<div className="bg-indigo-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden group">
							<div className="relative z-20">
								<h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-4">Informasi Perjalanan</h3>
								<div className="space-y-6">
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
											<Clock size={20} className="text-sky-400" />
										</div>
										<div>
											<p className="text-[10px] font-bold text-indigo-200 uppercase">Tanggal</p>
											<p className="text-sm font-black">{date || "25 Juli 2024"}</p>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
											<Users size={20} className="text-emerald-400" />
										</div>
										<div>
											<p className="text-[10px] font-bold text-indigo-200 uppercase">Penumpang</p>
											<p className="text-sm font-black">1 Orang</p>
										</div>
									</div>
								</div>
							</div>
							<div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
						</div>

						<div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
							<div className="flex items-center gap-2 mb-6">
								<Filter size={18} className="text-indigo-600" />
								<h4 className="font-black text-indigo-900 text-sm uppercase tracking-wider">Tips Memilih</h4>
							</div>
							<p className="text-xs text-gray-500 leading-relaxed italic">"Pastikan memilih driver dengan jam keberangkatan yang sesuai. Periksa juga detail 'Pos' penjemputan untuk kenyamanan Anda."</p>
						</div>
					</div>

					{/* LIST ORDER */}
					<div className="lg:col-span-8 space-y-6">
						{processedRides.length > 0 ? (
							processedRides.map((ride) => (
								<div key={ride.id} className="group bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
									<div className="p-8">
										<div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
											<div>
												<p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{ride.date}</p>
												<p className="text-lg font-black text-indigo-900">{ride.time}</p>
											</div>
											<div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2">
												<CheckCircle2 size={16} className="text-emerald-600" />
												<span className="text-xs font-black text-emerald-700 uppercase">Tersedia</span>
											</div>
										</div>

										{/* MITRA & RATING - klik untuk lihat profil publik sebelum booking */}
										{ride.mitraId && (
											<Link
												to={`/customer/mitra/${ride.mitraId}`}
												className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-all group/mitra"
											>
												<span className="text-xs font-bold text-gray-700 group-hover/mitra:text-indigo-900">{ride.driver}</span>
												{ride.mitraRating ? (
													<span className="flex items-center gap-1 text-xs font-black text-amber-600">
														<Star size={12} className="fill-amber-400 text-amber-400" /> {ride.mitraRating}
														<span className="text-[10px] text-gray-400 font-medium">({ride.mitraReviewCount})</span>
													</span>
												) : (
													<span className="text-[10px] text-gray-400 font-bold uppercase">Belum ada rating</span>
												)}
											</Link>
										)}

										{/* Timeline */}
										<div className="relative pl-8 space-y-8 mb-8 ">
											<div className="absolute left-[13px] top-[10px] bottom-[10px] w-[2px] bg-dashed bg-gray-100"></div>

											<div className="relative">
												<div className="absolute left-[-24px] top-1 w-4 h-4 rounded-full border-4 border-white bg-emerald-500 shadow-md"></div>
												<div className="flex items-center gap-2 mb-1">
													<h5 className="font-black text-gray-800 text-base">{ride.from}</h5>
													<span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">{ride.fromPos}</span>
												</div>
												<p className="text-xs text-gray-400 leading-relaxed font-medium">{ride.fromDetail}</p>
											</div>

											<div className="relative">
												<div className="absolute left-[-24px] top-1 w-4 h-4 rounded-full border-4 border-white bg-orange-500 shadow-md"></div>
												<div className="flex items-center gap-2 mb-1">
													<h5 className="font-black text-gray-800 text-base">{ride.to}</h5>
													<span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg uppercase">{ride.toPos}</span>
												</div>
												<p className="text-xs text-gray-400 leading-relaxed font-medium">{ride.toDetail}</p>
											</div>
										</div>

										<div className="pt-8 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-6">
											<div className="flex flex-col">
												<span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Total Biaya</span>
												<span className="text-2xl font-black text-indigo-900 tracking-tighter">Rp. {ride.price.toLocaleString("id-ID")}</span>
											</div>
											<Link
												to={`/customer/detail-order/${ride.id}?type=motor&origin_id=${origin_id}&destination_id=${destination_id}&date=${date}`}
												className="w-full sm:w-auto inline-block px-10 py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-800 active:scale-95 transition-all text-center"
											>
												Pilih
											</Link>
										</div>
									</div>
								</div>
							))
						) : (
							<div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
								<div className="bg-gray-50 p-6 rounded-full mb-4">
									<Navigation size={48} className="text-gray-200" />
								</div>
								{rides.length === 0 ? (
									<>
										<h3 className="text-lg font-bold text-indigo-900">Tebengan Tidak Ditemukan</h3>
										<p className="text-sm text-gray-400 max-w-xs">Belum ada mitra yang membuka tebengan untuk rute dan tanggal ini. Pastikan titik pos asal & tujuan yang dipilih sudah tepat, atau coba tanggal lain.</p>
									</>
								) : (
									<>
										<h3 className="text-lg font-bold text-indigo-900">Driver Tidak Ditemukan</h3>
										<p className="text-sm text-gray-400">Coba gunakan kata kunci pencarian driver yang lain.</p>
									</>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}