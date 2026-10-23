import React, { useState } from "react";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";

export default function KonfirmasiWithdrawPIN() {
	const navigate = useAppNavigate();
	const location = useLocation();

	const amount = location.state?.amount || 0;

	const [pin, setPin] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// sementara hardcode PIN
	// nanti bisa pakai API PIN terpisah
	const correctPin = "123456";

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (pin.length !== 6) {
			setError("PIN harus 6 digit");
			return;
		}

		if (pin !== correctPin) {
			setError("PIN salah");
			return;
		}

		try {
			setIsLoading(true);
			setError("");

			const response = await fetch("http://127.0.0.1:8000/api/balance/withdraw", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
				body: JSON.stringify({
					amount,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.message || "Withdraw gagal");
				return;
			}

			setSuccess("Withdraw berhasil!");

			// redirect setelah sukses
			setTimeout(() => {
				navigate("/mitra/riwayat-saldo");
			}, 1500);
		} catch (err) {
			console.error(err);
			setError("Terjadi kesalahan server");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<MitraLayout>
			<div className="max-w-md mx-auto px-4 py-8">
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 rounded-xl border bg-white">
						<ChevronLeft size={22} />
					</button>

					<h1 className="text-2xl font-black text-indigo-900">Konfirmasi PIN</h1>
				</div>

				<div className="bg-white rounded-3xl border shadow-sm p-8">
					<div className="flex justify-center mb-6">
						<div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center">
							<ShieldCheck size={40} className="text-indigo-700" />
						</div>
					</div>

					<div className="text-center mb-8">
						<p className="text-sm text-gray-500 mb-2">Total Penarikan</p>

						<h2 className="text-3xl font-black text-indigo-900">Rp {amount.toLocaleString("id-ID")}</h2>
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label className="text-sm font-bold text-gray-700 mb-2 block">Masukkan PIN</label>

							<input
								type="password"
								maxLength={6}
								value={pin}
								onChange={(e) => {
									setPin(e.target.value.replace(/\D/g, ""));
									setError("");
								}}
								placeholder="******"
								className="w-full py-5 px-6 rounded-2xl border-2 border-gray-100 focus:border-indigo-600 outline-none text-center text-2xl tracking-[10px] font-black"
							/>
						</div>

						{error && (
							<div className="flex items-center gap-2 text-red-500 text-sm font-bold">
								<AlertCircle size={16} />
								{error}
							</div>
						)}

						{success && (
							<div className="flex items-center gap-2 text-green-600 text-sm font-bold">
								<CheckCircle2 size={16} />
								{success}
							</div>
						)}

						<button type="submit" disabled={isLoading} className={`w-full py-5 rounded-2xl font-black text-white transition-all ${isLoading ? "bg-gray-400" : "bg-indigo-900 hover:bg-indigo-800"}`}>
							{isLoading ? "Memproses..." : "Konfirmasi Withdraw"}
						</button>
					</form>
				</div>
			</div>
		</MitraLayout>
	);
}
