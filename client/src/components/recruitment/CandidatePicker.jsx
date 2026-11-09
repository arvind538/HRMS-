"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { FieldError, Label, fieldBorder, inputClass } from "@/components/payroll/ui";
import { errMsg } from "@/components/recruitment/rui";

/* ---------------------------------- helpers ---------------------------------- */

const asList = (d, keys) => (Array.isArray(d) ? d : keys.map((k) => d?.[k]).find(Array.isArray) || []);
const refId = (v) => String((v && typeof v === "object" ? v._id || v.id : v) || "");

/* the name of a candidate or an employee, whatever field the API uses for it */
export const personName = (p) =>
    p?.name ||
    p?.fullName ||
    p?.candidateName ||
    [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ") ||
    (p?.email || "").split("@")[0] ||
    "";

const jobTitleOf = (c) => c?.jobTitle || c?.jobPosition?.title || c?.jobPosition?.name || c?.position?.title || "";

const normalize = (c) => ({
    ...c,
    _id: refId(c),
    name: personName(c) || "Unnamed candidate",
    status: String(c?.status || "").toLowerCase(),
    jobTitle: jobTitleOf(c),
});

/*
  Why nobody can be picked, in one sentence.
  reasons = [["hired", (c) => ...], ["rejected", (c) => ...]]  (the first reason that matches a candidate counts)
*/
export const explainEmpty = (all, reasons) => {
    if (!all.length) return "No candidates found yet.";
    const counts = new Map();
    all.forEach((c) => {
        const hit = reasons.find(([, test]) => test(c));
        if (hit) counts.set(hit[0], (counts.get(hit[0]) || 0) + 1);
    });
    if (!counts.size) return "No candidate matches right now.";
    const lead = all.length === 1 ? "The only candidate is unavailable" : `All ${all.length} candidates are unavailable`;
    return `${lead}: ${[...counts].map(([label, n]) => `${n} ${label}`).join(", ")}.`;
};

/* ------------------------------ candidates (hook) ------------------------------ */

export function useCandidateOptions() {
    const [candidates, setCandidates] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [required, setRequired] = useState([]); // fields the Candidate model needs (email, jobPosition ...)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        let res;
        try {
            res = await api.get("/recruitment/candidate-options"); // light list made for these dropdowns
        } catch {
            try {
                res = await api.get("/recruitment/candidates"); // the normal list, if the new route is not added yet
            } catch (err) {
                setCandidates([]);
                setError(await errMsg(err, "Unable to load the candidates."));
                setLoading(false);
                return;
            }
        }

        const data = res.data;
        setCandidates(asList(data, ["candidates", "data", "items", "results"]).map(normalize).filter((c) => c._id));
        setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
        setRequired(Array.isArray(data?.required) ? data.required : []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    /* a candidate that was just added (or already existed): put him in the list and return the clean object */
    const add = useCallback((raw) => {
        const c = normalize(raw || {});
        if (!c._id) return null;
        setCandidates((prev) => [c, ...prev.filter((x) => x._id !== c._id)]);
        return c;
    }, []);

    return { candidates, jobs, required, loading, error, reload: load, add };
}

/* ------------------------------ interviewers (hook) ------------------------------ */

export function usePeopleOptions() {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        let list = [];
        try {
            const res = await api.get("/payroll/employee-options");
            list = asList(res.data, ["employees", "data", "options"]);
        } catch {
            /* the next source is tried below */
        }

        if (!list.length) {
            try {
                const res = await api.get("/employees");
                list = asList(res.data, ["employees", "data"]);
            } catch (err) {
                setPeople([]);
                setError(await errMsg(err, "Unable to load the employees."));
                setLoading(false);
                return;
            }
        }

        setPeople(
            list
                .filter((e) => !/^(inactive|exited|exit|terminated)$/i.test(e.employeeStatus || "") && e.onboarding?.status !== "draft")
                .map((e) => ({ _id: refId(e), name: personName(e), employeeId: e.employeeId || "" }))
                .filter((e) => e._id && e.name)
                .sort((a, b) => a.name.localeCompare(b.name))
        );
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { people, loading, error, reload: load };
}

/* ------------------------------ candidate dropdown ------------------------------ */

const small = "px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60";

export function CandidateSelect({ value, onChange, pool, loading, loadError, onRetry, error, canAdd, jobs = [], required = [], onCreated, canPick, emptyText }) {
    const [open, setOpen] = useState(false);
    const [f, setF] = useState({ name: "", email: "", phone: "", jobPosition: "" });
    const [errs, setErrs] = useState({});
    const [serverErr, setServerErr] = useState("");
    const [busy, setBusy] = useState(false);

    const needEmail = required.includes("email");
    const needPhone = required.includes("phone");
    const needJob = required.includes("jobPosition");

    const setField = (k, v) => {
        setF((p) => ({ ...p, [k]: v }));
        setErrs((p) => (p[k] ? { ...p, [k]: undefined } : p));
        setServerErr("");
    };

    /* select the candidate in the form (or tell why he cannot be selected) */
    const finish = (raw, existed) => {
        const c = onCreated(raw);
        if (!c) return;
        if (canPick && !canPick(c)) {
            toast.info(`${c.name} already exists, but cannot be picked now (status: ${c.status || "unknown"}).`);
        } else {
            onChange(c._id, c);
            toast.success(existed ? `${c.name} already exists and is selected.` : `${c.name} was added and selected.`);
        }
        setF({ name: "", email: "", phone: "", jobPosition: "" });
        setErrs({});
        setOpen(false);
    };

    const submit = async () => {
        if (busy) return;

        const name = f.name.trim().replace(/\s+/g, " ");
        const email = f.email.trim().toLowerCase();
        const phone = f.phone.replace(/\D/g, "");

        const next = {};
        if (name.length < 2) next.name = "Enter the candidate name (at least 2 characters).";
        else if (!/^\p{L}[\p{L} .'-]*$/u.test(name)) next.name = "The name can contain only letters.";
        if (needEmail && !email) next.email = "Email is required.";
        else if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
        if (needPhone && !phone) next.phone = "Phone number is required.";
        else if (phone && !/^\d{10,13}$/.test(phone)) next.phone = "Enter a valid phone number (10 to 13 digits).";
        if (needJob && !f.jobPosition) next.jobPosition = "Select the job position.";
        setErrs(next);
        if (Object.keys(next).length) return;

        const body = { name, ...(email ? { email } : {}), ...(phone ? { phone } : {}), ...(f.jobPosition ? { jobPosition: f.jobPosition } : {}) };

        setBusy(true);
        setServerErr("");
        try {
            let res;
            try {
                res = await api.post("/recruitment/candidates/quick", body);
            } catch (err) {
                if (err?.response?.status === 404) res = await api.post("/recruitment/candidates", body); // the quick route is not added yet
                else throw err;
            }
            finish(res.data?.candidate || res.data?.data || res.data, false);
        } catch (err) {
            const existing = err?.response?.data?.existing;
            if (err?.response?.status === 409 && existing?._id) finish(existing, true);
            else setServerErr(await errMsg(err, "Unable to add the candidate."));
        } finally {
            setBusy(false);
        }
    };

    const onEnter = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            submit();
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between gap-2">
                <Label>Candidate</Label>
                {canAdd && (
                    <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer mb-1.5">
                        <UserPlus size={12} /> {open ? "Close" : "Add new candidate"}
                    </button>
                )}
            </div>

            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value, pool.find((c) => c._id === e.target.value) || null)}
                disabled={loading}
                className={`${inputClass} cursor-pointer disabled:opacity-60 ${fieldBorder(error)}`}
            >
                <option value="">{loading ? "Loading candidates..." : pool.length ? "Select candidate" : "No candidate available"}</option>
                {pool.map((c) => (
                    <option key={c._id} value={c._id}>
                        {c.name}
                        {c.jobTitle ? ` (${c.jobTitle})` : ""}
                    </option>
                ))}
            </select>
            <FieldError>{error}</FieldError>

            {loadError && (
                <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] font-semibold text-rose-600">
                    <span>{loadError}</span>
                    <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 underline cursor-pointer shrink-0">
                        <RefreshCw size={11} /> Retry
                    </button>
                </div>
            )}

            {!loading && !loadError && pool.length === 0 && (
                <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">{emptyText || "No candidate is available right now."}</p>
                    {canAdd && !open && (
                        <button type="button" onClick={() => setOpen(true)} className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer">
                            <UserPlus size={12} /> Add candidate
                        </button>
                    )}
                </div>
            )}

            {open && (
                <div className="mt-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                        <UserPlus size={13} /> New candidate
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <Label>Full name *</Label>
                            <input value={f.name} maxLength={80} autoFocus onChange={(e) => setField("name", e.target.value)} onKeyDown={onEnter} placeholder="e.g. Rahul Sharma" className={`${inputClass} ${fieldBorder(errs.name)}`} />
                            <FieldError>{errs.name}</FieldError>
                        </div>
                        <div>
                            <Label>Email {needEmail ? "*" : ""}</Label>
                            <input type="email" value={f.email} maxLength={100} onChange={(e) => setField("email", e.target.value.replace(/\s/g, ""))} onKeyDown={onEnter} placeholder="candidate@gmail.com" className={`${inputClass} ${fieldBorder(errs.email)}`} />
                            <FieldError>{errs.email}</FieldError>
                        </div>
                        <div>
                            <Label>Phone {needPhone ? "*" : ""}</Label>
                            <input type="tel" inputMode="numeric" value={f.phone} maxLength={13} onChange={(e) => setField("phone", e.target.value.replace(/\D/g, ""))} onKeyDown={onEnter} placeholder="9876543210" className={`${inputClass} font-mono ${fieldBorder(errs.phone)}`} />
                            <FieldError>{errs.phone}</FieldError>
                        </div>
                        {(jobs.length > 0 || needJob) && (
                            <div className="sm:col-span-2">
                                <Label>Applying for {needJob ? "*" : "(optional)"}</Label>
                                <select value={f.jobPosition} onChange={(e) => setField("jobPosition", e.target.value)} disabled={jobs.length === 0} className={`${inputClass} cursor-pointer ${fieldBorder(errs.jobPosition)}`}>
                                    <option value="">{jobs.length ? "Select job position" : "No job position exists yet"}</option>
                                    {jobs.map((j) => (
                                        <option key={j._id} value={j._id}>{j.title}</option>
                                    ))}
                                </select>
                                <FieldError>{errs.jobPosition}</FieldError>
                            </div>
                        )}
                    </div>

                    {serverErr && <p className="text-[11px] font-semibold text-rose-600 break-words">{serverErr}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setOpen(false)} disabled={busy} className={`${small} bg-white border border-slate-200 text-slate-600 hover:bg-slate-50`}>
                            Cancel
                        </button>
                        <button type="button" onClick={submit} disabled={busy} className={`${small} inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white`}>
                            {busy && <Loader2 size={13} className="animate-spin" />} Add and select
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}