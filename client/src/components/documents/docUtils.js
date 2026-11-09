import api from "@/lib/api";
import { toast } from "react-toastify";
import { Building2, ScrollText, FolderOpen, FileSignature, FileCheck2, Banknote, Award, ClipboardCheck, UserSquare2 } from "lucide-react";

export const MAX_MB = 5;
export const ALLOWED = ["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx"];

/* One entry per menu page. "personal" means the document must belong to one employee. "types" feeds the Document type list. */
export const PAGES = {
    company: {
        category: "company", title: "Company Documents", subtitle: "Registrations, licences, contracts and certificates of the company.", personal: false, icon: Building2, add: "Upload Document", example: "e.g. GST Registration Certificate",
        types: ["Certificate of Incorporation", "Company PAN Card", "TAN Certificate", "GST Certificate", "MSME / Udyam Certificate", "Shop & Establishment Licence", "MoA / AoA", "PF Registration", "ESI Registration", "Professional Tax Registration", "Labour Licence", "Office Lease Agreement", "Vendor Contract", "Client Contract", "NDA", "Insurance Policy", "ISO Certificate", "Company Logo", "Letterhead", "Other"],
    },
    policy: {
        category: "policy", title: "HR Policies", subtitle: "Policies and guidelines that employees can read and download.", personal: false, icon: ScrollText, add: "Upload Policy", example: "e.g. Leave Policy 2026",
        types: ["Employee Handbook", "Code of Conduct", "Leave Policy", "Attendance Policy", "WFH / Hybrid Policy", "Holiday Calendar", "POSH Policy", "Grievance Redressal Policy", "Whistleblower Policy", "Disciplinary Policy", "IT & Data Security Policy", "Expense & Travel Policy", "Dress Code", "Notice Period & Exit Policy", "Performance Review Policy", "Other"],
    },
    employee: {
        category: "employee", title: "Employee Documents", subtitle: "Identity, education and personal file of each employee.", personal: true, icon: UserSquare2, add: "Upload Document", example: "e.g. PAN Card",
        types: ["Aadhaar Card", "PAN Card", "Voter ID Card", "Passport", "Driving Licence", "Address Proof", "Photograph", "Degree Certificate", "Marksheet", "Bank Details (Cancelled Cheque)", "UAN / PF Details", "ESIC Details", "Medical Certificate", "Signed NDA", "Policy Acknowledgement", "Other"],
    },
    "offer-letter": {
        category: "offer-letter", title: "Offer Letters", subtitle: "Offer letters given to employees and interns.", personal: true, icon: FileSignature, add: "Upload Letter", example: "e.g. Offer Letter", generator: "offer",
        types: ["Offer Letter", "Internship Offer Letter", "Signed Offer Copy", "Other"],
    },
    "appointment-letter": {
        category: "appointment-letter", title: "Appointment Letters", subtitle: "Appointment letters and employment agreements.", personal: true, icon: FileCheck2, add: "Upload Letter", example: "e.g. Appointment Letter", generator: "appointment",
        types: ["Appointment Letter", "Employment Agreement", "Confirmation Letter", "Other"],
    },
    "salary-letter": {
        category: "salary-letter", title: "Salary Letters", subtitle: "Salary revision, increment and promotion letters.", personal: true, icon: Banknote, add: "Upload Letter", example: "e.g. Increment Letter 2026", generator: "salary",
        note: "Monthly payslips are made in Payroll, not here. Employees see them under My Payslips.",
        types: ["Salary Revision Letter", "Increment Letter", "Promotion Letter", "Salary Certificate", "Other"],
    },
    "experience-letter": {
        category: "experience-letter", title: "Experience Letters", subtitle: "Experience and relieving letters of employees who left.", personal: true, icon: Award, add: "Upload Letter", example: "e.g. Experience Letter", generator: "experience",
        types: ["Experience Letter", "Relieving Letter", "Internship Certificate", "Other"],
    },
    joining: {
        category: "joining", title: "Joining Documents", subtitle: "Joining report, declarations and forms of new employees.", personal: true, icon: ClipboardCheck, add: "Upload Document", example: "e.g. Joining Report",
        types: ["Joining Report", "Medical Fitness Certificate", "Background Verification Form", "Emergency Contact Form", "Declaration Form", "PF Nomination (Form 2)", "Other"],
    },
};

export const MINE = { category: "", title: "My Documents", subtitle: "Every document that HR has added for you, in one place.", personal: true, icon: FolderOpen, types: [] };

export const AUDIENCE = {
    employee: { label: "Employee", tone: "emerald" },
    "admin-hr": { label: "Admin & HR only", tone: "slate" },
};

export const idOf = (v) => String(v?._id || v || "");
export const isUrl = (u) => /^https?:\/\/\S+$/i.test(String(u || "").trim());

export const kindOf = (d) => {
    const name = String(d.fileName || d.fileUrl || "").split("?")[0].toLowerCase();
    if (/\.pdf$/.test(name) || d.fileType === "application/pdf") return "pdf";
    if (/\.(png|jpe?g|gif|webp)$/.test(name) || String(d.fileType || "").startsWith("image/")) return "image";
    return "other";
};

export const sizeText = (b) => (!b ? "" : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);

/* A protected file has to be fetched with the login token, a plain link cannot do that */
export const fetchBlob = async (doc, download = false) => {
    const res = await api.get(`/documents/${doc._id}/file`, { params: download ? { download: 1 } : undefined, responseType: "blob" });
    return res.data;
};

export async function errText(err, fallback = "Something went wrong.") {
    try {
        const data = err?.response?.data;
        if (data instanceof Blob) return JSON.parse(await data.text()).message || fallback;
        return data?.message || fallback;
    } catch {
        return fallback;
    }
}

export const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export async function downloadDoc(doc) {
    if (!doc.hasFile) {
        if (isUrl(doc.fileUrl)) window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
        return;
    }
    try {
        saveBlob(await fetchBlob(doc, true), doc.fileName || doc.title || "document");
    } catch (err) {
        toast.error(await errText(err, "Unable to download the file."));
    }
}
