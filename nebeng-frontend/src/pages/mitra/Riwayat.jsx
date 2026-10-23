import React, { useState, useEffect } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { Navigation, ArrowUpRight, Search, History } from "lucide-react";

export default function Riwayat() {
    const navigate = useAppNavigate();
    const [activeTab, setActiveTab] = useState("Semua");

    const [riwayatTebengan, setRiwayatTebengan] = useState([]);
    const [search, setSearch] = useState("");

    const tabs = ["Semua", "Proses", "Menunggu Refund", "Selesai", "Dibatalkan"];

    // ================= FETCH DATA =================
    useEffect(() => {
        const fetchTrips = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch("http://127.0.0.1:8000/api/mitra/trips", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                const data = await res.json();

                const mapped = data.map((trip) => {
                    const seatTotal = trip.seat_total || 0;
                    const seatAvailable = trip.seat_available || 0;

                    const seatTerisi = Math.max(0, seatTotal - seatAvailable);

                    let pendapatan = 0;

                    if (trip.status === "Selesai") {
                        pendapatan = (trip.price || 0) * seatTerisi;
                    } else {
                        pendapatan = (trip.price || 0) * seatTotal;
                    }

                    return {
                        id: trip.id,
                        hari: new Date(trip.departure_date).toLocaleDateString("id-ID", { weekday: "short" }),
                        tanggal: new Date(trip.departure_date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                        }),
                        jam: trip.departure_time,
                        layanan: trip.vehicle_type === "motor" ? "Nebeng Motor" : trip.vehicle_type === "mobil" ? "Nebeng Mobil" : trip.vehicle_type === "barang" ? "Nebeng Barang" : "Layanan",
                        status: trip.status,

                        origin: trip.origin_point?.city?.name || "-",
                        originPos: trip.origin_point?.pos_name || "",
                        originDetail: trip.origin_point?.address || "-",

                        destination: trip.destination_point?.city?.name || "-",
                        destinationPos: trip.destination_point?.pos_name || "",
                        destinationDetail: trip.destination_point?.address || "-",

                        pendapatan: pendapatan,
                        type: trip.status === "Selesai" ? "Pendapatan" : "Estimasi Pendapatan",
                        seatTerisi,
                    };
                });

                setRiwayatTebengan(mapped);
            } catch (err) {
                console.error(err);
            }
        };

        fetchTrips();
    }, []);

    // ================= FILTER =================
    const filteredData = riwayatTebengan
        .filter((item) => (activeTab === "Semua" ? true : item.status === activeTab))
        .filter((item) => (search ? item.origin.toLowerCase().includes(search.toLowerCase()) || item.destination.toLowerCase().includes(search.toLowerCase()) || item.tanggal.toLowerCase().includes(search.toLowerCase()) : true));

    return (
        <MitraLayout>
            <div className="w-full max-w-7xl mx-auto px-4 py-6">
				{/* BAGIAN STICKY (Header & Tabs) */}
                <div className="sticky top-0 z-20 bg-slate-50 pt-2 pb-2">
					{/* HEADER */}
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
						<div className="flex items-center gap-3">
							<div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-900 border border-indigo-100 flex items-center justify-center">
								<History size={24} />
							</div>
							<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Riwayat Tebengan</h1>
						</div>

						{/* Search Bar Desktop */}
						<div className="hidden md:relative md:block group">
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Cari rute atau tanggal..."
								className="pl-12 pr-6 py-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
							/>
						</div>
					</div>

					{/* TABS FILTER (Scrollable on Mobile) */}
					<div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-6 ">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shrink-0 ${
									activeTab === tab ? "bg-indigo-900 text-white shadow-xl shadow-indigo-100 scale-105" : "bg-white border border-gray-100 text-gray-400 hover:bg-gray-50"
								}`}
							>
								{tab}
							</button>
						))}
					</div>
				</div>

                {/* LIST RIWAYAT */}
                <div className="grid grid-cols-1 gap-6">
                    {filteredData.length > 0 ? (
                        filteredData.map((item) => (
                            <div key={item.id} className="bg-white rounded-4xl p-6 md:p-8 shadow-sm border border-gray-50 hover:shadow-md transition-all group">
                                <div className="flex flex-col lg:flex-row justify-between gap-8">
                                    {/* Info Utama & Rute */}
                                    <div className="flex-1 space-y-6">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-lg">
                                                #{item.id} • {item.hari}, {item.tanggal} | {item.jam} | {item.layanan}
                                            </span>

                                            {/* Status Badge */}
                                            <span
                                                className={`text-[10px] font-black px-4 py-1 rounded-full uppercase ${
                                                    item.status === "Selesai"
                                                        ? "bg-emerald-50 text-emerald-500"
                                                        : item.status === "Proses"
                                                        ? "bg-indigo-50 text-indigo-500"
                                                        : item.status === "Menunggu Refund"
                                                        ? "bg-amber-50 text-amber-600"
                                                        : "bg-orange-50 text-orange-500"
                                                }`}
                                            >
                                                {item.status}
                                            </span>
                                        </div>

                                        <div className="relative pl-8 space-y-10">
                                            <div className="absolute left-3.25 top-2.5 bottom-2.5 w-[1.5px] bg-gray-100"></div>
                                            <div className="relative">
                                                <div className="absolute -left-5.75 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-black text-gray-800 text-base">{item.origin}</h3>
                                                    {item.originPos && <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">{item.originPos}</span>}
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{item.originDetail}</p>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-5.75 top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-black text-gray-800 text-base">{item.destination}</h3>
                                                    {item.destinationPos && <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg uppercase">{item.destinationPos}</span>}
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{item.destinationDetail}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kolom Pendapatan & Action */}
                                    <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-50 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">{item.type}</p>
                                            <h2 className="text-2xl font-black text-indigo-900 tracking-tighter">Rp {item.pendapatan.toLocaleString("id-ID")},00</h2>
                                        </div>

                                        <button
                                            onClick={() => navigate(`/mitra/detail-tebengan/${item.id}`)}
                                            className="mt-8 w-full py-4 bg-gray-50 text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-900 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-50 group-hover:text-indigo-900"
                                        >
                                            Lihat Detail <ArrowUpRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                            <Navigation size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tidak ada riwayat untuk status ini</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </MitraLayout>
    );
}