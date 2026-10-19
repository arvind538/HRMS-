// src/app/(dashboard)/reports/employees/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Users,
  UserCheck,
  UserX,
  Building2,
  RefreshCw,
  ChevronRight,
  X,
  Mail,
  Briefcase,
  Search,
  IdCard,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

// Safely normalize and extract department name
const extractDeptName = (emp) => {
  if (!emp) return "Unassigned";
  const dept = emp.department;
  if (!dept) return "Unassigned";
  if (typeof dept === "string") {
    const trimmed = dept.trim();
    return trimmed === "" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined"
      ? "Unassigned"
      : trimmed;
  }
  if (typeof dept === "object") {
    const name = dept.name || dept.title || dept.departmentName;
    if (name && typeof name === "string" && name.trim() !== "") {
      return name.trim();
    }
  }
  return "Unassigned";
};

const isActiveEmp = (e) => (e.status || "active").toLowerCase() === "active";
const isExitedEmp = (e) =>
  ["inactive", "exited", "terminated"].includes((e.status || "").toLowerCase());

const TONES = {
  indigo: { box: "bg-indigo-600", hover: "hover:border-indigo-300" },
  emerald: { box: "bg-emerald-600", hover: "hover:border-emerald-300" },
  rose: { box: "bg-rose-600", hover: "hover:border-rose-300" },
};

/* ------------------------- slim stat card ------------------------- */

