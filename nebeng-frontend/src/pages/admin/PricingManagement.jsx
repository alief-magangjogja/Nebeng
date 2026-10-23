import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/dashboard/AdminLayout";
import { Save, Settings, Bike, Car, Truck, Layers, Loader2, CheckCircle, Info, ListChecks } from "lucide-react";
import toast from "react-hot-toast";
const API_URL = "http://127.0.0.1:8000/api";

// Format angka jadi "Rp 1.500" - dipakai untuk menampilkan NILAI TERSIMPAN
// saat ini, terpisah dari input yang sedang diedit admin, supaya admin
// selalu tahu persis apa yang sedang aktif dipakai sistem sekarang.
function formatRupiah(value) {
	const num = Number(value || 0);
	return `Rp ${num.toLocaleString("id-ID")}`;
}

// Satu baris field: label + keterangan singkat + badge "Tersimpan saat ini"
// + input untuk mengedit. Sebelumnya field-field ini cuma kotak kosong
// tanpa konteks sama sekali - sekarang nilai yang sedang aktif SELALU
// terlihat jelas, terpisah dari draft yang sedang diketik.
function PriceField({ label, hint, name, value, savedValue, onChange, suffix = "Rp" }) {
	return (
		<div className="space-y-2 group">
			<div className="flex items-start justify-between gap-2 ml-1">
				<label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] group-hover:text-indigo-600 transition-colors">{label}</label>
				<span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
					{suffix === "Rp" ? formatRupiah(savedValue) : `${Number(savedValue || 0)}x`}
				</span>
			</div>

			{hint && <p className="text-[11px] text-gray-400 ml-1 -mt-1">{hint}</p>}

			<div className="relative rounded-2xl shadow-xs">
				{suffix === "Rp" && (
					<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
						<span className="text-gray-400 font-black text-sm">Rp</span>
					</div>
				)}

				<input
					type="number"
					name={name}
					value={value}
					onChange={onChange}
					placeholder="0"
					className={`w-full py-3.5 border-2 border-gray-100 bg-gray-50/50 rounded-2xl text-sm font-bold text-gray-700 outline-none transition-all focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 ${
						suffix === "Rp" ? "pl-10 pr-4" : "pl-5 pr-12"
					}`}
				/>

				{suffix !== "Rp" && (
					<div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
						<span className="text-indigo-600 font-black text-xs uppercase tracking-wider">{suffix}</span>
					</div>
				)}
			</div>
		</div>
	);
}

// Kartu preview kecil - menunjukkan HASIL AKHIR dari angka-angka yang
// sedang diisi admin, memakai contoh jarak 10 KM. Ini yang paling penting
// dari redesign: sebelumnya admin cuma isi angka mentah tanpa tahu efeknya
// ke harga yang benar-benar dibayar customer.
function PreviewCard({ title, amount, formula }) {
	return (
		<div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
			<div>
				<p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{title}</p>
				<p className="text-[11px] text-indigo-300 mt-0.5">{formula}</p>
			</div>
			<p className="text-lg font-black text-indigo-900 whitespace-nowrap">{formatRupiah(amount)}</p>
		</div>
	);
}

// Satu baris di tabel RINGKASAN (bagian bawah, read-only) - menampilkan
// nama parameter + nilai yang benar-benar tersimpan di database saat ini.
// Label ditumpuk DI ATAS badge (bukan sejajar kiri-kanan) supaya label
// panjang seperti "Kendaraan Barang - Tarif Awal" tidak bikin badge ikut
// kepepet dan pecah baris berantakan.
function SummaryRow({ label, value, suffix = "Rp" }) {
	const isEmpty = value === "" || value === null || value === undefined;
	return (
		<div className="py-3 border-b border-gray-50 last:border-0">
			<p className="text-xs font-bold text-gray-500 mb-1.5">{label}</p>
			<span className={`inline-block text-sm font-black px-3 py-1 rounded-full whitespace-nowrap ${isEmpty ? "text-gray-400 bg-gray-50" : "text-indigo-900 bg-indigo-50"}`}>
				{isEmpty ? "Belum diatur" : suffix === "Rp" ? formatRupiah(value) : `${Number(value)}x`}
			</span>
		</div>
	);
}

