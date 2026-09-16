"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, FileSpreadsheet, Calendar, ShieldAlert, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Safe helper function to extract employee ID (handles multiple formats)
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
      // Fetching all three request modules concurrently
      const [leaveRes, expRes, travelRes] = await Promise.all([
        api.get("/leave", { params: { employee: empId } }).catch(() => ({ data: [] })),
        api.get("/expenses", { params: { employee: empId } }).catch(() => ({ data: [] })),
        api.get("/travel", { params: { employee: empId } }).catch(() => ({ data: [] })),
      ]);

      const combined = [
        ...(Array.isArray(leaveRes.data) ? leaveRes.data : []).map((r) => ({
          ...r,
          type: "Leave",
          label: r.leaveType || r.reason || "Leave Request",
          dateField: r.startDate || r.createdAt
        })),
        ...(Array.isArray(expRes.data) ? expRes.data : []).map((r) => ({
          ...r,
          type: "Expense",
          label: `${r.category ? r.category.toUpperCase() : "Expense"} - ₹${r.amount || 0}`,
          dateField: r.expenseDate || r.createdAt
        })),
        ...(Array.isArray(travelRes.data) ? travelRes.data : []).map((r) => ({
          ...r,
          type: "Travel",
          label: r.purpose || r.destination || "Travel Request",
          dateField: r.startDate || r.createdAt
        })),
      ].sort((a, b) => new Date(b.dateField || b.createdAt) - new Date(a.dateField || a.createdAt));

      setRequests(combined);
    } catch (err) {
      console.error("Requests fetch error:", err);
      toast.error("Failed to load your requests history.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusVariant = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    reimbursed: "success",
    completed: "success"
  };

  const typeVariant = {
    Leave: "indigo",
    Expense: "info",
    Travel: "neutral"
  };

  const empId = getEmployeeId();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2">Loading all requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Requests</h1>
        <p className="text-sm text-slate-500 mt-1">Track and view all your submissions (Leave, Expense, Travel) in one place.</p>
      </div>

      {/* Session Warning Banner */}
      {!empId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details not found. Please ensure you are logged into the correct account.
          </p>
        </div>
      )}

      {requests.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm transition-all duration-200">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">No requests submitted yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">When you submit leaves, expenses, or travel forms, they will appear here.</p>
          </div>
        </div>
      ) : (
        /* Requests Feed with Smooth Hover Effects */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden transition-all duration-200">
          {requests.map((r) => (
            <div
              key={r._id || Math.random()}
              className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-200">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={typeVariant[r.type] || "neutral"}>
                      {r.type}
                    </Badge>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors capitalize">
                      {r.label}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Submitted on: {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[r.status] || "neutral"}>
                  {r.status ? r.status.replace(/_/g, " ") : "Pending"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}