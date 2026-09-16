"use client";

import React, { useEffect, useState } from "react";
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
    Building2
} from "lucide-react";
import api from "@/lib/api";

// Recursive function to search nodes based on search term
function filterOrgData(node, term) {
    if (!node) return null;
    if (!term) return node;
    const matches = node.name?.toLowerCase().includes(term.toLowerCase()) ||
        node.role?.toLowerCase().includes(term.toLowerCase()) ||
        node.department?.toLowerCase().includes(term.toLowerCase());

    let filteredChildren = [];
    if (node.children && node.children.length > 0) {
        filteredChildren = node.children
            .map(child => filterOrgData(child, term))
            .filter(Boolean);
    }

    if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children };
    }
    return null;
}

// Employee Card Component with smooth hover & modern depth matching your HRMS style
function OrgCard({ member, onSelectMember }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = member.children && member.children.length > 0;

    // Fallback avatar initial generator if avatar is missing
    const avatarImg = member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name || 'User'}`;

    return (
        <div className="flex flex-col items-center">
            {/* Node Card with Elevated Hover Effects */}
            <div
                onClick={() => onSelectMember(member)}
                className="relative group bg-white border border-slate-200/80 rounded-2xl p-4 w-72 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500 cursor-pointer overflow-hidden"
            >
                {/* Top Glowing Indicator Line on Hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex items-center space-x-3.5">
                    <img
                        src={avatarImg}
                        alt={member.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-100 group-hover:border-indigo-500 transition-all shadow-sm shrink-0 bg-slate-50"
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {member.name || "Unnamed Leader"}
                        </h4>
                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{member.role || member.designation || "Role Unassigned"}</p>
                        <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100/60">
                            <Briefcase size={10} /> {member.department || "General"}
                        </span>
                    </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                    <span className="truncate max-w-[180px] flex items-center gap-1.5 font-medium text-slate-500">
                        <Mail size={12} className="text-slate-400 shrink-0" /> {member.email || "No email listed"}
                    </span>

                    {hasChildren && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="z-10 p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/60 transition-all shadow-2xs cursor-pointer"
                            title={isExpanded ? "Collapse Subtree" : "Expand Subtree"}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Children Tree Branch Connector */}
            {hasChildren && isExpanded && (
                <div className="relative pt-6 flex flex-col items-center">
                    <div className="absolute top-0 h-6 w-px bg-slate-300"></div>

                    <div className="flex flex-row space-x-6 relative">
                        {member.children.map((child, index) => (
                            <div key={child.id || child._id || index} className="relative flex flex-col items-center pt-6">
                                <div className="absolute top-0 h-px bg-slate-300 w-full"></div>
                                <div className="absolute top-0 h-6 w-px bg-slate-300"></div>
                                <OrgCard member={child} onSelectMember={onSelectMember} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OrgChartPage() {
    const [orgData, setOrgData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMember, setSelectedMember] = useState(null);

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
            setError(err.response?.data?.message || "Failed to load organization hierarchy from server.");
        } finally {
            setLoading(false);
        }
    };

    const filteredData = filterOrgData(orgData, searchTerm);

    // Dynamic metrics count calculation for cards row
    const countTotalNodes = (node) => {
        if (!node) return 0;
        let count = 1;
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                count += countTotalNodes(child);
            });
        }
        return count;
    };

    const totalEmployees = orgData ? countTotalNodes(orgData) : 0;

    return (
        <div className="p-8 space-y-6 bg-[#f8fafc] min-h-screen font-sans">

            {/* Top Header Card Matching Other Org Pages */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 hover:scale-105">
                        <GitBranch className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Organization Chart</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Shield size={11} /> Enterprise Hierarchy
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Company ki visual hierarchy, team structure aur reporting lines yahan manage karein.</p>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Row with Smooth Hover Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">TOTAL HIERARCHY NODES</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? "..." : totalEmployees}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">CHART STATUS</p>
                        <h3 className="text-xl font-extrabold text-emerald-600 mt-2">Active & Synced</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Shield className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center justify-between group cursor-pointer">
                    <div>
                        <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">VISUAL STRUCTURE</p>
                        <h3 className="text-xl font-extrabold text-blue-600 mt-2">Tree Expanded</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Error Alert if any */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-semibold shadow-2xs">
                    {error}
                </div>
            )}

            {/* Main Org Chart Container Card with Search & Canvas */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 transition-all duration-300 hover:shadow-md">

                {/* Search Bar Bar Section */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input
                            type="text"
                            placeholder="Search by name, role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800 transition-all shadow-2xs"
                        />
                    </div>
                </div>

                {/* Tree Canvas Area */}
                <div className="overflow-x-auto py-8 min-h-[500px] flex justify-center items-start">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                            <Loader2 className="animate-spin text-indigo-600" size={36} />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 animate-pulse">Building organization hierarchy...</span>
                        </div>
                    ) : filteredData ? (
                        <OrgCard member={filteredData} onSelectMember={setSelectedMember} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Users size={48} className="mb-3 opacity-30 text-indigo-500" />
                            <p className="text-sm font-semibold text-slate-600">Koi employee nahi mila "{searchTerm}" ke liye.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Member Profile Quick View Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedMember(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 overflow-hidden transform transition-all duration-200 space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-600" /> Profile Details
                            </h3>
                            <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer" onClick={() => setSelectedMember(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex items-center space-x-4">
                            <img src={selectedMember.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.name}`} alt={selectedMember.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-sm bg-slate-50" />
                            <div>
                                <h4 className="text-base font-bold text-slate-900">{selectedMember.name}</h4>
                                <p className="text-xs text-indigo-600 font-bold mt-0.5">{selectedMember.role || selectedMember.designation}</p>
                                <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                    {selectedMember.department}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60">
                            <div className="flex items-center gap-2.5 font-medium">
                                <Mail size={15} className="text-indigo-500 shrink-0" />
                                <span className="truncate">{selectedMember.email || "No email provided"}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
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