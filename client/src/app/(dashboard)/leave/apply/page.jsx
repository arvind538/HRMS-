"use client";

import React, { useState } from 'react';
import { Send, Calendar, FileText, Tag, Loader2 } from 'lucide-react';
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
];

export default function ApplyLeave() {
  const { user } = useAuth();
  const [form, setForm] = useState({ leaveType: '', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  // Leave duration calculate karne ke liye
  const calculateDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;
    return diff > 0 ? diff : 0;
  };

  const totalDays = calculateDays();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Agar user.employee null hai, to fallback me direct user._id use karein
    const employeeId = user?.employee?._id || user?.employee || user?._id;

    if (!employeeId) {
      toast.error("Aapka account kisi Employee record se linked nahi hai. HR se contact karo.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/leave/apply", {
        employee: employeeId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      toast.success("Leave application Successfully Submitted!");
      setForm({ leaveType: '', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Application submit nahi ho saki.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:px-6">
      <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">

        {/* Header Section */}
        <div className="mb-6 border-b border-slate-100 pb-4">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 rounded-full mb-2">
            Leave Portal
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Apply for Leave</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Nayi leave application submit karein</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Leave Category */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              Leave Category
            </label>
            <div className="relative">
              <select
                required
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 transition duration-200 ease-in-out focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
              >
                <option value="" disabled>Select Leave Type</option>
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Start Date
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 transition duration-200 ease-in-out focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                End Date
              </label>
              <input
                type="date"
                required
                min={form.startDate}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 transition duration-200 ease-in-out focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          {/* Dynamic Day Counter Badge */}
          {totalDays > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-700">
              <span className="font-medium">Total Duration:</span>
              <span className="font-bold text-indigo-900">{totalDays} {totalDays === 1 ? 'Day' : 'Days'}</span>
            </div>
          )}

          {/* Reason Field */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Reason for Leave
            </label>
            <textarea
              rows="3"
              required
              placeholder="Kripya leave ka clear reason likhein..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 transition duration-200 ease-in-out placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all duration-200 ease-in-out"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                Submit Application
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}