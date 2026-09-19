"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Package, UserCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function AssignAssetPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [availableAssets, setAvailableAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState({});

  // Role check: Restrict standard employees/staff
  const userRole = user?.role?.toLowerCase() || "";
  const isEmployee = userRole === "employee" || userRole === "staff";

  const fetchData = useCallback(async () => {
    if (isEmployee) return;
    setLoading(true);
    try {
      const [assetRes, empRes] = await Promise.all([
        api.get("/assets", { params: { status: "available" } }),
        api.get("/employees"),
      ]);
      setAvailableAssets(Array.isArray(assetRes.data) ? assetRes.data : (assetRes.data?.data || []));
      setEmployees(Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data || []));
    } catch (err) {
      toast.error("Failed to load assignment data from server.");
    } finally {
      setLoading(false);
    }
  }, [isEmployee]);

  useEffect(() => {
    if (!isEmployee) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData, isEmployee]);

  const handleAssign = async (assetId) => {
    const employeeId = selectedEmployee[assetId];
    if (!employeeId) {
      toast.error("Please select an employee first.");
      return;
    }
    setAssigningId(assetId);
    try {
      await api.put(`/assets/${assetId}/assign`, { employeeId });
      toast.success("Asset assigned successfully. 🎉");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign asset.");
    } finally {
      setAssigningId(null);
    }
  };

  // 🚫 Access Denied View for regular Employees
  if (isEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          Your role (<span className="capitalize font-semibold text-slate-700">{user?.role || "Employee"}</span>) does not have permission to access this page.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all duration-200"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">Loading assignable inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <UserCheck size={22} />
            </div>
            Assign Assets
          </h1>
          <p className="text-sm text-slate-500 mt-1">Assign available company inventory items to active employees securely.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold self-start sm:self-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          {availableAssets.length} Ready to Assign
        </div>
      </div>

      {availableAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-indigo-500 border border-indigo-100 shadow-inner">
            <Package size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No available assets found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Please add a new asset or unassign items from the "All Assets" section first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {availableAssets.map((asset) => {
            const assetId = asset._id || asset.id;
            return (
              <div
                key={assetId}
                className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm">
                      <Package size={18} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Available
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 tracking-tight text-base truncate">{asset.name || asset.assetName}</h4>
                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    {asset.category || "General"} · <span className="font-semibold text-slate-700 font-mono text-[11px]">{asset.serialNumber || "No serial"}</span>
                  </p>
                </div>

                <div className="mt-5 space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                      Assign To Employee
                    </label>
                    <select
                      value={selectedEmployee[assetId] || ""}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, [assetId]: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map((emp) => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
                    size="sm"
                    loading={assigningId === assetId}
                    onClick={() => handleAssign(assetId)}
                  >
                    <UserCheck size={15} /> Assign Asset
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}