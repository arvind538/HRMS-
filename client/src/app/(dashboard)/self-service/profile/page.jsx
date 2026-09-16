"use client";
import { useEffect, useState } from "react";
import { Loader2, Mail, Phone, Briefcase, Calendar, ShieldCheck, UserX, UserCheck } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function MyProfilePage() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get('/employees/profile');
        setEmployee(res.data);
      } catch (err) {
        console.error("Profile fetch error:", err.response?.data || err.message);
        setError(
          err.response?.data?.message ||
          "Failed to load profile details."
        );
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <UserX size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Profile Unavailable</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md mx-auto">
            {error || "Could not retrieve employee profile data."}
          </p>
        </div>
      </div>
    );
  }

  // Fallback values mapping from both employee API and Auth User context
  const displayName = employee.name || user?.name || "User";
  const displayEmail = employee.email || user?.email || "—";
  const displayPhone = employee.phone || user?.phone || user?.phoneNumber || "—";
  const displayDesignation = employee.designation || user?.role || "Staff Member";
  const displayDepartment = typeof employee.department === 'object'
    ? employee.department?.name
    : (employee.department || user?.department || "—");

  return (
    <div className="max-w-2xl space-y-6 mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-xs text-slate-500 mt-1">View your official employment record, corporate credentials, and personal details.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 font-extrabold text-2xl flex items-center justify-center shadow-inner shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{displayName}</h2>
            <p className="text-xs font-semibold text-indigo-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1"><Briefcase size={13} /> {displayDesignation}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 font-medium">ID: {employee.employeeId || employee._id || user?.id || "N/A"}</span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck size={13} /> Active
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
          <div className="flex items-start gap-3.5 p-3 rounded-xl transition-colors duration-200 hover:bg-slate-50">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5"><Mail size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</p>
              <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{displayEmail}</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl transition-colors duration-200 hover:bg-slate-50">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5"><Phone size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</p>
              <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{displayPhone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl transition-colors duration-200 hover:bg-slate-50">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5"><Briefcase size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department / Role</p>
              <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">
                {displayDepartment}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl transition-colors duration-200 hover:bg-slate-50">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5"><Calendar size={16} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date of Joining</p>
              <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">
                {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}