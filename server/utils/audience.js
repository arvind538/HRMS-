const User = require("../models/User");
const Employee = require("../models/Employee");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ACTIVE = { employeeStatus: { $nin: ["Inactive", "Exited", "Exit"] } };
const ROLE_NAMES = { admin: "Admins", hr: "HR", manager: "Managers", employee: "Employees" };
const MAX_RECIPIENTS = { email: 300, sms: 200 };
const MAX_CUSTOM = 50;

const normalizePhone = (value) => {
    const compact = String(value || "").replace(/[^\d+]/g, "");
    if (/^\+\d{8,15}$/.test(compact)) return compact;
    const d = compact.replace(/\D/g, "");
    if (/^[6-9]\d{9}$/.test(d)) return `+91${d}`;
    if (/^91[6-9]\d{9}$/.test(d)) return `+${d}`;
    if (/^0[6-9]\d{9}$/.test(d)) return `+91${d.slice(1)}`;
    return "";
};

const addressOf = (person, channel) => {
    if (channel === "email") {
        const mail = String(person.email || "").trim().toLowerCase();
        return EMAIL_RE.test(mail) ? mail : "";
    }
    return normalizePhone(person.phone);
};

const parseCustom = (text, channel) => {
    const items = String(text || "").split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const valid = [];
    const invalid = [];
    items.forEach((item) => {
        const address = addressOf(channel === "email" ? { email: item } : { phone: item }, channel);
        if (address) valid.push({ name: "", address });
        else invalid.push(item);
    });
    return { valid, invalid };
};

/*
 * input: { audience: "all" | "department" | "role" | "custom", department, departmentName, role, custom }
 * returns { recipients: [{ name, address }], skipped, label } or { error }
 */
async function resolveAudience(input, channel) {
    const audience = String(input.audience || "");
    let people = [];
    let label = "";

    if (audience === "custom") {
        const { valid, invalid } = parseCustom(input.custom, channel);
        if (invalid.length) {
            const what = channel === "email" ? "email addresses" : "phone numbers";
            return { error: `These ${what} are not valid: ${invalid.slice(0, 5).join(", ")}` };
        }
        if (valid.length > MAX_CUSTOM) return { error: `You can enter at most ${MAX_CUSTOM} addresses. Use a group for more.` };
        people = valid.map((v) => (channel === "email" ? { name: "", email: v.address } : { name: "", phone: v.address }));
        label = "Specific people";
    } else if (audience === "all") {
        people = await Employee.find(ACTIVE).select("name email phone").lean();
        label = "All employees";
    } else if (audience === "department") {
        const id = String(input.department || "");
        const name = String(input.departmentName || "");
        if (!id && !name) return { error: "Please select a department." };

        // Departments are stored by id or by name depending on the record, so both are tried
        for (const values of [[id, name], [id], [name]]) {
            try {
                people = await Employee.find({ ...ACTIVE, department: { $in: values.filter(Boolean) } })
                    .select("name email phone")
                    .lean();
                break;
            } catch {
                /* a value did not fit the field type, try the next one */
            }
        }
        label = `Department: ${name || "Selected"}`;
    } else if (audience === "role") {
        const role = String(input.role || "").toLowerCase();
        if (!ROLE_NAMES[role]) return { error: "Please select a role." };
        const users = await User.find({ role, isActive: { $ne: false } })
            .select("name email employee")
            .populate("employee", "name email phone")
            .lean();
        people = users.map((u) => ({
            name: u.employee?.name || u.name,
            email: u.employee?.email || u.email,
            phone: u.employee?.phone,
        }));
        label = `Role: ${ROLE_NAMES[role]}`;
    } else {
        return { error: "Please choose who should receive this." };
    }

    const seen = new Set();
    const recipients = [];
    let skipped = 0;
    people.forEach((p) => {
        const address = addressOf(p, channel);
        if (!address) {
            skipped += 1;
            return;
        }
        if (seen.has(address)) return;
        seen.add(address);
        recipients.push({ name: String(p.name || ""), address });
    });

    if (recipients.length > MAX_RECIPIENTS[channel]) {
        return { error: `A single campaign can reach at most ${MAX_RECIPIENTS[channel]} people. Send it by department or role instead.` };
    }
    return { recipients, skipped, label };
}

module.exports = { resolveAudience, normalizePhone, MAX_RECIPIENTS };