import React from "react";
import { useEffect, useState } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, CheckCircle2, Receipt, Package, Download, Home, Share2, Navigation } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function PembayaranSelesai() {
	const location = useLocation();
	const navigate = useNavigate();

	const order = location.state?.order;
	const method = location.state?.method;

	const [countdown, setCountdown] = useState(5);

	useEffect(() => {
		if (!order?.trip_id) return;

		const interval = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(interval);

					navigate(`/customer/perjalanan/${order.trip_id}`, {
						state: {
							orderId: order.id,
						},
					});

					return 0;
				}

				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [order, navigate]);

	if (!order) {
		navigate("/customer/dashboard");
		return null;
	}

	const paymentReceipt = {
		type: method,
		tanggal: new Date().toLocaleDateString("id-ID"),
		noTransaksi: order.id,
		biayaPenebang: order.price,
		biayaAdmin: 0,
		total: order.price,
		noPemesanan: order.id,
	};

	const orderDetail = {
		date: new Date().toLocaleDateString("id-ID"),
		from: order.pickup_address,
		fromDetail: order.pickup_address,
		to: order.drop_address,
		toDetail: order.drop_address,
		berat: "-",
		barang: "-",
		foto: "https://images.unsplash.com/photo-1578500484748-482986d40785?q=80&w=400",
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-4">
						<Link to="/customer/dashboard" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
							<ChevronLeft size={24} className="text-indigo-900" />
						</Link>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Status Pembayaran</h1>
					</div>
					<div className="flex gap-2">
						<button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all">
							<Share2 size={16} /> Bagikan
						</button>
						<button className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-100">
							<Download size={16} /> Simpan Bukti
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
					{/* SISI KIRI: Status & Rincian Biaya (5 Kolom) */}
					<div className="lg:col-span-5 space-y-6">
						{/* Success Status Card */}
						<div className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100 text-center flex flex-col items-center">
							<div className="relative mb-6">
								<div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center animate-pulse">
									<CheckCircle2 size={64} className="text-emerald-500" />
								</div>
								<div className="absolute -top-2 -right-2 bg-white p-1 rounded-full shadow-sm">
									<Receipt size={20} className="text-indigo-600" />
								</div>
							</div>
							<h2 className="text-2xl font-black text-indigo-900 mb-2">Pembayaran Berhasil!</h2>
							<p className="text-sm text-gray-400 font-medium">Transaksi Anda telah diverifikasi oleh sistem.</p>

							{/* AUTO REDIRECT INFO */}
							<div className="mt-6 w-full bg-indigo-50 border border-indigo-100 rounded-3xl p-5">
								<div className="flex items-center justify-between gap-4">
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-lg">
											<Navigation size={22} className="rotate-45" />
										</div>

										<div className="text-left">
											<h4 className="text-sm font-black text-indigo-900 uppercase tracking-wide">Menuju Halaman Perjalanan</h4>

											<p className="text-xs text-indigo-500 font-medium mt-1">Anda akan dialihkan otomatis dalam {countdown} detik</p>
										</div>
									</div>

									<div className="w-14 h-14 rounded-full border-4 border-indigo-200 flex items-center justify-center bg-white shadow-sm">
										<span className="text-xl font-black text-indigo-900">{countdown}</span>
									</div>
								</div>

								<button
									onClick={() =>
										navigate(`/customer/perjalanan/${order.trip_id}`, {
											state: {
												orderId: order.id,
											},
										})
									}
									className="mt-5 w-full py-4 rounded-2xl bg-indigo-900 hover:bg-indigo-800 transition-all text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2"
								>
									<Navigation size={18} className="rotate-45" />
									Menuju Perjalanan Sekarang
								</button>
							</div>
						</div>

						{/* Rincian Pembayaran Card */}
						<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
							<h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Rincian Pembayaran</h3>
							<div className="space-y-4">
								<div className="flex justify-between text-sm">
									<span className="text-gray-400 font-medium">Type Pembayaran</span>
									<span className="font-black text-indigo-900">{paymentReceipt.type}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-400 font-medium">Tanggal</span>
									<span className="font-black text-indigo-900">{paymentReceipt.tanggal}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-400 font-medium">No Transaksi</span>
									<span className="font-black text-indigo-900 text-[10px] sm:text-sm">{paymentReceipt.noTransaksi}</span>
								</div>
								<div className="pt-4 border-t border-gray-50 space-y-3">
									<div className="flex justify-between text-sm">
										<span className="text-gray-400 font-medium">Biaya penebang</span>
										<span className="font-bold text-gray-700">Rp {paymentReceipt.biayaPenebang.toLocaleString("id-ID")},00</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-gray-400 font-medium">Biaya Admin</span>
										<span className="font-bold text-gray-700">Rp {paymentReceipt.biayaAdmin.toLocaleString("id-ID")},00</span>
									</div>
								</div>
								<div className="pt-4 mt-2 flex justify-between items-center">
									<span className="text-base font-black text-indigo-900 uppercase tracking-wider">Total</span>
									<span className="text-2xl font-black text-emerald-500 tracking-tighter">Rp {paymentReceipt.total.toLocaleString("id-ID")},00</span>
								</div>
							</div>
						</div>
					</div>

					{/* SISI KANAN: Detail Pesanan & Navigasi (7 Kolom) */}
					<div className="lg:col-span-7 space-y-6">
						{/* Rute & No Pemesanan */}
						<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
							<div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
								<p className="text-sm font-bold text-indigo-900">{orderDetail.date}</p>
								<div className="px-3 py-1 bg-indigo-50 rounded-lg">
									<span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{paymentReceipt.noPemesanan}</span>
								</div>
							</div>

							<div className="relative pl-8 space-y-10 mb-2">
								<div className="absolute left-[13px] top-[10px] bottom-[10px] w-[2px] bg-gray-100"></div>
								<div className="relative">
									<div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white"></div>
									<h3 className="font-black text-gray-800 text-base">{orderDetail.from}</h3>
									<p className="text-[11px] text-gray-400 leading-relaxed">{orderDetail.fromDetail}</p>
								</div>
								<div className="relative">
									<div className="absolute left-[-23px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
									<h3 className="font-black text-gray-800 text-base">{orderDetail.to}</h3>
									<p className="text-[11px] text-gray-400 leading-relaxed">{orderDetail.toDetail}</p>
								</div>
							</div>
						</div>

						{/* Detail Barang Card */}
						<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
							<div className="flex flex-col md:flex-row gap-8">
								<div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden border border-gray-50 shrink-0">
									<img src={orderDetail.foto} className="w-full h-full object-cover" alt="Detail Barang" />
								</div>
								<div className="flex-1 space-y-6">
									<div className="flex justify-between items-center">
										<div className="flex items-center gap-2 text-indigo-900">
											<Package size={20} />
											<span className="font-black uppercase tracking-wider text-sm">Berat Barang</span>
										</div>
										<span className="text-xl font-black text-indigo-900">{orderDetail.berat}</span>
									</div>
									<div>
										<p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Nama Barang:</p>
										<p className="text-base font-bold text-gray-800">{orderDetail.barang}</p>
									</div>
									<div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
										<p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status:</p>
										<p className="text-xs text-emerald-600 font-bold italic">Siap untuk diproses oleh penebang</p>
									</div>
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
							<Link to="/customer/riwayat" className="w-full">
								<button className="w-full py-5 bg-white border-2 border-indigo-900 text-indigo-900 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
									<Receipt size={18} /> Lihat Riwayat
								</button>
							</Link>
							<Link to="/customer/dashboard" className="w-full">
								<button className="w-full py-5 bg-indigo-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-all flex items-center justify-center gap-2">
									<Home size={18} /> Kembali Beranda
								</button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}
