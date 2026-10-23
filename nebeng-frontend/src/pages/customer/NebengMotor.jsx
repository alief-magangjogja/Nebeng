import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import PickupPointCombobox from "../../components/ui/PickupPointCombobox";
import { ChevronLeft, MapPin, Calendar, ArrowRight, Navigation, ChevronDown } from "lucide-react";

export default function NebengMotor() {
	const navigate = useNavigate();

	// ================= STATE =================

	const [date, setDate] = useState("");

	const [pickupPoints, setPickupPoints] = useState([]);
	const [loadingPoints, setLoadingPoints] = useState(true);

	const [selectedOrigin, setSelectedOrigin] = useState(null);
	const [selectedDestination, setSelectedDestination] = useState(null);

	const [showOriginDropdown, setShowOriginDropdown] = useState(false);
	const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

	const originRef = useRef(null);
	const destinationRef = useRef(null);

	// ================= HANDLE LOKASI (DROPDOWN, KLIK SAJA - TIDAK BISA KETIK) =================
	// Lokasi asal & tujuan sudah ditentukan per pos mitra. Dropdown custom
	// ini (bukan <select> bawaan) supaya tiap pos bisa menampilkan alamat
	// spesifiknya (contoh: "Stasiun Tugu Yogyakarta") di bawah nama posnya,
	// customer tetap hanya bisa memilih dari daftar, tidak bisa mengetik.

	const toggleOriginDropdown = () => {
		if (loadingPoints) return;
		setShowOriginDropdown((prev) => !prev);
		setShowDestinationDropdown(false);
	};

	const toggleDestinationDropdown = () => {
		if (loadingPoints) return;
		setShowDestinationDropdown((prev) => !prev);
		setShowOriginDropdown(false);
	};

	const handleSelectOrigin = (point) => {
	setSelectedOrigin(point);
	setShowOriginDropdown(false);
	if (selectedDestination?.id === point.id) {
		setSelectedDestination(null);
	}
};

	const handleSelectDestination = (point) => {
	setSelectedDestination(point);
	setShowDestinationDropdown(false);
	if (selectedOrigin?.id === point.id) {
		setSelectedOrigin(null);
	}
};

	// ================= HANDLE SEARCH =================

	const handleNext = () => {
		if (!selectedOrigin || !selectedDestination || !date) {
			alert("Mohon pilih lokasi awal, lokasi tujuan, dan tanggal keberangkatan");
			return;
		}

		navigate(`/customer/order-motor?origin_id=${selectedOrigin.id}&destination_id=${selectedDestination.id}&date=${date}`);
	};

	useEffect(() => {
		const fetchPickupPoints = async () => {
			try {
				const response = await fetch("http://127.0.0.1:8000/api/pickup-points");
				const data = await response.json();
				setPickupPoints(data);
			} catch (error) {
				console.error("Error fetching pickup points:", error);
			} finally {
				setLoadingPoints(false);
			}
		};

		const handleClickOutside = (event) => {
			if (originRef.current && !originRef.current.contains(event.target)) {
				setShowOriginDropdown(false);
			}

			if (destinationRef.current && !destinationRef.current.contains(event.target)) {
				setShowDestinationDropdown(false);
			}
		};

		fetchPickupPoints();
		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	return (
		<CustomerLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-32">
				{/* HEADER & BACK BUTTON */}
				<div className="flex items-center gap-4 mb-8">
					<Link to="/customer/dashboard">
						<button className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
							<ChevronLeft className="w-6 h-6 text-indigo-900" />
						</button>
					</Link>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Nebeng Motor</h1>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
					{/* SISI KIRI: Form Input Lokasi & Tanggal (7 Kolom) */}
					<div className="lg:col-span-7 space-y-6">
						<div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
							<div className="relative space-y-8">
								{/* Garis Penghubung antar Lokasi */}
								<div className="absolute left-[19px] top-[40px] bottom-[40px] w-[2px] bg-dashed bg-gray-100"></div>

								{/* Pilih Lokasi Awal */}
								<div className="flex items-start gap-4 relative z-10">
									<div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
										<Navigation size={20} className="text-white transform rotate-45" />
									</div>
									<div ref={originRef} className="flex-1 relative">
										<PickupPointCombobox
											label="Lokasi Awal"
											placeholder="Pilih titik jemput"
											loadingPlaceholder="Memuat titik jemput..."
											points={pickupPoints}
											loading={loadingPoints}
											value={selectedOrigin}
											onChange={handleSelectOrigin}
											excludeId={selectedDestination?.id}
										/>
									</div>
								</div>

								{/* Pilih Lokasi Tujuan */}
								<div className="flex items-start gap-4 relative z-9">
									<div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-100 shrink-0">
										<MapPin size={20} className="text-white" />
									</div>
									<div ref={destinationRef} className="flex-1 relative">
										<PickupPointCombobox
											label="Lokasi Tujuan"
											placeholder="Pilih titik tujuan"
											loadingPlaceholder="Memuat titik tujuan..."
											points={pickupPoints}
											loading={loadingPoints}
											value={selectedDestination}
											onChange={handleSelectDestination}
											excludeId={selectedOrigin?.id}
										/>
									</div>
								</div>
							</div>

							{/* Input Tanggal Keberangkatan */}
							<div className="mt-12 pt-8 border-t border-gray-50">
								<div className="flex items-center gap-4 bg-gray-50 p-6 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
									<div className="w-12 h-12 rounded-xl bg-indigo-900 flex items-center justify-center text-white shadow-lg">
										<Calendar size={24} />
									</div>

									<div className="flex-1">
										<p className="text-xs font-bold text-gray-400">TANGGAL KEBERANGKATAN</p>

										<input
											type="date"
											value={date}
											min={new Date().toISOString().split("T")[0]}
											onChange={(e) => setDate(e.target.value)}
											className="bg-transparent text-lg font-black text-indigo-900 outline-none"
										/>
									</div>

									<ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
								</div>
							</div>
						</div>

						{/* Button Selanjutnya */}
						<div className="pt-4">
							<button
								onClick={handleNext}
								className="w-full bg-indigo-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
							>
								Selanjutnya
								<ArrowRight size={24} />
							</button>
						</div>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}

// Sub-komponen Ikon pendukung
function ChevronRight({ className }) {
	return (
		<svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
		</svg>
	);
}