"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, ListChecks, Plus, Target, UserMinus, Users } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, Label, inputClass } from "@/components/payroll/ui";
import { PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, FormFooter, Info, errMsg, ghostBtn } from "@/components/recruitment/rui";
import { Bar, DataPanel, Person, Stats, selectCls, roleOf, useApi } from "@/components/performance/pui";

/* admin and HR pick whose team they want to see */
function StaffBar({ value, onChange, onAssign }) {
    const { data } = useApi("/employees/manager-options");
    const list = data?.managers || [];
    useEffect(() => { if (!value && list.length) onChange(list[0]._id); }, [value, list, onChange]);
    return (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-wrap items-center gap-2.5">
            <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
                {list.length === 0 && <option value="">No managers yet</option>}
                {list.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.reportees} people)</option>)}
            </select>
            <button type="button" disabled={!value} onClick={onAssign} className={`${primaryBtn} disabled:opacity-50`}><Plus size={15} /> Add people to this team</button>
        </div>
    );
}

export default function TeamPage() {
    const { user } = useAuth();
    const router = useRouter();
    const staff = ["admin", "hr"].includes(roleOf(user));
    const [mgr, setMgr] = useState("");
    const { data, loading, refreshing, error, load } = useApi("/employees/team", mgr ? { manager: mgr } : {});
    const members = data?.members || [];
    const s = data?.summary || {};

    const [search, setSearch] = useState("");
    const [viewing, setViewing] = useState(null);
    const [ask, setAsk] = useState(null);
    const [assign, setAssign] = useState(false);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return members.filter((m) => !q || `${m.name} ${m.employeeId} ${m.designation} ${m.department}`.toLowerCase().includes(q));
    }, [members, search]);

    const remove = (m) => setAsk({
        title: "Remove from this team?", text: `${m.name} will have no reporting manager until you assign a new one.`, label: "Remove", danger: true,
        run: async () => {
            try {
                await api.put("/employees/assign-team", { manager: "", employees: [m._id] });
                toast.success("Removed from the team.");
                await load({ silent: true });
            } catch (err) { toast.error(await errMsg(err, "Unable to remove.")); }
        },
    });

    const menu = (m) => [
        { label: "View details", icon: Eye, run: () => setViewing(m) },
        { label: "Give a task", icon: ListChecks, run: () => router.push("/tasks"), hidden: !m.hasLogin },
        { label: "Remove from team", icon: UserMinus, run: () => remove(m), hidden: !staff, danger: true },
    ];
    const taskCell = (m) => (m.hasLogin
        ? <div className="flex flex-wrap gap-1.5"><Chip tone="indigo">{m.tasks.open} open</Chip>{m.tasks.submitted > 0 && <Chip tone="violet">{m.tasks.submitted} to review</Chip>}{m.tasks.overdue > 0 && <Chip tone="rose">{m.tasks.overdue} late</Chip>}</div>
        : <Chip tone="amber">No login</Chip>);
    const goalCell = (m) => (m.goals.total ? <div className="w-32"><Bar value={m.goals.avgProgress} /><p className="text-[11px] font-semibold text-slate-500 mt-1">{m.goals.avgProgress}% • {m.goals.completed}/{m.goals.total}</p></div> : <span className="text-slate-300">No goals</span>);

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={Users} title="My Team" subtitle={data?.manager ? `People who report to ${data.manager.name}` : "People who report to you"} onRefresh={() => load({ silent: true })} busy={loading || refreshing} />
            {staff && <StaffBar value={mgr} onChange={setMgr} onAssign={() => setAssign(true)} />}

            {!loading && !error && <Stats items={[["Team members", s.members || 0, Users, "indigo"], ["Open tasks", s.openTasks || 0, ClipboardList, "violet"], ["Waiting for review", s.submitted || 0, CheckCircle2, "emerald"], ["Overdue tasks", s.overdue || 0, AlertTriangle, "violet"]]} />}

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm"><SearchBox value={search} onChange={setSearch} placeholder="Search name, ID or department" /></div>
            <ErrorBanner message={error} onRetry={() => load()} />

            <DataPanel
                loading={loading} rows={visible} icon={Users}
                empty={[members.length ? "Nothing matches your search" : "No team members yet", staff ? 'Click "Add people to this team".' : "Ask HR to set you as the Reporting Manager of your people."]}
                onOpen={setViewing} menu={menu}
                cols={[
                    { h: "Employee", cell: (m) => <Person p={m} /> },
                    { h: "Designation", cell: (m) => m.designation || "—" },
                    { h: "Tasks", cell: taskCell },
                    { h: "Goals", cell: goalCell },
                    { h: "Status", cell: (m) => <Chip tone={m.loginActive ? "emerald" : "rose"} dot>{m.loginActive ? "Active" : m.hasLogin ? "Login off" : "No login"}</Chip> },
                ]}
                card={(m) => (
                    <div className="space-y-2.5">
                        <Person p={m} />
                        {taskCell(m)}
                        {goalCell(m)}
                    </div>
                )}
            />

            {viewing && (
                <Box title={viewing.name} subtitle={viewing.designation || "Team member"} onClose={() => setViewing(null)} footer={<FooterBar><button type="button" onClick={() => setViewing(null)} className={ghostBtn}>Close</button></FooterBar>}>
                    <Info rows={[["Employee ID", viewing.employeeId], ["Department", viewing.department], ["Email", viewing.email], ["Phone", viewing.phone], ["Open tasks", viewing.tasks.open], ["Waiting for your review", viewing.tasks.submitted], ["Completed tasks", viewing.tasks.completed], ["Overdue tasks", viewing.tasks.overdue], ["Goals", viewing.goals.total ? `${viewing.goals.completed}/${viewing.goals.total} done, ${viewing.goals.avgProgress}% progress` : "No goals"], ["Login", viewing.hasLogin ? (viewing.loginActive ? "Active" : "Switched off") : "Not created yet"]]} />
                </Box>
            )}

            {assign && <AssignModal manager={mgr} current={members} onClose={() => setAssign(false)} onDone={() => load({ silent: true })} />}
            {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
        </div>
    );
}

