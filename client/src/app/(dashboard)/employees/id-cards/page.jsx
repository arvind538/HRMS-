"use client";

import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import api from "@/lib/api";

const COMPANY_NAME = "FOUR PAYSAVE";
const COMPANY_SUB = "HI TECH SOLUTIONS PVT LTD";
const COMPANY_WEB = "4PAYSAVE.COM";

export default function EmployeeIDCardsPage() {
    const [employees, setEmployees] = useState([]);
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

    const mergeWithLocalAvatars = (dataList) => {
        try {
            const storedAvatars = JSON.parse(
                localStorage.getItem("4ps_emp_avatars") || "{}"
            );
            return dataList.map((emp, index) => {
                const id = String(emp._id || emp.id || "");
                if (!emp.employeeId) {
                    emp.employeeId = `FPS${String(index + 1).padStart(4, "0")}`;
                }
                if (storedAvatars[id]) {
                    return { ...emp, avatar: storedAvatars[id] };
                }
                return emp;
            });
        } catch {
            return dataList;
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await api.get("/employees");
            const rawData = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res?.data?.employees)
                    ? res.data.employees
                    : [];
            const finalData = mergeWithLocalAvatars(rawData);
            setEmployees(finalData);
        } catch (err) {
            console.error("Failed to load employee cards:", err);
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

    const filteredEmployees = employees.filter((emp) => {
        const query = search.toLowerCase();
        const fullName = String(
            emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`
        ).toLowerCase();
        const designation = String(
            (typeof emp.designation === "object"
                ? emp.designation?.name
                : emp.designation) ||
            emp.role ||
            ""
        ).toLowerCase();
        const dept = String(
            (typeof emp.department === "object"
                ? emp.department?.name
                : emp.department) || ""
        ).toLowerCase();
        const empId = String(emp.employeeId || emp._id || "").toLowerCase();

        return (
            fullName.includes(query) ||
            designation.includes(query) ||
            dept.includes(query) ||
            empId.includes(query)
        );
    });

    const triggerSinglePrint = (emp) => {
        setSelectedEmp(emp);
        setIsFlipped(false);
        setTimeout(() => {
            window.print();
        }, 200);
    };

    // High-reliability HTML canvas rasterizer
    const handleDownloadCardImage = async (cardId, fileName) => {
        const cardElement = document.getElementById(cardId);
        if (!cardElement) return;

        setDownloading(true);
        try {
            // 1. Try html2canvas if package exists
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
                console.warn("Direct html2canvas failed, utilizing native SVG pipeline:", e);
            }

            // 2. High-precision SVG foreignObject fallback
            if (!canvas) {
                const rect = cardElement.getBoundingClientRect();
                const width = rect.width || 310;
                const height = rect.height || 480;

                const clone = cardElement.cloneNode(true);
                clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

                // Inline computed fonts and essential colors
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
            console.error("Card download error, opening print fallback:", err);
            window.print();
        } finally {
            setDownloading(false);
        }
    };

    const handleOpenEdit = (emp, e) => {
        e?.stopPropagation();
        setEditingEmp(emp);
        const token =
            emp.employeeId ||
            `FPS${String(employees.indexOf(emp) + 1).padStart(4, "0")}`;
        setEditFormData({
            name:
                emp.name ||
                `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                "",
            designation:
                (typeof emp.designation === "object"
                    ? emp.designation?.name
                    : emp.designation) ||
                emp.role ||
                "",
            department:
                (typeof emp.department === "object"
                    ? emp.department?.name
                    : emp.department) || "",
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
                console.error("Local storage sync error:", storageErr);
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
        <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-card-front,
          #printable-card-front *,
          #printable-card-back,
          #printable-card-back * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-card-front {
            position: fixed;
            left: 50%;
            top: 45%;
            transform: translate(-50%, -50%);
            margin: 0;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

            {/* Control Banner */}
            <div className="no-print bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Badge Studio
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            CR80 Standard Spec
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {COMPANY_NAME} {COMPANY_SUB}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Generate and export official employee ID badges with verified QR routing and digital photo profiles.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, role, or ID..."
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all shadow-2xs"
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

            {/* ID Cards Roster */}
            <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
                {filteredEmployees.map((emp, index) => {
                    const empId = emp._id || emp.id;
                    const fullName =
                        emp.name ||
                        `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                        "Personnel Name";
                    const designation =
                        (typeof emp.designation === "object"
                            ? emp.designation?.name
                            : emp.designation) ||
                        emp.role ||
                        "Executive";
                    const token =
                        emp.employeeId ||
                        `FPS${String(index + 1).padStart(4, "0")}`;

                    const qrData = encodeURIComponent("Hi Tech Solution");
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

                    return (
                        <div
                            key={empId}
                            className="flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 duration-200 w-full max-w-[310px]"
                        >
                            <div
                                onClick={() => {
                                    setSelectedEmp(emp);
                                    setIsFlipped(false);
                                }}
                                className="w-[310px] h-[480px] bg-white rounded-[24px] shadow-lg hover:shadow-2xl border border-slate-200/90 relative flex flex-col justify-between overflow-hidden cursor-pointer select-none"
                            >
                                <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden pointer-events-none z-0">
                                    <svg
                                        viewBox="0 0 310 160"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-full h-full object-cover"
                                    >
                                        <path
                                            d="M120 0H310V110C270 140 200 135 155 110C100 80 40 110 0 85V0H120Z"
                                            fill="#0066FF"
                                        />
                                        <path
                                            d="M160 0H310V85C270 110 210 105 160 85V0Z"
                                            fill="#0044CC"
                                            opacity="0.7"
                                        />
                                    </svg>
                                </div>

                                <div className="relative z-10 pt-4 px-5 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-white shadow-md flex items-center justify-center p-1 border border-sky-200">
                                        <div className="w-full h-full rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">
                                            P
                                        </div>
                                    </div>
                                    <div className="text-left leading-none">
                                        <h2 className="text-[12px] font-black tracking-wider text-white uppercase">
                                            {COMPANY_NAME}
                                        </h2>
                                        <p className="text-[6.5px] font-bold text-sky-100 uppercase tracking-tight mt-0.5">
                                            {COMPANY_SUB}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative z-10 flex flex-col items-center mt-3 mb-1">
                                    <div className="w-[125px] h-[125px] p-1.5 bg-white rounded-2xl shadow-md border-2 border-[#1E293B]">
                                        <div className="w-full h-full rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                                            {emp.avatar || emp.photo ? (
                                                <img
                                                    src={emp.avatar || emp.photo}
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

                                <div className="relative z-10 text-center px-4 mt-0.5">
                                    <h3 className="text-[15px] font-black text-[#0066FF] uppercase tracking-tight truncate">
                                        {fullName}
                                    </h3>
                                    <div className="inline-block mt-1 px-3 py-0.5 bg-[#1E293B] rounded-md shadow-xs">
                                        <span className="text-[9.5px] font-extrabold text-white uppercase tracking-wider">
                                            {designation}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative z-10 px-6 space-y-1.5 text-[11px] font-bold text-[#1E293B]">
                                    <div className="grid grid-cols-[55px_10px_1fr] items-center">
                                        <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                                            ID No
                                        </span>
                                        <span>:</span>
                                        <span className="font-black text-slate-900 tracking-wide">
                                            {token}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[55px_10px_1fr] items-center">
                                        <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                                            Email
                                        </span>
                                        <span>:</span>
                                        <span className="truncate text-[10.5px] font-semibold text-slate-700">
                                            {emp.email || "staff@4paysave.com"}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[55px_10px_1fr] items-center">
                                        <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                                            Phone
                                        </span>
                                        <span>:</span>
                                        <span className="font-semibold text-slate-700">
                                            {emp.phone || "+91 00000 00000"}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative w-full h-20 overflow-hidden mt-1 flex items-end justify-between px-5 pb-2">
                                    <div className="absolute inset-0 pointer-events-none z-0">
                                        <svg
                                            viewBox="0 0 310 80"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="w-full h-full object-cover"
                                        >
                                            <path
                                                d="M0 40C80 60 200 10 310 20V80H0V40Z"
                                                fill="#0066FF"
                                                opacity="0.15"
                                            />
                                        </svg>
                                    </div>
                                    <div className="relative z-10 w-14 h-14 bg-white p-1 rounded-lg border border-slate-200 shadow-xs flex items-center justify-center">
                                        <img
                                            src={qrCodeUrl}
                                            alt="Verify QR"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="relative z-10 text-right pb-1">
                                        <p className="text-[9px] font-extrabold text-slate-400 italic font-serif">
                                            Together
                                        </p>
                                        <p className="text-[11px] font-bold text-slate-600 italic font-serif -mt-1">
                                            Forever
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full flex items-center justify-between gap-2 px-1">
                                <button
                                    type="button"
                                    onClick={(e) => handleOpenEdit(emp, e)}
                                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Edit3 size={13} />
                                    <span>Edit</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedEmp(emp);
                                        setIsFlipped(false);
                                    }}
                                    className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                >
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerSinglePrint(emp)}
                                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Printer size={13} />
                                    <span>Print</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredEmployees.length === 0 && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 p-12 sm:p-16 text-center text-slate-500 text-xs font-semibold">
                    No personnel records found matching &ldquo;{search}&rdquo;.
                </div>
            )}

            {/* Edit Modal */}
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
                                        ID Number (e.g. FPS0001)
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
                                        Position Title
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

            {/* Preview and Export Modal */}
            {selectedEmp &&
                (() => {
                    const fullName = selectedEmp.name || "Personnel Name";
                    const designation =
                        (typeof selectedEmp.designation === "object"
                            ? selectedEmp.designation?.name
                            : selectedEmp.designation) ||
                        selectedEmp.role ||
                        "Executive";
                    const token =
                        selectedEmp.employeeId ||
                        `FPS${String(employees.indexOf(selectedEmp) + 1).padStart(4, "0")}`;

                    const qrData = encodeURIComponent("Hi Tech Solution");
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row max-h-[95vh] overflow-y-auto md:overflow-visible">
                                <button
                                    type="button"
                                    onClick={() => setSelectedEmp(null)}
                                    className="no-print absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors z-30 cursor-pointer"
                                >
                                    <X size={15} />
                                </button>

                                {/* Printable Target Container */}
                                <div className="p-4 sm:p-5 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col items-center justify-center">
                                    {!isFlipped ? (
                                        /* Front Card View */
                                        <div
                                            id="printable-card-front"
                                            className="w-[310px] h-[480px] bg-white rounded-[24px] shadow-lg border border-slate-200 relative flex flex-col justify-between overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden pointer-events-none z-0">
                                                <svg
                                                    viewBox="0 0 310 160"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-full h-full object-cover"
                                                >
                                                    <path
                                                        d="M120 0H310V110C270 140 200 135 155 110C100 80 40 110 0 85V0H120Z"
                                                        fill="#0066FF"
                                                    />
                                                    <path
                                                        d="M160 0H310V85C270 110 210 105 160 85V0Z"
                                                        fill="#0044CC"
                                                        opacity="0.7"
                                                    />
                                                </svg>
                                            </div>

                                            <div className="relative z-10 pt-4 px-5 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-white shadow-md flex items-center justify-center p-1 border border-sky-200">
                                                    <div className="w-full h-full rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">
                                                        P
                                                    </div>
                                                </div>
                                                <div className="text-left leading-none">
                                                    <h2 className="text-[12px] font-black tracking-wider text-white uppercase">
                                                        {COMPANY_NAME}
                                                    </h2>
                                                    <p className="text-[6.5px] font-bold text-sky-100 uppercase tracking-tight mt-0.5">
                                                        {COMPANY_SUB}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative z-10 flex flex-col items-center mt-3 mb-1">
                                                <div className="w-[125px] h-[125px] p-1.5 bg-white rounded-2xl shadow-md border-2 border-[#1E293B]">
                                                    <div className="w-full h-full rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                                                        {selectedEmp.avatar || selectedEmp.photo ? (
                                                            <img
                                                                src={selectedEmp.avatar || selectedEmp.photo}
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

                                            <div className="relative z-10 text-center px-4 mt-0.5">
                                                <h3 className="text-[15px] font-black text-[#0066FF] uppercase tracking-tight truncate">
                                                    {fullName}
                                                </h3>
                                                <div className="inline-block mt-1 px-3 py-0.5 bg-[#1E293B] rounded-md shadow-xs">
                                                    <span className="text-[9.5px] font-extrabold text-white uppercase tracking-wider">
                                                        {designation}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="relative z-10 px-6 space-y-1.5 text-[11px] font-bold text-[#1E293B]">
                                                <div className="grid grid-cols-[55px_10px_1fr] items-center">
                                                    <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                                                        ID No
                                                    </span>
                                                    <span>:</span>
                                                    <span className="font-black text-slate-900 tracking-wide">
                                                        {token}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-[55px_10px_1fr] items-center">
                                                    <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                                                        Email
                                                    </span>
                                                    <span>:</span>
                                                    <span className="truncate text-[10.5px] font-semibold text-slate-700">
                                                        {selectedEmp.email || "staff@4paysave.com"}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-[55px_10px_1fr] items-center">
                                                    <span className="text-slate-500 uppercase font-extrabold text-[10px]">
                                                        Phone
                                                    </span>
                                                    <span>:</span>
                                                    <span className="font-semibold text-slate-700">
                                                        {selectedEmp.phone || "+91 00000 00000"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="relative w-full h-20 overflow-hidden mt-1 flex items-end justify-between px-5 pb-2">
                                                <div className="absolute inset-0 pointer-events-none z-0">
                                                    <svg
                                                        viewBox="0 0 310 80"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-full h-full object-cover"
                                                    >
                                                        <path
                                                            d="M0 40C80 60 200 10 310 20V80H0V40Z"
                                                            fill="#0066FF"
                                                            opacity="0.15"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="relative z-10 w-14 h-14 bg-white p-1 rounded-lg border border-slate-200 shadow-xs flex items-center justify-center">
                                                    <img
                                                        src={qrCodeUrl}
                                                        alt="Verify QR"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="relative z-10 text-right pb-1">
                                                    <p className="text-[9px] font-extrabold text-slate-400 italic font-serif">
                                                        Together
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-600 italic font-serif -mt-1">
                                                        Forever
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Back Card View */
                                        <div
                                            id="printable-card-back"
                                            className="w-[310px] h-[480px] bg-white rounded-[24px] shadow-lg border border-slate-200 relative flex flex-col justify-between overflow-hidden p-6 text-slate-800"
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
                                                    <li>
                                                        This card remains the exclusive property of {COMPANY_NAME}{" "}
                                                        {COMPANY_SUB}.
                                                    </li>
                                                    <li>This authorization badge is strictly non-transferable.</li>
                                                    <li>
                                                        Must be visibly presented at all times on workplace premises.
                                                    </li>
                                                    <li>
                                                        In case of loss, please return to Human Resources immediately.
                                                    </li>
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
                                    )}
                                </div>

                                {/* Right Meta Pane */}
                                <div className="no-print p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-3">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                            <CheckCircle2 size={13} />
                                            <span>Ready for Print / Export</span>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                                            {fullName}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Toggle badge orientation, export as high-resolution image, or dispatch to connected printer.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => setIsFlipped(!isFlipped)}
                                            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <FlipHorizontal size={14} />
                                            <span>Flip to {isFlipped ? "Front Side" : "Back Side"}</span>
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
        </div>
    );
}