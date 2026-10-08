"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  ImageIcon
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

const NA = "Not provided";

const pick = (obj, paths, fallback = "") => {
  if (!obj) return fallback;
  for (const p of paths) {
    const v = p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), obj);
    if (v !== undefined && v !== null && typeof v !== "object" && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return fallback;
};

const titleCase = (s) =>
  s ? s.replace(/[_-]+/g, " ").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : "";

const formatDate = (d) => {
  if (!d) return NA;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? NA : `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
};

const formatSalary = (raw) => {
  if (raw === undefined || raw === null || raw === "") return "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const maskAccount = (n) => (n && n.length > 4 ? `${"•".repeat(Math.max(n.length - 4, 4))}${n.slice(-4)}` : n);

const TINTS = {
  indigo: "bg-indigo-50 text-indigo-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

function InfoItem({ icon: Icon, label, value, tint = "indigo", mono = false, wide = false, action }) {
  const empty = !value;
  return (
    <div className={`flex items-center gap-3.5 p-4 rounded-2xl border border-slate-200/80 bg-white ${wide ? "sm:col-span-2 xl:col-span-3" : ""}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TINTS[tint]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
        <p className={`text-xs sm:text-sm mt-0.5 ${wide ? "break-words" : "truncate"} ${mono ? "font-mono" : ""} ${empty ? "text-slate-400 font-medium" : "text-slate-800 font-bold"}`}>
          {value || NA}
        </p>
      </div>
      {action}
    </div>
  );
}

function DocImage({ label, src, fileName, onOpen }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 mb-1.5">{label}</p>
      {src ? (
        <button
          type="button"
          onClick={() => onOpen({ src, label })}
          className="group block w-full text-left cursor-pointer"
        >
          <div className="h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <img src={src} alt={label} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" />
          </div>
          {fileName && <p className="text-[10px] text-slate-400 mt-1 truncate">{fileName}</p>}
        </button>
      ) : (
        <div className="h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-1 text-slate-400">
          <ImageIcon size={16} />
          <span className="text-[11px] font-medium">{NA}</span>
        </div>
      )}
    </div>
  );
}

