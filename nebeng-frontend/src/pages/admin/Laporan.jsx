import AdminLayout from "../../components/dashboard/AdminLayout";
import { Search, Calendar, Download, Eye, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

export default function Laporan() {
	// Data fake untuk tabel laporan sesuai gambar
	const reports = Array(10)
		.fill({
			noOrder: "0091",
			namaCustomer: "Muhammda Abdul",
			tanggal: "Rabu, 17 Okt 2023",
			layanan: "Motor",
			laporan: "Customer mencantukan alamat yang...",
		})
		.map((item, index) => {
			// Variasi nama customer dan layanan untuk demo
			if (index === 0) return { ...item, namaCustomer: "Clara Aulia" };
			const layananList = ["Motor", "Mobil", "Nebeng Barang", "Titip Barang"];
			return { ...item, layanan: layananList[index % 4] };
		});

	return (
		<AdminLayout>
			<h1 className="text-2xl font-bold mb-6 text-gray-800">Daftar Pesanan</h1>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
				{/* Header Actions */}
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div className="relative w-full md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
						<input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" />
					</div>

					<div className="flex items-center gap-3 w-full md:w-auto ml-auto">
						<button className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium bg-white hover:bg-gray-50 transition-colors">
							<Calendar className="mr-2 w-4 h-4 text-gray-400" /> Filter
						</button>
						<button className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
							Download <Download className="ml-2 w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-sky-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
								<th className="px-4 py-4 rounded-l-lg text-center w-24">No. Order</th>
								<th className="px-4 py-4">Nama Costumer</th>
								<th className="px-4 py-4">Tanggal</th>
								<th className="px-4 py-4 text-center">Layanan</th>
								<th className="px-4 py-4">Laporan</th>
								<th className="px-4 py-4 rounded-r-lg text-center">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{reports.map((report, i) => (
								<tr key={i} className="hover:bg-gray-50 transition-colors">
									<td className="px-4 py-5 text-sm text-gray-600 text-center font-medium">{report.noOrder}</td>
									<td className="px-4 py-5 text-sm text-gray-700 font-medium">{report.namaCustomer}</td>
									<td className="px-4 py-5 text-sm text-gray-500">{report.tanggal}</td>
									<td className="px-4 py-5 text-sm text-gray-500 text-center">{report.layanan}</td>
									<td className="px-4 py-5 text-sm text-gray-500 max-w-xs truncate">{report.laporan}</td>
									<td className="px-4 py-5 text-center">
										<button className="p-2 bg-indigo-900 text-white rounded-md hover:bg-indigo-800 transition-colors inline-flex items-center justify-center shadow-sm">
											<Eye className="w-4 h-4" />
										</button>
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
							10 <ChevronDown className="w-3 h-3 text-gray-400" />
						</div>
						<span>of 120 entries</span>
					</div>

					<div className="flex items-center gap-1">
						<button className="p-2 text-gray-300">
							<ChevronLeft className="w-5 h-5" />
						</button>
						<button className="w-8 h-8 flex items-center justify-center rounded bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">1</button>
						<button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 text-xs font-medium hover:bg-gray-50">2</button>
						<button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 text-xs font-medium hover:bg-gray-50">3</button>
						<span className="text-gray-300 mx-1">....</span>
						<button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 text-xs font-medium hover:bg-gray-50">6</button>
						<button className="p-2 text-gray-400 hover:text-gray-600">
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}
