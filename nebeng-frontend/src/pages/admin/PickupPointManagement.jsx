import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { MapPin, Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = "http://127.0.0.1:8000/api";

const emptyForm = {
	id: null,
	city_id: "",
	pos_name: "",
	address: "",
	latitude: "",
	longitude: "",
};

// Pusat peta default kalau belum ada koordinat sama sekali (tengah Jawa -
// area operasional saat ini: Purwokerto/Yogyakarta/Solo).
const DEFAULT_CENTER = [-7.5, 110];

// Ikon pin sama seperti yang dipakai di halaman "Lihat Perjalanan" mitra,
// supaya konsisten secara visual di seluruh aplikasi.
const pinIcon = L.icon({
	iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
	iconSize: [34, 34],
	iconAnchor: [17, 34],
});

// Marker interaktif: klik di manapun pada peta ATAU geser pin-nya untuk
// mengubah titik koordinat. onPick dipanggil dengan { lat, lng }.
function LocationMarker({ position, onPick }) {
	useMapEvents({
		click(e) {
			onPick(e.latlng);
		},
	});

	if (!position) return null;

	return (
		<Marker
			position={position}
			draggable
			icon={pinIcon}
			eventHandlers={{
				dragend: (e) => onPick(e.target.getLatLng()),
			}}
		/>
	);
}

export default function PickupPointManagement() {
	const [points, setPoints] = useState([]);
	const [cities, setCities] = useState([]);
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

	const fetchAll = async () => {
		setLoading(true);
		try {
			const [pointsRes, citiesRes] = await Promise.all([fetch(`${API_URL}/admin/pickup-points`, { headers }), fetch(`${API_URL}/admin/cities`, { headers })]);

			setPoints(await pointsRes.json());
			setCities(await citiesRes.json());
		} catch (err) {
			console.error(err);
			toast.error("Gagal memuat data pickup point");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAll();
	}, []);

	const filteredPoints = useMemo(() => {
		const keyword = searchTerm.toLowerCase();
		return points.filter((p) => p.pos_name?.toLowerCase().includes(keyword) || p.address?.toLowerCase().includes(keyword) || p.city?.name?.toLowerCase().includes(keyword));
	}, [points, searchTerm]);

	const openAddModal = () => {
		setForm(emptyForm);
		setShowModal(true);
	};

	const openEditModal = (point) => {
		setForm({
			id: point.id,
			city_id: point.city_id,
			pos_name: point.pos_name,
			address: point.address,
			latitude: point.latitude ?? "",
			longitude: point.longitude ?? "",
		});
		setShowModal(true);
	};

	const handleChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	// Dipanggil dari klik/geser pin di peta - update field latitude &
	// longitude secara otomatis, dibulatkan 6 desimal (presisi ~10cm,
	// lebih dari cukup untuk titik jemput).
	const handlePickLocation = (latlng) => {
		setForm((prev) => ({
			...prev,
			latitude: latlng.lat.toFixed(6),
			longitude: latlng.lng.toFixed(6),
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!form.city_id || !form.pos_name || !form.address || form.latitude === "" || form.longitude === "") {
			toast.error("Semua field wajib diisi, termasuk koordinat");
			return;
		}

		setSaving(true);

		try {
			const url = isEditing ? `${API_URL}/admin/pickup-points/${form.id}` : `${API_URL}/admin/pickup-points`;
			const method = isEditing ? "PUT" : "POST";

			const res = await fetch(url, {
				method,
				headers,
				body: JSON.stringify({
					city_id: form.city_id,
					pos_name: form.pos_name,
					address: form.address,
					latitude: form.latitude,
					longitude: form.longitude,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal menyimpan pickup point");
			}

			toast.success(isEditing ? "Pickup point berhasil diperbarui" : "Pickup point berhasil ditambahkan");
			setShowModal(false);
			fetchAll();
		} catch (err) {
			toast.error(err.message);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;

		try {
			const res = await fetch(`${API_URL}/admin/pickup-points/${deleteTarget.id}`, {
				method: "DELETE",
				headers,
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Gagal menghapus pickup point");
			}

			toast.success("Pickup point berhasil dihapus");
			setDeleteTarget(null);
			fetchAll();
		} catch (err) {
			toast.error(err.message);
			setDeleteTarget(null);
		}
	};

	// Posisi marker saat ini di peta (null kalau belum ada koordinat sama
	// sekali - misal lagi Tambah baru & belum pernah klik peta).
	const currentPosition = form.latitude !== "" && form.longitude !== "" ? [parseFloat(form.latitude), parseFloat(form.longitude)] : null;

	return (
		<AdminLayout>
			<div className="w-full max-w-6xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-black text-indigo-900">Kelola Pickup Point</h1>
						<p className="text-sm text-gray-400">Titik jemput ini yang muncul sebagai pilihan di aplikasi Mitra saat membuat trip baru</p>
					</div>
					<button onClick={openAddModal} className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-800 active:scale-95 transition-all">
						<Plus size={18} /> Tambah Pickup Point
					</button>
				</div>

				{/* SEARCH */}
				<div className="relative mb-6">
					<Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
					<input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari nama pos, alamat, atau kota..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all" />
				</div>

				{/* TABLE */}
				<div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center py-16 text-gray-400 gap-2">
							<Loader2 className="animate-spin" size={20} /> Memuat data...
						</div>
					) : filteredPoints.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-gray-300">
							<MapPin size={40} className="mb-2" />
							<p className="text-sm font-bold">Belum ada pickup point</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-100 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
										<th className="px-6 py-4">Kota</th>
										<th className="px-6 py-4">Nama Pos</th>
										<th className="px-6 py-4">Alamat</th>
										<th className="px-6 py-4">Koordinat</th>
										<th className="px-6 py-4 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{filteredPoints.map((p) => (
										<tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
											<td className="px-6 py-4 font-bold text-gray-700">{p.city?.name || "-"}</td>
											<td className="px-6 py-4 font-bold text-gray-700">{p.pos_name}</td>
											<td className="px-6 py-4 text-gray-500 max-w-xs truncate">{p.address}</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{p.latitude && p.longitude ? (
													<span className="inline-block text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg whitespace-nowrap">
														{Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
													</span>
												) : (
													<span className="inline-block text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg whitespace-nowrap">Belum diisi</span>
												)}
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center justify-end gap-2">
													<button onClick={() => openEditModal(p)} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
														<Pencil size={16} />
													</button>
													<button onClick={() => setDeleteTarget(p)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
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
					<div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
							<h2 className="text-lg font-black text-indigo-900">{isEditing ? "Edit Pickup Point" : "Tambah Pickup Point"}</h2>
							<button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
								<X size={18} className="text-gray-400" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kota</label>
								<select name="city_id" value={form.city_id} onChange={handleChange} className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all">
									<option value="">Pilih kota</option>
									{cities.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Pos</label>
								<input type="text" name="pos_name" value={form.pos_name} onChange={handleChange} placeholder="Contoh: Pos 1" className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all" />
							</div>

							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Alamat</label>
								<textarea name="address" value={form.address} onChange={handleChange} rows={2} placeholder="Contoh: Terminal Giwangan Yogyakarta" className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all resize-none" />
							</div>

							{/* PETA INTERAKTIF - klik atau geser pin untuk set titik koordinat,
							    tidak perlu lagi bolak-balik buka Google Maps. */}
							<div>
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Titik Lokasi di Peta</label>
								<div className="mt-1 h-60 w-full rounded-2xl overflow-hidden border-2 border-gray-100">
									<MapContainer center={currentPosition || DEFAULT_CENTER} zoom={currentPosition ? 15 : 8} scrollWheelZoom className="h-full w-full">
										<TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
										<LocationMarker position={currentPosition} onPick={handlePickLocation} />
									</MapContainer>
								</div>
								<p className="text-[11px] text-gray-400 leading-relaxed px-1 mt-1.5">{currentPosition ? "Klik di titik lain pada peta atau geser pin untuk memindahkan lokasi." : "Klik di peta untuk menandai titik lokasi pos ini."}</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Latitude</label>
									<input type="number" step="any" name="latitude" value={form.latitude} onChange={handleChange} placeholder="-7.789249" className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all" />
								</div>
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Longitude</label>
									<input type="number" step="any" name="longitude" value={form.longitude} onChange={handleChange} placeholder="110.363471" className="w-full mt-1 px-4 py-3 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all" />
								</div>
							</div>

							<p className="text-[11px] text-gray-400 leading-relaxed px-1">Latitude/Longitude di atas otomatis terisi dari peta, tapi tetap bisa diketik/diedit manual kalau kamu sudah tahu angka pastinya.</p>

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
						<h2 className="text-lg font-black text-indigo-900 mb-2">Hapus Pickup Point?</h2>
						<p className="text-sm text-gray-500 mb-6">
							"{deleteTarget.pos_name}" ({deleteTarget.city?.name}) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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