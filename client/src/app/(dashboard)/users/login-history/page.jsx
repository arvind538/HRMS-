"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, LogIn, Search, ShieldCheck, Globe, Clock, UserCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

export default function LoginHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api.get("/users/login-history")
      .then(({ data }) => setHistory(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to retrieve login activity history."))
      .finally(() => setLoading(false));
  }, []);

  // Filter login logs based on search query (User name, email, or IP address)
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(
      (item) =>
        item.user?.name?.toLowerCase().includes(query) ||
        item.user?.email?.toLowerCase().includes(query) ||
        item.ipAddress?.toLowerCase().includes(query)
    );
  }, [history, searchQuery]);

  // Analytical stats calculation
  const stats = useMemo(() => {
    const total = history.length;
    const uniqueUsers = new Set(history.map((h) => h.user?._id).filter(Boolean)).size;
    return { total, uniqueUsers };
  }, [history]);

  const columns = [
    {
      key: "user",
      label: "User Profile",
      render: (r) => (
        <div className="flex items-center gap-3 py-1.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xs shadow-2xs uppercase">
            {r.user?.name ? r.user.name.charAt(0) : "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 text-sm tracking-tight">{r.user?.name || "Unknown User"}</span>
            <span className="text-xs text-slate-400 font-normal">{r.user?.email || "No email recorded"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "loginAt",
      label: "Timestamp",
      render: (r) => (
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Clock size={13} className="text-slate-400 shrink-0" />
          <span>
            {r.loginAt
              ? new Date(r.loginAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
              : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "ipAddress",
      label: "Client IP Address",
      render: (r) => (
        <div className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-slate-700 shadow-2xs">
          <Globe size={12} className="text-indigo-500" />
          <span>{r.ipAddress || "127.0.0.1 (Local)"}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Session Verification",
      render: () => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>Authenticated</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-3 py-3">
      {/* Header Banner & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <LogIn size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Authentication Login History
            </h1>
          </div>
          <p className="text-sm text-slate-500 pl-1">
            Audit trail monitoring system access attempts, client IP addresses, and secure sign-in sessions.
          </p>
        </div>

        {/* Analytical Metric Cards */}
        <div className="grid grid-cols-2 gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="bg-slate-50/80 px-4 py-2.5 rounded-xl border border-slate-100 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Logs</span>
            <span className="text-lg font-extrabold text-slate-800 font-mono">{stats.total}</span>
          </div>
          <div className="bg-indigo-50/50 px-4 py-2.5 rounded-xl border border-indigo-100/60 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">Active Users</span>
            <span className="text-lg font-extrabold text-indigo-700 font-mono">{stats.uniqueUsers}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by user name, email, or IP address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl font-medium text-slate-700 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>
        <div className="text-xs font-semibold text-slate-400 hidden sm:block pr-2">
          Showing {filteredHistory.length} of {history.length} Entries
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm font-medium text-slate-500">Retrieving authentication records...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <LogIn size={22} />
            </div>
            <div className="max-w-sm mx-auto">
              <p className="text-sm font-bold text-slate-800">No login history records found</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {history.length === 0
                  ? "No login logs are currently registered in the database backend. Ensure session creation events trigger the login-history middleware."
                  : "No logs match your current search query criteria."}
              </p>
            </div>
          </div>
        ) : (
          <Table columns={columns} data={filteredHistory} />
        )}
      </div>
    </div>
  );
}