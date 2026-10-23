import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import PickupPointCombobox from "../../components/ui/PickupPointCombobox";
import { ChevronLeft, MapPin, Calendar, Box, FileText, Camera, Navigation, ArrowRight, ChevronDown } from "lucide-react";

export default function NebengBarang() {
	const navigate = useNavigate();

	// ================= STATE =================

	const [date, setDate] = useState("");
	const [size, setSize] = useState("");
	const [description, setDescription] = useState("");

	const [pickupPoints, setPickupPoints] = useState([]);
	const [loadingPoints, setLoadingPoints] = useState(true);

	const [selectedOrigin, setSelectedOrigin] = useState(null);
	const [selectedDestination, setSelectedDestination] = useState(null);

	const [showOriginDropdown, setShowOriginDropdown] = useState(false);
	const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

	const originRef = useRef(null);
	const destinationRef = useRef(null);

	const [image, setImage] = useState(null);
	const [preview, setPreview] = useState(null);

	const [vehicleType, setVehicleType] = useState("");

	// ================= SIZE OPTIONS =================

	const sizeOptions = [
		{
			id: "XS",
			label: "XXS - Maksimal 0.5 Kg",
		},
		{
			id: "S",
			label: "XS - Maksimal 1 Kg",
		},
		{
			id: "M",
			label: "M - Maksimal 5 Kg",
		},
		{
			id: "L",
			label: "L - Maksimal 10 Kg",
		},
		{
			id: "XL",
			label: "XL - Maksimal 15 Kg",
		},
	];

	// ================= FILTER SIZE BERDASARKAN KENDARAAN =================

	const filteredSizeOptions = sizeOptions.filter((option) => {
		if (vehicleType === "Barang-Motor") {
			return ["XS", "S", "M"].includes(option.id);
		}

		if (vehicleType === "Barang-Mobil") {
			return ["XS", "S", "M", "L", "XL"].includes(option.id);
		}

		if (vehicleType === "Barang-Bus") {
			// kendaraan barang (truk, dll) - kapasitas paling besar
			return true;
		}

		return true;
	});

	// ================= FETCH PICKUP POINT =================

	useEffect(() => {
		const fetchPickupPoints = async () => {
			try {
				const res = await fetch("http://127.0.0.1:8000/api/pickup-points");
				const data = await res.json();
				setPickupPoints(data);
			} catch (err) {
				console.error("Error fetching pickup points", err);
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

	// ================= HANDLE LOKASI (DROPDOWN, KLIK SAJA - TIDAK BISA KETIK) =================
	// Lokasi jemput & antar barang sudah ditentukan per pos mitra. Dropdown
	// custom ini (bukan <select> bawaan) supaya tiap pos bisa menampilkan
	// alamat spesifiknya di bawah nama posnya, customer tetap hanya bisa
	// memilih dari daftar, tidak bisa mengetik.

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

	// ================= HANDLE NEXT =================

	const handleNext = () => {
		if (!selectedOrigin || !selectedDestination || !date || !size || !vehicleType) {
			alert("Mohon pilih lokasi dari daftar");
			return;
		}

		navigate(`/customer/order-barang?origin_id=${selectedOrigin?.id}&destination_id=${selectedDestination?.id}&date=${date}&size=${size}&vehicle_type=${vehicleType}&description=${encodeURIComponent(description)}`, {
			state: {
				image,
				preview,
			},
		});
	};

	// Handle image upload
	const handleImageUpload = (e) => {
		const file = e.target.files[0];

		if (!file) return;

		// validasi ukuran 5MB
		if (file.size > 5 * 1024 * 1024) {
			alert("Ukuran file maksimal 5MB");
			return;
		}

		// validasi format
		if (!["image/jpeg", "image/png"].includes(file.type)) {
			alert("Format harus JPG atau PNG");
			return;
		}

		setImage(file);

		const reader = new FileReader();
		reader.onloadend = () => {
			setPreview(reader.result);
		};

		reader.readAsDataURL(file);
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-32">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<Link to="/customer/dashboard">
						<button className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
							<ChevronLeft className="w-6 h-6 text-indigo-900" />
						</button>
					</Link>
					<div>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Nebeng Barang</h1>
						<p className="text-sm text-gray-500">Cari lokasi tujuan barang anda sekarang!</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
					{/* ================= LEFT SIDE ================= */}

					<div className="lg:col-span-7 space-y-6">
						{/* CARD RUTE */}
						<div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
							<div className="relative space-y-8">
								<div className="absolute left-[19px] top-[40px] bottom-[40px] w-[2px] border-dashed bg-gray-100"></div>

								{/* ORIGIN */}

								<div className="flex items-start gap-4 relative z-11">
									<div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
										<Navigation size={20} className="text-white transform rotate-45" />
									</div>

									<div ref={originRef} className="flex-1 relative">
										<PickupPointCombobox
											label="Lokasi Anda"
											placeholder="Pilih titik jemput barang"
											loadingPlaceholder="Memuat titik jemput..."
											points={pickupPoints}
											loading={loadingPoints}
											value={selectedOrigin}
											onChange={handleSelectOrigin}
											excludeId={selectedDestination?.id}
										/>
									</div>
								</div>

								{/* DESTINATION */}

								<div className="flex items-start gap-4 relative z-10">
									<div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-100 shrink-0">
										<MapPin size={20} className="text-white" />
									</div>

									<div ref={destinationRef} className="flex-1 relative">
										<PickupPointCombobox
											label="Lokasi Tujuan"
											placeholder="Pilih titik antar barang"
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

						{/* DETAIL BARANG */}

						<div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
							<h3 className="font-bold text-gray-800 flex items-center gap-2">
								<Box size={20} className="text-indigo-600" />
								Detail Informasi Barang
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label className="text-xs font-bold text-gray-500 uppercase">Tanggal Berangkat</label>

									<input
										type="date"
										value={date}
										min={new Date().toISOString().split("T")[0]}
										onChange={(e) => setDate(e.target.value)}
										className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm"
									/>
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold text-gray-500 uppercase">Jenis Kendaraan</label>

									<select
										value={vehicleType}
										onChange={(e) => {
											setVehicleType(e.target.value);
											setSize("");
										}}
										className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none"
									>
										<option value="">Pilih kendaraan</option>

										<option value="all">Semua Kendaraan</option>

										<option value="Barang-Motor">Motor</option>

										<option value="Barang-Mobil">Mobil</option>

										<option value="Barang-Bus">Kendaraan Barang (Truk, dll)</option>
									</select>
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold text-gray-500 uppercase">Ukuran Barang</label>

									<select
										value={size}
										onChange={(e) => setSize(e.target.value)}
										disabled={!vehicleType}
										className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
									>
										<option value="">{vehicleType ? "Pilih ukuran barang" : "Pilih kendaraan terlebih dahulu"}</option>

										{filteredSizeOptions.map((option) => (
											<option key={option.id} value={option.id}>
												{option.label}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-xs font-bold text-gray-500 uppercase">Keterangan Barang</label>

								<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contoh: Berisi dokumen penting" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm h-32 resize-none" />
							</div>
						</div>
					</div>

					{/* RIGHT SIDE */}

					<div className="lg:col-span-5 space-y-6">
						{/* CARD FOTO BARANG */}
						<div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
							<h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
								<Camera size={20} className="text-indigo-600" />
								Foto Barang
							</h3>

							<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="upload" />

							<label htmlFor="upload" className="cursor-pointer">
								<div className="border-2 border-dashed border-gray-100 rounded-3xl p-10 flex flex-col items-center justify-center text-center group hover:border-indigo-200 transition-colors cursor-pointer bg-gray-50/50">
									{preview ? (
										<img src={preview} alt="preview" className="w-40 h-40 object-cover rounded-2xl shadow-sm" />
									) : (
										<>
											<div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
												<Camera size={32} className="text-gray-300" />
											</div>

											<p className="text-sm font-bold text-gray-400">Klik untuk upload foto barang</p>

											<p className="text-[10px] text-gray-300 mt-1 uppercase font-bold tracking-widest">Format JPG, PNG (Max 5MB)</p>
										</>
									)}
								</div>
							</label>
						</div>

						<div className="bg-indigo-50 rounded-3xl p-8 border border-indigo-100">
							<div className="flex gap-4 mb-8">
								<div className="p-3 bg-white rounded-2xl shadow-sm h-fit">
									<FileText className="text-indigo-600" />
								</div>

								<div>
									<h4 className="font-bold text-indigo-900 text-sm">Informasi Penumpang</h4>

									<p className="text-xs text-indigo-400 mt-1">Pastikan data barang sudah benar sebelum melanjutkan.</p>
								</div>
							</div>

							<button onClick={handleNext} className="w-full bg-indigo-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-800 transition-all flex items-center justify-center gap-3">
								Selanjutnya
								<ArrowRight size={22} />
							</button>
						</div>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}