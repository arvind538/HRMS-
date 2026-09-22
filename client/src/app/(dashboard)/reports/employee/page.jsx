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
  ArrowUpRight,
  ChevronRight,
  X,
  Mail,
  Briefcase,
  Search,
  CheckCircle2,
  IdCard
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

// Helper: Safely normalize and extract department name
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

export default function EmployeeReportsPage() {
  const [reportRaw, setReportRaw] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Center Modal States
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [modalEmployees, setModalEmployees] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch report data + employees concurrently
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, empRes] = await Promise.allSettled([
        api.get("/reports/employee"),
        api.get("/employees")
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

  // Calculated headcount numbers
  const totalEmployees = allEmployees.length > 0 ? allEmployees.length : (reportRaw?.totalEmployees || 0);
  const activeEmployees = allEmployees.length > 0
    ? allEmployees.filter(e => (e.status || "active").toLowerCase() === "active").length
    : (reportRaw?.activeEmployees || totalEmployees);
  const exitedEmployees = allEmployees.length > 0
    ? allEmployees.filter(e => ["inactive", "exited", "terminated"].includes((e.status || "").toLowerCase())).length
    : (reportRaw?.exitedEmployees || 0);

  const maxCount = Math.max(...Object.values(normalizedByDept), 1);

  // Universal Click Handler: Opens smooth Center Modal
  const openModalWithData = (title, subtitle, list) => {
    setModalTitle(title);
    setModalSubtitle(subtitle);
    setSearchQuery("");
    setModalEmployees(list);
    setModalLoading(false);
    setDetailsModalOpen(true);
  };

  // Department Click
  const handleDeptClick = async (deptName) => {
    setModalTitle(`${deptName} Directory`);
    setModalSubtitle(`Department staff breakdown`);
    setSearchQuery("");
    setDetailsModalOpen(true);
    setModalLoading(true);

    try {
      const matched = allEmployees.filter((emp) => {
        const empDept = extractDeptName(emp);
        return empDept.toLowerCase() === deptName.toLowerCase();
      });

      if (matched.length > 0) {
        setModalEmployees(matched);
      } else {
        const isUnassigned = deptName.toLowerCase() === "unassigned";
        const { data } = await api.get("/employees", {
          params: isUnassigned ? { department: "null" } : { department: deptName }
        });
        const list = Array.isArray(data) ? data : data?.employees || data?.data || [];
        setModalEmployees(list);
      }
    } catch {
      const fallback = allEmployees.filter((emp) => extractDeptName(emp).toLowerCase() === deptName.toLowerCase());
      setModalEmployees(fallback);
    } finally {
      setModalLoading(false);
    }
  };

  // Filter inside open modal
  const filteredModalEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return modalEmployees;
    return modalEmployees.filter((emp) => {
      const name = (emp.name || emp.fullName || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const id = (emp.employeeId || emp.empId || emp._id || "").toLowerCase();
      const dept = extractDeptName(emp).toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [modalEmployees, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
        </div>
        <p className="text-sm text-slate-500 font-semibold tracking-tight">Workforce analytics calculate ho rahi hai...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 font-sans text-slate-900 antialiased">

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Employee Analytics & Reports
            </h1>
            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono">
              Live Workforce
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time workforce distribution, headcount ratios, aur department breakdowns. Kisi bhi card par click karke employees inspect karein.
          </p>
        </div>
        <button
          onClick={fetchReportData}
          className="inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer w-full sm:w-auto text-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Total Employees Card */}
        <div
          onClick={() => openModalWithData("Total Workforce", "Company-wide complete roster", allEmployees)}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 ease-out group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
              <Users size={22} />
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono group-hover:bg-indigo-100 flex items-center gap-1">
              All <ArrowUpRight size={12} />
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {totalEmployees}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">employees</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
            <span>View complete staff list</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Active Staff Card */}
        <div
          onClick={() => {
            const activeList = allEmployees.filter(e => (e.status || "active").toLowerCase() === "active");
            openModalWithData("Active Workforce Directory", "Currently working & on-duty personnel", activeList);
          }}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
              <UserCheck size={22} />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono group-hover:bg-emerald-100 flex items-center gap-1">
              Online <ArrowUpRight size={12} />
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Workforce</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {activeEmployees}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">on duty</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
            <span>Inspect active profiles</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Exited Staff Card */}
        <div
          onClick={() => {
            const exitedList = allEmployees.filter(e => ["inactive", "exited", "terminated"].includes((e.status || "").toLowerCase()));
            openModalWithData("Archived & Exited Staff", "Inactive or former employees", exitedList);
          }}
          className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-300 hover:-translate-y-1.5 transition-all duration-300 ease-out group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
              <UserX size={22} />
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono group-hover:bg-rose-100 flex items-center gap-1">
              Archived <ArrowUpRight size={12} />
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Exited / Inactive</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {exitedEmployees}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">former</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-rose-600 transition-colors">
            <span>View archived personnel</span>
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Department-wise Headcount Distribution */}
      <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                Department-wise Headcount Distribution
              </h3>
              <p className="text-xs text-slate-500">Kisi bhi department par click karke uske members open karein.</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit font-mono">
            {Object.keys(normalizedByDept).length} Departments
          </span>
        </div>

        {Object.keys(normalizedByDept).length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Koi department data nahi mila</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Employees ke records database me check karein.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(normalizedByDept).map(([name, count]) => {
              const percentage = Math.round((count / (totalEmployees || 1)) * 100);
              const isUnassigned = name.toLowerCase() === "unassigned";

              return (
                <div
                  key={name}
                  onClick={() => handleDeptClick(name)}
                  className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  {/* Department Name */}
                  <div className="w-full sm:w-56 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-2.5 h-2.5 rounded-full ${isUnassigned ? "bg-amber-500" : "bg-indigo-600"} group-hover:scale-125 transition-transform`} />
                      <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                      {count} ({percentage}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isUnassigned ? "bg-amber-500" : "bg-indigo-600 group-hover:bg-indigo-500"}`}
                      style={{ width: `${Math.max((count / maxCount) * 100, 5)}%` }}
                    />
                  </div>

                  {/* Badge & Arrow */}
                  <div className="hidden sm:flex items-center justify-end gap-3 w-40 shrink-0">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {count} <span className="text-slate-400 font-normal font-sans">staff ({percentage}%)</span>
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

      {/* Smooth Center-Screen Popup Modal */}
      {detailsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDetailsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xs">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {modalTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {modalSubtitle} • <span className="font-bold text-indigo-600 font-mono">{modalEmployees.length}</span> Members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Filter Inside Modal */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Naam, email, department ya ID se filter karein..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>
            </div>

            {/* Modal Employees List */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
              {modalLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2.5 text-slate-400">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                  <p className="text-xs font-semibold">Employee details fetch ho rahi hain...</p>
                </div>
              ) : filteredModalEmployees.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                    <IdCard size={22} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Koi employee record nahi mila</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {searchQuery ? "Dusre keyword se search karke dekhein." : "Is category me filhal koi staff mapped nahi hai."}
                  </p>
                </div>
              ) : (
                filteredModalEmployees.map((emp) => {
                  const empName = emp.name || emp.fullName || emp.username || "Staff Member";
                  const empCode = emp.employeeId || emp.empId || emp.code || (emp._id ? emp._id.slice(-6) : "—");
                  const empRole = emp.designation || emp.role || "Employee";
                  const empDept = extractDeptName(emp);
                  const isActive = (emp.status || "active").toLowerCase() === "active";

                  return (
                    <div
                      key={emp._id || emp.id || Math.random()}
                      className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                          {empName.slice(0, 2)}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 truncate">{empName}</p>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">{empCode}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
                            <span className="flex items-center gap-1">
                              <Briefcase size={12} className="text-slate-400" /> {empRole}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-indigo-600 font-medium">{empDept}</span>
                            {emp.email && (
                              <span className="hidden sm:flex items-center gap-1 truncate text-slate-400">
                                • <Mail size={12} /> {emp.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${isActive
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}