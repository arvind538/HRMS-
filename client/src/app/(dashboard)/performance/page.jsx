// src/app/(dashboard)/performance/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import {
    Loader2,
    Target,
    ClipboardCheck,
    TrendingUp,
    Award,
    RefreshCw,
    Sparkles,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    ShieldCheck
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function PerformanceDashboardPage() {
    const [goals, setGoals] = useState([]);
    const [appraisals, setAppraisals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [goalsRes, apprRes] = await Promise.all([
                api.get("/performance/goals"),
                api.get("/performance/appraisals")
            ]);

            const extractedGoals = Array.isArray(goalsRes?.data)
                ? goalsRes.data
                : Array.isArray(goalsRes?.data?.data)
                    ? goalsRes.data.data
                    : Array.isArray(goalsRes?.data?.goals)
                        ? goalsRes.data.goals
                        : [];

            const extractedAppraisals = Array.isArray(apprRes?.data)
                ? apprRes.data
                : Array.isArray(apprRes?.data?.data)
                    ? apprRes.data.data
                    : Array.isArray(apprRes?.data?.appraisals)
                        ? apprRes.data.appraisals
                        : [];

            setGoals(extractedGoals);
            setAppraisals(extractedAppraisals);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
            toast.error("Failed to load dashboard metrics. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
                        <Loader2 className="animate-spin text-indigo-600" size={28} />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-slate-800 tracking-tight">Loading Performance Analytics</p>
                    <p className="text-xs text-slate-400 mt-0.5">Synthesizing real-time review cycles...</p>
                </div>
            </div>
        );
    }

    // Safe Calculations
    const completedGoals = goals.filter((g) => g.status?.toLowerCase() === "completed").length;
    const pendingAppraisals = appraisals.filter((a) => a.status?.toLowerCase() !== "completed").length;

    const validRatings = appraisals.filter((a) => typeof a.rating === 'number' && !isNaN(a.rating));
    const avgRating = validRatings.length > 0
        ? validRatings.reduce((sum, a) => sum + a.rating, 0) / validRatings.length
        : 0;

    const promotionsRecommended = appraisals.filter((a) => Boolean(a.promotionRecommended)).length;
    const goalCompletionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 font-sans antialiased text-slate-900">

            {/* 1. Header Section - Clean White Background */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-md">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Performance Command Center
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                            <Sparkles size={12} className="text-indigo-500" /> HR Intelligence
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Monitor organizational key result areas, oversee appraisal progress cycles, and review talent advancement metrics seamlessly.
                    </p>
                </div>

                <button
                    onClick={fetchDashboardData}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer active:scale-95 self-start sm:self-auto"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
                    <span>Sync Analytics</span>
                </button>
            </div>

            {/* 2. Metrics Cards Grid with High-End Hover Effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Card 1: Goals Completed */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                <Target size={20} />
                            </div>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono">
                                {goalCompletionRate}% Rate
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Goals Completed</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                {completedGoals}
                            </h3>
                            <span className="text-xs text-slate-400 font-semibold">/ {goals.length} total</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Active Target Benchmarks</span>
                        <CheckCircle2 size={13} className="text-indigo-500" />
                    </div>
                </div>

                {/* Card 2: Pending Appraisals */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                <ClipboardCheck size={20} />
                            </div>
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                                Action Needed
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Appraisals</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                {pendingAppraisals}
                            </h3>
                            <span className="text-xs text-slate-400 font-semibold">reviews open</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Review Queue Status</span>
                        <Clock size={13} className="text-amber-500" />
                    </div>
                </div>

                {/* Card 3: Avg Rating */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                                Performance Index
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Rating</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                            </h3>
                            <span className="text-xs text-slate-400 font-semibold">/ 5.0 scale</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Company-wide Average</span>
                        <ShieldCheck size={13} className="text-emerald-500" />
                    </div>
                </div>

                {/* Card 4: Promotions */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                                <Award size={20} />
                            </div>
                            <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 font-mono">
                                Talent Upward
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promotions</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                {promotionsRecommended}
                            </h3>
                            <span className="text-xs text-slate-400 font-semibold">candidates</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Recommended Pipeline</span>
                        <ArrowUpRight size={13} className="text-violet-500" />
                    </div>
                </div>

            </div>

            {/* 3. Recent Goals Section */}
            <div className="bg-white p-6 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Organizational Goals</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Live tracking progress updates for primary Key Result Areas.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 font-mono">
                        Showing {Math.min(goals.length, 5)} of {goals.length}
                    </span>
                </div>

                {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2.5 shadow-xs">
                            <Target size={20} />
                        </div>
                        <p className="text-xs text-slate-800 font-bold">No goals created yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">Establish team key performance targets to track execution efficiency.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {goals.slice(0, 5).map((g) => {
                            const progress = g.progress || 0;
                            const isComplete = progress === 100 || g.status?.toLowerCase() === "completed";

                            return (
                                <div
                                    key={g._id || g.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/60 hover:bg-indigo-50/30 rounded-xl border border-slate-200/60 hover:border-indigo-200 transition-all duration-200 gap-4 group"
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs transition-colors ${isComplete ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                            }`}>
                                            {isComplete ? <CheckCircle2 size={16} /> : <Target size={16} />}
                                        </div>
                                        <div className="truncate">
                                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs sm:text-sm truncate">
                                                {g.title || "Untitled Goal"}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                <span>Assigned to:</span>
                                                <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                    {g.employee?.name || g.employeeName || 'Unknown Employee'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3.5 w-full sm:w-56 shrink-0">
                                        <div className="flex-1 h-2.5 bg-slate-200/80 rounded-full overflow-hidden shadow-inner p-0.5">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{
                                                    width: `${progress}%`,
                                                    backgroundColor: isComplete ? '#10b981' : '#4f46e5'
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-black text-slate-800 min-w-[3.5ch] text-right font-mono">
                                            {progress}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}