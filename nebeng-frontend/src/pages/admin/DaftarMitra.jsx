import AdminLayout from "../../components/dashboard/AdminLayout";
import { Search, Calendar, Download, Eye, Lock, Plus, Pencil, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { exportToCsv } from "../../utils/exportCsv";
import toast from "react-hot-toast";

const emptyMitraForm = {
	id: null,
	// akun
	name: "",
	email: "",
	phone: "",
	password: "",
	status: "verified",
	// data diri
	full_name: "",
	nik: "",
	birth_place: "",
	birth_date: "",
	gender: "",
	// alamat
	address: "",
	province: "",
	city: "",
	district: "",
	village: "",
};

export default function DaftarMitra() {
	const navigate = useNavigate();

	// ================= STATE =================
	const [mitraData, setMitraData] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	// filter status (dropdown) & filter tanggal (kalender)
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [showCalendar, setShowCalendar] = useState(false);

	// modal tambah/edit akun mitra
	const [showModal, setShowModal] = useState(false);
	const [mitraForm, setMitraForm] = useState(emptyMitraForm);
	const [saving, setSaving] = useState(false);
	const isEditingMitra = !!mitraForm.id;

	// ================= FETCH =================
	const fetchMitra = async () => {
		try {
			const res = await fetch("http://127.0.0.1:8000/api/admin/mitra", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});

			const data = await res.json();
			setMitraData(data);
		} catch (err) {
			console.error(err);
		}
	};

	useEffect(() => {
		fetchMitra();
	}, []);

	// ================= SEARCH + FILTER STATUS + FILTER TANGGAL =================
	const filteredMitra = useMemo(() => {
		return mitraData.filter((m) => {
			const keyword = searchTerm.toLowerCase();
			const matchSearch = m.name?.toLowerCase().includes(keyword) || m.email?.toLowerCase().includes(keyword) || m.phone?.toLowerCase().includes(keyword);

			let matchDate = true;
			if (m.created_at && (dateFrom || dateTo)) {
				const registeredAt = m.created_at.slice(0, 10);
				if (dateFrom && registeredAt < dateFrom) matchDate = false;
				if (dateTo && registeredAt > dateTo) matchDate = false;
			}

			return matchSearch && matchDate;
		});
	}, [mitraData, searchTerm, dateFrom, dateTo]);

	// ================= DOWNLOAD CSV =================
	const handleDownload = () => {
		const rows = filteredMitra.map((m) => ({
			ID: m.id,
			Nama: m.name,
			Email: m.email,
			"No. Tlp": m.phone,
			Teguran: `${m.mitra_warning_count ?? 0}/${m.mitra_warning_max ?? 3}`,
			Status: m.status,
			"Tanggal Daftar": m.created_at?.slice(0, 10) || "",
		}));
		exportToCsv("daftar-mitra.csv", rows);
	};

	// ================= PAGINATION =================
	const totalPages = Math.ceil(filteredMitra.length / rowsPerPage);

	const paginatedMitra = useMemo(() => {
		const start = (currentPage - 1) * rowsPerPage;
		return filteredMitra.slice(start, start + rowsPerPage);
	}, [filteredMitra, currentPage, rowsPerPage]);

	const goToPage = (page) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	// ================= STATUS STYLE =================
	const getStatusStyle = (status) => {
		switch (status) {
			case "rejected":
				return "bg-red-600";
			case "pending":
				return "bg-orange-400";
			case "verified":
				return "bg-emerald-500";
			default:
				return "bg-gray-500";
		}
	};

	// ================= STATUS LABEL =================
	const getStatusLabel = (status) => {
		switch (status) {
			case "rejected":
				return "rejected";
			case "pending":
				return "pending";
			case "verified":
				return "verified";
			default:
				return status;
		}
	};

	// ================= BLOCK MITRA =================
	const handleReject = async (id) => {
		const confirmBlock = window.confirm("Yakin ingin memblokir mitra ini?");
		if (!confirmBlock) return;

		try {
			const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${id}/block`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
					Accept: "application/json",
				},
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal memblokir user");
			}

			alert("Mitra berhasil diblokir");

			// refresh data tabel
			fetchMitra();
		} catch (err) {
			console.error(err);
			alert(err.message);
		}
	};

	// ================= TAMBAH / EDIT AKUN MITRA (MANUAL) =================
	const openAddMitraModal = () => {
		setMitraForm(emptyMitraForm);
		setShowModal(true);
	};

	const openEditMitraModal = (mitra) => {
		setMitraForm({
			id: mitra.id,
			name: mitra.name,
			email: mitra.email,
			phone: mitra.phone,
			password: "",
			status: mitra.status || "verified",
			full_name: mitra.profile?.full_name || "",
			nik: mitra.profile?.nik || "",
			birth_place: mitra.profile?.birth_place || "",
			birth_date: mitra.profile?.birth_date ? mitra.profile.birth_date.slice(0, 10) : "",
			gender: mitra.profile?.gender || "",
			address: mitra.profile?.address || "",
			province: mitra.profile?.province || "",
			city: mitra.profile?.city || "",
			district: mitra.profile?.district || "",
			village: mitra.profile?.village || "",
		});
		setShowModal(true);
	};

	const handleMitraFormChange = (e) => {
		setMitraForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleMitraSubmit = async (e) => {
		e.preventDefault();

		if (!mitraForm.name || !mitraForm.email || !mitraForm.phone || (!isEditingMitra && !mitraForm.password)) {
			toast.error(isEditingMitra ? "Nama, email, dan no. HP wajib diisi" : "Semua field wajib diisi, termasuk password");
			return;
		}

		setSaving(true);
		try {
			const url = isEditingMitra ? `http://127.0.0.1:8000/api/admin/mitra/${mitraForm.id}` : "http://127.0.0.1:8000/api/admin/mitra";
			const method = isEditingMitra ? "PUT" : "POST";

			const body = { ...mitraForm };
			delete body.id;
			// Saat edit, password cuma dikirim kalau memang mau diganti.
			if (!body.password) delete body.password;

			const res = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || Object.values(data.errors || {})[0]?.[0] || "Gagal menyimpan akun mitra");
			}

			toast.success(isEditingMitra ? "Akun mitra berhasil diperbarui" : "Akun mitra berhasil ditambahkan");
			setShowModal(false);
			fetchMitra();
		} catch (err) {
			toast.error(err.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<AdminLayout>
			<div className="flex items-center justify-between mt-6 mb-6">
				<h1 className="text-2xl font-bold text-gray-800">Daftar Mitra</h1>
				<button onClick={openAddMitraModal} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-900 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors shadow-sm">
					<Plus className="w-4 h-4" /> Tambah Mitra
				</button>
			</div>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
				{/* Search & Actions */}
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div className="relative w-full md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input
							type="text"
							placeholder="Search"
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
						/>
					</div>

					<div className="flex items-center gap-3 w-full md:w-auto">

						{/* FILTER KALENDER */}
						<div className="relative">
							<button
								onClick={() => setShowCalendar((v) => !v)}
								className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
							>
								<Calendar className="mr-2 w-4 h-4 text-gray-400" /> Filter
							</button>

							{showCalendar && (
								<div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 space-y-3">
									<div>
										<label className="text-xs text-gray-500">Dari tanggal</label>
										<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm mt-1" />
									</div>
									<div>
										<label className="text-xs text-gray-500">Sampai tanggal</label>
										<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm mt-1" />
									</div>
									<div className="flex gap-2 pt-1">
										<button
											onClick={() => {
												setDateFrom("");
												setDateTo("");
											}}
											className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
										>
											Reset
										</button>
										<button
											onClick={() => {
												setCurrentPage(1);
												setShowCalendar(false);
											}}
											className="flex-1 text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
										>
											Terapkan
										</button>
									</div>
								</div>
							)}
						</div>

						<button onClick={handleDownload} className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
							Download <Download className="ml-2 w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
								<tr className="bg-sky-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
								<th className="px-4 py-4 rounded-l-lg text-center">No. ID</th>
								<th className="px-4 py-4">Nama</th>
								<th className="px-4 py-4">Email</th>
								<th className="px-4 py-4 text-center">No. Tlp</th>
								<th className="px-4 py-4 text-center">Layanan</th>
								<th className="px-4 py-4 text-center">Teguran</th>
								<th className="px-4 py-4 text-center">Status</th>
								<th className="px-4 py-4 rounded-r-lg text-center">Aksi</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100">
							{paginatedMitra.map((mitra, index) => (
								<tr key={mitra.id} className="hover:bg-gray-50 transition-colors">
									<td className="px-4 py-5 text-sm text-gray-600 text-center font-medium">{(currentPage - 1) * rowsPerPage + index + 1}</td>

									<td className="px-4 py-5 text-sm text-gray-700 font-medium">{mitra.name}</td>

									<td className="px-4 py-5 text-sm text-gray-500">{mitra.email}</td>

									<td className="px-4 py-5 text-sm text-gray-500 text-center">{mitra.phone}</td>

									<td className="px-4 py-5 text-sm text-gray-500 text-center">-</td>

									<td className="px-4 py-5 text-center">
										<span
											className={`text-[10px] font-black px-3 py-1 rounded-full inline-block min-w-[50px] ${
												mitra.mitra_warning_count >= mitra.mitra_warning_max
													? "bg-red-100 text-red-600"
													: mitra.mitra_warning_count > 0
													? "bg-amber-100 text-amber-600"
													: "bg-gray-100 text-gray-400"
											}`}
										>
											{mitra.mitra_warning_count ?? 0}/{mitra.mitra_warning_max ?? 3}
										</span>
									</td>

								<td className="px-4 py-5 text-center">
									<span className={`${getStatusStyle(mitra.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full inline-block min-w-[100px]`}>{getStatusLabel(mitra.status)}</span>
								</td>

									<td className="px-4 py-5 text-center">
										<div className="flex justify-center gap-2">
											<button onClick={() => navigate(`/admin/detail-mitra/${mitra.id}`)} className="p-2 bg-indigo-900 text-white rounded-md hover:bg-indigo-800 transition-colors inline-flex items-center justify-center">
												<Eye className="w-4 h-4" />
											</button>
											<button onClick={() => openEditMitraModal(mitra)} className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
												<Pencil className="w-4 h-4" />
											</button>
											<button onClick={() => handleReject(mitra.id)} className="p-2 bg-red-500 text-white rounded">
												<Lock className="w-4 h-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-4 border-t border-gray-100">
					<div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
						<select
							value={rowsPerPage}
							onChange={(e) => {
								setRowsPerPage(Number(e.target.value));
								setCurrentPage(1);
							}}
							className="border border-gray-200 rounded-md px-2 py-1 bg-gray-50 text-xs"
						>
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={20}>20</option>
						</select>

						<span>
							{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredMitra.length)} of {filteredMitra.length} entries
						</span>
					</div>

					<div className="flex items-center gap-1">
						<button onClick={() => goToPage(currentPage - 1)} className="p-2 text-gray-400 hover:text-gray-600">
							<ChevronLeft className="w-5 h-5" />
						</button>

						{Array.from({ length: totalPages }, (_, i) => i + 1)
							.slice(0, 5)
							.map((page) => (
								<button
									key={page}
									onClick={() => goToPage(page)}
									className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium
								${currentPage === page ? "bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold" : "text-gray-400 hover:bg-gray-50"}`}
								>
									{page}
								</button>
							))}

						<button onClick={() => goToPage(currentPage + 1)} className="p-2 text-gray-400 hover:text-gray-600">
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>

			{/* MODAL TAMBAH / EDIT AKUN MITRA */}
			{showModal && (
				<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8">
					<div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
						<div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
							<h2 className="text-lg font-bold text-gray-800">{isEditingMitra ? "Edit Akun Mitra" : "Tambah Akun Mitra"}</h2>
							<button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
								<X size={18} className="text-gray-400" />
							</button>
						</div>

						<form onSubmit={handleMitraSubmit} className="overflow-y-auto p-6 space-y-6">
							{/* ===== AKUN ===== */}
							<div>
								<h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Akun</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="sm:col-span-2">
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nama</label>
										<input type="text" name="name" value={mitraForm.name} onChange={handleMitraFormChange} placeholder="Nama lengkap mitra" className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Email</label>
										<input type="email" name="email" value={mitraForm.email} onChange={handleMitraFormChange} placeholder="mitra@email.com" className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">No. HP</label>
										<input type="text" name="phone" value={mitraForm.phone} onChange={handleMitraFormChange} placeholder="08123456789" className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">{isEditingMitra ? "Password Baru (opsional)" : "Password"}</label>
										<input
											type="password"
											name="password"
											value={mitraForm.password}
											onChange={handleMitraFormChange}
											placeholder={isEditingMitra ? "Kosongkan jika tidak ingin mengganti" : "Minimal 6 karakter"}
											className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
										/>
									</div>
								</div>
							</div>

							{/* ===== DATA DIRI ===== */}
							<div>
								<h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Data Diri</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="sm:col-span-2">
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nama Lengkap (sesuai KTP)</label>
										<input type="text" name="full_name" value={mitraForm.full_name} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">NIK</label>
										<input type="text" name="nik" value={mitraForm.nik} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Jenis Kelamin</label>
										<select name="gender" value={mitraForm.gender} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
											<option value="">Pilih</option>
											<option value="Laki-laki">Laki-laki</option>
											<option value="Perempuan">Perempuan</option>
										</select>
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tempat Lahir</label>
										<input type="text" name="birth_place" value={mitraForm.birth_place} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tanggal Lahir</label>
										<input type="date" name="birth_date" value={mitraForm.birth_date} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
								</div>
							</div>

							{/* ===== ALAMAT ===== */}
							<div>
								<h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Alamat</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="sm:col-span-2">
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Alamat Lengkap</label>
										<textarea name="address" value={mitraForm.address} onChange={handleMitraFormChange} rows={2} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Provinsi</label>
										<input type="text" name="province" value={mitraForm.province} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kota/Kabupaten</label>
										<input type="text" name="city" value={mitraForm.city} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kecamatan</label>
										<input type="text" name="district" value={mitraForm.district} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kelurahan/Desa</label>
										<input type="text" name="village" value={mitraForm.village} onChange={handleMitraFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
								</div>
							</div>

							<div className="flex gap-3 pt-2 sticky bottom-0 bg-white">
								<button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all">
									Batal
								</button>
								<button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
									{saving && <Loader2 size={16} className="animate-spin" />}
									{isEditingMitra ? "Simpan Perubahan" : "Tambah"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</AdminLayout>
	);
}