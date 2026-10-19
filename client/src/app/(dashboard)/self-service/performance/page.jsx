"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  Star,
  Award,
  Calendar,
  ChevronRight,
  X,
  Target,
  UserCheck,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Search,
  MoreVertical,
  Eye,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyPerformancePage() {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      user?.userId ||
      null
    );
  }, [user]);

  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.appraisals)) return resData.appraisals;
    if (Array.isArray(resData?.reviews)) return resData.reviews;
    if (Array.isArray(resData?.result)) return resData.result;
    if (Array.isArray(resData?.performance)) return resData.performance;
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let records = [];
      const personalEndpoints = [
        "/performance/my-appraisals",
        "/performance/my-reviews",
        "/performance/me",
        "/performance-appraisals/my",
        "/performance/appraisals",
      ];

      for (const endpoint of personalEndpoints) {
        try {
          const res = await api.get(endpoint);
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
            break;
          }
        } catch {
          // Continue
        }
      }

      setAppraisals(records);
    } catch (err) {
      console.error("Appraisals fetch error:", err);
      toast.error("Unable to sync performance records.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [extractList]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedAppraisal(null);
        setActiveDropdown(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    setActiveDropdown(null);

    if (!window.confirm("Are you sure you want to delete this appraisal record?")) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/performance/${id}`);
      toast.success("Appraisal record deleted successfully.");
      setAppraisals((prev) => prev.filter((item) => (item._id || item.id) !== id));
      if (selectedAppraisal && (selectedAppraisal._id === id || selectedAppraisal.id === id)) {
        setSelectedAppraisal(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete appraisal record.");
    } finally {
      setDeletingId(null);
    }
  };

  const statusVariant = {
    completed: "success",
    approved: "success",
    published: "success",
    pending: "warning",
    in_progress: "info",
    under_review: "info",
    rejected: "danger",
  };

  const getRating = (item) => {
    const val = item?.rating ?? item?.overallRating ?? item?.score ?? item?.finalScore;
    if (val === undefined || val === null) return null;
    return typeof val === "number" ? val.toFixed(1) : val;
  };

  const getPeriod = (item) => {
    return (
      item?.reviewPeriod ||
      item?.period ||
      item?.cycle ||
      item?.title ||
      (item?.year ? `${item.year} Annual Appraisal` : "Periodic Performance Appraisal")
    );
  };

  const filteredAppraisals = useMemo(() => {
    if (!searchTerm.trim()) return appraisals;
    const q = searchTerm.toLowerCase();
    return appraisals.filter((a) => {
      const period = getPeriod(a).toLowerCase();
      const status = String(a.status || "").toLowerCase();
      return period.includes(q) || status.includes(q);
    });
  }, [appraisals, searchTerm]);

  if (loading && !isRefreshing) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading your appraisals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-16 px-3 sm:px-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-md shadow-indigo-100 shrink-0">
            <Award size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Performance Appraisals</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={12} /> Active Cycle
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track periodic evaluation cycles, manager feedback, ratings, and career milestones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search appraisal period or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="text-xs font-semibold text-slate-600">
          Total Appraisals: <span className="text-indigo-600 font-bold">{filteredAppraisals.length}</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredAppraisals.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500">
              <Award size={28} />
            </div>
            <p className="text-sm font-bold text-slate-800">No appraisal records published yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When management evaluates and submits your periodic performance review, it will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Review Period / Cycle</th>
                  <th className="px-4 py-3.5">Review Date</th>
                  <th className="px-4 py-3.5">Evaluator</th>
                  <th className="px-4 py-3.5">Rating Score</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppraisals.map((a, idx) => {
                  const appraisalId = a._id || a.id || idx;
                  const ratingVal = getRating(a);
                  const periodVal = getPeriod(a);
                  const statusVal = a.status || a.state || "completed";
                  const evaluatorName =
                    a.reviewer?.name ||
                    a.reviewer?.fullName ||
                    a.reviewer ||
                    a.manager?.name ||
                    "Leadership Team";
                  const reviewDateFormatted = a.reviewDate || a.createdAt || a.date
                    ? new Date(a.reviewDate || a.createdAt || a.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                    : "Recent Cycle";

                  const isDropdownOpen = activeDropdown === appraisalId;

                  return (
                    <tr key={appraisalId} className="hover:bg-indigo-50/40 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                            <TrendingUp size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{periodVal}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {a.strengths || a.feedback || "Performance review document"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap flex items-center gap-1.5 mt-2.5">
                        <Calendar size={13} className="text-slate-400" />
                        {reviewDateFormatted}
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {evaluatorName}
                      </td>

                      <td className="px-4 py-3.5">
                        {ratingVal !== null ? (
                          <div className="inline-flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 font-mono">
                            <Star size={13} className="fill-amber-400 text-amber-400" />
                            <span className="font-bold text-amber-900">{ratingVal} / 5.0</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant[statusVal?.toLowerCase()] || "neutral"}>
                          {String(statusVal).replace(/_/g, " ")}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(isDropdownOpen ? null : appraisalId);
                          }}
                          className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-500 transition cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isDropdownOpen && (
                          <div
                            ref={dropdownRef}
                            className="absolute right-6 top-12 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-100 text-left"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setSelectedAppraisal(a);
                              }}
                              className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition cursor-pointer"
                            >
                              <Eye size={14} className="text-slate-400" /> View Details
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(appraisalId, e)}
                              disabled={deletingId === appraisalId}
                              className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                            >
                              {deletingId === appraisalId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Modal */}
      {selectedAppraisal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedAppraisal(null)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-indigo-600 shadow-2xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {getPeriod(selectedAppraisal)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Evaluation summary & feedback</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppraisal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/70 rounded-2xl">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Score Achieved
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star size={20} className="fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-black text-slate-900">
                      {getRating(selectedAppraisal) || "N/A"}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 self-end mb-1">/ 5.0</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[selectedAppraisal.status?.toLowerCase()] || "neutral"}>
                    {String(selectedAppraisal.status || "Completed").replace(/_/g, " ")}
                  </Badge>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    {selectedAppraisal.reviewDate || selectedAppraisal.createdAt
                      ? new Date(selectedAppraisal.reviewDate || selectedAppraisal.createdAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>

              {(selectedAppraisal.reviewer || selectedAppraisal.evaluator || selectedAppraisal.manager) && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-indigo-950 text-xs">
                  <UserCheck size={16} className="text-indigo-600 shrink-0" />
                  <span>Evaluated by:</span>
                  <strong className="font-semibold text-slate-900">
                    {selectedAppraisal.reviewer?.name ||
                      selectedAppraisal.reviewer?.fullName ||
                      selectedAppraisal.reviewer ||
                      selectedAppraisal.manager?.name ||
                      "Leadership Team"}
                  </strong>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <ThumbsUp size={14} />
                  <span>Key Strengths & Wins</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {selectedAppraisal.strengths || selectedAppraisal.achievements || "No specific strengths highlighted."}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <AlertTriangle size={14} />
                  <span>Areas of Focus & Improvement</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {selectedAppraisal.areasOfImprovement ||
                    selectedAppraisal.improvements ||
                    "No critical gaps highlighted for this cycle."}
                </div>
              </div>

              {(selectedAppraisal.goals || selectedAppraisal.targets) && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                    <Target size={14} />
                    <span>Future Objectives</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    {typeof selectedAppraisal.goals === "string"
                      ? selectedAppraisal.goals
                      : JSON.stringify(selectedAppraisal.goals, null, 2)}
                  </div>
                </div>
              )}

              {(selectedAppraisal.feedback || selectedAppraisal.remarks || selectedAppraisal.comments) && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <MessageSquare size={14} />
                    <span>Manager Comments</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    {selectedAppraisal.feedback || selectedAppraisal.remarks || selectedAppraisal.comments}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={(e) => handleDelete(selectedAppraisal._id || selectedAppraisal.id, e)}
                disabled={deletingId === (selectedAppraisal._id || selectedAppraisal.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                {deletingId === (selectedAppraisal._id || selectedAppraisal.id) ? (
                  <Loader2 size={14} className="animate-spin text-rose-600" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete Record
              </button>

              <button
                type="button"
                onClick={() => setSelectedAppraisal(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}