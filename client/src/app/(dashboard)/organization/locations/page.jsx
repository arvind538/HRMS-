"use client";

import React, { useState, useEffect } from "react";
import EntityManager from "@/components/EntityManager";
import { MapPin, ShieldCheck, Globe2 } from "lucide-react";

export default function LocationsPage() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch locations to compute real-time metrics dynamically
    useEffect(() => {
        async function fetchLocationsMetrics() {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                const res = await fetch(`${baseUrl.replace(/\/$/, "")}/organization/locations`, {
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (res.ok) {
                    const json = typeof res.json === "function" ? await res.json() : res;
                    const dataList = Array.isArray(json) ? json : (json.data || json.result || json.items || []);
                    setLocations(dataList);
                }
            } catch (error) {
                console.error("Failed to fetch locations metrics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchLocationsMetrics();
    }, []);

    // Real-time calculations for metrics cards
    const totalLocations = locations.length;
    const activeOffices = locations.filter(l => l.isActive === true || l.status === 'active').length;
    const uniqueCountries = new Set(locations.map(l => l.country)).size;

    return (
        <div className="p-4 space-y-3 bg-[#f8fafc] min-h-screen">

            {/* Top Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 hover:scale-105">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Locations</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage corporate office hubs, regional facilities, and physical branch addresses.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row with Smooth Hover Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">TOTAL OFFICES</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalLocations}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <MapPin className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">ACTIVE HUBS</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : activeOffices}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">COUNTRIES COVERED</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : uniqueCountries}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Globe2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main EntityManager Container Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-2 transition-all duration-300 hover:shadow-md">
                <EntityManager
                    title="Locations"
                    subtitle="Manage corporate units, locations codes, and team leads efficiently."
                    endpoint="locations"
                    primaryKey="_id"
                    layout="table"
                    hoverEffect={true}
                    responsive={true}
                    columns={[
                        {
                            key: "name",
                            label: "Location Name",
                            bold: true,
                            searchable: true,
                            render: (val, row) => <span className="font-semibold text-gray-900">{row?.name || val}</span>
                        },
                        {
                            key: "city",
                            label: "City",
                            searchable: true,
                            render: (val, row) => <span className="text-gray-700 font-medium">{row?.city || val || "N/A"}</span>
                        },
                        {
                            key: "state",
                            label: "State",
                            render: (val, row) => <span className="text-gray-700 font-medium">{row?.state || val || "N/A"}</span>
                        },
                        {
                            key: "country",
                            label: "Country",
                            render: (val, row) => <span className="text-gray-700 font-medium">{row?.country || val || "N/A"}</span>
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
                            label: "Location / Office Name",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Bengaluru Tech Hub, NCR Corporate Office",
                            colSpan: 2
                        },
                        {
                            key: "city",
                            label: "City",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Bengaluru",
                            colSpan: 1
                        },
                        {
                            key: "state",
                            label: "State / Province",
                            type: "text",
                            required: true,
                            placeholder: "e.g., Karnataka",
                            colSpan: 1
                        },
                        {
                            key: "country",
                            label: "Country",
                            type: "text",
                            required: true,
                            placeholder: "e.g., India",
                            colSpan: 1
                        },
                        {
                            key: "pincode",
                            label: "Pincode / Postal Code",
                            type: "text",
                            placeholder: "e.g., 560103",
                            colSpan: 1
                        },
                        {
                            key: "isActive",
                            label: "Office Status",
                            type: "select",
                            options: [
                                { label: "Active", value: true },
                                { label: "Inactive", value: false }
                            ],
                            defaultValue: true,
                            colSpan: 2
                        },
                        {
                            key: "address",
                            label: "Street Address",
                            type: "textarea",
                            placeholder: "e.g., 4th Floor, Salarpuria Tech Park, Outer Ring Road...",
                            colSpan: 2
                        }
                    ]}
                />
            </div>
        </div>
    );
}