"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Gift,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Search,
  Trash2,
  Edit3,
  Calendar,
  IndianRupee,
  Sparkles,
  Users,
  ChevronDown
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function Bonuses() {
  const [bonuses, setBonuses] = useState([]);
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
    type: "Performance",
    remarks: "",
  });

  const fetchBonuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/bonuses");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

      setBonuses(list);
    } catch (err) {
      console.error("Fetch bonuses error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load bonus allocations from the server."
      );
      setBonuses([]);
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
        console.warn("Could not load employee select list:", err);
      }
    }
  }, []);

  useEffect(() => {
    fetchBonuses();
    fetchEmployees();
  }, [fetchBonuses, fetchEmployees]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      employeeId: "",
      title: "",
      amount: "",
      month: currentMonth,
      year: currentYear,
      type: "Performance",
      remarks: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (b) => {
    const id = b._id || b.id;
    setEditingId(id);
    setForm({
      employeeId: b.employee?._id || b.employee || "",
      title: b.title || "",
      amount: b.amount?.toString() || "",
      month: String(b.month || currentMonth).padStart(2, "0"),
      year: String(b.year || currentYear),
      type: b.type || "Performance",
      remarks: b.remarks || "",
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
      toast.error("Please enter a valid bonus amount.");
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
        const response = await api.put(`/payroll/bonuses/${editingId}`, payload);
        const updatedItem = response?.data?.data || response?.data;

        if (updatedItem && typeof updatedItem === "object") {
          setBonuses((prev) =>
            prev.map((item) => ((item._id || item.id) === editingId ? updatedItem : item))
          );
        } else {
          fetchBonuses();
        }
        toast.success("Bonus record updated successfully!");
      } else {
        const response = await api.post("/payroll/bonuses", payload);
        const createdItem = response?.data?.data || response?.data;

        if (createdItem && typeof createdItem === "object") {
          setBonuses((prev) => [createdItem, ...prev]);
        } else {
          fetchBonuses();
        }
        toast.success("Bonus allocated successfully!");
      }

      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      console.error("Save bonus error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save bonus allocation."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bonus record?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/payroll/bonuses/${id}`);
      setBonuses((prev) => prev.filter((b) => (b._id || b.id) !== id));
      toast.success("Bonus record deleted successfully.");
    } catch (err) {
      console.error("Delete bonus error:", err);
      toast.error(
        err.response?.data?.message || "Failed to remove bonus record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBonuses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return bonuses;
    return bonuses.filter((b) => {
      const empName = b.employee?.name || "";
      const empCode = b.employee?.employeeId || "";
      const title = b.title || "";
      const type = b.type || "";
      return (
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q)
      );
    });
  }, [bonuses, searchQuery]);

  const totalBonusAmount = useMemo(() => {
    return filteredBonuses.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [filteredBonuses]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Bonuses & Special Incentives
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {bonuses.length} Allocated
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage quarterly performance awards, annual festival rewards, and ad-hoc bonuses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchBonuses();
              fetchEmployees();
            }}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50 cursor-pointer"
            title="Refresh bonus records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Allocate Bonus</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      {!loading && !error && bonuses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Allocated Payout
              </p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                ₹{totalBonusAmount.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Rewarded Employees
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {new Set(bonuses.map((b) => b.employee?._id || b.employee)).size} Staff
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Award Allocations
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {bonuses.length} Grants
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
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
            placeholder="Search by employee name, ID or bonus title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Showing <span className="font-bold text-slate-800">{filteredBonuses.length}</span> grants
        </p>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading bonus allocations...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Records</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchBonuses}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredBonuses.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Bonus Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click 'Allocate Bonus' above to reward staff with festival or performance incentives.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Bonus Title & Type</th>
                    <th className="py-3.5 px-6">Target Cycle</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBonuses.map((b) => {
                    const id = b._id || b.id;
                    const empName = b.employee?.name || "Unknown Staff";
                    const empCode = b.employee?.employeeId || "—";
                    const dept = b.employee?.department || "";
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
                            {b.title}
                          </div>
                          <span className="inline-block mt-0.5 text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-medium">
                            {b.type || "Performance"}
                          </span>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap text-slate-600 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {String(b.month).padStart(2, "0")}/{b.year}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-bold text-emerald-600 text-base">
                          +₹{(b.amount || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{b.status || "Approved"}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(b)}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition cursor-pointer"
                              title="Edit bonus allocation"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDelete(id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition disabled:opacity-40 cursor-pointer"
                              title="Delete bonus"
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
              {filteredBonuses.map((b) => {
                const id = b._id || b.id;
                const empName = b.employee?.name || "Unknown";
                const empCode = b.employee?.employeeId || "";
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
                          onClick={() => handleOpenEdit(b)}
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
                        <span>Bonus Purpose:</span>
                        <span className="font-semibold text-slate-800">{b.title}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Period:</span>
                        <span className="font-medium text-slate-700">
                          {String(b.month).padStart(2, "0")}/{b.year}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t border-slate-200/60">
                        <span>Disbursed Amount:</span>
                        <span className="text-emerald-600 text-sm font-black">
                          +₹{(b.amount || 0).toLocaleString("en-IN")}
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

      {/* Allocate / Edit Bonus Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Edit Bonus Allocation" : "Allocate Employee Bonus"}
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

              {/* Title and Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bonus Title</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Diwali Reward"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition"
                  >
                    <option value="Performance">Performance</option>
                    <option value="Festival">Festival Reward</option>
                    <option value="Retention">Retention</option>
                    <option value="Discretionary">Discretionary</option>
                  </select>
                </div>
              </div>

              {/* Amount & Period */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    required
                    placeholder="10000"
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
                  Remarks / Justification (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Outstanding performance in Q3 product delivery"
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
                  {submitting ? "Saving..." : editingId ? "Update Bonus" : "Save Bonus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}