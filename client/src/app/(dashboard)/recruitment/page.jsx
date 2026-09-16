"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Briefcase,
    Plus,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Sparkles,
    ArrowUpRight,
    Building2
} from "lucide-react";
import api from "@/lib/api";

export default function RecruitmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [positions, setPositions] = useState([]);
    const [filterStatus, setFilterStatus] = useState("all");

    const fetchPositions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/recruitment/positions");
            setPositions(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching recruitment positions:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPositions();
    }, [fetchPositions]);

    const filteredPositions = positions.filter((pos) => {
        if (filterStatus === "all") return true;
        return pos.status === filterStatus;
    });

    const openCount = positions.filter((p) => p.status === "open").length;
    const closedCount = positions.filter((p) => p.status === "closed").length;

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Loading Recruitment Data...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-2 space-y-6 antialiased">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Recruitment & Talent Hub
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                            <Sparkles size={12} /> Active Hiring
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                        Manage job openings, applicant pipelines, interviews, and offer letters seamlessly.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        onClick={() => fetchPositions()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                    onClick={() => setFilterStatus("all")}
                    className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer group ${filterStatus === 'all' ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200/80 hover:shadow-lg'}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                            <Briefcase size={22} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{positions.length}</h3>
                        <p className="text-xs font-bold text-slate-600 mt-1">Total Positions</p>
                    </div>
                </div>

                <div
                    onClick={() => setFilterStatus("open")}
                    className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer group ${filterStatus === 'open' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' : 'border-slate-200/80 hover:shadow-lg'}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={22} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{openCount}</h3>
                        <p className="text-xs font-bold text-slate-600 mt-1">Open Positions</p>
                    </div>
                </div>

                <div
                    onClick={() => setFilterStatus("closed")}
                    className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer group ${filterStatus === 'closed' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' : 'border-slate-200/80 hover:shadow-lg'}`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                            <Clock size={22} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Archive</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-slate-900 font-mono">{closedCount}</h3>
                        <p className="text-xs font-bold text-slate-600 mt-1">Closed Positions</p>
                    </div>
                </div>
            </div>

            {/* Positions List Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">
                            Job Requisitions Pipeline
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Showing {filteredPositions.length} recruitment campaigns
                        </p>
                    </div>
                </div>

                {filteredPositions.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                        <Briefcase size={36} className="mx-auto text-slate-300 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-600">No recruitment positions found</p>
                        <p className="text-[11px] text-slate-400">
                            Create new job positions from your backend to view them here.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPositions.map((pos) => (
                            <div
                                key={pos._id || pos.id}
                                className="flex flex-col justify-between p-5 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/30 border border-slate-200/70 hover:border-indigo-300 transition-all group shadow-2xs hover:shadow-md"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {pos.title || pos.positionName || "Untitled Role"}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${pos.status === "open"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                            }`}>
                                            {pos.status || "Open"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">
                                        {pos.description || "No description provided for this opening."}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/60 text-xs">
                                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                                        <Building2 size={13} className="text-slate-400" />
                                        {pos.department?.name || pos.department || "General Division"}
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                        {pos.vacancies || 1} Openings
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}