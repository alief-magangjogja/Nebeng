import React, { useState, useEffect, useCallback } from "react";
import useAppNavigate from "../../hooks/useAppNavigate";
import MitraLayout from "../../components/dashboard/MitraLayout";
import { ChevronLeft, Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, Search } from "lucide-react";
import axios from "../../api/axios";

export default function RiwayatSaldo() {
    const navigate = useAppNavigate();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("Semua");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [balanceRes, historyRes] = await Promise.all([axios.get("/balance"), axios.get("/balance/history")]);

            setBalance(balanceRes.data.balance || 0);
            setTransactions(historyRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = transactions
        .filter((t) => (filterType === "Semua" ? true : t.type === filterType))
        .filter((t) => (search ? (t.description || "").toLowerCase().includes(search.toLowerCase()) : true));

    return (
        <MitraLayout>
            <div className="w-full max-w-4xl mx-auto px-4 py-6">
                {/* HEADER */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50">
                        <ChevronLeft size={24} className="text-indigo-900" />
                    </button>
                    <h1 className="text-2xl font-black text-indigo-900 tracking-tight">Riwayat Pendapatan</h1>
                </div>

                {/* PENDAPATAN CARD */}
                <div className="bg-indigo-900 rounded-4xl p-8 mb-8 shadow-xl shadow-indigo-100 text-white">
                    <div className="flex items-center gap-3 mb-2 opacity-70">
                        <Wallet size={18} />
                        <p className="text-xs font-black uppercase tracking-widest">Total Pendapatan Saat Ini</p>
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter">Rp {Number(balance).toLocaleString("id-ID")}</h2>
                </div>

                {/* FILTER */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari transaksi..."
                            className="pl-12 pr-6 py-3 w-full bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex gap-2">
                        {["Semua", "credit", "debit"].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                                    filterType === type ? "bg-indigo-900 text-white shadow-lg shadow-indigo-100" : "bg-white border border-gray-100 text-gray-400 hover:bg-gray-50"
                                }`}
                            >
                                {type === "credit" ? "Masuk" : type === "debit" ? "Keluar" : "Semua"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* LIST TRANSAKSI */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="py-20 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                            <Loader2 size={40} className="mx-auto text-indigo-300 animate-spin mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Memuat riwayat pendapatan...</p>
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map((trx) => {
                            const isCredit = trx.type === "credit";
                            // Mengganti kata "saldo" dari deskripsi backend menjadi "pendapatan" secara otomatis
                            const cleanDescription = (trx.description || (isCredit ? "Pendapatan Masuk" : "Pengeluaran Pendapatan")).replace(/saldo/gi, "pendapatan");

                            return (
                                <div key={trx.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div
                                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                                isCredit ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                                            }`}
                                        >
                                            {isCredit ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-gray-800 truncate">{cleanDescription}</p>
                                            <p className="text-[11px] text-gray-400 font-medium">
                                                {new Date(trx.created_at).toLocaleDateString("id-ID", {
                                                    day: "2-digit",
                                                    month: "long",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-black shrink-0 ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                                        {isCredit ? "+" : "-"}Rp {Number(trx.amount).toLocaleString("id-ID")}
                                    </p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                            <Wallet size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Belum ada riwayat transaksi pendapatan</p>
                        </div>
                    )}
                </div>
            </div>
        </MitraLayout>
    );
}