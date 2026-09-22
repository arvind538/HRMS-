"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Package,
  ShieldAlert,
  Calendar,
  Tag,
  Hash,
  RefreshCw,
  Sparkles,
  ChevronRight,
  X,
  Laptop,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyAssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Extract all potential identifiers for matching
  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      null
    );
  }, [user]);

  const userIds = useMemo(() => {
    const ids = new Set();
    if (user?._id) ids.add(String(user._id));
    if (user?.id) ids.add(String(user.id));
    if (user?.employee?._id) ids.add(String(user.employee._id));
    if (user?.employee?.id) ids.add(String(user.employee.id));
    if (typeof user?.employee === "string") ids.add(user.employee);
    return ids;
  }, [user]);

  // Robust extractor for any API structure
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.assets)) return resData.assets;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.result)) return resData.result;
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let records = [];

      // 1. Direct personal endpoints (handled securely by backend token)
      const directEndpoints = [
        "/assets/my-assets",
        "/assets/my",
        "/assets/me",
        "/assets/user/me",
      ];

      for (const endpoint of directEndpoints) {
        try {
          const res = await api.get(endpoint);
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
            break;
          }
        } catch {
          // Continue to next probe
        }
      }

      // 2. Query by Employee / User ID params
      if (records.length === 0 && employeeId) {
        const queryEndpoints = [
          { url: "/assets", params: { employee: employeeId } },
          { url: "/assets", params: { assignedTo: employeeId } },
          { url: "/assets", params: { user: employeeId } },
        ];

        for (const item of queryEndpoints) {
          try {
            const res = await api.get(item.url, { params: item.params });
            const parsed = extractList(res.data);
            if (parsed && parsed.length > 0) {
              records = parsed;
              break;
            }
          } catch {
            // Continue
          }
        }
      }

      // 3. Fallback: Query all assets and filter matching IDs or user role
      if (records.length === 0) {
        try {
          const res = await api.get("/assets", { params: { status: "assigned" } });
          const allAssets = extractList(res.data);

          if (allAssets.length > 0) {
            // Check if user is admin/superadmin with no specific mapping
            if (user?.role === "admin" || user?.role === "superadmin") {
              records = allAssets;
            } else {
              // Smart check against all known IDs of user
              records = allAssets.filter((a) => {
                const assigned = a.assignedTo || a.employee || a.user;
                const assignedId =
                  typeof assigned === "object"
                    ? String(assigned?._id || assigned?.id || "")
                    : String(assigned || "");

                return userIds.has(assignedId);
              });
            }
          }
        } catch {
          // No-op
        }
      }

      setAssets(records);
    } catch (err) {
      console.error("Assets fetch error:", err);
      toast.error("Failed to load company assets.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [employeeId, extractList, user?.role, userIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedAsset(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const statusVariant = {
    assigned: "success",
    allocated: "success",
    active: "success",
    in_use: "success",
    pending: "warning",
    maintenance: "warning",
    repair: "warning",
    returned: "neutral",
    damaged: "danger",
    lost: "danger",
  };

  if (loading && !isRefreshing) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2 font-medium">Loading your assets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-md shadow-indigo-100 shrink-0">
            <Package size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Assets</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                <Sparkles size={12} /> Assigned Equipment
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              View details, serial tags, warranty, and return policies of hardware assigned to you.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh assets"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Total Assets: <span className="text-indigo-600 font-bold">{assets.length}</span>
          </div>
        </div>
      </div>

      {/* Session Warning Banner */}
      {!employeeId && assets.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee profile link not found for this account.
          </p>
        </div>
      )}

      {assets.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-slate-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 border border-indigo-100/50 shadow-xs">
            <Package size={30} />
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-base font-bold text-slate-800">No assets assigned yet</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              When IT or HR allocates devices, systems, or equipment to your profile, they will appear here.
            </p>
          </div>
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            Sync Assets
          </button>
        </div>
      ) : (
        /* Assets Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((a, idx) => {
            const assetId = a._id || a.id || idx;
            const statusKey = (a.status || "assigned").toLowerCase().replace(/\s+/g, "_");
            const isSelected = (selectedAsset?._id || selectedAsset?.id) === assetId;

            return (
              <div
                key={assetId}
                onClick={() => setSelectedAsset(a)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === "Enter" && setSelectedAsset(a)}
                className={`group relative bg-white p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between outline-hidden
                  ${isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/15 shadow-md bg-indigo-50/10"
                    : "border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-300 hover:-translate-y-1 active:scale-[0.99]"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <Laptop size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[statusKey] || "neutral"}>
                        {String(a.status || "Assigned").replace(/[-_]/g, " ")}
                      </Badge>
                      <ChevronRight
                        size={16}
                        className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {a.name || a.assetName || a.title || "Company Asset"}
                  </h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Tag size={13} className="text-slate-400 shrink-0" />
                      <span>Category: <strong className="text-slate-700 font-medium">{a.category || a.type || "Hardware"}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Hash size={13} className="text-slate-400 shrink-0" />
                      <span>Serial No: <strong className="text-slate-700 font-medium">{a.serialNumber || a.serialNo || a.assetCode || "N/A"}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-indigo-600" /> Assigned Date
                  </span>
                  <span className="font-semibold text-slate-700">
                    {a.assignedDate || a.createdAt
                      ? new Date(a.assignedDate || a.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "Recently"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Center Details Modal */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/80 to-white">
              <div className="flex items-start gap-3.5 pr-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                  <Package size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusVariant[(selectedAsset.status || "assigned").toLowerCase().replace(/\s+/g, "_")] || "neutral"}>
                      {String(selectedAsset.status || "Assigned").replace(/[-_]/g, " ")}
                    </Badge>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {selectedAsset.category || selectedAsset.type || "Asset"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {selectedAsset.name || selectedAsset.assetName || "Asset Details"}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Asset Identifiers Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Hash size={12} /> Serial / Tag Number
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {selectedAsset.serialNumber || selectedAsset.serialNo || selectedAsset.assetCode || "N/A"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Tag size={12} /> Model / Brand
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedAsset.model || selectedAsset.brand || selectedAsset.manufacturer || "Standard Enterprise"}
                  </span>
                </div>
              </div>

              {/* Description / Specifications */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" />
                  Specifications & Description
                </span>
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedAsset.description || selectedAsset.specifications || "Standard hardware item issued for company operations."}
                </div>
              </div>

              {/* Assignment Timeline */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                  <span className="text-indigo-500 font-medium block mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-indigo-600" /> Assigned Date
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedAsset.assignedDate || selectedAsset.createdAt
                      ? new Date(selectedAsset.assignedDate || selectedAsset.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "Not recorded"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" /> Warranty / Renewal
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedAsset.warrantyExpiry || selectedAsset.returnDate
                      ? new Date(selectedAsset.warrantyExpiry || selectedAsset.returnDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "Active Support"}
                  </span>
                </div>
              </div>

              {/* Asset Condition Note */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Physical Condition: <strong className="font-semibold">{selectedAsset.condition || "Operational / Good"}</strong>
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}