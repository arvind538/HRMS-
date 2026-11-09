"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Printer, X } from "lucide-react";
import { Label, Sheet, inputClass } from "@/components/payroll/ui";
import { primaryBtn } from "@/components/payroll/common";
import { personName } from "@/components/recruitment/CandidatePicker";

const COMPANY = "FOURPAYSAVE HI TECH SOLUTIONS PRIVATE LIMITED";
const SIGNER = "Raima Khandelwal";
const WORK_MODE = { office: "Work From Office", remote: "Work From Home", hybrid: "Hybrid" };

/* contact row and letterhead text (same as the reference letter) */
const CONTACT = {
    phone: "+91 9116916013",
    email: "info@4paysave.com",
    address1: "Shop No. 6 & 7 Gulab Vihar, Agra Road,",
    address2: "Jamdoli, Jaipur, Rajasthan - 302031",
};

/* the body must end above this line (mm from the top of the A4 page), the contact row starts below it */
const BODY_LIMIT_MM = 255;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const fmt = (v) => (v ? new Date(v).toLocaleDateString("en-GB") : "");
const inr = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

const isIntern = (o) => o?.offerType === "internship";
const monthsOf = (o) => Math.max(1, Number(o?.durationMonths) || 3);
const monthWord = (n) => `${n} month${n === 1 ? "" : "s"}`;

/* the "Internship Details" / "Offer Details" list */
function detailRows(o) {
    const ctc = Number(o.annualCtc || 0);
    const stipend = Number(o.stipend || 0);
    const rows = [];

    if (isIntern(o)) {
        rows.push(["Duration:", monthWord(monthsOf(o)).replace("month", "Month")]);
        rows.push(["Type:", stipend > 0 ? "Paid Internship" : "Completely Unpaid Internship"]);
        if (stipend > 0) rows.push(["Stipend:", `${inr(stipend)} per month`]);
    } else {
        rows.push(["Designation:", o.designation]);
        rows.push(["Annual CTC:", ctc ? `${inr(ctc)} per annum` : ""]);
        rows.push(["Monthly Gross:", ctc ? inr(Math.round(ctc / 12)) : ""]);
    }

    rows.push(["Work Mode:", WORK_MODE[o.workMode] || ""]);
    if (o.workMode !== "remote") rows.push(["Location:", o.location]);
    rows.push(["Office Timing:", o.officeTiming]);
    rows.push(["Interview Date:", fmt(o.interviewDate)]);
    rows.push(["Joining Date:", fmt(o.joiningDate)]);
    rows.push(["Department:", o.department]);
    rows.push(["Reporting To:", o.reportingTo]);
    rows.push(["Offer Valid Till:", fmt(o.validTill)]);
    return rows.filter(([, v]) => v);
}

/* the first version of the terms (one per line, **bold** allowed). HR can edit them in the form. */
function defaultTerms(o) {
    if (isIntern(o)) {
        const months = monthsOf(o);
        const stipend = Number(o.stipend || 0);
        return [
            stipend > 0
                ? `You will receive a **stipend of ${inr(stipend)} per month** for the ${months}-month internship period, subject to attendance and applicable deductions.`
                : `This will be a **completely unpaid internship for the entire ${months}-month period**. No salary, stipend, or remuneration will be provided by the company.`,
            stipend > 0
                ? "Except the stipend mentioned above, the company will **not provide or reimburse any other expenses**, including travel, food, accommodation, internet/mobile, or any other personal expenses."
                : "The company will **not provide or reimburse any expenses**, including travel, food, accommodation, internet/mobile, or any other personal expenses.",
            "The intern must follow the company's prescribed **working hours, rules, policies, and professional standards**.",
            "The intern must maintain strict confidentiality regarding all company information, projects, documents, client information, and data.",
            "Any prolonged absence, misconduct, violation of company policies, or unsatisfactory performance may result in termination of the internship.",
            `Upon **successful completion of the full ${months}-month internship and assigned responsibilities**, the company will provide an **Internship Completion Certificate**.`,
            "This internship **does not guarantee permanent employment**. Any future employment opportunity will depend on performance, business requirements, vacancies, and management's decision.",
        ].join("\n");
    }
    return [
        "This offer is subject to verification of your documents and references.",
        "You will be on probation for the period told by HR, after which your services will be reviewed for confirmation.",
        "You must follow the company's **working hours, rules, policies and professional standards**.",
        "You must maintain strict **confidentiality** of all company information, projects and client data.",
        "Either party may end the employment by giving the notice required by company policy.",
        "This offer **does not guarantee** any benefit beyond what is written in this letter.",
    ].join("\n");
}

