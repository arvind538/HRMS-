"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Receipt,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  Tag,
  FileText,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Clock,
  Lock,
  MoreVertical,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const MENU_WIDTH = 176;

const formatDate = (value, fallback = "—") =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : fallback;

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

  // Three-dot action menu state: { id, item, top, left }
  const [menu, setMenu] = useState(null);

  // Edit expense form
  const [editForm, setEditForm] = useState({
    category: "travel",
    amount: "",
    description: "",
    expenseDate: "",
  });

  // Only admin / superadmin can delete
  const isAdmin = useMemo(
    () => user?.role === "admin" || user?.role === "superadmin",
    [user?.role]
  );

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
      if (records.length === 0 && isAdmin) {
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
  }, [employeeId, extractList, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ESC closes modals + menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedExpense(null);
        setEditingExpense(null);
        setMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close three-dot menu on outside click / scroll / resize
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  // Open the three-dot menu next to the clicked button
  const toggleMenu = (item, id, e) => {
    e.stopPropagation();
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = isAdmin ? 148 : 108;

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 6); // flip upward
    }
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8
    );

    setMenu({ id, item, top, left });
  };

  // Open Edit Modal (Allowed only for pending)
  const handleOpenEdit = (expense, e) => {
    e?.stopPropagation?.();
    const status = (expense.status || "pending").toLowerCase();
    if (status !== "pending") {
      toast.info(`Cannot edit ${status} claims.`);
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

  // Delete Expense - Admin only
  const handleDelete = async (id, status, e) => {
    e?.stopPropagation?.();

    if (!isAdmin) {
      toast.error("Only admin can delete expense claims.");
      return;
    }

    const formattedStatus = String(status || "this").toUpperCase();
    const confirmMessage =
      status === "pending"
        ? "Are you sure you want to delete this pending expense claim?"
        : `Are you sure you want to delete this ${formattedStatus} claim? It will be removed from history.`;

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

  // Reusable three-dot trigger button
  const MenuButton = ({ item, id }) => (
    <button
      type="button"
      onClick={(e) => toggleMenu(item, id, e)}
      title="Actions"
      aria-label="Actions"
      aria-haspopup="menu"
      aria-expanded={menu?.id === id}
      disabled={deletingId === id}
      className={`p-2 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 ${menu?.id === id
        ? "bg-indigo-50 text-indigo-600"
        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        }`}
    >
      {deletingId === id ? (
        <Loader2 size={18} className="animate-spin text-red-600" />
      ) : (
        <MoreVertical size={18} />
      )}
    </button>
  );

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-14 px-3 sm:px-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-md shadow-indigo-100 shrink-0">
            <Receipt size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Expenses</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                <Sparkles size={12} /> Claim Portal
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              View your claim status updates and manage expense entries.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span>Sync</span>
          </button>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Total Claims: <span className="text-indigo-600 font-bold">{expenses.length}</span>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Total: <span className="text-emerald-600 font-bold">₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Expenses History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Expense History</h3>
          </div>
          <span className="text-xs text-slate-400">Tap any claim to inspect complete details</span>
        </div>

        {loading && !isRefreshing ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2 font-medium">Loading claims...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 sm:p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
              <Receipt size={26} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No expenses recorded</p>
            <p className="text-xs text-slate-400">Your expense claims will appear here.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <ul className="md:hidden divide-y divide-slate-100">
              {expenses.map((item, idx) => {
                const itemId = item._id || item.id || idx;
                const statusKey = (item.status || "pending").toLowerCase();

                return (
                  <li
                    key={itemId}
                    onClick={() => setSelectedExpense(item)}
                    className="p-4 flex items-start gap-3 active:bg-indigo-50/40 cursor-pointer"
                  >
                    <span className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0 mt-0.5">
                      <Tag size={15} />
                    </span>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 capitalize truncate">
                          {item.category || "General"}
                        </span>
                        <span className="font-bold text-slate-900 whitespace-nowrap">
                          ₹{Number(item.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{item.description || "—"}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          {formatDate(item.expenseDate || item.date)}
                        </span>
                        <Badge variant={statusVariant[statusKey] || "neutral"}>
                          {String(item.status || "pending").replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>

                    <div className="shrink-0 -mr-1" onClick={(e) => e.stopPropagation()}>
                      <MenuButton item={item} id={itemId} />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Tablet / Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
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

                        <td className="py-4 px-5 text-slate-600 max-w-[16rem] truncate">
                          {item.description || "—"}
                        </td>

                        <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                          ₹{Number(item.amount || 0).toLocaleString()}
                        </td>

                        <td className="py-4 px-5 text-slate-500 whitespace-nowrap">
                          {formatDate(item.expenseDate || item.date)}
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <Badge variant={statusVariant[statusKey] || "neutral"}>
                            {String(item.status || "pending").replace(/_/g, " ")}
                          </Badge>
                        </td>

                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div onClick={(e) => e.stopPropagation()}>
                            <MenuButton item={item} id={itemId} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Three-dot dropdown menu (fixed so it is never clipped by table overflow) */}
      {menu && (() => {
        const item = menu.item;
        const statusKey = (item.status || "pending").toLowerCase();
        const isPending = statusKey === "pending";

        return (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
            className="fixed z-[60] bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                setSelectedExpense(item);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              <Eye size={16} /> View
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={!isPending}
              onClick={(e) => {
                setMenu(null);
                handleOpenEdit(item, e);
              }}
              title={isPending ? "Edit claim" : `Cannot edit (${item.status})`}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${isPending
                ? "text-slate-700 hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
                : "text-slate-300 cursor-not-allowed"
                }`}
            >
              {isPending ? <Edit3 size={16} /> : <Lock size={16} />} Edit
            </button>

            {isAdmin && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    setMenu(null);
                    handleDelete(menu.id, statusKey, e);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
          </div>
        );
      })()}

      {/* Details Modal */}
      {selectedExpense && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/80 to-white">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                  <Receipt size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
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
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" /> Description / Purpose
                </span>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
                  {selectedExpense.description || "No specific comments or notes provided."}
                </div>
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-indigo-600" /> Expense Date
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(selectedExpense.expenseDate || selectedExpense.date, "N/A")}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" /> Submitted On
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(selectedExpense.createdAt, "Recently")}
                  </span>
                </div>
              </div>

              {/* Remarks / Approver Feedback if available */}
              {(selectedExpense.remarks || selectedExpense.comments || selectedExpense.rejectionReason) && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-800 flex items-center gap-1">
                    <AlertCircle size={14} /> Approver Feedback:
                  </span>
                  <p className="text-amber-900 break-words">
                    {selectedExpense.remarks || selectedExpense.comments || selectedExpense.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
              {/* Delete - admin only */}
              {isAdmin ? (
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
              ) : (
                <span />
              )}

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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingExpense(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
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

            <form
              onSubmit={handleSaveEdit}
              className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto"
            >
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
