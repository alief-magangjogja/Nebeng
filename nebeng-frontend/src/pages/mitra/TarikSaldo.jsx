import React, { useState, useEffect } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, Wallet, CreditCard, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function TarikSaldo() {
	const navigate = useAppNavigate();
	const [amount, setAmount] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Data Mock sesuai image_f76e0a.png
	const [accountData, setAccountData] = useState({
		nama: "",
		saldo: 0,
		bank: "-",
		noRekening: "-",
	});

	useEffect(() => {
		const fetchBalance = async () => {
			try {
				const res = await fetch("http://127.0.0.1:8000/api/balance", {
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
						Accept: "application/json",
					},
				});

				const data = await res.json();

				setAccountData((prev) => ({
					...prev,
					nama: "Mitra", // sementara, nanti bisa dari API profile
					saldo: data.balance || 0,
				}));
			} catch (err) {
				console.error("Gagal ambil saldo:", err);
			}
		};

		fetchBalance();
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");

				// FETCH SALDO
				const balanceRes = await fetch("http://127.0.0.1:8000/api/balance", {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				const balanceData = await balanceRes.json();

				// FETCH PROFILE
				const profileRes = await fetch("http://127.0.0.1:8000/api/profile", {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				const profileData = await profileRes.json();

				setAccountData({
					nama: profileData?.profile?.bank_account_name || profileData?.name || "Mitra",
					saldo: balanceData?.balance || 0,
					bank: profileData?.profile?.bank_name || "-",
					noRekening: profileData?.profile?.bank_account_number || "-",
				});
			} catch (err) {
				console.error("Gagal mengambil data:", err);
			}
		};

		fetchData();
	}, []);

	const handleAmountChange = (e) => {
		const value = e.target.value.replace(/\D/g, ""); // Hanya angka
		setAmount(value);

		if (parseInt(value) > accountData.saldo) {
			setError("Nominal melebihi saldo Anda");
		} else if (value && parseInt(value) < 10000) {
			setError("Minimal penarikan Rp 10.000");
		} else {
			setError("");
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!amount || error) return;

		navigate("/mitra/konfirmasi-pin", {
			state: {
				amount: parseInt(amount),
			},
		});
	};

	return (
		<MitraLayout>
			<div className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-8">
				{/* HEADER NAVIGATION */}
				<div className="flex items-center gap-4 mb-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Tarik Saldo</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* INFORMASI SALDO */}
					<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
						<div className="relative z-10">
							<h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">Informasi Saldo</h3>
							<div className="space-y-2">
								<div>
									<p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Nama Pemilik</p>

									<p className="text-lg md:text-xl font-black text-gray-800 break-words">{accountData.nama}</p>
								</div>

								<div className="pt-4 border-t border-gray-100">
									<p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Total Saldo</p>

									<p className="text-3xl md:text-4xl font-black text-indigo-900 tracking-tight break-all">Rp {accountData.saldo.toLocaleString("id-ID")}</p>
								</div>
							</div>
						</div>
						<Wallet size={120} className="absolute -right-8 -bottom-8 text-indigo-50 opacity-50 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
					</div>

					{/* INFORMASI REKENING */}
					<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
						<h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">Informasi Rekening</h3>
						<div className="flex justify-between items-center gap-4">
							<div className="flex items-center gap-4">
								<div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
									<CreditCard size={24} />
								</div>
								<div>
									<p className="text-xs font-medium text-gray-400 mb-0.5">Bank Tujuan</p>
									<p className="text-base font-black text-gray-800">{accountData.bank}</p>
								</div>
							</div>
							<div className="text-right">
								<p className="text-xs font-medium text-gray-400 mb-0.5">Nomor Rekening</p>
								<p className="text-sm font-bold text-gray-800 tracking-wider break-all">{accountData.noRekening}</p>
							</div>
						</div>
					</div>

					{/* INPUT JUMLAH */}
					<div className="space-y-4">
						<label className="text-sm font-black text-gray-800 ml-2">Masukkan Jumlah</label>
						<div className="relative group">
							<span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-900 text-xl group-focus-within:text-indigo-600">Rp</span>
							<input
								type="text"
								placeholder="Masukkan nominal saldo yang akan ditarik"
								value={amount ? parseInt(amount).toLocaleString("id-ID") : ""}
								onChange={handleAmountChange}
								className={`w-full pl-16 pr-6 py-6 bg-white border-2 rounded-[24px] text-xl font-black outline-none transition-all ${
									error ? "border-red-200 focus:border-red-500 bg-red-50/30" : "border-gray-100 focus:border-indigo-600 shadow-sm"
								}`}
							/>
						</div>

						{/* Error Feedback */}
						{error && (
							<div className="flex items-center gap-2 text-red-500 px-4 animate-in fade-in slide-in-from-top-1">
								<AlertCircle size={14} />
								<span className="text-xs font-bold uppercase tracking-tight">{error}</span>
							</div>
						)}
					</div>

					{/* SUBMIT BUTTON */}
					<button
						type="submit"
						disabled={!amount || !!error || isLoading}
						className={`w-full py-5 rounded-[24px] font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
							!amount || !!error || isLoading ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" : "bg-indigo-900 text-white shadow-indigo-100 hover:bg-indigo-800"
						}`}
					>
						{isLoading ? (
							<div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
						) : (
							<>
								Lanjut
								<ArrowRight size={22} />
							</>
						)}
					</button>

					{/* INFO FOOTER */}
					<p className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em] px-10">Proses penarikan saldo membutuhkan waktu maksimal 1x24 jam kerja.</p>
				</form>
			</div>
		</MitraLayout>
	);
}
