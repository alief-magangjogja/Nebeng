import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { ChevronLeft, ChevronDown, Edit3, Calendar, ZoomIn, X, User } from "lucide-react";
import { useParams } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";

export default function DetailCustomer() {
	const navigate = useAppNavigate();
	const { customerId } = useParams();

	const [selectedImg, setSelectedImg] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [dataCustomer, setDataCustomer] = useState(null);

	const [verifying, setVerifying] = useState(false);

	const getVerificationFile = (type) => {
		return dataCustomer?.verification?.files?.find((file) => file.file_type === type)?.file_path;
	};

	useEffect(() => {
		fetchDetailCustomer();
	}, [customerId]);

	const fetchDetailCustomer = async () => {
		try {
			setLoading(true);
			setError("");

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${customerId}/profile`, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal mengambil data");
			}

			setDataCustomer(result);
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

			const verificationId = dataCustomer?.verification?.id;

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

			alert("Customer berhasil diverifikasi");

			fetchDetailCustomer();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	const handleReject = async () => {
		const confirmReject = window.confirm("Tolak verifikasi customer ini?");

		if (!confirmReject) return;

		try {
			setVerifying(true);

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/customer/${customerId}/reject`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal reject customer");
			}

			alert("Customer berhasil direject");

			fetchDetailCustomer();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	const handleBlock = async () => {
		const confirmBlock = window.confirm("Blokir customer ini?");

		if (!confirmBlock) return;

		try {
			setVerifying(true);

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${customerId}/block`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal block customer");
			}

			alert("Customer berhasil diblokir");

			fetchDetailCustomer();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	const handleUnblock = async () => {
		const confirmUnblock = window.confirm("Buka blokir customer ini?");

		if (!confirmUnblock) return;

		try {
			setVerifying(true);

			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/admin/unblock-user/${customerId}`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.message || "Gagal unblock customer");
			}

			alert("Customer berhasil di-unblock");

			fetchDetailCustomer();
		} catch (err) {
			alert(err.message);
		} finally {
			setVerifying(false);
		}
	};

	if (loading) {
		return (
			<AdminLayout>
				<div className="p-10 text-center font-bold text-gray-500">Loading data customer...</div>
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

	return (
		<AdminLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 pb-24 space-y-8">
				{/* HEADER */}
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>

					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Detail Data Customer</h1>
				</div>

				{/* CARD */}
				<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="flex flex-col md:flex-row items-center gap-6">
						<div className="relative group">
							<div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-orange-100 overflow-hidden border-4 border-white shadow-2xl">
								<img src={dataCustomer.avatar ? dataCustomer.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${dataCustomer.name}`} alt="Avatar" className="w-full h-full object-cover" />
							</div>

							<div className="absolute -bottom-2 -right-2 bg-indigo-900 text-white p-2 rounded-xl border-4 border-white">
								<User size={16} />
							</div>
						</div>

						<div className="text-center md:text-left">
							<h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tighter">{dataCustomer.name}</h2>

							<p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{dataCustomer.role}</p>

							<div className="flex items-center justify-center md:justify-start gap-3 mt-2">
								<span className="text-sm font-black text-indigo-600">ID #{dataCustomer.id}</span>

								<span
									className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
										dataCustomer.status === "verified"
											? "bg-emerald-100 text-emerald-600"
											: dataCustomer.status === "pending"
												? "bg-amber-100 text-amber-600"
												: dataCustomer.status === "blocked"
													? "bg-gray-200 text-gray-700"
													: dataCustomer.status === "rejected"
														? "bg-red-100 text-red-500"
														: "bg-slate-100 text-slate-500"
									}`}
								>
									{dataCustomer.status}
								</span>
							</div>
						</div>
					</div>

					{/* <button className="flex items-center gap-2 px-8 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm">
						<Edit3 size={18} /> Edit
					</button> */}
				</div>

				{/* MAIN */}
				<div className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-sm border border-gray-50 space-y-16">
					{/* INFORMASI PRIBADI */}
					<DataSection title="Informasi Pribadi">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<ReadOnlyField label="Nama Akun" value={dataCustomer.name || "-"} />

							<ReadOnlyField label="Email" value={dataCustomer.email || "-"} />

							<ReadOnlyField label="No. Telepon" value={dataCustomer.phone || "-"} />

							<ReadOnlyField label="Role" value={dataCustomer.role || "-"} />

							<ReadOnlyField label="Status Akun" value={dataCustomer.status || "-"} />

							<ReadOnlyField label="Tipe Verifikasi" value={dataCustomer.verification?.type || "-"} />
						</div>
					</DataSection>

					{/* SECTION: INFORMASI KTP */}
					<DataSection title="Informasi KTP">
						<div className="flex flex-col lg:flex-row gap-10">
							<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
								<ReadOnlyField label="Nama Lengkap" value={dataCustomer.profile?.full_name || "-"} />

								<ReadOnlyField label="NIK" value={dataCustomer.profile?.nik || "-"} />

								<ReadOnlyField label="Tempat Lahir" value={dataCustomer.profile?.birth_place || "-"} />

								<ReadOnlyField label="Tanggal Lahir" value={dataCustomer.profile?.birth_date || "-"} icon={Calendar} />

								<ReadOnlyField label="Jenis Kelamin" value={dataCustomer.profile?.gender || "-"} />

								<div className="md:col-span-2">
									<ReadOnlyField label="Alamat" value={dataCustomer.profile?.address || "-"} />
								</div>

								<ReadOnlyField label="Status Verifikasi" value={dataCustomer.verification?.status || "-"} />
							</div>

							{ktpImage && <ImagePreview label="Foto KTP" img={ktpImage} onZoom={() => setSelectedImg(ktpImage)} />}
						</div>
					</DataSection>

					{/* SECTION: SELFIE */}
					<DataSection title="Foto Selfie">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							{selfieImage ? <ImagePreview label="Foto Selfie" img={selfieImage} onZoom={() => setSelectedImg(selfieImage)} /> : <div className="text-sm text-gray-400 font-semibold">Foto selfie belum tersedia</div>}

							{selfieKtpImage ? <ImagePreview label="Selfie + KTP" img={selfieKtpImage} onZoom={() => setSelectedImg(selfieKtpImage)} /> : <div className="text-sm text-gray-400 font-semibold">Foto selfie + KTP belum tersedia</div>}
						</div>
					</DataSection>

					{/* BUTTON */}
					<div className="pt-10 flex flex-wrap gap-4">
						{/* PENDING */}
						{dataCustomer.status === "pending" && (
							<>
								<button onClick={handleApprove} disabled={verifying} className="px-12 py-4 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-sm uppercase tracking-[0.2em]">
									{verifying ? "Loading..." : "Verifikasi"}
								</button>

								<button onClick={handleReject} disabled={verifying} className="px-12 py-4 bg-red-100 text-red-700 rounded-2xl font-black text-sm uppercase tracking-[0.2em]">
									{verifying ? "Loading..." : "Reject"}
								</button>
							</>
						)}

						{/* VERIFIED */}
						{dataCustomer.status === "verified" && (
							<button onClick={handleBlock} disabled={verifying} className="px-12 py-4 bg-gray-200 text-gray-800 rounded-2xl font-black text-sm uppercase tracking-[0.2em]">
								{verifying ? "Loading..." : "Block"}
							</button>
						)}

						{/* BLOCKED */}
						{dataCustomer.status === "blocked" && (
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
		<div className="shrink-0 w-full lg:w-64 space-y-2">
			<label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{label}</label>

			<div className="relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-100 shadow-sm" onClick={onZoom}>
				<img src={img} alt={label} className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-110" />

				<div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white">
					<ZoomIn size={32} />
				</div>
			</div>
		</div>
	);
}
