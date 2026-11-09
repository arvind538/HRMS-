

"use client";

import DocumentWorkspace from "@/components/documents/DocumentWorkspace";

export default function Page() {
  return <DocumentWorkspace page="offer-letter" />;
}




// "use client";
// import { useEffect, useState, useCallback, useRef } from "react";
// import { Plus, Loader2, FileText, Trash2, FolderOpen, Edit3, Printer, ExternalLink, UserCheck, Calendar, X, Building, CheckCircle2 } from "lucide-react";
// import api from "@/lib/api";
// import { toast } from "react-toastify";
// import Button from "@/components/ui/Button";
// import Modal from "@/components/ui/Modal";
// import { useAuth } from "@/context/AuthContext";

// export default function OfferLettersPage() {
//   const { user } = useAuth();
//   const category = "offer-letter";
//   const title = "Offer Letters";
//   const description = "Employees ke generated aur signed offer letters manage karein.";
//   const employeeSpecific = true;

//   const [documents, setDocuments] = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [editingDocId, setEditingDocId] = useState(null);

//   // Form State for manual document upload / database record
//   const [form, setForm] = useState({
//     title: "",
//     employee: "",
//     fileUrl: "",
//     visibility: "specific-employee"
//   });

//   // Offer Letter Generator States (Matches exact provided PDF)
//   const [generatorOpen, setGeneratorOpen] = useState(false);
//   const [isEditingLetter, setIsEditingLetter] = useState(false);

//   const [offerData, setOfferData] = useState({
//     companyName: "FOURPAYSAVE HI TECH SOLUTIONS PRIVATE LIMITED",
//     shortCompany: "FOURPAYSAVE",
//     subTitle: "HI TECH SOLUTIONS PVT LTD",
//     letterTitle: "INTERNSHIP OFFER LETTER",
//     date: "01/10/2026",
//     candidateName: "Devesh Vaishnav",
//     position: "Frontend Developer Intern",
//     subject: "Internship Offer Letter - Frontend Developer Intern",
//     duration: "3 Months",
//     type: "Completely Unpaid Internship",
//     workMode: "Work From Office",
//     location: "Shop No.6&7, Gulab Vihar, Agra Road, Jamdoli, Jaipur, Rajasthan -302031",
//     officeTiming: "10:00 AM to 5:00 PM",
//     interviewDate: "30/09/2026",
//     joiningDate: "01/10/2026",
//     department: "Technology / Development",
//     reportingTo: "Krishan Kant Saini",
//     terms: [
//       "This will be a completely unpaid internship for the entire 3-month period. No salary, stipend, or remuneration will be provided by the company.",
//       "The company will not provide or reimburse any expenses, including travel, food, accommodation, internet/mobile, or any other personal expenses.",
//       "The intern must follow the company's prescribed working hours, rules, policies, and professional standards.",
//       "The intern must maintain strict confidentiality regarding all company information, projects, documents, client information, and data.",
//       "Any prolonged absence, misconduct, violation of company policies, or unsatisfactory performance may result in termination of the internship.",
//       "Upon successful completion of the full 3-month internship and assigned responsibilities, the company will provide an Internship Completion Certificate.",
//       "This internship does not guarantee permanent employment. Any future employment opportunity will depend on performance, business requirements, vacancies, and management's decision."
//     ],
//     hrName: "Raima Khandelwal",
//     hrRole: "HR Manager",
//     phone: "+91 9116916013",
//     email: "info@4paysave.com",
//     address: "Shop No. 6 & 7 Gulab Vihar, Agra Road, Jamdoli, Jaipur, Rajasthan - 302031"
//   });

//   const isAdmin = ["admin", "hr"].includes(user?.role);

//   // Fetch Documents & Employees
//   const fetchData = useCallback(async () => {
//     setLoading(true);
//     try {
//       const params = { category };
//       if (!isAdmin && employeeSpecific && user?.employee?._id) {
//         params.employee = user.employee._id;
//       }

//       const [docRes, empRes] = await Promise.all([
//         api.get("/documents", { params }),
//         isAdmin && employeeSpecific ? api.get("/employees") : Promise.resolve({ data: [] }),
//       ]);

//       setDocuments(Array.isArray(docRes.data) ? docRes.data : []);
//       setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
//     } catch (err) {
//       toast.error("Failed to load offer letters from the server.");
//     } finally {
//       setLoading(false);
//     }
//   }, [category, isAdmin, employeeSpecific, user]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   // Handle Upload or Update Submission
//   const handleUpload = async (e) => {
//     e.preventDefault();
//     setSubmitting(true);
//     try {
//       const payload = {
//         title: form.title,
//         fileUrl: form.fileUrl,
//         category: category,
//         employee: form.employee || null,
//         visibility: "specific-employee"
//       };

