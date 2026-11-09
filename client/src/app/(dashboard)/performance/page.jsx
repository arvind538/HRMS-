"use client";

import Link from "next/link";
import { ArrowUpRight, Award, ClipboardCheck, Star, Target, TrendingUp } from "lucide-react";
import { ErrorBanner, StatCard } from "@/components/payroll/ui";
import { ListSkeleton, PageHeader } from "@/components/payroll/common";
import { Chip } from "@/components/recruitment/rui";
import { Bar, GOAL_ST, Stats, Stars, useApi } from "@/components/performance/pui";

const Panel = ({ title, href, children }) => (
    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-5 hover:border-indigo-200 transition">
        <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {href && <Link href={href} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">Open <ArrowUpRight size={12} /></Link>}
        </div>
        {children}
    </section>
);
const None = ({ text }) => <p className="py-6 text-center text-xs font-semibold text-slate-400">{text}</p>;

export default function PerformanceDashboardPage() {
    const { data: d, loading, refreshing, error, load } = useApi("/performance/summary");
    const g = d?.goals || {};
    const a = d?.appraisals || {};
    const p = d?.pending || {};
    const company = d?.scope === "company";

    const todo = [
        [p.mySelfAssessments, "self assessment to write", "/performance/self-assessment"],
        [p.toReview, "appraisals to review", "/performance/manager-assessment"],
        [p.promotions, "promotions to decide", "/performance/promotion"],
        [p.increments, "increments to decide", "/performance/increment"],
    ].filter(([n]) => n > 0);

    const tiles = [
        ["Goals completed", `${g.completed || 0} / ${g.total || 0}`, Target, "indigo", "/performance/goals"],
        ["Open appraisals", (a.pendingSelf || 0) + (a.pendingManager || 0), ClipboardCheck, "violet", "/performance/appraisals"],
        ["Average rating", a.averageRating ? a.averageRating.toFixed(1) : "—", Star, "emerald", "/performance/ratings"],
        company ? ["Promotions to decide", p.promotions || 0, Award, "violet", "/performance/promotion"] : ["Completed reviews", a.completed || 0, Award, "violet", "/performance/reviews"],
    ];
    const totalRated = (a.distribution || []).reduce((s, r) => s + r.count, 0);

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={TrendingUp} title="Performance" subtitle={d?.scope === "company" ? "Goals, appraisals and ratings of the whole company." : d?.scope === "team" ? "Goals, appraisals and ratings of your team." : "Your goals, appraisals and ratings."} onRefresh={() => load({ silent: true })} busy={loading || refreshing} />
            <ErrorBanner message={error} onRetry={() => load()} />

            {loading ? <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"><ListSkeleton /></div> : d && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {tiles.map(([label, value, I, tone, href]) => (
                            <Link key={label} href={href} className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100">
                                <StatCard icon={I} tone={tone} label={label} value={value} />
                            </Link>
                        ))}
                    </div>

                    {todo.length > 0 && (
                        <div className="flex flex-wrap gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <span className="text-xs font-bold text-amber-900 mr-1 self-center">Waiting for you:</span>
                            {todo.map(([n, text, href]) => <Link key={href} href={href} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 transition">{n} {text} <ArrowUpRight size={12} /></Link>)}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Panel title="Goal progress" href="/performance/goals">
                            {g.total ? (
                                <div className="space-y-3">
                                    <div className="flex items-end justify-between"><p className="text-3xl font-extrabold font-mono text-slate-900">{g.completionRate}%</p><p className="text-[11px] font-semibold text-slate-400">average progress {g.averageProgress}%</p></div>
                                    <Bar value={g.completionRate} tone="bg-emerald-500" />
                                    <div className="flex flex-wrap gap-2">
                                        <Chip tone="emerald">{g.completed} completed</Chip><Chip tone="indigo">{g.inProgress} in progress</Chip><Chip tone="slate">{g.notStarted} not started</Chip>{g.overdue > 0 && <Chip tone="rose">{g.overdue} overdue</Chip>}
                                    </div>
                                </div>
                            ) : <None text="No goals yet." />}
                        </Panel>

                        <Panel title="Rating spread" href="/performance/ratings">
                            {totalRated ? (
                                <ul className="space-y-2.5">
                                    {a.distribution.map((r) => (
                                        <li key={r.rating}>
                                            <div className="flex items-center justify-between text-xs mb-1"><span className="inline-flex items-center gap-2 font-bold text-slate-700"><Stars value={r.rating} size={11} />{r.label}</span><span className="font-bold text-slate-800">{r.count}</span></div>
                                            <Bar value={(r.count / totalRated) * 100} tone="bg-amber-400" />
                                        </li>
                                    ))}
                                </ul>
                            ) : <None text="No completed appraisals yet." />}
                        </Panel>

                        <Panel title="Departments">
                            {d.departments.length ? (
                                <ul className="space-y-3">
                                    {d.departments.slice(0, 6).map((x) => (
                                        <li key={x.name}>
                                            <div className="flex items-center justify-between text-xs mb-1"><span className="font-bold text-slate-700 truncate">{x.name}</span><span className="text-slate-400 font-semibold shrink-0 ml-3">{x.goalsCompleted}/{x.goals} goals{x.averageRating ? ` • ${x.averageRating}★` : ""}</span></div>
                                            <Bar value={x.score} />
                                        </li>
                                    ))}
                                </ul>
                            ) : <None text="Nothing to show yet." />}
                        </Panel>

                        <Panel title="Deadlines in 14 days" href="/performance/goals">
                            {d.upcomingDeadlines.length ? (
                                <ul className="divide-y divide-slate-100">
                                    {d.upcomingDeadlines.map((x) => (
                                        <li key={x._id} className="py-2.5 flex items-center gap-3">
                                            <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800 truncate">{x.title}</p><p className="text-[11px] text-slate-400 truncate">{x.employee?.name}</p></div>
                                            <Chip tone={x.daysLeft < 0 ? "rose" : x.daysLeft <= 3 ? "amber" : GOAL_ST[x.status]?.tone}>{x.daysLeft < 0 ? `${-x.daysLeft}d late` : x.daysLeft === 0 ? "Today" : `${x.daysLeft}d left`}</Chip>
                                        </li>
                                    ))}
                                </ul>
                            ) : <None text="No deadlines coming up." />}
                        </Panel>
                    </div>

                    {d.topPerformers.length > 0 && (
                        <Panel title="Top performers" href="/performance/ratings">
                            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {d.topPerformers.map((x) => (
                                    <li key={x._id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-indigo-300 transition">
                                        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-900 truncate">{x.employee?.name}</p><p className="text-[11px] text-slate-400 truncate">{x.reviewPeriod} • {x.ratingLabel}</p></div>
                                        <Stars value={x.rating} />
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}
                </>
            )}
        </div>
    );
}

