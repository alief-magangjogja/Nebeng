import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import AdminLayout from "../../components/dashboard/AdminLayout";
import {
	ChevronLeft,
	Settings, // Digunakan untuk menu Pengaturan
	User,
	FileText, // Digunakan untuk menu Dokumen
	Lock,
	MapPin,
	ShieldCheck,
	HelpCircle,
	LogOut,
	ChevronRight,
	Camera,
	KeyRound,
} from "lucide-react";

export default function Profile() {
	const [user, setUser] = useState({
		name: "",
		email: "",
		phone: "",
		avatar: null,
	});
	const navigate = useAppNavigate();

	const avatarUrl = user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "User"}`;

	const accountMenu = [
		// {
		// 	id: 1,
		// 	label: "Pengaturan",
		// 	icon: Settings,
		// 	color: "text-amber-500",
		// 	bg: "bg-amber-50",
		// 	path: "/admin/settings",
		// },
		{
			id: 2,
			label: "Edit Profil",
			icon: User,
			color: "text-blue-500",
			bg: "bg-blue-50",
			path: "/admin/edit-profile",
		},
		// {
		// 	id: 3,
		// 	label: "Dokumen",
		// 	icon: FileText,
		// 	color: "text-emerald-500",
		// 	bg: "bg-emerald-50",
		// 	path: "/admin/dokumen",
		// },
		// {
		// 	id: 5,
		// 	label: "Atur PIN",
		// 	icon: Lock,
		// 	color: "text-slate-700",
		// 	bg: "bg-slate-100",
		// 	path: "/admin/atur-pin",
		// },
		{
			id: 7,
			label: "Atur Password",
			icon: KeyRound,
			color: "text-purple-600",
			bg: "bg-purple-50",
			path: "/admin/atur-password",
		},

		// {
		// 	id: 8,
		// 	label: "Status Akun",
		// 	icon: ShieldCheck,
		// 	color: "text-sky-500",
		// 	bg: "bg-sky-50",
		// 	path: "/admin/status-akun",
		// },
	];

	const otherMenu = [
		{ id: 10, label: "Keamanan", icon: ShieldCheck, color: "text-slate-700", bg: "bg-slate-100" },
		{ id: 11, label: "Pusat Bantuan", icon: HelpCircle, color: "text-slate-700", bg: "bg-slate-100" },
	];

	// ===============================
	// FETCH PROFILE
	// ===============================
	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					console.error("Token tidak ditemukan");
					return;
				}

				const res = await fetch("http://127.0.0.1:8000/api/profile", {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				if (!res.ok) throw new Error("Gagal mengambil profile");

				const data = await res.json();
				setUser(data);
			} catch (err) {
				console.error("Fetch profile error:", err);
			}
		};

		fetchProfile();
	}, []);

	// ===============================
	// LOGOUT
	// ===============================
	const handleLogout = async () => {
		try {
			const token = localStorage.getItem("token");
			await fetch("http://127.0.0.1:8000/api/logout", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});
			localStorage.removeItem("token");
			window.location.href = "/login";
		} catch (err) {
			console.error("Logout error:", err);
		}
	};

	return (
		<AdminLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-24">
				{/* HEADER & BACK (Mobile Only) */}
				<div className="flex items-center gap-4 mb-8 lg:hidden">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
						<ChevronLeft className="w-6 h-6 text-indigo-900" />
					</button>
					<h1 className="text-xl font-black text-indigo-900">Profil Admin</h1>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* SISI KIRI: Profil Card */}
					<div className="lg:col-span-4 sticky top-6">
						<div className="bg-indigo-900 rounded-[40px] p-8 text-center text-white shadow-xl relative overflow-hidden">
							<div className="relative z-10">
								<div className="relative w-32 h-32 mx-auto mb-6">
									<div className="w-full h-full rounded-full border-4 border-white/20 overflow-hidden shadow-2xl">
										<img src={avatarUrl} alt="Profile" className="w-full h-full object-cover bg-white" />
									</div>
								</div>
								<h2 className="text-2xl font-black tracking-tight mb-1">{user.name || "Loading..."}</h2>
								<p className="text-indigo-200 text-sm font-medium">{user.email || ""}</p>
							</div>
							<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
							<div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
						</div>
					</div>

					{/* SISI KANAN: Menu */}
					<div className="lg:col-span-8 space-y-6">
						<div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
							<h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-8">Informasi Akun</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{accountMenu.map((item) => (
									<button key={item.id} onClick={() => item.path && navigate(item.path)} className="flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-100">
										<div className="flex items-center gap-4">
											<div className={`p-3 ${item.bg} ${item.color} rounded-2xl shadow-sm group-hover:scale-110 transition-transform`}>
												<item.icon size={20} />
											</div>
											<span className="text-sm font-bold text-gray-700">{item.label}</span>
										</div>
										<ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
									</button>
								))}
							</div>
						</div>

						<div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
							<h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-8">Bantuan & Keamanan</h3>
							<div className="space-y-2">
								{otherMenu.map((item) => (
									<button key={item.id} className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-100">
										<div className="flex items-center gap-4">
											<div className={`p-3 ${item.bg} ${item.color} rounded-2xl shadow-sm`}>
												<item.icon size={20} />
											</div>
											<span className="text-sm font-bold text-gray-700">{item.label}</span>
										</div>
										<ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
									</button>
								))}
								<button onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-red-50 transition-all group mt-4 border border-transparent hover:border-red-100">
									<div className="flex items-center gap-4">
										<div className="p-3 bg-red-100 text-red-500 rounded-2xl shadow-sm group-hover:rotate-12 transition-transform">
											<LogOut size={20} />
										</div>
										<span className="text-sm font-bold text-red-500">Keluar</span>
									</div>
									<ChevronRight size={18} className="text-red-200 group-hover:translate-x-1 transition-transform" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}
