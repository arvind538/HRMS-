"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Printer, Save, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { FieldError, Label, Sheet, inputClass } from "@/components/payroll/ui";
import { primaryBtn } from "@/components/payroll/common";
import { buildLetterPdf } from "./letterPdf";

const LABEL = {
    offer: "Offer Letter",
    appointment: "Appointment Letter",
    experience: "Experience Letter",
    salary: "Salary Letter",
};

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dmy = (value) => {
    if (!value) return "";
    const [y, m, d] = String(value).split("-");
    return y && m && d ? `${d}/${m}/${y}` : value;
};
const longDate = (value) => {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};
const inr = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const lines = (value) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
const durationOf = (start, end) => {
    if (!start || !end) return "";
    const days = Math.floor((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) + 1;
    if (!Number.isFinite(days) || days < 1) return "";
    if (days < 31) return `${days} day${days === 1 ? "" : "s"}`;
    const months = Math.round(days / 30.44);
    return `${months} month${months === 1 ? "" : "s"}`;
};

const OFFER_TERMS = [
    "This will be a **completely unpaid internship for the entire 3-month period**. No salary, stipend, or remuneration will be provided by the company.",
    "The company will **not provide or reimburse any expenses**, including travel, food, accommodation, internet/mobile, or any other personal expenses.",
    "The intern must follow the company's prescribed **working hours, rules, policies, and professional standards**.",
    "The intern must maintain strict confidentiality regarding all company information, projects, documents, client information, and data.",
    "Any prolonged absence, misconduct, violation of company policies, or unsatisfactory performance may result in termination of the internship.",
    "Upon **successful completion of the full 3-month internship and assigned responsibilities**, the company will provide an **Internship Completion Certificate**.",
    "This internship **does not guarantee permanent employment**. Any future employment opportunity will depend on performance, business requirements, vacancies, and management's decision.",
].join("\n");

const APPOINTMENT_TERMS = [
    "Employment is subject to the stated probation period and review for confirmation.",
    "The employee must follow the company's working hours, rules, policies, and professional standards.",
    "The employee must maintain confidentiality of company information, projects, documents, and client data.",
    "Either party may terminate employment in accordance with the applicable employment agreement and company policy.",
    "Salary and benefits are subject to applicable statutory deductions and company policy.",
].join("\n");

const SALARY_TERMS = [
    "All other terms and conditions of employment remain unchanged unless confirmed in writing.",
    "Salary information should be handled in accordance with company policy.",
    "The salary is subject to applicable statutory deductions, including PF, ESI, or TDS where applicable.",
    "Any future salary review will depend on performance, business requirements, and company policy.",
].join("\n");

const COMPANY_DEFAULT = {
    brand: "FOURPAYSAVE",
    brandSub: "HI TECH SOLUTIONS PVT LTD",
    companyName: "FOURPAYSAVE HI TECH SOLUTIONS PRIVATE LIMITED",
    phone: "+91 9116916013",
    email: "info@4paysave.com",
    address: "Shop No. 6 & 7 Gulab Vihar, Agra Road, Jamdoli, Jaipur, Rajasthan - 302031",
    date: today(),
};

const FIELDS = {
    offer: [
        ["letterTitle", "Letter title"], ["candidateName", "Candidate name"],
        ["position", "Position"], ["duration", "Duration"],
        ["internType", "Internship type"], ["workMode", "Work mode"],
        ["location", "Location", "area"], ["timing", "Office timing"],
        ["interviewDate", "Interview date", "date"], ["joiningDate", "Joining date", "date"],
        ["department", "Department"], ["reportingTo", "Reporting to"],
        ["terms", "Terms & conditions (one per line; **bold** allowed)", "area8"],
        ["hrName", "HR / signatory name"], ["hrTitle", "HR title"],
    ],
    appointment: [
        ["candidateName", "Employee name"], ["position", "Designation"],
        ["department", "Department"], ["joiningDate", "Date of joining", "date"],
        ["probation", "Probation period"], ["salary", "Monthly salary", "number"],
        ["location", "Work location", "area"], ["timing", "Office timing"],
        ["reportingTo", "Reporting to"], ["terms", "Terms & conditions (one per line; **bold** allowed)", "area8"],
        ["hrName", "HR / signatory name"], ["hrTitle", "HR title"],
    ],
    experience: [
        ["candidateName", "Employee name"], ["honorific", "Title", "select", ["Mr.", "Ms."]],
        ["designation", "Designation"], ["startDate", "Start date", "date"],
        ["endDate", "End date", "date"], ["responsibilities", "Responsibilities", "area"],
        ["conduct", "Conduct"], ["hrName", "Signatory name"], ["hrTitle", "Signatory title"],
    ],
    salary: [
        ["letterType", "Letter type", "select", ["Salary Revision Letter", "Increment Letter", "Promotion Letter"]],
        ["candidateName", "Employee name"], ["position", "Designation"],
        ["effectiveDate", "Effective date", "date"], ["previousSalary", "Previous monthly salary", "number"],
        ["newSalary", "Revised monthly salary", "number"],
        ["breakup", "Monthly breakup (one per line: Label: amount; blank = auto split)", "area6"],
        ["terms", "Terms (one per line; **bold** allowed)", "area6"],
        ["hrName", "HR / signatory name"], ["hrTitle", "HR title"],
    ],
};

const COMPANY_FIELDS = [
    ["brand", "Brand name"], ["brandSub", "Brand subtitle"], ["companyName", "Company full name"],
    ["phone", "Phone"], ["email", "Email"], ["address", "Company address", "area"], ["date", "Letter date", "date"],
];

function initialValues(kind) {
    if (kind === "offer") return {
        letterTitle: "INTERNSHIP OFFER LETTER", candidateName: "", position: "Frontend Developer Intern",
        duration: "3 Months", internType: "Completely Unpaid Internship", workMode: "Work From Office",
        location: COMPANY_DEFAULT.address, timing: "10:00 AM to 5:00 PM", interviewDate: today(),
        joiningDate: today(), department: "Technology / Development", reportingTo: "",
        terms: OFFER_TERMS, hrName: "", hrTitle: "HR Manager",
    };
    if (kind === "appointment") return {
        candidateName: "", position: "", department: "", joiningDate: today(), probation: "3 Months",
        salary: "", location: COMPANY_DEFAULT.address, timing: "10:00 AM to 6:30 PM",
        reportingTo: "", terms: APPOINTMENT_TERMS, hrName: "", hrTitle: "HR Manager",
    };
    if (kind === "experience") return {
        candidateName: "", honorific: "Mr.", designation: "", startDate: today(), endDate: today(),
        responsibilities: "the duties and responsibilities associated with the role",
        conduct: "satisfactory", hrName: "", hrTitle: "Authorized Signatory",
    };
    return {
        letterType: "Salary Revision Letter", candidateName: "", position: "", effectiveDate: today(),
        previousSalary: "", newSalary: "", breakup: "", terms: SALARY_TERMS, hrName: "", hrTitle: "HR Manager",
    };
}

function parseBreakup(value, monthly) {
    const parsed = String(value || "").split("\n").map((line) => {
        const i = line.lastIndexOf(":");
        if (i < 1) return null;
        const amount = Number(line.slice(i + 1).replace(/[^\d.]/g, ""));
        return Number.isFinite(amount) && amount >= 0 ? [line.slice(0, i).trim(), amount] : null;
    }).filter(Boolean);
    if (parsed.length || monthly <= 0) return parsed;
    const basic = Math.round(monthly * 0.5);
    const hra = Math.round(monthly * 0.2);
    return [
        ["Basic Salary", basic],
        ["House Rent Allowance", hra],
        ["Special Allowance", monthly - basic - hra],
    ];
}

/* Letter ka content (blocks). letterPdf.js ise PDF me banata hai. */
function buildLetter(kind, values, company) {
    const v = values;
    const co = company.companyName;
    const blocks = [];
    let heading = LABEL[kind].toUpperCase();

    const p = (text) => blocks.push({ type: "p", text });
    const h = (text) => blocks.push({ type: "h", text });
    const bullets = (items) => blocks.push({ type: "bullets", items: items.filter((item) => item[1]) });
    const terms = (title = "Terms & Conditions") => {
        h(title);
        blocks.push({ type: "numbered", items: lines(v.terms) });
    };
    const signature = () => blocks.push({ type: "signature", company: co, name: v.hrName, title: v.hrTitle });

    if (kind === "offer") {
        heading = v.letterTitle || "INTERNSHIP OFFER LETTER";
        blocks.push({
            type: "recipient", items: [
                ["To,", ""], ["", v.candidateName], ["Position:", v.position],
                ["Subject:", `Internship Offer Letter - ${v.position}`], ["", `Dear ${v.candidateName}`],
            ],
        });
        p(`We are pleased to offer you an internship opportunity for the position of **${v.position}** at **${co}** for a period of **${v.duration}**.`);
        h("Internship Details");
        bullets([
            ["Duration:", v.duration], ["Type:", v.internType], ["Work Mode:", v.workMode],
            ["Location:", v.location], ["Office Timing:", v.timing], ["Interview Date:", dmy(v.interviewDate)],
            ["Joining Date:", dmy(v.joiningDate)], ["Department:", v.department], ["Reporting To:", v.reportingTo],
        ]);
        terms();
        p(`We wish you a successful and productive internship with **${co}**.`);
        signature();
        h("Candidate Acceptance");
        p(`I, **${v.candidateName}**, confirm that I have read and understood the terms stated in this letter and accept this offer.`);
        blocks.push({ type: "acceptance" });
    } else if (kind === "appointment") {
        blocks.push({
            type: "recipient", items: [
                ["To,", ""], ["", v.candidateName], ["Designation:", v.position],
                ["Subject:", `Appointment Letter - ${v.position}`], ["", `Dear ${v.candidateName}`],
            ],
        });
        p(`We are pleased to appoint you as **${v.position}** at **${co}**, effective from **${dmy(v.joiningDate)}**.`);
        h("Appointment Details");
        bullets([
            ["Designation:", v.position], ["Department:", v.department], ["Date of Joining:", dmy(v.joiningDate)],
            ["Probation Period:", v.probation], ["Monthly Salary:", v.salary ? inr(v.salary) : ""],
            ["Work Location:", v.location], ["Office Timing:", v.timing], ["Reporting To:", v.reportingTo],
        ]);
        terms();
        p(`We welcome you to **${co}** and wish you a successful career with us.`);
        signature();
        h("Employee Acceptance");
        p(`I, **${v.candidateName}**, acknowledge that I have read and understood the appointment terms and accept this appointment.`);
        blocks.push({ type: "acceptance" });
    } else if (kind === "experience") {
        heading = "EXPERIENCE LETTER";
        blocks.push({ type: "center", text: "TO WHOMSOEVER IT MAY CONCERN" });
        p(`This is to certify that **${v.honorific} ${v.candidateName}** was employed with **${co}** as **${v.designation}** from **${longDate(v.startDate)}** to **${longDate(v.endDate)}**.`);
        p(`During the tenure of **${durationOf(v.startDate, v.endDate) || "service"}**, the employee was responsible for ${v.responsibilities}.`);
        p(`The employee performed the assigned duties professionally, and their conduct was found to be **${v.conduct}**.`);
        p("We appreciate their contributions to the organization and wish them success in future endeavors.");
        signature();
    } else {
        heading = v.letterType || "SALARY LETTER";
        blocks.push({
            type: "recipient", items: [
                ["To,", ""], ["", v.candidateName], ["Designation:", v.position],
                ["Subject:", `${heading} - ${v.position}`], ["", `Dear ${v.candidateName}`],
            ],
        });
        p(`We are pleased to inform you that your salary has been revised with effect from **${dmy(v.effectiveDate)}**. The details are provided below.`);
        h("Salary Details");
        const monthly = Number(v.newSalary) || 0;
        bullets([
            ["Designation:", v.position], ["Effective Date:", dmy(v.effectiveDate)],
            ["Previous Monthly Salary:", v.previousSalary ? inr(v.previousSalary) : ""],
            ["Revised Monthly Salary:", inr(monthly)],
            ["Annual CTC (based on monthly salary):", inr(monthly * 12)],
        ]);
        const rows = parseBreakup(v.breakup, monthly);
        if (rows.length) {
            const sum = rows.reduce((s, row) => s + row[1], 0);
            blocks.push({
                type: "table",
                head: ["Component", "Monthly (Rs.)", "Annual (Rs.)"],
                rows: rows.map(([label, amount]) => [label, amount.toLocaleString("en-IN"), (amount * 12).toLocaleString("en-IN")]),
                total: ["Total", sum.toLocaleString("en-IN"), (sum * 12).toLocaleString("en-IN")],
            });
        }
        terms();
        p(`We wish you continued success with **${co}**.`);
        signature();
    }

    return { heading, blocks, company, date: dmy(company.date) };
}

export default function LetterGenerator({ kind, category, employees = [], onClose, onSaved = () => { } }) {
    const [values, setValues] = useState(() => initialValues(kind));
    const [company, setCompany] = useState(COMPANY_DEFAULT);
    const [employeeId, setEmployeeId] = useState("");
    const [tab, setTab] = useState("form");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [pdfUrl, setPdfUrl] = useState("");
    const urlRef = useRef("");

    useEffect(() => {
        api.get("/settings").then(({ data }) => {
            setCompany((current) => ({
                ...current,
                ...(data?.companyName ? { companyName: data.companyName } : {}),
                ...(data?.companyAddress ? { address: data.companyAddress } : {}),
                ...(data?.companyPhone ? { phone: data.companyPhone } : {}),
                ...(data?.companyEmail ? { email: data.companyEmail } : {}),
            }));
        }).catch(() => { });
    }, []);

    useEffect(() => () => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    }, []);

    const letter = useMemo(() => buildLetter(kind, values, company), [kind, values, company]);

    /* Preview asli PDF hai, isliye jo dikhega wahi save hoga */
    // useEffect(() => {
    //     const timer = setTimeout(() => {
    //         try {
    //             const url = URL.createObjectURL(buildLetterPdf(letter));
    //             if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    //             urlRef.current = url;
    //             setPdfUrl(url);
    //         } catch (err) {
    //             console.error("Letter preview failed:", err);
    //             toast.error(`Preview nahi ban paya: ${err?.message || "unknown error"}`);
    //         }
    //     }, 350);
    //     return () => clearTimeout(timer);
    // }, [letter]);

    /* Preview asli PDF hai, isliye jo dikhega wahi save hoga */
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const blob = await buildLetterPdf(letter);
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                if (urlRef.current) URL.revokeObjectURL(urlRef.current);
                urlRef.current = url;
                setPdfUrl(url);
            } catch (err) {
                console.error("Letter preview failed:", err);
                toast.error(`Preview nahi ban paya: ${err?.message || "unknown error"}`);
            }
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [letter]);


    const changeField = (key, value) => setValues((current) => ({ ...current, [key]: value }));

    const selectEmployee = (id) => {
        setEmployeeId(id);
        setError("");
        const employee = employees.find((item) => item._id === id);
        if (employee) {
            setValues((current) => ({
                ...current,
                candidateName: employee.name || current.candidateName,
                position: current.position || employee.designation || employee.position || "",
                department: current.department || employee.department || "",
            }));
        }
    };

    const openPdf = () => {
        if (!pdfUrl) return toast.error("Letter is not ready yet. Please wait a moment.");
        window.open(pdfUrl, "_blank", "noopener");
    };

    const saveLetter = async () => {
        if (saving) return;
        if (!employeeId) return setError("Select the employee this letter is for.");
        if (!String(values.candidateName || "").trim()) return setError("Enter the employee name.");
        if (!String(company.companyName || "").trim()) return setError("Enter the company name.");

        setSaving(true);
        setError("");
        try {
            const blob = await buildLetterPdf(letter);
            const safeName = String(values.candidateName).replace(/[^\w-]+/g, "_");
            const body = new FormData();
            body.append("title", `${kind === "salary" ? values.letterType : LABEL[kind]} - ${values.candidateName}`);
            body.append("category", category);
            body.append("employee", employeeId);
            body.append("file", new File([blob], `${LABEL[kind].replace(/\s+/g, "_")}_${safeName}.pdf`, { type: "application/pdf" }));

            await api.post("/documents", body);
            toast.success("Letter saved to the employee's documents.");
            await onSaved();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "Unable to save the letter.");
        } finally {
            setSaving(false);
        }
    };

    const renderField = ([key, label, type, options]) => {
        const wide = ["area", "area6", "area8"].includes(type);
        const className = `${inputClass} border-slate-200 focus:border-indigo-500`;
        const value = values[key] ?? "";
        return (
            <div key={key} className={wide ? "sm:col-span-2" : ""}>
                <Label>{label}</Label>
                {wide ? (
                    <textarea rows={type === "area8" ? 8 : type === "area6" ? 6 : 3} value={value}
                        onChange={(e) => changeField(key, e.target.value)} className={`${className} resize-y`} />
                ) : type === "select" ? (
                    <select value={value} onChange={(e) => changeField(key, e.target.value)} className={`${className} cursor-pointer`}>
                        {options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                ) : (
                    <input type={type === "date" ? "date" : type === "number" ? "number" : "text"}
                        min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined}
                        value={value} onChange={(e) => changeField(key, e.target.value)} className={className} />
                )}
            </div>
        );
    };

    return (
        <Sheet onClose={onClose} locked={saving} size="max-w-7xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:px-6">
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">{LABEL[kind] || "Letter"} Generator</h3>
                    <p className="text-xs text-slate-500">Details badlo, preview me PDF turant update hoga. Save karne par wahi PDF employee ke documents me jayega.</p>
                </div>
                <button type="button" onClick={() => !saving && onClose()} disabled={saving}
                    className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700" aria-label="Close">
                    <X size={18} />
                </button>
            </div>

            <div className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 lg:hidden">
                {[["form", "Details"], ["preview", "Preview"]].map(([key, title]) => (
                    <button key={key} type="button" onClick={() => setTab(key)}
                        className={`rounded-lg py-2 text-xs font-bold ${tab === key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>
                        {title}
                    </button>
                ))}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
                <div className={`${tab === "form" ? "block" : "hidden"} space-y-4 overflow-y-auto p-4 sm:p-6 lg:block`}>
                    <div>
                        <Label>Employee (save ke liye zaroori)</Label>
                        <select value={employeeId} onChange={(e) => selectEmployee(e.target.value)}
                            className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                            <option value="">Select employee</option>
                            {employees.map((employee) => (
                                <option key={employee._id} value={employee._id}>
                                    {employee.name} ({employee.employeeId || employee.employeeCode || "—"})
                                </option>
                            ))}
                        </select>
                        <FieldError>{error}</FieldError>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {(FIELDS[kind] || []).map(renderField)}
                    </div>

                    <p className="border-t border-slate-100 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Company details aur letterhead
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {COMPANY_FIELDS.map(([key, label, type]) => {
                            const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;
                            const onChange = (e) => setCompany((current) => ({ ...current, [key]: e.target.value }));
                            return (
                                <div key={key} className={type === "area" ? "sm:col-span-2" : ""}>
                                    <Label>{label}</Label>
                                    {type === "area" ? (
                                        <textarea rows={2} value={company[key] || ""} onChange={onChange} className={`${cls} resize-y`} />
                                    ) : (
                                        <input type={type === "date" ? "date" : "text"} value={company[key] || ""} onChange={onChange} className={cls} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={`${tab === "preview" ? "flex" : "hidden"} h-[72dvh] min-h-[420px] flex-col bg-slate-200/70 p-3 sm:p-4 lg:flex`}>
                    {pdfUrl ? (
                        <iframe title="Letter preview" src={`${pdfUrl}#view=FitH`} className="h-full w-full rounded-lg border-0 bg-white shadow-xl" />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="animate-spin text-indigo-600" size={28} />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-slate-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={onClose} disabled={saving}
                    className="rounded-xl bg-slate-100 px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 sm:py-2.5">
                    Close
                </button>
                <button type="button" onClick={openPdf} disabled={saving || !pdfUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:py-2.5">
                    <Printer size={14} /> PDF kholo / Print
                </button>
                <button type="button" onClick={saveLetter} disabled={saving} className={primaryBtn}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? "Saving..." : "Save to employee"}
                </button>
            </div>
        </Sheet>
    );
}
