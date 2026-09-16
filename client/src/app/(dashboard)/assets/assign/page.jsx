"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Package, UserCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function AssignAssetPage() {
  const [availableAssets, setAvailableAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetRes, empRes] = await Promise.all([
        api.get("/assets", { params: { status: "available" } }),
        api.get("/employees"),
      ]);
      setAvailableAssets(Array.isArray(assetRes.data) ? assetRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      toast.error("Failed to load assignment data from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async (assetId) => {
    const employeeId = selectedEmployee[assetId];
    if (!employeeId) {
      toast.error("Please select an employee first.");
      return;
    }
    setAssigningId(assetId);
    try {
      await api.put(`/assets/${assetId}/assign`, { employeeId });
      toast.success("Asset assigned successfully.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign asset.");
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Assign Asset</h1>
        <p className="text-xs text-slate-500 mt-1">Assign available company assets to active employees.</p>
      </div>

      {availableAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Package className="mx-auto mb-3 text-slate-300 h-10 w-10" />
          <p className="text-sm font-bold text-slate-700">No available assets found</p>
          <p className="text-xs text-slate-400 mt-1">Please add a new asset from the "All Assets" section first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {availableAssets.map((asset) => (
            <div
              key={asset._id}
              className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110">
                  <Package size={18} />
                </div>
                <h4 className="font-bold text-slate-900 tracking-tight text-base">{asset.name}</h4>
                <p className="text-xs text-slate-400 mt-1 capitalize">
                  {asset.category} · <span className="font-medium text-slate-600">{asset.serialNumber || "No serial"}</span>
                </p>
              </div>

              <div className="mt-5 space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                    Assign To Employee
                  </label>
                  <select
                    value={selectedEmployee[asset._id] || ""}
                    onChange={(e) => setSelectedEmployee({ ...selectedEmployee, [asset._id]: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
                  size="sm"
                  loading={assigningId === asset._id}
                  onClick={() => handleAssign(asset._id)}
                >
                  <UserCheck size={15} /> Assign Asset
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}