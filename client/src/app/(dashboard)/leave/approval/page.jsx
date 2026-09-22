// src/app/(dashboard)/leaves/approvals/page.jsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  ArrowRight,
  FileText,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

// Allowed roles for reviewing/approving team leave requests
const ALLOWED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

function AccessDeniedScreen({ role, router }) {
  return (
    <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center">
        <ShieldAlert size={38} className="text-rose-500" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Access Denied
        </h2>
        <p className="text-sm font-medium text-slate-500 max-w-xs">
          Your role ({role || "employee"}) does not have permission to approve team leaves.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold shadow-sm shadow-indigo-200 transition-all duration-200 hover:shadow-md hover:shadow-indigo-300 active:scale-95 cursor-pointer"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default function LeaveApproval() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Safe normalized role extraction (handles string, object, array)
  const currentRole = useMemo(() => {
    if (!user) return null;
    const rawRole = user.role || user.userRole || user.type;
    if (typeof rawRole === "string") return rawRole.toLowerCase().trim();
    if (typeof rawRole === "object" && rawRole !== null) {
      return (rawRole.name || rawRole.title || "").toLowerCase().trim();
    }
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      return String(user.roles[0]).toLowerCase().trim();
    }
    return null;
  }, [user]);

  const roleChecked = !authLoading;
  const hasAccess = Boolean(currentRole && ALLOWED_ROLES.includes(currentRole));

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/leave", { params: { status: "pending" } });
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.leaves)
            ? resData.leaves
            : [];

      setApprovals(list);
    } catch (err) {
      console.error("Fetch pending leaves error:", err.response || err);
      if (err.response?.status === 403) {
        setError("Your manager/staff account is not authorized by the backend to fetch approvals.");
      } else {
        setError(
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load pending applications."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleChecked && hasAccess) {
      fetchPending();
    } else if (roleChecked) {
      setLoading(false);
    }
  }, [roleChecked, hasAccess, fetchPending]);

  const approverId =
    user?.employee?._id ||
    user?.employee?.id ||
    user?.employee ||
    user?._id ||
    user?.id;

  const handleDecision = async (id, decision, reason = "") => {
    setProcessingId(id);
    try {
      const endpoint = decision === "approve" ? `/leave/${id}/approve` : `/leave/${id}/reject`;
      const payload = decision === "approve"
        ? { approvedBy: approverId, reviewerId: approverId, reviewerRole: currentRole }
        : {
          approvedBy: approverId,
          reviewerId: approverId,
          reviewerRole: currentRole,
          rejectionReason: reason.trim() || `Rejected by ${currentRole}`
        };

      const res = await api.put(endpoint, payload);

      if (res.status === 200 || res.status === 201) {
        toast.success(`Leave application ${decision === "approve" ? "approved" : "rejected"} successfully!`);

        if (rejectModalOpen) {
          setRejectModalOpen(false);
          setRejectionReason("");
          setSelectedLeaveId(null);
        }

        setApprovals((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      console.error("Decision update error:", err.response || err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.status === 403
          ? "Access denied: You do not have permission to approve/reject leaves."
          : "An error occurred while processing this action.");

      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (id) => {
    setSelectedLeaveId(id);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  };

  const getEmployeeName = (item) => {
    const target = item.employee || item.user || item.applicant;
    if (target && typeof target === "object") {
      return target.name || target.fullName || target.username || "Staff Member";
    }
    return item.employeeName || item.userName || item.name || "Staff Member";
  };

  const getEmployeeCode = (item) => {
    const target = item.employee || item.user;
    return target?.employeeId || target?.empId || target?.code || item.employeeId || "";
  };

  const getEmployeeDepartment = (item) => {
    const target = item.employee || item.user;
    return target?.department?.name || target?.department || target?.designation || item.department || "";
  };

  if (!roleChecked) {
    return (
      <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={38} className="animate-spin text-indigo-600" />
        <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
          Verifying access permissions...
        </p>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDeniedScreen role={currentRole} router={router} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-0 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pending Leave Approvals
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {approvals.length} Pending
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
              {currentRole} panel
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review team leave requests and process approvals or rejections seamlessly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPending}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-2xl border border-slate-200 transition disabled:opacity-60 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Loading pending approvals...</p>
          </div>
        ) : error ? (
          <div className="p-16 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Failed to Load Data</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchPending}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">All Caught Up!</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending leave applications awaiting your review.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Leave Type</th>
                    <th className="py-3.5 px-6">Timeline</th>
                    <th className="py-3.5 px-6">Duration</th>
                    <th className="py-3.5 px-6">Reason</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {approvals.map((item) => {
                    const empName = getEmployeeName(item);
                    const empCode = getEmployeeCode(item);
                    const dept = getEmployeeDepartment(item);
                    const isProcessing = processingId === item._id;

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0 uppercase shadow-xs">
                              {empName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 leading-tight text-xs sm:text-sm">{empName}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                                {empCode && <span>{empCode}</span>}
                                {empCode && dept && <span>•</span>}
                                {dept && <span>{dept}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                            <FileText className="w-3 h-3 text-slate-500" />
                            {item.leaveType || item.type || "General"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <span>{formatDate(item.startDate)}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(item.endDate)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/50">
                            {item.totalDays || 1} {(item.totalDays || 1) === 1 ? "day" : "days"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-xs text-slate-600 max-w-xs truncate" title={item.reason || item.description}>
                            {item.reason || item.description || "—"}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleDecision(item._id, "approve")}
                              className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isProcessing ? "Processing..." : "Approve"}</span>
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() => openRejectDialog(item._id)}
                              className="inline-flex items-center gap-1 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {approvals.map((item) => {
                const empName = getEmployeeName(item);
                const empCode = getEmployeeCode(item);
                const isProcessing = processingId === item._id;

                return (
                  <div key={item._id} className="p-4 space-y-3.5 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0 uppercase shadow-xs">
                          {empName.charAt(0)}
                        </div>
                        <div className="truncate">
                          <h4 className="font-semibold text-slate-900 text-sm truncate">{empName}</h4>
                          {empCode && <p className="text-[11px] text-slate-400 font-mono">{empCode}</p>}
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/50 shrink-0">
                        {item.totalDays || 1} {(item.totalDays || 1) === 1 ? "day" : "days"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium text-slate-500">Leave Type:</span>
                        <span className="font-semibold text-slate-800 capitalize">{item.leaveType || item.type || "General"}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium text-slate-500">Duration:</span>
                        <span className="font-semibold text-slate-700 font-mono">
                          {formatDate(item.startDate)} - {formatDate(item.endDate)}
                        </span>
                      </div>
                      {(item.reason || item.description) && (
                        <div className="pt-1 border-t border-slate-200/60 text-slate-600">
                          <span className="font-medium text-slate-500">Reason: </span>
                          <span>{item.reason || item.description}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        disabled={isProcessing}
                        onClick={() => handleDecision(item._id, "approve")}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isProcessing ? "Wait..." : "Approve"}</span>
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => openRejectDialog(item._id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-bold text-slate-900">Reject Leave Application</h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Please provide a reason for rejection so the employee is clearly informed.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Critical project deadline, team capacity constraints..."
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition bg-slate-50/50"
            />
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === selectedLeaveId}
                onClick={() => handleDecision(selectedLeaveId, "reject", rejectionReason)}
                className="px-6 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-2xl transition shadow-md shadow-rose-100 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}