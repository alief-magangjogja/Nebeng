import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { Wallet, CreditCard, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

export default function PenarikanSaldo() {
	const [loading, setLoading] = useState(true);
	const [withdrawals, setWithdrawals] = useState([]);
	const [processingId, setProcessingId] = useState(null);

	const headers = () => ({
		Authorization: `Bearer ${localStorage.getItem("token")}`,
		Accept: "application/json",
	});

	const fetchPending = async () => {
		try {
			const res = await fetch("http://127.0.0.1:8000/api/admin/withdrawals/pending", { headers: headers() });
			const data = await res.json();
			setWithdrawals(Array.isArray(data) ? data : []);
		} catch (err) {
			console.error("Gagal ambil daftar penarikan:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPending();
	}, []);

	const handleApprove = async (id) => {
		if (!window.confirm("Setujui penarikan saldo ini? Saldo mitra akan langsung dipotong.")) return;

		setProcessingId(id);
		try {
			const res = await fetch(`http://127.0.0.1:8000/api/admin/withdrawals/${id}/approve`, {
				method: "POST",
				headers: headers(),
			});
			const data = await res.json();

			if (!res.ok) throw new Error(data.message || "Gagal menyetujui penarikan");

			setWithdrawals((prev) => prev.filter((w) => w.id !== id));
		} catch (err) {
			alert(err.message);
		} finally {
			setProcessingId(null);
		}
	};

	const handleReject = async (id) => {
		const reason = window.prompt("Alasan penolakan (opsional):", "");
		if (reason === null) return; // batal

		setProcessingId(id);
		try {
			const res = await fetch(`http://127.0.0.1:8000/api/admin/withdrawals/${id}/reject`, {
				method: "POST",
				headers: { ...headers(), "Content-Type": "application/json" },
				body: JSON.stringify({ reason }),
			});
			const data = await res.json();

			if (!res.ok) throw new Error(data.message || "Gagal menolak penarikan");

			setWithdrawals((prev) => prev.filter((w) => w.id !== id));
		} catch (err) {
			alert(err.message);
		} finally {
			setProcessingId(null);
		}
	};

	const formatDate = (dateStr) => {
		return new Date(dateStr).toLocaleString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<AdminLayout>
			<div className="w-full max-w-4xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="mb-8">
					<h1 className="text-2xl font-black text-indigo-900">Verifikasi Penarikan Saldo</h1>
					<p className="text-sm text-gray-400">Permintaan tarik saldo mitra yang perlu disetujui</p>
				</div>

				<div className="bg-white rounded-[40px] p-4 shadow-sm border border-gray-100">
					{loading ? (
						<div className="flex items-center justify-center py-16 text-gray-400 gap-2">
							<Loader2 className="animate-spin" size={20} /> Memuat data...
						</div>
					) : withdrawals.length > 0 ? (
						<div className="space-y-3">
							{withdrawals.map((w) => (
								<div key={w.id} className="p-5 rounded-3xl border border-gray-100 hover:bg-gray-50/50 transition-all">
									<div className="flex items-start justify-between gap-4 mb-4">
										<div className="flex items-center gap-4">
											<div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
												<Wallet size={20} />
											</div>
											<div>
												<p className="text-sm font-black text-gray-800">{w.mitra.name}</p>
												<p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
													<Clock size={11} /> {formatDate(w.created_at)}
												</p>
											</div>
										</div>
										<p className="text-lg font-black text-indigo-900 shrink-0">Rp {Number(w.amount).toLocaleString("id-ID")}</p>
									</div>

									<div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4 mb-4">
										<CreditCard size={18} className="text-gray-400 shrink-0" />
										<div className="min-w-0">
											<p className="text-xs font-bold text-gray-700">
												{w.mitra.bank_name} • {w.mitra.bank_account_name}
											</p>
											<p className="text-xs text-gray-400 tracking-wide">{w.mitra.bank_account_number}</p>
										</div>
									</div>

									<div className="flex gap-3">
										<button
											onClick={() => handleReject(w.id)}
											disabled={processingId === w.id}
											className="flex-1 py-3 rounded-2xl bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
										>
											<XCircle size={16} /> Tolak
										</button>
										<button
											onClick={() => handleApprove(w.id)}
											disabled={processingId === w.id}
											className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
										>
											<CheckCircle2 size={16} /> Setujui
										</button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-gray-300">
							<Wallet size={40} className="mb-2" />
							<p className="text-sm font-bold">Tidak ada permintaan penarikan</p>
						</div>
					)}
				</div>
			</div>
		</AdminLayout>
	);
}