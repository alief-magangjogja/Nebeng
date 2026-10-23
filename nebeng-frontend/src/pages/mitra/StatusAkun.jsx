import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, ChevronRight, ChevronDown, Mail, Phone, MapPin, FileText, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { useUser } from "../../context/UserContext";

export default function StatusAkun() {
    const navigate = useAppNavigate();
    const { user, loadingUser } = useUser();
    const [openDropdown, setOpenDropdown] = useState(null);

    const [verification, setVerification] = useState(null);
    const [loadingVerification, setLoadingVerification] = useState(true);

    // Ambil status verifikasi (dokumen pendaftaran mitra) yang sebenarnya
    useEffect(() => {
        const fetchVerification = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch("http://127.0.0.1:8000/api/verification/status", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    setVerification(data);
                }
            } catch (err) {
                console.error("Gagal ambil status verifikasi:", err);
            } finally {
                setLoadingVerification(false);
            }
        };

        fetchVerification();
    }, []);

    // Data profil diambil dari akun mitra yang sedang login
    const profileData = {
        name: user?.name || "-",
        id: user?.id ?? "-",
        joinDate: user?.created_at
            ? new Date(user.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
              })
            : "-",
        phone: user?.phone || "-",
        email: user?.email || "-",
        location: user?.profile?.address || "Belum diisi",
        avatar: user?.avatar ? `http://127.0.0.1:8000/storage/${user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "Mitra"}`,
    };

    // Label & warna status verifikasi pendaftaran
    const verificationStatusLabelMap = {
        pending: "Sedang diproses",
        verified: "Disetujui & Mutlak",
        rejected: "Ditolak",
    };

    const registrationStatusLabel = verification ? verificationStatusLabelMap[verification.status] || verification.status : user?.status === "verified" ? "Disetujui & Mutlak" : "Belum ada pengajuan";

    const registrationDesc = verification
        ? verification.status === "pending"
            ? "Dokumen identitas Anda sudah terkirim dan sedang dalam proses peninjauan oleh tim admin."
            : verification.status === "verified"
            ? "Seluruh dokumen identitas dan data diri Anda telah diverifikasi secara resmi dan dikunci secara permanen (mutlak) demi keamanan sistem."
            : verification.notes || "Pengajuan verifikasi Anda ditolak, silakan hubungi admin pusat."
        : "Anda belum pernah mengajukan verifikasi dokumen mitra.";

    // Daftar informasi detail aktivitas & keamanan akun
    const accountStatuses = [
        {
            id: "pendaftaran",
            label: "Status Validasi & Identitas",
            title: "Validasi Dokumen Identitas Resmi (KTP, SIM, SKCK)",
            desc: registrationDesc,
            statusLabel: registrationStatusLabel,
            item: "Dokumen Kredensial Mitra",
            hasData: !!verification,
        },
        {
            id: "keamanan_mutlak",
            label: "Kebijakan Keamanan & Proteksi Data",
            title: "Sistem Anti-Kecurangan & Enkripsi Permanen",
            desc: "Sesuai dengan regulasi kemitraan, data identitas yang telah tervalidasi bersifat mutlak dan dikunci otomatis oleh sistem untuk mencegah celah pemalsuan atau manipulasi akun di kemudian hari.",
            statusLabel: "Aktif & Terproteksi",
            item: "Proteksi Enkripsi 256-bit",
            hasData: true,
        },
    ];

    const toggleDropdown = (id) => {
        setOpenDropdown(openDropdown === id ? null : id);
    };

    return (
        <MitraLayout>
            <div className="w-full max-w-screen-md mx-auto px-4 py-6 pb-26">
                {/* HEADER */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                        <ChevronLeft size={24} className="text-indigo-900" />
                    </button>
                    <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Status Akun</h1>
                </div>

                <div className="space-y-6">
                    {/* PROFILE CARD DENGAN BADGE KREDIBILITAS */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                        {loadingUser ? (
                            <div className="py-6 text-center text-sm font-bold text-gray-400">Memuat data akun...</div>
                        ) : (
                            <div>
                                <div className="flex flex-col items-center md:items-start md:flex-row gap-6 mb-6">
                                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-gray-50 shadow-sm shrink-0 relative">
                                        <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover bg-indigo-50" />
                                    </div>
                                    <div className="text-center md:text-left space-y-1 flex-1">
                                        <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                                            <h2 className="text-xl font-black text-gray-800">{profileData.name}</h2>
                                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black tracking-wide border border-indigo-100 mx-auto md:mx-0">
                                                <ShieldCheck size={14} /> Mitra Terverifikasi
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">
                                            ID-{profileData.id} | Bergabung sejak {profileData.joinDate}
                                        </p>
                                        <div className="pt-3 space-y-2">
                                            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 font-medium italic">
                                                <Phone size={14} className="text-indigo-400" /> {profileData.phone}
                                            </div>
                                            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 font-medium italic border-t border-gray-50 pt-2">
                                                <Mail size={14} className="text-indigo-400" /> {profileData.email}
                                            </div>
                                            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 font-medium italic border-t border-gray-50 pt-2">
                                                <MapPin size={14} className="text-indigo-400" /> {profileData.location}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DETAIL AKTIVITAS & KREDENSIAL AKUN */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4 pl-2">Informasi Kredensial & Keamanan</h3>

                        {accountStatuses.map((status) => (
                            <div key={status.id} className="group">
                                <button
                                    onClick={() => toggleDropdown(status.id)}
                                    className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                                        openDropdown === status.id ? "bg-indigo-900 border-indigo-900 shadow-lg text-white" : "bg-white border-gray-100 text-gray-700 hover:border-indigo-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Lock size={16} className={openDropdown === status.id ? "text-indigo-300" : "text-indigo-500"} />
                                        <span className="font-bold text-sm">{status.label}</span>
                                    </div>
                                    {openDropdown === status.id ? <ChevronDown size={18} /> : <ChevronRight size={18} className="text-gray-300" />}
                                </button>

                                {/* DROPDOWN CONTENT */}
                                {openDropdown === status.id && (
                                    <div className="mt-2 p-6 bg-white rounded-2xl border-2 border-indigo-50 shadow-inner animate-in slide-in-from-top-2 duration-300">
                                        <h4 className="text-lg font-black text-indigo-900 mb-2 leading-tight">{status.title}</h4>
                                        <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">{status.id === "pendaftaran" && loadingVerification ? "Memuat status..." : status.desc}</p>

                                        {status.hasData && (
                                            <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="text-sm font-black text-gray-700">{status.item}</span>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                                                        status.statusLabel.includes("Disetujui") || status.statusLabel.includes("Aktif")
                                                            ? "bg-emerald-100 text-emerald-600"
                                                            : status.statusLabel === "Ditolak"
                                                            ? "bg-red-100 text-red-600"
                                                            : "bg-orange-100 text-orange-600"
                                                    }`}
                                                >
                                                    {status.statusLabel}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MitraLayout>
    );
}