function StatCard({ icon: Icon, value, label, tone, onClick }) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left flex items-center gap-3 bg-white px-3.5 py-3 rounded-2xl border border-slate-200/80 shadow-sm ${t.hover} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40`}
    >
      <div className={`w-10 h-10 shrink-0 rounded-xl ${t.box} text-white flex items-center justify-center shadow-sm`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-extrabold leading-tight text-slate-900 font-mono">{value}</p>
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
      />
    </button>
  );
}

/* --------------------- animated modal (reusable) --------------------- */

function Modal({ open, onClose, children }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative w-full sm:max-w-xl bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${visible
          ? "opacity-100 translate-y-0 sm:scale-100"
          : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------- page -------------------------------- */

export default function EmployeeReportsPage() {
  const [reportRaw, setReportRaw] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [modalEmployees, setModalEmployees] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const closeModal = useCallback(() => setDetailsModalOpen(false), []);

  // Fetch report data + employees concurrently
  const fetchReportData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [reportRes, empRes] = await Promise.allSettled([
        api.get("/reports/employee"),
        api.get("/employees"),
      ]);

      const reportData = reportRes.status === "fulfilled" ? reportRes.value?.data : null;
      const empData = empRes.status === "fulfilled" ? empRes.value?.data : null;

      let normalizedEmployees = [];
      if (Array.isArray(empData)) {
        normalizedEmployees = empData;
      } else if (Array.isArray(empData?.employees)) {
        normalizedEmployees = empData.employees;
      } else if (Array.isArray(empData?.data)) {
        normalizedEmployees = empData.data;
      } else if (Array.isArray(empData?.data?.employees)) {
        normalizedEmployees = empData.data.employees;
      }

      setReportRaw(reportData || {});
      setAllEmployees(normalizedEmployees);
    } catch (err) {
      console.error("Report fetch error:", err);
      toast.error("Workforce analytics load nahi ho paya. Refresh karein.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Aggregate department counts
  const normalizedByDept = useMemo(() => {
    const counts = {};

    if (allEmployees.length > 0) {
      allEmployees.forEach((emp) => {
        const deptName = extractDeptName(emp);
        counts[deptName] = (counts[deptName] || 0) + 1;
      });
      return counts;
    }

    const raw = reportRaw?.byDepartment || reportRaw?.departmentStats || reportRaw?.data?.byDepartment;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      Object.entries(raw).forEach(([dept, count]) => {
        const cleanName = (!dept || dept === "null" || dept === "undefined" || dept === "") ? "Unassigned" : dept;
        counts[cleanName] = (counts[cleanName] || 0) + (Number(count) || 0);
      });
    } else if (Array.isArray(raw)) {
      raw.forEach((item) => {
        const cleanName = item.name || item._id || item.department || "Unassigned";
        const count = item.count || item.total || item.totalEmployees || 1;
        counts[cleanName] = (counts[cleanName] || 0) + count;
      });
    }

    return counts;
  }, [allEmployees, reportRaw]);

  // Headcount numbers
  const totalEmployees = allEmployees.length > 0 ? allEmployees.length : (reportRaw?.totalEmployees || 0);
  const activeEmployees = allEmployees.length > 0
    ? allEmployees.filter(isActiveEmp).length
    : (reportRaw?.activeEmployees || totalEmployees);
  const exitedEmployees = allEmployees.length > 0
    ? allEmployees.filter(isExitedEmp).length
    : (reportRaw?.exitedEmployees || 0);

  const deptEntries = useMemo(
    () => Object.entries(normalizedByDept).sort((a, b) => b[1] - a[1]),
    [normalizedByDept]
  );
  const maxCount = Math.max(...Object.values(normalizedByDept), 1);

  // Open modal with a prepared list
  const openModalWithData = (title, subtitle, list) => {
    setModalTitle(title);
    setModalSubtitle(subtitle);
    setSearchQuery("");
    setModalEmployees(list);
    setModalLoading(false);
    setDetailsModalOpen(true);
  };

  // Department click
  const handleDeptClick = async (deptName) => {
    setModalTitle(`${deptName} Directory`);
    setModalSubtitle("Department staff breakdown");
    setSearchQuery("");
    setDetailsModalOpen(true);
    setModalLoading(true);

    try {
      const matched = allEmployees.filter(
        (emp) => extractDeptName(emp).toLowerCase() === deptName.toLowerCase()
      );

      if (matched.length > 0) {
        setModalEmployees(matched);
      } else {
        const isUnassigned = deptName.toLowerCase() === "unassigned";
        const { data } = await api.get("/employees", {
          params: isUnassigned ? { department: "null" } : { department: deptName },
        });
        const list = Array.isArray(data) ? data : data?.employees || data?.data || [];
        setModalEmployees(list);
      }
    } catch {
      setModalEmployees(
        allEmployees.filter((emp) => extractDeptName(emp).toLowerCase() === deptName.toLowerCase())
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Filter inside open modal
  const filteredModalEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return modalEmployees;
    return modalEmployees.filter((emp) => {
      const name = String(emp.name || emp.fullName || "").toLowerCase();
      const email = String(emp.email || "").toLowerCase();
      const id = String(emp.employeeId || emp.empId || emp._id || "").toLowerCase();
      const dept = extractDeptName(emp).toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [modalEmployees, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
        </div>
        <p className="text-sm text-slate-500 font-semibold tracking-tight">
          Workforce analytics calculate ho rahi hai...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 font-sans text-slate-900 antialiased">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
              Employee Analytics & Reports
            </h1>
            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              Live
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Workforce distribution, headcount aur department breakdown. Kisi bhi card par click karke employees dekhein.
          </p>
        </div>
        <button
          onClick={() => fetchReportData(true)}
          disabled={refreshing}
          title="Refresh Data"
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold p-2.5 sm:px-4 sm:py-2 rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer text-xs disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      {/* Slim metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <StatCard
          icon={Users}
          tone="indigo"
          value={totalEmployees}
          label="Total Headcount"
          onClick={() => openModalWithData("Total Workforce", "Company-wide complete roster", allEmployees)}
        />
        <StatCard
          icon={UserCheck}
          tone="emerald"
          value={activeEmployees}
          label="Active Workforce"
          onClick={() =>
            openModalWithData(
              "Active Workforce Directory",
              "Currently working & on-duty personnel",
              allEmployees.filter(isActiveEmp)
            )
          }
        />
        <StatCard
          icon={UserX}
          tone="rose"
          value={exitedEmployees}
          label="Exited / Inactive"
          onClick={() =>
            openModalWithData(
              "Archived & Exited Staff",
              "Inactive or former employees",
              allEmployees.filter(isExitedEmp)
            )
          }
        />
      </div>

      {/* Department-wise Headcount Distribution */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Department-wise Headcount
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Department par click karke members dekhein.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
            {deptEntries.length} Depts
          </span>
        </div>

        {deptEntries.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Building2 className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Koi department data nahi mila</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Employees ke records database me check karein.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deptEntries.map(([name, count]) => {
              const percentage = Math.round((count / (totalEmployees || 1)) * 100);
              const isUnassigned = name.toLowerCase() === "unassigned";

              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => handleDeptClick(name)}
                  className="group w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2.5 sm:px-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  {/* Name (+ count on mobile) */}
                  <div className="flex items-center justify-between gap-2 sm:w-52 shrink-0 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isUnassigned ? "bg-amber-500" : "bg-indigo-600"}`} />
                      <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 sm:hidden shrink-0 font-mono">
                      {count} ({percentage}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isUnassigned ? "bg-amber-500" : "bg-indigo-600 group-hover:bg-indigo-500"}`}
                      style={{ width: `${Math.max((count / maxCount) * 100, 4)}%` }}
                    />
                  </div>

                  {/* Count (desktop) */}
                  <div className="hidden sm:flex items-center justify-end gap-2 w-36 shrink-0">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {count}{" "}
                      <span className="text-slate-400 font-normal font-sans">({percentage}%)</span>
                    </span>
                    <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Directory popup (center on desktop, bottom sheet on mobile) */}
      <Modal open={detailsModalOpen} onClose={closeModal}>
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {modalTitle}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                {modalSubtitle} •{" "}
                <span className="font-bold text-indigo-600 font-mono">{modalEmployees.length}</span> Members
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="shrink-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Naam, email, department ya ID se filter karein..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            />
          </div>
        </div>

        {/* List */}
        <div className="px-3 sm:px-4 py-3 flex-1 overflow-y-auto space-y-2">
          {modalLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <Loader2 className="animate-spin text-indigo-600" size={30} />
              <p className="text-xs font-semibold">Employee details fetch ho rahi hain...</p>
            </div>
          ) : filteredModalEmployees.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                <IdCard size={22} />
              </div>
              <p className="text-xs font-bold text-slate-700">Koi employee record nahi mila</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery ? "Dusre keyword se search karke dekhein." : "Is category me filhal koi staff mapped nahi hai."}
              </p>
            </div>
          ) : (
            filteredModalEmployees.map((emp, i) => {
              const empName = emp.name || emp.fullName || emp.username || "Staff Member";
              const empCode =
                emp.employeeId || emp.empId || emp.code || (emp._id ? String(emp._id).slice(-6) : "—");
              const empRole = emp.designation || emp.role || "Employee";
              const empDept = extractDeptName(emp);
              const active = isActiveEmp(emp);

              return (
                <div
                  key={emp._id || emp.id || i}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all duration-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                      {String(empName).slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{empName}</p>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold shrink-0">{empCode}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 min-w-0">
                        <span className="flex items-center gap-1 shrink-0">
                          <Briefcase size={11} className="text-slate-400" /> {empRole}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-indigo-600 font-medium truncate">{empDept}</span>
                      </div>
                      {emp.email && (
                        <p className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                          <Mail size={11} /> <span className="truncate">{emp.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                  >
                    {emp.status || "Active"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={closeModal}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.99]"
          >
            Close Directory
          </button>
        </div>
      </Modal>
    </div>
  );
}