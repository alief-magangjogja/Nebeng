										import AdminLayout from "../../components/dashboard/AdminLayout";
import { Edit2, Eye, Camera, Calendar } from "lucide-react";

export default function Settings() {
	return (
		<AdminLayout>
			<h1 className="text-2xl font-bold mb-6 text-gray-800">Settings</h1>

			<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				{/* Profile Header Section */}
				<div className="bg-sky-50 p-6 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="relative">
							<div className="w-20 h-20 rounded-full bg-orange-100 border-2 border-white overflow-hidden">
								<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Muhammad" alt="Profile" className="w-full h-full object-cover" />
							</div>
							<button className="absolute bottom-0 right-0 p-1.5 bg-black rounded-full text-white border-2 border-white hover:bg-gray-800 transition-colors">
								<Camera className="w-3 h-3" />
							</button>
						</div>
						<div>
							<h2 className="text-xl font-bold text-gray-800">Muhammad Abdul</h2>
							<p className="text-sm text-gray-500">Nebeng Motor</p>
							<p className="text-xs text-gray-400 font-medium">Admin</p>
						</div>
					</div>
					<button className="flex items-center gap-2 px-4 py-1.5 bg-sky-100 text-sky-600 rounded-lg text-sm font-semibold hover:bg-sky-200 transition-colors">
						Edit <Edit2 className="w-3.5 h-3.5" />
					</button>
				</div>

				<div className="p-8 space-y-10">
					{/* Informasi Pribadi Section */}
					<section>
						<h3 className="text-lg font-bold text-gray-800 mb-6">Informasi Pribadi</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">Nama Lengkap</label>
								<input type="text" defaultValue="Muhammad Abdul Kadir" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none" />
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">Email</label>
								<input type="email" defaultValue="Abdul000@gmail.com" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none" />
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">Tempat Lahir</label>
								<input type="text" defaultValue="London" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none" />
							</div>
							<div className="space-y-2 text-sm">
								<label className="text-sm font-medium text-gray-700">Tanggal Lahir</label>
								<div className="relative">
									<input type="text" defaultValue="01-02-1999" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none" />
									<Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">Jenis Kelamin</label>
								<select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none appearance-none cursor-pointer">
									<option>Laki - Laki</option>
									<option>Perempuan</option>
								</select>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">No. Tlp</label>
								<input type="text" defaultValue="089373933994" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none" />
							</div>
						</div>
					</section>

					{/* Informasi Akun Section */}
					<section className="space-y-6">
						<div className="flex items-center gap-4">
							<h3 className="text-lg font-bold text-gray-800">Informasi Akun</h3>
							<button className="flex items-center gap-2 px-4 py-1.5 bg-sky-100 text-sky-600 rounded-lg text-sm font-semibold hover:bg-sky-200 transition-colors">
								Edit <Edit2 className="w-3.5 h-3.5" />
							</button>
						</div>

						<div className="max-w-md space-y-6">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700">Password</label>
								<div className="relative">
									<input type="password" defaultValue="**********" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none" />
									<Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer" />
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 text-gray-400">Password Baru</label>
								<div className="relative">
									<input type="password" placeholder="Masukkan Password Baru" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 focus:outline-none" />
									<Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 cursor-pointer" />
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 text-gray-400">Konfirmasi Password Baru</label>
								<div className="relative">
									<input type="password" placeholder="Masukkan Password Baru" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 focus:outline-none" />
									<Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 cursor-pointer" />
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</AdminLayout>
	);
}
