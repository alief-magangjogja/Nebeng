import React, { useState } from "react";
import CustomerLayout from "../../components/dashboard/CustomerLayout";
import { ChevronLeft, Car, ArrowRight, ShieldAlert, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default function Refund() {
	const [isAgreed, setIsAgreed] = useState(false);
	const [showError, setShowError] = useState(false);
	const [currentStep, setCurrentStep] = useState(1);

	const steps = [
		{ id: 1, label: "Syarat dan Ketentuan" },
		{ id: 2, label: "Isi Data" },
		{ id: 3, label: "Review" },
	];

	const handleNext = () => {
		if (!isAgreed) {
			setShowError(true);
		} else {
			setShowError(false);
			alert("Melanjutkan ke tahap pengisian data refund...");
			// setCurrentStep(2); // Logika untuk pindah step
		}
	};

	return (
		<CustomerLayout>
			<div className="w-full max-w-screen-xl mx-auto px-4 py-6">
				{/* HEADER & STEPPER */}
				<div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-8">
					<div className="flex items-center gap-4 mb-8">
						<button className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
							<ChevronLeft size={24} className="text-indigo-900" />
						</button>
						<h1 className="text-2xl font-black text-indigo-900 tracking-tight">Refund</h1>
					</div>

					{/* Stepper Component */}
					<div className="flex items-center justify-center gap-2 md:gap-4 max-w-2xl mx-auto">
						{steps.map((step, index) => (
							<React.Fragment key={step.id}>
								<div className="flex items-center gap-2">
									<div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${currentStep >= step.id ? "bg-indigo-900 text-white" : "bg-gray-100 text-gray-400"}`}>{step.id}</div>
									<span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:block ${currentStep >= step.id ? "text-indigo-900" : "text-gray-300"}`}>{step.label}</span>
								</div>
								{index < steps.length - 1 && <div className="w-8 md:w-16 h-[2px] bg-gray-100 border-t-2 border-dashed border-gray-200"></div>}
							</React.Fragment>
						))}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
					{/* SISI KIRI: Ringkasan Perjalanan & Syarat (8 Kolom) */}
					<div className="lg:col-span-8 space-y-6">
						{/* Info Kendaraan Card */}
						<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
							<div className="flex flex-col md:flex-row justify-between items-center gap-6">
								<div className="flex items-center gap-4">
									<div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-900">
										<Car size={32} />
									</div>
									<div>
										<h3 className="text-xl font-black text-indigo-900">Nebeng Mobil</h3>
										<p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Mobil Avanza • R 2424 MJ</p>
									</div>
								</div>

								<div className="flex items-center gap-8 bg-gray-50 px-8 py-4 rounded-3xl border border-gray-100">
									<div className="text-center">
										<p className="text-lg font-black text-indigo-900 leading-none">13:00</p>
										<p className="text-[10px] font-bold text-gray-400 mt-1">PURWOKERTO</p>
									</div>
									<ArrowRight size={20} className="text-indigo-300" />
									<div className="text-center">
										<p className="text-lg font-black text-indigo-900 leading-none">09:00</p>
										<p className="text-[10px] font-bold text-gray-400 mt-1">YOGYAKARTA</p>
									</div>
								</div>
							</div>
						</div>

						{/* Syarat & Ketentuan Section */}
						<div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
							<div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
								<ShieldAlert size={24} className="text-indigo-600" />
								<h2 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Syarat dan Ketentuan Refund</h2>
							</div>

							<div className="space-y-6 text-sm text-gray-600 leading-relaxed overflow-y-auto max-h-[400px] pr-4 custom-scrollbar">
								<div className="space-y-3">
									<p className="font-black text-indigo-900 uppercase text-xs tracking-widest">1. Pembatalan oleh Pengemudi</p>
									<ul className="list-disc pl-5 space-y-2 text-gray-500 font-medium">
										<li>Jika pengemudi membatalkan perjalanan secara sepihak setelah penumpang membayar, penumpang berhak mendapat refund penuh (3-5 hari kerja).</li>
										<li>Jika terlambat lebih dari 15 menit dari jadwal tanpa pemberitahuan, penumpang dapat meminta refund penuh.</li>
									</ul>
								</div>

								<div className="space-y-3">
									<p className="font-black text-indigo-900 uppercase text-xs tracking-widest">2. Pembatalan oleh Penumpang</p>
									<ul className="list-disc pl-5 space-y-2 text-gray-500 font-medium">
										<li>Pembatalan {">"} 1 jam sebelum keberangkatan berhak refund penuh.</li>
										<li>Pembatalan {"<"} 1 jam sebelum keberangkatan hanya mendapatkan 50% dari biaya perjalanan.</li>
										<li>Tidak ada refund jika pembatalan dilakukan {"<"} 15 menit sebelum keberangkatan.</li>
									</ul>
								</div>

								<div className="space-y-3">
									<p className="font-black text-indigo-900 uppercase text-xs tracking-widest">3. Proses Pengajuan Refund</p>
									<p className="text-gray-500 font-medium">Penumpang dapat mengajukan permintaan refund melalui menu 'Bantuan' dalam waktu 24 jam setelah perjalanan dibatalkan atau bermasalah.</p>
								</div>
							</div>
						</div>
					</div>

					{/* SISI KANAN: Konfirmasi & Action (4 Kolom) */}
					<div className="lg:col-span-4 lg:sticky lg:top-6">
						<div className="bg-white rounded-[40px] p-8 shadow-xl border border-indigo-50">
							<div className="mb-8">
								<h3 className="font-black text-indigo-900 text-lg mb-4">Persetujuan</h3>
								<label className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer group hover:bg-indigo-50/50 transition-colors">
									<div className="relative flex items-center mt-1">
										<input
											type="checkbox"
											checked={isAgreed}
											onChange={(e) => {
												setIsAgreed(e.target.checked);
												if (e.target.checked) setShowError(false);
											}}
											className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-gray-200 checked:bg-indigo-600 checked:border-indigo-600 transition-all"
										/>
										<CheckCircle2 size={16} className="absolute left-1 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
									</div>
									<span className="text-xs font-bold text-gray-600 leading-relaxed group-hover:text-indigo-900 transition-colors">Saya menyetujui Syarat dan Ketentuan refund yang berlaku.</span>
								</label>
							</div>

							{/* Error Message */}
							{showError && (
								<div className="flex items-center gap-2 text-red-500 mb-6 bg-red-50 p-4 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
									<AlertCircle size={18} />
									<p className="text-[10px] font-black uppercase tracking-wider">Mohon konfirmasi syarat dan ketentuan</p>
								</div>
							)}

							<button
								onClick={handleNext}
								className={`w-full py-5 rounded-[24px] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
									isAgreed ? "bg-indigo-900 text-white shadow-indigo-200 hover:bg-indigo-800 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"
								}`}
							>
								Lanjutkan
								<ArrowRight size={22} />
							</button>

							<div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
								<ShieldCheck size={14} />
								Keamanan Data Terjamin
							</div>
						</div>
					</div>
				</div>
			</div>
		</CustomerLayout>
	);
}
