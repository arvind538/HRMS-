"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Search, X, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

const COMMON_CATS = ["laptop", "mobile", "furniture", "monitor", "accessories", "other"];

export default function AllAssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); // Edit tracking ke liye
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "laptop", serialNumber: "", purchaseDate: "", purchaseCost: "" });

  // Role check: Restrict standard employees/staff
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  const fetchData = useCallback(async () => {
    if (isEmployee) return;
    setLoading(true);
    try {
      const { data } = await api.get("/assets", { params: statusFilter ? { status: statusFilter } : {} });
      const assetList = Array.isArray(data) ? data : (data?.data || data?.assets || []);
      setAssets(assetList);
    } catch (err) {
      toast.error("Failed to load assets from server.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isEmployee]);

  useEffect(() => {
    if (!isEmployee) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData, isEmployee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, purchaseCost: Number(form.purchaseCost) };
      if (editingId) {
        await api.put(`/assets/${editingId}`, payload);
        toast.success("Asset updated successfully.");
      } else {
        await api.post("/assets", payload);
        toast.success("Asset added successfully.");
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (asset) => {
    setEditingId(asset._id || asset.id);
    setForm({
      name: asset.name || asset.assetName || "",
      category: asset.category || "laptop",
      serialNumber: asset.serialNumber || "",
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
      purchaseCost: asset.purchaseCost || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Kya aap sach mein is asset ko delete karna chahte hain?")) return;
    setDeletingId(id);
    try {
      const response = await api.delete(`/assets/${id}`);
      toast.success(response.data?.message || "Asset deleted successfully.");
      setAssets((prev) => prev.filter((a) => (a._id || a.id) !== id));
    } catch (err) {
      console.error("Delete Error:", err);
      const errorMsg = err.response?.data?.message || "Asset delete nahi ho paya. Server check karein.";
      toast.error(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", category: "laptop", serialNumber: "", purchaseDate: "", purchaseCost: "" });
  };

  // 🚫 Access Denied View for regular Employees (Aapke image ke mutabiq)[cite: 7]
  if (isEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          Your role (<span className="capitalize font-semibold text-slate-700">{user?.role || "Employee"}</span>) does not have permission to access this page.[cite: 7]
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

  const filtered = assets.filter((a) =>
    (a.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.serialNumber || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusVariant = { available: "success", assigned: "info", maintenance: "warning", retired: "neutral" };

  const columns = [
    { key: "name", label: "Asset Name", render: (r) => <span className="font-bold text-slate-900">{r.name || r.assetName}</span> },
    { key: "category", label: "Category", render: (r) => <span className="capitalize font-medium text-slate-700">{r.category}</span> },
    { key: "serialNumber", label: "Serial No.", render: (r) => <span className="text-slate-600 font-mono text-xs">{r.serialNumber || "—"}</span> },
    { key: "assignedTo", label: "Assigned To", render: (r) => <span className="text-slate-600 font-medium">{r.assignedTo?.name || "—"}</span> },
    { key: "purchaseCost", label: "Cost", render: (r) => <span className="font-bold text-emerald-700">₹{Number(r.purchaseCost || 0).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status] || "neutral"}>{r.status}</Badge> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const id = r._id || r.id;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditClick(r)}
              className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-slate-500 transition-colors border border-slate-200/60"
              title="Edit Asset"
            >
              <Pencil size={14} />
            </button>
            <button
              disabled={deletingId === id}
              onClick={() => handleDelete(id)}
              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all shadow-xs border border-rose-100 disabled:opacity-50"
              title="Delete Asset"
            >
              {deletingId === id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">All Assets Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">Master inventory list of all company assets with real-time tracking.</p>
        </div>
        <Button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] px-5 py-2.5"
        >
          <Plus size={16} /> Add Asset
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset name or serial number..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Main Table Section with Smooth Hover */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading inventory...</p>
          </div>
        ) : (
          <Table columns={columns} data={filtered} emptyText="No assets found matching your criteria." />
        )}
      </div>

      {/* Styled Smooth Add/Edit Asset Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Asset Details" : "Add New Asset"}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Asset Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
              placeholder="e.g. Dell Latitude 5420"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 capitalize cursor-pointer"
            >
              {COMMON_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Serial Number</label>
            <input
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 font-mono text-xs"
              placeholder="e.g. DL2026-001"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Purchase Cost (₹)</label>
              <input
                type="number"
                value={form.purchaseCost}
                onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 font-bold text-emerald-700"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.99]"
            >
              {editingId ? "Update Asset" : "Add Asset"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}