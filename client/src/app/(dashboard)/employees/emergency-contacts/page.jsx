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
    ShieldAlert,
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

            // Local storage avatars check fallback
            try {
                const storedAvatars = JSON.parse(
                    localStorage.getItem("4ps_emp_avatars") || "{}"
                );
                const merged = dataList.map((emp) => {
                    const id = String(emp._id || emp.id || "");
                    if (storedAvatars[id] && !emp.avatar) {
                        return { ...emp, avatar: storedAvatars[id] };
                    }
                    return emp;
                });
                setEmployees(merged);
            } catch {
                setEmployees(dataList);
            }
        } catch (err) {
            console.error("Emergency Contacts fetch error:", err);
            try {
                const storedList = JSON.parse(
                    localStorage.getItem("4ps_emp_data") || "[]"
                );
                setEmployees(storedList);
            } catch {
                setEmployees([]);
            }
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

    const getEmpName = (emp) =>
        emp?.name ||
        `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() ||
        "Unnamed Employee";

    const getDesignation = (emp) => {
        const des = emp?.designation;
        if (typeof des === "object" && des !== null) {
            return des.name || des.title || "Staff Member";
        }
        if (typeof des === "string" && !/^[0-9a-fA-F]{24}$/.test(des)) {
            return des;
        }
        return emp?.role || "Staff Member";
    };

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return employees;
        const query = searchQuery.toLowerCase().trim();

        return employees.filter((emp) => {
            const empName = getEmpName(emp).toLowerCase();
            const contactName = (
                emp.emergencyContact?.name ||
                emp.emergencyName ||
                emp.kinName ||
                ""
            ).toLowerCase();
            const phone = (
                emp.emergencyContact?.phone ||
                emp.emergencyPhone ||
                emp.phone ||
                ""
            ).toLowerCase();
            const empId = String(emp.employeeId || "").toLowerCase();

            return (
                empName.includes(query) ||
                contactName.includes(query) ||
                phone.includes(query) ||
                empId.includes(query)
            );
        });
    }, [employees, searchQuery]);

    const getRelationBadge = (relation = "") => {
        const rel = relation.toLowerCase();
        if (["spouse", "wife", "husband", "partner"].some((k) => rel.includes(k))) {
            return "bg-rose-50 text-rose-700 border-rose-200/80";
        }
        if (["parent", "father", "mother"].some((k) => rel.includes(k))) {
            return "bg-amber-50 text-amber-700 border-amber-200/80";
        }
        if (["sibling", "brother", "sister"].some((k) => rel.includes(k))) {
            return "bg-blue-50 text-blue-700 border-blue-200/80";
        }
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    return (
        <div className="w-full space-y-4 sm:space-y-6 pb-12 font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs shrink-0">
                            <PhoneCall size={22} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                                    Emergency Directory
                                </h1>
                                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                    <ShieldAlert size={12} />
                                    <span>Immediate SOS</span>
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                                Designated primary emergency contacts and critical phone outreach records.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search employee, contact, or phone..."
                            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all shadow-2xs"
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
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-rose-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
                        title="Refresh Directory"
                    >
                        <RefreshCw
                            size={16}
                            className={refreshing ? "animate-spin text-rose-600" : ""}
                        />
                    </button>
                </div>
            </div>

            {/* Mobile Card Layout (Visible on small screens) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 animate-pulse"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-slate-100 rounded-full" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                                </div>
                            </div>
                            <div className="h-10 bg-slate-50 rounded-xl" />
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
                        const empName = getEmpName(emp);
                        const designation = getDesignation(emp);
                        const contactName =
                            emp.emergencyContact?.name ||
                            emp.emergencyName ||
                            emp.kinName ||
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
                        const avatarSrc = emp.avatar || emp.photo;

                        return (
                            <div
                                key={empId}
                                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all space-y-3.5"
                            >
                                {/* Employee Header */}
                                <div className="flex items-start justify-between gap-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                            {avatarSrc ? (
                                                <img
                                                    src={avatarSrc}
                                                    alt={empName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="font-bold text-rose-600 text-sm">
                                                    {empName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm leading-tight">
                                                {empName}
                                            </h3>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {emp.employeeId ? `${emp.employeeId} • ` : ""}
                                                {designation}
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getRelationBadge(
                                            relation
                                        )}`}
                                    >
                                        <HeartHandshake size={10} />
                                        <span className="capitalize">{relation}</span>
                                    </span>
                                </div>

                                {/* Contact Name Info */}
                                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                        Emergency Contact Person
                                    </span>
                                    <p className="font-semibold text-slate-800">{contactName}</p>
                                </div>

                                {/* Phone & Call CTA */}
                                <div className="pt-1 flex items-center justify-between gap-2">
                                    {phone ? (
                                        <>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-mono text-xs font-bold text-slate-800 truncate">
                                                    {phone}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyPhone(empId, phone)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                                    title="Copy phone"
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
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                                            >
                                                <Phone size={12} />
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

            {/* Desktop Responsive Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-4 px-6 min-w-[260px]">Employee</th>
                                <th className="py-4 px-6 min-w-[200px]">Emergency Contact</th>
                                <th className="py-4 px-6 min-w-[140px]">Relationship</th>
                                <th className="py-4 px-6 min-w-[180px]">Contact Phone</th>
                                <th className="py-4 px-6 text-right w-36">Quick Dial</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="py-4 px-6">
                                            <div className="h-5 bg-slate-100 rounded w-full" />
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
                                    const empName = getEmpName(emp);
                                    const designation = getDesignation(emp);
                                    const contactName =
                                        emp.emergencyContact?.name ||
                                        emp.emergencyName ||
                                        emp.kinName ||
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
                                    const avatarSrc = emp.avatar || emp.photo;

                                    return (
                                        <tr
                                            key={empId}
                                            className="hover:bg-slate-50/80 transition-colors group cursor-default"
                                        >
                                            {/* Employee with image and hover effect */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs group-hover:border-rose-200 transition-colors">
                                                        {avatarSrc ? (
                                                            <img
                                                                src={avatarSrc}
                                                                alt={empName}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                            />
                                                        ) : (
                                                            <span className="font-bold text-rose-600 text-xs">
                                                                {empName.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                                                            {empName}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {emp.employeeId ? `${emp.employeeId} • ` : ""}
                                                            {designation}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact Person */}
                                            <td className="py-4 px-6">
                                                <span className="font-semibold text-slate-800">
                                                    {contactName}
                                                </span>
                                            </td>

                                            {/* Relationship Badge */}
                                            <td className="py-4 px-6">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${getRelationBadge(
                                                        relation
                                                    )}`}
                                                >
                                                    <HeartHandshake size={12} className="opacity-75" />
                                                    <span className="capitalize">{relation}</span>
                                                </span>
                                            </td>

                                            {/* Phone with hover copy */}
                                            <td className="py-4 px-6">
                                                {phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-slate-700 font-bold">
                                                            {phone}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyPhone(empId, phone)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
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

                                            {/* Call Action Button with hover state */}
                                            <td className="py-4 px-6 text-right">
                                                {phone ? (
                                                    <a
                                                        href={`tel:${phone}`}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200/80 hover:border-transparent rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-sm active:scale-95"
                                                    >
                                                        <PhoneCall size={12} />
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