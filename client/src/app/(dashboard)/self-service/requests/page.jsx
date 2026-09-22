"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  FileSpreadsheet,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  X,
  Plane,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  IndianRupee,
  Briefcase
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

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
          dateField: r.startDate || r.createdAt,
        })),
        ...(Array.isArray(expRes.data) ? expRes.data : []).map((r) => ({
          ...r,
          type: "Expense",
          label: `${r.category ? r.category.toUpperCase() : "Expense"} - ₹${r.amount || 0}`,
          dateField: r.expenseDate || r.createdAt,
        })),
        ...(Array.isArray(travelRes.data) ? travelRes.data : []).map((r) => ({
          ...r,
          type: "Travel",
          label: r.purpose || r.destination || "Travel Request",
          dateField: r.startDate || r.createdAt,
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

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedRequest(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const statusVariant = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    reimbursed: "success",
    completed: "success",
  };

  const typeVariant = {
    Leave: "indigo",
    Expense: "info",
    Travel: "neutral",
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Leave":
        return <Calendar className="w-5 h-5 text-indigo-600" />;
      case "Expense":
        return <Receipt className="w-5 h-5 text-emerald-600" />;
      case "Travel":
        return <Plane className="w-5 h-5 text-sky-600" />;
      default:
        return <FileSpreadsheet className="w-5 h-5 text-slate-600" />;
    }
  };

  const empId = getEmployeeId();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2 font-medium">Loading all requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage your submitted Leave, Expense, and Travel applications.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 w-fit">
          Total Submissions: {requests.length}
        </div>
      </div>

      {/* Session Warning */}
      {!empId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details not found. Please ensure you are logged into the correct account.
          </p>
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">No requests submitted yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When you submit leaves, expense claims, or travel applications, they will appear here.
            </p>
          </div>
        </div>
      ) : (
        /* Requests Cards Feed with Rich Hover & Pointer */
        <div className="grid grid-cols-1 gap-3">
          {requests.map((r) => (
            <div
              key={r._id || Math.random()}
              onClick={() => setSelectedRequest(r)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelectedRequest(r)}
              className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl group-hover:bg-indigo-50/80 group-hover:border-indigo-100 transition-colors duration-200 shrink-0">
                  {getTypeIcon(r.type)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={typeVariant[r.type] || "neutral"}>
                      {r.type}
                    </Badge>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                      {r.label}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                    {r.type === "Leave" && r.startDate && (
                      <span className="hidden sm:inline">
                        • {new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate || r.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {r.type === "Expense" && r.category && (
                      <span className="hidden sm:inline capitalize">• {r.category}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <Badge variant={statusVariant[r.status] || "neutral"}>
                  {r.status ? r.status.replace(/_/g, " ") : "Pending"}
                </Badge>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shadow-2xs">
                  <ArrowUpRight size={15} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details View Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  {getTypeIcon(selectedRequest.type)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">
                    {selectedRequest.type} Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ID: {selectedRequest._id || "N/A"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Status Summary Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Current Status:</span>
                  <Badge variant={statusVariant[selectedRequest.status] || "neutral"}>
                    {selectedRequest.status ? selectedRequest.status.replace(/_/g, " ") : "Pending"}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">
                  {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : ""}
                </span>
              </div>

              {/* Dynamic Content: Leave */}
              {selectedRequest.type === "Leave" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Leave Type</p>
                      <p className="font-semibold text-slate-800 capitalize mt-0.5">
                        {selectedRequest.leaveType || selectedRequest.type || "General"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Total Days</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedRequest.totalDays || selectedRequest.days || "1"} Day(s)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">From Date</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">To Date</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>

                  {selectedRequest.reason && (
                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">Reason for Leave</p>
                      <p className="text-slate-700 mt-1 whitespace-pre-line text-xs leading-relaxed">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Content: Expense */}
              {selectedRequest.type === "Expense" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Category</p>
                      <p className="font-semibold text-slate-800 capitalize mt-0.5">
                        {selectedRequest.category || "General"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Total Claim Amount</p>
                      <p className="font-semibold text-emerald-600 mt-0.5 text-base">
                        ₹{selectedRequest.amount?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400">Expense Date</p>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedRequest.expenseDate ? new Date(selectedRequest.expenseDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>

                  {selectedRequest.description && (
                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">Description / Remarks</p>
                      <p className="text-slate-700 mt-1 text-xs leading-relaxed">
                        {selectedRequest.description}
                      </p>
                    </div>
                  )}

                  {selectedRequest.receiptUrl && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <FileText size={16} />
                        <span className="text-xs font-semibold">Receipt Attachment</span>
                      </div>
                      <a
                        href={selectedRequest.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        View File
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Content: Travel */}
              {selectedRequest.type === "Travel" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Origin / Destination</p>
                      <p className="font-semibold text-slate-800 mt-0.5 truncate">
                        {selectedRequest.origin || "Origin"} → {selectedRequest.destination || "Dest"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Travel Mode</p>
                      <p className="font-semibold text-slate-800 capitalize mt-0.5">
                        {selectedRequest.mode || selectedRequest.travelType || "Flight / Train"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Departure Date</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Return Date</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>

                  {selectedRequest.purpose && (
                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">Trip Purpose</p>
                      <p className="text-slate-700 mt-1 text-xs leading-relaxed">
                        {selectedRequest.purpose}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
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