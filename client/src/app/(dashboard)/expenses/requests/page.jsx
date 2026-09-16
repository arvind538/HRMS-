"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, User } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";

export default function ExpenseRequestsPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/expenses", { params: statusFilter ? { status: statusFilter } : {} });
      const expensesList = Array.isArray(data) ? data : (data?.data || data?.expenses || []);
      setExpenses(expensesList);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Failed to load expense requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusVariant = { pending: "warning", approved: "info", rejected: "danger", reimbursed: "success" };

  // Employee Name Extractor — ab backend populate + employeeName dono se milega
  const getEmployeeName = (r) => {
    // 1. Populated employee object (backend .populate("employee", "name email fullName username"))
    if (r.employee && typeof r.employee === "object") {
      const populatedName =
        r.employee.name ||
        r.employee.fullName ||
        r.employee.username ||
        r.employee.email?.split("@")[0];
      if (populatedName) return populatedName;
    }

    // 2. Denormalized employeeName field (saved directly at submit time)
    if (r.employeeName && r.employeeName !== "Team Member") return r.employeeName;

    // 3. Other common name fields (legacy/fallback data)
    if (r.userName) return r.userName;
    if (r.name) return r.name;
    if (r.email) return r.email.split("@")[0];

    // 4. Employee stored as an email string
    if (typeof r.employee === "string" && r.employee.includes("@")) {
      return r.employee.split("@")[0];
    }

    // 5. Old/broken records where employee is just a raw ID string
    if (typeof r.employee === "string" && r.employee.length > 5) {
      return `User (${r.employee.slice(-4)})`;
    }

    return "Employee User";
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => {
        const empName = getEmployeeName(r);
        const isFallback = empName === "Employee User" || empName.startsWith("User (");
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
              {!isFallback ? empName.charAt(0) : <User size={14} />}
            </div>
            <span className="font-semibold text-slate-800 capitalize">{empName}</span>
          </div>
        );
      }
    },
    { key: "category", label: "Category", render: (r) => <span className="capitalize font-medium text-slate-700">{r.category}</span> },
    { key: "amount", label: "Amount", render: (r) => <span className="font-bold text-slate-900">₹{Number(r.amount || 0).toLocaleString()}</span> },
    { key: "expenseDate", label: "Date", render: (r) => <span className="text-slate-500 text-xs">{r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : "—"}</span> },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status] || "warning"}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans antialiased text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and review all submitted employee expense claims.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["", "pending", "approved", "rejected", "reimbursed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 cursor-pointer shadow-2xs ${statusFilter === s
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

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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
    </div>
  );
}