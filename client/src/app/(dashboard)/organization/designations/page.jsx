"use client";

import React, { useState, useEffect, useMemo } from "react";
import EntityManager from "@/components/EntityManager";
import {
    Briefcase,
    ShieldCheck,
    Award,
    Search,
    X,
    Eye,
    Trash2,
    Calendar,
    Building2,
    Loader2,
} from "lucide-react";

export default function DesignationsPage() {
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDesignation, setSelectedDesignation] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    async function fetchDesignationsMetrics() {
        try {
            setLoading(true);
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await fetch(
                `${baseUrl.replace(/\/$/, "")}/organization/designations`,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (res.ok) {
                const json =
                    typeof res.json === "function" ? await res.json() : res;
                const dataList = Array.isArray(json)
                    ? json
                    : json.data || json.result || json.items || [];
                setDesignations(dataList);
            }
        } catch (error) {
            console.error("Failed to fetch designations metrics:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDesignationsMetrics();
    }, []);

    const totalDesignations = designations.length;
    const activeRoles = designations.filter(
        (d) =>
            d.isActive === true ||
            d.isActive === "Active" ||
            d.status === "active"
    ).length;
    const uniqueSeniorities = new Set(
        designations.map((d) => d.level).filter(Boolean)
    ).size;

    const filteredDesignations = useMemo(() => {
        if (!searchQuery.trim()) return designations;
        const q = searchQuery.toLowerCase().trim();
        return designations.filter((d) => {
            const title = (d.title || d.name || "").toLowerCase();
            const level = (d.level || "").toLowerCase();
            const dept =
                typeof d.department === "object"
                    ? (d.department?.name || "").toLowerCase()
                    : String(d.department || "").toLowerCase();
            return title.includes(q) || level.includes(q) || dept.includes(q);
        });
    }, [designations, searchQuery]);

    const handleDeleteDesignation = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this designation?"))
            return;

        setDeletingId(id);
        try {
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await fetch(
                `${baseUrl.replace(/\/$/, "")}/organization/designations/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (res.ok) {
                setDesignations((prev) =>
                    prev.filter((d) => (d._id || d.id) !== id)
                );
            }
        } catch (err) {
            console.error("Failed to delete designation:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const getDesignationInitials = (title) => {
        if (title) {
            const parts = title.trim().split(" ").filter(Boolean);
            return parts.length > 1
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : title.slice(0, 2).toUpperCase();
        }
        return "DS";
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6 bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                        <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                            Corporate Designations
                        </h1>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                            Manage professional job titles, departmental affiliations, seniority tiers, and role hierarchies.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">
                            Total Designations
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : totalDesignations.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-emerald-600 uppercase">
                            Active Roles
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : activeRoles.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl border border-emerald-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group sm:col-span-2 lg:col-span-1">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-blue-500 uppercase">
                            Seniority Tiers
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : uniqueSeniorities.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl border border-blue-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>
            </div>

            {/* MOBILE & TABLET CARD VIEW (Exact Screenshot Layout) */}
            <div className="block md:hidden space-y-3">
                {/* Mobile Search Bar */}
                <div className="relative w-full">
                    <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search designations or department..."
                        className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
                        <Loader2 className="animate-spin text-indigo-600" size={24} />
                        <span className="text-xs font-semibold">
                            Loading designation cards...
                        </span>
                    </div>
                ) : filteredDesignations.length === 0 ? (
                    <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs font-semibold">
                        No matching designations found.
                    </div>
                ) : (
                    filteredDesignations.map((desig) => {
                        const id = desig._id || desig.id;
                        const title = desig.title || desig.name || "Designation";
                        const deptName =
                            typeof desig.department === "object"
                                ? desig.department?.name
                                : desig.department || "General Division";
                        const level = desig.level || "Mid";
                        const dateStr = desig.createdAt
                            ? new Date(desig.createdAt).toLocaleDateString("en-US")
                            : desig.updatedAt
                                ? new Date(desig.updatedAt).toLocaleDateString("en-US")
                                : "09/24/2026";
                        const isDeleting = deletingId === id;
                        const isActive =
                            desig.isActive === true ||
                            desig.isActive === "Active" ||
                            desig.status === "active";
                        const statusLabel = isActive ? "ACTIVE" : "INACTIVE";

                        return (
                            <div
                                key={id}
                                onClick={() => setSelectedDesignation(desig)}
                                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 cursor-pointer hover:border-indigo-300 transition-all"
                            >
                                {/* Top Row: Avatar + Title + Status Pill */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-rose-50/80 border border-rose-100 text-rose-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                                            {getDesignationInitials(title)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate leading-tight">
                                                {title}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {deptName}
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${isActive
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border-rose-200"
                                            }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"
                                                }`}
                                        />
                                        <span>{statusLabel}</span>
                                    </span>
                                </div>

                                {/* Middle Row: Seniority Tier Badge + Date */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5 truncate text-[11px]">
                                        <Award size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate font-semibold text-slate-600">
                                            {level} Tier
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400 shrink-0">
                                        <Calendar size={12} className="text-slate-400" />
                                        <span>{dateStr}</span>
                                    </div>
                                </div>

                                {/* Bottom Action Bar: Details + Delete */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDesignation(desig);
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 transition"
                                    >
                                        <Eye size={13} />
                                        <span>Details</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteDesignation(id, e)}
                                        disabled={isDeleting}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Delete Designation"
                                    >
                                        {isDeleting ? (
                                            <Loader2
                                                size={15}
                                                className="animate-spin text-rose-600"
                                            />
                                        ) : (
                                            <Trash2 size={15} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* DESKTOP FULL ENTITY MANAGER VIEW */}
            <div className="hidden md:block bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-2 sm:p-3 transition-all duration-300 hover:shadow-md">
                <EntityManager
                    title="Department Designations"
                    subtitle="Manage corporate units, departmental codes, and team leads efficiently."
                    endpoint="designations"
                    primaryKey="_id"
                    layout="table"
                    hoverEffect={true}
                    responsive={true}
                    columns={[
                        {
                            key: "title",
                            label: "Designation Title",
                            bold: true,
                            searchable: true,
                            render: (val, row) => (
                                <span className="font-semibold text-slate-900">
                                    {row?.title || val}
                                </span>
                            ),
                        },
                        {
                            key: "department",
                            label: "Department",
                            searchable: true,
                            render: (val, row) => {
                                const deptName =
                                    typeof row?.department === "object"
                                        ? row?.department?.name
                                        : val || "General";
                                return (
                                    <span className="text-slate-700 font-medium">
                                        {deptName}
                                    </span>
                                );
                            },
                        },
                        {
                            key: "level",
                            label: "Job Level",
                            render: (val, row) => (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                    {row?.level || val || "N/A"}
                                </span>
                            ),
                        },
                        {
                            key: "isActive",
                            label: "Status",
                            render: (val, row) => {
                                const active =
                                    row?.isActive ?? row?.status === "active" ?? true;
                                return (
                                    <span
                                        className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors ${active
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                                            : "bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                                            }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${active ? "bg-emerald-500" : "bg-rose-500"
                                                }`}
                                        />
                                        {active ? "Active" : "Inactive"}
                                    </span>
                                );
                            },
                        },
                    ]}
                    fields={[
                        {
                            key: "title",
                            label: "Designation Title",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Senior Software Engineer, UI/UX Lead",
                            colSpan: 2,
                        },
                        {
                            key: "department",
                            label: "Department Name",
                            type: "text",
                            placeholder: "e.g., Engineering, Human Resources",
                            colSpan: 1,
                        },
                        {
                            key: "level",
                            label: "Job Level / Seniority",
                            type: "select",
                            options: [
                                "Intern",
                                "Junior",
                                "Mid",
                                "Senior",
                                "Lead",
                                "Manager",
                                "Director",
                            ],
                            defaultValue: "Mid",
                            colSpan: 1,
                        },
                        {
                            key: "description",
                            label: "Role Description & Responsibilities",
                            type: "textarea",
                            placeholder: "Briefly explain core responsibilities...",
                            colSpan: 2,
                        },
                    ]}
                />
            </div>

            {/* Mobile/Tablet Details Pop-up Modal */}
            {selectedDesignation && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
                    onClick={() => setSelectedDesignation(null)}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Briefcase className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-bold text-slate-900 text-sm">
                                    {selectedDesignation.title || selectedDesignation.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedDesignation(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Seniority Level
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedDesignation.level || "Mid Tier"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Role Status
                                    </span>
                                    <span
                                        className={`capitalize font-bold ${selectedDesignation.isActive === false
                                            ? "text-rose-600"
                                            : "text-emerald-700"
                                            }`}
                                    >
                                        {selectedDesignation.isActive === false
                                            ? "Inactive"
                                            : "Active"}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Department
                                </span>
                                <p className="font-semibold text-slate-800 mt-0.5">
                                    {typeof selectedDesignation.department === "object"
                                        ? selectedDesignation.department?.name
                                        : selectedDesignation.department || "General Division"}
                                </p>
                            </div>

                            {selectedDesignation.description && (
                                <div className="pt-2 border-t border-slate-100">
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Description & Duties
                                    </span>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                                        {selectedDesignation.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedDesignation(null)}
                                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}