function AssignModal({ manager, current, onClose, onDone }) {
    const { data, loading } = useApi("/employees");
    const [picked, setPicked] = useState(new Set());
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState(false);
    const have = new Set(current.map((m) => String(m._id)));
    const list = (Array.isArray(data) ? data : []).filter((e) => String(e._id) !== String(manager) && !have.has(String(e._id)) && !/^(inactive|exited|exit)$/i.test(e.employeeStatus || ""))
        .filter((e) => !q.trim() || `${e.name} ${e.employeeId}`.toLowerCase().includes(q.trim().toLowerCase()));
    const flip = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const save = async (e) => {
        e.preventDefault();
        if (busy || !picked.size) return;
        setBusy(true);
        try {
            const { data: r } = await api.put("/employees/assign-team", { manager, employees: [...picked] });
            toast.success(r.message || "Team updated.");
            onDone();
            onClose();
        } catch (err) {
            toast.error(await errMsg(err, "Unable to update the team."));
            setBusy(false);
        }
    };

    return (
        <Box title="Add people to this team" subtitle="Tick the employees who will report to this manager" onClose={onClose} onSubmit={save} locked={busy} size="max-w-lg" footer={<FormFooter onCancel={onClose} busy={busy} label={`Add ${picked.size} selected`} />}>
            <SearchBox value={q} onChange={setQ} placeholder="Search employee" />
            {loading ? <p className="py-8 text-center text-xs font-semibold text-slate-400">Loading...</p> : list.length === 0 ? <p className="py-8 text-center text-xs font-semibold text-slate-400">No more employees to add.</p> : (
                <ul className="space-y-2 max-h-[45dvh] overflow-y-auto pr-1">
                    {list.map((e) => (
                        <li key={e._id}>
                            <label className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${picked.has(e._id) ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}>
                                <input type="checkbox" checked={picked.has(e._id)} onChange={() => flip(e._id)} className="rounded border-slate-300 text-indigo-600" />
                                <span className="min-w-0"><span className="block text-xs font-bold text-slate-800 truncate">{e.name}</span><span className="block text-[11px] text-slate-400 truncate">{e.employeeId}</span></span>
                            </label>
                        </li>
                    ))}
                </ul>
            )}
        </Box>
    );
}