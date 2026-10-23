import React, { useEffect, useState, useRef } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, MessageCircle, Navigation, Clock3, ChevronUp, ChevronDown, ShieldAlert, Car, MapPin, Crosshair, AlertTriangle, Loader2, PhoneCall, Wallet, CheckCircle2, FileText } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import QRCode from "react-qr-code";
import SuccessPopup from "../../components/ui/SuccessPopup";
import AlertModal from "../../components/ui/AlertModal";
import RekeningPicker from "../../components/RekeningPicker";
import axios from "../../api/axios";

// ================= CUSTOM MAP ICONS =================
const driverIcon = L.divIcon({
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

export default function PerjalananCustomer() {
    const navigate = useAppNavigate();
    const { tripId } = useParams();

    const [tripStatus, setTripStatus] = useState("waiting_departure");
    const [trip, setTrip] = useState(null);
    const [hasReviewedMitra, setHasReviewedMitra] = useState(false);
    const [loading, setLoading] = useState(true);

    const [isPanelExpanded, setIsPanelExpanded] = useState(true);

    // --- State Pembatalan ---
    const [loadingCancel, setLoadingCancel] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // --- State SOS Darurat ---
    const [showSosModal, setShowSosModal] = useState(false);
    const [loadingSos, setLoadingSos] = useState(false);
    const [sosMessage, setSosMessage] = useState("");
    const SOS_MESSAGE_MAX = 500;

    // --- State Popup Alert Kustom (pengganti window.alert bawaan browser) ---
    const [alertInfo, setAlertInfo] = useState({ show: false, type: "success", title: "", message: "" });

    // --- State Konfirmasi Refund & Laporan Mitra ---
    const [loadingConfirmReceived, setLoadingConfirmReceived] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [complaintText, setComplaintText] = useState("");
    const [complaintProofFile, setComplaintProofFile] = useState(null);
    const [complaintProofPreview, setComplaintProofPreview] = useState(null);
    const [loadingComplaint, setLoadingComplaint] = useState(false);
    const [complaint, setComplaint] = useState(null);

    // --- State Rekening/E-wallet Tujuan Refund ---
    const [refundDestinationInput, setRefundDestinationInput] = useState("");
    const [savingRefundDestination, setSavingRefundDestination] = useState(false);

    // --- Real-time driver position simulation ---
    const [driverPosition, setDriverPosition] = useState(null);
    const [activeRoute, setActiveRoute] = useState([]);
    const [qrData, setQrData] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [justVerified, setJustVerified] = useState(false);
    const prevReadinessRef = useRef(null);

    // Customer yang sedang login - dipakai untuk cari order MILIKNYA SENDIRI
    // di trip.orders, bukan selalu order pertama. Satu trip barang bisa
    // dipesan banyak customer sekaligus, jadi trip.orders[0] bisa jadi
    // milik orang lain, bukan milik customer yang sedang buka halaman ini.
    const [currentUser] = useState(() => {
        const userData = localStorage.getItem("user");
        return userData ? JSON.parse(userData) : null;
    });

    // Kalau customer yang sama punya LEBIH DARI SATU order untuk trip yang
    // sama (mis. order lama sudah dibatalkan+refund, lalu pesan ulang trip
    // yang sama karena kursinya kosong lagi), JANGAN ambil yang pertama
    // ketemu begitu saja - itu bisa jadi order LAMA yang sudah dibatalkan.
    // Prioritaskan order yang MASIH AKTIF (bukan cancelled); kalau semua
    // order customer ini di trip tersebut ternyata cancelled semua, baru
    // tampilkan yang PALING BARU di antara yang cancelled itu (urutkan by
    // created_at, bukan asal ambil elemen pertama dari array).
    const customerOrders = (trip?.orders ?? [])
        .filter((o) => o.customer_id === currentUser?.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const order = customerOrders.find((o) => o.status !== "cancelled") ?? customerOrders[0] ?? trip?.orders?.[0];

    // Laporan yang sudah di-resolve admin (status === "resolved") TIDAK
    // boleh lagi dianggap "aktif" - kalau tidak, field isi rekening akan
    // permanen hilang dan banner "sedang ditinjau" akan permanen nongol
    // walau kasusnya sudah kelar dan refund_status sudah balik normal.
    // Disamakan dengan logika yang sama persis di Pesanan.jsx.
    const hasActiveComplaint = complaint && complaint.status !== "resolved";

    // Cek apakah customer sudah pernah lapor untuk order ini (kalau refund sedang berjalan).
    // "disputed" WAJIB ikut di sini - tanpa ini, admin_notes tidak pernah
    // ter-refresh kalau customer reload halaman setelah laporannya
    // ditinjau admin (order.refund_status sudah berubah ke disputed).
    useEffect(() => {
    // PENTING: reset dulu setiap kali order berganti, supaya laporan
    // milik order SEBELUMNYA tidak nyangkut di state dan salah
    // ditampilkan untuk order yang baru dibuka.
    setComplaint(null);

    if (!order || order.payment_method !== "qris" || !["pending_100_percent", "pending_50_percent", "mitra_claimed", "disputed"].includes(order.refund_status)) return;

    axios.get(`/orders/${order.id}/complaint`)
    .then((res) => {
        // PENTING: backend bisa balas objek kosong {} (bukan null literal)
        // kalau tidak ada laporan. {} itu truthy di JS, jadi `res.data || null`
        // tidak cukup - harus dicek eksplisit apakah objeknya benar-benar
        // punya isi (misal ada field `id`).
        const data = res.data && res.data.id ? res.data : null;
        setComplaint(data);
    })
    .catch(() => setComplaint(null));
}, [order?.id, order?.refund_status]);

    // Isi awal input rekening tujuan dari data tersimpan (sekali per order).
    useEffect(() => {
        if (order?.refund_destination) {
            setRefundDestinationInput(order.refund_destination);
        }
    }, [order?.id]);

    const confirmReceived = async () => {
        if (!order) return;
        try {
            setLoadingConfirmReceived(true);
            const response = await axios.post(`/orders/${order.id}/refund-confirm`);
            setAlertInfo({ show: true, type: "success", title: "Terkonfirmasi", message: response.data.message });
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

    const submitRefundDestination = async () => {
        if (!order || refundDestinationInput.trim().length < 5) {
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
            const response = await axios.post(`/orders/${order.id}/refund-destination`, {
                refund_destination: refundDestinationInput,
            });
            const savedDestination = response.data.order.refund_destination;
            // `order` di sini diturunkan dari `trip.orders` - update trip
            // state supaya tampilan langsung ikut segar tanpa nunggu
            // polling berikutnya.
            setTrip((prev) => prev && {
                ...prev,
                orders: prev.orders.map((o) => (o.id === order.id ? { ...o, refund_destination: savedDestination } : o)),
            });
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

    const submitComplaint = async () => {
        if (!order) return;
        if (complaintText.trim().length < 10) {
            setAlertInfo({ show: true, type: "error", title: "Deskripsi Terlalu Singkat", message: "Mohon jelaskan keluhan Anda minimal 10 karakter." });
            return;
        }

        // WAJIB: kalau mitra sudah mengklaim transfer (mitra_claimed),
        // customer WAJIB lampirkan bukti pendukung sendiri - supaya
        // beban pembuktian tidak sepihak ke mitra saja.
        if (order.refund_status === "mitra_claimed" && !complaintProofFile) {
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

            const response = await axios.post(`/orders/${order.id}/complaint`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setComplaint(response.data.complaint);
            closeComplaintModal();
            setComplaintText("");
            setAlertInfo({ show: true, type: "success", title: "Laporan Terkirim", message: response.data.message });
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

    const isCancelled = order?.status === "cancelled" || trip?.status === "cancelled";
    const showQrButton = !isCancelled && tripStatus === "waiting_departure" && order?.readiness_status === "waiting";
    const showReadyInfo = tripStatus === "waiting_departure" && order?.readiness_status === "ready";

    // Begitu Pos Mitra berhasil verifikasi QR customer, tutup modal dan tampilkan popup
    useEffect(() => {
        const current = order?.readiness_status;

        if (prevReadinessRef.current === "waiting" && current && current !== "waiting") {
            if (showQR) setShowQR(false);
            setJustVerified(true);
        }

        prevReadinessRef.current = current ?? prevReadinessRef.current;
    }, [order?.readiness_status, showQR]);

    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}/journey`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                const data = await res.json();
                setTrip(data.trip);
                setHasReviewedMitra(!!data.has_reviewed_mitra);

                if (data.latest_tracking) {
                    setDriverPosition([Number(data.latest_tracking.latitude), Number(data.latest_tracking.longitude)]);
                }

                if (data.trip.status === "waiting_departure") setTripStatus("waiting_departure");
                if (data.trip.status === "on_the_way") setTripStatus("on_the_way");
                if (data.trip.status === "arrived_destination") setTripStatus("arrived_destination");
                if (data.trip.status === "completed") setTripStatus("completed");
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTrip();
        const interval = setInterval(fetchTrip, 4000);
        return () => clearInterval(interval);
    }, [tripId]);

    const handleGenerateQR = async () => {
        try {
            const token = localStorage.getItem("token");

            // PENTING: pakai `order` (sudah difilter milik customer yang
            // login), BUKAN trip.orders[0] lagi - supaya tiap customer
            // generate QR untuk ORDER-nya SENDIRI, walaupun trip-nya sama
            // dengan customer lain.
            const orderId = order?.id;

            if (!orderId) {
                alert("Order tidak ditemukan");
                return;
            }

            const response = await fetch(`http://127.0.0.1:8000/api/customer/orders/${orderId}/generate-qr`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            const data = await response.json();
            if (!response.ok) {
                alert(data.message);
                return;
            }

            setQrData(data);
            setShowQR(true);
        } catch (error) {
            console.error(error);
        }
    };

    // --- Fungsi Eksekusi Pembatalan ---
    const confirmCancelOrder = async () => {
        if (!order?.id) {
            alert("ID Pesanan tidak ditemukan.");
            return;
        }

        try {
            setLoadingCancel(true);
            const response = await axios.post(`/orders/${order.id}/cancel`);

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

    // --- Fungsi Kirim SOS ---
    // Mengirim keterangan darurat (opsional) beserta posisi driver saat ini
    // ke admin. Setelah berhasil/dibatalkan, kolom keterangan dikosongkan
    // lagi supaya modal selalu fresh saat dibuka berikutnya.
    // Ambil lokasi GPS langsung dari device customer yang sedang melapor.
    // Ini SUMBER UTAMA lokasi SOS - lebih akurat & lebih relevan daripada
    // cuma mengandalkan posisi terakhir mitra (yang bisa null/basi kalau
    // GPS mitra belum sempat update). Kalau customer menolak izin lokasi
    // atau timeout, baru fallback ke driverPosition (posisi mitra).
    const getCustomerCoords = () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
                () => resolve(null), // ditolak / gagal -> nanti fallback
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    };

    const handleSendSos = async () => {
        // Lapisan pengaman kedua di luar sembunyikan-tombol: kalau status trip
        // ternyata bukan on_the_way saat submit (mis. status berubah tepat saat
        // modal masih terbuka), tolak pengiriman daripada diam-diam diproses.
        if (tripStatus !== "on_the_way") {
            setAlertInfo({
                show: true,
                type: "error",
                title: "SOS Belum Bisa Dikirim",
                message: "Fitur SOS hanya tersedia selama perjalanan sedang berlangsung.",
            });
            setShowSosModal(false);
            return;
        }

        try {
            setLoadingSos(true);

            // Prioritas: GPS customer sendiri (real-time, saat tombol ditekan) ->
            // fallback ke posisi mitra terakhir yang sudah ada di layar.
            const customerCoords = await getCustomerCoords();
            const coords = customerCoords || driverPosition;

            const response = await axios.post(`/trips/${tripId}/sos`, {
                latitude: coords ? coords[0] : null,
                longitude: coords ? coords[1] : null,
                message: sosMessage,
            });
            setShowSosModal(false);
            setSosMessage(""); // reset supaya modal bersih saat dibuka lagi nanti
            setAlertInfo({
                show: true,
                type: "success",
                title: "SOS Terkirim",
                message: response.data.message || "Sinyal darurat dan lokasi Anda sudah diterima admin. Tim kami akan segera meninjau dan menindaklanjuti perjalanan ini.",
            });
        } catch (error) {
            console.error("Gagal kirim SOS:", error.response?.data || error.message);
            setAlertInfo({
                show: true,
                type: "error",
                title: "Gagal Mengirim SOS",
                message: error.response?.data?.message || "Gagal mengirim SOS.",
            });
        } finally {
            setLoadingSos(false);
        }
    };

    // Tutup modal SOS tanpa mengirim — keterangan yang sudah diketik ikut direset.
    const closeSosModal = () => {
        setShowSosModal(false);
        setSosMessage("");
    };

    const getVehicleDisplay = (vType) => {
        if (vType === "motor") return "Sepeda Motor";
        if (vType === "mobil") return "Mobil Passenger";
        if (vType === "Barang-Mobil") return "Mobil (Nebeng Barang)";
        if (vType === "Barang-Motor") return "Motor (Nebeng Barang)";
        return vType || "-";
    };

    const driver = {
        name: trip?.mitra?.name || "Mitra",
        photo: trip?.mitra?.avatar 
            ? `http://127.0.0.1:8000/storage/${trip.mitra.avatar}` 
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip?.mitra?.name || "Mitra"}`,
        vehicle: getVehicleDisplay(trip?.vehicle_type),
        type: trip?.vehicle_type?.includes("Barang") ? "Mitra Barang" : "Mitra Nebeng",
    };

    const pickupPoint = {
        name: trip?.origin_point?.pos_name || "Pos Asal",
        address: trip?.origin_point?.address || "-",
        coords: [parseFloat(trip?.origin_point?.latitude || 0), parseFloat(trip?.origin_point?.longitude || 0)],
    };

    const destinationPoint = {
        name: trip?.destination_point?.pos_name || "Pos Tujuan",
        address: trip?.destination_point?.address || "-",
        coords: [parseFloat(trip?.destination_point?.latitude || 0), parseFloat(trip?.destination_point?.longitude || 0)],
    };

    let routePath = [pickupPoint.coords, destinationPoint.coords];
    try {
        if (trip?.route_geojson) {
            const parsed = JSON.parse(trip.route_geojson);
            if (parsed?.coordinates) {
                routePath = parsed.coordinates.map((coord) => [coord[1], coord[0]]);
            }
        }
    } catch (err) {
        console.error("Route parse error:", err);
    }

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

    useEffect(() => {
        if (!tripId) return;

        const fetchLatestLocation = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}/latest-location`);
                const data = await res.json();

                if (!res.ok) {
                    if (data.trip_status === "waiting_departure") setTripStatus("waiting_departure");
                    if (data.trip_status === "on_the_way") setTripStatus("on_the_way");
                    if (data.trip_status === "arrived_destination") setTripStatus("arrived_destination");
                    if (data.trip_status === "completed") setTripStatus("completed");
                    return;
                }

                if (data.latitude && data.longitude) {
                    setDriverPosition([Number(data.latitude), Number(data.longitude)]);
                }

                if (data.trip_status) {
                    if (data.trip_status === "waiting_departure") setTripStatus("waiting_departure");
                    if (data.trip_status === "on_the_way") setTripStatus("on_the_way");
                    if (data.trip_status === "arrived_destination") setTripStatus("arrived_destination");
                    if (data.trip_status === "completed") setTripStatus("completed");
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchLatestLocation();
        const interval = setInterval(fetchLatestLocation, 3000);
        return () => clearInterval(interval);
    }, [tripId]);

    useEffect(() => {
        if (!driverPosition || routePath.length === 0) return;
        const closestIndex = getClosestRouteIndex(driverPosition, routePath);
        const slicedRoute = routePath.slice(closestIndex);
        setActiveRoute(slicedRoute);
    }, [driverPosition, routePath]);

    const currentDriverPosition = driverPosition || pickupPoint.coords;

    const getStatusBadgeText = () => {
        if (isCancelled) return "Pesanan Dibatalkan";
        switch (tripStatus) {
            case "waiting_departure": return "Menunggu Keberangkatan";
            case "on_the_way": return "Dalam Perjalanan";
            case "arrived_destination": return "Sudah Sampai Tujuan";
            case "completed": return "Perjalanan Selesai";
            default: return "Perjalanan Aktif";
        }
    };

    // Navigasi ke halaman Pesan sambil membawa identitas mitra dari trip
    // ini, supaya Pesan.jsx bisa langsung membuka percakapan dengan
    // mitra tsb, bukan cuma menampilkan daftar percakapan kosong.
    const goToMitraChat = () => {
        navigate("/customer/pesan", {
            state: {
                mitraId: trip?.mitra?.id,
                mitraName: driver.name,
            },
        });
    };

    if (loading) {
        return (
            <CustomerLayout>
                <div className="p-10 text-center">Loading perjalanan...</div>
            </CustomerLayout>
        );
    }

    if (!trip) {
        return (
            <CustomerLayout>
                <div className="p-10 text-center">Trip tidak ditemukan</div>
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout>
            {/* ================= MAIN WRAPPER ================= */}
            <div className="relative h-[calc(100vh-80px)] w-full overflow-hidden bg-gray-50 font-sans grid grid-cols-1 lg:grid-cols-12">
                {/* ================= MAP SECTION ================= */}
                <div className="relative w-full h-full lg:col-span-7 z-0">
                    <MapContainer center={pickupPoint.coords} zoom={10} scrollWheelZoom={true} className="h-full w-full">
                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        <Marker position={currentDriverPosition} icon={driverIcon}>
                            <Popup>Posisi Driver</Popup>
                        </Marker>

                        <Marker position={destinationPoint.coords} icon={destinationIcon}>
                            <Popup>{destinationPoint.name}</Popup>
                        </Marker>
                        <RecenterButton position={currentDriverPosition} />
                        
                        <Polyline
                            positions={activeRoute.length > 0 ? activeRoute : routePath}
                            pathOptions={{ color: "#1e1b4b", weight: 6, opacity: 0.8 }}
                        />
                    </MapContainer>

                    <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
                        <button
                            onClick={() => (order ? navigate(`/customer/pesanan/${order.id}`) : navigate("/customer/riwayat"))}
                            className="mx-8 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100 active:scale-95 transition-all pointer-events-auto"
                        >
                            <ChevronLeft size={24} className="text-indigo-900" />
                        </button>

                        <div className="bg-indigo-900 text-white rounded-full shadow-2xl px-5 py-2.5 flex items-center gap-2 border border-white/10">
                            <Clock3 size={14} className="text-sky-400 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest">{getStatusBadgeText()}</span>
                        </div>
                    </div>

                    {/* Tombol SOS cuma tampil saat perjalanan benar-benar sedang berlangsung
                        (customer & mitra sudah scan QR / status on_the_way). Sebelum berangkat
                        belum ada yang perlu "diselamatkan", jadi tombolnya disembunyikan dulu. */}
                    {tripStatus === "on_the_way" && (
                        <div className="absolute top-24 right-6 z-[1000]">
                            <button
                                onClick={() => setShowSosModal(true)}
                                className="bg-white border-2 border-red-500 text-red-500 rounded-2xl px-4 py-2 text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-500 hover:text-white transition-all animate-pulse"
                            >
                                SOS
                            </button>
                        </div>
                    )}
                </div>

                {/* ================= DETAIL PANEL ================= */}
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
                        {/* DRIVER INFO */}
                        <div className="bg-indigo-50/50 border border-indigo-50 rounded-3xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <img src={driver.photo} alt="Driver" className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0" />
                                <div className="min-w-0">
                                    <h2 className="font-black text-gray-800 text-base truncate">{driver.name}</h2>
                                    <span className="inline-block mt-0.5 bg-indigo-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">{driver.type}</span>
                                    <p className="text-xs text-gray-400 mt-2">{driver.vehicle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={goToMitraChat} className="w-11 h-11 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-md hover:bg-indigo-800 transition-all active:scale-95">
                                    <MessageCircle size={18} />
                                </button>
                            </div>
                        </div>

                        {/* STATUS CARD */}
                        <div
                            className={`rounded-3xl p-5 shadow-xl ${
                                isCancelled
                                    ? "bg-red-50 border border-red-100"
                                    : tripStatus === "waiting_departure"
                                    ? showQrButton
                                        ? "bg-amber-50 border border-amber-100"
                                        : "bg-white border border-gray-100"
                                    : "bg-indigo-900 text-white"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p
                                        className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                                            isCancelled
                                                ? "text-red-400"
                                                : tripStatus === "waiting_departure"
                                                ? showQrButton
                                                    ? "text-amber-500"
                                                    : "text-gray-400"
                                                : "text-sky-300"
                                        }`}
                                    >
                                        Status Perjalanan
                                    </p>
                                    <h2 className={`text-xl font-black mt-2 leading-tight ${isCancelled ? "text-red-700" : ""}`}>
                                        {isCancelled
                                            ? "Pesanan Dibatalkan"
                                            : tripStatus === "waiting_departure"
                                            ? showQrButton
                                                ? "Segera Scan QR Check-in"
                                                : "Menunggu Perjalanan Dimulai"
                                            : tripStatus === "on_the_way"
                                            ? "Perjalanan Sedang Berlangsung"
                                            : tripStatus === "arrived_destination"
                                            ? "Sudah Sampai di Tujuan"
                                            : "Perjalanan Selesai"}
                                    </h2>
                                    <p className={`text-sm mt-3 leading-relaxed ${isCancelled ? "text-red-500" : tripStatus === "waiting_departure" ? "text-gray-400" : "text-indigo-100"}`}>
                                        {isCancelled
                                            ? "Pesanan ini sudah dibatalkan dan tidak akan diberangkatkan."
                                            : tripStatus === "waiting_departure"
                                            ? showQrButton
                                                ? "Tunjukkan QR verifikasi Anda ke mitra/pos untuk check-in sebelum perjalanan dimulai."
                                                : "Anda sudah check-in. Driver sedang bersiap untuk memulai perjalanan."
                                            : tripStatus === "on_the_way"
                                            ? "Anda sedang menuju lokasi tujuan bersama driver."
                                            : tripStatus === "arrived_destination"
                                            ? "Driver telah sampai di lokasi tujuan."
                                            : "Perjalanan telah selesai."}
                                    </p>
                                </div>
                                <div
                                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                                        isCancelled
                                            ? "bg-red-100"
                                            : tripStatus === "waiting_departure"
                                            ? showQrButton
                                                ? "bg-amber-100"
                                                : "bg-indigo-50"
                                            : "bg-white/10"
                                    }`}
                                >
                                    {isCancelled ? (
                                        <AlertTriangle size={30} className="text-red-500" />
                                    ) : tripStatus === "waiting_departure" && showQrButton ? (
                                        <AlertTriangle size={30} className="text-amber-600" />
                                    ) : (
                                        <Car size={30} className={tripStatus === "waiting_departure" ? "text-indigo-900" : "text-white"} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TRIP STATS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimasi Waktu</p>
                                <p className="text-xl font-black text-indigo-900 mt-1">{trip?.estimated_duration_min ? `${trip.estimated_duration_min} Menit` : "-"}</p>
                                <p className="text-xs text-gray-400 mt-1">{trip?.estimated_distance_km || 0} KM</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Biaya</p>
                                <p className="text-xl font-black text-indigo-900 mt-1">Rp {Number(order?.price ?? trip.price ?? 0).toLocaleString("id-ID")}</p>
                            </div>
                        </div>

                        {/* ROUTE */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Rute Perjalanan</h3>
                            <div className="relative pl-8 space-y-6">
                                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-indigo-100 border-l border-dashed border-indigo-300"></div>

                                <div className="relative">
                                    <div className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-emerald-500 shadow-md"></div>
                                    <h4 className="text-sm font-black text-gray-800">{pickupPoint.name}</h4>
                                    <p className="text-xs font-medium text-gray-400 mt-1 leading-relaxed line-clamp-2">{pickupPoint.address}</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-4 border-white bg-orange-500 shadow-md"></div>
                                    <h4 className="text-sm font-black text-gray-800">{destinationPoint.name}</h4>
                                    <p className="text-xs font-medium text-gray-400 mt-1 leading-relaxed line-clamp-2">{destinationPoint.address}</p>
                                </div>
                            </div>
                        </div>

                        {/* CUSTOMER BELUM DIVERIFIKASI */}
                        {showQrButton && (
                            <div className="pt-2">
                                <button
                                    onClick={handleGenerateQR}
                                    className="w-full py-4 rounded-2xl bg-indigo-900 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-all active:scale-[0.98]"
                                >
                                    Tampilkan QR Verifikasi
                                </button>
                            </div>
                        )}

                        {/* TOMBOL BATALKAN PESANAN (Hanya muncul jika perjalanan belum selesai/dibatalkan) */}
                        {tripStatus !== "completed" && !isCancelled && (
                            <div className="pt-0">
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="w-full py-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.99] border border-red-100 shadow-sm"
                                >
                                    Batalkan Pesanan
                                </button>
                            </div>
                        )}

                        {/* PESANAN DIBATALKAN: link ke detail pesanan + status/aksi refund QRIS */}
                        {isCancelled && order && (
                            <div className="space-y-3">
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                                    <p className="text-xs font-black text-red-600">⚠️ Pesanan ini telah dibatalkan.</p>
                                    <button
                                        onClick={() => navigate(`/customer/pesanan/${order.id}`)}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-red-200 text-red-600 text-[11px] font-black uppercase tracking-wider hover:bg-red-100 transition-all"
                                    >
                                        <FileText size={13} /> Detail Pesanan
                                    </button>
                                </div>

                                {order.payment_method === "qris" && order.refund_status === "mitra_claimed" && (
                                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-3xl p-5 shadow-xl shadow-indigo-900/20 text-white space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                                                <Wallet size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Aksi Diperlukan</p>
                                                <h3 className="text-sm font-black leading-tight">Konfirmasi Penerimaan Refund</h3>
                                            </div>
                                        </div>
                                        <p className="text-xs text-indigo-100 leading-relaxed">
                                            Mitra mengklaim sudah mentransfer <span className="font-black text-white">Rp {Number(order.refund_amount).toLocaleString("id-ID")}</span> ke Anda. Sudah diterima?
                                        </p>
                                        {order.refund_reference && (
                                            <p className="text-xs text-indigo-200">
                                                No. Referensi Transaksi: <span className="font-black text-white">{order.refund_reference}</span>
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
                                        <div className="flex gap-2">
                                            <button
                                                onClick={confirmReceived}
                                                disabled={loadingConfirmReceived}
                                                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-indigo-950 font-black text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                            >
                                                {loadingConfirmReceived ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> Sudah Diterima</>}
                                            </button>
                                            <button
                                                onClick={() => setShowComplaintModal(true)}
                                                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-[11px] uppercase tracking-wider transition-all"
                                            >
                                                Belum Diterima
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {order.payment_method === "qris" && ["pending_100_percent", "pending_50_percent"].includes(order.refund_status) && !hasActiveComplaint && (
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            Menunggu mitra mentransfer refund <span className="font-bold">Rp {Number(order.refund_amount).toLocaleString("id-ID")}</span> ke rekening/e-wallet yang Anda daftarkan di bawah ini.
                                        </p>

                                        {/* Rekening/e-wallet tujuan - tercatat resmi, langsung
                                            terlihat mitra tanpa perlu dihubungi lewat chat dulu. */}
                                        <div>
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

                                        <div className="flex gap-2">
                                            <button
                                                onClick={goToMitraChat}
                                                className="flex-1 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <MessageCircle size={13} /> Chat Mitra
                                            </button>
                                            <button
                                                onClick={() => setShowComplaintModal(true)}
                                                className="flex-1 py-2.5 rounded-xl bg-white border border-amber-200 hover:bg-amber-50 text-amber-600 text-[11px] font-black uppercase tracking-wider transition-all"
                                            >
                                                Laporkan
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {order.payment_method === "qris" && (order.refund_status === "disputed" || hasActiveComplaint) && order.refund_status !== "refunded" && (
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2">
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
                                        <p className="text-xs text-red-500 leading-relaxed">
                                            {complaint?.admin_action === "blocked_mitra"
                                                ? "Admin sudah memblokir akun mitra ini. Pemblokiran belum tentu berarti dana Anda otomatis kembali - hubungi Pusat Bantuan untuk menindaklanjuti."
                                                : complaint?.admin_action === "warned_mitra"
                                                ? "Admin sudah menegur mitra dan memintanya segera menyelesaikan refund. Kalau belum ada perkembangan, hubungi Pusat Bantuan."
                                                : complaint?.status === "resolved"
                                                ? "Admin sudah menindaklanjuti laporan Anda. Cek kembali status refund secara berkala."
                                                : complaint?.type === "refund_overdue_auto"
                                                ? "Anda belum melapor apa pun - mitra saja yang belum mentransfer refund lebih dari 24 jam sejak pembatalan, jadi sistem otomatis meneruskan kasus ini ke Admin untuk ditinjau. Anda tidak perlu melakukan apa-apa, cukup pastikan rekening/e-wallet tujuan di bawah ini sudah terisi benar."
                                                : complaint
                                                ? "Laporan Anda sedang ditinjau Admin. Status akan diperbarui di sini - tidak perlu lapor ulang."
                                                : "Order ini berstatus disengketakan dan sedang ditinjau Admin. Anda tidak mengajukan laporan apa pun untuk ini - pastikan rekening/e-wallet tujuan di bawah ini sudah terisi benar sambil menunggu."}
                                        </p>
                                        {/* Rekening/e-wallet tujuan tetap bisa diisi/diubah di sini
                                            walau order sedang disengketakan - sebelumnya begitu
                                            status masuk 'disputed', customer sama sekali tidak
                                            punya cara isi rekening lewat sistem dan terpaksa balik
                                            ke chat manual. */}
                                        {order.refund_status !== "refunded" && (
                                            <div className="bg-white/60 rounded-xl p-3 border border-red-100">
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
                                        {/* Tampilkan catatan admin kalau sudah ada, supaya customer
                                            dapat info nyata soal progres laporannya - bukan cuma
                                            teks status statis yang sama terus dari awal sampai selesai. */}
                                        {complaint?.admin_notes && (
                                            <div className="bg-white/60 rounded-xl p-3 border border-red-100">
                                                <p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">Catatan Admin</p>
                                                <p className="text-xs text-red-700 leading-relaxed">{complaint.admin_notes}</p>
                                            </div>
                                        )}
                                        {/* Admin tidak punya chat langsung ke customer/mitra - jadi
                                            begitu ada tindakan yang belum tentu langsung
                                            menyelesaikan dananya, arahkan ke Pusat Bantuan (WA/
                                            email/telepon) sebagai jalur lanjutan yang nyata. */}
                                        {(complaint?.admin_action === "blocked_mitra" || complaint?.admin_action === "warned_mitra") && (
                                            <button
                                                onClick={() => navigate("/customer/pusat-bantuan")}
                                                className="w-full py-2.5 rounded-xl bg-white border border-red-200 hover:bg-red-100 text-red-600 text-[11px] font-black uppercase tracking-wider transition-all"
                                            >
                                                Hubungi Pusat Bantuan
                                            </button>
                                        )}
                                    </div>
                                )}

                                {order.payment_method === "qris" && order.refund_status === "refunded" && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                        <p className="text-xs font-black text-emerald-700">✓ Refund Selesai Dikonfirmasi</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CUSTOMER SUDAH DIVERIFIKASI */}
                        {showReadyInfo && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">✓</div>
                                    <div>
                                        <h3 className="font-black text-emerald-700 text-sm uppercase tracking-wide">Anda Sudah Siap</h3>
                                        <p className="text-sm text-emerald-600 mt-1 leading-relaxed">Anda telah diverifikasi oleh Pos Mitra. Menunggu mitra memulai perjalanan.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SAFETY & SOS TRIGGER CARD */}
                        {/* Tombol SOS hanya aktif selama perjalanan sedang berlangsung
                            (status on_the_way, setelah customer & mitra scan QR). Sebelum
                            berangkat, arrived, atau sudah completed, tombolnya disembunyikan
                            dan diganti keterangan singkat supaya customer tidak bingung. */}
                        {tripStatus === "on_the_way" ? (
                            <div className="bg-red-50 border border-red-100 rounded-3xl p-4 flex items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 mt-1">
                                        <ShieldAlert size={18} className="text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-red-700 text-sm uppercase tracking-wide">Fitur Keamanan</h3>
                                        <p className="text-xs text-red-500 mt-1 leading-relaxed">Tekan tombol darurat untuk mengirim sinyal ke admin.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSosModal(true)}
                                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md shrink-0 transition-all"
                                >
                                    SOS
                                </button>
                            </div>
                        ) : (
                            tripStatus !== "completed" && (
                                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                                        <ShieldAlert size={18} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-500 text-sm uppercase tracking-wide">Fitur Keamanan</h3>
                                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                            Tombol SOS akan aktif begitu perjalanan dimulai (setelah Anda dan mitra scan QR).
                                        </p>
                                    </div>
                                </div>
                            )
                        )}

                        {/* ACTION BUTTON */}
                        {tripStatus === "completed" && (
                            <div className="pt-4 sticky bottom-0 bg-white space-y-3">
                                <button
                                    onClick={() => navigate("/customer/dashboard")}
                                    className="w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] shadow-xl bg-indigo-900 shadow-indigo-100 hover:bg-indigo-800"
                                >
                                    Kembali ke Halaman Utama
                                </button>

                                {hasReviewedMitra ? (
                                    <div className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-emerald-600 bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center gap-3">
                                        <CheckCircle2 size={16} />
                                        Sudah Diberi Rating
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => navigate(`/customer/beri-rating/${tripId}`)}
                                        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-indigo-900 transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] border-2 border-indigo-100 hover:bg-indigo-50"
                                    >
                                        <Navigation size={16} className="transform rotate-45" />
                                        Berikan Penilaian (Opsional)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CUSTOM MODAL KONFIRMASI SOS DARURAT */}
            {showSosModal && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-red-100 space-y-6 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
                            <ShieldAlert size={32} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-red-600 tracking-tight">Kirim Sinyal Darurat (SOS)</h3>
                            <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                Sinyal darurat beserta lokasi Anda akan langsung dikirimkan ke Admin pusat agar Admin dapat segera menegur atau menghubungi mitra yang bertugas.
                            </p>
                        </div>

                        <div className="bg-red-50 rounded-2xl p-4 border border-red-100 text-left space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                                <PhoneCall size={14} />
                                <span>Darurat Mendesak / Polisi:</span>
                            </div>
                            <p className="text-sm font-black text-red-800">Hotline Darurat: 112</p>
                        </div>

                        <div className="text-left space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-red-400">
                                Keterangan Darurat (opsional, tapi sangat membantu admin)
                            </label>
                            <textarea
                                value={sosMessage}
                                onChange={(e) => setSosMessage(e.target.value.slice(0, SOS_MESSAGE_MAX))}
                                placeholder="Contoh: mitra mengemudi ugal-ugalan, kondisi kendaraan mencurigakan, dsb."
                                maxLength={SOS_MESSAGE_MAX}
                                rows={3}
                                className="w-full text-xs rounded-2xl border border-red-100 p-3 focus:outline-none focus:ring-2 focus:ring-red-300"
                            />
                            <p className="text-[10px] text-gray-400 text-right font-medium">
                                {sosMessage.length}/{SOS_MESSAGE_MAX}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={closeSosModal}
                                disabled={loadingSos}
                                className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSendSos}
                                disabled={loadingSos}
                                className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingSos ? <Loader2 className="animate-spin" size={16} /> : "Kirim ke Admin"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            (mitra_claimed), supaya laporan tidak cuma klaim sepihak. */}
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
                onClose={() => setAlertInfo((prev) => ({ ...prev, show: false }))}
            />

            {/* Utility Styles */}
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* QR MODAL */}
            {showQR && qrData?.token && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative">
                        <button
                            onClick={() => setShowQR(false)}
                            className="
                                absolute top-4 right-4
                                w-10 h-10 rounded-full
                                bg-gray-100 hover:bg-gray-200
                                font-black text-gray-500
                            "
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-black text-indigo-900 text-center mb-2">QR Verifikasi</h2>
                        <p className="text-sm text-gray-400 text-center mb-8">Tunjukkan QR ini kepada petugas Pos Mitra</p>

                        <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                                <QRCode
                                    value={JSON.stringify({
                                        type: "customer",
                                        token: qrData.token,
                                    })}
                                    size={240}
                                />
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-xs text-gray-400 font-medium">Berlaku hingga</p>
                            <p className="font-black text-indigo-900 mt-1">{new Date(qrData.expired_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            <SuccessPopup
                show={justVerified}
                onClose={() => setJustVerified(false)}
                title="Anda Sudah Diverifikasi"
                message="Pos Mitra telah memverifikasi QR Anda. Menunggu mitra memulai perjalanan."
            />
        </CustomerLayout>
    );
}