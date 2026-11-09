"use client";

import React, { useMemo, useState } from "react";
import { FileSpreadsheet, RefreshCw, Calendar, AlertCircle, BarChart3, IdCard, MapPin, Users, CheckCircle2, Clock, XCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return ymd(d);
};

/* works for {lat,lng}, {latitude,longitude} and GeoJSON-style [lng, lat] */
const mapsUrl = (c) => {
  if (!c) return "";
  let lat;
  let lng;
  if (Array.isArray(c)) [lng, lat] = c;
  else {
    lat = c.lat ?? c.latitude;
    lng = c.lng ?? c.lon ?? c.longitude;
  }
  lat = Number(lat);
  lng = Number(lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? `https://www.google.com/maps?q=${lat},${lng}` : "";
};

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "present" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "absent" ? "bg-rose-50 text-rose-700 border-rose-200"
        : s === "late" ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize border ${cls}`}>{status}</span>;
}

/* one punch location: pin icon + address, click opens Google Maps when coordinates exist */
function Location({ text, coords, tone }) {
  if (!text) return <span className="text-slate-300">—</span>;
  const url = mapsUrl(coords);
  const pin = tone === "in" ? "text-indigo-500 group-hover/loc:text-indigo-700" : "text-rose-500 group-hover/loc:text-rose-700";
  const inner = (
    <>
      <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-colors ${pin}`} />
      <span className="line-clamp-2 break-words">{text}</span>
    </>
  );
  const base = "group/loc flex items-start gap-1.5 max-w-[210px] text-xs font-medium text-slate-600 leading-snug";
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" title={`${text} (open in Google Maps)`} className={`${base} hover:text-slate-900 hover:underline underline-offset-2`}>
      {inner}
    </a>
  ) : (
    <span title={text} className={base}>{inner}</span>
  );
}

export default function AttendanceReports() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);
  const [department, setDepartment] = useState("ALL"); // filtered here, after the report is loaded
  const [filters, setFilters] = useState({ startDate: monthStart(), endDate: ymd(new Date()), status: "ALL" });

  const handleFetchReport = async (e) => {
    e.preventDefault();
    if (filters.endDate < filters.startDate) return toast.error("To Date cannot be before From Date.");

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/attendance/reports", { params: filters });
      const list = Array.isArray(data) ? data : data?.reports || data?.data || data?.records || [];

      setReportData(
        list.map((item, i) => ({
          id: item._id || i,
          userId: item.userId || "N/A",
          userName: item.userName || "Staff Member",
          department: item.department || "N/A",
          date: item.date || "",
          checkIn: item.checkIn || "--",
          checkOut: item.checkOut || "--",
          inLocation: item.inLocation || "",
          outLocation: item.outLocation || "",
          inCoordinates: item.inCoordinates,
          outCoordinates: item.outCoordinates,
          hours: item.hours ? `${item.hours}h` : "--",
          status: item.status || "present",
        }))
      );
      setDepartment("ALL");
      setGenerated(true);
      toast.success(`Report ready: ${list.length} record${list.length === 1 ? "" : "s"}.`);
    } catch (err) {
      console.error("Report fetch error:", err);
      const msg = err?.response?.data?.message || "Failed to fetch report data from the server.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => [...new Set(reportData.map((r) => r.department).filter((d) => d && d !== "N/A"))].sort(), [reportData]);
  const visible = useMemo(() => (department === "ALL" ? reportData : reportData.filter((r) => r.department === department)), [reportData, department]);

  const counts = useMemo(() => {
    const c = { total: visible.length, present: 0, late: 0, absent: 0 };
    visible.forEach((r) => {
      const s = String(r.status).toLowerCase();
      if (s in c) c[s] += 1;
    });
    return c;
  }, [visible]);

  const exportCSV = () => {
    if (!visible.length) return;
    const head = ["Employee ID", "Name", "Department", "Date", "Check In", "Check Out", "In Location", "Out Location", "Total Hours", "Status"].map(csvCell).join(",");
    const rows = visible.map((r) =>
      [r.userId, r.userName, r.department, r.date, r.checkIn, r.checkOut, r.inLocation, r.outLocation, r.hours, r.status].map(csvCell).join(",")
    );
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Report_${ymd(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV report downloaded.");
  };

  const fieldCls = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer";
  const labelCls = "font-bold text-slate-600 uppercase tracking-wider block mb-1.5";

  return (
    <div className="w-full space-y-5 font-sans pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Attendance Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Generate, filter, and export detailed attendance records and insights</p>
        </div>
        <button type="button" onClick={exportCSV} disabled={!visible.length} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-100 transition cursor-pointer active:scale-95">
          <FileSpreadsheet className="w-4 h-4" /> Export to CSV
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleFetchReport} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs items-end">
        <div>
          <label className={labelCls}>From Date</label>
          <input type="date" required value={filters.startDate} max={filters.endDate || undefined} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className={`${fieldCls} font-mono font-medium`} />
        </div>
        <div>
          <label className={labelCls}>To Date</label>
          <input type="date" required value={filters.endDate} min={filters.startDate || undefined} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className={`${fieldCls} font-mono font-medium`} />
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} disabled={!departments.length} className={`${fieldCls} disabled:opacity-60`}>
            <option value="ALL">{departments.length ? "All Departments" : "Generate report first"}</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status Filter</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={fieldCls}>
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-100 cursor-pointer active:scale-95">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </form>

      {/* Summary */}
      {generated && !loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Total records", counts.total, Users, "text-indigo-600 bg-indigo-50"],
            ["Present", counts.present, CheckCircle2, "text-emerald-600 bg-emerald-50"],
            ["Late", counts.late, Clock, "text-amber-600 bg-amber-50"],
            ["Absent", counts.absent, XCircle, "text-rose-600 bg-rose-50"],
          ].map(([label, value, Icon, tone]) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</p>
              </div>
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-medium">Generating report, please wait...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">{generated ? "No records found" : "No attendance data available"}</p>
            <p className="text-xs text-slate-400 mt-0.5">{generated ? "Try another date range or filter." : "Select a date range and click 'Generate Report'."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm border-collapse">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5">Emp ID</th>
                  <th className="py-4 px-5">Employee Name</th>
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-5">Check In</th>
                  <th className="py-4 px-5">Check Out</th>
                  <th className="py-4 px-5">In Location</th>
                  <th className="py-4 px-5">Out Location</th>
                  <th className="py-4 px-5">Duration</th>
                  <th className="py-4 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((item) => (
                  <tr key={item.id} className="group hover:bg-indigo-50/50 transition-colors duration-150">
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                        <IdCard size={12} /> {item.userId}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {item.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm tracking-tight truncate max-w-[170px] group-hover:text-indigo-900">{item.userName}</p>
                          {item.department !== "N/A" && <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{item.department}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 text-xs font-medium whitespace-nowrap font-mono">{item.date}</td>
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-600 whitespace-nowrap">{item.checkIn}</td>
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-600 whitespace-nowrap">{item.checkOut}</td>
                    <td className="py-3.5 px-5"><Location tone="in" text={item.inLocation} coords={item.inCoordinates} /></td>
                    <td className="py-3.5 px-5"><Location tone="out" text={item.outLocation} coords={item.outCoordinates} /></td>
                    <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">{item.hours}</td>
                    <td className="py-3.5 px-5 whitespace-nowrap"><StatusPill status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
