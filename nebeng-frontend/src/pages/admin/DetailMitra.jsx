import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { ChevronLeft, ChevronDown, Calendar, ZoomIn, X, User, CreditCard, ShieldCheck, BadgeCheck, FileText, Car, Bike, Package, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";

export default function DetailMitra() {
	const navigate = useAppNavigate();
	const { mitraId } = useParams();

	const [selectedImg, setSelectedImg] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [dataMitra, setDataMitra] = useState(null);
	const [verifying, setVerifying] = useState(false);

	useEffect(() => {
		fetchDetailMitra();
	}, [mitraId]);

	const getVerificationFile = (type) => {
		return dataMitra?.verification?.files?.find((file) => file.file_type === type)?.file_path;
	};

	const fetchDetailMitra = async () => {
		try {
			setLoading(true);
			setError("");

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${mitraId}/profile`, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal mengambil data");
			}

			setDataMitra(result);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleApprove = async () => {
		try {
			setVerifying(true);

			const token = localStorage.getItem("token");

			const verificationId = dataMitra?.verification?.id;

			if (!verificationId) {
				alert("Data verifikasi tidak ditemukan");
				return;
			}

			const res = await fetch(`http://127.0.0.1:8000/api/admin/verifications/${verificationId}/approve`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal verifikasi");
			}

			alert("Mitra berhasil diverifikasi");

			fetchDetailMitra();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	const handleReject = async () => {
		const confirmReject = window.confirm("Tolak verifikasi mitra ini?");

		if (!confirmReject) return;

		try {
			setVerifying(true);

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/mitra/${mitraId}/reject`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal reject mitra");
			}

			alert("Mitra berhasil direject");

			fetchDetailMitra();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	const handleBlock = async () => {
		const confirmBlock = window.confirm("Blokir mitra ini?");

		if (!confirmBlock) return;

		try {
			setVerifying(true);

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${mitraId}/block`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal block mitra");
			}

			alert("Mitra berhasil diblokir");

			fetchDetailMitra();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	const handleUnblock = async () => {
		const confirmUnblock = window.confirm("Buka blokir mitra ini?");

		if (!confirmUnblock) return;

		try {
			setVerifying(true);

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/unblock-user/${mitraId}`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal unblock mitra");
			}

			alert("Mitra berhasil di-unblock");

			fetchDetailMitra();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	if (loading) {
		return (
			<AdminLayout>
				<div className="p-10 text-center font-bold text-gray-500">Loading data mitra...</div>
			</AdminLayout>
		);
	}

	if (error) {
		return (
			<AdminLayout>
				<div className="p-10 text-center text-red-500 font-bold">{error}</div>
			</AdminLayout>
		);
	}

	const ktpImage = getVerificationFile("ktp");
	const selfieImage = getVerificationFile("face");
	const selfieKtpImage = getVerificationFile("selfie_ktp");
	const simImage = getVerificationFile("sim");
	const skckImage = getVerificationFile("skck");

	return (
		<AdminLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-24 space-y-8">
				{/* HEADER */}
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>

					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Detail Data Mitra</h1>
				</div>

				{/* CARD */}
				<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="flex flex-col md:flex-row items-center gap-6">
						<div className="relative group">
							<div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-orange-100 overflow-hidden border-4 border-white shadow-2xl">
								<img src={dataMitra.avatar ? dataMitra.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${dataMitra.name}`} alt="Avatar" className="w-full h-full object-cover" />
							</div>

							<div className="absolute -bottom-2 -right-2 bg-indigo-900 text-white p-2 rounded-xl border-4 border-white">
								<User size={16} />
							</div>
						</div>

						<div className="text-center md:text-left">
							<h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tighter">{dataMitra.name}</h2>

							<p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{dataMitra.role}</p>

							<div className="flex items-center justify-center md:justify-start gap-3 mt-2">
								<span className="text-sm font-black text-indigo-600">ID #{dataMitra.id}</span>

								<span
									className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
										dataMitra.status === "verified"
											? "bg-emerald-100 text-emerald-600"
											: dataMitra.status === "pending"
												? "bg-amber-100 text-amber-600"
												: dataMitra.status === "blocked"
													? "bg-gray-200 text-gray-700"
													: dataMitra.status === "rejected"
														? "bg-red-100 text-red-500"
														: "bg-slate-100 text-slate-500"
									}`}
								>
									{dataMitra.status}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* MAIN */}
				<div className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-sm border border-gray-50 space-y-16">
					{/* INFORMASI AKUN */}
					<DataSection title="Informasi Akun">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<ReadOnlyField label="Nama Akun" value={dataMitra.name || "-"} />

							<ReadOnlyField label="Email" value={dataMitra.email || "-"} />

							<ReadOnlyField label="No. Telepon" value={dataMitra.phone || "-"} />

							<ReadOnlyField label="Role" value={dataMitra.role || "-"} />

							<ReadOnlyField label="Status Akun" value={dataMitra.status || "-"} />

							<ReadOnlyField label="Tipe Verifikasi" value={dataMitra.verification?.type || "-"} />
						</div>
					</DataSection>

					{/* RIWAYAT PELANGGARAN - dua konsep BERBEDA, sengaja dipisah:
					    - Teguran: dari laporan komplain customer soal refund
					    - Strike: dari keterlambatan/pembatalan trip mendadak */}
					{dataMitra.role === "mitra" && (
						<DataSection title="Riwayat Pelanggaran">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div className="space-y-2 group">
									<p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teguran (Komplain Refund)</p>
									<p
										className={`text-2xl font-black tracking-tight ${
											dataMitra.mitra_warning_count >= dataMitra.mitra_warning_max ? "text-red-600" : dataMitra.mitra_warning_count > 0 ? "text-amber-600" : "text-gray-700"
										}`}
									>
										{dataMitra.mitra_warning_count ?? 0} <span className="text-sm text-gray-400 font-bold">/ {dataMitra.mitra_warning_max ?? 3}</span>
									</p>
									{dataMitra.mitra_warning_count >= dataMitra.mitra_warning_max && <p className="text-[11px] text-red-500 font-bold">Sudah mencapai batas maksimal teguran</p>}
								</div>

								<div className="space-y-2 group">
									<p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Strike (Trip Telat/Dibatalkan Mendadak)</p>
									<p className="text-2xl font-black text-gray-700 tracking-tight">{dataMitra.mitra_strike_count ?? 0} <span className="text-sm text-gray-400 font-bold">/ 5</span></p>
								</div>
							</div>
						</DataSection>
					)}

					{/* INFORMASI KTP */}
					<DataSection title="Informasi KTP">
						<div className="flex flex-col lg:flex-row gap-10">
							<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
								<ReadOnlyField label="Nama Lengkap" value={dataMitra.profile?.full_name || "-"} />

								<ReadOnlyField label="NIK" value={dataMitra.profile?.nik || "-"} />

								<ReadOnlyField label="Tempat Lahir" value={dataMitra.profile?.birth_place || "-"} />

								<ReadOnlyField label="Tanggal Lahir" value={dataMitra.profile?.birth_date || "-"} icon={Calendar} />

								<ReadOnlyField label="Jenis Kelamin" value={dataMitra.profile?.gender || "-"} />

								<div className="md:col-span-2">
									<ReadOnlyField label="Alamat" value={dataMitra.profile?.address || "-"} />
								</div>

								<ReadOnlyField label="Provinsi" value={dataMitra.profile?.province || "-"} />

								<ReadOnlyField label="Kota / Kabupaten" value={dataMitra.profile?.city || "-"} />

							</div>

							{ktpImage && <ImagePreview label="Foto KTP" img={ktpImage} onZoom={() => setSelectedImg(ktpImage)} />}
						</div>
					</DataSection>

					{/* FOTO SELFIE */}
					<DataSection title="Verifikasi Wajah">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							{selfieImage ? <ImagePreview label="Foto Wajah" img={selfieImage} onZoom={() => setSelectedImg(selfieImage)} /> : <EmptyImage text="Foto wajah belum tersedia" />}

							{selfieKtpImage ? <ImagePreview label="Selfie + KTP" img={selfieKtpImage} onZoom={() => setSelectedImg(selfieKtpImage)} /> : <EmptyImage text="Foto selfie + KTP belum tersedia" />}
						</div>
					</DataSection>

					{/* SIM */}
					<DataSection title="Dokumen SIM">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-6">
								<div className="flex items-center gap-3 text-indigo-600">
									<BadgeCheck size={22} />
									<h4 className="font-black text-lg">Surat Izin Mengemudi</h4>
								</div>

									<ReadOnlyField label="Status Dokumen" value={skckImage ? "Uploaded" : "Belum Upload"} />
								<ReadOnlyField label="Status Verifikasi" value={dataMitra.verification?.status || "-"} />
							</div>

							{simImage ? <ImagePreview label="Foto SIM" img={simImage} onZoom={() => setSelectedImg(simImage)} /> : <EmptyImage text="Foto SIM belum tersedia" />}
						</div>
					</DataSection>

					{/* SKCK */}
					<DataSection title="Dokumen SKCK">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-6">
								<div className="flex items-center gap-3 text-indigo-600">
									<ShieldCheck size={22} />
									<h4 className="font-black text-lg">Surat Keterangan Catatan Kepolisian</h4>
								</div>

								<ReadOnlyField label="Status Dokumen" value={skckImage ? "Uploaded" : "Belum Upload"} />
							</div>

								{skckImage ? <ImagePreview label="Foto SKCK" img={skckImage} onZoom={() => setSelectedImg(skckImage)} /> : <EmptyImage text="Foto SKCK belum tersedia" />}
						</div>
					</DataSection>

					{/* DATA KENDARAAN - digabung di sini supaya sekali klik "Verifikasi"
						di bawah langsung menyetujui akun mitra SEKALIGUS semua kendaraan
						yang diajukan bersamaan (status "pending"). */}
					{dataMitra.role === "mitra" && (
						<DataSection title="Data Kendaraan">
							{dataMitra.vehicles && dataMitra.vehicles.length > 0 ? (
								<div className="space-y-3">
									{dataMitra.vehicles.map((v) => (
										<VehicleCard key={v.id} vehicle={v} />
									))}

									{dataMitra.status === "pending" && dataMitra.vehicles.some((v) => v.status === "pending") && (
										<p className="text-[11px] text-indigo-500 font-bold px-1">
											Kendaraan berstatus "Menunggu" di atas akan ikut disetujui otomatis saat kamu menekan tombol "Verifikasi" di bawah.
										</p>
									)}
								</div>
							) : (
								<p className="text-sm font-semibold text-gray-400">Mitra ini belum mendaftarkan kendaraan.</p>
							)}
						</DataSection>
					)}

					{/* BUTTON */}
					<div className="pt-10 flex flex-wrap gap-4">
						{dataMitra.status === "pending" && (
							<>
								<button onClick={handleApprove} disabled={verifying} className="px-12 py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-sm uppercase tracking-[0.2em]">
									{verifying ? "Loading..." : "Verifikasi"}
								</button>

								<button onClick={handleReject} disabled={verifying} className="px-12 py-4 bg-red-100 text-red-700 rounded-2xl font-black text-sm uppercase tracking-[0.2em]">
									{verifying ? "Loading..." : "Reject"}
								</button>
							</>
						)}

						{dataMitra.status === "verified" && (
							<button onClick={handleBlock} disabled={verifying} className="px-12 py-4 bg-gray-200 text-gray-800 rounded-2xl font-black text-sm uppercase tracking-[0.2em]">
								{verifying ? "Loading..." : "Block"}
							</button>
						)}

						{dataMitra.status === "blocked" && (
							<button onClick={handleUnblock} disabled={verifying} className="px-12 py-4 bg-indigo-100 text-indigo-700 rounded-2xl font-black text-sm uppercase tracking-[0.2em]">
								{verifying ? "Loading..." : "Unblock"}
							</button>
						)}
					</div>
				</div>
			</div>

			{/* LIGHTBOX */}
			{selectedImg && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-indigo-950/90 backdrop-blur-md" onClick={() => setSelectedImg(null)}></div>

					<div className="relative max-w-4xl w-full">
						<button onClick={() => setSelectedImg(null)} className="absolute -top-12 right-0 text-white">
							<X size={32} />
						</button>

						<img src={selectedImg} alt="Preview" className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white/10" />
					</div>
				</div>
			)}
		</AdminLayout>
	);
}

/* SUB COMPONENT */

function DataSection({ title, children }) {
	return (
		<div className="space-y-8">
			<h3 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-3">
				<div className="h-6 w-1.5 bg-indigo-600 rounded-full"></div>
				{title}
			</h3>

			{children}
		</div>
	);
}

function ReadOnlyField({ label, value, icon: Icon, isSelect }) {
	return (
		<div className="space-y-2 group">
			<label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{label}</label>

			<div className="relative">
				<input readOnly value={value} className="w-full py-4 px-5 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-500 cursor-not-allowed outline-none" />

				<div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300">
					{Icon && <Icon size={18} />}
					{isSelect && <ChevronDown size={18} />}
				</div>
			</div>
		</div>
	);
}

function ImagePreview({ label, img, onZoom }) {
	return (
		<div className="w-full lg:w-72 shrink-0 space-y-2">
			<label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 block">{label}</label>

			<div className="relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-100 shadow-sm bg-gray-50 h-56" onClick={onZoom}>
				<img src={img} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

				<div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white">
					<ZoomIn size={32} />
				</div>
			</div>
		</div>
	);
}

const vehicleTypeIcon = { motor: Bike, mobil: Car, barang: Package };
const vehicleTypeLabel = { motor: "Motor", mobil: "Mobil", barang: "Barang" };
const vehicleStatusBadge = {
	pending: { label: "Menunggu", className: "bg-amber-100 text-amber-600", icon: Clock3 },
	approved: { label: "Disetujui", className: "bg-emerald-100 text-emerald-600", icon: CheckCircle2 },
	rejected: { label: "Ditolak", className: "bg-red-100 text-red-500", icon: XCircle },
};

function VehicleCard({ vehicle }) {
	const Icon = vehicleTypeIcon[vehicle.type] || Car;
	const badge = vehicleStatusBadge[vehicle.status] || vehicleStatusBadge.pending;
	const BadgeIcon = badge.icon;

	return (
		<div className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
			<div className="w-12 h-12 rounded-xl bg-indigo-900 text-white flex items-center justify-center shrink-0">
				<Icon size={22} />
			</div>

			<div className="flex-1 min-w-0">
				<p className="font-black text-gray-800 text-sm truncate">
					{vehicleTypeLabel[vehicle.type] || vehicle.type} • {vehicle.brand} {vehicle.model}
				</p>
				<p className="text-xs text-gray-400 font-medium truncate">
					{vehicle.plate_number} {vehicle.color ? `• ${vehicle.color}` : ""} {vehicle.type === "mobil" ? `• Maks. ${vehicle.seat_capacity} penumpang` : ""}
				</p>
				{vehicle.status === "rejected" && vehicle.notes && <p className="text-[11px] text-red-500 font-bold mt-1">Alasan ditolak: {vehicle.notes}</p>}
			</div>

			<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${badge.className}`}>
				<BadgeIcon className="w-3 h-3" /> {badge.label}
			</span>
		</div>
	);
}

function EmptyImage({ text, label = "Dokumen" }) {
	return (
		<div className="w-full lg:w-72 shrink-0 space-y-2">
			<label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 block">{label}</label>

			<div className="h-56 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-400 bg-gray-50 text-center px-6">{text}</div>
		</div>
	);
}