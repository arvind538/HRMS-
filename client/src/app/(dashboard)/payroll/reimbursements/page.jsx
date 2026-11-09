"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Receipt, Plus, RefreshCw, Search, Pencil, Trash2, Check, X, Clock, CheckCircle2, Wallet, ExternalLink, FileText, Loader2, AlertCircle, Eye, Info, MoreVertical } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Avatar, ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, cleanText, dateText, fieldBorder, inputClass, rupee, rupeeShort } from "@/components/payroll/ui";

const CATEGORIES = [
  ["TRAVEL", "Travel / Commute"],
  ["INTERNET", "Internet & Phone"],
  ["MEAL", "Meals / Hospitality"],
  ["TRAINING", "Training & Courses"],
  ["MEDICAL", "Medical"],
  ["OTHER", "Other"],
];
const CAT_LABEL = Object.fromEntries(CATEGORIES);

const STATUS = {
  PENDING: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  APPROVED: { label: "Approved", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  PAID: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};
const FILTERS = ["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"];

const TONES = {
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
};

const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const idOf = (v) => String(v?._id || v || "");
/* Only a web address is ever used as a link or an image */
const safeUrl = (u) => (/^https?:\/\/\S+$/i.test(String(u || "").trim()) ? String(u).trim() : "");

const blankForm = () => ({ employeeId: "", category: "TRAVEL", amount: "", date: toYMD(new Date()), description: "", receiptUrl: "" });

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

/* A small summary tile */
function MiniStat({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0 bg-white rounded-xl border border-slate-200/70 shadow-sm px-3 py-2.5">
      <div className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center ${TONES[tone]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate">{label}</p>
        <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* Three-dot menu. It is drawn on document.body, so a table's overflow can never cut it. */
function ActionMenu({ items }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const close = useCallback(() => setPos(null), []);

  const toggle = () => {
    if (pos) return close();
    const rect = btnRef.current.getBoundingClientRect();
    const width = 200;
    const height = items.length * 44 + 16;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!pos) return undefined;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos, close]);

  const toneCls = (tone) =>
    tone === "danger" ? "text-rose-600 hover:bg-rose-50" : tone === "success" ? "text-emerald-700 hover:bg-emerald-50" : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
        aria-label="Actions"
        className={`inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-xl border transition cursor-pointer ${pos ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[100] rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1.5"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 h-11 sm:h-10 rounded-xl text-sm sm:text-xs font-bold text-left transition cursor-pointer ${toneCls(item.tone)}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export default function Reimbursements() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const manage = role === "admin" || role === "hr"; // review everyone's claims
  const ownId = String(user?.employee?._id || user?.employee || "");

  const [claims, setClaims] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [modal, setModal] = useState(null); // { claim } (claim is null for a new one)
  const [form, setForm] = useState(blankForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [details, setDetails] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busyId, setBusyId] = useState("");
  const [ask, setAsk] = useState(null);
  const [receipt, setReceipt] = useState("");
  const [broken, setBroken] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/payroll/reimbursements");
      setClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the claims. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (!manage) return;
    api
      .get("/employees")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.employees || data?.data || [];
        setEmployees(
          list
            .filter((e) => !/inactive|exit/i.test(String(e.employeeStatus || "")))
            .map((e) => ({ id: e._id, label: `${e.name} (${e.employeeId || "—"})` }))
            .sort((a, b) => a.label.localeCompare(b.label))
        );
      })
      .catch(() => { });
  }, [manage]);

  const counts = useMemo(() => {
    const c = { ALL: claims.length, PENDING: 0, APPROVED: 0, PAID: 0, REJECTED: 0 };
    claims.forEach((x) => {
      if (c[x.status] !== undefined) c[x.status] += 1;
    });
    return c;
  }, [claims]);

  const money = useMemo(() => {
    const sum = (s) => claims.filter((c) => c.status === s).reduce((t, c) => t + (Number(c.amount) || 0), 0);
    return { pending: sum("PENDING"), approved: sum("APPROVED"), paid: sum("PAID") };
  }, [claims]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (filter !== "ALL" && c.status !== filter) return false;
      if (!q) return true;
      const e = c.employee || {};
      return `${e.name || ""} ${e.employeeId || ""} ${c.description || ""} ${CAT_LABEL[c.category] || ""}`.toLowerCase().includes(q);
    });
  }, [claims, filter, search]);

  /* ---- what this person may do with one claim ---- */
  const isOwn = (c) => Boolean(ownId) && idOf(c.employee) === ownId;
  const canEdit = (c) => c.status === "PENDING" && (manage || isOwn(c));
  const canReview = (c) => manage && c.status === "PENDING" && !(role === "hr" && isOwn(c));
  const canDelete = (c) => c.status !== "PAID" && (manage || (isOwn(c) && c.status === "PENDING"));

  /* ---- create and edit ---- */
  const openModal = (claim = null) => {
    setForm(
      claim
        ? {
          employeeId: idOf(claim.employee),
          category: claim.category || "OTHER",
          amount: String(claim.amount ?? ""),
          date: claim.date ? toYMD(new Date(claim.date)) : toYMD(new Date()),
          description: claim.description || "",
          receiptUrl: claim.receiptUrl || "",
        }
        : blankForm()
    );
    setErrors({});
    setModal({ claim });
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;

    const next = {};
    if (manage && !modal.claim && !form.employeeId) next.employeeId = "Please select an employee.";
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) next.amount = "Enter a valid amount.";
    else if (amount > 1000000) next.amount = "This amount is too high. Please check it.";
    if (!form.date || form.date > toYMD(new Date())) next.date = "The bill date cannot be empty or in the future.";
    if (form.description.trim().length < 3) next.description = "Please describe the expense.";
    if (form.receiptUrl.trim() && !safeUrl(form.receiptUrl)) next.receiptUrl = "The link must start with http:// or https://";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = { category: form.category, amount, date: form.date, description: form.description.trim(), receiptUrl: form.receiptUrl.trim() };

    setSaving(true);
    try {
      if (modal.claim) await api.put(`/payroll/reimbursements/${modal.claim._id}`, payload);
      else await api.post("/payroll/reimbursements", manage ? { ...payload, employeeId: form.employeeId } : payload);
      toast.success(modal.claim ? "Claim updated." : "Claim submitted.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save the claim.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- review and delete ---- */
  const review = async (claim, status, note = "") => {
    setBusyId(claim._id);
    try {
      await api.put(`/payroll/reimbursements/${claim._id}/status`, { status, note });
      toast.success(status === "APPROVED" ? "Claim approved. It will be added to the next payslip." : "Claim rejected.");
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update the claim.");
    } finally {
      setBusyId("");
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    await review(target, "REJECTED", rejectNote.trim());
  };

  const remove = (claim) =>
    setAsk({
      title: "Delete this claim?",
      text: `${rupee(claim.amount)} · ${CAT_LABEL[claim.category] || "Claim"}. This cannot be undone.`,
      run: async () => {
        try {
          await api.delete(`/payroll/reimbursements/${claim._id}`);
          toast.success("Claim deleted.");
          setDetails(null);
          await load({ silent: true });
        } catch (err) {
          toast.error(err?.response?.data?.message || "Unable to delete the claim.");
        }
      },
    });

  const openReceipt = (url) => {
    setBroken(false);
    setReceipt(url);
  };

  /* ---- the three-dot menu of one claim ---- */
  const actions = (c) => {
    if (busyId === c._id) return <Loader2 size={18} className="animate-spin text-indigo-600" />;
    const items = [{ label: "View details", icon: Eye, onClick: () => setDetails(c) }];
    if (canEdit(c)) items.push({ label: "Edit claim", icon: Pencil, onClick: () => openModal(c) });
    if (canReview(c)) {
      items.push({ label: "Approve", icon: Check, tone: "success", onClick: () => review(c, "APPROVED") });
      items.push({ label: "Reject", icon: X, tone: "danger", onClick: () => { setRejectNote(""); setRejectTarget(c); } });
    }
    if (canDelete(c)) items.push({ label: "Delete", icon: Trash2, tone: "danger", onClick: () => remove(c) });
    return <ActionMenu items={items} />;
  };

  const receiptLink = (c) => {
    const url = safeUrl(c.receiptUrl);
    return url ? (
      <button type="button" onClick={(e) => { e.stopPropagation(); openReceipt(url); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-100 transition cursor-pointer">
        <FileText size={12} /> Receipt
      </button>
    ) : (
      <span className="text-[11px] text-slate-400 whitespace-nowrap">No receipt</span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-3 sm:space-y-4 antialiased pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20"><Receipt size={20} /></div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">{manage ? "Reimbursement Claims" : "My Reimbursements"}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{manage ? "Review expense claims of your employees." : "Claim the money you spent on official work."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => load({ silent: true })} disabled={loading || refreshing} className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer" aria-label="Refresh">
            <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button type="button" onClick={() => openModal(null)} disabled={!manage && !ownId} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={16} /> {manage ? "Add Claim" : "New Claim"}
          </button>
        </div>
      </div>

      {user && !manage && !ownId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium">Your account is not linked to an employee profile, so a claim cannot be made. Please contact HR.</p>
        </div>
      )}

      <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-[11px] sm:text-xs">
        <Info size={14} className="shrink-0 mt-0.5 text-indigo-500" />
        <p className="font-medium">An approved claim is added to the employee&apos;s next payslip, and it becomes <b>Paid</b> when that payslip is paid.</p>
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {/* Stats (small tiles: 2 per row on a phone, 4 on a larger screen) */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <MiniStat icon={Clock} tone="amber" label="Pending" value={rupeeShort(money.pending)} sub={`${counts.PENDING} claim${counts.PENDING === 1 ? "" : "s"}`} />
          <MiniStat icon={CheckCircle2} tone="indigo" label="Approved" value={rupeeShort(money.approved)} sub={`${counts.APPROVED} claim${counts.APPROVED === 1 ? "" : "s"}`} />
          <MiniStat icon={Wallet} tone="emerald" label="Paid" value={rupeeShort(money.paid)} sub={`${counts.PAID} claim${counts.PAID === 1 ? "" : "s"}`} />
          <MiniStat icon={Receipt} tone="violet" label="All claims" value={counts.ALL} sub="Total" />
        </div>
      )}

      {/* Search and filters */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <div className="relative sm:max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={manage ? "Search employee, category or details" : "Search category or details"} className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Clear search"><X size={14} /></button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((key) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${filter === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
              {key === "ALL" ? "All" : STATUS[key].label}
              <span className={`px-1.5 rounded-full text-[10px] ${filter === key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="p-4 sm:p-5 flex gap-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2.5"><div className="h-3.5 w-1/3 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">{claims.length === 0 ? "No claims yet" : "Nothing matches your search"}</p>
            <p className="text-xs text-slate-400 mt-1">{claims.length === 0 ? (manage ? "Claims of employees appear here." : 'Click "New Claim" to claim an expense.') : "Try another keyword or status."}</p>
          </div>
        ) : (
          <>
            {/* Mobile and tablet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((c) => (
                <div key={c._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {manage && <Avatar name={c.employee?.name} size="w-10 h-10" />}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{manage ? c.employee?.name || "Unknown" : CAT_LABEL[c.category] || "Claim"}</p>
                        <p className="text-[11px] text-slate-500 truncate">{manage ? `${c.employee?.employeeId || "—"} • ${CAT_LABEL[c.category] || "Claim"}` : dateText(c.date)}</p>
                      </div>
                    </div>
                    <div className="shrink-0">{actions(c)}</div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 break-words">{c.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-extrabold text-slate-900 font-mono">{rupee(c.amount)}</p>
                    <StatusPill status={c.status} />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{manage ? `Bill date: ${dateText(c.date)}` : "Bill date"}</span>
                    {receiptLink(c)}
                  </div>

                  {c.status === "REJECTED" && c.reviewNote && <p className="text-[11px] text-rose-700 bg-rose-50 rounded-lg px-3 py-2 break-words"><b>Reason:</b> {c.reviewNote}</p>}
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    {manage && <th className="px-5 py-3.5">Employee</th>}
                    <th className={`${manage ? "px-4" : "px-5"} py-3.5`}>Claim</th>
                    <th className="px-4 py-3.5">Bill Date</th>
                    <th className="px-4 py-3.5">Receipt</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((c) => (
                    <tr key={c._id} onClick={() => setDetails(c)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                      {manage && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.employee?.name} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate max-w-[170px]">{c.employee?.name || "Unknown"}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{[c.employee?.employeeId, cleanText(c.employee?.department)].filter(Boolean).join(" • ")}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className={`${manage ? "px-4" : "px-5"} py-3.5 max-w-[240px]`}>
                        <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">{CAT_LABEL[c.category] || "Claim"}</span>
                        <p className="text-xs text-slate-600 mt-1 truncate">{c.description}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{dateText(c.date)}</td>
                      <td className="px-4 py-3.5">{receiptLink(c)}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-sm whitespace-nowrap">{rupee(c.amount)}</td>
                      <td className="px-4 py-3.5"><StatusPill status={c.status} /></td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">{actions(c)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* New or edit */}
      {modal && (
        <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
          <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">{modal.claim ? "Edit Claim" : "New Claim"}</h3>
                <p className="text-xs text-slate-400">A claim can be changed only while it is pending.</p>
              </div>
              <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
              {manage && (
                <div>
                  <Label>Employee</Label>
                  {modal.claim ? (
                    <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800">{modal.claim.employee?.name}</div>
                  ) : (
                    <>
                      <select value={form.employeeId} onChange={(e) => setField("employeeId", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.employeeId)}`}>
                        <option value="">Select employee</option>
                        {employees.map((e) => (<option key={e.id} value={e.id}>{e.label}</option>))}
                      </select>
                      <FieldError>{errors.employeeId}</FieldError>
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <select value={form.category} onChange={(e) => setField("category", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                    {CATEGORIES.map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <Label>Bill Date</Label>
                  <input type="date" max={toYMD(new Date())} value={form.date} onChange={(e) => setField("date", e.target.value)} className={`${inputClass} ${fieldBorder(errors.date)}`} />
                  <FieldError>{errors.date}</FieldError>
                </div>
              </div>

              <div>
                <Label>Amount (₹)</Label>
                <input type="number" inputMode="decimal" min="1" step="any" value={form.amount} onChange={(e) => setField("amount", e.target.value)} placeholder="e.g. 2450" className={`${inputClass} ${fieldBorder(errors.amount)}`} />
                <FieldError>{errors.amount}</FieldError>
              </div>

              <div>
                <Label>Receipt link (optional)</Label>
                <input type="url" value={form.receiptUrl} maxLength={500} onChange={(e) => setField("receiptUrl", e.target.value)} placeholder="https://drive.google.com/..." className={`${inputClass} ${fieldBorder(errors.receiptUrl)}`} />
                <FieldError>{errors.receiptUrl}</FieldError>
              </div>

              <div>
                <Label>What was it for?</Label>
                <textarea rows={3} value={form.description} maxLength={500} onChange={(e) => setField("description", e.target.value)} placeholder="e.g. Taxi fare for the client meeting" className={`${inputClass} resize-none ${fieldBorder(errors.description)}`} />
                <FieldError>{errors.description}</FieldError>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving..." : modal.claim ? "Save Changes" : "Submit Claim"}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Details */}
      {details && (
        <Sheet onClose={() => setDetails(null)} size="max-w-lg">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">{CAT_LABEL[details.category] || "Claim"}</h3>
              <p className="text-xs text-slate-400 truncate">{details.employee?.name} {details.employee?.employeeId ? `· ${details.employee.employeeId}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusPill status={details.status} />
              <button type="button" onClick={() => setDetails(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono">{rupee(details.amount)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Bill date</p><p className="font-bold text-slate-800 mt-0.5">{dateText(details.date)}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Submitted on</p><p className="font-bold text-slate-800 mt-0.5">{dateText(details.createdAt)}</p></div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Details</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{details.description}</p>
            </div>
            {(details.reviewedBy?.name || details.reviewedAt) && (
              <div className="rounded-xl border border-slate-200 p-3.5 text-xs space-y-1">
                <p className="font-bold text-slate-800">{details.status === "REJECTED" ? "Rejected" : "Approved"} by {details.reviewedBy?.name || "—"} · {dateText(details.reviewedAt)}</p>
                {details.reviewNote && <p className="text-slate-600 break-words">{details.reviewNote}</p>}
              </div>
            )}
            {details.status === "APPROVED" && <p className="text-[11px] text-blue-700 bg-blue-50 rounded-lg px-3 py-2">Approved. It will be added to the next payslip.</p>}
            {details.status === "PAID" && <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Paid together with the salary.</p>}
          </div>
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button type="button" onClick={() => setDetails(null)} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Close</button>
            {safeUrl(details.receiptUrl) && (
              <button type="button" onClick={() => openReceipt(safeUrl(details.receiptUrl))} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"><FileText size={14} /> View receipt</button>
            )}
          </div>
        </Sheet>
      )}

      {/* Reject */}
      {rejectTarget && (
        <Sheet onClose={() => setRejectTarget(null)} size="max-w-md">
          <div className="p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 shrink-0 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center"><X size={20} /></div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">Reject this claim?</h3>
                <p className="text-xs text-slate-500 mt-1">{rejectTarget.employee?.name} · {rupee(rejectTarget.amount)}. The employee will be notified.</p>
              </div>
            </div>
            <div className="mt-4">
              <Label>Reason (optional)</Label>
              <textarea rows={3} maxLength={300} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g. The bill is not attached" className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} />
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={() => setRejectTarget(null)} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmReject} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer"><X size={14} /> Reject Claim</button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Receipt viewer (the link is a checked web address and is never put into the page as HTML) */}
      {receipt && (
        <Sheet onClose={() => setReceipt("")} size="max-w-lg">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Receipt</h3>
            <button type="button" onClick={() => setReceipt("")} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
            {broken ? (
              <div className="py-10 text-center text-xs text-slate-500">This file cannot be previewed here. Please open it in a new tab.</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receipt} alt="Receipt" onError={() => setBroken(true)} referrerPolicy="no-referrer" className="w-full max-h-[60dvh] object-contain rounded-xl border border-slate-200 bg-slate-50" />
            )}
          </div>
          <div className="shrink-0 border-t border-slate-100 px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-end">
            <a href={receipt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"><ExternalLink size={14} /> Open in new tab</a>
          </div>
        </Sheet>
      )}

      {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}

