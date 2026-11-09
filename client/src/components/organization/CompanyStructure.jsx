"use client";

import Link from "next/link";
import { ArrowUpRight, Award, Briefcase, Building2, Layers, MapPin, Users, Users2 } from "lucide-react";

const initials = (s) => { const p = String(s || "?").trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase(); };

function Tile({ icon: I, label, value, href, tone }) {
    return (
        <Link href={href} className="group bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${tone}`}><I size={16} /></span>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition" />
            </div>
            <p className="mt-3 text-2xl font-extrabold font-mono text-slate-900 leading-none">{Number(value || 0).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
        </Link>
    );
}

function Block({ icon: I, title, count, href, empty, children, className = "" }) {
    return (
        <section className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 p-5 sm:p-6 ${className}`}>
            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                <h3 className="flex items-center gap-2.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><I size={15} /></span>
                    {title}<span className="text-slate-400 font-semibold">({count})</span>
                </h3>
                <Link href={href} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">Manage <ArrowUpRight size={12} /></Link>
            </div>
            {count === 0 ? <p className="py-6 text-center text-xs font-semibold text-slate-400">{empty}</p> : children}
        </section>
    );
}

const Pill = ({ children, tone = "bg-slate-100 text-slate-600 border-slate-200" }) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${tone}`}>{children}</span>;

export default function CompanyStructure({ data }) {
    if (!data) return <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-xs font-semibold text-slate-400">The company structure is not available right now.</div>;

    const total = data.company?.totalEmployees || 0;
    const c = data.counts;

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Tile icon={Users} label="Employees" value={total} href="/employees" tone="bg-emerald-50 text-emerald-600 border-emerald-100" />
                <Tile icon={Building2} label="Branches" value={c.branches} href="/organization/branches" tone="bg-indigo-50 text-indigo-600 border-indigo-100" />
                <Tile icon={Layers} label="Departments" value={c.departments} href="/organization/departments" tone="bg-violet-50 text-violet-600 border-violet-100" />
                <Tile icon={Briefcase} label="Designations" value={c.designations} href="/organization/designations" tone="bg-blue-50 text-blue-600 border-blue-100" />
                <Tile icon={MapPin} label="Locations" value={c.locations} href="/organization/locations" tone="bg-sky-50 text-sky-600 border-sky-100" />
                <Tile icon={Users2} label="Teams" value={c.teams} href="/organization/teams" tone="bg-amber-50 text-amber-600 border-amber-100" />
            </div>

            {(data.company?.withoutDepartment > 0 || data.company?.joinedThisMonth > 0) && (
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                    {data.company.joinedThisMonth > 0 && <Pill tone="bg-emerald-50 text-emerald-700 border-emerald-200">{data.company.joinedThisMonth} joined this month</Pill>}
                    {data.company.withoutDepartment > 0 && <Pill tone="bg-amber-50 text-amber-700 border-amber-200">{data.company.withoutDepartment} employees without a department</Pill>}
                </div>
            )}

            <Block icon={Layers} title="Departments" count={data.departments.length} href="/organization/departments" empty="No departments yet. Add them in Organization > Departments.">
                <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1">
                    {data.departments.map((d) => (
                        <li key={d._id} className="py-2.5 group">
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-[11px] font-extrabold">{initials(d.name)}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2"><p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{d.name}</p>{d.code && <Pill tone="bg-indigo-50 text-indigo-700 border-indigo-100">{d.code}</Pill>}</div>
                                    <p className="text-[11px] text-slate-400 truncate">{d.head?.name ? `Head: ${d.head.name}` : "No head assigned"}{d.branch ? ` • ${d.branch}` : ""}</p>
                                </div>
                                <span className="text-sm font-extrabold font-mono text-slate-800">{d.employeeCount}</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-500 group-hover:bg-indigo-600 transition-all duration-700" style={{ width: `${total ? Math.max(d.employeeCount ? 4 : 0, Math.round((d.employeeCount / total) * 100)) : 0}%` }} /></div>
                        </li>
                    ))}
                </ul>
            </Block>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Block icon={Building2} title="Branches" count={data.branches.length} href="/organization/branches" empty="No branches yet.">
                    <ul className="divide-y divide-slate-100">
                        {data.branches.map((b) => (
                            <li key={b._id} className="py-2.5 flex items-center gap-3 hover:bg-slate-50/70 rounded-lg px-1 transition">
                                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 truncate">{b.name}</p><p className="text-[11px] text-slate-400 truncate">{[b.code, b.city, b.state].filter(Boolean).join(" • ") || "—"}</p></div>
                                <Pill tone="bg-violet-50 text-violet-700 border-violet-200">{b.employeeCount} employees</Pill>
                            </li>
                        ))}
                    </ul>
                </Block>

                <Block icon={MapPin} title="Locations" count={data.locations.length} href="/organization/locations" empty="No locations yet.">
                    <ul className="divide-y divide-slate-100">
                        {data.locations.map((l) => (
                            <li key={l._id} className="py-2.5 flex items-center gap-3 hover:bg-slate-50/70 rounded-lg px-1 transition">
                                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 truncate">{l.name}</p><p className="text-[11px] text-slate-400 truncate">{[l.city, l.state, l.country].filter(Boolean).join(", ") || "—"}</p></div>
                                <Pill tone="bg-violet-50 text-violet-700 border-violet-200">{l.employeeCount}</Pill>
                            </li>
                        ))}
                    </ul>
                </Block>

                <Block icon={Award} title="Designations" count={data.designations.length} href="/organization/designations" empty="No designations yet.">
                    <ul className="max-h-80 overflow-y-auto pr-1 divide-y divide-slate-100">
                        {data.designations.map((d) => (
                            <li key={d._id} className="py-2.5 flex items-center gap-3 hover:bg-slate-50/70 rounded-lg px-1 transition">
                                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 truncate">{d.title}</p><p className="text-[11px] text-slate-400 truncate">{d.department || "No department"}</p></div>
                                {d.level && <Pill tone="bg-blue-50 text-blue-700 border-blue-200">{d.level}</Pill>}
                                <span className="text-xs font-extrabold font-mono text-slate-700 w-6 text-right">{d.employeeCount}</span>
                            </li>
                        ))}
                    </ul>
                </Block>

                <Block icon={Users2} title="Teams" count={data.teams.length} href="/organization/teams" empty="No teams yet.">
                    <ul className="max-h-80 overflow-y-auto pr-1 divide-y divide-slate-100">
                        {data.teams.map((t) => (
                            <li key={t._id} className="py-2.5 flex items-center gap-3 hover:bg-slate-50/70 rounded-lg px-1 transition">
                                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 truncate">{t.name}</p><p className="text-[11px] text-slate-400 truncate">{[t.department, t.teamLead && `Lead: ${t.teamLead}`].filter(Boolean).join(" • ") || "—"}</p></div>
                                <Pill tone="bg-violet-50 text-violet-700 border-violet-200">{t.membersCount} members</Pill>
                            </li>
                        ))}
                    </ul>
                </Block>
            </div>
        </div>
    );
}