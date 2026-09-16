"use client";
import { useEffect, useState } from "react";
import { Loader2, User, Users, BookOpen, GraduationCap, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function TrainersPage() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const { data } = await api.get("/training");
        setTrainings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching trainers:", err);
        toast.error("Failed to load trainers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrainers();
  }, []);

  // Deriving unique trainers from the Training records
  const trainerMap = trainings.reduce((acc, t) => {
    if (!t.trainer) return acc;
    if (!acc[t.trainer]) acc[t.trainer] = [];
    acc[t.trainer].push(t);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading trainers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="text-indigo-600" size={28} />
            Instructors & Trainers
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Overview of active trainers and their assigned training sessions.
          </p>
        </div>
      </div>

      {/* Content Section */}
      {Object.keys(trainerMap).length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <User className="text-slate-300" size={32} />
          </div>
          <p className="text-lg text-slate-800 font-bold">No Trainers Found</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            There are currently no trainers assigned to any programs. Trainers will automatically appear here once they are linked to a training session.
          </p>
        </div>
      ) : (
        /* Trainers Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Object.entries(trainerMap).map(([trainer, sessions]) => (
            <div
              key={trainer}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col group"
            >
              {/* Card Header Background & Avatar */}
              <div className="pt-6 px-6 pb-4 flex flex-col items-center text-center border-b border-slate-50 bg-gradient-to-b from-indigo-50/50 to-white">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-indigo-50 shadow-sm text-indigo-600 font-black text-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  {trainer.charAt(0).toUpperCase()}
                </div>
                <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">{trainer}</h4>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold mt-2 border border-indigo-100">
                  <GraduationCap size={14} />
                  {sessions.length} Session{sessions.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Sessions List */}
              <div className="p-5 flex-1 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <BookOpen size={14} /> Assigned Programs
                </p>
                <div className="space-y-2.5">
                  {sessions.slice(0, 3).map((s) => (
                    <div key={s._id} className="flex items-start gap-2 group/item">
                      <ChevronRight size={14} className="text-slate-300 mt-0.5 shrink-0 group-hover/item:text-indigo-500 transition-colors" />
                      <p className="text-sm text-slate-600 font-medium line-clamp-1 group-hover/item:text-slate-900 transition-colors">
                        {s.title}
                      </p>
                    </div>
                  ))}

                  {/* If there are more than 3 sessions */}
                  {sessions.length > 3 && (
                    <p className="text-xs font-semibold text-indigo-500 pl-6 pt-1">
                      + {sessions.length - 3} more...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}