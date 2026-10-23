/**
 * faceDetection.js
 * Helper untuk deteksi wajah real-time menggunakan face-api.js (TinyFaceDetector).
 *
 * Dipakai oleh CameraCapture untuk mengunci tombol "Ambil Foto" pada mode
 * guide="face" sampai wajah benar-benar pas di dalam bingkai oval.
 *
 * Model (TinyFaceDetector, ~190KB) diletakkan di /public/models sehingga bisa
 * di-load langsung via fetch relatif ke origin frontend, tanpa CDN eksternal.
 */

const MODEL_URL = "/models";

let loadPromise = null;

/**
 * Load model TinyFaceDetector sekali saja (singleton).
 * Panggilan berikutnya akan mengembalikan promise yang sama / instan jika sudah selesai.
 */
export async function loadFaceModels() {
	if (loadPromise) return loadPromise;

	loadPromise = (async () => {
		const faceapi = await import("face-api.js");
		await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
		return faceapi;
	})().catch((err) => {
		// Reset supaya percobaan berikutnya (mis. setelah reconnect) bisa retry loading
		loadPromise = null;
		throw err;
	});

	return loadPromise;
}

/**
 * Deteksi wajah pada elemen <video> yang sedang streaming.
 * Mengembalikan array deteksi (bisa kosong) dengan skor & bounding box dalam
 * koordinat native video (px), BUKAN koordinat tampilan CSS.
 */
export async function detectFaces(faceapi, videoEl) {
	if (!videoEl || videoEl.readyState < 2) return [];

	const options = new faceapi.TinyFaceDetectorOptions({
		inputSize: 224,
		scoreThreshold: 0.5,
	});

	const results = await faceapi.detectAllFaces(videoEl, options);
	return results || [];
}

/**
 * Status hasil evaluasi posisi wajah terhadap bingkai oval panduan.
 * @typedef {"no-face"|"multiple-faces"|"too-far"|"too-close"|"off-center"|"ok"} FaceFitStatus
 */

/**
 * Evaluasi apakah wajah yang terdeteksi sudah pas di dalam bingkai oval.
 *
 * @param {Array} detections   hasil dari detectFaces()
 * @param {number} videoWidth  video.videoWidth (native px)
 * @param {number} videoHeight video.videoHeight (native px)
 * @param {number} containerAspect lebar/tinggi kontainer tampilan (mis. 3/4)
 * @param {{cx?: number, cy?: number, widthFrac?: number}} ovalConfig
 *   Posisi & ukuran oval dalam ruang KONTAINER (0..1). Default = oval di
 *   tengah persis seperti mode "face" biasa. Untuk mode "face_card" (selfie
 *   + KTP), oval digeser ke atas dan diperkecil lewat parameter ini, supaya
 *   evaluasi tetap akurat mengikuti posisi oval yang benar-benar tampil di UI.
 *   Catatan: karena oval selalu punya aspect ratio yang sama dengan
 *   kontainer, widthFrac juga berlaku sebagai fraksi tinggi oval.
 * @returns {{status: FaceFitStatus}}
 */
export function evaluateFaceFit(detections, videoWidth, videoHeight, containerAspect = 3 / 4, ovalConfig = {}) {
	if (!detections || detections.length === 0) {
		return { status: "no-face" };
	}
	if (detections.length > 1) {
		return { status: "multiple-faces" };
	}

	const box = detections[0].box;
	if (!videoWidth || !videoHeight) return { status: "no-face" };

	const { cx = 0.5, cy = 0.5, widthFrac = 0.62 } = ovalConfig;
	const halfOval = widthFrac / 2;

	const videoAspect = videoWidth / videoHeight;

	// Berapa fraksi frame asli yang benar-benar terlihat setelah di-crop oleh object-cover.
	// (Crop selalu simetris di tengah karena object-position default = 50% 50%.)
	const visibleWidthFrac = videoAspect > containerAspect ? containerAspect / videoAspect : 1;
	const visibleHeightFrac = videoAspect < containerAspect ? videoAspect / containerAspect : 1;

	// Konversi titik/ukuran dari ruang kontainer (0..1) ke ruang frame video asli (0..1).
	// Distribusi crop linear & simetris di tengah, jadi transformasinya:
	// videoNorm = 0.5 + (containerNorm - 0.5) * visibleFrac
	const toVideoX = (containerX) => 0.5 + (containerX - 0.5) * visibleWidthFrac;
	const toVideoY = (containerY) => 0.5 + (containerY - 0.5) * visibleHeightFrac;

	const xMin = toVideoX(cx - halfOval);
	const xMax = toVideoX(cx + halfOval);
	const yMin = toVideoY(cy - halfOval);
	const yMax = toVideoY(cy + halfOval);
	const ovalWidthNorm = xMax - xMin;
	const ovalCxVideo = toVideoX(cx);
	const ovalCyVideo = toVideoY(cy);

	// Bounding box wajah dinormalisasi (0..1) terhadap frame video asli
	const fx1 = box.x / videoWidth;
	const fy1 = box.y / videoHeight;
	const fx2 = (box.x + box.width) / videoWidth;
	const fy2 = (box.y + box.height) / videoHeight;
	const faceCx = (fx1 + fx2) / 2;
	const faceCy = (fy1 + fy2) / 2;
	const faceWidthNorm = fx2 - fx1;

	// 1) Wajah harus (kurang lebih) di tengah bingkai oval
	const centerToleranceX = ovalWidthNorm * 0.35;
	const centerToleranceY = (yMax - yMin) * 0.35;
	const offCenter = Math.abs(faceCx - ovalCxVideo) > centerToleranceX || Math.abs(faceCy - ovalCyVideo) > centerToleranceY;

	// 2) Ukuran wajah relatif terhadap lebar oval -> deteksi "terlalu jauh" / "terlalu dekat"
	const sizeRatio = faceWidthNorm / ovalWidthNorm;

	if (offCenter) return { status: "off-center" };
	if (sizeRatio < 0.55) return { status: "too-far" };
	if (sizeRatio > 1.35) return { status: "too-close" };

	// 3) Wajah tidak boleh terpotong tepi frame (indikasi posisi terlalu ke pinggir/dekat)
	const EDGE_MARGIN = 0.02;
	if (fx1 < EDGE_MARGIN || fy1 < EDGE_MARGIN || fx2 > 1 - EDGE_MARGIN || fy2 > 1 - EDGE_MARGIN) {
		return { status: "too-close" };
	}

	return { status: "ok" };
}

/** Pesan panduan singkat untuk masing-masing status, ditampilkan di UI. */
export const FACE_STATUS_MESSAGE = {
	loading: "Menyiapkan pendeteksi wajah...",
	"no-face": "Wajah belum terdeteksi",
	"multiple-faces": "Hanya boleh ada 1 wajah di dalam bingkai",
	"off-center": "Posisikan wajah ke tengah bingkai",
	"too-far": "Dekatkan wajah ke kamera",
	"too-close": "Jauhkan sedikit wajah dari kamera",
	ok: "Wajah pas! Silakan ambil foto",
	error: "Deteksi wajah tidak tersedia, silakan ambil foto secara manual",
};