/* Header: navy and blue swoosh, FOURPAYSAVE logo. Drawn in mm (viewBox = page size in mm). */
/* Header: navy and blue swoosh, FOURPAYSAVE logo image. Drawn in mm (viewBox = page size in mm). */
/* Header: navy and blue swoosh, FOURPAYSAVE logo image. Drawn in mm (viewBox = page size in mm). */
/* Header: swoosh image at the top, FOURPAYSAVE logo image and wordmark. Drawn in mm (viewBox = page size in mm). */
const HEADER_SVG = `
<svg class="art top" viewBox="0 0 210 56" aria-hidden="true">
  <image href="/brand/header-swoosh.png" x="0" y="0" width="210" height="53.3" preserveAspectRatio="none"/>
  <image href="/brand/paysave-logo.png" x="172" y="14" width="18" height="28" preserveAspectRatio="xMidYMid meet"/>
  <text x="185" y="46" text-anchor="middle" font-size="5.6" font-weight="700" font-family="Arial, Helvetica, sans-serif"><tspan fill="#111827">FOUR</tspan><tspan fill="#1f6fe0">PAYSAVE</tspan></text>
  <text x="185" y="50.8" text-anchor="middle" font-size="3" fill="#0b1b3a" font-family="Arial, Helvetica, sans-serif">HI TECH SOLUTIONS PVT LTD</text>
</svg>`;

const FOOTER_SVG = `
<svg class="art bottom" viewBox="0 252 210 45" aria-hidden="true">
  <image href="/brand/footer-wave.png" x="0" y="272.7" width="210" height="28" preserveAspectRatio="none"/>

  <image href="/brand/icon-phone.png" x="2.5" y="262.5" width="10" height="10" preserveAspectRatio="xMidYMid meet"/>
  <text x="12.5" y="268" font-size="4.6" fill="#111827" font-family="Arial, Helvetica, sans-serif">${esc(CONTACT.phone)}</text>

  <circle cx="63.5" cy="266.5" r="4" fill="#1f6fe0"/>
  <rect x="61.2" y="265.2" width="4.6" height="3.2" fill="#ffffff"/>
  <polyline points="61.2,265.2 63.5,267.5 65.8,265.2" fill="none" stroke="#1f6fe0" stroke-width="0.35"/>
  <text x="69" y="268" font-size="4.4" fill="#111827" font-family="Arial, Helvetica, sans-serif">${esc(CONTACT.email)}</text>

  <image href="/brand/icon-location.png" x="125" y="261" width="10" height="10" preserveAspectRatio="xMidYMid meet"/>
  <text x="134.5" y="264.6" font-size="3.5" fill="#111827" font-family="Arial, Helvetica, sans-serif">${esc(CONTACT.address1)}</text>
  <text x="134.5" y="269" font-size="3.5" fill="#111827" font-family="Arial, Helvetica, sans-serif">${esc(CONTACT.address2)}</text>
</svg>`;

