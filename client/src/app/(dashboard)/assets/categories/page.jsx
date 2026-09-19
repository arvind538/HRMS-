"use client";
import { useEffect, useState } from "react";
import { Loader2, Tag, ShieldAlert, Eye, Pencil, Trash2, X, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

const COMMON_CATEGORIES = ["laptop", "mobile", "furniture", "monitor", "accessories", "other"];

export default function AssetCategoriesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null); // Modal view ke liye
  const [deletingId, setDeletingId] = useState(null);

  // Role check: Restrict standard employees
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  useEffect(() => {
    if (isEmployee) {
      setLoading(false);
      return;
    }

    fetchAssets();
  }, [isEmployee]);

  const fetchAssets = () => {
    setLoading(true);
    api.get("/assets")
      .then(({ data }) => {
        const assetList = Array.isArray(data) ? data : (data?.data || data?.assets || []);
        setAssets(assetList);
      })
      .catch(() => toast.error("Failed to load category data from server."))
      .finally(() => setLoading(false));
  };

  const handleDeleteAsset = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Kya aap sach mein is asset ko delete karna chahte hain?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/assets/${id}`);
      toast.success("Asset successfully delete ho gaya.");
      setAssets((prev) => prev.filter((a) => (a._id || a.id) !== id));
      // Modal ke andar ki list bhi update karne ke liye selected category ko refresh karenge
      setSelectedCategory((prev) => prev ? {
        ...prev,
        items: prev.items.filter((a) => (a._id || a.id) !== id)
      } : null);
    } catch (err) {
      console.error("Delete asset error:", err);
      toast.error("Asset delete nahi ho paya.");
    } finally {
      setDeletingId(null);
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
          Your role (<span className="capitalize font-semibold text-slate-700">{user?.role || "Employee"}</span>) does not have permission to access this page.[cite: 6]
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const usage = COMMON_CATEGORIES.map((cat) => {
    const items = assets.filter((a) => (a.category || "").toLowerCase() === cat);
    return {
      category: cat,
      count: items.length,
      available: items.filter((a) => a.status === "available").length,
      totalValue: items.reduce((sum, a) => sum + (a.purchaseCost || 0), 0),
      items: items,
    };
  });
  const maxCount = Math.max(...usage.map((u) => u.count), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Tag size={22} />
            </div>
            Asset Categories
          </h1>
          <p className="text-sm text-slate-500 mt-1">Overview of category-wise asset distribution and total valuation.</p>
        </div>
      </div>

      {/* Category Grid Cards with Smooth Hover Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {usage.map((u) => (
          <div
            key={u.category}
            onClick={() => setSelectedCategory(u)}
            className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm">
                  <Tag size={18} />
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  View Items →
                </span>
              </div>

              <h4 className="font-bold text-slate-900 capitalize tracking-tight text-lg">{u.category}</h4>

              <p className="text-xs text-slate-500 mt-1">
                <strong className="text-slate-800">{u.count}</strong> total · <strong className="text-emerald-600">{u.available}</strong> available
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-800">
                <span>₹{u.totalValue.toLocaleString()}</span>
                <span className="text-[11px] font-normal text-slate-400">total valuation</span>
              </div>

              <div className="mt-3 h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-violet-700 shadow-xs"
                  style={{ width: `${(u.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 📦 Category Details Modal Popup */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 relative overflow-hidden max-h-[85vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 capitalize">{selectedCategory.category} Assets</h3>
                  <p className="text-xs text-slate-500">{selectedCategory.count} items found in this category</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body List */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {selectedCategory.items.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 font-medium">
                  No assets available under this category.
                </div>
              ) : (
                selectedCategory.items.map((item) => {
                  const itemId = item._id || item.id;
                  return (
                    <div key={itemId} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 transition-all hover:bg-indigo-50/20">
                      <div className="space-y-1 truncate">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.name || item.assetName || "Unnamed Asset"}</h4>
                        <p className="text-xs text-slate-500">
                          Serial: <span className="font-semibold text-slate-700">{item.serialNumber || item.tag || "N/A"}</span> • Cost: <span className="font-semibold text-emerald-600">₹{Number(item.purchaseCost || 0).toLocaleString()}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${item.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.status === 'assigned' ? 'bg-violet-50 text-violet-700 border border-violet-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {item.status || "available"}
                        </span>

                        <button
                          disabled={deletingId === itemId}
                          onClick={(e) => handleDeleteAsset(itemId, e)}
                          className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all shadow-xs border border-rose-100"
                          title="Delete Asset"
                        >
                          {deletingId === itemId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
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