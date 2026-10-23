import React, { useState, useRef } from "react";
import MitraLayout from "../../components/dashboard/MitraLayout";
import CameraCapture from "../../components/verification/CameraCapture";
import { ChevronRight, ChevronLeft, UploadCloud, CheckCircle2, Camera, FileText, UserCheck, Trash2, Loader2, ShieldCheck, BadgeCheck, Car, Plus, Bike, Package } from "lucide-react";

// Konfigurasi kamera untuk masing-masing step foto data diri (biometrik)
const CAMERA_CONFIG = {
	face: { facingMode: "user", guide: "face", title: "Foto Wajah", description: "Posisikan wajah di dalam bingkai, pastikan pencahayaan cukup." },
	ktp: { facingMode: "environment", guide: "card", title: "Foto KTP", description: "Letakkan KTP rata di dalam bingkai, hindari pantulan cahaya." },
	selfie: { facingMode: "user", guide: "face_card", title: "Selfie dengan KTP", description: "Pegang KTP di bawah dagu, pastikan wajah & KTP terlihat jelas." },
	sim: { facingMode: "environment", guide: "card", title: "Foto SIM", description: "Letakkan SIM rata di dalam bingkai, hindari pantulan cahaya." },
	skck: { facingMode: "environment", guide: "none", title: "Foto SKCK", description: "Pastikan seluruh halaman SKCK terlihat jelas dan tidak terpotong." },
};

const getMaxBirthDate = () => {
	const today = new Date();
	today.setFullYear(today.getFullYear() - 17);
	return today.toISOString().split("T")[0];
};

