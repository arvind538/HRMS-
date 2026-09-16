"use client";

import { useState, useMemo } from "react";
import { modulePermissions } from "@/data/permissions";
import { CheckCircle2, XCircle, ShieldCheck, Search, Lock, KeyRound } from "lucide-react";

const ROLES = ["admin", "hr", "manager", "employee"];

const ROLE_CONFIG = {
  admin: { label: "Administrator", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  hr: { label: "HR Specialist", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  manager: { label: "Team Manager", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  employee: { label: "Staff Member", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const MODULE_LABELS = {
  dashboard: "Dashboard", employees: "Employee Management", organization: "Organization",
  recruitment: "Recruitment", attendance: "Attendance", leave: "Leave Management",
  payroll: "Payroll", performance: "Performance", training: "Training & Development",
  expenses: "Expenses", travel: "Travel", assets: "Assets", documents: "Documents",
  communication: "Communication", shifts: "Shift Management", compliance: "Compliance",
  reports: "Reports", settings: "Settings", users: "User & Access Management",
};

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return Object.entries(MODULE_LABELS);
    const query = searchQuery.toLowerCase();
    return Object.entries(MODULE_LABELS).filter(
      ([key, label]) =>
        label.toLowerCase().includes(query) || key.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <KeyRound size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Module Access Permissions
            </h1>
          </div>
          <p className="text-sm text-slate-500 pl-1">
            Comprehensive breakdown of authorization matrices defining role-based access rights across system modules.
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
          <span className="flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 size={14} /> Allowed</span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 font-semibold text-rose-700"><XCircle size={14} /> Restricted</span>
        </div>
      </div>

      {/* Search Bar Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search modules (e.g., Payroll, Leave, Attendance)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl font-medium text-slate-700 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>
        <div className="text-xs font-semibold text-slate-400 hidden sm:block pr-2">
          Showing {filteredModules.length} of {Object.keys(MODULE_LABELS).length} Modules
        </div>
      </div>

      {/* Matrix Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4.5 w-1/3">System Module</th>
                {ROLES.map((r) => {
                  const cfg = ROLE_CONFIG[r] || { label: r, badge: "bg-slate-100 text-slate-700 border-slate-200" };
                  return (
                    <th key={r} className="px-4 py-4.5 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg border font-bold text-xs tracking-wide shadow-2xs ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredModules.length > 0 ? (
                filteredModules.map(([key, label], index) => {
                  const allowed = modulePermissions[key] || [];
                  return (
                    <tr
                      key={key}
                      className="group hover:bg-indigo-50/30 transition-all duration-150"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-800 group-hover:text-indigo-950 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-600 transition-colors"></span>
                          {label}
                        </div>
                      </td>
                      {ROLES.map((r) => {
                        const isAllowed = allowed.includes(r);
                        return (
                          <td key={r} className="px-4 py-4 text-center">
                            {isAllowed ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs group-hover:scale-110 transition-transform">
                                <CheckCircle2 size={16} className="text-emerald-600 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50/60 border border-rose-200/70 shadow-2xs">
                                <XCircle size={16} className="text-rose-500/80 stroke-[2.5]" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={ROLES.length + 1} className="py-16 text-center text-slate-400 text-sm font-medium">
                    No modules found matching your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}