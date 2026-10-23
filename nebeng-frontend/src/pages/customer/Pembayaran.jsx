import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, ChevronRight, QrCode, Banknote, Wallet, CheckCircle2, Package, ShieldCheck, ArrowRight } from "lucide-react";

export default function Pembayaran() {
	const [selectedMethod, setSelectedMethod] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const navigate = useAppNavigate();
	const location = useLocation();

	// Foto barang (kalau ini order barang) dibawa lewat navigate state dari
	// DetailOrder.jsx - tidak disimpan di localStorage karena File tidak
	// bisa di-JSON.stringify.
	const image = location.state?.image || null;

	const [orderData] = useState(() => {
		const savedOrder = localStorage.getItem("pending_order");
		return savedOrder ? JSON.parse(savedOrder) : null;
	});

	useEffect(() => {
		if (!orderData) {
			navigate("/customer/dashboard");
		}
	}, [orderData, navigate]);

	if (!orderData) return null;

	const isBarang = orderData.type === "barang";

		const paymentMethods = [
		{ id: "qris", name: "QRIS", desc: orderData?.has_qris === false ? "Mitra ini belum menyediakan QRIS" : "Pindai QR pengemudi untuk membayar", icon: QrCode, type: "nontunai", disabled: orderData?.has_qris === false },
		{ id: "tunai", name: "Tunai", desc: "Bayar langsung ke pengemudi", icon: Banknote, type: "tunai" },
		// { id: "bri", name: "BRI Virtual Account", desc: "Transfer melalui bank BRI", icon: Wallet, type: "nontunai" },
		// { id: "bca", name: "BCA Virtual Account", desc: "Transfer melalui bank BCA", icon: Wallet, type: "nontunai" },
		// { id: "dana", name: "Dana", desc: "Bayar menggunakan saldo Dana", icon: Wallet, type: "nontunai" },
	];

	const mapPaymentMethod = (methodId) => {
		switch (methodId) {
			case "tunai":
				return "cash";
			case "qris":
				return "qris";
			case "bri":
			case "bca":
			case "dana":
				return "ewallet";
			default:
				return "cash";
		}
	};

	const handleOrder = async () => {
		if (!selectedMethod) {
			alert("Pilih metode pembayaran terlebih dahulu");
			return;
		}

		// Sementara PIN tidak dipakai di alur pembayaran (baik Tunai maupun QRIS).
		// Fitur PIN tetap ada (Atur PIN, Konfirmasi PIN) untuk kebutuhan lain,
		// hanya tidak digunakan di sini dulu.
		setIsProcessing(true);

		try {
			const paymentMethod = mapPaymentMethod(selectedMethod.id);

			// =========================================
			// QRIS/NONTUNAI - JANGAN buat order di sini.
			// Order/ItemOrder baru benar-benar dibuat nanti di halaman
			// upload bukti pembayaran, TEPAT saat customer klik "Kirim
			// Bukti Pembayaran". Kalau customer berhenti di sini atau di
			// halaman upload tanpa pernah kirim bukti, tidak ada apa pun
			// yang tersimpan ke database - jadi tidak ada lagi pesanan
			// "hantu" berstatus Dalam Proses padahal belum pernah dibayar.
			// =========================================
			if (selectedMethod.type === "nontunai") {
				localStorage.setItem(
					"pending_order",
					JSON.stringify({ ...orderData, payment_method: paymentMethod })
				);

				navigate("/customer/upload-bukti-pembayaran", {
					state: { image },
				});
				return;
			}

			// =========================================
			// TUNAI - tidak ada langkah lanjutan, order langsung dibuat
			// di sini seperti semula. Bayar tunai saat bertemu mitra,
			// mitra yang konfirmasi penerimaan uang dari sisi mereka.
			// =========================================
			const token = localStorage.getItem("token");

			let orderRes;

			if (isBarang) {
				const formData = new FormData();

				formData.append("trip_id", orderData.trip_id);
				formData.append("origin_point_id", orderData.origin_point_id);
				formData.append("destination_point_id", orderData.destination_point_id);
				formData.append("delivery_date", orderData.delivery_date);
				formData.append("size", orderData.size || "");
				formData.append("item_description", orderData.item_description || "");
				formData.append("payment_method", paymentMethod);

				if (image) {
					formData.append("image", image);
				}

				orderRes = await fetch("http://127.0.0.1:8000/api/item-orders", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
					body: formData,
				});
			} else {
				orderRes = await fetch("http://127.0.0.1:8000/api/orders", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						trip_id: orderData.trip_id,
						pickup_address: orderData.pickup_address,
						drop_address: orderData.drop_address,
						payment_method: paymentMethod,
						price: orderData.price,
					}),
				});
			}

			const orderResponse = await orderRes.json();

			if (!orderRes.ok) {
				throw new Error(orderResponse.message || "Gagal membuat pesanan");
			}

			localStorage.removeItem("pending_order");
			localStorage.removeItem("selected_payment_method");

			navigate("/customer/pembayaran-selesai", {
				state: {
					order: orderResponse.order,
					method: selectedMethod.name,
				},
			});
		} catch (error) {
			alert(error.message || "Terjadi kesalahan saat membuat pesanan");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>

					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Pilih Pembayaran</h1>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* SISI KIRI: Daftar Metode Pembayaran (5 Kolom) */}
					<div className="lg:col-span-5 space-y-4">
						<h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 pl-2">Metode Tersedia</h3>
						{paymentMethods.map((method) => (
						<button
							key={method.id}
							onClick={() => !method.disabled && setSelectedMethod(method)}
							disabled={method.disabled}
							className={`w-full flex items-center justify-between p-5 rounded-3xl border transition-all duration-300 group ${
								method.disabled
									? "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
									: selectedMethod?.id === method.id
										? "bg-indigo-900 border-indigo-900 shadow-xl shadow-indigo-100 translate-x-2"
										: "bg-white border-gray-100 hover:border-indigo-200"
							}`}
						>
								<div className="flex items-center gap-4">
									<div className={`p-3 rounded-2xl ${selectedMethod?.id === method.id ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600"}`}>
										<method.icon size={24} />
									</div>
									<div className="text-left">
										<p className={`font-black text-sm ${selectedMethod?.id === method.id ? "text-white" : "text-gray-800"}`}>{method.name}</p>
										<p className={`text-[10px] font-medium ${selectedMethod?.id === method.id ? "text-indigo-200" : "text-gray-400"}`}>{method.desc}</p>
									</div>
								</div>
								<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMethod?.id === method.id ? "border-sky-400 bg-sky-400" : "border-gray-200"}`}>
									{selectedMethod?.id === method.id && <CheckCircle2 size={14} className="text-indigo-900" />}
								</div>
							</button>
						))}
					</div>

					{/* SISI KANAN: Detail Pembayaran (Muncul saat metode dipilih) (7 Kolom) */}
					<div className="lg:col-span-7 h-full">
						{selectedMethod ? (
							<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
								{/* Info Pesanan Card */}
								<div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100">
									<div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
										<div className="flex items-center gap-2">
											<span className="text-xs font-black text-gray-300 uppercase tracking-widest">Metode:</span>
											<span className="text-xs font-black bg-indigo-50 text-indigo-900 px-3 py-1 rounded-full uppercase">{selectedMethod.name}</span>
										</div>
										<span className="text-[10px] font-bold text-gray-400">{orderData?.noPemesanan}</span>
									</div>

									<div className="relative pl-8 space-y-10 mb-8">
										<div className="absolute left-3.25 top-2.5 bottom-2.5 w-0.5 bg-gray-100"></div>
										<div className="relative">
											<div className="absolute -left-5.75 top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm"></div>
											<h3 className="font-black text-gray-800 text-base">{orderData?.origin}</h3>
											<p className="text-[11px] text-gray-400 leading-relaxed">{orderData?.fromDetail}</p>
										</div>
										<div className="relative">
											<div className="absolute -left-5.75 top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
											<h3 className="font-black text-gray-800 text-base">{orderData?.destination}</h3>
											<p className="text-[11px] text-gray-400 leading-relaxed">{orderData?.toDetail}</p>
										</div>
									</div>
								</div>

								{/* Total & Submit */}
								<div className="bg-white rounded-4xl p-8 shadow-xl border border-indigo-50">
									<div className="flex justify-between items-center mb-8">
										<span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Pembayaran</span>
										<span className="text-2xl font-black text-indigo-900 tracking-tighter">Rp {orderData?.price?.toLocaleString("id-ID")},00</span>
									</div>

									<button
										className="w-full py-5 bg-indigo-900 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
										onClick={handleOrder}
										disabled={isProcessing}
									>
										{isProcessing ? (
											<div className="w-5 h-5 border-2 border-indigo-300 border-t-white rounded-full animate-spin"></div>
										) : (
											<>
												{selectedMethod.type === "nontunai" ? "Lanjutkan ke Pembayaran" : "Buat Pesanan"}
												<ArrowRight size={20} />
											</>
										)}
									</button>

									<div className="mt-6 flex items-center justify-center gap-2 text-emerald-500">
										<ShieldCheck size={16} />
										<span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Checkout</span>
									</div>
								</div>
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100 p-12 text-center group">
								<div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-500">
									<Wallet size={48} className="text-gray-200" />
								</div>
								<h3 className="text-xl font-black text-indigo-900 mb-2">Pilih Metode Pembayaran</h3>
								<p className="text-sm text-gray-400 max-w-xs leading-relaxed">Silakan pilih salah satu metode di sebelah kiri untuk melihat detail pesanan dan menyelesaikan pembayaran.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}