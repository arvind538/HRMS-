"use client";
import { useEffect, useState } from "react";
import { Loader2, FileText, Pin } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function EmployeeCircularsPage() {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: Backend uses pinned announcements as official employee circulars
    api.get("/communication/announcements")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setCirculars(list.filter((a) => a.pinned));
      })
      .catch((err) => {
        console.error("Circulars fetch error:", err.response?.data || err.message);
        toast.error("Failed to load official circulars from server.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex-col md:flex-row md:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Employee Circulars</h1>
        <p className="text-xs text-slate-500 mt-1">Official pinned memos, notices, and important organizational announcements.</p>
      </div>

      {/* Circulars List Section */}
      {circulars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <FileText className="mx-auto mb-3 text-slate-300 h-10 w-10" />
          <p className="text-sm font-bold text-slate-700">No circulars published</p>
          <p className="text-xs text-slate-400 mt-1">There are no pinned circulars right now. Pin any announcement to display it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {circulars.map((c) => (
            <div
              key={c._id}
              className="bg-white p-6 rounded-2xl border border-indigo-200/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md relative overflow-hidden group"
            >
              {/* Decorative side accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 transition-all group-hover:w-1.5" />

              <div className="flex items-start justify-between gap-4 pl-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <Pin size={11} /> Official Circular
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base truncate">{c.title}</h3>
                  </div>

                  <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{c.content}</p>

                  <p className="text-xs text-slate-400 mt-4 flex items-center gap-2 font-medium">
                    <span>Published on: {new Date(c.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}