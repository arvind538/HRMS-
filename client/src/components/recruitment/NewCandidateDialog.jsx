"use client";

import { useMemo, useState } from "react";
import { Briefcase, Mail, Phone, User } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { FieldError, Label, fieldBorder, inputClass } from "@/components/payroll/ui";
import { Box, FormFooter, errMsg, idOf } from "@/components/recruitment/rui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{10,13}$/;

const blank = () => ({ name: "", email: "", phone: "", jobPosition: "" });

function Field({ label, icon: Icon, error, children }) {
    return (
        <div className="min-w-0">
            <Label>{label}</Label>
            <div className="relative">
                {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
                {children}
            </div>
            <FieldError>{error}</FieldError>
        </div>
    );
}

/**
 * Popup form to add a candidate.
 * onCreated(id, name) is called after the candidate is saved, so the parent can select it.
 * Render this OUTSIDE any other <form> (sibling, not child), otherwise the DOM nests forms.
 */
export default function NewCandidateDialog({ jobs = [], onClose, onCreated }) {
    const [form, setForm] = useState(blank());
    const [errors, setErrors] = useState({});
    const [serverErr, setServerErr] = useState("");
    const [saving, setSaving] = useState(false);

    const jobList = useMemo(() => (Array.isArray(jobs) ? jobs : []), [jobs]);

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
        setServerErr("");
    };

    const submit = async (e) => {
        e.preventDefault();
        if (saving) return;

        const name = form.name.trim().replace(/\s+/g, " ");
        const email = form.email.trim().toLowerCase();
        const phone = form.phone.replace(/[\s-]/g, "");

        const next = {};
        if (name.length < 2) next.name = "Please enter the full name (at least 2 characters).";
        if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
        if (phone && !PHONE_RE.test(phone)) next.phone = "Enter a valid phone number (10 digits).";
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        try {
            const { data } = await api.post("/recruitment/candidates", {
                name,
                email,
                phone,
                jobPosition: form.jobPosition || null,
            });
            const created = data?.candidate || data?.data || data;
            const id = idOf(created);
            if (!id) throw new Error("Candidate id missing");

            toast.success(`${name} added and selected.`);
            try {
                await onCreated?.(id, name);
            } catch {
                /* parent handles its own errors */
            }
            onClose();
        } catch (err) {
            setServerErr(await errMsg(err, "Unable to add the candidate. Please try again."));
        } finally {
            setSaving(false);
        }
    };

    const inp = (err) => `${inputClass} ${fieldBorder(err)}`;

    return (
        <Box
            title="Add new candidate"
            subtitle="The saved candidate will be selected automatically"
            onClose={onClose}
            onSubmit={submit}
            locked={saving}
            size="max-w-md"
            footer={<FormFooter onCancel={onClose} busy={saving} label="Save & select" />}
        >
            {serverErr && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                    {serverErr}
                </div>
            )}

            <Field label="Full name" icon={User} error={errors.name}>
                <input
                    autoFocus
                    value={form.name}
                    maxLength={80}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className={`${inp(errors.name)} pl-10`}
                />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" icon={Mail} error={errors.email}>
                    <input
                        type="email"
                        value={form.email}
                        maxLength={120}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="candidate@gmail.com"
                        className={`${inp(errors.email)} pl-10`}
                    />
                </Field>

                <Field label="Phone (optional)" icon={Phone} error={errors.phone}>
                    <input
                        type="tel"
                        value={form.phone}
                        maxLength={16}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="9876543210"
                        className={`${inp(errors.phone)} pl-10`}
                    />
                </Field>
            </div>

            <Field label="Applying for (optional)" icon={Briefcase} error="">
                <select
                    value={form.jobPosition}
                    onChange={(e) => set("jobPosition", e.target.value)}
                    className={`${inputClass} pl-10 cursor-pointer border-slate-200 focus:border-indigo-500`}
                >
                    <option value="">Select job position</option>
                    {jobList.map((j) => (
                        <option key={j._id} value={j._id}>
                            {j.title || j.name}
                        </option>
                    ))}
                </select>
            </Field>
        </Box>
    );
}