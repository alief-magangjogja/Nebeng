import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useUser } from "../../context/UserContext";

import { LayoutDashboard, Users, User, ClipboardList, RefreshCcw, FileText, LogOut, ChevronRight, X, Bike, ShieldCheck, Tag, Store, DollarSign, Gift, Wallet, ShieldAlert } from "lucide-react";

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
	const location = useLocation();
	const navigate = useNavigate();
	const pathname = location.pathname;

	const [openPosMitra, setOpenPosMitra] = useState(pathname.startsWith("/admin/pengaturan/pickup-point") || pathname.startsWith("/admin/pos-mitra"));

	/* ================= USER STATE ================= */
	const { user, clearUser } = useUser();

	const avatarUrl = user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "Admin"}`;

	/* ================= DROPDOWN STATE ================= */
	const [openVerifikasi, setOpenVerifikasi] = useState(pathname.startsWith("/admin/verifikasi"));

	const [openMitra, setOpenMitra] = useState(
		pathname.startsWith("/admin/mitra") ||
			pathname.startsWith("/admin/kendaraan-mitra") ||
			pathname.startsWith("/admin/blokir-mitra") ||
			pathname.startsWith("/admin/banding-mitra")
	);

	const [openCustomer, setOpenCustomer] = useState(pathname.startsWith("/admin/customer") || pathname.startsWith("/admin/blokir-customer"));

	/* ================= LOGOUT ================= */
	const handleLogout = () => {
		localStorage.removeItem("token");
		clearUser();
		navigate("/login");
	};

	/* ================= STYLE MENU ================= */
	const menuStyle = ({ isActive }) =>
		`group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive ? "bg-white text-indigo-900 shadow-xl shadow-black/20 translate-x-2" : "hover:bg-white/5 text-white/60 hover:text-white"}`;

	const subMenuStyle = ({ isActive }) => `py-2 transition-all ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`;

	return (
		<>
			{/* MOBILE OVERLAY */}
			{sidebarOpen && <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

			{/* SIDEBAR */}
			<div
				className={`fixed z-50 top-0 left-0 h-screen w-72 bg-indigo-900 text-white flex flex-col shadow-2xl transform transition-all duration-500 ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				} md:translate-x-0 border-r border-white/5`}
			>
				{/* LOGO */}
				<div className="p-8 relative">
					<button className="absolute right-4 top-8 p-1 bg-white/10 rounded-lg md:hidden" onClick={() => setSidebarOpen(false)}>
						<X size={20} />
					</button>

					<div className="flex items-center gap-3">
						<div className="p-2.5 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl">
							<Bike size={28} />
						</div>

						<div>
							<h1 className="text-2xl font-black tracking-tighter">NEBENG.</h1>
							<p className="text-[10px] font-bold text-sky-300 uppercase tracking-[0.2em] mt-1">Premium Travel</p>
						</div>
					</div>
				</div>

				{/* MENU */}
				<div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
					<p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 pl-4">Menu Utama</p>

					<nav className="flex flex-col gap-2">
						<NavLink to="/admin/dashboard" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<LayoutDashboard size={20} />
								<span className="text-sm font-bold">Dashboard</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						{/* VERIFIKASI */}
						<button onClick={() => setOpenVerifikasi(!openVerifikasi)} className="group flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-white/5 text-white/60 hover:text-white">
							<div className="flex items-center gap-4">
								<Users size={20} />
								<span className="text-sm font-bold">Verifikasi Data</span>
							</div>
							<ChevronRight size={16} className={openVerifikasi ? "rotate-90" : ""} />
						</button>

						{openVerifikasi && (
							<div className="ml-8 flex flex-col border-l border-white/5 pl-4 text-sm">
								<NavLink to="/admin/verifikasi-mitra" className={subMenuStyle}>
									Verifikasi Mitra
								</NavLink>

								<NavLink to="/admin/verifikasi-customer" className={subMenuStyle}>
									Verifikasi Customer
								</NavLink>
							</div>
						)}

						{/* Mitra */}
						<button onClick={() => setOpenMitra(!openMitra)} className="group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 hover:bg-white/5 text-white/60 hover:text-white">
							<div className="flex items-center gap-4">
								<User size={20} className="shrink-0" />
								<span className="text-sm font-bold tracking-tight">Mitra</span>
							</div>
							<ChevronRight size={16} className={`transition-transform duration-300 ${openMitra ? "rotate-90" : ""}`} />
						</button>

						{openMitra && (
							<div className="ml-8 flex flex-col border-l border-white/5 pl-4 text-sm">
								<NavLink to="/admin/mitra" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Daftar Mitra
								</NavLink>

								<NavLink to="/admin/kendaraan-mitra" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Kendaraan Mitra
								</NavLink>

								<NavLink to="/admin/blokir-mitra" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Blokir
								</NavLink>

								<NavLink to="/admin/banding-mitra" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Banding Mitra
								</NavLink>
							</div>
						)}

						{/* Customer */}
						<button onClick={() => setOpenCustomer(!openCustomer)} className="group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 hover:bg-white/5 text-white/60 hover:text-white">
							<div className="flex items-center gap-4">
								<Users size={20} className="shrink-0" />
								<span className="text-sm font-bold tracking-tight">Customer</span>
							</div>
							<ChevronRight size={16} className={`transition-transform duration-300 ${openCustomer ? "rotate-90" : ""}`} />
						</button>

						{openCustomer && (
							<div className="ml-8 flex flex-col border-l border-white/5 pl-4 text-sm">
								<NavLink to="/admin/customer" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Daftar Customer
								</NavLink>

								<NavLink to="/admin/blokir-customer" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Blokir
								</NavLink>
							</div>
						)}

						{/* PESANAN */}
						<NavLink to="/admin/pesanan" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<ClipboardList size={20} />
								<span className="text-sm font-bold">Pesanan</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						{/* KELOLA REWARD */}
						<NavLink to="/admin/rewards" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<Gift size={20} />
								<span className="text-sm font-bold">Kelola Reward</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						{/* PENDAPATAN */}
						{/* Sebelumnya "Penarikan Saldo" -> diganti "Pendapatan" karena
						    mitra tidak lagi menarik saldo lewat platform (QRIS statis
						    langsung masuk ke rekening/e-wallet mitra sendiri). Halaman
						    ini sudah dibangun lengkap dengan filter tanggal. */}
						<NavLink to="/admin/pendapatan" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<DollarSign size={20} />
								<span className="text-sm font-bold">Pendapatan</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						<NavLink to="/admin/sos-monitor" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<ShieldAlert size={20} />
								<span className="text-sm font-bold">Pemantauan SOS</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						{/* KOMPLAIN MITRA (REFUND) */}
						<NavLink to="/admin/refund" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<RefreshCcw size={20} />
								<span className="text-sm font-bold">Komplain Refund</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						{/* TARIF NEBENG - sekarang link mandiri, bukan dropdown lagi */}
						<NavLink to="/admin/pengaturan/tarif" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<Tag size={20} />
								<span className="text-sm font-bold">Tarif Nebeng</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						{/* POS MITRA - daftar akun pos mitra & pickup point jadi satu dropdown */}
						<button onClick={() => setOpenPosMitra(!openPosMitra)} className="group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 hover:bg-white/5 text-white/60 hover:text-white">
							<div className="flex items-center gap-4">
								<Store size={20} className="shrink-0" />
								<span className="text-sm font-bold tracking-tight">Pos Mitra</span>
							</div>

							<ChevronRight size={16} className={`transition-transform duration-300 ${openPosMitra ? "rotate-90" : ""}`} />
						</button>

						{openPosMitra && (
							<div className="ml-8 flex flex-col border-l border-white/5 pl-4 text-sm">
								<NavLink to="/admin/pos-mitra" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Daftar Pos Mitra
								</NavLink>

								<NavLink to="/admin/pengaturan/pickup-point" className={({ isActive }) => `py-2 ${isActive ? "text-sky-300 font-bold" : "text-white/60 hover:text-white"}`}>
									Pickup Point
								</NavLink>
							</div>
						)}

						{/* Profil */}
						<NavLink to="/admin/profil" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<User size={20} />
								<span className="text-sm font-bold">Profil</span>
							</div>
							<ChevronRight size={16} />
						</NavLink>

						{/* REFUND */}
						{/* <NavLink to="/admin/refund" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<RefreshCcw size={20} />
								<span className="text-sm font-bold">Refund</span>
							</div>
							<ChevronRight size={16} />
						</NavLink> */}

						{/* LAPORAN */}
						{/* <NavLink to="/admin/laporan" onClick={() => setSidebarOpen(false)} className={menuStyle}>
							<div className="flex items-center gap-4">
								<FileText size={20} />
								<span className="text-sm font-bold">Laporan</span>
							</div>
							<ChevronRight size={16} />
						</NavLink> */}
					</nav>

					{/* INFO CARD */}
					<div className="mt-6 mx-2 p-5 bg-gradient-to-br from-indigo-800 to-indigo-950 rounded-[24px] border border-white/5">
						<ShieldCheck className="text-sky-400 mb-3" size={20} />
						<p className="text-xs font-black text-white mb-1">Keamanan Prioritas</p>
						<p className="text-[10px] text-white/50 leading-relaxed">Perjalananmu selalu dipantau sistem GPS 24/7.</p>
					</div>
				</div>

				{/* LOGOUT */}
				<div className="p-6">
					<button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold text-sm">
						<LogOut size={18} />
						Keluar
					</button>
				</div>
				<style>{`
					.no-scrollbar::-webkit-scrollbar {
						display: none;
					}
				`}</style>
			</div>
		</>
	);
}