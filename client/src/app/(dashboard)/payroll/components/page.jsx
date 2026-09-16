"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Layers,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Edit3,
  Search,
  TrendingUp,
  TrendingDown,
  Percent,
  CircleDollarSign
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function SalaryComponents() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  // Modal & Edit State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");

  const [form, setForm] = useState({
    name: "",
    type: "EARNING",
    calculationType: "FIXED",
    isTaxable: true,
    description: "",
  });

  // Fetch components via centralized axios api client
  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/components");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.components)
            ? resData.components
            : [];

      setComponents(list);
    } catch (err) {
      console.error("Fetch components error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load salary components from server."
      );
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Open Modal for Creation
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: "EARNING",
      calculationType: "FIXED",
      isTaxable: true,
      description: "",
    });
    setShowModal(true);
  };

  // Open Modal for Editing
  const handleOpenEdit = (component) => {
    const id = component._id || component.id;
    setEditingId(id);
    setForm({
      name: component.name || "",
      type: component.type || "EARNING",
      calculationType: component.calculationType || "FIXED",
      isTaxable: component.isTaxable !== undefined ? component.isTaxable : true,
      description: component.description || "",
    });
    setShowModal(true);
  };

  // Create or Update Component Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Component name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        calculationType: form.calculationType,
        isTaxable: Boolean(form.isTaxable),
        description: form.description.trim(),
      };

      if (editingId) {
        // Update existing component
        const response = await api.put(`/payroll/components/${editingId}`, payload);
        const updatedItem = response?.data?.data || response?.data;

        if (updatedItem && typeof updatedItem === "object") {
          setComponents((prev) =>
            prev.map((item) => ((item._id || item.id) === editingId ? updatedItem : item))
          );
        } else {
          fetchComponents();
        }
        toast.success("Salary component updated successfully!");
      } else {
        // Create new component
        const response = await api.post("/payroll/components", payload);
        const createdItem = response?.data?.data || response?.data;

        if (createdItem && typeof createdItem === "object") {
          setComponents((prev) => [createdItem, ...prev]);
        } else {
          fetchComponents();
        }
        toast.success("Salary component added successfully!");
      }

      setShowModal(false);
      setEditingId(null);
    } catch (err) {
      console.error("Save salary component error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save salary component."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete component handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this salary component?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/payroll/components/${id}`);
      setComponents((prev) => prev.filter((item) => (item._id || item.id) !== id));
      toast.success("Salary component deleted successfully.");
    } catch (err) {
      console.error("Delete salary component error:", err);
      toast.error(
        err.response?.data?.message ||
        "Failed to delete salary component."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered dataset
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (c.name || "").toLowerCase().includes(query) ||
        (c.description || "").toLowerCase().includes(query);
      const matchesType =
        selectedTypeFilter === "ALL" || c.type === selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [components, searchQuery, selectedTypeFilter]);

  // Aggregate metrics
  const earningsCount = useMemo(
    () => components.filter((c) => c.type === "EARNING").length,
    [components]
  );
  const deductionsCount = useMemo(
    () => components.filter((c) => c.type === "DEDUCTION").length,
    [components]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Salary Components
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {components.length} Total
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Master catalog for company earnings, allowances, statutory deductions, and reimbursements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchComponents}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50"
            title="Refresh component list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Component</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      {!loading && !error && components.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Earnings & Allowances
              </p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                {earningsCount} Items
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Deductions
              </p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                {deductionsCount} Items
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Taxable Components
              </p>
              <h3 className="text-xl font-bold text-indigo-600 mt-1">
                {components.filter((c) => c.isTaxable).length} Items
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search component name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "EARNING", "DEDUCTION"].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${selectedTypeFilter === type
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
            >
              {type === "ALL" ? "All Components" : type === "EARNING" ? "Earnings" : "Deductions"}
            </button>
          ))}
        </div>
      </div>

      {/* Table & Cards Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading salary components...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Components</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchComponents}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Salary Components Defined</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add your basic, HRA, PF, or custom allowance components by clicking 'Add Component' above.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Component Name</th>
                    <th className="py-3.5 px-6">Classification</th>
                    <th className="py-3.5 px-6">Calculation Type</th>
                    <th className="py-3.5 px-6">Tax Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredComponents.map((c) => {
                    const id = c._id || c.id;
                    const isDeleting = deletingId === id;

                    return (
                      <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {c.name}
                          </div>
                          {c.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {c.description}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.type === "EARNING"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${c.type === "EARNING" ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                            />
                            {c.type === "EARNING" ? "Earning / Allowance" : "Deduction"}
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {c.calculationType === "PERCENTAGE" ? (
                              <>
                                <Percent className="w-3 h-3 text-indigo-600" /> Percentage
                              </>
                            ) : (
                              <>
                                <CircleDollarSign className="w-3 h-3 text-slate-600" /> Fixed Amount
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`text-xs font-semibold ${c.isTaxable ? "text-slate-800" : "text-slate-400"
                              }`}
                          >
                            {c.isTaxable ? "Taxable (Applicable)" : "Non-Taxable / Exempt"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition"
                              title="Edit component"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              disabled={isDeleting}
                              onClick={() => handleDelete(id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition disabled:opacity-40"
                              title="Delete component"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredComponents.map((c) => {
                const id = c._id || c.id;
                const isDeleting = deletingId === id;

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{c.name}</h4>
                        {c.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{c.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg transition"
                          title="Edit component"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={isDeleting}
                          onClick={() => handleDelete(id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition disabled:opacity-40"
                          title="Delete component"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border ${c.type === "EARNING"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                      >
                        {c.type === "EARNING" ? "Earning" : "Deduction"}
                      </span>

                      <span className="text-slate-600 font-medium">
                        {c.calculationType === "PERCENTAGE" ? "Percentage Based" : "Fixed Amount"}
                      </span>

                      <span className="text-slate-500 font-medium">
                        {c.isTaxable ? "Taxable" : "Exempt"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Component Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Edit Salary Component" : "New Salary Component"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Component Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Basic Salary, HRA, Provident Fund"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Component Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition"
                  >
                    <option value="EARNING">Earning / Allowance</option>
                    <option value="DEDUCTION">Deduction</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Calculation Method
                  </label>
                  <select
                    value={form.calculationType}
                    onChange={(e) => setForm({ ...form, calculationType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition"
                  >
                    <option value="FIXED">Flat Fixed Amount</option>
                    <option value="PERCENTAGE">Percentage of Base</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mandatory statutory deduction under Section 10(13A)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isTaxable}
                    onChange={(e) => setForm({ ...form, isTaxable: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700 text-xs">
                    Consider as Taxable Component
                  </span>
                </label>
              </div>

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
                  {submitting ? "Saving..." : editingId ? "Update Component" : "Save Component"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}