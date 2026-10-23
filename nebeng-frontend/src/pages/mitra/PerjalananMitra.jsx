import React, { useEffect, useState } from "react";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { MapPin, MessageCircle, ChevronLeft, Navigation, CheckCircle2, Clock3, ChevronUp, ChevronDown, Star, Maximize2, Crosshair, QrCode, Wallet, AlertTriangle } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import QRCode from "react-qr-code";
import SuccessPopup from "../../components/ui/SuccessPopup";
import AlertModal from "../../components/ui/AlertModal";
import axios from '../../api/axios';
import { openChatWith } from "../../utils/openChat";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ================= CUSTOM MAP ICONS =================
const mitraIcon = L.divIcon({
    className: "",
    html: `
        <div style="
            width: 18px;
            height: 18px;
            background: #ef4444;
            border: 4px solid white;
            border-radius: 9999px;
            box-shadow: 0 0 0 6px rgba(239,68,68,0.25);
        "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

const destinationIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
});

// ================= HELPER =================
const getClosestRouteIndex = (position, route) => {
    if (!position || route.length === 0) return 0;

    let closestIndex = 0;
    let closestDistance = Infinity;

    route.forEach((point, index) => {
        const latDiff = point[0] - position[0];
        const lngDiff = point[1] - position[1];

        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    });

    return closestIndex;
};

// ================= RECENTER BUTTON =================
function RecenterButton({ position }) {
    const map = useMap();

    const handleRecenter = () => {
        if (!position) return;

        map.flyTo(position, 16, {
            duration: 1.5,
        });
    };

    return (
        <button
            onClick={handleRecenter}
            className="
                absolute bottom-32 right-5 z-[1000]
                w-14 h-14 rounded-2xl
                bg-white backdrop-blur-md
                border border-cyan-400/30
                shadow-2xl shadow-cyan-500/20
                flex items-center justify-center
                text-cyan-400
                hover:scale-105
                active:scale-95
                transition-all
            "
        >
            <Crosshair size={24} />
        </button>
    );
}

const STATUS_CONFIG = {
    active: {
        badge: "Trip Aktif",
        button: "Siap Berangkat",
        next: "waiting_departure",
    },

    waiting_departure: {
        badge: "Menunggu Keberangkatan",
        button: "Mulai Perjalanan",
        next: "on_the_way",
    },

    on_the_way: {
        badge: "Dalam Perjalanan",
        button: "Sampai di Pos Tujuan",
        next: "arrived_destination",
    },

    arrived_destination: {
        badge: "Sudah Sampai",
        button: "Tampilkan QR",
        next: null,
    },

    completed: {
        badge: "Trip Selesai",
        button: "Perjalanan Selesai",
        next: null,
    },
    cancelled: {
        badge: "Trip Dibatalkan",
        button: null,
        next: null,
    },
};

export default function PerjalananMitra() {
    const navigate = useAppNavigate();
    const { tripId } = useParams();
    const [tripStatus, setTripStatus] = useState("waiting_departure");
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);

    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showDepartureQR, setShowDepartureQR] = useState(false);
    const [departureVerified, setDepartureVerified] = useState(false);
    const [confirmingPaymentId, setConfirmingPaymentId] = useState(null);
    const [departureQR, setDepartureQR] = useState(null);
    const [loadingQR, setLoadingQR] = useState(false);

    // QR KEDATANGAN (arrival)
    const [showArrivalQR, setShowArrivalQR] = useState(false);
    const [arrivalQR, setArrivalQR] = useState(null);
    const [loadingArrivalQR, setLoadingArrivalQR] = useState(false);
    const [tripCompleted, setTripCompleted] = useState(false);

    const [originPoint, setOriginPoint] = useState(null);
    const [destinationPoint, setDestinationPoint] = useState(null);

    const [routePath, setRoutePath] = useState([]);
    const [customers, setCustomers] = useState([]);

    const [currentPosition, setCurrentPosition] = useState(null);
    const [activeRoute, setActiveRoute] = useState([]);

    useEffect(() => {
        const fetchJourney = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}`);
                const data = await response.json();

                setTrip(data);
                setTripStatus(data.status);

                setOriginPoint({
                    name: data.origin_point.pos_name,
                    address: data.origin_point.address,
                    coords: [Number(data.origin_point.latitude), Number(data.origin_point.longitude)],
                });

                setDestinationPoint({
                    name: data.destination_point.pos_name,
                    address: data.destination_point.address,
                    coords: [Number(data.destination_point.latitude), Number(data.destination_point.longitude)],
                });

                if (data.orders?.length > 0) {
                    const formattedCustomers = data.orders.map((order) => ({
                        id: order.user?.id,
                        orderId: order.id,
                        name: order.user?.name || `Customer #${order.customer_id}`,
                        photo: order.user?.avatar ? `http://127.0.0.1:8000/storage/${order.user.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${order.user?.name || "Customer"}`,
                        phone: order.user?.phone || "",
                        type: data.vehicle_type === "barang" ? "Pengirim Barang" : "Penumpang Perjalanan",
                        paymentMethod: order.payment_method,
                        paymentStatus: order.payment_status,
                        paymentProof: order.payment_proof,
                        readinessStatus: order.readiness_status || 'pending',
                        orderStatus: order.status, // Menangkap status pesanan (aktif/cancelled)
                        refundStatus: order.refund_status,
                        refundAmount: order.refund_amount,
                        mitraReviewed: !!order.mitra_reviewed,
                    }));

                    setCustomers(formattedCustomers);
                } else {
                    setCustomers([]);
                }

                if (data.route_geojson) {
                    const geo = typeof data.route_geojson === "string" ? JSON.parse(data.route_geojson) : data.route_geojson;
                    if (geo.coordinates) {
                        const formatted = geo.coordinates.map((coord) => [coord[1], coord[0]]);
                        setRoutePath(formatted);
                    }
                }

                if (data.latest_tracking) {
                    setCurrentPosition([Number(data.latest_tracking.latitude), Number(data.latest_tracking.longitude)]);
                } else {
                    setCurrentPosition([Number(data.origin_point.latitude), Number(data.origin_point.longitude)]);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchJourney();
        const interval = setInterval(fetchJourney, 5000);
        return () => clearInterval(interval);
    }, [tripId]);

    useEffect(() => {
        if (tripStatus !== "on_the_way") return;
        let watchId;

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    setCurrentPosition([latitude, longitude]);

                    try {
                        await fetch(`http://127.0.0.1:8000/api/trips/${tripId}/tracking`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                            },
                            body: JSON.stringify({ latitude, longitude }),
                        });
                    } catch (err) {
                        console.error("Tracking error:", err);
                    }
                },
                (error) => console.error(error),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [tripStatus, tripId]);

    useEffect(() => {
        if (!currentPosition || routePath.length === 0) return;
        const closestIndex = getClosestRouteIndex(currentPosition, routePath);
        const slicedRoute = routePath.slice(closestIndex);
        setActiveRoute(slicedRoute);
    }, [currentPosition, routePath]);

    const handleConfirmPayment = async (orderId) => {
        if (!orderId) return;
        setConfirmingPaymentId(orderId);

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/confirm-payment`, {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                },
            });

            const data = await response.json();
            if (!response.ok) {
                alert(data.message || "Gagal mengonfirmasi pembayaran.");
                return;
            }

            setCustomers((prev) => prev.map((c) => (c.orderId === orderId ? { ...c, paymentStatus: "paid" } : c)));
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan saat mengonfirmasi pembayaran.");
        } finally {
            setConfirmingPaymentId(null);
        }
    };

        // ================= KONFIRMASI REFUND MITRA -> CUSTOMER =================
    // WAJIB lampirkan bukti transfer - backend sekarang menolak konfirmasi
    // tanpa file screenshot m-banking/e-wallet/QRIS.
    const [refundTargetId, setRefundTargetId] = useState(null);
    const [refundProofFile, setRefundProofFile] = useState(null);
    const [refundProofPreview, setRefundProofPreview] = useState(null);
    const [processingRefund, setProcessingRefund] = useState(false);
    const [alertInfo, setAlertInfo] = useState({ show: false, type: "success", title: "", message: "" });

    const handleRefundProofChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setRefundProofFile(file);
        setRefundProofPreview(URL.createObjectURL(file));
    };

    const closeRefundModal = () => {
        setRefundTargetId(null);
        setRefundProofFile(null);
        setRefundProofPreview(null);
    };

    const handleConfirmRefund = async () => {
        if (!refundTargetId) return;
        if (!refundProofFile) {
            setAlertInfo({
                show: true,
                type: "error",
                title: "Bukti Transfer Wajib Diupload",
                message: "Lampirkan screenshot bukti transfer (m-banking/e-wallet/QRIS) sebelum konfirmasi.",
            });
            return;
        }
        try {
            setProcessingRefund(true);
            const formData = new FormData();
            formData.append("refund_proof", refundProofFile);
            const response = await axios.post(`/mitra/orders/${refundTargetId}/refund-confirm`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const confirmedId = refundTargetId;
            closeRefundModal();
            setCustomers((prev) => prev.map((c) => (c.orderId === confirmedId ? { ...c, refundStatus: "mitra_claimed" } : c)));
            setAlertInfo({ show: true, type: "success", title: "Konfirmasi Terkirim", message: response.data.message });
        } catch (err) {
            closeRefundModal();
            setAlertInfo({
                show: true,
                type: "error",
                title: "Gagal Konfirmasi",
                message: err.response?.data?.message || "Terjadi kesalahan saat mengonfirmasi refund.",
            });
        } finally {
            setProcessingRefund(false);
        }
    };

    // ================= FITUR TANDAI TIDAK HADIR =================
    const handleNoShow = async (orderId) => {
        const confirmAction = window.confirm('Apakah Anda yakin ingin menandai customer ini tidak hadir? Tindakan ini tidak dapat dibatalkan.');
        if (!confirmAction) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://127.0.0.1:8000/api/mitra/orders/${orderId}/no-show`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            const data = await response.json();
            if (!response.ok) {
                alert(data.message || "Gagal memproses permintaan.");
                return;
            }

            alert("Customer berhasil ditandai tidak hadir.");
            setCustomers((prev) => prev.map((c) => (c.orderId === orderId ? { ...c, readinessStatus: "no_show" } : c)));
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan sistem saat memproses.");
        }
    };

    const handleGenerateArrivalQR = async () => {
        try {
            setLoadingArrivalQR(true);
            const token = localStorage.getItem("token");

            const response = await fetch(`http://127.0.0.1:8000/api/mitra/trips/${tripId}/generate-qr`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            const data = await response.json();
            if (!response.ok) {
                alert(data.message || "Gagal membuat QR.");
                return;
            }

            setArrivalQR(data);
            setShowArrivalQR(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingArrivalQR(false);
        }
    };

    useEffect(() => {
        if (showArrivalQR && tripStatus === "completed") {
            setShowArrivalQR(false);
            setTripCompleted(true);
        }
    }, [tripStatus, showArrivalQR]);

    const handleStatusAction = async () => {
        if (tripStatus === "arrived_destination") {
            handleGenerateArrivalQR();
            return;
        }

        if (tripStatus === "waiting_departure") {
            try {
                setLoadingQR(true);
                const token = localStorage.getItem("token");

                const response = await fetch(`http://127.0.0.1:8000/api/mitra/trips/${tripId}/generate-departure-qr`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                const data = await response.json();
                if (!response.ok) {
                    alert(data.message || "Gagal membuat QR keberangkatan.");
                    return;
                }

                setDepartureQR(data);
                setShowDepartureQR(true);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingQR(false);
            }
            return;
        }

        const nextStatus = STATUS_CONFIG[tripStatus]?.next;
        if (!nextStatus) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}/status`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: nextStatus }),
            });

            const data = await response.json();
            if (!response.ok) {
                alert(data.message || "Gagal memperbarui status perjalanan.");
                return;
            }

            setTripStatus(nextStatus);
            setTrip((prev) => ({ ...prev, status: nextStatus }));

            if (nextStatus === "arrived_destination") {
                setCurrentPosition(destinationPoint.coords);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (!showDepartureQR) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}`);
                const data = await response.json();

                if (data.status === "on_the_way") {
                    setTripStatus("on_the_way");
                    setShowDepartureQR(false);
                    setDepartureVerified(true);
                }
            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [showDepartureQR, tripId]);

    if (loading || !originPoint || !destinationPoint) {
        return (
            <MitraLayout>
                <div className="h-screen flex items-center justify-center">
                    <div className="text-indigo-900 font-black text-xl">Loading perjalanan...</div>
                </div>
            </MitraLayout>
        );
    }

    return (
        <MitraLayout>
            <div className="relative h-[calc(100vh-80px)] w-full overflow-hidden bg-gray-50 font-sans grid grid-cols-1 lg:grid-cols-12">
                {/* SISI MAPS */}
                <div className="relative w-full h-full lg:col-span-7 z-0">
                    <MapContainer center={originPoint.coords} zoom={11} scrollWheelZoom={true} className="h-full w-full">
                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={currentPosition || originPoint.coords} icon={mitraIcon}>
                            <Popup>Posisi Anda Saat Ini</Popup>
                        </Marker>
                        <Marker position={destinationPoint.coords} icon={destinationIcon}>
                            <Popup>{destinationPoint.name}</Popup>
                        </Marker>
                        <RecenterButton position={currentPosition || originPoint.coords} />
                        <Polyline
                            positions={tripStatus === "completed" ? routePath : activeRoute.length > 0 ? activeRoute : routePath}
                            pathOptions={{ color: "#1e1b4b", weight: 6, opacity: 0.8 }}
                        />
                    </MapContainer>

                    <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
                        <button onClick={() => navigate(-1)} className="mx-8 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100 active:scale-95 transition-all pointer-events-auto">
                            <ChevronLeft size={24} className="text-indigo-900" />
                        </button>

                        <div className="bg-indigo-900 text-white rounded-full shadow-2xl px-5 py-2.5 flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <Clock3 size={14} className="text-sky-400 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest">{STATUS_CONFIG[tripStatus]?.badge || "Perjalanan"}</span>
                        </div>
                    </div>
                </div>

                {/* SISI DETAIL PANEL / BOTTOM CARD */}
                <div
                    className={`
                    absolute bottom-0 left-0 right-0 lg:relative lg:col-span-5 bg-white 
                    shadow-[0_-10px_30px_rgba(30,27,75,0.08)] lg:shadow-none z-[1000] lg:z-10
                    transition-all duration-500 ease-in-out border-t lg:border-t-0 lg:border-l border-gray-100
                    ${isPanelExpanded ? "h-[60vh] md:h-[50vh] lg:h-full" : "h-24 lg:h-full"}
                `}
                >
                    <div className="flex flex-col items-center justify-center py-2 bg-gray-50/50 border-b border-gray-50 cursor-pointer lg:hidden" onClick={() => setIsPanelExpanded(!isPanelExpanded)}>
                        <div className="w-12 h-1 bg-gray-300 rounded-full mb-1"></div>
                        <button className="text-indigo-900 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                            {isPanelExpanded ? <><ChevronDown size={14} /> Sembunyikan</> : <><ChevronUp size={14} /> Lihat Detail</>}
                        </button>
                    </div>

                    <div className="h-[calc(100%-40px)] lg:h-full overflow-y-auto p-6 space-y-6 no-scrollbar">
                        {/* CUSTOMER INFO BLOCK */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Customer Perjalanan</h3>

                            {customers.length > 0 ? (
                                customers.map((customer) => (
                                    <div key={customer.orderId} className="bg-indigo-50/55 border border-indigo-100 rounded-3xl p-5 space-y-4 mb-4">
                                        {customer.orderStatus === 'cancelled' && (
                                            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 text-xs font-bold">
                                                ⚠️ Pesanan ini telah dibatalkan oleh customer.
                                            </div>
                                        )}

                                        {/* KARTU AKSI REFUND (khusus QRIS yang berhak refund) */}
                                        {["pending_100_percent", "pending_50_percent"].includes(customer.refundStatus) && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <Wallet size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                                        Anda wajib mengembalikan dana <span className="font-black">Rp {Number(customer.refundAmount).toLocaleString("id-ID")}</span> ke customer ini via QRIS/transfer manual.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setRefundTargetId(customer.orderId)}
                                                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] uppercase tracking-wider transition-all"
                                                >
                                                    Saya Sudah Transfer Dana
                                                </button>
                                            </div>
                                        )}

                                        {customer.refundStatus === "mitra_claimed" && (
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center gap-2">
                                                <Clock3 size={16} className="text-indigo-500 shrink-0" />
                                                <p className="text-xs font-bold text-indigo-700">Menunggu customer mengonfirmasi penerimaan dana.</p>
                                            </div>
                                        )}

                                        {customer.refundStatus === "disputed" && (
                                            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2">
                                                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                                <p className="text-xs font-bold text-red-600">Customer melaporkan belum menerima dana. Kasus ini sedang ditinjau Admin.</p>
                                            </div>
                                        )}

                                        {customer.refundStatus === "refunded" && (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                                <p className="text-xs font-bold text-emerald-700">Refund selesai - sudah dikonfirmasi diterima oleh customer.</p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => navigate(`/mitra/customer/${customer.id}`)}
                                                className="flex items-center gap-4 min-w-0 text-left hover:opacity-80 transition-opacity"
                                            >
                                                <img src={customer.photo} alt={customer.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0 bg-white" />
                                                <div className="min-w-0">
                                                    <h2 className="font-black text-gray-800 text-base truncate">{customer.name}</h2>
                                                    <span className="inline-block mt-0.5 bg-indigo-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">{customer.type}</span>
                                                </div>
                                            </button>

                                            <div className="shrink-0 flex items-center gap-2">
                                                {/* TOMBOL TANDAI TIDAK HADIR */}
                                                {tripStatus === "active" && customer.readinessStatus !== "ready" && customer.readinessStatus !== "no_show" && customer.orderStatus !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleNoShow(customer.orderId)}
                                                        className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-500 hover:text-white font-black text-[10px] uppercase tracking-wider transition-all"
                                                    >
                                                        Tidak Hadir
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openChatWith(customer.id, navigate, "/mitra/pesan-mitra")}
                                                    className="w-11 h-11 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-md hover:bg-indigo-800 transition-all active:scale-95"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status Kesiapan Scan / No Show */}
                                        <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
                                            <span>Status Kesiapan:</span>
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black ${
                                                customer.readinessStatus === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                                                customer.readinessStatus === 'no_show' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {customer.readinessStatus === 'ready' ? 'Siap (Scan QR)' : customer.readinessStatus === 'no_show' ? 'Tidak Hadir (No Show)' : 'Menunggu Scan'}
                                            </span>
                                        </div>

                                        {customer.paymentMethod && (
                                            <div className="bg-white border border-gray-100 rounded-2xl p-4">
                                                {customer.paymentStatus === "paid" ? (
                                                    <p className="text-xs font-black text-emerald-600">
                                                        ✓ Pembayaran {customer.paymentMethod === "cash" ? "tunai" : "QRIS"} sudah dikonfirmasi
                                                    </p>
                                                ) : customer.paymentMethod === "cash" ? (
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Pembayaran Tunai</p>
                                                        <p className="text-[11px] text-gray-400">Klik tombol di bawah setelah menerima uang tunai.</p>
                                                        <button
                                                            onClick={() => handleConfirmPayment(customer.orderId)}
                                                            disabled={confirmingPaymentId === customer.orderId}
                                                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                                        >
                                                            {confirmingPaymentId === customer.orderId ? "Memproses..." : "Konfirmasi Sudah Terima Uang"}
                                                        </button>
                                                    </div>
                                                ) : customer.paymentStatus === "waiting_confirmation" ? (
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-black text-amber-600 uppercase tracking-wide">Menunggu konfirmasi pembayaran QRIS</p>
                                                        {customer.paymentProof && (
                                                            <img
                                                                src={`http://127.0.0.1:8000/storage/${customer.paymentProof}`}
                                                                alt="Bukti pembayaran"
                                                                className="w-full max-h-48 object-contain rounded-xl border border-gray-100 bg-gray-50"
                                                            />
                                                        )}
                                                        <button
                                                            onClick={() => handleConfirmPayment(customer.orderId)}
                                                            disabled={confirmingPaymentId === customer.orderId}
                                                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                                        >
                                                            {confirmingPaymentId === customer.orderId ? "Memproses..." : "Konfirmasi Sudah Dibayar"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-bold text-gray-400">Menunggu customer mengupload bukti pembayaran QRIS.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-6 text-center">
                                    <p className="text-sm font-bold text-gray-400">Belum ada customer</p>
                                </div>
                            )}
                        </div>

                        {/* TRIP STATS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jarak Tempuh</p>
                                <p className="text-xl font-black text-indigo-900 mt-1">{trip?.estimated_distance_km || 0} KM</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimasi Waktu</p>
                                <p className="text-xl font-black text-indigo-900 mt-1">{trip?.estimated_duration_min || 0} Menit</p>
                            </div>
                        </div>

                        {/* TIMELINE ROUTE DESCRIPTIONS */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Rute Perjalanan</h3>
                            <div className="relative pl-8 space-y-6">
                                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-indigo-100 border-l border-dashed border-indigo-300"></div>

                                <div className="relative">
                                    <div className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-emerald-500 shadow-md"></div>
                                    <h4 className="text-sm font-black text-gray-800">{originPoint.name}</h4>
                                    <p className="text-xs font-medium text-gray-400 mt-1 leading-relaxed line-clamp-2">{originPoint.address}</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-orange-500 shadow-md"></div>
                                    <h4 className="text-sm font-black text-gray-800">{destinationPoint.name}</h4>
                                    <p className="text-xs font-medium text-gray-400 mt-1 leading-relaxed line-clamp-2">{destinationPoint.address}</p>
                                </div>
                            </div>
                        </div>

                        {/* MAIN ACTION BUTTON */}
                        <div className="pt-4 sticky bottom-0 bg-white space-y-3">
                            {tripStatus === "active" && customers.length === 0 && (
                                <p className="text-xs text-center font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl py-3 px-4">Menunggu customer memesan tebengan ini sebelum bisa berangkat.</p>
                            )}

                            {tripStatus === "arrived_destination" && (
                                <p className="text-xs text-center font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-2xl py-3 px-4">Tunjukkan QR di bawah ini kepada petugas Pos Mitra untuk menyelesaikan perjalanan.</p>
                            )}

                            {tripStatus === "cancelled" ? (
                            <div className="space-y-3">
                                <p className="text-xs text-center font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl py-3 px-4">Perjalanan ini telah dibatalkan.</p>
                                <button
                                    onClick={() => navigate("/mitra/dashboard")}
                                    className="w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-gray-800 hover:bg-gray-900 transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] shadow-xl"
                                >
                                    Kembali ke Beranda
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={tripStatus === "completed" ? () => navigate("/mitra/dashboard") : handleStatusAction}
                                disabled={loadingArrivalQR || (tripStatus === "active" && (customers.length === 0 || !customers.every((c) => c.readinessStatus === "ready" || c.readinessStatus === "no_show")))}
                                className={`w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] shadow-xl
                                    ${
                                        tripStatus === "active" && (customers.length === 0 || !customers.every((c) => c.readinessStatus === "ready" || c.readinessStatus === "no_show"))
                                            ? "bg-gray-300 shadow-none cursor-not-allowed"
                                            : "bg-indigo-900 shadow-indigo-100 hover:bg-indigo-800"
                                    }
                                `}
                            >
                                {tripStatus === "completed" ? (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Kembali ke Beranda
                                    </>
                                ) : tripStatus === "arrived_destination" ? (
                                    <>
                                        <QrCode size={18} />
                                        {loadingArrivalQR ? "Membuat QR..." : "Tampilkan QR"}
                                    </>
                                ) : (
                                    <>
                                        {STATUS_CONFIG[tripStatus]?.button}
                                        <Navigation size={16} className="transform rotate-45" />
                                    </>
                                )}
                            </button>
                        )}

                            {tripStatus === "arrived_destination" && (
                                <button onClick={() => navigate(`/mitra/detail-tebengan/${tripId}`)} className="w-full py-3 rounded-2xl bg-white border border-gray-100 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">
                                    Lihat Detail Tebengan
                                </button>
                            )}

                            {tripStatus === "completed" && customers.filter((c) => c.orderStatus !== 'cancelled').length > 0 && (
                                <div className="space-y-3">
                                    {customers.filter((c) => c.orderStatus !== 'cancelled').map((customer) =>
                                        customer.mitraReviewed ? (
                                            <div
                                                key={customer.id}
                                                className="w-full py-4 px-5 rounded-2xl font-black text-sm uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center gap-2 text-center"
                                            >
                                                <span>Sudah Diberi Rating - {customer.name}</span>
                                            </div>
                                        ) : (
                                            <button
                                                key={customer.id}
                                                onClick={() => navigate(`/mitra/beri-rating/${tripId}/${customer.id}`)}
                                                className="
                                                    w-full py-4.5 rounded-2xl
                                                    font-black text-sm uppercase tracking-widest
                                                    bg-indigo-900 text-white
                                                    shadow-xl shadow-indigo-100
                                                    hover:bg-indigo-800
                                                    transition-all duration-300
                                                    active:scale-[0.98]
                                                    flex items-center justify-center gap-3
                                                "
                                            >
                                                <Star size={18} />
                                                Beri Rating {customer.name}
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {showDepartureQR && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-5">
                        <h2 className="text-xl font-black text-indigo-900">QR Keberangkatan</h2>
                        <p className="text-sm text-gray-500">Tunjukkan QR ini kepada Pos Mitra untuk memulai perjalanan.</p>
                        <div className="bg-white p-4 rounded-2xl flex justify-center">
                            {departureQR && (
                                <QRCode
                                    value={JSON.stringify({
                                        type: "departure",
                                        token: departureQR.token,
                                    })}
                                    size={220}
                                />
                            )}
                        </div>
                        <button onClick={() => setShowDepartureQR(false)} className="w-full py-3 rounded-2xl bg-gray-100 font-black">
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {showArrivalQR && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-5">
                        <h2 className="text-xl font-black text-indigo-900">QR Perjalanan</h2>
                        <p className="text-sm text-gray-500">Tunjukkan QR ini kepada Pos Mitra untuk menyelesaikan perjalanan.</p>
                        <div className="bg-white p-4 rounded-2xl flex justify-center">
                            {arrivalQR && (
                                <QRCode
                                    value={JSON.stringify({
                                        type: "trip",
                                        token: arrivalQR.token,
                                    })}
                                    size={220}
                                />
                            )}
                        </div>
                        {arrivalQR?.expired_at && (
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Berlaku hingga</p>
                                <p className="font-black text-indigo-900 mt-1">{new Date(arrivalQR.expired_at).toLocaleString()}</p>
                            </div>
                        )}
                        <button onClick={() => setShowArrivalQR(false)} className="w-full py-3 rounded-2xl bg-gray-100 font-black">
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            <SuccessPopup show={departureVerified} onClose={() => setDepartureVerified(false)} title="Perjalanan Dimulai" message="QR keberangkatan berhasil diverifikasi Pos Mitra. Selamat menempuh perjalanan." />
            <SuccessPopup show={tripCompleted} onClose={() => setTripCompleted(false)} title="Perjalanan Selesai" message="QR berhasil diverifikasi Pos Mitra. Perjalanan ini telah selesai." />

            {/* KONFIRMASI TRANSFER REFUND + UPLOAD BUKTI */}
            {refundTargetId && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 space-y-5">
                        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                            <Wallet size={28} />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-black text-indigo-900">Konfirmasi Transfer Refund</h3>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                Pastikan Anda sudah benar-benar mentransfer dana ke customer, lalu lampirkan bukti transfernya di bawah ini. Klaim palsu tanpa bukti valid dapat dilaporkan dan diperiksa Admin.
                            </p>
                        </div>

                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-4 text-center transition-all bg-gray-50/50">
                                {refundProofPreview ? (
                                    <img src={refundProofPreview} alt="Preview bukti transfer" className="w-full max-h-56 object-contain rounded-xl mx-auto" />
                                ) : (
                                    <div className="py-6 space-y-2 text-gray-400">
                                        <p className="text-xs font-bold">Klik untuk upload screenshot bukti transfer</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" accept="image/*" onChange={handleRefundProofChange} className="hidden" />
                        </label>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={closeRefundModal}
                                disabled={processingRefund}
                                className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmRefund}
                                disabled={processingRefund || !refundProofFile}
                                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                            >
                                {processingRefund ? "Mengirim..." : "Ya, Saya Sudah Transfer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AlertModal
                show={alertInfo.show}
                type={alertInfo.type}
                title={alertInfo.title}
                message={alertInfo.message}
                onClose={() => setAlertInfo((prev) => ({ ...prev, show: false }))}
            />
        </MitraLayout>
    );
}