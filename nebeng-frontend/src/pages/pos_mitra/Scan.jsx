import React, { useEffect, useRef, useState } from "react";
import PosMitraLayout from "../../components/dashboard/PosMitraLayout";
import { ChevronLeft, CheckCircle2, XCircle, ScanLine, Loader2, RefreshCw, Camera, ImageUp } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const READER_ID = "reader";
const AUTO_RESUME_MS = 3000;

export default function Scan() {
	const [cameraStatus, setCameraStatus] = useState("idle"); // idle | starting | active | denied
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [successDescription, setSuccessDescription] = useState("");
	const [scanResult, setScanResult] = useState(null);

	const html5QrCodeRef = useRef(null);
	const fileInputRef = useRef(null);
	const autoResumeTimerRef = useRef(null);

	// ================= KAMERA =================
	const stopCamera = async () => {
		const instance = html5QrCodeRef.current;
		if (instance) {
			try {
				const state = instance.getState?.();
				if (state === 2 /* SCANNING */) {
					await instance.stop();
				}
				await instance.clear();
			} catch {
				// kamera memang sudah tidak aktif, aman diabaikan
			}
		}
		setCameraStatus("idle");
	};

	const startCamera = async () => {
		setError("");
		setSuccess(false);
		setCameraStatus("starting");

		try {
			const html5QrCode = new Html5Qrcode(READER_ID);
			html5QrCodeRef.current = html5QrCode;

			await html5QrCode.start(
				{ facingMode: "environment" },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				async (decodedText) => {
					await stopCamera();
					handleDecodedText(decodedText);
				},
				() => {
					// frame tanpa QR terbaca, abaikan - ini normal, terjadi tiap frame
				},
			);

			setCameraStatus("active");
		} catch (err) {
			console.error(err);
			setCameraStatus("denied");
			setError("Tidak bisa mengakses kamera. Pastikan izin kamera sudah diizinkan di browser, lalu coba lagi.");
		}
	};

	// Setelah hasil scan (sukses/gagal) ditampilkan, otomatis bersihkan
	// notifikasi & nyalakan kamera lagi setelah beberapa detik - supaya
	// petugas Pos Mitra bisa langsung lanjut scan QR berikutnya tanpa
	// perlu menekan tombol apa pun.
	const scheduleAutoResume = () => {
		if (autoResumeTimerRef.current) {
			clearTimeout(autoResumeTimerRef.current);
		}

		autoResumeTimerRef.current = setTimeout(() => {
			setSuccess(false);
			setError("");
			setScanResult(null);
			startCamera();
		}, AUTO_RESUME_MS);
	};

	// ================= PROSES HASIL SCAN (kamera atau upload gambar) =================
	const handleDecodedText = async (decodedText) => {
		setScanResult(decodedText);

		let parsedQR;

		try {
			parsedQR = JSON.parse(decodedText);
		} catch {
			setError("Format QR tidak valid");
			scheduleAutoResume();
			return;
		}

		try {
			setLoading(true);
			setError("");

			const token = localStorage.getItem("token");
			let endpoint = "";

			if (parsedQR.type === "departure") {
				endpoint = "http://127.0.0.1:8000/api/pos-mitra/scan-departure-qr";
			} else if (parsedQR.type === "trip") {
				endpoint = "http://127.0.0.1:8000/api/pos-mitra/scan-qr";
			} else if (parsedQR.type === "customer") {
				endpoint = "http://127.0.0.1:8000/api/pos-mitra/scan-customer-qr";
			} else {
				throw new Error("Jenis QR tidak dikenali");
			}

			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ qr_token: parsedQR.token }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Gagal memproses QR Token");
			}

			if (parsedQR.type === "customer") {
				setSuccessMessage("Customer Berhasil Diverifikasi");
				setSuccessDescription("Customer telah terverifikasi dan siap mengikuti perjalanan.");
			} else if (parsedQR.type === "departure") {
				setSuccessMessage("Perjalanan Berhasil Dimulai");
				setSuccessDescription("QR keberangkatan berhasil diverifikasi. Status perjalanan telah berubah menjadi dalam perjalanan.");
			} else if (parsedQR.type === "trip") {
				setSuccessMessage("Trip Berhasil Diselesaikan");
				setSuccessDescription("QR kedatangan berhasil diverifikasi. Status perjalanan telah diperbarui menjadi selesai.");
			}

			setSuccess(true);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
			scheduleAutoResume();
		}
	};

	// ================= UPLOAD GAMBAR (1 klik, langsung proses) =================
	const handleFileChange = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		await stopCamera();
		setError("");
		setSuccess(false);
		setLoading(true);

		try {
			const html5QrCode = new Html5Qrcode(READER_ID);
			const decodedText = await html5QrCode.scanFile(file, false);
			await handleDecodedText(decodedText);
		} catch (err) {
			console.error(err);
			setError("QR tidak terbaca dari gambar ini. Coba foto yang lebih jelas dan terang.");
			setLoading(false);
			scheduleAutoResume();
		} finally {
			e.target.value = "";
		}
	};

	// Tombol manual: tetap disediakan buat yang mau langsung lanjut scan
	// tanpa menunggu 3 detik, tidak wajib dipencet.
	const handleReset = async () => {
		if (autoResumeTimerRef.current) {
			clearTimeout(autoResumeTimerRef.current);
		}

		setError("");
		setSuccess(false);
		setScanResult(null);
		await startCamera();
	};

	useEffect(() => {
		return () => {
			if (autoResumeTimerRef.current) {
				clearTimeout(autoResumeTimerRef.current);
			}
			stopCamera();
		};
	}, []);

	return (
		<PosMitraLayout>
			<div className="w-full max-w-screen-md mx-auto px-4 py-6 pb-32 md:pb-10 space-y-8 font-sans">
				{/* HEADER NAVIGATION */}
				<div className="flex items-center gap-4">
					<button onClick={() => window.history.back()} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<div>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Scan QR Trip</h1>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Konfirmasi Penyelesaian Perjalanan</p>
					</div>
				</div>

				{/* SCANNER CARD CONTAINER */}
				<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-indigo-950/5 border border-indigo-50/50 space-y-6">
					<div className="flex items-center justify-between border-b border-gray-50 pb-4">
						<div className="flex items-center gap-3">
							<div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
								<ScanLine size={20} />
							</div>
							<div>
								<h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">Kamera Scanner</h2>
								<p className="text-[11px] font-medium text-gray-400">Posisikan kode QR di tengah kotak</p>
							</div>
						</div>
					</div>

					{/* Area Kamera Viewfinder */}
					<div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-900/5 relative min-h-[220px] flex items-center justify-center">
						<div id={READER_ID} className="w-full" />

						{/* State: belum aktifkan kamera sama sekali */}
						{cameraStatus === "idle" && !success && !error && (
							<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
								<div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
									<Camera size={32} />
								</div>
								<div className="space-y-4 w-full max-w-xs">
									<button
										onClick={startCamera}
										className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
									>
										<Camera size={16} /> Aktifkan Kamera
									</button>

									<button
										onClick={() => fileInputRef.current?.click()}
										className="w-full py-3.5 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
									>
										<ImageUp size={16} /> Upload Gambar QR
									</button>
								</div>
							</div>
						)}

						{/* State: sedang minta izin kamera */}
						{cameraStatus === "starting" && (
							<div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-2 text-gray-500">
								<Loader2 className="animate-spin" size={28} />
								<p className="text-xs font-bold uppercase tracking-widest">Membuka kamera...</p>
							</div>
						)}

						{/* Overlay State Loading (memproses hasil scan) */}
						{loading && (
							<div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-in fade-in duration-200">
								<Loader2 className="animate-spin mb-3 text-sky-400" size={36} />
								<p className="text-xs font-black uppercase tracking-widest">Memproses QR Code...</p>
							</div>
						)}
					</div>

					{/* Input file tersembunyi, dipicu oleh tombol "Upload Gambar QR" */}
					<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

					{/* Tombol ganti mode saat kamera sedang aktif */}
					{cameraStatus === "active" && (
						<button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-50 text-gray-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
							<ImageUp size={14} /> Atau upload gambar QR
						</button>
					)}

					{/* FEEDBACK NOTIFIKASI STATUS - otomatis hilang & kamera nyala lagi
					sendiri dalam 3 detik, tombol di bawah cuma opsi kalau mau langsung
					lanjut tanpa menunggu */}

					{/* Status Sukses */}
					{success && (
						<div className="space-y-4 animate-in zoom-in-95 duration-300">
							<div className="flex items-start gap-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
								<div className="p-2 bg-white rounded-xl text-emerald-500 shadow-sm shrink-0">
									<CheckCircle2 size={24} />
								</div>
								<div className="space-y-0.5">
									<p className="font-black text-emerald-800 text-sm uppercase tracking-wide">{successMessage}</p>
									<p className="text-xs text-emerald-600 font-medium leading-relaxed">{successDescription}</p>
									<p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest pt-1">Kamera aktif lagi otomatis dalam 3 detik...</p>
								</div>
							</div>

							<button
								onClick={handleReset}
								className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
							>
								<RefreshCw size={16} /> Scan Sekarang
							</button>
						</div>
					)}

					{/* Status Gagal / Error */}
					{error && (
						<div className="space-y-4 animate-in zoom-in-95 duration-300">
							<div className="flex items-start gap-4 bg-red-50 border border-red-100 rounded-2xl p-5">
								<div className="p-2 bg-white rounded-xl text-red-500 shadow-sm shrink-0">
									<XCircle size={24} />
								</div>
								<div className="space-y-0.5">
									<p className="font-black text-red-800 text-sm uppercase tracking-wide">Proses Scan Gagal</p>
									<p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
									<p className="text-[10px] text-red-500 font-bold uppercase tracking-widest pt-1">Kamera aktif lagi otomatis dalam 3 detik...</p>
								</div>
							</div>

							<button
								onClick={handleReset}
								className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
							>
								<RefreshCw size={16} /> Scan Sekarang
							</button>
						</div>
					)}

					{/* Token Debug Data */}
					{scanResult && !error && !loading && (
						<div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-[10px] font-mono text-gray-400 break-all leading-tight">
							<span className="font-black text-gray-500 uppercase block mb-1">Decoded Data String:</span>
							{scanResult}
						</div>
					)}
				</div>
			</div>

			<style>{`
				#${READER_ID} video {
					border-radius: 1.5rem !important;
					width: 100% !important;
				}
			`}</style>
		</PosMitraLayout>
	);
}