import React, { useState, useEffect } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Star, ChevronRight, Bike, Car, XCircle, Package, Truck, Info } from "lucide-react";
import { useUser } from "../../context/UserContext";

const services = [
	{ id: "motor", label: "Nebeng Motor", Icon: Bike, desc: "Cepat & gesit selip macet." },
	{ id: "mobil", label: "Nebeng Mobil", Icon: Car, desc: "Nyaman & aman ber-AC." },
	{ id: "barang", label: "Nebeng Barang", Icon: Package, desc: "Kirim paket tanpa ribet." },
	// { id: "umum", label: "Barang (Transportasi Umum)", Icon: Truck, desc: "Cargo skala besar & murah." },
];

export default function Dashboard() {
	const navigate = useNavigate();
	const { user, loadingUser } = useUser();
	const verificationLoading = loadingUser;
	const [searchQuery, setSearchQuery] = useState("");
	const [activePromo, setActivePromo] = useState(0);
	const [rewardPoints, setRewardPoints] = useState(0);
	const [recentActivities, setRecentActivities] = useState([]);

	const [showVerificationOverlay, setShowVerificationOverlay] = useState(true);
	const verificationStatus = user?.status || "unverified";
	const isVerified = verificationStatus === "verified";
	const isPending = verificationStatus === "pending";
	const isUnverified = verificationStatus === "unverified";

	const isRejected = verificationStatus === "rejected";
	const isBlocked = verificationStatus === "blocked";

	// Filter layanan berdasarkan input pencarian secara realtime
	const filteredServices = services.filter((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()));

	const handleProtectedClick = (e) => {
		if (!isVerified) {
			e.preventDefault();

			if (isPending) {
				alert("Verifikasi akun kamu masih diproses admin.");
			} else if (isRejected) {
				alert("Verifikasi akun kamu ditolak. Silakan periksa dan kirim ulang data.");
			} else if (isBlocked) {
				alert("Akun kamu diblokir.");
			} else {
				alert("Silakan lengkapi verifikasi identitas terlebih dahulu.");
			}

			return;
		}
	};

	// Simulasi Slider Promo Otomatis
	useEffect(() => {
		const timer = setInterval(() => {
			setActivePromo((prev) => (prev + 1) % 3);
		}, 5000);
		return () => clearInterval(timer);
	}, []);

	// Gabungan: reward points + 5 aktivitas terbaru dalam 1 request
	// (sebelumnya ini 2 fetch terpisah ke endpoint berbeda)
	useEffect(() => {
		const formatActivities = (orders) =>
			(orders || []).slice(0, 5).map((order) => {
				const vehicleType = order.trip?.vehicle_type || order.vehicle_type || order.type;

				let type = vehicleType || "Perjalanan";
				let icon = Bike;

				const normalizedType = vehicleType?.toLowerCase() || "";

				if (normalizedType.includes("barang")) {
					type = "Nebeng Barang";
					icon = Package;
				} else if (normalizedType.includes("motor")) {
					type = "Nebeng Motor";
					icon = Bike;
				} else if (normalizedType.includes("mobil")) {
					type = "Nebeng Mobil";
					icon = Car;
				}

				const departureDate = order.trip?.departure_date;
				const departureTime = order.trip?.departure_time;

				let formattedDate = "-";

				if (departureDate && departureTime) {
					formattedDate = new Date(`${departureDate}T${departureTime}`).toLocaleDateString("id-ID", {
						day: "2-digit",
						month: "short",
					});
				}

				return {
					id: order.id,
					type,
					icon,
					price: Number(order.price || 0).toLocaleString(),
					date: formattedDate,
				};
			});

		// Fallback kalau endpoint gabungan /dashboard-summary bermasalah
		// (mis. 404 karena route belum ke-refresh di server) - supaya
		// dashboard tidak diam-diam nampilin 0 padahal poinnya sebenarnya ada.
		const fetchSummaryFallback = async (token) => {
			try {
				const [pointsRes, historyRes] = await Promise.all([
					fetch("http://127.0.0.1:8000/api/reward-points", {
						headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
					}),
					fetch("http://127.0.0.1:8000/api/orders/history", {
						headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
					}),
				]);

				if (pointsRes.ok) {
					const pointsData = await pointsRes.json();
					setRewardPoints(pointsData.reward_points || 0);
				}

				if (historyRes.ok) {
					const historyData = await historyRes.json();
					setRecentActivities(formatActivities(historyData));
				}
			} catch (err) {
				console.error("Fallback dashboard summary error:", err);
			}
		};

		const fetchSummary = async () => {
			const token = localStorage.getItem("token");

			try {
				const res = await fetch("http://127.0.0.1:8000/api/dashboard-summary", {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				if (!res.ok) {
					// endpoint gabungan gagal (mis. 404) -> jangan diam-diam
					// tampilkan 0, coba ambil datanya lewat endpoint terpisah.
					await fetchSummaryFallback(token);
					return;
				}

				const data = await res.json();

				setRewardPoints(data.reward_points || 0);
				setRecentActivities(formatActivities(data.recent_activities));
			} catch (err) {
				console.error(err);
				await fetchSummaryFallback(token);
			}
		};

		fetchSummary();
	}, []);

	return (
		<CustomerLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6">
				{/* HEADER SECTION (Desktop Only) */}
				<div className="hidden md:flex items-center justify-between mb-8">
					{/* Welcome Text for Dashboard Only */}
					{location.pathname.endsWith("/dashboard") && (
						<div className="mb-8 pt-4">
							<h2 className="text-3xl font-black text-indigo-900 tracking-tight">Selamat Datang👋</h2>
							<p className="text-gray-400 font-medium mt-1">Siap untuk melakukan perjalanan hari ini?</p>
						</div>
					)}

					<div className="flex items-center gap-4">
						<div className="relative group">
							<Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchQuery ? "text-indigo-600" : "text-gray-400"}`} size={16} />
							<input
								type="text"
								placeholder="Cari layanan..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all focus:w-80"
							/>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 ">
					{/* LEFT SIDE: Banner & Promo */}
					<div className="lg:col-span-8 space-y-6">
						{/* BANNER PROMO DENGAN ANIMASI TRANSISI DINAMIS */}
						<div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-indigo-600 to-blue-500 p-8 text-white h-64 flex items-center shadow-lg group transition-all duration-700">
							{/* Logika Konten Dinamis Berdasarkan Index activePromo */}
							{(() => {
								const promoContent = [
									{
										title: "Nebeng Motor",
										desc: "Jalanan padat? Nebeng Motor siap antar kamu dengan cepat dan aman. Tinggalkan macet, nikmati perjalanan!",
										link: "/customer/nebeng-motor",
										Icon: Bike,
										bgClass: "from-sky-400 to-blue-500",
									},
									{
										title: "Nebeng Mobil",
										desc: "Pergi bersama teman atau keluarga lebih nyaman dengan Nebeng Mobil. Santai, ber-AC, dan tetap hemat!",
										link: "/customer/nebeng-mobil",
										Icon: Car,
										bgClass: "from-indigo-600 to-blue-700",
									},
									{
										title: "Nebeng Barang",
										desc: "Kirim paket atau pindahan rumah? Nebeng Barang solusinya. Aman sampai tujuan dengan harga transparan.",
										link: "/customer/nebeng-barang",
										Icon: Package,
										bgClass: "from-blue-700 to-indigo-800",
									},
								];

								const current = promoContent[activePromo];

								return (
									<>
										{/* Bagian Teks dengan Animasi Fade-In & Slide */}
										<div key={`text-${activePromo}`} className="relative z-10 max-w-md animate-in fade-in slide-in-from-left-8 duration-700 transition-all group-hover:translate-x-2">
											<span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase mb-4 tracking-widest border border-white/10">Promo Terbatas</span>
											<h2 className="text-3xl font-black mb-2 uppercase tracking-tight drop-shadow-md">{current.title}</h2>
											<p className="text-blue-50 opacity-90 leading-relaxed mb-6 font-medium text-sm">{current.desc}</p>
											<Link
												to={current.link}
												onClick={(e) => handleProtectedClick(e)}
												className={`inline-block px-8 py-2.5 bg-white text-blue-700 rounded-full font-black text-xs uppercase tracking-widest shadow-xl ${!isVerified ? "opacity-50 pointer-events-auto" : ""}`}
											>
												Pesan Sekarang
											</Link>
										</div>

										{/* Ilustrasi Background Animatif (Berubah Ikon Sesuai State) */}
										<div key={`icon-${activePromo}`} className="absolute -right-5 -bottom-5 opacity-15 transform -rotate-12 transition-all duration-1000 group-hover:rotate-0 group-hover:scale-110 animate-in fade-in zoom-in-75">
											<current.Icon size={280} strokeWidth={1.5} />
										</div>
									</>
								);
							})()}

							{/* Slider Indicators (Navigasi Kecil di Bawah) */}
							<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
								{[0, 1, 2].map((i) => (
									<button
										key={i}
										onClick={() => setActivePromo(i)} // Memungkinkan user klik manual
										className={`h-1.5 rounded-full transition-all duration-500 ${activePromo === i ? "w-10 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "w-2 bg-white/30 hover:bg-white/50"}`}
									/>
								))}
							</div>
						</div>

						{/* LAYANAN SECTION (Horizontal Scroll di Mobile) */}
						<div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
							<div className="flex justify-between items-center mb-8">
								<h3 className="font-black text-gray-800 flex items-center gap-2 text-lg uppercase tracking-tight">
									Layanan Kami
									{searchQuery && <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg lowercase tracking-normal">({filteredServices.length} hasil)</span>}
								</h3>
							</div>

							{filteredServices.length > 0 ? (
								/* Menggunakan flex-nowrap & overflow-x-auto untuk scroll menyamping di mobile */
								<div className="flex md:grid md:grid-cols-3 justify-center gap-4 md:gap-8 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2 md:mx-0 md:px-0">
									{filteredServices.map((s) => (
										<Link
											key={s.id}
											to={`/customer/nebeng-${s.id}`}
											onClick={(e) => handleProtectedClick(e)}
											className={`group flex flex-col items-center min-w-[100px] md:min-w-0 p-2 transition-all relative ${!isVerified ? "opacity-50 cursor-not-allowed" : ""}`}
										>
											{/* Lingkaran Ikon Persis Gambar */}
											<div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-900 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-indigo-200 transition-all duration-500">
												<s.Icon size={32} strokeWidth={1.5} className="md:size-10" />
											</div>

											{/* Label Teks Dua Baris */}
											<div className="text-[11px] md:text-sm font-bold text-center mt-4 text-gray-600 leading-tight h-10 flex items-center justify-center max-w-[90px] md:max-w-full">{s.label}</div>

											{/* Tooltip (Desktop Only) */}
											<div className="hidden md:block absolute -top-2 scale-0 group-hover:scale-100 transition-all bg-indigo-900 text-white text-[10px] px-3 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-20">
												{s.desc}
											</div>
										</Link>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-gray-300">
									<XCircle className="mb-2 opacity-20" size={48} />
									<p className="text-xs font-bold uppercase tracking-widest italic">Layanan tidak ditemukan</p>
								</div>
							)}
						</div>

						{/* Style tambahan untuk menyembunyikan scrollbar namun tetap bisa di-scroll */}
						<style>{`
							.no-scrollbar::-webkit-scrollbar {
								display: none;
							}
							.no-scrollbar {
								-ms-overflow-style: none;
								scrollbar-width: none;
							}
						`}</style>
					</div>

					{/* RIGHT SIDE: Profile & Rewards */}
					<div className="lg:col-span-4 space-y-6">
						{/* REWARD CARD DENGAN ANIMASI COUNT-UP SIMULASI */}
						<Link
							to="/customer/reward-points"
							className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 group cursor-pointer hover:shadow-indigo-100 hover:shadow-xl transition-all border-b-4 border-b-transparent hover:border-b-amber-400 block"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 shadow-inner group-hover:rotate-360 transition-transform duration-1000">
										<Star size={24} fill="currentColor" />
									</div>
									<div>
										<p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Reward Point</p>
										<p className="text-2xl font-black text-indigo-900 tracking-tight">{rewardPoints.toLocaleString()}</p>
									</div>
								</div>
								<div className="p-2 bg-gray-50 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors">
									<ChevronRight size={20} />
								</div>
							</div>
						</Link>

						{/* RECENT ACTIVITY */}
						<div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
							<div className="flex justify-between items-center mb-4">
								<h4 className="font-bold text-gray-800 text-sm">Aktivitas Terakhir</h4>

								<Link to="/customer/riwayat" className="text-xs text-indigo-600 font-bold">
									Lihat Semua
								</Link>
							</div>

							<div className="space-y-4">
								{recentActivities.length > 0 ? (
									recentActivities.map((item) => (
										<div key={item.id} onClick={() => navigate(`/customer/pesanan/${item.id}`)} className="flex gap-3 items-center p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group/item">
											<div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-900 group-hover/item:bg-indigo-900 group-hover/item:text-white transition-all">
												<item.icon size={20} />
											</div>

											<div className="flex-1">
												<p className="text-xs font-bold text-gray-700">{item.type}</p>

												<p className="text-[10px] text-gray-400">
													{item.date} • Rp {item.price}
												</p>
											</div>
										</div>
									))
								) : (
									<p className="text-xs text-gray-400 text-center py-4">Belum ada aktivitas</p>
								)}
							</div>
						</div>
					</div>
				</div>
				{!verificationLoading && !isVerified && showVerificationOverlay && (
					<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
						<div className="bg-white rounded-3xl p-6 text-center shadow-2xl max-w-md w-full relative overflow-hidden">
							{/* CLOSE */}
							<button onClick={() => setShowVerificationOverlay(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
								<XCircle size={20} />
							</button>

							{/* ICON */}
							<div className={`w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center ${isPending ? "bg-amber-100" : isRejected ? "bg-red-100" : "bg-indigo-100"}`}>
								<Info size={36} className={isPending ? "text-amber-500" : isRejected ? "text-red-500" : "text-indigo-600"} />
							</div>

							{/* UNVERIFIED */}
							{isUnverified && (
								<>
									<h2 className="text-2xl font-black text-indigo-900 mb-3">Verifikasi Identitas Diperlukan</h2>

									<p className="text-sm text-gray-500 leading-relaxed mb-6">Untuk menggunakan seluruh layanan Nebeng, kamu perlu melengkapi data identitas sesuai KTP dan upload dokumen verifikasi.</p>

									<div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-left text-xs text-indigo-700 mb-6">
										<p className="font-bold mb-2 uppercase tracking-wider">Data yang dibutuhkan:</p>

										<ul className="space-y-1 list-disc pl-4">
											<li>Nama lengkap sesuai KTP</li>
											<li>NIK</li>
											<li>Alamat lengkap</li>
											<li>Foto KTP</li>
											<li>Selfie + KTP</li>
										</ul>
									</div>

									<Link to="/customer/verification" className="inline-flex items-center justify-center w-full px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">
										Mulai Verifikasi
									</Link>
								</>
							)}

							{/* PENDING */}
							{isPending && (
								<>
									<h2 className="text-2xl font-black text-indigo-900 mb-3">Verifikasi Sedang Diproses</h2>

									<p className="text-sm text-gray-500 leading-relaxed mb-6">Data verifikasi kamu sudah berhasil dikirim dan sedang diperiksa oleh admin.</p>

									<div className="bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl p-4 text-xs font-semibold leading-relaxed">
										Estimasi proses verifikasi maksimal 1x24 jam.
										<br />
										Kamu akan mendapatkan akses penuh setelah akun disetujui.
									</div>
								</>
							)}

							{/* REJECTED */}
							{isRejected && (
								<>
									<h2 className="text-2xl font-black text-red-600 mb-3">Verifikasi Ditolak</h2>

									<p className="text-sm text-gray-500 leading-relaxed mb-6">Data verifikasi kamu ditolak karena tidak sesuai atau dokumen kurang jelas.</p>

									<Link to="/customer/verification" className="inline-flex items-center justify-center w-full px-6 py-3 bg-red-500 text-white rounded-2xl font-black shadow-lg hover:bg-red-600 transition-all">
										Perbaiki Verifikasi
									</Link>
								</>
							)}
						</div>
					</div>
				)}
			</div>

			<style>{`
				@keyframes shake {
					0% {
						transform: rotate(0deg);
					}
					25% {
						transform: rotate(10deg);
					}
					50% {
						transform: rotate(-10deg);
					}
					75% {
						transform: rotate(10deg);
					}
					100% {
						transform: rotate(0deg);
					}
				}
				.shake {
					animation: shake 0.5s ease-in-out;
				}
				.no-scrollbar::-webkit-scrollbar {
					display: none;
				}
			`}</style>
		</CustomerLayout>
	);
}