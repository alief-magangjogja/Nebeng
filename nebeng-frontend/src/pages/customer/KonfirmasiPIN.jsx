import React, { useState, useEffect } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { Lock, ShieldCheck, AlertCircle, ArrowRight, KeyRound, X } from "lucide-react";

export default function KonfirmasiPIN() {
	const navigate = useAppNavigate();
	const [pin, setPin] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// null = masih loading, true = punya pin, false = tidak punya pin
	const [hasPin, setHasPin] = useState(null);

	useEffect(() => {
		const checkPin = async () => {
			try {
				const token = localStorage.getItem("token");

				const res = await fetch("http://127.0.0.1:8000/api/check-pin", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const data = await res.json();

				setHasPin(data.has_pin);

				if (data.has_pin === false) {
					alert("Anda belum memiliki PIN keamanan. Silakan buat PIN terlebih dahulu.");
					navigate("/customer/atur-pin", { state: { returnTo: "/customer/konfirmasi-pin" } });
				}
			} catch (error) {
				console.error("Check PIN error:", error);
			}
		};

		checkPin();
	}, [navigate]);

	const handlePinChange = (e) => {
		const value = e.target.value.replace(/[^0-9]/g, "");
		if (value.length <= 6) {
			setPin(value);
			setError("");
		}
	};

	const handleConfirm = async (e) => {
		e.preventDefault();

		if (pin.length < 6) {
			setError("PIN harus terdiri dari 6 digit angka.");
			return;
		}

		setIsLoading(true);

		try {
			const token = localStorage.getItem("token");

			const verifyRes = await fetch("http://127.0.0.1:8000/api/verify-pin", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					pin: pin,
				}),
			});

			const verifyData = await verifyRes.json();

			if (!verifyRes.ok) {
				throw new Error(verifyData.message || "PIN salah");
			}

			const orderData = JSON.parse(localStorage.getItem("pending_order"));
			const selectedMethod = JSON.parse(localStorage.getItem("selected_payment_method"));

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

			const orderRes = await fetch("http://127.0.0.1:8000/api/orders", {
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
					payment_method: mapPaymentMethod(selectedMethod.id),
					price: orderData.price,
				}),
			});

			const orderResponse = await orderRes.json();

			setIsLoading(false);

			if (orderRes.ok) {
				localStorage.removeItem("pending_order");
				localStorage.removeItem("selected_payment_method");

				if (selectedMethod.id === "qris") {
					navigate(`/customer/upload-bukti-pembayaran/${orderResponse.order.id}`);
				} else {
					navigate("/customer/pembayaran-selesai", {
						state: {
							order: orderResponse.order,
							method: selectedMethod.name,
						},
					});
				}
			} else {
				alert(orderResponse.message || "Gagal membuat order");
			}
		} catch (error) {
			setIsLoading(false);
			setError(error.message);
			setPin("");
		}
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6 flex items-center justify-center min-h-[80vh]">
				<div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
					<div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100 relative overflow-hidden">
						<button onClick={() => navigate(-1)} className="absolute right-6 top-6 p-2 text-gray-300 hover:text-indigo-900 transition-colors">
							<X size={24} />
						</button>

						<div className="text-center mb-10">
							<div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-900 shadow-inner">
								<KeyRound size={40} />
							</div>
							<h2 className="text-2xl font-black text-indigo-900 tracking-tight">Konfirmasi PIN</h2>
							<p className="text-sm text-gray-400 font-medium mt-2">Masukkan 6 digit PIN keamanan Anda untuk memproses pembayaran.</p>
						</div>

						<form onSubmit={handleConfirm} className="space-y-8">
							<div className="relative group">
								<div className="flex justify-center gap-3 mb-2">
									{[...Array(6)].map((_, i) => (
										<div
											key={i}
											className={`w-10 h-12 md:w-12 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
												pin.length > i ? "border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100" : "border-gray-100 bg-gray-50"
											}`}
										>
											{pin.length > i && <div className="w-3 h-3 bg-indigo-900 rounded-full animate-in zoom-in duration-300"></div>}
										</div>
									))}
								</div>

								<input type="password" pattern="\d*" inputMode="numeric" maxLength={6} value={pin} onChange={handlePinChange} autoFocus className="absolute inset-0 opacity-0 cursor-pointer" />
							</div>

							{error && (
								<div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl border border-red-100 animate-in shake duration-500">
									<AlertCircle size={18} />
									<p className="text-[10px] font-black uppercase tracking-wider">{error}</p>
								</div>
							)}

							<div className="space-y-4">
								<button
									type="submit"
									disabled={isLoading || pin.length < 6}
									className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
										pin.length === 6 && !isLoading ? "bg-indigo-900 text-white shadow-indigo-200 hover:bg-indigo-800 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"
									}`}
								>
									{isLoading ? (
										<div className="w-5 h-5 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></div>
									) : (
										<>
											Konfirmasi Pembayaran
											<ArrowRight size={18} />
										</>
									)}
								</button>

								<button type="button" onClick={() => navigate("/forgot-pin")} className="w-full text-center text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
									Lupa PIN Keamanan?
								</button>
							</div>
						</form>

						<div className="mt-10 pt-6 border-t border-gray-50 flex items-center justify-center gap-2">
							<ShieldCheck size={16} className="text-emerald-500" />
							<span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">End-to-End Encryption</span>
						</div>
					</div>
				</div>
			</div>

			<style>{`
				@keyframes shake {
					0%,
					100% {
						transform: translateX(0);
					}
					25% {
						transform: translateX(-5px);
					}
					75% {
						transform: translateX(5px);
					}
				}
				.shake {
					animation: shake 0.2s ease-in-out 0s 2;
				}
			`}</style>
		</CustomerLayout>
	);
}