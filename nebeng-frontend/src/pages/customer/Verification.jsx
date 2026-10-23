import React, { useState, useRef, useEffect } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import CameraCapture from "../../components/verification/CameraCapture";
import { ChevronRight, ChevronLeft, CheckCircle2, Camera, FileText, UserCheck, Trash2, Loader2, UploadCloud, ShieldCheck, Clock3, AlertTriangle } from "lucide-react";

// Konfigurasi kamera untuk masing-masing step foto data diri
const CAMERA_CONFIG = {
	ktp: { facingMode: "environment", guide: "card", title: "Foto KTP", description: "Letakkan KTP rata di dalam bingkai, hindari pantulan cahaya." },
	face: { facingMode: "user", guide: "face", title: "Foto Wajah", description: "Posisikan wajah di dalam bingkai, pastikan pencahayaan cukup." },
	selfie: { facingMode: "user", guide: "face_card", title: "Selfie dengan KTP", description: "Pegang KTP di bawah dagu, pastikan wajah & KTP terlihat jelas." },
};

// Tanggal lahir maksimal yang boleh dipilih = hari ini dikurangi 17 tahun
// (supaya user yang belum genap 17 tahun tidak bisa memilih tanggal lahirnya)
const getMaxBirthDate = () => {
	const today = new Date();
	today.setFullYear(today.getFullYear() - 17);
	return today.toISOString().split("T")[0];
};

