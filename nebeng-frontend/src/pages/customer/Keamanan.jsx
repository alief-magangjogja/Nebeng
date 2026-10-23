import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, ShieldCheck, KeyRound, BadgeCheck, AlertTriangle, Clock, ChevronRight, Loader2 } from "lucide-react";

export default function Keamanan() {
	const navigate = useAppNavigate();
	const [loading, setLoading] = useState(true);
	const [verificationStatus, setVerificationStatus] = useState(null); // null | 'pending' | 'approved' | 'rejected'

	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");
				const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

				const verifRes = await fetch("http://127.0.0.1:8000/api/verification/status", { headers });

				if (verifRes.ok) {
					const verifData = await verifRes.json();
					setVerificationStatus(verifData?.status || null);
				}
			} catch (err) {
				console.error("Fetch keamanan error:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const verifBadge = () => {
		if (verificationStatus === "verified") {
			return { label: "Terverifikasi", color: "text-emerald-600", bg: "bg-emerald-50", icon: BadgeCheck };
		}
		if (verificationStatus === "pending") {
			return { label: "Sedang Ditinjau", color: "text-amber-600", bg: "bg-amber-50", icon: Clock };
		}
		if (verificationStatus === "rejected") {
			return { label: "Ditolak, Perlu Diperbaiki", color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle };
		}
		return { label: "Belum Verifikasi", color: "text-gray-500", bg: "bg-gray-100", icon: AlertTriangle };
	};

	const badge = verifBadge();

	const securityItems = [
		{
			id: "verification",
			title: "Verifikasi Identitas",
			desc: badge.label,
			icon: ShieldCheck,
			color: badge.color,
			bg: badge.bg,
			badgeIcon: badge.icon,
			path: "/customer/verification",
		},
		{
			id: "password",
			title: "Password Akun",
			desc: "Perbarui secara berkala untuk keamanan",
			icon: KeyRound,
			color: "text-purple-600",
			bg: "bg-purple-50",
			badgeIcon: null,
			path: "/customer/atur-password",
		},
	];

	return (
		<CustomerLayout>
			<div className="w-full max-w-3xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
						<ChevronLeft className="w-6 h-6 text-indigo-900" />
					</button>
					<div>
						<h1 className="text-2xl font-black text-indigo-900">Keamanan</h1>
						<p className="text-sm text-gray-400">Pantau dan kelola keamanan akun kamu</p>
					</div>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-16 text-gray-400 gap-2 bg-white rounded-[40px] border border-gray-100">
						<Loader2 className="animate-spin" size={20} /> Memuat status keamanan...
					</div>
				) : (
					<>
						{/* STATUS CARDS */}
						<div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 mb-6">
							<h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Status Keamanan Akun</h3>
							<div className="space-y-3">
								{securityItems.map((item) => (
									<button
										key={item.id}
										onClick={() => navigate(item.path)}
										className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-100"
									>
										<div className="flex items-center gap-4">
											<div className={`p-3 ${item.bg} ${item.color} rounded-2xl shadow-sm group-hover:scale-110 transition-transform`}>
												<item.icon size={20} />
											</div>
											<div className="text-left">
												<p className="text-sm font-bold text-gray-700">{item.title}</p>
												<p className={`text-xs font-semibold flex items-center gap-1 ${item.color}`}>
													{item.badgeIcon && <item.badgeIcon size={12} />}
													{item.desc}
												</p>
											</div>
										</div>
										<ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
									</button>
								))}
							</div>
						</div>

						{/* TIPS KEAMANAN */}
						<div className="bg-indigo-900 rounded-[40px] p-8 text-white">
							<h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-4">Tips Keamanan</h3>
							<ul className="space-y-3 text-sm text-indigo-100 font-medium">
								<li className="flex gap-2">
									<span className="text-indigo-400">•</span> Jangan bagikan PIN atau password ke siapa pun, termasuk pihak yang mengaku dari Nebeng.
								</li>
								<li className="flex gap-2">
									<span className="text-indigo-400">•</span> Gunakan kombinasi PIN yang tidak mudah ditebak (hindari tanggal lahir).
								</li>
								<li className="flex gap-2">
									<span className="text-indigo-400">•</span> Segera laporkan ke Pusat Bantuan jika ada aktivitas mencurigakan pada akunmu.
								</li>
							</ul>
						</div>
					</>
				)}
			</div>
		</CustomerLayout>
	);
}