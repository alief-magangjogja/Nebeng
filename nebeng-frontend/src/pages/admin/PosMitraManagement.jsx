import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { Store, Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";

const API_URL = "http://127.0.0.1:8000/api";

const emptyForm = {
	id: null,
	name: "",
	email: "",
	phone: "",
	password: "",
	pickup_point_id: "",
};

export default function PosMitraManagement() {
	const [accounts, setAccounts] = useState([]);
	const [availablePoints, setAvailablePoints] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const [showModal, setShowModal] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const isEditing = !!form.id;

	const [deleteTarget, setDeleteTarget] = useState(null);

	const headers = {
		Authorization: `Bearer ${localStorage.getItem("token")}`,
		Accept: "application/json",
		"Content-Type": "application/json",
	};

	const fetchAccounts = async () => {
		setLoading(true);
		try {
			const res = await fetch(`${API_URL}/admin/pos-mitra`, { headers });
			setAccounts(await res.json());
		} catch (err) {
			console.error(err);
			toast.error("Gagal memuat data akun pos mitra");
		} finally {
			setLoading(false);
		}
	};

	// Ambil daftar pos yang BELUM punya akun - dipanggil ulang tiap kali
	// modal dibuka supaya datanya selalu segar (mis. kalau baru saja hapus
	// akun lain, posnya langsung muncul lagi sebagai pilihan).
	const fetchAvailablePoints = async (exceptUserId = null) => {
		try {
			const url = new URL(`${API_URL}/admin/pos-mitra/available-pickup-points`);
			if (exceptUserId) url.searchParams.set("except_user_id", exceptUserId);

			const res = await fetch(url, { headers });
			setAvailablePoints(await res.json());
		} catch (err) {
			console.error(err);
		}
	};

	useEffect(() => {
		fetchAccounts();
	}, []);

	const filteredAccounts = useMemo(() => {
		const keyword = searchTerm.toLowerCase();
		return accounts.filter(
			(a) =>
				a.name?.toLowerCase().includes(keyword) ||
				a.email?.toLowerCase().includes(keyword) ||
				a.pickup_point?.pos_name?.toLowerCase().includes(keyword) ||
				a.pickup_point?.city?.name?.toLowerCase().includes(keyword)
		);
	}, [accounts, searchTerm]);

	const openAddModal = () => {
		setForm(emptyForm);
		fetchAvailablePoints();
		setShowModal(true);
	};

	const openEditModal = (account) => {
		setForm({
			id: account.id,
			name: account.name,
			email: account.email,
			phone: account.phone,
			password: "",
			pickup_point_id: account.pickup_point_id ?? "",
		});
		fetchAvailablePoints(account.id);
		setShowModal(true);
	};

	const handleChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!form.name || !form.email || !form.phone || !form.pickup_point_id || (!isEditing && !form.password)) {
			toast.error(isEditing ? "Nama, email, no. HP, dan pos wajib diisi" : "Semua field wajib diisi, termasuk password");
			return;
		}

		setSaving(true);

		try {
			const url = isEditing ? `${API_URL}/admin/pos-mitra/${form.id}` : `${API_URL}/admin/pos-mitra`;
			const method = isEditing ? "PUT" : "POST";

			const body = {
				name: form.name,
				email: form.email,
				phone: form.phone,
				pickup_point_id: form.pickup_point_id,
			};
			// Saat edit, password cuma dikirim kalau memang mau diganti -
			// biarkan kosong berarti tetap pakai password lama.
			if (form.password) body.password = form.password;

			const res = await fetch(url, {
				method,
				headers,
				body: JSON.stringify(body),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || Object.values(data.errors || {})[0]?.[0] || "Gagal menyimpan akun pos mitra");
			}

			toast.success(isEditing ? "Akun pos mitra berhasil diperbarui" : "Akun pos mitra berhasil ditambahkan");
			setShowModal(false);
			fetchAccounts();
		} catch (err) {
			toast.error(err.message);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;

		try {
			const res = await fetch(`${API_URL}/admin/pos-mitra/${deleteTarget.id}`, {
				method: "DELETE",
				headers,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal menghapus akun pos mitra");
			}

			toast.success("Akun pos mitra berhasil dihapus");
			setDeleteTarget(null);
			fetchAccounts();
		} catch (err) {
			toast.error(err.message);
			setDeleteTarget(null);
		}
	};

	return (
		<AdminLayout>
			<div className="w-full max-w-6xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-black text-indigo-900">Daftar Pos Mitra</h1>
						<p className="text-sm text-gray-400">Setiap akun pos mitra bertugas di satu pos (pickup point) untuk scan QR keberangkatan/kedatangan trip.</p>
					</div>
					<button onClick={openAddModal} className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-800 active:scale-95 transition-all">
						<Plus size={18} /> Tambah Akun Pos Mitra
					</button>
				</div>

				{/* SEARCH */}
				<div className="relative mb-6">
					<Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Cari nama, email, atau nama pos..."
						className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all"
					/>
				</div>

				{/* TABLE */}
				<div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center py-16 text-gray-400 gap-2">
							<Loader2 className="animate-spin" size={20} /> Memuat data...
						</div>
					) : filteredAccounts.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-gray-300">
							<Store size={40} className="mb-2" />
							<p className="text-sm font-bold">Belum ada akun pos mitra</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-100 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
										<th className="px-6 py-4">Nama</th>
										<th className="px-6 py-4">Email</th>
										<th className="px-6 py-4">No. HP</th>
										<th className="px-6 py-4">Pos Bertugas</th>
										<th className="px-6 py-4 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{filteredAccounts.map((a) => (
										<tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
											<td className="px-6 py-4 font-bold text-gray-700">{a.name}</td>
											<td className="px-6 py-4 text-gray-500">{a.email}</td>
											<td className="px-6 py-4 text-gray-500">{a.phone}</td>
											<td className="px-6 py-4">
												{a.pickup_point ? (
													<span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
														{a.pickup_point.city?.name} - {a.pickup_point.pos_name}
													</span>
												) : (
													<span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">Belum ada pos</span>
												)}
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center justify-end gap-2">
													<button onClick={() => openEditModal(a)} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
														<Pencil size={16} />
													</button>
													<button onClick={() => setDeleteTarget(a)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
														<Trash2 size={16} />
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* MODAL TAMBAH / EDIT */}
			{showModal && (
				<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
					<div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-black text-indigo-900">{isEditing ? "Edit Akun Pos Mitra" : "Tambah Akun Pos Mitra"}</h2>
							<button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
								<X size={18} className="text-gray-400" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="p-6 space-y-4">
							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama</label>
								<input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Contoh: Petugas Pos 1 Yogyakarta" className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all" />
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
								<input type="email" name="email" value={form.email} onChange={handleChange} placeholder="posmitra1@nebeng.com" className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all" />
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">No. HP</label>
								<input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="08123456789" className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all" />
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isEditing ? "Password Baru (opsional)" : "Password"}</label>
								<input
									type="password"
									name="password"
									value={form.password}
									onChange={handleChange}
									placeholder={isEditing ? "Kosongkan jika tidak ingin mengganti" : "Minimal 6 karakter"}
									className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all"
								/>
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pos Bertugas</label>
								<select name="pickup_point_id" value={form.pickup_point_id} onChange={handleChange} className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all">
									<option value="">Pilih pos</option>
									{availablePoints.map((p) => (
										<option key={p.id} value={p.id}>
											{p.city?.name} - {p.pos_name}
										</option>
									))}
								</select>
								<p className="text-[11px] text-gray-400 mt-1.5 ml-1">Hanya pos yang belum punya akun pos mitra yang muncul di sini.</p>
							</div>

							<div className="flex gap-3 pt-2">
								<button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-black text-sm hover:bg-gray-200 transition-all">
									Batal
								</button>
								<button type="submit" disabled={saving} className="flex-1 py-3.5 rounded-2xl bg-indigo-900 text-white font-black text-sm shadow-lg hover:bg-indigo-800 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
									{saving && <Loader2 size={16} className="animate-spin" />}
									{isEditing ? "Simpan Perubahan" : "Tambah"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL KONFIRMASI HAPUS */}
			{deleteTarget && (
				<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
					<div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
						<div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5">
							<Trash2 size={26} />
						</div>
						<h2 className="text-lg font-black text-indigo-900 mb-2">Hapus Akun Pos Mitra?</h2>
						<p className="text-sm text-gray-500 mb-6">
							Akun "{deleteTarget.name}" ({deleteTarget.pickup_point?.pos_name || "tanpa pos"}) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
						</p>
						<div className="flex gap-3">
							<button onClick={() => setDeleteTarget(null)} className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-black text-sm hover:bg-gray-200 transition-all">
								Batal
							</button>
							<button onClick={handleDelete} className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all">
								Ya, Hapus
							</button>
						</div>
					</div>
				</div>
			)}
		</AdminLayout>
	);
}