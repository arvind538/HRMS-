"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Pin, Trash2, Megaphone } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", audience: "all", pinned: false });

  const isAdmin = ["admin", "hr"].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/communication/announcements");
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load announcements from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/communication/announcements", form);
      toast.success("Announcement posted successfully.");
      setModalOpen(false);
      setForm({ title: "", content: "", audience: "all", pinned: false });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/communication/announcements/${id}`);
      toast.success("Announcement deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete announcement.");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-xs text-slate-500 mt-1">Company-wide broadcasts, news, and vital employee updates.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={16} /> New Announcement
          </Button>
        )}
      </div>

      {/* Announcements List Section */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Megaphone className="mx-auto mb-3 text-slate-300 h-10 w-10" />
          <p className="text-sm font-bold text-slate-700">No announcements found</p>
          <p className="text-xs text-slate-400 mt-1">There are no active broadcasts or updates posted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a._id}
              className={`bg-white p-6 rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${a.pinned ? "border-indigo-300 bg-indigo-50/20" : "border-slate-200 hover:border-indigo-200"
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {a.pinned && (
                      <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                        <Pin size={11} /> Pinned
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900 text-base">{a.title}</h3>
                  </div>

                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{a.content}</p>

                  <p className="text-xs text-slate-400 mt-4 flex items-center gap-2">
                    <strong className="text-slate-700">{a.postedBy?.name || "System Admin"}</strong>
                    <span>·</span>
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span className="capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold">{a.audience}</span>
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(a._id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors duration-200 shrink-0"
                    title="Delete Announcement"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Styled New Announcement Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Announcement">
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50"
              placeholder="e.g. Office closed on Diwali festival"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Content</label>
            <textarea
              required
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 resize-none"
              placeholder="Provide complete announcement details here..."
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Audience</label>
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 text-slate-700 font-medium"
            >
              <option value="all">All Employees</option>
              <option value="department">Specific Department</option>
              <option value="specific-role">Specific Role</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="pinCheck"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="pinCheck" className="text-sm font-medium text-slate-700 cursor-pointer">
              Pin this announcement to the top
            </label>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.99]"
            >
              Post Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}