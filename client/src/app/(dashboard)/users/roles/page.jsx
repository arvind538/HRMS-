"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCog,
  Briefcase,
  UserCheck,
  Info,
  ArrowUpRight,
  Lock
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Link from "next/link";

const ROLE_CATALOG = {
  admin: {
    label: "Administrator",
    badge: "Full Access",
    tagline: "Unrestricted infrastructure & tenant authority",
    description:
      "Possesses complete administrative control over all organization workspaces, security policies, global configurations, and user credentials.",
    permissions: [
      "Manage all system accounts and role assignments",
      "Configure global security parameters and policies",
      "Audit system telemetry, logs, and compliance reports",
      "Oversee all employee records and structural units"
    ],
    icon: ShieldAlert,
    accent: {
      badge: "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10",
      border: "border-slate-200/80 hover:border-rose-300 hover:shadow-rose-500/5",
      iconBg: "bg-rose-50 text-rose-600",
      iconColor: "text-rose-600",
    },
  },
  hr: {
    label: "HR Specialist",
    badge: "People Operations",
    tagline: "Workforce lifecycle & personnel management",
    description:
      "Manages employee directory records, executes recruitment lifecycles, calculates payroll distributions, and handles organization-wide leave requests.",
    permissions: [
      "Create and maintain core employee directory records",
      "Execute onboarding, offboarding, and assignments",
      "Review organization leave requests and payouts",
      "Supervise personnel files and compensation logs"
    ],
    icon: UserCog,
    accent: {
      badge: "bg-purple-50 text-purple-700 border-purple-200/80 ring-purple-500/10",
      border: "border-slate-200/80 hover:border-purple-300 hover:shadow-purple-500/5",
      iconBg: "bg-purple-50 text-purple-600",
      iconColor: "text-purple-600",
    },
  },
  manager: {
    label: "Team Manager",
    badge: "Direct Oversight",
    tagline: "Departmental execution & team validation",
    description:
      "Provides supervisory oversight for direct reports, approves departmental time-off, reviews operational expenses, and tracks productivity metrics.",
    permissions: [
      "Approve team leave and time-off applications",
      "Authorize departmental expense claims",
      "Monitor attendance logs and scheduling consistency",
      "Access team performance analytics and records"
    ],
    icon: Briefcase,
    accent: {
      badge: "bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10",
      border: "border-slate-200/80 hover:border-amber-300 hover:shadow-amber-500/5",
      iconBg: "bg-amber-50 text-amber-600",
      iconColor: "text-amber-600",
    },
  },
  employee: {
    label: "Staff Member",
    badge: "Self-Service",
    tagline: "Individual contributor portal access",
    description:
      "Operates within an employee self-service workspace to log work hours, submit absence requests, view payslips, and update personal profiles.",
    permissions: [
      "Clock in/out and review personal punch logs",
      "Submit leave applications and track review statuses",
      "Download monthly payslips and tax summaries",
      "Maintain personal details and emergency contacts"
    ],
    icon: UserCheck,
    accent: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/10",
      border: "border-slate-200/80 hover:border-emerald-300 hover:shadow-emerald-500/5",
      iconBg: "bg-emerald-50 text-emerald-600",
      iconColor: "text-emerald-600",
    },
  },
};

export default function RolesPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get("/users")
      .then(({ data }) => {
        if (isMounted) setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to load user directory.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const countsByRole = useMemo(() => {
    const counts = { admin: 0, hr: 0, manager: 0, employee: 0 };
    users.forEach((u) => {
      if (counts[u.role] !== undefined) {
        counts[u.role] += 1;
      }
    });
    return counts;
  }, [users]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Synchronizing Permissions</p>
          <p className="text-xs text-slate-500 mt-0.5">Fetching role allocations and assigned users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-4 py-4 space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Lock size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Access Roles & Permissions
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              4 Built-in Tiers
            </span>
          </div>
          <p className="text-sm text-slate-500 pl-1">
            Review the systemic authorization matrix, functional scope, and active user distribution across your organization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group"
          >
            <Users size={16} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
            <span>Manage Users</span>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Roles Grid Cards with Smooth Hover Effects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(ROLE_CATALOG).map(([key, info]) => {
          const userCount = countsByRole[key] || 0;
          const IconComponent = info.icon;

          return (
            <div
              key={key}
              className={`group relative bg-white rounded-2xl border ${info.accent.border} shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden`}
            >
              <div className="p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl border border-slate-200/60 ${info.accent.iconBg} shadow-2xs group-hover:scale-105 transition-transform duration-300`}>
                      <IconComponent size={24} className={info.accent.iconColor} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          {info.label}
                        </h2>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs ${info.accent.badge}`}>
                          {info.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {info.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                    <div className="text-xl font-extrabold tracking-tight text-slate-900 font-mono">
                      {userCount}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {userCount === 1 ? "Active User" : "Active Users"}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {info.description}
                </p>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Included Capabilities
                  </span>
                  <ul className="space-y-2">
                    {info.permissions.map((perm, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                        <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="font-medium">{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs transition-colors group-hover:bg-slate-100/60">
                <span className="text-slate-500 font-medium">
                  System key: <code className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shadow-2xs">{key}</code>
                </span>
                <Link
                  href={`/users?role=${key}`}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group/link"
                >
                  <span>Filter users</span>
                  <ArrowUpRight size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Notice Banner */}
      <div className="rounded-2xl bg-slate-900 text-slate-300 border border-slate-800 p-5 flex items-start sm:items-center gap-4 text-xs sm:text-sm shadow-md">
        <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700/50 shrink-0">
          <Info size={18} />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-white text-xs sm:text-sm">
            Immutable Architecture Notice
          </p>
          <p className="text-slate-400 text-xs leading-relaxed font-normal">
            Role definitions and permissions are securely compiled into the backend database schema. Introducing custom roles requires updating the server-side role enumeration and route-guard middleware.
          </p>
        </div>
      </div>
    </div>
  );
}