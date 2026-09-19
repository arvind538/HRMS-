// src/app/(dashboard)/expenses/approval/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, Banknote, Inbox, User, ShieldAlert, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function ExpenseApprovalPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Role check: Admin, HR, ya Manager allow hain, baaki employees ke liye Access Denied
  const isManager = ["admin", "hr", "manager"].includes(user?.role?.toLowerCase());

  const fetchData = useCallback(async () => {
    if (!isManager) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pendRes, apprRes] = await Promise.all([
        api.get("/expenses", { params: { status: "pending" } }),
        api.get("/expenses", { params: { status: "approved" } }),
      ]);
      setPending(Array.isArray(pendRes.data) ? pendRes.data : []);
      setApproved(Array.isArray(apprRes.data) ? apprRes.data : []);
    } catch (err) {
      toast.error("Failed to load approval data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await api.put(`/expenses/${id}/${action}`, {
        approvedBy: user?.employee?._id || user?._id,
        rejectionReason: action === "reject" ? "Not approved" : undefined,
      });
      toast.success(action === "approve" ? "Expense approved successfully." : "Expense rejected successfully.");
      fetchData();
    } catch (err) {
      toast.error("Action execution failed. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReimburse = async (id) => {
    setProcessingId(id);
    try {
      await api.put(`/expenses/${id}/reimburse`);
      toast.success("Expense marked as reimbursed successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to process reimbursement.");
    } finally {
      setProcessingId(null);
    }
  };

  const EmployeeAvatar = ({ name }) => (
    <div className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-sm uppercase border border-indigo-100 shadow-2xs transition-transform duration-300 group-hover:scale-105">
      {name && name !== "Team Member" ? name.charAt(0) : <User size={18} />}
    </div>
  );

  const EmptyState = ({ text }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-2xs">
        <Inbox size={24} />
      </div>
      <p className="text-xs font-semibold text-slate-400 tracking-wide">{text}</p>
    </div>
  );

  // 🛑 ACCESS DENIED SCREEN FOR NORMAL EMPLOYEES
  if (!isManager && !loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 font-sans antialiased text-slate-900">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-inner">
            <ShieldAlert size={36} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Access Denied</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your role (<span className="font-bold text-slate-800 capitalize">{user?.role || "Employee"}</span>) does not have permission to access this page.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className=" inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-28 flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={38} />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading approval requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-3 font-sans antialiased text-slate-900">
      {/* Header Section */}
      <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-2xl font-bold tracking-tight text-slate-900">Expense Approval</h1>
          <p className="text-sm text-slate-500 mt-1">Review, approve, or reject employee expense claims and manage reimbursements efficiently.</p>
        </div>
      </div>

      {/* Pending Approval Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Pending Approvals</h3>
          <span className="text-xs font-bold px-3.5 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200/60 shadow-2xs">
            {pending.length} Pending
          </span>
        </div>

        {pending.length === 0 ? (
          <EmptyState text="No pending expense requests found." />
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((e) => (
              <div
                key={e._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 transition-all duration-200 hover:bg-indigo-50/20 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <EmployeeAvatar name={e.employee?.name} />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {e.employee?.name || "Employee User"}{" "}
                      <span className="capitalize text-slate-400 font-normal text-xs sm:text-sm">&bull; {e.category}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {e.description || "No description provided"} &bull; {new Date(e.expenseDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span className="font-black text-slate-900 tracking-tight tabular-nums bg-slate-100 px-3.5 py-2 rounded-2xl border border-slate-200/60 text-sm">
                    ₹{e.amount.toLocaleString()}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Approve Button */}
                    <button
                      disabled={processingId === e._id}
                      onClick={() => handleAction(e._id, "approve")}
                      title="Approve Expense"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-2xl text-emerald-600 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-100 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {processingId === e._id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    </button>

                    {/* Reject Button */}
                    <button
                      disabled={processingId === e._id}
                      onClick={() => handleAction(e._id, "reject")}
                      title="Reject Expense"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-2xl text-rose-600 bg-rose-50 border border-rose-200/80 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-lg hover:shadow-rose-100 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {processingId === e._id ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Approved &mdash; Awaiting Reimbursement</h3>
          <span className="text-xs font-bold px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200/60 shadow-2xs">
            {approved.length} Approved
          </span>
        </div>

        {approved.length === 0 ? (
          <EmptyState text="No approved expenses pending reimbursement." />
        ) : (
          <div className="divide-y divide-slate-100">
            {approved.map((e) => (
              <div
                key={e._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 transition-all duration-200 hover:bg-indigo-50/20 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <EmployeeAvatar name={e.employee?.name} />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {e.employee?.name || "Employee User"}{" "}
                      <span className="capitalize text-slate-400 font-normal text-xs sm:text-sm">&bull; {e.category}</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-500 tabular-nums">
                      ₹{e.amount.toLocaleString()} &bull; <span className="text-slate-400 font-normal">{new Date(e.expenseDate).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                {/* Mark Reimbursed Button */}
                <button
                  disabled={processingId === e._id}
                  onClick={() => handleReimburse(e._id)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-100 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  {processingId === e._id ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
                  Mark Reimbursed
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}