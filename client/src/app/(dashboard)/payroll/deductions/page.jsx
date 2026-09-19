"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingDown,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Search,
  Trash2,
  Edit3,
  Calendar,
  IndianRupee,
  Users,
  ChevronDown,
  Receipt,
  FileMinus
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function Deductions() {
  const [deductions, setDeductions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const [form, setForm] = useState({
    employeeId: "",
    title: "",
    amount: "",
    month: currentMonth,
    year: currentYear,
    type: "LOAN_RECOVERY",
    remarks: "",
  });

  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/deductions");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

      setDeductions(list);
    } catch (err) {
      console.error("Fetch deductions error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load deduction records from server."
      );
      setDeductions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get("/employee");
      const resData = response?.data;
      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.employees)
            ? resData.employees
            : [];
      setEmployees(list);
    } catch (err) {
      try {
        const fallbackRes = await api.get("/employees");
        const fbData = fallbackRes?.data;
        const fbList = Array.isArray(fbData) ? fbData : fbData?.data || [];
        setEmployees(fbList);
      } catch (e) {
        console.warn("Could not load employees for dropdown:", e);
      }
    }
  }, []);

  useEffect(() => {
    fetchDeductions();
    fetchEmployees();
  }, [fetchDeductions, fetchEmployees]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      employeeId: "",
      title: "",
      amount: "",
      month: currentMonth,
      year: currentYear,
      type: "LOAN_RECOVERY",
      remarks: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (d) => {
    const id = d._id || d.id;
    setEditingId(id);
    setForm({
      employeeId: d.employee?._id || d.employee || "",
      title: d.title || "",
      amount: d.amount?.toString() || "",
      month: String(d.month || currentMonth).padStart(2, "0"),
      year: String(d.year || currentYear),
      type: d.type || "LOAN_RECOVERY",
      remarks: d.remarks || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid deduction amount.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        title: form.title.trim(),
        amount: Number(form.amount),
        month: Number(form.month),
        year: Number(form.year),
        type: form.type,
        remarks: form.remarks.trim(),
      };

      if (editingId) {
        const response = await api.put(`/payroll/deductions/${editingId}`, payload);
        const updatedItem = response?.data?.data || response?.data;

        if (updatedItem && typeof updatedItem === "object") {
          setDeductions((prev) =>
            prev.map((item) => ((item._id || item.id) === editingId ? updatedItem : item))
          );
        } else {
          fetchDeductions();
        }
        toast.success("Deduction record updated successfully!");
      } else {
        const response = await api.post("/payroll/deductions", payload);
        const createdItem = response?.data?.data || response?.data;

        if (createdItem && typeof createdItem === "object") {
          setDeductions((prev) => [createdItem, ...prev]);
        } else {
          fetchDeductions();
        }
        toast.success("Deduction recorded successfully!");
      }

      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      console.error("Save deduction error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save deduction."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this deduction record?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/payroll/deductions/${id}`);
      setDeductions((prev) => prev.filter((d) => (d._id || d.id) !== id));
      toast.success("Deduction record removed successfully.");
    } catch (err) {
      console.error("Delete deduction error:", err);
      toast.error(
        err.response?.data?.message || "Failed to remove deduction record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDeductions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deductions;
    return deductions.filter((d) => {
      const empName = d.employee?.name || "";
      const empCode = d.employee?.employeeId || "";
      const title = d.title || "";
      const type = d.type || "";
      return (
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q)
      );
    });
  }, [deductions, searchQuery]);

  const totalDeductionAmount = useMemo(() => {
    return filteredDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [filteredDeductions]);

  const formatType = (type) => {
    switch (type) {
      case "LOAN_RECOVERY":
        return "Loan Recovery";
      case "TDS":
        return "TDS / Tax Cut";
      case "DAMAGE_PENALTY":
        return "Damage Penalty";
      case "ADVANCE_SALARY":
        return "Advance Salary";
      default:
        return "Other Recovery";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-3">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Custom Deductions & Recoveries
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  {deductions.length} Applied
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage salary advance cuts, loan installments, statutory TDS withholding, and asset damage penalties
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchDeductions();
              fetchEmployees();
            }}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deduction</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      {!loading && !error && deductions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Deductions Scheduled
              </p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                -₹{totalDeductionAmount.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Impacted Workforce
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {new Set(deductions.map((d) => d.employee?._id || d.employee)).size} Employees
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Recovery Records
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {deductions.length} Claims
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 transition hover:shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name, ID or deduction reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Showing <span className="font-bold text-slate-800">{filteredDeductions.length}</span> records
        </p>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading deduction records...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Records</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchDeductions}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredDeductions.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <FileMinus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Custom Deductions Applied</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click 'Add Deduction' above to schedule salary advance cuts or loan recoveries.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Reason / Title</th>
                    <th className="py-3.5 px-6">Classification</th>
                    <th className="py-3.5 px-6">Period</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredDeductions.map((d) => {
                    const id = d._id || d.id;
                    const empName = d.employee?.name || "Unknown Staff";
                    const empCode = d.employee?.employeeId || "—";
                    const dept = d.employee?.department || "";
                    const isDeleting = deletingId === id;

                    return (
                      <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {empName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{empCode}</span>
                            {dept && <span>• {dept}</span>}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                            {d.title}
                          </div>
                          {d.remarks && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{d.remarks}</p>
                          )}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-block text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                            {formatType(d.type)}
                          </span>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap text-slate-600 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {String(d.month).padStart(2, "0")}/{d.year}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-bold text-rose-600 text-base">
                          -₹{(d.amount || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>{d.status || "Pending"}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(d)}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition cursor-pointer"
                              title="Edit deduction record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDelete(id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition disabled:opacity-40 cursor-pointer"
                              title="Delete deduction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredDeductions.map((d) => {
                const id = d._id || d.id;
                const empName = d.employee?.name || "Unknown";
                const empCode = d.employee?.employeeId || "";
                const isDeleting = deletingId === id;

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{empName}</h4>
                        {empCode && <p className="text-[11px] text-slate-400">{empCode}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(d)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg border border-slate-200 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={isDeleting}
                          onClick={() => handleDelete(id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg border border-slate-200 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Deduction Reason:</span>
                        <span className="font-semibold text-slate-800">{d.title}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Classification:</span>
                        <span className="font-medium text-slate-700">{formatType(d.type)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Target Cycle:</span>
                        <span className="font-medium text-slate-700">
                          {String(d.month).padStart(2, "0")}/{d.year}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t border-slate-200/60">
                        <span>Recovery Amount:</span>
                        <span className="text-rose-600 text-sm font-black">
                          -₹{(d.amount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Record / Edit Deduction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Edit Deduction Record" : "Record Custom Deduction"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Employee Selector */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Employee ({employees.length} Available)
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => {
                      const empId = emp._id || emp.id;
                      const empName = emp.name || emp.fullName || "Staff Member";
                      const empCode = emp.employeeId || emp.code || "";
                      return (
                        <option key={empId} value={empId}>
                          {empName} {empCode ? `(${empCode})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Title and Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Deduction Title</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Salary Advance Cut"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Deduction Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition"
                  >
                    <option value="LOAN_RECOVERY">Loan Recovery</option>
                    <option value="ADVANCE_SALARY">Salary Advance</option>
                    <option value="TDS">TDS / Direct Tax</option>
                    <option value="DAMAGE_PENALTY">Damage Penalty</option>
                    <option value="OTHER">Other Recovery</option>
                  </select>
                </div>
              </div>

              {/* Amount & Period */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="50"
                    step="100"
                    required
                    placeholder="2500"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Month</label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Remarks / Purpose (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 2nd installment for emergency medical advance"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : editingId ? "Update Deduction" : "Record Deduction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}