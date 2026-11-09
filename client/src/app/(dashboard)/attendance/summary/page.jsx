"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarCheck, CheckCircle2, Download, Eye, Users, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner } from "@/components/payroll/ui";
import { FilterTabs, PageHeader, SearchBox } from "@/components/payroll/common";
import { Chip } from "@/components/recruitment/rui";
import { Bar, DataPanel, Person, Stats, roleOf, selectCls, useApi } from "@/components/performance/pui";
import { downloadCsv } from "@/lib/csv";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CELL = {
    present: "bg-emerald-500 text-white", late: "bg-amber-500 text-white", half: "bg-indigo-500 text-white", absent: "bg-rose-500 text-white", leave: "bg-sky-500 text-white",
    off: "bg-slate-200 text-slate-500", holiday: "bg-violet-200 text-violet-800", pending: "bg-white text-indigo-700 ring-2 ring-indigo-400", future: "bg-white text-slate-300 border border-slate-100", none: "bg-slate-50 text-slate-300",
};
const LEGEND = [["present", "Present"], ["late", "Late"], ["half", "Half day"], ["absent", "Absent"], ["leave", "Leave"], ["off", "Sunday off"], ["holiday", "Company off / holiday"]];
const hrs = (h) => { const m = Math.round((Number(h) || 0) * 60); return m ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : "—"; };
const pctTone = (p) => (p >= 90 ? "bg-emerald-500" : p >= 75 ? "bg-indigo-500" : p >= 50 ? "bg-amber-500" : "bg-rose-500");
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i).reverse();

const pctCell = (r) => <div className="w-28"><Bar value={r.attendancePct} tone={pctTone(r.attendancePct)} /><p className="text-[11px] font-semibold text-slate-500 mt-1">{r.attendancePct}%</p></div>;
const num = (v, tone) => <b className={`font-mono ${v ? tone : "text-slate-300"}`}>{v}</b>;

