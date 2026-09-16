"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";

export default function TravelExpensesPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costDrafts, setCostDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/travel", { params: { status: "approved" } });
      const tripList = Array.isArray(data) ? data : data?.trips || [];
      setTrips(tripList);
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
      toast.success("Trip complete mark ho gaya, actual cost save hui!");
      // Clear draft for this ID
      setCostDrafts((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      fetchData();
    } catch (err) {
      console.error("Save expense error:", err);
      toast.error("Save nahi hua. Kuch gadbad hai.");
    } finally {
      setSavingId(null);
    }
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <span className="font-semibold text-slate-900">
          {r.employee?.name || r.employeeName || "Team Member"}
        </span>
      )
    },
    {
      key: "route",
      label: "Route",
      render: (r) => (
        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
          <span className="truncate max-w-[100px] sm:max-w-[130px]" title={r.fromLocation}>
            {r.fromLocation || "Origin"}
          </span>
          <ArrowRight size={13} className="text-slate-400 shrink-0" />
          <span className="truncate max-w-[100px] sm:max-w-[130px]" title={r.toLocation}>
            {r.toLocation || "Destination"}
          </span>
        </div>
      )
    },
    {
      key: "estimatedCost",
      label: "Estimated Cost",
      render: (r) => (
        <span className="text-slate-600 font-medium">
          ₹{r.estimatedCost?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: "actualCost",
      label: "Actual Cost & Action",
      render: (r) => (
        <div className="flex items-center gap-2 py-1">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 font-medium">₹</span>
            <input
              type="number"
              placeholder="Amount"
              value={costDrafts[r._id || r.id] ?? ""}
              onChange={(e) => setCostDrafts({ ...costDrafts, [r._id || r.id]: e.target.value })}
              className="w-28 sm:w-32 pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          <Button
            size="sm"
            loading={savingId === (r._id || r.id)}
            onClick={() => handleComplete(r._id || r.id)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm"
          >
            Save & Complete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Travel Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Approved trips ke actual expenses record karo aur complete mark karo</p>
        </div>
        {!loading && trips.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 w-fit">
            <CheckCircle2 size={13} />
            {trips.length} Pending Expenses
          </span>
        )}
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs text-slate-400 font-medium">Expenses data load ho raha hai...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Wallet size={24} />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Koi approved trip pending nahi hai</h3>
            <p className="text-xs text-slate-500 mt-1">Sabhi approved trips ke expenses complete ho chuke hain.</p>
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