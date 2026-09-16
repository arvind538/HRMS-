"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Send, Receipt, PlusCircle, History } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = ["travel", "food", "supplies", "accommodation", "communication", "other"];

export default function SubmitExpensePage() {
  const { user } = useAuth();
  const [myExpenses, setMyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "travel", amount: "", description: "", expenseDate: "" });

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
      fetchMyExpenses(); // Auto-refresh table after submission
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error(err.response?.data?.message || "Failed to submit expense. Server error.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = { pending: "warning", approved: "info", rejected: "danger", reimbursed: "success" };

  const columns = [
    { key: "category", label: "Category", render: (r) => <span className="capitalize font-medium text-slate-800">{r.category}</span> },
    { key: "amount", label: "Amount", render: (r) => <span className="font-bold text-slate-900">₹{Number(r.amount).toLocaleString()}</span> },
    { key: "expenseDate", label: "Date", render: (r) => <span className="text-slate-500 text-xs">{new Date(r.expenseDate).toLocaleDateString()}</span> },
    { key: "description", label: "Description", render: (r) => <span className="text-slate-600 truncate max-w-xs block">{r.description}</span> },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status] || "warning"}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-2 max-w-7xl mx-auto px-4 sm:px-4 lg:px-4 py-2 font-sans antialiased text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Submit Expense</h1>
          <p className="text-sm text-slate-500 mt-0.5">Claim new business expenses and monitor their approval status history.</p>
        </div>
      </div>

      {/* Expense Form Card with Smooth Interaction */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">
        <h3 className="font-bold text-slate-800 mb-6 text-base flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
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
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-slate-300"
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
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-slate-300"
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
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:border-slate-300"
              placeholder="e.g. Client meeting cab fare"
            />
          </div>

          <div className="sm:col-span-2 pt-3 flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-indigo-100 cursor-pointer"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? "Submitting Request..." : "Submit Expense"}
            </Button>
          </div>
        </form>
      </div>

      {/* Expense History Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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
    </div>
  );
}