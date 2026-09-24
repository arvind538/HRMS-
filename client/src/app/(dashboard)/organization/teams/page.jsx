"use client";

import React, { useState, useEffect, useMemo } from "react";
import EntityManager from "@/components/EntityManager";
import {
    Users2,
    ShieldCheck,
    UserCheck,
    Search,
    X,
    Eye,
    Trash2,
    Calendar,
    Building2,
    Loader2,
    User,
} from "lucide-react";

export default function TeamsPage() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    async function fetchTeamsMetrics() {
        try {
            setLoading(true);
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await fetch(
                `${baseUrl.replace(/\/$/, "")}/organization/teams`,
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
                setTeams(dataList);
            }
        } catch (error) {
            console.error("Failed to fetch teams metrics:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchTeamsMetrics();
    }, []);

    const totalTeams = teams.length;
    const activeTeams = teams.filter(
        (t) =>
            t.isActive === true ||
            t.isActive === "Active" ||
            t.status === "active"
    ).length;
    const totalMembers = teams.reduce(
        (acc, curr) => acc + (Number(curr.membersCount) || 0),
        0
    );

    const filteredTeams = useMemo(() => {
        if (!searchQuery.trim()) return teams;
        const q = searchQuery.toLowerCase().trim();
        return teams.filter((t) => {
            const name = (t.name || "").toLowerCase();
            const dept =
                typeof t.department === "object"
                    ? (t.department?.name || "").toLowerCase()
                    : String(t.department || "").toLowerCase();
            const lead =
                typeof t.teamLead === "object"
                    ? (t.teamLead?.name || "").toLowerCase()
                    : String(t.teamLead || "").toLowerCase();
            return name.includes(q) || dept.includes(q) || lead.includes(q);
        });
    }, [teams, searchQuery]);

    const handleDeleteTeam = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this team?")) return;

        setDeletingId(id);
        try {
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await fetch(
                `${baseUrl.replace(/\/$/, "")}/organization/teams/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (res.ok) {
                setTeams((prev) => prev.filter((t) => (t._id || t.id) !== id));
            }
        } catch (err) {
            console.error("Failed to delete team:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const getTeamInitials = (name) => {
        if (name) {
            const parts = name.trim().split(" ").filter(Boolean);
            return parts.length > 1
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : name.slice(0, 2).toUpperCase();
        }
        return "TM";
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6 bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                        <Users2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                            Corporate Teams
                        </h1>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                            Manage functional squad units within departments, designated leaders, and personnel allocations.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">
                            Total Teams
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : totalTeams.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <Users2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-emerald-600 uppercase">
                            Active Squads
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : activeTeams.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl border border-emerald-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group sm:col-span-2 lg:col-span-1">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-blue-500 uppercase">
                            Total Members
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : totalMembers.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl border border-blue-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
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
                        placeholder="Search teams or team leads..."
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
                            Loading team cards...
                        </span>
                    </div>
                ) : filteredTeams.length === 0 ? (
                    <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs font-semibold">
                        No matching teams found.
                    </div>
                ) : (
                    filteredTeams.map((team) => {
                        const id = team._id || team.id;
                        const name = team.name || "Squad Unit";
                        const leadName =
                            typeof team.teamLead === "object"
                                ? team.teamLead?.name
                                : team.teamLead || "Lead Not Assigned";
                        const deptName =
                            typeof team.department === "object"
                                ? team.department?.name
                                : team.department || "General Division";
                        const membersCount = team.membersCount || 0;
                        const dateStr = team.createdAt
                            ? new Date(team.createdAt).toLocaleDateString("en-US")
                            : team.updatedAt
                                ? new Date(team.updatedAt).toLocaleDateString("en-US")
                                : "09/24/2026";
                        const isDeleting = deletingId === id;
                        const isActive =
                            team.isActive === true ||
                            team.isActive === "Active" ||
                            team.status === "active";
                        const statusLabel = isActive ? "ACTIVE" : "INACTIVE";

                        return (
                            <div
                                key={id}
                                onClick={() => setSelectedTeam(team)}
                                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 cursor-pointer hover:border-indigo-300 transition-all"
                            >
                                {/* Top Row: Avatar + Title + Status Pill */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-rose-50/80 border border-rose-100 text-rose-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                                            {getTeamInitials(name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate leading-tight">
                                                {name}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {leadName}
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

                                {/* Middle Row: Department Badge + Date */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5 truncate text-[11px]">
                                        <Building2 size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{deptName}</span>
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
                                            setSelectedTeam(team);
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 transition"
                                    >
                                        <Eye size={13} />
                                        <span>Details</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteTeam(id, e)}
                                        disabled={isDeleting}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Delete Team"
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
                    title="Corporate Teams"
                    subtitle="Manage department squads, designated team leaders, and personnel counts."
                    endpoint="teams"
                    primaryKey="_id"
                    layout="table"
                    hoverEffect={true}
                    responsive={true}
                    columns={[
                        {
                            key: "name",
                            label: "Team Name",
                            bold: true,
                            searchable: true,
                            render: (val, row) => (
                                <span className="font-semibold text-slate-900">
                                    {row?.name || val}
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
                                        : val || "General Division";
                                return (
                                    <span className="text-slate-700 font-medium">
                                        {deptName}
                                    </span>
                                );
                            },
                        },
                        {
                            key: "teamLead",
                            label: "Team Lead",
                            render: (val, row) => {
                                const leadName =
                                    typeof row?.teamLead === "object"
                                        ? row?.teamLead?.name
                                        : val || "Not Assigned";
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-2xs">
                                            {leadName !== "Not Assigned"
                                                ? leadName.charAt(0).toUpperCase()
                                                : "?"}
                                        </div>
                                        <span className="text-slate-700 font-medium text-sm">
                                            {leadName}
                                        </span>
                                    </div>
                                );
                            },
                        },
                        {
                            key: "membersCount",
                            label: "Members",
                            render: (val, row) => (
                                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                    {row?.membersCount ?? val ?? 0} Members
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
                            key: "name",
                            label: "Team Name",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Core Frontend Squad, Platform Ops",
                            colSpan: 2,
                        },
                        {
                            key: "department",
                            label: "Parent Department",
                            type: "text",
                            placeholder: "e.g., Engineering, Product Management",
                            colSpan: 1,
                        },
                        {
                            key: "teamLead",
                            label: "Team Lead Name",
                            type: "text",
                            placeholder: "e.g., Alex Turner",
                            colSpan: 1,
                        },
                        {
                            key: "membersCount",
                            label: "Initial Members Count",
                            type: "number",
                            placeholder: "e.g., 5",
                            colSpan: 1,
                        },
                        {
                            key: "isActive",
                            label: "Team Status",
                            type: "select",
                            options: [
                                { label: "Active", value: true },
                                { label: "Inactive", value: false },
                            ],
                            defaultValue: true,
                            colSpan: 1,
                        },
                        {
                            key: "description",
                            label: "Team Objective & Overview",
                            type: "textarea",
                            placeholder: "Briefly explain core deliverables and focus areas...",
                            colSpan: 2,
                        },
                    ]}
                />
            </div>

            {/* Mobile/Tablet Details Pop-up Modal */}
            {selectedTeam && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
                    onClick={() => setSelectedTeam(null)}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Users2 className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-bold text-slate-900 text-sm">
                                    {selectedTeam.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedTeam(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Team Members
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {selectedTeam.membersCount || 0} Members
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Operational Status
                                    </span>
                                    <span
                                        className={`capitalize font-bold ${selectedTeam.isActive === false
                                            ? "text-rose-600"
                                            : "text-emerald-700"
                                            }`}
                                    >
                                        {selectedTeam.isActive === false ? "Inactive" : "Active"}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Team Lead
                                </span>
                                <p className="font-semibold text-slate-800 mt-0.5">
                                    {typeof selectedTeam.teamLead === "object"
                                        ? selectedTeam.teamLead?.name
                                        : selectedTeam.teamLead || "Not Assigned"}
                                </p>
                            </div>

                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Parent Department
                                </span>
                                <p className="font-semibold text-slate-800 mt-0.5">
                                    {typeof selectedTeam.department === "object"
                                        ? selectedTeam.department?.name
                                        : selectedTeam.department || "General Division"}
                                </p>
                            </div>

                            {selectedTeam.description && (
                                <div className="pt-2 border-t border-slate-100">
                                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                        Objective & Overview
                                    </span>
                                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                                        {selectedTeam.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedTeam(null)}
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