import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, QrCode, UploadCloud, Loader2, Trash2, CheckCircle2 } from "lucide-react";

export default function QrisSaya() {
	const navigate = useAppNavigate();

	const [isFetching, setIsFetching] = useState(true);
	const [currentQris, setCurrentQris] = useState(null);

	const [file, setFile] = useState(null);
	const [preview, setPreview] = useState(null);
	const [isUploading, setIsUploading] = useState(false);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const token = localStorage.getItem("token");

				const res = await fetch("http://127.0.0.1:8000/api/profile", {
					headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
				});

				const data = await res.json();
				setCurrentQris(data.profile?.qris_image || null);
			} catch (err) {
				console.error(err);
			} finally {
				setIsFetching(false);
			}
		};

		fetchProfile();
	}, []);

	const handleFileChange = (e) => {
		const selected = e.target.files[0];
		if (!selected) return;

		setFile(selected);
		setPreview(URL.createObjectURL(selected));
	};

	const handleUpload = async () => {
		if (!file) {
			alert("Pilih gambar QRIS terlebih dahulu.");
			return;
		}

		setIsUploading(true);

		try {
			const token = localStorage.getItem("token");

			const formData = new FormData();
			formData.append("qris_image", file);

			const res = await fetch("http://127.0.0.1:8000/api/profile/qris", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal menyimpan QRIS");
			}

			setCurrentQris(data.qris_image);
			setFile(null);
			setPreview(null);

			alert("QRIS berhasil disimpan. Customer akan melihat QRIS ini saat memilih pembayaran QRIS untuk perjalananmu.");
		} catch (err) {
			alert(err.message || "Terjadi kesalahan saat menyimpan QRIS");
		} finally {
			setIsUploading(false);
		}
	};

	const displayImage = preview || (currentQris ? `http://127.0.0.1:8000/storage/${currentQris}` : null);

	return (
		<MitraLayout>
			<div className="w-full max-w-lg mx-auto px-4 py-6">
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
						<ChevronLeft className="w-6 h-6 text-indigo-900" />
					</button>
					<div>
						<h1 className="text-2xl font-black text-indigo-900">QRIS Saya</h1>
						<p className="text-sm text-gray-400">QRIS ini yang akan dilihat customer saat bayar via QRIS</p>
					</div>
				</div>

				{isFetching ? (
					<div className="flex items-center justify-center py-16 text-gray-400 gap-2 bg-white rounded-[40px] border border-gray-100">
						<Loader2 className="animate-spin" size={20} /> Memuat...
					</div>
				) : (
					<div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-6">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
								<QrCode size={20} />
							</div>
							<div>
								<h3 className="font-black text-gray-800">Gambar QRIS Statis</h3>
								<p className="text-xs text-gray-400">Upload foto/screenshot kode QRIS milikmu (dari e-wallet atau m-banking).</p>
							</div>
						</div>

						{displayImage ? (
							<div className="relative rounded-3xl overflow-hidden border border-gray-100">
								<img src={displayImage} alt="QRIS" className="w-full max-h-80 object-contain bg-gray-50" />
								{!isFetching && (
									<button
										onClick={() => {
											setFile(null);
											setPreview(null);
										}}
										className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg"
										style={{ display: preview ? "flex" : "none" }}
									>
										<Trash2 size={16} />
									</button>
								)}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
								<p className="text-sm font-bold text-gray-400">Belum ada QRIS yang diupload</p>
							</div>
						)}

						<label className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-sm cursor-pointer hover:bg-indigo-50 transition-all">
							<UploadCloud size={18} />
							{currentQris ? "Ganti QRIS" : "Pilih Gambar QRIS"}
							<input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
						</label>

						{file && (
							<button
								onClick={handleUpload}
								disabled={isUploading}
								className="w-full py-4 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
							>
								{isUploading ? (
									<>
										<Loader2 className="animate-spin" size={18} /> Menyimpan...
									</>
								) : (
									<>
										<CheckCircle2 size={18} /> Simpan QRIS
									</>
								)}
							</button>
						)}
					</div>
				)}
			</div>
		</MitraLayout>
	);
}