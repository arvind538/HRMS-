"use client";
import { useEffect, useState, useCallback } from "react";
import { Send, Loader2, PlusCircle, Receipt } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "travel", amount: "", description: "", expenseDate: "" });

  const getEmployeeId = useCallback(() => {
    return user?.employee?._id || user?.employee || user?._id || user?.id;
  }, [user]);

  const fetchData = useCallback(async () => {
    const empId = getEmployeeId();
    if (!empId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/expenses", { params: { employee: empId } });
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Expenses fetch error:", err);
      toast.error("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const empId = getEmployeeId();

    if (!empId) {
      toast.error("Employee session details not found. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        employee: empId,
        amount: Number(form.amount),
      };

      await api.post("/expenses", payload);
      toast.success("Expense submitted successfully!");
      setForm({ category: "travel", amount: "", description: "", expenseDate: "" });
      fetchData();
    } catch (err) {
      console.error("Expense submit error:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to submit expense. Please check all fields.";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = { pending: "warning", approved: "info", rejected: "danger", reimbursed: "success" };

  const columns = [
    { key: "category", label: "Category", render: (r) => <span className="capitalize font-medium text-slate-800">{r.category}</span> },
    { key: "amount", label: "Amount", render: (r) => <span className="font-semibold text-slate-900">₹{r.amount?.toLocaleString()}</span> },
    { key: "expenseDate", label: "Date", render: (r) => new Date(r.expenseDate).toLocaleDateString() },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Expenses</h1>
        <p className="text-sm text-slate-500 mt-1">Submit your expenses and track their status.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 transition-all duration-200">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <PlusCircle size={20} />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Submit New Expense</h3>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
            >
              <option value="travel">Travel</option>
              <option value="food">Food</option>
              <option value="supplies">Supplies</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amount (₹)</label>
            <input
              type="number"
              required
              placeholder="Enter amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="mt-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date</label>
            <input
              type="date"
              required
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              className="mt-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
            <input
              type="text"
              placeholder="Brief details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-2 w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <Button type="submit" loading={submitting} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm cursor-pointer">
              <Send size={16} /> Submit Expense
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Receipt size={18} className="text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">Expense History</h3>
        </div>
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2">Loading expenses...</p>
          </div>
        ) : (
          <Table columns={columns} data={expenses} emptyText="No expenses submitted yet." />
        )}
      </div>
    </div>
  );
}