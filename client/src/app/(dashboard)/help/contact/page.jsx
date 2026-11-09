"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Mail, MessageSquare, Phone, Users } from "lucide-react";
import { ErrorBanner } from "@/components/payroll/ui";
import { EmptyBox, ListSkeleton, PageHeader, SearchBox } from "@/components/payroll/common";
import { Chip } from "@/components/recruitment/rui";
import { Avatar } from "@/components/payroll/ui";
import { useApi } from "@/components/performance/pui";
import { PRIORITIES, ROLE_LABEL, SLA } from "@/components/support/supportConfig";

export default function ContactHRPage() {
  const { data, loading, refreshing, error, load } = useApi("/support/contacts");
  const [search, setSearch] = useState("");
  const list = data?.contacts || [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => !q || `${c.name} ${c.email} ${c.designation} ${c.department}`.toLowerCase().includes(q));
  }, [list, search]);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Users} title="Contact HR" subtitle="The people who answer your support tickets." onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        <Link href="/help/tickets" className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition"><MessageSquare size={15} /> Chat with HR</Link>
      </PageHeader>

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm"><SearchBox value={search} onChange={setSearch} placeholder="Search by name, email or department" /></div>
      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"><ListSkeleton /></div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm"><EmptyBox icon={Users} title="No contacts found" text="HR and Admin people appear here." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {visible.map((c) => (
            <div key={c._id} className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-start gap-3.5">
                <Avatar name={c.name} size="w-12 h-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900 truncate">{c.name}</p><Chip tone={c.role === "admin" ? "violet" : "indigo"}>{ROLE_LABEL[c.role]}</Chip></div>
                  <p className="text-xs font-semibold text-indigo-600 truncate mt-0.5">{c.designation || "People Operations"}</p>
                  {c.department && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Building2 size={11} /> {c.department}</p>}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <a href={`mailto:${c.email}`} className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition"><Mail size={14} className="text-indigo-600 shrink-0" /><span className="truncate">{c.email}</span></a>
                {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition"><Phone size={14} className="text-emerald-600" /> {c.phone}</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-bold text-slate-900">How fast do we reply?</h2>
        <p className="text-xs text-slate-500 mt-1">The target depends on the priority you choose when you raise a ticket. Tickets that cross it are marked <b>Overdue</b> for HR.</p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRIORITIES.slice().reverse().map((p) => <div key={p} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{p}</p><p className="text-sm font-extrabold text-slate-800">{SLA[p]}</p></div>)}
        </div>
      </section>
    </div>
  );
}
