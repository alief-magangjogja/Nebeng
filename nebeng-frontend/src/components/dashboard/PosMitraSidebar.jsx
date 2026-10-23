import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Clock, User, LogOut, QrCode, Ticket, Bell } from "lucide-react";
import { useUser } from "../../context/UserContext";

export default function PosMitraSidebar() {
    const navigate = useNavigate();
    const { user, clearUser } = useUser();
    const avatarUrl = user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "User"}`;

    // Menu Desktop (Biasa) & Mobile Sides (Menu "Pesan" sudah dihapus)
    const leftMenus = [
        { name: "Beranda", path: "/pos-mitra/dashboard", icon: Home },
        { name: "Aktivitas", path: "/pos-mitra/aktivitas", icon: Clock },
    ];

    const rightMenus = [
        { name: "Voucher", path: "/pos-mitra/klaim-voucher", icon: Ticket },
        { name: "Profil", path: "/pos-mitra/profil", icon: User },
    ];

    // Gabungan untuk mempermudah mapping di versi Desktop Sidebar
    const allMenus = [...leftMenus, { name: "Scan QR", path: "/pos-mitra/scan", icon: QrCode }, ...rightMenus];

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
            <div className="fixed z-50 top-0 left-0 h-screen w-72 bg-[#0b2f83] text-white hidden md:flex flex-col shadow-2xl border-r border-white/5">
                {/* LOGO */}
                <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white text-[#0b2f83] rounded-2xl shadow-md">
                            <QrCode size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter leading-none">POS MITRA</h1>
                            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mt-1">Nebeng Yuk © 2026</p>
                        </div>
                    </div>
                </div>

                {/* MENU UTAMA DESKTOP */}
                <div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
                    <nav className="flex flex-col gap-1">
                        {allMenus.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) => `
                                    flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-semibold text-sm
                                    ${isActive ? "bg-white text-[#0b2f83] shadow-lg" : "text-blue-100 hover:bg-white/10"}
                                `}
                            >
                                <item.icon size={20} />
                                <span>{item.name}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                 {/* LOGOUT */}
                <div className="p-6 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all font-semibold text-xs uppercase tracking-wider"
                    >
                        <LogOut size={14} /> Keluar
                    </button>
                </div>
            </div>

            {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 md:hidden px-2 pb-3 pt-1 shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
                <nav className="relative flex items-center justify-between max-w-md mx-auto">
                    {/* Sisi Kiri: Beranda & Aktivitas */}
                    <div className="flex flex-1 justify-around items-center pr-6">
                        {leftMenus.map((item) => (
                            <NavLink key={item.name} to={item.path} className={({ isActive }) => `relative flex flex-col items-center pt-2 w-16 transition-colors ${isActive ? "text-[#0b2f83]" : "text-gray-400"}`}>
                                {({ isActive }) => (
                                    <>
                                        {isActive && <div className="absolute top-0 w-12 h-0.5 bg-[#0b2f83] rounded-full" />}
                                        <item.icon size={22} className="mb-0.5" />
                                        <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>

                    {/* TENGAH: FLOATING ACTION BUTTON SCAN QR */}
                    <div className="relative -top-5 flex flex-col items-center z-10 mx-2">
                        <NavLink
                            to="/pos-mitra/scan"
                            className={({ isActive }) => `
                                w-14 h-14 rounded-full flex items-center justify-center shadow-lg transform transition-transform active:scale-95
                                ${isActive ? "bg-indigo-900 text-white border-4 border-blue-100" : "bg-[#0b2f83] text-white border-4 border-white"}
                            `}
                        >
                            <QrCode size={26} strokeWidth={2.5} />
                        </NavLink>
                        <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">Scan</span>
                    </div>

                    {/* Sisi Kanan: Voucher & Profil */}
                    <div className="flex flex-1 justify-around items-center pl-6">
                        {rightMenus.map((item) => (
                            <NavLink key={item.name} to={item.path} className={({ isActive }) => `relative flex flex-col items-center pt-2 w-16 transition-colors ${isActive ? "text-[#0b2f83]" : "text-gray-400"}`}>
                                {({ isActive }) => (
                                    <>
                                        {isActive && <div className="absolute top-0 w-12 h-0.5 bg-[#0b2f83] rounded-full" />}
                                        <item.icon size={22} className="mb-0.5" />
                                        <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </div>

            {/* CSS helper */}
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </>
    );
}