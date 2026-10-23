// Util kecil untuk export array of object jadi file CSV yang otomatis
// ke-download oleh browser. Dipakai bareng oleh semua halaman admin yang
// punya tombol "Download" (Daftar Customer, Daftar Mitra, Verifikasi
// Customer, Verifikasi Mitra, Blokir Customer, Blokir Mitra, Kendaraan
// Mitra) supaya tidak ada logic duplikat di 7 file berbeda.
//
// rows: array of plain object, key-nya dipakai sebagai header kolom CSV
// filename: nama file hasil download, mis. "daftar-customer.csv"
export function exportToCsv(filename, rows) {
	if (!rows || rows.length === 0) {
		alert("Tidak ada data untuk diunduh.");
		return;
	}

	const headers = Object.keys(rows[0]);

	const escapeCell = (value) => {
		const str = value === null || value === undefined ? "" : String(value);
		// bungkus dengan tanda kutip kalau ada koma/kutip/baris baru,
		// dan escape tanda kutip ganda sesuai standar CSV
		if (/[",\n]/.test(str)) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	};

	const csvLines = [headers.map(escapeCell).join(","), ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(","))];

	// tambahkan BOM supaya karakter (mis. "é", "İ") tetap kebaca benar
	// kalau dibuka di Excel
	const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.setAttribute("download", filename);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}