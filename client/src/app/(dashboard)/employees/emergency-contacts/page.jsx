"use client";

import { useEffect, useState, useMemo } from "react";
import {
    PhoneCall,
    Search,
    RefreshCw,
    Copy,
    Check,
    User,
    HeartHandshake,
    AlertTriangle,
    Users
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
            const contactName = emp.emergencyContact?.name || emp.emergencyName || emp.kinName || "Primary Contact";
            const phone = emp.emergencyContact?.phone || emp.emergencyPhone || emp.phone || "";

            return (
                empName.toLowerCase().includes(query) ||
                contactName.toLowerCase().includes(query) ||
                phone.includes(query)
            );
        });
    }, [employees, searchQuery]);

    const getRelationBadge = (relation = "") => {
        const rel = relation.toLowerCase();
        if (["spouse", "wife", "husband"].some((k) => rel.includes(k))) {
            return "bg-rose-50 text-rose-700 border-rose-200/70 shadow-2xs";
        }
        if (["parent", "father", "mother"].some((k) => rel.includes(k))) {
            return "bg-amber-50 text-amber-700 border-amber-200/70 shadow-2xs";
        }
        return "bg-slate-100 text-slate-700 border-slate-200/80 shadow-2xs";
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 transition-all duration-300">
            {/* Top Header Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50 shadow-2xs">
                            <PhoneCall size={20} />
                        </span>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Emergency Directory
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 pl-11">
                        Critical contacts and staff communication records.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search staff or phone..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                        />
                    </div>

                    <button
                        onClick={() => fetchContacts(true)}
                        disabled={refreshing || loading}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-6">Employee</th>
                                <th className="py-4 px-6">Emergency Contact</th>
                                <th className="py-4 px-6">Relationship</th>
                                <th className="py-4 px-6">Contact Number</th>
                                <th className="py-4 px-6 text-right">Call Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <Users size={22} className="mx-auto text-slate-400 mb-2" />
                                        <p className="text-sm font-bold text-slate-700">No records found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => {
                                    const empId = emp._id || emp.id;
                                    const empName = emp.name || "Unnamed";

                                    // Fallback: Agar emergency contact field nahi hai, toh employee ka khud ka naam aur phone use hoga
                                    const contactName = emp.emergencyContact?.name || emp.emergencyName || `${empName} (Self)`;
                                    const relation = emp.emergencyContact?.relation || emp.emergencyRelation || "Self / Direct";
                                    const phone = emp.emergencyContact?.phone || emp.emergencyPhone || emp.phone || null;
                                    const isCopied = copiedId === empId;

                                    return (
                                        <tr key={empId} className="hover:bg-slate-50/80 transition-all duration-200 group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {empName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{empName}</p>
                                                        <p className="text-[11px] text-slate-400">{emp.employeeId || emp.designation || "Staff"}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6">
                                                <span className="font-semibold text-slate-800">{contactName}</span>
                                            </td>

                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${getRelationBadge(relation)}`}>
                                                    <HeartHandshake size={11} className="opacity-75" />
                                                    <span className="capitalize">{relation}</span>
                                                </span>
                                            </td>

                                            <td className="py-4 px-6">
                                                {phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-slate-700 font-semibold">{phone}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyPhone(empId, phone)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                                                        >
                                                            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px]"><AlertTriangle size={12} className="inline text-amber-500" /> Not Provided</span>
                                                )}
                                            </td>

                                            <td className="py-4 px-6 text-right">
                                                {phone ? (
                                                    <a
                                                        href={`tel:${phone}`}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/70 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <PhoneCall size={12} className="text-rose-600" />
                                                        <span>Call</span>
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