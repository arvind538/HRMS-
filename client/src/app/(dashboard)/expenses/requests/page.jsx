// src/app/(dashboard)/expenses/requests/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, User, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function ExpenseRequestsPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editForm, setEditForm] = useState({ category: "", amount: "", description: "", expenseDate: "", status: "pending" });
  const [updating, setUpdating] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/expenses", { params: statusFilter ? { status: statusFilter } : {} });
      const expensesList = Array.isArray(data) ? data : (data?.data || data?.expenses || []);
      setExpenses(expensesList);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Failed to load expense requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusVariant = { pending: "warning", approved: "info", rejected: "danger", reimbursed: "success" };

  const getEmployeeName = (r) => {
    console.log("🔍 Inspecting Expense Row in Frontend:", r); // Yahan browser console me dikhega

    if (r.employee) {
      if (typeof r.employee === "object") {
        return r.employee.name || r.employee.fullName || r.employee.username || "Team Member";
      }
      return r.employee;
    }
    return r.employeeName || r.userName || "Team Member";
  };

  const handleOpenEdit = (expense) => {
    setSelectedExpense(expense);
    setEditForm({
      category: expense.category || "travel",
      amount: expense.amount || "",
      description: expense.description || "",
      expenseDate: expense.expenseDate ? expense.expenseDate.split("T")[0] : "",
      status: expense.status || "pending"
    });
    setEditModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setUpdating(true);
    try {
      await api.put(`/expenses/${selectedExpense._id || selectedExpense.id}`, {
        ...editForm,
        amount: Number(editForm.amount)
      });
      toast.success("Expense request updated successfully.");
      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update expense.");
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deleteId}`);
      toast.success("Expense request deleted successfully.");
      setDeleteModalOpen(false);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to delete expense.");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => {
        const empName = getEmployeeName(r);
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase border border-indigo-100 shadow-2xs shrink-0">
              {empName !== "Employee User" ? empName.charAt(0) : <User size={15} />}
            </div>
            <span className="font-semibold text-slate-800 capitalize tracking-tight">{empName}</span>
          </div>
        );
      }
    },
    { key: "category", label: "Category", render: (r) => <span className="capitalize font-medium text-slate-700">{r.category}</span> },
    { key: "amount", label: "Amount", render: (r) => <span className="font-bold text-slate-900">₹{Number(r.amount || 0).toLocaleString()}</span> },
    { key: "expenseDate", label: "Date", render: (r) => <span className="text-slate-500 text-xs font-medium">{r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : "—"}</span> },
    { key: "description", label: "Description", render: (r) => <span className="text-slate-600 truncate max-w-xs block font-normal">{r.description || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status] || "warning"}>{r.status}</Badge> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const expenseId = r._id || r.id;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenEdit(r)}
              className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200/60 transition-all duration-200 cursor-pointer shadow-2xs"
              title="Edit Expense"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => { setDeleteId(expenseId); setDeleteModalOpen(true); }}
              className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl border border-slate-200/60 transition-all duration-200 cursor-pointer shadow-2xs"
              title="Delete Expense"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans antialiased text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4 bg-white p-6 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage, review, approve, and track all submitted.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["", "pending", "approved", "rejected", "reimbursed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 cursor-pointer shadow-2xs ${statusFilter === s
                ? "bg-indigo-600 text-white shadow-indigo-100 shadow-md"
                : "bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 active:scale-95"
                }`}
            >
              {s === "" ? "All Requests" : s}
            </button>
          ))}

          <button
            onClick={fetchData}
            title="Refresh list"
            className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm text-slate-500 font-medium">Loading expense requests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table columns={columns} data={expenses} emptyText="No expense requests found." />
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Expense Request">
        <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</label>
            <select
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              {["travel", "food", "supplies", "accommodation", "communication", "other"].map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Expense Date</label>
            <input
              type="date"
              required
              value={editForm.expenseDate}
              onChange={(e) => setEditForm({ ...editForm, expenseDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer capitalize"
            >
              {["pending", "approved", "rejected", "reimbursed"].map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              loading={updating}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
            >
              Update Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Expense Request">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Kya aap sachme is expense request ko delete karna chahte hain? Yeh action undo nahi kiya ja sakta.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={confirmDelete}
              loading={deleting}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}