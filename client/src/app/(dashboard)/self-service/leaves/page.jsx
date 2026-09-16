"use client";
import { useEffect, useState, useCallback } from "react";
import { Send, Loader2, Calendar, Clock, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyLeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Helper function to extract employee ID safely (handles multiple structures)
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
      const { data } = await api.get("/leave", {
        params: { employee: empId },
      });
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Leaves load karne mein samasya aayi.");
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
      toast.error("Employee session nahi mila. Kripya dobara login karein.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee: empId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      };

      await api.post("/leave/apply", payload);
      toast.success("Leave successfully apply ho gayi!");
      setForm({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
      fetchData();
    } catch (err) {
      console.error("Leave apply error:", err);
      toast.error(err.response?.data?.message || "Leave apply nahi ho saki.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = {
    approved: "success",
    rejected: "danger",
    pending: "warning",
  };

  const columns = [
    {
      key: "leaveType",
      label: "Type",
      render: (r) => <span className="capitalize font-medium text-slate-700">{r.leaveType}</span>,
    },
    {
      key: "startDate",
      label: "From",
      render: (r) => new Date(r.startDate).toLocaleDateString(),
    },
    {
      key: "endDate",
      label: "To",
      render: (r) => new Date(r.endDate).toLocaleDateString(),
    },
    { key: "totalDays", label: "Days" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge variant={statusVariant[r.status] || "warning"}>
          {r.status}
        </Badge>
      ),
    },
  ];

  const empId = getEmployeeId();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Leaves</h1>
        <p className="text-sm text-slate-500 mt-1">
          Apni leave applications yahan se apply karein aur status track karein.
        </p>
      </div>

      {/* Session Warning Banneragar ID na mile */}
      {!empId && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details nahi mil rahi hain. Kripya ensure karein ki aap ek employee account se logged-in hain.
          </p>
        </div>
      )}

      {/* Apply Leave Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all duration-200 hover:shadow-md">
        <h3 className="font-semibold text-slate-800 mb-4 text-base flex items-center gap-2">
          <Calendar size={18} className="text-indigo-600" />
          Apply New Leave
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Leave Type
            </label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-200 cursor-pointer hover:border-slate-300"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="hidden sm:block" />

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              From Date
            </label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-200 hover:border-slate-300"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              To Date
            </label>
            <input
              type="date"
              required
              min={form.startDate}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-200 hover:border-slate-300"
            />
          </div>

          {/* Reason */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason
            </label>
            <textarea
              required
              rows={3}
              placeholder="Leave lene ka karan yahan likhein..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-250 resize-none hover:border-slate-300"
            />
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2 pt-2">
            <Button
              type="submit"
              disabled={submitting || !empId}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {submitting ? "Applying..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </div>

      {/* Leaves History Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" />
            Leave History
          </h3>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2">Loading leaves...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              data={leaves}
              emptyText="Koi leave application abhi tak nahi hai."
            />
          </div>
        )}
      </div>
    </div>
  );
}