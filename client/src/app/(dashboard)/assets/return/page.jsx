"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Undo2, PackageCheck, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function ReturnAssetPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assignedAssets, setAssignedAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState(null);
  const [conditionDraft, setConditionDraft] = useState({});

  // Role check: Restrict standard employees/staff
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  const fetchData = useCallback(async () => {
    if (isEmployee) return;
    setLoading(true);
    try {
      const { data } = await api.get("/assets", { params: { status: "assigned" } });
      setAssignedAssets(Array.isArray(data) ? data : (data?.data || data?.assets || []));
    } catch (err) {
      toast.error("Failed to load assigned assets from server.");
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

  const handleReturn = async (assetId) => {
    setReturningId(assetId);
    try {
      await api.put(`/assets/${assetId}/return`, { condition: conditionDraft[assetId] || "good" });
      toast.success("Asset returned successfully. 🎉");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to return asset.");
    } finally {
      setReturningId(null);
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">Loading assigned inventory...</p>
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
              <Undo2 size={22} />
            </div>
            Return Assets
          </h1>
          <p className="text-sm text-slate-500 mt-1">Process returns for items currently checked out to employees.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold self-start sm:self-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          {assignedAssets.length} Currently Assigned
        </div>
      </div>

      {assignedAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-500 border border-indigo-100 shadow-inner">
            <PackageCheck size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No assigned assets found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">There are currently no assets checked out to any employees.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
          {assignedAssets.map((asset) => {
            const assetId = asset._id || asset.id;
            return (
              <div
                key={assetId}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:bg-slate-50/80 group"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                    {asset.name || asset.assetName}
                  </h4>
                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>Assigned to: <strong className="text-slate-800">{asset.assignedTo?.name || "Employee"}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Assigned on: <strong className="text-slate-700">{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "N/A"}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                      Condition
                    </label>
                    <select
                      value={conditionDraft[assetId] || "good"}
                      onChange={(e) => setConditionDraft({ ...conditionDraft, [assetId]: e.target.value })}
                      className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-700 font-semibold cursor-pointer"
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
                      loading={returningId === assetId}
                      onClick={() => handleReturn(assetId)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.99] flex items-center gap-1.5"
                    >
                      <Undo2 size={14} /> Return
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}