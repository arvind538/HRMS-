"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
    Printer,
    Search,
    X,
    CheckCircle2,
    Loader2,
    Edit3,
    Upload,
    Camera,
    Save,
    FlipHorizontal,
    Download,
    Eye,
    Mail,
    Phone,
    IdCard,
} from "lucide-react";
import api from "@/lib/api";

const COMPANY_NAME = "FourPaysave";
const COMPANY_SUB = "HI Tech Solutions";
const COMPANY_LEGAL = "FOUR PAYSAVE HI TECH SOLUTIONS PVT LTD";
const COMPANY_WEB = "4PAYSAVE.COM";

const OCTAGON_CLIP =
    "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";

const isHexObjectId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str.trim());

/* ---------------------------------------------------
   ID Card Front Face Component
--------------------------------------------------- */
function IDCardFront({ id, employee, fullName, designation, token, qrCodeUrl }) {
    return (
        <div
            id={id}
            className="w-[310px] h-[480px] bg-white rounded-[26px] shadow-lg border border-slate-200/80 relative flex flex-col overflow-hidden select-none shrink-0"
        >
            {/* Top-right blue accent */}
            <div className="absolute top-0 right-0 w-[72%] h-[135px] pointer-events-none z-0">
                <svg
                    viewBox="0 0 220 135"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M40 0H220V72C188 102 140 96 100 72C68 52 36 62 14 46L40 0Z"
                        fill="#0B5FFF"
                    />
                    <path
                        d="M105 0H220V46C188 66 148 60 118 40L105 0Z"
                        fill="#3B82F6"
                        opacity="0.55"
                    />
                </svg>
            </div>

            {/* Header / Logo */}
            <div className="relative z-10 pt-5 px-5 flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white shadow-md border border-blue-100 flex items-center justify-center shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-xs">
                        P
                    </div>
                </div>
                <div className="leading-tight">
                    <p className="text-[13px] font-black text-blue-700 tracking-tight">
                        {COMPANY_NAME}
                    </p>
                    <p className="text-[8px] font-bold text-blue-500 uppercase tracking-wide -mt-0.5">
                        {COMPANY_SUB}
                    </p>
                </div>
            </div>

            {/* Profile Photo */}
            <div className="relative z-10 flex justify-center mt-5">
                <div
                    className="w-[130px] h-[130px] bg-[#111827] p-[3px]"
                    style={{ clipPath: OCTAGON_CLIP }}
                >
                    <div
                        className="w-full h-full bg-slate-100 overflow-hidden flex items-center justify-center"
                        style={{ clipPath: OCTAGON_CLIP }}
                    >
                        {employee?.avatar || employee?.photo ? (
                            <img
                                src={employee.avatar || employee.photo}
                                alt={fullName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-3xl font-black text-blue-600">
                                {fullName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Name & Designation Pill */}
            <div className="relative z-10 text-center px-4 mt-3">
                <h3 className="text-[16px] font-black text-blue-700 uppercase tracking-tight truncate">
                    {fullName}
                </h3>
                <div className="inline-block mt-2 px-4 py-1 bg-[#111827] rounded-md shadow-sm max-w-[240px]">
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-wider truncate block">
                        {designation}
                    </span>
                </div>
            </div>

            {/* Details (Fixed: Employee ID and No Hex) */}
            <div className="relative z-10 px-7 mt-5 space-y-2 text-[11.5px] font-bold text-slate-800">
                <div className="grid grid-cols-[55px_10px_1fr] items-center">
                    <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                        ID NO
                    </span>
                    <span>:</span>
                    <span className="font-black text-slate-900 tracking-wide uppercase">
                        {token}
                    </span>
                </div>
                <div className="grid grid-cols-[55px_10px_1fr] items-center">
                    <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                        EMAIL
                    </span>
                    <span>:</span>
                    <span className="truncate text-[10.5px] font-semibold text-slate-700">
                        {employee?.email || "staff@4paysave.com"}
                    </span>
                </div>
                <div className="grid grid-cols-[55px_10px_1fr] items-center">
                    <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                        PHONE
                    </span>
                    <span>:</span>
                    <span className="font-semibold text-slate-700">
                        {employee?.phone || "+91 00000 00000"}
                    </span>
                </div>
            </div>

            {/* Footer / QR Code */}
            <div className="relative z-10 mt-auto px-6 pb-6 pt-3 flex items-end justify-between">
                <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                    <img
                        src={qrCodeUrl}
                        alt="Verify QR"
                        className="w-full h-full object-contain"
                    />
                </div>
                <div className="text-right pb-1">
                    <p className="text-[13px] font-serif italic text-slate-400 leading-tight">
                        Together
                    </p>
                    <p className="text-[13px] font-serif italic text-slate-500 leading-tight -mt-1">
                        Forever
                    </p>
                </div>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none z-0">
                <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                >
                    <path d="M100 100V30C80 50 60 70 40 100H100Z" fill="#0B5FFF" />
                </svg>
            </div>
        </div>
    );
}

/* ---------------------------------------------------
   ID Card Back Face Component
--------------------------------------------------- */
function IDCardBack({ id }) {
    return (
        <div
            id={id}
            className="w-[310px] h-[480px] bg-white rounded-[26px] shadow-lg border border-slate-200 relative flex flex-col justify-between overflow-hidden p-6 text-slate-800 select-none shrink-0"
        >
            <div className="absolute top-0 right-0 w-40 h-32 pointer-events-none z-0 overflow-hidden">
                <svg
                    viewBox="0 0 160 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full object-cover"
                >
                    <path
                        d="M60 0H160V100C130 110 90 90 60 60V0Z"
                        fill="#0066FF"
                        opacity="0.8"
                    />
                </svg>
            </div>

            <div className="relative z-10 space-y-4 pt-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                    P
                </div>
                <h4 className="text-[13px] font-black uppercase tracking-wider text-slate-900 border-b pb-1">
                    Terms & Conditions
                </h4>
                <ul className="text-[11px] font-semibold space-y-2.5 text-slate-700 list-disc pl-4">
                    <li>This card remains the exclusive property of {COMPANY_LEGAL}.</li>
                    <li>This authorization badge is strictly non-transferable.</li>
                    <li>Must be visibly presented at all times on workplace premises.</li>
                    <li>In case of loss, please return to Human Resources immediately.</li>
                </ul>
            </div>

            <div className="relative z-10 space-y-3 pb-2 text-center">
                <div className="flex flex-col items-center">
                    <div className="w-36 border-b-2 border-slate-600 mb-1" />
                    <p className="text-[11px] font-extrabold text-slate-900 tracking-tight">
                        Authorized Signature
                    </p>
                </div>
                <div className="text-[10px] font-black text-blue-600 tracking-tight">
                    {COMPANY_NAME} {COMPANY_SUB}
                </div>
                <div className="text-[9.5px] font-extrabold text-slate-900 tracking-widest">
                    {COMPANY_WEB}
                </div>
            </div>
        </div>
    );
}

export default function EmployeeIDCardsPage() {
    const [employees, setEmployees] = useState([]);
    const [departmentsMap, setDepartmentsMap] = useState({});
    const [designationsMap, setDesignationsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const [editingEmp, setEditingEmp] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        designation: "",
        department: "",
        phone: "",
        email: "",
        dob: "",
        employeeId: "",
        avatar: "",
    });
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Helper to ensure Mongo ObjectId is never shown as Employee ID
    const sanitizeEmpId = (emp, index) => {
        const rawId = emp.employeeId || emp.empId || emp.code;
        if (rawId && !isHexObjectId(String(rawId))) {
            return String(rawId).toUpperCase();
        }
        return `EMP${String((index ?? 0) + 1).padStart(4, "0")}`;
    };

    const mergeWithLocalAvatars = (dataList) => {
        try {
            const storedAvatars = JSON.parse(
                localStorage.getItem("4ps_emp_avatars") || "{}"
            );
            return dataList.map((emp, index) => {
                const id = String(emp._id || emp.id || "");
                const cleanEmpId = sanitizeEmpId(emp, index);

                const updated = {
                    ...emp,
                    employeeId: cleanEmpId,
                };

                if (storedAvatars[id]) {
                    updated.avatar = storedAvatars[id];
                }
                return updated;
            });
        } catch {
            return dataList;
        }
    };

    const fetchLookupData = async () => {
        try {
            const [deptRes, desigRes] = await Promise.allSettled([
                api.get("/departments"),
                api.get("/designations"),
            ]);

            if (deptRes.status === "fulfilled") {
                const dData = Array.isArray(deptRes.value?.data)
                    ? deptRes.value.data
                    : deptRes.value?.data?.departments || [];
                const dMap = {};
                dData.forEach((item) => {
                    const id = String(item._id || item.id || "");
                    if (id) dMap[id] = item.name || item.title || item.departmentName;
                });
                setDepartmentsMap(dMap);
            }

            if (desigRes.status === "fulfilled") {
                const desData = Array.isArray(desigRes.value?.data)
                    ? desigRes.value.data
                    : desigRes.value?.data?.designations || [];
                const desMap = {};
                desData.forEach((item) => {
                    const id = String(item._id || item.id || "");
                    if (id) desMap[id] = item.name || item.title || item.designationName;
                });
                setDesignationsMap(desMap);
            }
        } catch (e) {
            console.warn("Lookup metadata fetch skipped:", e);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            await fetchLookupData();
            const res = await api.get("/employees");
            const rawData = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res?.data?.employees)
                    ? res.data.employees
                    : [];
            const finalData = mergeWithLocalAvatars(rawData);
            setEmployees(finalData);
        } catch (err) {
            console.error("Failed to load employees:", err);
            try {
                const storedList = JSON.parse(
                    localStorage.getItem("4ps_emp_data") || "[]"
                );
                if (storedList.length > 0) {
                    setEmployees(mergeWithLocalAvatars(storedList));
                }
            } catch { }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const getFullName = (emp) =>
        emp?.name ||
        `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() ||
        "Personnel Name";

    // Clean Department Name Resolution
    const getDepartment = (emp) => {
        if (!emp) return "General";
        const depVal = emp.department;

        if (typeof depVal === "object" && depVal !== null) {
            return depVal.name || depVal.title || depVal.departmentName || "General";
        }

        if (typeof depVal === "string") {
            const trimmed = depVal.trim();
            // Check if it matches an id from lookup map
            if (departmentsMap[trimmed]) {
                return departmentsMap[trimmed];
            }
            // If it's a 24-char ObjectId that wasn't found in map, don't show hex
            if (isHexObjectId(trimmed)) {
                return "IT & Tech";
            }
            return trimmed || "General";
        }

        return "General";
    };

    // Clean Designation Name Resolution
    const getDesignation = (emp) => {
        if (!emp) return "Executive";
        const desVal = emp.designation;

        if (typeof desVal === "object" && desVal !== null) {
            return desVal.name || desVal.title || desVal.designationName || "Executive";
        }

        if (typeof desVal === "string") {
            const trimmed = desVal.trim();
            // Check if it matches an id from lookup map
            if (designationsMap[trimmed]) {
                return designationsMap[trimmed];
            }
            // If it's a 24-char ObjectId that wasn't found in map, don't show hex
            if (isHexObjectId(trimmed)) {
                return emp.role || "Executive";
            }
            return trimmed || emp.role || "Executive";
        }

        return emp.role || "Executive";
    };

    const getToken = (emp, index) => {
        if (emp?.employeeId && !isHexObjectId(String(emp.employeeId))) {
            return String(emp.employeeId).toUpperCase();
        }
        const idx = typeof index === "number" ? index : employees.indexOf(emp);
        return `EMP${String((idx >= 0 ? idx : 0) + 1).padStart(4, "0")}`;
    };

    const filteredEmployees = useMemo(() => {
        return employees.filter((emp, index) => {
            const query = search.toLowerCase();
            const fullName = getFullName(emp).toLowerCase();
            const designation = getDesignation(emp).toLowerCase();
            const dept = getDepartment(emp).toLowerCase();
            const empId = getToken(emp, index).toLowerCase();

            return (
                fullName.includes(query) ||
                designation.includes(query) ||
                dept.includes(query) ||
                empId.includes(query)
            );
        });
    }, [employees, search, departmentsMap, designationsMap]);

    const getQrUrl = (token) => {
        const qrData = encodeURIComponent(`FPS-VERIFIED:${token || "EMPLOYEE"}`);
        return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;
    };

    const triggerSinglePrint = (emp) => {
        setSelectedEmp(emp);
        setIsFlipped(false);
        setTimeout(() => {
            window.print();
        }, 250);
    };

    const handleDownloadCardImage = async (cardId, fileName) => {
        const cardElement = document.getElementById(cardId);
        if (!cardElement) return;

        setDownloading(true);
        try {
            let canvas = null;
            try {
                const html2canvasModule =
                    (await import("html2canvas-pro").catch(() => null)) ||
                    (await import("html2canvas").catch(() => null));

                if (html2canvasModule) {
                    const html2canvas = html2canvasModule.default || html2canvasModule;
                    canvas = await html2canvas(cardElement, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#ffffff",
                        logging: false,
                    });
                }
            } catch (e) {
                console.warn("Direct html2canvas fallback:", e);
            }

            if (!canvas) {
                const rect = cardElement.getBoundingClientRect();
                const width = rect.width || 310;
                const height = rect.height || 480;

                const clone = cardElement.cloneNode(true);
                clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

                const dataUrl =
                    "data:image/svg+xml;charset=utf-8," +
                    encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${width * 3}" height="${height * 3}" viewBox="0 0 ${width} ${height}">
              <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif;">
                  ${new XMLSerializer().serializeToString(clone)}
                </div>
              </foreignObject>
            </svg>
          `);

                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = dataUrl;
                });

                canvas = document.createElement("canvas");
                canvas.width = width * 3;
                canvas.height = height * 3;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            }

            const imgData = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = imgData;
            downloadLink.download = `${fileName}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        } catch (err) {
            console.error("Card download error, printing instead:", err);
            window.print();
        } finally {
            setDownloading(false);
        }
    };

    const handleOpenEdit = (emp, e) => {
        e?.stopPropagation();
        setEditingEmp(emp);
        const token = getToken(emp, employees.indexOf(emp));
        setEditFormData({
            name: getFullName(emp),
            designation: getDesignation(emp),
            department: getDepartment(emp),
            phone: emp.phone || "",
            email: emp.email || "",
            dob: emp.dob ? new Date(emp.dob).toISOString().split("T")[0] : "",
            employeeId: token,
            avatar: emp.avatar || emp.photo || "",
        });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditFormData((prev) => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        if (!editingEmp) return;
        setSaving(true);
        const empId = String(editingEmp._id || editingEmp.id);

        try {
            const payload = {
                name: editFormData.name,
                designation: editFormData.designation,
                department: editFormData.department,
                phone: editFormData.phone,
                email: editFormData.email,
                dob: editFormData.dob,
                employeeId: editFormData.employeeId,
                avatar: editFormData.avatar,
            };

            try {
                await api.put(`/employees/${empId}`, payload);
            } catch (err) {
                console.warn("Backend API sync skipped, persisting locally:", err);
            }

            try {
                const storedAvatars = JSON.parse(
                    localStorage.getItem("4ps_emp_avatars") || "{}"
                );
                if (payload.avatar) {
                    storedAvatars[empId] = payload.avatar;
                    localStorage.setItem(
                        "4ps_emp_avatars",
                        JSON.stringify(storedAvatars)
                    );
                }
            } catch (storageErr) {
                console.error("Local storage error:", storageErr);
            }

            setEmployees((prev) =>
                prev.map((item) =>
                    String(item._id || item.id) === empId
                        ? { ...item, ...payload }
                        : item
                )
            );

            if (selectedEmp && String(selectedEmp._id || selectedEmp.id) === empId) {
                setSelectedEmp((prev) => ({ ...prev, ...payload }));
            }

            setEditingEmp(null);
        } catch (err) {
            console.error("Failed to update employee card:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
                <p className="text-xs sm:text-sm font-semibold tracking-wide">
                    Loading Official ID Cards...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5 antialiased font-sans text-slate-900 pb-10">
            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-card-front,
          #printable-card-front *,
          #printable-card-back,
          #printable-card-back * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-card-front,
          #printable-card-back {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

            {/* Top Banner Card */}
            <div className="no-print bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Employee Directory & Badges
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            CR80 Standard Spec
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {COMPANY_LEGAL}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Manage employee badges, preview ID cards, and export high-resolution prints.
                    </p>
                </div>

                <div className="relative w-full md:w-80 shrink-0">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, ID, role, or dept..."
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all shadow-2xs"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ---------------------------------------------------
          PROPER DESKTOP & MOBILE RESPONSIVE TABLE
      --------------------------------------------------- */}
            <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                {/* Desktop View with proper overflow-x and fixed min-width */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="py-3.5 px-6 min-w-[240px]">Employee</th>
                                <th className="py-3.5 px-5 w-36">Employee ID</th>
                                <th className="py-3.5 px-5 min-w-[180px]">Designation</th>
                                <th className="py-3.5 px-5 min-w-[160px]">Department</th>
                                <th className="py-3.5 px-5 min-w-[150px]">Contact</th>
                                <th className="py-3.5 px-6 text-right w-44">Badge Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
                            {filteredEmployees.map((emp, index) => {
                                const fullName = getFullName(emp);
                                const designation = getDesignation(emp);
                                const department = getDepartment(emp);
                                const token = getToken(emp, index);

                                return (
                                    <tr
                                        key={emp._id || emp.id || index}
                                        className="hover:bg-slate-50/70 transition-colors group"
                                    >
                                        {/* Employee Name + Avatar */}
                                        <td className="py-3.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {emp.avatar || emp.photo ? (
                                                        <img
                                                            src={emp.avatar || emp.photo}
                                                            alt={fullName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-blue-600 text-sm">
                                                            {fullName.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                                        {fullName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {emp.email || "No email"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Employee ID */}
                                        <td className="py-3.5 px-5">
                                            <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-200/60 uppercase">
                                                {token}
                                            </span>
                                        </td>

                                        {/* Designation (Fixed: Clean title, no Mongo ID) */}
                                        <td className="py-3.5 px-5 font-semibold text-slate-800">
                                            {designation}
                                        </td>

                                        {/* Department (Fixed: Proper Department Name) */}
                                        <td className="py-3.5 px-5">
                                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 font-medium text-xs rounded-md border border-slate-200">
                                                {department}
                                            </span>
                                        </td>

                                        {/* Contact Phone */}
                                        <td className="py-3.5 px-5 text-slate-600 font-mono text-xs">
                                            {emp.phone || "—"}
                                        </td>

                                        {/* Action Buttons */}
                                        <td className="py-3.5 px-6 text-right">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEmp(emp);
                                                        setIsFlipped(false);
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-blue-200/60 hover:border-transparent"
                                                    title="View & Print ID Card"
                                                >
                                                    <Eye size={14} />
                                                    <span>View Card</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => handleOpenEdit(emp, e)}
                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                                                    title="Edit Employee"
                                                >
                                                    <Edit3 size={14} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => triggerSinglePrint(emp)}
                                                    className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl transition-colors cursor-pointer"
                                                    title="Direct Print"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Card View */}
                <div className="block md:hidden divide-y divide-slate-100">
                    {filteredEmployees.map((emp, index) => {
                        const fullName = getFullName(emp);
                        const designation = getDesignation(emp);
                        const department = getDepartment(emp);
                        const token = getToken(emp, index);

                        return (
                            <div
                                key={emp._id || emp.id || index}
                                className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {emp.avatar || emp.photo ? (
                                                <img
                                                    src={emp.avatar || emp.photo}
                                                    alt={fullName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="font-bold text-blue-600 text-base">
                                                    {fullName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">
                                                {fullName}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-semibold">
                                                {designation}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-md border border-blue-200/60 uppercase">
                                        {token}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="text-slate-400 font-medium">Department:</span>
                                    <span className="font-semibold text-slate-800">
                                        {department}
                                    </span>
                                </div>

                                <div className="text-xs text-slate-600 space-y-1 pl-1">
                                    <div className="flex items-center gap-2">
                                        <Mail size={12} className="text-slate-400" />
                                        <span className="truncate">{emp.email || "No email"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={12} className="text-slate-400" />
                                        <span>{emp.phone || "No phone"}</span>
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedEmp(emp);
                                            setIsFlipped(false);
                                        }}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <IdCard size={14} />
                                        <span>Show ID Card</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => handleOpenEdit(emp, e)}
                                        className="py-2 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <Edit3 size={13} />
                                        <span>Edit</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => triggerSinglePrint(emp)}
                                        className="p-2 bg-slate-100 text-slate-700 rounded-xl cursor-pointer"
                                    >
                                        <Printer size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredEmployees.length === 0 && (
                    <div className="p-12 text-center text-slate-500 text-xs font-semibold">
                        No personnel records found matching &ldquo;{search}&rdquo;.
                    </div>
                )}
            </div>

            {/* ---------------------------------------------------
          ID CARD POPUP PREVIEW / EXPORT MODAL
      --------------------------------------------------- */}
            {selectedEmp &&
                (() => {
                    const fullName = getFullName(selectedEmp);
                    const designation = getDesignation(selectedEmp);
                    const token = getToken(
                        selectedEmp,
                        employees.indexOf(selectedEmp)
                    );
                    const qrCodeUrl = getQrUrl(token);

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row max-h-[95vh] overflow-y-auto md:overflow-visible">
                                <button
                                    type="button"
                                    onClick={() => setSelectedEmp(null)}
                                    className="no-print absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors z-30 cursor-pointer"
                                >
                                    <X size={15} />
                                </button>

                                {/* Printable Target Container */}
                                <div className="p-4 sm:p-6 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col items-center justify-center">
                                    {!isFlipped ? (
                                        <IDCardFront
                                            id="printable-card-front"
                                            employee={selectedEmp}
                                            fullName={fullName}
                                            designation={designation}
                                            token={token}
                                            qrCodeUrl={qrCodeUrl}
                                        />
                                    ) : (
                                        <IDCardBack id="printable-card-back" />
                                    )}
                                </div>

                                {/* Right Action Side */}
                                <div className="no-print p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-3">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                            <CheckCircle2 size={13} />
                                            <span>Ready for Print / Export</span>
                                        </div>

                                        <div>
                                            <h3 className="text-base sm:text-lg font-black text-slate-900">
                                                {fullName}
                                            </h3>
                                            <p className="text-xs font-bold text-blue-600 font-mono">
                                                {token} • {designation}
                                            </p>
                                        </div>

                                        <p className="text-xs text-slate-500 font-medium">
                                            Toggle badge orientation, export as high-resolution PNG image, or send directly to the printer.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => setIsFlipped(!isFlipped)}
                                            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <FlipHorizontal size={14} />
                                            <span>
                                                Flip to {isFlipped ? "Front Side" : "Back Side (Terms)"}
                                            </span>
                                        </button>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => triggerSinglePrint(selectedEmp)}
                                                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                            >
                                                <Printer size={13} />
                                                <span>Print Badge</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(selectedEmp)}
                                                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={downloading}
                                            onClick={() =>
                                                handleDownloadCardImage(
                                                    !isFlipped
                                                        ? "printable-card-front"
                                                        : "printable-card-back",
                                                    `${fullName.replace(/\s+/g, "_")}_ID_Card`
                                                )
                                            }
                                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                                        >
                                            {downloading ? (
                                                <Loader2 size={13} className="animate-spin" />
                                            ) : (
                                                <Download size={13} />
                                            )}
                                            <span>
                                                {downloading
                                                    ? "Generating Badge..."
                                                    : "Download Badge Image"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

            {/* ---------------------------------------------------
          EDIT MODAL
      --------------------------------------------------- */}
            {editingEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    Edit Badge Information
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Update employee profile photo, ID number, and corporate role details.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingEmp(null)}
                                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSaveEmployee}
                            className="p-4 sm:p-5 space-y-3.5 overflow-y-auto"
                        >
                            <div className="flex flex-col items-center justify-center gap-1.5 pb-1">
                                <div className="relative w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 p-1 flex items-center justify-center overflow-hidden group shadow-inner">
                                    {editFormData.avatar ? (
                                        <img
                                            src={editFormData.avatar}
                                            alt="Preview"
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    ) : (
                                        <Camera className="w-8 h-8 text-slate-400" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-opacity cursor-pointer rounded-lg"
                                    >
                                        <Upload size={14} />
                                        <span>Upload Photo</span>
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                                >
                                    Upload Square Headshot
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className="font-bold text-slate-700 mb-1 block">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.name}
                                        onChange={(e) =>
                                            setEditFormData({ ...editFormData, name: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 mb-1 block">
                                        ID Number (e.g. EMP0001)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.employeeId}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                employeeId: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-600 outline-none font-mono font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 mb-1 block">
                                        Position Title (Designation)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.designation}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                designation: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 mb-1 block">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.department}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                department: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 mb-1 block">
                                        Contact Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.phone}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                phone: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 mb-1 block">
                                        Official Email
                                    </label>
                                    <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                email: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setEditingEmp(null)}
                                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Save size={13} />
                                    )}
                                    <span>{saving ? "Updating..." : "Save Changes"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}