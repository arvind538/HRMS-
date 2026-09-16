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
        api.get("/employees")
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
      await api.post("/performance/appraisals", form);
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

      // Try Route 1: /performance/appraisals/:id
      try {
        await api.put(`/performance/appraisals/${appraisalId}`, payload);
        success = true;
      } catch (err1) {
        console.warn("Route 1 failed, trying fallback route...", err1);

        // Try Route 2 (Fallback): /performance/:id (agar backend me ye ho)
        try {
          await api.put(`/performance/${appraisalId}`, payload);
          success = true;
        } catch (err2) {
          console.warn("Route 2 failed, trying review route...", err2);

          // Try Route 3 (Fallback): /performance/appraisals/${appraisalId}/review
          await api.put(`/performance/appraisals/${appraisalId}/review`, payload);
          success = true;
        }
      }

      if (success) {
        toast.success("Performance rating submitted successfully! ⭐");
        setRatingModalOpen(false);
        fetchData();
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
          : employees.find(e => e._id === r.employee || e.id === r.employee);

        const empName = empObj?.name || r.employeeName || "Unknown Employee";

        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm flex-shrink-0">
              {empName.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-slate-800">{empName}</span>
          </div>
        );
      }
    },
    {
      key: "reviewPeriod",
      label: "Review Period",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs sm:text-sm font-medium border border-slate-200">
          <CalendarClock size={14} className="text-slate-400 flex-shrink-0" />
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
            <Star size={16} fill="currentColor" />
            <span className="text-slate-800">{ratingVal.toFixed(1)}</span>
            <span className="text-slate-400 text-xs font-normal">/5</span>
          </div>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 italic">
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
        <button
          onClick={() => handleOpenRating(r)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-semibold border border-indigo-100 transition-all duration-200 shadow-sm cursor-pointer active:scale-95"
        >
          <PenLine size={13} />
          {r.rating ? "Edit Rating" : "Add Rating"}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appraisals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage employee appraisal cycles, submit ratings, and track performance.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
          <Button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl"
          >
            <Plus size={18} /> Start Appraisal
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm text-slate-500 font-medium animate-pulse">Loading appraisals...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={appraisals}
            emptyText="No appraisal cycles have been started yet."
          />
        )}
      </div>

      {/* MODAL 1: START APPRAISAL */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title="Start Appraisal Cycle">
        <form onSubmit={handleCreate} className="space-y-5 mt-2">
          <div className="relative">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <User size={16} className="text-slate-400" /> Employee
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              />
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                        className="px-3 py-2.5 hover:bg-indigo-50/70 rounded-lg cursor-pointer text-sm text-slate-700 font-medium transition-colors"
                      >
                        {emp.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-sm text-slate-700 font-medium">No employee found</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <CalendarClock size={16} className="text-slate-400" /> Review Period
            </label>
            <input
              required
              value={form.reviewPeriod}
              onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              placeholder="e.g., 2026-H1 or 2026-Q3"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? 'Starting Cycle...' : 'Start Cycle'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD / EDIT PERFORMANCE RATING */}
      <Modal isOpen={ratingModalOpen} onClose={() => setRatingModalOpen(false)} title="Submit Performance Review & Rating">
        <form onSubmit={handleSubmitRating} className="space-y-5 mt-2">
          {/* Interactive Star Rating Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                    size={26}
                    className={`${star <= (hoverRating || ratingForm.rating)
                      ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                      : "fill-slate-200 text-slate-200"
                      } transition-colors`}
                  />
                </button>
              ))}
              <span className="ml-3 font-bold text-slate-800 text-base">
                {ratingForm.rating}/5
              </span>
            </div>
          </div>

          {/* Strengths */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Key Strengths & Achievements
            </label>
            <textarea
              rows={3}
              required
              value={ratingForm.strengths}
              onChange={(e) => setRatingForm({ ...ratingForm, strengths: e.target.value })}
              placeholder="e.g., Excellent problem-solving skills, completed projects before deadlines..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
            />
          </div>

          {/* Areas of Improvement */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Areas of Improvement
            </label>
            <textarea
              rows={3}
              required
              value={ratingForm.areasOfImprovement}
              onChange={(e) => setRatingForm({ ...ratingForm, areasOfImprovement: e.target.value })}
              placeholder="e.g., Can improve communication in meetings, time management..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
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
            <label htmlFor="promotion" className="text-sm font-semibold text-indigo-900 cursor-pointer flex items-center gap-1.5">
              <Sparkles size={16} className="text-indigo-600" />
              Recommend for Promotion
            </label>
          </div>

          <div className="pt-3 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRatingModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={ratingSubmitting}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 font-semibold"
            >
              {ratingSubmitting ? 'Saving Review...' : 'Submit Final Rating'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}