import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

// Combobox pos_mitra: bisa DIKETIK untuk mencari/filter, tapi nilai yang
// benar-benar tersimpan (`value`, dikirim lewat `onChange`) HANYA bisa
// diisi dengan mengklik salah satu opsi dari daftar `points` - mengetik
// teks bebas lalu klik di luar / Escape akan otomatis mengembalikan
// tampilan ke pilihan terakhir yang valid (atau kosong kalau belum ada
// pilihan), jadi tidak mungkin ada pos "siluman" di luar data pos_mitra.
//
// Props:
// - points: array {id, city, pos_name, address}
// - value: point yang sedang terpilih (atau null)
// - onChange(point): dipanggil saat admin/klien MEMILIH opsi valid
// - excludeId: id yang disembunyikan dari daftar (mis. titik satunya
//   yang sudah dipilih di field pasangannya, origin vs destination)
export default function PickupPointCombobox({
	label,
	placeholder = "Pilih titik",
	loadingPlaceholder = "Memuat titik...",
	points = [],
	loading = false,
	value,
	onChange,
	excludeId = null,
}) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState(0);
	const wrapperRef = useRef(null);
	const inputRef = useRef(null);

	const displayText = (point) => (point ? `${point.city} - ${point.pos_name}` : "");

	// Saat tidak sedang fokus/mengetik, input menampilkan pilihan yang
	// sedang aktif (bukan query pencarian) - ini yang membuat "kembali ke
	// nilai valid terakhir" terasa alami begitu combobox ditutup.
	useEffect(() => {
		if (!open) {
			setQuery(value ? displayText(value) : "");
		}
	}, [value, open]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filtered = points
		.filter((p) => p.id !== excludeId)
		.filter((p) => {
			if (!query.trim()) return true;
			const haystack = `${p.city} ${p.pos_name} ${p.address}`.toLowerCase();
			return haystack.includes(query.trim().toLowerCase());
		});

	const commitSelection = (point) => {
		onChange(point);
		setQuery(displayText(point));
		setOpen(false);
		setHighlight(0);
	};

	const handleFocus = () => {
		if (loading) return;
		setOpen(true);
		// Kosongkan supaya admin langsung bisa ketik dari nol, bukan harus
		// hapus teks lama dulu.
		setQuery("");
	};

	const handleKeyDown = (e) => {
		if (!open) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlight((h) => Math.min(h + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlight((h) => Math.max(h - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (filtered[highlight]) commitSelection(filtered[highlight]);
		} else if (e.key === "Escape") {
			setOpen(false);
			inputRef.current?.blur();
		}
	};

	return (
		<div ref={wrapperRef} className="relative">
			{label && <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">{label}</label>}

			<div className="relative flex items-center">
				<input
					ref={inputRef}
					type="text"
					value={query}
					disabled={loading}
					onFocus={handleFocus}
					onChange={(e) => {
						setQuery(e.target.value);
						setHighlight(0);
						if (!open) setOpen(true);
					}}
					onKeyDown={handleKeyDown}
					placeholder={loading ? loadingPlaceholder : placeholder}
					className={`w-full text-lg font-bold py-2 pr-8 outline-none bg-transparent disabled:opacity-50 ${value ? "text-gray-800" : "text-gray-400"} placeholder:text-gray-300 placeholder:font-bold placeholder:text-lg`}
				/>
				{open ? <Search size={16} className="absolute right-0 text-gray-300 shrink-0" /> : <ChevronDown size={18} className="absolute right-0 text-gray-300 shrink-0" />}
			</div>

			{value && !open && <p className="text-xs text-gray-400 -mt-0.5">{value.address}</p>}

			{open && (
				<div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
					{filtered.length > 0 ? (
						filtered.map((point, idx) => (
							<div
								key={point.id}
								onClick={() => commitSelection(point)}
								onMouseEnter={() => setHighlight(idx)}
								className={`p-4 cursor-pointer border-b last:border-none border-gray-100 ${idx === highlight ? "bg-indigo-50" : "hover:bg-gray-50"}`}
							>
								<p className="text-sm font-bold text-gray-800">
									{point.city} - {point.pos_name}
								</p>
								<p className="text-xs text-gray-400 mt-0.5">{point.address}</p>
							</div>
						))
					) : (
						<div className="p-4 text-center">
							<p className="text-xs font-bold text-gray-400">Tidak ada pos yang cocok</p>
							<p className="text-[11px] text-gray-300 mt-0.5">Pilih dari daftar pos yang tersedia - tidak bisa mengetik lokasi sendiri</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}