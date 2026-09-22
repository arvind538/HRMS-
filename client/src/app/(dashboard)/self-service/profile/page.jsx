"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  UserX,
  RefreshCw,
  Sparkles,
  Building2,
  BadgeCheck,
  Edit3,
  Check,
  X,
  Shield,
  IdCard,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

export default function MyProfilePage() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Phone edit states
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Helper to extract phone number across multiple schema formats
  const extractPhoneNumber = useCallback((data) => {
    if (!data) return "";
    return (
      data.phone ||
      data.phoneNumber ||
      data.mobile ||
      data.contact ||
      data.contactNumber ||
      data.emergencyContact ||
      data.employee?.phone ||
      data.employee?.phoneNumber ||
      data.employee?.mobile ||
      data.user?.phone ||
      data.user?.phoneNumber ||
      ""
    );
  }, []);

  const extractData = (resData) => {
    if (!resData) return null;
    return resData?.employee || resData?.user || resData?.data || resData;
  };

  const fetchProfile = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // 1. Fetch departments (optional)
      try {
        const deptRes = await api.get("/departments");
        const dList = Array.isArray(deptRes.data)
          ? deptRes.data
          : deptRes.data?.departments || deptRes.data?.data || [];
        setDepartmentsList(dList);
      } catch {
        // Optional
      }

      // 2. Fetch profile from server
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
            } catch {
              // Fallback to auth context
            }
          }
        }
      }

      // Preserve phone across objects
      const serverPhone = extractPhoneNumber(profileData);
      const authPhone = extractPhoneNumber(user);
      const finalPhone = serverPhone || authPhone || "";

      const merged = {
        ...(user || {}),
        ...(profileData || {}),
        phone: finalPhone,
        phoneNumber: finalPhone,
      };

      setEmployee(merged);
      setPhoneInput(finalPhone);
    } catch (err) {
      console.error("Profile fetch error:", err);
      const fallbackPhone = extractPhoneNumber(user);
      if (user) {
        setEmployee({ ...user, phone: fallbackPhone });
        setPhoneInput(fallbackPhone);
      } else {
        setError("Failed to load profile details.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, extractPhoneNumber]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Robust Phone Save Handler
  const handleSavePhone = async () => {
    const cleanPhone = phoneInput.trim();
    if (!cleanPhone) {
      toast.warning("Please enter a valid phone number");
      return;
    }

    setUpdatingPhone(true);
    try {
      const empDbId = employee?._id || user?.employee?._id || user?._id;
      let success = false;

      const payload = {
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        mobile: cleanPhone,
      };

      // Attempt 1: Specific self-update route
      try {
        await api.put("/employees/me/update", payload);
        success = true;
      } catch {
        // Attempt 2: Employee ID route
        if (empDbId) {
          try {
            await api.put(`/employees/${empDbId}`, payload);
            success = true;
          } catch {
            // Attempt 3: User update route
            await api.put(`/users/${empDbId}`, payload);
            success = true;
          }
        }
      }

      if (success) {
        setEmployee((prev) => ({
          ...prev,
          phone: cleanPhone,
          phoneNumber: cleanPhone,
          mobile: cleanPhone,
        }));
        setEditingPhone(false);
        toast.success("Phone number saved successfully!");
      }
    } catch (err) {
      console.error("Phone update error:", err);
      toast.error(err.response?.data?.message || "Failed to update phone number.");
    } finally {
      setUpdatingPhone(false);
    }
  };

  const emp = employee || {};
  const authUser = user || {};

  const displayName =
    emp.name || emp.fullName || authUser.name || authUser.username || "Staff Member";
  const displayEmail = emp.email || authUser.email || "—";
  const displayPhone = extractPhoneNumber(emp) || extractPhoneNumber(authUser) || "—";

  const rawRole = emp.role || authUser.role;
  const roleName = typeof rawRole === "object" ? rawRole?.name || rawRole?.title : rawRole;
  const isSuperAdmin = String(roleName).toLowerCase().includes("admin");

  const displayDesignation =
    emp.designation ||
    emp.jobTitle ||
    (isSuperAdmin ? "Administrator" : roleName ? String(roleName).toUpperCase() : "Staff Member");

  const displayDepartment = useMemo(() => {
    const rawDept = emp.department || authUser.department;

    if (typeof rawDept === "object" && rawDept !== null) {
      return rawDept.name || rawDept.title || rawDept.departmentName || "General Operations";
    }
    if (typeof rawDept === "string" && rawDept.trim()) {
      const matched = departmentsList.find(
        (d) => String(d._id) === String(rawDept.trim()) || String(d.id) === String(rawDept.trim())
      );
      if (matched) return matched.name || matched.title;
      return rawDept.trim();
    }
    return isSuperAdmin ? "Executive Administration" : "Operations & Services";
  }, [emp.department, authUser.department, departmentsList, isSuperAdmin]);

  const displayId =
    emp.employeeId ||
    emp.empId ||
    emp.code ||
    authUser.employeeId ||
    (emp._id ? `EMP${String(emp._id).slice(-4).toUpperCase()}` : "EMP0006");

  const rawDate = emp.dateOfJoining || emp.joiningDate || emp.createdAt || authUser.createdAt;
  const displayJoiningDate =
    rawDate && !isNaN(new Date(rawDate).getTime())
      ? new Date(rawDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      : "Active Member";

  if (loading && !refreshing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Synchronizing profile record...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 mx-auto pb-14 font-sans antialiased text-slate-900 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              My Profile
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 font-mono">
              <Sparkles size={12} className="text-indigo-600" /> Verified Record
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View your official employment details, corporate credentials, and contact records.
          </p>
        </div>

        <button
          onClick={() => {
            fetchProfile(true);
            toast.info("Refreshed profile record.");
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          <span>Sync Record</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Identity Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0 uppercase font-mono">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                  {displayName}
                </h2>
                <BadgeCheck size={20} className="text-indigo-600 shrink-0" />
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100/80 font-mono text-[11px] capitalize">
                  {displayDesignation}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-600 font-semibold flex items-center gap-1">
                  <IdCard size={13} className="text-slate-400" /> ID: {displayId}
                </span>
              </div>
            </div>
          </div>

          <div className="self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider font-mono shadow-2xs">
              <ShieldCheck size={14} className="text-emerald-600" /> Active Account
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Email Address */}
          <div className="group flex items-start gap-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shrink-0">
              <Mail size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                Email Address
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate mt-1 font-mono">
                {displayEmail}
              </p>
            </div>
          </div>

          {/* Phone Number with Persistent Value Display */}
          <div className="group flex items-start gap-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:bg-sky-600 group-hover:text-white transition-all duration-200 shrink-0">
              <Phone size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                  Phone Number
                </p>
                {!editingPhone && (
                  <button
                    onClick={() => {
                      setPhoneInput(displayPhone !== "—" ? displayPhone : "");
                      setEditingPhone(true);
                    }}
                    className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded-lg transition-all duration-150 cursor-pointer"
                    title="Edit Phone"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </div>

              {editingPhone ? (
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    autoFocus
                  />
                  <button
                    onClick={handleSavePhone}
                    disabled={updatingPhone}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {updatingPhone ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingPhone(false)}
                    className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <p
                  className={`text-xs sm:text-sm font-semibold truncate mt-1 font-mono ${displayPhone === "—" ? "text-slate-400 italic" : "text-slate-800 font-bold"
                    }`}
                >
                  {displayPhone}
                </p>
              )}
            </div>
          </div>

          {/* Department / Division */}
          <div className="group flex items-start gap-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-all duration-200 shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                Department / Division
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate mt-1">
                {displayDepartment}
              </p>
            </div>
          </div>

          {/* Date of Joining */}
          <div className="group flex items-start gap-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all duration-200 shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                Date of Joining
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate mt-1 font-mono">
                {displayJoiningDate}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-950 font-medium">
            <Shield size={16} className="text-indigo-600 shrink-0" />
            <span>Role Permissions Level:</span>
            <strong className="font-bold uppercase tracking-wider text-indigo-700 font-mono">
              {roleName || "ADMIN"}
            </strong>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline-block font-mono">
            Portal Access Granted
          </span>
        </div>
      </div>
    </div>
  );
}