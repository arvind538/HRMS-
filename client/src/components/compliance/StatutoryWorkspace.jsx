"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, HeartPulse, Info, Landmark, Loader2, Pencil, ReceiptText, ShieldCheck, Users, Wallet, X, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Avatar, ErrorBanner, FieldError, Label, Sheet, StatCard, cleanText, fieldBorder, inputClass, rupeeShort } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, PeriodFilter, Pill, SearchBox, monthYear, primaryBtn } from "@/components/payroll/common";
import { RecordList, RegistrationCard, downloadFile, lastMonth } from "./shared";

const money = rupeeShort;
const diffCell = (r) => <span className={r.mismatch ? "font-bold text-amber-600" : "text-slate-400"}>{r.difference ? money(r.difference) : "—"}</span>;

const CONFIG = {
    pf: {
        title: "Provident Fund (PF)",
        subtitle: "Employee and employer PF of every payslip, ready for the EPFO challan and ECR.",
        icon: ShieldCheck,
        flag: "pf",
        regFields: [["pfNumber", "PF establishment code", "e.g. DLCPM1234567000"]],
        idOf: (r) => (r.uan ? `UAN ${r.uan}` : "UAN missing"),
        idMissing: (r) => !r.uan,
        needs: "UAN",
        cols: [
            ["Days paid", (r) => r.daysPaid],
            ["PF wages", (r) => money(r.pfWages)],
            ["Employee 12%", (r) => money(r.employee)],
            ["EPS 8.33%", (r) => money(r.eps)],
            ["Employer EPF", (r) => money(r.epf)],
            ["Admin + EDLI", (r) => money(r.admin + r.edli)],
            ["Payable", (r) => <b className="text-slate-900">{money(r.payable)}</b>],
            ["Difference", diffCell],
        ],
        cards: (t) => [["Total payable", money(t.payable), Wallet, "indigo"], ["Employee share", money(t.employee), Users, "emerald"], ["Employer share", money(t.eps + t.epf), Users, "violet"], ["Admin + EDLI", money(t.admin + t.edli), Wallet, "amber"]],
    },
    esi: {
        title: "ESI",
        subtitle: "Medical insurance contribution for employees up to the wage limit.",
        icon: HeartPulse,
        flag: "esi",
        regFields: [["esiNumber", "ESI employer code", "e.g. 56000123450001001"]],
        idOf: (r) => (r.esicNumber ? `ESIC ${r.esicNumber}` : "ESIC no. missing"),
        idMissing: (r) => !r.esicNumber,
        needs: "ESIC number",
        cols: [
            ["Days paid", (r) => r.daysPaid],
            ["Wages", (r) => money(r.wages)],
            ["Employee 0.75%", (r) => money(r.employee)],
            ["Employer 3.25%", (r) => money(r.employer)],
            ["Payable", (r) => <b className="text-slate-900">{money(r.payable)}</b>],
            ["Difference", diffCell],
        ],
        cards: (t) => [["Total payable", money(t.payable), Wallet, "indigo"], ["Employee share", money(t.employee), Users, "emerald"], ["Employer share", money(t.employer), Users, "violet"], ["Employees covered", t.employees, Users, "amber"]],
    },
    tds: {
        title: "TDS on Salary",
        subtitle: "Income tax cut in the payslips, to be deposited with the government.",
        icon: ReceiptText,
        regFields: [["tanNumber", "TAN", "ABCD12345E"]],
        idOf: (r) => (r.pan ? `PAN ${r.pan}` : "PAN missing"),
        idMissing: (r) => r.panMissing,
        cols: [
            ["Taxable wages", (r) => money(r.taxableWages)],
            ["TDS cut", (r) => <b className="text-rose-600">{money(r.tds)}</b>],
        ],
        cards: (t, rows) => [["TDS to deposit", money(t.tds), Wallet, "rose"], ["Employees", t.employees, Users, "indigo"], ["PAN missing", rows.filter((r) => r.panMissing).length, AlertTriangle, "amber"]],
    },
    "professional-tax": {
        title: "Professional Tax",
        subtitle: "State tax by salary slab. It applies only in some states.",
        icon: Landmark,
        flag: "pt",
        regFields: [["ptNumber", "PT registration number", "e.g. PTREG12345678"], ["ptState", "State", "e.g. Maharashtra"]],
        idOf: () => "",
        idMissing: () => false,
        cols: [
            ["Wages", (r) => money(r.wages)],
            ["Professional tax", (r) => <b className="text-slate-900">{money(r.amount)}</b>],
        ],
        cards: (t) => [["PT payable", money(t.amount), Wallet, "indigo"], ["Employees", t.employees, Users, "emerald"]],
    },
};

