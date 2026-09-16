"use client";
import { useEffect, useState } from "react";
import { Loader2, Package, CheckCircle2, Wrench, XCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function AssetDashboardPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/assets")
            .then(({ data }) => setAssets(Array.isArray(data) ? data : []))
            .catch(() => toast.error("Failed to load dashboard data from server."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const available = assets.filter((a) => a.status === "available").length;
    const assigned = assets.filter((a) => a.status === "assigned").length;
    const maintenance = assets.filter((a) => a.status === "maintenance").length;

    const byCategory = assets.reduce((acc, a) => {
        const cat = a.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
    const maxCat = Math.max(...Object.values(byCategory), 1);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Asset Dashboard</h1>
                <p className="text-xs text-slate-500 mt-1">Summary of company asset allocations, availability, and maintenance.</p>
            </div>

            {/* Metrics Grid Cards with Smooth Hover Effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-200 group-hover:scale-110">
                        <Package size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Assets</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{assets.length}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Available</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{available}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-md flex items-center gap-4">
                    <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                        <XCircle size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Assigned</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{assigned}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Wrench size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Under Maintenance</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{maintenance}</h3>
                    </div>
                </div>
            </div>

            {/* Category-wise Distribution Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Category-wise Distribution</h3>

                {Object.keys(byCategory).length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-xs text-slate-400">No assets available found in the system.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(byCategory).map(([cat, count]) => (
                            <div key={cat} className="flex items-center gap-4 text-sm group">
                                <span className="w-32 text-slate-700 font-medium capitalize truncate">{cat}</span>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-indigo-700"
                                        style={{ width: `${(count / maxCat) * 100}%` }}
                                    />
                                </div>
                                <span className="w-8 text-right font-bold text-slate-800">{count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}