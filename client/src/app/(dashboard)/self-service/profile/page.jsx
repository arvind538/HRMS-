"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  Building2,
  Edit3,
  Check,
  X,
  IdCard,
  User,
  Briefcase,
  Clock,
  IndianRupee,
  Landmark,
  CreditCard,
  Network,
  Hash,
  MapPin,
  FileText,
  Eye,
  EyeOff,
  Camera,
  BadgeCheck,
  UserCheck,
  KeyRound,
  Lock,
  Image as ImageIcon,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

const NA = "Not provided";
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const ROLE_LABEL = { admin: "Super Admin", hr: "HR Manager", manager: "Manager", employee: "Employee" };

const TINTS = {
  indigo: "bg-indigo-50 text-indigo-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

const STATUS_CHIP = {
  complete: ["Complete", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  partial: ["Incomplete", "bg-amber-50 text-amber-700 border-amber-200"],
  missing: ["Missing", "bg-rose-50 text-rose-700 border-rose-200"],
};

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "job", label: "Job", icon: Briefcase },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "banking", label: "Banking", icon: Landmark },
];

/* ----------------------------- helpers ----------------------------- */

const pick = (obj, paths) => {
  if (!obj) return "";
  for (const p of paths) {
    const v = p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), obj);
    if (v !== undefined && v !== null && typeof v !== "object" && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const titleCase = (s) =>
  s ? String(s).replace(/[_-]+/g, " ").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : "";

const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? ""
    : `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
};

const formatSalary = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const isHex = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());
const digitsOnly = (v) => String(v || "").replace(/\D/g, "");
const formatAadhaar = (n) => n.replace(/(\d{4})(?=\d)/g, "$1 ");
const maskAadhaar = (n) => (n.length > 4 ? `XXXX XXXX ${n.slice(-4)}` : n);
const maskPan = (p) => (p.length > 4 ? `${"X".repeat(p.length - 4)}${p.slice(-4)}` : p);
const maskAccount = (n) => (n.length > 4 ? `${"•".repeat(Math.max(n.length - 4, 4))}${n.slice(-4)}` : n);

const toList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  return d?.data || d?.departments || d?.designations || [];
};

const buildMap = (list) => {
  const map = {};
  (Array.isArray(list) ? list : []).forEach((item) => {
    const id = item?._id || item?.id;
    const label = item?.name || item?.title || item?.label;
    if (id && label) map[String(id)] = label;
  });
  return map;
};

/* An id becomes its name. Plain text stays as it is. An unknown id stays empty (no raw id on screen). */
const labelOf = (value, map) => {
  if (!value) return "";
  if (typeof value === "object") return value.name || value.title || "";
  const s = String(value).trim();
  if (map[s]) return map[s];
  return isHex(s) ? "" : s;
};

/* ------------------------------ parts ------------------------------ */

function InfoItem({ icon: Icon, label, value, tint = "indigo", mono = false, wide = false, action }) {
  const empty = !value;
  return (
    <div className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-white ${wide ? "sm:col-span-2" : ""}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TINTS[tint]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
        <p
          className={`text-xs sm:text-sm mt-0.5 ${wide ? "break-words" : "truncate"} ${mono ? "font-mono" : ""} ${empty ? "text-slate-400 font-medium" : "text-slate-800 font-bold"}`}
          title={!wide && value ? value : undefined}
        >
          {value || NA}
        </p>
      </div>
      {action}
    </div>
  );
}

function EyeButton({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
      aria-label={shown ? "Hide number" : "Show number"}
    >
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function DocImage({ label, src, fileName, onOpen }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{label}</p>
      {src ? (
        <button type="button" onClick={() => onOpen({ src, label })} className="group block w-full text-left cursor-pointer">
          <div className="h-28 sm:h-36 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <img src={src} alt={label} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" />
          </div>
          {fileName && <p className="text-[10px] text-slate-400 mt-1 truncate">{fileName}</p>}
        </button>
      ) : (
        <div className="h-28 sm:h-36 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-1 text-slate-400">
          <ImageIcon size={16} />
          <span className="text-[11px] font-medium">{NA}</span>
        </div>
      )}
    </div>
  );
}

function DocCard({ icon: Icon, title, subtitle, status, tint = "indigo", children }) {
  const [label, cls] = STATUS_CHIP[status] || STATUS_CHIP.missing;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TINTS[tint]}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
      </div>
      {children}
    </section>
  );
}

/* ------------------------------- page ------------------------------ */

export default function MyProfilePage() {
  const { user } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [deptMap, setDeptMap] = useState({});
  const [desigMap, setDesigMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [step, setStep] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [showAcc, setShowAcc] = useState(false);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const fetchProfile = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setLoadError("");

    try {
      const [d1, d2, g1, g2, profileRes] = await Promise.allSettled([
        api.get("/departments"),
        api.get("/organization/departments"),
        api.get("/designations"),
        api.get("/organization/designations"),
        api.get("/employees/profile"),
      ]);

      const ok = (r) => (r.status === "fulfilled" ? toList(r.value) : []);
      setDeptMap({ ...buildMap(ok(d1)), ...buildMap(ok(d2)) });
      setDesigMap({ ...buildMap(ok(g1)), ...buildMap(ok(g2)) });

      let data = null;
      if (profileRes.status === "fulfilled") {
        data = profileRes.value.data?.employee || profileRes.value.data?.data || profileRes.value.data;
      } else {
        try {
          const me = await api.get("/auth/me");
          data = me.data;
        } catch { }
      }

      if (!data) {
        setLoadError("Unable to load your profile. Please try again.");
      } else {
        setHasProfile(data.hasEmployeeProfile !== false);
        setEmployee(data);
        setPhoneInput(String(data.phone || "").replace(/\D/g, "").slice(-10));
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setLoadError("Unable to load your profile. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const handleSavePhone = async () => {
    const clean = phoneInput.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setPhoneError("Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.");
      return;
    }
    setSavingPhone(true);
    setPhoneError("");
    try {
      const res = await api.put("/employees/me", { phone: clean });
      setEmployee((prev) => ({ ...prev, phone: res.data?.employee?.phone || clean }));
      setEditingPhone(false);
      toast.success("Phone number updated successfully!");
    } catch (err) {
      setPhoneError(err?.response?.data?.message || "Unable to update the phone number.");
    } finally {
      setSavingPhone(false);
    }
  };

  /* ------------------------------ data ------------------------------ */
  const emp = employee || {};

  const view = useMemo(() => {
    const name = emp.name || user?.name || "";
    const role = String(user?.role || emp.role || "employee").toLowerCase();
    const phone = String(emp.phone || "").replace(/\D/g, "").slice(-10);

    const idTypeRaw = pick(emp, ["nationalIdType", "documents.nationalIdType"]);
    const idType = idTypeRaw === "Other Official ID" ? pick(emp, ["nationalIdOther"]) || idTypeRaw : idTypeRaw;
    const legacy = pick(emp, ["nationalId", "idProofNumber"]).toUpperCase().replace(/\s/g, "");
    const savedAadhaar = digitsOnly(pick(emp, ["aadhaarNumber"]));
    const savedPan = pick(emp, ["panNumber"]).toUpperCase();

    // Older records stored one "national ID". It is sorted into Aadhaar, PAN or another ID here.
    const legacyIsPan = /pan/i.test(idType) || (!idType && PAN_RE.test(legacy));
    const legacyIsAadhaar = /aadhaa?r/i.test(idType) || (!idType && /^\d{12}$/.test(legacy));
    const legacyOther = Boolean(legacy) && !legacyIsPan && !legacyIsAadhaar && !savedAadhaar;

    const aadhaar = savedAadhaar || (legacyIsAadhaar ? digitsOnly(legacy) : "");
    const pan = savedPan || (legacyIsPan && !savedAadhaar ? legacy : "");

    const frontRaw = pick(emp, ["documents.nationalIdFrontFileData"]);
    const backRaw = pick(emp, ["documents.nationalIdBackFileData"]);
    const panNew = pick(emp, ["documents.panCardFileData"]);
    const panOnlyLegacy = legacyIsPan && !savedAadhaar && !panNew;

    return {
      name,
      role,
      phone,
      email: emp.email || user?.email || "",
      loginEmail: emp.loginEmail || user?.email || "",
      gender: titleCase(emp.gender),
      employeeId: emp.employeeId || "",
      address: [emp.address, emp.city, emp.state, emp.pincode].filter(Boolean).join(", "),
      designation: labelOf(emp.designation, desigMap),
      department: labelOf(emp.department, deptMap),
      employmentType: emp.employmentType || "",
      manager: labelOf(emp.reportingManager, {}),
      status: titleCase(emp.employeeStatus || (hasProfile ? "Active" : "")),
      exited: /exit/i.test(String(emp.employeeStatus || "")),
      joining: formatDate(emp.dateOfJoining),
      salary: formatSalary(emp.salary),
      avatar: emp.avatar || pick(emp, ["documents.passportPhotoData"]),
      doc: {
        otherLabel: legacyOther ? idType || "National ID" : "",
        idNumber: legacyOther ? legacy : aadhaar,
        isAadhaar: !legacyOther,
        front: panOnlyLegacy ? "" : frontRaw,
        back: panOnlyLegacy ? "" : backRaw,
        frontName: pick(emp, ["documents.nationalIdFrontFileName"]),
        backName: pick(emp, ["documents.nationalIdBackFileName"]),
        pan,
        panImage: panNew || (panOnlyLegacy ? frontRaw : ""),
        panName: pick(emp, ["documents.panCardFileName"]) || (panOnlyLegacy ? pick(emp, ["documents.nationalIdFrontFileName"]) : ""),
        photo: pick(emp, ["documents.passportPhotoData"]) || emp.avatar || "",
        photoName: pick(emp, ["documents.passportPhotoFileName"]),
      },
      bank: {
        accountName: pick(emp, ["bankDetails.accountName"]),
        bankName: pick(emp, ["bankDetails.bankName"]),
        branchName: pick(emp, ["bankDetails.branchName"]),
        accountNumber: pick(emp, ["bankDetails.accountNumber"]),
        ifscCode: pick(emp, ["bankDetails.ifscCode"]),
      },
    };
  }, [emp, user, desigMap, deptMap, hasProfile]);

  if (loading && !refreshing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading profile...</p>
      </div>
    );
  }

  const doc = view.doc;
  const idCount = [doc.front, doc.back].filter(Boolean).length;
  const idStatus = doc.idNumber && idCount === 2 ? "complete" : doc.idNumber || idCount ? "partial" : "missing";
  const panStatus = doc.pan && doc.panImage ? "complete" : doc.pan || doc.panImage ? "partial" : "missing";
  const idShown = !doc.idNumber
    ? ""
    : showAadhaar
      ? doc.isAadhaar ? formatAadhaar(doc.idNumber) : doc.idNumber
      : doc.isAadhaar ? maskAadhaar(doc.idNumber) : maskAccount(doc.idNumber);
  const panShown = !doc.pan ? "" : showPan ? doc.pan : maskPan(doc.pan);

  const notLinked = (
    <div className="py-10 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <Lock size={20} />
      </div>
      <p className="text-sm font-bold text-slate-700">No employee profile is linked to this account</p>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">
        Documents and bank details are stored on the employee profile. Please contact HR to link your profile.
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl space-y-4 sm:space-y-6 mx-auto px-3 sm:px-4 pb-14 font-sans antialiased text-slate-900">
      {/* Header */}
      <div className="bg-white p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
          {view.avatar ? (
            <img
              src={view.avatar}
              alt={view.name}
              onClick={() => setLightbox({ src: view.avatar, label: view.name })}
              className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl object-cover shadow-md cursor-pointer"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
              {(view.name || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{view.name || NA}</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 truncate">
              {[view.designation, view.department].filter(Boolean).join(" · ") || ROLE_LABEL[view.role] || "Staff"}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {view.employeeId && (
                <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {view.employeeId}
                </span>
              )}
              {view.status && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold border ${view.exited
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${view.exited ? "bg-rose-500" : "bg-emerald-500"}`} />
                  {view.status}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchProfile(true)}
          className="w-10 h-10 shrink-0 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
        </button>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-medium">
          <span>{loadError}</span>
          <button type="button" onClick={() => fetchProfile()} className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const active = step === idx;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStep(idx)}
              className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${active ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-7 min-h-[320px]">
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem icon={User} label="Full Name" value={view.name} tint="indigo" />
              <InfoItem icon={Mail} label="Personal Email" value={view.email} tint="sky" />
              <InfoItem icon={KeyRound} label="Login Email" value={view.loginEmail} tint="violet" />

              {/* Phone (the only field a person can edit here) */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-400">Phone Number</p>
                      {editingPhone ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={phoneInput}
                            onChange={(e) => {
                              setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10));
                              setPhoneError("");
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleSavePhone()}
                            className={`min-w-0 flex-1 text-base sm:text-xs px-3 py-1.5 bg-slate-50 border rounded-lg font-mono focus:outline-none ${phoneError ? "border-rose-400" : "border-indigo-300"}`}
                            autoFocus
                          />
                          <button type="button" onClick={handleSavePhone} disabled={savingPhone} className="p-2 bg-indigo-600 text-white rounded-md cursor-pointer disabled:opacity-60" aria-label="Save phone">
                            {savingPhone ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPhone(false);
                              setPhoneError("");
                              setPhoneInput(view.phone);
                            }}
                            className="p-2 bg-slate-200 text-slate-600 rounded-md cursor-pointer"
                            aria-label="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <p className={`text-xs sm:text-sm mt-0.5 font-mono ${view.phone ? "font-bold text-slate-800" : "font-medium text-slate-400"}`}>
                          {view.phone ? `+91 ${view.phone}` : NA}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* {!editingPhone && hasProfile && (
                    <button type="button" onClick={() => setEditingPhone(true)} className="text-slate-400 hover:text-indigo-600 p-1.5 cursor-pointer" title="Edit phone" aria-label="Edit phone">
                      <Edit3 size={15} />
                    </button>
                  )} */}
                </div>
                {phoneError && <p className="mt-2 text-[11px] font-semibold text-rose-600">{phoneError}</p>}
              </div>

              <InfoItem icon={User} label="Gender" value={view.gender} tint="violet" />
              <InfoItem icon={Hash} label="Employee ID" value={view.employeeId} tint="rose" mono />
              <InfoItem icon={MapPin} label="Address" value={view.address} tint="amber" wide />
            </div>
            <p className="text-[11px] text-slate-400">To change any other detail, please contact HR.</p>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <InfoItem icon={Briefcase} label="Designation" value={view.designation} tint="sky" />
            <InfoItem icon={Building2} label="Department" value={view.department} tint="indigo" />
            <InfoItem icon={Clock} label="Employment Type" value={view.employmentType} tint="emerald" />
            <InfoItem icon={BadgeCheck} label="Employee Status" value={view.status} tint="amber" />
            <InfoItem icon={UserCheck} label="Reporting Manager" value={view.manager} tint="violet" />
            <InfoItem icon={Calendar} label="Date of Joining" value={view.joining} tint="rose" />
            <InfoItem icon={KeyRound} label="Access Role" value={ROLE_LABEL[view.role] || titleCase(view.role)} tint="indigo" />
            <InfoItem icon={IndianRupee} label="Monthly Salary" value={view.salary} tint="emerald" mono />
          </div>
        )}

        {step === 2 &&
          (!hasProfile ? (
            notLinked
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <DocCard
                icon={IdCard}
                title={doc.otherLabel || "Aadhaar Card"}
                subtitle="Number and both sides of the card"
                status={idStatus}
                tint="indigo"
              >
                <InfoItem
                  icon={Hash}
                  label={doc.isAadhaar ? "Aadhaar Number" : `${doc.otherLabel} Number`}
                  value={idShown}
                  tint="indigo"
                  mono
                  wide
                  action={doc.idNumber ? <EyeButton shown={showAadhaar} onClick={() => setShowAadhaar((s) => !s)} /> : null}
                />
                <div className="grid grid-cols-2 gap-3">
                  <DocImage label="Front Side" src={doc.front} fileName={doc.frontName} onOpen={setLightbox} />
                  <DocImage label="Back Side" src={doc.back} fileName={doc.backName} onOpen={setLightbox} />
                </div>
              </DocCard>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
                <DocCard icon={FileText} title="PAN Card" subtitle="Number and card image" status={panStatus} tint="sky">
                  <InfoItem
                    icon={Hash}
                    label="PAN Number"
                    value={panShown}
                    tint="sky"
                    mono
                    wide
                    action={doc.pan ? <EyeButton shown={showPan} onClick={() => setShowPan((s) => !s)} /> : null}
                  />
                  <DocImage label="PAN Card Image" src={doc.panImage} fileName={doc.panName} onOpen={setLightbox} />
                </DocCard>

                <DocCard icon={Camera} title="Passport Photo" subtitle="Profile photograph" status={doc.photo ? "complete" : "missing"} tint="violet">
                  <DocImage label="Photo" src={doc.photo} fileName={doc.photoName} onOpen={setLightbox} />
                </DocCard>
              </div>
            </div>
          ))}

        {step === 3 &&
          (!hasProfile ? (
            notLinked
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <InfoItem icon={User} label="Account Holder Name" value={view.bank.accountName} tint="violet" />
              <InfoItem icon={Landmark} label="Bank Name" value={view.bank.bankName} tint="sky" />
              <InfoItem icon={Network} label="Branch Name" value={view.bank.branchName} tint="emerald" />
              <InfoItem
                icon={CreditCard}
                label="Account Number"
                value={view.bank.accountNumber ? (showAcc ? view.bank.accountNumber : maskAccount(view.bank.accountNumber)) : ""}
                tint="indigo"
                mono
                action={view.bank.accountNumber ? <EyeButton shown={showAcc} onClick={() => setShowAcc((s) => !s)} /> : null}
              />
              <InfoItem icon={Hash} label="IFSC Code" value={view.bank.ifscCode} tint="amber" mono wide />
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 px-1">
        <span className="text-xs font-semibold text-slate-500">Step {step + 1} of {TABS.length}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(s + 1, TABS.length - 1))}
            disabled={step === TABS.length - 1}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full bg-white p-4 rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setLightbox(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer" aria-label="Close">
              <X size={16} />
            </button>
            <img src={lightbox.src} alt={lightbox.label} className="w-full max-h-[75vh] object-contain rounded-xl mt-4" />
            <p className="text-center text-xs font-bold text-slate-700 mt-3">{lightbox.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}
