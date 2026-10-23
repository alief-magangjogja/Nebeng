import React, { useEffect, useState } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, Bike, Car, Package, ArrowUp, MapPin, Users, Calendar, Compass, XCircle, Home, Loader2, Star, AlertTriangle, Wallet, CheckCircle2, MessageCircle, ShieldAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import axios from "../../api/axios";
import AlertModal from "../../components/ui/AlertModal";
import RekeningPicker from "../../components/RekeningPicker";
import { openChatWith } from "../../utils/openChat";

// Helper: format datetime API (mis. "2026-09-17T15:10:00.000000Z") jadi jam lokal "15:10"
function formatJam(dateStr) {
    if (!dateStr) return null;

    try {
        return new Date(dateStr).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (err) {
        return null;
    }
}

// Badge kecil status real-time - identik dengan yang dipakai di halaman
// Detail Tebengan milik mitra, supaya customer melihat info yang sama.
function VerifBadge({ label, done, time, doneText, waitingText }) {
    return (
        <div className="flex items-center justify-between gap-3 text-[11px] py-1.5">
            <span className="font-bold text-gray-500">{label}</span>

            <span className={`font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${done ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                {done ? `${doneText}${time ? ` • ${time}` : ""}` : waitingText}
            </span>
        </div>
    );
}

export default function Pesanan() {
    const navigate = useAppNavigate();
    const { orderId } = useParams();

    const [loading, setLoading] = useState(true);
    const [loadingCancel, setLoadingCancel] = useState(false);
    const [order, setOrder] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false); // State untuk mengontrol modal kustom
    const [alertInfo, setAlertInfo] = useState({ show: false, type: "success", title: "", message: "" }); // Popup alert kustom (pengganti window.alert)

    // --- State Laporkan Mitra (QRIS belum direfund) ---
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [complaintText, setComplaintText] = useState("");
    const [complaintProofFile, setComplaintProofFile] = useState(null);
    const [complaintProofPreview, setComplaintProofPreview] = useState(null);
    const [loadingComplaint, setLoadingComplaint] = useState(false);
    const [complaint, setComplaint] = useState(null); // laporan yang sudah pernah dikirim untuk order ini (kalau ada)

    // --- State Rekening/E-wallet Tujuan Refund ---
    // Sebelumnya info ini cuma disampaikan lewat chat manual ke mitra -
    // tidak pernah tersimpan di sistem. Sekarang customer isi resmi lewat
    // form ini supaya tercatat dan langsung terlihat oleh mitra.
    const [refundDestinationInput, setRefundDestinationInput] = useState("");
    const [savingRefundDestination, setSavingRefundDestination] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`http://127.0.0.1:8000/api/orders/history`, {
                    headers: {
                        Authorization: `Bearer ` + token,
                        Accept: "application/json",
                    },
                });

                const data = await res.json();
                const found = data.find((item) => item.id === Number(orderId));
                setOrder(found);

                // Kalau order ini QRIS dan sudah dibatalkan dengan status refund
                // yang masih pending / diklaim mitra, cek apakah customer sudah pernah lapor.
                setComplaint(null); // reset dulu tiap fetch, sebelum tahu ada laporan atau tidak

                if (found && found.payment_method === "qris" && ["pending_100_percent", "pending_50_percent", "mitra_claimed", "disputed"].includes(found.refund_status)) {
                    try {
                        const complaintRes = await axios.get(`/orders/${orderId}/complaint`);
                        const data = complaintRes.data && complaintRes.data.id ? complaintRes.data : null;
                        setComplaint(data);
                    } catch (e) {
                        // tidak masalah kalau gagal cek status laporan, tombol lapor tetap muncul
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    // Isi awal input rekening tujuan dari data tersimpan (sekali saat
    // order pertama kali dimuat) - tidak dijalankan ulang tiap kali order
    // berubah supaya tidak menimpa ketikan customer yang sedang berjalan.
    useEffect(() => {
        if (order?.refund_destination) {
            setRefundDestinationInput(order.refund_destination);
        }
    }, [order?.id]);

    // KONFIRMASI DANA DITERIMA (mitra sudah klaim transfer)
    const [loadingConfirmReceived, setLoadingConfirmReceived] = useState(false);
    const confirmReceived = async () => {
        try {
            setLoadingConfirmReceived(true);
            const response = await axios.post(`/orders/${orderId}/refund-confirm`);
            setOrder((prev) => ({ ...prev, refund_status: "refunded" }));
            setAlertInfo({
                show: true,
                type: "success",
                title: "Terkonfirmasi",
                message: response.data.message,
            });
        } catch (err) {
            setAlertInfo({
                show: true,
                type: "error",
                title: "Gagal Konfirmasi",
                message: err.response?.data?.message || "Terjadi kesalahan saat mengonfirmasi.",
            });
        } finally {
            setLoadingConfirmReceived(false);
        }
    };

    // SIMPAN REKENING/E-WALLET TUJUAN REFUND
    const submitRefundDestination = async () => {
        if (refundDestinationInput.trim().length < 5) {
            setAlertInfo({
                show: true,
                type: "error",
                title: "Data Belum Lengkap",
                message: "Isi selengkap mungkin: nama bank/e-wallet, nomor, dan nama pemilik.",
            });
            return;
        }

        try {
            setSavingRefundDestination(true);
            const response = await axios.post(`/orders/${orderId}/refund-destination`, {
                refund_destination: refundDestinationInput,
            });
            setOrder((prev) => ({ ...prev, refund_destination: response.data.order.refund_destination }));
            setAlertInfo({ show: true, type: "success", title: "Tersimpan", message: response.data.message });
        } catch (err) {
            setAlertInfo({
                show: true,
                type: "error",
                title: "Gagal Menyimpan",
                message: err.response?.data?.message || "Terjadi kesalahan saat menyimpan rekening tujuan.",
            });
        } finally {
            setSavingRefundDestination(false);
        }
    };

    const handleComplaintProofChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setComplaintProofFile(file);
        setComplaintProofPreview(URL.createObjectURL(file));
    };

    const closeComplaintModal = () => {
        setShowComplaintModal(false);
        setComplaintProofFile(null);
        setComplaintProofPreview(null);
    };

    // KIRIM LAPORAN MITRA (refund QRIS belum dikembalikan)
    const submitComplaint = async () => {
        if (complaintText.trim().length < 10) {
            setAlertInfo({
                show: true,
                type: "error",
                title: "Deskripsi Terlalu Singkat",
                message: "Mohon jelaskan keluhan Anda minimal 10 karakter.",
            });
            return;
        }

        // WAJIB: kalau mitra sudah mengklaim transfer (mitra_claimed),
        // customer WAJIB lampirkan bukti pendukung sendiri - ini kasus
        // paling rawan sengketa "dia bilang sudah, saya bilang belum",
        // jadi beban pembuktian tidak boleh sepihak ke mitra saja.
        if (order?.refund_status === "mitra_claimed" && !complaintProofFile) {
            setAlertInfo({
                show: true,
                type: "error",
                title: "Bukti Pendukung Diperlukan",
                message: "Mitra sudah mengklaim transfer disertai bukti. Lampirkan bukti pendukung Anda (mis. screenshot mutasi rekening/e-wallet yang menunjukkan dana belum masuk) supaya laporan ini ditinjau adil oleh Admin.",
            });
            return;
        }

        try {
            setLoadingComplaint(true);
            const formData = new FormData();
            formData.append("description", complaintText);
            if (complaintProofFile) {
                formData.append("customer_proof", complaintProofFile);
            }

            const response = await axios.post(`/orders/${orderId}/complaint`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setComplaint(response.data.complaint);
            closeComplaintModal();
            setComplaintText("");
            setAlertInfo({
                show: true,
                type: "success",
                title: "Laporan Terkirim",
                message: response.data.message,
            });
        } catch (err) {
            closeComplaintModal();
            setAlertInfo({
                show: true,
                type: "error",
                title: "Gagal Mengirim Laporan",
                message: err.response?.data?.message || "Terjadi kesalahan saat mengirim laporan.",
            });
        } finally {
            setLoadingComplaint(false);
        }
    };

    // EKSEKUSI PEMBATALAN SETELAH DIKONFIRMASI DI MODAL
    const confirmCancelOrder = async () => {
        try {
            setLoadingCancel(true);
            const response = await axios.post(`/orders/${orderId}/cancel`);

            setShowCancelModal(false);
            setAlertInfo({
                show: true,
                type: "success",
                title: "Pesanan Dibatalkan",
                message: response.data.message,
            });

        } catch (err) {
            console.error("Gagal membatalkan pesanan:", err);
            setAlertInfo({
                show: true,
                type: "error",
                title: "Gagal Membatalkan",
                message: err.response?.data?.message || "Terjadi kesalahan saat membatalkan pesanan.",
            });
        } finally {
            setLoadingCancel(false);
        }
    };

    if (loading) {
        return (
            <CustomerLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-indigo-900">
                    <Loader2 className="animate-spin" size={40} />
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Memuat Detail Pesanan...</p>
                </div>
            </CustomerLayout>
        );
    }

    if (!order) {
        return (
            <CustomerLayout>
                <div className="max-w-md mx-auto my-10 bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-sm">
                    <XCircle className="text-red-500 mx-auto mb-4" size={48} />
                    <h3 className="text-lg font-black text-gray-800">Pesanan Tidak Ditemukan</h3>
                    <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-indigo-900 text-white rounded-xl font-bold text-sm">
                        Kembali
                    </button>
                </div>
            </CustomerLayout>
        );
    }

    const vehicleType = order.trip?.vehicle_type;
    let Icon = Package;
    let title = "Nebeng";

    if (vehicleType === "motor") {
        Icon = Bike;
        title = "Nebeng Motor";
    } else if (vehicleType === "mobil") {
        Icon = Car;
        title = "Nebeng Mobil";
    } else if (vehicleType === "Barang-Mobil") {
        Icon = Car; 
        title = "Nebeng Barang (Mobil)";
    } else if (vehicleType === "Barang-Motor") {
        Icon = Bike; 
        title = "Nebeng Barang (Motor)";
    } else if (vehicleType?.includes("Barang")) {
        Icon = Package;
        title = "Nebeng Barang";
    }

    const departureDateTime = `${order.trip?.departure_date}T${order.trip?.departure_time}`;
    const isCompleted = order.trip?.status === "completed";
    const isCancelled = order.status === "cancelled" || order.trip?.status === "cancelled";
    const canTrackJourney = !isCompleted && !isCancelled;

    // Sebuah laporan LAMA yang sudah 'resolved' tidak boleh mengunci
    // banner konfirmasi refund selamanya. Kalau mitra baru saja re-klaim
    // transfer (refund_status balik ke "mitra_claimed"), itu klaim BARU
    // yang perlu direspons - beda dari laporan lama yang sudah pernah
    // ditutup admin. Hanya laporan yang MASIH AKTIF (belum resolved)
    // yang berhak menyembunyikan tombol konfirmasi ini.
    const hasActiveComplaint = complaint && complaint.status !== "resolved";

    return (
        <CustomerLayout>
            <div className="w-full max-w-xl mx-auto px-4 py-6 space-y-6 font-sans pb-32">
                {/* HEADER NAVIGATION */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
                        <ChevronLeft size={24} className="text-indigo-900" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Detail Jadwal</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ringkasan Info Tiket Anda</p>
                    </div>
                </div>

                {/* AKSI DIPERLUKAN: KONFIRMASI REFUND DITERIMA (banner besar, tidak mungkin terlewat) */}
                {order.refund_status === "mitra_claimed" && !hasActiveComplaint && (
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[2rem] p-6 shadow-xl shadow-indigo-900/20 text-white space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                                <Wallet size={22} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Aksi Diperlukan</p>
                                <h2 className="text-base font-black leading-tight">Konfirmasi Penerimaan Refund</h2>
                            </div>
                        </div>
                        <p className="text-sm text-indigo-100 leading-relaxed">
                            Mitra mengklaim sudah mentransfer <span className="font-black text-white">Rp {Number(order.refund_amount).toLocaleString("id-ID")}</span> ke Anda. Mohon konfirmasi apakah dana sudah benar-benar diterima.
                        </p>
                        {order.refund_reference && (
                            <p className="text-xs text-indigo-200">
                                No. Referensi Transaksi: <span className="font-black text-white">{order.refund_reference}</span> - cocokkan dengan mutasi rekening/e-wallet Anda.
                            </p>
                        )}
                        {order.refund_proof && (
                            <a
                                href={`http://127.0.0.1:8000/storage/${order.refund_proof}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-2xl overflow-hidden border border-white/20 bg-white/5"
                            >
                                <img src={`http://127.0.0.1:8000/storage/${order.refund_proof}`} alt="Bukti transfer refund dari mitra" className="w-full max-h-64 object-contain" />
                                <p className="text-[10px] text-center py-2 text-indigo-200 font-bold uppercase tracking-wider">Lihat Bukti Transfer dari Mitra</p>
                            </a>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={confirmReceived}
                                disabled={loadingConfirmReceived}
                                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-indigo-950 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingConfirmReceived ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Sudah Diterima</>}
                            </button>
                            <button
                                onClick={() => setShowComplaintModal(true)}
                                className="flex-1 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs uppercase tracking-wider transition-all"
                            >
                                Belum Diterima
                            </button>
                        </div>
                        <button
                            onClick={() => openChatWith(order.trip?.mitra_id, navigate, "/customer/pesan")}
                            className="w-full text-center text-indigo-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                            <MessageCircle size={13} /> Masih ragu? Cek riwayat chat dengan mitra
                        </button>
                    </div>
                )}

                {/* BANNER KALENDER / JADWAL */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-900 rounded-2xl text-white flex flex-col items-center justify-center shadow-lg shrink-0">
                        <span className="text-xs font-bold uppercase leading-none text-indigo-200">{new Date(departureDateTime).toLocaleDateString("id-ID", { month: "short" })}</span>
                        <span className="text-2xl font-black leading-none mt-1">{new Date(departureDateTime).toLocaleDateString("id-ID", { day: "2-digit" })}</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Waktu Keberangkatan</p>
                        <h2 className="text-lg font-black text-indigo-950 mt-0.5">{new Date(departureDateTime).toLocaleDateString("id-ID", { weekday: "long", year: "numeric" })}</h2>
                    </div>
                </div>

                {/* MAIN DETAIL CARD */}
                <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-indigo-950/5 border border-indigo-50/50 space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-md">
                                <Icon size={24} />
                            </div>
                            <div>
                                <h2 className="font-black text-base text-gray-800 leading-tight">{title}</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">ID TRIP: {order.trip_id}</p>
                            </div>
                        </div>
                        <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${isCompleted ? "bg-emerald-100 text-emerald-600" : isCancelled ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                            {isCompleted ? "Selesai" : isCancelled ? "Dibatalkan" : "Dalam Proses"}
                        </span>
                    </div>

                    <div className="relative pl-8 space-y-6 py-2">
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-indigo-100 border-l border-dashed border-indigo-300"></div>

                        <div className="relative">
                            <div className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-emerald-500 shadow-sm"></div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-black text-sm text-gray-800">
                                    {order.trip?.origin_point?.city?.name} <span className="text-indigo-600 font-black">{order.trip?.origin_point?.pos_name}</span>
                                </h3>
                                <span className="text-[10px] font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0">{new Date(departureDateTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="text-xs font-medium text-gray-400 mt-1 line-clamp-1">{order.trip?.origin_point?.address}</p>

                            {/* REAL-TIME: status keberangkatan mitra + check-in Anda */}
                            <div className="mt-3 bg-gray-50/70 rounded-2xl px-4 divide-y divide-gray-100">
                                <VerifBadge
                                    label="Mitra"
                                    done={!!order.trip?.departure_verified_at}
                                    time={formatJam(order.trip?.departure_verified_at)}
                                    doneText="Sudah Berangkat"
                                    waitingText="Belum Berangkat"
                                />
                                {!order.item_order_id && (
                                    <VerifBadge label="Anda" done={!!order.checkin_at} time={formatJam(order.checkin_at)} doneText="Check-in" waitingText="Belum Check-in" />
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-orange-500 shadow-sm"></div>
                            <h3 className="font-black text-sm text-gray-800">
                                {order.trip?.destination_point?.city?.name} <span className="text-indigo-600 font-black">{order.trip?.destination_point?.pos_name}</span>
                            </h3>
                            <p className="text-xs font-medium text-gray-400 mt-1 line-clamp-1">{order.trip?.destination_point?.address}</p>

                            {/* REAL-TIME: status kedatangan trip + barang Anda sampai (kalau order barang) */}
                            <div className="mt-3 bg-gray-50/70 rounded-2xl px-4 divide-y divide-gray-100">
                                <VerifBadge
                                    label="Kedatangan"
                                    done={!!order.trip?.arrival_verified_at}
                                    time={formatJam(order.trip?.arrival_verified_at)}
                                    doneText="Sudah Tiba"
                                    waitingText="Belum Tiba"
                                />
                                {order.item_order_id && (
                                    <VerifBadge label="Barang Anda" done={!!order.delivered_at} time={formatJam(order.delivered_at)} doneText="Sudah Sampai" waitingText="Belum Sampai" />
                                )}
                            </div>
                        </div>
                    </div>

                    {canTrackJourney && (
                        <div className="pt-2">
                            <button
                                onClick={() => navigate(`/customer/perjalanan/${order.trip_id}`)}
                                className="w-full py-4 rounded-2xl bg-indigo-900 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-800 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <Compass size={18} className="animate-pulse" /> Pantau Perjalanan Live
                            </button>
                        </div>
                    )}

                    {isCancelled && (
                        <div className="pt-2">
                            <button
                                onClick={() => navigate(`/customer/perjalanan/${order.trip_id}`)}
                                className="w-full py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <Compass size={16} /> Lihat Halaman Perjalanan
                            </button>
                        </div>
                    )}

                    <div className="border-t border-gray-50 pt-5 space-y-3">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Detail Pemesanan</h3>
                        <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-gray-700">
                                <Users size={18} className="text-indigo-900" />
                                <p className="text-sm font-bold">Kuantitas Kursi</p>
                            </div>
                            <p className="text-sm font-black text-indigo-900">{order.seats} Penumpang</p>
                        </div>

                        <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-gray-700">
                                <Wallet size={18} className="text-indigo-900" />
                                <p className="text-sm font-bold">Harga Trip</p>
                            </div>
                            <p className="text-sm font-black text-indigo-900">Rp {Number(order.price || 0).toLocaleString("id-ID")}</p>
                        </div>
                    </div>
                </div>

                {/* GROUP ACTION BUTTONS */}
                <div className="space-y-3 pt-2">
                    {canTrackJourney && (
                        <button
                            onClick={() => setShowCancelModal(true)} // Membuka modal kustom
                            className="w-full py-4.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 font-black text-sm uppercase tracking-widest transition-all active:scale-[0.99]"
                        >
                            Batalkan Pesanan
                        </button>
                    )}

                    {/* PENJELASAN: TIDAK BERHAK REFUND (dibatalkan < 3 jam) */}
                    {isCancelled && order.payment_method === "qris" && order.refund_status === "non_refundable" && (
                        <div className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                                <XCircle size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-700">Tidak Ada Refund</p>
                                <p className="text-xs text-gray-500 mt-1">Pembatalan dilakukan kurang dari 3 jam sebelum keberangkatan, sesuai kebijakan dana QRIS dinyatakan hangus.</p>
                            </div>
                        </div>
                    )}

                    {/* STATUS & AKSI REFUND QRIS */}
                    {isCancelled && order.payment_method === "qris" && order.refund_status !== "non_refundable" && (
                        <>
                            {["pending_100_percent", "pending_50_percent"].includes(order.refund_status) && !hasActiveComplaint && (
                                <div className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                                            <Wallet size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-700">Menunggu Mitra Transfer Refund</p>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                Refund <span className="font-bold">Rp {Number(order.refund_amount).toLocaleString("id-ID")}</span> akan dikirim mitra ke rekening/e-wallet yang Anda daftarkan di bawah ini.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rekening/e-wallet tujuan - diisi resmi lewat form, bukan
                                        lagi lewat chat manual, supaya tercatat dan langsung
                                        terlihat mitra tanpa perlu dihubungi dulu. */}
                                    <div className="pt-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                            {order.refund_destination ? "Rekening/E-wallet Tujuan (bisa diubah)" : "Pilih Rekening/E-wallet Tujuan"}
                                        </label>
                                        <div className="mt-1.5">
                                            <RekeningPicker value={refundDestinationInput} onChange={setRefundDestinationInput} accentColor="indigo" />
                                        </div>
                                        <button
                                            onClick={submitRefundDestination}
                                            disabled={savingRefundDestination || !refundDestinationInput}
                                            className="w-full mt-2 px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {savingRefundDestination ? <Loader2 className="animate-spin" size={14} /> : "Simpan Rekening Tujuan"}
                                        </button>
                                        {order.refund_destination && (
                                            <p className="text-[10px] text-gray-400 mt-1.5">
                                                Tersimpan &amp; sudah terlihat mitra: <span className="font-bold text-gray-600">{order.refund_destination}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => openChatWith(order.trip?.mitra_id, navigate, "/customer/pesan")}
                                            className="flex-1 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <MessageCircle size={14} /> Chat Mitra
                                        </button>
                                        <button
                                            onClick={() => setShowComplaintModal(true)}
                                            className="flex-1 py-2.5 rounded-xl bg-white border border-amber-200 hover:bg-amber-50 text-amber-600 text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <AlertTriangle size={14} /> Laporkan
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(["pending_100_percent", "pending_50_percent", "mitra_claimed"].includes(order.refund_status) && hasActiveComplaint) || order.refund_status === "disputed" ? (
                                <div className="w-full rounded-2xl bg-red-50 border border-red-100 p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                                            <ShieldAlert size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-red-700">
                                                {complaint?.admin_action === "blocked_mitra"
                                                    ? "Mitra Diblokir Admin"
                                                    : complaint?.admin_action === "warned_mitra"
                                                    ? "Mitra Sudah Ditegur Admin"
                                                    : complaint?.status === "resolved"
                                                    ? "Laporan Sudah Ditindaklanjuti"
                                                    : complaint?.type === "refund_overdue_auto"
                                                    ? "Refund Terlambat, Otomatis Diteruskan ke Admin"
                                                    : complaint
                                                    ? "Laporan Sedang Ditinjau Admin"
                                                    : "Status: Disengketakan"}
                                            </p>
                                            <p className="text-xs text-red-500 mt-1 leading-relaxed">
                                                {complaint?.admin_action === "blocked_mitra"
                                                    ? "Admin sudah memblokir akun mitra ini karena laporan Anda. Pemblokiran ini belum tentu berarti dana Anda otomatis kembali - hubungi tim kami di Pusat Bantuan untuk menindaklanjuti pengembalian dana."
                                                    : complaint?.admin_action === "warned_mitra"
                                                    ? "Admin sudah menegur mitra dan memintanya segera menyelesaikan refund. Cek kembali status order ini secara berkala - kalau belum ada perkembangan, hubungi kami di Pusat Bantuan."
                                                    : complaint?.status === "resolved"
                                                    ? "Admin sudah menindaklanjuti laporan Anda. Cek kembali status refund order ini secara berkala."
                                                    : complaint?.type === "refund_overdue_auto"
                                                    ? "Anda belum melapor apa pun - mitra saja yang belum mentransfer refund lebih dari 24 jam sejak pembatalan, jadi sistem otomatis meneruskan kasus ini ke Admin untuk ditinjau. Anda tidak perlu melakukan apa-apa, cukup pastikan rekening/e-wallet tujuan di bawah ini sudah terisi benar."
                                                    : complaint
                                                    ? "Laporan Anda sedang ditinjau Admin. Status akan diperbarui di halaman ini - tidak perlu lapor ulang."
                                                    : "Order ini berstatus disengketakan dan sedang ditinjau Admin. Anda tidak mengajukan laporan apa pun untuk ini - pastikan rekening/e-wallet tujuan di bawah ini sudah terisi benar sambil menunggu."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rekening/e-wallet tujuan tetap bisa diisi/diubah di sini
                                        walau order sedang disengketakan - sebelumnya begitu status
                                        masuk 'disputed', customer sama sekali tidak punya cara isi
                                        rekening lewat sistem dan terpaksa balik ke chat manual.
                                        Field ini juga yang dibaca admin & mitra untuk transfer. */}
                                    {order.refund_status !== "refunded" && (
                                        <div className="bg-white/70 rounded-xl p-3 border border-red-100 ml-12">
                                            <label className="text-[10px] font-black text-red-400 uppercase tracking-wider">
                                                {order.refund_destination ? "Rekening/E-wallet Tujuan (bisa diubah)" : "Pilih Rekening/E-wallet Tujuan"}
                                            </label>
                                            <div className="mt-1.5">
                                                <RekeningPicker value={refundDestinationInput} onChange={setRefundDestinationInput} accentColor="red" />
                                            </div>
                                            <button
                                                onClick={submitRefundDestination}
                                                disabled={savingRefundDestination || !refundDestinationInput}
                                                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {savingRefundDestination ? <Loader2 className="animate-spin" size={14} /> : "Simpan Rekening Tujuan"}
                                            </button>
                                            {order.refund_destination && (
                                                <p className="text-[10px] text-gray-400 mt-1.5">
                                                    Tersimpan &amp; sudah terlihat mitra: <span className="font-bold text-gray-600">{order.refund_destination}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Catatan tertulis admin (kalau ada) - detail nyata dari
                                        peninjauan, bukan cuma status generik. */}
                                    {complaint?.admin_notes && (
                                        <div className="bg-white/70 rounded-xl p-3 border border-red-100 ml-12">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">Catatan Admin</p>
                                            <p className="text-xs text-red-700 leading-relaxed">{complaint.admin_notes}</p>
                                        </div>
                                    )}

                                    {/* Admin tidak punya chat langsung ke customer maupun mitra -
                                        jadi begitu ada tindakan (tegur/blokir) yang belum tentu
                                        langsung menyelesaikan dananya, arahkan ke Pusat Bantuan
                                        (WA/email/telepon) sebagai jalur lanjutan yang nyata. */}
                                    {(complaint?.admin_action === "blocked_mitra" || complaint?.admin_action === "warned_mitra") && (
                                        <button
                                            onClick={() => navigate("/customer/pusat-bantuan")}
                                            className="w-full py-2.5 rounded-xl bg-white border border-red-200 hover:bg-red-100 text-red-600 text-[11px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Hubungi Pusat Bantuan
                                        </button>
                                    )}
                                </div>
                            ) : null}

                            {order.refund_status === "refunded" && (
                                <div className="w-full rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-emerald-700">Refund Selesai</p>
                                        <p className="text-xs text-emerald-600 mt-1">Anda sudah mengonfirmasi dana ini diterima. Tidak ada tindakan lain yang diperlukan.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <button
                        onClick={() => navigate("/customer/dashboard")}
                        className="w-full py-4.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-gray-900/10 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        <Home size={16} /> Kembali Ke Beranda
                    </button>

                    {isCompleted && (
                        order.has_reviewed_mitra ? (
                            <div className="w-full py-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-600 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> Sudah Diberi Rating
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate(`/customer/beri-rating/${order.trip_id}`)}
                                className="w-full py-4 rounded-2xl border-2 border-indigo-100 hover:bg-indigo-50 text-indigo-900 font-black text-sm uppercase tracking-widest transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <Star size={16} /> Berikan Penilaian (Opsional)
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* CUSTOM MODAL KONFIRMASI PEMBATALAN */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 space-y-6">
                        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                            <AlertTriangle size={28} />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-indigo-900">Konfirmasi Pembatalan</h3>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                Apakah Anda yakin ingin membatalkan pesanan ini? Perhatikan kebijakan pengembalian berikut:
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-left border border-gray-100">
                            <div className="flex items-start gap-2 text-xs font-bold text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1 shrink-0"></span>
                                <span><strong> 12 jam:</strong> Refund 100%</span>
                            </div>
                            <div className="flex items-start gap-2 text-xs font-bold text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0"></span>
                                <span><strong>3 s.d 12 jam:</strong> Refund 50%</span>
                            </div>
                            <div className="flex items-start gap-2 text-xs font-bold text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0"></span>
                                <span><strong>&lt; 3 jam:</strong> Dana Hangus (0%)</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 mt-2">
                                <p className="text-[11px] text-gray-400 font-medium italic">
                                    *Pembayaran Tunai: Tidak ada dana yang perlu dikembalikan.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                disabled={loadingCancel}
                                className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all"
                            >
                                Urungkan
                            </button>
                            <button
                                onClick={confirmCancelOrder}
                                disabled={loadingCancel}
                                className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingCancel ? <Loader2 className="animate-spin" size={16} /> : "Ya, Batalkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM MODAL LAPORKAN MITRA */}
            {showComplaintModal && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 space-y-6">
                        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                            <AlertTriangle size={28} />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-indigo-900">Laporkan Mitra</h3>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                Jelaskan kendala refund yang Anda alami. Laporan ini akan langsung ditinjau oleh Admin.
                            </p>
                        </div>

                        <textarea
                            value={complaintText}
                            onChange={(e) => setComplaintText(e.target.value)}
                            rows={4}
                            placeholder="Contoh: Sudah 3 hari sejak pembatalan, dana QRIS saya belum dikembalikan oleh mitra..."
                            className="w-full rounded-2xl border border-gray-200 p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none"
                        />

                        {/* Bukti pendukung - WAJIB kalau mitra sudah klaim transfer
                            (mitra_claimed), supaya laporan tidak cuma klaim sepihak
                            seperti mitra juga wajib lampirkan bukti transfernya. */}
                        <div>
                            <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-4 text-center transition-all bg-gray-50/50">
                                    {complaintProofPreview ? (
                                        <img src={complaintProofPreview} alt="Preview bukti" className="w-full max-h-48 object-contain rounded-xl mx-auto" />
                                    ) : (
                                        <div className="py-5 space-y-1.5 text-gray-400">
                                            <p className="text-xs font-bold">
                                                {order?.refund_status === "mitra_claimed" ? "Wajib: upload bukti pendukung Anda" : "Opsional: upload bukti pendukung (kalau ada)"}
                                            </p>
                                            <p className="text-[10px]">Mis. screenshot mutasi rekening/e-wallet yang menunjukkan dana belum masuk</p>
                                        </div>
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={handleComplaintProofChange} className="hidden" />
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={closeComplaintModal}
                                disabled={loadingComplaint}
                                className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={submitComplaint}
                                disabled={loadingComplaint}
                                className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingComplaint ? <Loader2 className="animate-spin" size={16} /> : "Kirim Laporan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* POPUP ALERT KUSTOM (pengganti window.alert) */}
            <AlertModal
                show={alertInfo.show}
                type={alertInfo.type}
                title={alertInfo.title}
                message={alertInfo.message}
                confirmText={alertInfo.type === "success" && alertInfo.title === "Pesanan Dibatalkan" ? "Mengerti" : "Oke"}
                onClose={() => {
                    const wasCancelSuccess = alertInfo.type === "success" && alertInfo.title === "Pesanan Dibatalkan";
                    setAlertInfo((prev) => ({ ...prev, show: false }));
                    if (wasCancelSuccess) window.location.reload();
                }}
            />
        </CustomerLayout>
    );
}