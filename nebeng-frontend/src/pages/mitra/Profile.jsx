import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import {
    User,
    ShieldCheck,
    HelpCircle,
    LogOut,
    ChevronRight,
    Camera,
    QrCode,
    Car,
    Star,
    AlertTriangle
} from "lucide-react";
import axios from "../../api/axios";

export default function Profile() {
    const [user, setUser] = useState({
        name: "",
        email: "",
        phone: "",
        avatar: null,
    });
    const navigate = useAppNavigate();
    const [ratingStats, setRatingStats] = useState(null);

    const avatarUrl = user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "User"}`;

    // Menu Informasi Akun yang sudah diringkas & disederhanakan
    const accountMenu = [
        {
            id: 2,
            label: "Edit Profil",
            icon: User,
            color: "text-blue-500",
            bg: "bg-blue-50",
            path: "/mitra/edit-profile",
        },
        {
            id: 13,
            label: "Kendaraan Saya",
            icon: Car,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            path: "/mitra/kendaraan",
        },
        {
            id: 9,
            label: "QRIS Saya",
            icon: QrCode,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            path: "/mitra/qris-saya",
        },
        {
            id: 14,
            label: "Rating & Ulasan",
            icon: Star,
            color: "text-amber-500",
            bg: "bg-amber-50",
            path: "/mitra/rating-ulasan",
        },
        {
            id: 14,
            label: "Teguran & Pelanggaran",
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-50",
            path: "/mitra/teguran",
        },
    ];

    const otherMenu = [
        { id: 10, label: "Keamanan & Dokumen", icon: ShieldCheck, color: "text-indigo-700", bg: "bg-indigo-50", path: "/mitra/keamanan" },
        { id: 11, label: "Pusat Bantuan", icon: HelpCircle, color: "text-slate-700", bg: "bg-slate-100", path: "/mitra/pusat-bantuan" },
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

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

    useEffect(() => {
        if (!user.id) return;

        axios
            .get(`/mitra/${user.id}/profile`)
            .then((res) => setRatingStats(res.data))
            .catch((err) => console.error("Gagal memuat skor mitra:", err));
    }, [user.id]);

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
        <MitraLayout>
            <div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-24">
                {/* HEADER */}
                <div className="flex items-center gap-3 mb-8 lg:hidden">
                    <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-900 border border-indigo-100 flex items-center justify-center">
                        <User size={22} />
                    </div>
                    <h1 className="text-xl font-black text-indigo-900 tracking-tight">Profil Mitra</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* SISI KIRI: Profil Card */}
                    <div className="lg:col-span-4 lg:sticky lg:top-6">
                        <div className="bg-indigo-900 rounded-[40px] p-8 text-center text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="relative w-32 h-32 mx-auto mb-6">
                                    <div className="w-full h-full rounded-full border-4 border-white/20 overflow-hidden shadow-2xl">
                                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover bg-white" />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black tracking-tight mb-1">{user.name || "Loading..."}</h2>
                                <p className="text-indigo-200 text-sm font-medium">{user.email || ""}</p>

                                {ratingStats && (
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-xl border border-white/20">
                                            <Star size={14} className="fill-amber-400 text-amber-400" />
                                            <span className="text-xs font-black text-white">{ratingStats.average_rating ?? "Baru"}</span>
                                        </div>
                                        <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/20">
                                            <span className="text-xs font-black text-white">{ratingStats.total_trips_completed}</span>
                                            <span className="text-[10px] text-indigo-200 font-bold ml-1">trip</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SISI KANAN: Menu Ringkas */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Menu Utama</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                            <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Keamanan & Bantuan</h3>
                            <div className="space-y-2">
                                {otherMenu.map((item) => (
                                    <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 ${item.bg} ${item.color} rounded-2xl shadow-sm`}>
                                                <item.icon size={20} />
                                            </div>
                                            <span className="text-sm font-bold text-gray-700">{item.label}</span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ))}
                                <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-red-50 transition-all group mt-2 border border-transparent hover:border-red-100">
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
        </MitraLayout>
    );
}