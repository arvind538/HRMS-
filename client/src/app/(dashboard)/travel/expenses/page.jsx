"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Wallet, ArrowRight, CheckCircle2, Pencil, Trash2, X, Save } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";

export default function TravelExpensesPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costDrafts, setCostDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/travel", { params: { status: "approved" } });
      const tripList = Array.isArray(data) ? data : (data?.data || data?.trips || []);
      const pendingExpenses = tripList.filter(t => t.status !== "completed");
      setTrips(pendingExpenses);
    } catch (err) {
      console.error("Expense fetch error:", err);
      toast.error("Data load nahi hua. Dobara koshish karein.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleComplete = async (id) => {
    const actualCost = Number(costDrafts[id]);
    if (!actualCost || actualCost <= 0) {
      toast.error("Kripya ek valid actual cost daalein.");
      return;
    }
    setSavingId(id);
    try {
      await api.put(`/travel/${id}/complete`, { actualCost });
      toast.success("Trip complete mark ho gaya, actual cost save hui! 🎉");

      setCostDrafts((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setEditingId(null);
      setTrips((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      console.error("Save expense error:", err);
      toast.error(err.response?.data?.message || "Save nahi hua. Kuch gadbad hai.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Kya aap sach mein is travel request ko delete karna chahte hain?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/travel/${id}`);
      toast.success("Travel request delete kar di gayi.");
      setTrips((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Delete nahi ho paya.");
    } finally {
      setDeletingId(null);
    }
  };

  // Table Columns with a separate clean Actions Column
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <span className="font-bold text-slate-900 tracking-tight">
          {r.employee?.name || r.employeeName || "Team Member"}
        </span>
      )
    },
    {
      key: "route",
      label: "Route & Purpose",
      render: (r) => (
        <div className="space-y-0.5 py-1">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
            <span className="truncate max-w-[110px]" title={r.fromLocation}>{r.fromLocation || "Origin"}</span>
            <ArrowRight size={12} className="text-slate-400 shrink-0" />
            <span className="truncate max-w-[110px]" title={r.toLocation}>{r.toLocation || "Destination"}</span>
          </div>
          {r.purpose && <p className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">{r.purpose}</p>}
        </div>
      )
    },
    {
      key: "estimatedCost",
      label: "Estimated Cost",
      render: (r) => (
        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold px-2.5 py-1 rounded-lg text-xs">
          ₹{Number(r.estimatedCost || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: "actualCostInput",
      label: "Actual Cost",
      render: (r) => {
        const id = r._id || r.id;
        const isEditing = editingId === id;
        const hasExistingCost = r.actualCost && !isEditing;

        if (hasExistingCost) {
          return (
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              ₹{Number(r.actualCost).toLocaleString()}
            </span>
          );
        }

        return (
          <div className="relative flex items-center w-32">
            <span className="absolute left-2.5 text-xs text-slate-400 font-bold">₹</span>
            <input
              type="number"
              placeholder="Enter amount"
              value={costDrafts[id] ?? ""}
              onChange={(e) => setCostDrafts({ ...costDrafts, [id]: e.target.value })}
              className="w-full pl-6 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-white transition-all"
            />
          </div>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const id = r._id || r.id;
        const isEditing = editingId === id;

        return (
          <div className="flex items-center gap-2 py-1">
            {/* Save Button */}
            <Button
              size="sm"
              loading={savingId === id}
              onClick={() => handleComplete(id)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Save size={13} /> Save
            </Button>

            {/* Edit / Cancel Edit Button */}
            {r.actualCost && !isEditing ? (
              <button
                onClick={() => {
                  setEditingId(id);
                  setCostDrafts({ ...costDrafts, [id]: r.actualCost });
                }}
                className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-slate-500 transition-colors border border-slate-200/60"
                title="Edit Cost"
              >
                <Pencil size={14} />
              </button>
            ) : isEditing ? (
              <button
                onClick={() => setEditingId(null)}
                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-500 transition-colors border border-slate-200/60"
                title="Cancel Edit"
              >
                <X size={14} />
              </button>
            ) : null}

            {/* Delete Button */}
            <button
              disabled={deletingId === id}
              onClick={() => handleDelete(id)}
              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all shadow-xs disabled:opacity-50 border border-rose-100"
              title="Delete Request"
            >
              {deletingId === id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wallet size={22} />
            </div>
            Travel Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-1">Approved trips ke actual expenses record karein aur complete mark karein</p>
        </div>
        {!loading && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 text-xs font-semibold self-start sm:self-auto shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            {trips.length} Pending Expense{trips.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={36} />
            <p className="text-sm text-slate-500 font-medium">Expenses data load ho raha hai...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="py-28 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-500 border border-indigo-100 shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Koi approved trip pending nahi hai</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Sabhi approved trips ke actual expenses successfully record ho chuke hain.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table columns={columns} data={trips} />
          </div>
        )}
      </div>
    </div>
  );
}