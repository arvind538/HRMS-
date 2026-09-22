"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Send,
  Loader2,
  PlusCircle,
  Receipt,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  IndianRupee,
  Tag,
  FileText,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Clock,
  Lock,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function MyExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  // New expense form
  const [form, setForm] = useState({
    category: "travel",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });

  // Edit expense form
  const [editForm, setEditForm] = useState({
    category: "travel",
    amount: "",
    description: "",
    expenseDate: "",
  });

  // Safe resolver for Employee or User ID
  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      null
    );
  }, [user]);

  // Robust extractor for any API structure
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.expenses)) return resData.expenses;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.result)) return resData.result;
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let records = [];

      // 1. Direct personal endpoints
      const directEndpoints = [
        "/expenses/my-expenses",
        "/expenses/my",
        "/expenses/me",
      ];

      for (const endpoint of directEndpoints) {
        try {
          const res = await api.get(endpoint);
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
            break;
          }
        } catch {
          // Probe next
        }
      }

      // 2. Query with Employee or User ID
      if (records.length === 0 && employeeId) {
        const queryEndpoints = [
          { url: "/expenses", params: { employee: employeeId } },
          { url: "/expenses", params: { employeeId: employeeId } },
          { url: "/expenses", params: { user: employeeId } },
        ];

        for (const item of queryEndpoints) {
          try {
            const res = await api.get(item.url, { params: item.params });
            const parsed = extractList(res.data);
            if (parsed && parsed.length > 0) {
              records = parsed;
              break;
            }
          } catch {
            // Continue
          }
        }
      }

      // 3. Fallback for Admin role
      if (records.length === 0 && (user?.role === "admin" || user?.role === "superadmin")) {
        try {
          const res = await api.get("/expenses");
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
          }
        } catch {
          // No-op
        }
      }

      setExpenses(records);
    } catch (err) {
      console.error("Expenses fetch error:", err);
      toast.error("Failed to load expense records.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [employeeId, extractList, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedExpense(null);
        setEditingExpense(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Submit new expense
  const handleSubmit = async (e) => {
    e.preventDefault();
    const resolvedId = employeeId;

    if (!resolvedId) {
      toast.error("Employee session not found. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        employee: resolvedId,
        amount: Number(form.amount),
      };

      await api.post("/expenses", payload);
      toast.success("Expense submitted successfully!");
      setForm({
        category: "travel",
        amount: "",
        description: "",
        expenseDate: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (err) {
      console.error("Expense submit error:", err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to submit expense. Please check all fields.";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal (Allowed only for pending)
  const handleOpenEdit = (expense, e) => {
    e.stopPropagation();
    const status = (expense.status || "pending").toLowerCase();
    if (status !== "pending") {
      toast.info(`Cannot edit ${status} claims. You can remove and resubmit if necessary.`);
      return;
    }

    setEditingExpense(expense);
    setEditForm({
      category: expense.category || "travel",
      amount: expense.amount || "",
      description: expense.description || "",
      expenseDate: expense.expenseDate
        ? new Date(expense.expenseDate).toISOString().split("T")[0]
        : "",
    });
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const id = editingExpense._id || editingExpense.id;

    setSubmitting(true);
    try {
      const payload = {
        ...editForm,
        amount: Number(editForm.amount),
      };

      await api.put(`/expenses/${id}`, payload);
      toast.success("Expense updated successfully!");
      setEditingExpense(null);
      fetchData();
    } catch (err) {
      console.error("Expense update error:", err);
      toast.error(err.response?.data?.message || "Failed to update expense.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Expense - Pending, Rejected & Reimbursed can be deleted
  const handleDelete = async (id, status, e) => {
    e.stopPropagation();

    const formattedStatus = String(status || "this").toUpperCase();
    const confirmMessage =
      status === "pending"
        ? "Are you sure you want to delete this pending expense claim?"
        : `Are you sure you want to delete this ${formattedStatus} claim? It will be removed from your history.`;

    if (!window.confirm(confirmMessage)) return;

    setDeletingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense record removed successfully.");
      setExpenses((prev) => prev.filter((item) => (item._id || item.id) !== id));
      if (selectedExpense && (selectedExpense._id === id || selectedExpense.id === id)) {
        setSelectedExpense(null);
      }
    } catch (err) {
      console.error("Delete expense error:", err);
      toast.error(err.response?.data?.message || "Failed to delete expense record.");
    } finally {
      setDeletingId(null);
    }
  };

  const statusVariant = {
    pending: "warning",
    approved: "info",
    rejected: "danger",
    reimbursed: "success",
    paid: "success",
  };

  const totalAmount = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-md shadow-indigo-100 shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Expenses</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                <Sparkles size={12} /> Claim Portal
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Submit your claims, view status updates, and manage past expense entries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh expenses"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Total Claims: <span className="text-indigo-600 font-bold">{expenses.length}</span>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Total: <span className="text-emerald-600 font-bold">₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Submit New Expense Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-7 transition-all duration-200">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <PlusCircle size={18} />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Submit New Expense Claim</h3>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
              <Tag size={13} className="text-indigo-600" /> Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="travel">Travel</option>
              <option value="food">Food & Meals</option>
              <option value="supplies">Office Supplies</option>
              <option value="training">Training & Seminars</option>
              <option value="accommodation">Accommodation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
              <IndianRupee size={13} className="text-indigo-600" /> Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              placeholder="e.g. 1500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
              <Calendar size={13} className="text-indigo-600" /> Expense Date
            </label>
            <input
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
              <FileText size={13} className="text-indigo-600" /> Description
            </label>
            <input
              type="text"
              placeholder="Client lunch, taxi fare..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
            <Button
              type="submit"
              loading={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl transition-all duration-150 shadow-sm cursor-pointer text-xs"
            >
              <Send size={15} /> Submit Expense
            </Button>
          </div>
        </form>
      </div>

      {/* Expenses History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Expense History</h3>
          </div>
          <span className="text-xs text-slate-400">Click any row to inspect complete details</span>
        </div>

        {loading && !isRefreshing ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2 font-medium">Loading claims...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
              <Receipt size={26} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No expenses recorded</p>
            <p className="text-xs text-slate-400">
              Submit your first expense claim using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Description</th>
                  <th className="py-3.5 px-5">Amount</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((item, idx) => {
                  const itemId = item._id || item.id || idx;
                  const statusKey = (item.status || "pending").toLowerCase();
                  const isPending = statusKey === "pending";

                  return (
                    <tr
                      key={itemId}
                      onClick={() => setSelectedExpense(item)}
                      tabIndex={0}
                      className="hover:bg-indigo-50/30 transition-colors duration-150 cursor-pointer group"
                    >
                      <td className="py-4 px-5 font-semibold text-slate-900 capitalize">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <Tag size={13} />
                          </span>
                          {item.category || "General"}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-slate-600 max-w-xs truncate">
                        {item.description || "—"}
                      </td>

                      <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(item.amount || 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-5 text-slate-500 whitespace-nowrap">
                        {item.expenseDate || item.date
                          ? new Date(item.expenseDate || item.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                          : "—"}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <Badge variant={statusVariant[statusKey] || "neutral"}>
                          {String(item.status || "pending").replace(/_/g, " ")}
                        </Badge>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* View Detail Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedExpense(item)}
                            title="View full details"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Edit Button (Only allowed for Pending) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(item, e)}
                            title={isPending ? "Edit claim" : `Cannot edit (${item.status})`}
                            disabled={!isPending}
                            className={`p-1.5 rounded-lg transition-all duration-150 ${isPending
                              ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50 active:scale-95 cursor-pointer"
                              : "text-slate-200 cursor-not-allowed opacity-40"
                              }`}
                          >
                            {isPending ? <Edit3 size={16} /> : <Lock size={15} />}
                          </button>

                          {/* Delete Button (Active for Pending, Rejected & Reimbursed) */}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(itemId, statusKey, e)}
                            title="Delete this expense"
                            disabled={deletingId === itemId}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer"
                          >
                            {deletingId === itemId ? (
                              <Loader2 size={16} className="animate-spin text-red-600" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Center Modal */}
      {selectedExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/80 to-white">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                  <Receipt size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusVariant[(selectedExpense.status || "pending").toLowerCase()] || "neutral"}>
                      {String(selectedExpense.status || "Pending").replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                      {selectedExpense.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    ₹{Number(selectedExpense.amount || 0).toLocaleString()}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" /> Description / Purpose
                </span>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedExpense.description || "No specific comments or notes provided."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-indigo-600" /> Expense Date
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedExpense.expenseDate || selectedExpense.date
                      ? new Date(selectedExpense.expenseDate || selectedExpense.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "N/A"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" /> Submitted On
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedExpense.createdAt
                      ? new Date(selectedExpense.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "Recently"}
                  </span>
                </div>
              </div>

              {/* Remarks / Approver Feedback if available */}
              {(selectedExpense.remarks || selectedExpense.comments || selectedExpense.rejectionReason) && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-800 flex items-center gap-1">
                    <AlertCircle size={14} /> Approver Feedback:
                  </span>
                  <p className="text-amber-900">
                    {selectedExpense.remarks || selectedExpense.comments || selectedExpense.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {/* Direct Delete from Modal */}
              <button
                type="button"
                onClick={(e) =>
                  handleDelete(
                    selectedExpense._id || selectedExpense.id,
                    (selectedExpense.status || "").toLowerCase(),
                    e
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 size={14} /> Delete Claim
              </button>

              <div className="flex items-center gap-2">
                {selectedExpense.status?.toLowerCase() === "pending" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const target = selectedExpense;
                      setSelectedExpense(null);
                      handleOpenEdit(target, e);
                    }}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Edit Claim
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedExpense(null)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingExpense(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit3 size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Edit Expense Claim</h3>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="travel">Travel</option>
                  <option value="food">Food & Meals</option>
                  <option value="supplies">Office Supplies</option>
                  <option value="training">Training & Seminars</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={editForm.expenseDate}
                  onChange={(e) => setEditForm({ ...editForm, expenseDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold cursor-pointer"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}