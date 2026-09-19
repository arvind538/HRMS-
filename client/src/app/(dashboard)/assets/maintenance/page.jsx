"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Wrench, ShieldAlert, Package, X } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function AssetMaintenancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [maintenanceAssets, setMaintenanceAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ asset: "", issueDescription: "" });
  const [selectedAsset, setSelectedAsset] = useState(null); // Click par details modal ke liye

  // Role check: Restrict standard employees/staff
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  const fetchData = useCallback(async () => {
    if (isEmployee) return;
    setLoading(true);
    try {
      const { data } = await api.get("/assets");
      const all = Array.isArray(data) ? data : (data?.data || data?.assets || []);
      setAssets(all);
      setMaintenanceAssets(all.filter((a) => a.status === "maintenance"));
    } catch (err) {
      toast.error("Failed to load maintenance data from server.");
    } finally {
      setLoading(false);
    }
  }, [isEmployee]);

  useEffect(() => {
    if (!isEmployee) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData, isEmployee]);

  const handleReportIssue = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/assets/maintenance", form);
      toast.success("Issue reported successfully; asset moved to maintenance. 🛠️");
      setModalOpen(false);
      setForm({ asset: "", issueDescription: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to report issue.");
    } finally {
      setSubmitting(false);
    }
  };

  // 🚫 Access Denied View for regular Employees
  if (isEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          Your role (<span className="capitalize font-semibold text-slate-700">{user?.role || "Employee"}</span>) does not have permission to access this page.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all duration-200"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wrench size={22} />
            </div>
            Asset Maintenance
          </h1>
          <p className="text-sm text-slate-500 mt-1">Report, track, and manage ongoing hardware issues and repairs seamlessly.</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] px-5 py-2.5 self-start sm:self-auto"
        >
          <Plus size={16} /> Report Issue
        </Button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Assets Currently Under Maintenance
          </h3>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
            {maintenanceAssets.length} Active Repairs
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading maintenance logs...</p>
          </div>
        ) : maintenanceAssets.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-500 border border-indigo-100 shadow-inner">
              <Wrench size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No assets under maintenance</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">All company inventory assets are currently operating normally.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {maintenanceAssets.map((a) => {
              const assetId = a._id || a.id;
              return (
                <div
                  key={assetId}
                  onClick={() => setSelectedAsset(a)}
                  className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 transition-all duration-300 hover:bg-white hover:border-indigo-300 hover:shadow-md cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 text-sm">{a.name || a.assetName}</p>
                    <p className="text-xs text-slate-500 capitalize font-medium">
                      {a.category || "General"} · <span className="font-semibold text-slate-700 font-mono">{a.serialNumber || "No serial"}</span>
                    </p>
                  </div>
                  <Badge variant="warning">Under Maintenance</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📋 Asset Details Popup Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 relative overflow-hidden">

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedAsset.name || selectedAsset.assetName}</h3>
                  <p className="text-xs text-slate-500">Maintenance & Repair Details</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedAsset.category || "General"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Serial Number:</span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{selectedAsset.serialNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Purchase Cost:</span>
                  <span className="font-bold text-emerald-700">₹{Number(selectedAsset.purchaseCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span className="font-extrabold uppercase text-xs px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200">{selectedAsset.status}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Styled Report Issue Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Report Maintenance Issue">
        <form onSubmit={handleReportIssue} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Asset</label>
            <select
              required
              value={form.asset}
              onChange={(e) => setForm({ ...form, asset: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-semibold cursor-pointer capitalize"
            >
              <option value="">-- Choose an operational asset --</option>
              {assets.filter((a) => a.status !== "maintenance").map((a) => (
                <option key={a._id || a.id} value={a._id || a.id}>
                  {a.name || a.assetName} ({a.serialNumber || "No serial"})
                </option>
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
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 resize-none font-medium"
              placeholder="Describe the problem (e.g., screen flickering, battery not charging...)"
            />
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all duration-200 active:scale-[0.99]"
            >
              Submit Issue Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}







