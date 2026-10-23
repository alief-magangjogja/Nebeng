import React, { useEffect, useState } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, CheckCircle2, FileText, Eye, Loader2, Lock } from "lucide-react";
import api from "../../api/axios";

const API_ORIGIN = "http://127.0.0.1:8000";

const DOC_LABELS = {
    ktp: "KTP",
    sim: "SIM",
    skck: "SKCK",
};

export default function Dokumen() {
    const navigate = useAppNavigate();
    const [previewImage, setPreviewImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verification, setVerification] = useState(null);

    const fetchData = async () => {
        try {
            const verifRes = await api.get("/verification/status");
            setVerification(verifRes.data || null);
        } catch (err) {
            console.error("Gagal ambil data dokumen:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const documents = ["ktp", "sim", "skck"].map((type) => {
        const file = verification?.files?.find((f) => f.file_type === type);

        return {
            id: type,
            label: DOC_LABELS[type],
            uploaded: !!file,
            image: file ? `${API_ORIGIN}/storage/${file.file_path}` : null,
        };
    });

    return (
        <MitraLayout>
            <div className="w-full max-w-3xl mx-auto px-4 py-6">
                {/* HEADER NAVIGATION */}
                <div className="flex items-center gap-4 mb-10">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                        <ChevronLeft size={24} className="text-indigo-900" />
                    </button>
                    <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Dokumen</h1>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-indigo-900">
                        <Loader2 size={28} className="animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white rounded-[40px] p-2 md:p-8 shadow-sm border border-gray-50">
                        <div className="divide-y divide-gray-100">
                            {documents.map((doc) => (
                                <div key={doc.id} className="py-8 first:pt-4 last:pb-4 flex items-center justify-between gap-4 group">
                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                        {/* Thumbnail Image */}
                                        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-gray-100 shadow-sm shrink-0 bg-gray-50 flex items-center justify-center">
                                            {doc.image ? (
                                                <>
                                                    <img src={doc.image} alt={doc.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <button onClick={() => setPreviewImage(doc.image)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                        <Eye size={20} />
                                                    </button>
                                                </>
                                            ) : (
                                                <FileText size={28} className="text-gray-300" />
                                            )}
                                        </div>

                                        {/* Info Dokumen */}
                                        <div className="min-w-0">
                                            <h3 className="text-lg md:text-xl font-black text-gray-800 mb-1">{doc.label}</h3>
                                            {doc.uploaded ? (
                                                <div className="flex items-center gap-1.5 text-emerald-500">
                                                    <span className="text-xs md:text-sm font-bold">Terverifikasi & Dikunci</span>
                                                    <CheckCircle2 size={14} className="shrink-0" />
                                                </div>
                                            ) : (
                                                <span className="text-xs md:text-sm font-bold text-gray-400">Belum tersedia</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Badge Pengganti Tombol (Locked) */}
                                    <div className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-400 rounded-full font-bold text-xs md:text-sm flex items-center gap-1.5 shrink-0 select-none cursor-not-allowed">
                                        <Lock size={14} />
                                        <span>Permanen</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* KEAMANAN DATA FOOTER */}
                <div className="mt-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600">
                        <Lock size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">Proteksi Keamanan Mutlak</p>
                        <p className="text-[11px] text-indigo-400 font-medium leading-relaxed">
                            Demi menghindari celah kecurangan, pemalsuan data, atau pergantian identitas, seluruh dokumen yang telah diunggah bersifat permanen dan dikunci sistem. Hubungi administrator pusat jika terdapat kesalahan data mendesak.
                        </p>
                    </div>
                </div>
            </div>

            {/* LIGHTBOX PREVIEW MODAL */}
            {previewImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                        <X size={24} />
                    </button>
                    <img src={previewImage} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" alt="Preview Dokumen" />
                </div>
            )}
        </MitraLayout>
    );
}