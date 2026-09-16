"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  Users,
  Search,
  Briefcase,
  Mail,
  Sparkles,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const STAGE_CONFIG = {
  applied: {
    label: "Applied",
    headerBg: "bg-slate-100 border-slate-200 text-slate-800",
    badgeBg: "bg-slate-200/80 text-slate-700",
    dot: "bg-slate-400",
  },
  shortlisted: {
    label: "Shortlisted",
    headerBg: "bg-blue-50 border-blue-200 text-blue-900",
    badgeBg: "bg-blue-200/80 text-blue-800",
    dot: "bg-blue-500",
  },
  "interview-scheduled": {
    label: "Interview Scheduled",
    headerBg: "bg-indigo-50 border-indigo-200 text-indigo-900",
    badgeBg: "bg-indigo-200/80 text-indigo-800",
    dot: "bg-indigo-500",
  },
  interviewed: {
    label: "Interviewed",
    headerBg: "bg-amber-50 border-amber-200 text-amber-900",
    badgeBg: "bg-amber-200/80 text-amber-800",
    dot: "bg-amber-500",
  },
  offered: {
    label: "Offered",
    headerBg: "bg-purple-50 border-purple-200 text-purple-900",
    badgeBg: "bg-purple-200/80 text-purple-800",
    dot: "bg-purple-500",
  },
  hired: {
    label: "Hired",
    headerBg: "bg-emerald-50 border-emerald-200 text-emerald-900",
    badgeBg: "bg-emerald-200/80 text-emerald-800",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    headerBg: "bg-rose-50 border-rose-200 text-rose-900",
    badgeBg: "bg-rose-200/80 text-rose-800",
    dot: "bg-rose-500",
  },
};

export default function RecruitmentPipelinePage() {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api.get("/recruitment/pipeline")
      .then(({ data }) => setPipeline(data))
      .catch(() => toast.error("Failed to load recruitment pipeline data."))
      .finally(() => setLoading(false));
  }, []);

  // Total candidate metrics calculation
  const totalCandidates = useMemo(() => {
    if (!pipeline) return 0;
    return Object.values(pipeline).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  }, [pipeline]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 animate-pulse">
          Synchronizing candidate pipeline...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300 font-sans text-slate-900">
      {/* Top Clean White Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold shadow-2xs">
            <Sparkles size={14} className="text-indigo-600" />
            <span>Talent Acquisition Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Recruitment Pipeline Board
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-xl">
            Real-time progression board tracking candidates through active evaluation stages and hiring pipelines.
          </p>
        </div>

        <div className="flex flex-nowrap items-center gap-3.5">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl px-5 py-3 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[7px] uppercase font-semibold text-slate-400 tracking-wider">Total Active</p>
              <p className="flex flex-wrap text-sm font-semibold text-slate-900 leading-tight ">{totalCandidates}</p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by candidate or role..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll */}
      <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        <div className="flex gap-4 min-w-max items-start">
          {Object.entries(STAGE_CONFIG).map(([stageKey, config]) => {
            const rawItems = pipeline?.[stageKey] || [];
            const filteredItems = rawItems.filter((c) =>
              c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.jobPosition?.title?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <div
                key={stageKey}
                className="w-72 shrink-0 bg-slate-50/80 border border-slate-200/90 rounded-3xl p-3 flex flex-col shadow-2xs"
              >
                {/* Stage Header */}
                <div
                  className={`px-4 py-3 rounded-2xl border flex items-center justify-between mb-3.5 shadow-2xs ${config.headerBg}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                    <span className="text-xs font-extrabold tracking-tight">{config.label}</span>
                  </div>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border border-black/5 ${config.badgeBg}`}
                  >
                    {filteredItems.length}
                  </span>
                </div>

                {/* Candidate Cards Column */}
                <div className="space-y-3 min-h-[450px]">
                  {filteredItems.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-300/80 rounded-2xl text-center px-4 bg-white/60">
                      <UserCheck size={22} className="text-slate-300 mb-1.5" />
                      <p className="text-xs text-slate-400 font-bold">No candidates found</p>
                    </div>
                  ) : (
                    filteredItems.map((c) => (
                      <div
                        key={c._id}
                        className="group bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center border border-indigo-100 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                            {c.name?.charAt(0) || "C"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                              {c.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-1">
                              <Briefcase size={12} className="shrink-0 text-slate-400" />
                              <span className="truncate">{c.jobPosition?.title || "Not Assigned"}</span>
                            </div>
                          </div>
                        </div>

                        {c.email && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-slate-400 truncate">
                            <Mail size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{c.email}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}