"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, RefreshCw, AlertCircle, Send, CheckCircle2, UserCheck, Calendar } from 'lucide-react';
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function AttendanceRegularization() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [record, setRecord] = useState(null);
  const [searchingRecord, setSearchingRecord] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ checkIn: '', checkOut: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch employees list for dropdown selection
  useEffect(() => {
    api.get("/employees")
      .then(({ data }) => setEmployees(Array.isArray(data) ? data : (data.employees || data.data || [])))
      .catch((err) => console.error("Failed to load employees list", err));
  }, []);

  // Fetch existing attendance record for selected employee & date
  const fetchRecordForDate = useCallback(async () => {
    if (!selectedEmployee || !selectedDate) return;

    setSearchingRecord(true);
    setError(null);
    setRecord(null);
    setSuccessMsg('');

    try {
      const { data } = await api.get("/attendance", {
        params: { date: selectedDate, employee: selectedEmployee },
      });
      const list = Array.isArray(data) ? data : (data.attendance || data.data || []);
      const found = list.find((r) => {
        const empObj = r.employee && typeof r.employee === "object" ? r.employee : null;
        const empId = empObj?._id || empObj?.id || (typeof r.employee === "string" ? r.employee : null);
        return empId === selectedEmployee;
      });

      if (found) {
        setRecord(found);
        setFormData({
          checkIn: found.checkIn ? new Date(found.checkIn).toTimeString().slice(0, 5) : '',
          checkOut: found.checkOut ? new Date(found.checkOut).toTimeString().slice(0, 5) : '',
          remarks: found.remarks || '',
        });
      } else {
        // Agar record nahi mila, toh blank/new record object set kar do taaki HR manually entry kar sake
        setRecord({ _id: null, isNew: true, status: 'absent' });
        setFormData({ checkIn: '09:30', checkOut: '18:30', remarks: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch attendance record.");
    } finally {
      setSearchingRecord(false);
    }
  }, [selectedEmployee, selectedDate]);

  useEffect(() => {
    fetchRecordForDate();
  }, [fetchRecordForDate]);

  // Submit regularization form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg('');

    try {
      const buildDateTime = (timeStr) => {
        if (!timeStr) return null;
        return new Date(`${selectedDate}T${timeStr}:00`).toISOString();
      };

      // Agar record._id hai toh regularize route hit hoga, nahi toh mark/check-in api
      if (record?._id) {
        await api.post("/attendance/regularize", {
          id: record._id,
          checkIn: buildDateTime(formData.checkIn),
          checkOut: buildDateTime(formData.checkOut),
          remarks: formData.remarks,
        });
      } else {
        // Naya entry create karne ke liye markAttendance ya check-in use karein
        await api.post("/attendance/mark", {
          employee: selectedEmployee,
          status: "present",
          checkInTime: buildDateTime(formData.checkIn),
          notes: formData.remarks,
        });
      }

      setSuccessMsg("Attendance record regularized successfully!");
      toast.success("Attendance regularization saved!");
      await fetchRecordForDate();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to apply regularization.");
      toast.error("Regularization failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmpObj = employees.find(emp => emp._id === selectedEmployee);

  return (
    <div className="w-full space-y-6 font-sans pb-12 animate-in fade-in duration-300">

      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" /> Attendance Regularization
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Correct check-in/check-out logs for compliance and reporting (Admin / HR / Manager only)
          </p>
        </div>
      </div>

      {/* Employee + Date Selector Container */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Select Employee</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="">-- Choose employee --</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeId || emp._id.slice(-6)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Target Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer font-mono"
          />
        </div>
      </div>

      {/* Result Card Area */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {!selectedEmployee ? (
          <div className="py-20 text-center px-4">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Please select an employee to proceed</p>
            <p className="text-xs text-slate-400 mt-0.5">Choose a staff member from the dropdown above.</p>
          </div>
        ) : searchingRecord ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-medium">Searching attendance record...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">{error}</p>
          </div>
        ) : record ? (
          <div className="p-6 sm:p-8">
            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Record Summary Badge */}
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block font-medium">Employee</span>
                <strong className="text-slate-800 text-sm">{selectedEmpObj?.name || record.employee?.name || "Staff Member"}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Date Logged</span>
                <strong className="text-slate-800 text-sm font-mono">{new Date(selectedDate).toLocaleDateString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Current Status</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full font-bold capitalize text-[11px] ${record.isNew ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                  {record.isNew ? 'No Record (Will Create)' : (record.status || 'present')}
                </span>
              </div>
            </div>

            {/* Regularization Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Correct Check-In Time</label>
                  <input
                    type="time"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Correct Check-Out Time</label>
                  <input
                    type="time"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Remarks / Reason for Correction</label>
                <textarea
                  rows="3"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Biometric machine sync error, missed punch out due to official outdoor duty..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer active:scale-95"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Saving Correction...' : 'Save Regularization'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}