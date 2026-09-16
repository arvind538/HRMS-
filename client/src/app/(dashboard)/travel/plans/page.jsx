"use client";
import { useEffect, useState } from "react";
import { Plane, Calendar, MapPin, ArrowRight, User } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function TravelPlansPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/travel", { params: { status: "approved" } })
      .then(({ data }) => {
        const tripList = Array.isArray(data) ? data : data?.trips || [];
        const sorted = tripList.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setTrips(sorted);
      })
      .catch((err) => {
        console.error("Travel fetch error:", err);
        toast.error("Plans load nahi hue. Dobara koshish karein.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Travel Plans</h1>
          <p className="text-sm text-slate-500 mt-0.5">Approved aur upcoming trips ka timeline</p>
        </div>
        {!loading && trips.length > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 w-fit">
            {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'} Approved
          </span>
        )}
      </div>

      {/* Loading State with Skeleton Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Calendar size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Koi approved travel plan nahi hai</h3>
          <p className="text-xs text-slate-500 mt-1">Jab naye trips approve honge, yahan dikhne lagenge.</p>
        </div>
      ) : (
        /* Grid Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((t) => (
            <div
              key={t._id || t.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Top Icon & Mode Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Plane size={18} />
                  </div>
                  {t.modeOfTravel && (
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {t.modeOfTravel}
                    </span>
                  )}
                </div>

                {/* Employee Info & Purpose */}
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5 truncate">
                  <User size={14} className="text-slate-400 shrink-0" />
                  {t.employee?.name || t.employeeName || "Team Member"}
                </h4>
                {t.purpose && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.purpose}</p>
                )}

                {/* Route */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-slate-800 font-medium text-sm">
                  <span className="truncate max-w-[110px]" title={t.fromLocation}>{t.fromLocation || "Origin"}</span>
                  <ArrowRight size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate max-w-[110px]" title={t.toLocation}>{t.toLocation || "Destination"}</span>
                </div>
              </div>

              {/* Dates Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>
                  {t.startDate ? new Date(t.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                  {" — "}
                  {t.endDate ? new Date(t.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}