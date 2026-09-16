"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Briefcase,
  Users,
  Building2,
  Clock,
  Search,
  RefreshCw,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  Calendar
} from "lucide-react";
import api from "@/lib/api";

export default function JobPostsPage() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchJobPosts = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get("/recruitment/positions");
      const rawData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];

      // Flexible check: 'open', 'Open', ya bina status wali positions ko bhi handle karega
      const activePosts = rawData.filter((p) => {
        const s = String(p.status || "").trim().toLowerCase();
        return s === "open" || s === "active" || s === "";
      });

      setPositions(activePosts);
    } catch (err) {
      console.error("Failed to fetch job posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobPosts();
  }, [fetchJobPosts]);

  // Unique departments list for filter
  const departmentsList = useMemo(() => {
    const set = new Set();
    positions.forEach((p) => {
      const name = p.department?.name || p.department;
      if (name && typeof name === "string") set.add(name);
    });
    return Array.from(set);
  }, [positions]);

  // Filtered jobs based on search query & department
  const filteredJobs = useMemo(() => {
    return positions.filter((job) => {
      const title = (job.title || "").toLowerCase();
      const dept = (job.department?.name || job.department || "").toLowerCase();
      const exp = (job.experienceRequired || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        title.includes(query) || dept.includes(query) || exp.includes(query);
      const matchesDept =
        selectedDept === "all" ||
        (job.department?.name || job.department) === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [positions, searchQuery, selectedDept]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Sparkles size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Active Job Board
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-11">
            Currently published vacancies ready for applications and candidate sourcing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchJobPosts(true)}
            disabled={refreshing || loading}
            title="Refresh open jobs"
            className="p-2.5 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin text-indigo-600" : ""}
            />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search role, skills, experience..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {departmentsList.length > 0 && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-50 rounded w-2/3" />
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="h-4 bg-slate-100 rounded w-20" />
                <div className="h-4 bg-slate-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50/60 text-indigo-500 flex items-center justify-center mx-auto mb-3">
            <Briefcase size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Koi Active Job Post Nahi Hai
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Recruitment section me jakar kisi Position ka status <strong>Open</strong> karein taaki wo yahan live board par dikhne lage.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((p) => {
            const deptName = p.department?.name || p.department || "General";
            const openings = Number(p.numberOfOpenings) || 1;

            return (
              <div
                key={p._id}
                onClick={() => setSelectedJob(p)}
                className="group bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top Bar: Icon + Status */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Briefcase size={20} />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active Hiring
                    </span>
                  </div>

                  {/* Title & Department */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Building2 size={13} className="text-slate-400" />
                    <span>{deptName}</span>
                  </div>

                  {/* Experience Pill */}
                  <div className="mt-3.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-600">
                      <Clock size={12} className="text-slate-400" />
                      {p.experienceRequired || "Experience: Open"}
                    </span>
                  </div>
                </div>

                {/* Footer: Openings & Details Trigger */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                    <Users size={14} />
                    <span>{openings} Vacanc{openings > 1 ? "ies" : "y"}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-slate-400 font-semibold group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                    View Specs <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Details Modal on Card Click */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Briefcase size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedJob.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedJob.department?.name || selectedJob.department || "General"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Vacancies</span>
                <span className="font-bold text-slate-800">
                  {selectedJob.numberOfOpenings || 1} Positions
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Experience Level</span>
                <span className="font-bold text-slate-800">
                  {selectedJob.experienceRequired || "Open for all"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Job Ref ID</span>
                <span className="font-mono text-slate-600">
                  {selectedJob._id}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-medium">Hiring Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle2 size={12} /> Live on Portal
                </span>
              </div>
            </div>

            {selectedJob.description && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Role Overview
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                  {selectedJob.description}
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedJob(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors active:scale-95"
            >
              Close Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}