import { useState } from "react";
import InputField from "../components/ui/InputField";
import logo from "../assets/Logo.svg";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";

function ResetPassword() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") || "";
	const email = searchParams.get("email") || "";

	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");
	const [formData, setFormData] = useState({ password: "", password_confirmation: "" });

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const response = await fetch("http://127.0.0.1:8000/api/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify({ email, token, ...formData }),
			});

			const data = await response.json();

			if (response.ok) {
				setSuccess(true);
				setTimeout(() => navigate("/login"), 2500);
			} else {
				setError(data.message || "Gagal reset password.");
			}
		} catch (err) {
			console.error(err);
			setError("Server error");
		}

		setIsLoading(false);
	};

	if (!token || !email) {
		return (
			<div className="min-h-screen font-sans flex items-center justify-center bg-linear-to-br from-indigo-900 via-blue-800 to-blue-600 p-6">
				<div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 text-center space-y-4">
					<p className="text-sm font-bold text-gray-700">Link reset password tidak valid atau tidak lengkap.</p>
					<Link to="/forgot-password" className="text-indigo-600 font-black text-xs uppercase tracking-wider hover:underline">
						Ajukan Ulang Link Reset
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen font-sans flex items-center justify-center bg-linear-to-br from-indigo-900 via-blue-800 to-blue-600 p-6">
			<div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<div className="text-center mb-8">
					<img src={logo} alt="Nebeng Logo" className="w-24 mx-auto mb-4" />
					<h1 className="text-xl font-black text-indigo-900 tracking-tight">Buat Password Baru</h1>
					<p className="text-gray-400 mt-1.5 text-xs font-medium">Untuk akun {email}</p>
				</div>

				{success ? (
					<div className="text-center space-y-4 py-4">
						<div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
							<CheckCircle2 size={32} />
						</div>
						<p className="text-sm font-bold text-gray-700">Password berhasil direset. Mengalihkan ke halaman login...</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-5">
						<InputField
							label="Password Baru"
							type={showPassword ? "text" : "password"}
							placeholder="Minimal 8 karakter"
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

						<InputField
							label="Konfirmasi Password Baru"
							type={showPassword ? "text" : "password"}
							placeholder="Ulangi password baru"
							required
							value={formData.password_confirmation}
							onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
							icon={<Lock size={18} />}
						/>

						{error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}

						<button
							type="submit"
							disabled={isLoading}
							className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
								isLoading ? "bg-indigo-300 cursor-wait" : "bg-indigo-900 hover:bg-indigo-800 text-white shadow-indigo-200 active:scale-[0.98]"
							}`}
						>
							{isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
								<>
									Reset Password <ArrowRight size={18} />
								</>
							)}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}

export default ResetPassword;