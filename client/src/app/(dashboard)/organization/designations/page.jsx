"use client";

import React, { useState, useEffect } from "react";
import EntityManager from "@/components/EntityManager";
import { Briefcase, ShieldCheck, Award } from "lucide-react";

export default function DesignationsPage() {
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch designations to compute real-time metrics dynamically
    useEffect(() => {
        async function fetchDesignationsMetrics() {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                const res = await fetch(`${baseUrl.replace(/\/$/, "")}/organization/designations`, {
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (res.ok) {
                    const json = typeof res.json === "function" ? await res.json() : res;
                    const dataList = Array.isArray(json) ? json : (json.data || json.result || json.items || []);
                    setDesignations(dataList);
                }
            } catch (error) {
                console.error("Failed to fetch designations metrics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchDesignationsMetrics();
    }, []);

    // Real-time calculations for metrics cards
    const totalDesignations = designations.length;
    const activeRoles = designations.filter(d => d.isActive === true || d.status === 'active').length;
    const uniqueSeniorities = new Set(designations.map(d => d.level)).size;

    return (
        <div className="p-4 space-y-3 bg-[#f8fafc] min-h-screen">

            {/* Top Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 hover:scale-105">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Designations</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage job titles, corporate seniority tiers, and role hierarchies efficiently.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row with Smooth Hover Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">TOTAL DESIGNATIONS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalDesignations}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Briefcase className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">ACTIVE ROLES</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : activeRoles}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">SENIORITY TIERS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : uniqueSeniorities}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Award className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main EntityManager Container Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2 transition-all duration-300 hover:shadow-md">
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
                            render: (val, row) => <span className="font-semibold text-gray-900">{row?.title || val}</span>
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
                            key: "level",
                            label: "Job Level",
                            render: (val, row) => (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                    {row?.level || val || "N/A"}
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
                            key: "title",
                            label: "Designation Title",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Senior Software Engineer, UI/UX Lead",
                            colSpan: 2
                        },
                        {
                            key: "department",
                            label: "Department Name",
                            type: "text",
                            placeholder: "e.g., Engineering, Human Resources",
                            colSpan: 1
                        },
                        {
                            key: "level",
                            label: "Job Level / Seniority",
                            type: "select",
                            options: ["Intern", "Junior", "Mid", "Senior", "Lead", "Manager", "Director"],
                            defaultValue: "Mid",
                            colSpan: 1
                        },
                        {
                            key: "description",
                            label: "Role Description & Responsibilities",
                            type: "textarea",
                            placeholder: "Briefly explain core responsibilities...",
                            colSpan: 2
                        }
                    ]}
                />
            </div>
        </div>
    );
}