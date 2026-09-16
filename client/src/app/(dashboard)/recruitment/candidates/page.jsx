"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  ChevronRight,
  X,
  Sparkles,
  UserCheck,
  UserX,
  Clock,
  Building2,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const STATUS_CONFIG = {
  applied: { label: "Applied", bg: "bg-slate-100 text-slate-700 border-slate-200" },
  shortlisted: { label: "Shortlisted", bg: "bg-sky-50 text-sky-700 border-sky-200" },
  "interview-scheduled": { label: "Interview Scheduled", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  interviewed: { label: "Interviewed", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  offered: { label: "Offered", bg: "bg-purple-50 text-purple-700 border-purple-200" },
  hired: { label: "Hired", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    jobPosition: "",
    source: "job-portal",
    notes: "",
  });

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [candRes, posRes] = await Promise.all([
        api.get("/recruitment/candidates", {
          params: statusFilter ? { status: statusFilter } : {},
        }),
        api.get("/recruitment/positions"),
      ]);

      const rawCand = Array.isArray(candRes?.data)
        ? candRes.data
        : Array.isArray(candRes?.data?.data)
          ? candRes.data.data
          : [];

      const rawPos = Array.isArray(posRes?.data)
        ? posRes.data
        : Array.isArray(posRes?.data?.data)
          ? posRes.data.data
          : [];

      setCandidates(rawCand);
      setPositions(rawPos);
    } catch (err) {
      toast.error("Candidates data load nahi ho paya.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create Candidate
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/recruitment/candidates", form);
      toast.success("Candidate successfully add ho gaya!");
      setModalOpen(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        jobPosition: "",
        source: "job-portal",
        notes: "",
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Candidate add nahi hua.");
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change Inline
  const handleStatusChange = async (e, id, newStatus) => {
    e.stopPropagation();
    try {
      await api.put(`/recruitment/candidates/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setCandidates((prev) =>
        prev.map((c) => ((c._id || c.id) === id ? { ...c, status: newStatus } : c))
      );
      if (selectedCandidate && (selectedCandidate._id || selectedCandidate.id) === id) {
        setSelectedCandidate((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update fail ho gaya.");
    }
  };

  // Live Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const posTitle = (c.jobPosition?.title || c.position || "").toLowerCase();
      const q = searchQuery.toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        posTitle.includes(q)
      );
    });
  }, [candidates, searchQuery]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Candidate Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-11">
            Track, filter, and manage applicant progression throughout the recruitment funnel
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            title="Refresh list"
            className="p-2.5 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin text-indigo-600" : ""}
            />
          </button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 py-2.5 font-medium shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} /> Add Candidate
          </Button>
        </div>
      </div>

      {/* Stage Filters Bar */}
      <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {[
          { key: "", label: "All Applicants" },
          { key: "applied", label: "Applied" },
          { key: "shortlisted", label: "Shortlisted" },
          { key: "interview-scheduled", label: "Interview Scheduled" },
          { key: "interviewed", label: "Interviewed" },
          { key: "offered", label: "Offered" },
          { key: "hired", label: "Hired" },
          { key: "rejected", label: "Rejected" },
        ].map((item) => {
          const isActive = statusFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${isActive
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-200"
                : "bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name, role, email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <p className="text-xs font-semibold text-slate-400 hidden sm:block">
          Showing <span className="text-slate-800">{filteredCandidates.length}</span> candidates
        </p>
      </div>

      {/* Main Interactive Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Applied Role</th>
                <th className="py-4 px-6">Contact Details</th>
                <th className="py-4 px-6">Source</th>
                <th className="py-4 px-6">Recruitment Stage</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-2xl" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 bg-slate-100 rounded w-28" />
                          <div className="h-2.5 bg-slate-50 rounded w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6"><div className="h-3.5 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-6"><div className="h-3.5 bg-slate-100 rounded w-32" /></td>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
                    <td className="py-4 px-6"><div className="h-6 bg-slate-100 rounded-full w-24" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-100 rounded w-4 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <Users size={32} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-bold text-slate-800 text-sm">Koi candidate nahi mila</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Naya candidate add karein ya status filter change karein.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const candId = c._id || c.id;
                  const currentStatus = String(c.status || "applied").toLowerCase();
                  const badgeInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.applied;

                  return (
                    <tr
                      key={candId}
                      onClick={() => setSelectedCandidate(c)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Name & Initials */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                            {c.name ? c.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                              {c.name || "Unnamed"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ID: {candId ? candId.slice(-6).toUpperCase() : "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Briefcase size={13} className="text-slate-400" />
                          <span>{c.jobPosition?.title || c.position || "General Applicant"}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                            <Mail size={11} className="text-slate-400" /> {c.email || "—"}
                          </p>
                          {c.phone && (
                            <p className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                              <Phone size={11} className="text-slate-400" /> {c.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          {c.source || "Portal"}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(e, candId, e.target.value)}
                          className={`pl-2.5 pr-6 py-1 border rounded-full text-[11px] font-bold capitalize appearance-none focus:outline-none cursor-pointer transition-all ${badgeInfo.bg}`}
                        >
                          {Object.keys(STATUS_CONFIG).map((st) => (
                            <option key={st} value={st}>
                              {STATUS_CONFIG[st].label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Arrow Action */}
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex p-1.5 rounded-xl text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
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

      {/* Candidate Dossier Side-Drawer on Row Click */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-100">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                    Candidate Profile
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {selectedCandidate.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Badge & Position */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-indigo-600" />
                  <span className="font-bold text-xs text-indigo-950">
                    {selectedCandidate.jobPosition?.title || selectedCandidate.position || "General Applicant"}
                  </span>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_CONFIG[selectedCandidate.status]?.bg || "bg-slate-100 text-slate-700"}`}>
                  {selectedCandidate.status || "Applied"}
                </span>
              </div>

              {/* Contact Information Cards */}
              <div className="bg-slate-50/80 rounded-3xl p-5 space-y-3.5 border border-slate-100 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Mail size={13} /> Email
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedCandidate.email || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Phone size={13} /> Contact Phone
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedCandidate.phone || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Sparkles size={13} /> Acquisition Channel
                  </span>
                  <span className="font-bold text-slate-800 capitalize">
                    {selectedCandidate.source || "Portal"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar size={13} /> Creation Timestamp
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedCandidate.createdAt
                      ? new Date(selectedCandidate.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Notes or Bio */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Interviewer & Sourcing Notes
                </h4>
                <p className="text-xs text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                  {selectedCandidate.notes ||
                    "Koi notes ya feedback abhi add nahi kiya gaya hai. Interview ke baad remarks update karein."}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <Button
                onClick={() => setSelectedCandidate(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3 font-semibold text-xs"
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Add Candidate Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Add New Candidate
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter candidate details to track in the recruitment funnel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="candidate@email.com"
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Applying For *</label>
                  <select
                    required
                    value={form.jobPosition}
                    onChange={(e) => setForm({ ...form, jobPosition: e.target.value })}
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  >
                    <option value="">-- Select Position --</option>
                    {positions.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  >
                    <option value="job-portal">Job Portal</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="referral">Referral</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Initial Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. 3 years relevant React experience..."
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="submit"
                  loading={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3 font-semibold text-xs shadow-md shadow-indigo-100 transition-all active:scale-95"
                >
                  Save Candidate
                </Button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}