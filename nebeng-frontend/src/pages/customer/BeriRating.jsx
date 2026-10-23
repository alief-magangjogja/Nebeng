import React, { useState, useEffect } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, Star, MessageSquare, CheckCircle, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";

export default function BeriRating() {
	const navigate = useAppNavigate();
	const [rating, setRating] = useState(0);
	const [hover, setHover] = useState(0);
	const [review, setReview] = useState("");
	const [loading, setLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const { tripId } = useParams();
	const [driver, setDriver] = useState(null);

	useEffect(() => {
		const fetchTrip = async () => {
			try {
				const token = localStorage.getItem("token");

				const res = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}/journey`, {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				const data = await res.json();

				setDriver({
					name: data.trip?.mitra?.name || "Mitra",
					photo: data.trip?.mitra?.avatar ? `http://127.0.0.1:8000/storage/${data.trip.mitra.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.trip?.mitra?.name}`,
					service: data.trip?.vehicle_type === "motor" ? "Nebeng Motor" : "Nebeng Mobil",
					plat: data.trip?.vehicle_plate || "-",
				});
			} catch (err) {
				console.error(err);
			}
		};

		fetchTrip();
	}, [tripId]);

	const handleSubmit = async () => {
		if (rating === 0) {
			alert("Mohon pilih bintang rating terlebih dahulu");
			return;
		}

		setLoading(true);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/trip-reviews`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					trip_id: tripId,
					rating,
					review,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal mengirim review");
			}

			setIsSuccess(true);
		} catch (err) {
			console.error(err);
			alert(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (!driver) {
		return (
			<CustomerLayout>
				<div className="p-10 text-center">Loading...</div>
			</CustomerLayout>
		);
	}

	return (
		<CustomerLayout>
			<div className="w-full max-w-xl mx-auto px-4 py-6 space-y-6 font-sans pb-32">
				{/* HEADER NAVIGATION */}
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<div>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Rating Driver</h1>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Berikan Feedback Perjalanan</p>
					</div>
				</div>

				{/* MAIN CARD CONTAINER */}
				<div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-indigo-950/5 border border-indigo-50/50">
					{!isSuccess ? (
						<div className="space-y-8 animate-in fade-in duration-300">
							{/* BLOCK PROFIL DRIVER */}
							<div className="text-center space-y-4">
								<h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Beri Rating untuk Driver</h3>

								<div className="relative w-32 h-32 mx-auto">
									<div className="absolute inset-0 bg-indigo-50 rounded-full animate-pulse opacity-60"></div>
									<img src={driver.photo} alt={driver.name} className="relative w-full h-full object-cover rounded-full border-4 border-white shadow-xl" />
								</div>

								<div>
									<h2 className="text-xl font-black text-gray-800 tracking-tight">{driver.name}</h2>
									<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
										{driver.service} • <span className="text-indigo-600">{driver.plat}</span>
									</p>
								</div>
							</div>

							{/* INTERAKTIF STAR SELECTION */}
							<div className="flex flex-col items-center justify-center space-y-2 border-t border-b border-gray-50 py-6">
								<div className="flex items-center gap-2">
									{[1, 2, 3, 4, 5].map((star) => (
										<button type="button" key={star} className="transition-all duration-200 transform active:scale-95 hover:scale-110" onClick={() => setRating(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}>
											<Star size={36} className={`transition-colors duration-200 ${star <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
										</button>
									))}
								</div>
								<p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest h-4">
									{rating === 1 && "Buruk Sekali"}
									{rating === 2 && "Kurang Memuaskan"}
									{rating === 3 && "Cukup Baik"}
									{rating === 4 && "Sangat Memuaskan"}
									{rating === 5 && "Sempurna Luar Biasa!"}
								</p>
							</div>

							{/* TEXTAREA INPUT ULASAN */}
							<div className="space-y-2">
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
									<MessageSquare size={14} className="text-indigo-900" />
									Berikan ulasan untuk driver
								</label>
								<textarea
									rows="4"
									value={review}
									onChange={(e) => setReview(e.target.value)}
									placeholder="Ceritakan pengalaman perjalanan Anda bersama driver..."
									className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all resize-none"
								/>
							</div>

							{/* SUBMIT BUTTON */}
							<div className="pt-2">
								<button
									onClick={handleSubmit}
									disabled={loading || rating === 0}
									className="w-full py-4.5 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-all active:scale-[0.99] disabled:opacity-30 flex items-center justify-center gap-2"
								>
									{loading ? (
										<>
											<Loader2 className="animate-spin" size={18} /> Mengirim...
										</>
									) : (
										"Selesai"
									)}
								</button>
							</div>
						</div>
					) : (
						/* SUCCESS STATE LAYER OVERLAY IN-CARD */
						<div className="text-center py-10 space-y-6 animate-in zoom-in-95 duration-500">
							<div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
								<CheckCircle size={40} />
							</div>
							<div className="space-y-2">
								<h3 className="text-2xl font-black text-gray-800">Ulasan Dikirim!</h3>
								<p className="text-sm font-medium text-gray-400 max-w-xs mx-auto leading-relaxed">Terima kasih sudah memberikan penilaian. Masukan Anda membantu kami menjaga kualitas kenyamanan berkendara.</p>
							</div>
							<button onClick={() => navigate("/customer/dashboard")} className="px-10 py-4 bg-gray-950 hover:bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
								Kembali ke Beranda
							</button>
						</div>
					)}
				</div>
			</div>
		</CustomerLayout>
	);
}
