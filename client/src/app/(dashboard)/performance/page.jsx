// src/app/(dashboard)/performance/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Target, ClipboardCheck, TrendingUp, Award, ArrowRight, RefreshCw } from "lucide-react";
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

            // Safe extraction supporting different backend response wrappers
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
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-sm text-slate-500 font-medium animate-pulse">Loading dashboard overview...</p>
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Performance Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track employee goals, appraisals, and overall performance metrics seamlessly.
                    </p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer active:scale-95 w-full sm:w-auto"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
                    <span>Refresh Metrics</span>
                </button>
            </div>

            {/* Metrics Cards Grid with Enhanced Hover Effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Goals Completed */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <Target size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Goals Completed</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">
                                {completedGoals}<span className="text-base text-slate-400 font-medium">/{goals.length}</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Card 2: Pending Appraisals */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Pending Appraisals</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{pendingAppraisals}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 3: Avg Rating */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg Rating</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">
                                {avgRating > 0 ? avgRating.toFixed(1) : "—"}<span className="text-base text-slate-400 font-medium">/5</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Card 4: Promotions */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-violet-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <Award size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Promotions</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{promotionsRecommended}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Goals Section */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Recent Goals</h3>
                </div>

                {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                        <Target className="text-slate-400 mb-3" size={40} />
                        <p className="text-sm text-slate-700 font-semibold">No goals created yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Create new performance goals to track team progress.</p>
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {goals.slice(0, 5).map((g) => (
                            <div
                                key={g._id || g.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 hover:bg-indigo-50/30 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all gap-4 group"
                            >
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                        {g.title || "Untitled Goal"}
                                    </h4>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                                        Assigned to: <span className="text-slate-700">{g.employee?.name || g.employeeName || 'Unknown Employee'}</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 w-full sm:w-56">
                                    <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${g.progress || 0}%`,
                                                backgroundColor: (g.progress || 0) === 100 ? '#10b981' : '#4f46e5'
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 min-w-[3.5ch] text-right">
                                        {g.progress || 0}%
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