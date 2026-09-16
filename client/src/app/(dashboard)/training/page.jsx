// src/app/(dashboard)/training/page.jsx
"use client";
import { useEffect, useState } from "react";
import { Loader2, GraduationCap, Users, Award, Calendar, BookOpen, Clock, ArrowRight, X, Mail, Phone } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Modal from "@/components/ui/Modal";

export default function TrainingDashboardPage() {
    const [trainings, setTrainings] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States for Interactivity
    const [viewAllModalOpen, setViewAllModalOpen] = useState(false);
    const [selectedTrainingEnrollments, setSelectedTrainingEnrollments] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [tRes, cRes] = await Promise.all([
                    api.get("/training"),
                    api.get("/training/certifications")
                ]);

                const tData = tRes?.data;
                const cData = cRes?.data;

                setTrainings(Array.isArray(tData) ? tData : Array.isArray(tData?.data) ? tData.data : []);
                setCertifications(Array.isArray(cData) ? cData : Array.isArray(cData?.data) ? cData.data : []);
            } catch (error) {
                console.error("Dashboard fetch error:", error);
                toast.error("Failed to load dashboard data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 font-sans">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-sm text-slate-500 font-medium animate-pulse">Loading training dashboard...</p>
            </div>
        );
    }

    // Safe Metrics Calculation
    const upcoming = trainings.filter((t) => t.status === "upcoming").length;
    const ongoing = trainings.filter((t) => t.status === "ongoing").length;
    const totalEnrolled = trainings.reduce((sum, t) => sum + (t.enrolledEmployees?.length || 0), 0);
    const activeTrainings = trainings.filter((t) => ["ongoing", "upcoming"].includes(t.status));

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <GraduationCap className="text-indigo-600" size={28} />
                        Training Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Overview of training programs, courses, and certifications seamlessly.
                    </p>
                </div>
            </div>

            {/* Metrics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1 */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Trainings</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{trainings.length}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Upcoming</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{upcoming}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Enrolled</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{totalEnrolled}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 4 */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-violet-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <Award size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Certifications</p>
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{certifications.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Trainings List Section */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Active & Upcoming Trainings</h3>
                    <button
                        onClick={() => setViewAllModalOpen(true)}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                        View All <ArrowRight size={16} />
                    </button>
                </div>

                {activeTrainings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Clock className="text-slate-400" size={24} />
                        </div>
                        <p className="text-sm text-slate-700 font-semibold">No active trainings available</p>
                        <p className="text-xs text-slate-500 mt-1">There are no ongoing or upcoming training sessions at the moment.</p>
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {activeTrainings.slice(0, 5).map((t) => (
                            <div
                                key={t._id || t.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 hover:bg-indigo-50/30 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all duration-200 gap-4 group"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-slate-800 text-base group-hover:text-indigo-700 transition-colors">
                                            {t.title}
                                        </h4>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${t.status === 'ongoing' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Users size={14} className="text-slate-400" />
                                            {t.trainer || "TBA"}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} className="text-slate-400" />
                                            {t.startDate ? new Date(t.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Date TBD"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center sm:justify-end">
                                    {/* Clickable Enrolled Button to show list modal */}
                                    <button
                                        onClick={() => setSelectedTrainingEnrollments(t)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
                                        title="Click to view enrolled employees"
                                    >
                                        <Users size={14} className="text-indigo-500" />
                                        <span>{t.enrolledEmployees?.length || 0} Enrolled</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL 1: VIEW ENROLLED EMPLOYEES */}
            <Modal
                isOpen={Boolean(selectedTrainingEnrollments)}
                onClose={() => setSelectedTrainingEnrollments(null)}
                title={`Enrolled Employees — ${selectedTrainingEnrollments?.title || ''}`}
            >
                <div className="space-y-3 mt-2 max-h-80 overflow-y-auto pr-1">
                    {selectedTrainingEnrollments?.enrolledEmployees?.length > 0 ? (
                        selectedTrainingEnrollments.enrolledEmployees.map((emp, index) => (
                            <div key={emp._id || index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                        {emp.name ? emp.name.charAt(0).toUpperCase() : "U"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{emp.name || "Unknown Employee"}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Mail size={12} className="text-slate-400" /> {emp.email || "No email provided"}
                                        </p>
                                    </div>
                                </div>
                                {emp.phone && (
                                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                        <Phone size={12} className="text-slate-400" /> {emp.phone}
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-slate-500 text-sm font-medium">
                            No employees enrolled in this training yet.
                        </div>
                    )}
                </div>
            </Modal>

            {/* MODAL 2: VIEW ALL ACTIVE & UPCOMING TRAININGS */}
            <Modal
                isOpen={viewAllModalOpen}
                onClose={() => setViewAllModalOpen(false)}
                title="All Active & Upcoming Training Programs"
            >
                <div className="space-y-3.5 mt-2 max-h-96 overflow-y-auto pr-1">
                    {activeTrainings.length > 0 ? (
                        activeTrainings.map((t) => (
                            <div key={t._id || t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm">{t.title}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.status === 'ongoing' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">Trainer: <span className="font-medium text-slate-700">{t.trainer || "TBA"}</span></p>
                                </div>
                                <button
                                    onClick={() => {
                                        setViewAllModalOpen(false);
                                        setSelectedTrainingEnrollments(t);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors self-start sm:self-center cursor-pointer"
                                >
                                    View Enrolled ({t.enrolledEmployees?.length || 0})
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-slate-500 text-sm">No trainings found.</div>
                    )}
                </div>
            </Modal>
        </div>
    );
}