export default function Verification() {
	const [step, setStep] = useState(1);

	const [files, setFiles] = useState({
		face: null,
		ktp: null,
		selfie: null,
		sim: null,
		skck: null,
	});
	const [cameraTarget, setCameraTarget] = useState(null); // "face" | "ktp" | "selfie" | null

	const [form, setForm] = useState({
		full_name: "",
		nik: "",
		birth_place: "",
		birth_date: "",
		gender: "",
		address: "",
		province: "",
		city: "",
	});

	const [loading, setLoading] = useState(false);

	// Data kendaraan yang didaftarkan mitra (bisa lebih dari 1: motor, mobil, barang)
	const [vehicles, setVehicles] = useState([]);
	const [vehicleForm, setVehicleForm] = useState({
		type: "mobil",
		brand: "",
		model: "",
		plate_number: "",
		color: "",
		seat_capacity: "",
	});
	const [vehicleError, setVehicleError] = useState("");

	const handleVehicleInput = (e) => {
		setVehicleForm({
			...vehicleForm,
			[e.target.name]: e.target.value,
		});
	};

	const addVehicle = () => {
		if (!vehicleForm.brand || !vehicleForm.plate_number) {
			setVehicleError("Merk dan plat nomor wajib diisi.");
			return;
		}

		if (vehicleForm.type === "mobil" && !vehicleForm.seat_capacity) {
			setVehicleError("Kapasitas maksimal penumpang wajib diisi untuk mobil.");
			return;
		}

		setVehicles((prev) => [...prev, { ...vehicleForm }]);

		setVehicleForm({
			type: "mobil",
			brand: "",
			model: "",
			plate_number: "",
			color: "",
			seat_capacity: "",
		});
		setVehicleError("");
	};

	const removeVehicle = (index) => {
		setVehicles((prev) => prev.filter((_, i) => i !== index));
	};

	const vehicleTypeIcon = { motor: Bike, mobil: Car, barang: Package };
	const vehicleTypeLabel = { motor: "Motor", mobil: "Mobil", barang: "Barang" };

	// refs galeri device (dipakai sebagai opsi tambahan selain kamera)
	const ktpGalleryInputRef = useRef(null);
	const simInputRef = useRef(null);
	const skckInputRef = useRef(null);

	const handleFileChange = (e, type) => {
		const file = e.target.files[0];

		if (file) {
			setFiles((prev) => ({
				...prev,
				[type]: file,
			}));
		}
	};

	const handleCameraCapture = (file) => {
		if (!cameraTarget) return;
		setFiles((prev) => ({ ...prev, [cameraTarget]: file }));
		setCameraTarget(null);
	};

	const removeFile = (type) => {
		setFiles((prev) => ({
			...prev,
			[type]: null,
		}));
	};

	const handleInput = (e) => {
		const { name, value } = e.target;

		if (name === "nik") {
			const numericValue = value.replace(/\D/g, "");
			if (numericValue.length <= 16) {
				setForm((prev) => ({ ...prev, nik: numericValue }));
			}
			return;
		}

		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const preview = (file) => (file ? URL.createObjectURL(file) : null);

	const handleSubmit = async () => {
		setLoading(true);

		try {
			const token = localStorage.getItem("token");

			const formData = new FormData();

			// =========================
			// TYPE
			// =========================
			formData.append("type", "mitra");

			// =========================
			// DATA DIRI
			// =========================
			formData.append("full_name", form.full_name);
			formData.append("nik", form.nik);
			formData.append("birth_place", form.birth_place);
			formData.append("birth_date", form.birth_date);
			formData.append("gender", form.gender);
			formData.append("address", form.address);
			formData.append("province", form.province);
			formData.append("city", form.city);

			// =========================
			// FILES
			// =========================
			formData.append("face", files.face);
			formData.append("ktp", files.ktp);
			formData.append("selfie_ktp", files.selfie);

			formData.append("sim", files.sim);
			formData.append("skck", files.skck);

			const res = await fetch("http://127.0.0.1:8000/api/verification", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
				body: formData,
			});

			let data;
			try {
				data = await res.json();
			} catch {
				// Server balas HTML (mis. halaman error PHP), bukan JSON.
				throw new Error(`Server error (status ${res.status}). Cek log Laravel untuk detail penyebabnya.`);
			}

			if (!res.ok) {
				throw new Error(data.message || "Gagal verifikasi");
			}

			// Kirim data kendaraan satu per satu setelah verifikasi utama berhasil
			for (const v of vehicles) {
				try {
					await fetch("http://127.0.0.1:8000/api/mitra/vehicles", {
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify(v),
					});
				} catch (vErr) {
					console.error("Gagal simpan kendaraan:", vErr);
				}
			}

			alert("Verifikasi mitra berhasil dikirim!");

			window.location.href = "/mitra/dashboard";
		} catch (err) {
			console.error(err);

			alert(err.message || "Terjadi kesalahan");
		} finally {
			setLoading(false);
		}
	};

	const steps = [
		{ id: 1, title: "Data Diri", icon: UserCheck },
		{ id: 2, title: "Foto KTP", icon: FileText },
		{ id: 3, title: "Foto Wajah", icon: Camera },
		{ id: 4, title: "Selfie KTP & Wajah", icon: UserCheck },
		{ id: 5, title: "Foto SIM", icon: BadgeCheck },
		{ id: 6, title: "SKCK", icon: ShieldCheck },
		{ id: 7, title: "Kendaraan", icon: Car },
		{ id: 8, title: "Konfirmasi", icon: CheckCircle2 },
	];

	return (
		<MitraLayout>
			<div className="max-w-3xl mx-auto py-12 px-4">
				{/* HEADER */}
				<div className="text-center mb-10">
					<h2 className="text-3xl font-black text-indigo-900 mb-2">Verifikasi Mitra</h2>

					<p className="text-gray-500">Lengkapi data dan dokumen berikut untuk menjadi mitra terverifikasi Nebeng.</p>
				</div>

				{/* STEPS */}
				<div className="flex items-center justify-between mb-12 relative overflow-x-auto gap-3">
					<div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>

					{steps.map((s) => (
						<div key={s.id} className="relative z-10 flex flex-col items-center min-w-fit">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${step >= s.id ? "bg-indigo-600 border-indigo-100 text-white scale-110" : "bg-white border-gray-100 text-gray-300"}`}
							>
								<s.icon size={18} />
							</div>

							<span className={`text-[10px] font-bold uppercase mt-2 tracking-wider ${step >= s.id ? "text-indigo-600" : "text-gray-300"}`}>{s.title}</span>
						</div>
					))}
				</div>

				{/* CARD */}
				<div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-indigo-900/5 border border-indigo-50 relative overflow-hidden">
					{/* STEP 1 */}
					{step === 1 && (
						<div className="animate-in fade-in duration-300">
							<h3 className="text-2xl font-black text-gray-800 mb-2 text-center">Data Sesuai KTP</h3>

							<p className="text-sm text-gray-400 text-center mb-8">Pastikan seluruh data sesuai identitas resmi.</p>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<InputField label="Nama Lengkap" name="full_name" value={form.full_name} onChange={handleInput} />

								<InputField label="NIK" name="nik" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={16} value={form.nik} onChange={handleInput} />

								<InputField label="Tempat Lahir" name="birth_place" value={form.birth_place} onChange={handleInput} />

								<InputField label="Tanggal Lahir" type="date" name="birth_date" max={getMaxBirthDate()} value={form.birth_date} onChange={handleInput} />

								<SelectField label="Jenis Kelamin" name="gender" value={form.gender} onChange={handleInput} options={["Laki-laki", "Perempuan"]} />

								<div className="md:col-span-2">
									<InputField label="Alamat Lengkap" name="address" value={form.address} onChange={handleInput} />
								</div>

								<InputField label="Provinsi" name="province" value={form.province} onChange={handleInput} />

								<InputField label="Kota / Kabupaten" name="city" value={form.city} onChange={handleInput} />

							</div>

							<button onClick={() => setStep(2)} className="w-full mt-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg">
								Lanjut Upload Dokumen
							</button>
						</div>
					)}

					{/* FOTO KTP */}
					{step === 2 && (
						<UploadStep
							title="Foto KTP"
							desc="Pastikan seluruh bagian KTP terlihat jelas."
							file={files.ktp}
							onUpload={() => setCameraTarget("ktp")}
							onRemove={() => removeFile("ktp")}
							onNext={() => setStep(3)}
							onBack={() => setStep(1)}
							allowGallery
							galleryInputRef={ktpGalleryInputRef}
							onGalleryChange={(e) => handleFileChange(e, "ktp")}
						/>
					)}

					{/* FOTO WAJAH */}
					{step === 3 && (
						<UploadStep
							title="Foto Wajah"
							desc="Pastikan wajah terlihat jelas tanpa masker atau kacamata hitam."
							file={files.face}
							onUpload={() => setCameraTarget("face")}
							onRemove={() => removeFile("face")}
							onNext={() => setStep(4)}
							onBack={() => setStep(2)}
						/>
					)}

					{/* SELFIE */}
					{step === 4 && (
						<UploadStep
							title="Selfie dengan KTP"
							desc="Pegang KTP di bawah dagu dan pastikan tidak blur."
							file={files.selfie}
							onUpload={() => setCameraTarget("selfie")}
							onRemove={() => removeFile("selfie")}
							onNext={() => setStep(5)}
							onBack={() => setStep(3)}
						/>
					)}

					{/* SIM */}
					{step === 5 && (
						<UploadStep
							title="Upload Foto SIM"
							desc="Upload SIM aktif sesuai kendaraan yang digunakan."
							file={files.sim}
							onUpload={() => setCameraTarget("sim")}
							onRemove={() => removeFile("sim")}
							onNext={() => setStep(6)}
							onBack={() => setStep(4)}
							allowGallery
							galleryInputRef={simInputRef}
							onGalleryChange={(e) => handleFileChange(e, "sim")}
						/>
					)}

					{/* SKCK */}
					{step === 6 && (
						<UploadStep
							title="Upload SKCK"
							desc="Pastikan SKCK masih berlaku dan data terlihat jelas."
							file={files.skck}
							onUpload={() => setCameraTarget("skck")}
							onRemove={() => removeFile("skck")}
							onNext={() => setStep(7)}
							onBack={() => setStep(5)}
							allowGallery
							galleryInputRef={skckInputRef}
							onGalleryChange={(e) => handleFileChange(e, "skck")}
						/>
					)}

					{/* DATA KENDARAAN */}
					{step === 7 && (
						<div className="animate-in fade-in duration-300">
							<h3 className="text-2xl font-black text-gray-800 mb-2 text-center">Data Kendaraan</h3>

							<p className="text-sm text-gray-400 text-center mb-8">Daftarkan minimal 1 kendaraan yang akan kamu gunakan sebagai mitra.</p>

							{/* DAFTAR KENDARAAN YANG SUDAH DITAMBAHKAN */}
							{vehicles.length > 0 && (
								<div className="space-y-3 mb-8">
									{vehicles.map((v, i) => {
										const Icon = vehicleTypeIcon[v.type];
										return (
											<div key={i} className="flex items-center gap-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
												<div className="w-12 h-12 rounded-xl bg-indigo-900 text-white flex items-center justify-center shrink-0">
													<Icon size={22} />
												</div>
												<div className="flex-1 min-w-0">
													<p className="font-black text-gray-800 text-sm truncate">
														{vehicleTypeLabel[v.type]} • {v.brand} {v.model}
													</p>
													<p className="text-xs text-gray-400 font-medium truncate">
														{v.plate_number} {v.color ? `• ${v.color}` : ""} {v.type === "mobil" ? `• Maks. ${v.seat_capacity} penumpang` : ""}
													</p>
												</div>
												<button onClick={() => removeVehicle(i)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all shrink-0">
													<Trash2 size={16} />
												</button>
											</div>
										);
									})}
								</div>
							)}

							{/* FORM TAMBAH KENDARAAN */}
							<div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
								<SelectField
									label="Jenis Kendaraan"
									name="type"
									value={vehicleForm.type}
									onChange={handleVehicleInput}
									options={["motor", "mobil", "barang"]}
								/>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<InputField label="Merk (contoh: Toyota, Honda)" name="brand" value={vehicleForm.brand} onChange={handleVehicleInput} />
									<InputField label="Model / Tipe" name="model" value={vehicleForm.model} onChange={handleVehicleInput} />
									<InputField label="Plat Nomor" name="plate_number" value={vehicleForm.plate_number} onChange={handleVehicleInput} />
									<InputField label="Warna" name="color" value={vehicleForm.color} onChange={handleVehicleInput} />

									{vehicleForm.type === "mobil" && (
										<div className="md:col-span-2">
											<InputField label="Kapasitas Maksimal Penumpang" name="seat_capacity" type="number" min={1} value={vehicleForm.seat_capacity} onChange={handleVehicleInput} />
											<p className="text-[11px] text-gray-400 mt-1.5 px-1">
												Murni jumlah <span className="font-bold">penumpang</span> (tidak termasuk kamu sebagai supir). Angka ini akan jadi batas jumlah penumpang saat kamu membuat tebengan mobil nanti — persis sama seperti yang kamu isi di sini.
											</p>
										</div>
									)}
								</div>

								{vehicleError && <p className="text-xs font-bold text-red-500">{vehicleError}</p>}

								<button type="button" onClick={addVehicle} className="w-full py-3.5 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-200 transition-all">
									<Plus size={18} /> Tambah Kendaraan Ini
								</button>
							</div>

							<div className="flex items-center gap-4 mt-10">
								<button onClick={() => setStep(6)} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-all">
									Kembali
								</button>

								<button
									onClick={() => setStep(8)}
									disabled={vehicles.length === 0}
									className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
								>
									Lanjut <ChevronRight size={20} />
								</button>
							</div>
						</div>
					)}

					{/* KONFIRMASI */}
					{step === 8 && (
						<div className="animate-in fade-in zoom-in duration-300">
							<h3 className="text-xl font-bold text-gray-800 text-center mb-6">Periksa Kembali Dokumen Anda</h3>

							<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
								<ReviewCard label="Foto Wajah" img={preview(files.face)} />

								<ReviewCard label="Foto KTP" img={preview(files.ktp)} />

								<ReviewCard label="Selfie KTP" img={preview(files.selfie)} />

								<ReviewCard label="SIM" img={preview(files.sim)} />

								<ReviewCard label="SKCK" img={preview(files.skck)} />
							</div>

							{vehicles.length > 0 && (
								<div className="mb-8">
									<p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Kendaraan Terdaftar</p>
									<div className="space-y-2">
										{vehicles.map((v, i) => (
											<div key={i} className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100">
												<span className="text-sm font-black text-gray-700">
													{vehicleTypeLabel[v.type]} • {v.brand} {v.model} • {v.plate_number}
												</span>
												{v.type === "mobil" && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">Maks. {v.seat_capacity} Kursi</span>}
											</div>
										))}
									</div>
								</div>
							)}

							<div className="flex items-center gap-4">
								<button onClick={() => setStep(7)} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
									<ChevronLeft size={20} /> Kembali
								</button>

								<button
									onClick={handleSubmit}
									disabled={loading}
									className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
								>
									{loading ? <Loader2 className="animate-spin" /> : "Kirim Sekarang"}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			<CameraCapture
				open={!!cameraTarget}
				onClose={() => setCameraTarget(null)}
				onCapture={handleCameraCapture}
				facingMode={cameraTarget ? CAMERA_CONFIG[cameraTarget].facingMode : "user"}
				guide={cameraTarget ? CAMERA_CONFIG[cameraTarget].guide : "none"}
				title={cameraTarget ? CAMERA_CONFIG[cameraTarget].title : ""}
				description={cameraTarget ? CAMERA_CONFIG[cameraTarget].description : ""}
				watermarkText="Verifikasi Mitra Nebeng"
			/>
		</MitraLayout>
	);
}

// ================= SUB COMPONENTS =================

function UploadStep({ title, desc, file, onUpload, onRemove, onNext, onBack, allowGallery = false, galleryInputRef, onGalleryChange }) {
	return (
		<div className="animate-in slide-in-from-right-8 duration-300 text-center">
			<h3 className="text-xl font-black text-gray-800 mb-2">{title}</h3>

			<p className="text-sm text-gray-400 mb-8">{desc}</p>

			<div
				onClick={!file ? onUpload : undefined}
				className={`relative border-2 border-dashed rounded-[2rem] transition-all cursor-pointer overflow-hidden group ${
					file ? "border-indigo-600 h-64" : "border-gray-200 hover:border-indigo-400 h-64 flex flex-col items-center justify-center bg-gray-50"
				}`}
			>
				{file ? (
					<>
						<img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />

						<button
							onClick={(e) => {
								e.stopPropagation();
								onRemove();
							}}
							className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-all"
						>
							<Trash2 size={16} />
						</button>
					</>
				) : (
					<>
						<div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
							<Camera size={32} />
						</div>

						<p className="text-sm font-bold text-gray-500">Ketuk untuk buka kamera</p>

						<p className="text-[10px] text-gray-400 mt-1">Foto langsung dari kamera, bukan galeri</p>
					</>
				)}
			</div>

			{/* Opsi tambahan: pilih foto dari galeri device (hanya untuk step yang mengizinkan) */}
			{allowGallery && !file && (
				<>
					<button
						type="button"
						onClick={() => galleryInputRef.current.click()}
						className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2 flex items-center justify-center gap-1.5 mx-auto"
					>
						<UploadCloud size={14} /> atau pilih dari galeri
					</button>
					<input type="file" ref={galleryInputRef} onChange={onGalleryChange} className="hidden" accept="image/*" />
				</>
			)}

			<div className="flex items-center gap-4 mt-10">
				{onBack && (
					<button onClick={onBack} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-all">
						Kembali
					</button>
				)}

				<button
					onClick={onNext}
					disabled={!file}
					className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
				>
					Lanjut <ChevronRight size={20} />
				</button>
			</div>
		</div>
	);
}

function ReviewCard({ label, img }) {
	return (
		<div className="bg-gray-50 p-2 rounded-2xl border border-gray-100">
			<img src={img} className="w-full h-32 object-cover rounded-xl mb-2" alt="Review" />

			<p className="text-[10px] font-black text-gray-400 uppercase text-center tracking-widest">{label}</p>
		</div>
	);
}

function InputField({ label, name, value, onChange, type = "text", maxLength, inputMode, pattern, max, min }) {
	return (
		<div className="space-y-2">
			<label className="text-xs font-black text-gray-500 uppercase tracking-wider">{label}</label>

			<input
				type={type}
				name={name}
				value={value}
				onChange={onChange}
				maxLength={maxLength}
				inputMode={inputMode}
				pattern={pattern}
				max={max}
				min={min}
				className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 font-semibold"
			/>
		</div>
	);
}

function SelectField({ label, name, value, onChange, options = [] }) {
	return (
		<div className="space-y-2">
			<label className="text-xs font-black text-gray-500 uppercase tracking-wider">{label}</label>

			<select name={name} value={value} onChange={onChange} className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 font-semibold">
				<option value="">Pilih</option>

				{options.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</div>
	);
}