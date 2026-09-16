"use client";

import React, { useState, useEffect } from "react";
import EntityManager from "@/components/EntityManager";
import { Users2, ShieldCheck, UserCheck } from "lucide-react";

export default function TeamsPage() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch teams to compute real-time metrics dynamically
    useEffect(() => {
        async function fetchTeamsMetrics() {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                const res = await fetch(`${baseUrl.replace(/\/$/, "")}/organization/teams`, {
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (res.ok) {
                    const json = typeof res.json === "function" ? await res.json() : res;
                    const dataList = Array.isArray(json) ? json : (json.data || json.result || json.items || []);
                    setTeams(dataList);
                }
            } catch (error) {
                console.error("Failed to fetch teams metrics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchTeamsMetrics();
    }, []);

    // Real-time calculations for metrics cards
    const totalTeams = teams.length;
    const activeTeams = teams.filter(t => t.isActive === true || t.status === 'active').length;
    const totalMembers = teams.reduce((acc, curr) => acc + (Number(curr.membersCount) || 0), 0);

    return (
        <div className="p-4 space-y-3 bg-[#f8fafc] min-h-screen">

            {/* Top Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 hover:scale-105">
                        <Users2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Teams</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage sub-units within departments, assigned leads, and total member allocations.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row with Smooth Hover Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">TOTAL TEAMS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalTeams}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Users2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">ACTIVE SQUADS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : activeTeams}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">TEAM MEMBERS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalMembers}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <UserCheck className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main EntityManager Container Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2 transition-all duration-300 hover:shadow-md">
                <EntityManager
                    title="Teams"
                    subtitle="Manage corporate units, temas codes, and team leads efficiently."
                    endpoint="Teams"
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
                            render: (val, row) => <span className="font-semibold text-gray-900">{row?.name || val}</span>
                        },
                        {
                            key: "department",
                            label: "Department",
                            searchable: true,
                            render: (val, row) => {
                                const deptName = typeof row?.department === 'object' ? row?.department?.name : (val || "General");
                                return <span className="text-gray-700 font-medium">{deptName}</span>;
                            }
                        },
                        {
                            key: "teamLead",
                            label: "Team Lead",
                            render: (val, row) => {
                                const leadName = typeof row?.teamLead === 'object' ? row?.teamLead?.name : (val || "Not Assigned");
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-xs">
                                            {leadName !== "Not Assigned" ? leadName.charAt(0).toUpperCase() : "?"}
                                        </div>
                                        <span className="text-gray-700 font-medium text-sm">{leadName}</span>
                                    </div>
                                );
                            }
                        },
                        {
                            key: "membersCount",
                            label: "Members",
                            render: (val, row) => (
                                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                    {row?.membersCount ?? val ?? 0} Members
                                </span>
                            )
                        },
                        {
                            key: "isActive",
                            label: "Status",
                            render: (val, row) => {
                                const active = row?.isActive ?? row?.status === 'active' ?? true;
                                return (
                                    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors ${active
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                        {active ? 'Active' : 'Inactive'}
                                    </span>
                                );
                            }
                        },
                    ]}
                    fields={[
                        {
                            key: "name",
                            label: "Team Name",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Core Frontend Squad, DevOps Unit",
                            colSpan: 2
                        },
                        {
                            key: "department",
                            label: "Parent Department",
                            type: "text",
                            placeholder: "e.g., Engineering, Product",
                            colSpan: 1
                        },
                        {
                            key: "teamLead",
                            label: "Team Lead Name",
                            type: "text",
                            placeholder: "e.g., Alex Turner",
                            colSpan: 1
                        },
                        {
                            key: "membersCount",
                            label: "Initial Members Count",
                            type: "number",
                            placeholder: "e.g., 5",
                            colSpan: 1
                        },
                        {
                            key: "isActive",
                            label: "Team Status",
                            type: "select",
                            options: [
                                { label: "Active", value: true },
                                { label: "Inactive", value: false }
                            ],
                            defaultValue: true,
                            colSpan: 1
                        },
                        {
                            key: "description",
                            label: "Team Objective & Overview",
                            type: "textarea",
                            placeholder: "Briefly explain what this team handles or focuses on...",
                            colSpan: 2
                        }
                    ]}
                />
            </div>
        </div>
    );
}