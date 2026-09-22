"use client";
import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Send, Loader2, Plus, Trash2, Users, Smartphone, Clock, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

export default function SmsPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSms, setSelectedSms] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ recipient: "", message: "", category: "general" });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/sms");
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("SMS fetch error:", err.response?.data || err.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/sms", form);
      toast.success("SMS sent successfully via Gateway.");
      setModalOpen(false);
      setForm({ recipient: "", message: "", category: "general" });
      fetchMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send SMS.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevents row click modal from opening when deleting
    if (!confirm("Are you sure you want to delete this SMS log?")) return;
    try {
      await api.delete(`/sms/${id}`);
      toast.success("SMS log deleted successfully.");
      fetchMessages();
    } catch (err) {
      toast.error("Failed to delete SMS log.");
    }
  };

  const handleRowClick = (item) => {
    setSelectedSms(item);
    setViewModalOpen(true);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/85 shadow-xs transition-all">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SMS Campaigns</h1>
          <p className="text-xs text-slate-500 mt-1">Manage and send bulk SMS notifications, alerts, and delivery logs via Twilio or MSG91 gateway.</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <Plus size={16} /> Send SMS
        </Button>
      </div>

      {/* Metrics / Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-indigo-300">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><MessageSquare size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total SMS Sent</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{messages.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Group</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">All Employees</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-violet-300">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl"><Smartphone size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">SMS Gateway Status</p>
            <h3 className="text-lg font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Connected
            </h3>
          </div>
        </div>
      </div>

      {/* SMS History List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between font-bold text-slate-900 text-xs uppercase tracking-wider bg-slate-50/50">
          <span>Sent SMS Campaigns & Delivery History</span>
          <span className="text-[10px] text-slate-400 font-medium lowercase">Click any row to inspect text content</span>
        </div>

        {messages.length === 0 ? (
          <div className="p-16 text-center">
            <MessageSquare className="mx-auto mb-3 text-slate-300 h-10 w-10" />
            <p className="text-sm font-bold text-slate-700">No SMS records found</p>
            <p className="text-xs text-slate-400 mt-1">Broadcast your first bulk alert or notification message to employees.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {messages.map((item) => (
              <div
                key={item._id}
                onClick={() => handleRowClick(item)}
                className="p-5 flex items-center justify-between transition-all duration-200 hover:bg-indigo-50/40 cursor-pointer group"
              >
                <div className="space-y-1 pr-4">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{item.message}</p>
                  <p className="text-xs text-slate-500">
                    To: <strong className="text-slate-700">{item.recipient}</strong> · Sent on: {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle2 size={12} /> Delivered
                  </Badge>
                  <button
                    onClick={(e) => handleDelete(e, item._id)}
                    className="p-2 text-rose-500 hover:bg-rose-100/70 rounded-xl transition-all duration-200"
                    title="Delete SMS Log"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send SMS Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Send New SMS Broadcast">
        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Recipient Phone Number / Group</label>
            <input
              required
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
              placeholder="e.g. +919876543210 or 'all-employees'"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Message Content (Max 160 Characters)</label>
            <textarea
              required
              rows={4}
              maxLength={160}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 resize-none"
              placeholder="Type your SMS notification here..."
            />
            <p className="text-[11px] text-slate-400 mt-1 text-right">{form.message.length}/160 characters</p>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Send size={16} /> Send SMS via Gateway
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details / SMS Inspector Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="SMS Campaign Details">
        {selectedSms && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 break-all">{selectedSms.recipient}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-0.5">
                  <Badge variant="success">Delivered Successfully</Badge>
                </div>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timestamp</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" /> {new Date(selectedSms.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">SMS Message Content</p>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">
                {selectedSms.message}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setViewModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}