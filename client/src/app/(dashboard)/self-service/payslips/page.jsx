"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Download, FileText, ArrowLeft, Calendar, DollarSign, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function MyPayslipsPage() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Helper function to extract employee ID safely (handles multiple formats)
  const getEmployeeId = useCallback(() => {
    return user?.employee?._id || user?.employee || user?._id || user?.id;
  }, [user]);

  const fetchData = useCallback(async () => {
    const empId = getEmployeeId();
    if (!empId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/payroll", {
        params: { employee: empId },
      });
      setPayrolls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Payslips load error:", err);
      toast.error("Payslips load karne mein samasya aayi.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const viewPayslip = async (id) => {
    setViewLoading(true);
    try {
      const { data } = await api.get(`/payroll/payslip/${id}`);
      setViewing(data);
    } catch (err) {
      console.error("Payslip view error:", err);
      toast.error("Payslip load nahi ho saki.");
    } finally {
      setViewLoading(false);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const empId = getEmployeeId();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2">Loading payslips...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Payslips</h1>
        <p className="text-sm text-slate-500 mt-1">
          Apni monthly salary slips aur details yahan dekhein.
        </p>
      </div>

      {/* Session Warning Banner */}
      {!empId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details nahi mil rahi hain. Kripya ensure karein ki aap sahi account se logged-in hain.
          </p>
        </div>
      )}

      {/* Viewing Single Payslip Detail */}
      {viewing ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto transition-all duration-200">
          <button
            onClick={() => setViewing(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all duration-200 mb-6 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to list
          </button>

          <div className="border-b border-slate-100 pb-5 mb-5 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {viewing.employee?.name || "Employee Payslip"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Calendar size={13} className="text-indigo-600" />
                Period: <span className="font-medium text-slate-700">{viewing.period}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                Generated
              </span>
            </div>
          </div>

          {/* Earnings Section */}
          <div className="space-y-2 mb-6">
            <p className="font-semibold text-xs uppercase tracking-wider text-slate-400">Earnings</p>
            <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2.5">
              {Object.entries(viewing.earnings || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm text-slate-700">
                  <span className="capitalize">{k}</span>
                  <span className="font-medium text-slate-900">₹{v?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions Section */}
          <div className="space-y-2 mb-6">
            <p className="font-semibold text-xs uppercase tracking-wider text-slate-400">Deductions</p>
            <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2.5">
              {Object.entries(viewing.deductions || {}).length > 0 ? (
                Object.entries(viewing.deductions || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm text-slate-700">
                    <span className="capitalize">{k}</span>
                    <span className="font-medium text-rose-600">-₹{v?.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No deductions for this period.</p>
              )}
            </div>
          </div>

          {/* Net Salary Summary */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                <DollarSign size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Net Payable Salary</p>
                <p className="text-lg font-bold text-slate-900">₹{viewing.netSalary?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      ) : payrolls.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm">
          <FileText className="mx-auto text-slate-300 h-12 w-12" />
          <p className="text-sm font-medium text-slate-600">Koi payslip generate nahi hui abhi.</p>
          <p className="text-xs text-slate-400">Jab HR aapki salary process karega, wo yahan dikhegi.</p>
        </div>
      ) : (
        /* Payslips Grid List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {payrolls.map((p) => (
            <div
              key={p._id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    {p.year}
                  </span>
                  <FileText size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  {monthNames[p.month - 1] || `Month ${p.month}`}
                </h4>
                <p className="text-2xl font-extrabold text-indigo-600 mt-2 tracking-tight">
                  ₹{p.netSalary?.toLocaleString()}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Net Salary</span>
                <button
                  onClick={() => viewPayslip(p._id)}
                  disabled={viewLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  {viewLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}