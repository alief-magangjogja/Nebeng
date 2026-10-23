import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import PosMitraSidebar from "./PosMitraSidebar";
import { Bell, ChevronDown, QrCode, X, Wallet, ShieldAlert, MessageSquareWarning, Info, Car, ShieldCheck, Banknote, Star } from "lucide-react";

import { useUser } from "../../context/UserContext";

// Cache module-level supaya perpindahan halaman pos mitra tidak memicu fetch berulang
let cachedPosUnreadCount = 0;
// Supaya popup TIDAK muncul ulang di setiap login hanya gara-gara ada
// notifikasi lama yang belum pernah ditandai "dibaca". Baseline pertama
// setelah login/reload dicatat diam-diam dulu, popup cuma dipicu kalau
// jumlahnya BERTAMBAH setelah itu (artinya benar-benar ada yang baru).
let hasEstablishedPosBaseline = false;
let lastPosUnreadFetchTime = 0;
let posAudioInstance = null;

// Ikon & warna popup disesuaikan dengan kategori notifikasi asli dari backend
// (dulu selalu pakai ikon QR "Pesanan POS Masuk" walau isinya notifikasi lain).
const NOTIF_CATEGORY_STYLE = {
	order: { icon: QrCode, color: "text-[#0b2f83]", bg: "bg-blue-50" },
	payment: { icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
	balance: { icon: Banknote, color: "text-teal-600", bg: "bg-teal-50" },
	vehicle: { icon: Car, color: "text-blue-600", bg: "bg-blue-50" },
	verification: { icon: ShieldCheck, color: "text-violet-600", bg: "bg-violet-50" },
	review: { icon: Star, color: "text-yellow-600", bg: "bg-yellow-50" },
	sos: { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
	complaint: { icon: MessageSquareWarning, color: "text-amber-600", bg: "bg-amber-50" },
	system: { icon: Info, color: "text-gray-600", bg: "bg-gray-100" },
};
const getNotifStyle = (category) => NOTIF_CATEGORY_STYLE[category] || NOTIF_CATEGORY_STYLE.system;

export default function PosMitraLayout({ children }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const { user, loadingUser } = useUser();
	const [notifications, setNotifications] = useState([]);
	const [hasNewNotif, setHasNewNotif] = useState(cachedPosUnreadCount > 0);
	const [popupNotif, setPopupNotif] = useState(null);
	const avatarUrl = user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "User"}`;

	// Efek deteksi scroll untuk mengubah style header dinamis
	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 20) {
				setIsScrolled(true);
			} else {
				setIsScrolled(false);
			}
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Polling badge notifikasi (menggantikan WebSocket/Echo yang belum
	// terkonfigurasi di project ini, supaya notifikasi tetap berfungsi
	// Audio singleton & unlock
	useEffect(() => {
		if (!posAudioInstance && typeof window !== "undefined") {
			const audio = new Audio("/notification.mp3");
			audio.preload = "auto";
			audio.volume = 1;
			posAudioInstance = audio;

			const unlockAudio = async () => {
				try {
					await audio.play();
					audio.pause();
					audio.currentTime = 0;
				} catch (err) {}
			};

			const handleFirstInteraction = () => {
				unlockAudio();
				window.removeEventListener("pointerdown", handleFirstInteraction);
				window.removeEventListener("keydown", handleFirstInteraction);
			};

			window.addEventListener("pointerdown", handleFirstInteraction);
			window.addEventListener("keydown", handleFirstInteraction);
		}
	}, []);

	// Polling badge notifikasi dengan throttling / in-memory cache
	useEffect(() => {
		let previousCount = cachedPosUnreadCount;

		const fetchUnreadCount = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) return;

				const res = await fetch("http://127.0.0.1:8000/api/notifications/unread-count", {
					headers: { Authorization: `Bearer ${token}` },
				});

				const data = await res.json();
				const count = data.unread_count || 0;
				cachedPosUnreadCount = count;
				lastPosUnreadFetchTime = Date.now();

				if (hasEstablishedPosBaseline && previousCount !== null && count > previousCount) {
					try {
						const notifRes = await fetch("http://127.0.0.1:8000/api/notifications", {
							headers: { Authorization: `Bearer ${token}` },
						});
						const notifList = await notifRes.json();
						const latest = Array.isArray(notifList) ? notifList[0] : null;

						setPopupNotif(
							latest
								? {
										title: latest.title,
										message: latest.message,
										category: latest.category,
										link: latest.link,
									}
								: { title: "Notifikasi Baru", message: "Kamu punya notifikasi baru", category: "system", link: null }
						);
					} catch (e) {
						setPopupNotif({ title: "Notifikasi Baru", message: "Kamu punya notifikasi baru", category: "system", link: null });
					}

					setTimeout(() => {
						setPopupNotif(null);
					}, 4000);

					if (posAudioInstance) {
						try {
							posAudioInstance.currentTime = 0;
							posAudioInstance.play();
						} catch (err) {}
					}

					if (navigator.vibrate) {
						navigator.vibrate([200, 100, 200]);
					}
				}

				hasEstablishedPosBaseline = true;
				previousCount = count;

				setNotifications(new Array(count).fill(true));
				setHasNewNotif(count > 0);
			} catch (err) {
				console.error("Fetch unread notif count error:", err);
			}
		};

		// Hanya fetch jika cache sudah lebih lama dari 15 detik
		if (Date.now() - lastPosUnreadFetchTime >= 15000) {
			fetchUnreadCount();
		} else {
			setHasNewNotif(cachedPosUnreadCount > 0);
		}

		const interval = setInterval(fetchUnreadCount, 15000);

		return () => clearInterval(interval);
	}, []);

	// Penyesuaian nama halaman berdasarkan path URL untuk Breadcrumb Desktop
	const getPageTitle = () => {
		const path = location.pathname;
		if (path.includes("nebeng-motor")) return "Statistik Nebeng Motor";
		if (path.includes("nebeng-mobil")) return "Statistik Nebeng Mobil";
		if (path.includes("nebeng-barang")) return "Statistik Nebeng Barang";
		if (path.includes("riwayat-saldo")) return "Riwayat Keuangan";
		if (path.includes("riwayat")) return "Riwayat Aktivitas";
		if (path.includes("pesan")) return "Pesan Percakapan";
		if (path.includes("profil")) return "Profil POS Mitra";
		if (path.includes("notifikasi")) return "Pusat Notifikasi";
		if (path.includes("scan")) return "Pemindaian QR Code";
		return "Beranda Utama";
	};

	return (
		<div className="flex min-h-screen bg-[#F8FAFC] font-sans antialiased selection:bg-blue-500 selection:text-white">
			{/* Memanggil Sidebar Baru khusus POS */}
			<PosMitraSidebar />

			<div className="flex-1 flex flex-col min-h-full min-w-0 md:ml-72 transition-all duration-300">
				{/* STICKY NAVBAR */}
				<header
					className={`sticky top-0 z-40 px-6 sm:px-8 py-4 flex items-center justify-between transition-all duration-300 ${isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100" : "bg-[#0b2f83] md:bg-transparent"}`}
				>
					{/* LEFT HEADER SECTION */}
					<div className="flex items-center gap-4">
						{/* Mobile Header View: Halo Farras (Warna Putih mengikuti Mockup Gambar) */}
						<div className="md:hidden flex flex-col text-left">
							<span className="text-[11px] font-bold text-blue-200/80 uppercase tracking-wider">Halo,</span>
							<h1 className="text-xl font-bold text-white tracking-tight leading-none mt-0.5 truncate max-w-[180px]">{loadingUser ? "..." : user?.name || "User"}</h1>
						</div>

						{/* Desktop Header View: Breadcrumb Halaman */}
						<div className="hidden md:block text-left">
							<h2 className="text-[10px] font-black text-[#0b2f83] opacity-60 uppercase tracking-widest mb-0.5">Halaman</h2>
							<h1 className="text-lg font-black text-gray-800 tracking-tight">{getPageTitle()}</h1>
						</div>
					</div>

					{/* RIGHT HEADER SECTION */}
					<div className="flex items-center gap-3 sm:gap-4">
						{/* Lonceng Notifikasi */}
						<Link
							to="/pos-mitra/notifikasiMitra"
							className={`relative p-2.5 rounded-xl transition-all ${isScrolled ? "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50" : "bg-white/10 md:bg-white text-white md:text-gray-500 md:border md:border-gray-200 hover:scale-105"}`}
						>
							<Bell size={20} />
							{hasNewNotif && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0b2f83] md:border-white"></span>}
							{notifications.length > 0 && <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{notifications.length}</div>}
						</Link>

						{/* Profile Dropdown (Hanya Tampil di Layar Desktop) */}
						<Link to="/pos-mitra/profil" className="hidden md:flex items-center gap-3 p-1.5 pr-3 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all group">
							<div className="relative">
								<img src={avatarUrl} alt="Profile" className="w-9 h-9 rounded-lg bg-gray-100 object-cover" />
								<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
							</div>
							<div className="text-left">
								<p className="text-xs font-bold text-gray-800 leading-none">{loadingUser ? "Loading..." : user?.name || "User"}</p>
								<p className="text-[10px] text-gray-400 font-semibold mt-1 uppercase tracking-wider">Mitra POS</p>
							</div>
							<ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
						</Link>
					</div>
				</header>

				{/* ================= REAL-TIME POPUP NOTIFICATION ================= */}
				{popupNotif && (
					<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm animate-in slide-in-from-top-5 fade-in duration-300">
						<div
							className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ${popupNotif.link ? "cursor-pointer" : ""}`}
							onClick={() => {
								if (popupNotif.link) {
									navigate(popupNotif.link);
									setPopupNotif(null);
								}
							}}
						>
							<div className="p-4 flex items-start gap-3">
								{(() => {
									const style = getNotifStyle(popupNotif.category);
									const Icon = style.icon;
									return (
										<div className={`w-10 h-10 rounded-xl ${style.bg} ${style.color} flex items-center justify-center shrink-0`}>
											<Icon size={20} />
										</div>
									);
								})()}

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<p className="text-xs font-bold text-gray-900">{popupNotif.title}</p>
										<div className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-wide">Baru</div>
									</div>
									<p className="text-xs text-gray-500 mt-1 leading-relaxed">{popupNotif.message}</p>
								</div>

								<button
									onClick={(e) => {
										e.stopPropagation();
										setPopupNotif(null);
									}}
									className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
								>
									<X size={14} className="text-gray-400" />
								</button>
							</div>

							<div className="h-1 bg-gray-50 overflow-hidden">
								<div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 animate-[shrink_4s_linear_forwards]"></div>
							</div>
						</div>
					</div>
				)}

				{/* MAIN CONTENT REGION */}
				<main className="flex-grow w-full p-4 sm:p-6 md:p-8">
					<div className="animate-in fade-in slide-in-from-bottom-3 duration-500">{children}</div>
				</main>
			</div>
		</div>
	);
}