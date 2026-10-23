import React, { useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, HelpCircle, ChevronDown, MessageCircle, Mail, Phone } from "lucide-react";

const FAQ_ITEMS = [
	{
		q: "Bagaimana cara melakukan verifikasi identitas?",
		a: "Buka menu Profil lalu pilih Verifikasi Identitas. Isi data diri sesuai KTP, lalu ambil foto wajah, foto KTP, dan selfie dengan KTP menggunakan kamera. Tim kami akan meninjau dalam 1x24 jam.",
	},
	{
		q: "Kenapa saya perlu mengatur PIN?",
		a: "PIN digunakan untuk mengonfirmasi transaksi seperti pembayaran dan penarikan saldo, sebagai lapisan keamanan tambahan selain password akun.",
	},
	{
		q: "Bagaimana cara membatalkan pesanan?",
		a: "Buka menu Pesanan, pilih pesanan yang ingin dibatalkan, lalu ikuti instruksi pembatalan pada halaman detail pesanan. Kebijakan biaya pembatalan mengikuti ketentuan yang berlaku.",
	},
	{
		q: "Bagaimana cara menggunakan poin hadiah?",
		a: "Poin hadiah bisa dilihat di menu Poin Hadiah pada halaman Profil, dan dapat digunakan sebagai potongan pada transaksi tertentu sesuai promo yang berlaku.",
	},
	{
		q: "Lupa password atau tidak bisa masuk akun, harus bagaimana?",
		a: "Gunakan opsi 'Lupa Password' pada halaman login. Jika masih mengalami kendala, hubungi Pusat Bantuan melalui kontak di bawah ini.",
	},
];

export default function PusatBantuan() {
	const navigate = useAppNavigate();
	const [openIndex, setOpenIndex] = useState(null);

	const toggleFaq = (idx) => {
		setOpenIndex(openIndex === idx ? null : idx);
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-3xl mx-auto px-4 py-6">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
						<ChevronLeft className="w-6 h-6 text-indigo-900" />
					</button>
					<div>
						<h1 className="text-2xl font-black text-indigo-900">Pusat Bantuan</h1>
						<p className="text-sm text-gray-400">Pertanyaan umum dan cara menghubungi kami</p>
					</div>
				</div>

				{/* FAQ */}
				<div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 mb-6">
					<h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
						<HelpCircle size={14} /> Pertanyaan yang Sering Diajukan
					</h3>

					<div className="space-y-2">
						{FAQ_ITEMS.map((item, idx) => (
							<div key={idx} className="border border-gray-100 rounded-3xl overflow-hidden">
								<button
									onClick={() => toggleFaq(idx)}
									className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-all"
								>
									<span className="text-sm font-bold text-gray-700 pr-4">{item.q}</span>
									<ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform ${openIndex === idx ? "rotate-180" : ""}`} />
								</button>
								{openIndex === idx && (
									<div className="px-5 pb-5 text-sm text-gray-500 leading-relaxed animate-in fade-in duration-200">{item.a}</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* KONTAK SUPPORT */}
				<div className="bg-indigo-900 rounded-[40px] p-8 text-white">
					<h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-6">Masih Butuh Bantuan?</h3>

					<div className="space-y-3">
						<a
							href="https://wa.me/6280000000000"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-3xl transition-all"
						>
							<div className="p-3 bg-emerald-500 rounded-2xl">
								<MessageCircle size={18} />
							</div>
							<div>
								<p className="text-sm font-bold">WhatsApp Support</p>
								<p className="text-xs text-indigo-200">Respon cepat, jam kerja 08.00–21.00</p>
							</div>
						</a>

						<a href="mailto:support@nebeng.id" className="flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-3xl transition-all">
							<div className="p-3 bg-blue-500 rounded-2xl">
								<Mail size={18} />
							</div>
							<div>
								<p className="text-sm font-bold">Email Support</p>
								<p className="text-xs text-indigo-200">support@nebeng.id</p>
							</div>
						</a>

						<a href="tel:+6280000000000" className="flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-3xl transition-all">
							<div className="p-3 bg-amber-500 rounded-2xl">
								<Phone size={18} />
							</div>
							<div>
								<p className="text-sm font-bold">Telepon Call Center</p>
								<p className="text-xs text-indigo-200">0800-0000-000</p>
							</div>
						</a>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}