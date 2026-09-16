"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, FileCheck, Calendar } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

export default function ComplianceTypePage({ type, title, description }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), totalAmount: "", dueDate: "" });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/compliance", { params: { type } });
            setRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error(err.response?.data?.message || `${title} records load nahi hue.`);
        } finally {
            setLoading(false);
        }
    }, [type, title]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post("/compliance", { ...form, type, totalAmount: Number(form.totalAmount) });
            toast.success("Compliance record create ho gaya.");
            setModalOpen(false);
            setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), totalAmount: "", dueDate: "" });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Create nahi hua.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkFiled = async (id) => {
        const documentUrl = prompt("Filed document ka URL daalo (optional):") || "";
        try {
            await api.put(`/compliance/${id}/file`, { documentUrl });
            toast.success("Filed mark ho gaya.");
            fetchData();
        } catch (err) {
            toast.error("Update nahi hua.");
        }
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const statusVariant = { pending: "warning", filed: "success", overdue: "danger" };

    const isOverdue = (r) => r.status === "pending" && new Date(r.dueDate) < new Date();

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">{title}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                </div>
                <Button onClick={() => setModalOpen(true)}><Plus size={16} /> New Filing Record</Button>
            </div>

            {loading ? (
                <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
            ) : records.length === 0 ? (
                <div className="bg-white rounded-2xl border p-16 text-center text-slate-400 text-sm">
                    <FileCheck className="mx-auto mb-2 text-slate-300" size={32} />
                    Koi {title} record nahi hai abhi
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                    {records.map((r) => (
                        <div key={r._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-800">{monthNames[r.month - 1]} {r.year}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Amount: <strong className="text-slate-700">₹{r.totalAmount?.toLocaleString() || 0}</strong> · Due: {new Date(r.dueDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant={isOverdue(r) ? "danger" : statusVariant[r.status]}>
                                    {isOverdue(r) ? "overdue" : r.status}
                                </Badge>
                                {r.status === "pending" && (
                                    <Button size="sm" onClick={() => handleMarkFiled(r._id)}>Mark Filed</Button>
                                )}
                                {r.filedDate && (
                                    <span className="text-xs text-slate-400">Filed: {new Date(r.filedDate).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`New ${title} Record`}>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Month</label>
                            <select value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                                {monthNames.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Year</label>
                            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Total Amount (₹)</label>
                        <input type="number" required value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                            className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" placeholder="25000" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Due Date</label>
                        <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                            className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <Button type="submit" loading={submitting} className="w-full">Create Record</Button>
                </form>
            </Modal>
        </div>
    );
}