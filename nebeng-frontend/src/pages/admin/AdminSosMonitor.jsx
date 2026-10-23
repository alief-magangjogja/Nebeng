import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout"; // Sesuaikan path layout admin kamu
import {
    ShieldAlert,
    MapPin,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    UserCog,
    MessageSquareWarning,
    ClipboardList,
} from "lucide-react";
import axios from "../../api/axios";
import AlertModal from "../../components/ui/AlertModal";

// Label & warna untuk tiap status SOS
const STATUS_META = {
    pending: { label: "Menunggu", badge: "bg-red-500", dot: "bg-red-500" },
    reviewed: { label: "Ditinjau", badge: "bg-amber-500", dot: "bg-amber-500" },
    resolved: { label: "Selesai", badge: "bg-emerald-500", dot: "bg-emerald-500" },
};

// Pilihan jenis tindakan admin ke mitra
const ACTION_TYPES = [
    { value: "teguran_ringan", label: "Teguran Ringan" },
    { value: "peringatan_keras", label: "Peringatan Keras" },
    { value: "suspend_sementara", label: "Suspend Sementara" },
];

/**
 * SosActionModal
 * Modal generik untuk 2 aksi admin:
 * - mode "rebuke"  : Beri Tindakan ke mitra (wajib pilih jenis tindakan + catatan)
 * - mode "resolve" : Tandai Selesai (catatan penutupan opsional)
 */
