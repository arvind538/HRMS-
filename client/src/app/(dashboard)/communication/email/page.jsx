"use client";
import { useEffect, useState, useCallback } from "react";
import { Mail, Send, Loader2, Plus, Trash2, Users, FileText, Eye, Clock, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

export default function EmailPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ recipient: "", subject: "", message: "", category: "general" });

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/emails");
      setEmails(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Email fetch error:", err.response?.data || err.message);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/emails", form);
      toast.success("Email sent successfully via SMTP.");
      setModalOpen(false);
      setForm({ recipient: "", subject: "", message: "", category: "general" });
      fetchEmails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent opening the view modal when clicking delete
    if (!confirm("Are you sure you want to delete this email log?")) return;
    try {
      await api.delete(`/emails/${id}`);
      toast.success("Email log deleted successfully.");
      fetchEmails();
    } catch (err) {
      toast.error("Failed to delete email log.");
    }
  };

  const handleRowClick = (item) => {
    setSelectedEmail(item);
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Email Campaigns</h1>
          <p className="text-xs text-slate-500 mt-1">Manage and send bulk email notifications, templated campaigns, and delivery logs.</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <Plus size={16} /> Compose Email
        </Button>
      </div>

      {/* Metrics / Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-indigo-300">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Mail size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Sent</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{emails.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Target Audience</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">All Staff / Clients</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-violet-300">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl"><FileText size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">SMTP Server Status</p>
            <h3 className="text-lg font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Connected
            </h3>
          </div>
        </div>
      </div>

      {/* Email History Table / List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between font-bold text-slate-900 text-xs uppercase tracking-wider bg-slate-50/50">
          <span>Sent Campaigns & Delivery History</span>
          <span className="text-[10px] text-slate-400 font-medium lowercase">Click any row to inspect message content</span>
        </div>

        {emails.length === 0 ? (
          <div className="p-16 text-center">
            <Mail className="mx-auto mb-3 text-slate-300 h-10 w-10" />
            <p className="text-sm font-bold text-slate-700">No email records found</p>
            <p className="text-xs text-slate-400 mt-1">Compose and send your first bulk campaign or notification email.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {emails.map((item) => (
              <div
                key={item._id}
                onClick={() => handleRowClick(item)}
                className="p-5 flex items-center justify-between transition-all duration-200 hover:bg-indigo-50/40 cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{item.subject}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      {item.category || "general"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    To: <strong className="text-slate-700">{item.recipient}</strong> · Sent on: {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle2 size={12} /> Delivered
                  </Badge>
                  <button
                    onClick={(e) => handleDelete(e, item._id)}
                    className="p-2 text-rose-500 hover:bg-rose-100/70 rounded-xl transition-all duration-200"
                    title="Delete Email Log"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose & Send Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Compose New Email">
        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Recipient (Email / Group)</label>
            <input
              required
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
              placeholder="e.g. all-employees@company.com or client@domain.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject Line</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
              placeholder="e.g. Monthly Newsletter / Important Company Update"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Message Content</label>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 resize-none"
              placeholder="Write your email body here..."
            />
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Send size={16} /> Send Email via SMTP
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details / Campaign Inspector Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Campaign Details & Delivery Log">
        {selectedEmail && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5 break-all">{selectedEmail.recipient}</p>
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
                  <Clock size={12} className="text-slate-400" /> {new Date(selectedEmail.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Subject</p>
              <h3 className="text-base font-bold text-slate-900 bg-white border border-slate-200 px-4 py-3 rounded-xl">
                {selectedEmail.subject}
              </h3>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Full Message Body</p>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedEmail.message}
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