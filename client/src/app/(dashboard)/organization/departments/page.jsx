"use client";

import React, { useState, useEffect } from "react";
import EntityManager from "@/components/EntityManager";
import { Layers, ShieldCheck, Users } from "lucide-react";

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch departments to compute real-time metrics dynamically
    useEffect(() => {
        async function fetchDepartmentsMetrics() {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                const res = await fetch(`${baseUrl.replace(/\/$/, "")}/organization/departments`, {
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (res.ok) {
                    const json = typeof res.json === "function" ? await res.json() : res;
                    const dataList = Array.isArray(json) ? json : (json.data || json.result || json.items || []);
                    setDepartments(dataList);
                }
            } catch (error) {
                console.error("Failed to fetch departments metrics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchDepartmentsMetrics();
    }, []);

    // Real-time calculations matching your screenshot layout
    const totalDepts = departments.length;
    const activeDepts = departments.filter(d => d.isActive === true || d.isActive === "Active" || d.status === "active").length;
    const totalMembers = departments.reduce((acc, curr) => acc + (Number(curr.employeeCount) || 0), 0);

    return (
        <div className="p-4 space-y-3 bg-[#f8fafc] min-h-screen">

            {/* Top Header Card matching Branch Page Style */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 hover:scale-105">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Departments</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Organize all company departments and track active heads and member allocations.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row with Smooth Hover Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">TOTAL DEPARTMENTS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalDepts}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Layers className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">ACTIVE UNITS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : activeDepts}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">TOTAL MEMBERS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalMembers}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Users className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main EntityManager Container Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2 transition-all duration-300 hover:shadow-md">
                <EntityManager
                    title="Department Directory"
                    subtitle="Manage corporate units, departmental codes, and team leads efficiently."
                    endpoint="departments"
                    primaryKey="_id"
                    layout="table"
                    hoverEffect={true}
                    responsive={true}
                    columns={[
                        {
                            key: "name",
                            label: "Department Name",
                            bold: true,
                            searchable: true,
                            render: (val, row) => (
                                <span className="font-semibold text-gray-900">
                                    {row?.name || val || "Unnamed Dept"}
                                </span>
                            )
                        },
                        {
                            key: "code",
                            label: "Code",
                            searchable: true,
                            render: (val, row) => (
                                <span className="px-2.5 py-1 text-xs font-mono font-medium bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                                    {row?.code || val || "N/A"}
                                </span>
                            )
                        },
                        {
                            key: "head",
                            label: "Department Head",
                            render: (val, row) => {
                                const headName = typeof row?.head === 'object' ? row?.head?.name : (val?.name || "Not Assigned");
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-xs">
                                            {headName !== "Not Assigned" ? headName.charAt(0).toUpperCase() : "?"}
                                        </div>
                                        <span className="text-gray-700 font-medium text-sm">{headName}</span>
                                    </div>
                                );
                            }
                        },
                        {
                            key: "employeeCount",
                            label: "Active Members",
                            render: (val, row) => {
                                const count = row?.employeeCount ?? val ?? 0;
                                return (
                                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                        {count} Employees
                                    </span>
                                );
                            }
                        },
                        {
                            key: "isActive",
                            label: "Status",
                            render: (val, row) => {
                                const active = row?.isActive ?? val ?? true;
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
                            label: "Department Name",
                            type: "text",
                            required: true,
                            placeholder: "e.g. Engineering & Technology",
                            colSpan: 2
                        },
                        {
                            key: "code",
                            label: "Department Code",
                            type: "text",
                            required: true,
                            placeholder: "e.g. ENG-01",
                            colSpan: 1
                        },
                        {
                            key: "isActive",
                            label: "Department Status",
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
                            label: "Description",
                            type: "textarea",
                            placeholder: "Write a brief overview...",
                            colSpan: 2
                        }
                    ]}
                />
            </div>
        </div>
    );
}