"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, FileText, Trash2, FolderOpen, Edit3, Printer, ExternalLink, UserCheck, Calendar, X, Award } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function ExperienceLettersPage() {
  const { user } = useAuth();
  const category = "experience-letter";
  const title = "Experience & Relieving Letters";
  const description = "Jab koi employee company chhod kar jata hai ya internship complete karta hai, toh experience certificates aur relieving letters yahan manage hote hain.";
  const employeeSpecific = true;

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);

  // Form State for manual record upload
  const [form, setForm] = useState({
    title: "",
    employee: "",
    fileUrl: "",
    visibility: "specific-employee"
  });

  // Experience Letter Generator States (Matching Image Reference Format)
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [expData, setExpData] = useState({
    companyName: "FOURPAYSAVE HI TECH SOLUTIONS PVT LTD",
    letterTitle: "EXPERIENCE LETTER",
    date: new Date().toISOString().split("T")[0],
    candidateName: "Raima Khandelwal",
    designation: "Human Resource Executive",
    startDate: "21/05/2026",
    endDate: "08/06/2026",
    duration: "18 Days",
    responsibilities: "various Human Resource functions including recruitment, employee documentation, attendance management, employee coordination, and other HR-related activities",
    conduct: "satisfactory",
    authorizedSignatory: "Kamlesh Meena",
    signatoryTitle: "Authorized Signatory",
    phone: "+91 9116916013",
    email: "info@4paysave.com",
    address: "Shop No. 6 & 7 Gulab Vihar, Agra Road, Jamdoli, Jaipur, Rajasthan - 302031"
  });

  const isAdmin = ["admin", "hr"].includes(user?.role);

  // Fetch Documents & Employees smoothly
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { category };
      if (!isAdmin && employeeSpecific && user?.employee?._id) {
        params.employee = user.employee._id;
      }

      const [docRes, empRes] = await Promise.all([
        api.get("/documents", { params }),
        isAdmin && employeeSpecific ? api.get("/employees") : Promise.resolve({ data: [] }),
      ]);

      setDocuments(Array.isArray(docRes.data) ? docRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      toast.error("Failed to load experience letters from server.");
    } finally {
      setLoading(false);
    }
  }, [category, isAdmin, employeeSpecific, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Upload or Update Submission
  const handleUpload = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        fileUrl: form.fileUrl,
        category: category,
        employee: form.employee || null,
        visibility: "specific-employee"
      };

      if (editingDocId) {
        await api.put(`/documents/${editingDocId}`, payload);
        toast.success("Experience record updated successfully.");
      } else {
        await api.post("/documents", payload);
        toast.success("Experience letter uploaded successfully.");
      }

      setModalOpen(false);
      setEditingDocId(null);
      setForm({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (doc) => {
    setEditingDocId(doc._id);
    setForm({
      title: doc.title || "",
      employee: doc.employee?._id || doc.employee || "",
      fileUrl: doc.fileUrl || "",
      visibility: doc.visibility || "specific-employee"
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this experience record?")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Experience record deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete experience record.");
    }
  };

  const handlePrintLetter = () => {
    window.print();
  };

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setGeneratorOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-bold shadow-sm transition-all duration-300 active:scale-95 shrink-0 text-xs hover:shadow-md hover:shadow-emerald-100"
            >
              <Award size={16} /> Generate Experience Letter
            </button>
            <Button
              onClick={() => {
                setEditingDocId(null);
                setForm({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });
                setModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold shadow-sm transition-all duration-300 hover:shadow-indigo-200 hover:shadow-lg active:scale-95 group shrink-0 text-xs"
            >
              <span className="transition-transform duration-300 group-hover:rotate-90 font-black text-base">+</span>
              Upload Record
            </Button>
          </div>
        )}
      </div>

      {/* Documents List Section */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-600 h-9 w-9" />
          <p className="text-xs text-slate-400 mt-3 font-semibold animate-pulse">Syncing experience letters from server...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 shadow-xs">
            <FolderOpen size={30} />
          </div>
          <p className="text-base font-bold text-slate-800">No experience letters found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Generate or upload employee experience and relieving letters above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
          {documents.map((d) => (
            <div
              key={d._id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:bg-indigo-50/40 hover:shadow-sm group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors duration-200">{d.title}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    {d.employee?.name && (
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/60">
                        <UserCheck size={12} /> {d.employee.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Calendar size={12} /> {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons with Smooth Hover */}
              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                {d.fileUrl && (
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs hover:shadow-md hover:shadow-indigo-100 active:scale-95 border border-indigo-100 group/view"
                  >
                    <span>View</span>
                    <ExternalLink size={13} className="transition-transform duration-300 group-hover/view:translate-x-0.5 group-hover/view:-translate-y-0.5" />
                  </a>
                )}

                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleEditClick(d)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/edit"
                      title="Edit Record"
                    >
                      <Edit3 size={14} className="transition-transform duration-300 group-hover/edit:rotate-12" /> Edit
                    </button>

                    <button
                      onClick={() => handleDelete(d._id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/del border border-rose-100"
                      title="Delete Record"
                    >
                      <Trash2 size={14} className="transition-transform duration-300 group-hover/del:scale-110" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Experience Letter Generator Modal */}
      {generatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-black text-slate-900">Experience Letter Generator & Customizer</h3>
                <button
                  onClick={() => setIsEditingLetter(!isEditingLetter)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isEditingLetter ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                >
                  <Edit3 size={13} /> {isEditingLetter ? "Switch to A4 Preview" : "Edit Letter Fields"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintLetter}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <Printer size={14} /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setGeneratorOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
              {isEditingLetter ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 max-w-2xl mx-auto text-xs">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Edit Certificate Details</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-500">Candidate Name</label>
                      <input
                        value={expData.candidateName}
                        onChange={(e) => setExpData({ ...expData, candidateName: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Designation / Role</label>
                      <input
                        value={expData.designation}
                        onChange={(e) => setExpData({ ...expData, designation: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Start Date</label>
                      <input
                        value={expData.startDate}
                        onChange={(e) => setExpData({ ...expData, startDate: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">End Date</label>
                      <input
                        value={expData.endDate}
                        onChange={(e) => setExpData({ ...expData, endDate: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Authorized Signatory</label>
                      <input
                        value={expData.authorizedSignatory}
                        onChange={(e) => setExpData({ ...expData, authorizedSignatory: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Duration Text</label>
                      <input
                        value={expData.duration}
                        onChange={(e) => setExpData({ ...expData, duration: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditingLetter(false)}
                    className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                  >
                    Apply Changes & View Certificate
                  </button>
                </div>
              ) : (
                /* A4 Experience Letter Preview Layout Matching Reference Image */
                <div className="w-full max-w-[210mm] mx-auto bg-white p-12 rounded-2xl shadow-xl border border-slate-200 text-slate-800 font-sans text-xs space-y-6 print:shadow-none print:p-0 relative">

                  {/* Top Header Title */}
                  <div className="text-center pb-4 border-b border-slate-200">
                    <h1 className="text-base font-black tracking-widest text-slate-900 uppercase">EXPERIENCE LETTER</h1>
                  </div>

                  {/* To Whom & Date */}
                  <div className="flex justify-between items-center pt-2">
                    <p className="font-bold text-slate-900 tracking-wide">TO WHOMSOEVER IT MAY CONCERN</p>
                    <p className="font-semibold text-slate-600">Date: {expData.date}</p>
                  </div>

                  {/* Body Content Matching Reference */}
                  <div className="space-y-4 text-slate-700 leading-relaxed pt-2 text-[12px]">
                    <p>
                      This is to certify that <strong className="text-slate-900 border-b border-dashed border-slate-400 pb-0.5">Ms. {expData.candidateName}</strong> was employed with <strong className="text-slate-900">{expData.companyName}</strong> as a <strong className="text-slate-900">{expData.designation}</strong> from <strong className="text-slate-900">[{expData.startDate}]</strong> to <strong className="text-slate-900">{expData.endDate}</strong>.
                    </p>

                    <p>
                      During her tenure of <strong className="text-slate-900">[{expData.duration}]</strong>, she was responsible for <span className="text-slate-800">{expData.responsibilities}</span>.
                    </p>

                    <p>
                      She performed her duties sincerely and professionally, and her conduct was found to be <span className="text-slate-900 font-semibold">{expData.conduct}</span>.
                    </p>

                    <p>
                      We appreciate her contributions to the organization and wish her success in all her future endeavors.
                    </p>
                  </div>

                  {/* Company Name Signature Block */}
                  <div className="pt-6 space-y-1">
                    <p className="font-bold text-slate-900 text-[11px]">For {expData.companyName}.</p>
                    <p className="font-semibold text-slate-700 pt-4">{expData.signatoryTitle}</p>
                    <div className="pt-6">
                      <p className="font-bold text-slate-900 border-b border-slate-400 w-48 pb-1">{expData.authorizedSignatory}</p>
                      <p className="text-[11px] text-slate-600 pt-0.5">{expData.signatoryTitle}</p>
                      <p className="text-[10px] text-slate-400 pt-1 font-semibold">(Company Seal)</p>
                    </div>
                  </div>

                  {/* Footer Contact Details */}
                  <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2 mt-12 bg-slate-50 p-3 rounded-xl">
                    <span>📞 {expData.phone}</span>
                    <span>✉️ {expData.email}</span>
                    <span className="text-right">📍 {expData.address}</span>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Record Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDocId ? "Edit Experience Record" : "Upload Experience Record"}>
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="e.g. Experience Letter - Raima Khandelwal"
            />
          </div>

          {employeeSpecific && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Assign Employee</label>
              <select
                required
                value={form.employee}
                onChange={(e) => setForm({ ...form, employee: e.target.value })}
                className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 text-slate-700 font-medium cursor-pointer"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">File URL (Cloud PDF Link)</label>
            <input
              required
              type="url"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="https://example.com/experience-letter.pdf"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg active:scale-[0.99]"
            >
              {editingDocId ? "Update Record" : "Upload & Save Record"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}