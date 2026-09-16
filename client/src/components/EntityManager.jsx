"use client";

import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";
import "./entity-manager.css";
import apiBaseUrl from "@/lib/api"; // Agar yeh base URL string hai

export default function EntityManager({ title, subtitle, endpoint, columns, fields, primaryKey = "name" }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Ensure endpoint URL handles slashes properly
    const baseUrl = typeof apiBaseUrl === 'string' ? apiBaseUrl : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api");
    const url = `${baseUrl.replace(/\/$/, "")}/organization/${endpoint}`;

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        setError("");
        try {
            // Using standard fetch with credentials/headers if needed
            const res = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    // Authorization token add kar sakte hain agar localStorage mein ho:
                    // "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.message || `Failed to load ${title}`);

            // Handle both direct array format and wrapped {success, data} format
            const dataList = Array.isArray(json) ? json : (json.data || json.result || []);
            setItems(dataList);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        const initial = {};
        fields.forEach((f) => {
            initial[f.key] = f.type === "number" ? 0 : (f.defaultValue ?? "");
        });
        initial.isActive = true;
        setForm(initial);
        setEditingItem(null);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        const formattedItem = { ...item };
        if (formattedItem.head && typeof formattedItem.head === "object") {
            formattedItem.head = formattedItem.head._id || formattedItem.head.id;
        }
        setForm(formattedItem);
        setEditingItem(item);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingItem(null);
        setError("");
    };

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const isEdit = Boolean(editingItem);
            const targetId = editingItem?._id || editingItem?.id;
            const requestUrl = isEdit ? `${url}/${targetId}` : url;

            const res = await fetch(requestUrl, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(form),
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.message || "Failed to save");

            const savedData = json.data || json;

            if (isEdit) {
                setItems((prev) => prev.map((i) => ((i._id === targetId || i.id === targetId) ? savedData : i)));
            } else {
                setItems((prev) => [savedData, ...prev]);
            }

            setSuccessMsg("Saved successfully");
            setTimeout(() => setSuccessMsg(""), 2500);
            closeModal();
            fetchItems(); // Refresh to sync counts seamlessly from backend
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`${url}/${id}`, {
                method: "DELETE",
                headers: {
                    // "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to delete");

            setItems((prev) => prev.filter((i) => i._id !== id && i.id !== id));
            setSuccessMsg("Deleted successfully");
            setTimeout(() => setSuccessMsg(""), 2500);
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleteId(null);
        }
    };

    const filteredItems = items.filter((item) => {
        const val = item[primaryKey] || item.name || "";
        return val.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="entity-page w-full p-4 sm:p-4 lg:p-4 transition-all duration-300">
            <div className="entity-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                </div>
                <button className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-200 cursor-pointer" onClick={openAddModal}>
                    <Plus size={16} /> Add {title.replace(/s$/, "")}
                </button>
            </div>

            {successMsg && <div className="mb-4 p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">{successMsg}</div>}
            {error && <div className="mb-4 p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl shadow-xs">{error}</div>}

            <div className="entity-search relative mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    className="w-full sm:w-80 pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs"
                    placeholder={`Search ${title.toLowerCase()}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-sm font-medium">Loading {title.toLowerCase()}...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                        <p className="text-sm">No {title.toLowerCase()} found.</p>
                        <button className="btn-primary inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-all cursor-pointer" onClick={openAddModal}>
                            <Plus size={14} /> Add {title.replace(/s$/, "")}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {columns.map((col) => (
                                        <th key={col.key} className="px-6 py-4">{col.label}</th>
                                    ))}
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item) => {
                                    const rowId = item._id || item.id;
                                    return (
                                        <tr key={rowId} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                                            {columns.map((col) => {
                                                const rawVal = item[col.key];
                                                return (
                                                    <td key={col.key} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                                        {col.render ? (
                                                            col.render(rawVal, item)
                                                        ) : col.key === "isActive" || col.key === "status" ? (
                                                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${rawVal !== false && rawVal !== "inactive" ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                }`}>
                                                                {rawVal !== false && rawVal !== "inactive" ? 'Active' : 'Inactive'}
                                                            </span>
                                                        ) : col.bold ? (
                                                            <span className="font-semibold text-gray-900">{rawVal || "—"}</span>
                                                        ) : (
                                                            rawVal || "—"
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" onClick={() => openEditModal(item)} title="Edit">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" onClick={() => setDeleteId(rowId)} title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={closeModal}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden transform transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingItem ? `Edit ${title.replace(/s$/, "")}` : `Add New ${title.replace(/s$/, "")}`}
                            </h3>
                            <button className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer" onClick={closeModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {fields.map((f) => (
                                <div className="space-y-1.5" key={f.key}>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                                    </label>
                                    {f.type === "select" ? (
                                        <select
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                                            value={form[f.key] ?? ""}
                                            required={f.required}
                                            onChange={(e) => handleChange(f.key, e.target.value)}
                                        >
                                            <option value="" disabled>Select {f.label}</option>
                                            {f.options?.map((opt) => {
                                                const optVal = typeof opt === 'object' ? opt.value : opt;
                                                const optLab = typeof opt === 'object' ? opt.label : opt;
                                                return <option key={optVal} value={optVal}>{optLab}</option>;
                                            })}
                                        </select>
                                    ) : f.type === "textarea" ? (
                                        <textarea
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                                            rows={3}
                                            value={form[f.key] ?? ""}
                                            required={f.required}
                                            placeholder={f.placeholder || ""}
                                            onChange={(e) => handleChange(f.key, e.target.value)}
                                        />
                                    ) : (
                                        <input
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                                            type={f.type || "text"}
                                            value={form[f.key] ?? ""}
                                            required={f.required}
                                            placeholder={f.placeholder || ""}
                                            onChange={(e) =>
                                                handleChange(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)
                                            }
                                        />
                                    )}
                                </div>
                            ))}

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</label>
                                <select
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                                    value={form.isActive ?? true}
                                    onChange={(e) => handleChange("isActive", e.target.value === "true")}
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50" disabled={saving}>
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    {saving ? "Saving..." : editingItem ? "Update Changes" : "Create Record"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={() => setDeleteId(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-6 overflow-hidden transform transition-all duration-200 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                        <p className="text-sm text-gray-500">Are you sure you want to delete this record? This action cannot be undone.</p>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button type="button" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setDeleteId(null)}>Cancel</button>
                            <button type="button" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer" onClick={() => handleDelete(deleteId)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}