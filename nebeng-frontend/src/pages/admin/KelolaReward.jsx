import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { Gift, Plus, Pencil, Trash2, X, Loader2, Search, ImageOff, ChevronLeft, ChevronRight, Power } from "lucide-react";
import toast from "react-hot-toast";

const API_URL = "http://127.0.0.1:8000/api";

const emptyForm = {
	id: null,
	title: "",
	description: "",
	points_required: "",
	stock: "",
	unlimitedStock: false,
	category: "merchandise", // Cuma "merchandise" untuk sekarang, voucher potongan harga tidak dipakai
	is_active: true,
	image: null, // File baru (kalau upload ulang)
	currentImage: null, // URL foto yang sudah ada
};

export default function KelolaReward() {
	const [rewards, setRewards] = useState([]);
	const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const [showModal, setShowModal] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const isEditing = !!form.id;

	const [deleteTarget, setDeleteTarget] = useState(null);

	const token = localStorage.getItem("token");
	const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

	const fetchRewards = async (page = 1, search = "") => {
		setLoading(true);

		try {
			const params = new URLSearchParams({ page });
			if (search) params.append("search", search);

			const res = await fetch(`${API_URL}/admin/rewards?${params.toString()}`, { headers });
			const data = await res.json();

			setRewards(data.data || []);
			setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total });
		} catch (err) {
			console.error(err);
			toast.error("Gagal memuat data reward");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRewards(1, "");
	}, []);

	const handleSearch = (e) => {
		e.preventDefault();
		fetchRewards(1, searchTerm);
	};

	const openAddModal = () => {
		setForm(emptyForm);
		setShowModal(true);
	};

	const openEditModal = (reward) => {
		setForm({
			id: reward.id,
			title: reward.title,
			description: reward.description || "",
			points_required: reward.points_required,
			stock: reward.stock ?? "",
			unlimitedStock: reward.stock === null,
			category: "merchandise",
			is_active: reward.is_active,
			image: null,
			currentImage: reward.image,
		});
		setShowModal(true);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!form.title || !form.points_required) {
			toast.error("Judul dan poin wajib diisi");
			return;
		}

		setSaving(true);

		try {
			const formData = new FormData();
			formData.append("title", form.title);
			formData.append("description", form.description || "");
			formData.append("points_required", form.points_required);
			formData.append("stock", form.unlimitedStock ? "" : form.stock);
			formData.append("category", "merchandise");
			formData.append("is_active", form.is_active ? "1" : "0");

			if (form.image) {
				formData.append("image", form.image);
			}

			let url = `${API_URL}/admin/rewards`;
			if (isEditing) {
				url = `${API_URL}/admin/rewards/${form.id}`;
				formData.append("_method", "PUT");
			}

			const res = await fetch(url, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal menyimpan reward");
			}

			toast.success(isEditing ? "Reward berhasil diperbarui" : "Reward berhasil ditambahkan");
			setShowModal(false);
			fetchRewards(meta.current_page, searchTerm);
		} catch (err) {
			toast.error(err.message);
		} finally {
			setSaving(false);
		}
	};

	const handleToggleActive = async (reward) => {
		try {
			const formData = new FormData();
			formData.append("is_active", reward.is_active ? "0" : "1");
			formData.append("_method", "PUT");

			const res = await fetch(`${API_URL}/admin/rewards/${reward.id}`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			if (!res.ok) throw new Error("Gagal mengubah status");

			toast.success(reward.is_active ? "Reward dinonaktifkan" : "Reward diaktifkan");
			fetchRewards(meta.current_page, searchTerm);
		} catch (err) {
			toast.error(err.message);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;

		try {
			const res = await fetch(`${API_URL}/admin/rewards/${deleteTarget.id}`, {
				method: "DELETE",
				headers,
			});

			const data = await res.json();

			if (!res.ok) throw new Error(data.message || "Gagal menghapus reward");

			toast.success("Reward berhasil dihapus");
			setDeleteTarget(null);
			fetchRewards(meta.current_page, searchTerm);
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
						<h1 className="text-2xl font-black text-indigo-900">Kelola Reward</h1>
						<p className="text-sm text-gray-400">Katalog merchandise yang bisa ditukar customer dengan poin</p>
					</div>
					<button onClick={openAddModal} className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-800 active:scale-95 transition-all">
						<Plus size={18} /> Tambah Reward
					</button>
				</div>

				{/* SEARCH */}
				<form onSubmit={handleSearch} className="relative mb-6">
					<Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Cari nama reward..."
						className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all"
					/>
				</form>

				{/* TABLE */}
				<div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center py-16 text-gray-400 gap-2">
							<Loader2 className="animate-spin" size={20} /> Memuat data...
						</div>
					) : rewards.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-gray-300">
							<Gift size={40} className="mb-2" />
							<p className="text-sm font-bold">Belum ada reward</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-100 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
										<th className="px-6 py-4">Foto</th>
										<th className="px-6 py-4">Judul</th>
										<th className="px-6 py-4 text-center">Poin</th>
										<th className="px-6 py-4 text-center">Stok</th>
										<th className="px-6 py-4 text-center">Status</th>
										<th className="px-6 py-4 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{rewards.map((r) => (
										<tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
											<td className="px-6 py-4">
												<div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
													{r.image ? <img src={r.image} alt={r.title} className="w-full h-full object-cover" /> : <ImageOff size={18} className="text-gray-300" />}
												</div>
											</td>
											<td className="px-6 py-4 font-bold text-gray-700 max-w-[220px]">{r.title}</td>
											<td className="px-6 py-4 text-center font-bold text-indigo-600">{r.points_required}</td>
											<td className="px-6 py-4 text-center text-gray-500">{r.stock === null ? "∞" : r.stock}</td>
											<td className="px-6 py-4 text-center">
												<button
													onClick={() => handleToggleActive(r)}
													className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
														r.is_active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
													}`}
												>
													<Power size={11} /> {r.is_active ? "Aktif" : "Nonaktif"}
												</button>
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center justify-end gap-2">
													<button onClick={() => openEditModal(r)} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
														<Pencil size={16} />
													</button>
													<button onClick={() => setDeleteTarget(r)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
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

					{/* PAGINATION */}
					{meta.last_page > 1 && (
						<div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-100">
							<span className="text-xs text-gray-400 font-medium">Total {meta.total} reward</span>
							<div className="flex items-center gap-1">
								<button onClick={() => fetchRewards(meta.current_page - 1, searchTerm)} disabled={meta.current_page <= 1} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30">
									<ChevronLeft className="w-5 h-5" />
								</button>
								<span className="w-8 h-8 flex items-center justify-center rounded bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">{meta.current_page}</span>
								<span className="text-gray-300 text-xs">/ {meta.last_page}</span>
								<button onClick={() => fetchRewards(meta.current_page + 1, searchTerm)} disabled={meta.current_page >= meta.last_page} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30">
									<ChevronRight className="w-5 h-5" />
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* MODAL TAMBAH / EDIT */}
			{showModal && (
				<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
					<div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-black text-indigo-900">{isEditing ? "Edit Reward" : "Tambah Reward"}</h2>
							<button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
								<X size={18} className="text-gray-400" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Judul Reward</label>
								<input
									type="text"
									value={form.title}
									onChange={(e) => setForm({ ...form, title: e.target.value })}
									placeholder="Contoh: Mug Nebeng Edisi Spesial"
									className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all"
								/>
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Deskripsi</label>
								<textarea
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									rows={2}
									placeholder="Deskripsi singkat reward ini"
									className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all resize-none"
								/>
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto</label>
								{form.currentImage && !form.image && <img src={form.currentImage} alt="preview" className="w-20 h-20 rounded-xl object-cover mt-2 mb-2 border border-gray-100" />}
								<input
									type="file"
									accept="image/*"
									onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
									className="w-full mt-1 text-xs font-bold text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-bold"
								/>
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Poin Dibutuhkan</label>
								<input
									type="number"
									min="1"
									value={form.points_required}
									onChange={(e) => setForm({ ...form, points_required: e.target.value })}
									placeholder="150"
									className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all"
								/>
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center justify-between">
									Stok
									<span className="flex items-center gap-2 normal-case font-bold text-gray-500">
										<input type="checkbox" checked={form.unlimitedStock} onChange={(e) => setForm({ ...form, unlimitedStock: e.target.checked })} className="rounded" />
										Tidak terbatas
									</span>
								</label>
								{!form.unlimitedStock && (
									<input
										type="number"
										min="0"
										value={form.stock}
										onChange={(e) => setForm({ ...form, stock: e.target.value })}
										placeholder="50"
										className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all"
									/>
								)}
							</div>

							<label className="flex items-center gap-2 text-sm font-bold text-gray-600">
								<input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
								Aktifkan reward ini (tampil ke customer)
							</label>

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
						<h2 className="text-lg font-black text-indigo-900 mb-2">Hapus Reward?</h2>
						<p className="text-sm text-gray-500 mb-6">"{deleteTarget.title}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</p>
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