import AdminLayout from "../../components/dashboard/AdminLayout";
import { Search, Calendar, Download, Eye, Lock, Plus, Pencil, X, Loader2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { exportToCsv } from "../../utils/exportCsv";
import toast from "react-hot-toast";

const emptyCustomerForm = {
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
	// rekening
	bank_name: "",
	bank_account_name: "",
	bank_account_number: "",
};

export default function DaftarCustomer() {
	const navigate = useNavigate();

	// ================= STATE =================
	const [customers, setCustomers] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");

	// filter tanggal (kalender)
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [showCalendar, setShowCalendar] = useState(false);

	// modal tambah/edit akun customer
	const [showModal, setShowModal] = useState(false);
	const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
	const [saving, setSaving] = useState(false);
	const isEditingCustomer = !!customerForm.id;

	// pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage] = useState(10);

	// ================= FETCH =================
	const fetchCustomers = async () => {
		try {
			const res = await fetch("http://127.0.0.1:8000/api/admin/customers", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});
			const data = await res.json();
			setCustomers(data);
		} catch (err) {
			console.error("Error fetch customers:", err);
		}
	};

	useEffect(() => {
		fetchCustomers();
	}, []);

	// ================= SEARCH + FILTER STATUS + FILTER TANGGAL =================
	const filteredCustomers = useMemo(() => {
		return customers.filter((c) => {
			const keyword = searchTerm.toLowerCase();
			const matchSearch = c.name?.toLowerCase().includes(keyword) || c.email?.toLowerCase().includes(keyword) || c.phone?.toLowerCase().includes(keyword);

			// filter berdasarkan tanggal daftar (created_at)
			let matchDate = true;
			if (c.created_at && (dateFrom || dateTo)) {
				const registeredAt = c.created_at.slice(0, 10); // "YYYY-MM-DD"
				if (dateFrom && registeredAt < dateFrom) matchDate = false;
				if (dateTo && registeredAt > dateTo) matchDate = false;
			}

			return matchSearch && matchDate;
		});
	}, [customers, searchTerm, dateFrom, dateTo]);

	// ================= DOWNLOAD CSV =================
	const handleDownload = () => {
		const rows = filteredCustomers.map((c) => ({
			ID: c.id,
			Nama: c.name,
			Email: c.email,
			"No. Tlp": c.phone,
			Status: c.status,
			"Tanggal Daftar": c.created_at?.slice(0, 10) || "",
		}));
		exportToCsv("daftar-customer.csv", rows);
	};

	// ================= PAGINATION =================
	const totalPages = Math.ceil(filteredCustomers.length / perPage);

	const paginatedData = useMemo(() => {
		const start = (currentPage - 1) * perPage;
		return filteredCustomers.slice(start, start + perPage);
	}, [filteredCustomers, currentPage]);

	// ================= STATUS COLOR =================
	const getStatusColor = (status) => {
		switch (status) {
			case "pending":
				return "bg-orange-500";

			case "verified":
				return "bg-emerald-500";

			case "rejected":
				return "bg-red-600";

			case "blocked":
				return "bg-gray-900";

			default:
				return "bg-gray-500";
		}
	};

	const handleReject = async (id) => {
		const confirmBlock = window.confirm("Yakin ingin memblokir customer ini?");

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

			alert("Customer berhasil diblokir");

			// refresh table
			fetchCustomers();
		} catch (err) {
			console.error(err);

			alert(err.message || "Terjadi kesalahan");
		}
	};

	// ================= TAMBAH / EDIT AKUN CUSTOMER (MANUAL) =================
	const openAddCustomerModal = () => {
		setCustomerForm(emptyCustomerForm);
		setShowModal(true);
	};

	const openEditCustomerModal = (customer) => {
		setCustomerForm({
			id: customer.id,
			name: customer.name,
			email: customer.email,
			phone: customer.phone,
			password: "",
			status: customer.status || "verified",
			full_name: customer.profile?.full_name || "",
			nik: customer.profile?.nik || "",
			birth_place: customer.profile?.birth_place || "",
			birth_date: customer.profile?.birth_date ? customer.profile.birth_date.slice(0, 10) : "",
			gender: customer.profile?.gender || "",
			address: customer.profile?.address || "",
			province: customer.profile?.province || "",
			city: customer.profile?.city || "",
			district: customer.profile?.district || "",
			village: customer.profile?.village || "",
			bank_name: customer.profile?.bank_name || "",
			bank_account_name: customer.profile?.bank_account_name || "",
			bank_account_number: customer.profile?.bank_account_number || "",
		});
		setShowModal(true);
	};

	const handleCustomerFormChange = (e) => {
		setCustomerForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleCustomerSubmit = async (e) => {
		e.preventDefault();

		if (!customerForm.name || !customerForm.email || !customerForm.phone || (!isEditingCustomer && !customerForm.password)) {
			toast.error(isEditingCustomer ? "Nama, email, dan no. HP wajib diisi" : "Semua field wajib diisi, termasuk password");
			return;
		}

		setSaving(true);
		try {
			const url = isEditingCustomer ? `http://127.0.0.1:8000/api/admin/customers/${customerForm.id}` : "http://127.0.0.1:8000/api/admin/customers";
			const method = isEditingCustomer ? "PUT" : "POST";

			const body = { ...customerForm };
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
				throw new Error(data.message || Object.values(data.errors || {})[0]?.[0] || "Gagal menyimpan akun customer");
			}

			toast.success(isEditingCustomer ? "Akun customer berhasil diperbarui" : "Akun customer berhasil ditambahkan");
			setShowModal(false);
			fetchCustomers();
		} catch (err) {
			toast.error(err.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<AdminLayout>
			<div className="flex items-center justify-between mt-6 mb-6">
				<h1 className="text-2xl font-bold text-gray-800">Daftar Customer</h1>
				<button onClick={openAddCustomerModal} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-900 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors shadow-sm">
					<Plus className="w-4 h-4" /> Tambah Customer
				</button>
			</div>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
				{/* Header Actions */}
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
						{/* FILTER KALENDER (rentang tanggal daftar) */}
						<div className="relative">
							<button
								onClick={() => setShowCalendar((v) => !v)}
								className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
							>
								<Calendar className="mr-2 w-4 h-4" /> Filter
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

						<button onClick={handleDownload} className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
							Download <Download className="ml-2 w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-sky-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
								<th className="px-4 py-4 rounded-l-lg text-center">No</th>
								<th className="px-4 py-4">Nama</th>
								<th className="px-4 py-4">Email</th>
								<th className="px-4 py-4">No. Tlp</th>
								<th className="px-4 py-4 text-center">Status</th>
								<th className="px-4 py-4 rounded-r-lg text-center">Aksi</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100">
							{paginatedData.map((c, i) => (
								<tr key={c.id} className="hover:bg-gray-50 transition-colors">
									<td className="px-4 py-4 text-sm text-gray-500 text-center">{(currentPage - 1) * perPage + i + 1}</td>

									<td className="px-4 py-4 text-sm font-medium text-gray-700">{c.name}</td>
									<td className="px-4 py-4 text-sm text-gray-500">{c.email}</td>
									<td className="px-4 py-4 text-sm text-gray-500">{c.phone}</td>

									<td className="px-4 py-4 text-center">
										<span className={`${getStatusColor(c.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full inline-block min-w-[100px]`}>{c.status}</span>
									</td>

									<td className="px-4 py-4 text-center">
										<div className="flex justify-center gap-2">
											<button onClick={() => navigate(`/admin/detail-customer/${c.id}`)} className="p-2 bg-indigo-900 text-white rounded-md hover:bg-indigo-800 transition-colors inline-flex items-center justify-center">
												<Eye className="w-4 h-4" />
											</button>

											<button onClick={() => openEditCustomerModal(c)} className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
												<Pencil className="w-4 h-4" />
											</button>

											<button onClick={() => handleReject(c.id)} className="p-2 bg-red-500 text-white rounded">
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
						<div className="relative border border-gray-200 rounded-md px-2 py-1 flex items-center gap-1 bg-gray-50 cursor-pointer">
							{perPage} <ChevronDown className="w-3 h-3 text-gray-400" />
						</div>
						<span>{filteredCustomers.length} entries</span>
					</div>

					<div className="flex items-center gap-1">
						<button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
							<ChevronLeft className="w-5 h-5" />
						</button>

						{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
							<button
								key={page}
								onClick={() => setCurrentPage(page)}
								className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold ${page === currentPage ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "text-gray-400 hover:bg-gray-50"}`}
							>
								{page}
							</button>
						))}

						<button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>

			{/* MODAL TAMBAH / EDIT AKUN CUSTOMER */}
			{showModal && (
				<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8">
					<div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
						<div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
							<h2 className="text-lg font-bold text-gray-800">{isEditingCustomer ? "Edit Akun Customer" : "Tambah Akun Customer"}</h2>
							<button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
								<X size={18} className="text-gray-400" />
							</button>
						</div>

						<form onSubmit={handleCustomerSubmit} className="overflow-y-auto p-6 space-y-6">
							{/* ===== AKUN ===== */}
							<div>
								<h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Akun</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="sm:col-span-2">
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nama</label>
										<input type="text" name="name" value={customerForm.name} onChange={handleCustomerFormChange} placeholder="Nama lengkap customer" className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Email</label>
										<input type="email" name="email" value={customerForm.email} onChange={handleCustomerFormChange} placeholder="customer@email.com" className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">No. HP</label>
										<input type="text" name="phone" value={customerForm.phone} onChange={handleCustomerFormChange} placeholder="08123456789" className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">{isEditingCustomer ? "Password Baru (opsional)" : "Password"}</label>
										<input
											type="password"
											name="password"
											value={customerForm.password}
											onChange={handleCustomerFormChange}
											placeholder={isEditingCustomer ? "Kosongkan jika tidak ingin mengganti" : "Minimal 6 karakter"}
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
										<input type="text" name="full_name" value={customerForm.full_name} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">NIK</label>
										<input type="text" name="nik" value={customerForm.nik} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Jenis Kelamin</label>
										<select name="gender" value={customerForm.gender} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
											<option value="">Pilih</option>
											<option value="Laki-laki">Laki-laki</option>
											<option value="Perempuan">Perempuan</option>
										</select>
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tempat Lahir</label>
										<input type="text" name="birth_place" value={customerForm.birth_place} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tanggal Lahir</label>
										<input type="date" name="birth_date" value={customerForm.birth_date} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
								</div>
							</div>

							{/* ===== ALAMAT ===== */}
							<div>
								<h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Alamat</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="sm:col-span-2">
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Alamat Lengkap</label>
										<textarea name="address" value={customerForm.address} onChange={handleCustomerFormChange} rows={2} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Provinsi</label>
										<input type="text" name="province" value={customerForm.province} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kota/Kabupaten</label>
										<input type="text" name="city" value={customerForm.city} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kecamatan</label>
										<input type="text" name="district" value={customerForm.district} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kelurahan/Desa</label>
										<input type="text" name="village" value={customerForm.village} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
								</div>
							</div>

							{/* ===== REKENING ===== */}
							<div>
								<h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Rekening</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nama Bank</label>
										<input type="text" name="bank_name" value={customerForm.bank_name} onChange={handleCustomerFormChange} placeholder="BCA, BRI, dst" className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nomor Rekening</label>
										<input type="text" name="bank_account_number" value={customerForm.bank_account_number} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
									<div className="sm:col-span-2">
										<label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nama Pemilik Rekening</label>
										<input type="text" name="bank_account_name" value={customerForm.bank_account_name} onChange={handleCustomerFormChange} className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
									</div>
								</div>
							</div>

							<div className="flex gap-3 pt-2 sticky bottom-0 bg-white">
								<button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all">
									Batal
								</button>
								<button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
									{saving && <Loader2 size={16} className="animate-spin" />}
									{isEditingCustomer ? "Simpan Perubahan" : "Tambah"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</AdminLayout>
	);
}