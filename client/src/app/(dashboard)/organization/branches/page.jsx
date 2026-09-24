"use client";

import React, { useState, useEffect, useMemo } from "react";
import EntityManager from "@/components/EntityManager";
import {
    Building2,
    ShieldCheck,
    MapPin,
    Calendar,
    Phone,
    Mail,
    Trash2,
    Eye,
    Plus,
    Search,
    X,
    Loader2,
} from "lucide-react";

export default function BranchesPage() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    async function fetchBranchesMetrics() {
        try {
            setLoading(true);
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await fetch(
                `${baseUrl.replace(/\/$/, "")}/organization/branches`,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (res.ok) {
                const json = await res.json();
                const dataList = Array.isArray(json)
                    ? json
                    : json.data || json.result || json.items || [];
                setBranches(dataList);
            }
        } catch (error) {
            console.error("Failed to fetch branch metrics:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchBranchesMetrics();
    }, []);

    const totalBranches = branches.length;
    const activeHubs = branches.filter(
        (b) => b.status === "active" || b.isActive === true
    ).length;
    const uniqueStates = new Set(
        branches.map((b) => b.state).filter(Boolean)
    ).size;

    const filteredBranches = useMemo(() => {
        if (!searchQuery.trim()) return branches;
        const q = searchQuery.toLowerCase().trim();
        return branches.filter((b) => {
            const name = (b.name || "").toLowerCase();
            const code = (b.code || "").toLowerCase();
            const city = (b.city || "").toLowerCase();
            const state = (b.state || "").toLowerCase();
            return (
                name.includes(q) ||
                code.includes(q) ||
                city.includes(q) ||
                state.includes(q)
            );
        });
    }, [branches, searchQuery]);

    const handleDeleteBranch = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this branch?")) return;

        setDeletingId(id);
        try {
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await fetch(
                `${baseUrl.replace(/\/$/, "")}/organization/branches/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (res.ok) {
                setBranches((prev) => prev.filter((b) => (b._id || b.id) !== id));
            }
        } catch (err) {
            console.error("Failed to delete branch:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const getBranchInitials = (code, name) => {
        if (code) {
            const clean = code.replace(/[^a-zA-Z]/g, "").slice(0, 2);
            if (clean) return clean.toUpperCase();
        }
        if (name) {
            const parts = name.trim().split(" ").filter(Boolean);
            return parts.length > 1
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : name.slice(0, 2).toUpperCase();
        }
        return "BR";
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6 bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                            Branch Locations
                        </h1>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                            Configure corporate branches, unique location identifiers, support desks, and regional operating statuses.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">
                            Total Branches
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : totalBranches.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-emerald-600 uppercase">
                            Active Hubs
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : activeHubs.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl border border-emerald-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group sm:col-span-2 lg:col-span-1">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-blue-500 uppercase">
                            States Covered
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : uniqueStates.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl border border-blue-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>
            </div>

            {/* MOBILE & TABLET CARD VIEW (Matching the provided UI design) */}
            <div className="block md:hidden space-y-3">
                {/* Search bar for quick filter on mobile */}
                <div className="relative w-full">
                    <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search branches..."
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
                        <span className="text-xs font-semibold">Loading branch cards...</span>
                    </div>
                ) : filteredBranches.length === 0 ? (
                    <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs font-semibold">
                        No matching branch locations found.
                    </div>
                ) : (
                    filteredBranches.map((branch) => {
                        const id = branch._id || branch.id;
                        const code = branch.code || "";
                        const name = branch.name || "Branch Office";
                        const city = branch.city || "";
                        const state = branch.state || "";
                        const address = branch.address || `${city}${city && state ? ", " : ""}${state}` || "Location Unassigned";
                        const dateStr = branch.createdAt
                            ? new Date(branch.createdAt).toLocaleDateString("en-US")
                            : branch.updatedAt
                                ? new Date(branch.updatedAt).toLocaleDateString("en-US")
                                : "09/21/2026";
                        const isDeleting = deletingId === id;
                        const status = (branch.status || "ACTIVE").toUpperCase();
                        const isActive = status === "ACTIVE";

                        return (
                            <div
                                key={id}
                                onClick={() => setSelectedBranch(branch)}
                                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 cursor-pointer hover:border-indigo-300 transition-all"
                            >
                                {/* Top Row: Avatar + Title + Status Pill */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-rose-50/80 border border-rose-100 text-rose-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                                            {getBranchInitials(code, name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate leading-tight">
                                                {name}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {address}
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
                                        <span>{status}</span>
                                    </span>
                                </div>

                                {/* Middle Row: Department/Code + Date */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5 truncate text-[11px]">
                                        <Building2 size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{code || "General Branch"}</span>
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
                                            setSelectedBranch(branch);
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 transition"
                                    >
                                        <Eye size={13} />
                                        <span>Details</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteBranch(id, e)}
                                        disabled={isDeleting}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Delete Branch"
                                    >
                                        {isDeleting ? (
                                            <Loader2 size={15} className="animate-spin text-rose-600" />
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
            <div className="hidden md:block bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-2 sm:p-4 transition-all duration-300 hover:shadow-md">
                <div className="w-full overflow-x-auto">
                    <EntityManager
                        title="Branch Locations"
                        subtitle="Manage your physical workspaces, regional branches, and support facilities."
                        endpoint="branches"
                        primaryKey="name"
                        columns={[
                            { key: "name", label: "Branch Name", bold: true },
                            { key: "code", label: "Branch Code", badge: true },
                            { key: "city", label: "City" },
                            { key: "state", label: "State" },
                            { key: "phone", label: "Contact Phone" },
                            { key: "status", label: "Status" },
                        ]}
                        fields={[
                            {
                                key: "name",
                                label: "Branch Name",
                                placeholder: "e.g. Downtown Central Office",
                                required: true,
                                colSpan: 2,
                            },
                            {
                                key: "code",
                                label: "Branch Code",
                                placeholder: "e.g. BR-DEL-01",
                                required: true,
                                colSpan: 1,
                            },
                            {
                                key: "status",
                                label: "Operational Status",
                                type: "select",
                                options: ["active", "inactive", "pending"],
                                defaultValue: "active",
                                colSpan: 1,
                            },
                            {
                                key: "city",
                                label: "City",
                                placeholder: "e.g. New Delhi",
                                required: true,
                                colSpan: 1,
                            },
                            {
                                key: "state",
                                label: "State / Province",
                                placeholder: "e.g. Delhi",
                                required: true,
                                colSpan: 1,
                            },
                            {
                                key: "address",
                                label: "Complete Street Address",
                                type: "textarea",
                                placeholder: "Floor, building name, street, landmarks...",
                                rows: 3,
                                colSpan: 2,
                            },
                            {
                                key: "phone",
                                label: "Office Phone Number",
                                type: "tel",
                                placeholder: "+91 98765 43210",
                                colSpan: 1,
                            },
                            {
                                key: "email",
                                label: "Helpdesk Email",
                                type: "email",
                                placeholder: "branch.helpdesk@company.com",
                                colSpan: 1,
                            },
                        ]}
                    />
                </div>
            </div>

            {/* Mobile/Tablet Details Pop-up Modal */}
            {selectedBranch && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
                    onClick={() => setSelectedBranch(null)}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-bold text-slate-900 text-sm">
                                    {selectedBranch.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedBranch(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Branch Code
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {selectedBranch.code || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Operational Status
                                    </span>
                                    <span className="capitalize font-bold text-emerald-700">
                                        {selectedBranch.status || "Active"}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Location & Address
                                </span>
                                <p className="font-semibold text-slate-800 mt-0.5">
                                    {selectedBranch.address || "No detailed address specified."}
                                </p>
                                <p className="text-slate-500 mt-0.5">
                                    {[selectedBranch.city, selectedBranch.state]
                                        .filter(Boolean)
                                        .join(", ") || "City/State not set"}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Phone
                                    </span>
                                    <span className="font-mono text-slate-700">
                                        {selectedBranch.phone || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Email
                                    </span>
                                    <span className="truncate block text-slate-700">
                                        {selectedBranch.email || "—"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedBranch(null)}
                                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
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