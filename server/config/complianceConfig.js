const num = (v, d) => {
    const x = Number(v);
    return Number.isFinite(x) && v !== "" && v !== undefined ? x : d;
};
const flag = (v, d) => (v === undefined || v === "" ? d : !["false", "0", "no", "off"].includes(String(v).toLowerCase()));

/* Professional Tax slabs depend on the state. Example for .env:
   PT_SLABS=[{"upTo":10000,"amount":0},{"upTo":15000,"amount":150},{"upTo":null,"amount":200}] */
function readSlabs() {
    try {
        const list = JSON.parse(process.env.PT_SLABS || "[]");
        if (!Array.isArray(list)) return [];
        return list
            .filter((s) => Number.isFinite(Number(s.amount)))
            .map((s) => ({ upTo: s.upTo === null || s.upTo === undefined ? null : Number(s.upTo), amount: Number(s.amount) }))
            .sort((a, b) => (a.upTo === null ? Infinity : a.upTo) - (b.upTo === null ? Infinity : b.upTo));
    } catch {
        return [];
    }
}

/* Rates and limits. Please confirm them with your CA, because the law changes. */
module.exports = {
    PF: {
        enabled: flag(process.env.PF_ENABLED, true),
        employeeRate: 12,
        epsRate: 8.33,
        adminRate: 0.5,
        edliRate: 0.5,
        wageCeiling: num(process.env.PF_WAGE_CEILING, 15000),
        onActualWage: flag(process.env.PF_ON_ACTUAL_WAGE, false), // true = PF on the full basic, not only up to the ceiling
        dueDay: 15,
    },
    ESI: {
        enabled: flag(process.env.ESI_ENABLED, true),
        employeeRate: 0.75,
        employerRate: 3.25,
        wageCeiling: num(process.env.ESI_WAGE_CEILING, 21000),
        dueDay: 15,
    },
    TDS: { depositDay: 7 },
    PT: {
        enabled: flag(process.env.PT_ENABLED, false), // off, because many states have no PT
        slabs: readSlabs(),
        dueDay: num(process.env.PT_DUE_DAY, 15),
    },
};