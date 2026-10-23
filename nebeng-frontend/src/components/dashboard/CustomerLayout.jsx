import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import CustomerSidebar, { CustomerMobileNav } from "./CustomerSidebar";
import { Menu, Bell, Search, ChevronDown, X, Bike, Wallet, ShieldAlert, MessageSquareWarning, Info, Car, ShieldCheck, Banknote, Star } from "lucide-react";
import { useUser } from "../../context/UserContext";

// Ikon & warna popup disesuaikan dengan kategori notifikasi asli dari backend.
const NOTIF_CATEGORY_STYLE = {
	order: { icon: Bike, color: "text-indigo-700", bg: "bg-indigo-100" },
	payment: { icon: Wallet, color: "text-emerald-700", bg: "bg-emerald-100" },
	balance: { icon: Banknote, color: "text-teal-700", bg: "bg-teal-100" },
	vehicle: { icon: Car, color: "text-blue-700", bg: "bg-blue-100" },
	verification: { icon: ShieldCheck, color: "text-violet-700", bg: "bg-violet-100" },
	review: { icon: Star, color: "text-yellow-700", bg: "bg-yellow-100" },
	sos: { icon: ShieldAlert, color: "text-red-700", bg: "bg-red-100" },
	complaint: { icon: MessageSquareWarning, color: "text-amber-700", bg: "bg-amber-100" },
	system: { icon: Info, color: "text-gray-700", bg: "bg-gray-100" },
};
const getNotifStyle = (category) => NOTIF_CATEGORY_STYLE[category] || NOTIF_CATEGORY_STYLE.system;

