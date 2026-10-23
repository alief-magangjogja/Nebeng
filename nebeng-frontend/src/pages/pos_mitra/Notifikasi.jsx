import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import PosMitraLayout from "../../components/dashboard/PosMitraLayout";
import { ChevronLeft, Bell, Trash2, CheckCheck, Clock, QrCode, Loader2 } from "lucide-react";

export default function Notifikasi() {
	const navigate = useAppNavigate();
	const [notifications, setNotifications] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchNotifications = async () => {
			try {
				const token = localStorage.getItem("token");

				const res = await fetch("http://127.0.0.1:8000/api/notifications", {
					headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
				});

				const data = await res.json();
				setNotifications(Array.isArray(data) ? data : []);
			} catch (err) {
				console.error("Fetch notifikasi error:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchNotifications();
	}, []);

	const markAllRead = async () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

		try {
			const token = localStorage.getItem("token");
			await fetch("http://127.0.0.1:8000/api/notifications/mark-all-read", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
		} catch (err) {
			console.error(err);
		}
	};

	const deleteNotification = async (id) => {
		setNotifications((prev) => prev.filter((n) => n.id !== id));

		try {
			const token = localStorage.getItem("token");
			await fetch(`http://127.0.0.1:8000/api/notifications/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
		} catch (err) {
			console.error(err);
		}
	};

	return (
		<PosMitraLayout>
			<div className="w-full max-w-3xl mx-auto px-4 py-6">
				<div className="flex items-center justify-between gap-4 mb-8">
					<div className="flex items-center gap-4">
						<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
							<ChevronLeft className="w-6 h-6 text-indigo-900" />
						</button>
						<div>
							<h1 className="text-2xl font-black text-indigo-900">Notifikasi</h1>
							<p className="text-sm text-gray-400">Riwayat aktivitas scan QR kamu</p>
						</div>
					</div>

					<button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-500 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all border border-gray-100 hover:border-indigo-200">
						<CheckCheck size={16} />
						Tandai Baca Semua
					</button>
				</div>

				<div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
					{isLoading ? (
						<div className="flex items-center justify-center py-16 text-gray-400 gap-2">
							<Loader2 className="animate-spin" size={20} /> Memuat notifikasi...
						</div>
					) : notifications.length > 0 ? (
						<div className="space-y-3">
							{notifications.map((n) => (
								<div key={n.id} className={`group flex items-start gap-4 p-4 rounded-3xl border transition-all ${!n.is_read ? "border-l-4 border-l-indigo-600 border-gray-100 bg-gray-50/50" : "border-gray-50 opacity-80"}`}>
									<div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
										<QrCode size={20} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex justify-between items-start gap-2">
											<p className="text-sm font-bold text-gray-800">{n.title}</p>
											<button onClick={() => deleteNotification(n.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
												<Trash2 size={14} />
											</button>
										</div>
										<p className="text-xs text-gray-400 mt-1">{n.message}</p>
										<div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-300 uppercase tracking-wider mt-2">
											<Clock size={11} />
											{new Date(n.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-gray-300">
							<Bell size={40} className="mb-2" />
							<p className="text-sm font-bold">Belum ada notifikasi</p>
						</div>
					)}
				</div>
			</div>
		</PosMitraLayout>
	);
}