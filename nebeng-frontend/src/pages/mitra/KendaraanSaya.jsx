import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, Car, Bike, Package, Plus, X, Clock3, CheckCircle2, XCircle, Trash2 } from "lucide-react";

const typeIcon = { motor: Bike, mobil: Car, barang: Package };
const typeLabel = { motor: "Motor", mobil: "Mobil", barang: "Kendaraan Barang" };

const statusConfig = {
	pending: { label: "Menunggu Persetujuan", icon: Clock3, className: "bg-amber-50 text-amber-600 border-amber-100" },
	approved: { label: "Disetujui", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
	rejected: { label: "Ditolak", icon: XCircle, className: "bg-red-50 text-red-600 border-red-100" },
};

export default function KendaraanSaya() {
	const navigate = useAppNavigate();

	const [vehicles, setVehicles] = useState([]);
	const [loading, setLoading] = useState(true);

	const [showAddModal, setShowAddModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState("");

	const [form, setForm] = useState({
		type: "mobil",
		brand: "",
		model: "",
		plate_number: "",
		color: "",
		seat_capacity: "",
	});

	const fetchVehicles = async () => {
		try {
			const token = localStorage.getItem("token");

			const res = await fetch("http://127.0.0.1:8000/api/mitra/vehicles", {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			if (res.ok) {
				const data = await res.json();
				setVehicles(data);
			}
		} catch (err) {
			console.error("Gagal ambil data kendaraan:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchVehicles();
	}, []);

	const handleInput = (e) => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};

	const resetForm = () => {
		setForm({ type: "mobil", brand: "", model: "", plate_number: "", color: "", seat_capacity: "" });
		setFormError("");
	};

	const handleSubmit = async () => {
		if (!form.brand || !form.plate_number) {
			setFormError("Merk dan plat nomor wajib diisi.");
			return;
		}

		if (form.type === "mobil" && !form.seat_capacity) {
			setFormError("Kapasitas maksimal penumpang wajib diisi untuk mobil.");
			return;
		}

		setSubmitting(true);
		setFormError("");

		try {
			const token = localStorage.getItem("token");

			const res = await fetch("http://127.0.0.1:8000/api/mitra/vehicles", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify(form),
			});

			const data = await res.json();

			if (!res.ok) {
				setFormError(data.message || "Gagal menambahkan kendaraan.");
				return;
			}

			setShowAddModal(false);
			resetForm();
			fetchVehicles();
		} catch (err) {
			console.error(err);
			setFormError("Terjadi kesalahan. Coba lagi.");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (id) => {
		if (!confirm("Hapus kendaraan ini?")) return;

		try {
			const token = localStorage.getItem("token");

			const res = await fetch(`http://127.0.0.1:8000/api/mitra/vehicles/${id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			if (res.ok) {
				setVehicles((prev) => prev.filter((v) => v.id !== id));
			}
		} catch (err) {
			console.error(err);
		}
	};

	return (
		<MitraLayout>
			<div className="w-full max-w-screen-md mx-auto px-4 py-6 pb-24">
				{/* HEADER */}
				<div className="flex items-center justify-between gap-4 mb-8">
					<div className="flex items-center gap-4">
						<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
							<ChevronLeft size={24} className="text-indigo-900" />
						</button>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Kendaraan Saya</h1>
					</div>

					<button
						onClick={() => {
							resetForm();
							setShowAddModal(true);
						}}
						className="flex items-center gap-2 px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
					>
						<Plus size={16} /> Tambah
					</button>
				</div>

				{/* LIST KENDARAAN */}
				{loading ? (
					<div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
						<p className="text-sm font-bold text-gray-400">Memuat data kendaraan...</p>
					</div>
				) : vehicles.length > 0 ? (
					<div className="space-y-4">
						{vehicles.map((v) => {
							const Icon = typeIcon[v.type] || Car;
							const status = statusConfig[v.status] || statusConfig.pending;
							const StatusIcon = status.icon;

							return (
								<div key={v.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
									<div className="flex items-start gap-4">
										<div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shrink-0">
											<Icon size={26} />
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between gap-2 flex-wrap">
												<h3 className="font-black text-gray-800 text-base truncate">
													{typeLabel[v.type] || v.type} • {v.brand} {v.model}
												</h3>

												<button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
													<Trash2 size={16} />
												</button>
											</div>

											<p className="text-xs text-gray-400 font-medium mt-1">
												{v.plate_number}
												{v.color ? ` • ${v.color}` : ""}
												{v.type === "mobil" && v.seat_capacity ? ` • Maks. ${v.seat_capacity} penumpang` : ""}
											</p>

											<div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${status.className}`}>
												<StatusIcon size={12} />
												{status.label}
											</div>

											{v.status === "rejected" && v.notes && <p className="text-xs text-red-500 font-medium mt-2 bg-red-50 rounded-xl px-3 py-2">Alasan: {v.notes}</p>}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
						<Car size={40} className="text-gray-300 mx-auto mb-3" />
						<p className="text-sm font-bold text-gray-400">Belum ada kendaraan terdaftar</p>
						<p className="text-xs text-gray-400 mt-1">Tambahkan kendaraanmu supaya bisa mulai membuat tebengan.</p>
					</div>
				)}
			</div>

			{/* MODAL TAMBAH KENDARAAN */}
			{showAddModal && (
				<div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
					<div
						className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm"
						onClick={() => {
							setShowAddModal(false);
							resetForm();
						}}
					></div>

					<div className="relative bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 animate-in slide-in-from-bottom-full duration-500 shadow-2xl max-h-[90vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-8">
							<h3 className="text-2xl font-black text-indigo-900">Tambah Kendaraan</h3>
							<button
								onClick={() => {
									setShowAddModal(false);
									resetForm();
								}}
								className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-900 transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-6 font-bold">Kendaraan baru akan ditinjau admin dulu sebelum bisa dipakai untuk membuat tebengan.</p>

						<div className="space-y-4">
							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Jenis Kendaraan</label>
								<select name="type" value={form.type} onChange={handleInput} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none">
									<option value="motor">Motor</option>
									<option value="mobil">Mobil</option>
									<option value="barang">Kendaraan Barang</option>
								</select>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Merk</label>
									<input name="brand" value={form.brand} onChange={handleInput} placeholder="Contoh: Toyota, Honda" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none" />
								</div>
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Model / Tipe</label>
									<input name="model" value={form.model} onChange={handleInput} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none" />
								</div>
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Plat Nomor</label>
									<input name="plate_number" value={form.plate_number} onChange={handleInput} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none" />
								</div>
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Warna</label>
									<input name="color" value={form.color} onChange={handleInput} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none" />
								</div>

								{form.type === "mobil" && (
									<div className="md:col-span-2">
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Kapasitas Maksimal Penumpang</label>
										<input
											type="number"
											min={1}
											name="seat_capacity"
											value={form.seat_capacity}
											onChange={handleInput}
											className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-indigo-900 focus:outline-none"
										/>
										<p className="text-[11px] text-gray-400 mt-1.5 px-1">Murni jumlah penumpang (tidak termasuk kamu sebagai supir).</p>
									</div>
								)}
							</div>

							{formError && <p className="text-xs font-bold text-red-500">{formError}</p>}

							<button
								onClick={handleSubmit}
								disabled={submitting}
								className="w-full py-4 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 active:scale-[0.98]"
							>
								{submitting ? "Menyimpan..." : "Simpan Kendaraan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</MitraLayout>
	);
}