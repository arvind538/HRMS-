"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, FileText, Trash2, FolderOpen, Edit3, Printer, ExternalLink, UserCheck, Calendar, X, DollarSign } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function SalaryLettersPage() {
  const { user } = useAuth();
  const category = "salary-letter";
  const title = "Salary Letters & Pay Slips";
  const description = "Manage salary revision letters, increment letters, promotion letters, and monthly employee payslips";
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

  // Salary Pay Slip & Letter Generator States (Matching Image Reference Format)
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isEditingSlip, setIsEditingSlip] = useState(false);
  const [salaryData, setSalaryData] = useState({
    companyName: "FOURPAYSAVE",
    companySubtitle: "HI TECH SOLUTIONS PVT LTD",
    address: "Shop no. 6&7 Gulab Vihar, Agra Road, Jamdoli, Jaipur, Rajasthan-302031",
    phone: "+91 9116916013",
    email: "info@4paysave.com",
    website: "https://4paysave.com/services",
    documentType: "EMPLOYEE PAY SLIP",
    period: "June 2026",
    employeeName: "Sanjay JANGID",
    position: "Flutter Developer",
    employeeId: "FPS00010",
    department: "Tech",
    bankName: "AU BANK",
    accountNo: "2251255039611054",
    ifscCode: "AUBL0002550",
    accountHolder: "Sanjay JANGID",
    currency: "INR",
    earnings: [
      { label: "Basic Salary", amount: 20000 },
      { label: "HRA", amount: 10000 },
      { label: "Allowance", amount: 10000 },
      { label: "Bonus", amount: 0 },
      { label: "Overtime", amount: 0 }
    ],
    deductions: [
      { label: "PF", amount: 0 },
      { label: "ESI", amount: 0 },
      { label: "Professional Tax", amount: 0 },
      { label: "TDS", amount: 0 },
      { label: "Medical Insurance", amount: 0 }
    ]
  });

  const isAdmin = ["admin", "hr"].includes(user?.role);

  // Calculations for totals
  const totalEarnings = salaryData.earnings.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalDeductions = salaryData.deductions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const netSalary = totalEarnings - totalDeductions;

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
      toast.error("Failed to load salary letters from server.");
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
        toast.success("Salary record updated successfully.");
      } else {
        await api.post("/documents", payload);
        toast.success("Salary document uploaded successfully.");
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
    if (!confirm("Are you sure you want to delete this salary record?")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Salary record deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete salary record.");
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
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
              <DollarSign size={16} /> Generate Pay Slip / Letter
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
          <p className="text-xs text-slate-400 mt-3 font-semibold animate-pulse">Syncing salary records from server...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 shadow-xs">
            <FolderOpen size={30} />
          </div>
          <p className="text-base font-bold text-slate-800">No salary records found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Generate or upload employee salary letters and pay slips above.</p>
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

      {/* Pay Slip & Letter Generator Modal */}
      {generatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-black text-slate-900">Pay Slip & Salary Structure Generator</h3>
                <button
                  onClick={() => setIsEditingSlip(!isEditingSlip)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isEditingSlip ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                >
                  <Edit3 size={13} /> {isEditingSlip ? "Switch to A4 Preview" : "Edit Amounts & Fields"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSlip}
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
              {isEditingSlip ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 max-w-2xl mx-auto text-xs">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Edit Employee & Salary Components</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-500">Employee Name</label>
                      <input
                        value={salaryData.employeeName}
                        onChange={(e) => setSalaryData({ ...salaryData, employeeName: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Position</label>
                      <input
                        value={salaryData.position}
                        onChange={(e) => setSalaryData({ ...salaryData, position: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Period (e.g. June 2026)</label>
                      <input
                        value={salaryData.period}
                        onChange={(e) => setSalaryData({ ...salaryData, period: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Bank Account No</label>
                      <input
                        value={salaryData.accountNo}
                        onChange={(e) => setSalaryData({ ...salaryData, accountNo: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <h5 className="font-bold text-slate-700 mb-2">Earnings (Amounts)</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {salaryData.earnings.map((item, idx) => (
                        <div key={idx}>
                          <label className="text-[10px] text-slate-500 font-bold">{item.label}</label>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              const newEarnings = [...salaryData.earnings];
                              newEarnings[idx].amount = Number(e.target.value);
                              setSalaryData({ ...salaryData, earnings: newEarnings });
                            }}
                            className="w-full px-3 py-1.5 border rounded-lg mt-0.5 font-medium"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditingSlip(false)}
                    className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                  >
                    Apply Changes & View Pay Slip
                  </button>
                </div>
              ) : (
                /* A4 Pay Slip Preview Layout Matching Reference Image */
                <div className="w-full max-w-[210mm] mx-auto bg-white p-10 rounded-2xl shadow-xl border border-slate-200 text-slate-800 font-sans text-xs space-y-6 print:shadow-none print:p-0 relative overflow-hidden">

                  {/* Top Bar Styling */}
                  <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-900 via-indigo-600 to-cyan-500"></div>

                  {/* Header */}
                  <div className="flex justify-between items-start border-b pb-4 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">P</div>
                      <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-wider">{salaryData.companyName}</h2>
                        <p className="text-[9px] font-bold text-slate-400">{salaryData.companySubtitle}</p>
                        <p className="text-[10px] text-slate-500 mt-1">📍 {salaryData.address}</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                      <p>📞 {salaryData.phone}</p>
                      <p>✉️ {salaryData.email}</p>
                      <p className="text-blue-600 font-semibold">🌐 {salaryData.website}</p>
                    </div>
                  </div>

                  {/* Title Banner */}
                  <div className="text-center py-2 bg-slate-900 text-white rounded-xl font-black tracking-widest text-sm uppercase">
                    {salaryData.documentType}
                  </div>

                  {/* Employee Information Grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px]">
                    <div className="flex justify-between"><span className="font-bold text-slate-500">Period:</span> <span className="font-semibold text-slate-900">{salaryData.period}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-slate-500">Bank Name:</span> <span className="font-semibold text-slate-900">{salaryData.bankName}</span></div>

                    <div className="flex justify-between"><span className="font-bold text-slate-500">Employee Name:</span> <span className="font-semibold text-slate-900">{salaryData.employeeName}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-slate-500">Account No:</span> <span className="font-semibold text-slate-900">{salaryData.accountNo}</span></div>

                    <div className="flex justify-between"><span className="font-bold text-slate-500">Position:</span> <span className="font-semibold text-slate-900">{salaryData.position}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-slate-500">IFSC Code:</span> <span className="font-semibold text-slate-900">{salaryData.ifscCode}</span></div>

                    <div className="flex justify-between"><span className="font-bold text-slate-500">Employee ID:</span> <span className="font-semibold text-slate-900">{salaryData.employeeId}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-slate-500">Account Holder:</span> <span className="font-semibold text-slate-900">{salaryData.accountHolder}</span></div>

                    <div className="flex justify-between"><span className="font-bold text-slate-500">Department:</span> <span className="font-semibold text-slate-900">{salaryData.department}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-slate-500">Currency:</span> <span className="font-semibold text-slate-900">{salaryData.currency}</span></div>
                  </div>

                  {/* Earnings & Deductions Table */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead>
                        <tr className="bg-indigo-900 text-white">
                          <th className="p-2.5 border-r border-indigo-800">Earning</th>
                          <th className="p-2.5 border-r border-indigo-800">Amount ({salaryData.currency})</th>
                          <th className="p-2.5 border-r border-indigo-800">Deduction</th>
                          <th className="p-2.5">Amount ({salaryData.currency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.max(salaryData.earnings.length, salaryData.deductions.length) }).map((_, idx) => {
                          const earn = salaryData.earnings[idx] || { label: "", amount: 0 };
                          const ded = salaryData.deductions[idx] || { label: "", amount: 0 };
                          return (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                              <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{earn.label}</td>
                              <td className="p-2 border-r border-slate-200 text-slate-600">{earn.amount}</td>
                              <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{ded.label}</td>
                              <td className="p-2 text-slate-600">{ded.amount}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
                          <td className="p-2.5 border-r border-slate-300">Gross Income Total</td>
                          <td className="p-2.5 border-r border-slate-300">{totalEarnings}</td>
                          <td className="p-2.5 border-r border-slate-300">TOTAL DEDUCTION</td>
                          <td className="p-2.5">{totalDeductions}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Net Salary Box */}
                  <div className="flex justify-end pt-2">
                    <div className="bg-indigo-50 border border-indigo-200 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-xs">
                      <span className="font-extrabold text-indigo-900 text-sm">Net Salary</span>
                      <span className="font-black text-indigo-700 text-base">{netSalary.toFixed(2)} {salaryData.currency}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Record Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDocId ? "Edit Salary Record" : "Upload Salary Record"}>
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="e.g. Salary Pay Slip - June 2026"
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
              placeholder="https://example.com/pay-slip.pdf"
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