"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Percent,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Search,
  IndianRupee,
  Calendar,
  ChevronDown,
  Edit3,
  X,
  FileSpreadsheet,
  Coins,
  Scale
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function TaxTDS() {
  const [taxData, setTaxData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [regimeFilter, setRegimeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    regime: "NEW",
    panNumber: "",
    section80C: "",
    section80D: "",
    hraExemption: "",
  });

  const fetchTaxProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/tax-tds");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

      setTaxData(list);
    } catch (err) {
      console.error("Fetch Tax/TDS error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load Income Tax & TDS profiles from server."
      );
      setTaxData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get("/employee");
      const resData = response?.data;
      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.employees)
            ? resData.employees
            : [];
      setEmployees(list);
    } catch (err) {
      try {
        const fallbackRes = await api.get("/employees");
        const fbData = fallbackRes?.data;
        const fbList = Array.isArray(fbData) ? fbData : fbData?.data || [];
        setEmployees(fbList);
      } catch (e) {
        console.warn("Could not load employee select list:", err);
      }
    }
  }, []);

  useEffect(() => {
    fetchTaxProfiles();
    fetchEmployees();
  }, [fetchTaxProfiles, fetchEmployees]);

  const openDeclarationModal = (item = null) => {
    if (item) {
      setForm({
        employeeId: item.employee?._id || "",
        regime: item.regime || "NEW",
        panNumber: item.panNumber === "PENDING" ? "" : item.panNumber || "",
        section80C: item.section80C?.toString() || "",
        section80D: item.section80D?.toString() || "",
        hraExemption: item.hraExemption?.toString() || "",
      });
    } else {
      setForm({
        employeeId: "",
        regime: "NEW",
        panNumber: "",
        section80C: "",
        section80D: "",
        hraExemption: "",
      });
    }
    setShowModal(true);
  };

  const handleSaveDeclaration = async (e) => {
    e.preventDefault();

    if (!form.employeeId) {
      toast.error("Please select an employee.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/payroll/tax-tds", {
        employeeId: form.employeeId,
        regime: form.regime,
        panNumber: form.panNumber.trim().toUpperCase(),
        section80C: Number(form.section80C) || 0,
        section80D: Number(form.section80D) || 0,
        hraExemption: Number(form.hraExemption) || 0,
      });

      toast.success("Tax declaration updated successfully!");
      setShowModal(false);
      fetchTaxProfiles();
    } catch (err) {
      console.error("Save tax declaration error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update tax declaration."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return taxData.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const empName = t.employee?.name || "";
      const empCode = t.employee?.employeeId || "";
      const pan = t.panNumber || "";

      const matchesSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        pan.toLowerCase().includes(q);

      const matchesRegime =
        regimeFilter === "ALL" || t.regime === regimeFilter;

      return matchesSearch && matchesRegime;
    });
  }, [taxData, searchQuery, regimeFilter]);

  const totalMonthlyTds = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.monthlyTDS) || 0), 0);
  }, [filtered]);

  const totalAnnualTaxLiability = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.annualTax) || 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Income Tax & TDS Summary
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {taxData.length} Profiles Computed
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Tax regime choices (New vs Old), declared chapter VI-A deductions, and calculated TDS withholding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchTaxProfiles();
              fetchEmployees();
            }}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50"
            title="Recalculate tax brackets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => openDeclarationModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Update Declaration</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      {!loading && !error && taxData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Monthly TDS Withholding Pool
              </p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                ₹{totalMonthlyTds.toLocaleString("en-IN")}/mo
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Annual Tax Liability (FY 2026-27)
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                ₹{totalAnnualTaxLiability.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Tax Regime Split
              </p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                {taxData.filter((t) => t.regime === "NEW").length} New / {taxData.filter((t) => t.regime === "OLD").length} Old
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, ID or PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "NEW", "OLD"].map((rg) => (
            <button
              key={rg}
              onClick={() => setRegimeFilter(rg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${regimeFilter === rg
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
            >
              {rg === "ALL" ? "All Regimes" : `${rg} Regime`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              Computing tax slabs and declared deductions...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Tax Records</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchTaxProfiles}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <Percent className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Tax Profiles Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ensure employees have assigned salaries in the Employee Salary Mapping tab.
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
                    <th className="py-3.5 px-6">Chosen Regime</th>
                    <th className="py-3.5 px-6">Exemptions / Deductions</th>
                    <th className="py-3.5 px-6">Taxable Income</th>
                    <th className="py-3.5 px-6">Annual Tax</th>
                    <th className="py-3.5 px-6">Monthly TDS</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((item) => {
                    const id = item._id;
                    const empName = item.employee?.name || "Unknown Staff";
                    const empCode = item.employee?.employeeId || "—";
                    const dept = item.employee?.department || "";

                    return (
                      <tr key={id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {empName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{empCode}</span>
                            <span>• PAN: {item.panNumber}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${item.regime === "NEW"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                          >
                            {item.regime === "NEW" ? "NEW REGIME" : "OLD REGIME"}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                          ₹{(item.exemptionsDeclared || 0).toLocaleString("en-IN")}
                          {item.regime === "OLD" && (
                            <span className="text-[11px] text-slate-400 block font-normal">
                              80C: ₹{Number(item.section80C || 0).toLocaleString("en-IN")}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 font-bold text-slate-900">
                          ₹{(item.taxableIncome || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 font-semibold text-slate-700">
                          ₹{(item.annualTax || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 font-bold text-rose-600 text-base">
                          ₹{(item.monthlyTDS || 0).toLocaleString("en-IN")}/mo
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => openDeclarationModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit</span>
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
              {filtered.map((item) => {
                const id = item._id;
                const empName = item.employee?.name || "Unknown";
                const empCode = item.employee?.employeeId || "";

                return (
                  <div key={id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{empName}</h4>
                        <p className="text-[11px] text-slate-400">
                          {empCode} | PAN: {item.panNumber}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${item.regime === "NEW"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                      >
                        {item.regime}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Taxable Income:</span>
                        <span className="font-bold text-slate-800">
                          ₹{(item.taxableIncome || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Annual Tax:</span>
                        <span className="font-semibold text-slate-700">
                          ₹{(item.annualTax || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t border-slate-200/60">
                        <span>Monthly TDS:</span>
                        <span className="text-rose-600 font-black text-sm">
                          ₹{(item.monthlyTDS || 0).toLocaleString("en-IN")}/mo
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openDeclarationModal(item)}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update Tax Declaration</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Tax Declaration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Income Tax Declaration</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeclaration} className="space-y-3.5 text-xs">
              {/* Employee Selector */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Employee
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.employeeId || emp.email})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Regime and PAN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tax Regime</label>
                  <select
                    value={form.regime}
                    onChange={(e) => setForm({ ...form, regime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="NEW">New Tax Regime</option>
                    <option value="OLD">Old Tax Regime</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={form.panNumber}
                    onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Old Regime Exemptions Fields */}
              {form.regime === "OLD" ? (
                <div className="space-y-3 p-3 bg-slate-50/75 rounded-2xl border border-slate-200/80">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Chapter VI-A Declarations (Old Regime)
                  </p>
                  <div>
                    <label className="text-slate-600 block mb-1">Section 80C (PPF, ELSS, EPF - Max ₹1.5L)</label>
                    <input
                      type="number"
                      placeholder="e.g. 150000"
                      value={form.section80C}
                      onChange={(e) => setForm({ ...form, section80C: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-600 block mb-1">Section 80D (Health)</label>
                      <input
                        type="number"
                        placeholder="e.g. 25000"
                        value={form.section80D}
                        onChange={(e) => setForm({ ...form, section80D: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1">HRA Exemption</label>
                      <input
                        type="number"
                        placeholder="e.g. 60000"
                        value={form.hraExemption}
                        onChange={(e) => setForm({ ...form, hraExemption: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[11px] text-indigo-700">
                  <p className="font-semibold">Default Standard Deduction Applicable</p>
                  <p className="mt-0.5 text-indigo-600">
                    New tax regime offers automatic ₹75,000 standard deduction and nil tax on income up to ₹12 Lakhs under Section 87A rebate.
                  </p>
                </div>
              )}

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
                  {submitting ? "Saving..." : "Save Declaration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}