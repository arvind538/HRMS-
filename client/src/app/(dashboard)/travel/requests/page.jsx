"use client";
import { useEffect, useState, useCallback } from "react";
import { Send, Loader2, Plane } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function TravelRequestsPage() {
  const { user } = useAuth();
  const [myTravels, setMyTravels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    purpose: "", fromLocation: "", toLocation: "", startDate: "", endDate: "",
    modeOfTravel: "flight", estimatedCost: "",
  });

  // 🛠 SMART ID EXTRACTOR: Yeh safe tareeqe se User ID nikalega
  const getEmployeeId = (currentUser) => {
    if (!currentUser) return null;
    return currentUser.employee?._id || currentUser.employeeId || currentUser._id;
  };

  const fetchMyTravels = useCallback(async () => {
    const empId = getEmployeeId(user);
    if (!empId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/travel", { params: { employee: empId } });
      // API response ko smoothly handle karna
      const travelsList = Array.isArray(data) ? data : (data?.data || data?.travels || []);
      setMyTravels(travelsList);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Travel requests load karne mein problem aayi.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMyTravels();
    }
  }, [fetchMyTravels, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const empId = getEmployeeId(user);
    if (!empId) {
      return toast.error("Aapka account detail load nahi hua. Kripya page refresh karein.");
    }

    setSubmitting(true);
    try {
      await api.post("/travel", {
        ...form,
        employee: empId,
        estimatedCost: Number(form.estimatedCost)
      });

      toast.success("Travel request successfully submit ho gaya.");
      // Form ko reset karna
      setForm({ purpose: "", fromLocation: "", toLocation: "", startDate: "", endDate: "", modeOfTravel: "flight", estimatedCost: "" });
      fetchMyTravels(); // Table automatically refresh hogi
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error(err.response?.data?.message || "Submit nahi hua. Server par error hai.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = { pending: "warning", approved: "info", rejected: "danger", completed: "success" };

  const columns = [
    { key: "purpose", label: "Purpose" },
    { key: "route", label: "Route", render: (r) => <span className="font-medium text-slate-700">{r.fromLocation} → {r.toLocation}</span> },
    { key: "startDate", label: "Dates", render: (r) => <span className="text-sm whitespace-nowrap">{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</span> },
    { key: "modeOfTravel", label: "Mode", render: (r) => <span className="capitalize">{r.modeOfTravel}</span> },
    { key: "estimatedCost", label: "Est. Cost", render: (r) => <span className="font-medium text-slate-800">₹{Number(r.estimatedCost || 0).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (r) => <Badge variant={statusVariant[r.status] || "warning"}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Travel Requests</h1>
        <p className="text-sm text-slate-500 mt-1">Naya travel request submit karein aur apni history track karein</p>
      </div>

      {/* Travel Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all">
        <h3 className="font-semibold text-slate-800 mb-5 text-sm sm:text-base flex items-center gap-2">
          <Plane size={18} className="text-indigo-600" /> New Travel Request
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Purpose</label>
            <input
              required
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. Client visit, Conference"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">From</label>
            <input
              required
              value={form.fromLocation}
              onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. Jaipur"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">To</label>
            <input
              required
              value={form.toLocation}
              onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. Mumbai"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Start Date</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">End Date</label>
            <input
              type="date"
              required
              min={form.startDate}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Mode of Travel</label>
            <select
              value={form.modeOfTravel}
              onChange={(e) => setForm({ ...form, modeOfTravel: e.target.value })}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="flight">Flight</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="car">Car</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Estimated Cost (₹)</label>
            <input
              type="number"
              required
              min="0"
              value={form.estimatedCost}
              onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
              className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. 15000"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </div>

      {/* Travel History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">My Travel History</h3>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm text-slate-500 font-medium">Loading history...</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table
              columns={columns}
              data={myTravels}
              emptyText="Aapne abhi tak koi travel request submit nahi ki hai."
            />
          </div>
        )}
      </div>
    </div>
  );
}