export default function MyProfilePage() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Tab Index for wizard style (0: personal, 1: job, 2: documents, 3: banking)
  const [activeStep, setActiveStep] = useState(0);
  const stepsKeys = ["personal", "job", "documents", "banking"];

  // Modal states
  const [lightbox, setLightbox] = useState(null);
  const [showAcc, setShowAcc] = useState(false);

  // Phone edit states
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);

  const extractPhoneNumber = useCallback((data) => {
    if (!data) return "";
    return data.phone || data.phoneNumber || data.mobile || data.contact || data.employee?.phone || "";
  }, []);

  const extractData = (resData) => {
    if (!resData) return null;
    return resData?.employee || resData?.user || resData?.data || resData;
  };

  const fetchProfile = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      try {
        const deptRes = await api.get("/departments");
        setDepartmentsList(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.departments || []);
      } catch { }

      let profileData = null;
      try {
        const res = await api.get("/employees/profile");
        profileData = extractData(res.data);
      } catch {
        const empId = user?.employee?._id || user?.employee || user?._id || user?.id;
        if (empId) {
          try {
            const res = await api.get(`/employees/${empId}`);
            profileData = extractData(res.data);
          } catch {
            try {
              const res = await api.get("/auth/me");
              profileData = extractData(res.data);
            } catch { }
          }
        }
      }

      const finalPhone = extractPhoneNumber(profileData) || extractPhoneNumber(user) || "";
      setEmployee({ ...(user || {}), ...(profileData || {}), phone: finalPhone });
      setPhoneInput(finalPhone);
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, extractPhoneNumber]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  const handleSavePhone = async () => {
    const cleanPhone = phoneInput.trim();
    if (!cleanPhone) {
      toast.warning("Kripya valid phone number enter karein");
      return;
    }

    setUpdatingPhone(true);
    try {
      const empDbId = employee?._id || user?.employee?._id || user?._id;
      const payload = { phone: cleanPhone, phoneNumber: cleanPhone, mobile: cleanPhone };
      await api.put("/employees/me/update", payload).catch(() => api.put(`/employees/${empDbId}`, payload));

      setEmployee((prev) => ({ ...prev, phone: cleanPhone, phoneNumber: cleanPhone }));
      setEditingPhone(false);
      toast.success("Phone number successfully update ho gaya!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Phone number update nahi ho paya.");
    } finally {
      setUpdatingPhone(false);
    }
  };

  const emp = employee || {};
  const authUser = user || {};

  const displayName = emp.name || emp.fullName || authUser.name || authUser.username || "Staff Member";
  const displayEmail = emp.email || authUser.email || "";
  const displayPhone = extractPhoneNumber(emp) || extractPhoneNumber(authUser) || "";
  const gender = titleCase(pick(emp, ["gender"]));
  const employeeId = emp.employeeId || emp.empId || authUser.employeeId || "EMP-006";

  const fullAddress = [pick(emp, ["address"]), pick(emp, ["city"]), pick(emp, ["state"]), pick(emp, ["pincode"])].filter(Boolean).join(", ");
  const designation = emp.designation || emp.jobTitle || "Full Stack Developer";
  const department = typeof emp.department === "object" ? emp.department?.name : (emp.department || "Human Resources");
  const employmentType = pick(emp, ["employmentType"]) || "Permanent";
  const statusLabel = emp.isExited ? "Exited" : "Active";
  const avatar = emp.avatar || emp.profilePhotoData || "";

  const docs = {
    idType: pick(emp, ["nationalIdType", "documents.nationalIdType"]) || "National ID",
    idNumber: pick(emp, ["nationalId", "idProofNumber"]),
    front: pick(emp, ["documents.nationalIdFrontFileData", "nationalIdFrontFileData"]),
    frontName: pick(emp, ["documents.nationalIdFrontFileName", "nationalIdFrontFileName"]),
    back: pick(emp, ["documents.nationalIdBackFileData", "nationalIdBackFileData"]),
    backName: pick(emp, ["documents.nationalIdBackFileName", "nationalIdBackFileName"]),
    photo: pick(emp, ["documents.passportPhotoData", "passportPhotoData", "avatar"]),
  };

  const bank = {
    accountName: pick(emp, ["bankDetails.accountName", "accountName"]),
    bankName: pick(emp, ["bankDetails.bankName", "bankName"]),
    branchName: pick(emp, ["bankDetails.branchName", "branchName"]),
    accountNumber: pick(emp, ["bankDetails.accountNumber", "accountNumber"]),
    ifscCode: pick(emp, ["bankDetails.ifscCode", "ifscCode"]),
  };

  if (loading && !refreshing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6 mx-auto pb-14 font-sans antialiased text-slate-900 animate-in fade-in duration-200">
      {/* Top Profile Header Card (Exact Image Match) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 sm:gap-5">
          {avatar ? (
            <img src={avatar} alt={displayName} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{displayName}</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {designation} · {department}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                {employeeId}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold ${emp.isExited ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${emp.isExited ? "bg-rose-500" : "bg-emerald-500"}`} />
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => { fetchProfile(true); toast.info("Synced!"); }}
            className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Sync Record"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* Step Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: "personal", label: "Personal", icon: User },
          { id: "job", label: "Job", icon: Briefcase },
          { id: "documents", label: "Documents", icon: FileText },
          { id: "banking", label: "Banking", icon: Landmark },
        ].map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeStep === idx;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 min-h-[320px]">
        {stepsKeys[activeStep] === "personal" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={User} label="Full Name" value={displayName} tint="indigo" />
            <InfoItem icon={Mail} label="Email Address" value={displayEmail} tint="sky" />

            {/* Editable Phone */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-400">Phone Number</p>
                  {editingPhone ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="text-xs px-3 py-1.5 bg-slate-50 border border-indigo-300 rounded-lg font-mono focus:outline-none"
                        autoFocus
                      />
                      <button onClick={handleSavePhone} disabled={updatingPhone} className="p-1.5 bg-indigo-600 text-white rounded-md cursor-pointer">
                        {updatingPhone ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button onClick={() => setEditingPhone(false)} className="p-1.5 bg-slate-200 text-slate-600 rounded-md cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-0.5">{displayPhone || NA}</p>
                  )}
                </div>
              </div>
              {!editingPhone && (
                <button onClick={() => setEditingPhone(true)} className="text-slate-400 hover:text-indigo-600 p-1.5 cursor-pointer" title="Edit phone">
                  <Edit3 size={15} />
                </button>
              )}
            </div>

            <InfoItem icon={User} label="Gender" value={gender} tint="violet" />
            <InfoItem icon={Hash} label="Employee ID" value={employeeId} tint="rose" mono />
            <InfoItem icon={MapPin} label="Address" value={fullAddress} tint="amber" wide />
          </div>
        )}

        {stepsKeys[activeStep] === "job" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={Briefcase} label="Designation" value={designation} tint="sky" />
            <InfoItem icon={Building2} label="Department" value={department} tint="indigo" />
            <InfoItem icon={Clock} label="Employment Type" value={employmentType} tint="emerald" />
            <InfoItem icon={Building2} label="Status" value={statusLabel} tint="amber" />
            <InfoItem icon={Calendar} label="Date of Joining" value={formatDate(emp.dateOfJoining || emp.joiningDate)} tint="rose" />
            <InfoItem icon={IndianRupee} label="Monthly Salary" value={formatSalary(emp.salary)} tint="emerald" mono />
          </div>
        )}

        {stepsKeys[activeStep] === "documents" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 mb-3">Identification Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={IdCard} label={docs.idType} value={docs.idNumber} tint="indigo" mono />
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 mb-3">ID Card Documents</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DocImage label="Front Side" src={docs.front} fileName={docs.frontName} onOpen={setLightbox} />
                <DocImage label="Back Side" src={docs.back} fileName={docs.backName} onOpen={setLightbox} />
              </div>
            </div>
          </div>
        )}

        {stepsKeys[activeStep] === "banking" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={User} label="Account Name" value={bank.accountName} tint="violet" />
            <InfoItem icon={Landmark} label="Bank Name" value={bank.bankName} tint="sky" />
            <InfoItem icon={Network} label="Branch Name" value={bank.branchName} tint="emerald" />
            <InfoItem
              icon={CreditCard}
              label="Account Number"
              value={bank.accountNumber ? (showAcc ? bank.accountNumber : maskAccount(bank.accountNumber)) : ""}
              tint="indigo"
              mono
              action={
                bank.accountNumber && (
                  <button onClick={() => setShowAcc((s) => !s)} className="text-slate-400 hover:text-indigo-600 cursor-pointer">
                    {showAcc ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )
              }
            />
            <InfoItem icon={Hash} label="IFSC Code" value={bank.ifscCode} tint="amber" mono />
          </div>
        )}
      </div>

      {/* Footer Navigation Bar (Step 1 of 4 with Back & Next Buttons) */}
      <div className="flex items-center justify-between pt-2 px-2">
        <span className="text-xs font-semibold text-slate-500">
          Step {activeStep + 1} of 4
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
            disabled={activeStep === 0}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={() => setActiveStep((prev) => Math.min(prev + 1, stepsKeys.length - 1))}
            disabled={activeStep === stepsKeys.length - 1}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full bg-white p-4 rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer">
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