import React, { useState } from "react";
import PosMitraLayout from "../../components/dashboard/PosMitraLayout";
import { Ticket, Search, Loader2, CheckCircle2, AlertTriangle, User, Gift, Clock, Package } from "lucide-react";

export default function KlaimVoucher() {
	const [code, setCode] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [voucher, setVoucher] = useState(null);
	const [notFoundMsg, setNotFoundMsg] = useState("");

	const [isClaiming, setIsClaiming] = useState(false);
	const [claimResult, setClaimResult] = useState(null); // { success, message }

	const token = localStorage.getItem("token");

	const handleSearch = async (e) => {
		e.preventDefault();

		if (!code.trim()) return;

		setIsSearching(true);
		setVoucher(null);
		setNotFoundMsg("");
		setClaimResult(null);

		try {
			const res = await fetch(`http://127.0.0.1:8000/api/pos-mitra/vouchers/${encodeURIComponent(code.trim())}`, {
				headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
			});

			const data = await res.json();

			if (!res.ok) {
				setNotFoundMsg(data.message || "Kode voucher tidak ditemukan.");
				return;
			}

			setVoucher(data);
		} catch (err) {
			console.error(err);
			setNotFoundMsg("Terjadi kesalahan saat mencari kode voucher.");
		} finally {
			setIsSearching(false);
		}
	};

	const handleClaim = async () => {
		if (!voucher) return;

		setIsClaiming(true);

		try {
			const res = await fetch(`http://127.0.0.1:8000/api/pos-mitra/vouchers/${encodeURIComponent(voucher.unique_code)}/claim`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
			});

			const data = await res.json();

			if (!res.ok) {
				setClaimResult({ success: false, message: data.message });
				return;
			}

			setClaimResult({ success: true, message: data.message });
			setVoucher((prev) => ({ ...prev, claim_status: "claimed" }));
		} catch (err) {
			setClaimResult({ success: false, message: "Terjadi kesalahan saat memproses klaim." });
		} finally {
			setIsClaiming(false);
		}
	};

	const resetSearch = () => {
		setCode("");
		setVoucher(null);
		setNotFoundMsg("");
		setClaimResult(null);
	};

	return (
		<PosMitraLayout>
			<div className="w-full max-w-2xl mx-auto px-4 py-6">
				<div className="mb-8">
					<div className="flex items-center gap-3">
						<div className="p-2.5 bg-[#0b2f83] text-white rounded-2xl shadow-lg">
							<Ticket size={22} />
						</div>
						<div>
							<h1 className="text-xl font-black text-gray-800">Klaim Voucher</h1>
							<p className="text-sm text-gray-400">Masukkan kode unik dari customer untuk verifikasi penukaran reward</p>
						</div>
					</div>
				</div>

				{/* FORM CARI KODE */}
				<form onSubmit={handleSearch} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-6">
					<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Unik Voucher</label>
					<div className="flex gap-3 mt-2">
						<input
							type="text"
							value={code}
							onChange={(e) => setCode(e.target.value.toUpperCase())}
							placeholder="Contoh: NBG-X7K2P9QW"
							className="flex-1 px-4 py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-black tracking-wider outline-none focus:border-[#0b2f83] focus:bg-white transition-all uppercase"
						/>
						<button
							type="submit"
							disabled={isSearching || !code.trim()}
							className="px-6 py-3.5 bg-[#0b2f83] text-white rounded-2xl font-black text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-2"
						>
							{isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
							Cari
						</button>
					</div>
				</form>

				{/* HASIL: TIDAK DITEMUKAN */}
				{notFoundMsg && (
					<div className="bg-red-50 border border-red-100 rounded-[2rem] p-6 flex items-start gap-4">
						<AlertTriangle className="text-red-500 shrink-0" size={22} />
						<div>
							<p className="text-sm font-bold text-red-700">{notFoundMsg}</p>
							<button onClick={resetSearch} className="text-xs font-black text-red-600 underline mt-2">
								Coba lagi
							</button>
						</div>
					</div>
				)}

				{/* HASIL: VOUCHER DITEMUKAN */}
				{voucher && (
					<div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
						{/* STATUS BANNER */}
						<div className={`px-6 py-4 flex items-center gap-3 ${voucher.claim_status === "claimed" ? "bg-gray-100" : "bg-emerald-50"}`}>
							{voucher.claim_status === "claimed" ? <CheckCircle2 className="text-gray-400" size={20} /> : <Gift className="text-emerald-600" size={20} />}
							<p className={`text-sm font-black uppercase tracking-wide ${voucher.claim_status === "claimed" ? "text-gray-500" : "text-emerald-700"}`}>
								{voucher.claim_status === "claimed" ? "Sudah Diklaim" : "Belum Diklaim — Siap Diserahkan"}
							</p>
						</div>

						<div className="p-6 space-y-5">
							{/* REWARD INFO */}
							<div className="flex items-center gap-4">
								<div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
									{voucher.reward?.image ? <img src={voucher.reward.image} alt={voucher.reward.title} className="w-full h-full object-cover" /> : <Package className="text-gray-300" size={24} />}
								</div>
								<div className="min-w-0">
									<p className="text-base font-black text-gray-800 truncate">{voucher.reward?.title}</p>
									<p className="text-xs text-gray-400">{voucher.reward?.points_required} poin</p>
								</div>
							</div>

							<div className="h-px bg-gray-100"></div>

							{/* CUSTOMER INFO */}
							<div className="flex items-center gap-3">
								<div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
									<User size={16} />
								</div>
								<div>
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ditukar Oleh</p>
									<p className="text-sm font-bold text-gray-800">{voucher.customer?.name}</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
									<Clock size={16} />
								</div>
								<div>
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu Penukaran</p>
									<p className="text-sm font-bold text-gray-800">{new Date(voucher.redeemed_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
								</div>
							</div>

							{voucher.claim_status === "claimed" && (
								<div className="bg-gray-50 rounded-2xl p-4">
									<p className="text-xs text-gray-500">
										Sudah diklaim pada <span className="font-bold text-gray-700">{new Date(voucher.claimed_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
										{voucher.claimed_by && (
											<>
												{" "}
												oleh <span className="font-bold text-gray-700">{voucher.claimed_by}</span>
											</>
										)}
										.
									</p>
								</div>
							)}

							{/* ACTION */}
							{voucher.claim_status !== "claimed" && !claimResult && (
								<button
									onClick={handleClaim}
									disabled={isClaiming}
									className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
								>
									{isClaiming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
									Konfirmasi Serahkan Barang
								</button>
							)}

							{claimResult && (
								<div className={`rounded-2xl p-4 flex items-start gap-3 ${claimResult.success ? "bg-emerald-50" : "bg-red-50"}`}>
									{claimResult.success ? <CheckCircle2 className="text-emerald-600 shrink-0" size={18} /> : <AlertTriangle className="text-red-500 shrink-0" size={18} />}
									<p className={`text-sm font-bold ${claimResult.success ? "text-emerald-700" : "text-red-700"}`}>{claimResult.message}</p>
								</div>
							)}

							<button onClick={resetSearch} className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm transition-all">
								Cari Kode Lain
							</button>
						</div>
					</div>
				)}
			</div>
		</PosMitraLayout>
	);
}