"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Building2,
  Users,
  Search,
  RefreshCw,
  Plus,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock4,
  ExternalLink,
  UserCheck,
  Edit3,
  Trash2
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const ROUND_BADGES = {
  screening: "bg-sky-50 text-sky-700 border-sky-200/80",
  technical: "bg-purple-50 text-purple-700 border-purple-200/80",
  hr: "bg-amber-50 text-amber-700 border-amber-200/80",
  final: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
};

const STATUS_BADGES = {
  scheduled: { label: "Scheduled", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  completed: { label: "Completed", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function InterviewSchedulePage() {
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Drawer State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [editId, setEditId] = useState(null); // Tracks if we are editing an existing interview

  const [form, setForm] = useState({
    candidate: "",
    interviewer: "",
    round: "screening",
    scheduledAt: "",
    mode: "video",
    meetingLink: "",
    notes: "",
  });

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [intRes, candRes, empRes] = await Promise.all([
        api.get("/recruitment/interviews").catch(() => ({ data: [] })),
        api.get("/recruitment/candidates").catch(() => ({ data: [] })),
        api.get("/employees").catch(() => ({ data: [] })),
      ]);

      const rawInt = Array.isArray(intRes?.data) ? intRes.data : Array.isArray(intRes?.data?.data) ? intRes.data.data : [];
      const rawCand = Array.isArray(candRes?.data) ? candRes.data : Array.isArray(candRes?.data?.data) ? candRes.data.data : [];
      const rawEmp = Array.isArray(empRes?.data) ? empRes.data : Array.isArray(empRes?.data?.data) ? empRes.data.data : [];

      setInterviews(rawInt);
      setCandidates(rawCand);
      setEmployees(rawEmp);
    } catch (err) {
      toast.error("Interview schedule data load nahi ho paya.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal for Create or Edit
  const handleOpenModal = (interview = null) => {
    if (interview) {
      setEditId(interview._id || interview.id);
      setForm({
        candidate: interview.candidate?._id || interview.candidate || "",
        interviewer: interview.interviewer?._id || interview.interviewer || "",
        round: interview.round || "screening",
        scheduledAt: interview.scheduledAt ? new Date(interview.scheduledAt).toISOString().slice(0, 16) : "",
        mode: interview.mode || "video",
        meetingLink: interview.meetingLink || "",
        notes: interview.notes || "",
      });
    } else {
      setEditId(null);
      setForm({
        candidate: "",
        interviewer: "",
        round: "screening",
        scheduledAt: "",
        mode: "video",
        meetingLink: "",
        notes: "",
      });
    }
    setModalOpen(true);
  };

  // Create or Update Interview
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/recruitment/interviews/${editId}`, form);
        toast.success("Interview successfully update ho gaya!");
      } else {
        await api.post("/recruitment/interviews", form);
        toast.success("Interview successfully schedule ho gaya!");
      }
      setModalOpen(false);
      setEditId(null);
      setForm({
        candidate: "",
        interviewer: "",
        round: "screening",
        scheduledAt: "",
        mode: "video",
        meetingLink: "",
        notes: "",
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation fail ho gayi.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Interview
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Kya aap waqai is interview schedule ko delete karna chahte hain?")) return;

    try {
      await api.delete(`/recruitment/interviews/${id}`);
      toast.success("Interview record delete ho gaya.");
      setInterviews((prev) => prev.filter((item) => (item._id || item.id) !== id));
      if (selectedInterview && (selectedInterview._id || selectedInterview.id) === id) {
        setSelectedInterview(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete nahi ho paya.");
    }
  };

  // Status Change Inline
  const handleStatusUpdate = async (e, id, newStatus) => {
    e.stopPropagation();
    try {
      await api.put(`/recruitment/interviews/${id}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setInterviews((prev) =>
        prev.map((item) => ((item._id || item.id) === id ? { ...item, status: newStatus } : item))
      );
      if (selectedInterview && (selectedInterview._id || selectedInterview.id) === id) {
        setSelectedInterview((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error("Status update nahi ho paya.");
    }
  };

  // Live Filtered Interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      const candName = typeof item.candidate === 'string' ? item.candidate : (item.candidate?.name || "");
      const intName = typeof item.interviewer === 'string' ? item.interviewer : (item.interviewer?.name || "");
      const round = (item.round || "").toLowerCase();
      const currentStatus = String(item.status || "scheduled").toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = candName.toLowerCase().includes(q) || intName.toLowerCase().includes(q) || round.includes(q);
      const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [interviews, searchQuery, statusFilter]);

  const getModeIcon = (mode = "") => {
    switch (mode.toLowerCase()) {
      case "video":
        return <Video size={13} className="text-indigo-600" />;
      case "phone":
        return <Phone size={13} className="text-emerald-600" />;
      default:
        return <Building2 size={13} className="text-slate-600" />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-2xs">
              <Calendar size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Interview Schedule
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-11 font-medium">
            Manage upcoming candidate evaluations, meeting channels, and panel assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            title="Refresh interviews"
            className="p-2.5 border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <Button
            onClick={() => handleOpenModal(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 py-2.5 font-bold text-xs shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Schedule Interview
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, interviewer, round..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { key: "all", label: "All Sessions" },
            { key: "scheduled", label: "Scheduled" },
            { key: "completed", label: "Completed" },
            { key: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${statusFilter === tab.key
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-200"
                : "bg-slate-50/80 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Interviewer</th>
                <th className="py-4 px-6">Round</th>
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6">Channel</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="py-4 px-6"><div className="h-6 bg-slate-100 rounded-full w-20" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <Calendar size={32} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-bold text-slate-800 text-sm">Koi interview schedule nahi hai</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Naya session plan karne ke liye "Schedule Interview" par click karein.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInterviews.map((item) => {
                  const intId = item._id || item.id;
                  const currentStatus = String(item.status || "scheduled").toLowerCase();
                  const roundBadge = ROUND_BADGES[item.round?.toLowerCase()] || ROUND_BADGES.screening;
                  const statusBadge = STATUS_BADGES[currentStatus] || STATUS_BADGES.scheduled;

                  const candidateName = typeof item.candidate === 'object' && item.candidate !== null ? item.candidate.name : (item.candidate || "—");
                  const interviewerName = typeof item.interviewer === 'object' && item.interviewer !== null ? item.interviewer.name : (item.interviewer || "—");

                  return (
                    <tr
                      key={intId}
                      onClick={() => setSelectedInterview(item)}
                      className="hover:bg-indigo-50/50 active:bg-indigo-100/60 cursor-pointer transition-all duration-150 group"
                    >
                      {/* Candidate */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xs group-hover:scale-105 transition-transform shadow-2xs border border-indigo-100/60">
                            {candidateName ? candidateName.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                              {candidateName}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              {typeof item.candidate === 'object' && item.candidate?.jobPosition?.title ? item.candidate.jobPosition.title : "Candidate Applicant"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Interviewer */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <UserCheck size={13} className="text-slate-400" />
                          <span>{interviewerName}</span>
                        </div>
                      </td>

                      {/* Round */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize shadow-2xs ${roundBadge}`}>
                          {item.round || "Screening"}
                        </span>
                      </td>

                      {/* Scheduled Date Time */}
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Clock4 size={13} className="text-slate-400" />
                          <span>
                            {item.scheduledAt
                              ? new Date(item.scheduledAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Mode / Channel */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 capitalize shadow-2xs">
                          {getModeIcon(item.mode)}
                          <span>{item.mode || "Video"}</span>
                        </span>
                      </td>

                      {/* Inline Status Dropdown */}
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusUpdate(e, intId, e.target.value)}
                          className={`pl-2.5 pr-6 py-1 border rounded-full text-[11px] font-bold capitalize appearance-none focus:outline-none cursor-pointer transition-all shadow-2xs hover:shadow-xs ${statusBadge.bg}`}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Edit & Delete Action Buttons */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(item)}
                            title="Edit Interview"
                            className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, intId)}
                            title="Delete Interview"
                            className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl border border-slate-200/80 hover:border-rose-200 transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in Details Drawer */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-100">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                    Interview Dossier
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {typeof selectedInterview.candidate === 'object' && selectedInterview.candidate !== null ? selectedInterview.candidate?.name : (selectedInterview.candidate || "Session Details")}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedInterview(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status & Round Badges */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border capitalize shadow-2xs ${STATUS_BADGES[selectedInterview.status]?.bg || "bg-slate-100 text-slate-700"}`}>
                  {selectedInterview.status || "Scheduled"}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize shadow-2xs ${ROUND_BADGES[selectedInterview.round?.toLowerCase()] || ROUND_BADGES.screening}`}>
                  {selectedInterview.round} Round
                </span>
              </div>

              {/* Specifications Card */}
              <div className="bg-slate-50/80 rounded-3xl p-5 space-y-3.5 border border-slate-200/60 text-xs shadow-2xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Candidate Email</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {typeof selectedInterview.candidate === 'object' && selectedInterview.candidate !== null ? (selectedInterview.candidate?.email || "—") : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Panelist / Interviewer</span>
                  <span className="font-bold text-slate-800">
                    {typeof selectedInterview.interviewer === 'object' && selectedInterview.interviewer !== null ? selectedInterview.interviewer?.name : (selectedInterview.interviewer || "—")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Mode</span>
                  <span className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
                    {getModeIcon(selectedInterview.mode)} {selectedInterview.mode}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Scheduled Time</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedInterview.scheduledAt
                      ? new Date(selectedInterview.scheduledAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Join Link (If available) */}
              {selectedInterview.meetingLink && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Session Link
                  </h4>
                  <a
                    href={selectedInterview.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 bg-indigo-50/80 hover:bg-indigo-100 rounded-2xl border border-indigo-200/60 text-xs font-bold text-indigo-700 transition-all shadow-2xs hover:shadow-xs"
                  >
                    <span>Launch Virtual Room</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100">
              <Button
                onClick={() => setSelectedInterview(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Schedule Modal (Create & Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-2xs">
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editId ? "Edit Interview Schedule" : "Schedule Candidate Interview"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {editId ? "Modify panelist, time, or interview round" : "Set panelist, assessment round, and meeting platform"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Select Candidate *</label>
                <select
                  required
                  value={form.candidate}
                  onChange={(e) => setForm({ ...form, candidate: e.target.value })}
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer"
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name} {c.jobPosition?.title ? `(${c.jobPosition.title})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Assign Interviewer *</label>
                <select
                  required
                  value={form.interviewer}
                  onChange={(e) => setForm({ ...form, interviewer: e.target.value })}
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer"
                >
                  <option value="">-- Choose Staff / Panelist --</option>
                  {employees.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                      {e.name} {e.designation ? `(${e.designation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Interview Round</label>
                  <select
                    value={form.round}
                    onChange={(e) => setForm({ ...form, round: e.target.value })}
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="screening">Screening</option>
                    <option value="technical">Technical</option>
                    <option value="hr">HR Round</option>
                    <option value="final">Final Executive</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Medium / Mode</label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="video">Google Meet / Video</option>
                    <option value="in-person">In-Person Office</option>
                    <option value="phone">Telephonic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Meeting Link / Room (Optional)</label>
                <input
                  type="url"
                  value={form.meetingLink}
                  onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                  placeholder="https://meet.google.com/xyz-abc"
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-slate-100">
                <Button
                  type="submit"
                  loading={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 font-bold text-xs shadow-md shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
                >
                  {editId ? "Update Schedule" : "Confirm Schedule"}
                </Button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer active:scale-95"
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