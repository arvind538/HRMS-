"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Terminal,
  Server,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function BiometricAttendancePage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', ipAddress: '', port: '4370', location: '', model: 'ZKTeco' });
  const [submitting, setSubmitting] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.get("/biometric/devices");
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching devices:", err);
      setErrorMsg(err.response?.data?.message || "Backend se biometric devices fetch nahi ho paye.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Handle Real Device Sync
  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      const { data } = await api.post(`/biometric/sync/${id}`);
      toast.success(data.message || "Device synced successfully!");
      fetchDevices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  // Handle Real Add Device Form Submit
  const handleAddDevice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/biometric/devices", formData);
      toast.success("Biometric terminal successfully configured!");
      setIsModalOpen(false);
      setFormData({ name: '', ipAddress: '', port: '4370', location: '', model: 'ZKTeco' });
      fetchDevices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save terminal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 font-sans pb-12">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-600" /> Biometric Terminal Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time hardware integration, TCP/IP punch sync & status monitor.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDevices}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition shadow-2xs"
            title="Refresh Devices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Terminal
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Terminals</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{devices.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><Server className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Online Devices</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{devices.filter(d => d.status === 'online').length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Wifi className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Offline Terminals</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{devices.filter(d => d.status === 'offline').length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600"><WifiOff className="w-5 h-5" /></div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Devices Grid with Smooth Hover Effects */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading biometric terminals...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80">
          <Terminal className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No biometric terminals configured yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Terminal" above to connect your first hardware device.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => {
            const isOnline = device.status === 'online';
            const isSyncing = syncingId === device._id;

            return (
              <div
                key={device._id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <Terminal className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {device.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{device.model} • {device.location}</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {device.status.toUpperCase()}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600">
                  <span>IP: {device.ipAddress}:{device.port}</span>
                  <span className="text-[11px] text-slate-400">
                    Synced: {device.lastSync ? new Date(device.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleSync(device._id)}
                    disabled={isSyncing}
                    className="w-full px-4 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing Punches...' : 'Sync Live Punches'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 transform scale-100 animate-in zoom-in-95 duration-150 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Configure Biometric Terminal</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Terminal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Back Gate Biometric"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">IP Address</label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.200"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Location / Floor</label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Floor Server Room"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}