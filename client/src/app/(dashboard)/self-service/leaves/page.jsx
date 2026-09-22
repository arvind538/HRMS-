"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Send,
  Loader2,
  Calendar,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  FileText,
  UserCheck,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyLeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null); // <-- NEW: Clicked row data state
  const [form, setForm] = useState({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const getEmployeeId = useCallback(() => {
    return user?.employee?._id || user?.employee?.id || user?.employee || user?._id || user?.id;
  }, [user]);

  const fetchData = useCallback(async () => {
    const empId = getEmployeeId();
    if (!empId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/leave", {
        params: { employee: empId, employeeId: empId },
      });

      const rawData = res.data;
      const leaveList = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.leaves)
            ? rawData.leaves
            : [];

      setLeaves(leaveList);
    } catch (err) {
      console.error("Fetch leave error:", err);
      toast.error("Leaves load karne mein samasya aayi.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedLeave(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      const res = await api.post("/leave/apply", payload);
      toast.success("Leave successfully apply ho gayi!");

      const createdLeave = res?.data?.data || res?.data?.leave || res?.data;

      const newEntry = (createdLeave && typeof createdLeave === "object" && createdLeave.startDate)
        ? createdLeave
        : {
          _id: createdLeave?._id || Date.now().toString(),
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          status: "pending",
          createdAt: new Date().toISOString(),
          totalDays: Math.ceil(
            (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24) + 1
          ) || 1,
        };

      setLeaves((prev) => [newEntry, ...prev]);
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

  const calculateDays = (item) => {
    if (item.totalDays) return item.totalDays;
    if (item.startDate && item.endDate) {
      const days = Math.ceil(
        (new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24) + 1
      );
      return days > 0 ? days : 1;
    }
    return 1;
  };

  const empId = getEmployeeId();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Leaves</h1>
          <p className="text-sm text-slate-500 mt-1">
            Apni leave applications yahan se apply karein aur status track karein.
          </p>
        </div>
      </div>

      {/* Session Warning Banner */}
      {!empId && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details nahi mil rahi hain. Kripya verify karein ki account employee profile se linked hai.
          </p>
        </div>
      )}

      {/* Apply Leave Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2 pt-2">
            <Button
              type="submit"
              disabled={submitting || !empId}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-xs cursor-pointer"
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

      {/* Leaves History Table Card with Clickable Rows */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" />
            Leave History
          </h3>
          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            Total: {leaves.length}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2 font-medium">Loading leaves...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            Koi leave application abhi tak nahi hai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">From</th>
                  <th className="px-6 py-4">To</th>
                  <th className="px-6 py-4">Days</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {leaves.map((r, index) => (
                  <tr
                    key={r._id || index}
                    onClick={() => setSelectedLeave(r)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedLeave(r)}
                    className="group cursor-pointer hover:bg-indigo-50/40 focus:bg-indigo-50/50 transition-colors duration-150 focus:outline-none"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800 group-hover:text-indigo-900 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-600 transition-colors"></span>
                        <span className="capitalize">{r.leaveType || "Leave"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {r.startDate ? new Date(r.startDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {r.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {calculateDays(r)} Days
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[r.status] || "warning"}>
                        {r.status ? r.status.replace(/_/g, " ") : "pending"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                        View Details
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Details Modal on Row Click */}
      {selectedLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setSelectedLeave(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/80">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none capitalize">
                    {selectedLeave.leaveType} Leave Application
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Application ID: {selectedLeave._id || "N/A"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-medium text-slate-500">Current Status</span>
                <Badge variant={statusVariant[selectedLeave.status] || "warning"}>
                  {selectedLeave.status ? selectedLeave.status.replace(/_/g, " ") : "pending"}
                </Badge>
              </div>

              {/* Leave Duration Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">From Date</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {selectedLeave.startDate ? new Date(selectedLeave.startDate).toLocaleDateString() : "—"}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">To Date</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {selectedLeave.endDate ? new Date(selectedLeave.endDate).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>

              {/* Total Days & Applied Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Total Days</p>
                  <p className="font-bold text-indigo-600 mt-1 text-base">
                    {calculateDays(selectedLeave)} Day(s)
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Applied On</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs">
                    {selectedLeave.createdAt ? new Date(selectedLeave.createdAt).toLocaleDateString() : "Recently"}
                  </p>
                </div>
              </div>

              {/* Leave Reason */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <FileText size={13} />
                  Reason for Leave
                </p>
                <p className="text-slate-700 mt-1 text-xs leading-relaxed whitespace-pre-line">
                  {selectedLeave.reason || "No reason provided."}
                </p>
              </div>

              {/* Manager Feedback / Remarks (if present) */}
              {(selectedLeave.approverRemarks || selectedLeave.remarks || selectedLeave.rejectionReason) && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                  <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                    <UserCheck size={14} />
                    Approval / Manager Remarks
                  </p>
                  <p className="text-amber-900 mt-1 text-xs leading-relaxed">
                    {selectedLeave.approverRemarks || selectedLeave.remarks || selectedLeave.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}