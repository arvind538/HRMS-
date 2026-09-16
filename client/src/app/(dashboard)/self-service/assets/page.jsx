"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Package, ShieldAlert, Calendar, Tag, Hash } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function MyAssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Safe helper function to extract employee ID (handles multiple formats)
  const getEmployeeId = useCallback(() => {
    return user?.employee?._id || user?.employee || user?._id || user?.id;
  }, [user]);

  const fetchData = useCallback(async () => {
    const empId = getEmployeeId();
    if (!empId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetching assets assigned to this employee securely
      const { data } = await api.get("/assets", { params: { status: "assigned" } });
      const assetList = Array.isArray(data) ? data : [];

      // Filter assets matching the employee ID (supports both object and string formats)
      const mine = assetList.filter((a) => {
        const assignedId = typeof a.assignedTo === "object" ? a.assignedTo?._id : a.assignedTo;
        return assignedId === empId;
      });

      setAssets(mine);
    } catch (err) {
      console.error("Assets fetch error:", err);
      toast.error("Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const empId = getEmployeeId();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2">Loading your assets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Assets</h1>
        <p className="text-sm text-slate-500 mt-1">View company assets assigned to your profile.</p>
      </div>

      {/* Session Warning Banner */}
      {!empId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details not found. Please ensure you are logged into the correct account.
          </p>
        </div>
      )}

      {assets.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm transition-all duration-200">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">No assets assigned yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">When HR assigns company equipment to you, it will appear here.</p>
          </div>
        </div>
      ) : (
        /* Assets Grid with Smooth Hover Effects */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((a) => (
            <div
              key={a._id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 group-hover:scale-105 transition-all duration-200">
                    <Package size={20} />
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full capitalize">
                    {a.status || "Assigned"}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                  {a.name}
                </h4>

                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500 capitalize flex items-center gap-1.5">
                    <Tag size={13} className="text-slate-400" />
                    <span>Category: <strong className="text-slate-700">{a.category || "General"}</strong></span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Hash size={13} className="text-slate-400" />
                    <span>Serial No: <strong className="text-slate-700">{a.serialNumber || "N/A"}</strong></span>
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-indigo-600" /> Assigned Date
                </span>
                <span className="font-semibold text-slate-700">
                  {a.assignedDate ? new Date(a.assignedDate).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}