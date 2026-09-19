"use client";
import { useEffect, useState } from "react";
import { Loader2, BookOpen, Users, LayoutList, User } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function CoursesPage() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data } = await api.get("/training");
        setTrainings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching courses:", err);
        toast.error("Failed to load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading courses...</p>
      </div>
    );
  }

  // Group courses by category
  const grouped = trainings.reduce((acc, t) => {
    const cat = t.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-3 lg:p-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="text-indigo-600" size={28} />
            Course Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Browse category-wise available courses and training programs.
          </p>
        </div>
      </div>

      {/* Content Section */}
      {Object.keys(grouped).length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <BookOpen className="text-slate-300" size={32} />
          </div>
          <p className="text-lg text-slate-800 font-bold">No Courses Available</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            There are currently no active courses or training programs. New programs will appear here once created.
          </p>
        </div>
      ) : (
        /* Category Groupings */
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <LayoutList className="text-indigo-500" size={20} />
                  {category}
                </h3>
                <div className="h-px flex-1 bg-slate-200 mt-1"></div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                  {items.length} Course{items.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Courses Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {items.map((t) => (
                  <div
                    key={t._id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group"
                  >
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors line-clamp-1">
                        {t.title}
                      </h4>

                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-2">
                        <User size={14} className="text-slate-400" />
                        <span>{t.trainer || "Instructor TBA"}</span>
                      </div>

                      <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                        {t.description || "No description provided for this course."}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100/50">
                        <Users size={14} />
                        {t.enrolledEmployees?.length || 0} Enrolled
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}