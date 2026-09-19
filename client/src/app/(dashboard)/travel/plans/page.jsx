"use client";
import { useEffect, useState } from "react";
import {
  Plane,
  Calendar,
  MapPin,
  ArrowRight,
  User,
  Wallet,
  PlaneTakeoff,
  ShieldAlert,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2 // 👈 Yeh yahan add hona zaroori hai
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function TravelPlansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null); // Modal view ke liye
  const [deletingId, setDeletingId] = useState(null);

  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  useEffect(() => {
    if (isEmployee) {
      setLoading(false);
      return;
    }

    fetchTrips();
  }, [isEmployee]);

  const fetchTrips = () => {
    setLoading(true);
    api.get("/travel", { params: { status: "approved" } })
      .then(({ data }) => {
        const tripList = Array.isArray(data) ? data : (data?.data || data?.trips || []);
        const sorted = tripList.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setTrips(sorted);
      })
      .catch((err) => {
        console.error("Travel fetch error:", err);
        toast.error("Plans load nahi hue. Dobara koshish karein.");
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Card click event trigger na ho
    if (!confirm("Kya aap sach mein is travel plan ko delete karna chahte hain?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/travel/${id}`);
      toast.success("Travel plan delete kar diya gaya.");
      setTrips((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Delete nahi ho paya.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          Your role (<span className="capitalize font-semibold text-slate-700">{user?.role || "Employee"}</span>) does not have permission to access this page.
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <PlaneTakeoff size={22} />
            </div>
            Travel Plans
          </h1>
          <p className="text-sm text-slate-500 mt-1">Approved aur upcoming trips ka timeline aur details</p>
        </div>
        {!loading && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold self-start sm:self-auto shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'} Approved
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="w-16 h-5 rounded-md bg-slate-200" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
              <div className="h-10 bg-slate-100 rounded-xl w-full" />
              <div className="h-3 bg-slate-200 rounded w-2/3 pt-2" />
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-500 border border-indigo-100 shadow-inner">
            <Calendar size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Koi approved travel plan nahi hai</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Jab naye trips admin dwara approve kiye jayenge, woh yahan timeline par dikhne lagenge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((t) => {
            const tripId = t._id || t.id;
            return (
              <div
                key={tripId}
                onClick={() => setSelectedTrip(t)}
                className="group relative bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
              >
                {/* Top Accent line bar on hover */}
                <div className="absolute left-0 top-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  {/* Top Icon & Mode Badge + Quick Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <Plane size={18} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {t.modeOfTravel && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 uppercase tracking-wider border border-slate-200/60">
                          {t.modeOfTravel}
                        </span>
                      )}

                      {/* Delete Button */}
                      <button
                        disabled={deletingId === tripId}
                        onClick={(e) => handleDelete(tripId, e)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition-all shadow-xs border border-rose-100"
                        title="Delete Plan"
                      >
                        {deletingId === tripId ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Employee Info & Purpose */}
                  <h4 className="font-bold text-slate-900 text-base flex items-center gap-2 truncate">
                    <span className="p-1 bg-slate-100 rounded-md text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <User size={13} />
                    </span>
                    <span className="truncate">{t.employee?.name || t.employeeName || "Team Member"}</span>
                  </h4>
                  {t.purpose && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100/80">
                      {t.purpose}
                    </p>
                  )}

                  {/* Route Box */}
                  <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-slate-800 font-semibold text-sm group-hover:bg-indigo-50/30 transition-colors">
                    <span className="truncate text-slate-700" title={t.fromLocation}>
                      {t.fromLocation || "Origin"}
                    </span>
                    <div className="p-1 bg-white rounded-full shadow-xs text-indigo-500 shrink-0 border border-slate-200/60">
                      <ArrowRight size={13} />
                    </div>
                    <span className="truncate text-slate-700 text-right" title={t.toLocation}>
                      {t.toLocation || "Destination"}
                    </span>
                  </div>
                </div>

                {/* Footer: Dates & Est Cost */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <Calendar size={13} className="text-blue-500 shrink-0" />
                    <span className="text-slate-700">
                      {t.startDate ? new Date(t.startDate).toLocaleDateString("en-GB", { month: 'short', day: 'numeric' }) : 'TBD'}
                      {" — "}
                      {t.endDate ? new Date(t.endDate).toLocaleDateString("en-GB", { month: 'short', day: 'numeric' }) : 'TBD'}
                    </span>
                  </div>

                  {t.estimatedCost && (
                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 font-bold">
                      <Wallet size={12} />
                      ₹{Number(t.estimatedCost).toLocaleString()}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 📄 Profile / Detail Modal Popup */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 relative overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <PlaneTakeoff size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Trip Profile & Details</h3>
                  <p className="text-xs text-slate-500">Approved Travel Plan Information</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Employee Name:</span>
                  <span className="font-bold text-slate-900">{selectedTrip.employee?.name || selectedTrip.employeeName || "Team Member"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-semibold text-slate-700">{selectedTrip.employee?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-semibold text-slate-700 capitalize">{selectedTrip.employee?.department || "General"}</span>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Purpose:</span>
                  <span className="font-bold text-indigo-900">{selectedTrip.purpose || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Route:</span>
                  <span className="font-bold text-slate-800">{selectedTrip.fromLocation} → {selectedTrip.toLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Mode of Travel:</span>
                  <span className="font-semibold text-slate-800 uppercase">{selectedTrip.modeOfTravel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Travel Dates:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedTrip.startDate).toLocaleDateString()} - {new Date(selectedTrip.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Estimated Cost</span>
                <span className="text-lg font-extrabold text-emerald-700">₹{Number(selectedTrip.estimatedCost || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTrip(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
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