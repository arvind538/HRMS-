"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Save, CheckCircle2, Plus, Trash2,
  Settings, Award, Users
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const ALLOWANCE_TYPES = ["Bonus", "HRA", "Transport", "Medical", "Other"];
const DEDUCTION_TYPES = ["Tax", "PF", "ESI", "Loan", "Other"];
const EMPLOYEE_STATUSES = ["Active", "Probation", "Notice Period", "Suspended"];

export default function PayrollSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("defaultPayrun");

  // Options for Dropdowns (Fetched from DB)
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [form, setForm] = useState({
    defaultPayrun: {
      period: "Monthly",
      generatingType: "Hour",
      considerOvertime: true
    },
    badgeValue: {
      allowances: [],
      deductions: []
    },
    manageAudience: {
      restrictedPayrun: { department: "", employee: "" },
      restrictedBadge: { employeeStatus: "" }
    }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch settings + related data concurrently
      const [settingsRes, deptRes, empRes] = await Promise.allSettled([
        api.get("/settings"),
        api.get("/departments"), // Adjust endpoint to your actual department route
        api.get("/employees")    // Adjust endpoint to your actual employee route
      ]);

      if (settingsRes.status === "fulfilled") {
        const p = settingsRes.value.data.payroll || {};
        setForm({
          defaultPayrun: {
            period: p.defaultPayrun?.period || "Monthly",
            generatingType: p.defaultPayrun?.generatingType || "Hour",
            considerOvertime: p.defaultPayrun?.considerOvertime ?? true
          },
          badgeValue: {
            allowances: p.badgeValue?.allowances || [],
            deductions: p.badgeValue?.deductions || []
          },
          manageAudience: {
            restrictedPayrun: p.manageAudience?.restrictedPayrun || { department: "", employee: "" },
            restrictedBadge: p.manageAudience?.restrictedBadge || { employeeStatus: "" }
          }
        });
      }

      if (deptRes.status === "fulfilled") setDepartments(deptRes.value.data || []);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data || []);

    } catch (err) {
      toast.error("Failed to load payroll settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/settings", { payroll: form });
      toast.success("Payroll settings saved successfully.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for Dynamic Arrays
  const addAllowance = () => {
    setForm(prev => ({
      ...prev,
      badgeValue: { ...prev.badgeValue, allowances: [...prev.badgeValue.allowances, { name: "", value: 0, inPercent: false }] }
    }));
  };

  const removeAllowance = (index) => {
    setForm(prev => {
      const newAllowances = [...prev.badgeValue.allowances];
      newAllowances.splice(index, 1);
      return { ...prev, badgeValue: { ...prev.badgeValue, allowances: newAllowances } };
    });
  };

  const updateAllowance = (index, field, value) => {
    setForm(prev => {
      const newAllowances = [...prev.badgeValue.allowances];
      newAllowances[index][field] = value;
      return { ...prev, badgeValue: { ...prev.badgeValue, allowances: newAllowances } };
    });
  };

  const addDeduction = () => {
    setForm(prev => ({
      ...prev,
      badgeValue: { ...prev.badgeValue, deductions: [...prev.badgeValue.deductions, { name: "", value: 0, inPercent: false }] }
    }));
  };

  const removeDeduction = (index) => {
    setForm(prev => {
      const newDeductions = [...prev.badgeValue.deductions];
      newDeductions.splice(index, 1);
      return { ...prev, badgeValue: { ...prev.badgeValue, deductions: newDeductions } };
    });
  };

  const updateDeduction = (index, field, value) => {
    setForm(prev => {
      const newDeductions = [...prev.badgeValue.deductions];
      newDeductions[index][field] = value;
      return { ...prev, badgeValue: { ...prev.badgeValue, deductions: newDeductions } };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-4 lg:px-4 py-6 space-y-6">

      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-row md:flex-col gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("defaultPayrun")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === "defaultPayrun" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <Settings size={18} /> Default Payrun
          </button>
          <button
            onClick={() => setActiveTab("badgeValue")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === "badgeValue" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <CheckCircle2 size={18} /> Badge Value
          </button>
          <button
            onClick={() => setActiveTab("manageAudience")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === "manageAudience" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <Users size={18} /> Manage Audience
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSave}>

            {/* TAB 1: Default Payrun */}
            {activeTab === "defaultPayrun" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-3">Default Payrun</h2>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">How Payrun Works</h3>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 space-y-1">
                    <p>1. Default payrun is applicable to generate payslip for all employees (Except those are updated individually) whenever it execute from Payrun module.</p>
                    <p>2. You can set payrun individually over the default from the Employees details.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <label className="md:col-span-4 text-sm font-semibold text-slate-700">Payrun Period</label>
                  <div className="md:col-span-8">
                    <select
                      value={form.defaultPayrun.period}
                      onChange={(e) => setForm({ ...form, defaultPayrun: { ...form.defaultPayrun, period: e.target.value } })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <label className="md:col-span-4 text-sm font-semibold text-slate-700 pt-2">Payrun Generating Type</label>
                  <div className="md:col-span-8 space-y-6">

                    <div className="flex flex-wrap items-center gap-4">
                      {["Hour", "Daily log", "None"].map((type) => (
                        <label key={type} className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer transition-all ${form.defaultPayrun.generatingType === type ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.defaultPayrun.generatingType === type ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                            {form.defaultPayrun.generatingType === type && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <span className="text-sm">{type}</span>
                          <input
                            type="radio"
                            className="hidden"
                            checked={form.defaultPayrun.generatingType === type}
                            onChange={() => setForm({ ...form, defaultPayrun: { ...form.defaultPayrun, generatingType: type } })}
                          />
                        </label>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Consider Overtime</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, defaultPayrun: { ...form.defaultPayrun, considerOvertime: !form.defaultPayrun.considerOvertime } })}
                          className={`w-12 h-6 rounded-full relative transition-colors ${form.defaultPayrun.considerOvertime ? "bg-indigo-600" : "bg-slate-300"}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.defaultPayrun.considerOvertime ? "left-7" : "left-1"}`} />
                        </button>
                        <span className="text-sm text-slate-500">
                          {form.defaultPayrun.considerOvertime ? "Overtime will calculate" : "Overtime will not calculate"}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Badge Value */}
            {activeTab === "badgeValue" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-3">Badge Value</h2>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">How Badge Value Works</h3>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 space-y-1">
                    <p>1. Create badge for allowance or deduction from Beneficiary badge module.</p>
                    <p>2. Select badge and assign a value that will applicable for all employees (Except those updated individually).</p>
                    <p>3. You can set beneficiary individually over the default from the Employees details.</p>
                    <p>4. You can also update beneficiaries in Payslips generated for every employee.</p>
                  </div>
                </div>

                {/* Allowance Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <label className="lg:col-span-2 text-sm font-semibold text-slate-700 pt-3">Allowance</label>
                  <div className="lg:col-span-10 space-y-3">
                    {form.badgeValue.allowances.map((allowance, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-3 items-center">
                        <select
                          value={allowance.name}
                          onChange={(e) => updateAllowance(index, "name", e.target.value)}
                          className="w-full sm:flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"
                        >
                          <option value="">Choose an Allowance</option>
                          {ALLOWANCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>

                        <div className="flex w-full sm:w-auto gap-3 items-center">
                          <input
                            type="number"
                            placeholder="Value"
                            value={allowance.value}
                            onChange={(e) => updateAllowance(index, "value", Number(e.target.value))}
                            className="w-full sm:w-24 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"
                          />
                          <label className="flex items-center gap-2 text-sm text-indigo-700 font-medium whitespace-nowrap cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowance.inPercent}
                              onChange={(e) => updateAllowance(index, "inPercent", e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            In Percent
                          </label>
                          <button type="button" onClick={() => removeAllowance(index)} className="p-2.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addAllowance} className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                      <Plus size={16} /> Add Allowance
                    </button>
                  </div>
                </div>

                {/* Deduction Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-4 border-t border-slate-100">
                  <label className="lg:col-span-2 text-sm font-semibold text-slate-700 pt-3">Deduction</label>
                  <div className="lg:col-span-10 space-y-3">
                    {form.badgeValue.deductions.map((deduction, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-3 items-center">
                        <select
                          value={deduction.name}
                          onChange={(e) => updateDeduction(index, "name", e.target.value)}
                          className="w-full sm:flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"
                        >
                          <option value="">Choose a Deduction</option>
                          {DEDUCTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>

                        <div className="flex w-full sm:w-auto gap-3 items-center">
                          <input
                            type="number"
                            placeholder="Value"
                            value={deduction.value}
                            onChange={(e) => updateDeduction(index, "value", Number(e.target.value))}
                            className="w-full sm:w-24 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"
                          />
                          <label className="flex items-center gap-2 text-sm text-indigo-700 font-medium whitespace-nowrap cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deduction.inPercent}
                              onChange={(e) => updateDeduction(index, "inPercent", e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            In Percent
                          </label>
                          <button type="button" onClick={() => removeDeduction(index)} className="p-2.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addDeduction} className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                      <Plus size={16} /> Add Deduction
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: Manage Audience */}
            {activeTab === "manageAudience" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-3">Manage Audience</h2>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Restriction Note</h3>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 space-y-1">
                    <p>By default, all users are eligible for Payrun and Beneficiary badges.</p>
                    <p>If you want to restrict some users for the default payrun settings, then please add users for Payrun and Beneficiary badges.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-4">
                    <label className="text-sm font-semibold text-slate-700">Restricted User</label>
                    <p className="text-xs text-slate-400">For Payrun</p>
                  </div>
                  <div className="md:col-span-8 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Department <span className="text-red-500">*</span></label>
                      <select
                        value={form.manageAudience.restrictedPayrun.department}
                        onChange={(e) => setForm({ ...form, manageAudience: { ...form.manageAudience, restrictedPayrun: { ...form.manageAudience.restrictedPayrun, department: e.target.value } } })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"
                      >
                        <option value="">Choose a Department</option>
                        {departments.map(d => <option key={d._id || d.name} value={d._id || d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">Employee <span className="text-red-500">*</span></label>
                      <select
                        value={form.manageAudience.restrictedPayrun.employee}
                        onChange={(e) => setForm({ ...form, manageAudience: { ...form.manageAudience, restrictedPayrun: { ...form.manageAudience.restrictedPayrun, employee: e.target.value } } })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"
                      >
                        <option value="">Choose an Employee</option>
                        {employees.map(e => <option key={e._id || e.name} value={e._id || e.name}>{e.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-4 border-t border-slate-100">
                  <div className="md:col-span-4">
                    <label className="text-sm font-semibold text-slate-700">Restricted User</label>
                    <p className="text-xs text-slate-400">For Beneficiary Badge</p>
                  </div>
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Employee Status <span className="text-red-500">*</span></label>
                    <select
                      value={form.manageAudience.restrictedBadge.employeeStatus}
                      onChange={(e) => setForm({ ...form, manageAudience: { ...form.manageAudience, restrictedBadge: { employeeStatus: e.target.value } } })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"
                    >
                      <option value="">Choose an Employee Status</option>
                      {EMPLOYEE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

              </div>
            )}

            {/* Global Save Button aligned bottom right */}
            <div className="pt-8 mt-6 flex items-center justify-end border-t border-slate-100">
              <Button
                type="submit"
                loading={saving}
                className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                <span>Save</span>
              </Button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}