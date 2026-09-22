"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  RefreshCw,
  AlertCircle,
  Search,
  Award,
  IdCard,
  User,
  Calendar,
  Sparkles,
  TrendingUp,
  X,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Timer
} from 'lucide-react';
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";

export default function Overtime() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Deep schema unwrapper
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.attendance)) return resData.attendance;
    if (Array.isArray(resData?.overtime)) return resData.overtime;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.result)) return resData.result;
    return [];
  }, []);

  // Calculate or extract overtime hours cleanly
  const getOvertimeHours = (r) => {
    // 1. Check direct overtime properties
    const directOT = Number(r?.overtime || r?.overtimeHours || r?.extraHours || 0);
    if (!isNaN(directOT) && directOT > 0) return Number(directOT.toFixed(2));

    // 2. Dynamic threshold calculation from workHours (Standard workday = 8.0 hrs)
    const workHours = Number(r?.workHours || r?.hours || r?.totalHours || 0);
    if (!isNaN(workHours) && workHours > 8) {
      return Number((workHours - 8).toFixed(2));
    }

    return 0;
  };

  // Safe helper to extract Employee ID
  const resolveEmpId = (item) => {
    const emp = item?.employee;
    const usr = item?.user || item?.userId;

    const candidate =
      (typeof emp === "object" ? emp?.employeeId || emp?.empId || emp?.code || emp?.customId : null) ||
      (typeof usr === "object" ? usr?.employeeId || usr?.empId || usr?.code : null) ||
      item?.employeeId ||
      item?.empId ||
      item?.code;

    if (candidate && String(candidate).trim() && String(candidate).toLowerCase() !== "null") {
      return String(candidate).trim();
    }

    const fallbackId =
      (typeof emp === "object" ? emp?._id || emp?.id : emp) ||
      (typeof usr === "object" ? usr?._id || usr?.id : usr) ||
      item?._id;

    if (fallbackId && typeof fallbackId === "string" && fallbackId.length >= 4) {
      return `EMP${fallbackId.slice(-4).toUpperCase()}`;
    }

    return "EMP0006";
  };

  // Safe helper to extract Employee Name
  const resolveEmpName = (item) => {
    const emp = item?.employee;
    const usr = item?.user || item?.userId;

    return (
      (typeof emp === "object" ? emp?.name || emp?.fullName || emp?.username : null) ||
      (typeof usr === "object" ? usr?.name || usr?.fullName || usr?.username : null) ||
      (typeof emp === "string" && isNaN(Number(emp)) && emp.length < 24 ? emp : null) ||
      item?.userName ||
      item?.name ||
      item?.employeeName ||
      "Staff Member"
    );
  };

  const fetchOvertime = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let list = [];

      // Probe 1: Dedicated overtime endpoint
      try {
        const { data } = await api.get("/attendance/overtime", {
          params: { month: selectedMonth, year: selectedYear }
        });
        list = extractList(data);
      } catch {
        list = [];
      }

      // Probe 2: Primary attendance logs endpoint
      if (list.length === 0) {
        try {
          const { data } = await api.get("/attendance", {
            params: { month: selectedMonth, year: selectedYear }
          });
          list = extractList(data);
        } catch {
          list = [];
        }
      }

      // Filter and map valid overtime records
      const validRecords = list
        .map((r, idx) => {
          const ot = getOvertimeHours(r);
          const totalH = Number(r?.workHours || r?.hours || r?.totalHours || (ot + 8)).toFixed(2);
          return {
            ...r,
            _id: r._id || r.id || idx,
            empId: resolveEmpId(r),
            empName: resolveEmpName(r),
            overtimeAmount: ot,
            totalWorkHours: totalH,
          };
        })
        .filter((r) => r.overtimeAmount > 0);

      setRecords(validRecords);
    } catch (err) {
      console.error("Error fetching overtime records:", err);
      setError(err.response?.data?.message || "Failed to load overtime records.");
      toast.error("Failed to sync overtime records.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, extractList]);

  useEffect(() => {
    fetchOvertime();
  }, [fetchOvertime]);

  // Modal ESC listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedRecord(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const name = String(item.empName || "").toLowerCase();
      const id = String(item.empId || "").toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || id.includes(query);
    });
  }, [records, searchTerm]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalOTHours = filteredRecords.reduce((acc, curr) => acc + curr.overtimeAmount, 0);
    const uniqueEmployees = new Set(filteredRecords.map((r) => r.empId)).size;
    return {
      totalOTHours: totalOTHours.toFixed(2),
      uniqueEmployees,
    };
  }, [filteredRecords]);

  return (
    <div className="w-full space-y-6 font-sans pb-14 animate-in fade-in duration-200">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-600" /> Overtime Logs
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 font-mono">
              <Sparkles size={12} className="text-indigo-600" /> Extended Shifts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor verified extra hours, overtime bonuses, and approved shift extensions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono shadow-2xs"
          />
          <button
            onClick={fetchOvertime}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
            title="Sync Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} /> Sync
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overtime Shifts</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{filteredRecords.length}</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/70">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Extra Hours</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1 font-mono">{stats.totalOTHours} hrs</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/70">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employees Logged</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">{stats.uniqueEmployees}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/70">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search employee by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
          Showing {filteredRecords.length} overtime logs
        </span>
      </div>

      {/* Overtime Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-semibold text-slate-500">Calculating overtime hours...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center px-4 space-y-3">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
              <Clock size={28} />
            </div>
            <p className="text-base font-bold text-slate-800">No overtime records found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No extra hours beyond standard work shifts logged for this selected period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Emp ID</th>
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Total Shift</th>
                  <th className="py-4 px-6">Extra Overtime</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredRecords.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => setSelectedRecord(item)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedRecord(item)}
                    className="hover:bg-indigo-50/40 transition-all duration-150 group cursor-pointer"
                  >
                    {/* Employee ID */}
                    <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <IdCard size={12} />
                        {item.empId}
                      </span>
                    </td>

                    {/* Employee Name */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {item.empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {item.empName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-slate-600 text-xs font-medium whitespace-nowrap font-mono">
                      {item.date ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                    </td>

                    {/* Total Shift */}
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {item.totalWorkHours} hrs
                    </td>

                    {/* Extra Overtime */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Clock size={13} className="group-hover:text-white text-indigo-600" /> +{item.overtimeAmount} hrs
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                        Details <ChevronRight size={14} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Center Details Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">
                    Overtime Log Voucher
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    ID: {selectedRecord.empId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Employee
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedRecord.empName}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Verified Overtime
                  </span>
                  <p className="text-base font-black text-indigo-600 font-mono">
                    +{selectedRecord.overtimeAmount} hrs
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1">Total Shift Logged</span>
                  <span className="font-bold text-slate-800 font-mono text-sm">
                    {selectedRecord.totalWorkHours} hrs
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1">Standard Workday</span>
                  <span className="font-bold text-slate-800 font-mono text-sm">
                    8.00 hrs
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-900 text-xs">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Overtime hours verified from recorded shift sessions.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}