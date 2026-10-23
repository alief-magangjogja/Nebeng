import React, { useState, useEffect, useRef } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import PickupPointCombobox from "../../components/ui/PickupPointCombobox";
import { ChevronLeft, MapPin, Calendar, Clock, Users, ArrowRight, Navigation, X, CheckCircle2, Briefcase, ChevronDown } from "lucide-react";
import { getMinDateValue, getMinTimeValue, validateDepartureSchedule } from "../../utils/scheduleValidation";

export default function TambahNebeng() {
	const navigate = useAppNavigate();

	const [date, setDate] = useState("");
	const [pickupPoints, setPickupPoints] = useState([]);
	const [loadingPoints, setLoadingPoints] = useState(true);
	const [selectedOrigin, setSelectedOrigin] = useState(null);
	const [selectedDestination, setSelectedDestination] = useState(null);

	const [showOriginDropdown, setShowOriginDropdown] = useState(false);
	const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
	const originRef = useRef(null);
	const destinationRef = useRef(null);

	const [time, setTime] = useState("");
	const [tebenganType, setTebenganType] = useState("");
	const [seatCount, setSeatCount] = useState("");
	const [baggageCapacity, setBaggageCapacity] = useState("");
	const [showTypeModal, setShowTypeModal] = useState(false);
	const [showBaggageModal, setShowBaggageModal] = useState(false);

	// Daftar mobil mitra yang sudah disetujui admin - mitra pilih salah satu
	// kendaraan spesifik (bukan cuma kapasitas generik), penting kalau
	// mitra punya lebih dari 1 mobil.
	const [myCars, setMyCars] = useState([]);
	const [selectedVehicleId, setSelectedVehicleId] = useState("");
	const [loadingCapacity, setLoadingCapacity] = useState(true);

	const selectedVehicle = myCars.find((v) => String(v.id) === String(selectedVehicleId)) || null;
	const carCapacity = selectedVehicle?.seat_capacity || null;

	useEffect(() => {
		const fetchMyCars = async () => {
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
					const approvedCars = data.filter((v) => v.type === "mobil" && v.status === "approved");

					setMyCars(approvedCars);

					// auto-pilih kalau cuma ada 1 mobil, biar tidak ribet
					if (approvedCars.length === 1) {
						setSelectedVehicleId(String(approvedCars[0].id));
						setSeatCount(String(approvedCars[0].seat_capacity));
					}
				}
			} catch (err) {
				console.error("Gagal ambil daftar kendaraan:", err);
			} finally {
				setLoadingCapacity(false);
			}
		};

		fetchMyCars();
	}, []);

	const handleVehicleSelect = (e) => {
		const id = e.target.value;
		setSelectedVehicleId(id);

		const vehicle = myCars.find((v) => String(v.id) === id);
		if (vehicle) {
			setSeatCount(String(vehicle.seat_capacity));
		}
	};

	const typeOptions = [
		{ id: "penumpang", label: "Hanya Tebengan", desc: "Anda hanya menerima penumpang", icon: Users },
		{ id: "keduanya", label: "Barang dan Tebengan", desc: "Menerima penumpang dan paket", icon: Briefcase },
	];

	const baggageOptions = [
		{ id: "XS", label: "XS - Maksimal 0.5 Kg" },
		{ id: "S", label: "S - Maksimal 1 Kg" },
		{ id: "M", label: "M - Maksimal 5 Kg" },
		{ id: "L", label: "L - Maksimal 10 Kg" },
		{ id: "XL", label: "XL - Maksimal 15 Kg" },
	];

	const filteredBaggageOptions = baggageOptions.filter((option) => {
		// mobil hanya support sampai besar 15kg
		return ["XS", "S", "M", "L", "XL"].includes(option.id);
	});

	const selectedBaggageLabel = filteredBaggageOptions.find((opt) => opt.id === baggageCapacity)?.label || "Pilih Kapasitas";

	// Dihitung ulang setiap render supaya selalu mengacu ke waktu terkini.
	const scheduleCheck = date && time ? validateDepartureSchedule(date, time) : { valid: true };
	const scheduleError = date && time && !scheduleCheck.valid ? scheduleCheck.message : null;

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

	const handleNext = () => {
		if (!selectedOrigin || !selectedDestination || !date || !time || !tebenganType || !seatCount) {
			alert("Mohon lengkapi semua data perjalanan");
			return;
		}

		if (!selectedVehicle) {
			alert("Mohon pilih mobil yang akan digunakan untuk tebengan ini.");
			return;
		}

		if (carCapacity && parseInt(seatCount) > carCapacity) {
			alert(`Jumlah kursi tidak boleh melebihi kapasitas kendaraan terdaftar (maks. ${carCapacity} penumpang).`);
			return;
		}

		const scheduleCheck = validateDepartureSchedule(date, time);
		if (!scheduleCheck.valid) {
			alert(scheduleCheck.message);
			return;
		}

		if (tebenganType === "Barang dan Tebengan" && !baggageCapacity) {
			alert("Mohon pilih kapasitas bagasi");
			return;
		}

		const tripData = {
			origin_point_id: selectedOrigin.id,
			destination_point_id: selectedDestination.id,
			origin_city: selectedOrigin.city,
			destination_city: selectedDestination.city,
			origin_address: selectedOrigin.address,
			destination_address: selectedDestination.address,
			departure_date: date,
			departure_time: time,
			seat_total: parseInt(seatCount),
			seat_available: parseInt(seatCount),
			tebengan_type: tebenganType,
			baggage_capacity: baggageCapacity,
			vehicle_type: "mobil",
			mitra_vehicle_id: selectedVehicle.id,
			vehicle_plate: selectedVehicle.plate_number,
			vehicle_brand: selectedVehicle.brand,
			vehicle_model: selectedVehicle.model,
			vehicle_color: selectedVehicle.color,
			// price: 50000, //sementara
		};

		navigate("/mitra/konfirmasi-tebengan", { state: { tripData } });
	};

	useEffect(() => {
		const fetchPickupPoints = async () => {
			try {
				const res = await fetch("http://127.0.0.1:8000/api/pickup-points");
				setPickupPoints(await res.json());
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

	return (
		<MitraLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6 pb-32">
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Tambah Tebengan</h1>
				</div>

				<div className="max-w-2xl mx-auto space-y-6">
					<div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100 relative">
						<div className="relative space-y-10">
							<div className="absolute left-4.75 top-10 bottom-10 w-0.5 bg-dashed bg-gray-100"></div>
							<div className="flex items-center gap-4 relative z-10">
								<div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-100">
									<Navigation size={20} className="transform rotate-45" />
								</div>
								<div ref={originRef} className="flex-1 border-b border-gray-100 relative">
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
							<div className="flex items-center gap-4 relative z-9">
								<div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-100">
									<MapPin size={20} />
								</div>
								<div ref={destinationRef} className="flex-1 border-b border-gray-100 relative">
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
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
							<div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center shrink-0"><Calendar size={24} /></div>
							<div className="flex-1">
								<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</p>
								<input
									type="date"
									value={date}
									min={getMinDateValue()}
									onChange={(e) => {
										setDate(e.target.value);
										// reset jam kalau jam yang sudah dipilih jadi tidak valid lagi untuk tanggal baru
										const minTime = getMinTimeValue(e.target.value);
										if (minTime && time && time < minTime) {
											setTime("");
										}
									}}
									className="bg-transparent font-black text-indigo-900 outline-none w-full"
								/>
							</div>
						</div>
						<div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
							<div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center shrink-0"><Clock size={24} /></div>
							<div className="flex-1">
								<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jam</p>
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

					<button onClick={() => setShowTypeModal(true)} className="w-full bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between group hover:bg-gray-50 transition-all">
						<div className="flex items-center gap-4 text-left">
							<div className="w-12 h-12 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-lg shadow-indigo-100"><Users size={24} /></div>
							<div>
								<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">JENIS TEBENGAN</p>
								<p className="font-black text-indigo-900">{tebenganType || "Pilih Jenis Layanan"}</p>
							</div>
						</div>
						<ChevronDown className="text-gray-300 transition-transform group-hover:translate-y-0.5" />
					</button>

					{/* PILIH KENDARAAN SPESIFIK */}
					<div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-3">
						<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PILIH MOBIL</label>

						<select
							value={selectedVehicleId}
							onChange={handleVehicleSelect}
							disabled={loadingCapacity || myCars.length === 0}
							className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none disabled:opacity-50"
						>
							<option value="">{loadingCapacity ? "Memuat kendaraan..." : "Pilih mobil yang dipakai"}</option>

							{myCars.map((v) => (
								<option key={v.id} value={v.id}>
									{v.brand} {v.model} • {v.plate_number} {v.color ? `• ${v.color}` : ""} (Maks. {v.seat_capacity} penumpang)
								</option>
							))}
						</select>

						{!loadingCapacity && myCars.length === 0 && (
							<p className="text-xs font-bold text-amber-600">Kamu belum punya mobil yang disetujui admin. Tambahkan di menu Profil &gt; Kendaraan.</p>
						)}
					</div>

					{tebenganType && (
						<div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
							<div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
								<div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Users size={24} /></div>
								<div className="flex-1">
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">JUMLAH KURSI DITAWARKAN</p>
									<input
										type="number"
										placeholder="Contoh: 1"
										min={1}
										max={carCapacity || undefined}
										value={seatCount}
										disabled={!selectedVehicle}
										onChange={(e) => {
											const val = e.target.value;
											if (carCapacity && Number(val) > carCapacity) {
												setSeatCount(String(carCapacity));
												return;
											}
											setSeatCount(val);
										}}
										className="bg-transparent font-black text-indigo-900 outline-none w-full text-lg disabled:opacity-50"
									/>
									{!selectedVehicle ? (
										<p className="text-[10px] text-gray-400 mt-1">Pilih mobil dulu di atas untuk menentukan kapasitas.</p>
									) : (
										<p className="text-[10px] text-indigo-500 font-bold mt-1">Maks. {carCapacity} penumpang sesuai kendaraan yang dipilih</p>
									)}
								</div>
							</div>

							{tebenganType === "Barang dan Tebengan" && (
								<button onClick={() => setShowBaggageModal(true)} className="w-full bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between group hover:bg-gray-50 transition-all text-left">
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Briefcase size={24} /></div>
										<div>
											<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KAPASITAS BAGASI</p>
											<p className="font-black text-indigo-900">{selectedBaggageLabel}</p>
										</div>
									</div>
									<ChevronDown className="text-gray-300" />
								</button>
							)}
						</div>
					)}

					<button onClick={handleNext} disabled={!selectedOrigin || !selectedDestination || !date || !time || !tebenganType || !seatCount || !selectedVehicle || !!scheduleError} className="w-full bg-indigo-900 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-900">
						Selanjutnya <ArrowRight size={24} />
					</button>
				</div>
			</div>

			{showTypeModal && (
				<div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center p-4">
					<div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm" onClick={() => setShowTypeModal(false)}></div>
					<div className="relative bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
						<div className="w-16 h-1 bg-gray-200 rounded-full mx-auto mb-8"></div>
						<h3 className="text-2xl font-black text-indigo-900 mb-8">Pilih Tebengan</h3>
						<div className="space-y-4">
							{typeOptions.map((opt) => (
								<button key={opt.id} onClick={() => { setTebenganType(opt.label); setBaggageCapacity(""); setShowTypeModal(false); }} className={`w-full flex items-center gap-5 p-5 rounded-3xl transition-all border ${tebenganType === opt.label ? "bg-indigo-900 text-white border-indigo-900" : "bg-gray-50 border-gray-100"}`}>
									<div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tebenganType === opt.label ? "bg-white/10" : "bg-white shadow-sm"}`}><opt.icon size={28} /></div>
									<div className="text-left flex-1">
										<h4 className="font-black text-lg mb-1 leading-none">{opt.label}</h4>
										<p className={`text-xs ${tebenganType === opt.label ? "text-indigo-200" : "text-gray-400"} font-medium`}>{opt.desc}</p>
									</div>
									{tebenganType === opt.label && <CheckCircle2 size={24} className="text-sky-300" />}
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{showBaggageModal && (
				<div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center p-4">
					<div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm" onClick={() => setShowBaggageModal(false)}></div>
					<div className="relative bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
						<div className="w-16 h-1 bg-gray-200 rounded-full mx-auto mb-8"></div>
						<h3 className="text-2xl font-black text-indigo-900 mb-8">Pilih Kapasitas Bagasi</h3>
						<div className="space-y-4">
							{filteredBaggageOptions.map((opt) => (
								<button key={opt.id} onClick={() => { setBaggageCapacity(opt.id); setShowBaggageModal(false); }} className={`w-full flex items-center gap-5 p-6 rounded-3xl transition-all border ${baggageCapacity === opt.id ? "bg-indigo-900 text-white border-indigo-900" : "bg-gray-50 border-gray-100"}`}>
									<div className={`p-3 rounded-xl ${baggageCapacity === opt.id ? "bg-white/10 text-white" : "bg-indigo-900 text-white"}`}><Briefcase size={24} /></div>
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