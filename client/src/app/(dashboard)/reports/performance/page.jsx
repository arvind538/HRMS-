// src/app/(dashboard)/reports/performance/page.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  Award,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  BarChart2,
  ArrowUpRight,
  ChevronRight,
  X,
  Search,
  User,
  ShieldCheck,
  Percent,
  Activity,
  Target,
  Building2,
  Loader2,
  Briefcase
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function PerformanceReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [goalsList, setGoalsList] = useState([]);
  const [appraisalsList, setAppraisalsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Center Modal States
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const extractArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.goals)) return res.goals;
    if (Array.isArray(res.appraisals)) return res.appraisals;
    if (Array.isArray(res.employees)) return res.employees;
    if (Array.isArray(res.records)) return res.records;
    return [];
  };

  const fetchPerformanceReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [reportRes, goalsRes, apprRes, empRes] = await Promise.allSettled([
        api.get("/performance/aggregate-report"),
        api.get("/performance/goals"),
        api.get("/performance/appraisals"),
        api.get("/employees")
      ]);

      const rep = reportRes.status === "fulfilled" ? reportRes.value?.data : null;
      const goals = goalsRes.status === "fulfilled" ? extractArray(goalsRes.value?.data) : [];
      const appraisals = apprRes.status === "fulfilled" ? extractArray(apprRes.value?.data) : [];
      const employees = empRes.status === "fulfilled" ? extractArray(empRes.value?.data) : [];

      setReportData(rep?.data || rep || {});
      setGoalsList(goals);
      setAppraisalsList(appraisals);
      setEmployeesList(employees);
    } catch (err) {
      console.error("Error fetching performance reports:", err);
      setError(err.response?.data?.message || err.message || "Failed to load performance analytics.");
      toast.error("Failed to load performance reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformanceReports();
  }, [fetchPerformanceReports]);

  // Employee ID to Department Lookup Map
  const empDeptLookup = useMemo(() => {
    const map = {};
    employeesList.forEach((emp) => {
      const id = String(emp._id || emp.id || "");
      let d = "General";
      if (typeof emp.department === "string") d = emp.department;
      else if (emp.department?.name) d = emp.department.name;
      else if (emp.department?.title) d = emp.department.title;

      if (id) map[id] = d.trim();
    });
    return map;
  }, [employeesList]);

  // Safe Department Name Resolver
  const getDept = useCallback((item) => {
    if (!item) return "General";

    if (typeof item.department === "string" && item.department.trim() !== "") {
      return item.department.trim();
    }
    if (item.department?.name) return String(item.department.name).trim();
    if (item.department?.title) return String(item.department.title).trim();

    // From assigned employee
    if (item.employee) {
      if (typeof item.employee === "object") {
        if (typeof item.employee.department === "string") return item.employee.department.trim();
        if (item.employee.department?.name) return item.employee.department.name.trim();
        const empId = String(item.employee._id || item.employee.id || "");
        if (empDeptLookup[empId]) return empDeptLookup[empId];
      } else {
        const empId = String(item.employee);
        if (empDeptLookup[empId]) return empDeptLookup[empId];
      }
    }

    return "General";
  }, [empDeptLookup]);

  // Safe Metric Calculations
  const completedGoals = goalsList.filter(g => (g.status || "").toLowerCase() === "completed").length;
  const goalCompletionRate = reportData?.goalCompletionRate
    ? Math.round(Number(reportData.goalCompletionRate))
    : (goalsList.length > 0 ? Math.round((completedGoals / goalsList.length) * 100) : 0);

  const validRatings = appraisalsList.filter(a => typeof a.rating === "number" && !isNaN(a.rating));
  const avgAppraisalRating = reportData?.averageAppraisalRating
    ? Number(reportData.averageAppraisalRating).toFixed(1)
    : (validRatings.length > 0
      ? (validRatings.reduce((sum, a) => sum + a.rating, 0) / validRatings.length).toFixed(1)
      : "0.0");

  const teamScore = reportData?.teamPerformanceScore ?? (goalCompletionRate > 0 ? `${goalCompletionRate}%` : "—");
  const totalReviews = reportData?.totalAppraisals ?? appraisalsList.length;

  // Clean Department Breakdown with Rounded Scores
  const departmentBreakdown = useMemo(() => {
    const rawDepts = reportData?.departmentBreakdown;

    if (Array.isArray(rawDepts) && rawDepts.length > 0) {
      return rawDepts.map((d) => {
        const rawScore = Number(d.score || d.performanceScore || d.rate || 0);
        return {
          ...d,
          name: d.name || d.department || d._id || "General",
          score: Math.round(rawScore * 10) / 10,
          goalsCompleted: d.goalsCompleted ?? d.completed ?? 0,
          totalGoals: d.totalGoals ?? d.targets ?? d.total ?? (d.goals?.length || 0),
          embeddedGoals: d.goals || d.records || d.targetsList || []
        };
      });
    }

    // Dynamic fallback from Goals & Employees
    const deptMap = {};
    goalsList.forEach((g) => {
      const dName = getDept(g);
      if (!deptMap[dName]) {
        deptMap[dName] = { name: dName, total: 0, completed: 0, goals: [] };
      }
      deptMap[dName].total += 1;
      deptMap[dName].goals.push(g);
      if ((g.status || "").toLowerCase() === "completed" || g.progress === 100) {
        deptMap[dName].completed += 1;
      }
    });

    return Object.values(deptMap).map(d => ({
      name: d.name,
      score: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      goalsCompleted: d.completed,
      totalGoals: d.total,
      embeddedGoals: d.goals
    }));
  }, [reportData, goalsList, getDept]);

  // Center Modal Click Handler
  const handleCardClick = async (metricType, metricTitle, customPayload = null) => {
    setActiveMetric({ type: metricType, title: metricTitle, payload: customPayload });
    setSearchFilter("");

    if (metricType === "adherence") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      let filtered = [];

      if (metricType === "goals") {
        filtered = goalsList.map(g => ({
          _id: g._id || g.id || Math.random(),
          title: g.title || "Goal Objective",
          name: g.employee?.name || g.employeeName || "Team Member",
          subtext: `Status: ${g.status || 'Active'} • Department: ${getDept(g)}`,
          status: g.status || "In Progress",
          score: `${g.progress || 0}%`,
          date: g.dueDate
        }));
      } else if (metricType === "appraisals") {
        filtered = appraisalsList.map(a => ({
          _id: a._id || a.id || Math.random(),
          title: a.title || "Performance Appraisal Review",
          name: a.employee?.name || a.employeeName || "Reviewee",
          subtext: a.feedback || a.comments || `Rating: ${a.rating || 0} / 5.0`,
          status: a.status || "Evaluated",
          score: `${a.rating || 0} / 5.0`,
          date: a.createdAt || a.reviewDate
        }));
      } else if (metricType === "department") {
        const targetDept = (customPayload?.name || "").toLowerCase().trim();

        // 1. Direct embedded records from backend aggregate report
        if (customPayload?.embeddedGoals && Array.isArray(customPayload.embeddedGoals) && customPayload.embeddedGoals.length > 0) {
          filtered = customPayload.embeddedGoals.map(g => ({
            _id: g._id || g.id || Math.random(),
            title: g.title || `${customPayload.name} Target`,
            name: g.employee?.name || g.employeeName || g.assignedTo || "Team Member",
            subtext: `Target: ${g.progress || 0}% • Status: ${g.status || 'Active'}`,
            status: g.status || "In Progress",
            score: `${g.progress || 0}%`,
            date: g.dueDate
          }));
        }

        // 2. Filter from goalsList
        if (filtered.length === 0) {
          const matchedGoals = goalsList.filter(g => {
            const d = getDept(g).toLowerCase().trim();
            return d === targetDept || d.includes(targetDept) || targetDept.includes(d);
          });

          if (matchedGoals.length > 0) {
            filtered = matchedGoals.map(g => ({
              _id: g._id || g.id,
              title: g.title || `${customPayload?.name} Goal Target`,
              name: g.employee?.name || g.employeeName || "Assigned Personnel",
              subtext: `Progress: ${g.progress || 0}% • Status: ${g.status || 'Active'}`,
              status: g.status || "In Progress",
              score: `${g.progress || 0}%`,
              date: g.dueDate
            }));
          }
        }

        // 3. Fallback to Staff Directory for this department
        if (filtered.length === 0) {
          const matchedStaff = employeesList.filter(e => {
            let d = "general";
            if (typeof e.department === "string") d = e.department.toLowerCase().trim();
            else if (e.department?.name) d = e.department.name.toLowerCase().trim();
            return d === targetDept || d.includes(targetDept) || targetDept.includes(d);
          });

          filtered = matchedStaff.map(emp => ({
            _id: emp._id || emp.id,
            title: emp.designation || emp.role || `${customPayload?.name} Specialist`,
            name: emp.name || emp.fullName || "Staff Member",
            subtext: `ID: ${emp.employeeId || emp.empId || emp._id?.slice(-6) || '—'} • ${emp.email || 'Active Duty'}`,
            status: emp.status || "Active",
            score: "Active Member",
            date: emp.joiningDate
          }));
        }
      } else {
        filtered = goalsList.map(g => ({
          _id: g._id || g.id,
          title: g.title || "Milestone Target",
          name: g.employee?.name || g.employeeName || "Staff Member",
          subtext: `Department: ${getDept(g)}`,
          status: g.status || "Active",
          score: `${g.progress || 0}%`,
          date: g.dueDate
        }));
      }

      setDrilldownLogs(filtered);
    } catch (err) {
      console.error("Modal filter error:", err);
      setDrilldownLogs([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const visibleLogs = useMemo(() => {
    return drilldownLogs.filter((log) => {
      const q = searchFilter.toLowerCase().trim();
      if (!q) return true;
      const name = (log.name || "").toLowerCase();
      const title = (log.title || "").toLowerCase();
      const subtext = (log.subtext || "").toLowerCase();
      return name.includes(q) || title.includes(q) || subtext.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 animate-pulse">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
        </div>
        <p className="text-sm font-semibold text-slate-700">Synthesizing performance reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-rose-50 rounded-3xl border border-rose-100 text-center max-w-lg mx-auto my-10 space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h3 className="text-lg font-bold text-rose-800">Failed to load reports</h3>
        <p className="text-xs text-rose-600">{error}</p>
        <button
          onClick={fetchPerformanceReports}
          className="mt-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 font-sans text-slate-900 antialiased">

      {/* Header & Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Performance Reports
            </h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <ShieldCheck size={12} /> Live Insights
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Goal completion rates, appraisal reviews, aur department-wise performance metrics. Click any card to inspect full lists.
          </p>
        </div>

        <button
          onClick={fetchPerformanceReports}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer w-full sm:w-auto text-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Main 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Goal Completion Rate Card */}
        <div
          onClick={() => handleCardClick("goals", "Organizational Goal Execution")}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                <Target size={22} />
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 font-mono group-hover:bg-indigo-100">
                Objectives
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Goal Completion Rate</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {goalCompletionRate}%
              </h3>
              <span className="text-xs text-slate-400 font-semibold">achieved</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
            <span>Inspect goal records</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Average Appraisal Rating Card */}
        <div
          onClick={() => handleCardClick("appraisals", "Performance Appraisal Reviews")}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-2xs">
                <Award size={22} />
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono group-hover:bg-amber-100">
                Index
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Appraisal Rating</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {avgAppraisalRating}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">/ 5.0 scale</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-amber-600 transition-colors">
            <span>View evaluated reviews</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Team Performance Score Card */}
        <div
          onClick={() => handleCardClick("all", "Total Team Score Assessment")}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                <TrendingUp size={22} />
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono group-hover:bg-emerald-100">
                Output
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Team Performance Score</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {teamScore}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">efficiency</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
            <span>Review KPI output</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Compliance Card */}
      <div
        onClick={() => handleCardClick("adherence", "Performance Fulfillment Analysis", {
          goalCompletionRate,
          avgAppraisalRating,
          completedGoals,
          totalReviews
        })}
        className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer group"
      >
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3.5 bg-emerald-50 group-hover:bg-emerald-500 group-hover:text-white transition-colors border border-emerald-100 rounded-2xl text-emerald-600 font-bold shadow-2xs">
            <Percent size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                Strategic Performance Compliance Rate
              </h4>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
                Inspect <ArrowUpRight size={12} />
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Ratio of confirmed goal completions and appraisal cycles across the organization.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-80 shrink-0">
          <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
              style={{ width: `${Math.min(100, Math.max(0, goalCompletionRate))}%` }}
            />
          </div>
          <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
            {goalCompletionRate}%
          </span>
          <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all hidden sm:block" />
        </div>
      </div>

      {/* Department-wise Breakdown Container */}
      <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                Department-wise Performance Breakdown
              </h3>
              <p className="text-xs text-slate-500">Click any department bar to inspect department-specific goals and staff.</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit font-mono">
            {departmentBreakdown.length} Departments
          </span>
        </div>

        {departmentBreakdown.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No department performance records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Assigned goals per department will plot here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departmentBreakdown.map((dept, index) => {
              const displayScore = dept.score;
              const targetCount = dept.totalGoals ?? (dept.embeddedGoals?.length || 0);

              return (
                <div
                  key={index}
                  onClick={() => handleCardClick("department", `${dept.name} Performance Targets`, dept)}
                  className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  {/* Department Name */}
                  <div className="w-full sm:w-56 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 group-hover:scale-125 transition-transform" />
                      <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {dept.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                      Score: {displayScore}%
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="h-full bg-indigo-600 group-hover:bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(displayScore, 5))}%` }}
                    />
                  </div>

                  {/* Score & Arrow */}
                  <div className="hidden sm:flex items-center justify-end gap-3 w-48 shrink-0">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {displayScore}% <span className="text-slate-400 font-normal font-sans">({targetCount} targets)</span>
                    </span>
                    <div className="p-1 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Center-Screen Popup Modal */}
      {activeMetric && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveMetric(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xs">
                  {activeMetric.type === "adherence" ? <Activity size={22} /> : <Target size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {activeMetric.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Performance Insight • <span className="font-bold text-indigo-600 font-mono">{drilldownLogs.length}</span> Records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMetric(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {activeMetric.type === "adherence" ? (
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Goal Execution Index</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      {goalCompletionRate}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    {goalCompletionRate >= 75 ? "Excellent goal progression recorded across units." : "Execution rate is below strategic benchmark (75%)."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Indicators</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Completed Goals</span>
                      <span className="text-lg font-bold text-indigo-600 font-mono">{completedGoals}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Appraisal Rating</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{avgAppraisalRating}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Total Appraisals</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{totalReviews}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Active Department Units:</span>
                    <span className="font-bold text-slate-900 font-mono">{departmentBreakdown.length} Tracked</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Performance Rating Benchmark:</span>
                    <span className="font-bold text-slate-900 font-mono">Target: 4.0 / 5.0</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name, title, or target status..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
                  {drilldownLoading ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-indigo-600" size={30} />
                      <p className="text-xs font-semibold">Pulling performance records...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No performance records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter ? "No staff or goal matches your query." : "No explicit records registered in this category."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((item) => (
                      <div
                        key={item._id || Math.random()}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                            {item.name.slice(0, 2)}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">{item.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.subtext}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold font-mono text-indigo-600 block">
                            {item.score}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 capitalize block mt-0.5">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Modal Bottom Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setActiveMetric(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}