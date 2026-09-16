"use client";
import { useEffect, useState } from "react";
import { Loader2, Tag } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const COMMON_CATEGORIES = ["laptop", "mobile", "furniture", "monitor", "accessories", "other"];

export default function AssetCategoriesPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/assets")
      .then(({ data }) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load category data from server."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const usage = COMMON_CATEGORIES.map((cat) => {
    const items = assets.filter((a) => a.category === cat);
    return {
      category: cat,
      count: items.length,
      available: items.filter((a) => a.status === "available").length,
      totalValue: items.reduce((sum, a) => sum + (a.purchaseCost || 0), 0),
    };
  });
  const maxCount = Math.max(...usage.map((u) => u.count), 1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Asset Categories</h1>
        <p className="text-xs text-slate-500 mt-1">Overview of category-wise asset distribution and total valuation.</p>
      </div>

      {/* Category Grid Cards with Smooth Hover Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {usage.map((u) => (
          <div
            key={u.category}
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110">
              <Tag size={18} />
            </div>

            <h4 className="font-bold text-slate-900 capitalize tracking-tight text-base">{u.category}</h4>

            <p className="text-xs text-slate-400 mt-1">
              <strong className="text-slate-700">{u.count}</strong> total · <strong className="text-emerald-600">{u.available}</strong> available
            </p>

            <p className="text-sm font-extrabold text-slate-800 mt-3">
              ₹{u.totalValue.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">total value</span>
            </p>

            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-indigo-700"
                style={{ width: `${(u.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}