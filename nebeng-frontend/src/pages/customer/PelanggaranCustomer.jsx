import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, ShieldAlert, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import axios from "../../api/axios";

export default function PelanggaranCustomer() {
    const navigate = useAppNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchViolations = async () => {
            try {
                const res = await axios.get("/customer/violations");
                setData(res.data);
            } catch (err) {
                console.error("Gagal memuat riwayat pelanggaran:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchViolations();
    }, []);

    const strikeCount = data?.strike_count ?? 0;
    const strikeMax = data?.strike_max ?? 5;
    const isBlocked = data?.is_blocked ?? false;
    const violations = data?.violations ?? [];

    const getTypeLabel = (type) => {
        if (type === "laporan_palsu") return "Laporan Ditolak Admin";
        return type;
    };

    return (
        <CustomerLayout>
            <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 font-sans">
                {/* HEADER */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
                        <ChevronLeft size={24} className="text-indigo-900" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Riwayat Pelanggaran</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Catatan laporan yang ditolak Admin</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <Loader2 className="animate-spin text-indigo-900 mb-3" size={32} />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat riwayat...</p>
                    </div>
                ) : (
                    <>
                        {/* KARTU HITUNGAN PELANGGARAN */}
                        <div className={`rounded-[2rem] p-6 shadow-xl space-y-3 ${isBlocked ? "bg-red-600 text-white" : strikeCount > 0 ? "bg-amber-500 text-white" : "bg-indigo-900 text-white"}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                        {isBlocked ? "Akun Disuspend" : "Jumlah Pelanggaran"}
                                    </p>
                                    <h2 className="text-2xl font-black leading-tight">
                                        {strikeCount} / {strikeMax}
                                    </h2>
                                </div>
                            </div>
                            <p className="text-xs leading-relaxed opacity-90">
                                {isBlocked
                                    ? "Akun Anda telah disuspend karena berulang kali mengajukan laporan dengan bukti yang dianggap tidak valid oleh Admin. Hubungi Pusat Bantuan untuk informasi lebih lanjut."
                                    : strikeCount > 0
                                    ? `Anda sudah menerima ${strikeCount} pelanggaran karena laporan yang ditolak Admin (bukti dianggap tidak valid). ${strikeMax - strikeCount} pelanggaran lagi dan akun Anda akan otomatis disuspend.`
                                    : "Belum ada pelanggaran. Pastikan setiap laporan yang Anda ajukan disertai bukti yang valid dan relevan."}
                            </p>
                        </div>

                        {/* DAFTAR RIWAYAT */}
                        {violations.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-base font-black text-gray-800">Belum Ada Riwayat Pelanggaran</h3>
                                <p className="text-xs text-gray-400 max-w-xs">Semua laporan yang pernah Anda ajukan diterima dengan baik oleh Admin.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {violations.map((v) => (
                                    <div key={v.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-gray-800">{getTypeLabel(v.type)}</h4>
                                                <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                                    {new Date(v.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                                </span>
                                            </div>
                                            {v.reason && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{v.reason}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </CustomerLayout>
    );
}