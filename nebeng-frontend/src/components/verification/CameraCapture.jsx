import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw, Check, AlertTriangle, Loader2, RefreshCw, ScanFace, CheckCircle2 } from "lucide-react";
import { loadFaceModels, detectFaces, evaluateFaceFit, FACE_STATUS_MESSAGE } from "../../lib/faceDetection";

// Posisi & ukuran oval wajah, dalam ruang KONTAINER (0..1). Dipakai untuk
// render overlay DAN dikirim ke evaluateFaceFit supaya deteksi mengikuti
// posisi oval yang benar-benar tampil di layar (bukan selalu di tengah).
const FACE_OVAL_PRESETS = {
	face: { cx: 0.5, cy: 0.5, widthFrac: 0.62 }, // oval besar di tengah (step "Foto Wajah")
	face_card: { cx: 0.5, cy: 0.3, widthFrac: 0.46 }, // oval lebih kecil, digeser ke atas (step "Selfie dengan KTP")
};

// Posisi & ukuran kotak KTP khusus untuk mode gabungan "face_card".
// (Untuk guide="card" biasa/standalone, kotaknya tetap pakai render lama yang center-full.)
const CARD_RECT_PRESET_FACE_CARD = { cx: 0.5, cy: 0.795, widthFrac: 0.64 }; // area bawah, dekat dagu

/**
 * CameraCapture
 * Modal kamera real-time (bukan file picker) untuk mencegah upload foto dari galeri.
 *
 * Props:
 * - open        : boolean, tampil/tidak
 * - onClose     : () => void
 * - onCapture   : (file: File) => void  -> dipanggil saat user menekan "Gunakan Foto"
 * - facingMode  : "user" | "environment" (default "user")
 * - guide       : "face" | "card" | "none"  -> bentuk panduan bingkai di atas video
 * - title       : judul di header modal
 * - description : instruksi singkat di bawah judul
 * - watermarkText: teks tambahan yang di-burn ke foto (opsional)
 *
 * Perilaku tambahan:
 * - guide === "face"  -> tombol "Ambil Foto" TERKUNCI sampai wajah terdeteksi
 *   otomatis (face-api.js) benar-benar pas di dalam bingkai (posisi & jarak wajar).
 * - guide !== "face"  (dokumen: KTP/SIM/SKCK, dll) -> setelah foto diambil, user
 *   WAJIB mencentang checkbox konfirmasi "sudah rata & jelas" sebelum tombol
 *   "Gunakan Foto" aktif. Selama belum dicentang, satu-satunya aksi yang bisa
 *   dilakukan adalah "Ambil Ulang". Ini dipakai karena deteksi bentuk kartu
 *   secara otomatis tidak reliable.
 */
