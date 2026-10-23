import React, { useState, useEffect } from "react";
import { ChevronLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { useLocation } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import AlertModal from "../../components/ui/AlertModal";

export default function KonfirmasiTebengan() {
	const navigate = useAppNavigate();
	const location = useLocation();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	// Pengganti window.alert() bawaan browser untuk pesan error saat gagal
	// membuat trip (mis. "Anda memiliki kewajiban refund QRIS yang belum
	// diselesaikan...") - sekarang tampil sebagai modal di tengah layar,
	// konsisten dengan AlertModal yang sudah dipakai di halaman lain.
	const [errorAlert, setErrorAlert] = useState({ show: false, message: "" });

	const [createdTripId, setCreatedTripId] = useState(null);

	const [mitra, setMitra] = useState(null);

	const [passengerPrice, setPassengerPrice] = useState(null);

	const [goodsPrice, setGoodsPrice] = useState(null);

	// ambil data dari page sebelumnya
	const tripData = location.state?.tripData;

	if (!tripData) {
		return (
			<MitraLayout>
				<div className="p-10 text-center">Data tebengan tidak ditemukan</div>
			</MitraLayout>
		);
	}

	useEffect(() => {
		const fetchMitra = async () => {
			try {
				const res = await fetch("http://127.0.0.1:8000/api/profile", {
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
						Accept: "application/json",
					},
				});

				const data = await res.json();

				setMitra(data);
			} catch (err) {
				console.error("Gagal mengambil data mitra:", err);
			}
		};

		fetchMitra();
	}, []);

		// mitra belum upload QRIS -> tidak boleh membuat trip (kalau tetap
		// diklik, backend juga akan menolak - ini cuma supaya mitra langsung
		// tahu alasannya di sini, tanpa perlu klik dulu).
		const qrisMissing = mitra !== null && !mitra?.profile?.qris_image;

	const handleConfirm = async () => {
		try {
			setLoading(true);

			const res = await fetch("http://127.0.0.1:8000/api/mitra/trips", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer " + localStorage.getItem("token"),
				},
				body: JSON.stringify(tripData),
			});

			const text = await res.text();

			console.log(text);

			let data;

			try {
				data = JSON.parse(text);
			} catch {
				throw new Error(text);
			}

			if (!res.ok) {
				throw new Error(data.message || "Gagal membuat trip");
			}

			setCreatedTripId(data.trip.id);

			setIsModalOpen(true);
		} catch (err) {
			console.error(err);

			setErrorAlert({ show: true, message: err.message });
		} finally {
			setLoading(false);
		}
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);

		if (createdTripId) {
			navigate(`/mitra/detail-tebengan/${createdTripId}`);
		} else {
			navigate("/mitra/dashboard"); // fallback
		}
	};

	useEffect(() => {
		const fetchPreview = async () => {
			try {
				const isBarangOnly = tripData.tebengan_type === "Barang";
				const isBarangDanTebengan = tripData.tebengan_type === "Barang dan Tebengan";

				// ====================================
				// TRIP BARANG MURNI
				// vehicle_type di sini SUDAH "Barang-Motor"/"Barang-Mobil"
				// (lihat NebengBarang.jsx) - WAJIB sertakan baggage_capacity,
				// kalau tidak TripPricingService menghitung tanpa kapasitas
				// dan hasilnya beda dari harga final yang tersimpan di trip.
				// ====================================
				if (isBarangOnly) {
					const goodsRes = await fetch("http://127.0.0.1:8000/api/trips/preview", {
						method: "POST",

						headers: {
							"Content-Type": "application/json",
							Authorization: "Bearer " + localStorage.getItem("token"),
						},

						body: JSON.stringify({
							origin_point_id: tripData.origin_point_id,

							destination_point_id: tripData.destination_point_id,

							vehicle_type: tripData.vehicle_type,

							baggage_capacity: tripData.baggage_capacity,
						}),
					});

					const goodsData = await goodsRes.json();

					setGoodsPrice(goodsData.estimated_price);

					return;
				}

				// ====================================
				// PRICE PASSENGER (trip penumpang, atau bagian penumpang
				// dari "Barang dan Tebengan")
				// ====================================

				const passengerRes = await fetch("http://127.0.0.1:8000/api/trips/preview", {
					method: "POST",

					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer " + localStorage.getItem("token"),
					},

					body: JSON.stringify({
						origin_point_id: tripData.origin_point_id,

						destination_point_id: tripData.destination_point_id,

						vehicle_type: tripData.vehicle_type,
					}),
				});

				const passengerData = await passengerRes.json();

				setPassengerPrice(passengerData.estimated_price);

				// ====================================
				// JIKA BARANG & TEBENGAN
				// ====================================

				if (isBarangDanTebengan) {
					const goodsVehicleType = tripData.vehicle_type === "motor" ? "Barang-Motor" : "Barang-Mobil";
					const goodsRes = await fetch("http://127.0.0.1:8000/api/trips/preview", {
						method: "POST",

						headers: {
							"Content-Type": "application/json",

							Authorization: "Bearer " + localStorage.getItem("token"),
						},

						body: JSON.stringify({
							origin_point_id: tripData.origin_point_id,

							destination_point_id: tripData.destination_point_id,

							vehicle_type: goodsVehicleType,

							baggage_capacity: tripData.baggage_capacity,
						}),
					});

					const goodsData = await goodsRes.json();

					setGoodsPrice(goodsData.estimated_price);
				}
			} catch (err) {
				console.error(err);
			}
		};

		fetchPreview();
	}, []);

	return (
		<MitraLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 font-sans relative pb-28">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Detail Tebengan</h1>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* KIRI */}
					<div className="lg:col-span-7 space-y-6">
						{/* ROUTE */}
						<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
							<p className="text-gray-400 text-xs font-bold mb-6">
								{tripData.departure_date} • {tripData.departure_time}
							</p>

							<div className="flex items-center gap-5">
								<h3 className="text-xl font-black text-gray-800">{tripData.origin_city}</h3>

								<ChevronLeft className="rotate-180 text-gray-700" size={20} />

								<h3 className="text-xl font-black text-gray-800">{tripData.destination_city}</h3>
							</div>

							<p className="text-xs text-gray-400 mt-2 font-medium">
								{tripData.origin_address} → {tripData.destination_address}
							</p>
						</div>

						{/* DETAIL MITRA */}
						<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
							<h3 className="text-xl font-black text-gray-800 mb-8">Detail Mitra</h3>

							<div className="space-y-6">
								<DetailItem label="Nama Mitra" value={mitra?.name || "-"} />

								<DetailItem label="Nomor Registrasi" value={tripData.vehicle_plate || "-"} />

								<DetailItem label="Merk" value={tripData.vehicle_brand || "-"} />

								<DetailItem label="Tipe" value={tripData.vehicle_type || "-"} />

								<DetailItem label="Warna" value={tripData.vehicle_color || "-"} />
							</div>
						</div>
					</div>

					{/* KANAN */}
					<div className="lg:col-span-5">
						<div className="bg-white rounded-[32px] p-8 shadow-xl border border-indigo-50 sticky top-6">
							<div className="space-y-5 mb-8">
								{tripData.tebengan_type === "Barang" ? (
									// TRIP BARANG MURNI
									<div className="flex justify-between items-center">
										<div>
											<h4 className="text-lg font-black text-gray-800 leading-none">Tarif Pengiriman</h4>

											<p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Tarif untuk kapasitas penuh</p>
										</div>

										<span className="text-2xl font-black text-indigo-900 tracking-tighter">Rp {Number(goodsPrice || 0).toLocaleString("id-ID")}</span>
									</div>
								) : (
									<>
										{/* PASSENGER PRICE */}

										<div className="flex justify-between items-center">
											<div>
												<h4 className="text-lg font-black text-gray-800 leading-none">Tarif Tebengan</h4>

												<p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Tarif per penumpang</p>
											</div>

											<span className="text-2xl font-black text-indigo-900 tracking-tighter">Rp {Number(passengerPrice || 0).toLocaleString("id-ID")}</span>
										</div>

										{/* GOODS PRICE */}

										{tripData.tebengan_type === "Barang dan Tebengan" && (
											<div className="flex justify-between items-center border-t pt-5">
												<div>
													<h4 className="text-lg font-black text-gray-800 leading-none">Tarif Barang</h4>

													<p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Tarif pengiriman barang</p>
												</div>

												<span className="text-2xl font-black text-emerald-600 tracking-tighter">Rp {Number(goodsPrice || 0).toLocaleString("id-ID")}</span>
											</div>
										)}
									</>
								)}
							</div>

							{qrisMissing && (
								<div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
									<AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-black text-amber-700">QRIS belum diupload</p>
										<p className="text-xs text-amber-600 mt-1">
											Kamu belum upload QRIS pembayaran. Tebengan ini tetap bisa dibuat, tapi customer hanya bisa membayar dengan{" "}
											<span className="font-bold">Tunai</span> - opsi QRIS akan otomatis disembunyikan untuk mereka. Upload QRIS lewat halaman{" "}
											<button onClick={() => navigate("/mitra/qris-saya")} className="underline font-bold">
												QRIS Saya
											</button>{" "}
											kalau ingin menerima pembayaran QRIS juga.
										</p>
									</div>
								</div>
							)}

							<button
								onClick={handleConfirm}
								disabled={loading}
								className="w-full py-5 bg-indigo-900 text-white rounded-[24px] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-all flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{loading ? "Memproses..." : "Buat tebengan"}
							</button>
						</div>
					</div>
				</div>

				{/* MODAL SUKSES */}
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm"></div>

						<div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center">
							<h2 className="text-2xl font-black text-gray-800 mb-8">Berhasil Membuat Tebengan</h2>

							<div className="flex justify-center mb-8">
								<div className="bg-indigo-900 text-white p-6 rounded-full">
									<CheckCircle2 size={80} strokeWidth={1.5} />
								</div>
							</div>

							<p className="text-gray-500 text-sm font-medium leading-relaxed mb-10 px-4">Selamat Anda telah membuat tebengan.</p>

							<button onClick={handleCloseModal} className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-indigo-800 transition-all">
								Lihat daftar tebengan akan datang
							</button>
						</div>
					</div>
				)}
			</div>

			{/* MODAL ERROR - pengganti window.alert() bawaan browser */}
			<AlertModal
				show={errorAlert.show}
				type="error"
				title="Gagal Membuat Tebengan"
				message={errorAlert.message}
				confirmText="Mengerti"
				onClose={() => setErrorAlert({ show: false, message: "" })}
			/>
		</MitraLayout>
	);
}

function DetailItem({ label, value }) {
	return (
		<div className="space-y-1">
			<p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{label}</p>
			<p className="text-lg font-bold text-gray-600">{value}</p>
		</div>
	);
}