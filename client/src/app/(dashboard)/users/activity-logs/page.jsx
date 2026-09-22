"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Activity, Search, Clock, Filter, Terminal, RefreshCw, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

const MODULES = ["Employee", "Attendance", "Leave", "Payroll", "Recruitment", "Settings", "Users"];

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users/activity-logs", {
        params: moduleFilter ? { module: moduleFilter } : {},
      });
      // Ensure data is parsed properly whether it's an array or an object wrapper (e.g. { success: true, data: [...] })
      const logArray = Array.isArray(data) ? data : data?.logs || data?.data || [];
      setLogs(logArray);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to retrieve system activity audit logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Local filtering based on search text input
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.user?.name?.toLowerCase().includes(query) ||
        log.user?.email?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.module?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  // Analytical stats
  const stats = useMemo(() => {
    const total = logs.length;
    const uniqueModules = new Set(logs.map((l) => l.module).filter(Boolean)).size;
    return { total, uniqueModules };
  }, [logs]);

  // Dynamic module badge styling
  const getModuleBadgeVariant = (module) => {
    switch (module?.toLowerCase()) {
      case "employee": return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "payroll": return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "attendance": return "bg-sky-50 text-sky-700 border-sky-200/80";
      case "leave": return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "users": return "bg-purple-50 text-purple-700 border-purple-200/80";
      default: return "bg-slate-100 text-slate-700 border-slate-200/80";
    }
  };

  const columns = [
    {
      key: "user",
      label: "Operator Profile",
      render: (r) => (
        <div className="flex items-center gap-3 py-1.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 flex items-center justify-center text-white font-bold text-xs shadow-2xs uppercase tracking-wider">
            {r.user?.name ? r.user.name.charAt(0) : "S"}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 text-sm tracking-tight">{r.user?.name || "System Automation"}</span>
            <span className="text-xs text-slate-400 font-normal">{r.user?.email || "internal.service@system"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      label: "Audit Action",
      render: (r) => (
        <span className="text-xs font-semibold text-slate-800 font-mono bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg">
          {r.action || "Performed system operation"}
        </span>
      ),
    },
    {
      key: "module",
      label: "Target Module",
      render: (r) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${getModuleBadgeVariant(r.module)}`}>
          {r.module || "General"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Execution Timestamp",
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock size={13} className="text-slate-400 shrink-0" />
          <span>
            {r.createdAt
              ? new Date(r.createdAt).toLocaleString("en-US", {
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
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4">
      {/* Header Banner & Analytical Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Terminal size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              System Activity Audit Logs
            </h1>
          </div>
          <p className="text-sm text-slate-500 pl-1">
            Real-time immutable activity telemetry tracking administrative modifications and operational events.
          </p>
        </div>

        {/* Analytical Cards */}
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-2 gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div className="bg-slate-50/85 px-4 py-2.5 rounded-xl border border-slate-100 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Logs</span>
              <span className="text-lg font-extrabold text-slate-800 font-mono">{stats.total}</span>
            </div>
            <div className="bg-indigo-50/50 px-4 py-2.5 rounded-xl border border-indigo-100/60 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">Active Modules</span>
              <span className="text-lg font-extrabold text-indigo-700 font-mono">{stats.uniqueModules}</span>
            </div>
          </div>
          <button
            onClick={fetchData}
            title="Refresh logs"
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer"
          >
            <RefreshCw size={16} className={`${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Styled Search & Module Options Filtering Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit actions, operators, or modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl font-medium text-slate-700 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        {/* Styled Options Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer appearance-none"
            >
              <option value="">All Functional Modules</option>
              {MODULES.map((m) => (
                <option key={m} value={m}>{m} Module</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm font-medium text-slate-500">Synchronizing system telemetry logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Activity size={22} />
            </div>
            <div className="max-w-md mx-auto">
              <p className="text-sm font-bold text-slate-800">No activity logs recorded yet</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {logs.length === 0
                  ? "No telemetry records were returned by your backend endpoint (/users/activity-logs). Verify that your database is saving logs on actions."
                  : "No audit logs match your search query or selected module filter option."}
              </p>
            </div>
          </div>
        ) : (
          <Table columns={columns} data={filteredLogs} />
        )}
      </div>
    </div>
  );
}