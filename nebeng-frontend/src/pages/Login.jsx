import { useState } from "react";
import InputField from "../components/ui/InputField";
import logo from "../assets/Logo.svg";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, ShieldCheck, ArrowRight, Mail, Lock } from "lucide-react";
import { useUser } from "../context/UserContext";

function Login() {
	const navigate = useNavigate();
	const { refetchUser } = useUser();
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({ email: "", password: "" });

	// Handle Login Simulation
	const handleLogin = async (e) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const response = await fetch("http://127.0.0.1:8000/api/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (response.ok) {
				localStorage.setItem("token", data.token);
				localStorage.setItem("role", data.user.role);
				localStorage.setItem("user", JSON.stringify(data.user));

				// Ambil ulang data profile (termasuk status verifikasi) sekarang
				// token sudah tersimpan, supaya UserContext tidak basi.
				await refetchUser();

				if (data.status) {
					const role = data.user.role;

					if (role === "admin") {
						navigate("/admin/dashboard");
					} else if (role === "mitra") {
						navigate("/mitra/dashboard");
					} else if (role === "pos_mitra") {
						navigate("/pos-mitra/dashboard");
					} else {
						navigate("/customer/dashboard");
					}
				}
			} else {
				alert(data.message || "Login gagal");
			}
		} catch (error) {
			console.error(error);
			alert("Server error");
		}

		setIsLoading(false);
	};

	// Form dipakai bareng di layout mobile & desktop, supaya tidak perlu
	// tulis 2x logic yang sama persis.
	const loginForm = (
		<form onSubmit={handleLogin} className="space-y-6">
			<div className="space-y-1">
				<InputField label="Email" type="email" placeholder="Email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} icon={<Mail size={18} />} />
			</div>

			<div className="space-y-1">
				<InputField
					label="Password"
					type={showPassword ? "text" : "password"}
					placeholder="Password"
					required
					value={formData.password}
					onChange={(e) => setFormData({ ...formData, password: e.target.value })}
					icon={<Lock size={18} />}
					rightIcon={
						<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-indigo-600 transition-colors">
							{showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
						</button>
					}
				/>
			</div>

			<div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
				<label className="flex items-center gap-2 cursor-pointer group">
					<input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
					<span className="text-gray-400 group-hover:text-indigo-900 transition-colors">Ingat Saya</span>
				</label>

				<Link to="/forgot-password" size={18} className="text-indigo-600 hover:text-indigo-800 transition-colors">
					Lupa Password?
				</Link>
			</div>

			<button
				type="submit"
				disabled={isLoading}
				className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
					isLoading ? "bg-indigo-300 cursor-wait" : "bg-indigo-900 hover:bg-indigo-800 text-white shadow-indigo-200 active:scale-[0.98]"
				}`}
			>
				{isLoading ? (
					<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
				) : (
					<>
						Masuk Ke Akun
						<ArrowRight size={18} />
					</>
				)}
			</button>

			<div className="relative py-4">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-gray-100"></div>
				</div>
				<div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
					<span className="bg-white px-4 text-gray-300">Atau</span>
				</div>
			</div>

			<p className="text-sm text-center text-gray-500 font-medium">
				Belum memiliki akun?{" "}
				<Link to="/register" className="text-indigo-600 font-black hover:underline transition-all">
					DAFTAR SEKARANG
				</Link>
			</p>
		</form>
	);

	return (
		<div className="min-h-screen font-sans overflow-hidden">
			{/* ================= MOBILE LAYOUT (< md) ================= */}
			{/* Hero berwarna gradient (senada dengan panel desktop) supaya logo
			punya kontras, lalu form ada di "bottom sheet" putih di bawahnya. */}
			<div className="md:hidden min-h-screen bg-linear-to-br from-indigo-900 via-blue-800 to-blue-600 relative flex flex-col">
				{/* Background Decor */}
				<div className="absolute top-[-15%] right-[-15%] w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
				<div className="absolute bottom-[20%] left-[-10%] w-56 h-56 bg-sky-400/20 rounded-full blur-2xl"></div>

				{/* HERO / LOGO SECTION */}
				<div className="relative z-10 pt-16 pb-10 px-8 text-center">
					<div className="relative w-fit mx-auto mb-6">
						{/* Glow lembut di belakang logo, bukan kotak solid */}
						<div className="absolute inset-0 bg-white/25 rounded-full blur-2xl scale-125"></div>

						<img src={logo} alt="Nebeng Logo" className="relative w-44 drop-shadow-2xl animate-float" />

						{/* Aksen dekoratif kecil biar lebih hidup */}
						<div className="absolute -top-1 -right-2 w-3 h-3 bg-sky-300 rounded-full animate-ping"></div>
						<div className="absolute top-2 -right-4 w-2 h-2 bg-sky-300/70 rounded-full"></div>
						<div className="absolute -bottom-2 -left-3 w-2.5 h-2.5 bg-white/70 rounded-full animate-pulse"></div>
					</div>

					<h1 className="text-2xl font-black text-white tracking-tight leading-tight">
						Hallo, <span className="text-sky-300">Selamat Datang</span>
					</h1>
					<p className="text-blue-100 text-sm mt-2 leading-relaxed font-medium px-4">Solusi transportasi cerdas, aman, hemat, dan terpercaya.</p>

					<div className="mt-5 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
						<ShieldCheck className="text-sky-300" size={16} />
						<p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Verified Security System</p>
					</div>
				</div>

				{/* FORM BOTTOM SHEET */}
				<div className="relative z-10 flex-1 bg-white rounded-t-[40px] px-6 pt-10 pb-10 shadow-[0_-10px_40px_rgba(30,27,75,0.15)]">
					<div className="mb-8 text-center">
						<h2 className="text-xl font-black text-indigo-900 tracking-tight">Masuk ke Akun</h2>
						<p className="text-gray-400 mt-1.5 text-xs font-medium">Masukkan detail akun kamu untuk melanjutkan.</p>
					</div>

					{loginForm}
				</div>
			</div>

			{/* ================= DESKTOP LAYOUT (>= md) ================= */}
			<div className="hidden md:grid md:grid-cols-2 min-h-screen">
				{/* LEFT SIDE - Enhanced with Gradients and Glassmorphism */}
				<div className="flex bg-linear-to-br from-indigo-900 via-blue-800 to-blue-600 text-white flex-col justify-between p-16 relative">
					{/* Background Decor */}
					<div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
					<div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-sky-400/20 rounded-full blur-2xl"></div>

					<div className="relative z-10">
						<img src={logo} alt="Nebeng Logo" className="w-40 drop-shadow-xl hover:scale-105 transition-transform" />
					</div>

					<div className="relative z-10">
						<h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight tracking-tighter">
							Hallo, <br />
							<span className="text-sky-300">Selamat Datang</span>
						</h1>
						<p className="max-w-md text-blue-100 text-lg leading-relaxed font-medium">Solusi transportasi cerdas yang membantu masyarakat mencari tumpangan yang aman, hemat, dan terpercaya.</p>
					</div>

					<div className="relative z-10 flex items-center gap-3 bg-white/10 w-fit px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
						<ShieldCheck className="text-sky-300" size={20} />
						<p className="text-xs text-blue-100 font-bold uppercase tracking-widest">Verified Security System</p>
					</div>
				</div>

				{/* RIGHT SIDE - Interactive Form */}
				<div className="flex items-center justify-center bg-white px-8 lg:px-16 relative">
					<div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700">
						<div className="mb-10 text-left">
							<h2 className="text-2xl md:text-3xl font-black text-indigo-900 tracking-tight">Selamat Datang Kembali!</h2>
							<p className="text-gray-400 mt-2 text-sm font-medium">Masukkan detail akun Anda untuk melanjutkan ke dashboard.</p>
						</div>

						{loginForm}
					</div>
				</div>
			</div>

			<style>{`
				@keyframes floatLogo {
					0%, 100% { transform: translateY(0px); }
					50% { transform: translateY(-10px); }
				}
				.animate-float {
					animation: floatLogo 3.5s ease-in-out infinite;
				}
			`}</style>
		</div>
	);
}

export default Login;