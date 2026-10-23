import React, { useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import PosMitraLayout from "../../components/dashboard/PosMitraLayout";
import { ChevronLeft, Lock, ShieldCheck, Eye, EyeOff, Save, KeyRound, CheckCircle2 } from "lucide-react";

export default function AturPassword() {
    const navigate = useAppNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false,
    });

    const [formData, setFormData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const toggleVisibility = (field) => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            alert("Password baru dan konfirmasi tidak cocok!");
            return;
        }

        try {
            setIsLoading(true);

            const response = await fetch("http://127.0.0.1:8000/api/update-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    old_password: formData.oldPassword,
                    new_password: formData.newPassword,
                    new_password_confirmation: formData.confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Gagal memperbarui password");
            }

            alert(data.message);

            navigate("/pos-mitra/profil");
        } catch (error) {
            console.error("Update password error:", error);
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PosMitraLayout>
            <div className="w-full max-w-screen-xl mx-auto px-4 py-6">
                {/* HEADER NAVIGATION */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-indigo-50 transition-colors group">
                        <ChevronLeft className="w-6 h-6 text-indigo-900 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Atur Password</h1>
                        <p className="text-sm text-gray-400 font-medium">Perbarui kata sandi untuk keamanan akun Anda</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* SISI KIRI: Security Info Card (4 Kolom) */}
                    <div className="lg:col-span-4 lg:sticky lg:top-6">
                        <div className="bg-indigo-900 rounded-[40px] p-10 text-center text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-white/10 rounded-3xl backdrop-blur-md flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl">
                                    <KeyRound size={48} className="text-purple-300" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight mb-3">Keamanan Akun</h2>
                                <p className="text-indigo-200 text-xs leading-relaxed font-medium px-4">Gunakan kombinasi huruf, angka, dan simbol untuk membuat password yang sangat kuat.</p>
                            </div>

                            {/* Dekorasi Ornamen */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                        </div>
                    </div>

                    {/* SISI KANAN: Form Password (8 Kolom) */}
                    <div className="lg:col-span-8">
                        <form onSubmit={handleUpdatePassword} className="bg-white rounded-[40px] p-8 md:p-10 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-10">Ubah Kata Sandi</h3>

                            <div className="space-y-8">
                                {/* Password Lama */}
                                <div className="group relative">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                                        <Lock size={14} /> Password Saat Ini
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.old ? "text" : "password"}
                                            value={formData.oldPassword}
                                            onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
                                            placeholder="Masukkan Password Lama"
                                            className="w-full pl-5 pr-12 py-3.5 text-[11px] tracking-wide bg-gray-50 border border-transparent rounded-[24px] text-gray-700 font-bold focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                                        />
                                        <button type="button" onClick={() => toggleVisibility("old")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                            {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Password Baru */}
                                    <div className="group relative">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                                            <KeyRound size={14} /> Password Baru
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.new ? "text" : "password"}
                                                value={formData.newPassword}
                                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                                placeholder="Masukkan Password Baru"
                                                className="w-full pl-5 pr-12 py-3.5 text-[11px] tracking-wide bg-gray-50 border border-transparent rounded-[24px] text-gray-700 font-bold focus:bg-white focus:border-indigo-100 outline-none transition-all"
                                            />
                                            <button type="button" onClick={() => toggleVisibility("new")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Konfirmasi Password */}
                                    <div className="group relative">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                                            <ShieldCheck size={14} /> Konfirmasi
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.confirm ? "text" : "password"}
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                placeholder="Konfirmasi Password Baru"
                                                className="w-full pl-5 pr-12 py-3.5 text-[11px] tracking-wide bg-gray-50 border border-transparent rounded-[24px] text-gray-700 font-bold focus:bg-white focus:border-indigo-100 outline-none transition-all"
                                            />
                                            <button type="button" onClick={() => toggleVisibility("confirm")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tombol Aksi */}
                            <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full sm:w-auto flex-1 bg-indigo-900 text-white px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-800 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    {isLoading ? (
                                        "Menyimpan..."
                                    ) : (
                                        <>
                                            <Save size={18} /> Simpan Kata Sandi
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="w-full sm:w-auto flex-1 bg-gray-50 text-gray-400 px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest border border-gray-100 hover:bg-gray-100 hover:text-gray-600 transition-all flex items-center justify-center gap-3"
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </PosMitraLayout>
    );
}