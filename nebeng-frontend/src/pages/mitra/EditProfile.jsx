import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, User, Mail, Phone, Camera, Save } from "lucide-react";

export default function EditProfile() {
	const navigate = useAppNavigate();

	const [isLoading, setIsLoading] = useState(false);

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		phone: "",
	});

	const [avatar, setAvatar] = useState(null);
	const [preview, setPreview] = useState(null);

	// ===============================
	// FETCH PROFILE
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

				setFormData({
					name: data.name || "",
					email: data.email || "",
					phone: data.phone || "",

					full_name: data.profile?.full_name || "",
					birth_place: data.profile?.birth_place || "",
					birth_date: data.profile?.birth_date || "",
					gender: data.profile?.gender || "",
				});

				if (data.avatar) {
					setPreview(`http://127.0.0.1:8000/storage/${data.avatar}`);
				}
			} catch (err) {
				console.log(err);
			}
		};

		fetchProfile();
	}, []);

	// ===============================
	// HANDLE IMAGE
	// ===============================
	const handleImage = (e) => {
		const file = e.target.files[0];

		if (file) {
			setAvatar(file);
			setPreview(URL.createObjectURL(file));
		}
	};

	// ===============================
	// UPDATE PROFILE
	// ===============================
	const handleUpdate = async (e) => {
		e.preventDefault();

		setIsLoading(true);

		try {
			const token = localStorage.getItem("token");

			const body = new FormData();

			body.append("name", formData.name);
			body.append("email", formData.email);
			body.append("phone", formData.phone);
			body.append("full_name", formData.full_name);
			body.append("birth_place", formData.birth_place);
			body.append("birth_date", formData.birth_date);
			body.append("gender", formData.gender);

			if (avatar) {
				body.append("avatar", avatar);
			}

			const res = await fetch("http://127.0.0.1:8000/api/profile/update", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
				body: body,
			});

			if (res.ok) {
				alert("Profil berhasil diperbarui");
				navigate("/mitra/profil");
			}
		} catch (err) {
			console.log(err);
		}

		setIsLoading(false);
	};

	return (
		<MitraLayout>
			<div className="w-full max-w-7xl mx-auto px-4 py-6 pb-24">
				{/* HEADER */}
				<div className="flex items-center gap-4 mb-8">
					<button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
						<ChevronLeft className="w-6 h-6 text-indigo-900" />
					</button>

					<div>
						<h1 className="text-2xl font-black text-indigo-900">Edit Profil</h1>

						<p className="text-sm text-gray-400">Perbarui informasi akun</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
					{/* PROFILE CARD */}
					<div className="lg:col-span-4">
						<div className="bg-indigo-900 rounded-[40px] p-10 text-center text-white shadow-xl">
							<div className="relative w-40 h-40 mx-auto mb-6">
								<div className="w-full h-full rounded-full border-4 border-white/20 overflow-hidden">
									<img src={preview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`} alt="profile" className="w-full h-full object-cover bg-white" />
								</div>

								<label className="absolute bottom-1 right-1 p-3 bg-white rounded-2xl text-indigo-900 cursor-pointer">
									<Camera size={22} />

									<input type="file" className="hidden" onChange={handleImage} />
								</label>
							</div>

							<h2 className="text-xl font-black">{formData.name || "User"}</h2>
						</div>
					</div>

					{/* FORM */}
					<div className="lg:col-span-8">
						<form onSubmit={handleUpdate} className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100">
							<div className="space-y-8">
								{/* NAME */}
								<div>
									<label className="text-xs font-black text-gray-400 uppercase mb-2 flex items-center gap-2">
										<User size={14} /> Nama Pengguna
									</label>

									<input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-3xl" />
								</div>

								{/* EMAIL */}
								<div>
									<label className="text-xs font-black text-gray-400 uppercase mb-2 flex items-center gap-2">
										<Mail size={14} /> Email
									</label>

									<input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-3xl" />
								</div>

								{/* PHONE */}
								<div>
									<label className="text-xs font-black text-gray-400 uppercase mb-2 flex items-center gap-2">
										<Phone size={14} /> Telepon
									</label>

									<input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-3xl" />
								</div>
							</div>

							{/* BUTTON */}
							<button type="submit" disabled={isLoading} className="mt-10 w-full bg-indigo-900 text-white py-5 rounded-3xl font-black flex items-center justify-center gap-3">
								{isLoading ? (
									"Menyimpan..."
								) : (
									<>
										<Save size={18} /> Simpan Perubahan
									</>
								)}
							</button>
						</form>
					</div>
				</div>
			</div>
		</MitraLayout>
	);
}
