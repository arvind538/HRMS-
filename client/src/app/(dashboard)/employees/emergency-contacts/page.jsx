"use client";

import { useEffect, useState, useMemo } from "react";
import {
    PhoneCall,
    Search,
    RefreshCw,
    Copy,
    Check,
    HeartHandshake,
    AlertTriangle,
    Users,
    X,
    Phone,
} from "lucide-react";
import api from "@/lib/api";

export default function EmergencyContactsPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedId, setCopiedId] = useState(null);

    const fetchContacts = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get("/employees");
            const dataList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.employees || res?.data?.data || [];

            setEmployees(dataList);
        } catch (err) {
            console.error("Emergency Contacts fetch error:", err);
            setEmployees([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const handleCopyPhone = (id, phone) => {
        if (!phone) return;
        navigator.clipboard.writeText(phone);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return employees;
        const query = searchQuery.toLowerCase().trim();

        return employees.filter((emp) => {
            const empName = emp.name || emp.fullName || "";
            const contactName =
                emp.emergencyContact?.name ||
                emp.emergencyName ||
                emp.kinName ||
                "Primary Contact";
            const phone =
                emp.emergencyContact?.phone ||
                emp.emergencyPhone ||
                emp.phone ||
                "";

            return (
                empName.toLowerCase().includes(query) ||
                contactName.toLowerCase().includes(query) ||
                phone.includes(query)
            );
        });
    }, [employees, searchQuery]);

    const getRelationBadge = (relation = "") => {
        const rel = relation.toLowerCase();
        if (["spouse", "wife", "husband", "partner"].some((k) => rel.includes(k))) {
            return "bg-rose-50 text-rose-700 border-rose-200/70 shadow-2xs";
        }
        if (["parent", "father", "mother"].some((k) => rel.includes(k))) {
            return "bg-amber-50 text-amber-700 border-amber-200/70 shadow-2xs";
        }
        if (["sibling", "brother", "sister"].some((k) => rel.includes(k))) {
            return "bg-blue-50 text-blue-700 border-blue-200/70 shadow-2xs";
        }
        return "bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs";
    };

    return (
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12 font-sans antialiased text-slate-900 px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 sm:p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs shrink-0">
                            <PhoneCall size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </span>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                                Emergency Directory
                            </h1>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                                Designated primary contacts and critical outreach records.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by staff, contact, or phone..."
                            className="w-full pl-9 pr-9 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchContacts(true)}
                        disabled={refreshing || loading}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl text-slate-600 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
                        title="Refresh Directory"
                    >
                        <RefreshCw
                            size={16}
                            className={refreshing ? "animate-spin text-indigo-600" : ""}
                        />
                    </button>
                </div>
            </div>

            {/* Mobile & Tablet Card Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 animate-pulse"
                        >
                            <div className="h-4 bg-slate-100 rounded w-1/2" />
                            <div className="h-3 bg-slate-100 rounded w-3/4" />
                            <div className="h-8 bg-slate-50 rounded-xl" />
                        </div>
                    ))
                ) : filteredEmployees.length === 0 ? (
                    <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-2">
                        <Users size={24} className="mx-auto text-slate-400" />
                        <p className="text-sm font-bold text-slate-800">No emergency records found</p>
                        <p className="text-xs text-slate-400">Try modifying your search criteria.</p>
                    </div>
                ) : (
                    filteredEmployees.map((emp) => {
                        const empId = emp._id || emp.id;
                        const empName = emp.name || "Unnamed Employee";
                        const contactName =
                            emp.emergencyContact?.name ||
                            emp.emergencyName ||
                            `${empName} (Direct)`;
                        const relation =
                            emp.emergencyContact?.relation ||
                            emp.emergencyRelation ||
                            "Primary Contact";
                        const phone =
                            emp.emergencyContact?.phone ||
                            emp.emergencyPhone ||
                            emp.phone ||
                            null;
                        const isCopied = copiedId === empId;

                        return (
                            <div
                                key={empId}
                                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">{empName}</h3>
                                        <p className="text-[11px] text-slate-400">
                                            {emp.employeeId || emp.designation || "Staff Member"}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRelationBadge(
                                            relation
                                        )}`}
                                    >
                                        <HeartHandshake size={10} />
                                        <span className="capitalize">{relation}</span>
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Emergency Contact Person
                                    </p>
                                    <p className="font-semibold text-slate-800">{contactName}</p>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                    {phone ? (
                                        <>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-mono text-xs font-semibold text-slate-800 truncate">
                                                    {phone}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyPhone(empId, phone)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                                                    title="Copy phone number"
                                                >
                                                    {isCopied ? (
                                                        <Check size={13} className="text-emerald-600" />
                                                    ) : (
                                                        <Copy size={13} />
                                                    )}
                                                </button>
                                            </div>

                                            <a
                                                href={`tel:${phone}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                                            >
                                                <Phone size={12} className="text-rose-600" />
                                                <span>Call</span>
                                            </a>
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                            <AlertTriangle size={12} className="text-amber-500" />
                                            <span>Phone Not Recorded</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-6">Employee</th>
                                <th className="py-4 px-6">Emergency Contact</th>
                                <th className="py-4 px-6">Relationship</th>
                                <th className="py-4 px-6">Contact Phone</th>
                                <th className="py-4 px-6 text-right">Quick Dial</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="py-4 px-6">
                                            <div className="h-4 bg-slate-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <Users size={24} className="mx-auto text-slate-400 mb-2" />
                                        <p className="text-sm font-bold text-slate-700">
                                            No matching records found
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Verify spelling or try searching by phone number.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => {
                                    const empId = emp._id || emp.id;
                                    const empName = emp.name || "Unnamed Staff";
                                    const contactName =
                                        emp.emergencyContact?.name ||
                                        emp.emergencyName ||
                                        `${empName} (Direct)`;
                                    const relation =
                                        emp.emergencyContact?.relation ||
                                        emp.emergencyRelation ||
                                        "Primary Contact";
                                    const phone =
                                        emp.emergencyContact?.phone ||
                                        emp.emergencyPhone ||
                                        emp.phone ||
                                        null;
                                    const isCopied = copiedId === empId;

                                    return (
                                        <tr
                                            key={empId}
                                            className="hover:bg-slate-50/80 transition-colors group"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {empName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{empName}</p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {emp.employeeId || emp.designation || "Staff Member"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6">
                                                <span className="font-semibold text-slate-800">
                                                    {contactName}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${getRelationBadge(
                                                        relation
                                                    )}`}
                                                >
                                                    <HeartHandshake size={11} className="opacity-75" />
                                                    <span className="capitalize">{relation}</span>
                                                </span>
                                            </td>

                                            <td className="py-4 px-6">
                                                {phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-slate-700 font-semibold">
                                                            {phone}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyPhone(empId, phone)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
                                                            title="Copy phone number"
                                                        >
                                                            {isCopied ? (
                                                                <Check size={14} className="text-emerald-600" />
                                                            ) : (
                                                                <Copy size={14} />
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                                                        <AlertTriangle size={12} className="text-amber-500" />
                                                        <span>Not Provided</span>
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 px-6 text-right">
                                                {phone ? (
                                                    <a
                                                        href={`tel:${phone}`}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/70 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                                    >
                                                        <PhoneCall size={12} className="text-rose-600" />
                                                        <span>Dial Call</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}