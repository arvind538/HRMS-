// src/app/(dashboard)/expenses/employee/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Send, Receipt, PlusCircle, History, Pencil, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = ["travel", "food", "supplies", "accommodation", "communication", "other"];

export default function SubmitExpensePage() {
  const { user } = useAuth();
  const [myExpenses, setMyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "travel", amount: "", description: "", expenseDate: "" });

  // Edit Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editForm, setEditForm] = useState({ category: "travel", amount: "", description: "", expenseDate: "" });
  const [updating, setUpdating] = useState(false);

  // Delete Confirmation Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Smart ID Extractor: Handles errors and retrieves valid ID safely
  const getEmployeeId = (currentUser) => {
    if (!currentUser) return null;
    return currentUser.employee?._id || currentUser.employeeId || currentUser._id;
  };

  const fetchMyExpenses = useCallback(async () => {
    const empId = getEmployeeId(user);
    if (!empId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/expenses", { params: { employee: empId } });
      const expensesList = Array.isArray(data) ? data : (data?.data || data?.expenses || []);
      setMyExpenses(expensesList);
    } catch (err) {
      console.error("Expense Fetch Error:", err);
      toast.error("Failed to load your expense history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMyExpenses();
    }
  }, [fetchMyExpenses, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const empId = getEmployeeId(user);
    if (!empId) {
      return toast.error("Account details not found. Please refresh the page.");
    }

    setSubmitting(true);
    try {
      await api.post("/expenses", {
        ...form,
        employee: empId,
        amount: Number(form.amount)
      });

      toast.success("Expense submitted successfully.");
      setForm({ category: "travel", amount: "", description: "", expenseDate: "" });
      fetchMyExpenses();
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error(err.response?.data?.message || "Failed to submit expense. Server error.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (expense) => {
    if (expense.status !== "pending") {
      return toast.warning("Only pending expenses can be edited.");
    }
    setEditingExpenseId(expense._id || expense.id);
    setEditForm({
      category: expense.category || "travel",
      amount: expense.amount || "",
      description: expense.description || "",
      expenseDate: expense.expenseDate ? expense.expenseDate.split("T")[0] : ""
    });
    setEditModalOpen(true);
  };

  // Handle Update Submission
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.put(`/expenses/${editingExpenseId}`, {
        ...editForm,
        amount: Number(editForm.amount)
      });
      toast.success("Expense updated successfully.");
      setEditModalOpen(false);
      fetchMyExpenses();
    } catch (err) {
      console.error("Update Error:", err);
      toast.error(err.response?.data?.message || "Failed to update expense.");
    } finally {
      setUpdating(false);
    }
  };

  // Handle Delete Confirmation Trigger
  const handleOpenDelete = (expense) => {
    if (expense.status !== "pending") {
      return toast.warning("Only pending expenses can be deleted.");
    }
    setDeletingExpenseId(expense._id || expense.id);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deletingExpenseId}`);
      toast.success("Expense deleted successfully.");
      setDeleteModalOpen(false);
      setDeletingExpenseId(null);
      fetchMyExpenses();
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error(err.response?.data?.message || "Failed to delete expense.");
    } finally {
      setDeleting(false);
    }
  };

  const statusVariant = { pending: "warning", approved: "info", rejected: "danger", reimbursed: "success" };

  const columns = [
    { key: "category", label: "Category", render: (r) => <span className="capitalize font-medium text-slate-800">{r.category}</span> },
    { key: "amount", label: "Amount", render: (r) => <span className="font-bold text-slate-900">₹{Number(r.amount).toLocaleString()}</span> },
    { key: "expenseDate", label: "Date", render: (r) => <span className="text-slate-500 text-xs">{new Date(r.expenseDate).toLocaleDateString()}</span> },
    { key: "description", label: "Description", render: (r) => <span className="text-slate-600 truncate max-w-xs block">{r.description}</span> },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status] || "warning"}>{r.status}</Badge> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.status === "pending" ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenEdit(r)}
                className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-all duration-200 cursor-pointer shadow-2xs"
                title="Edit Expense"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleOpenDelete(r)}
                className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-all duration-200 cursor-pointer shadow-2xs"
                title="Delete Expense"
              >
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Locked</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans antialiased text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6 bg-white p-6 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Submit Expense</h1>
          <p className="text-sm text-slate-500 mt-1">Claim new business expenses and monitor their approval status history.</p>
        </div>
      </div>

      {/* Expense Form Card with Smooth Interaction */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 transition-all duration-300 hover:shadow-md">
        <h3 className="font-bold text-slate-800 mb-6 text-base flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Receipt size={20} />
          </div>
          New Expense Details
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-slate-300"
            >
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:border-slate-300"
              placeholder="e.g. 1200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Expense Date</label>
            <input
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:border-slate-300"
              placeholder="e.g. Client meeting cab fare"
            />
          </div>

          <div className="sm:col-span-2 pt-3 flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-indigo-100 cursor-pointer active:scale-95"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? "Submitting Request..." : "Submit Expense"}
            </Button>
          </div>
        </form>
      </div>

      {/* Expense History Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800 text-base">My Expense History</h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
            Total Records: {myExpenses.length}
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm text-slate-500 font-medium">Loading history records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table
              columns={columns}
              data={myExpenses}
              emptyText="You have not submitted any expenses yet."
            />
          </div>
        )}
      </div>

      {/* EDIT EXPENSE MODAL */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Expense Claim">
        <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</label>
            <select
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
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
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</label>
            <input
              type="text"
              required
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
              Update Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Expense Claim">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this expense claim? This action cannot be undone.
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