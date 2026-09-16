"use client";
import { useEffect, useState } from "react";
import { Loader2, Calendar, AlertTriangle, Clock, CalendarDays } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";

const TYPE_LABELS = {
  pf: "Provident Fund (PF)",
  esi: "ESI Compliance",
  tds: "TDS Filings",
  "professional-tax": "Professional Tax",
  labour: "Labour Compliance"
};

export default function ComplianceCalendarPage() {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/compliance/calendar")
      .then(({ data }) => setUpcoming(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load compliance calendar."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  const getDaysLeft = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header Section */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <CalendarDays size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Compliance Calendar & Deadlines
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track upcoming statutory filing deadlines, schedules, and due dates across all compliance types.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      {upcoming.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center space-y-3 shadow-sm">
          <Calendar className="mx-auto text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">No upcoming filing deadlines found.</p>
          <p className="text-xs text-slate-400">All statutory filings are up to date or no active records have been created yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {upcoming.map((r) => {
            const daysLeft = getDaysLeft(r.dueDate);
            const isUrgent = daysLeft <= 7 && daysLeft >= 0;
            const isOverdue = daysLeft < 0;

            return (
              <div
                key={r._id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors hover:bg-slate-50/80"
              >
                {/* Left Information */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 sm:w-16 py-2 px-1 text-center shrink-0 rounded-xl border ${isOverdue
                    ? "bg-slate-100 border-slate-300 text-slate-500"
                    : isUrgent
                      ? "bg-rose-50 border-rose-100 text-rose-600"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}>
                    <p className="text-base sm:text-lg font-bold leading-none">
                      {isOverdue ? Math.abs(daysLeft) : daysLeft}
                    </p>
                    <p className="text-[10px] uppercase font-semibold mt-1 tracking-wider">
                      {isOverdue ? "days past" : daysLeft === 1 ? "day left" : "days left"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-bold text-slate-800">
                      {TYPE_LABELS[r.type] || r.type}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        Due: {new Date(r.dueDate).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="text-slate-700 font-semibold">
                        ₹{r.totalAmount?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Badge Status */}
                {isUrgent && (
                  <div className="self-start sm:self-center">
                    <Badge variant="danger" className="flex items-center gap-1.5 px-3 py-1 text-xs">
                      <AlertTriangle size={12} /> Urgent Deadline
                    </Badge>
                  </div>
                )}
                {isOverdue && (
                  <div className="self-start sm:self-center">
                    <Badge variant="warning" className="flex items-center gap-1.5 px-3 py-1 text-xs">
                      <AlertTriangle size={12} /> Overdue
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}