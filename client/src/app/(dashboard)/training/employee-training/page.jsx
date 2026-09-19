// src/app/(dashboard)/training/employee/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, CalendarDays, User, MonitorPlay, Laptop, Users, GraduationCap, XCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const getEmployeeId = (user) => {
  if (!user) return null;
  if (user.employee) {
    if (typeof user.employee === "object") {
      return user.employee._id || user.employee.id;
    }
    return user.employee;
  }
  return user.employeeId || user._id || user.id;
};

export default function EmployeeTrainingPage() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);

  const empId = getEmployeeId(user);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get("/training");

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.trainings)
            ? data.trainings
            : [];

      setTrainings(list.filter(t => t.status === "upcoming" || t.status === "ongoing" || !t.status));
    } catch (err) {
      console.error("Error loading trainings:", err);
      toast.error("Failed to load trainings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEnroll = async (trainingId) => {
    const currentEmpId = getEmployeeId(user);
    console.log("Enrolling with Employee ID:", currentEmpId); // 👈 Yeh console me check karna kya aa raha hai

    if (!currentEmpId) {
      return toast.error("Your account is not linked to an Employee profile.");
    }

    setEnrollingId(trainingId);
    try {
      const { data } = await api.put(`/training/${trainingId}/enroll`, { employeeId: currentEmpId });

      const updatedTraining = data?.training;
      if (updatedTraining && (updatedTraining._id || updatedTraining.id)) {
        setTrainings((prev) =>
          prev.map((t) => ((t._id || t.id) === (updatedTraining._id || updatedTraining.id) ? updatedTraining : t))
        );
      }

      toast.success(data?.message || "Successfully enrolled in the training! 🎉");
      await fetchData();
    } catch (err) {
      console.error("Enroll error full details:", err.response?.data || err);
      const errorMsg = err.response?.data?.message || "Failed to enroll. Please try again.";
      toast.error(errorMsg);
    } finally {
      setEnrollingId(null);
    }
  };

  const isEnrolled = (training) => {
    if (!empId || !training.enrolledEmployees) return false;
    return training.enrolledEmployees.some((item) => {
      if (!item) return false;
      const idString = typeof item === "object" ? (item._id || item.id) : item;
      return String(idString).trim() === String(empId).trim();
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Finding training programs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200/80 pb-5 bg-white p-6 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <GraduationCap size={24} />
            </div>
            Training Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Browse and enroll in available training programs to keep growing your professional skills.
          </p>
        </div>
      </div>

      {trainings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-xs">
          <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-xs">
            <MonitorPlay className="text-slate-400" size={32} />
          </div>
          <p className="text-lg text-slate-800 font-bold">No Trainings Available</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            There are no training sessions available right now. Check back later for new opportunities!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trainings.map((t) => {
            const enrolled = isEnrolled(t);
            const enrolledCount = Array.isArray(t.enrolledEmployees) ? t.enrolledEmployees.length : 0;
            const capacity = t.maxParticipants && t.maxParticipants > 0 ? t.maxParticipants : 50;
            const isFull = enrolledCount >= capacity;

            return (
              <div key={t._id || t.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full group">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                      {t.title}
                    </h4>
                    <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl p-2 text-xs capitalize shrink-0 border border-slate-200" title={`Mode: ${t.mode}`}>
                      {t.mode === "online" ? <Laptop size={14} /> : <Users size={14} />}
                    </span>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                      <User size={15} className="text-slate-400 shrink-0" />
                      <span className="truncate">{t.trainer || "Instructor TBA"}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                      <CalendarDays size={15} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {formatDate(t.startDate)} — {formatDate(t.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 pt-1">
                      <Users size={15} className="text-indigo-500 shrink-0" />
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                        {enrolledCount} / {capacity} Enrolled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  {enrolled ? (
                    <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 shadow-2xs cursor-default">
                      <CheckCircle2 size={15} /> Enrolled Successfully
                    </div>
                  ) : isFull ? (
                    <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold border border-slate-200 cursor-not-allowed">
                      <XCircle size={15} /> Training Full
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      loading={enrollingId === (t._id || t.id)}
                      onClick={() => handleEnroll(t._id || t.id)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 py-2.5 rounded-xl font-semibold transition-all cursor-pointer active:scale-95"
                    >
                      Enroll Now
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}