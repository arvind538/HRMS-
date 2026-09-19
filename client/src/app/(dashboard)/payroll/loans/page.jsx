"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Landmark,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Search,
  Trash2,
  Edit3,
  IndianRupee,
  Users,
  ChevronDown,
  Clock,
  CheckCircle2
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function LoanAdvance() {
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [form, setForm] = useState({
    employeeId: "",
    type: "SALARY_ADVANCE",
    amount: "",
    emiMonths: "3",
    reason: "",
    status: "ACTIVE", // 🌟 Added status field for admin control
  });

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/loans");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

      setLoans(list);
    } catch (err) {
      console.error("Fetch loans error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load loan & advance records from server."
      );
      setLoans([]);
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
    fetchLoans();
    fetchEmployees();
  }, [fetchLoans, fetchEmployees]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      employeeId: "",
      type: "SALARY_ADVANCE",
      amount: "",
      emiMonths: "3",
      reason: "",
      status: "ACTIVE",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (l) => {
    const id = l._id || l.id;
    setEditingId(id);
    setForm({
      employeeId: l.employee?._id || l.employee || "",
      type: l.type || "SALARY_ADVANCE",
      amount: l.principal?.toString() || "",
      emiMonths: l.emiMonths?.toString() || "3",
      reason: l.reason || "",
      status: l.status || "ACTIVE",
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
      toast.error("Please enter a valid loan/advance amount.");
      return;
    }
    if (!form.emiMonths || Number(form.emiMonths) <= 0) {
      toast.error("Tenure must be at least 1 month.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        type: form.type,
        amount: Number(form.amount),
        emiMonths: Number(form.emiMonths),
        reason: form.reason.trim(),
        status: form.status,
      };

      if (editingId) {
        const response = await api.put(`/payroll/loans/${editingId}`, payload);
        const updatedItem = response?.data?.data || response?.data;

        if (updatedItem && typeof updatedItem === "object") {
          setLoans((prev) =>
            prev.map((item) => ((item._id || item.id) === editingId ? updatedItem : item))
          );
        } else {
          fetchLoans();
        }
        toast.success("Loan record updated successfully!");
      } else {
        const response = await api.post("/payroll/loans", payload);
        const createdItem = response?.data?.data || response?.data;

        if (createdItem && typeof createdItem === "object") {
          setLoans((prev) => [createdItem, ...prev]);
        } else {
          fetchLoans();
        }
        toast.success("Loan / Advance request processed successfully!");
      }

      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      console.error("Save loan error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to submit loan request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this loan record?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/payroll/loans/${id}`);
      setLoans((prev) => prev.filter((item) => (item._id || item.id) !== id));
      toast.success("Loan record removed successfully.");
    } catch (err) {
      console.error("Delete loan error:", err);
      toast.error(
        err.response?.data?.message || "Failed to remove loan record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const empName = l.employee?.name || "";
      const empCode = l.employee?.employeeId || "";
      const reason = l.reason || "";
      const matchesSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [loans, searchQuery, statusFilter]);

  const totalDisbursedPrincipal = useMemo(() => {
    return filteredLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);
  }, [filteredLoans]);

  const totalOutstandingBalance = useMemo(() => {
    return filteredLoans.reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0);
  }, [filteredLoans]);

  const formatType = (type) => {
    switch (type) {
      case "SALARY_ADVANCE":
        return "Salary Advance";
      case "COMPANY_LOAN":
        return "Company Loan";
      case "EMERGENCY_AID":
        return "Emergency Aid";
      default:
        return type || "Loan";
    }
  };

  const calculatedEmi = useMemo(() => {
    const amt = Number(form.amount) || 0;
    const months = Number(form.emiMonths) || 1;
    return months > 0 ? Math.round(amt / months) : 0;
  }, [form.amount, form.emiMonths]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-6 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-indigo-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 transition-transform duration-300 hover:scale-105">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Loan & Salary Advance Management
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {loans.length} Records
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Staff advance disbursements, repayment schedules, and automated monthly EMI deductions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchLoans();
              fetchEmployees();
            }}
            disabled={loading}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4.5 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Advance / Loan</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      {!loading && !error && loans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:border-indigo-200 group">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                Total Principal Disbursed
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                ₹{totalDisbursedPrincipal.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:border-rose-200 group">
            <div>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                Total Outstanding Balance
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1 font-mono">
                ₹{totalOutstandingBalance.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:border-emerald-200 group">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Active Contracts
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
                {loans.filter((l) => l.status === "ACTIVE").length} Active
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-300 hover:shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name, ID or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "ACTIVE", "COMPLETED", "PENDING"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 cursor-pointer ${statusFilter === status
                ? "bg-slate-900 text-white shadow-xs scale-105"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
            >
              {status === "ALL" ? "All Loans" : status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading loan records...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Records</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchLoans}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Active Loans or Advances</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click 'Apply Advance / Loan' above to record a new employee salary advance or loan.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Type & Reason</th>
                    <th className="py-4 px-6">Principal Amount</th>
                    <th className="py-4 px-6">Monthly EMI</th>
                    <th className="py-4 px-6">Remaining Balance</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLoans.map((item) => {
                    const id = item._id || item.id;
                    const empName = item.employee?.name || "Unknown Staff";
                    const empCode = item.employee?.employeeId || "—";
                    const dept = item.employee?.department || "";
                    const isDeleting = deletingId === id;

                    return (
                      <tr key={id} className="hover:bg-indigo-50/40 transition-colors duration-150 group">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                            {empName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                            <span>{empCode}</span>
                            {dept && <span>• {dept}</span>}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-block text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md font-semibold">
                            {formatType(item.type)}
                          </span>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-xs" title={item.reason}>
                            {item.reason}
                          </p>
                        </td>

                        <td className="py-4 px-6 font-extrabold text-slate-900 text-base font-mono">
                          ₹{(item.principal || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 font-semibold text-rose-600 font-mono">
                          ₹{(item.monthlyEmi || 0).toLocaleString("en-IN")}/mo
                          <span className="text-[11px] text-slate-400 block font-normal font-sans">
                            over {item.emiMonths} months
                          </span>
                        </td>

                        <td className="py-4 px-6 font-semibold text-slate-700 font-mono">
                          ₹{(item.remainingBalance || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${item.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.status === "COMPLETED"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${item.status === "ACTIVE"
                                ? "bg-emerald-500"
                                : item.status === "COMPLETED"
                                  ? "bg-indigo-500"
                                  : "bg-amber-500"
                                }`}
                            />
                            <span>{item.status || "PENDING"}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 rounded-xl transition cursor-pointer shadow-xs"
                              title="Edit loan record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDelete(id)}
                              className="p-2 bg-slate-50 hover:bg-rose-600 hover:text-white text-slate-600 rounded-xl transition disabled:opacity-40 cursor-pointer shadow-xs"
                              title="Delete loan"
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
              {filteredLoans.map((item) => {
                const id = item._id || item.id;
                const empName = item.employee?.name || "Unknown";
                const empCode = item.employee?.employeeId || "";
                const isDeleting = deletingId === id;

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{empName}</h4>
                        {empCode && <p className="text-[11px] text-slate-400 font-mono">{empCode}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "COMPLETED"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                        >
                          {item.status || "PENDING"}
                        </span>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 text-slate-600 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-xl border border-slate-200 transition cursor-pointer shadow-xs"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={isDeleting}
                          onClick={() => handleDelete(id)}
                          className="p-2 text-slate-600 bg-slate-50 hover:bg-rose-600 hover:text-white rounded-xl border border-slate-200 transition cursor-pointer shadow-xs"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium">Classification:</span>
                        <span className="font-semibold text-slate-800">
                          {formatType(item.type)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium">Principal:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          ₹{(item.principal || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium">Monthly EMI:</span>
                        <span className="font-semibold text-rose-600 font-mono">
                          ₹{(item.monthlyEmi || 0).toLocaleString("en-IN")}/mo ({item.emiMonths} mos)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 font-bold pt-2 mt-1 border-t border-slate-200/60">
                        <span>Remaining Balance:</span>
                        <span className="text-indigo-600 font-black text-sm font-mono">
                          ₹{(item.remainingBalance || 0).toLocaleString("en-IN")}
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

      {/* Apply / Edit Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Edit Loan Record" : "New Loan / Advance Request"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Employee Selector */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Select Employee ({employees.length} Available)
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none font-medium transition"
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
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Type and Tenure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Request Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer font-medium transition"
                  >
                    <option value="SALARY_ADVANCE">Salary Advance</option>
                    <option value="COMPANY_LOAN">Company Loan</option>
                    <option value="EMERGENCY_AID">Emergency Aid</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Tenure (Months)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="36"
                    value={form.emiMonths}
                    onChange={(e) => setForm({ ...form, emiMonths: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition"
                  />
                </div>
              </div>

              {/* Amount and Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Principal (₹)</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    placeholder="25000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Contract Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer font-bold transition"
                  >
                    <option value="ACTIVE">🟢 Active</option>
                    <option value="COMPLETED">🔵 Completed</option>
                    <option value="PENDING">🟠 Pending</option>
                  </select>
                </div>
              </div>

              {calculatedEmi > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-semibold">
                  ≈ Calculated Monthly EMI: ₹{calculatedEmi.toLocaleString("en-IN")}/month
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Purpose / Reason</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Advance requested for medical emergency or personal expenditure"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {submitting ? "Processing..." : editingId ? "Update Request" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}