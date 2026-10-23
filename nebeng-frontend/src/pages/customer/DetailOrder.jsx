import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, User, Phone, Receipt, ShieldCheck, ArrowRight } from "lucide-react";

export default function DetailOrder() {
	const { tripId } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();

	const type = searchParams.get("type");
	const origin_id = searchParams.get("origin_id");
	const destination_id = searchParams.get("destination_id");
	const date = searchParams.get("date");
	const backUrl = `/customer/order-${type}?origin_id=${origin_id}&destination_id=${destination_id}&date=${date}`;

	// size & description sengaja dibaca dari URL (searchParams), BUKAN dari
	// location.state - karena state hilang kalau halaman ini di-refresh,
	// sedangkan URL tetap utuh. Foto (image/preview) tetap dari state,
	// karena File tidak bisa dititip lewat URL.
	const barangSize = searchParams.get("size") || "";
	const barangDescription = searchParams.get("description") || "";
	const barangState = location.state || {};

	const [isAgreed, setIsAgreed] = useState(false);
	const [trip, setTrip] = useState(null);
	const [customer] = useState(() => {
		const userData = localStorage.getItem("user");
		return userData ? JSON.parse(userData) : null;
	});

	useEffect(() => {
		const fetchTrip = async () => {
			try {
				const res = await fetch(`http://127.0.0.1:8000/api/trips/${tripId}`);
				const data = await res.json();

				setTrip(data);
			} catch (error) {
				console.error("Error fetch trip:", error);
			}
		};

		fetchTrip();
	}, [tripId]);

	// Sama seperti mapping berat di OrderBarang.jsx / backend - dipakai
	// untuk menghitung ulang harga proporsional trip barang di sini,
	// supaya konsisten dengan yang tampil di halaman sebelumnya.
	// Mendukung DUA kosakata sekaligus: baru (XS/S/M/L/XL) & lama
	// (xxs/xs/kecil/sedang/besar). JANGAN di-lowercase sebelum
	// dicocokkan - "XS" (baru, 0.5kg) kalau di-lowercase jadi "xs" akan
	// tabrakan sama kunci lama 'xs' (1kg).
	const capacityMap = {
		xxs: 0.5,
		xs: 1,
		kecil: 5,
		sedang: 10,
		besar: 15,

		XS: 0.5,
		S: 1,
		M: 5,
		L: 10,
		XL: 15,
	};

	const orderDetail = trip
		? {
				noPemesanan: `FR-${trip.id}`,
				date: trip.departure_date,
				time: trip.departure_time,
				from: trip.origin_point.city.name,
				fromPos: trip.origin_point.pos_name,
				fromDetail: trip.origin_point.address,
				to: trip.destination_point.city.name,
				toPos: trip.destination_point.pos_name,
				toDetail: trip.destination_point.address,

				biaya: (() => {
					if (type !== "barang") return trip.price;

					const requestedWeight = capacityMap[barangSize] ?? 0.5;
					const tripCapacity = capacityMap[trip.baggage_capacity] ?? trip.seat_total ?? requestedWeight;

					return tripCapacity > 0 ? Math.round((trip.price / tripCapacity) * requestedWeight) : trip.price;
				})(),

				driver: {
					nama: trip.mitra?.name || "Driver",
					telp: trip.mitra?.phone || "-",
				},

				customer: {
					nama: customer?.name || "Customer",
					telp: customer?.phone || "-",
				},
			}
		: null;

	if (!orderDetail || !customer) {
		return (
			<CustomerLayout>
				<div className="p-10 text-center">Loading...</div>
			</CustomerLayout>
		);
	}

	const handlePayment = () => {
		const isBarang = type === "barang";

		const orderData = {
			trip_id: trip.id,
			customer_id: customer.id,
			type: isBarang ? "barang" : "penumpang",

			no_pemesanan: orderDetail.noPemesanan,
			date: orderDetail.date,
			time: orderDetail.time,

			origin: orderDetail.from,
			destination: orderDetail.to,

			pickup_address: orderDetail.fromDetail,
			drop_address: orderDetail.toDetail,

			price: orderDetail.biaya,

			// dipakai Pembayaran.jsx untuk menyembunyikan/nonaktifkan opsi
			// QRIS kalau mitra trip ini belum upload QRIS - trip.mitra.profile
			// sudah ikut di-load lewat endpoint GET /api/trips/{id}.
			has_qris: !!trip.mitra?.profile?.qris_image,

			driver: orderDetail.driver,
			customer: orderDetail.customer,

			// Field tambahan yang dibutuhkan POST /api/item-orders di halaman
			// Pembayaran, khusus untuk order barang.
			...(isBarang && {
				origin_point_id: origin_id,
				destination_point_id: destination_id,
				delivery_date: date,
				size: barangSize,
				item_description: barangDescription,
			}),
		};

		// simpan sementara ke localStorage (foto TIDAK ikut disimpan di sini
		// karena File tidak bisa di-JSON.stringify - foto diteruskan lewat
		// navigate state di bawah)
		localStorage.setItem("pending_order", JSON.stringify(orderData));

		// redirect ke pembayaran
		navigate("/customer/pembayaran", {
			state: isBarang
				? {
						image: barangState.image,
						preview: barangState.preview,
					}
				: undefined,
		});
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<Link to={backUrl}>
						<button className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
							<ChevronLeft className="w-6 h-6 text-indigo-900" />
						</button>
					</Link>

					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Detail Pesanan</h1>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* KIRI */}
					<div className="lg:col-span-7 space-y-6">
						{/* DETAIL RUTE */}
						<div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100">
							<div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
								<span className="text-xs font-black text-gray-300 uppercase tracking-widest">No Pemesanan:</span>
								<span className="text-sm font-black text-indigo-900">{orderDetail.noPemesanan}</span>
							</div>

							<div className="mb-8 bg-gray-50 rounded-2xl p-6	">
								<p className="text-sm font-bold text-gray-400 mb-6">
									{orderDetail.date} | {orderDetail.time}
								</p>

								<div className="relative pl-8 space-y-5 ">
									<div className="bg-white p-3 rounded-xl">
										<div className="flex items-center gap-2 flex-wrap mb-2">
											<h3 className="font-black text-gray-800 text-lg">{orderDetail.from}</h3>
											{orderDetail.fromPos && <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">{orderDetail.fromPos}</span>}
										</div>
										<p className="text-xs text-gray-400">{orderDetail.fromDetail}</p>
									</div>

									<div className="bg-white p-3 rounded-xl">
										<div className="flex items-center gap-2 flex-wrap mb-2">
											<h3 className="font-black text-gray-800 text-lg">{orderDetail.to}</h3>
											{orderDetail.toPos && <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg uppercase">{orderDetail.toPos}</span>}
										</div>
										<p className="text-xs text-gray-400">{orderDetail.toDetail}</p>
									</div>
								</div>
							</div>

							<div className="p-6 border-t rounded-2xl bg-gray-50 border-gray-50 flex justify-between items-center">
								<span className="text-sm font-bold text-gray-500">Biaya</span>
								<span className="text-xl font-black text-indigo-900">Rp {orderDetail.biaya.toLocaleString("id-ID")},00</span>
							</div>
						</div>

						{/* CARD DRIVER */}
						<div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100">
							<h3 className="font-black text-indigo-900 text-lg mb-6">Driver / Mitra</h3>

							<div className="bg-gray-50 rounded-2xl p-6 space-y-4">
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-3 text-gray-500">
										<User size={18} />
										<span className="text-sm font-medium">Nama Driver</span>
									</div>

									<span className="text-sm font-bold text-gray-800">{orderDetail.driver.nama}</span>
								</div>
							</div>
						</div>

						{/* CARD CUSTOMER */}
						<div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100">
							<h3 className="font-black text-indigo-900 text-lg mb-6">Customer / Pemesan</h3>

							<div className="bg-gray-50 rounded-2xl p-6 space-y-4">
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-3 text-gray-500">
										<User size={18} />
										<span className="text-sm font-medium">Nama Customer</span>
									</div>

									<span className="text-sm font-bold text-gray-800">{orderDetail.customer.nama}</span>
								</div>

								<div className="flex justify-between items-center">
									<div className="flex items-center gap-3 text-gray-500">
										<Phone size={18} />
										<span className="text-sm font-medium">No. Tlp</span>
									</div>

									<span className="text-sm font-bold text-gray-800">{orderDetail.customer.telp}</span>
								</div>
							</div>
						</div>
					</div>

					{/* SISI KANAN: Ringkasan Pembayaran (5 Kolom) */}
					<div className="lg:col-span-5 sticky top-6">
						<div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100">
							<div className="flex items-center gap-3 mb-8">
								<div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
									<Receipt size={24} />
								</div>
								<h3 className="text-xl font-black text-indigo-900">Total Pembayaran</h3>
							</div>

							<div className="bg-indigo-900 rounded-3xl p-6 text-white mb-8 shadow-lg shadow-indigo-100 text-center">
								<p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Harus Dibayar</p>
								<h2 className="text-3xl font-black">Rp {orderDetail.biaya.toLocaleString("id-ID")},00</h2>
							</div>

							<div className="space-y-6">
								<label className="flex items-start gap-4 cursor-pointer group">
									<div className="relative flex items-center">
										<input
											type="checkbox"
											className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-gray-200 checked:bg-indigo-600 checked:border-indigo-600 transition-all"
											onChange={(e) => setIsAgreed(e.target.checked)}
										/>
										<ShieldCheck className="absolute left-1 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
									</div>
									<span className="text-xs text-gray-500 leading-relaxed font-medium">
										Saya telah membaca dan setuju terhadap <span className="text-indigo-600 font-bold hover:underline">Syarat dan ketentuan pembelian tiket</span>
									</span>
								</label>

								<button
									onClick={handlePayment}
									disabled={!isAgreed}
									className={`w-full py-5 rounded-3xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
										isAgreed ? "bg-indigo-900 text-white shadow-indigo-200 hover:bg-indigo-800 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
									}`}
								>
									Lanjutkan Pembayaran
									<ArrowRight size={20} />
								</button>
							</div>

							<div className="mt-8 pt-6 border-t border-gray-50">
								<div className="flex items-center gap-3 text-emerald-500">
									<ShieldCheck size={16} />
									<span className="text-[10px] font-bold uppercase tracking-widest">Pembayaran Aman & Terenkripsi</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}	