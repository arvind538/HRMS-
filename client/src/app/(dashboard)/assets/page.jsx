"use client";
import { useEffect, useState } from "react";
import {
    Loader2,
    Package,
    CheckCircle2,
    Wrench,
    XCircle,
    PlusCircle,
    Layers,
    ArrowUpRight,
    ShieldCheck,
    Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function AssetDashboardPage() {
    const router = useRouter();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/assets")
            .then(({ data }) => {
                const assetList = Array.isArray(data) ? data : (data?.data || data?.assets || []);
                setAssets(assetList);
            })
            .catch(() => toast.error("Failed to load dashboard data from server."))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col min-h-[60vh] items-center justify-center space-y-3">
                <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
                <p className="text-xs text-slate-400 font-medium tracking-wide">Loading asset dashboard...</p>
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

    const recentAssets = [...assets].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Package size={22} />
                        </div>
                        Asset Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Summary of company asset allocations, availability, and active maintenance.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => router.push("/assets/all")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all duration-200"
                    >
                        <PlusCircle size={15} /> Manage Assets
                    </button>
                </div>
            </div>

            {/* Metrics Grid Cards with Smooth Hover Effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Assets */}
                <div className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Assets</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{assets.length}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 mt-2">
                            <Activity size={12} /> Live Inventory
                        </span>
                    </div>
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <Package size={24} />
                    </div>
                </div>

                {/* Available */}
                <div className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Available</p>
                        <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{available}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-2">
                            <CheckCircle2 size={12} /> Ready to assign
                        </span>
                    </div>
                    <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <ShieldCheck size={24} />
                    </div>
                </div>

                {/* Assigned */}
                <div className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Assigned</p>
                        <h3 className="text-3xl font-extrabold text-violet-600 mt-1">{assigned}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 mt-2">
                            <Layers size={12} /> In active use
                        </span>
                    </div>
                    <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <XCircle size={24} />
                    </div>
                </div>

                {/* Under Maintenance */}
                <div className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Under Maintenance</p>
                        <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{maintenance}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 mt-2">
                            <Wrench size={12} /> Repair required
                        </span>
                    </div>
                    <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <Wrench size={24} />
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Category Distribution & Recent Assets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Category-wise Distribution Section */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            <Layers size={18} className="text-indigo-600" /> Category-wise Distribution
                        </h3>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {Object.keys(byCategory).length} Categories
                        </span>
                    </div>

                    {Object.keys(byCategory).length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-xs text-slate-400 font-medium">No assets available found in the system.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 my-auto">
                            {Object.entries(byCategory).map(([cat, count]) => {
                                const percentage = Math.round((count / Math.max(assets.length, 1)) * 100);
                                return (
                                    <div key={cat} className="space-y-1.5 group">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-slate-700 capitalize">{cat}</span>
                                            <span className="text-slate-500">{count} items <span className="text-slate-400 font-medium">({percentage}%)</span></span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-violet-700 shadow-xs"
                                                style={{ width: `${(count / maxCat) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Assets Quick Stream */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 text-base">Recent Inventory</h3>
                        <button
                            onClick={() => router.push("/assets/all")}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                        >
                            View all <ArrowUpRight size={13} />
                        </button>
                    </div>

                    {recentAssets.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 font-medium">
                            No recent assets recorded.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentAssets.map((item) => (
                                <div key={item._id || item.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between transition-all hover:bg-indigo-50/40">
                                    <div className="space-y-0.5 truncate pr-2">
                                        <h4 className="text-xs font-bold text-slate-800 truncate">{item.name || item.assetName || "Unnamed Asset"}</h4>
                                        <p className="text-[11px] text-slate-500 capitalize">{item.category || "General"} • #{item.serialNumber || item.tag || "N/A"}</p>
                                    </div>
                                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0 ${item.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                        item.status === 'assigned' ? 'bg-violet-50 text-violet-700 border border-violet-200' :
                                            'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                        {item.status || "available"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}