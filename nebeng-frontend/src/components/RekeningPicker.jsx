import React, { useEffect, useState } from "react";
import { Landmark, Wallet, Plus, X, Loader2, ChevronDown } from "lucide-react";
import axios from "../api/axios";

// Menyamarkan nomor rekening/e-wallet untuk TAMPILAN dropdown saja - supaya
// aman kalau customer screenshot halaman ini untuk dikirim ke mitra/CS.
// Nilai ASLI (utuh) tetap yang dikirim & disimpan ke backend, mitra tetap
// butuh nomor lengkap untuk benar-benar transfer.
function maskAccountNumber(number) {
	const clean = String(number || "");
	if (clean.length <= 7) return clean;
	const front = clean.slice(0, 4);
	const back = clean.slice(-3);
	return `${front}${"*".repeat(Math.max(clean.length - 7, 4))}${back}`;
}

function formatAccountLabel(acc) {
	return `${acc.provider_name} - ${maskAccountNumber(acc.account_number)} a.n. ${acc.account_holder_name}`;
}

// Nilai LENGKAP (tidak disamarkan) yang benar-benar dikirim ke backend/mitra.
function fullAccountValue(acc) {
	return `${acc.provider_name} ${acc.account_number} a.n. ${acc.account_holder_name}`;
}

const PROVIDER_OPTIONS = {
	bank: ["BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB Niaga", "Bank Lainnya"],
	ewallet: ["GoPay", "DANA", "OVO", "ShopeePay", "LinkAja", "E-Wallet Lainnya"],
};

export default function RekeningPicker({ value, onChange, accentColor = "indigo" }) {
	const [accounts, setAccounts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedId, setSelectedId] = useState("");
	const [showAddModal, setShowAddModal] = useState(false);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	const [form, setForm] = useState({
		account_type: "bank",
		provider_name: "BCA",
		account_number: "",
		account_holder_name: "",
	});

	const ringClass = accentColor === "red" ? "focus:ring-red-200" : "focus:ring-indigo-200";

	const fetchAccounts = async () => {
		try {
			setLoading(true);
			const res = await axios.get("/payment-accounts");
			setAccounts(res.data || []);

			// Kalau value aktif (dari order tersimpan) cocok persis dengan
			// salah satu rekening tersimpan, tandai sebagai terpilih.
			const match = (res.data || []).find((acc) => fullAccountValue(acc) === value);
			if (match) setSelectedId(String(match.id));
		} catch (err) {
			console.error("Gagal mengambil daftar rekening:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAccounts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleSelect = (e) => {
		const val = e.target.value;

		if (val === "__add_new__") {
			setFormError("");
			setShowAddModal(true);
			return;
		}

		setSelectedId(val);
		const acc = accounts.find((a) => String(a.id) === val);
		if (acc) onChange(fullAccountValue(acc));
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
			const newAccount = res.data.account;
			setAccounts((prev) => [newAccount, ...prev]);
			setSelectedId(String(newAccount.id));
			onChange(fullAccountValue(newAccount));
			setShowAddModal(false);
			setForm({ account_type: "bank", provider_name: "BCA", account_number: "", account_holder_name: "" });
		} catch (err) {
			setFormError(err.response?.data?.message || "Gagal menyimpan rekening baru.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-2">
			<div className="relative">
				<select
					value={selectedId}
					onChange={handleSelect}
					disabled={loading}
					className={`w-full appearance-none text-xs font-bold rounded-xl border border-gray-200 pl-3 pr-9 py-2.5 focus:outline-none ${ringClass} bg-white disabled:opacity-60`}
				>
					<option value="" disabled>
						{loading ? "Memuat rekening tersimpan..." : accounts.length ? "Pilih rekening/e-wallet tersimpan" : "Belum ada rekening tersimpan"}
					</option>
					{accounts.map((acc) => (
						<option key={acc.id} value={acc.id}>
							{formatAccountLabel(acc)}
						</option>
					))}
					<option value="__add_new__">+ Tambah Rekening/E-Wallet Baru</option>
				</select>
				<ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
		</div>
	);
}