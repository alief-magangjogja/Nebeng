import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Clock, MessageSquare, User, LogOut, X, Bike, ChevronRight, ShieldCheck } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useEffect, useState } from "react";

const mainMenus = [
	{ name: "Beranda", path: "/mitra/dashboard", icon: Home },
	{ name: "Riwayat", path: "/mitra/riwayat", icon: Clock },
	{ name: "Pesan", path: "/mitra/pesan-mitra", icon: MessageSquare },
	{ name: "Profil", path: "/mitra/profil", icon: User },
];

export function MitraMobileNav() {
	return (
		<div className="z-50 bg-white border-t border-gray-100 md:hidden px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-2 pt-2 shrink-0">
			<nav className="flex items-center justify-around">
				{mainMenus.map((item) => (
					<NavLink
						key={item.name}
						to={item.path}
						className={({ isActive }) => `
                                relative flex flex-col items-center justify-center py-2 px-4 transition-all duration-300
                                ${isActive ? "text-indigo-900 scale-105" : "text-gray-300"}
                            `}
					>
						{({ isActive }) => (
							<>
								{/* Indikator Garis Atas */}
								{isActive && <div className="absolute -top-[10px] w-12 h-1 bg-indigo-900 rounded-full animate-in slide-in-from-top-1" />}
								<item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
								<span className={`text-[10px] font-black uppercase tracking-tight ${isActive ? "opacity-100" : "opacity-60"}`}>{item.name}</span>
							</>
						)}
					</NavLink>
				))}
			</nav>
		</div>
	);
}

export default function MitraSidebar({ sidebarOpen, setSidebarOpen }) {
	const navigate = useNavigate();
	const { user, clearUser } = useUser();
	const avatarUrl = user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "User"}`;

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
			clearUser();
			navigate("/login");
		} catch (err) {
			console.error("Logout error:", err);
		}
	};

	return (
		<>
			{/* ================= DESKTOP SIDEBAR ================= */}
			<div
				className={`fixed z-50 top-0 left-0 h-screen w-72 
                bg-indigo-900 text-white hidden md:flex flex-col shadow-2xl
                border-r border-white/5`}
			>
				{/* LOGO */}
				<div className="p-8 relative">
					<div className="flex items-center gap-3 group cursor-pointer">
						<div className="p-2.5 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
							<Bike size={28} className="text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-black tracking-tighter leading-none">NEBENG.</h1>
							<p className="text-[10px] font-bold text-sky-300 uppercase tracking-[0.2em] mt-1">Premium Travel</p>
						</div>
					</div>
				</div>

				{/* MENU */}
				<div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
					<p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 pl-4">Menu Utama</p>
					<nav className="flex flex-col gap-2">
						{mainMenus.map((item) => (
							<NavLink
								key={item.name}
								to={item.path}
								className={({ isActive }) => `
                                    group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300
                                    ${isActive ? "bg-white text-indigo-900 shadow-xl" : "hover:bg-white/5 text-white/60 hover:text-white"}
                                `}
							>
								<div className="flex items-center gap-4">
									<item.icon size={20} />
									<span className="text-sm font-bold tracking-tight">{item.name}</span>
								</div>
								<ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
							</NavLink>
						))}
					</nav>
				</div>

				{/* USER PROFILE */}
				<div className="p-6 space-y-4">
					<div className="flex items-center gap-3 p-3 bg-black/20 rounded-2xl border border-white/5">
						<img src={avatarUrl} className="w-10 h-10 rounded-xl bg-indigo-800" alt="avatar" />
						<div className="min-w-0 text-left">
							<p className="text-xs font-black truncate">{user?.name || "Loading..."}</p>
							<p className="text-[10px] text-emerald-400 font-bold uppercase">{user?.role || "Mitra"}</p>
						</div>
					</div>
					<button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm">
						<LogOut size={18} /> Keluar
					</button>
				</div>
			</div>

			{/* Style for no-scrollbar */}
			<style>{`
				.no-scrollbar::-webkit-scrollbar {
					display: none;
				}
			`}</style>
		</>
	);
}