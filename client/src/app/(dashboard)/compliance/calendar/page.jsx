"use client";
import { useEffect, useState } from "react";
import { Loader2, Calendar, AlertTriangle, Clock, CalendarDays, ArrowRight, ShieldCheck, FileText } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

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

  // States for viewing individual compliance details in a modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    api.get("/compliance/calendar")
      .then(({ data }) => setUpcoming(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load compliance calendar."))
      .finally(() => setLoading(false));
  }, []);

  const getDaysLeft = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setDetailsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-3 lg:px-4 py-3 space-y-3">

      {/* Header Section */}
      <div className="flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
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
                onClick={() => handleItemClick(r)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:bg-slate-50/80 cursor-pointer group"
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
                    <p className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
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

                {/* Right Badge Status & Arrow */}
                <div className="flex items-center gap-3 self-start sm:self-center">
                  {isUrgent && (
                    <Badge variant="danger" className="flex items-center gap-1.5 px-3 py-1 text-xs">
                      <AlertTriangle size={12} /> Urgent Deadline
                    </Badge>
                  )}
                  {isOverdue && (
                    <Badge variant="warning" className="flex items-center gap-1.5 px-3 py-1 text-xs">
                      <AlertTriangle size={12} /> Overdue
                    </Badge>
                  )}
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all hidden sm:block" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compliance Details Modal */}
      <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Compliance Details">
        {selectedItem && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="p-3 bg-indigo-600 text-white rounded-xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {TYPE_LABELS[selectedItem.type] || selectedItem.type}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Record ID: {selectedItem._id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-semibold text-slate-400 block">Due Date</span>
                <span className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-500" />
                  {new Date(selectedItem.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-semibold text-slate-400 block">Total Amount</span>
                <span className="text-sm font-bold text-emerald-600 mt-1 block">
                  ₹{selectedItem.totalAmount?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span className="font-semibold">Status / Timeline:</span>
                <span className="font-bold text-slate-700">
                  {getDaysLeft(selectedItem.dueDate) < 0
                    ? `${Math.abs(getDaysLeft(selectedItem.dueDate))} Days Overdue`
                    : `${getDaysLeft(selectedItem.dueDate)} Days Remaining`}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span className="font-semibold">Compliance Type:</span>
                <span className="font-bold uppercase text-indigo-600">{selectedItem.type}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setDetailsModalOpen(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}