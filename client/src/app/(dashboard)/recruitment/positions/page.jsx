"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Briefcase,
  Users,
  Clock,
  Building2,
  Search,
  Filter,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Check,
  Edit3,
  Trash2
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses", dot: "bg-slate-400" },
  { value: "open", label: "Open", dot: "bg-emerald-500" },
  { value: "on-hold", label: "On Hold", dot: "bg-amber-500" },
  { value: "closed", label: "Closed", dot: "bg-rose-500" },
];

export default function JobPositionsPage() {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null); // Track if editing

  // Filters & Selected State for Details Drawer
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  const filterDropdownRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    department: "",
    experienceRequired: "",
    numberOfOpenings: 1,
    description: "",
  });

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [posRes, deptRes] = await Promise.all([
        api.get("/recruitment/positions"),
        api.get("/departments"),
      ]);
      setPositions(Array.isArray(posRes.data) ? posRes.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    } catch (err) {
      toast.error("Failed to load recruitment positions data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Modal for Create or Edit
  const handleOpenModal = (e, pos = null) => {
    if (e) e.stopPropagation();
    if (pos) {
      setEditId(pos._id);
      setForm({
        title: pos.title || "",
        department: pos.department?._id || pos.department || "",
        experienceRequired: pos.experienceRequired || "",
        numberOfOpenings: pos.numberOfOpenings || 1,
        description: pos.description || "",
      });
    } else {
      setEditId(null);
      setForm({
        title: "",
        department: "",
        experienceRequired: "",
        numberOfOpenings: 1,
        description: "",
      });
    }
    setModalOpen(true);
  };

  // Submit Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/recruitment/positions/${editId}`, form);
        toast.success("Job position successfully updated!");
      } else {
        await api.post("/recruitment/positions", form);
        toast.success("Job position successfully created!");
      }
      setModalOpen(false);
      setEditId(null);
      setForm({
        title: "",
        department: "",
        experienceRequired: "",
        numberOfOpenings: 1,
        description: "",
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Position
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this job position?")) return;

    try {
      await api.delete(`/recruitment/positions/${id}`);
      toast.success("Job position successfully deleted.");
      setPositions((prev) => prev.filter((p) => p._id !== id));
      if (selectedPosition?._id === id) setSelectedPosition(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete position.");
    }
  };

  const handleStatusChange = async (e, id, status) => {
    e.stopPropagation();
    try {
      await api.put(`/recruitment/positions/${id}`, { status });
      toast.success("Position status successfully updated.");
      setPositions((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status } : item))
      );
      if (selectedPosition?._id === id) {
        setSelectedPosition((prev) => ({ ...prev, status }));
      }
    } catch (err) {
      toast.error("Failed to update position status.");
    }
  };

  // Search & Filter Memo
  const filteredPositions = useMemo(() => {
    return positions.filter((item) => {
      const matchesSearch =
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [positions, searchQuery, statusFilter]);

  // Metrics
  const totalOpenings = useMemo(
    () => positions.reduce((acc, curr) => acc + (Number(curr.numberOfOpenings) || 0), 0),
    [positions]
  );
  const activeRoles = useMemo(
    () => positions.filter((p) => p.status === "open").length,
    [positions]
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          icon: <CheckCircle2 size={12} className="text-emerald-500" />,
        };
      case "on-hold":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200/80",
          icon: <PauseCircle size={12} className="text-amber-500" />,
        };
      case "closed":
        return {
          bg: "bg-slate-100 text-slate-600 border-slate-200",
          icon: <AlertCircle size={12} className="text-slate-400" />,
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-600 border-slate-200",
          icon: null,
        };
    }
  };

  const selectedFilterOption =
    STATUS_FILTER_OPTIONS.find((opt) => opt.value === statusFilter) ||
    STATUS_FILTER_OPTIONS[0];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-2xs">
              <Briefcase size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Recruitment Roles & Openings
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 pl-11">
            Manage company vacant roles, active hiring pipelines, and experience criteria efficiently.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            title="Refresh positions"
            className="p-3 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <Button
            onClick={(e) => handleOpenModal(e, null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> New Job Position
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-200 flex items-center justify-between group">
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Positions</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{positions.length}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform shadow-2xs">
            <Briefcase size={22} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-200 flex items-center justify-between group">
          <div>
            <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Active Open Roles</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{activeRoles}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform shadow-2xs">
            <Sparkles size={22} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md hover:border-violet-200 flex items-center justify-between sm:col-span-2 lg:col-span-1 group">
          <div>
            <p className="text-[11px] font-extrabold text-violet-600 uppercase tracking-wider">Total Open Vacancies</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{totalOpenings}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 group-hover:scale-110 transition-transform shadow-2xs">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by position title or department..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
          />
        </div>

        {/* Smooth Custom Filter Dropdown */}
        <div className="relative w-full sm:w-auto inline-block text-left" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-2xs transition-all duration-200 active:scale-98 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Filter size={14} className="text-slate-400" />
              <span className={`w-2 h-2 rounded-full ${selectedFilterOption.dot}`} />
              <span>{selectedFilterOption.label}</span>
            </div>
            <ChevronDown
              size={15}
              className={`text-slate-400 transition-transform duration-200 ease-out ${isFilterOpen ? "rotate-180 text-indigo-600" : ""}`}
            />
          </button>

          {/* Animated Dropdown Menu */}
          <div
            className={`absolute right-0 mt-2 w-full sm:w-48 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 ring-1 ring-black/5 z-40 p-1.5 transform transition-all duration-200 ease-out origin-top-right ${isFilterOpen
              ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
              : "opacity-0 scale-95 pointer-events-none -translate-y-2"
              }`}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const isSelected = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${isSelected
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Position Title</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Experience</th>
                <th className="py-4 px-6">Vacancies</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded-xl w-36 mb-1.5" />
                      <div className="h-3 bg-slate-50 rounded-xl w-20" />
                    </td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded-xl w-24" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded-xl w-16" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded-xl w-12" /></td>
                    <td className="py-4 px-6"><div className="h-6 bg-slate-100 rounded-full w-20" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-100 rounded-xl w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <Briefcase size={42} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
                    <p className="font-bold text-slate-700 text-sm">No job positions found</p>
                    <p className="text-xs text-slate-400 mt-1">Please verify your search filters or create a new position.</p>
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => {
                  const badge = getStatusBadge(pos.status);
                  return (
                    <tr
                      key={pos._id}
                      onClick={() => setSelectedPosition(pos)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                      {/* Position Title */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xs group-hover:scale-105 transition-transform shadow-2xs">
                            {pos.title?.charAt(0)?.toUpperCase() || "J"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                              {pos.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              ID: {pos._id ? pos._id.slice(-6).toUpperCase() : "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <Building2 size={14} className="text-slate-400" />
                          <span>{pos.department?.name || "General"}</span>
                        </div>
                      </td>

                      {/* Experience Required */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                          <Clock size={13} className="text-slate-400" />
                          <span>{pos.experienceRequired || "Not specified"}</span>
                        </div>
                      </td>

                      {/* Openings Count */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 font-bold text-slate-700 text-xs border border-slate-200/60 shadow-2xs">
                          <Users size={13} className="text-slate-500" />
                          {pos.numberOfOpenings || 1}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <select
                            value={pos.status || "open"}
                            onChange={(e) => handleStatusChange(e, pos._id, e.target.value)}
                            className={`pl-3 pr-7 py-1.5 border rounded-full text-[11px] font-extrabold capitalize appearance-none focus:outline-none cursor-pointer transition-all shadow-2xs hover:shadow-xs ${badge.bg}`}
                          >
                            <option value="open">Open</option>
                            <option value="on-hold">On Hold</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </td>

                      {/* Edit & Delete Action Buttons */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => handleOpenModal(e, pos)}
                            title="Edit Position"
                            className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, pos._id)}
                            title="Delete Position"
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

      {/* Sliding Details Drawer/Modal on Row Click */}
      {selectedPosition && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200" onClick={() => setSelectedPosition(null)}>
          <div className="bg-white w-full max-w-md h-full p-6 sm:p-8 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                    Job Specifications
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                    {selectedPosition.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedPosition(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border capitalize ${getStatusBadge(selectedPosition.status).bg}`}>
                  {getStatusBadge(selectedPosition.status).icon}
                  {selectedPosition.status || "open"}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Total {selectedPosition.numberOfOpenings} Vacancies
                </span>
              </div>

              {/* Attributes Grid */}
              <div className="bg-slate-50/80 rounded-3xl p-5 space-y-3.5 border border-slate-200/60 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold">Department</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedPosition.department?.name || "General / Unassigned"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold">Experience Level</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedPosition.experienceRequired || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-400 font-bold">Open Positions</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedPosition.numberOfOpenings} Candidate(s)
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-bold">Database ID</span>
                  <span className="font-mono text-slate-600 font-semibold">
                    {selectedPosition._id}
                  </span>
                </div>
              </div>

              {/* Optional Job Description / Requirements */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2.5">
                  Role Overview
                </h4>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
                  {selectedPosition.description ||
                    "No detailed description has been provided for this role yet. Candidates can apply directly under this job position."}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center gap-3">
              <Button
                onClick={(e) => {
                  const posToEdit = selectedPosition;
                  setSelectedPosition(null);
                  handleOpenModal(null, posToEdit);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Edit Position
              </Button>
              <Button
                onClick={() => setSelectedPosition(null)}
                className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl py-3 font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Job Position Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Job Position" : "Create New Job Position"}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Position Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
              placeholder="e.g., Senior Frontend Engineer"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Experience</label>
              <input
                value={form.experienceRequired}
                onChange={(e) => setForm({ ...form, experienceRequired: e.target.value })}
                className="mt-1.5 w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
                placeholder="e.g., 2-4 years"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Openings Count</label>
              <input
                type="number"
                min="1"
                value={form.numberOfOpenings}
                onChange={(e) => setForm({ ...form, numberOfOpenings: Number(e.target.value) })}
                className="mt-1.5 w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Role Summary / Requirements</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
              placeholder="Provide brief role responsibilities and expectations..."
            />
          </div>

          <Button
            type="submit"
            loading={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer mt-2"
          >
            {editId ? "Update Position" : "Create Position"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}