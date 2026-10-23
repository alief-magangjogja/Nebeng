import React, { useState, useEffect } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, Lock, ShieldCheck, Eye, EyeOff, Save, KeyRound } from "lucide-react";
import { useLocation } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";

export default function AturPIN() {
	const navigate = useAppNavigate();
	const location = useLocation();
	const returnTo = location.state?.returnTo;
	const [isLoading, setIsLoading] = useState(false);
	const [showPin, setShowPin] = useState(false);

	const [formData, setFormData] = useState({
		oldPin: "",
		newPin: "",
		confirmPin: "",
	});

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
			} catch (error) {
				console.error("Check PIN error:", error);
			}
		};

		checkPin();
	}, []);

	const handleUpdatePin = async (e) => {
		e.preventDefault();

		if (formData.newPin !== formData.confirmPin) {
			alert("PIN baru dan konfirmasi tidak cocok!");
			return;
		}

		if (formData.newPin.length !== 6) {
			alert("PIN harus 6 digit");
			return;
		}

		setIsLoading(true);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch("http://127.0.0.1:8000/api/update-pin", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					old_pin: formData.oldPin,
					new_pin: formData.newPin,
					new_pin_confirmation: formData.confirmPin,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message);
			}

			alert(hasPin ? "PIN berhasil diperbarui!" : "PIN berhasil dibuat!");
			navigate(returnTo || "/customer/profil");
		} catch (error) {
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-indigo-50 transition-colors group">
						<ChevronLeft className="w-6 h-6 text-indigo-900 group-hover:-translate-x-1 transition-transform" />
					</button>

					<div>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">{hasPin ? "Ubah PIN Keamanan" : "Buat PIN Keamanan"}</h1>
						<p className="text-sm text-gray-400 font-medium">Lindungi akun dan transaksi Anda dengan PIN</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* SISI KIRI */}
					<div className="lg:col-span-4 lg:sticky lg:top-6">
						<div className="bg-indigo-900 rounded-[40px] p-10 text-center text-white shadow-xl relative overflow-hidden">
							<div className="relative z-10">
								<div className="w-24 h-24 bg-white/10 rounded-3xl backdrop-blur-md flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl">
									<KeyRound size={48} className="text-sky-300" />
								</div>

								<h2 className="text-xl font-black tracking-tight mb-3">Keamanan Berlapis</h2>

								<p className="text-indigo-200 text-xs leading-relaxed font-medium px-4">Gunakan PIN yang sulit ditebak untuk menjaga keamanan riwayat perjalanan dan poin hadiah Anda.</p>
							</div>

							<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
							<div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
						</div>

						{/* Tips */}
						<div className="mt-6 bg-amber-50 rounded-4xl p-6 border border-amber-100">
							<div className="flex items-center gap-2 mb-3">
								<ShieldCheck size={18} className="text-amber-600" />
								<span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Tips Aman</span>
							</div>

							<p className="text-[11px] text-amber-600 leading-relaxed font-medium">Hindari menggunakan tanggal lahir atau angka berurutan seperti 123456.</p>
						</div>
					</div>

					{/* SISI KANAN */}
					<div className="lg:col-span-8">
						<form onSubmit={handleUpdatePin} className="bg-white rounded-[40px] p-8 md:p-10 shadow-sm border border-gray-100">
							<h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-10">{hasPin ? "Verifikasi & Pembaruan" : "Buat PIN Baru"}</h3>

							<div className="space-y-8">
								{/* PIN Lama */}
								{hasPin && (
									<div className="group relative">
										<label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
											<Lock size={14} /> PIN Saat Ini
										</label>

										<input
											type={showPin ? "text" : "password"}
											maxLength={6}
											value={formData.oldPin}
											onChange={(e) => setFormData({ ...formData, oldPin: e.target.value })}
											placeholder="Masukkan 6 digit PIN lama"
											className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-3xl text-gray-700 font-bold focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all tracking-widest"
										/>
									</div>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{/* PIN Baru */}
									<div className="group">
										<label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
											<ShieldCheck size={14} /> PIN Baru
										</label>

										<input
											type={showPin ? "text" : "password"}
											maxLength={6}
											value={formData.newPin}
											onChange={(e) => setFormData({ ...formData, newPin: e.target.value })}
											placeholder="6 Digit PIN"
											className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-3xl text-gray-700 font-bold focus:bg-white focus:border-indigo-100 outline-none transition-all tracking-widest"
										/>
									</div>

									{/* Konfirmasi */}
									<div className="group relative">
										<label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
											<ShieldCheck size={14} /> Konfirmasi
										</label>

										<input
											type={showPin ? "text" : "password"}
											maxLength={6}
											value={formData.confirmPin}
											onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
											placeholder="Ulangi PIN"
											className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-3xl text-gray-700 font-bold focus:bg-white focus:border-indigo-100 outline-none transition-all tracking-widest"
										/>

										<button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-6 top-10.5 text-gray-400 hover:text-indigo-600">
											{showPin ? <EyeOff size={20} /> : <Eye size={20} />}
										</button>
									</div>
								</div>
							</div>

							{/* BUTTON */}
							<div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
								<button
									type="submit"
									disabled={isLoading}
									className="w-full sm:w-auto flex-1 bg-indigo-900 text-white px-8 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-800 active:scale-95 transition-all flex items-center justify-center gap-3"
								>
									{isLoading ? (
										"Memproses..."
									) : (
										<>
											<Save size={18} />
											{hasPin ? "Perbarui PIN" : "Buat PIN"}
										</>
									)}
								</button>

								<button
									type="button"
									onClick={() => navigate(-1)}
									className="w-full sm:w-auto flex-1 bg-gray-50 text-gray-400 px-8 py-5 rounded-3xl font-black text-sm uppercase tracking-widest border border-gray-100 hover:bg-gray-100 hover:text-gray-600 transition-all flex items-center justify-center gap-3"
								>
									Batal
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}