export default function PricingManagement() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// `saved` = nilai yang BENAR-BENAR tersimpan di database (hasil fetch
	// terakhir). `form` = draft yang sedang diedit admin. Dipisah supaya
	// badge "Tersimpan saat ini" selalu akurat walau admin sedang mengetik
	// angka baru yang belum disimpan.
	const emptyValues = {
		motor_price_per_km: "",
		motor_min_price: "",
		mobil_price_per_km: "",
		mobil_min_price: "",
		barang_motor_base_price: "",
		barang_motor_price_per_km: "",
		barang_mobil_base_price: "",
		barang_mobil_price_per_km: "",
		barang_bus_base_price: "",
		barang_bus_price_per_km: "",
		xxs_multiplier: "",
		xs_multiplier: "",
		kecil_multiplier: "",
		sedang_multiplier: "",
		besar_multiplier: "",
	};

	const [saved, setSaved] = useState(emptyValues);
	const [form, setForm] = useState(emptyValues);

	useEffect(() => {
		fetchPricing();
	}, []);

	const fetchPricing = async () => {
		try {
			const res = await fetch(`${API_URL}/admin/pricing`, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});

			const data = await res.json();

			setSaved((prev) => ({ ...prev, ...data }));
			setForm((prev) => ({ ...prev, ...data }));
		} catch (err) {
			console.error(err);
			toast.error("Gagal memuat konfigurasi");
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (e) => {
		setForm({
			...form,
			[e.target.name]: e.target.value,
		});
	};

	const savePricing = async () => {
		try {
			setSaving(true);

			const res = await fetch(`${API_URL}/admin/pricing`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
				body: JSON.stringify(form),
			});

			const data = await res.json();

			if (!res.ok) {
				// Tampilkan pesan validasi asli dari backend kalau ada, supaya
				// admin tahu PERSIS field mana yang bermasalah - bukan cuma
				// "Gagal menyimpan" tanpa keterangan.
				const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
				throw new Error(firstError || data?.message || "Request gagal");
			}

			// Sinkronkan "nilai tersimpan" dengan draft yang baru saja berhasil
			// disimpan, supaya badge langsung ter-update tanpa perlu fetch ulang.
			setSaved(form);
			toast.success("Konfigurasi tarif berhasil diperbarui");
		} catch (err) {
			console.error(err);
			toast.error(err.message || "Gagal menyimpan konfigurasi");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<AdminLayout>
				<div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-indigo-900">
					<Loader2 className="animate-spin" size={40} />
					<p className="text-xs font-black uppercase tracking-widest text-gray-400">Memuat Konfigurasi Tarif...</p>
				</div>
			</AdminLayout>
		);
	}

	// ================= HITUNG CONTOH HARGA (jarak 10 KM) =================
	const CONTOH_KM = 10;
	const motorPenumpang = Math.max(Number(form.motor_min_price || 0), Number(form.motor_price_per_km || 0) * CONTOH_KM);
	const mobilPenumpang = Math.max(Number(form.mobil_min_price || 0), Number(form.mobil_price_per_km || 0) * CONTOH_KM);
	const barangMotor = Number(form.barang_motor_base_price || 0) + Number(form.barang_motor_price_per_km || 0) * CONTOH_KM;
	const barangMobil = Number(form.barang_mobil_base_price || 0) + Number(form.barang_mobil_price_per_km || 0) * CONTOH_KM;
	const barangTruk = Number(form.barang_bus_base_price || 0) + Number(form.barang_bus_price_per_km || 0) * CONTOH_KM;

	return (
		<AdminLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6 space-y-8 pb-32 font-sans">
				{/* HEADER PAGE */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-indigo-900">
							<Settings size={24} />
						</div>
						<div>
							<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Konfigurasi Tarif</h1>
							<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Kelola Seluruh Parameter Harga Aplikasi</p>
						</div>
					</div>

					<button
						onClick={savePricing}
						disabled={saving}
						className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/10 transition-all active:scale-[0.98] disabled:opacity-50"
					>
						{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
						{saving ? "Menyimpan..." : "Simpan Perubahan"}
					</button>
				</div>

				<div className="grid grid-cols-1 gap-8">
					{/* CARD 1: TARIF PENUMPANG */}
					<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-indigo-950/5 border border-indigo-50/50 space-y-6">
						<div className="flex items-center gap-3 border-b border-gray-50 pb-4">
							<div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
								<Bike size={20} />
							</div>
							<div>
								<h2 className="text-lg font-black text-gray-800 tracking-tight">Tarif Nebeng Penumpang</h2>
								<p className="text-[11px] text-gray-400">Harga yang dibayar customer saat menumpang bersama mitra</p>
							</div>
						</div>

						<div>
							<p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
								<Car size={13} /> Motor
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<PriceField
									label="Per KM"
									hint="Dikalikan jarak tempuh perjalanan"
									name="motor_price_per_km"
									value={form.motor_price_per_km}
									savedValue={saved.motor_price_per_km}
									onChange={handleChange}
								/>
								<PriceField
									label="Tarif Minimum"
									hint="Harga terendah walau jaraknya sangat dekat"
									name="motor_min_price"
									value={form.motor_min_price}
									savedValue={saved.motor_min_price}
									onChange={handleChange}
								/>
							</div>
						</div>

						<div className="pt-2 border-t border-dashed border-gray-100">
							<p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 mt-4 flex items-center gap-1.5">
								<Car size={13} /> Mobil
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<PriceField
									label="Per KM"
									hint="Dikalikan jarak tempuh perjalanan"
									name="mobil_price_per_km"
									value={form.mobil_price_per_km}
									savedValue={saved.mobil_price_per_km}
									onChange={handleChange}
								/>
								<PriceField
									label="Tarif Minimum"
									hint="Harga terendah walau jaraknya sangat dekat"
									name="mobil_min_price"
									value={form.mobil_min_price}
									savedValue={saved.mobil_min_price}
									onChange={handleChange}
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
							<PreviewCard title="Contoh Motor · 10 KM" amount={motorPenumpang} formula="max(minimum, per KM × 10)" />
							<PreviewCard title="Contoh Mobil · 10 KM" amount={mobilPenumpang} formula="max(minimum, per KM × 10)" />
						</div>
					</div>

					{/* CARD 2: TARIF BARANG */}
					<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-indigo-950/5 border border-indigo-50/50 space-y-6">
						<div className="flex items-center gap-3 border-b border-gray-50 pb-4">
							<div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
								<Truck size={20} />
							</div>
							<div>
								<h2 className="text-lg font-black text-gray-800 tracking-tight">Tarif Dasar Nebeng Barang</h2>
								<p className="text-[11px] text-gray-400">"Tarif Awal" dibayar sekali, lalu ditambah "Per KM" × jarak tempuh</p>
							</div>
						</div>

						<div>
							<p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
								<Bike size={13} /> Motor
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<PriceField label="Tarif Awal" name="barang_motor_base_price" value={form.barang_motor_base_price} savedValue={saved.barang_motor_base_price} onChange={handleChange} />
								<PriceField label="Per KM" name="barang_motor_price_per_km" value={form.barang_motor_price_per_km} savedValue={saved.barang_motor_price_per_km} onChange={handleChange} />
							</div>
						</div>

						<div className="pt-2 border-t border-dashed border-gray-100">
							<p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 mt-4 flex items-center gap-1.5">
								<Car size={13} /> Mobil
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<PriceField label="Tarif Awal" name="barang_mobil_base_price" value={form.barang_mobil_base_price} savedValue={saved.barang_mobil_base_price} onChange={handleChange} />
								<PriceField label="Per KM" name="barang_mobil_price_per_km" value={form.barang_mobil_price_per_km} savedValue={saved.barang_mobil_price_per_km} onChange={handleChange} />
							</div>
						</div>

						<div className="pt-2 border-t border-dashed border-gray-100">
							<p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 mt-4 flex items-center gap-1.5">
								<Truck size={13} /> Kendaraan Barang (Truk, dll)
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<PriceField label="Tarif Awal" name="barang_bus_base_price" value={form.barang_bus_base_price} savedValue={saved.barang_bus_base_price} onChange={handleChange} />
								<PriceField label="Per KM" name="barang_bus_price_per_km" value={form.barang_bus_price_per_km} savedValue={saved.barang_bus_price_per_km} onChange={handleChange} />
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
							<PreviewCard title="Contoh Motor · 10 KM" amount={barangMotor} formula="awal + (per KM × 10)" />
							<PreviewCard title="Contoh Mobil · 10 KM" amount={barangMobil} formula="awal + (per KM × 10)" />
							<PreviewCard title="Contoh Truk · 10 KM" amount={barangTruk} formula="awal + (per KM × 10)" />
						</div>
					</div>

					{/* CARD 3: MULTIPLIER KAPASITAS */}
					<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-indigo-950/5 border border-indigo-50/50 space-y-6">
						<div className="flex items-center gap-3 border-b border-gray-50 pb-4">
							<div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
								<Layers size={20} />
							</div>
							<div>
								<h2 className="text-lg font-black text-gray-800 tracking-tight">Multiplier Kapasitas Logistik</h2>
								<p className="text-[11px] text-gray-400">Tarif dasar barang di atas dikalikan angka ini sesuai ukuran yang dipilih customer</p>
							</div>
						</div>

						<div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
							<Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
							<p className="text-[11px] text-amber-700 leading-relaxed">
								Label ukuran sudah disesuaikan dengan pilihan yang customer lihat saat memesan (XS/S/M/L/XL). Data di baliknya tidak berubah, cuma penamaannya diperjelas.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
							<PriceField label="XS (0.5 Kg)" name="xxs_multiplier" suffix="X" value={form.xxs_multiplier} savedValue={saved.xxs_multiplier} onChange={handleChange} />
							<PriceField label="S (1 Kg)" name="xs_multiplier" suffix="X" value={form.xs_multiplier} savedValue={saved.xs_multiplier} onChange={handleChange} />
							<PriceField label="M (5 Kg)" name="kecil_multiplier" suffix="X" value={form.kecil_multiplier} savedValue={saved.kecil_multiplier} onChange={handleChange} />
							<PriceField label="L (10 Kg)" name="sedang_multiplier" suffix="X" value={form.sedang_multiplier} savedValue={saved.sedang_multiplier} onChange={handleChange} />
							<PriceField label="XL (15 Kg)" name="besar_multiplier" suffix="X" value={form.besar_multiplier} savedValue={saved.besar_multiplier} onChange={handleChange} />
						</div>
					</div>

					{/* RINGKASAN TARIF SAAT INI (read-only, terpisah dari form edit di atas) */}
					<div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-indigo-950/5 border border-indigo-50/50 space-y-6">
						<div className="flex items-center gap-3 border-b border-gray-50 pb-4">
							<div className="p-2 bg-gray-100 text-gray-600 rounded-xl">
								<ListChecks size={20} />
							</div>
							<div>
								<h2 className="text-lg font-black text-gray-800 tracking-tight">Ringkasan Tarif Saat Ini</h2>
								<p className="text-[11px] text-gray-400">Nilai yang benar-benar aktif dipakai sistem sekarang (hasil simpan terakhir) - bukan draft yang sedang diedit di atas</p>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-1">
							<div>
								<p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Nebeng Penumpang</p>
								<SummaryRow label="Motor - Per KM" value={saved.motor_price_per_km} />
								<SummaryRow label="Motor - Minimum" value={saved.motor_min_price} />
								<SummaryRow label="Mobil - Per KM" value={saved.mobil_price_per_km} />
								<SummaryRow label="Mobil - Minimum" value={saved.mobil_min_price} />
							</div>

							<div>
								<p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Nebeng Barang</p>
								<SummaryRow label="Motor - Tarif Awal" value={saved.barang_motor_base_price} />
								<SummaryRow label="Motor - Per KM" value={saved.barang_motor_price_per_km} />
								<SummaryRow label="Mobil - Tarif Awal" value={saved.barang_mobil_base_price} />
								<SummaryRow label="Mobil - Per KM" value={saved.barang_mobil_price_per_km} />
								<SummaryRow label="Kendaraan Barang - Awal" value={saved.barang_bus_base_price} />
								<SummaryRow label="Kendaraan Barang - /KM" value={saved.barang_bus_price_per_km} />
							</div>

							<div>
								<p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Multiplier Kapasitas</p>
								<SummaryRow label="XS (0.5 Kg)" value={saved.xxs_multiplier} suffix="X" />
								<SummaryRow label="S (1 Kg)" value={saved.xs_multiplier} suffix="X" />
								<SummaryRow label="M (5 Kg)" value={saved.kecil_multiplier} suffix="X" />
								<SummaryRow label="L (10 Kg)" value={saved.sedang_multiplier} suffix="X" />
								<SummaryRow label="XL (15 Kg)" value={saved.besar_multiplier} suffix="X" />
							</div>
						</div>
					</div>

					{/* BOTTOM SAVE BUTTON */}
					<div className="flex justify-end pt-4">
						<button
							onClick={savePricing}
							disabled={saving}
							className="w-full sm:w-auto px-12 py-4 bg-indigo-900 hover:bg-indigo-800 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/10 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
						>
							{saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
							{saving ? "Menyimpan Perubahan..." : "Simpan Seluruh Konfigurasi"}
						</button>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}