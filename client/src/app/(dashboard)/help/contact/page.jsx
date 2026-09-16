"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  Mail,
  Phone,
  Users,
  Building2,
  LifeBuoy,
  Search,
  Clock,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Ticket,
  X
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const getInitials = (name) => {
  if (!name) return "HR";
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
};

export default function ContactHRPage() {
  const [hrContacts, setHrContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    api.get("/employees")
      .then(({ data }) => {
        if (!isMounted) return;

        // 1. DATA EXTRACTION FIX: Backend data format handle karna
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data?.employees && Array.isArray(data.employees)) {
          list = data.employees;
        } else if (data?.data && Array.isArray(data.data)) {
          list = data.data;
        }

        // 2. BROAD FILTERING FIX: Designation, Department aur Role teeno check karna
        const filtered = list.filter((e) => {
          const designation = (e.designation || "").toLowerCase();
          const role = (e.role || "").toLowerCase();
          const department = typeof e.department === "string"
            ? e.department.toLowerCase()
            : (e.department?.name || "").toLowerCase();

          return (
            designation.includes("hr") ||
            designation.includes("human resource") ||
            department.includes("hr") ||
            department.includes("human resource") ||
            role === "hr" ||
            role === "admin" // Kayi baar startup me admin hi HR hota hai
          );
        });

        setHrContacts(filtered);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to load HR contacts directory.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return hrContacts;
    return hrContacts.filter((hr) => {
      const name = hr.name?.toLowerCase() || "";
      const email = hr.email?.toLowerCase() || "";
      const designation = hr.designation?.toLowerCase() || "";
      const department = typeof hr.department === "string"
        ? hr.department.toLowerCase()
        : hr.department?.name?.toLowerCase() || "";
      return name.includes(q) || email.includes(q) || designation.includes(q) || department.includes(q);
    });
  }, [hrContacts, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">Accessing People Operations Directory</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Fetching designated contact representatives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 antialiased">
      {/* Light Clean Enterprise Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-slate-50 border border-slate-100/60 pointer-events-none -z-0" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wider">
            <Users size={13} className="text-indigo-600" />
            <span>People & Culture Operations</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Human Resources Directory
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Connect directly with verified People Operations personnel for employee relations, compensation policies, benefits queries, and internal mediation.
          </p>

          {/* Quick Search */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-4 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by HR personnel name, designation, or email..."
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50/80 hover:bg-slate-50 text-sm font-medium rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Directory Metrics & Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Designated Representatives
          </h2>
          <p className="text-xs font-medium text-slate-500">
            Authorized points of contact for official organizational inquiries
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Standard Desk Hours: 09:30 - 18:30 IST
          </span>
          <span className="hidden sm:inline-block text-slate-300">•</span>
          <span>{filteredContacts.length} Personnel Listed</span>
        </div>
      </div>

      {/* Personnel Grid */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
            <Users size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">No Matching Contacts Located</h3>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No personnel profiles matched the search criteria "${searchQuery}".`
                : "No employee profiles are currently registered under the Human Resources department."}
            </p>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Reset Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredContacts.map((hr) => {
            const initials = getInitials(hr.name);
            const departmentLabel = typeof hr.department === "string"
              ? hr.department
              : hr.department?.name || "Human Resources";

            return (
              <div
                key={hr._id}
                className="group relative bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar Thumbnail */}
                    <div className="relative shrink-0">
                      {hr.avatar ? (
                        <img
                          src={hr.avatar}
                          alt={hr.name}
                          className="w-13 h-13 rounded-2xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-base flex items-center justify-center border border-indigo-200 shadow-xs" style={{ width: '52px', height: '52px' }}>
                          {initials}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Active on duty" />
                    </div>

                    {/* Member Credentials */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-base truncate group-hover:text-indigo-600 transition-colors">
                          {hr.name}
                        </h3>
                        {hr.employeeId && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {hr.employeeId}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-indigo-600 mt-0.5 truncate">
                        {hr.designation || "HR Operations Specialist"}
                      </p>

                      <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-1">
                        <Building2 size={12} />
                        <span className="truncate">{departmentLabel}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <a
                    href={`mailto:${hr.email}`}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors flex-1"
                  >
                    <Mail size={14} className="text-indigo-600" />
                    <span className="truncate">{hr.email}</span>
                  </a>

                  {hr.phone ? (
                    <a
                      href={`tel:${hr.phone}`}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors"
                      title="Direct Phone Line"
                    >
                      <Phone size={14} className="text-emerald-600" />
                      <span>{hr.phone}</span>
                    </a>
                  ) : (
                    <Link
                      href="/help/tickets"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                    >
                      <Ticket size={13} />
                      <span>Open Ticket</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Escalation & SLA Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 hidden sm:flex">
            <LifeBuoy size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">
              Formal Dispute or Urgent HR Escalation?
            </h4>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Official requests logged through the support ticketing system are bound by company SLA response targets.
            </p>
          </div>
        </div>

        <Link
          href="/help/tickets"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all shrink-0"
        >
          <Ticket size={15} />
          <span>Raise Priority Ticket</span>
        </Link>
      </div>
    </div>
  );
}