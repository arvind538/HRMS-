"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, Banknote, Inbox, User } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function ExpenseApprovalPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await api.put(`/expenses/${id}/${action}`, {
        approvedBy: user?.employee?._id,
        rejectionReason: action === "reject" ? "Not approved" : undefined
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
    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shadow-2xs transition-transform duration-200 group-hover:scale-105">
      {name ? name.charAt(0) : <User size={16} />}
    </div>
  );

  const EmptyState = ({ text }) => (
    <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-2xs">
        <Inbox size={20} />
      </div>
      <p className="text-xs font-semibold text-slate-400 tracking-wide">{text}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={34} />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading approval requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans antialiased text-slate-900 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Approval</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review, approve, or reject employee expense claims and manage reimbursements.</p>
        </div>
      </div>

      {/* Pending Approval Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-base">Pending Approvals</h3>
          <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200/60 shadow-2xs">
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
                className="flex items-center justify-between gap-4 px-6 py-4 transition-all duration-200 hover:bg-slate-50/80 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <EmployeeAvatar name={e.employee?.name} />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {e.employee?.name || "Employee User"}{" "}
                      <span className="capitalize text-slate-400 font-normal">&bull; {e.category}</span>
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {e.description || "No description provided"} &bull; {new Date(e.expenseDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-extrabold text-slate-900 tracking-tight tabular-nums bg-slate-100/70 px-3 py-1.5 rounded-xl border border-slate-200/60 text-sm">
                    ₹{e.amount.toLocaleString()}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Approve Button */}
                    <button
                      disabled={processingId === e._id}
                      onClick={() => handleAction(e._id, "approve")}
                      title="Approve Expense"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-emerald-600 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-100 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {processingId === e._id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </button>

                    {/* Reject Button */}
                    <button
                      disabled={processingId === e._id}
                      onClick={() => handleAction(e._id, "reject")}
                      title="Reject Expense"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-rose-600 bg-rose-50 border border-rose-200/80 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md hover:shadow-rose-100 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {processingId === e._id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <XCircle size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-base">Approved &mdash; Awaiting Reimbursement</h3>
          <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-200/60 shadow-2xs">
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
                className="flex items-center justify-between gap-4 px-6 py-4 transition-all duration-200 hover:bg-slate-50/80 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <EmployeeAvatar name={e.employee?.name} />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {e.employee?.name || "Employee User"}{" "}
                      <span className="capitalize text-slate-400 font-normal">&bull; {e.category}</span>
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-100 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  {processingId === e._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Banknote size={16} />
                  )}
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