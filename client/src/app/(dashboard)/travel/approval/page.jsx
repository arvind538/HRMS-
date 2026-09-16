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
  User
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function TravelApprovalPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // 🛠 SMART ID EXTRACTOR: Har format se user ID safely nikalne ke liye
  const getEmployeeId = (currentUser) => {
    if (!currentUser) return null;
    return currentUser.employee?._id || currentUser.employeeId || currentUser._id;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/travel", { params: { status: "pending" } });
      // API ka data direct array ya object dono ko safely handle karega
      const requestsList = Array.isArray(data) ? data : (data?.data || data?.travels || []);
      setPending(requestsList);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Travel requests load karne mein problem aayi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      toast.success(action === "approve" ? "Travel request successfully approve ho gayi 🎉" : "Travel request reject kar di gayi.");

      // Auto-refresh list after action
      fetchData();
    } catch (err) {
      console.error("Action Error:", err);
      toast.error(err.response?.data?.message || "Action fail ho gaya. Server error.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PlaneTakeoff size={24} className="text-indigo-600" />
          Travel Approvals
        </h1>
        <p className="text-sm text-slate-500 mt-1">Apni team ke pending travel requests ko review aur action karein</p>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm transition-all overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-32 gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={36} />
            <p className="text-sm text-slate-500 font-medium">Fetching pending requests...</p>
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-4">
              <MapPin className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">All Caught Up!</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Koi bhi travel request pending nahi hai. Team ke naye requests yahan show honge.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4 bg-slate-50/50">
            {pending.map((t) => (
              <div
                key={t._id}
                className="group relative bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                {/* Left side color accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 group-hover:bg-indigo-500 transition-colors" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pl-2">

                  {/* Request Details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <User size={16} className="text-indigo-500" />
                        {t.employee?.name || "Unknown Employee"}
                      </h3>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {t.purpose}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin size={15} className="text-rose-500" />
                        {t.fromLocation} <span className="text-slate-400 mx-1">→</span> {t.toLocation}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar size={15} className="text-blue-500" />
                        {new Date(t.startDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })} - {new Date(t.endDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg capitalize flex items-center gap-1.5">
                        <PlaneTakeoff size={13} className="text-slate-400" />
                        {t.modeOfTravel}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Wallet size={13} />
                        Est. ₹{t.estimatedCost?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0 pt-3 md:pt-0 md:border-l md:border-slate-100 md:pl-5 border-t border-slate-100 w-full md:w-auto justify-end">
                    <button
                      disabled={processingId === t._id}
                      onClick={() => handleAction(t._id, "approve")}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      {processingId === t._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="group-hover/btn:scale-110 transition-transform" />}
                      Approve
                    </button>

                    <button
                      disabled={processingId === t._id}
                      onClick={() => handleAction(t._id, "reject")}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      {processingId === t._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} className="group-hover/btn:scale-110 transition-transform" />}
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