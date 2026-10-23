import React, { useEffect, useState } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, Star, Bike, MapPin, MessageSquareText, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import axios from "../../api/axios";

export default function MitraProfile() {
	const navigate = useAppNavigate();
	const { mitraId } = useParams();

	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				setLoading(true);
				const res = await axios.get(`/mitra/${mitraId}/profile`);
				setData(res.data);
			} catch (err) {
				console.error("Gagal memuat profil mitra:", err);
				setError(err.response?.data?.message || "Gagal memuat profil mitra.");
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [mitraId]);

	const avatarUrl = data?.mitra?.avatar
		? `http://127.0.0.1:8000/storage/${data.mitra.avatar}`
		: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data?.mitra?.name || "Mitra"}`;

	return (
		<CustomerLayout>
			<div className="w-full max-w-2xl mx-auto px-4 py-6">
				<button
					onClick={() => navigate(-1)}
					className="p-2.5 bg-gray-50 rounded-2xl hover:bg-indigo-900 hover:text-white transition-all duration-300 shadow-sm group mb-6"
					aria-label="Kembali"
				>
					<ChevronLeft size={20} className="group-active:-translate-x-1 transition-transform" />
				</button>

				{loading ? (
					<div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
						<Loader2 className="animate-spin text-indigo-900 mb-3" size={32} />
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat profil mitra...</p>
					</div>
				) : error ? (
					<div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
						<p className="text-sm font-bold text-gray-500">{error}</p>
					</div>
				) : (
					<>
						{/* HEADER PROFIL */}
						<div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 text-center space-y-4 mb-6">
							<img
								src={avatarUrl}
								alt={data.mitra.name}
								className="w-24 h-24 rounded-3xl object-cover mx-auto shadow-md border-4 border-white ring-1 ring-gray-100"
							/>
							<div>
								<h1 className="text-xl font-black text-indigo-900">{data.mitra.name}</h1>
								<p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Mitra Nebeng.</p>
							</div>

							<div className="flex items-center justify-center gap-3 pt-2">
								<div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100">
									<Star size={16} className="fill-amber-400 text-amber-400" />
									<span className="text-sm font-black text-amber-700">{data.average_rating ?? "Baru"}</span>
									{data.average_rating && <span className="text-[10px] text-amber-500 font-bold">({data.total_reviews} ulasan)</span>}
								</div>
								<div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
									<Bike size={16} className="text-indigo-600" />
									<span className="text-sm font-black text-indigo-700">{data.total_trips_completed}</span>
									<span className="text-[10px] text-indigo-500 font-bold">trip selesai</span>
								</div>
							</div>
						</div>

						{/* DAFTAR ULASAN */}
						<div className="space-y-3">
							<h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Ulasan Customer</h2>

							{data.reviews.length === 0 ? (
								<div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center gap-3">
									<div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
										<MessageSquareText size={24} className="text-gray-300" />
									</div>
									<p className="text-xs text-gray-400 font-medium">Mitra ini belum punya ulasan dari customer.</p>
								</div>
							) : (
								data.reviews.map((review) => {
									const reviewerAvatar = review.customer?.avatar
										? `http://127.0.0.1:8000/storage/${review.customer.avatar}`
										: `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.customer?.name || "Customer"}`;

									return (
										<div key={review.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
											<div className="flex items-start gap-3">
												<img src={reviewerAvatar} alt={review.customer?.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between gap-2">
														<p className="text-sm font-black text-gray-800 truncate">{review.customer?.name || "Customer"}</p>
														<div className="flex items-center gap-1 shrink-0">
															{Array.from({ length: 5 }).map((_, i) => (
																<Star key={i} size={12} className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
															))}
														</div>
													</div>
													{review.review && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{review.review}</p>}
													<p className="text-[10px] text-gray-300 font-bold mt-2">{new Date(review.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</>
				)}
			</div>
		</CustomerLayout>
	);
}