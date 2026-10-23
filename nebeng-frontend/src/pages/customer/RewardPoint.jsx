import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { Search, Star, ChevronRight, ChevronLeft, PlusCircle, History, X, Bike, Car, Package, Gift, CheckCircle2, Loader2, AlertTriangle, Copy, Check, Lock } from "lucide-react";

const FALLBACK_IMAGE = "https://placehold.co/400x400/eef2ff/4338ca?text=Nebeng+Reward";

export default function RewardPoints() {
	const navigate = useAppNavigate();
	const rewardListRef = useRef(null);

	const [points, setPoints] = useState(0);
	const [searchQuery, setSearchQuery] = useState("");
	const [, setHistory] = useState([]);
	const [showAddPointModal, setShowAddPointModal] = useState(false);

	// ================= KATALOG REWARD (data asli dari backend) =================
	const [rewards, setRewards] = useState([]);
	const [loadingRewards, setLoadingRewards] = useState(true);
	const [activeCategory, setActiveCategory] = useState("Semua");

	// ================= ALUR PENUKARAN =================
	const [confirmReward, setConfirmReward] = useState(null); // reward yang mau dikonfirmasi tukar
	const [isRedeeming, setIsRedeeming] = useState(false);
	const [redeemResult, setRedeemResult] = useState(null); // { success, message, uniqueCode?, rewardTitle? }
	const [codeCopied, setCodeCopied] = useState(false);

	const categories = useMemo(() => {
		const unique = Array.from(new Set(rewards.map((r) => r.category)));
		return ["Semua", ...unique];
	}, [rewards]);

	const fetchRewardData = async () => {
		try {
			const token = localStorage.getItem("token");
			const headers = {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			};

			const pointsRes = await fetch("http://127.0.0.1:8000/api/reward-points", { headers });
			const pointsData = await pointsRes.json();
			setPoints(pointsData.reward_points || 0);

			const historyRes = await fetch("http://127.0.0.1:8000/api/reward-history", { headers });
			const historyData = await historyRes.json();
			setHistory(historyData);
		} catch (err) {
			console.error("Reward fetch error:", err);
		}
	};

	const fetchRewards = async () => {
		setLoadingRewards(true);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch("http://127.0.0.1:8000/api/rewards", {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			const data = await res.json();
			setRewards(Array.isArray(data) ? data : []);
		} catch (err) {
			console.error("Fetch rewards catalog error:", err);
			setRewards([]);
		} finally {
			setLoadingRewards(false);
		}
	};

	useEffect(() => {
		fetchRewardData();
		fetchRewards();
	}, []);

	const filteredRewards = useMemo(() => {
		return rewards.filter((item) => {
			const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = activeCategory === "Semua" || item.category === activeCategory;
			return matchesSearch && matchesCategory;
		});
	}, [rewards, searchQuery, activeCategory]);

	const categoryLabel = (cat) => {
		if (cat === "merchandise") return "Merchandise";
		if (cat === "voucher") return "Voucher";
		return cat.charAt(0).toUpperCase() + cat.slice(1);
	};

	// Klik "Tukar Sekarang" -> buka modal konfirmasi dulu (bukan langsung tukar)
	const handleRedeemClick = (reward) => {
		if (points < reward.points_required) return;
		if (reward.stock !== null && reward.stock <= 0) return;
		setConfirmReward(reward);
	};

	// Konfirmasi di modal -> baru benar-benar panggil API
	const confirmRedeem = async () => {
		if (!confirmReward) return;

		setIsRedeeming(true);

		try {
			const token = localStorage.getItem("token");

			const res = await fetch("http://127.0.0.1:8000/api/reward/redeem", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ reward_id: confirmReward.id }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal menukar reward");
			}

			setPoints(data.remaining_points);
			setRedeemResult({
				success: true,
				message: data.message,
				uniqueCode: data.unique_code,
				rewardTitle: confirmReward.title,
			});

			// refresh katalog (stok bisa berubah) & riwayat poin
			fetchRewards();
			fetchRewardData();
		} catch (err) {
			setRedeemResult({ success: false, message: err.message || "Terjadi kesalahan saat menukar reward" });
		} finally {
			setIsRedeeming(false);
			setConfirmReward(null);
		}
	};

	const handleCopyCode = () => {
		if (!redeemResult?.uniqueCode) return;
		navigator.clipboard.writeText(redeemResult.uniqueCode);
		setCodeCopied(true);
		setTimeout(() => setCodeCopied(false), 2000);
	};

	const closeResultPopup = () => {
		setRedeemResult(null);
		setCodeCopied(false);
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-8 relative">
				{/* HEADER & BACK */}
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
						<ChevronLeft className="w-6 h-6 text-indigo-900" />
					</button>
					<h1 className="text-xl font-black text-indigo-900">Poin Hadiah</h1>
				</div>

				{/* POINT CARD SECTION */}
				<div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100 overflow-hidden relative group">
					<div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
						<div className="flex items-center gap-6">
							<div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 shadow-inner group-hover:rotate-12 transition-transform duration-500">
								<Star size={32} fill="currentColor" />
							</div>
							<div>
								<h1 className="text-3xl md:text-4xl font-black text-indigo-900 tracking-tight">{points.toLocaleString()} Point</h1>
								<p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Status Keanggotaan: Gold</p>
							</div>
						</div>

						<div className="flex gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
							<button
								onClick={() => setShowAddPointModal(true)}
								className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-indigo-900 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-sm"
							>
								<PlusCircle size={18} /> Tambah Point
							</button>
							<Link to="/customer/reward-history" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-indigo-900 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-sm">
								<History size={18} /> Riwayat
							</Link>
						</div>
					</div>
					<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
				</div>

				{/* MODAL POP-UP TAMBAH POINT (info cara dapat poin) */}
				{showAddPointModal && (
					<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
						<div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAddPointModal(false)}></div>

						<div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 md:p-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
							<button onClick={() => setShowAddPointModal(false)} className="absolute right-6 top-6 p-2 text-gray-300 hover:text-indigo-900 transition-colors">
								<X size={24} />
							</button>

							<div className="mb-10">
								<h2 className="text-3xl font-black text-indigo-900 tracking-tight">Tambah Point</h2>
								<p className="text-gray-400 font-medium text-sm mt-2">Point akan bertambah setiap transaksi</p>
							</div>

							<div className="space-y-8">
								<div className="flex gap-6 group">
									<div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-900 shrink-0 group-hover:scale-110 transition-transform">
										<Bike size={32} />
									</div>
									<div>
										<h4 className="text-lg font-black text-indigo-900">Nebeng Motor</h4>
										<p className="text-xs text-gray-400 leading-relaxed font-medium">
											Setiap penggunaan fitur nebeng motor, point akan bertambah sebanyak <span className="text-indigo-600 font-bold">15 point</span>
										</p>
									</div>
								</div>

								<div className="flex gap-6 group">
									<div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-900 shrink-0 group-hover:scale-110 transition-transform">
										<Car size={32} />
									</div>
									<div>
										<h4 className="text-lg font-black text-indigo-900">Nebeng Mobil</h4>
										<p className="text-xs text-gray-400 leading-relaxed font-medium">
											Setiap penggunaan fitur nebeng mobil, point akan bertambah sebanyak <span className="text-indigo-600 font-bold">25 point</span>
										</p>
									</div>
								</div>

								<div className="flex gap-6 group border-b border-gray-50 pb-2">
									<div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-900 shrink-0 group-hover:scale-110 transition-transform">
										<Package size={32} />
									</div>
									<div>
										<h4 className="text-lg font-black text-indigo-900">Nebeng Barang</h4>
										<p className="text-xs text-gray-400 leading-relaxed font-medium">
											Setiap penggunaan fitur nebeng barang, point akan bertambah sebanyak <span className="text-indigo-600 font-bold">20 point</span>
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* SEARCH & KATEGORI */}
				<div className="space-y-6">
					<div className="relative group">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
						<input
							type="text"
							placeholder="Ketik untuk mencari reward kamu..."
							className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-3xl shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-medium"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* DAFTAR REWARD */}
				<div className="space-y-6" ref={rewardListRef}>
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-black text-indigo-900 tracking-tight">Spesial Reward Buat Kamu</h3>
					</div>

					{loadingRewards ? (
						<div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-2">
							<Loader2 className="animate-spin text-indigo-400" size={28} />
							<p className="text-gray-400 font-medium text-sm">Memuat reward...</p>
						</div>
					) : filteredRewards.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{filteredRewards.map((reward) => {
								const outOfStock = reward.stock !== null && reward.stock <= 0;
								const notEnoughPoints = points < reward.points_required;
								const disabled = outOfStock || notEnoughPoints;

								return (
									<div key={reward.id} className="bg-white rounded-4xl p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
										<div className="relative h-48 rounded-2xl overflow-hidden mb-6 bg-gray-50">
											<img
												src={reward.image || FALLBACK_IMAGE}
												alt={reward.title}
												onError={(e) => {
													e.currentTarget.onerror = null;
													e.currentTarget.src = FALLBACK_IMAGE;
												}}
												className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
											/>
											{outOfStock && (
												<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
													<span className="text-white text-xs font-black uppercase tracking-widest">Stok Habis</span>
												</div>
											)}
										</div>
										<h4 className="text-sm font-black text-gray-800 leading-relaxed text-center px-2">{reward.title}</h4>
										<p className="text-center text-indigo-600 text-xs font-bold mt-2">{reward.points_required} Points</p>
										<div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
											{/* Keterangan seberapa kurang poinnya, supaya jelas kenapa tombol tidak bisa diklik */}
											{!outOfStock && notEnoughPoints && <p className="text-center text-[11px] font-bold text-amber-600">Kurang {(reward.points_required - points).toLocaleString()} poin lagi</p>}

											<button
												onClick={() => handleRedeemClick(reward)}
												disabled={disabled}
												className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
													disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-indigo-900 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-800 active:scale-95"
												}`}
											>
												{outOfStock ? (
													"Stok Habis"
												) : notEnoughPoints ? (
													<>
														<Lock size={14} /> Poin Belum Cukup
													</>
												) : (
													<>
														<Gift size={14} /> Tukar Sekarang
													</>
												)}
											</button>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
							<p className="text-gray-400 font-medium italic">Reward tidak ditemukan...</p>
						</div>
					)}
				</div>
			</div>

			{/* MODAL KONFIRMASI TUKAR */}
			{confirmReward && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isRedeeming && setConfirmReward(null)}></div>

					<div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
						<div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5">
							<Gift size={28} />
						</div>

						<h2 className="text-xl font-black text-indigo-900 mb-2">Tukar Reward Ini?</h2>
						<p className="text-sm text-gray-500 mb-1">
							<span className="font-bold text-gray-700">{confirmReward.title}</span>
						</p>
						<p className="text-sm text-gray-500 mb-8">
							Kamu akan menggunakan <span className="font-black text-indigo-600">{confirmReward.points_required} poin</span>. Sisa poin setelahnya: <span className="font-black text-gray-700">{points - confirmReward.points_required}</span>
						</p>

						<div className="flex gap-3">
							<button
								onClick={() => setConfirmReward(null)}
								disabled={isRedeeming}
								className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
							>
								Batal
							</button>
							<button
								onClick={confirmRedeem}
								disabled={isRedeeming}
								className="flex-1 py-3.5 rounded-2xl bg-indigo-900 text-white font-black text-sm shadow-lg hover:bg-indigo-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{isRedeeming ? <Loader2 className="animate-spin" size={16} /> : "Ya, Tukar"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* POPUP HASIL (SUKSES / GAGAL) */}
			{redeemResult && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeResultPopup}></div>

					<div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
						<div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${redeemResult.success ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}>
							{redeemResult.success ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
						</div>

						<h2 className="text-xl font-black text-indigo-900 mb-2">{redeemResult.success ? "Berhasil!" : "Gagal Menukar"}</h2>

						{redeemResult.success && redeemResult.rewardTitle && <p className="text-sm text-gray-600 font-bold mb-3">{redeemResult.rewardTitle}</p>}

						{redeemResult.success && redeemResult.uniqueCode ? (
							<>
								<p className="text-xs text-gray-400 mb-3 leading-relaxed">Tunjukkan atau sebutkan kode ini ke Pos Mitra terdekat untuk mengambil hadiahmu:</p>

								<div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl py-4 px-4 mb-3 flex items-center justify-between gap-3">
									<span className="text-lg font-black text-indigo-900 tracking-widest">{redeemResult.uniqueCode}</span>
									<button onClick={handleCopyCode} className="p-2 bg-white rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all shrink-0">
										{codeCopied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-indigo-600" />}
									</button>
								</div>

								<p className="text-[11px] text-gray-400 mb-6">Kode ini juga tersimpan di halaman Riwayat Poin kamu.</p>
							</>
						) : (
							<p className="text-sm text-gray-500 mb-8 leading-relaxed">{redeemResult.message}</p>
						)}

						<button onClick={closeResultPopup} className="w-full py-3.5 rounded-2xl bg-indigo-900 text-white font-black text-sm shadow-lg hover:bg-indigo-800 transition-all">
							Tutup
						</button>
					</div>
				</div>
			)}
		</CustomerLayout>
	);
}