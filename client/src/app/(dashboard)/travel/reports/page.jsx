"use client";
import { useEffect, useState } from "react";
import { Loader2, Plane, Wallet, CheckCircle2, TrendingUp, BarChart3, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function TravelReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [travels, setTravels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role check: Restrict standard employee role
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  useEffect(() => {
    if (isEmployee) {
      setLoading(false);
      return;
    }

    api.get("/travel")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.data || data?.travels || []);
        setTravels(list);
      })
      .catch((err) => {
        console.error("Reports fetch error:", err);
        toast.error("Reports load nahi hue. Dobara koshish karein.");
      })
      .finally(() => setLoading(false));
  }, [isEmployee]);

  // 🚫 Access Denied View for regular Employees (Aapke image ke mutabiq)[cite: 5]
  if (isEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          Your role (<span className="capitalize font-semibold text-slate-700">{user?.role || "Employee"}</span>) does not have permission to access this page.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all duration-200"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        <div className="space-y-2">
          <div className="h-7 bg-slate-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-72 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  const totalEstimated = travels.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const totalActual = travels.filter((t) => t.actualCost).reduce((sum, t) => sum + t.actualCost, 0);
  const completedCount = travels.filter((t) => t.status === "completed").length;

  const byMode = travels.reduce((acc, t) => {
    if (t.modeOfTravel) {
      const modeKey = t.modeOfTravel.trim().toLowerCase();
      acc[modeKey] = (acc[modeKey] || 0) + 1;
    }
    return acc;
  }, {});

  const maxMode = Math.max(...Object.values(byMode), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 size={22} />
            </div>
            Travel Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">Company-wide travel spend, analytics aur trends ka overview</p>
        </div>
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold self-start sm:self-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Live Analytics
        </span>
      </div>

      {/* Stats Overview Cards with Smooth Hover */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Trips */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <Plane size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Trips</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{travels.length}</h3>
          </div>
        </div>

        {/* Completed Trips */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-300 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Completed Trips</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{completedCount}</h3>
          </div>
        </div>

        {/* Actual Spend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-300 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Actual Spend</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">₹{totalActual.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimated vs Actual Summary Banner */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-indigo-300 bg-white/10 px-3 py-1 rounded-lg">Budget Overview</span>
            <div className="p-2.5 bg-white/10 rounded-xl text-indigo-200 shadow-inner">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Estimated Budget:</span>
              <span className="font-bold text-white">₹{totalEstimated.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Actual Expenses:</span>
              <span className="font-bold text-emerald-400">₹{totalActual.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 border-t border-white/10 pt-4 leading-relaxed">
            Company-wide projected travel costs versus actual expenditure tracking matrix.
          </p>
        </div>

        {/* Mode of Travel Distribution Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-base">Mode of Travel Distribution</h3>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">{Object.keys(byMode).length} Transport Modes</span>
            </div>
          </div>

          {Object.keys(byMode).length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-medium">
              Koi travel mode data available nahi hai
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              {Object.entries(byMode).map(([mode, count]) => {
                const percentage = Math.round((count / Math.max(travels.length, 1)) * 100);
                return (
                  <div key={mode} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 capitalize">{mode}</span>
                      <span className="text-slate-500">{count} trips <span className="text-slate-400 font-medium">({percentage}%)</span></span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500 shadow-xs"
                        style={{ width: `${(count / maxMode) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
