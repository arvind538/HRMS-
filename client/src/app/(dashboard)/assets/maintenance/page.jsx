"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Wrench, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

export default function AssetMaintenancePage() {
  const [assets, setAssets] = useState([]);
  const [maintenanceAssets, setMaintenanceAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ asset: "", issueDescription: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/assets");
      const all = Array.isArray(data) ? data : [];
      setAssets(all);
      setMaintenanceAssets(all.filter((a) => a.status === "maintenance"));
    } catch (err) {
      toast.error("Failed to load maintenance data from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReportIssue = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/assets/maintenance", form);
      toast.success("Issue reported successfully; asset moved to maintenance.");
      setModalOpen(false);
      setForm({ asset: "", issueDescription: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to report issue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Asset Maintenance</h1>
          <p className="text-xs text-slate-500 mt-1">Report, track, and manage ongoing hardware issues and repairs.</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <Plus size={16} /> Report Issue
        </Button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4">
          Assets Currently Under Maintenance
        </h3>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
          </div>
        ) : maintenanceAssets.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench className="mx-auto mb-3 text-slate-300 h-10 w-10" />
            <p className="text-sm font-bold text-slate-700">No assets under maintenance</p>
            <p className="text-xs text-slate-400 mt-1">All company assets are operating normally.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {maintenanceAssets.map((a) => (
              <div
                key={a._id}
                className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 transition-all duration-200 hover:bg-slate-50 hover:border-indigo-200 hover:shadow-sm"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{a.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {a.category} · <span className="font-medium text-slate-600">{a.serialNumber || "No serial number"}</span>
                  </p>
                </div>
                <Badge variant="warning">Under Maintenance</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Styled Report Issue Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Report Maintenance Issue">
        <form onSubmit={handleReportIssue} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Asset</label>
            <select
              required
              value={form.asset}
              onChange={(e) => setForm({ ...form, asset: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium"
            >
              <option value="">-- Choose an operational asset --</option>
              {assets.filter((a) => a.status !== "maintenance").map((a) => (
                <option key={a._id} value={a._id}>{a.name} ({a.serialNumber || "No serial"})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Issue Description</label>
            <textarea
              required
              rows={3}
              value={form.issueDescription}
              onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 resize-none"
              placeholder="Describe the problem (e.g., screen flickering, battery not charging...)"
            />
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.99]"
            >
              Submit Issue Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}