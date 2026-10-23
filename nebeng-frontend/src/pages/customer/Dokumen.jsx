import React, { useEffect, useState, useRef } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, CheckCircle2, FileText, Eye, Loader2, Pencil, X, ShieldAlert } from "lucide-react";
import api from "../../api/axios";

const API_ORIGIN = "http://127.0.0.1:8000";

const DOC_LABELS = {
	ktp: "Foto KTP",
	selfie_ktp: "Selfie dengan KTP",
	face: "Foto Wajah",
};

export default function Dokumen() {
	const navigate = useAppNavigate();
	const [previewImage, setPreviewImage] = useState(null);
	const [loading, setLoading] = useState(true);
	const [verification, setVerification] = useState(null);
	// Menyimpan file_type yang sedang diupload, supaya cuma dokumen itu
	// saja yang tampil spinner - bukan seluruh halaman.
	const [uploadingType, setUploadingType] = useState(null);
	const fileInputRefs = useRef({});

	const fetchData = async () => {
		try {
			const verifRes = await api.get("/verification/status");
			setVerification(verifRes.data && verifRes.data.id ? verifRes.data : null);
		} catch (err) {
			console.error("Gagal ambil data dokumen:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const documents = ["ktp", "selfie_ktp", "face"].map((type) => {
		const file = verification?.files?.find((f) => f.file_type === type);

		return {
			id: type,
			label: DOC_LABELS[type],
			uploaded: !!file,
			image: file ? `${API_ORIGIN}/storage/${file.file_path}` : null,
		};
	});

	const triggerReplace = (type) => {
		fileInputRefs.current[type]?.click();
	};

	const handleFileChange = async (type, e) => {
		const file = e.target.files?.[0];
		// Reset value supaya memilih file YANG SAMA lagi tetap memicu onChange.
		e.target.value = "";
		if (!file) return;

		try {
			setUploadingType(type);

			const formData = new FormData();
			formData.append("file_type", type);
			formData.append("file", file);

			await api.post("/verification/update-document", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			await fetchData();
		} catch (err) {
			console.error("Gagal mengganti dokumen:", err);
			alert(err.response?.data?.message || "Gagal mengganti dokumen. Coba lagi.");
		} finally {
			setUploadingType(null);
		}
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-3xl mx-auto px-4 py-6">
				{/* HEADER NAVIGATION */}
				<div className="flex items-center gap-4 mb-10">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<div>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Dokumen</h1>
						<p className="text-sm text-gray-400">Kelola dokumen verifikasi identitas kamu</p>
					</div>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-20 text-indigo-900">
						<Loader2 size={28} className="animate-spin" />
					</div>
				) : !verification ? (
					// Belum pernah mengajukan verifikasi sama sekali - tidak ada
					// dokumen apa pun untuk dikelola di sini.
					<div className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-50 text-center">
						<ShieldAlert size={40} className="text-gray-300 mx-auto mb-4" />
						<h3 className="font-black text-gray-700 mb-1">Belum Ada Dokumen</h3>
						<p className="text-sm text-gray-400 mb-6">Kamu belum pernah mengajukan verifikasi identitas.</p>
						<button onClick={() => navigate("/customer/verification")} className="px-6 py-3 bg-indigo-900 text-white rounded-2xl font-black text-sm">
							Ajukan Verifikasi
						</button>
					</div>
				) : (
					<div className="bg-white rounded-[40px] p-2 md:p-8 shadow-sm border border-gray-50">
						<div className="divide-y divide-gray-100">
							{documents.map((doc) => (
								<div key={doc.id} className="py-8 first:pt-4 last:pb-4 flex items-center justify-between gap-4 group">
									<div className="flex items-center gap-6 flex-1 min-w-0">
										{/* Thumbnail Image */}
										<div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-gray-100 shadow-sm shrink-0 bg-gray-50 flex items-center justify-center">
											{uploadingType === doc.id ? (
												<Loader2 size={22} className="animate-spin text-indigo-400" />
											) : doc.image ? (
												<>
													<img src={doc.image} alt={doc.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
													<button onClick={() => setPreviewImage(doc.image)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
														<Eye size={20} />
													</button>
												</>
											) : (
												<FileText size={28} className="text-gray-300" />
											)}
										</div>

										{/* Info Dokumen */}
										<div className="min-w-0">
											<h3 className="text-lg md:text-xl font-black text-gray-800 mb-1">{doc.label}</h3>
											{doc.uploaded ? (
												<div className="flex items-center gap-1.5 text-emerald-500">
													<span className="text-xs md:text-sm font-bold">Tersimpan</span>
													<CheckCircle2 size={14} className="shrink-0" />
												</div>
											) : (
												<span className="text-xs md:text-sm font-bold text-gray-400">Belum tersedia</span>
											)}
										</div>
									</div>

									{/* TOMBOL GANTI DOKUMEN */}
									<button
										onClick={() => triggerReplace(doc.id)}
										disabled={uploadingType === doc.id}
										className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full font-black text-xs md:text-sm flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
									>
										<Pencil size={14} />
										<span>Ubah</span>
									</button>

									<input
										ref={(el) => (fileInputRefs.current[doc.id] = el)}
										type="file"
										accept="image/*"
										capture="environment"
										className="hidden"
										onChange={(e) => handleFileChange(doc.id, e)}
									/>
								</div>
							))}
						</div>
					</div>
				)}

				{/* CATATAN */}
				<div className="mt-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start gap-4">
					<div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600">
						<ShieldAlert size={20} />
					</div>
					<div>
						<p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">Perlu Diketahui</p>
						<p className="text-[11px] text-indigo-400 font-medium leading-relaxed">
							Mengganti dokumen di sini tidak mengubah status verifikasi akun kamu yang sudah aktif. Pastikan foto yang diunggah jelas dan sesuai identitas asli - dokumen yang mencurigakan bisa membuat akun ditinjau ulang oleh admin.
						</p>
					</div>
				</div>
			</div>

			{/* LIGHTBOX PREVIEW MODAL */}
			{previewImage && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/90 backdrop-blur-md animate-in fade-in duration-300">
					<button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
						<X size={24} />
					</button>
					<img src={previewImage} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" alt="Preview Dokumen" />
				</div>
			)}
		</CustomerLayout>
	);
}