function SosActionModal({ show, mode, loading, onSubmit, onCancel }) {
    const [actionType, setActionType] = useState("teguran_ringan");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (show) {
            setActionType("teguran_ringan");
            setNotes("");
        }
    }, [show, mode]);

    if (!show) return null;

    const isRebuke = mode === "rebuke";
    const canSubmit = isRebuke ? notes.trim().length > 0 : true;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 space-y-6">
                <div className="text-center space-y-2">
                    <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-inner ${
                            isRebuke ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"
                        }`}
                    >
                        {isRebuke ? <UserCog size={28} /> : <CheckCircle2 size={28} />}
                    </div>
                    <h3 className="text-xl font-black text-indigo-900">
                        {isRebuke ? "Beri Tindakan ke Mitra" : "Selesaikan Darurat"}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                        {isRebuke
                            ? "Catat jenis tindakan dan alasannya. Mitra akan menerima notifikasi dari tindakan ini."
                            : "Tandai kasus ini sudah ditangani. Catatan penutupan akan tersimpan sebagai riwayat."}
                    </p>
                </div>

                {isRebuke && (
                    <div className="text-left space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Jenis Tindakan
                        </label>
                        <select
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value)}
                            className="w-full text-sm rounded-2xl border border-gray-200 p-3 font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        >
                            {ACTION_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="text-left space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        {isRebuke ? "Catatan Tindakan (wajib)" : "Catatan Penutupan (opsional)"}
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder={
                            isRebuke
                                ? "Contoh: Mitra terbukti mengemudi ugal-ugalan berdasarkan laporan customer, diberi peringatan keras."
                                : "Contoh: Sudah dikonfirmasi ke customer, kondisi aman, tidak ada tindak lanjut lain."
                        }
                        className="w-full text-xs rounded-2xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={() => onSubmit({ action_type: actionType, notes })}
                        disabled={loading || !canSubmit}
                        className={`flex-1 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                            isRebuke
                                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100"
                                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                        }`}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : isRebuke ? (
                            "Kirim Tindakan"
                        ) : (
                            "Ya, Tandai Selesai"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SosCard({ sos, onRebuke, onResolve }) {
    const meta = STATUS_META[sos.status] || STATUS_META.pending;
    const isResolved = sos.status === "resolved";
    const hasLocation = sos.latitude != null && sos.longitude != null && sos.latitude !== "" && sos.longitude !== "";

    return (
        <div
            className={`bg-white rounded-3xl p-6 shadow-xl shadow-gray-100 border flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isResolved ? "border-emerald-100" : "border-red-100"
            }`}
        >
            <div
                className={`absolute top-0 right-0 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl ${meta.badge}`}
            >
                {meta.label}
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isResolved ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        }`}
                    >
                        <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-black text-gray-800 text-sm truncate">
                            {sos.customer?.name || "Customer"}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-medium">Trip ID: #{sos.trip_id}</p>
                        {sos.trip?.mitra && (
                            <p className="text-[10px] text-indigo-600 font-bold mt-0.5 truncate">
                                Mitra: {sos.trip.mitra.name}
                            </p>
                        )}
                    </div>
                </div>

                {sos.message && (
                    <div className="bg-red-50 rounded-2xl p-3 text-xs text-red-700 border border-red-100 italic flex items-start gap-2">
                        <MessageSquareWarning size={14} className="shrink-0 mt-0.5" />
                        <span>&ldquo;{sos.message}&rdquo;</span>
                    </div>
                )}

                {sos.admin_notes && (
                    <div className="bg-indigo-50 rounded-2xl p-3 text-xs text-indigo-800 border border-indigo-100 flex items-start gap-2">
                        <ClipboardList size={14} className="shrink-0 mt-0.5" />
                        <span className="whitespace-pre-line">{sos.admin_notes}</span>
                    </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2 text-xs border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} className="text-red-500 shrink-0" />
                        <span className="truncate">
                            {hasLocation ? `Lat/Lng: ${sos.latitude}, ${sos.longitude}` : "Lokasi tidak tersedia"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={14} className="text-indigo-500 shrink-0" />
                        <span>{new Date(sos.created_at).toLocaleString("id-ID")}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {hasLocation ? (
                    <a
                        href={`https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all"
                    >
                        Buka Peta
                    </a>
                ) : (
                    <span
                        title="GPS tidak terkirim saat SOS ini dibuat"
                        className="flex-1 py-2.5 px-3 bg-gray-100 text-gray-400 rounded-xl text-center text-xs font-black uppercase tracking-wider cursor-not-allowed"
                    >
                        Lokasi N/A
                    </span>
                )}

                {sos.status === "pending" && (
                    <button
                        onClick={() => onRebuke(sos.id)}
                        className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-100"
                    >
                        Beri Tindakan
                    </button>
                )}

                {sos.status === "reviewed" && (
                    <button
                        onClick={() => onResolve(sos.id)}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100"
                    >
                        Tandai Selesai
                    </button>
                )}
            </div>
        </div>
    );
}

export default function AdminSosMonitor() {
    const [sosList, setSosList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal aksi: { show, mode: 'rebuke' | 'resolve', targetId }
    const [actionModal, setActionModal] = useState({ show: false, mode: null, targetId: null });
    const [submitting, setSubmitting] = useState(false);
    const [alertInfo, setAlertInfo] = useState({ show: false, type: "success", title: "", message: "" });

    // Jangan auto-refresh saat admin sedang mengisi modal, supaya input tidak ke-reset tiba-tiba
    const modalOpenRef = useRef(false);
    useEffect(() => {
        modalOpenRef.current = actionModal.show;
    }, [actionModal.show]);

    const fetchSosData = async () => {
        try {
            const response = await axios.get("/admin/sos-alerts"); // Sesuaikan endpoint API backend Laravel kamu
            setSosList(response.data.data || response.data);
        } catch (err) {
            console.error("Gagal mengambil data SOS:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSosData();
        const interval = setInterval(() => {
            if (!modalOpenRef.current) fetchSosData();
        }, 5000); // Auto-refresh setiap 5 detik
        return () => clearInterval(interval);
    }, []);

    const openRebuke = (id) => setActionModal({ show: true, mode: "rebuke", targetId: id });
    const openResolve = (id) => setActionModal({ show: true, mode: "resolve", targetId: id });
    const closeActionModal = () => setActionModal({ show: false, mode: null, targetId: null });

    const handleSubmitAction = async ({ action_type, notes }) => {
        if (!actionModal.targetId) return;
        try {
            setSubmitting(true);

            if (actionModal.mode === "rebuke") {
                await axios.post(`/admin/sos/${actionModal.targetId}/rebuke`, {
                    action_type,
                    admin_notes: notes,
                });
                setAlertInfo({
                    show: true,
                    type: "success",
                    title: "Tindakan Tercatat",
                    message: "Tindakan berhasil dicatat dan notifikasi telah dikirim ke mitra.",
                });
            } else {
                await axios.post(`/admin/sos-alerts/${actionModal.targetId}/resolve`, {
                    closing_notes: notes,
                });
                setAlertInfo({
                    show: true,
                    type: "success",
                    title: "Status Diperbarui",
                    message: "Kasus SOS berhasil ditandai selesai.",
                });
            }

            closeActionModal();
            fetchSosData();
        } catch (err) {
            console.error("Gagal memproses aksi SOS:", err);
            closeActionModal();
            setAlertInfo({
                show: true,
                type: "error",
                title: "Gagal Memproses",
                message: err.response?.data?.message || "Terjadi kesalahan saat memproses aksi ini.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const activeSos = sosList.filter((s) => s.status !== "resolved");
    const resolvedSos = sosList.filter((s) => s.status === "resolved");

    return (
        <AdminLayout>
            <div className="p-6 md:p-8 space-y-8 font-sans max-w-7xl mx-auto">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-red-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 backdrop-blur-md">
                            <ShieldAlert size={32} className="text-white animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Pusat Pemantauan Darurat (SOS)</h1>
                            <p className="text-red-100 text-xs md:text-sm mt-1 font-medium">
                                Daftar sinyal darurat secara real-time yang dikirimkan oleh customer selama perjalanan aktif.
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-xs font-bold tracking-wider uppercase">
                        Live Monitor Active
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <Loader2 className="animate-spin text-indigo-900 mb-3" size={32} />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat sinyal darurat...</p>
                    </div>
                ) : (
                    <>
                        {/* SECTION: Butuh Tindakan */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                                    Butuh Tindakan
                                </h2>
                                {activeSos.length > 0 && (
                                    <span className="bg-red-100 text-red-600 text-[10px] font-black px-2.5 py-1 rounded-full">
                                        {activeSos.length}
                                    </span>
                                )}
                            </div>

                            {activeSos.length === 0 ? (
                                <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h3 className="text-lg font-black text-gray-800">Tidak ada sinyal darurat aktif</h3>
                                    <p className="text-xs text-gray-400 max-w-sm">
                                        Semua perjalanan terpantau aman. Belum ada customer atau mitra yang memicu tombol SOS saat ini.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeSos.map((sos) => (
                                        <SosCard key={sos.id} sos={sos} onRebuke={openRebuke} onResolve={openResolve} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SECTION: Riwayat Selesai */}
                        {resolvedSos.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                                        Riwayat Selesai
                                    </h2>
                                    <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-2.5 py-1 rounded-full">
                                        {resolvedSos.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-90">
                                    {resolvedSos.map((sos) => (
                                        <SosCard key={sos.id} sos={sos} onRebuke={openRebuke} onResolve={openResolve} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODAL AKSI: Beri Tindakan / Tandai Selesai */}
            <SosActionModal
                show={actionModal.show}
                mode={actionModal.mode}
                loading={submitting}
                onSubmit={handleSubmitAction}
                onCancel={closeActionModal}
            />

            {/* POPUP ALERT KUSTOM (pengganti window.alert) */}
            <AlertModal
                show={alertInfo.show}
                type={alertInfo.type}
                title={alertInfo.title}
                message={alertInfo.message}
                onClose={() => setAlertInfo((prev) => ({ ...prev, show: false }))}
            />
        </AdminLayout>
    );
}