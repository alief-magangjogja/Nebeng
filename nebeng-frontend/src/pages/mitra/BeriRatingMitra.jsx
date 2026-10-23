import React, { useState, useEffect } from "react";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, Star, MessageSquare, CheckCircle, Loader2, Bike } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";

export default function BeriRatingMitra() {
	const navigate = useAppNavigate();
	const { tripId, customerId } = useParams();

	const [customer, setCustomer] = useState(null);
	const [trip, setTrip] = useState(null);

	// ================= STATE =================
	const [rating, setRating] = useState(0);
	const [hover, setHover] = useState(0);
	const [selectedTags, setSelectedTags] = useState([]);
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	// Opsi tag interaktif sesuai gambar
	const feedbackTags = ["Titik jemput sesuai", "Ramah banget", "Tepat Waktu"];

	React.useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");

				const response = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}`, {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				const data = await response.json();

				setTrip(data);

				const selectedCustomer = data.orders?.find((order) => String(order.user?.id) === String(customerId));

				if (selectedCustomer) {
					setCustomer(selectedCustomer.user);
				}
			} catch (err) {
				console.error(err);
			}
		};

		fetchData();
	}, [tripId, customerId]);

	// ================= HANDLERS =================
	const toggleTag = (tag) => {
		if (selectedTags.includes(tag)) {
			setSelectedTags(selectedTags.filter((t) => t !== tag));
		} else {
			setSelectedTags([...selectedTags, tag]);
		}
	};

	const handleSubmit = async () => {
		if (rating === 0) {
			alert("Mohon berikan penilaian bintang terlebih dahulu");
			return;
		}

		setLoading(true);

		try {
			const token = localStorage.getItem("token");

			// Gabungkan tag yang dipilih + pesan bebas jadi satu teks review,
			// karena backend cuma punya satu kolom teks ("review").
			const tagsText = selectedTags.length > 0 ? selectedTags.join(", ") : "";
			const trimmedMessage = message.trim();
			const reviewText = [tagsText, trimmedMessage].filter(Boolean).join(tagsText && trimmedMessage ? " — " : "");

			const formData = new FormData();

			formData.append("trip_id", tripId);
			formData.append("reviewed_user_id", customerId);

			formData.append("rating", rating);

			formData.append("review", reviewText);

			const response = await fetch("http://127.0.0.1:8000/api/trip-reviews", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
				body: formData,
			});

			const data = await response.json();

			console.log(data);

			if (!response.ok) {
				alert(data.message || "Gagal mengirim penilaian");
				return;
			}

			setIsSuccess(true);
		} catch (err) {
			console.error(err);
			alert("Gagal mengirim penilaian");
		} finally {
			setLoading(false);
		}
	};

	return (
		<MitraLayout>
			<div className="w-full max-w-xl mx-auto px-4 py-6 space-y-6 font-sans pb-32">
				{/* HEADER NAVIGATION */}
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<div>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Berikan Penilaian</h1>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Evaluasi Pelanggan</p>
					</div>
				</div>

				{/* MAIN CARD CONTAINER */}
				<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-indigo-950/5 border border-indigo-50/50">
					{!isSuccess ? (
						<div className="space-y-6 animate-in fade-in duration-300">
							{/* BLOCK INFOMASI TRIP UTAMA */}
							<div className="flex items-center gap-4 border-b border-gray-50 pb-4">
								<div className="w-14 h-14 bg-indigo-900 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0">
									<Bike size={28} />
								</div>
								<div>
									<h2 className="font-black text-lg text-gray-800 leading-tight">Perjalanan Selesai!</h2>
									<p className="text-xs font-bold text-gray-400 mt-1">{trip?.created_at ? new Date(trip.created_at).toLocaleString("id-ID") : "-"}</p>
								</div>
							</div>

							{/* NOMOR INVOICE */}
							<div className="bg-gray-50 text-center py-2.5 rounded-xl border border-gray-100 text-xs font-mono text-gray-400 tracking-wider">INV-TRIP-{trip?.id}</div>

							<div className="bg-indigo-50/40 border border-indigo-50 rounded-3xl p-4 flex items-center gap-4">
								<img
									src={customer?.avatar ? `http://127.0.0.1:8000/storage/${customer.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${customer?.name || "Customer"}`}
									alt="Customer"
									className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
								/>

								<div>
									<h3 className="font-black text-lg text-gray-800">{customer?.name || "Customer"}</h3>

									<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Customer Nebeng</p>
								</div>
							</div>

							{/* INTERAKTIF STAR RATING */}
							<div className="text-center space-y-3 pt-2">
								<h3 className="text-sm font-black text-gray-700">Bagaimana pengalaman bersama customer?</h3>
								<div className="flex items-center justify-center gap-2">
									{[1, 2, 3, 4, 5].map((star) => (
										<button type="button" key={star} className="transition-all duration-200 transform active:scale-95 hover:scale-110" onClick={() => setRating(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}>
											<Star size={32} className={`transition-colors duration-200 ${star <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
										</button>
									))}
								</div>
							</div>

							{/* INTERAKTIF CHIPS / TAGS SELECTION */}
							<div className="space-y-3 pt-2">
								<h3 className="text-sm font-black text-gray-700 text-center">Apa yang kamu suka dari pelanggannya?</h3>
								<div className="flex flex-wrap gap-2 justify-center">
									{feedbackTags.map((tag) => {
										const isSelected = selectedTags.includes(tag);
										return (
											<button
												key={tag}
												onClick={() => toggleTag(tag)}
												className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
													isSelected ? "bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-100" : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
												}`}
											>
												{tag}
											</button>
										);
									})}
								</div>
							</div>

							{/* KOTAK PESAN UNTUK CUSTOMER */}
							<div className="space-y-3 pt-2">
								<h3 className="text-sm font-black text-gray-700 flex items-center gap-2">
									<MessageSquare size={16} className="text-indigo-900" /> Tulis pesan untuk customer <span className="font-medium text-gray-400 normal-case">(opsional)</span>
								</h3>
								<textarea
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									maxLength={500}
									rows={4}
									placeholder="Contoh: Terima kasih sudah nebeng, semoga lancar sampai tujuan!"
									className="w-full rounded-2xl border-2 border-gray-100 focus:border-indigo-400 focus:outline-none p-4 text-sm text-gray-700 placeholder:text-gray-300 resize-none transition-colors bg-gray-50/50"
								/>
								<p className="text-[10px] text-gray-300 text-right font-bold">{message.length}/500</p>
							</div>

							{/* SUBMIT BUTTON */}
							<div className="pt-4">
								<button
									onClick={handleSubmit}
									disabled={loading || rating === 0}
									className="w-full py-4.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
								>
									{loading ? (
										<>
											<Loader2 className="animate-spin" size={18} /> Mengirim Data...
										</>
									) : (
										"Kirim"
									)}
								</button>
							</div>
						</div>
					) : (
						/* SUCCESS STATE LAYER OVERLAY */
						<div className="text-center py-12 space-y-6 animate-in zoom-in-95 duration-500">
							<div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
								<CheckCircle size={40} />
							</div>
							<div className="space-y-2">
								<h3 className="text-2xl font-black text-gray-800">Penilaian Berhasil!</h3>
								<p className="text-sm font-medium text-gray-400 max-w-xs mx-auto leading-relaxed">Terima kasih, ulasan Anda telah masuk ke dalam sistem penilaian pelanggan global kami.</p>
							</div>
							<button onClick={() => navigate("/mitra/dashboard")} className="w-full py-4 bg-gray-950 hover:bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
								Kembali ke Dashboard
							</button>
						</div>
					)}
				</div>
			</div>
		</MitraLayout>
	);
}