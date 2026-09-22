"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  Tag,
  Eye,
  X,
  Sparkles,
  RefreshCw,
  FolderOpen,
  FileCheck2,
  FileSpreadsheet,
  FileCode2,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Safe resolver for Employee or User ID
  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      null
    );
  }, [user]);

  // Deep unwrapper for multiple backend response standards
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.documents)) return resData.documents;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.result)) return resData.result;
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let records = [];

      // 1. Direct personal endpoints (Token-based authentication)
      const directEndpoints = [
        "/documents/my-documents",
        "/documents/my",
        "/documents/me",
        "/documents/employee/me",
      ];

      for (const endpoint of directEndpoints) {
        try {
          const res = await api.get(endpoint);
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
            break;
          }
        } catch {
          // Next probe
        }
      }

      // 2. Query with Employee / User ID
      if (records.length === 0 && employeeId) {
        const queryEndpoints = [
          { url: "/documents", params: { employee: employeeId } },
          { url: "/documents", params: { employeeId: employeeId } },
          { url: "/documents", params: { user: employeeId } },
        ];

        for (const item of queryEndpoints) {
          try {
            const res = await api.get(item.url, { params: item.params });
            const parsed = extractList(res.data);
            if (parsed && parsed.length > 0) {
              records = parsed;
              break;
            }
          } catch {
            // Continue
          }
        }
      }

      // 3. Fallback for Admin role
      if (records.length === 0 && (user?.role === "admin" || user?.role === "superadmin")) {
        try {
          const res = await api.get("/documents");
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
          }
        } catch {
          // No-op
        }
      }

      setDocuments(records);
    } catch (err) {
      console.error("Documents fetch error:", err);
      toast.error("Documents load karne mein samasya aayi.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [employeeId, extractList, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedDoc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getFileUrl = (doc) => {
    return doc?.fileUrl || doc?.url || doc?.path || doc?.file || "#";
  };

  const getDocName = (doc) => {
    return doc?.title || doc?.name || doc?.fileName || doc?.documentName || "Untitled Document";
  };

  const getCategory = (doc) => {
    return doc?.category || doc?.type || doc?.documentType || "General";
  };

  if (loading && !isRefreshing) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2 font-medium">Documents load ho rahe hain...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-md shadow-indigo-100 shrink-0">
            <FolderOpen size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Documents</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                <Sparkles size={12} /> Verified Records
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Apne saare official contracts, identity proofs, aur employment documents yahan dekhein.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh documents"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Total Files: <span className="text-indigo-600 font-bold">{documents.length}</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-slate-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 border border-indigo-100/50 shadow-xs">
            <FileText size={30} />
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-base font-bold text-slate-800">Koi document upload nahi hua abhi</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Jab HR ya management aapke profile par documents add karega, wo yahan show honge.
            </p>
          </div>
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            Dobara Check Karein
          </button>
        </div>
      ) : (
        /* Documents Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((d, idx) => {
            const docId = d._id || d.id || idx;
            const docName = getDocName(d);
            const docCategory = getCategory(d);
            const fileUrl = getFileUrl(d);
            const isSelected = (selectedDoc?._id || selectedDoc?.id) === docId;

            return (
              <div
                key={docId}
                onClick={() => setSelectedDoc(d)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === "Enter" && setSelectedDoc(d)}
                className={`group relative bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between outline-hidden
                  ${isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/15 shadow-md bg-indigo-50/10"
                    : "border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-300 hover:-translate-y-1 active:scale-[0.99]"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <FileText size={22} />
                    </div>
                    <Badge variant="neutral" className="capitalize text-[11px]">
                      {docCategory.replace(/[-_]/g, " ")}
                    </Badge>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {docName}
                  </h4>

                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    Uploaded:{" "}
                    <span className="text-slate-600 font-medium">
                      {d.createdAt || d.uploadedAt || d.date
                        ? new Date(d.createdAt || d.uploadedAt || d.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                        : "Verified"}
                    </span>
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 flex items-center gap-1">
                    <Eye size={13} /> View Details
                  </span>

                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-xl transition-all duration-150 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Download size={13} /> Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Center Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/80 to-white">
              <div className="flex items-start gap-3.5 pr-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                  <FileCheck2 size={22} />
                </div>
                <div>
                  <Badge variant="neutral" className="capitalize text-[11px] mb-1">
                    {getCategory(selectedDoc).replace(/[-_]/g, " ")}
                  </Badge>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {getDocName(selectedDoc)}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Tag size={12} /> Document Category
                  </span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {getCategory(selectedDoc)}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Upload Date
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedDoc.createdAt || selectedDoc.uploadedAt
                      ? new Date(selectedDoc.createdAt || selectedDoc.uploadedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "Verified Record"}
                  </span>
                </div>
              </div>

              {selectedDoc.description && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description / Notes
                  </span>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    {selectedDoc.description}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <a
                href={getFileUrl(selectedDoc)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <Download size={14} /> Open / Download File
              </a>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}