export default function CustomerLayout({ children }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isScrolled] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const { user, loadingUser } = useUser();
	const [notifications, setNotifications] = useState([]);
	const [hasNewNotif, setHasNewNotif] = useState(false);
	const [popupNotif, setPopupNotif] = useState(null);
	const avatarUrl = user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "User"}`;
	const notificationSound = useRef(null);

	useEffect(() => {
		const audio = new Audio("/notification.mp3");
		audio.preload = "auto";
		audio.volume = 1;
		notificationSound.current = audio;

		const unlockAudio = async () => {
			try {
				await audio.play();
				audio.pause();
				audio.currentTime = 0;
			} catch (err) {
				// butuh interaksi user dulu sebelum browser mengizinkan audio - wajar, diabaikan
			}
		};

		const handleFirstInteraction = () => {
			unlockAudio();
			window.removeEventListener("pointerdown", handleFirstInteraction);
			window.removeEventListener("keydown", handleFirstInteraction);
		};

		window.addEventListener("pointerdown", handleFirstInteraction);
		window.addEventListener("keydown", handleFirstInteraction);

		return () => {
			window.removeEventListener("pointerdown", handleFirstInteraction);
			window.removeEventListener("keydown", handleFirstInteraction);
		};
	}, []);

	useEffect(() => {
		let previousCount = null;

		const fetchUnreadCount = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) return;

				const res = await fetch("http://127.0.0.1:8000/api/notifications/unread-count", {
					headers: { Authorization: `Bearer ${token}` },
				});

				const data = await res.json();
				const count = data.unread_count || 0;

				// Kalau jumlah belum-dibaca bertambah, ambil isi notifikasi TERBARU
				// yang sesungguhnya (title/message/category/link), bukan teks generik.
				if (previousCount !== null && count > previousCount) {
					try {
						const notifRes = await fetch("http://127.0.0.1:8000/api/notifications", {
							headers: { Authorization: `Bearer ${token}` },
						});
						const notifList = await notifRes.json();
						const latest = Array.isArray(notifList) ? notifList[0] : null;

						setPopupNotif(
							latest
								? { title: latest.title, message: latest.message, category: latest.category, link: latest.link }
								: { title: "Notifikasi Baru", message: "Kamu punya notifikasi baru", category: "system", link: null }
						);
					} catch (e) {
						setPopupNotif({ title: "Notifikasi Baru", message: "Kamu punya notifikasi baru", category: "system", link: null });
					}

					setTimeout(() => setPopupNotif(null), 4000);

					if (notificationSound.current) {
						try {
							notificationSound.current.currentTime = 0;
							notificationSound.current.play();
						} catch (err) {
							// diabaikan - browser mungkin belum unlock audio
						}
					}

					if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
				}

				previousCount = count;
				setNotifications(new Array(count).fill(true));
				setHasNewNotif(count > 0);
			} catch (err) {
				console.error("Fetch unread notif count error:", err);
			}
		};

		fetchUnreadCount();

		// Polling berkala supaya badge notifikasi selalu terkini
		const interval = setInterval(fetchUnreadCount, 15000);

		return () => clearInterval(interval);
	}, []);

	// Menentukan judul halaman berdasarkan path
	const getPageTitle = () => {
		const path = location.pathname;
		if (path.includes("nebeng-motor")) return "Nebeng Motor";
		if (path.includes("nebeng-barang")) return "Nebeng Barang";
		if (path.includes("riwayat")) return "Riwayat Pesanan";
		if (path.includes("pesan")) return "Pesan Percakapan";
		if (path.includes("profil")) return "Profil Pengguna";
		if (path.includes("notifikasi")) return "Pusat Notifikasi";
		return "Dashboard Utama";
	};

	return (
		// ================= STRUKTUR BARU: KOLOM FLEX MURNI =================
		// Sebelumnya wrapper ini "min-h-screen" (halaman scroll normal di level
		// body, nav dibuat "fixed" di atasnya). Sekarang wrapper ini persis
		// setinggi layar dan TIDAK pernah scroll sendiri ("overflow-hidden") -
		// yang scroll cuma <main> di dalamnya. Nav mobile jadi elemen flex
		// BIASA di baris paling bawah, jadi posisinya murni hasil perhitungan
		// tinggi kolom oleh browser, bukan `position: fixed` yang bisa salah
		// acuan kalau halaman dirender di dalam <iframe> yang di-scale (lihat
		// MobilePreviewFrame.jsx).
		//
		// PENTING: dipakai "h-full" (mengandalkan rantai height:100% dari
		// html/body/#root di index.css), BUKAN "h-dvh". Unit "dvh" punya
		// inkonsistensi yang terdokumentasi khusus DI DALAM <iframe> di
		// beberapa browser (bisa tidak menghitung penuh sesuai ukuran asli
		// iframe-nya), padahal MobilePreviewFrame merender semua halaman
		// customer/mitra di dalam iframe saat window lebar (mode "preview HP"
		// di desktop). Persentase height ("100%") berperilaku identik di
		// document manapun (baik iframe maupun bukan), jadi lebih aman untuk
		// skenario ini.
		<div className="flex h-full overflow-hidden bg-[#F8FAFC] font-sans">
			{/* ================= POPUP NOTIFICATION ================= */}
			{popupNotif && (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm animate-in slide-in-from-top-5 fade-in duration-300">
					<div
						className={`relative overflow-hidden rounded-3xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl ${popupNotif.link ? "cursor-pointer" : ""}`}
						onClick={() => {
							if (popupNotif.link) {
								navigate(popupNotif.link);
								setPopupNotif(null);
							}
						}}
					>
						<div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-cyan-500/10"></div>

						<div className="relative p-4 flex items-start gap-3">
							{(() => {
								const style = getNotifStyle(popupNotif.category);
								const Icon = style.icon;
								return (
									<div className={`w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center shrink-0`}>
										<Icon className={style.color} size={22} />
									</div>
								);
							})()}

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<p className="text-sm font-black text-indigo-900">{popupNotif.title}</p>
									<div className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide">Baru</div>
								</div>
								<p className="text-xs text-gray-500 mt-1 leading-relaxed">{popupNotif.message}</p>
							</div>

							<button
								onClick={(e) => {
									e.stopPropagation();
									setPopupNotif(null);
								}}
								className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
							>
								<X size={16} className="text-gray-400" />
							</button>
						</div>

						<div className="h-1 bg-gray-100 overflow-hidden">
							<div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-[shrink_4s_linear_forwards]"></div>
						</div>
					</div>
				</div>
			)}

			{/* Sidebar Component (desktop, fixed - tidak berubah) */}
			<CustomerSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

			{/* Kolom kanan: header (atas) + main scrollable (tengah) + nav mobile (bawah) */}
			<div className="flex-1 flex flex-col h-full min-w-0 md:ml-72 transition-all duration-300">
				{/* HEADER */}
				<header className={`shrink-0 z-40 px-4 sm:px-8 py-4 flex items-center justify-between transition-all duration-300 ${isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-indigo-900 md:bg-transparent"}`}>
					{/* ================= LEFT SECTION ================= */}
					<div className="flex items-center gap-4">
						{/* Tampilan MOBILE: Hallo [Nama] */}
						<div className="md:hidden flex items-center gap-2">
							<h1 className="text-xl font-black text-white tracking-tight leading-tight truncate max-w-[200px]">Hallo {loadingUser ? "..." : user?.name} 👋</h1>
						</div>

						{/* Tampilan DESKTOP: Breadcrumb Title */}
						<div className="hidden md:block text-left">
							<h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Halaman</h2>
							<h1 className="text-lg font-black text-indigo-900 tracking-tight">{getPageTitle()}</h1>
						</div>
					</div>

					{/* ================= RIGHT SECTION ================= */}
					<div className="flex items-center gap-3 sm:gap-6">
						{/* Notification Icon */}
						<Link
							to="/customer/notifikasi"
							className={`relative p-2.5 rounded-xl transition-all group ${isScrolled ? "bg-white border border-gray-100 text-gray-400" : "bg-white/10 md:bg-white text-white md:text-gray-400 md:border md:border-gray-100"}`}
						>
							<Bell size={20} />
							{/* Red Dot Indicator */}
							{hasNewNotif && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-indigo-900 md:border-white"></span>}
							{notifications.length > 0 && <div className="absolute -top-1 -right-1 min-w-4.5 h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{notifications.length}</div>}
						</Link>

						{/* Profile Dropdown: Sembunyikan di Mobile, Muncul di Desktop */}
						<Link to="/customer/profil" className="hidden md:flex items-center gap-3 p-1.5 pr-3 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all group">
							<div className="relative">
								<img src={avatarUrl} alt="Profile" className="w-10 h-10 rounded-xl bg-indigo-800 border border-white/10" />
								<div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
							</div>
							<div className="text-left">
								<p className="text-xs font-black text-indigo-900 leading-none">{loadingUser ? "Loading..." : user?.name}</p>
								<p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">{user?.role || "Customer"}</p>
							</div>
							<ChevronDown size={14} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
						</Link>
					</div>
				</header>

				{/* MAIN CONTENT AREA - satu-satunya bagian yang scroll */}
				<main className="flex-1 min-h-0 overflow-y-auto w-full px-4 sm:px-6 md:px-8">
					{/* PENTING: div ini WAJIB "h-full". Tanpa ini, halaman seperti
					    Pesan.jsx (yang mengandalkan h-full untuk mengunci tinggi &
					    membuat header chat "sticky") jadi gagal - karena h-full di
					    dalamnya butuh parent langsung dengan tinggi PASTI, bukan auto.
					    Sebelumnya div ini TIDAK punya tinggi sama sekali, jadi
					    seluruh <main> ini yang ikut ke-scroll (termasuk header chat),
					    bukan cuma area pesannya saja - inilah sebab utama header chat
					    "ikut ke-scroll" walau kodenya sudah "sticky". */}
					<div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-700">{children}</div>

				</main>

				{/* NAV MOBILE - elemen flex biasa di baris paling bawah kolom, BUKAN fixed */}
				<CustomerMobileNav />
			</div>
		</div>
	);
}