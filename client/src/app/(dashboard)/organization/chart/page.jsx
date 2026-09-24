"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    ChevronDown,
    ChevronRight,
    Search,
    Users,
    X,
    Sparkles,
    Shield,
    Briefcase,
    Loader2,
    Mail,
    GitBranch,
    Building2,
    LayoutGrid,
    List,
} from "lucide-react";
import api from "@/lib/api";

function filterOrgData(node, term) {
    if (!node) return null;
    if (!term) return node;
    const matches =
        node.name?.toLowerCase().includes(term.toLowerCase()) ||
        node.role?.toLowerCase().includes(term.toLowerCase()) ||
        node.department?.toLowerCase().includes(term.toLowerCase());

    let filteredChildren = [];
    if (node.children && node.children.length > 0) {
        filteredChildren = node.children
            .map((child) => filterOrgData(child, term))
            .filter(Boolean);
    }

    if (matches || filteredChildren.length > 0) {
        return {
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
        };
    }
    return null;
}

function OrgCard({ member, onSelectMember }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = member.children && member.children.length > 0;

    const avatarImg =
        member.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            member.name || "User"
        )}`;

    return (
        <div className="flex flex-col items-center">
            {/* Node Card */}
            <div
                onClick={() => onSelectMember(member)}
                className="relative group bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 w-64 sm:w-72 shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500 cursor-pointer overflow-hidden text-left"
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center space-x-3">
                    <img
                        src={avatarImg}
                        alt={member.name || "Employee"}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover border border-slate-100 group-hover:border-indigo-500 transition-all shadow-2xs shrink-0 bg-slate-50"
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {member.name || "Unnamed Leader"}
                        </h4>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate mt-0.5">
                            {member.role || member.designation || "Role Unassigned"}
                        </p>
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100/60 max-w-full truncate">
                            <Briefcase size={9} className="shrink-0" />
                            <span className="truncate">{member.department || "General"}</span>
                        </span>
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                    <span className="truncate max-w-[150px] sm:max-w-[180px] flex items-center gap-1.5 font-medium text-[11px] text-slate-500">
                        <Mail size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{member.email || "No email listed"}</span>
                    </span>

                    {hasChildren && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/60 transition-all shadow-2xs cursor-pointer shrink-0"
                            title={isExpanded ? "Collapse Subtree" : "Expand Subtree"}
                        >
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Children Branches */}
            {hasChildren && isExpanded && (
                <div className="relative pt-6 flex flex-col items-center">
                    <div className="absolute top-0 h-6 w-px bg-slate-300" />
                    <div className="flex flex-row space-x-4 sm:space-x-6 relative">
                        {member.children.map((child, index) => (
                            <div
                                key={child.id || child._id || index}
                                className="relative flex flex-col items-center pt-6"
                            >
                                <div className="absolute top-0 h-px bg-slate-300 w-full" />
                                <div className="absolute top-0 h-6 w-px bg-slate-300" />
                                <OrgCard member={child} onSelectMember={onSelectMember} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Flat list view component for mobile screens
function FlatOrgList({ node, depth = 0, onSelectMember }) {
    if (!node) return null;
    return (
        <div className="w-full space-y-2">
            <div
                onClick={() => onSelectMember(node)}
                style={{ paddingLeft: `${Math.min(depth * 14 + 12, 48)}px` }}
                className="p-3 bg-white hover:bg-indigo-50/50 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 cursor-pointer transition-colors"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <img
                        src={
                            node.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                node.name || "User"
                            )}`
                        }
                        alt={node.name}
                        className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                    />
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                            {node.name || "Staff Member"}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                            {node.role || node.designation || "Role Unassigned"} • {node.department || "General"}
                        </p>
                    </div>
                </div>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </div>

            {node.children &&
                node.children.length > 0 &&
                node.children.map((child, i) => (
                    <FlatOrgList
                        key={child.id || child._id || i}
                        node={child}
                        depth={depth + 1}
                        onSelectMember={onSelectMember}
                    />
                ))}
        </div>
    );
}

