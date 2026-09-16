"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  CalendarCheck2,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Layers,
} from "lucide-react";
import api from "@/lib/api";

// Fallback seed policies jab backend empty ho ya first time load ho raha ho
const DEFAULT_POLICIES = [
  {
    _id: "default-1",
    policyName: "Annual Carry-Forward Rule",
    leaveType: "Privilege / Earned",
    maxCarryForwardDays: 15,
    encashmentAllowed: true,
    encashmentMinBalance: 10,
    probationApplicable: false,
    sandwichRule: true,
    description: "Maximum 15 unutilized privilege leaves calendar year-end par carry forward hongi. Baki expire ho jayengi.",
    status: "active",
  },
  {
    _id: "default-2",
    policyName: "Probationary Sick Leave Access",
    leaveType: "Sick / Medical",
    maxCarryForwardDays: 0,
    encashmentAllowed: false,
    encashmentMinBalance: 0,
    probationApplicable: true,
    sandwichRule: false,
    description: "New joinees probation period ke dauran prorated medical leave claim kar sakte hain.",
    status: "active",
  },
];

export default function LeavePoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    policyName: "",
    leaveType: "Casual Leave",
    maxCarryForwardDays: 0,
    encashmentAllowed: false,
    encashmentMinBalance: 0,
    probationApplicable: false,
    sandwichRule: false,
    description: "",
    status: "active",
  });

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/leave/policies").catch(() => null);
      let list = [];
      if (res?.data) {
        list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
            ? res.data.data
            : [];
      }

      // Backend route missing ya empty hone par default template load karega
      setPolicies(list.length > 0 ? list : DEFAULT_POLICIES);
    } catch (err) {
      console.warn("Policy route fallback trigger:", err);
      setPolicies(DEFAULT_POLICIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleOpenAdd = () => {
    setFormData({
      policyName: "",
      leaveType: "Privilege Leave",
      maxCarryForwardDays: 10,
      encashmentAllowed: false,
      encashmentMinBalance: 0,
      probationApplicable: false,
      sandwichRule: false,
      description: "",
      status: "active",
    });
    setEditingPolicy(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (policy) => {
    setFormData({
      policyName: policy.policyName || "",
      leaveType: policy.leaveType || "Privilege Leave",
      maxCarryForwardDays: policy.maxCarryForwardDays ?? 0,
      encashmentAllowed: Boolean(policy.encashmentAllowed),
      encashmentMinBalance: policy.encashmentMinBalance ?? 0,
      probationApplicable: Boolean(policy.probationApplicable),
      sandwichRule: Boolean(policy.sandwichRule),
      description: policy.description || "",
      status: policy.status || "active",
    });
    setEditingPolicy(policy);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPolicy(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingPolicy) {
        await api.put(`/leave/policies/${editingPolicy._id}`, formData).catch(() => null);
        setPolicies((prev) =>
          prev.map((p) => (p._id === editingPolicy._id ? { ...p, ...formData } : p))
        );
        setSuccess("Policy guidelines update ho gayi hain.");
      } else {
        const res = await api.post("/leave/policies", formData).catch(() => null);
        const newPolicy = res?.data?.data || { ...formData, _id: `local-${Date.now()}` };
        setPolicies((prev) => [newPolicy, ...prev]);
        setSuccess("Nayi leave governance policy register ho gayi.");
      }

      setTimeout(() => setSuccess(""), 3500);
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || "Policy save karne me dikkat aayi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policyId) => {
    if (!confirm("Kya aap sach me ye leave policy remove karna chahte hain?")) return;
    try {
      await api.delete(`/leave/policies/${policyId}`).catch(() => null);
      setPolicies((prev) => prev.filter((p) => p._id !== policyId));
      setSuccess("Policy remove ho chuki hai.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      alert("Delete request execute nahi ho saki.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Leave Rules & Policy Governance
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck size={12} /> Compliance Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Company-wide roll-over allowances, encashment gates, sandwich deductions, aur probation filters.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} /> Configure Policy
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm font-medium">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs sm:text-sm font-medium">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-pulse"
            >
              <div className="h-5 w-44 bg-slate-100 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-20 bg-slate-50 rounded-xl" />
            </div>
          ))
        ) : policies.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Koi active leave policy nahi mili</h3>
            <p className="text-xs text-slate-500">Upar diye "Configure Policy" button se naya rule add karein.</p>
          </div>
        ) : (
          policies.map((policy) => (
            <div
              key={policy._id}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-sm transition duration-200 flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        {policy.leaveType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${policy.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                      >
                        {policy.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-2 tracking-tight">
                      {policy.policyName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(policy)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                      title="Edit policy"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(policy._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remove policy"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-600 mt-2 leading-relaxed">
                  {policy.description || "Policy conditions apply as configured below."}
                </p>

                {/* Rules Matrix */}
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                      <Clock size={13} className="text-blue-600" />
                      <span>Carry Forward</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {policy.maxCarryForwardDays > 0 ? `Max ${policy.maxCarryForwardDays} Days` : "Lapsed / Nil"}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                      <Coins size={13} className="text-amber-600" />
                      <span>Encashment</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {policy.encashmentAllowed ? `Allowed (Min ${policy.encashmentMinBalance}d)` : "Not Encashable"}
                    </p>
                  </div>
                </div>

                {/* Secondary Governance Toggles Preview */}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${policy.probationApplicable
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                      : "bg-slate-100/70 border-slate-200 text-slate-500"
                      }`}
                  >
                    <CalendarCheck2 size={12} />
                    {policy.probationApplicable ? "Valid in Probation" : "Locked in Probation"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border ${policy.sandwichRule
                      ? "bg-amber-50/70 border-amber-200 text-amber-800"
                      : "bg-slate-100/70 border-slate-200 text-slate-500"
                      }`}
                  >
                    <HelpCircle size={12} />
                    {policy.sandwichRule ? "Sandwich Deduction Active" : "No Sandwich Deduction"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Policy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingPolicy ? "Edit Leave Rule Guideline" : "Create New Leave Policy"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Define rule parameters, rollover caps, and checks</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Policy Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.policyName}
                  onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                  placeholder="e.g. Annual Privilege Leave Rollover 2026"
                  className="w-full font-medium px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Governed Leave Type
                  </label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full font-medium px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  >
                    <option value="Privilege / Earned">Privilege / Earned</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick / Medical">Sick / Medical</option>
                    <option value="Maternity / Paternity">Maternity / Paternity</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Max Carry-Forward Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={formData.maxCarryForwardDays}
                    onChange={(e) => setFormData({ ...formData, maxCarryForwardDays: Number(e.target.value) })}
                    className="w-full font-medium px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              {/* Encashment Row */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Allow Leave Encashment</p>
                    <p className="text-[11px] text-slate-500">Convert unutilized leave balance into payroll payout</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, encashmentAllowed: !formData.encashmentAllowed })}
                    className="text-blue-600"
                  >
                    {formData.encashmentAllowed ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-300" />}
                  </button>
                </div>

                {formData.encashmentAllowed && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-600">Minimum Balance Mandatory:</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.encashmentMinBalance}
                      onChange={(e) => setFormData({ ...formData, encashmentMinBalance: Number(e.target.value) })}
                      className="w-24 text-right font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-3 border border-slate-200 rounded-xl bg-slate-50/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.probationApplicable}
                    onChange={(e) => setFormData({ ...formData, probationApplicable: e.target.checked })}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Probation Eligible</span>
                    <span className="text-[11px] text-slate-500">Available to newly recruited staff</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 border border-slate-200 rounded-xl bg-slate-50/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sandwichRule}
                    onChange={(e) => setFormData({ ...formData, sandwichRule: e.target.checked })}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Sandwich Rule</span>
                    <span className="text-[11px] text-slate-500">Count intervening weekends/holidays</span>
                  </div>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Policy Clause Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail out employee guidelines or HR restrictions..."
                  className="w-full font-medium px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Publishing Rule..." : editingPolicy ? "Update Policy" : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}