//       if (editingDocId) {
//         await api.put(`/documents/${editingDocId}`, payload);
//         toast.success("Offer letter record updated successfully.");
//       } else {
//         await api.post("/documents", payload);
//         toast.success("Offer letter uploaded successfully.");
//       }

//       setModalOpen(false);
//       setEditingDocId(null);
//       setForm({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });
//       fetchData();
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Operation failed.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleEditClick = (doc) => {
//     setEditingDocId(doc._id);
//     setForm({
//       title: doc.title || "",
//       employee: doc.employee?._id || doc.employee || "",
//       fileUrl: doc.fileUrl || "",
//       visibility: doc.visibility || "specific-employee"
//     });
//     setModalOpen(true);
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this offer letter record?")) return;
//     try {
//       await api.delete(`/documents/${id}`);
//       toast.success("Offer letter deleted successfully.");
//       fetchData();
//     } catch (err) {
//       toast.error("Failed to delete offer letter.");
//     }
//   };

//   // When selecting an employee from the generator form
//   const handleSelectEmployeeForOffer = (empId) => {
//     const selected = employees.find((emp) => emp._id === empId);
//     if (selected) {
//       setOfferData((prev) => ({
//         ...prev,
//         candidateName: selected.name || prev.candidateName,
//         position: selected.designation || prev.position,
//         subject: `Internship Offer Letter - ${selected.designation || prev.position}`,
//         department: selected.department?.name || prev.department
//       }));
//     }
//   };

//   const handlePrintOfferLetter = () => {
//     window.print();
//   };

//   return (
//     <div className="space-y-6 transition-all duration-300">
//       {/* Print Specific CSS to ensure exact A4 page export */}
//       <style jsx global>{`
//         @media print {
//           body * {
//             visibility: hidden !important;
//           }
//           #printable-offer-letter,
//           #printable-offer-letter * {
//             visibility: visible !important;
//           }
//           #printable-offer-letter {
//             position: absolute !important;
//             left: 0 !important;
//             top: 0 !important;
//             width: 100% !important;
//             padding: 24px !important;
//             margin: 0 !important;
//             box-shadow: none !important;
//             border: none !important;
//             background: white !important;
//           }
//           @page {
//             size: A4 portrait;
//             margin: 12mm 10mm 12mm 10mm;
//           }
//         }
//       `}</style>

//       {/* Page Header */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
//         <div>
//           <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
//           <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>
//         </div>
//         {isAdmin && (
//           <div className="flex items-center gap-2.5">
//             <button
//               onClick={() => setGeneratorOpen(true)}
//               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-bold shadow-sm transition-all duration-300 active:scale-95 shrink-0 text-xs hover:shadow-md hover:shadow-emerald-100"
//             >
//               <FileText size={16} /> Generate A4 Offer Letter
//             </button>
//             <Button
//               onClick={() => {
//                 setEditingDocId(null);
//                 setForm({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });
//                 setModalOpen(true);
//               }}
//               className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold shadow-sm transition-all duration-300 hover:shadow-indigo-200 hover:shadow-lg active:scale-95 group shrink-0 text-xs"
//             >
//               <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90 font-black" />
//               Upload Document Record
//             </Button>
//           </div>
//         )}
//       </div>

//       {/* Documents List Section */}
//       {loading ? (
//         <div className="py-24 text-center">
//           <Loader2 className="animate-spin mx-auto text-indigo-600 h-9 w-9" />
//           <p className="text-xs text-slate-400 mt-3 font-semibold animate-pulse">Syncing offer letters from backend...</p>
//         </div>
//       ) : documents.length === 0 ? (
//         <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm hover:shadow-md transition-all duration-300">
//           <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 shadow-xs">
//             <FolderOpen size={30} />
//           </div>
//           <p className="text-base font-bold text-slate-800">No offer letters found</p>
//           <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Generate or upload candidate offer letters using the buttons above.</p>
//         </div>
//       ) : (
//         <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
//           {documents.map((d) => (
//             <div
//               key={d._id}
//               className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:bg-indigo-50/40 hover:shadow-sm group"
//             >
//               <div className="flex items-center gap-4 min-w-0">
//                 <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md">
//                   <FileText size={22} />
//                 </div>
//                 <div className="min-w-0">
//                   <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors duration-200">{d.title}</p>
//                   <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
//                     {d.employee?.name && (
//                       <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/60">
//                         <UserCheck size={12} /> {d.employee.name}
//                       </span>
//                     )}
//                     <span className="inline-flex items-center gap-1 text-slate-500">
//                       <Calendar size={12} /> {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
//                     </span>
//                   </p>
//                 </div>
//               </div>

//               {/* Action Buttons */}
//               <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
//                 {d.fileUrl && (
//                   <a
//                     href={d.fileUrl}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs hover:shadow-md hover:shadow-indigo-100 active:scale-95 border border-indigo-100 group/view"
//                   >
//                     <span>View</span>
//                     <ExternalLink size={13} className="transition-transform duration-300 group-hover/view:translate-x-0.5 group-hover/view:-translate-y-0.5" />
//                   </a>
//                 )}

//                 {isAdmin && (
//                   <>
//                     <button
//                       onClick={() => handleEditClick(d)}
//                       className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/edit"
//                       title="Edit Offer Letter"
//                     >
//                       <Edit3 size={14} className="transition-transform duration-300 group-hover/edit:rotate-12" /> Edit
//                     </button>

//                     <button
//                       onClick={() => handleDelete(d._id)}
//                       className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/del border border-rose-100"
//                       title="Delete Offer Letter"
//                     >
//                       <Trash2 size={14} className="transition-transform duration-300 group-hover/del:scale-110" /> Delete
//                     </button>
//                   </>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* A4 Offer Letter Generator & Customizer Modal */}
//       {generatorOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
//           <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
//             {/* Modal Header Controls */}
//             <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
//               <div className="flex items-center gap-3">
//                 <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
//                   <FileText className="text-indigo-600" size={18} /> Offer Letter Studio
//                 </h3>
//                 <button
//                   onClick={() => setIsEditingLetter(!isEditingLetter)}
//                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isEditingLetter ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
//                     }`}
//                 >
//                   <Edit3 size={13} /> {isEditingLetter ? "Show A4 Preview" : "Edit Fields"}
//                 </button>
//               </div>

//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={handlePrintOfferLetter}
//                   className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 hover:shadow-emerald-200 hover:shadow-md"
//                 >
//                   <Printer size={15} /> Print / Save PDF
//                 </button>
//                 <button
//                   onClick={() => setGeneratorOpen(false)}
//                   className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
//                 >
//                   <X size={20} />
//                 </button>
//               </div>
//             </div>

//             {/* Modal Body */}
//             <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
//               {isEditingLetter ? (
//                 /* Editable Form Tab */
//                 <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5 max-w-3xl w-full">
//                   <div className="border-b pb-3 flex items-center justify-between">
//                     <div>
//                       <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Candidate & Offer Configurations</h4>
//                       <p className="text-xs text-slate-400">Yahan details update karke 'Show A4 Preview' pe click karein.</p>
//                     </div>
//                     {employees.length > 0 && (
//                       <select
//                         onChange={(e) => handleSelectEmployeeForOffer(e.target.value)}
//                         className="text-xs px-3 py-1.5 border rounded-lg bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold cursor-pointer outline-none"
//                       >
//                         <option value="">Auto-fill from Employee list</option>
//                         {employees.map((emp) => (
//                           <option key={emp._id} value={emp._id}>{emp.name}</option>
//                         ))}
//                       </select>
//                     )}
//                   </div>

//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Candidate Name</label>
//                       <input
//                         value={offerData.candidateName}
//                         onChange={(e) => setOfferData({ ...offerData, candidateName: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Position / Designation</label>
//                       <input
//                         value={offerData.position}
//                         onChange={(e) => setOfferData({
//                           ...offerData,
//                           position: e.target.value,
//                           subject: `Internship Offer Letter - ${e.target.value}`
//                         })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Duration</label>
//                       <input
//                         value={offerData.duration}
//                         onChange={(e) => setOfferData({ ...offerData, duration: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Type / Stipend Status</label>
//                       <input
//                         value={offerData.type}
//                         onChange={(e) => setOfferData({ ...offerData, type: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Interview Date</label>
//                       <input
//                         value={offerData.interviewDate}
//                         onChange={(e) => setOfferData({ ...offerData, interviewDate: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Joining Date / Issue Date</label>
//                       <input
//                         value={offerData.joiningDate}
//                         onChange={(e) => setOfferData({ ...offerData, joiningDate: e.target.value, date: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Department</label>
//                       <input
//                         value={offerData.department}
//                         onChange={(e) => setOfferData({ ...offerData, department: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Reporting Manager / To</label>
//                       <input
//                         value={offerData.reportingTo}
//                         onChange={(e) => setOfferData({ ...offerData, reportingTo: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">Office Timing</label>
//                       <input
//                         value={offerData.officeTiming}
//                         onChange={(e) => setOfferData({ ...offerData, officeTiming: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                     <div>
//                       <label className="text-xs font-bold text-slate-600">HR Name & Role</label>
//                       <div className="grid grid-cols-2 gap-2">
//                         <input
//                           value={offerData.hrName}
//                           onChange={(e) => setOfferData({ ...offerData, hrName: e.target.value })}
//                           className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                           placeholder="Name"
//                         />
//                         <input
//                           value={offerData.hrRole}
//                           onChange={(e) => setOfferData({ ...offerData, hrRole: e.target.value })}
//                           className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                           placeholder="Role"
//                         />
//                       </div>
//                     </div>
//                     <div className="sm:col-span-2">
//                       <label className="text-xs font-bold text-slate-600">Office Location</label>
//                       <input
//                         value={offerData.location}
//                         onChange={(e) => setOfferData({ ...offerData, location: e.target.value })}
//                         className="mt-1 w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
//                       />
//                     </div>
//                   </div>

//                   <button
//                     onClick={() => setIsEditingLetter(false)}
//                     className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
//                   >
//                     <CheckCircle2 size={16} /> Save Changes & View A4 Offer Letter
//                   </button>
//                 </div>
//               ) : (
//                 /* EXACT A4 PREVIEW (Matching User's Reference PDF) */
//                 <div
//                   id="printable-offer-letter"
//                   className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-2xl border border-slate-300 text-slate-900 font-sans text-[11px] leading-relaxed flex flex-col justify-between"
//                   style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
//                 >
//                   <div>
//                     {/* Header: Logo, Company Name, Letter Title */}
//                     <div className="flex items-start justify-between border-b pb-4 mb-4">
//                       {/* Left: Brand Badge & Info */}
//                       <div className="flex items-center gap-3">
//                         {/* Hexagon/Logo Graphic */}
//                         <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-extrabold text-2xl shadow-sm">
//                           P
//                         </div>
//                         <div>
//                           <h2 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
//                             {offerData.shortCompany}
//                           </h2>
//                           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
//                             {offerData.subTitle}
//                           </p>
//                         </div>
//                       </div>

//                       {/* Right: Date & Title */}
//                       <div className="text-right">
//                         <h1 className="text-base font-black text-blue-900 uppercase tracking-tight">
//                           {offerData.letterTitle}
//                         </h1>
//                         <p className="text-[11px] font-bold text-slate-700 mt-1">
//                           Date: <span className="font-normal">{offerData.date}</span>
//                         </p>
//                       </div>
//                     </div>

//                     {/* Candidate & Subject Address */}
//                     <div className="space-y-1 mb-4">
//                       <p className="font-semibold text-slate-900">To,</p>
//                       <p className="font-bold text-slate-900 text-xs">{offerData.candidateName}</p>
//                       <p><span className="font-semibold">Position:</span> {offerData.position}</p>
//                       <p className="font-bold text-slate-900 pt-1">
//                         Subject: <span className="font-semibold">{offerData.subject}</span>
//                       </p>
//                     </div>

//                     {/* Salutation & Intro */}
//                     <div className="mb-4 space-y-1.5 text-slate-800">
//                       <p className="font-bold text-slate-900">Dear {offerData.candidateName},</p>
//                       <p className="text-justify leading-normal">
//                         We are pleased to offer you an internship opportunity for the position of{" "}
//                         <strong className="text-slate-900">{offerData.position}</strong> at{" "}
//                         <strong className="text-slate-900">{offerData.companyName}</strong> for a period of {offerData.duration.toLowerCase()}.
//                       </p>
//                     </div>

//                     {/* Internship Details Section */}
//                     <div className="mb-4">
//                       <h3 className="font-bold text-blue-900 text-xs border-b border-blue-900/30 pb-0.5 mb-2 uppercase tracking-wide">
//                         Internship Details
//                       </h3>
//                       <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
//                         <div><strong className="text-slate-900">Duration:</strong> {offerData.duration}</div>
//                         <div><strong className="text-slate-900">Interview Date:</strong> {offerData.interviewDate}</div>
//                         <div><strong className="text-slate-900">Type:</strong> {offerData.type}</div>
//                         <div><strong className="text-slate-900">Joining Date:</strong> {offerData.joiningDate}</div>
//                         <div><strong className="text-slate-900">Work Mode:</strong> {offerData.workMode}</div>
//                         <div><strong className="text-slate-900">Department:</strong> {offerData.department}</div>
//                         <div className="col-span-2"><strong className="text-slate-900">Office Timing:</strong> {offerData.officeTiming}</div>
//                         <div><strong className="text-slate-900">Reporting To:</strong> {offerData.reportingTo}</div>
//                         <div className="col-span-2 pt-0.5">
//                           <strong className="text-slate-900">Location:</strong> {offerData.location}
//                         </div>
//                       </div>
//                     </div>

//                     {/* Terms & Conditions Section */}
//                     <div className="mb-5">
//                       <h3 className="font-bold text-blue-900 text-xs border-b border-blue-900/30 pb-0.5 mb-2 uppercase tracking-wide">
//                         Terms & Conditions
//                       </h3>
//                       <ol className="list-decimal list-outside ml-4 space-y-1.5 text-[10.5px] leading-snug text-slate-800 text-justify">
//                         {offerData.terms.map((term, index) => (
//                           <li key={index} className="pl-1">
//                             {term}
//                           </li>
//                         ))}
//                       </ol>
//                     </div>

//                     {/* Closing Note & HR Sign-off */}
//                     <div className="text-[11px] mb-4">
//                       <p className="mb-3">
//                         We wish you a successful and productive internship with <strong>{offerData.companyName}</strong>.
//                       </p>
//                       <div className="pt-1">
//                         <p className="font-bold text-slate-900">Best Regards,</p>
//                         <p className="font-bold text-slate-900 mt-2">{offerData.hrName}</p>
//                         <p className="text-slate-600 font-medium text-[10px]">{offerData.hrRole}</p>
//                         <p className="text-slate-700 font-bold text-[10px]">{offerData.companyName}</p>
//                       </div>
//                     </div>

//                     {/* Candidate Acceptance Section */}
//                     <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 mb-4 text-[10.5px]">
//                       <h4 className="font-bold text-slate-900 mb-1 uppercase tracking-wide text-[10px]">
//                         Candidate Acceptance
//                       </h4>
//                       <p className="leading-snug text-slate-700 text-justify">
//                         I, <strong>{offerData.candidateName}</strong>, have read and understood all the above terms and conditions and hereby accept this internship offer. I understand and agree that this is a completely unpaid {offerData.duration} internship and that the company will not provide or reimburse any expenses or monetary benefits.
//                       </p>
//                       <div className="flex justify-between items-end mt-5 pt-3">
//                         <div>
//                           <p className="font-semibold text-slate-900">Candidate Signature: _______________________</p>
//                         </div>
//                         <div>
//                           <p className="font-semibold text-slate-900">Date: _______________________</p>
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Footer: Phone, Email, Office Address */}
//                   <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center text-[9.5px] text-slate-600 gap-2">
//                     <span className="font-medium">📞 {offerData.phone}</span>
//                     <span className="font-medium">✉️ {offerData.email}</span>
//                     <span className="font-medium text-right">📍 {offerData.address}</span>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Manual Upload Record Modal */}
//       <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDocId ? "Edit Offer Letter Record" : "Upload Offer Letter Record"}>
//         <form onSubmit={handleUpload} className="space-y-4 pt-2">
//           <div>
//             <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Title</label>
//             <input
//               required
//               value={form.title}
//               onChange={(e) => setForm({ ...form, title: e.target.value })}
//               className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
//               placeholder="e.g. Offer Letter - Devesh Vaishnav"
//             />
//           </div>

//           {employeeSpecific && (
//             <div>
//               <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Assign Employee</label>
//               <select
//                 required
//                 value={form.employee}
//                 onChange={(e) => setForm({ ...form, employee: e.target.value })}
//                 className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 text-slate-700 font-medium cursor-pointer"
//               >
//                 <option value="">-- Select Employee --</option>
//                 {employees.map((e) => (
//                   <option key={e._id} value={e._id}>{e.name}</option>
//                 ))}
//               </select>
//             </div>
//           )}

//           <div>
//             <label className="text-xs font-bold uppercase tracking-wider text-slate-500">File URL (Cloud PDF Link)</label>
//             <input
//               required
//               type="url"
//               value={form.fileUrl}
//               onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
//               className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
//               placeholder="https://example.com/offer-letter.pdf"
//             />
//           </div>

//           <div className="pt-4">
//             <Button
//               type="submit"
//               loading={submitting}
//               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg active:scale-[0.99]"
//             >
//               {editingDocId ? "Update Record" : "Upload & Save Record"}
//             </Button>
//           </div>
//         </form>
//       </Modal>
//     </div>
//   );
// }