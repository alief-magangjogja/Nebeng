import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "../middleware/ProtectedRoute";
import { useTrackNavigationStack } from "../utils/navigationStack";

// Semua halaman di-lazy-load (code-splitting per route) supaya initial
// bundle jauh lebih kecil dan tiap halaman hanya memuat JS miliknya
// sendiri, bukan seluruh aplikasi (admin+customer+mitra+pos_mitra sekaligus).
const Login = lazy(() => import("../pages/Login"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Register = lazy(() => import("../pages/Register"));


/* ADMIN */	
const Dashboard = lazy(() => import("../pages/admin/Dashboard"));
const Pesanan = lazy(() => import("../pages/admin/Pesanan"));
const Laporan = lazy(() => import("../pages/admin/Laporan"));
const Refund = lazy(() => import("../pages/admin/Refund"));
const BlokirCustomer = lazy(() => import("../pages/admin/BlokirCustomer"));
const BlokirMitra = lazy(() => import("../pages/admin/BlokirMitra"));
const BandingMitra = lazy(() => import("../pages/admin/BandingMitra"));
const DaftarCustomer = lazy(() => import("../pages/admin/DaftarCustomer"));
const DaftarMitra = lazy(() => import("../pages/admin/DaftarMitra"));
const KendaraanMitra = lazy(() => import("../pages/admin/KendaraanMitra"));
const Setting = lazy(() => import("../pages/admin/Setting"));
const VerifikasiCustomer = lazy(() => import("../pages/admin/VerifikasiCustomer"));
const VerifikasiMitra = lazy(() => import("../pages/admin/VerifikasiMitra"));
const NotifikasiAdmin = lazy(() => import("../pages/admin/Notifikasi"));
const DetailMitraAdmin = lazy(() => import("../pages/admin/DetailMitra"));
const DetailCustomerAdmin = lazy(() => import("../pages/admin/DetailCustomer"));
const DetailOrderAdmin = lazy(() => import("../pages/admin/DetailOrder"));
const ProfileAdmin = lazy(() => import("../pages/admin/Profile"));
const EditProfileAdmin = lazy(() => import("../pages/admin/EditProfile"));
const AturPasswordAdmin = lazy(() => import("../pages/admin/AturPassword"));
const AturHarga = lazy(() => import("../pages/admin/PricingManagement"));
const PickupPointManagement = lazy(() => import("../pages/admin/PickupPointManagement"));
const PosMitraManagement = lazy(() => import("../pages/admin/PosMitraManagement"));
const KelolaReward = lazy(() => import("../pages/admin/KelolaReward"));
const Pendapatan = lazy(() => import("../pages/admin/Pendapatan"));
const AdminSosMonitor = lazy(() => import("../pages/admin/AdminSosMonitor"));

/* CUSTOMER */
const DashboardCustomer = lazy(() => import("../pages/customer/Dashboard"));
const NebengMotor = lazy(() => import("../pages/customer/NebengMotor"));
const NebengMobil = lazy(() => import("../pages/customer/NebengMobil"));
const NebengBarang = lazy(() => import("../pages/customer/NebengBarang"));
const Riwayat = lazy(() => import("../pages/customer/Riwayat"));
const Pesan = lazy(() => import("../pages/customer/Pesan"));
const Profile = lazy(() => import("../pages/customer/Profile"));
const Notifikasi = lazy(() => import("../pages/customer/Notifikasi"));
const OrderMotor = lazy(() => import("../pages/customer/OrderMotor"));
const OrderMobil = lazy(() => import("../pages/customer/OrderMobil"));
const OrderBarang = lazy(() => import("../pages/customer/OrderBarang"));
const DetailOrder = lazy(() => import("../pages/customer/DetailOrder"));
const Pembayaran = lazy(() => import("../pages/customer/Pembayaran"));
const PembayaranSelesai = lazy(() => import("../pages/customer/PembayaranSelesai"));
const RefundCustomer = lazy(() => import("../pages/customer/Refund"));
const EditProfile = lazy(() => import("../pages/customer/EditProfile"));
const RekeningSaya = lazy(() => import("../pages/customer/RekeningSaya"));
const Alamat = lazy(() => import("../pages/customer/Alamat"));
const Keamanan = lazy(() => import("../pages/customer/Keamanan"));
const CustomerDokumen = lazy(() => import("../pages/customer/Dokumen"));
const PusatBantuan = lazy(() => import("../pages/customer/PusatBantuan"));
const UploadBuktiPembayaran = lazy(() => import("../pages/customer/UploadBuktiPembayaran"));
const AturPIN = lazy(() => import("../pages/customer/AturPIN"));
const AturPassword = lazy(() => import("../pages/customer/AturPassword"));
const KonfirmasiPIN = lazy(() => import("../pages/customer/KonfirmasiPIN"));
const RewardPoints = lazy(() => import("../pages/customer/RewardPoint"));
const RewardHistory = lazy(() => import("../pages/customer/RewardHistory"));
const Verification = lazy(() => import("../pages/customer/Verification"));
const PerjalananCustomer = lazy(() => import("../pages/customer/PerjalananCustomer"));
const DetailPesanan = lazy(() => import("../pages/customer/Pesanan"));
const BeriRating = lazy(() => import("../pages/customer/BeriRating"));
const MitraPublicProfile = lazy(() => import("../pages/customer/MitraProfile"));
const PelanggaranCustomer = lazy(() => import("../pages/customer/PelanggaranCustomer"));

/* MITRA */
const DashboardMitra = lazy(() => import("../pages/mitra/Dashboard"));
const TambahNebengMotor = lazy(() => import("../pages/mitra/NebengMotor"));
const TambahNebengMobil = lazy(() => import("../pages/mitra/NebengMobil"));
const TambahNebengBarang = lazy(() => import("../pages/mitra/NebengBarang"));
const PesanMitra = lazy(() => import("../pages/mitra/Pesan"));
const MitraProfile = lazy(() => import("../pages/mitra/Profile"));
const QrisSaya = lazy(() => import("../pages/mitra/QrisSaya"));
const MitraRiwayat = lazy(() => import("../pages/mitra/Riwayat"));
const StatusAkun = lazy(() => import("../pages/mitra/StatusAkun"));
const Teguran = lazy(() => import("../pages/mitra/Teguran"));
const KendaraanSaya = lazy(() => import("../pages/mitra/KendaraanSaya"));
const KeamananMitra = lazy(() => import("../pages/mitra/Keamanan"));
const PusatBantuanMitra = lazy(() => import("../pages/mitra/PusatBantuan"));
const Dokumen = lazy(() => import("../pages/mitra/Dokumen"));
const EditProfileMitra = lazy(() => import("../pages/mitra/EditProfile"));
const KonfirmasiTebengan = lazy(() => import("../pages/mitra/KonfirmasiTebengan"));
const DetailTebenganMitra = lazy(() => import("../pages/mitra/DetailTebengan"));
const RiwayatSaldo = lazy(() => import("../pages/mitra/RiwayatSaldo"));
const TarikSaldo = lazy(() => import("../pages/mitra/TarikSaldo"));
const AturPINMitra = lazy(() => import("../pages/mitra/AturPIN"));
const KonfirmasiPINMitra = lazy(() => import("../pages/mitra/KonfirmasiPIN"));
const AturPasswordMitra = lazy(() => import("../pages/mitra/AturPassword"));
const NotifikasiMitra = lazy(() => import("../pages/mitra/Notifikasi"));
const KonfirmasiWithdrawPIN = lazy(() => import("../pages/mitra/KonfirmasiWithdrawPIN"));
const VerificationMitra = lazy(() => import("../pages/mitra/Verification"));
const PerjalananMitra = lazy(() => import("../pages/mitra/PerjalananMitra"));
const BeriRatingMitra = lazy(() => import("../pages/mitra/BeriRatingMitra"));
const CustomerProfileMitra = lazy(() => import("../pages/mitra/CustomerProfile"));
const RatingUlasanMitra = lazy(() => import("../pages/mitra/RatingUlasan"));

// Pos Mitra
const DashboardPosMitra = lazy(() => import("../pages/pos_mitra/Dashboard"));
const Aktivitas = lazy(() => import("../pages/pos_mitra/Aktivitas"));
const DetailAktivitas = lazy(() => import("../pages/pos_mitra/DetailAktivitas"));
const Scan = lazy(() => import("../pages/pos_mitra/Scan"));
const ProfilePosMitra = lazy(() => import("../pages/pos_mitra/Profile"));
const EditProfilePosMitra = lazy(() => import("../pages/pos_mitra/EditProfile"));
const AturPINPosMitra = lazy(() => import("../pages/pos_mitra/AturPin"));
const AturPasswordPosMitra = lazy(() => import("../pages/pos_mitra/AturPassword"));
const KlaimVoucher = lazy(() => import("../pages/pos_mitra/KlaimVoucher"));
const NotifikasiPosMitra = lazy(() => import("../pages/pos_mitra/Notifikasi"));
const KeamananPosMitra = lazy(() => import("../pages/pos_mitra/Keamanan"));
const PusatBantuanPosMitra = lazy(() => import("../pages/pos_mitra/PusatBantuan"));

function RouteLoadingFallback() {
	return (
		<div className="h-screen w-full flex items-center justify-center bg-gray-50">
			<div className="flex flex-col items-center gap-3">
				<div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-900 rounded-full animate-spin"></div>
				<p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Memuat halaman...</p>
			</div>
		</div>
	);
}

function AppRouter() {
	const location = useLocation();
	// Melacak setiap perubahan route ke riwayat navigasi buatan sendiri
	// (sessionStorage) - dipakai oleh useAppNavigate untuk tombol "kembali"
	// yang tetap berfungsi walau iframe mode-preview-mobile dibuat ulang
	// setelah refresh. Lihat utils/navigationStack.js untuk detailnya.
	useTrackNavigationStack(location);

	// Prefetch halaman-halaman yang sering dibuka berdasarkan role user
	// saat browser idle, supaya saat diklik dari sidebar langsung muncul instan (< 1 detik)
	useEffect(() => {
		const role = localStorage.getItem("role");
		const timer = setTimeout(() => {
			if (role === "admin") {
				import("../pages/admin/Dashboard");
				import("../pages/admin/Pesanan");
				import("../pages/admin/DaftarMitra");
				import("../pages/admin/DaftarCustomer");
				import("../pages/admin/Refund");
				import("../pages/admin/KendaraanMitra");
				import("../pages/admin/VerifikasiMitra");
				import("../pages/admin/VerifikasiCustomer");
				import("../pages/admin/Pendapatan");
				import("../pages/admin/PosMitraManagement");
			} else if (role === "pos_mitra") {
				import("../pages/pos_mitra/Dashboard");
				import("../pages/pos_mitra/Aktivitas");
				import("../pages/pos_mitra/Scan");
				import("../pages/pos_mitra/KlaimVoucher");
				import("../pages/pos_mitra/Profile");
			}
		}, 800);

		return () => clearTimeout(timer);
	}, []);

	return (
		<Suspense fallback={<RouteLoadingFallback />}>
		<Routes>
			{/* PUBLIC */}
			<Route path="/" element={<Login />} />
			<Route path="/login" element={<Login />} />
			<Route path="/forgot-password" element={<ForgotPassword />} />
			<Route path="/reset-password" element={<ResetPassword />} />
			<Route path="/register" element={<Register />} />

			{/* ================= ADMIN ================= */}

			<Route
				path="/admin/dashboard"
				element={
					<ProtectedRoute role="admin">
						<Dashboard />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/profil"
				element={
					<ProtectedRoute role="admin">
						<ProfileAdmin />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/edit-profile"
				element={
					<ProtectedRoute role="admin">
						<EditProfileAdmin />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/atur-password"
				element={
					<ProtectedRoute role="admin">
						<AturPasswordAdmin />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/pesanan"
				element={
					<ProtectedRoute role="admin">
						<Pesanan />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/pengaturan/tarif"
				element={
					<ProtectedRoute role="admin">
						<AturHarga />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/pengaturan/pickup-point"
				element={
					<ProtectedRoute role="admin">
						<PickupPointManagement />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/pos-mitra"
				element={
					<ProtectedRoute role="admin">
						<PosMitraManagement />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/rewards"
				element={
					<ProtectedRoute role="admin">
						<KelolaReward />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/sos-monitor"
				element={
					<ProtectedRoute role="admin">
						<AdminSosMonitor />
					</ProtectedRoute>
				}
			/>
			
			<Route
				path="/admin/pendapatan"
				element={
					<ProtectedRoute role="admin">
						<Pendapatan />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/laporan"
				element={
					<ProtectedRoute role="admin">
						<Laporan />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/refund"
				element={
					<ProtectedRoute role="admin">
						<Refund />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/blokir-customer"
				element={
					<ProtectedRoute role="admin">
						<BlokirCustomer />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/blokir-mitra"
				element={
					<ProtectedRoute role="admin">
						<BlokirMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/banding-mitra"
				element={
					<ProtectedRoute role="admin">
						<BandingMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/detail-mitra/:mitraId"
				element={
					<ProtectedRoute role="admin">
						<DetailMitraAdmin />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/detail-orders/:tripId"
				element={
					<ProtectedRoute role="admin">
						<DetailOrderAdmin />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/detail-customer/:customerId"
				element={
					<ProtectedRoute role="admin">
						<DetailCustomerAdmin />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/customer"
				element={
					<ProtectedRoute role="admin">
						<DaftarCustomer />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/mitra"
				element={
					<ProtectedRoute role="admin">
						<DaftarMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/kendaraan-mitra"
				element={
					<ProtectedRoute role="admin">
						<KendaraanMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/settings"
				element={
					<ProtectedRoute role="admin">
						<Setting />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/verifikasi-customer"
				element={
					<ProtectedRoute role="admin">
						<VerifikasiCustomer />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/verifikasi-mitra"
				element={
					<ProtectedRoute role="admin">
						<VerifikasiMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/admin/notifikasi"
				element={
					<ProtectedRoute role="admin">
						<NotifikasiAdmin />
					</ProtectedRoute>
				}
			/>

			{/* ================= CUSTOMER ================= */}

			<Route
				path="/customer/dashboard"
				element={
					<ProtectedRoute role="customer">
						<DashboardCustomer />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/verification"
				element={
					<ProtectedRoute role="customer">
						<Verification />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/nebeng-motor"
				element={
					<ProtectedRoute role="customer">
						<NebengMotor />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/nebeng-mobil"
				element={
					<ProtectedRoute role="customer">
						<NebengMobil />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/nebeng-barang"
				element={
					<ProtectedRoute role="customer">
						<NebengBarang />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/perjalanan/:tripId"
				element={
					<ProtectedRoute role="customer">
						<PerjalananCustomer />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/riwayat"
				element={
					<ProtectedRoute role="customer">
						<Riwayat />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/pesanan/:orderId"
				element={
					<ProtectedRoute role="customer">
						<DetailPesanan />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/beri-rating/:tripId"
				element={
					<ProtectedRoute role="customer">
						<BeriRating />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/mitra/:mitraId"
				element={
					<ProtectedRoute role="customer">
						<MitraPublicProfile />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/pesan"
				element={
					<ProtectedRoute role="customer">
						<Pesan />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/profil"
				element={
					<ProtectedRoute role="customer">
						<Profile />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/edit-profile"
				element={
					<ProtectedRoute role="customer">
						<EditProfile />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/rekening"
				element={
					<ProtectedRoute role="customer">
						<RekeningSaya />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/alamat"
				element={
					<ProtectedRoute role="customer">
						<Alamat />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/customer/keamanan"
				element={
					<ProtectedRoute role="customer">
						<Keamanan />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/customer/dokumen"
				element={
					<ProtectedRoute role="customer">
						<CustomerDokumen />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/pelanggaran"
				element={
					<ProtectedRoute role="customer">
						<PelanggaranCustomer />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/pusat-bantuan"
				element={
					<ProtectedRoute role="customer">
						<PusatBantuan />
					</ProtectedRoute>
				}
			/>

			<Route
			path="/customer/upload-bukti-pembayaran/:orderId?"
			element={
				<ProtectedRoute role="customer">
					<UploadBuktiPembayaran />
				</ProtectedRoute>
			}
		/>

			<Route
				path="/customer/atur-pin"
				element={
					<ProtectedRoute role="customer">
						<AturPIN />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/konfirmasi-pin"
				element={
					<ProtectedRoute role="customer">
						<KonfirmasiPIN />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/atur-password"
				element={
					<ProtectedRoute role="customer">
						<AturPassword />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/reward-points"
				element={
					<ProtectedRoute role="customer">
						<RewardPoints />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/reward-history"
				element={
					<ProtectedRoute role="customer">
						<RewardHistory />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/notifikasi"
				element={
					<ProtectedRoute role="customer">
						<Notifikasi />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/order-motor"
				element={
					<ProtectedRoute role="customer">
						<OrderMotor />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/order-mobil"
				element={
					<ProtectedRoute role="customer">
						<OrderMobil />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/order-barang"
				element={
					<ProtectedRoute role="customer">
						<OrderBarang />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/detail-order/:tripId"
				element={
					<ProtectedRoute role="customer">
						<DetailOrder />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/pembayaran"
				element={
					<ProtectedRoute role="customer">
						<Pembayaran />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/pembayaran-selesai"
				element={
					<ProtectedRoute role="customer">
						<PembayaranSelesai />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/customer/refund"
				element={
					<ProtectedRoute role="customer">
						<RefundCustomer />
					</ProtectedRoute>
				}
			/>

			{/* ================= MITRA ================= */}

			<Route
				path="/mitra/dashboard"
				element={
					<ProtectedRoute role="mitra">
						<DashboardMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/verification"
				element={
					<ProtectedRoute role="mitra">
						<VerificationMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/nebeng-motor"
				element={
					<ProtectedRoute role="mitra">
						<TambahNebengMotor />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/nebeng-mobil"
				element={
					<ProtectedRoute role="mitra">
						<TambahNebengMobil />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/nebeng-barang"
				element={
					<ProtectedRoute role="mitra">
						<TambahNebengBarang />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/konfirmasi-tebengan"
				element={
					<ProtectedRoute role="mitra">
						<KonfirmasiTebengan />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/detail-tebengan/:tripId"
				element={
					<ProtectedRoute role="mitra">
						<DetailTebenganMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				// path="/mitra/perjalanan"
				path="/mitra/perjalanan/:tripId"
				element={
					<ProtectedRoute role="mitra">
						<PerjalananMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/beri-rating/:tripId/:customerId"
				element={
					<ProtectedRoute role="mitra">
						<BeriRatingMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/customer/:customerId"
				element={
					<ProtectedRoute role="mitra">
						<CustomerProfileMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/riwayat-saldo"
				element={
					<ProtectedRoute role="mitra">
						<RiwayatSaldo />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/rating-ulasan"
				element={
					<ProtectedRoute role="mitra">
						<RatingUlasanMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/konfirmasi-withdraw-pin"
				element={
					<ProtectedRoute role="mitra">
						<KonfirmasiWithdrawPIN />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/tarik-saldo"
				element={
					<ProtectedRoute role="mitra">
						<TarikSaldo />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/pesan-mitra"
				element={
					<ProtectedRoute role="mitra">
						<PesanMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/notifikasiMitra"
				element={
					<ProtectedRoute role="mitra">
						<NotifikasiMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/profil"
				element={
					<ProtectedRoute role="mitra">
						<MitraProfile />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/edit-profile"
				element={
					<ProtectedRoute role="mitra">
						<EditProfileMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/atur-pin"
				element={
					<ProtectedRoute role="mitra">
						<AturPINMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/konfirmasi-pin"
				element={
					<ProtectedRoute role="mitra">
						<KonfirmasiPINMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/atur-password"
				element={
					<ProtectedRoute role="mitra">
						<AturPasswordMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/riwayat"
				element={
					<ProtectedRoute role="mitra">
						<MitraRiwayat />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/status-akun"
				element={
					<ProtectedRoute role="mitra">
						<StatusAkun />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/teguran"
				element={
					<ProtectedRoute role="mitra">
						<Teguran />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/kendaraan"
				element={
					<ProtectedRoute role="mitra">
						<KendaraanSaya />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/keamanan"
				element={
					<ProtectedRoute role="mitra">
						<KeamananMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/pusat-bantuan"
				element={
					<ProtectedRoute role="mitra">
						<PusatBantuanMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/qris-saya"
				element={
					<ProtectedRoute role="mitra">
						<QrisSaya />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/mitra/dokumen"
				element={
					<ProtectedRoute role="mitra">
						<Dokumen />
					</ProtectedRoute>
				}
			/>

			{/* ================ POS MITRA ================ */}
			<Route
				path="/pos-mitra/dashboard"
				element={
					<ProtectedRoute role="pos_mitra">
						<DashboardPosMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/pos-mitra/aktivitas"
				element={
					<ProtectedRoute role="pos_mitra">
						<Aktivitas />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/pos-mitra/detail-aktivitas/:tripId"
				element={
					<ProtectedRoute role="pos_mitra">
						<DetailAktivitas />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/pos-mitra/scan"
				element={
					<ProtectedRoute role="pos_mitra">
						<Scan />
					</ProtectedRoute> 
				}
			/>

			<Route
				path="/pos-mitra/klaim-voucher"
				element={
					<ProtectedRoute role="pos_mitra">
						<KlaimVoucher />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/pos-mitra/profil"
				element={
					<ProtectedRoute role="pos_mitra">
						<ProfilePosMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/pos-mitra/edit-profile"
				element={
					<ProtectedRoute role="pos_mitra">
						<EditProfilePosMitra />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/pos-mitra/atur-pin"
				element={
					<ProtectedRoute role="pos_mitra">
						<AturPINPosMitra />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/pos-mitra/atur-password"
				element={
					<ProtectedRoute role="pos_mitra">
						<AturPasswordPosMitra />
					</ProtectedRoute>
				}
			/>

			<Route
				path="/pos-mitra/atur-password"
				element={
					<ProtectedRoute role="pos_mitra">
						<AturPasswordPosMitra />
					</ProtectedRoute>
				}
			/>

		<Route
			path="/pos-mitra/notifikasiMitra"
			element={
				<ProtectedRoute role="pos_mitra">
					<NotifikasiPosMitra />
				</ProtectedRoute>
			}
		/>

		<Route
			path="/pos-mitra/keamanan"
			element={
				<ProtectedRoute role="pos_mitra">
					<KeamananPosMitra />
				</ProtectedRoute>
			}
		/>

		<Route
			path="/pos-mitra/pusat-bantuan"
			element={
				<ProtectedRoute role="pos_mitra">
					<PusatBantuanPosMitra />
				</ProtectedRoute>
			}
		/>
		</Routes>
		</Suspense>
	);
}

export default AppRouter;