"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  RefreshCw,
  AlertCircle,
  IndianRupee,
  Edit3,
  Trash2,
  Layers,
  Users,
  Coins,
  TrendingUp,
  X,
  Plus,
  ChevronDown
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function EmployeeSalary() {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Modal State for Mapping/Editing Salary
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    employeeId: "",
    salaryStructureId: "",
    annualCTC: "",
    status: "Active",
  });

  // Fetch all salary mapping records
  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/employee-salaries");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.salaries)
            ? resData.salaries
            : [];

      setSalaries(list);
    } catch (err) {
      console.error("Fetch employee salaries error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load salary mappings from the server."
      );
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch employees and templates with shape normalization and fallback routes
  const fetchDropdownData = useCallback(async () => {
    setDropdownLoading(true);
    try {
      // 1. Fetch Employees (try /employee first, fallback to /employees)
      let empList = [];
      try {
        const empRes = await api.get("/employee");
        const empData = empRes?.data;
        empList = Array.isArray(empData)
          ? empData
          : Array.isArray(empData?.data)
            ? empData.data
            : Array.isArray(empData?.employees)
              ? empData.employees
              : [];
      } catch (err) {
        if (err.response?.status === 404) {
          try {
            const fallbackEmpRes = await api.get("/employees");
            const fallbackData = fallbackEmpRes?.data;
            empList = Array.isArray(fallbackData)
              ? fallbackData
              : Array.isArray(fallbackData?.data)
                ? fallbackData.data
                : Array.isArray(fallbackData?.employees)
                  ? fallbackData.employees
                  : [];
          } catch (e) {
            console.error("Failed to load employees via /employees fallback:", e);
          }
        } else {
          console.error("Employee fetch error:", err);
        }
      }
      setEmployees(empList);

      // 2. Fetch Salary Structures
      try {
        const structRes = await api.get("/payroll/salary-structures");
        const structData = structRes?.data;
        const structList = Array.isArray(structData)
          ? structData
          : Array.isArray(structData?.data)
            ? structData.data
            : Array.isArray(structData?.structures)
              ? structData.structures
              : [];

        setStructures(structList);
      } catch (err) {
        console.warn("Salary structures fetch warning:", err);
      }
    } finally {
      setDropdownLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalaries();
    fetchDropdownData();
  }, [fetchSalaries, fetchDropdownData]);

  // Open modal for new assignment or edit
  const openModal = (item = null) => {
    if (item) {
      setEditingId(item._id || item.id);
      setForm({
        employeeId: item.employee?._id || item.employee || "",
        salaryStructureId: item.salaryStructure?._id || item.salaryStructure || "",
        annualCTC: item.annualCTC?.toString() || "",
        status: item.status || "Active",
      });
    } else {
      setEditingId(null);
      setForm({
        employeeId: employees[0]?._id || employees[0]?.id || "",
        salaryStructureId: structures[0]?._id || structures[0]?.id || "",
        annualCTC: "",
        status: "Active",
      });
    }
    setShowModal(true);
  };

  // Submit Salary Assignment (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!form.annualCTC || Number(form.annualCTC) <= 0) {
      toast.error("Please enter a valid Annual CTC amount.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        salaryStructureId: form.salaryStructureId || null,
        annualCTC: Number(form.annualCTC),
        status: form.status,
      };

      if (editingId) {
        await api.put(`/payroll/employee-salaries/${editingId}`, payload);
        toast.success("Salary assignment updated successfully!");
      } else {
        await api.post("/payroll/employee-salaries", payload);
        toast.success("Salary assignment saved successfully!");
      }

      setShowModal(false);
      setEditingId(null);
      fetchSalaries();
    } catch (err) {
      console.error("Save salary mapping error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save salary mapping."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Salary Mapping Handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this salary mapping record?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/payroll/employee-salaries/${id}`);
      setSalaries((prev) => prev.filter((item) => (item._id || item.id) !== id));
      toast.success("Salary mapping deleted successfully.");
    } catch (err) {
      console.error("Delete salary mapping error:", err);
      toast.error(
        err.response?.data?.message ||
        "Failed to delete salary mapping record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Filter list by employee name, id, or department
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return salaries;
    return salaries.filter((s) => {
      const name = s.employee?.name || s.employee?.fullName || s.userName || "";
      const code = s.employee?.employeeId || s.employee?.code || s.userId || "";
      const dept = s.employee?.department || "";
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q)
      );
    });
  }, [salaries, searchTerm]);

  // Payroll Metrics
  const totalPayrollCTC = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.annualCTC) || 0), 0);
  }, [filtered]);

  const avgMonthlyGross = useMemo(() => {
    if (!filtered.length) return 0;
    const totalGross = filtered.reduce((sum, item) => sum + (Number(item.grossMonthly) || 0), 0);
    return Math.round(totalGross / filtered.length);
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-3">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Employee Salary Mapping
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {salaries.length} Employees Mapped
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage annual CTC allocation, monthly gross pay, and salary structure assignments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchSalaries();
              fetchDropdownData();
            }}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Salary</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Badges */}
      {!loading && !error && salaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Annual Payroll Outflow
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                ₹{totalPayrollCTC.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Average Monthly Gross Pay
              </p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                ₹{avgMonthlyGross.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Contracts
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {salaries.filter((s) => s.status === "Active").length} / {salaries.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by name, ID or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> mappings
        </p>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading salary mappings...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Mappings</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchSalaries}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Salary Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click 'Assign Salary' above to map an employee to a structure and CTC.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Assigned Template</th>
                    <th className="py-3.5 px-6">Monthly Gross</th>
                    <th className="py-3.5 px-6">Annual CTC</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((item) => {
                    const id = item._id || item.id;
                    const isDeleting = deletingId === id;
                    const empName = item.employee?.name || item.employee?.fullName || item.userName || "Unknown Employee";
                    const empCode = item.employee?.employeeId || item.employee?.code || item.userId || "—";
                    const dept = item.employee?.department || "";
                    const structureName = item.salaryStructure?.name || item.structureName || "Default Plan";

                    return (
                      <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                              {empName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 leading-tight">
                                {empName}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span>{empCode}</span>
                                {dept && <span>• {dept}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            <span>{structureName}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800">
                            ₹{(item.grossMonthly || 0).toLocaleString("en-IN")}
                          </div>
                          <span className="text-[11px] text-slate-400">per month</span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-bold text-indigo-600">
                            ₹{(item.annualCTC || 0).toLocaleString("en-IN")}
                          </div>
                          <span className="text-[11px] text-slate-400">per annum</span>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${item.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${item.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                            />
                            <span>{item.status || "Active"}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openModal(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
                              title="Edit salary assignment"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit</span>
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDelete(id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold border border-slate-200 hover:border-rose-200 transition disabled:opacity-40"
                              title="Delete salary record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((item) => {
                const id = item._id || item.id;
                const isDeleting = deletingId === id;
                const empName = item.employee?.name || item.employee?.fullName || item.userName || "Unknown";
                const empCode = item.employee?.employeeId || item.employee?.code || item.userId || "";
                const structureName = item.salaryStructure?.name || item.structureName || "Default";

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{empName}</h4>
                        {empCode && <p className="text-[11px] text-slate-400">{empCode}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal(item)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={isDeleting}
                          onClick={() => handleDelete(id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Structure:</span>
                        <span className="font-semibold text-slate-800">{structureName}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Monthly Gross:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{(item.grossMonthly || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Annual CTC:</span>
                        <span className="font-bold text-indigo-600">
                          ₹{(item.annualCTC || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Salary Mapping & Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Update Salary Assignment" : "Assign Salary"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* Select Employee Dropdown */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Employee ({employees.length} Available)
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
                  >
                    <option value="">
                      {dropdownLoading
                        ? "-- Loading Employees... --"
                        : employees.length === 0
                          ? "-- No Employees Found --"
                          : "-- Choose Employee --"}
                    </option>
                    {employees.map((emp) => {
                      const empId = emp._id || emp.id;
                      const empName = emp.name || emp.fullName || emp.user?.name || emp.userName || "Unnamed Employee";
                      const empCode = emp.employeeId || emp.code || emp.email || "";

                      return (
                        <option key={empId} value={empId}>
                          {empName} {empCode ? `(${empCode})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Salary Structure Template Dropdown */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Salary Structure Template
                </label>
                <div className="relative">
                  <select
                    value={form.salaryStructureId}
                    onChange={(e) => setForm({ ...form, salaryStructureId: e.target.value })}
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
                  >
                    <option value="">-- Standard / Default Structure --</option>
                    {structures.map((st) => {
                      const stId = st._id || st.id;
                      return (
                        <option key={stId} value={stId}>
                          {st.name} (Basic: {st.basicPercent}%)
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Annual CTC Input */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Annual Cost to Company (CTC in ₹)
                </label>
                <input
                  type="number"
                  min="10000"
                  step="1000"
                  required
                  placeholder="e.g. 600000"
                  value={form.annualCTC}
                  onChange={(e) => setForm({ ...form, annualCTC: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {Number(form.annualCTC) > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ≈ Monthly Gross: ₹{Math.round(Number(form.annualCTC) / 12).toLocaleString("en-IN")}
                  </p>
                )}
              </div>

              {/* Status Select */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status</label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Mapping" : "Save Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}