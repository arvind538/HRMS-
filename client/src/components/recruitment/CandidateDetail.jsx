"use client";

import { Download, Eye, FileText } from "lucide-react";
import { Box, Chip, FooterBar, Info, STAGE, ghostBtn, openResume } from "./rui";

const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

/* Center popup with the full profile of a candidate. `children` are extra footer buttons. */
export default function CandidateDetail({ c, onClose, children }) {
    const st = STAGE[c.status] || STAGE.applied;
    const hasResume = c.hasResume || /^https?:\/\//i.test(c.resumeUrl || "");
    const history = [...(c.statusHistory || [])].reverse();

    return (
        <Box
            title={c.name}
            subtitle={c.jobPosition?.title || "Candidate"}
            onClose={onClose}
            footer={<FooterBar>{children}<button type="button" onClick={onClose} className={ghostBtn}>Close</button></FooterBar>}
        >
            <div className="flex items-center gap-3">
                <Chip tone={st.tone} dot>{st.label}</Chip>
                {c.createdAt && <span className="text-[11px] text-slate-400 font-medium">Applied {when(c.createdAt)}</span>}
            </div>

            <Info rows={[
                ["Email", c.email], ["Phone", c.phone], ["Applying for", c.jobPosition?.title], ["Experience", c.experience],
                ["Current company", c.currentCompany], ["Expected CTC", c.expectedCtc], ["Notice period", c.noticePeriod],
                ["Source", (c.source || "").replace("-", " ")],
            ]} />

            <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Resume</p>
                {hasResume ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0"><FileText size={17} /></div>
                        <p className="text-xs font-bold text-slate-800 truncate flex-1 min-w-0">{c.resumeName || "Resume link"}</p>
                        <button type="button" onClick={() => openResume(c)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer"><Eye size={14} /> View</button>
                        {c.hasResume && <button type="button" onClick={() => openResume(c, true)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" aria-label="Download resume"><Download size={15} /></button>}
                    </div>
                ) : <p className="text-xs text-slate-400 font-medium">No resume was uploaded.</p>}
            </div>

            {c.notes && (
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Notes</p>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 break-words">{c.notes}</p>
                </div>
            )}

            {history.length > 0 && (
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">History</p>
                    <ul className="space-y-2.5">
                        {history.map((h, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs">
                                <Chip tone={(STAGE[h.status] || STAGE.applied).tone}>{(STAGE[h.status] || { label: h.status }).label}</Chip>
                                <div className="min-w-0">
                                    {h.note && <p className="text-slate-700 font-medium break-words">{h.note}</p>}
                                    <p className="text-[11px] text-slate-400">{when(h.at)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Box>
    );
}