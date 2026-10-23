import React, { useEffect, useState } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import useAppNavigate from "../../hooks/useAppNavigate";
import axios from "../../api/axios";
import { ChevronLeft, Landmark, Wallet, Plus, Trash2, Loader2, X, ShieldCheck } from "lucide-react";
import AlertModal from "../../components/ui/AlertModal";
import ConfirmModal from "../../components/ui/ConfirmModal";

function maskAccountNumber(number) {
	const clean = String(number || "");
	if (clean.length <= 7) return clean;
	const front = clean.slice(0, 4);
	const back = clean.slice(-3);
	return `${front}${"*".repeat(Math.max(clean.length - 7, 4))}${back}`;
}

const PROVIDER_OPTIONS = {
	bank: ["BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB Niaga", "Bank Lainnya"],
	ewallet: ["GoPay", "DANA", "OVO", "ShopeePay", "LinkAja", "E-Wallet Lainnya"],
};

export default function RekeningSaya() {
	const navigate = useAppNavigate();
	const [accounts, setAccounts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showAddModal, setShowAddModal] = useState(false);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleting, setDeleting] = useState(false);
	const [alertInfo, setAlertInfo] = useState({ show: false, type: "success", title: "", message: "" });

	const [form, setForm] = useState({
		account_type: "bank",
		provider_name: "BCA",
		account_number: "",
		account_holder_name: "",
	});

	const fetchAccounts = async () => {
		try {
			setLoading(true);
			const res = await axios.get("/payment-accounts");
			setAccounts(res.data || []);
		} catch (err) {
			console.error("Gagal mengambil daftar rekening:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAccounts();
	}, []);

	const openAddModal = () => {
		setForm({ account_type: "bank", provider_name: "BCA", account_number: "", account_holder_name: "" });
		setFormError("");
		setShowAddModal(true);
	};

	const handleAddAccount = async () => {
		setFormError("");

		if (!form.provider_name.trim() || !form.account_number.trim() || !form.account_holder_name.trim()) {
			setFormError("Semua kolom wajib diisi.");
			return;
		}
		if (form.account_number.trim().length < 4) {
			setFormError("Nomor rekening/e-wallet terlalu pendek.");
			return;
		}

		try {
			setSaving(true);
			const res = await axios.post("/payment-accounts", form);
			setAccounts((prev) => [res.data.account, ...prev]);
			setShowAddModal(false);
			setAlertInfo({ show: true, type: "success", title: "Tersimpan", message: "Rekening/e-wallet berhasil ditambahkan." });
		} catch (err) {
			setFormError(err.response?.data?.message || "Gagal menyimpan rekening baru.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		try {
			setDeleting(true);
			await axios.delete(`/payment-accounts/${deleteTarget.id}`);
			setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
			setDeleteTarget(null);
			setAlertInfo({ show: true, type: "success", title: "Terhapus", message: "Rekening/e-wallet berhasil dihapus." });
		} catch (err) {
			setAlertInfo({
				show: true,
				type: "error",
				title: "Gagal",
				message: err.response?.data?.message || "Terjadi kesalahan saat menghapus rekening.",
			});
		} finally {
			setDeleting(false);
		}
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-screen-md mx-auto px-4 py-6 space-y-6">
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
						<ChevronLeft size={24} className="text-indigo-900" />
					</button>
					<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Rekening &amp; E-Wallet</h1>
				</div>

				<div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em]">Tersimpan</h3>
						<button
							onClick={openAddModal}
							className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-[11px] font-black uppercase tracking-wider transition-all"
						>
							<Plus size={14} /> Tambah
						</button>
					</div>

					{loading ? (
						<div className="py-10 flex justify-center">
							<Loader2 className="animate-spin text-indigo-300" size={28} />
						</div>
					) : accounts.length === 0 ? (
						<div className="py-10 text-center space-y-2">
							<Wallet size={40} className="mx-auto text-gray-200" />
							<p className="text-xs font-bold text-gray-400">Belum ada rekening/e-wallet tersimpan.</p>
							<p className="text-[11px] text-gray-300">Tambahkan supaya proses refund lebih cepat, tanpa perlu isi manual tiap kali.</p>
						</div>
					) : (
						<div className="space-y-3">
							{accounts.map((acc) => (
								<div key={acc.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
									<div className="flex items-center gap-3">
										<div className="p-2.5 bg-white rounded-xl text-indigo-600 shadow-sm">
											{acc.account_type === "bank" ? <Landmark size={18} /> : <Wallet size={18} />}
										</div>
										<div>
											<p className="text-sm font-black text-gray-800">{acc.provider_name}</p>
											<p className="text-xs font-bold text-gray-500 tracking-wider">{maskAccountNumber(acc.account_number)}</p>
											<p className="text-[10px] text-gray-400 uppercase tracking-wider">a.n. {acc.account_holder_name}</p>
										</div>
									</div>
									<button onClick={() => setDeleteTarget(acc)} className="p-2.5 rounded-xl bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border border-gray-100 transition-all">
										<Trash2 size={16} />
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
					<ShieldCheck size={14} />
					Data rekening hanya digunakan untuk keperluan refund
				</div>
			</div>

			{showAddModal && (
				<div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-gray-100 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-black text-gray-800">Tambah Rekening/E-Wallet</h3>
							<button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
								<X size={16} className="text-gray-400" />
							</button>
						</div>

						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setForm((f) => ({ ...f, account_type: "bank", provider_name: PROVIDER_OPTIONS.bank[0] }))}
								className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border ${
									form.account_type === "bank" ? "bg-indigo-900 text-white border-indigo-900" : "bg-white text-gray-500 border-gray-200"
								}`}
							>
								<Landmark size={14} /> Bank
							</button>
							<button
								type="button"
								onClick={() => setForm((f) => ({ ...f, account_type: "ewallet", provider_name: PROVIDER_OPTIONS.ewallet[0] }))}
								className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border ${
									form.account_type === "ewallet" ? "bg-indigo-900 text-white border-indigo-900" : "bg-white text-gray-500 border-gray-200"
								}`}
							>
								<Wallet size={14} /> E-Wallet
							</button>
						</div>

						<div>
							<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nama Bank/E-Wallet</label>
							<select
								value={form.provider_name}
								onChange={(e) => setForm((f) => ({ ...f, provider_name: e.target.value }))}
								className="w-full mt-1 text-xs font-bold rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
							>
								{PROVIDER_OPTIONS[form.account_type].map((p) => (
									<option key={p} value={p}>
										{p}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nomor Rekening/E-Wallet</label>
							<input
								type="text"
								inputMode="numeric"
								value={form.account_number}
								onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value.replace(/\D/g, "") }))}
								placeholder="Contoh: 1234567890"
								className="w-full mt-1 text-xs rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
							/>
						</div>

						<div>
							<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nama Pemilik Rekening</label>
							<input
								type="text"
								value={form.account_holder_name}
								onChange={(e) => setForm((f) => ({ ...f, account_holder_name: e.target.value }))}
								placeholder="Sesuai buku tabungan/aplikasi e-wallet"
								className="w-full mt-1 text-xs rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
							/>
						</div>

						{formError && <p className="text-[11px] font-bold text-red-500">{formError}</p>}

						<div className="flex gap-2 pt-1">
							<button
								onClick={() => setShowAddModal(false)}
								disabled={saving}
								className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-[11px] uppercase tracking-wider transition-all disabled:opacity-50"
							>
								Batal
							</button>
							<button
								onClick={handleAddAccount}
								disabled={saving}
								className="flex-1 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-black text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
							>
								{saving ? (
									<Loader2 className="animate-spin" size={14} />
								) : (
									<>
										<Plus size={14} /> Simpan
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			<ConfirmModal
				show={!!deleteTarget}
				title="Hapus Rekening"
				message={deleteTarget ? `Hapus ${deleteTarget.provider_name} a.n. ${deleteTarget.account_holder_name} dari daftar tersimpan?` : ""}
				confirmText="Ya, Hapus"
				loading={deleting}
				onConfirm={handleDelete}
				onCancel={() => setDeleteTarget(null)}
			/>

			<AlertModal show={alertInfo.show} type={alertInfo.type} title={alertInfo.title} message={alertInfo.message} onClose={() => setAlertInfo((prev) => ({ ...prev, show: false }))} />
		</CustomerLayout>
	);
}