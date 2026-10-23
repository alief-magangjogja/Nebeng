import { useState } from "react";
import InputField from "../components/ui/InputField";
import logo from "../assets/Logo.svg";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";

function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const response = await fetch("http://127.0.0.1:8000/api/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify({ email }),
			});

			const data = await response.json();

			if (response.ok) {
				setSent(true);
			} else {
				setError(data.message || "Terjadi kesalahan, coba lagi.");
			}
		} catch (err) {
			console.error(err);
			setError("Server error");
		}

		setIsLoading(false);
	};

	return (
		<div className="min-h-screen font-sans flex items-center justify-center bg-linear-to-br from-indigo-900 via-blue-800 to-blue-600 p-6">
			<div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<div className="text-center mb-8">
					<img src={logo} alt="Nebeng Logo" className="w-24 mx-auto mb-4" />
					<h1 className="text-xl font-black text-indigo-900 tracking-tight">Lupa Password?</h1>
					<p className="text-gray-400 mt-1.5 text-xs font-medium">Masukkan email akun Anda, kami akan kirim link untuk reset password.</p>
				</div>

				{sent ? (
					<div className="text-center space-y-4 py-4">
						<div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
							<MailCheck size={32} />
						</div>
						<p className="text-sm font-bold text-gray-700">Kalau email itu terdaftar, link reset password sudah dikirim.</p>
						<p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl p-3 leading-relaxed">
							<span className="font-black">Mode Lokal:</span> layanan email belum aktif, jadi link reset ditulis ke file <code className="font-mono">storage/logs/laravel.log</code> di server backend, bukan benar-benar dikirim ke inbox.
						</p>
						<Link to="/login" className="inline-flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-wider hover:underline mt-2">
							<ArrowLeft size={14} /> Kembali ke Login
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-5">
						<InputField label="Email" type="email" placeholder="Email terdaftar" required value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={18} />} />

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
									Kirim Link Reset <ArrowRight size={18} />
								</>
							)}
						</button>

						<Link to="/login" className="flex items-center justify-center gap-2 text-gray-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-wider transition-colors">
							<ArrowLeft size={14} /> Kembali ke Login
						</Link>
					</form>
				)}
			</div>
		</div>
	);
}

export default ForgotPassword;