export default function Verification() {
	const navigate = useAppNavigate();
	const [step, setStep] = useState(1);
	const [files, setFiles] = useState({
		ktp: null,
		face: null,
		selfie: null,
	});
	const [cameraTarget, setCameraTarget] = useState(null); // "face" | "ktp" | "selfie" | null

	// Khusus Foto KTP: boleh pilih dari galeri device, selain kamera
	const ktpFileInputRef = useRef(null);
	const handleKtpFileChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setFiles((prev) => ({ ...prev, ktp: file }));
		}
	};

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
	const [isSuccess, setIsSuccess] = useState(false);

	// PENTING: sebelumnya halaman ini SELALU membuka form kosong dari step 1,
	// tidak peduli status verifikasi user yang sesungguhnya. Akibatnya user
	// yang sudah "Terverifikasi" (atau masih "Sedang Ditinjau") tetap disuruh
	// isi ulang semua data dari nol setiap kali membuka halaman ini. Sekarang
	// status yang sebenarnya dicek dulu ke endpoint yang sama dipakai halaman
	// Keamanan, SEBELUM form ditampilkan.
	const [checkingStatus, setCheckingStatus] = useState(true);
	const [existingVerification, setExistingVerification] = useState(null);
	// User bisa menekan "Ajukan Ulang" pada kasus 'rejected' untuk sengaja
	// membuka form dari awal walau ada pengajuan lama yang ditolak.
	const [forceShowForm, setForceShowForm] = useState(false);

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const token = localStorage.getItem("token");
				const res = await fetch("http://127.0.0.1:8000/api/verification/status", {
					headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
				});

				if (res.ok) {
					const data = await res.json();
					// Endpoint mengembalikan `null` kalau user belum pernah
					// mengajukan verifikasi sama sekali - itu kasus normal,
					// bukan error, jadi tetap lanjut ke form kosong.
					setExistingVerification(data && data.id ? data : null);
				}
			} catch (err) {
				console.error("Gagal memuat status verifikasi:", err);
			} finally {
				setCheckingStatus(false);
			}
		};

		fetchStatus();
	}, []);

	const handleCameraCapture = (file) => {
		if (!cameraTarget) return;
		setFiles((prev) => ({ ...prev, [cameraTarget]: file }));
		setCameraTarget(null);
	};

	const removeFile = (type) => {
		setFiles((prev) => ({ ...prev, [type]: null }));
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

			// ================= DATA PROFILE =================
			formData.append("type", "customer");

			formData.append("full_name", form.full_name);
			formData.append("nik", form.nik);
			formData.append("birth_place", form.birth_place);
			formData.append("birth_date", form.birth_date);
			formData.append("gender", form.gender);
			formData.append("address", form.address);

			// ================= FILE =================
			formData.append("ktp", files.ktp);
			formData.append("face", files.face);
			formData.append("selfie_ktp", files.selfie);

			const res = await fetch("http://127.0.0.1:8000/api/verification", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal verifikasi");
			}

			// ================= SUCCESS =================
			alert("Verifikasi berhasil dikirim! Tunggu proses review admin.");

			// redirect dashboard
			window.location.href = "/customer/dashboard";
		} catch (err) {
			console.error(err);

			alert(err.message || "Terjadi kesalahan saat mengirim data");
		} finally {
			setLoading(false);
		}
	};

	const steps = [
		{ id: 1, title: "Data Diri", icon: UserCheck },
		{ id: 2, title: "Foto KTP", icon: FileText },
		{ id: 3, title: "Foto Wajah", icon: Camera },
		{ id: 4, title: "Selfie KTP", icon: UserCheck },
		{ id: 5, title: "Konfirmasi", icon: CheckCircle2 },
	];

	const shouldShowStatusScreen = !checkingStatus && existingVerification && existingVerification.status !== "rejected" && !forceShowForm;

	if (checkingStatus) {
		return (
			<CustomerLayout>
				<div className="max-w-2xl mx-auto py-24 px-4 flex flex-col items-center gap-3 text-gray-400">
					<Loader2 className="animate-spin" size={28} />
					<p className="text-xs font-black uppercase tracking-widest">Memuat status verifikasi...</p>
				</div>
			</CustomerLayout>
		);
	}

	// Sudah 'verified' - tidak perlu isi apa pun lagi, cukup tunjukkan
	// statusnya. Ini yang membuat halaman ini akhirnya SELARAS dengan badge
	// "Terverifikasi" yang sudah benar di halaman Keamanan.
	if (shouldShowStatusScreen && existingVerification.status === "verified") {
		return (
			<CustomerLayout>
				<div className="max-w-2xl mx-auto py-16 px-4 text-center">
					<div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
						<ShieldCheck size={40} />
					</div>
					<h2 className="text-2xl font-black text-gray-800 mb-2">Akun Kamu Sudah Terverifikasi</h2>
					<p className="text-gray-500 mb-8">Tidak perlu mengisi ulang dokumen apa pun. Kalau ada dokumen yang perlu diganti (mis. KTP kadaluarsa), gunakan halaman "Dokumen" di Profil.</p>
					<button onClick={() => (navigate(-1))} className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black shadow-lg">
						Kembali ke Keamanan
					</button>
				</div>
			</CustomerLayout>
		);
	}

	// Masih 'pending' - sedang ditinjau admin, jangan disuruh isi ulang.
	if (shouldShowStatusScreen && existingVerification.status === "pending") {
		return (
			<CustomerLayout>
				<div className="max-w-2xl mx-auto py-16 px-4 text-center">
					<div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
						<Clock3 size={40} />
					</div>
					<h2 className="text-2xl font-black text-gray-800 mb-2">Sedang Ditinjau Admin</h2>
					<p className="text-gray-500 mb-8">Pengajuan verifikasi kamu sudah terkirim dan sedang diperiksa. Biasanya selesai dalam 1x24 jam - tidak perlu mengirim ulang.</p>
					<button onClick={() => (navigate(-1))} className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black shadow-lg">
						Kembali ke Keamanan
					</button>
				</div>
			</CustomerLayout>
		);
	}

	return (
		<CustomerLayout>
			<div className="max-w-2xl mx-auto py-12 px-4">
				{/* Notifikasi pengajuan sebelumnya ditolak - tampil di atas form,
					bukan menggantikannya, supaya user tetap bisa langsung
					mengajukan ulang dengan konteks kenapa ditolak. */}
				{existingVerification && existingVerification.status === "rejected" && (
					<div className="bg-red-50 border border-red-100 rounded-3xl p-6 mb-8 flex items-start gap-4">
						<div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
							<AlertTriangle size={20} />
						</div>
						<div>
							<h3 className="font-black text-red-700 text-sm uppercase tracking-wide mb-1">Pengajuan Sebelumnya Ditolak</h3>
							<p className="text-sm text-red-600 leading-relaxed">
								{existingVerification.notes || "Admin menolak pengajuan sebelumnya. Silakan periksa kembali data dan dokumen kamu, lalu ajukan ulang."}
							</p>
						</div>
					</div>
				)}

				{/* HEADER */}
				<div className="text-center mb-10">
					<h2 className="text-3xl font-black text-indigo-900 mb-2">Verifikasi Identitas</h2>
					<p className="text-gray-500">Demi keamanan bersama, harap lengkapi dokumen di bawah ini.</p>
				</div>

				{/* PROGRESS STEPS */}
				<div className="flex items-center justify-between mb-12 relative">
					<div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
					{steps.map((s, i) => (
						<div key={s.id} className="relative z-10 flex flex-col items-center">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${step >= s.id ? "bg-indigo-600 border-indigo-100 text-white scale-110" : "bg-white border-gray-100 text-gray-300"}`}
							>
								<s.icon size={18} />
							</div>
							<span className={`text-[10px] font-bold uppercase mt-2 tracking-wider ${step >= s.id ? "text-indigo-600" : "text-gray-300"}`}>{s.title}</span>
						</div>
					))}
				</div>

				{/* CONTENT CARD */}
				<div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-indigo-900/5 border border-indigo-50 relative overflow-hidden">
					{step === 1 && (
						<div className="animate-in fade-in duration-300">
							<h3 className="text-2xl font-black text-gray-800 mb-2 text-center">Data Sesuai KTP</h3>

							<p className="text-sm text-gray-400 text-center mb-8">Pastikan seluruh data sesuai dengan identitas resmi.</p>

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

					{step === 2 && (
						<UploadStep
							title="Foto KTP"
							desc="Pastikan seluruh bagian KTP berada dalam bingkai dan tulisan terbaca."
							file={files.ktp}
							onUpload={() => setCameraTarget("ktp")}
							onRemove={() => removeFile("ktp")}
							onNext={() => setStep(3)}
							onBack={() => setStep(1)}
							allowGallery
							galleryInputRef={ktpFileInputRef}
							onGalleryChange={handleKtpFileChange}
						/>
					)}

					{step === 3 && (
						<UploadStep
							title="Foto Wajah"
							desc="Pastikan wajah terlihat jelas tanpa masker atau kacamata hitam."
							file={files.face}
							onUpload={() => setCameraTarget("face")}
							onRemove={() => removeFile("face")}
							onNext={() => setStep(4)}
						/>
					)}

					{step === 4 && (
						<UploadStep
							title="Selfie dengan KTP"
							desc="Pegang KTP di bawah dagu, pastikan wajah dan KTP tidak blur."
							file={files.selfie}
							onUpload={() => setCameraTarget("selfie")}
							onRemove={() => removeFile("selfie")}
							onNext={() => setStep(5)}
							onBack={() => setStep(3)}
						/>
					)}

					{step === 5 && (
						<div className="animate-in fade-in zoom-in duration-300">
							<h3 className="text-xl font-bold text-gray-800 text-center mb-6">Periksa Kembali Data Anda</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
								<ReviewCard label="Foto Wajah" img={preview(files.face)} />
								<ReviewCard label="Foto KTP" img={preview(files.ktp)} />
								<ReviewCard label="Selfie KTP" img={preview(files.selfie)} />
							</div>
							<div className="flex items-center gap-4">
								<button onClick={() => setStep(3)} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
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

					{step === 6 && (
						<div className="text-center animate-in fade-in zoom-in duration-500">
							<div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
								<CheckCircle2 size={40} />
							</div>
							<h3 className="text-2xl font-black text-gray-800 mb-2">Data Terkirim!</h3>
							<p className="text-gray-500 mb-8">Tim kami akan memverifikasi data kamu dalam 1x24 jam. Mohon tunggu notifikasi selanjutnya.</p>
							<button onClick={() => (window.location.href = "/customer/dashboard")} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold">
								Kembali ke Dashboard
							</button>
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
				watermarkText="Verifikasi Customer Nebeng"
			/>
		</CustomerLayout>
	);
}

// Sub-komponen untuk efisiensi kode
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

			{/* Opsi tambahan khusus step ini: pilih foto dari galeri device */}
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