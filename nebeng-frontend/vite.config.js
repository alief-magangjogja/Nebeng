import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	optimizeDeps: {
		// Pre-bundle library berat supaya halaman peta (Leaflet), QR code & scanner
		// tidak nge-compile dari nol pas pertama kali dibuka (mengurangi
		// jeda loading pas navigasi pertama ke halaman tersebut).
		include: [
			"leaflet",
			"react-leaflet",
			"react-qr-code",
			"html5-qrcode",
			"lucide-react",
			"react-router-dom",
			"axios",
			"react-hot-toast",
		],
		// face-api.js sengaja TIDAK di-include di sini karena sangat besar
		// (~2.8 MB) dan hanya dipakai di halaman verifikasi (sudah dynamic
		// import di faceDetection.js). Pre-bundle malah bikin dev server
		// lambat startup tanpa manfaat (library ini hanya di-load on-demand).
		//
		// laravel-echo & pusher-js juga dikeluarkan karena hanya dipakai
		// di halaman chat/realtime tertentu, bukan di setiap halaman.
	},
	build: {
		// Pisahkan vendor libraries besar ke chunk terpisah supaya:
		// 1. Browser bisa cache masing-masing chunk independen
		// 2. Initial bundle (halaman login/dashboard) jauh lebih kecil
		// 3. Library yang jarang berubah tidak perlu re-download tiap deploy
		rollupOptions: {
			output: {
				manualChunks: {
					// Core React - dipakai semua halaman, tapi pisahkan
					// supaya app code changes tidak invalidate React cache
					"vendor-react": ["react", "react-dom", "react-router-dom"],

					// UI libraries
					"vendor-ui": ["lucide-react", "react-hot-toast"],

					// Maps - hanya dipakai di beberapa halaman
					"vendor-maps": ["leaflet", "react-leaflet"],

					// Realtime - hanya dipakai di chat & tracking
					"vendor-realtime": ["laravel-echo", "pusher-js"],

					// QR code generator & scanner
					"vendor-qr": ["react-qr-code", "html5-qrcode"],
				},
			},
		},
		// Naikkan batas warning supaya tidak flooding console
		chunkSizeWarningLimit: 600,
		// Aktifkan minification yang lebih agresif
		minify: "esbuild",
		// Bersihkan console.log di production build
		esbuild: {
			drop: ["debugger"],
		},
	},
	server: {
		// Warmup file-file yang sering diakses supaya dev server
		// tidak perlu compile on-the-fly saat pertama kali dibuka
		warmup: {
			clientFiles: [
				"./src/main.jsx",
				"./src/App.jsx",
				"./src/router/Router.jsx",
				"./src/context/UserContext.jsx",
				"./src/pages/Login.jsx",
				"./src/components/dashboard/AdminLayout.jsx",
				"./src/components/dashboard/Sidebar.jsx",
				"./src/components/dashboard/PosMitraLayout.jsx",
				"./src/components/dashboard/PosMitraSidebar.jsx",
				"./src/pages/admin/Dashboard.jsx",
				"./src/pages/pos_mitra/Dashboard.jsx",
			],
		},
	},
});