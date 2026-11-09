const Employee = require("../models/Employee");

const OBJECT_ID = /^[a-f\d]{24}$/i;
const idStr = (v) => String(v?._id || v || "").trim();

/* many manager ids -> Map(id -> name), in one query */
async function managerNameMap(values) {
    const ids = [...new Set(values.map(idStr).filter((v) => OBJECT_ID.test(v)))];
    if (!ids.length) return new Map();
    const rows = await Employee.find({ _id: { $in: ids } }).select("name").lean();
    return new Map(rows.map((r) => [String(r._id), r.name]));
}

/* the text to show: the manager's name. Old records saved the name as text, so that text is used as it is. */
const labelFor = (map, value) => {
    const raw = idStr(value);
    if (!raw) return "";
    return OBJECT_ID.test(raw) ? map.get(raw) || "" : raw; // a deleted manager gives "", never an id
};

const plain = (doc) => (doc && typeof doc.toJSON === "function" ? doc.toJSON() : { ...doc });

/* ONE manager value (an id or a name) -> the name. Use it when a controller builds its own response object. */
async function managerNameOf(value) {
    return labelFor(await managerNameMap([value]), value);
}

/*
  ONE employee (own profile, dashboard, ...).
  reportingManager becomes the NAME, so every screen that already prints it shows the name.
  The id is kept in reportingManagerId.
*/
async function attachManagerName(doc) {
    if (!doc) return doc;
    const out = plain(doc);

    // read the raw saved value: a document cannot hold an old text value inside an id field
    let raw = out.reportingManager;
    if (doc._id) {
        const row = await Employee.findById(doc._id).select("reportingManager").lean();
        if (row) raw = row.reportingManager;
    }

    const map = await managerNameMap([raw]);
    const rawId = idStr(raw);
    out.reportingManagerId = OBJECT_ID.test(rawId) ? rawId : "";
    out.reportingManagerName = labelFor(map, raw);
    out.reportingManager = out.reportingManagerName;
    return out;
}

/*
  MANY employees (lists).
  reportingManager keeps the id (forms and team screens need it), the name comes in reportingManagerName.
*/
async function attachManagerNames(docs) {
    const list = docs.map(plain);
    const map = await managerNameMap(list.map((d) => d.reportingManager));
    return list.map((d) => ({
        ...d,
        reportingManagerId: OBJECT_ID.test(idStr(d.reportingManager)) ? idStr(d.reportingManager) : "",
        reportingManagerName: labelFor(map, d.reportingManager),
    }));
}

module.exports = { attachManagerName, attachManagerNames, managerNameOf };








// const Employee = require("../models/Employee");

// const OBJECT_ID = /^[a-f\d]{24}$/i;
// const idStr = (v) => String(v?._id || v || "").trim();

// /* many manager ids -> Map(id -> name), in one query */
// async function managerNameMap(values) {
//     const ids = [...new Set(values.map(idStr).filter((v) => OBJECT_ID.test(v)))];
//     if (!ids.length) return new Map();
//     const rows = await Employee.find({ _id: { $in: ids } }).select("name").lean();
//     return new Map(rows.map((r) => [String(r._id), r.name]));
// };

// /* the text to show: the manager's name. Old records saved the name as text, so that text is used as it is. */
// const labelFor = (map, value) => {
//     const raw = idStr(value);
//     if (!raw) return "";
//     return OBJECT_ID.test(raw) ? map.get(raw) || "" : raw; // a deleted manager gives "", never an id
// };

// const plain = (doc) => (doc && typeof doc.toJSON === "function" ? doc.toJSON() : { ...doc });

// /*
//   ONE employee (own profile, dashboard, ...).
//   reportingManager becomes the NAME, so every screen that already prints it shows the name.
//   The id is kept in reportingManagerId.
// */
// async function attachManagerName(doc) {
//     if (!doc) return doc;
//     const out = plain(doc);

//     // read the raw saved value: a document cannot hold an old text value inside an id field
//     let raw = out.reportingManager;
//     if (doc._id) {
//         const row = await Employee.findById(doc._id).select("reportingManager").lean();
//         if (row) raw = row.reportingManager;
//     }

//     const map = await managerNameMap([raw]);
//     const rawId = idStr(raw);
//     out.reportingManagerId = OBJECT_ID.test(rawId) ? rawId : "";
//     out.reportingManagerName = labelFor(map, raw);
//     out.reportingManager = out.reportingManagerName;
//     return out;
// }

// /*
//   MANY employees (lists).
//   reportingManager keeps the id (forms and team screens need it), the name comes in reportingManagerName.
// */
// async function attachManagerNames(docs) {
//     const list = docs.map(plain);
//     const map = await managerNameMap(list.map((d) => d.reportingManager));
//     return list.map((d) => ({
//         ...d,
//         reportingManagerId: OBJECT_ID.test(idStr(d.reportingManager)) ? idStr(d.reportingManager) : "",
//         reportingManagerName: labelFor(map, d.reportingManager),
//     }));
// }

// module.exports = { attachManagerName, attachManagerNames };