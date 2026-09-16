"use client";
import { useEffect, useState } from "react";
import { Loader2, FileText, Download, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function MyDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.employee?._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get("/documents", { params: { employee: user.employee._id } })
      .then(({ data }) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Documents load karne mein samasya aayi."))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2">Documents load ho rahe hain...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Documents</h1>
        <p className="text-sm text-slate-500 mt-1">
          Apne saare uploaded documents yahan dekhein aur download karein.
        </p>
      </div>

      {documents.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm transition-all duration-200">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Koi document upload nahi hua abhi.</p>
            <p className="text-xs text-slate-400 mt-0.5">Jab HR aapke documents add karega, wo yahan dikhenge.</p>
          </div>
        </div>
      ) : (
        /* Documents List Grid/Card with Smooth Hover Effects */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden transition-all duration-200">
          {documents.map((d) => (
            <div
              key={d._id}
              className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 group-hover:scale-105 transition-all duration-200">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {d.title}
                  </p>
                  <p className="text-xs text-slate-400 capitalize mt-0.5">
                    {d.category ? d.category.replace(/-/g, " ") : "General"}
                  </p>
                </div>
              </div>

              <a
                href={d.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
              >
                <Download size={13} /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}