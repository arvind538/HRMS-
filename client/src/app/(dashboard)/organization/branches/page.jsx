"use client";

import React, { useState, useEffect } from "react";
import EntityManager from "@/components/EntityManager";
import { Building2, ShieldCheck, MapPin } from "lucide-react";

export default function BranchesPage() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fixed API endpoint synchronization to match EntityManager route layout
    useEffect(() => {
        async function fetchBranchesMetrics() {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                const res = await fetch(`${baseUrl.replace(/\/$/, "")}/organization/branches`, {
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (res.ok) {
                    const json = await res.json();
                    const dataList = Array.isArray(json) ? json : (json.data || json.result || json.items || []);
                    setBranches(dataList);
                }
            } catch (error) {
                console.error("Failed to fetch branches metrics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchBranchesMetrics();
    }, []);

    const totalBranches = branches.length;
    const activeHubs = branches.filter(b => b.status === "active" || b.isActive === true).length;
    const uniqueStates = new Set(branches.map(b => b.state)).size;

    return (
        <div className="p-4 space-y-3 bg-[#f8fafc] min-h-screen">

            {/* Top Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 hover:scale-105">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Branch Locations</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Configure corporate branches, assigned identifiers, contact desks, and regional status.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row with Smooth Hover Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">Total Branches</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalBranches}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">Active Hubs</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : activeHubs}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">States Covered</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : uniqueStates}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <MapPin className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main EntityManager Container Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2 transition-all duration-300 hover:shadow-md">
                <EntityManager
                    title="Branch Locations"
                    subtitle="Manage your physical workspaces and regional offices."
                    endpoint="branches"
                    primaryKey="name"
                    columns={[
                        { key: "name", label: "Branch Name", bold: true },
                        { key: "code", label: "Branch Code", badge: true },
                        { key: "city", label: "City" },
                        { key: "state", label: "State" },
                        { key: "phone", label: "Phone" },
                        { key: "status", label: "Status" },
                    ]}
                    fields={[
                        {
                            key: "name",
                            label: "Branch Name",
                            placeholder: "e.g. Downtown Headquarters",
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
                            label: "Status",
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
                            label: "State / Region",
                            placeholder: "e.g. Delhi",
                            required: true,
                            colSpan: 1,
                        },
                        {
                            key: "address",
                            label: "Complete Street Address",
                            type: "textarea",
                            placeholder: "Floor, Building name, Sector, Landmark...",
                            rows: 3,
                            colSpan: 2,
                        },
                        {
                            key: "phone",
                            label: "Official Phone",
                            type: "tel",
                            placeholder: "+91 98765 43210",
                            colSpan: 1,
                        },
                        {
                            key: "email",
                            label: "Desk Email",
                            type: "email",
                            placeholder: "branch@company.com",
                            colSpan: 1,
                        },
                    ]}
                />
            </div>
        </div>
    );
}