const TRI = (v) => (v === true ? "true" : v === false ? "false" : "auto");
const triValue = (s) => (s === "true" ? true : s === "false" ? false : "auto");

/* ------------------------------ employees (statutory details) ------------------------------ */

function EmployeesTab({ type, cfg }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [only, setOnly] = useState("all");
    const [edit, setEdit] = useState(null);
    const [form, setForm] = useState({});
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/compliance/employees");
            setRows(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to load the employees.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const applies = (e) => e.effective[cfg.flag];
    const lacks = (e) => cfg.needs && applies(e) && e.missing.includes(cfg.needs);
    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((e) => (only === "all" || (only === "missing" && lacks(e)) || (only === "applies" && applies(e))) && (!q || `${e.name} ${e.employeeId}`.toLowerCase().includes(q)));
    }, [rows, search, only]); // eslint-disable-line react-hooks/exhaustive-deps

    const openEdit = (e) => {
        setForm({ uan: e.uan, esicNumber: e.esicNumber, pfApplicable: TRI(e.pfApplicable), esiApplicable: TRI(e.esiApplicable), ptApplicable: TRI(e.ptApplicable), pfOnActualWage: TRI(e.pfOnActualWage) });
        setErrors({});
        setEdit(e);
    };

    const save = async (ev) => {
        ev.preventDefault();
        if (saving) return;
        const next = {};
        if (type === "pf" && form.uan.trim() && !/^\d{12}$/.test(form.uan.trim())) next.uan = "UAN must be 12 digits.";
        if (type === "esi" && form.esicNumber.trim() && !/^\d{10,17}$/.test(form.esicNumber.trim())) next.esicNumber = "ESIC number must be 10 to 17 digits.";
        setErrors(next);
        if (Object.keys(next).length) return;

        const body = type === "pf" ? { uan: form.uan.trim(), pfApplicable: triValue(form.pfApplicable), pfOnActualWage: triValue(form.pfOnActualWage) } : type === "esi" ? { esicNumber: form.esicNumber.trim(), esiApplicable: triValue(form.esiApplicable) } : { ptApplicable: triValue(form.ptApplicable) };

        setSaving(true);
        try {
            await api.put(`/compliance/employees/${edit._id}`, body);
            toast.success("Details saved.");
            setEdit(null);
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to save the details.");
        } finally {
            setSaving(false);
        }
    };

    const triSelect = (key, label, hint) => (
        <div>
            <Label>{label}</Label>
            <select value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                <option value="auto">Automatic</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>
            {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                <SearchBox value={search} onChange={setSearch} placeholder="Search name or ID" />
                <FilterTabs tabs={[["all", "All", rows.length], ["applies", "Applies", rows.filter(applies).length], ...(cfg.needs ? [["missing", `${cfg.needs} missing`, rows.filter(lacks).length]] : [])]} value={only} onChange={setOnly} />
            </div>
            <ErrorBanner message={error} onRetry={load} />
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                {loading ? <ListSkeleton /> : shown.length === 0 ? <EmptyBox icon={Users} title="No employee found" text="Try another keyword or filter." /> : (
                    <ul className="divide-y divide-slate-100">
                        {shown.map((e) => (
                            <li key={e._id} className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                                <Avatar name={e.name} size="w-10 h-10" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{e.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{[e.employeeId, cleanText(e.department)].filter(Boolean).join(" • ")}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        <Pill tone={applies(e) ? "emerald" : "slate"}>{applies(e) ? "Applies" : "Not applicable"}</Pill>
                                        {type === "pf" && <span className={`text-[11px] font-mono ${e.uan ? "text-slate-500" : "text-rose-600 font-bold"}`}>{e.uan ? `UAN ${e.uan}` : applies(e) ? "UAN missing" : ""}</span>}
                                        {type === "esi" && <span className={`text-[11px] font-mono ${e.esicNumber ? "text-slate-500" : "text-rose-600 font-bold"}`}>{e.esicNumber ? `ESIC ${e.esicNumber}` : applies(e) ? "ESIC no. missing" : ""}</span>}
                                    </div>
                                </div>
                                <button type="button" onClick={() => openEdit(e)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition cursor-pointer"><Pencil size={13} /> Edit</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {edit && (
                <Sheet onClose={() => setEdit(null)} locked={saving} size="max-w-md">
                    <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="min-w-0"><h3 className="text-base font-bold text-slate-900">{cfg.title} details</h3><p className="text-xs text-slate-400 truncate">{edit.name} {edit.employeeId ? `· ${edit.employeeId}` : ""}</p></div>
                            <button type="button" onClick={() => !saving && setEdit(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
                            {type === "pf" && (
                                <>
                                    <div>
                                        <Label>UAN (12 digits)</Label>
                                        <input inputMode="numeric" maxLength={12} value={form.uan} onChange={(e) => setForm((p) => ({ ...p, uan: e.target.value.replace(/\D/g, "") }))} className={`${inputClass} font-mono ${fieldBorder(errors.uan)}`} />
                                        <FieldError>{errors.uan}</FieldError>
                                    </div>
                                    {triSelect("pfApplicable", "PF applies?", "Automatic = PF is cut in the payslip")}
                                    {triSelect("pfOnActualWage", "PF on the full basic?", "Automatic = follows the company setting. No = only up to the wage limit")}
                                </>
                            )}
                            {type === "esi" && (
                                <>
                                    <div>
                                        <Label>ESIC insurance number</Label>
                                        <input inputMode="numeric" maxLength={17} value={form.esicNumber} onChange={(e) => setForm((p) => ({ ...p, esicNumber: e.target.value.replace(/\D/g, "") }))} className={`${inputClass} font-mono ${fieldBorder(errors.esicNumber)}`} />
                                        <FieldError>{errors.esicNumber}</FieldError>
                                    </div>
                                    {triSelect("esiApplicable", "ESI applies?", "Automatic = monthly salary is within the wage limit")}
                                </>
                            )}
                            {type === "professional-tax" && triSelect("ptApplicable", "Professional tax applies?", "Automatic = follows the company setting (PT_ENABLED)")}
                        </div>
                        <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                            <button type="button" onClick={() => setEdit(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={saving} className={primaryBtn}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? "Saving..." : "Save"}</button>
                        </div>
                    </form>
                </Sheet>
            )}
        </div>
    );
}

/* ------------------------------ workspace ------------------------------ */

export default function StatutoryWorkspace({ type }) {
    const cfg = CONFIG[type];
    const Icon = cfg.icon;
    const { user } = useAuth();
    const isAdmin = String(user?.role || "").toLowerCase() === "admin";

    const [tab, setTab] = useState("statement");
    const [period, setPeriod] = useState(lastMonth());
    const [includeDraft, setIncludeDraft] = useState(false);
    const [search, setSearch] = useState("");

    const [statement, setStatement] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [st, rec] = await Promise.all([
                api.get(`/compliance/monthly/${type}`, { params: { month: period.month, year: period.year, includeDraft: includeDraft ? 1 : 0 } }),
                api.get("/compliance", { params: { type, year: period.year } }),
            ]);
            setStatement(st.data);
            setRecords(Array.isArray(rec.data) ? rec.data : []);
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to load the statement. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [type, period.month, period.year, includeDraft]);

    useEffect(() => {
        load();
    }, [load]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (statement?.rows || []).filter((r) => !q || `${r.name} ${r.employeeId}`.toLowerCase().includes(q));
    }, [statement, search]);

    const thisFiling = records.find((r) => r.kind === "deposit" && r.month === period.month && r.year === period.year);
    const label = monthYear(period.month, period.year);

    const download = async (format) => {
        setBusy(format);
        const stamp = `${period.year}-${String(period.month).padStart(2, "0")}`;
        await downloadFile(`/compliance/monthly/${type}`, { month: period.month, year: period.year, includeDraft: includeDraft ? 1 : 0, format }, format === "ecr" ? `ECR_${stamp}.txt` : `${type}_${stamp}.csv`);
        setBusy("");
    };

    const tabs = [["statement", "Statement"], ["filings", "Filings"], ...(type !== "tds" ? [["employees", "Employees"]] : []), ["registration", "Registration"]];
    const t = statement?.totals || {};

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={Icon} title={cfg.title} subtitle={cfg.subtitle} onRefresh={load} busy={loading} />

            <FilterTabs tabs={tabs} value={tab} onChange={setTab} />

            {tab === "statement" && (
                <>
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <PeriodFilter month={period.month} year={period.year} onMonth={(v) => setPeriod((p) => ({ ...p, month: v }))} onYear={(v) => setPeriod((p) => ({ ...p, year: v }))} allowAll={false} />
                            <SearchBox value={search} onChange={setSearch} placeholder="Search name or ID" />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                                Count draft payslips too (estimate)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => download("csv")} disabled={!rows.length || Boolean(busy)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50">{busy === "csv" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} CSV</button>
                                {type === "pf" && <button type="button" onClick={() => download("ecr")} disabled={!rows.length || Boolean(busy)} className={primaryBtn}>{busy === "ecr" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} ECR file</button>}
                            </div>
                        </div>
                    </div>

                    <ErrorBanner message={error} onRetry={load} />

                    {statement && (
                        <>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <Pill tone={statement.ready ? "emerald" : "amber"}>{statement.ready ? "Payslips final" : statement.payslips.total ? "Draft payslips left" : "No payslips"}</Pill>
                                <span className="text-slate-500">Salary of <b>{label}</b> • due <b>{new Date(statement.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</b> • {statement.payslips.total} payslip(s)</span>
                            </div>

                            {statement.notes.length > 0 && (
                                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                                    <ul className="space-y-1 text-[11px] text-amber-900">{statement.notes.map((n, i) => <li key={i} className="flex gap-2"><Info size={13} className="shrink-0 mt-0.5 text-amber-600" /><span>{n}</span></li>)}</ul>
                                </div>
                            )}

                            <div className={`grid grid-cols-2 ${cfg.cards(t, statement.rows).length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3 sm:gap-4`}>
                                {cfg.cards(t, statement.rows).map(([l, v, I, tone]) => <StatCard key={l} icon={I} tone={tone} label={l} value={v} />)}
                            </div>

                            {type === "pf" && t.accounts && (
                                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-5">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Challan (fill these on the EPFO portal)</p>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
                                        {[["A/c 01 (EPF)", t.accounts.ac01], ["A/c 10 (Pension)", t.accounts.ac10], ["A/c 02 (Admin)", t.accounts.ac02], ["A/c 21 (EDLI)", t.accounts.ac21]].map(([l, v]) => (
                                            <div key={l} className="rounded-xl bg-slate-50 border border-slate-200/70 py-3 px-2"><p className="text-[10px] font-bold uppercase text-slate-400">{l}</p><p className="text-sm font-extrabold font-mono text-slate-900">{money(v)}</p></div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                                <p className="px-4 sm:px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Filing status for {label}</p>
                                <RecordList records={thisFiling ? [thisFiling] : []} isAdmin={isAdmin} onChanged={load} emptyText="No filing record for this month yet. Records are made for the last and the current month." />
                            </div>
                        </>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                        {loading ? <ListSkeleton /> : rows.length === 0 ? (
                            <EmptyBox icon={Icon} title="No rows for this month" text="Generate and process the payslips of this month in Payroll, or the law may not apply to anyone." />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                                    {rows.map((r) => (
                                        <div key={r.payslipId} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar name={r.name} size="w-10 h-10" />
                                                <div className="min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{r.name}</p><p className={`text-[11px] truncate font-mono ${cfg.idMissing(r) ? "text-rose-600 font-bold" : "text-slate-500"}`}>{[r.employeeId, cfg.idOf(r)].filter(Boolean).join(" • ")}</p></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {cfg.cols.map(([l, fn]) => <div key={l} className="rounded-xl bg-slate-50 py-2 px-2.5 min-w-0"><p className="text-[10px] font-bold uppercase text-slate-400 truncate">{l}</p><p className="text-xs font-semibold text-slate-800 truncate">{fn(r)}</p></div>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                                            <tr><th className="px-5 py-3.5">Employee</th>{cfg.cols.map(([l]) => <th key={l} className="px-4 py-3.5 whitespace-nowrap">{l}</th>)}</tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                            {rows.map((r) => (
                                                <tr key={r.payslipId} className="hover:bg-indigo-50/40 transition-colors">
                                                    <td className="px-5 py-3 font-sans"><p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{r.name}</p><p className={`text-[11px] truncate max-w-[200px] ${cfg.idMissing(r) ? "text-rose-600 font-bold" : "text-slate-400"}`}>{[r.employeeId, cfg.idOf(r)].filter(Boolean).join(" • ")}</p></td>
                                                    {cfg.cols.map(([l, fn]) => <td key={l} className="px-4 py-3 whitespace-nowrap">{fn(r)}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {tab === "filings" && (
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-700">All {cfg.title} filings of {period.year}</p>
                        <PeriodFilter month="ALL" year={period.year} onMonth={() => { }} onYear={(v) => setPeriod((p) => ({ ...p, year: v === "ALL" ? p.year : v }))} allowAll={false} />
                    </div>
                    {loading ? <ListSkeleton /> : <RecordList records={records} isAdmin={isAdmin} onChanged={load} emptyText="No filing record for this year." />}
                </div>
            )}

            {tab === "employees" && type !== "tds" && <EmployeesTab type={type} cfg={cfg} />}
            {tab === "registration" && <RegistrationCard fields={cfg.regFields} isAdmin={isAdmin} />}
        </div>
    );
}