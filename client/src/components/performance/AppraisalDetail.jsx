"use client";

import { dateText } from "@/components/payroll/ui";
import { Box, Chip, FooterBar, Info, ghostBtn } from "@/components/recruitment/rui";
import { APPR_ST, DEC_ST, Stars, StChip } from "./pui";

const Text = ({ title, text }) =>
    text ? (
        <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{title}</p>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">{text}</p>
        </div>
    ) : null;

/* Center popup with a whole appraisal. children = extra footer buttons. */
export default function AppraisalDetail({ a, onClose, children }) {
    const e = a.employee || {};
    const promo = a.promotionStatus && a.promotionStatus !== "none";
    const inc = a.incrementStatus && a.incrementStatus !== "none";

    return (
        <Box title={e.name || "Appraisal"} subtitle={a.reviewPeriod} onClose={onClose} footer={<FooterBar>{children}<button type="button" onClick={onClose} className={ghostBtn}>Close</button></FooterBar>}>
            <div className="flex flex-wrap items-center gap-2">
                <StChip map={APPR_ST} v={a.status} />
                {a.isOverdue && <Chip tone="rose">Overdue</Chip>}
                {a.rating ? <span className="inline-flex items-center gap-1.5"><Stars value={a.rating} size={15} /><span className="text-xs font-bold text-slate-700">{a.rating}/5 • {a.ratingLabel}</span></span> : null}
            </div>

            <Info rows={[
                ["Employee ID", e.employeeId], ["Department", e.department], ["Designation", e.designation],
                ["Due date", a.dueDate ? dateText(a.dueDate) : ""], ["Self rating", a.selfRating ? `${a.selfRating}/5` : ""],
                ["Reviewed by", a.reviewedBy?.name], ["Completed on", a.completedAt ? dateText(a.completedAt) : ""],
            ]} />

            <Text title="Self assessment" text={a.selfAssessment} />
            <Text title="Manager assessment" text={a.managerAssessment} />
            <Text title="Strengths" text={a.strengths} />
            <Text title="Areas of improvement" text={a.areasOfImprovement} />

            {(promo || inc) && (
                <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                    {promo && <div className="flex flex-wrap items-center gap-2 px-4 py-3"><span className="font-bold text-slate-600 w-20">Promotion</span><StChip map={DEC_ST} v={a.promotionStatus} />{a.proposedDesignation && <span className="font-semibold text-slate-700">to {a.proposedDesignation}</span>}</div>}
                    {inc && <div className="flex flex-wrap items-center gap-2 px-4 py-3"><span className="font-bold text-slate-600 w-20">Increment</span><StChip map={DEC_ST} v={a.incrementStatus} />{a.incrementPercent > 0 && <span className="font-semibold text-slate-700">{a.incrementPercent}%</span>}{a.incrementEffectiveDate && <span className="text-slate-400">from {dateText(a.incrementEffectiveDate)}</span>}</div>}
                </div>
            )}
        </Box>
    );
}