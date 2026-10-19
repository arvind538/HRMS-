const rupees = (n) =>
    `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isHex = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || ""));
const safe = (v) => {
    const s = String(v ?? "").trim();
    return !s || isHex(s) ? "-" : s;
};
const dateText = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "-");

/* slip is the object returned by GET /api/payroll/payslip/:id */
export async function downloadPayslipPdf(slip) {
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default || autoTableModule.autoTable;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 40;
    const INDIGO = [79, 70, 229];
    const SLATE = [30, 41, 59];
    const MUTED = [100, 116, 139];
    const LINE = [226, 232, 240];
    const margin = { left: M, right: M };

    /* Draws a table and returns the y position below it */
    let end = 0;
    const draw = (options) => {
        autoTable(doc, {
            ...options,
            didDrawPage: (d) => {
                if (d.cursor) end = d.cursor.y;
            },
        });
        return doc.lastAutoTable?.finalY ?? end;
    };

    /* Header */
    doc.setFillColor(...INDIGO);
    doc.rect(0, 0, W, 84, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(safe(slip.company?.name), M, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(String(slip.company?.address || ""), W - M * 2 - 170);
    if (addressLines.length && addressLines[0]) doc.text(addressLines.slice(0, 2), M, 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("PAYSLIP", W - M, 36, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(safe(slip.periodLabel), W - M, 54, { align: "right" });
    doc.setFontSize(8);
    doc.text(safe(slip.slipNumber), W - M, 70, { align: "right" });

    /* Employee details */
    const emp = slip.employee || {};
    let y = draw({
        startY: 84 + 18,
        theme: "plain",
        margin,
        styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: SLATE },
        columnStyles: {
            0: { textColor: MUTED, cellWidth: 95 },
            1: { fontStyle: "bold", cellWidth: 150 },
            2: { textColor: MUTED, cellWidth: 95 },
            3: { fontStyle: "bold" },
        },
        body: [
            ["Employee Name", safe(emp.name), "Employee ID", safe(emp.employeeId)],
            ["Designation", safe(emp.designation), "Department", safe(emp.department)],
            ["Date of Joining", dateText(emp.dateOfJoining), "Pay Period", safe(slip.periodLabel)],
            ["Payment Status", capitalize(slip.status), "Paid On", dateText(slip.paidOn)],
        ],
    });

    /* Attendance summary */
    const a = slip.attendance || {};
    y = draw({
        startY: y + 12,
        theme: "grid",
        margin,
        head: [["Days in Month", "Working Days", "Days Present", "Paid Leave", "Loss of Pay Days"]],
        body: [[a.daysInMonth ?? 0, a.workingDays ?? 0, a.present ?? 0, a.leave ?? 0, a.unpaid ?? 0].map(String)],
        styles: { lineColor: LINE, lineWidth: 0.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontSize: 8, halign: "center" },
        bodyStyles: { halign: "center", fontSize: 10, fontStyle: "bold", textColor: SLATE },
    });
    if (slip.basis === "full") {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text("Paid for the full month (attendance was not applied).", M, y + 12);
        y += 14;
    }

    /* Earnings and deductions */
    const earn = slip.earningLines || [];
    const ded = slip.deductionLines || [];
    const count = Math.max(earn.length, ded.length, 1);
    const body = Array.from({ length: count }, (_, i) => [
        earn[i]?.label || "",
        earn[i] ? rupees(earn[i].amount) : "",
        ded[i]?.label || "",
        ded[i] ? rupees(ded[i].amount) : "",
    ]);

    y = draw({
        startY: y + 16,
        theme: "grid",
        margin,
        head: [["Earnings", "Amount", "Deductions", "Amount"]],
        body,
        foot: [["Total Earnings", rupees(slip.totalEarnings), "Total Deductions", rupees(slip.totalDeductions)]],
        showFoot: "lastPage",
        styles: { fontSize: 9, lineColor: LINE, lineWidth: 0.5, textColor: SLATE, cellPadding: 6 },
        headStyles: { fillColor: INDIGO, textColor: 255, fontSize: 9 },
        footStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
        didParseCell: (d) => {
            if ((d.section === "head" || d.section === "foot") && (d.column.index === 1 || d.column.index === 3)) {
                d.cell.styles.halign = "right";
            }
        },
    });

    /* Net pay */
    y += 18;
    if (y + 80 > H - 60) {
        doc.addPage();
        y = 50;
    }
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(M, y, W - M * 2, 62, 8, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("NET PAY", M + 16, y + 20);
    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105);
    doc.text(rupees(slip.netSalary), M + 16, y + 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(doc.splitTextToSize(String(slip.netInWords || ""), 230), W - M - 16, y + 24, { align: "right" });

    /* Footer on every page */
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text("This is a computer-generated payslip and does not need a signature.", W / 2, H - 30, { align: "center" });
        doc.text(`Page ${i} of ${pages}`, W - M, H - 30, { align: "right" });
    }

    const who = String(emp.employeeId || emp.name || "employee").replace(/[^\w-]+/g, "_");
    doc.save(`Payslip_${who}_${slip.year}-${String(slip.month).padStart(2, "0")}.pdf`);
}