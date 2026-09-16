"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Search, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

const COMMON_CATS = ["laptop", "mobile", "furniture", "monitor", "accessories", "other"];

export default function AllAssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", category: "laptop", serialNumber: "", purchaseDate: "", purchaseCost: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/assets", { params: statusFilter ? { status: statusFilter } : {} });
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load assets from server.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/assets", { ...form, purchaseCost: Number(form.purchaseCost) });
      toast.success("Asset added successfully.");
      setModalOpen(false);
      setForm({ name: "", category: "laptop", serialNumber: "", purchaseDate: "", purchaseCost: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const statusVariant = { available: "success", assigned: "info", maintenance: "warning", retired: "neutral" };

  const columns = [
    { key: "name", label: "Asset Name" },
    { key: "category", label: "Category", render: (r) => <span className="capitalize">{r.category}</span> },
    { key: "serialNumber", label: "Serial No.", render: (r) => r.serialNumber || "—" },
    { key: "assignedTo", label: "Assigned To", render: (r) => r.assignedTo?.name || "—" },
    { key: "purchaseCost", label: "Cost", render: (r) => `₹${r.purchaseCost?.toLocaleString() || 0}` },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">All Assets</h1>
          <p className="text-xs text-slate-500 mt-1">Master inventory list of all company assets.</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <Plus size={16} /> Add Asset
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
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
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
          </div>
        ) : (
          <Table columns={columns} data={filtered} emptyText="No assets found matching your criteria." />
        )}
      </div>

      {/* Styled Smooth Add Asset Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Asset">
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
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
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 capitalize"
            >
              {COMMON_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Serial Number</label>
            <input
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
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
                className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
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
              Add Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}