"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Receipt,
  Plus,
  RefreshCw,
  AlertCircle,
  FileText,
  CheckCircle2,
  X,
  Search,
  Calendar,
  ExternalLink,
  ChevronDown,
  Trash2,
  Clock,
  FileCheck,
  Check,
  Ban,
  Pencil
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function Reimbursements() {
  const [claims, setClaims] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // <-- Edit tracking state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [receiptModalUrl, setReceiptModalUrl] = useState(null);

  const [form, setForm] = useState({
    employeeId: "",
    category: "TRAVEL",
    amount: "",
    billDate: new Date().toISOString().split("T")[0],
    description: "",
    receiptUrl: "",
  });

  // Fetch all reimbursement claims
  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/reimbursements");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

      setClaims(list);
    } catch (err) {
      console.error("Fetch reimbursements error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load reimbursement claims from server."
      );
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch employees list for claimant dropdown
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
    fetchClaims();
    fetchEmployees();
  }, [fetchClaims, fetchEmployees]);

  // Open modal for editing
  const handleOpenEdit = (c) => {
    setEditingId(c._id || c.id);
    setForm({
      employeeId: c.employee?._id || c.employee || "",
      category: c.category || "TRAVEL",
      amount: c.amount || "",
      billDate: c.billDate ? new Date(c.billDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      description: c.description || "",
      receiptUrl: c.receiptUrl || "",
    });
    setShowModal(true);
  };

  // Submit or Update reimbursement claim
  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid claim amount.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Please provide expense details.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        category: form.category,
        amount: Number(form.amount),
        billDate: form.billDate,
        description: form.description.trim(),
        receiptUrl: form.receiptUrl.trim(),
      };

      if (editingId) {
        // Update existing claim
        const response = await api.put(`/payroll/reimbursements/${editingId}`, payload);
        const updatedItem = response?.data?.data || response?.data;
        setClaims((prev) =>
          prev.map((c) => ((c._id || c.id) === editingId ? updatedItem : c))
        );
        toast.success("Expense bill updated successfully!");
      } else {
        // Create new claim
        const response = await api.post("/payroll/reimbursements", payload);
        const createdItem = response?.data?.data || response?.data;
        if (createdItem && typeof createdItem === "object") {
          setClaims((prev) => [createdItem, ...prev]);
        } else {
          fetchClaims();
        }
        toast.success("Expense bill submitted successfully!");
      }

      setShowModal(false);
      setEditingId(null);
      setForm({
        employeeId: "",
        category: "TRAVEL",
        amount: "",
        billDate: new Date().toISOString().split("T")[0],
        description: "",
        receiptUrl: "",
      });
    } catch (err) {
      console.error("Save reimbursement error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save reimbursement claim."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Approve or Reject claim action
  const handleAction = async (id, status) => {
    setActionId(id);
    try {
      const response = await api.put(`/payroll/reimbursements/${id}/status`, {
        status,
      });

      setClaims((prev) =>
        prev.map((c) => ((c._id || c.id) === id ? { ...c, status } : c))
      );

      toast.success(`Claim marked as ${status.toLowerCase()}!`);
    } catch (err) {
      console.error("Action error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Action failed to execute."
      );
    } finally {
      setActionId(null);
    }
  };

  // Delete claim
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense claim?")) return;

    setActionId(id);
    try {
      await api.delete(`/payroll/reimbursements/${id}`);
      setClaims((prev) => prev.filter((c) => (c._id || c.id) !== id));
      toast.success("Reimbursement claim deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(
        err.response?.data?.message || "Failed to remove claim record."
      );
    } finally {
      setActionId(null);
    }
  };

  // Filtered dataset
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const empName = c.employee?.name || c.userName || "";
      const empCode = c.employee?.employeeId || c.userId || "";
      const desc = c.description || "";
      const cat = c.category || "";

      const matchesSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || (c.status || "PENDING").toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claims, searchQuery, statusFilter]);

  // Aggregate Metrics
  const totalApprovedAmount = useMemo(() => {
    return claims
      .filter((c) => (c.status || "").toUpperCase() === "APPROVED")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [claims]);

  const totalPendingAmount = useMemo(() => {
    return claims
      .filter((c) => (c.status || "PENDING").toUpperCase() === "PENDING")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [claims]);

  const categoryLabel = (cat) => {
    switch (cat) {
      case "TRAVEL":
        return "Travel / Commute";
      case "INTERNET":
        return "Internet & Mobile";
      case "MEAL":
        return "Client Hospitality";
      case "TRAINING":
        return "Learning & Courses";
      case "EQUIPMENT":
        return "Office Equipment";
      default:
        return cat || "General Expense";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Reimbursement Claims
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {claims.length} Total Claims
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Expense approvals for official travel, equipment, client meetings, and remote allowances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchClaims();
              fetchEmployees();
            }}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50"
            title="Refresh claims"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setForm({
                employeeId: "",
                category: "TRAVEL",
                amount: "",
                billDate: new Date().toISOString().split("T")[0],
                description: "",
                receiptUrl: "",
              });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Expense Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      {!loading && !error && claims.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pending Approval Pool
              </p>
              <h3 className="text-xl font-bold text-amber-600 mt-1">
                ₹{totalPendingAmount.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Approved Claims
              </p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                ₹{totalApprovedAmount.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Claimants
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {new Set(claims.map((c) => c.employee?._id || c.employee)).size} Staff Members
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee, category or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${statusFilter === st
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
            >
              {st === "ALL" ? "All Claims" : st.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading claims list...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Reimbursements</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchClaims}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Reimbursement Claims Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Submit your verified expense receipts using 'Submit Expense Bill' above.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Claimant</th>
                    <th className="py-3.5 px-6">Category & Description</th>
                    <th className="py-3.5 px-6">Invoice Date</th>
                    <th className="py-3.5 px-6">Receipt Bill</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredClaims.map((c) => {
                    const id = c._id || c.id;
                    const empName = c.employee?.name || c.userName || "Unknown Staff";
                    const empCode = c.employee?.employeeId || c.userId || "—";
                    const dept = c.employee?.department || "";
                    const isProcessing = actionId === id;
                    const currentStatus = (c.status || "PENDING").toUpperCase();

                    return (
                      <tr key={id} className="hover:bg-indigo-50/40 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900 leading-tight group-hover:text-indigo-900 transition-colors">
                            {empName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{empCode}</span>
                            {dept && <span>• {dept}</span>}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-block text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {categoryLabel(c.category)}
                          </span>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                            {c.description || "No description provided"}
                          </p>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap text-slate-600 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {c.billDate
                                ? new Date(c.billDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                                : "—"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          {c.receiptUrl ? (
                            <button
                              onClick={() => setReceiptModalUrl(c.receiptUrl)}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-100 transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No File</span>
                          )}
                        </td>

                        <td className="py-4 px-6 font-bold text-slate-900 text-base">
                          ₹{(c.amount || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentStatus === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : currentStatus === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${currentStatus === "APPROVED"
                                ? "bg-emerald-500"
                                : currentStatus === "REJECTED"
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                                }`}
                            />
                            <span>{currentStatus}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            <button
                              disabled={isProcessing}
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 hover:border-indigo-200 transition"
                              title="Edit claim"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {currentStatus === "PENDING" ? (
                              <>
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleAction(id, "APPROVED")}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-xs font-semibold border border-emerald-200 transition disabled:opacity-50"
                                  title="Approve claim"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleAction(id, "REJECTED")}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg text-xs font-semibold border border-rose-200 transition disabled:opacity-50"
                                  title="Reject claim"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleDelete(id)}
                                className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg transition disabled:opacity-40"
                                title="Delete record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
              {filteredClaims.map((c) => {
                const id = c._id || c.id;
                const empName = c.employee?.name || c.userName || "Unknown";
                const empCode = c.employee?.employeeId || c.userId || "";
                const isProcessing = actionId === id;
                const currentStatus = (c.status || "PENDING").toUpperCase();

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{empName}</h4>
                        {empCode && <p className="text-[11px] text-slate-400">{empCode}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isProcessing}
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentStatus === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : currentStatus === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                        >
                          {currentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Category:</span>
                        <span className="font-semibold text-slate-800">
                          {categoryLabel(c.category)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Bill Date:</span>
                        <span className="font-medium text-slate-700">
                          {c.billDate ? new Date(c.billDate).toLocaleDateString("en-IN") : "—"}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-slate-500 text-[11px] border-t border-slate-200/60 pt-1">
                          {c.description}
                        </p>
                      )}
                      <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t border-slate-200/60">
                        <span>Claim Amount:</span>
                        <span className="text-indigo-600 font-black text-sm">
                          ₹{(c.amount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {currentStatus === "PENDING" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          disabled={isProcessing}
                          onClick={() => handleAction(id, "APPROVED")}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleAction(id, "REJECTED")}
                          className="flex-1 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Ban className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Submit/Edit Claim Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Edit Expense Bill" : "Submit Expense Bill"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
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
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none"
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

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expense Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="TRAVEL">Travel / Commute</option>
                    <option value="INTERNET">Internet / Phone Bill</option>
                    <option value="MEAL">Client Hospitality / Meals</option>
                    <option value="TRAINING">Course / Certification</option>
                    <option value="EQUIPMENT">Office Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={form.billDate}
                    onChange={(e) => setForm({ ...form, billDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bill Amount (₹)</label>
                <input
                  type="number"
                  min="10"
                  step="50"
                  required
                  placeholder="e.g. 2450"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Receipt URL / Cloud Link */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Receipt / Invoice Document URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or cloud image link"
                  value={form.receiptUrl}
                  onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Expense Details / Purpose
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Taxi fare and client lunch for project review meeting"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Claim" : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Viewer Lightbox Modal */}
      {receiptModalUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Attached Invoice Document</h3>
              <button
                onClick={() => setReceiptModalUrl(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-96 flex items-center justify-center p-2">
              <img
                src={receiptModalUrl}
                alt="Receipt Preview"
                className="max-h-80 w-auto object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">Could not preview document directly. <a href="${receiptModalUrl}" target="_blank" rel="noreferrer" class="text-indigo-600 font-semibold underline block mt-2">Open Link in New Window</a></div>`;
                }}
              />
            </div>
            <div className="flex justify-end">
              <a
                href={receiptModalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-xl hover:bg-indigo-100 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Document
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}