// Dipakai oleh tombol "Chat" di berbagai halaman (Riwayat, Detail Pesanan,
// Detail Tebengan, dll) supaya customer/mitra langsung diarahkan ke
// percakapan yang benar dengan lawan bicara yang tepat.
//
// Menyesuaikan dengan mekanisme auto-open yang sudah dibangun di
// src/pages/mitra/Pesan.jsx & src/pages/customer/Pesan.jsx: kedua halaman
// itu mencari percakapan yang cocok lewat `customerId` (kalau dibuka dari
// sisi mitra) atau `mitraId` (kalau dibuka dari sisi customer) yang
// dikirim lewat router state - BUKAN conversationId. Karena percakapan
// mitra-customer sudah otomatis dibuat sejak order pertama kali dibuat,
// tidak perlu panggil backend apa pun di sini - cukup arahkan dengan
// state yang benar dan Pesan.jsx akan mencocokkannya sendiri.
//
// - otherUserId   : id user lawan bicara (mitra_id kalau dipanggil dari
//   sisi customer, customer_id kalau dipanggil dari sisi mitra)
// - navigate      : fungsi navigate() dari react-router
// - pesanPath     : "/customer/pesan" atau "/mitra/pesan-mitra"
// - otherUserName : opsional, nama lawan bicara untuk teks loading
export function openChatWith(otherUserId, navigate, pesanPath, otherUserName) {
	if (!otherUserId) {
		navigate(pesanPath);
		return;
	}

	const isMitraPage = pesanPath.includes("mitra");

	navigate(pesanPath, {
		state: isMitraPage
			? { customerId: otherUserId, customerName: otherUserName }
			: { mitraId: otherUserId, mitraName: otherUserName },
	});
}