function MonthTab({ onOpen }) {
    const now = new Date();
    const [m, setM] = useState(now.getMonth() + 1);
    const [y, setY] = useState(now.getFullYear());
    const [dept, setDept] = useState("ALL");
    const [q, setQ] = useState("");
    const { data, loading, refreshing, error, load } = useApi("/attendance/monthly-summary", { month: m, year: y });
    const rows = data?.data || [];

    const depts = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(), [rows]);
    const visible = useMemo(() => rows.filter((r) => (dept === "ALL" || r.department === dept) && (!q.trim() || `${r.name} ${r.employeeId || ""}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, dept, q]);
    const sum = (k) => visible.reduce((s, r) => s + r[k], 0);
    const avg = visible.length ? Math.round(visible.reduce((s, r) => s + r.attendancePct, 0) / visible.length) : 0;

    const exportCsv = () => downloadCsv(`attendance-${MONTHS[m - 1]}-${y}.csv`, ["Employee ID", "Name", "Department", "Working days", "Came", "Late", "Half day", "Absent", "Leave", "Extra (off day work)", "Hours", "Attendance %"],
        visible.map((r) => [r.employeeId, r.name, r.department, r.workingDays, r.came, r.late, r.half, r.absent, r.leave, r.extra, r.hours, r.attendancePct]));

    return (
        <div className="space-y-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-wrap items-center gap-2.5">
                <select value={m} onChange={(e) => setM(Number(e.target.value))} className={selectCls}>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
                <select value={y} onChange={(e) => setY(Number(e.target.value))} className={selectCls}>{YEARS.map((n) => <option key={n} value={n}>{n}</option>)}</select>
                {depts.length > 1 && <select value={dept} onChange={(e) => setDept(e.target.value)} className={selectCls}><option value="ALL">All departments</option>{depts.map((d) => <option key={d} value={d}>{d}</option>)}</select>}
                <SearchBox value={q} onChange={setQ} placeholder="Search name or ID" />
                <button type="button" disabled={!visible.length} onClick={exportCsv} className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-3 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40"><Download size={13} /> Export CSV</button>
            </div>

            {!loading && !error && <Stats items={[["Employees", visible.length, Users, "indigo"], ["Average attendance", `${avg}%`, CheckCircle2, "emerald"], ["Days came", sum("came"), CalendarCheck, "violet"], ["Days absent", sum("absent"), XCircle, "violet"]]} />}
            <ErrorBanner message={error} onRetry={() => load()} />

            <DataPanel
                loading={loading} rows={visible} icon={BarChart3}
                empty={["No employees found", "Try another month or filter."]}
                onOpen={(r) => onOpen(r._id)} menu={(r) => [{ label: "View month-wise history", icon: Eye, run: () => onOpen(r._id) }]}
                cols={[
                    { h: "Employee", cell: (r) => <Person p={r} sub={[r.employeeId, r.department].filter(Boolean).join(" • ")} /> },
                    { h: "Working days", cell: (r) => <b className="font-mono text-slate-700">{r.workingDays}</b> },
                    { h: "Came", cell: (r) => num(r.came, "text-emerald-600") },
                    { h: "Late", cell: (r) => num(r.late, "text-amber-600") },
                    { h: "Half", cell: (r) => num(r.half, "text-indigo-600") },
                    { h: "Absent", cell: (r) => num(r.absent, "text-rose-600") },
                    { h: "Leave", cell: (r) => num(r.leave, "text-sky-600") },
                    { h: "Hours", cell: (r) => <span className="font-mono text-slate-600">{hrs(r.hours)}</span> },
                    { h: "Attendance", cell: pctCell },
                ]}
                card={(r) => (
                    <div className="space-y-2.5">
                        <Person p={r} sub={[r.employeeId, r.department].filter(Boolean).join(" • ")} />
                        <Bar value={r.attendancePct} tone={pctTone(r.attendancePct)} />
                        <div className="flex flex-wrap gap-1.5"><Chip tone="emerald">{r.came} came</Chip>{r.late > 0 && <Chip tone="amber">{r.late} late</Chip>}{r.absent > 0 && <Chip tone="rose">{r.absent} absent</Chip>}{r.leave > 0 && <Chip tone="sky">{r.leave} leave</Chip>}<Chip tone="violet">{r.attendancePct}%</Chip></div>
                    </div>
                )}
            />
        </div>
    );
}

function HistoryTab({ focus }) {
    const [emp, setEmp] = useState(focus || "");
    const [y, setY] = useState(new Date().getFullYear());
    const [openM, setOpenM] = useState(new Date().getMonth() + 1);
    const { data: people } = useApi("/performance/people");
    const list = people || [];

    useEffect(() => { if (focus) setEmp(focus); }, [focus]);
    useEffect(() => { if (!emp && list.length) setEmp((list.find((p) => p.isMe) || list[0])._id); }, [emp, list]);

    const { data, loading, refreshing, error, load } = useApi("/attendance/employee-year", { employee: emp || undefined, year: y });
    const t = data?.totals || {};
    const months = useMemo(() => (data?.months || []).map((x) => ({ ...x, _id: x.month })), [data]);
    const prefix = `${y}-${String(openM).padStart(2, "0")}`;
    const days = (data?.days || []).filter((d) => d.d.startsWith(prefix));
    const offset = new Date(Date.UTC(y, openM - 1, 1)).getUTCDay();

    const exportCsv = () => downloadCsv(`${data.employee.name}-${y}.csv`, ["Month", "Working days", "Came", "Late", "Half day", "Absent", "Leave", "Extra (off day work)", "Hours", "Attendance %"],
        months.map((x) => [MONTHS[x.month - 1], x.workingDays, x.came, x.late, x.half, x.absent, x.leave, x.extra, x.hours, x.attendancePct]));

    return (
        <div className="space-y-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-wrap items-center gap-2.5">
                {list.length > 1 && <select value={emp} onChange={(e) => setEmp(e.target.value)} className={`${selectCls} min-w-[200px]`}>{list.map((p) => <option key={p._id} value={p._id}>{p.name}{p.employeeId ? ` (${p.employeeId})` : ""}{p.isMe ? " - me" : ""}</option>)}</select>}
                <select value={y} onChange={(e) => setY(Number(e.target.value))} className={selectCls}>{YEARS.map((n) => <option key={n} value={n}>{n}</option>)}</select>
                {data?.employee && <p className="text-xs font-semibold text-slate-600 truncate">{data.employee.name} • {data.employee.designation || data.employee.department || "Employee"}</p>}
                <button type="button" disabled={!months.length} onClick={exportCsv} className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-3 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40"><Download size={13} /> Export CSV</button>
            </div>

            {!loading && !error && <Stats items={[["Days came", t.came || 0, CalendarCheck, "emerald"], ["Days absent", t.absent || 0, XCircle, "violet"], ["Leave days", t.leave || 0, Users, "indigo"], ["Attendance", `${t.attendancePct || 0}%`, CheckCircle2, "violet"]]} />}
            <ErrorBanner message={error} onRetry={() => load()} />

            <DataPanel
                loading={loading} rows={months} icon={CalendarCheck}
                empty={["No attendance yet", "This employee has no record for the selected year."]}
                onOpen={(r) => setOpenM(r.month)} menu={(r) => [{ label: "View days", icon: Eye, run: () => setOpenM(r.month) }]}
                cols={[
                    { h: "Month", cell: (r) => <b className={r.month === openM ? "text-indigo-600" : "text-slate-800"}>{MONTHS[r.month - 1]}</b> },
                    { h: "Working days", cell: (r) => <b className="font-mono text-slate-700">{r.workingDays}</b> },
                    { h: "Came", cell: (r) => num(r.came, "text-emerald-600") },
                    { h: "Late", cell: (r) => num(r.late, "text-amber-600") },
                    { h: "Absent", cell: (r) => num(r.absent, "text-rose-600") },
                    { h: "Leave", cell: (r) => num(r.leave, "text-sky-600") },
                    { h: "Hours", cell: (r) => <span className="font-mono text-slate-600">{hrs(r.hours)}</span> },
                    { h: "Attendance", cell: pctCell },
                ]}
                card={(r) => (
                    <div className="space-y-2.5">
                        <p className="text-sm font-bold text-slate-900">{MONTHS[r.month - 1]}</p>
                        <Bar value={r.attendancePct} tone={pctTone(r.attendancePct)} />
                        <div className="flex flex-wrap gap-1.5"><Chip tone="emerald">{r.came} of {r.workingDays} days</Chip>{r.absent > 0 && <Chip tone="rose">{r.absent} absent</Chip>}{r.leave > 0 && <Chip tone="sky">{r.leave} leave</Chip>}<Chip tone="violet">{r.attendancePct}%</Chip></div>
                    </div>
                )}
            />

            {months.length > 0 && (
                <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h2 className="text-sm font-bold text-slate-900">{MONTHS[openM - 1]} {y}</h2>
                        <select value={openM} onChange={(e) => setOpenM(Number(e.target.value))} className={selectCls}>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
                    </div>
                    <div className="max-w-md">
                        <div className="grid grid-cols-7 gap-1 mb-1">{["S", "M", "T", "W", "T", "F", "S"].map((w, i) => <p key={i} className="text-[10px] font-bold text-slate-400 text-center">{w}</p>)}</div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: offset }).map((_, i) => <div key={`b${i}`} />)}
                            {days.map((d) => (
                                <div key={d.d} title={`${d.d}: ${d.n || d.s}${d.in ? ` • in ${new Date(d.in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}`} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-bold hover:scale-105 transition ${CELL[d.s] || CELL.none}`}>{Number(d.d.slice(8))}</div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">{LEGEND.map(([k, l]) => <span key={k} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><span className={`w-2.5 h-2.5 rounded-full ${CELL[k].split(" ")[0]}`} />{l}</span>)}</div>
                </section>
            )}
        </div>
    );
}

export default function AttendanceSummaryPage() {
    const { user } = useAuth();
    const senior = ["admin", "hr", "manager"].includes(roleOf(user));
    const [tab, setTab] = useState("");
    const [focus, setFocus] = useState("");
    const active = tab || (senior ? "month" : "history");

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={BarChart3} title="Attendance Summary" subtitle={senior ? "See how many days anyone came, month by month. Only Sunday and approved off days are not counted." : "Your attendance, month by month."} />
            {senior && <FilterTabs tabs={[["month", "Monthly summary"], ["history", "Employee history"]]} value={active} onChange={setTab} />}
            {active === "month" && senior ? <MonthTab onOpen={(id) => { setFocus(id); setTab("history"); }} /> : <HistoryTab focus={focus} />}
        </div>
    );
}