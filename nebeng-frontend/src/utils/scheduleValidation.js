// src/utils/scheduleValidation.js
// Helper untuk membatasi jadwal keberangkatan yang bisa dipilih mitra
// saat membuat tebengan.
// Aturan (BARU): mitra bisa buat trip kapan saja, asal jamnya belum
// lewat dari SEKARANG. Dulu ada aturan minimal 3 jam dari sekarang -
// dihapus, karena menghambat mitra yang butuh buat trip mepet (mis.
// buat presentasi, keberangkatan langsung dalam hitungan menit).
// Sekarang cukup: kalau sekarang jam 12:00, trip paling cepat boleh
// jam 12:01 (1 menit ke depan) - tidak boleh persis jam 12:00 atau
// lebih awal (11:59), karena itu artinya jamnya sudah lewat/pas-pasan.

const MIN_LEAD_MINUTES = 1;

function pad(num) {
	return String(num).padStart(2, "0");
}

function toDateInputValue(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInputValue(d) {
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getMinDepartureDateTime() {
	const now = new Date();
	now.setSeconds(0, 0); // buang detik & milidetik dulu biar hasilnya pas menit bulat
	return new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000);
}

// Nilai untuk atribut `min` pada <input type="date" />
export function getMinDateValue() {
	return toDateInputValue(getMinDepartureDateTime());
}

// Nilai untuk atribut `min` pada <input type="time" />.
// Hanya relevan kalau tanggal yang dipilih == tanggal paling awal (minDate).
// Untuk tanggal setelahnya, jam bebas dipilih (00:00 - 23:59).
export function getMinTimeValue(selectedDate) {
	const minDateTime = getMinDepartureDateTime();
	if (selectedDate === toDateInputValue(minDateTime)) {
		return toTimeInputValue(minDateTime);
	}
	return undefined;
}

// Validasi gabungan tanggal + jam sebelum submit.
// Mengembalikan { valid: boolean, message?: string }
export function validateDepartureSchedule(date, time) {
	if (!date || !time) {
		return { valid: false, message: "Mohon lengkapi tanggal dan jam keberangkatan" };
	}

	const selected = new Date(`${date}T${time}`);
	if (Number.isNaN(selected.getTime())) {
		return { valid: false, message: "Format tanggal/jam tidak valid" };
	}

	const minDateTime = getMinDepartureDateTime();

	if (selected < minDateTime) {
		return {
			valid: false,
			message: "Jadwal keberangkatan tidak boleh di waktu yang sudah lewat. Silakan pilih jam setelah waktu sekarang.",
		};
	}

	return { valid: true };
}