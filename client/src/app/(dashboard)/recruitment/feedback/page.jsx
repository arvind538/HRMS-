"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Star } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function InterviewFeedbackPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ feedback: "", rating: 3, recommendation: "next-round" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/recruitment/interviews");
      setInterviews(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Interviews load nahi hue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openFeedbackModal = (interview) => {
    setSelected(interview);
    setForm({ feedback: "", rating: 3, recommendation: "next-round" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/recruitment/interviews/${selected._id}/feedback`, form);
      toast.success("Feedback submit ho gaya.");
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error("Feedback submit nahi hua.");
    } finally {
      setSubmitting(false);
    }
  };

  const pending = interviews.filter((i) => i.status === "scheduled");
  const completed = interviews.filter((i) => i.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Interview Feedback</h1>
        <p className="text-xs text-slate-500 mt-0.5">Completed interviews pe feedback do, ya pichla feedback dekho</p>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Awaiting Feedback ({pending.length})</h3>
            {pending.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Sab interviews ka feedback complete hai</p>
            ) : (
              <div className="space-y-2">
                {pending.map((i) => (
                  <div key={i._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{i.candidate?.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{i.round} round · {new Date(i.scheduledAt).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" onClick={() => openFeedbackModal(i)}>Give Feedback</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Completed ({completed.length})</h3>
            {completed.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Koi feedback record nahi hai</p>
            ) : (
              <div className="space-y-2">
                {completed.map((i) => (
                  <div key={i._id} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{i.candidate?.name}</p>
                      <Badge variant={i.recommendation === "hire" ? "success" : i.recommendation === "reject" ? "danger" : "info"}>
                        {i.recommendation}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{i.feedback}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={12} className={s <= i.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Submit Feedback">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Feedback</label>
            <textarea required rows={4} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" placeholder="Technical skills, communication, etc." />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Rating (1-5)</label>
            <input type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Recommendation</label>
            <select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
              <option value="hire">Hire</option>
              <option value="next-round">Move to Next Round</option>
              <option value="reject">Reject</option>
            </select>
          </div>
          <Button type="submit" loading={submitting} className="w-full">Submit Feedback</Button>
        </form>
      </Modal>
    </div>
  );
}