export default function OrgChartPage() {
    const [orgData, setOrgData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMember, setSelectedMember] = useState(null);
    const [viewMode, setViewMode] = useState("tree"); // "tree" or "list"

    useEffect(() => {
        fetchOrgChart();
    }, []);

    const fetchOrgChart = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/organization/chart");
            const json = res.data;
            setOrgData(json.data || json);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to load organization hierarchy from server."
            );
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(
        () => filterOrgData(orgData, searchTerm),
        [orgData, searchTerm]
    );

    const countTotalNodes = (node) => {
        if (!node) return 0;
        let count = 1;
        if (node.children && node.children.length > 0) {
            node.children.forEach((child) => {
                count += countTotalNodes(child);
            });
        }
        return count;
    };

    const totalEmployees = useMemo(
        () => (orgData ? countTotalNodes(orgData) : 0),
        [orgData]
    );

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6 bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                        <GitBranch className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                                Organization Chart
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Shield size={11} /> Enterprise Hierarchy
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                            Inspect visual reporting structures, leadership hierarchies, and team relations across operating units.
                        </p>
                    </div>
                </div>

                {/* View switcher on mobile/tablet */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 md:hidden self-end">
                    <button
                        type="button"
                        onClick={() => setViewMode("tree")}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "tree"
                            ? "bg-white text-indigo-600 shadow-2xs"
                            : "text-slate-500"
                            }`}
                        title="Tree View"
                    >
                        <LayoutGrid size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "list"
                            ? "bg-white text-indigo-600 shadow-2xs"
                            : "text-slate-500"
                            }`}
                        title="Hierarchy List"
                    >
                        <List size={15} />
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">
                            Hierarchy Nodes
                        </p>
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono mt-0.5 sm:mt-1 tracking-tight">
                            {loading ? "..." : totalEmployees.toLocaleString()}
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl border border-indigo-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-emerald-600 uppercase">
                            Chart Status
                        </p>
                        <h3 className="text-sm sm:text-base font-extrabold text-emerald-600 mt-1 sm:mt-2">
                            Synchronized & Active
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl border border-emerald-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-md flex items-center justify-between group sm:col-span-2 lg:col-span-1">
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-blue-500 uppercase">
                            Layout Structure
                        </p>
                        <h3 className="text-sm sm:text-base font-extrabold text-blue-600 mt-1 sm:mt-2">
                            Hierarchical Tree
                        </h3>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl border border-blue-100/80 shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xs">
                    {error}
                </div>
            )}

            {/* Canvas / Tree Container */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-4 sm:p-6 transition-all duration-300 hover:shadow-md">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6 pb-4 border-b border-slate-100">
                    <div className="relative w-full sm:w-80">
                        <Search
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            size={15}
                        />
                        <input
                            type="text"
                            placeholder="Search by name, role, department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 font-mono self-end sm:self-auto">
                        {searchTerm ? "Filtered View" : "Complete Structure"}
                    </span>
                </div>

                {/* Tree Display */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 min-h-[400px]">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Generating Organization Chart...
                        </span>
                    </div>
                ) : filteredData ? (
                    viewMode === "list" ? (
                        <div className="md:hidden py-2">
                            <FlatOrgList
                                node={filteredData}
                                onSelectMember={setSelectedMember}
                            />
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto overflow-y-hidden py-4 sm:py-8 min-h-[450px] flex justify-start lg:justify-center items-start scroll-smooth">
                            <div className="min-w-fit px-4 pb-4">
                                <OrgCard
                                    member={filteredData}
                                    onSelectMember={setSelectedMember}
                                />
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Users size={40} className="mb-2 opacity-30 text-indigo-500" />
                        <p className="text-xs sm:text-sm font-semibold text-slate-600">
                            No personnel match your search criteria: &ldquo;{searchTerm}&rdquo;
                        </p>
                    </div>
                )}
            </div>

            {/* Member Details Modal */}
            {selectedMember && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedMember(null)}
                >
                    <div
                        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-5 sm:p-6 overflow-hidden space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-600" /> Member Details
                            </h3>
                            <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                                onClick={() => setSelectedMember(null)}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex items-center space-x-3.5">
                            <img
                                src={
                                    selectedMember.avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                        selectedMember.name || "User"
                                    )}`
                                }
                                alt={selectedMember.name}
                                className="w-14 h-14 rounded-2xl object-cover border border-indigo-100 shadow-2xs bg-slate-50 shrink-0"
                            />
                            <div className="min-w-0">
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                    {selectedMember.name}
                                </h4>
                                <p className="text-xs text-indigo-600 font-bold mt-0.5 truncate">
                                    {selectedMember.role || selectedMember.designation}
                                </p>
                                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                    {selectedMember.department}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
                            <div className="flex items-center gap-2 font-medium">
                                <Mail size={14} className="text-indigo-500 shrink-0" />
                                <span className="truncate">
                                    {selectedMember.email || "No email provided"}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => setSelectedMember(null)}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors active:scale-95"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}