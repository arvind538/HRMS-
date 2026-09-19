// src/app/(dashboard)/performance/appraisals/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, User, CalendarClock, Star, Search, ChevronDown, RefreshCw, PenLine, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

export default function AppraisalsPage() {
  const [appraisals, setAppraisals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cycle Create Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employee: "", reviewPeriod: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Rating Modal states
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingForm, setRatingForm] = useState({
    rating: 5,
    strengths: "",
    areasOfImprovement: "",
    promotionRecommended: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apprRes, empRes] = await Promise.all([
        api.get("/performance/appraisals"),
        api.get("/employees").catch(() => api.get("/employee"))
      ]);

      const apprData = apprRes?.data;
      const parsedAppraisals = Array.isArray(apprData)
        ? apprData
        : Array.isArray(apprData?.data)
          ? apprData.data
          : Array.isArray(apprData?.appraisals)
            ? apprData.appraisals
            : [];

      const empData = empRes?.data;
      const parsedEmployees = Array.isArray(empData)
        ? empData
        : Array.isArray(empData?.data)
          ? empData.data
          : Array.isArray(empData?.employees)
            ? empData.employees
            : [];

      setAppraisals(parsedAppraisals);
      setEmployees(parsedEmployees);
    } catch (err) {
      console.error("Error loading appraisals:", err);
      toast.error("Failed to load appraisals. Please check network.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create Cycle
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.employee) {
      toast.warning("Please select a valid employee from the list.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/performance/appraisals", form);
      const created = res.data?.data || res.data;
      setAppraisals(prev => [created, ...prev]);
      toast.success("Appraisal cycle started successfully! 🎉");
      handleCloseModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create appraisal cycle.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setForm({ employee: "", reviewPeriod: "" });
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  // Open Rating Modal
  const handleOpenRating = (appraisal) => {
    setSelectedAppraisal(appraisal);
    setRatingForm({
      rating: appraisal.rating || 5,
      strengths: appraisal.strengths || "",
      areasOfImprovement: appraisal.areasOfImprovement || "",
      promotionRecommended: Boolean(appraisal.promotionRecommended),
    });
    setRatingModalOpen(true);
  };

  // Submit Rating & Mark Completed with Fallback Paths
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!selectedAppraisal) return;

    const appraisalId = selectedAppraisal._id || selectedAppraisal.id;

    setRatingSubmitting(true);
    try {
      const payload = {
        rating: Number(ratingForm.rating),
        strengths: ratingForm.strengths,
        areasOfImprovement: ratingForm.areasOfImprovement,
        promotionRecommended: ratingForm.promotionRecommended,
        status: "completed"
      };

      let success = false;
      let updatedRecord = null;

      try {
        const res = await api.put(`/performance/appraisals/${appraisalId}`, payload);
        updatedRecord = res.data?.data || res.data;
        success = true;
      } catch (err1) {
        console.warn("Route 1 failed, trying fallback route...", err1);
        try {
          const res = await api.put(`/performance/${appraisalId}`, payload);
          updatedRecord = res.data?.data || res.data;
          success = true;
        } catch (err2) {
          console.warn("Route 2 failed, trying review route...", err2);
          const res = await api.put(`/performance/appraisals/${appraisalId}/review`, payload);
          updatedRecord = res.data?.data || res.data;
          success = true;
        }
      }

      if (success) {
        if (updatedRecord && typeof updatedRecord === "object") {
          setAppraisals(prev => prev.map(a => ((a._id || a.id) === appraisalId ? updatedRecord : a)));
        } else {
          fetchData();
        }
        toast.success("Performance rating submitted successfully! ⭐");
        setRatingModalOpen(false);
      }
    } catch (err) {
      console.error("Error saving rating:", err);
      toast.error(err.response?.data?.message || "Failed to save rating. Please check backend routes.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusVariant = {
    "pending-self": "warning",
    "pending-manager": "info",
    "completed": "success"
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => {
        const empObj = typeof r.employee === 'object' && r.employee !== null
          ? r.employee
          : employees.find(e => (e._id || e.id) === r.employee);

        const empName = empObj?.name || r.employeeName || "Unknown Employee";

        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-2xs shrink-0">
              {empName.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-slate-900 text-sm">{empName}</span>
          </div>
        );
      }
    },
    {
      key: "reviewPeriod",
      label: "Review Period",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/80 font-mono">
          <CalendarClock size={14} className="text-slate-400 shrink-0" />
          {r.reviewPeriod || r.period || "—"}
        </span>
      )
    },
    {
      key: "rating",
      label: "Rating",
      render: (r) => {
        const ratingVal = Number(r.rating ?? r.score);
        return !isNaN(ratingVal) && ratingVal > 0 ? (
          <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
            <Star size={15} fill="currentColor" />
            <span className="text-slate-800 font-mono font-bold">{ratingVal.toFixed(1)}</span>
            <span className="text-slate-400 text-xs font-normal">/5</span>
          </div>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 italic">
            Not rated yet
          </span>
        );
      }
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge variant={statusVariant[r.status] || "neutral"}>
          {r.status || "Unknown"}
        </Badge>
      )
    },
    {
      key: "action",
      label: "Action",
      render: (r) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => handleOpenRating(r)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-semibold border border-indigo-100 transition-all duration-200 shadow-2xs cursor-pointer active:scale-95"
          >
            <PenLine size={13} />
            <span>{r.rating ? "Edit Rating" : "Add Rating"}</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 font-sans antialiased text-slate-900">

      {/* Header Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Appraisals</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
              <Sparkles size={12} className="text-indigo-500" /> Review Cycles
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage employee appraisal cycles, submit performance ratings, and track evaluations seamlessly.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
          <Button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold px-4.5 py-3 rounded-xl cursor-pointer text-xs"
          >
            <Plus size={16} /> Start Appraisal
          </Button>
        </div>
      </div>

      {/* Table Section with Hover & Responsive Layout */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-md">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs text-slate-500 font-medium animate-pulse">Loading appraisals...</p>
          </div>
        ) : appraisals.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Appraisals Found</h3>
            <p className="text-xs text-slate-500 mt-1">No appraisal cycles have been started yet. Click 'Start Appraisal' to begin.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Review Period</th>
                    <th className="py-4 px-6">Rating</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {appraisals.map((r) => {
                    const id = r._id || r.id;
                    const empObj = typeof r.employee === 'object' && r.employee !== null
                      ? r.employee
                      : employees.find(e => (e._id || e.id) === r.employee);
                    const empName = empObj?.name || r.employeeName || "Unknown Employee";
                    const ratingVal = Number(r.rating ?? r.score);

                    return (
                      <tr key={id} className="hover:bg-indigo-50/40 transition-colors duration-150 group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-2xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {empName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{empName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/80 font-mono">
                            <CalendarClock size={14} className="text-slate-400 shrink-0" />
                            {r.reviewPeriod || r.period || "—"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {!isNaN(ratingVal) && ratingVal > 0 ? (
                            <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
                              <Star size={15} fill="currentColor" />
                              <span className="text-slate-800 font-mono font-bold">{ratingVal.toFixed(1)}</span>
                              <span className="text-slate-400 text-xs font-normal">/5</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 italic">
                              Not rated yet
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <Badge variant={statusVariant[r.status] || "neutral"}>
                            {r.status || "Unknown"}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenRating(r)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-semibold border border-indigo-100 transition-all duration-200 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <PenLine size={13} />
                            <span>{r.rating ? "Edit Rating" : "Add Rating"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {appraisals.map((r) => {
                const id = r._id || r.id;
                const empObj = typeof r.employee === 'object' && r.employee !== null
                  ? r.employee
                  : employees.find(e => (e._id || e.id) === r.employee);
                const empName = empObj?.name || r.employeeName || "Unknown Employee";
                const ratingVal = Number(r.rating ?? r.score);

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                          {empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{empName}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">{r.reviewPeriod || r.period || "—"}</span>
                        </div>
                      </div>
                      <Badge variant={statusVariant[r.status] || "neutral"}>{r.status || "Unknown"}</Badge>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Performance Score:</span>
                      {!isNaN(ratingVal) && ratingVal > 0 ? (
                        <div className="flex items-center gap-1 text-amber-500 font-bold font-mono">
                          <Star size={14} fill="currentColor" />
                          <span>{ratingVal.toFixed(1)}/5</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not rated</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenRating(r)}
                      className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-indigo-100 transition cursor-pointer shadow-2xs"
                    >
                      <PenLine size={14} />
                      <span>{r.rating ? "Edit Performance Rating" : "Add Performance Rating"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL 1: START APPRAISAL */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title="Start Appraisal Cycle">
        <form onSubmit={handleCreate} className="space-y-4 mt-2 text-xs">
          <div className="relative">
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
              <User size={14} className="text-slate-400" /> Employee
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required={!form.employee}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setForm({ ...form, employee: "" });
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                placeholder="Type to search employee..."
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredEmployees.length > 0 ? (
                  <div className="p-1">
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp._id || emp.id}
                        onClick={() => {
                          setForm({ ...form, employee: emp._id || emp.id });
                          setSearchQuery(emp.name);
                          setIsDropdownOpen(false);
                        }}
                        className="px-3.5 py-2.5 hover:bg-indigo-50/70 rounded-lg cursor-pointer text-slate-700 font-medium transition-colors"
                      >
                        {emp.name} {emp.employeeId ? `(${emp.employeeId})` : ""}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-slate-500">No employee found</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
              <CalendarClock size={14} className="text-slate-400" /> Review Period
            </label>
            <input
              required
              value={form.reviewPeriod}
              onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value })}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
              placeholder="e.g., 2026-H1 or 2026-Q3"
            />
          </div>

          <div className="pt-3 flex gap-2.5 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95">
              {submitting ? 'Starting Cycle...' : 'Start Cycle'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD / EDIT PERFORMANCE RATING */}
      <Modal isOpen={ratingModalOpen} onClose={() => setRatingModalOpen(false)} title="Submit Performance Review & Rating">
        <form onSubmit={handleSubmitRating} className="space-y-4 mt-2 text-xs">

          {/* Interactive Star Rating Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Performance Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl w-fit">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRatingForm({ ...ratingForm, rating: star })}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <Star
                    size={24}
                    className={`${star <= (hoverRating || ratingForm.rating)
                      ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                      : "fill-slate-200 text-slate-200"
                      } transition-colors`}
                  />
                </button>
              ))}
              <span className="ml-3 font-bold text-slate-800 font-mono text-sm">
                {ratingForm.rating}/5
              </span>
            </div>
          </div>

          {/* Strengths */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Key Strengths & Achievements
            </label>
            <textarea
              rows={3}
              required
              value={ratingForm.strengths}
              onChange={(e) => setRatingForm({ ...ratingForm, strengths: e.target.value })}
              placeholder="e.g., Excellent problem-solving skills, completed projects before deadlines..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-y"
            />
          </div>

          {/* Areas of Improvement */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Areas of Improvement
            </label>
            <textarea
              rows={3}
              required
              value={ratingForm.areasOfImprovement}
              onChange={(e) => setRatingForm({ ...ratingForm, areasOfImprovement: e.target.value })}
              placeholder="e.g., Can improve communication in meetings, time management..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-y"
            />
          </div>

          {/* Promotion Recommended Toggle */}
          <div className="flex items-center gap-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <input
              type="checkbox"
              id="promotion"
              checked={ratingForm.promotionRecommended}
              onChange={(e) => setRatingForm({ ...ratingForm, promotionRecommended: e.target.checked })}
              className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="promotion" className="font-semibold text-indigo-900 cursor-pointer flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              Recommend for Promotion
            </label>
          </div>

          <div className="pt-3 flex gap-2.5 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRatingModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={ratingSubmitting}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95 font-semibold"
            >
              {ratingSubmitting ? 'Saving Review...' : 'Submit Final Rating'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}