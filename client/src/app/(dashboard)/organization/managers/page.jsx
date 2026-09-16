"use client";

import React, { useState, useEffect } from "react";
import EntityManager from "@/components/EntityManager";
import { UserCog, ShieldCheck, Users } from "lucide-react";

export default function ReportingManagersPage() {
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch reporting managers to compute real-time metrics dynamically
    useEffect(() => {
        async function fetchManagersMetrics() {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                const res = await fetch(`${baseUrl.replace(/\/$/, "")}/organization/reporting-managers`, {
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (res.ok) {
                    const json = typeof res.json === "function" ? await res.json() : res;
                    const dataList = Array.isArray(json) ? json : (json.data || json.result || json.items || []);
                    setManagers(dataList);
                }
            } catch (error) {
                console.error("Failed to fetch reporting managers metrics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchManagersMetrics();
    }, []);

    // Real-time calculations for metrics cards
    const totalManagers = managers.length;
    const activeManagers = managers.filter(m => m.isActive === true || m.status === 'active').length;
    const totalReportees = managers.reduce((acc, curr) => acc + (Number(curr.reporteesCount) || 0), 0);

    return (
        <div className="p-4 space-y-3 bg-[#f8fafc] min-h-screen">

            {/* Top Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 hover:scale-105">
                        <UserCog className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Reporting Managers</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Track all reporting managers, their organizational departments, and assigned reportees.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row with Smooth Hover Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">TOTAL MANAGERS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalManagers}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <UserCog className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">ACTIVE LEADERS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : activeManagers}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">TOTAL REPORTEES</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalReportees}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Users className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main EntityManager Container Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2 transition-all duration-300 hover:shadow-md">
                <EntityManager
                    title="Reporting-Managers"
                    subtitle="Manage corporate units, managers codes, and team leads efficiently."
                    endpoint="reporting-managers"
                    primaryKey="_id"
                    layout="table"
                    hoverEffect={true}
                    responsive={true}
                    columns={[
                        {
                            key: "name",
                            label: "Manager Name",
                            bold: true,
                            searchable: true,
                            render: (val, row) => (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-xs">
                                        {(row?.name || val || "M").charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-gray-900">{row?.name || val}</span>
                                </div>
                            )
                        },
                        {
                            key: "designation",
                            label: "Designation",
                            searchable: true,
                            render: (val, row) => {
                                const desName = typeof row?.designation === 'object' ? row?.designation?.title : (val || "N/A");
                                return <span className="text-gray-700 font-medium">{desName}</span>;
                            }
                        },
                        {
                            key: "department",
                            label: "Department",
                            render: (val, row) => {
                                const deptName = typeof row?.department === 'object' ? row?.department?.name : (val || "General");
                                return <span className="text-gray-700 font-medium">{deptName}</span>;
                            }
                        },
                        {
                            key: "reporteesCount",
                            label: "Reportees",
                            render: (val, row) => (
                                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                    {row?.reporteesCount ?? val ?? 0} Members
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
                            label: "Manager Full Name",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Rajesh Sharma",
                            colSpan: 2
                        },
                        {
                            key: "email",
                            label: "Corporate Email Address",
                            type: "email",
                            required: true,
                            placeholder: "e.g., rajesh.sharma@company.com",
                            colSpan: 2
                        },
                        {
                            key: "designation",
                            label: "Job Designation",
                            type: "text",
                            placeholder: "e.g., Engineering Manager, Director",
                            colSpan: 1
                        },
                        {
                            key: "department",
                            label: "Assigned Department",
                            type: "text",
                            placeholder: "e.g., Engineering, Human Resources",
                            colSpan: 1
                        },
                        {
                            key: "teamsManaged",
                            label: "Teams Managed Count",
                            type: "number",
                            placeholder: "e.g., 2",
                            colSpan: 1
                        },
                        {
                            key: "reporteesCount",
                            label: "Total Reportees Count",
                            type: "number",
                            placeholder: "e.g., 8",
                            colSpan: 1
                        },
                        {
                            key: "isActive",
                            label: "Manager Status",
                            type: "select",
                            options: [
                                { label: "Active", value: true },
                                { label: "Inactive", value: false }
                            ],
                            defaultValue: true,
                            colSpan: 2
                        }
                    ]}
                />
            </div>
        </div>
    );
}