function pageHtml({ offer, company, signName, signTitle, terms }) {
    const intern = isIntern(offer);
    const name = personName(offer.candidate) || "Candidate";
    const months = monthsOf(offer);
    const unpaid = intern && !(Number(offer.stipend) > 0);
    const rows = detailRows(offer);
    const list = String(terms || "").split("\n").map((t) => t.trim()).filter(Boolean);

    const title = intern ? "INTERNSHIP OFFER LETTER" : "OFFER LETTER";
    const subject = `${intern ? "Internship Offer Letter" : "Offer Letter"} - ${offer.designation}`;

    const intro = intern
        ? `We are pleased to offer you an internship opportunity for the position of <b>${esc(offer.designation)}</b> at <b>${esc(company)}</b> for a period of <b>${esc(monthWord(months))}</b>.`
        : `We are pleased to offer you the position of <b>${esc(offer.designation)}</b> at <b>${esc(company)}</b>. We believe you will be a valuable member of our team.`;

    const closing = intern
        ? `We wish you a successful and productive internship with <b>${esc(company)}</b>.`
        : `We wish you a successful career with <b>${esc(company)}</b>.`;

    const accept = intern
        ? `I, <b>${esc(name)}</b>, have read and understood all the above terms and conditions and hereby accept this internship offer.${unpaid ? ` I understand and agree that this is a <b>completely unpaid ${esc(String(months))}-month internship</b> and that the company will not provide or reimburse any expenses or monetary benefits.` : ""}`
        : `I, <b>${esc(name)}</b>, have read and understood all the above terms and conditions and hereby accept this offer.`;

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
body{font-family:Arial,Helvetica,sans-serif;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff}
.art{position:absolute;left:0;width:210mm;display:block}
.top{top:0;height:56mm}
.bottom{top:252mm;height:45mm}
.title{position:absolute;top:41mm;left:0;width:210mm;text-align:center;margin:0;font-size:9.5pt;font-weight:700;color:#111827}
.date{position:absolute;top:57.5mm;right:26mm;font-size:7.6pt;font-weight:700}
.body{position:absolute;top:66mm;left:25mm;width:160mm;font-size:8.6pt;line-height:1.3}
.body p{margin:0 0 5px}
.ln{margin:0}
.body h3{font-size:9.6pt;margin:9px 0 4px}
.body ul{margin:0 0 4px;padding-left:20px}
.body ul li{margin-bottom:2.5px}
.body ol{margin:0 0 5px;padding-left:20px}
.body ol li{margin-bottom:1.5px}
.big{font-size:10pt}
</style></head><body><div class="page">
${HEADER_SVG}
<h1 class="title">${esc(title)}</h1>
<div class="date">Date:${esc(fmt(offer.offerDate || new Date()))}</div>
<div class="body">
<div class="ln"><b>To,</b></div>
<div class="ln"><b>${esc(name)}</b></div>
<div class="ln"><b>Position:</b> ${esc(offer.designation)}</div>
<div class="ln"><b>Subject:</b> ${esc(subject)}</div>
<div class="ln"><b>Dear ${esc(name)}</b></div>
<div style="height:6px"></div>
<p>${intro}</p>
<h3>${intern ? "Internship Details" : "Offer Details"}</h3>
<ul>${rows.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("")}</ul>
<h3>Terms &amp; Conditions</h3>
<ol>${list.map((t) => `<li>${md(t)}</li>`).join("")}</ol>
<p>${closing}</p>
<div style="height:4px"></div>
<div class="ln"><b>Best Regards,</b></div>
<div class="ln big"><b>${esc(signName)}</b></div>
<div class="ln big"><b>${esc(signTitle)}</b></div>
<div class="ln big"><b>${esc(company)}</b></div>
<h3>Candidate Acceptance</h3>
<p>${accept}</p>
<div class="ln"><b>Candidate Signature:</b> _______________</div>
<div class="ln"><b>Date:</b> _____________</div>
<div class="end"></div>
</div>
${FOOTER_SVG}
</div></body></html>`;
}

export default function OfferLetter({ offer, onClose }) {
    const [company, setCompany] = useState(COMPANY);
    const [signName, setSignName] = useState(SIGNER);
    const [signTitle, setSignTitle] = useState("HR Manager");
    const [terms, setTerms] = useState(() => defaultTerms(offer));
    const [tab, setTab] = useState("form");
    const [scale, setScale] = useState(1);
    const [tooLong, setTooLong] = useState(false);
    const frame = useRef(null);
    const wrap = useRef(null);
    const name = personName(offer.candidate) || "Candidate";

    /* the preview is 794px wide (A4 at 96dpi). It shrinks to fit the screen, so it works on phones too */
    useEffect(() => {
        const el = wrap.current;
        if (!el) return undefined;
        const fit = () => el.clientWidth > 0 && setScale(Math.max(0.3, Math.min(1, (el.clientWidth - 24) / 794)));
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, [tab]);

    const srcDoc = useMemo(() => pageHtml({ offer, company, signName, signTitle, terms }), [offer, company, signName, signTitle, terms]);
    const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;

    /* the body must end above the contact row. Otherwise HR is told to shorten the terms. */
    const checkLength = () => {
        const doc = frame.current?.contentDocument;
        const end = doc?.querySelector(".end");
        const page = doc?.querySelector(".page");
        if (!end || !page) return setTooLong(false);
        const bottomMm = ((end.getBoundingClientRect().bottom - page.getBoundingClientRect().top) / 794) * 210;
        setTooLong(bottomMm > BODY_LIMIT_MM);
    };

    return (
        <Sheet onClose={onClose} size="max-w-6xl">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">{isIntern(offer) ? "Internship offer letter" : "Offer letter"} • {name}</h3>
                    <p className="text-xs text-slate-400">Check the A4 preview, then print or save it as PDF.</p>
                </div>
                <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="lg:hidden grid grid-cols-2 gap-1 p-1 mx-4 mt-3 bg-slate-100 rounded-xl">
                {[["form", "Details"], ["preview", "Preview"]].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${tab === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>{l}</button>
                ))}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr] overflow-hidden">
                <div className={`${tab === "form" ? "block" : "hidden"} lg:block overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4`}>
                    <div><Label>Company name</Label><input value={company} onChange={(e) => setCompany(e.target.value)} className={cls} /></div>
                    <div><Label>Signed by</Label><input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="e.g. Raima Khandelwal" className={cls} /></div>
                    <div><Label>Title</Label><input value={signTitle} onChange={(e) => setSignTitle(e.target.value)} className={cls} /></div>
                    <div>
                        <Label>Terms (one per line, **bold** allowed)</Label>
                        <textarea rows={12} value={terms} onChange={(e) => setTerms(e.target.value)} className={`${cls} resize-y`} />
                        <button type="button" onClick={() => setTerms(defaultTerms(offer))} className="mt-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">Reset to the standard terms</button>
                    </div>
                    <p className="text-[11px] text-slate-400">The details list (duration, work mode, location, dates...) comes from the offer. To change it, edit the offer. The header, logo and footer are built into the letter, the same as the reference design.</p>
                </div>

                <div ref={wrap} className={`${tab === "preview" ? "block" : "hidden"} lg:block bg-slate-200/70 overflow-auto p-3 sm:p-4`}>
                    {tooLong && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-amber-800">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                            <p className="text-[11px] font-semibold leading-relaxed">This letter is longer than one A4 page and will run into the footer. Please shorten the terms.</p>
                        </div>
                    )}
                    <div style={{ width: 794 * scale, height: 1123 * scale, margin: "0 auto" }}>
                        <iframe ref={frame} onLoad={checkLength} title="Offer letter preview" srcDoc={srcDoc} className="bg-white shadow-xl block" style={{ width: 794, height: 1123, border: 0, transform: `scale(${scale})`, transformOrigin: "top left" }} />
                    </div>
                </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-4 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                <button type="button" onClick={onClose} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Close</button>
                <button type="button" onClick={() => frame.current?.contentWindow?.print()} className={primaryBtn}><Printer size={14} /> Print / Save as PDF</button>
            </div>
        </Sheet>
    );
}










// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import { AlertTriangle, Printer, X } from "lucide-react";
// import { Label, Sheet, inputClass } from "@/components/payroll/ui";
// import { primaryBtn } from "@/components/payroll/common";
// import { personName } from "@/components/recruitment/CandidatePicker";

// const COMPANY = "FOURPAYSAVE HI TECH SOLUTIONS PRIVATE LIMITED";
// const SIGNER = "Raima Khandelwal";
// const WORK_MODE = { office: "Work From Office", remote: "Work From Home", hybrid: "Hybrid" };

// const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
// const fmt = (v) => (v ? new Date(v).toLocaleDateString("en-GB") : "");
// const inr = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

// const isIntern = (o) => o?.offerType === "internship";
// const monthsOf = (o) => Math.max(1, Number(o?.durationMonths) || 3);
// const monthWord = (n) => `${n} month${n === 1 ? "" : "s"}`;

// /* the "Internship Details" / "Offer Details" list */
// function detailRows(o) {
//     const ctc = Number(o.annualCtc || 0);
//     const stipend = Number(o.stipend || 0);
//     const rows = [];

//     if (isIntern(o)) {
//         rows.push(["Duration:", monthWord(monthsOf(o)).replace("month", "Month")]);
//         rows.push(["Type:", stipend > 0 ? "Paid Internship" : "Completely Unpaid Internship"]);
//         if (stipend > 0) rows.push(["Stipend:", `${inr(stipend)} per month`]);
//     } else {
//         rows.push(["Designation:", o.designation]);
//         rows.push(["Annual CTC:", ctc ? `${inr(ctc)} per annum` : ""]);
//         rows.push(["Monthly Gross:", ctc ? inr(Math.round(ctc / 12)) : ""]);
//     }

//     rows.push(["Work Mode:", WORK_MODE[o.workMode] || ""]);
//     if (o.workMode !== "remote") rows.push(["Location:", o.location]);
//     rows.push(["Office Timing:", o.officeTiming]);
//     rows.push(["Interview Date:", fmt(o.interviewDate)]);
//     rows.push(["Joining Date:", fmt(o.joiningDate)]);
//     rows.push(["Department:", o.department]);
//     rows.push(["Reporting To:", o.reportingTo]);
//     rows.push(["Offer Valid Till:", fmt(o.validTill)]);
//     return rows.filter(([, v]) => v);
// }

// /* the first version of the terms (one per line, **bold** allowed). HR can edit them in the form. */
// function defaultTerms(o) {
//     if (isIntern(o)) {
//         const months = monthsOf(o);
//         const stipend = Number(o.stipend || 0);
//         return [
//             stipend > 0
//                 ? `You will receive a **stipend of ${inr(stipend)} per month** for the ${months}-month internship period, subject to attendance and applicable deductions.`
//                 : `This will be a **completely unpaid internship for the entire ${months}-month period**. No salary, stipend, or remuneration will be provided by the company.`,
//             stipend > 0
//                 ? "Except the stipend mentioned above, the company will **not provide or reimburse any other expenses**, including travel, food, accommodation, internet/mobile, or any other personal expenses."
//                 : "The company will **not provide or reimburse any expenses**, including travel, food, accommodation, internet/mobile, or any other personal expenses.",
//             "The intern must follow the company's prescribed **working hours, rules, policies, and professional standards**.",
//             "The intern must maintain strict confidentiality regarding all company information, projects, documents, client information, and data.",
//             "Any prolonged absence, misconduct, violation of company policies, or unsatisfactory performance may result in termination of the internship.",
//             `Upon **successful completion of the full ${months}-month internship and assigned responsibilities**, the company will provide an **Internship Completion Certificate**.`,
//             "This internship **does not guarantee permanent employment**. Any future employment opportunity will depend on performance, business requirements, vacancies, and management's decision.",
//         ].join("\n");
//     }
//     return [
//         "This offer is subject to verification of your documents and references.",
//         "You will be on probation for the period told by HR, after which your services will be reviewed for confirmation.",
//         "You must follow the company's **working hours, rules, policies and professional standards**.",
//         "You must maintain strict **confidentiality** of all company information, projects and client data.",
//         "Either party may end the employment by giving the notice required by company policy.",
//         "This offer **does not guarantee** any benefit beyond what is written in this letter.",
//     ].join("\n");
// }

// function pageHtml({ offer, company, signName, signTitle, terms, origin }) {
//     const intern = isIntern(offer);
//     const name = personName(offer.candidate) || "Candidate";
//     const months = monthsOf(offer);
//     const unpaid = intern && !(Number(offer.stipend) > 0);
//     const rows = detailRows(offer);
//     const list = String(terms || "").split("\n").map((t) => t.trim()).filter(Boolean);

//     const title = intern ? "INTERNSHIP OFFER LETTER" : "OFFER LETTER";
//     const subject = `${intern ? "Internship Offer Letter" : "Offer Letter"} - ${offer.designation}`;

//     const intro = intern
//         ? `We are pleased to offer you an internship opportunity for the position of <b>${esc(offer.designation)}</b> at <b>${esc(company)}</b> for a period of <b>${esc(monthWord(months))}</b>.`
//         : `We are pleased to offer you the position of <b>${esc(offer.designation)}</b> at <b>${esc(company)}</b>. We believe you will be a valuable member of our team.`;

//     const closing = intern
//         ? `We wish you a successful and productive internship with <b>${esc(company)}</b>.`
//         : `We wish you a successful career with <b>${esc(company)}</b>.`;

//     const accept = intern
//         ? `I, <b>${esc(name)}</b>, have read and understood all the above terms and conditions and hereby accept this internship offer.${unpaid ? ` I understand and agree that this is a <b>completely unpaid ${esc(String(months))}-month internship</b> and that the company will not provide or reimburse any expenses or monetary benefits.` : ""}`
//         : `I, <b>${esc(name)}</b>, have read and understood all the above terms and conditions and hereby accept this offer.`;

//     return `<!doctype html><html><head><meta charset="utf-8"><style>
// @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff}
// body{font-family:Arial,Helvetica,sans-serif;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
// .page{position:relative;width:210mm;min-height:297mm;padding:66mm 25mm 40mm;font-size:8.6pt;line-height:1.38}
// .hdr{position:absolute;top:0;left:0;width:210mm;height:auto;max-height:62mm;object-fit:cover;object-position:top}
// .ftr{position:fixed;bottom:0;left:0;width:210mm;height:auto;max-height:42mm;object-fit:cover;object-position:bottom}
// h1{position:absolute;top:41mm;left:0;width:210mm;text-align:center;margin:0;font-size:10pt;letter-spacing:.2px}
// .date{position:absolute;top:58mm;right:20mm;font-weight:700;font-size:7.8pt}
// p{margin:0 0 6px}.ln{margin:0}h3{font-size:9.8pt;margin:10px 0 5px}
// ul{margin:0 0 4px;padding-left:22px}ul li{margin-bottom:3.5px}
// ol{margin:0 0 6px;padding-left:36px}ol li{padding-left:4px;margin-bottom:1.5px}
// .big{font-size:9.6pt}
// </style></head><body><div class="page">
// <img class="hdr" src="${origin}/letterhead/header.png" onerror="this.style.display='none'" alt="">
// <h1>${esc(title)}</h1><div class="date">Date:${esc(fmt(offer.offerDate || new Date()))}</div>
// <div class="ln"><b>To,</b></div><div class="ln"><b>${esc(name)}</b></div>
// <div class="ln"><b>Position:</b> ${esc(offer.designation)}</div>
// <div class="ln"><b>Subject:</b> ${esc(subject)}</div>
// <div class="ln"><b>Dear ${esc(name)}</b></div><div style="height:6px"></div>
// <p>${intro}</p>
// <h3>${intern ? "Internship Details" : "Offer Details"}</h3><ul>${rows.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join("")}</ul>
// <h3>Terms &amp; Conditions</h3><ol>${list.map((t) => `<li>${md(t)}</li>`).join("")}</ol>
// <p>${closing}</p>
// <div style="height:4px"></div>
// <div class="ln"><b>Best Regards,</b></div>
// <div class="ln big"><b>${esc(signName)}</b></div><div class="ln big"><b>${esc(signTitle)}</b></div><div class="ln big"><b>${esc(company)}</b></div>
// <h3>Candidate Acceptance</h3>
// <p>${accept}</p>
// <div class="ln"><b>Candidate Signature:</b> _______________</div><div class="ln"><b>Date:</b> _____________</div>
// <img class="ftr" src="${origin}/letterhead/footer.png" onerror="this.style.display='none'" alt="">
// </div></body></html>`;
// }

// export default function OfferLetter({ offer, onClose }) {
//     const [company, setCompany] = useState(COMPANY);
//     const [signName, setSignName] = useState(SIGNER);
//     const [signTitle, setSignTitle] = useState("HR Manager");
//     const [terms, setTerms] = useState(() => defaultTerms(offer));
//     const [tab, setTab] = useState("form");
//     const [scale, setScale] = useState(1);
//     const [tooLong, setTooLong] = useState(false);
//     const frame = useRef(null);
//     const wrap = useRef(null);
//     const origin = typeof window !== "undefined" ? window.location.origin : "";
//     const name = personName(offer.candidate) || "Candidate";

//     useEffect(() => {
//         const el = wrap.current;
//         if (!el) return undefined;
//         const fit = () => el.clientWidth > 0 && setScale(Math.max(0.3, Math.min(1, (el.clientWidth - 24) / 794)));
//         fit();
//         const ro = new ResizeObserver(fit);
//         ro.observe(el);
//         return () => ro.disconnect();
//     }, [tab]);

//     const srcDoc = useMemo(() => pageHtml({ offer, company, signName, signTitle, terms, origin }), [offer, company, signName, signTitle, terms, origin]);
//     const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;

//     /* a letter longer than one A4 page would run over the footer, so HR is told */
//     const checkLength = () => {
//         const page = frame.current?.contentDocument?.querySelector(".page");
//         setTooLong(Boolean(page) && page.scrollHeight > 1130);
//     };

//     return (
//         <Sheet onClose={onClose} size="max-w-6xl">
//             <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
//                 <div className="min-w-0">
//                     <h3 className="text-base font-bold text-slate-900 truncate">{isIntern(offer) ? "Internship offer letter" : "Offer letter"} • {name}</h3>
//                     <p className="text-xs text-slate-400">Check the A4 preview, then print or save it as PDF.</p>
//                 </div>
//                 <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
//             </div>

//             <div className="lg:hidden grid grid-cols-2 gap-1 p-1 mx-4 mt-3 bg-slate-100 rounded-xl">
//                 {[["form", "Details"], ["preview", "Preview"]].map(([k, l]) => (
//                     <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${tab === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>{l}</button>
//                 ))}
//             </div>

//             <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr] overflow-hidden">
//                 <div className={`${tab === "form" ? "block" : "hidden"} lg:block overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4`}>
//                     <div><Label>Company name</Label><input value={company} onChange={(e) => setCompany(e.target.value)} className={cls} /></div>
//                     <div><Label>Signed by</Label><input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="e.g. Raima Khandelwal" className={cls} /></div>
//                     <div><Label>Title</Label><input value={signTitle} onChange={(e) => setSignTitle(e.target.value)} className={cls} /></div>
//                     <div>
//                         <Label>Terms (one per line, **bold** allowed)</Label>
//                         <textarea rows={12} value={terms} onChange={(e) => setTerms(e.target.value)} className={`${cls} resize-y`} />
//                         <button type="button" onClick={() => setTerms(defaultTerms(offer))} className="mt-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">Reset to the standard terms</button>
//                     </div>
//                     <p className="text-[11px] text-slate-400">The details list (duration, work mode, location, dates...) comes from the offer. To change it, edit the offer. The header and footer images come from <b>public/letterhead</b>.</p>
//                 </div>

//                 <div ref={wrap} className={`${tab === "preview" ? "block" : "hidden"} lg:block bg-slate-200/70 overflow-auto p-3 sm:p-4`}>
//                     {tooLong && (
//                         <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-amber-800">
//                             <AlertTriangle size={15} className="shrink-0 mt-0.5" />
//                             <p className="text-[11px] font-semibold leading-relaxed">This letter is longer than one A4 page and will run over the footer. Please shorten the terms.</p>
//                         </div>
//                     )}
//                     <div style={{ width: 794 * scale, height: 1123 * scale, margin: "0 auto" }}>
//                         <iframe ref={frame} onLoad={checkLength} title="Offer letter preview" srcDoc={srcDoc} className="bg-white shadow-xl block" style={{ width: 794, height: 1123, border: 0, transform: `scale(${scale})`, transformOrigin: "top left" }} />
//                     </div>
//                 </div>
//             </div>

//             <div className="shrink-0 border-t border-slate-100 bg-white px-4 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
//                 <button type="button" onClick={onClose} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Close</button>
//                 <button type="button" onClick={() => frame.current?.contentWindow?.print()} className={primaryBtn}><Printer size={14} /> Print / Save as PDF</button>
//             </div>
//         </Sheet>
//     );
// }