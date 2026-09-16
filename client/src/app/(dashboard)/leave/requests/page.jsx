// src/app/(dashboard)/leave/requests/page.jsx (or your correct path)
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LeaveRequests() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    // Agar auth abhi load ho raha hai, toh wait karo
    if (authLoading) return;

    console.log("Logged In User Context:", user);

    // Dynamic Employee ID fallback
    const empId =
      user?.employee?._id ||
      user?.employee ||
      user?._id ||
      user?.id;

    if (!empId) {
      setError("Aapka account kisi Employee record se linked nahi hai.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Backend request with employee ID params
      const { data } = await api.get("/leave", {
        params: { employee: typeof empId === "object" ? empId._id : empId },
      });

      const leaveList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setRequests(leaveList);
    } catch (err) {
      console.error("API Error Full Details:", err.response || err);

      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.status === 401
          ? "Session expire ho chuka hai, kripya dobara login karein."
          : err.response?.status === 403
            ? "Aapko leaves access karne ki permission nahi hai."
            : "Leave requests fetch nahi ho sakeen (Status: " + (err.response?.status || "Network Error") + ")");

      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchRequests();
    }
  }, [fetchRequests, authLoading]);

  const getStatusBadge = (status) => {
    const config = {
      approved: {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
        icon: CheckCircle2,
        dot: "bg-emerald-500",
      },
      rejected: {
        bg: "bg-rose-50 text-rose-700 border-rose-200/60",
        icon: XCircle,
        dot: "bg-rose-500",
      },
      pending: {
        bg: "bg-amber-50 text-amber-700 border-amber-200/60",
        icon: Clock,
        dot: "bg-amber-500",
      },
    };

    const current = config[status?.toLowerCase()] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        <span className="capitalize">{status || "Pending"}</span>
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Leave Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track, monitor aur manage karein apni leave applications
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-2xl border border-slate-200 transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading || authLoading ? (
          <div className="p-12 sm:p-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Applications load ho rahi hain...</p>
              <p className="text-xs text-slate-400 mt-0.5">Kripya thoda intezar karein</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 sm:p-16 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Request Failed</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchRequests}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer"
            >
              Dobara Try Karein
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Koi Leave Record Nahi Mila</h3>
            <p className="text-xs text-slate-500 mt-1">
              Aapne abhi tak koi application submit nahi ki hai.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Leave Type</th>
                    <th className="py-3.5 px-6">Timeline</th>
                    <th className="py-3.5 px-6">Duration</th>
                    <th className="py-3.5 px-6">Reason</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {requests.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-800 capitalize text-xs">
                            {r.leaveType}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <span>{formatDate(r.startDate)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(r.endDate)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          {r.totalDays} {r.totalDays === 1 ? "Day" : "Days"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-slate-600 text-xs max-w-xs truncate" title={r.reason}>
                          {r.reason || "—"}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {requests.map((r) => (
                <div key={r._id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 capitalize text-xs">
                          {r.leaveType}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {r.totalDays} {r.totalDays === 1 ? "Day" : "Days"}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span>{formatDate(r.startDate)}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(r.endDate)}</span>
                    </div>
                  </div>

                  {r.reason && (
                    <div className="text-xs text-slate-600 pt-1">
                      <span className="font-medium text-slate-700">Reason: </span>
                      {r.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}