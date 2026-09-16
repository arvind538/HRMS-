"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, History, FileText, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";

export default function AssetHistoryPage() {
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    api.get("/assets")
      .then(({ data }) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load assets from server."))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Asset History & Logs</h1>
        <p className="text-xs text-slate-500 mt-1">Select an asset to view its complete assignment and maintenance history.</p>
      </div>

      {/* Asset Selection Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Select Asset
        </label>
        {loading ? (
          <div className="py-4 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-6 w-6" />
          </div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              fetchHistory(e.target.value);
            }}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium"
          >
            <option value="">-- Choose an asset from inventory --</option>
            {assets.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} ({a.serialNumber || "No serial number"})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* History Content Section */}
      {loadingHistory ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        </div>
      ) : historyData ? (
        <div className="space-y-5">
          {/* Asset Info Summary Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{historyData.asset?.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Currently assigned to: <strong className="text-slate-800">{historyData.asset?.assignedTo?.name || "Nobody (Available in stock)"}</strong>
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText size={20} />
            </div>
          </div>

          {/* Maintenance Logs Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4">Maintenance & Repair Logs</h3>

            {historyData.maintenanceHistory?.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-400">No maintenance records found for this asset.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData.maintenanceHistory.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 transition-all duration-200 hover:bg-slate-50 hover:border-indigo-200 hover:shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{m.issueDescription}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock size={12} /> Reported on: {new Date(m.reportedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={m.status === "resolved" ? "success" : "warning"}>
                      {m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <History className="mx-auto mb-3 text-slate-300 h-10 w-10" />
          <p className="text-sm font-bold text-slate-700">No Asset Selected</p>
          <p className="text-xs text-slate-400 mt-1">Please select an asset from the dropdown above to view its history logs.</p>
        </div>
      )}
    </div>
  );
}