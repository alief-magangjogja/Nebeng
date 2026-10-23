import React, { useState, useEffect, useRef } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import PickupPointCombobox from "../../components/ui/PickupPointCombobox";
import { ChevronLeft, MapPin, Calendar, Clock, ArrowRight, Navigation, X, CheckCircle2, Briefcase, ChevronDown } from "lucide-react";
import { getMinDateValue, getMinTimeValue, validateDepartureSchedule } from "../../utils/scheduleValidation";

export default function NebengBarang() {
	const navigate = useAppNavigate();

	// ================= STATE =================
	const [date, setDate] = useState("");
	const [time, setTime] = useState("");
	const [baggageCapacity, setBaggageCapacity] = useState("");
	const [showBaggageModal, setShowBaggageModal] = useState(false);
	const [selectedVehicleId, setSelectedVehicleId] = useState("");

	const [pickupPoints, setPickupPoints] = useState([]);
	const [loadingPoints, setLoadingPoints] = useState(true);

	const [selectedOrigin, setSelectedOrigin] = useState(null);
	const [selectedDestination, setSelectedDestination] = useState(null);

	const [showOriginDropdown, setShowOriginDropdown] = useState(false);
	const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
	const originRef = useRef(null);
	const destinationRef = useRef(null);

	// ================= DATA OPTIONS =================
	const baggageOptions = [
		{ id: "XS", label: "XS - Maksimal 0.5 Kg" },
		{ id: "S", label: "S - Maksimal 1 Kg" },
		{ id: "M", label: "M - Maksimal 5 Kg" },
		{ id: "L", label: "L - Maksimal 10 Kg" },
		{ id: "XL", label: "XL - Maksimal 15 Kg" },
	];

	// type kendaraan (dari data kendaraan mitra) -> format vehicle_type yang
	// dipakai sistem harga & tampilan (sudah dipakai luas di banyak tempat).
	const typeToVehicleTypeString = {
		motor: "Barang-Motor",
		mobil: "Barang-Mobil",
		barang: "Barang-Bus",
	};

	const typeLabel = { motor: "Motor", mobil: "Mobil", barang: "Kendaraan Barang / Truk" };

	// Kendaraan yang benar-benar terdaftar & disetujui admin - mitra pilih
	// kendaraan SPESIFIK (merk, plat), bukan cuma kategori umum. Penting
	// kalau mitra punya lebih dari 1 kendaraan.
	const [myVehicles, setMyVehicles] = useState([]);
	const [loadingVehicles, setLoadingVehicles] = useState(true);

	useEffect(() => {
		const fetchMyVehicles = async () => {
			try {
				const token = localStorage.getItem("token");

				const res = await fetch("http://127.0.0.1:8000/api/mitra/vehicles", {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				if (res.ok) {
					const data = await res.json();
					setMyVehicles(data);
				}
			} catch (err) {
				console.error("Gagal ambil kendaraan terdaftar:", err);
			} finally {
				setLoadingVehicles(false);
			}
		};

		fetchMyVehicles();
	}, []);

	const approvedVehicles = myVehicles.filter((v) => v.status === "approved");
	const hasPendingVehicle = myVehicles.some((v) => v.status === "pending");

	const selectedVehicle = approvedVehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null;
	const vehicleType = selectedVehicle ? typeToVehicleTypeString[selectedVehicle.type] : "";

	const filteredBaggageOptions = baggageOptions.filter((option) => {
		if (vehicleType === "Barang-Motor") {
			return ["XS", "S", "M"].includes(option.id);
		}

		if (vehicleType === "Barang-Mobil") {
			return ["XS", "S", "M", "L", "XL"].includes(option.id);
		}

		if (vehicleType === "Barang-Bus") {
			// kendaraan barang (truk, pickup box, dll) - kapasitas paling besar
			return true;
		}

		return true;
	});

	useEffect(() => {
		const fetchPickupPoints = async () => {
			try {
				const res = await fetch("http://127.0.0.1:8000/api/pickup-points");
				const data = await res.json();
				setPickupPoints(data);
			} catch (err) {
				console.error(err);
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

	// ================= LOKASI (DROPDOWN CUSTOM, KLIK SAJA - TIDAK BISA KETIK) =================
	// Dropdown custom (bukan <select> bawaan) supaya tiap pos bisa menampilkan
	// alamat spesifiknya (contoh: "Stasiun Tugu Yogyakarta") di bawah nama
	// posnya. Mitra tetap hanya bisa memilih dari daftar, tidak bisa mengetik.

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

	// Dihitung ulang setiap render supaya selalu mengacu ke waktu terkini.
	const scheduleCheck = date && time ? validateDepartureSchedule(date, time) : { valid: true };
	const scheduleError = date && time && !scheduleCheck.valid ? scheduleCheck.message : null;

	// ================= LOGIKA =================
	const handleNext = () => {
		if (!selectedOrigin || !selectedDestination || !date || !time || !baggageCapacity || !selectedVehicle) {
			alert("Mohon lengkapi semua data pengiriman barang, termasuk kendaraan yang dipakai");
			return;
		}

		const scheduleCheck = validateDepartureSchedule(date, time);
		if (!scheduleCheck.valid) {
			alert(scheduleCheck.message);
			return;
		}

		const tripData = {
			origin_point_id: selectedOrigin.id,
			destination_point_id: selectedDestination.id,

			origin_city: selectedOrigin.city,
			origin_address: selectedOrigin.address,

			destination_city: selectedDestination.city,
			destination_address: selectedDestination.address,

			departure_date: date,
			departure_time: time,

			seat_total: 1,
			seat_available: 1,

			tebengan_type: "Barang",
			baggage_capacity: baggageCapacity,

			vehicle_type: vehicleType,
			mitra_vehicle_id: selectedVehicle.id,
			vehicle_plate: selectedVehicle.plate_number,
			vehicle_brand: selectedVehicle.brand,
			vehicle_model: selectedVehicle.model,
			vehicle_color: selectedVehicle.color,
			// price: 20000, // sementara
		};

		navigate("/mitra/konfirmasi-tebengan", {
			state: { tripData },
		});
	};

	const selectedBaggageLabel = filteredBaggageOptions.find((opt) => opt.id === baggageCapacity)?.label || "Pilih Kapasitas Maksimal";

	return (
		<MitraLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-32">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Tambah Nebeng Barang</h1>
				</div>

				<div className="max-w-2xl mx-auto space-y-6">
					{/* CARD RUTE (Asal & Tujuan) */}
					<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative">
						<div className="relative space-y-10">
							<div className="absolute left-[19px] top-[40px] bottom-[40px] w-[2px] bg-dashed bg-gray-100"></div>

							<div className="flex items-center gap-4 relative z-11">
								<div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-100">
									<Navigation size={20} className="transform rotate-45" />
								</div>
								<div ref={originRef} className="flex-1 border-b border-gray-100 relative">
									<PickupPointCombobox
										label="Lokasi Jemput Barang"
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

							<div className="flex items-center gap-4 relative z-10">
								<div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-100">
									<MapPin size={20} />
								</div>
								<div ref={destinationRef} className="flex-1 border-b border-gray-100 relative">
									<PickupPointCombobox
										label="Lokasi Antar Barang"
										placeholder="Pilih titik antar"
										loadingPlaceholder="Memuat titik antar..."
										points={pickupPoints}
										loading={loadingPoints}
										value={selectedDestination}
										onChange={handleSelectDestination}
										excludeId={selectedOrigin?.id}
									/>
								</div>
							</div>
						</div>
					</div>

					{/* TANGGAL & JAM */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4 group cursor-pointer hover:bg-gray-50 transition-all">
							<div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center shrink-0">
								<Calendar size={24} />
							</div>
							<div className="flex-1">
								<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Pengiriman</p>
								<input
									type="date"
									value={date}
									min={getMinDateValue()}
									onChange={(e) => {
										setDate(e.target.value);
										const minTime = getMinTimeValue(e.target.value);
										if (minTime && time && time < minTime) {
											setTime("");
										}
									}}
									className="bg-transparent font-black text-indigo-900 outline-none w-full"
								/>
							</div>
						</div>
						<div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4 group cursor-pointer hover:bg-gray-50 transition-all">
							<div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center shrink-0">
								<Clock size={24} />
							</div>
							<div className="flex-1">
								<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimasi Jam</p>
								<input
									type="time"
									value={time}
									min={getMinTimeValue(date)}
									onChange={(e) => setTime(e.target.value)}
									className="bg-transparent font-black text-indigo-900 outline-none w-full"
								/>
							</div>
						</div>
					</div>

					{scheduleError && (
						<p className="text-xs font-bold text-red-500 -mt-2 px-2">{scheduleError}</p>
					)}

					{/* PILIH KENDARAAN SPESIFIK */}
					<div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-3">
						<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PILIH KENDARAAN</label>

						<select
							value={selectedVehicleId}
							onChange={(e) => {
								setSelectedVehicleId(e.target.value);
								setBaggageCapacity("");
							}}
							disabled={loadingVehicles || approvedVehicles.length === 0}
							className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none disabled:opacity-50"
						>
							<option value="">{loadingVehicles ? "Memuat kendaraan..." : "Pilih kendaraan yang dipakai"}</option>

							{approvedVehicles.map((v) => (
								<option key={v.id} value={v.id}>
									{typeLabel[v.type]} • {v.brand} {v.model} • {v.plate_number} {v.color ? `• ${v.color}` : ""}
								</option>
							))}
						</select>

						{!loadingVehicles && approvedVehicles.length === 0 ? (
							<p className="text-xs font-bold text-amber-600">
								{hasPendingVehicle ? "Kendaraan kamu masih menunggu persetujuan admin. Cek statusnya di menu Profil > Kendaraan." : "Kamu belum mendaftarkan kendaraan. Lengkapi dulu di menu Profil > Kendaraan."}
							</p>
						) : (
							<p className="text-xs text-gray-400">Hanya menampilkan kendaraan yang sudah disetujui admin.</p>
						)}
					</div>

					{/* INPUT KAPASITAS BAGASI (Langsung Tampil) */}
					<div className="space-y-4 animate-in fade-in duration-500">
						<button onClick={() => setShowBaggageModal(true)} className="w-full bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between group hover:bg-gray-50 transition-all text-left shadow-sm">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
									<Briefcase size={24} />
								</div>
								<div>
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KAPASITAS BAGASI TERSEDIA</p>
									<p className="font-black text-indigo-900 text-lg leading-none mt-1">{selectedBaggageLabel}</p>
								</div>
							</div>
							<ChevronDown className="text-gray-300 group-hover:translate-y-0.5 transition-transform" />
						</button>
					</div>

					{/* SUBMIT BUTTON */}
					<button
						onClick={handleNext}
						disabled={!selectedOrigin || !selectedDestination || !date || !time || !baggageCapacity || !selectedVehicle || !!scheduleError}
						className="w-full bg-indigo-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-900"
					>
						Selanjutnya <ArrowRight size={24} />
					</button>
				</div>
			</div>

			{/* MODAL KAPASITAS BAGASI */}
			{showBaggageModal && (
				<div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
					<div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowBaggageModal(false)}></div>

					<div className="relative bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
						<div className="w-16 h-1 bg-gray-200 rounded-full mx-auto mb-8"></div>

						<div className="flex justify-between items-center mb-8">
							<h3 className="text-2xl font-black text-indigo-900">Pilih Kapasitas Bagasi</h3>

							<button onClick={() => setShowBaggageModal(false)} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-900 transition-colors">
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4">
							{filteredBaggageOptions.map((opt) => (
								<button
									key={opt.id}
									onClick={() => {
										setBaggageCapacity(opt.id);
										setShowBaggageModal(false);
									}}
									className={`w-full flex items-center gap-5 p-6 rounded-[24px] transition-all border ${
										baggageCapacity === opt.id ? "bg-indigo-900 text-white border-indigo-900 shadow-lg" : "bg-gray-50 border-gray-100 text-indigo-900 hover:bg-indigo-50"
									}`}
								>
									<div className={`p-3 rounded-xl ${baggageCapacity === opt.id ? "bg-white/10 text-white" : "bg-indigo-900 text-white"}`}>
										<Briefcase size={24} />
									</div>

									<span className="font-black text-lg flex-1 text-left leading-none">{opt.label}</span>

									{baggageCapacity === opt.id && <CheckCircle2 size={24} className="text-sky-300" />}
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</MitraLayout>
	);
}