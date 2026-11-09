"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner, StatCard, inputClass } from "@/components/payroll/ui";
import { FilterTabs, ListSkeleton, PageHeader } from "@/components/payroll/common";
import { RecordList, TYPE_LABEL } from "@/components/compliance/shared";

const DAYS = [30, 60, 90, 180];

export default function ComplianceCalendarPage() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [days, setDays] = useState(60);
  const [type, setType] = useState("all");
  const [data, setData] = useState({ overdue: [], upcoming: [], recentlyFiled: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/compliance/calendar", { params: { days } });
      setData({ overdue: res.data.overdue || [], upcoming: res.data.upcoming || [], recentlyFiled: res.data.recentlyFiled || [] });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the calendar.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const pick = useMemo(() => {
    const f = (list) => list.filter((r) => type === "all" || r.type === type);
    return { overdue: f(data.overdue), upcoming: f(data.upcoming), filed: f(data.recentlyFiled) };
  }, [data, type]);

  const soon = pick.upcoming.filter((r) => r.daysLeft <= 7).length;

  const section = (title, tone, list, empty) => (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100">
        <p className={`text-xs font-bold ${tone}`}>{title}</p>
        <span className="text-[11px] font-bold text-slate-400">{list.length}</span>
      </div>
      <RecordList records={list} isAdmin={isAdmin} onChanged={load} emptyText={empty} />
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={CalendarDays} title="Compliance Calendar" subtitle="Every statutory due date in one place. Late ones are red, the ones due within 7 days are yellow." onRefresh={load} busy={loading}>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} !w-auto cursor-pointer border-slate-200`}>
          {DAYS.map((d) => <option key={d} value={d}>Next {d} days</option>)}
        </select>
      </PageHeader>

      <ErrorBanner message={error} onRetry={load} />

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={AlertTriangle} tone={data.overdue.length ? "rose" : "emerald"} label="Overdue" value={data.overdue.length} sub={data.overdue.length ? "File these first" : "All clear"} />
          <StatCard icon={Clock} tone="amber" label="Due in 7 days" value={soon} />
          <StatCard icon={CheckCircle2} tone="indigo" label={`Upcoming (${days} days)`} value={data.upcoming.length} />
        </div>
      )}

      <FilterTabs tabs={[["all", "All"], ...Object.entries(TYPE_LABEL).map(([k, l]) => [k, l.replace(/ \(.*\)/, "")])]} value={type} onChange={setType} />

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"><ListSkeleton /></div>
      ) : (
        <>
          {pick.overdue.length > 0 && section("Overdue", "text-rose-600", pick.overdue, "")}
          {section("Upcoming", "text-slate-700", pick.upcoming, `Nothing is due in the next ${days} days.`)}
          {section("Recently filed", "text-emerald-600", pick.filed, "No filing has been marked as done yet.")}
        </>
      )}
    </div>
  );
}
