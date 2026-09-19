"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Wallet,
  PlaneTakeoff,
  User,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function TravelApprovalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Role check: Allow only Admin, HR, Manager
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";
  // Agar aapke system mein sirf 'admin' aur 'hr' ko access dena hai:
  // const hasAccess = ["admin", "hr", "manager"].includes(userRole);

  // 🛠 SMART ID EXTRACTOR
  const getEmployeeId = (currentUser) => {
    if (!currentUser) return null;
    return currentUser.employee?._id || currentUser.employeeId || currentUser._id;
  };

  const fetchData = useCallback(async () => {
    if (isEmployee) return;
    setLoading(true);
    try {
      const { data } = await api.get("/travel", { params: { status: "pending" } });
      const requestsList = Array.isArray(data) ? data : (data?.data || data?.travels || []);

      const pendingOnly = requestsList.filter(item => item.status === "pending");
      setPending(pendingOnly);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Travel requests load karne mein problem aayi.");
    } finally {
      setLoading(false);
    }
  }, [isEmployee]);

  useEffect(() => {
    if (!isEmployee) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData, isEmployee]);

  const handleAction = async (id, action) => {
    const empId = getEmployeeId(user);
    if (!empId) {
      return toast.error("Aapka account detail load nahi hua. Page refresh karein.");
    }

    setProcessingId(id);
    try {
      const payload = { approvedBy: empId };
      if (action === "reject") payload.rejectionReason = "Not approved at this time";

      await api.put(`/travel/${id}/${action}`, payload);

      toast.success(
        action === "approve"
          ? "Travel request successfully approve ho gayi 🎉"
          : "Travel request reject kar di gayi."
      );

      // ✨ Instant UI Removal: Action lete hi turant list se hata do
      setPending((prev) => prev.filter((item) => item._id !== id));

    } catch (err) {
      console.error("Action Error:", err);
      toast.error(err.response?.data?.message || "Action fail ho gaya. Server error.");
    } finally {
      setProcessingId(null);
    }
  };

  // 🚫 Access Denied View for regular Employees (Aapke image ke mutabiq)
  if (isEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          Your role (<span className="capitalize font-semibold text-slate-700">{user?.role || "Employee"}</span>) does not have permission to access this page.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all duration-200"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <PlaneTakeoff size={22} />
            </div>
            Travel Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">Apni team ke pending travel requests ko review aur action karein</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-700 text-xs font-semibold self-start sm:self-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          {pending.length} Pending Request{pending.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[420px] transition-all">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-36 gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={36} />
            <p className="text-sm text-slate-500 font-medium">Fetching pending requests...</p>
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center px-4">
            <div className="w-20 h-20 bg-indigo-50/50 rounded-2xl flex items-center justify-center border border-indigo-100/60 mb-4 shadow-inner">
              <ShieldCheck className="text-indigo-500" size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">All Caught Up!</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Koi bhi travel request pending nahi hai. Team ke naye requests yahan show honge.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4 bg-slate-50/60">
            {pending.map((t) => (
              <div
                key={t._id}
                className="group relative bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden"
              >
                {/* Left side color accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 group-hover:bg-indigo-600 transition-colors duration-300" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pl-2">

                  {/* Request Details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <User size={14} />
                        </span>
                        {t.employee?.name || "Unknown Employee"}
                      </h3>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                        {t.purpose}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                        <MapPin size={15} className="text-rose-500" />
                        <span>{t.fromLocation}</span>
                        <span className="text-slate-400 mx-0.5">→</span>
                        <span>{t.toLocation}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Calendar size={14} className="text-blue-500" />
                        {new Date(t.startDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })} — {new Date(t.endDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                      <span className="bg-slate-100/80 border border-slate-200/70 text-slate-600 px-2.5 py-1 rounded-lg capitalize flex items-center gap-1.5">
                        <PlaneTakeoff size={13} className="text-slate-400" />
                        {t.modeOfTravel}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold">
                        <Wallet size={13} />
                        Est. ₹{Number(t.estimatedCost || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons with smooth hover effects */}
                  <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 md:border-l md:border-slate-100 md:pl-5 border-t border-slate-100 w-full md:w-auto justify-end">
                    <button
                      disabled={processingId === t._id}
                      onClick={() => handleAction(t._id, "approve")}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-sm hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      {processingId === t._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                      )}
                      Approve
                    </button>

                    <button
                      disabled={processingId === t._id}
                      onClick={() => handleAction(t._id, "reject")}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-sm hover:shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      {processingId === t._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <XCircle size={16} className="group-hover/btn:scale-110 transition-transform" />
                      )}
                      Reject
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}