export default function CameraCapture({ open, onClose, onCapture, facingMode = "user", guide = "none", title = "Ambil Foto", description = "", watermarkText = "" }) {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const streamRef = useRef(null);
	const detectionTimerRef = useRef(null);
	const faceApiRef = useRef(null);
	const detectionBusyRef = useRef(false);

	const [status, setStatus] = useState("idle"); // idle | starting | streaming | error
	const [errorMsg, setErrorMsg] = useState("");
	const [capturedUrl, setCapturedUrl] = useState(null);
	const [capturedBlob, setCapturedBlob] = useState(null);
	const [currentFacing, setCurrentFacing] = useState(facingMode);

	// ====== State khusus mode "face" (deteksi otomatis) ======
	const isFaceGuide = guide === "face" || guide === "face_card";
	const ovalPreset = FACE_OVAL_PRESETS[guide] || FACE_OVAL_PRESETS.face;
	const [faceStatus, setFaceStatus] = useState("loading"); // loading | no-face | multiple-faces | off-center | too-far | too-close | ok | error
	const faceReady = faceStatus === "ok";

	// ====== State khusus mode dokumen (checkbox konfirmasi wajib) ======
	// Berlaku untuk semua guide yang mengandung elemen dokumen: "card", "none" (KTP/SIM/SKCK),
	// dan "face_card" (selfie+KTP -> bagian KTP-nya tetap butuh konfirmasi manual).
	const isDocGuide = guide === "card" || guide === "none" || guide === "face_card";
	const [docConfirmed, setDocConfirmed] = useState(false);

	const stopStream = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
	}, []);

	const stopDetectionLoop = useCallback(() => {
		if (detectionTimerRef.current) {
			clearInterval(detectionTimerRef.current);
			detectionTimerRef.current = null;
		}
	}, []);

	const startStream = useCallback(
		async (facing) => {
			setStatus("starting");
			setErrorMsg("");
			stopStream();

			// Cegah dijalankan di context tidak aman (selain localhost)
			if (!window.isSecureContext) {
				setStatus("error");
				setErrorMsg("Kamera hanya bisa diakses melalui koneksi HTTPS yang aman.");
				return;
			}

			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				setStatus("error");
				setErrorMsg("Perangkat/browser ini tidak mendukung akses kamera.");
				return;
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: { ideal: facing },
						width: { ideal: 1280 },
						height: { ideal: 960 },
					},
					audio: false,
				});

				streamRef.current = stream;

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play();
				}

				setStatus("streaming");
			} catch (err) {
				console.error("Camera error:", err);
				setStatus("error");

				if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
					setErrorMsg("Akses kamera ditolak. Mohon izinkan akses kamera pada browser Anda untuk melanjutkan verifikasi.");
				} else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
					setErrorMsg("Kamera tidak ditemukan pada perangkat ini.");
				} else if (err.name === "NotReadableError") {
					setErrorMsg("Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.");
				} else {
					setErrorMsg("Gagal mengakses kamera. Silakan coba lagi.");
				}
			}
		},
		[stopStream]
	);

	useEffect(() => {
		if (open) {
			setCapturedUrl(null);
			setCapturedBlob(null);
			setDocConfirmed(false);
			setFaceStatus("loading");
			setCurrentFacing(facingMode);
			startStream(facingMode);
		} else {
			stopStream();
			stopDetectionLoop();
			setStatus("idle");
		}

		return () => {
			stopStream();
			stopDetectionLoop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	// ====== Loop deteksi wajah otomatis (hanya untuk guide === "face") ======
	useEffect(() => {
		if (!open || !isFaceGuide || status !== "streaming" || capturedUrl) {
			stopDetectionLoop();
			return;
		}

		let cancelled = false;

		(async () => {
			try {
				if (!faceApiRef.current) {
					faceApiRef.current = await loadFaceModels();
				}
				if (cancelled) return;

				detectionTimerRef.current = setInterval(async () => {
					if (cancelled || detectionBusyRef.current) return;
					const video = videoRef.current;
					if (!video || video.readyState < 2) return;

					detectionBusyRef.current = true;
					try {
						const detections = await detectFaces(faceApiRef.current, video);
						const { status: fitStatus } = evaluateFaceFit(detections, video.videoWidth, video.videoHeight, 3 / 4, ovalPreset);
						if (!cancelled) setFaceStatus(fitStatus);
					} catch (e) {
						console.error("Face detection error:", e);
						if (!cancelled) setFaceStatus("error");
					} finally {
						detectionBusyRef.current = false;
					}
				}, 350);
			} catch (err) {
				console.error("Gagal load model face-api:", err);
				if (!cancelled) setFaceStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			stopDetectionLoop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, isFaceGuide, status, capturedUrl]);

	const handleSwitchCamera = () => {
		const next = currentFacing === "user" ? "environment" : "user";
		setCurrentFacing(next);
		setFaceStatus("loading");
		startStream(next);
	};

	const handleCapture = () => {
		// Guard tambahan: pada mode wajah, tidak boleh capture sebelum status "ok"
		if (isFaceGuide && !faceReady) return;

		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;

		const w = video.videoWidth;
		const h = video.videoHeight;
		canvas.width = w;
		canvas.height = h;

		const ctx = canvas.getContext("2d");

		// Mirror hanya untuk kamera depan agar terasa natural, tapi tetap simpan hasil apa adanya
		if (currentFacing === "user") {
			ctx.translate(w, 0);
			ctx.scale(-1, 1);
		}
		ctx.drawImage(video, 0, 0, w, h);
		ctx.setTransform(1, 0, 0, 1, 0, 0);

		// Watermark timestamp -> jejak bukti foto diambil real-time
		const now = new Date();
		const stamp = now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" });
		const label = watermarkText ? `${watermarkText} • ${stamp}` : `Nebeng Verifikasi • ${stamp}`;

		const fontSize = Math.max(16, Math.round(w * 0.022));
		ctx.font = `600 ${fontSize}px sans-serif`;
		const paddingX = 16;
		const paddingY = 12;
		const textWidth = ctx.measureText(label).width;
		const boxHeight = fontSize + paddingY * 2;

		ctx.fillStyle = "rgba(0,0,0,0.55)";
		ctx.fillRect(0, h - boxHeight, textWidth + paddingX * 2, boxHeight);

		ctx.fillStyle = "#ffffff";
		ctx.textBaseline = "middle";
		ctx.fillText(label, paddingX, h - boxHeight / 2);

		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				setCapturedBlob(blob);
				setCapturedUrl(URL.createObjectURL(blob));
				setDocConfirmed(false); // reset setiap kali ada hasil capture baru
			},
			"image/jpeg",
			0.92
		);
	};

	const handleRetake = () => {
		setCapturedUrl(null);
		setCapturedBlob(null);
		setDocConfirmed(false);
		setFaceStatus("loading");
		startStream(currentFacing);
	};

	const handleConfirm = () => {
		if (!capturedBlob) return;
		if (isDocGuide && !docConfirmed) return; // guard tambahan
		const file = new File([capturedBlob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
		onCapture(file);
		handleClose();
	};

	const handleClose = () => {
		stopStream();
		stopDetectionLoop();
		setCapturedUrl(null);
		setCapturedBlob(null);
		setDocConfirmed(false);
		onClose();
	};

	if (!open) return null;

	// Warna & pesan bingkai oval wajah, mengikuti status deteksi real-time
	const faceOvalColorClass = faceStatus === "ok" ? "border-emerald-400" : faceStatus === "error" ? "border-white/70" : "border-amber-400";
	const faceMessage = FACE_STATUS_MESSAGE[faceStatus] || FACE_STATUS_MESSAGE.loading;

	// Tombol "Gunakan Foto" pada mode dokumen terkunci sampai checkbox dicentang
	const confirmDisabled = isDocGuide && !docConfirmed;

	return (
		<div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
			<div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
				{/* HEADER */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
					<div>
						<h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
							<Camera size={18} className="text-indigo-600" /> {title}
						</h3>
						{description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
					</div>
					<button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-all">
						<X size={20} />
					</button>
				</div>

				{/* BODY */}
				<div className="relative bg-black aspect-[3/4] w-full overflow-hidden">
					{status === "starting" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10">
							<Loader2 size={32} className="animate-spin" />
							<p className="text-sm font-semibold">Membuka kamera...</p>
						</div>
					)}

					{status === "error" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10 px-8 text-center">
							<AlertTriangle size={32} className="text-amber-400" />
							<p className="text-sm font-semibold">{errorMsg}</p>
							<button onClick={() => startStream(currentFacing)} className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-2">
								<RefreshCw size={14} /> Coba Lagi
							</button>
						</div>
					)}

					{!capturedUrl && (
						<video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${currentFacing === "user" ? "-scale-x-100" : ""}`} />
					)}

					{capturedUrl && <img src={capturedUrl} alt="Hasil foto" className="w-full h-full object-cover" />}

					{/* GUIDE OVERLAY - WAJAH (mode "face" & "face_card") */}
					{!capturedUrl && status === "streaming" && isFaceGuide && (
						<>
							{/* Oval wajah, posisinya mengikuti preset (di tengah untuk "face", digeser ke atas untuk "face_card") */}
							<div
								className={`absolute pointer-events-none z-10 aspect-[3/4] border-4 rounded-[50%] transition-colors duration-200 ${faceOvalColorClass}`}
								style={{
									left: `${ovalPreset.cx * 100}%`,
									top: `${ovalPreset.cy * 100}%`,
									width: `${ovalPreset.widthFrac * 100}%`,
									transform: "translate(-50%, -50%)",
								}}
							/>
							{guide === "face_card" && (
								<span
									className="absolute z-10 pointer-events-none px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-wider"
									style={{
										left: `${ovalPreset.cx * 100}%`,
										top: `${(ovalPreset.cy - ovalPreset.widthFrac / 2) * 100}%`,
										transform: "translate(-50%, -130%)",
									}}
								>
									Wajah di sini
								</span>
							)}

							{/* Badge status deteksi */}
							<div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm flex items-center gap-2 max-w-[90%]">
								{faceStatus === "ok" ? (
									<CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
								) : faceStatus === "loading" ? (
									<Loader2 size={16} className="text-white animate-spin shrink-0" />
								) : (
									<ScanFace size={16} className="text-amber-400 shrink-0" />
								)}
								<span className={`text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis ${faceStatus === "ok" ? "text-emerald-400" : "text-white"}`}>{faceMessage}</span>
							</div>
						</>
					)}

					{/* GUIDE OVERLAY - KOTAK KTP untuk mode gabungan "face_card" (selfie dengan KTP) */}
					{!capturedUrl && status === "streaming" && guide === "face_card" && (
						<>
							<div
								className="absolute pointer-events-none z-10 aspect-[1.586/1] border-4 border-white/70 rounded-2xl"
								style={{
									left: `${CARD_RECT_PRESET_FACE_CARD.cx * 100}%`,
									top: `${CARD_RECT_PRESET_FACE_CARD.cy * 100}%`,
									width: `${CARD_RECT_PRESET_FACE_CARD.widthFrac * 100}%`,
									transform: "translate(-50%, -50%)",
								}}
							/>
							<span
								className="absolute z-10 pointer-events-none px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-wider"
								style={{
									left: `${CARD_RECT_PRESET_FACE_CARD.cx * 100}%`,
									top: `${CARD_RECT_PRESET_FACE_CARD.cy * 100}%`,
									transform: "translate(-50%, -190%)",
								}}
							>
								KTP di sini
							</span>
						</>
					)}

					{/* GUIDE OVERLAY - KARTU / DOKUMEN (standalone: Foto KTP / Foto SIM) */}
					{!capturedUrl && status === "streaming" && guide === "card" && (
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-8">
							<div className="w-full aspect-[1.586/1] border-4 border-white/70 rounded-2xl" />
						</div>
					)}

					<canvas ref={canvasRef} className="hidden" />
				</div>

				{/* KONFIRMASI WAJIB UNTUK FOTO DOKUMEN (KTP/SIM/SKCK) */}
				{capturedUrl && isDocGuide && (
					<div className="px-6 pt-4">
						<label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={docConfirmed}
								onChange={(e) => setDocConfirmed(e.target.checked)}
								className="mt-0.5 w-5 h-5 rounded-md accent-indigo-600 shrink-0"
							/>
							<span className="text-xs font-bold text-amber-800 leading-relaxed">
								Saya konfirmasi foto sudah rata &amp; jelas — tidak buram, tidak terpotong, dan seluruh tulisan terbaca.
							</span>
						</label>
						{!docConfirmed && <p className="text-[11px] text-gray-400 mt-2 px-1">Centang konfirmasi di atas untuk mengaktifkan tombol "Gunakan Foto", atau ambil ulang jika foto kurang jelas.</p>}
					</div>
				)}

				{/* FOOTER / CONTROLS */}
				<div className="px-6 py-5 flex items-center justify-center gap-4">
					{!capturedUrl ? (
						<>
							<button
								onClick={handleSwitchCamera}
								disabled={status !== "streaming"}
								className="p-4 rounded-2xl border-2 border-gray-100 text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-30"
								title="Ganti kamera"
							>
								<RotateCcw size={20} />
							</button>
							<button
								onClick={handleCapture}
								disabled={status !== "streaming" || (isFaceGuide && !faceReady)}
								className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
							>
								<Camera size={20} /> Ambil Foto
							</button>
						</>
					) : (
						<>
							<button onClick={handleRetake} className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
								<RotateCcw size={18} /> Ambil Ulang
							</button>
							<button
								onClick={handleConfirm}
								disabled={confirmDisabled}
								className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
							>
								<Check size={20} /> Gunakan Foto
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}