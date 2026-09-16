"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sliders,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  PieChart,
  Layers,
  Sparkles,
  CheckCircle2,
  Coins
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function SalaryStructure() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Live Sandbox Simulation CTC (Monthly Preview)
  const [previewCTC, setPreviewCTC] = useState(50000);

  // Form State
  const [form, setForm] = useState({
    name: "",
    basicPercent: "50",
    hraPercent: "25",
    daPercent: "0",
    specialPercent: "25",
  });

  // Calculate live total allocation percentage in modal
  const totalAllocation = useMemo(() => {
    const b = Number(form.basicPercent) || 0;
    const h = Number(form.hraPercent) || 0;
    const d = Number(form.daPercent) || 0;
    const s = Number(form.specialPercent) || 0;
    return b + h + d + s;
  }, [form]);

  // Fetch real records from backend API
  const fetchStructures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/salary-structures");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.structures)
            ? resData.structures
            : [];

      setStructures(list);
    } catch (err) {
      console.error("Fetch salary structures error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load salary structure templates from server."
      );
      setStructures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  // Create new structure template
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Template name is required.");
      return;
    }

    if (totalAllocation !== 100) {
      toast.error(`Total percentage must equal 100%. Currently it is ${totalAllocation}%.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        basicPercent: Number(form.basicPercent),
        hraPercent: Number(form.hraPercent),
        daPercent: Number(form.daPercent) || 0,
        specialPercent: Number(form.specialPercent),
      };

      const response = await api.post("/payroll/salary-structures", payload);
      const createdItem = response?.data?.data || response?.data;

      if (createdItem && typeof createdItem === "object") {
        setStructures((prev) => [createdItem, ...prev]);
      } else {
        fetchStructures();
      }

      toast.success("Salary structure template created successfully!");
      setShowModal(false);
      setForm({ name: "", basicPercent: "50", hraPercent: "25", daPercent: "0", specialPercent: "25" });
    } catch (err) {
      console.error("Create salary structure error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save salary structure template."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete structure template
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this salary structure template?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/payroll/salary-structures/${id}`);
      setStructures((prev) => prev.filter((item) => (item._id || item.id) !== id));
      toast.success("Salary structure deleted successfully.");
    } catch (err) {
      console.error("Delete salary structure error:", err);
      toast.error(
        err.response?.data?.message ||
        "Failed to delete salary structure template."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-6 bg-slate-50 min-h-screen font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs transition-transform hover:scale-105">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Salary Structure Templates
              </h1>
              {!loading && !error && (
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {structures.length} {structures.length === 1 ? "Template" : "Templates"}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Configure CTC allocation templates and percentage split configurations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchStructures}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 rounded-2xl border border-slate-200 transition-all duration-200 disabled:opacity-50 shadow-xs cursor-pointer"
            title="Refresh templates"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-95 text-white text-xs font-semibold rounded-2xl shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Structure</span>
          </button>
        </div>
      </div>

      {/* Real-time CTC Simulator Strip */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Live Salary Simulator</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Simulate Monthly CTC Payout</h3>
            <p className="text-xs text-slate-500 max-w-xl">
              Type any monthly CTC amount to preview real-time breakdowns across all configured structures.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl shadow-inner hover:border-slate-300 transition-colors">
            <Coins className="w-4 h-4 text-indigo-600" />
            <span className="text-xs text-slate-600 font-semibold">Monthly CTC: ₹</span>
            <input
              type="number"
              min="5000"
              step="1000"
              value={previewCTC}
              onChange={(e) => setPreviewCTC(Math.max(0, Number(e.target.value)))}
              className="w-28 bg-transparent text-slate-900 font-bold text-sm outline-none border-b border-slate-300 focus:border-indigo-600 pb-0.5 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading salary structures...</p>
          </div>
        ) : error ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-rose-200 shadow-xs max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Templates</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchStructures}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : structures.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-sm mx-auto p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-200">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Salary Structures Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              You haven't configured any structure templates yet. Click 'Create Structure' above to add your first template.
            </p>
          </div>
        ) : (
          structures.map((st) => {
            const id = st._id || st.id;
            const isDeleting = deletingId === id;

            // Live Calculation of components based on simulator amount
            const basicAmt = Math.round((previewCTC * (st.basicPercent || 0)) / 100);
            const hraAmt = Math.round((previewCTC * (st.hraPercent || 0)) / 100);
            const daAmt = Math.round((previewCTC * (st.daPercent || 0)) / 100);
            const specialAmt = Math.round((previewCTC * (st.specialPercent || 0)) / 100);

            return (
              <div
                key={id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors">
                      {st.name}
                    </h3>
                    <span className="inline-block mt-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Active Template
                    </span>
                  </div>

                  <button
                    disabled={isDeleting}
                    onClick={() => handleDelete(id)}
                    className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-95"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Visual Proportion Ratio Bar with Distinct Colors */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>Component Ratio</span>
                    <span className="font-bold text-slate-800">100% Balanced</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                    <div
                      style={{ width: `${st.basicPercent}%` }}
                      className="bg-indigo-600 h-full transition-all duration-500"
                      title={`Basic: ${st.basicPercent}%`}
                    />
                    <div
                      style={{ width: `${st.hraPercent}%` }}
                      className="bg-teal-500 h-full transition-all duration-500"
                      title={`HRA: ${st.hraPercent}%`}
                    />
                    {st.daPercent > 0 && (
                      <div
                        style={{ width: `${st.daPercent}%` }}
                        className="bg-amber-500 h-full transition-all duration-500"
                        title={`DA: ${st.daPercent}%`}
                      />
                    )}
                    <div
                      style={{ width: `${st.specialPercent}%` }}
                      className="bg-rose-500 h-full transition-all duration-500"
                      title={`Special: ${st.specialPercent}%`}
                    />
                  </div>
                </div>

                {/* Percentage & Calculated Values Breakdown */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-2xs" /> Basic ({st.basicPercent}%):
                    </span>
                    <strong className="text-slate-900 font-mono">₹{basicAmt.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-2xs" /> HRA ({st.hraPercent}%):
                    </span>
                    <strong className="text-slate-900 font-mono">₹{hraAmt.toLocaleString("en-IN")}</strong>
                  </div>
                  {st.daPercent > 0 && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" /> DA ({st.daPercent}%):
                      </span>
                      <strong className="text-slate-900 font-mono">₹{daAmt.toLocaleString("en-IN")}</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" /> Special ({st.specialPercent}%):
                    </span>
                    <strong className="text-slate-900 font-mono">₹{specialAmt.toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Salary Structure Modal with Smooth Entry Animation */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <PieChart className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">New Salary Structure</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Template Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Standard Executive (Grade A)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                    Basic (% of CTC)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.basicPercent}
                    onChange={(e) => setForm({ ...form, basicPercent: e.target.value })}
                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                    HRA (% of CTC)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.hraPercent}
                    onChange={(e) => setForm({ ...form, hraPercent: e.target.value })}
                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                    Dearness Allowance (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.daPercent}
                    onChange={(e) => setForm({ ...form, daPercent: e.target.value })}
                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase tracking-wider text-[11px]">
                    Special Allowance (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.specialPercent}
                    onChange={(e) => setForm({ ...form, specialPercent: e.target.value })}
                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300"
                  />
                </div>
              </div>

              {/* Total Percentage Calculation Pill */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between font-semibold transition-colors ${totalAllocation === 100
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${totalAllocation === 100 ? "text-emerald-600" : "text-rose-600"}`} />
                  <span>Allocation Balance Check:</span>
                </div>
                <span className="text-xs font-bold font-mono">
                  {totalAllocation}% {totalAllocation === 100 ? "(Balanced)" : "(Must Equal 100%)"}
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || totalAllocation !== 100}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-95 text-white font-semibold rounded-2xl shadow-md shadow-indigo-100 transition-all disabled:opacity-50 cursor-pointer transform hover:-translate-y-0.5"
                >
                  {submitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}