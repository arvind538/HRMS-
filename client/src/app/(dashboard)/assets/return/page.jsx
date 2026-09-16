"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Undo2, PackageCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function ReturnAssetPage() {
  const [assignedAssets, setAssignedAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState(null);
  const [conditionDraft, setConditionDraft] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/assets", { params: { status: "assigned" } });
      setAssignedAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load assigned assets from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReturn = async (assetId) => {
    setReturningId(assetId);
    try {
      await api.put(`/assets/${assetId}/return`, { condition: conditionDraft[assetId] || "good" });
      toast.success("Asset returned successfully.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to return asset.");
    } finally {
      setReturningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Return Asset</h1>
        <p className="text-xs text-slate-500 mt-1">Process returns for assets currently assigned to employees.</p>
      </div>

      {assignedAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <PackageCheck className="mx-auto mb-3 text-slate-300 h-10 w-10" />
          <p className="text-sm font-bold text-slate-700">No assigned assets found</p>
          <p className="text-xs text-slate-400 mt-1">There are currently no assets checked out to employees.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {assignedAssets.map((asset) => (
            <div
              key={asset._id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200 hover:bg-slate-50/60"
            >
              <div>
                <p className="font-bold text-slate-900 text-base">{asset.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assigned to: <strong className="text-slate-700">{asset.assignedTo?.name || "—"}</strong> · Assigned on: <span className="text-slate-600">{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "N/A"}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                    Condition
                  </label>
                  <select
                    value={conditionDraft[asset._id] || "good"}
                    onChange={(e) => setConditionDraft({ ...conditionDraft, [asset._id]: e.target.value })}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-700 font-medium"
                  >
                    <option value="new">New</option>
                    <option value="good">Good</option>
                    <option value="damaged">Damaged</option>
                    <option value="under-repair">Under Repair</option>
                  </select>
                </div>

                <div className="pt-5">
                  <Button
                    size="sm"
                    loading={returningId === asset._id}
                    onClick={() => handleReturn(asset._id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.99] flex items-center gap-1.5"
                  >
                    <Undo2 size={14} /> Return
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}