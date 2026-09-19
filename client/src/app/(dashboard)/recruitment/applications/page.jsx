"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  FileText,
  ExternalLink,
  ChevronRight,
  X,
  Sparkles,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function JobApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters & Selected State for Details Drawer
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // Bina strict status params ke saare candidates fetch karein taaki data miss na ho
      const res = await api.get("/recruitment/candidates");

      console.log("API Candidates Response:", res?.data); // Debugging ke liye console me check karein

      const raw = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data?.candidates)
            ? res.data.candidates
            : [];

      // Agar data mil raha hai par status match nahi ho raha, toh sabhi ko dikhane ke liye flexible condition rakhein
      // (Aap chahein toh yahan filtering hata kar saare candidates bhi dekh sakte hain)
      setApplications(raw);
    } catch (err) {
      toast.error("Applications load nahi ho payi.");
      console.error("Fetch candidates error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Shortlist / Reject
  const handleAction = async (e, id, status) => {
    e.stopPropagation();
    setActionLoadingId(`${id}-${status}`);

    try {
      await api.put(`/recruitment/candidates/${id}/status`, { status });
      toast.success(
        status === "shortlisted"
          ? "Candidate shortlisted successfully!"
          : "Application rejected."
      );
      setApplications((prev) => prev.filter((app) => (app._id || app.id) !== id));
      if (selectedCandidate && (selectedCandidate._id || selectedCandidate.id) === id) {
        setSelectedCandidate(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Action perform nahi ho paya.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Distinct roles for dropdown filter
  const rolesList = useMemo(() => {
    const set = new Set();
    applications.forEach((app) => {
      const roleTitle = app.jobPosition?.title || app.position || app.role;
      if (roleTitle) set.add(roleTitle);
    });
    return Array.from(set);
  }, [applications]);

  // Search & Role Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const name = (app.name || "").toLowerCase();
      const email = (app.email || "").toLowerCase();
      const role = (app.jobPosition?.title || app.position || app.role || "").toLowerCase();
      const source = (app.source || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        source.includes(query);

      const currentRoleTitle = app.jobPosition?.title || app.position || app.role;
      const matchesRole = selectedRole === "all" || currentRoleTitle === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [applications, searchQuery, selectedRole]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/85 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-2xs">
              <Inbox size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Incoming Job Applications
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 pl-11">
            Review fresh candidate submissions, portfolios, and trigger screening actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200/60 rounded-2xl text-xs font-bold text-amber-700 shadow-2xs">
            <Clock size={14} className="text-amber-500" />
            <span>{applications.length} Total Applications</span>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            title="Refresh submissions"
            className="p-3 border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin text-indigo-600" : ""}
            />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/85 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, email, role..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
          />
        </div>

        {rolesList.length > 0 && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer"
            >
              <option value="all">All Applied Positions</option>
              {rolesList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-slate-200/85 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Target Role</th>
                <th className="py-4 px-6">Source</th>
                <th className="py-4 px-6">Applied Date</th>
                <th className="py-4 px-6 text-center">Screening Actions</th>
                <th className="py-4 px-6 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 bg-slate-100 rounded w-28" />
                          <div className="h-2.5 bg-slate-50 rounded w-36" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6"><div className="h-3.5 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
                    <td className="py-4 px-6"><div className="h-3.5 bg-slate-100 rounded w-20" /></td>
                    <td className="py-4 px-6"><div className="h-7 bg-slate-100 rounded-xl w-24 mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-100 rounded w-4 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <div className="w-14 h-14 rounded-3xl bg-indigo-50/70 text-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <Inbox size={26} />
                    </div>
                    <p className="font-bold text-slate-800 text-sm">Koi application data nahi mila</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Backend API se candidates ka data fetch nahi ho pa raha hai ya fir list empty hai.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const appId = app._id || app.id;
                  const roleTitle = app.jobPosition?.title || app.position || app.role || "General Role";
                  const isShortlistLoading = actionLoadingId === `${appId}-shortlisted`;
                  const isRejectLoading = actionLoadingId === `${appId}-rejected`;

                  return (
                    <tr
                      key={appId}
                      onClick={() => setSelectedCandidate(app)}
                      className="hover:bg-indigo-50/50 active:bg-indigo-100/60 cursor-pointer transition-all duration-150 group"
                    >
                      {/* Candidate Avatar & Basic Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xs group-hover:scale-105 transition-transform shadow-2xs border border-indigo-100/60">
                            {app.name ? app.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                              {app.name || "Unnamed Candidate"}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail size={11} /> {app.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Job Role */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <Briefcase size={14} className="text-slate-400" />
                          <span>{roleTitle}</span>
                        </div>
                      </td>

                      {/* Source Badge */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200/80 capitalize shadow-2xs">
                          {app.source || "Website"}
                        </span>
                      </td>

                      {/* Applied Date */}
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Calendar size={13} className="text-slate-400" />
                          <span>
                            {app.createdAt
                              ? new Date(app.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                          <button
                            type="button"
                            disabled={!!actionLoadingId}
                            onClick={(e) => handleAction(e, appId, "shortlisted")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[11px] font-bold transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                            title="Shortlist for Interview"
                          >
                            <CheckCircle2 size={13} />
                            <span>{isShortlistLoading ? "..." : "Shortlist"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!!actionLoadingId}
                            onClick={(e) => handleAction(e, appId, "rejected")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 hover:bg-rose-50 active:scale-95 text-rose-600 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                            title="Reject Application"
                          >
                            <XCircle size={13} />
                            <span>{isRejectLoading ? "..." : "Reject"}</span>
                          </button>
                        </div>
                      </td>

                      {/* View Profile Icon */}
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex p-2 rounded-xl text-slate-300 group-hover:text-indigo-600 group-hover:bg-white transition-all shadow-2xs group-hover:shadow-xs">
                          <ChevronRight size={16} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Profile Details Side-Drawer */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full p-6 sm:p-8 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-100">
            <div className="space-y-6">
              {/* Drawer Top */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                    Candidate Dossier
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {selectedCandidate.name || "Candidate Details"}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Badge & Position */}
              <div className="flex items-center justify-between p-4 rounded-3xl bg-indigo-50/60 border border-indigo-100/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Briefcase size={16} className="text-indigo-600" />
                  <span className="font-bold text-xs text-indigo-950">
                    {selectedCandidate.jobPosition?.title || selectedCandidate.position || "General Applicant"}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-3 py-1 bg-amber-100 text-amber-800 rounded-full uppercase shadow-2xs">
                  {selectedCandidate.status || "Pending Review"}
                </span>
              </div>

              {/* Contact Information */}
              <div className="bg-slate-50/80 rounded-3xl p-5 space-y-3.5 border border-slate-200/60 text-xs shadow-2xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                    <Mail size={13} /> Email Address
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedCandidate.email || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                    <Phone size={13} /> Contact Number
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedCandidate.phone || selectedCandidate.mobile || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                    <Sparkles size={13} /> Sourced Via
                  </span>
                  <span className="font-bold text-slate-800 capitalize">
                    {selectedCandidate.source || "Website Portal"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1.5">
                    <Calendar size={13} /> Applied Timestamp
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedCandidate.createdAt
                      ? new Date(selectedCandidate.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Resume / Portfolio Link */}
              {(selectedCandidate.resumeUrl || selectedCandidate.resume) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Resume / Document
                  </h4>
                  <a
                    href={selectedCandidate.resumeUrl || selectedCandidate.resume}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold text-indigo-600 transition-all shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      <span>View Attached CV / Resume</span>
                    </div>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Cover Letter */}
              {selectedCandidate.coverLetter && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Cover Letter Note
                  </h4>
                  <p className="text-xs text-slate-600 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/60 leading-relaxed shadow-2xs">
                    {selectedCandidate.coverLetter}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="pt-6 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={(e) =>
                  handleAction(
                    e,
                    selectedCandidate._id || selectedCandidate.id,
                    "shortlisted"
                  )
                }
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} /> Shortlist
              </button>

              <button
                type="button"
                onClick={(e) =>
                  handleAction(
                    e,
                    selectedCandidate._id || selectedCandidate.id,
                    "rejected"
                  )
                }
                className="flex-1 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle size={15} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}