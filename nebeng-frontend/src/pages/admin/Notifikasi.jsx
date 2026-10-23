import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { ChevronLeft, Bell, Bike, Wallet, ShieldAlert, MessageSquareWarning, Info, Loader2, CheckCheck, Car, ShieldCheck, Banknote, Star } from "lucide-react";

// Ikon & warna per kategori - disamakan persis dengan yang dipakai popup
// notifikasi & badge lonceng di AdminLayout.jsx, supaya konsisten.
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

export default function Notifikasi() {
	const navigate = useAppNavigate();
	const [loading, setLoading] = useState(true);
	const [notifications, setNotifications] = useState([]);
	const [markingAll, setMarkingAll] = useState(false);

	// Ambil notifikasi ASLI milik admin dari tabel notifications (sama
	// persis dengan sumber data yang dipakai badge lonceng & popup di
	// AdminLayout.jsx) - sebelumnya halaman ini malah bikin daftar sendiri
	// dari data verifikasi pending, jadi tidak nyambung dengan badge.
	const fetchNotifications = async () => {
		try {
			const token = localStorage.getItem("token");
			const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

			const res = await fetch("http://127.0.0.1:8000/api/notifications", { headers });

			if (res.ok) {
				const data = await res.json();
				setNotifications(Array.isArray(data) ? data : []);
			}
		} catch (err) {
			console.error("Fetch notifikasi admin error:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchNotifications();
	}, []);

	const handleOpenNotif = (notif) => {
		if (notif.link) navigate(notif.link);
	};

	const handleMarkAllRead = async () => {
		try {
			setMarkingAll(true);
			const token = localStorage.getItem("token");
			await fetch("http://127.0.0.1:8000/api/notifications/mark-all-read", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
			});
			setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
		} catch (err) {
			console.error("Gagal menandai semua notifikasi terbaca:", err);
		} finally {
			setMarkingAll(false);
		}
	};

	const hasUnread = notifications.some((n) => !n.is_read);

	return (
		<AdminLayout>
			<div className="w-full max-w-3xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex items-center justify-between gap-4 mb-8">
					<div className="flex items-center gap-4">
						<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
							<ChevronLeft className="w-6 h-6 text-indigo-900" />
						</button>
						<div>
							<h1 className="text-2xl font-black text-indigo-900">Notifikasi</h1>
							<p className="text-sm text-gray-400">Hal-hal yang perlu perhatian kamu</p>
						</div>
					</div>

					{hasUnread && (
						<button
							onClick={handleMarkAllRead}
							disabled={markingAll}
							className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-100 shadow-sm text-xs font-bold text-indigo-900 hover:bg-indigo-50 transition-all disabled:opacity-50 shrink-0"
						>
							{markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
							Tandai Semua Dibaca
						</button>
					)}
				</div>

				<div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
					{loading ? (
						<div className="flex items-center justify-center py-16 text-gray-400 gap-2">
							<Loader2 className="animate-spin" size={20} /> Memuat notifikasi...
						</div>
					) : notifications.length > 0 ? (
						<div className="space-y-3">
							{notifications.map((n) => {
								const style = getNotifStyle(n.category);
								const Icon = style.icon;
								return (
									<button
										key={n.id}
										onClick={() => handleOpenNotif(n)}
										className={`w-full flex items-start gap-4 p-4 rounded-3xl hover:bg-gray-50 transition-all text-left border ${n.is_read ? "border-transparent" : "border-indigo-100 bg-indigo-50/30"}`}
									>
										<div className={`p-3 ${style.bg} ${style.color} rounded-2xl shadow-sm shrink-0`}>
											<Icon size={20} />
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="text-sm font-bold text-gray-800">{n.title}</p>
												{!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>}
											</div>
											<p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
											<p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider mt-1.5">
												{new Date(n.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
											</p>
										</div>
									</button>
								);
							})}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-gray-300">
							<Bell size={40} className="mb-2" />
							<p className="text-sm font-bold">Belum ada notifikasi</p>
						</div>
					)}
				</div>
			</div>
		</AdminLayout>
	);
}