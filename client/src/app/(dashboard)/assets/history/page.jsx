"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, History, FileText, Clock, ShieldAlert, Eye, X, Package, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function AssetHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false); // Detailed modal ke liye state

  // Role check: Restrict standard employees/staff
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  const fetchAssets = useCallback(async () => {
    if (isEmployee) return;
    setLoading(true);
    try {
      const { data } = await api.get("/assets");
      setAssets(Array.isArray(data) ? data : (data?.data || data?.assets || []));
    } catch (err) {
      toast.error("Failed to load assets from server.");
    } finally {
      setLoading(false);
    }
  }, [isEmployee]);

  useEffect(() => {
    if (!isEmployee) {
      fetchAssets();
    } else {
      setLoading(false);
    }
  }, [fetchAssets, isEmployee]);

  const fetchHistory = useCallback(async (id) => {
    if (!id) {
      setHistoryData(null);
      return;
    }
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/assets/${id}/history`);
      setHistoryData(data);
    } catch (err) {
      toast.error("Failed to load asset history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

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

  const assetInfo = historyData?.asset || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <History size={22} />
            </div>
            Asset History & Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">Select an inventory asset to view its complete assignment and maintenance lifecycle.</p>
        </div>
      </div>

      {/* Asset Selection Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:border-indigo-300">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Select Asset
        </label>
        {loading ? (
          <div className="py-6 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-6 w-6" />
          </div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              fetchHistory(e.target.value);
            }}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-semibold cursor-pointer"
          >
            <option value="">-- Choose an asset from inventory --</option>
            {assets.map((a) => {
              const assetId = a._id || a.id;
              return (
                <option key={assetId} value={assetId}>
                  {a.name || a.assetName} ({a.serialNumber || "No serial number"})
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* History Content Section */}
      {loadingHistory ? (
        <div className="py-24 text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
          <p className="text-xs text-slate-400 mt-2 font-medium">Fetching history logs...</p>
        </div>
      ) : historyData ? (
        <div className="space-y-5 animate-fadeIn">
          {/* Asset Info Summary Card with View Details Button */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-indigo-300 hover:shadow-md">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{assetInfo.name || assetInfo.assetName}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Currently assigned to: <strong className="text-slate-800">{assetInfo.assignedTo?.name || "Nobody (Available in stock)"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => setDetailModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-xs border border-indigo-100"
              >
                <Eye size={15} /> View Full Details
              </button>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner hidden sm:block">
                <FileText size={20} />
              </div>
            </div>
          </div>

          {/* Maintenance Logs Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">Maintenance & Repair Logs</h3>

            {historyData.maintenanceHistory?.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-400 font-medium">No maintenance records found for this asset.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData.maintenanceHistory.map((m) => {
                  const logId = m._id || m.id;
                  return (
                    <div
                      key={logId}
                      className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 transition-all duration-200 hover:bg-white hover:border-indigo-300 hover:shadow-md"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm">{m.issueDescription}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                          <Clock size={12} /> Reported on: {m.reportedDate ? new Date(m.reportedDate).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <Badge variant={m.status === "resolved" ? "success" : "warning"}>
                        {m.status || "pending"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-500 border border-indigo-100 shadow-inner">
            <History size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Asset Selected</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Please select an asset from the dropdown above to view its complete lifecycle and logs.</p>
        </div>
      )}

      {/* 📋 Detailed Asset Lifecycle Modal */}
      {detailModalOpen && assetInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 relative overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{assetInfo.name || assetInfo.assetName}</h3>
                  <p className="text-xs text-slate-500">Complete Asset Profile & Specs</p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Info */}
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-bold text-slate-900 capitalize">{assetInfo.category || "General"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Serial Number:</span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{assetInfo.serialNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Purchase Date:</span>
                  <span className="font-semibold text-slate-700">{assetInfo.purchaseDate ? new Date(assetInfo.purchaseDate).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Purchase Cost:</span>
                  <span className="font-bold text-emerald-700">₹{Number(assetInfo.purchaseCost || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span className="font-extrabold uppercase text-xs px-2.5 py-1 bg-white rounded-lg border border-indigo-200 text-indigo-700">{assetInfo.status || "available"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Assigned Employee:</span>
                  <span className="font-bold text-slate-800">{assetInfo.assignedTo?.name || "None (In Stock)"}</span>
                </div>
                {assetInfo.assignedDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Assigned Date:</span>
                    <span className="font-semibold text-slate-700">{new Date(assetInfo.assignedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}