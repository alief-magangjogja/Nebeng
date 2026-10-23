import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, MapPin, Save, Loader2 } from "lucide-react";

export default function Alamat() {
	const navigate = useAppNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(true);

	// Data akun (dibutuhkan backend saat update, walau yang diedit hanya alamat)
	const [account, setAccount] = useState({ name: "", email: "", phone: "" });
	const [address, setAddress] = useState("");

	// ===============================
	// FETCH PROFILE (ambil alamat tersimpan saat ini)
	// ===============================
	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const token = localStorage.getItem("token");

				const res = await fetch("http://127.0.0.1:8000/api/profile", {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				});

				const data = await res.json();

				setAccount({
					name: data.name || "",
					email: data.email || "",
					phone: data.phone || "",
				});

				setAddress(data.profile?.address || "");
			} catch (err) {
				console.error("Fetch profile error:", err);
			} finally {
				setIsFetching(false);
			}
		};

		fetchProfile();
	}, []);

	// ===============================
	// SIMPAN ALAMAT
	// ===============================
	const handleSave = async (e) => {
		e.preventDefault();

		if (!address.trim()) {
			alert("Alamat tidak boleh kosong");
			return;
		}

		setIsLoading(true);

		try {
			const token = localStorage.getItem("token");

			const body = new FormData();
			// backend mewajibkan field akun ini walau yang diubah hanya alamat
			body.append("name", account.name);
			body.append("email", account.email);
			body.append("phone", account.phone);
			body.append("address", address);

			const res = await fetch("http://127.0.0.1:8000/api/profile/update", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
				body: body,
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => null);
				throw new Error(errData?.message || "Gagal menyimpan alamat");
			}

			alert("Alamat berhasil disimpan");
			navigate("/customer/profil");
		} catch (err) {
			console.error(err);
			alert(err.message || "Terjadi kesalahan saat menyimpan alamat");
		} finally {
			setIsLoading(false);
		}
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
						<h1 className="text-2xl font-black text-indigo-900">Alamat</h1>
						<p className="text-sm text-gray-400">Kelola alamat tempat tinggal kamu</p>
					</div>
				</div>

				<form onSubmit={handleSave} className="bg-white rounded-[40px] p-8 md:p-10 shadow-sm border border-gray-100">
					{isFetching ? (
						<div className="flex items-center justify-center py-16 text-gray-400 gap-2">
							<Loader2 className="animate-spin" size={20} /> Memuat alamat...
						</div>
					) : (
						<>
							<div className="flex items-center gap-3 mb-6">
								<div className="p-3 bg-red-50 text-red-500 rounded-2xl">
									<MapPin size={20} />
								</div>
								<div>
									<h3 className="font-black text-gray-800">Alamat Lengkap</h3>
									<p className="text-xs text-gray-400">Digunakan sebagai referensi lokasi jemput/antar dan data identitas kamu.</p>
								</div>
							</div>

							<textarea
								value={address}
								onChange={(e) => setAddress(e.target.value)}
								rows={4}
								placeholder="Contoh: Jl. Pandanaran No. 10, RT 02/RW 05, Semarang Tengah"
								className="w-full px-6 py-4 bg-gray-50 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 font-medium"
							/>

							<button
								type="submit"
								disabled={isLoading}
								className="mt-8 w-full bg-indigo-900 text-white py-5 rounded-3xl font-black flex items-center justify-center gap-3 disabled:opacity-50"
							>
								{isLoading ? (
									"Menyimpan..."
								) : (
									<>
										<Save size={18} /> Simpan Alamat
									</>
								)}
							</button>
						</>
					)}
				</form>
			</div>
		</CustomerLayout>
	);
}