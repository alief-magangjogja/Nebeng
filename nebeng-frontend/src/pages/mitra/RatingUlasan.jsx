import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, Star, ChevronRight, X, Calendar, MapPin, Navigation, Wallet } from "lucide-react";

export default function RatingUlasan() {
    const navigate = useNavigate();

    const [ratingAvg, setRatingAvg] = useState(null);
    const [ratingCount, setRatingCount] = useState(0);
    const [latestReviews, setLatestReviews] = useState([]);
    const [loadingRating, setLoadingRating] = useState(true);

    // Modal rangkuman pesanan yang direview - dibuka saat kartu ulasan
    // diklik, TIDAK pindah halaman.
    const [selectedReview, setSelectedReview] = useState(null);
    const [tripDetail, setTripDetail] = useState(null);
    const [loadingTripDetail, setLoadingTripDetail] = useState(false);

    useEffect(() => {
        const fetchRatingSummary = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch("http://127.0.0.1:8000/api/mitra/dashboard-summary", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                if (!res.ok) return;

                const data = await res.json();

                setRatingAvg(data.rating_avg ?? null);
                setRatingCount(data.rating_count || 0);
                setLatestReviews(data.latest_reviews || []);
            } catch (err) {
                console.error("Gagal ambil rating & ulasan:", err);
            } finally {
                setLoadingRating(false);
            }
        };

        fetchRatingSummary();
    }, []);

    const formatRupiah = (angka) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
        }).format(angka || 0);
    };

    const formatTanggal = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("id-ID", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatPointLabel = (point) => {
        if (!point) return "-";
        const cityName = point.city?.name || "-";
        return point.pos_name ? `${cityName} - ${point.pos_name}` : cityName;
    };

    // Buka modal + ambil rangkuman pesanan (trip) yang direview ini.
    const handleOpenDetail = async (review) => {
        if (!review.trip_id) return;

        setSelectedReview(review);
        setTripDetail(null);
        setLoadingTripDetail(true);

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/trips/${review.trip_id}`);

            if (res.ok) {
                const data = await res.json();
                setTripDetail(data);
            }
        } catch (err) {
            console.error("Gagal ambil detail pesanan:", err);
        } finally {
            setLoadingTripDetail(false);
        }
    };

    const closeModal = () => {
        setSelectedReview(null);
        setTripDetail(null);
    };

    return (
        <MitraLayout>
            <div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-24">
                {/* HEADER & BACK */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                        <ChevronLeft className="w-6 h-6 text-indigo-900" />
                    </button>
                    <h1 className="text-xl font-black text-indigo-900">Rating & Ulasan</h1>
                </div>

                <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                    {loadingRating ? (
                        <div className="py-10 text-center text-xs font-bold text-gray-400">Memuat rating...</div>
                    ) : ratingCount > 0 ? (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* RINGKASAN RATING */}
                            <div className="flex items-center gap-4 bg-gray-50 rounded-3xl p-6">
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                                    <Star size={32} className="text-amber-400 fill-amber-400" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-800 tracking-tighter leading-none">{ratingAvg}</p>
                                    <p className="text-xs font-bold text-gray-400 mt-1">
                                        Dari <span className="text-gray-700">{ratingCount}</span> pesanan
                                    </p>
                                </div>
                            </div>

                            {/* DAFTAR ULASAN - klik kartu untuk buka modal rangkuman
                                pesanan yang direview (tidak pindah halaman). */}
                            {latestReviews.length > 0 && (
                                <div className="space-y-3">
                                    {latestReviews.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => handleOpenDetail(r)}
                                            disabled={!r.trip_id}
                                            className={`w-full text-left border border-gray-100 rounded-2xl p-4 transition-all ${
                                                r.trip_id ? "hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer" : "cursor-default"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-xs font-black text-gray-800">{r.customer_name || "Customer"}</p>
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star key={star} size={12} className={star <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                                {r.review ? r.review : <span className="italic text-gray-400">Customer memberikan rating bintang tanpa catatan ulasan.</span>}
                                            </p>
                                            {r.trip_id && (
                                                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wide">Lihat Detail Pesanan</span>
                                                    <ChevronRight size={14} className="text-indigo-600" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                                <Star size={32} className="text-gray-200" />
                            </div>
                            <p className="text-gray-800 font-black">Belum Ada Rating</p>
                            <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed font-medium">Feedback dari customer akan muncul di sini setelah perjalanan selesai.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL RANGKUMAN PESANAN */}
            {selectedReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto">
                        <button onClick={closeModal} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center">
                            <X size={18} className="text-gray-500" />
                        </button>

                        <h2 className="text-xl font-black text-indigo-900 mb-1">Rangkuman Pesanan</h2>
                        <p className="text-xs text-gray-400 font-medium mb-6">Ulasan dari {selectedReview.customer_name || "Customer"}</p>

                        {/* Ulasan yang diberikan */}
                        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                            <div className="flex items-center gap-0.5 mb-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={14} className={star <= selectedReview.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"} />
                                ))}
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {selectedReview.review || <span className="italic text-gray-400">Customer memberikan rating bintang tanpa catatan ulasan.</span>}
                            </p>
                        </div>

                        {loadingTripDetail ? (
                            <div className="py-10 text-center text-xs font-bold text-gray-400">Memuat rangkuman pesanan...</div>
                        ) : tripDetail ? (
                            <div className="space-y-4">
                                {/* RUTE */}
                                <div className="relative pl-6 space-y-4">
                                    <div className="absolute left-[7px] top-[10px] bottom-[10px] w-[1.5px] bg-gray-100"></div>

                                    <div className="relative">
                                        <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-white z-10"></div>
                                        <p className="text-xs font-black text-gray-800 leading-none mb-1">{formatPointLabel(tripDetail.origin_point)}</p>
                                        <p className="text-[10px] text-gray-400">{tripDetail.origin_point?.address}</p>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-white z-10"></div>
                                        <p className="text-xs font-black text-gray-800 leading-none mb-1">{formatPointLabel(tripDetail.destination_point)}</p>
                                        <p className="text-[10px] text-gray-400">{tripDetail.destination_point?.address}</p>
                                    </div>
                                </div>

                                {/* INFO LAIN */}
                                <div className="border-t border-gray-50 pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                            <Calendar size={14} /> Tanggal
                                        </span>
                                        <span className="text-xs font-black text-gray-800">
                                            {formatTanggal(tripDetail.departure_date)} • {tripDetail.departure_time?.slice(0, 5)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                            <Navigation size={14} /> Layanan
                                        </span>
                                        <span className="text-xs font-black text-gray-800 uppercase">{tripDetail.vehicle_type}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                            <Wallet size={14} /> Harga
                                        </span>
                                        <span className="text-sm font-black text-indigo-900">{formatRupiah(tripDetail.price)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-10 text-center text-xs font-bold text-gray-400">Rangkuman pesanan tidak ditemukan.</div>
                        )}
                    </div>
                </div>
            )}
        </MitraLayout>
    );
}