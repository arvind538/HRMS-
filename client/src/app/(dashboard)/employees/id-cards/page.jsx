"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Printer,
    Search,
    X,
    CheckCircle2,
    Loader2,
    FlipHorizontal,
    Download,
    Eye,
    Mail,
    Phone,
    IdCard,
    ShieldCheck,
    Menu,
    MoreVertical,
} from "lucide-react";

import api from "@/lib/api";
import { toPng } from "html-to-image";
import QRCode from "qrcode";

/*
|--------------------------------------------------------------------------
| COMPANY
|--------------------------------------------------------------------------
*/
const COMPANY_NAME = "FourPaysave";
const COMPANY_SUB = "Hi Tech Solutions Pvt Ltd";
const COMPANY_LEGAL = "FOUR PAYSAVE HI TECH SOLUTIONS PVT LTD";
const COMPANY_WEB = "4PAYSAVE.COM";

/* Logo files: client/public/brand/ */
const LOGO_FULL = "/brand/company-logo.png"; // horizontal logo (front card)
const LOGO_ICON = "/brand/logo-icon.png"; // P logo (back card)

/*
|--------------------------------------------------------------------------
| QR SETTINGS
|--------------------------------------------------------------------------
| QR scan karte hi phone par employee ki details dikhengi:
| naam, roll no, designation, department, location.
| Internet ya kisi link ki zarurat nahi.
|--------------------------------------------------------------------------
*/
const QR_COLOR = "#0B1B3A";
const QR_OPTIONS = {
    width: 512,
    margin: 2, // quiet zone, scan ke liye zaroori
    errorCorrectionLevel: "M",
    color: { dark: QR_COLOR, light: "#FFFFFF" },
};

/*
|--------------------------------------------------------------------------
| ID CARD SIZE + COLORS
|--------------------------------------------------------------------------
*/
const CARD_WIDTH = 300;
const CARD_HEIGHT = 510;

const CARD_BLUE = "#0A70F5";
const CARD_NAVY = "#14145A";
const CARD_FONT = "Poppins, Inter, 'Segoe UI', system-ui, sans-serif";

const PHOTO_SIZE = 145;
const PHOTO_STROKE = 7;

const octagonPoints = (size, inset) => {
    const w = size - inset * 2;
    const a = w * 0.2929;

    return [
        [inset + a, inset],
        [inset + w - a, inset],
        [inset + w, inset + a],
        [inset + w, inset + w - a],
        [inset + w - a, inset + w],
        [inset + a, inset + w],
        [inset, inset + w - a],
        [inset, inset + a],
    ];
};

const PHOTO_POINTS = octagonPoints(PHOTO_SIZE, PHOTO_STROKE / 2);
const PHOTO_SVG_POINTS = PHOTO_POINTS.map(([x, y]) => `${x},${y}`).join(" ");
const PHOTO_CLIP = `polygon(${PHOTO_POINTS.map(([x, y]) => `${x}px ${y}px`).join(",")})`;

const isHexObjectId = (value) =>
    typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value.trim());

/* populated reference ho to name lo, warna string */
const textOf = (value) => {
    if (value && typeof value === "object") {
        return String(value.name || value.title || "").trim();
    }
    return String(value || "").trim();
};

/*
|--------------------------------------------------------------------------
| Employee ID (roll number)
|--------------------------------------------------------------------------
*/
const getSafeEmployeeId = (employee, index = 0) => {
    const candidates = [
        employee?.employeeId,
        employee?.empId,
        employee?.employeeCode,
        employee?.code,
    ];

    const valid = candidates.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() &&
            !isHexObjectId(String(value).trim())
    );

    if (valid) {
        return String(valid).trim().toUpperCase();
    }

    return `FPS${String(Math.max(index, 0) + 1).padStart(4, "0")}`;
};

/*
|--------------------------------------------------------------------------
| Name
|--------------------------------------------------------------------------
*/
const getEmployeeName = (employee) => {
    if (!employee) return "Personnel Name";

    if (employee.name?.trim()) {
        return employee.name.trim();
    }

    const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

    return name || "Personnel Name";
};

/*
|--------------------------------------------------------------------------
| CORNER SHAPES (front + back)
|--------------------------------------------------------------------------
*/
function CornerShapes({ variant = "front" }) {
    return (
        <svg
            viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            className="absolute inset-0 pointer-events-none z-0"
            fill={CARD_BLUE}
            stroke={CARD_BLUE}
            strokeWidth="14"
            strokeLinejoin="round"
        >
            {/* top right - big rounded triangle */}
            <polygon points="158,-12 320,-12 320,18 254,84" />

            {/* right side - half diamond (front only) */}
            {variant === "front" && <polygon points="249.5,128.5 330,48 330,209" />}

            {/* bottom left - navy edge + blue */}
            <g stroke="none">
                <polygon points="-12,432 40,476 40,522 -12,522" fill={CARD_NAVY} transform="translate(4,-4)" />
                <polygon points="-12,432 40,476 40,522 -12,522" fill={CARD_BLUE} />
            </g>

            {/* bottom right - half diamond */}
            <polygon points="272.5,458.5 330,401 330,516" />

            {/* bottom right - peak */}
            <polygon points="241,468 187,522 295,522" />
        </svg>
    );
}

/*
|--------------------------------------------------------------------------
| CARD FIT (screen par card choti ho jaye, print/PNG me original size)
|--------------------------------------------------------------------------
*/
function CardFit({ children }) {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const fit = () => setScale(Math.min(1, (window.innerWidth - 90) / CARD_WIDTH));
        fit();
        window.addEventListener("resize", fit);
        return () => window.removeEventListener("resize", fit);
    }, []);

    return (
        <div
            className="card-fit relative mx-auto"
            style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}
        >
            <div
                className="transition duration-300 hover:drop-shadow-[0_14px_24px_rgba(15,23,42,0.22)]"
                style={{
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                }}
            >
                {children}
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| QR BLOCK (frame + QR + infinity + tagline)
|--------------------------------------------------------------------------
*/
const QR_FRAME = { left: 78, top: 404, size: 88 };
const QR_SIZE = 62;

function QrBlock({ qrCodeUrl }) {
    return (
        <>
            {/* frame */}
            <div
                className="absolute z-10"
                style={{
                    left: QR_FRAME.left,
                    top: QR_FRAME.top,
                    width: QR_FRAME.size,
                    height: QR_FRAME.size,
                    border: "1.5px solid #9CC3F2",
                    borderRadius: 9,
                    background: "#fff",
                }}
            />

            {/* QR */}
            <div
                className="absolute z-20 flex items-center justify-center bg-white transition-transform duration-300 hover:scale-105"
                style={{
                    left: QR_FRAME.left + (QR_FRAME.size - QR_SIZE) / 2,
                    top: QR_FRAME.top + (QR_FRAME.size - QR_SIZE) / 2 - 6,
                    width: QR_SIZE,
                    height: QR_SIZE,
                }}
            >
                {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Employee QR" className="w-full h-full object-contain" />
                ) : (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: CARD_BLUE }} />
                )}
            </div>

            {/* infinity */}
            <div
                className="absolute z-30 bg-white flex items-center justify-center"
                style={{ left: QR_FRAME.left + 6, top: QR_FRAME.top - 6, width: 26, height: 12 }}
            >
                <svg viewBox="0 0 40 18" width="24" height="11" fill="none">
                    <path
                        d="M20 9 C 14 -1, 2 -1, 2 9 C 2 19, 14 19, 20 9 C 26 -1, 38 -1, 38 9 C 38 19, 26 19, 20 9 Z"
                        stroke={CARD_NAVY}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
            </div>

            {/* tagline */}
            <div
                className="absolute z-30"
                style={{
                    left: QR_FRAME.left + 36,
                    top: QR_FRAME.top + QR_FRAME.size - 16,
                    transform: "rotate(-5deg)",
                    fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
                    color: CARD_NAVY,
                    background: "#fff",
                    padding: "0 2px",
                }}
            >
                <p className="text-[11px] font-semibold leading-[11px]" style={{ marginLeft: 8 }}>
                    Together
                </p>
                <p className="text-[11px] font-semibold leading-[11px]">Forever</p>
            </div>
        </>
    );
}

/*
|--------------------------------------------------------------------------
| ID CARD FRONT
|--------------------------------------------------------------------------
*/
function IDCardFront({ id, employee, fullName, designation, token, qrCodeUrl }) {
    const nameSize = fullName.length > 22 ? 14 : fullName.length > 17 ? 16 : 18;
    const email = employee?.email || "staff@4paysave.com";
    const emailSize = email.length > 28 ? 10.5 : email.length > 24 ? 12 : 13;

    return (
        <div
            id={id}
            className="relative overflow-hidden select-none shrink-0 bg-white"
            style={{
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 16px rgba(15,23,42,.10)",
                fontFamily: CARD_FONT,
            }}
        >
            <CornerShapes variant="front" />

            {/* COMPANY LOGO (image) */}
            <div className="absolute z-10" style={{ top: 22, left: 20 }}>
                <img
                    src={LOGO_FULL}
                    alt={COMPANY_LEGAL}
                    draggable={false}
                    style={{ width: 150, height: "auto", display: "block" }}
                />
            </div>

            {/* PHOTO */}
            <div
                className="absolute z-10"
                style={{ top: 94, left: (CARD_WIDTH - PHOTO_SIZE) / 2, width: PHOTO_SIZE, height: PHOTO_SIZE }}
            >
                <div
                    className="absolute inset-0 bg-slate-100 overflow-hidden flex items-center justify-center"
                    style={{ clipPath: PHOTO_CLIP }}
                >
                    {employee?.avatar || employee?.photo ? (
                        <img
                            src={employee.avatar || employee.photo}
                            alt={fullName}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-4xl font-bold" style={{ color: CARD_BLUE }}>
                            {fullName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                <svg
                    viewBox={`0 0 ${PHOTO_SIZE} ${PHOTO_SIZE}`}
                    width={PHOTO_SIZE}
                    height={PHOTO_SIZE}
                    className="absolute inset-0 pointer-events-none"
                    fill="none"
                    stroke={CARD_NAVY}
                    strokeWidth={PHOTO_STROKE}
                    strokeLinejoin="round"
                >
                    <polygon points={PHOTO_SVG_POINTS} />
                </svg>
            </div>

            {/* NAME */}
            <div className="absolute z-10 left-0 right-0 text-center px-3" style={{ top: 243 }}>
                <h3
                    className="font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-[26px]"
                    style={{ color: CARD_BLUE, fontSize: nameSize, letterSpacing: "-0.01em" }}
                >
                    {fullName}
                </h3>
            </div>

            {/* DESIGNATION */}
            <div className="absolute z-10 left-0 right-0 flex justify-center px-6" style={{ top: 277 }}>
                <div
                    className="flex items-center rounded-md max-w-full"
                    style={{ background: CARD_NAVY, height: 23, padding: "0 9px" }}
                >
                    <span
                        className="block font-bold text-white uppercase truncate leading-none"
                        style={{ fontSize: 11.5, letterSpacing: "-0.01em" }}
                    >
                        {designation}
                    </span>
                </div>
            </div>

            {/* DETAILS */}
            <div className="absolute z-10" style={{ top: 327, left: 32, right: 6, color: CARD_NAVY, fontSize: 13 }}>
                <div className="grid items-center" style={{ gridTemplateColumns: "56px 8px 1fr", height: 20.5 }}>
                    <span className="font-bold">ID No</span>
                    <span>:</span>
                    <span className="uppercase">{token}</span>
                </div>

                <div className="grid items-center" style={{ gridTemplateColumns: "56px 8px 1fr", height: 20.5 }}>
                    <span className="font-bold">Email</span>
                    <span>:</span>
                    <span className="truncate" style={{ fontSize: emailSize }}>
                        {email}
                    </span>
                </div>

                <div className="grid items-center" style={{ gridTemplateColumns: "56px 8px 1fr", height: 20.5 }}>
                    <span className="font-bold">Phone</span>
                    <span>:</span>
                    <span>{employee?.phone || "+91 00000 00000"}</span>
                </div>
            </div>

            {/* QR */}
            <QrBlock qrCodeUrl={qrCodeUrl} />
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| ID CARD BACK
|--------------------------------------------------------------------------
*/
/* P logo: native SVG, company ke logo jaise blue gradient hexagon + navy P */
function BrandMark({ size = 52 }) {
    return (
        <svg
            width={size}
            height={Math.round(size * 1.08)}
            viewBox="0 0 100 108"
            role="img"
            aria-label="FourPaysave logo"
            style={{ display: "block" }}
        >
            <defs>
                <linearGradient id="fp-brand-hex" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#5BB4FF" />
                    <stop offset="0.55" stopColor="#1F7AE8" />
                    <stop offset="1" stopColor="#0A4FB8" />
                </linearGradient>
            </defs>
            <polygon points="50,2 98,28 98,80 50,106 2,80 2,28" fill="url(#fp-brand-hex)" />
            <path
                d="M36,82 V36 H52 A16,16 0 0 1 52,68 H36"
                fill="none"
                stroke="#0B1B3A"
                strokeWidth="11"
                strokeLinecap="square"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IDCardBack({ id }) {
    return (
        <div
            id={id}
            className="relative flex flex-col justify-between overflow-hidden select-none shrink-0 bg-white"
            style={{
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 16px rgba(15,23,42,.10)",
                padding: "22px 24px 24px",
                fontFamily: CARD_FONT,
            }}
        >
            <CornerShapes variant="back" />

            <div className="relative z-10 space-y-4">
                {/* P LOGO (image) */}
                <img
                    src={LOGO_ICON}
                    alt={COMPANY_NAME}
                    draggable={false}
                    style={{ width: 52, height: "auto", display: "block" }}
                />

                <h4
                    className="text-[12px] font-bold uppercase tracking-wider border-b border-slate-200 pb-1 mt-6"
                    style={{ color: CARD_NAVY }}
                >
                    Terms &amp; Conditions
                </h4>

                <ul className="text-[10.5px] font-medium space-y-2.5 list-disc pl-4 pr-6" style={{ color: CARD_NAVY }}>
                    <li>This ID card is the property of {COMPANY_NAME} {COMPANY_SUB}.</li>
                    <li>This card is non-transferable.</li>
                    <li>Carry this card during working hours.</li>
                    <li>In case of lost, please inform the HR department immediately.</li>
                    <li>This card must be returned when leaving the company.</li>
                </ul>
            </div>

            <div className="relative z-10 space-y-2 pb-14 text-center">
                <div className="flex flex-col items-center">
                    <div className="w-36 border-b border-slate-500 mb-1" />
                    <p className="text-[10.5px] font-semibold" style={{ color: CARD_NAVY }}>
                        Authorized Signature
                    </p>
                </div>

                <div className="text-[10px] font-semibold" style={{ color: CARD_BLUE }}>
                    {COMPANY_NAME} {COMPANY_SUB}
                </div>

                <div className="text-[12px] font-extrabold tracking-wider" style={{ color: CARD_NAVY }}>
                    {COMPANY_WEB}
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/
export default function EmployeeIDCardsPage() {
    const [employees, setEmployees] = useState([]);
    const [departmentsMap, setDepartmentsMap] = useState({});
    const [designationsMap, setDesignationsMap] = useState({});

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [selectedEmp, setSelectedEmp] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);

    const [downloading, setDownloading] = useState(false);
    const [pendingPrint, setPendingPrint] = useState(false);

    // action menu (three dots) + background download job
    const [menu, setMenu] = useState(null); // { emp, top, left }
    const [exportJob, setExportJob] = useState(null); // { emp, token, url }
    const menuRef = useRef(null);

    // { text: QR ka source text, url: generated data URL }
    const [qrState, setQrState] = useState({ text: "", url: "" });

    /*
    |--------------------------------------------------------------------------
    | AVATARS (sirf read; photo employee ke record se aati hai)
    |--------------------------------------------------------------------------
    */
    const mergeWithLocalAvatars = (list) => {
        let stored = {};
        try {
            stored = JSON.parse(localStorage.getItem("4ps_emp_avatars") || "{}");
        } catch {
            stored = {};
        }

        return list.map((emp, index) => {
            const dbId = String(emp._id || emp.id || "");

            return {
                ...emp,
                employeeId: getSafeEmployeeId(emp, index),
                avatar: stored[dbId] || emp.avatar || emp.photo || "",
            };
        });
    };

    /*
    |--------------------------------------------------------------------------
    | LOOKUPS
    |--------------------------------------------------------------------------
    */
    const fetchLookupData = async () => {
        try {
            const [deptRes, desigRes] = await Promise.allSettled([
                api.get("/departments"),
                api.get("/designations"),
            ]);

            if (deptRes.status === "fulfilled") {
                const data = Array.isArray(deptRes.value?.data)
                    ? deptRes.value.data
                    : deptRes.value?.data?.departments || [];

                const map = {};
                data.forEach((item) => {
                    const id = String(item._id || item.id || "");
                    if (id) map[id] = item.name || item.title || item.departmentName || "General";
                });
                setDepartmentsMap(map);
            }

            if (desigRes.status === "fulfilled") {
                const data = Array.isArray(desigRes.value?.data)
                    ? desigRes.value.data
                    : desigRes.value?.data?.designations || [];

                const map = {};
                data.forEach((item) => {
                    const id = String(item._id || item.id || "");
                    if (id) map[id] = item.name || item.title || item.designationName || "Executive";
                });
                setDesignationsMap(map);
            }
        } catch (error) {
            console.warn("Lookup data unavailable", error);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | FETCH EMPLOYEES
    |--------------------------------------------------------------------------
    */
    const fetchEmployees = async () => {
        setLoading(true);

        try {
            await fetchLookupData();

            const response = await api.get("/employees");

            const data = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.data?.employees)
                    ? response.data.employees
                    : [];

            setEmployees(mergeWithLocalAvatars(data));
        } catch (error) {
            console.error("Employee fetch failed:", error);

            try {
                const localData = JSON.parse(localStorage.getItem("4ps_emp_data") || "[]");
                if (Array.isArray(localData)) setEmployees(mergeWithLocalAvatars(localData));
            } catch { }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | DEPARTMENT / DESIGNATION / LOCATION
    |--------------------------------------------------------------------------
    */
    const getDepartment = (emp) => {
        const value = emp?.department;

        if (!value) return "General";

        if (typeof value === "object") {
            return value.name || value.title || value.departmentName || "General";
        }

        const text = String(value).trim();

        if (departmentsMap[text]) return departmentsMap[text];
        if (isHexObjectId(text)) return "IT & Tech";

        return text || "General";
    };

    const getDesignation = (emp) => {
        const value = emp?.designation;

        if (!value) return emp?.role || "Executive";

        if (typeof value === "object") {
            return value.name || value.title || value.designationName || emp?.role || "Executive";
        }

        const text = String(value).trim();

        if (designationsMap[text]) return designationsMap[text];
        if (isHexObjectId(text)) return emp?.role || "Executive";

        return text || emp?.role || "Executive";
    };

    const getLocation = (emp) => {
        const raw = textOf(emp?.workLocation) || textOf(emp?.location) || textOf(emp?.branch);
        return isHexObjectId(raw) ? "" : raw;
    };

    /*
    |--------------------------------------------------------------------------
    | FILTER
    |--------------------------------------------------------------------------
    */
    const filteredEmployees = useMemo(() => {
        const query = search.toLowerCase().trim();

        return employees.filter((emp, index) => {
            const haystack = [
                getEmployeeName(emp),
                getDesignation(emp),
                getDepartment(emp),
                getLocation(emp),
                getSafeEmployeeId(emp, index),
            ]
                .join(" ")
                .toLowerCase();

            return !query || haystack.includes(query);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, search, departmentsMap, designationsMap]);

    /*
    |--------------------------------------------------------------------------
    | QR TEXT (scan = details)
    |--------------------------------------------------------------------------
    */
    const buildQrText = (employee, token) =>
        [
            COMPANY_LEGAL,
            `Name: ${getEmployeeName(employee)}`,
            `Roll No: ${token}`,
            `Designation: ${getDesignation(employee)}`,
            `Department: ${getDepartment(employee)}`,
            getLocation(employee) ? `Location: ${getLocation(employee)}` : null,
            employee?.phone ? `Phone: ${employee.phone}` : null,
            employee?.email ? `Email: ${employee.email}` : null,
        ]
            .filter(Boolean)
            .join("\n");

    const selectedToken = selectedEmp ? getSafeEmployeeId(selectedEmp, employees.indexOf(selectedEmp)) : "";

    const selectedQrText = useMemo(
        () => (selectedEmp ? buildQrText(selectedEmp, selectedToken) : ""),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedEmp, selectedToken, designationsMap, departmentsMap]
    );

    const qrReady = !!selectedQrText && qrState.text === selectedQrText;

    /*
    |--------------------------------------------------------------------------
    | GENERATE QR
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!selectedQrText) {
            setQrState({ text: "", url: "" });
            return;
        }

        let cancelled = false;

        QRCode.toDataURL(selectedQrText, QR_OPTIONS)
            .then((url) => {
                if (!cancelled) setQrState({ text: selectedQrText, url });
            })
            .catch((error) => console.error("QR generation failed:", error));

        return () => {
            cancelled = true;
        };
    }, [selectedQrText]);

    /*
    |--------------------------------------------------------------------------
    | PRINT (QR ready hone ke baad hi print)
    |--------------------------------------------------------------------------
    */
    const printEmployeeCard = (employee) => {
        setSelectedEmp(employee);
        setIsFlipped(false);
        setPendingPrint(true);
    };

    useEffect(() => {
        if (!pendingPrint || !qrReady) return;

        const timer = setTimeout(async () => {
            try {
                await document.fonts?.ready;
            } catch { }

            setPendingPrint(false);
            window.print();
        }, 350);

        return () => clearTimeout(timer);
    }, [pendingPrint, qrReady]);

    /*
    |--------------------------------------------------------------------------
    | HIGH QUALITY DOWNLOAD (PNG)
    |--------------------------------------------------------------------------
    */
    const downloadCard = async (cardId, fileName) => {
        const element = document.getElementById(cardId);

        if (!element) {
            console.error("Card element not found");
            return;
        }

        setDownloading(true);

        try {
            try {
                await document.fonts?.ready;
            } catch { }

            await new Promise((resolve) => setTimeout(resolve, 300));

            const dataUrl = await toPng(element, {
                cacheBust: true,
                pixelRatio: 4,
                backgroundColor: "#ffffff",
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                style: { margin: "0", transform: "none" },
            });

            const link = document.createElement("a");
            link.download = `${fileName}.png`;
            link.href = dataUrl;

            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("High quality card download failed:", error);
            alert("ID card download nahi ho saka. Please thodi der baad try karein.");
        } finally {
            setDownloading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | ACTION MENU (View / Download)
    |--------------------------------------------------------------------------
    */
    const MENU_W = 176;
    const MENU_H = 104;

    const openMenu = (emp, event) => {
        event.stopPropagation();

        const rect = event.currentTarget.getBoundingClientRect();

        let top = rect.bottom + 6;
        if (top + MENU_H > window.innerHeight) {
            top = Math.max(8, rect.top - MENU_H - 6);
        }

        const left = Math.min(Math.max(8, rect.right - MENU_W), window.innerWidth - MENU_W - 8);

        setMenu((prev) => (prev?.emp === emp ? null : { emp, top, left }));
    };

    useEffect(() => {
        if (!menu) return;

        const close = () => setMenu(null);

        const onMouseDown = (e) => {
            if (menuRef.current?.contains(e.target)) return;
            if (e.target.closest?.("[data-menu-btn]")) return;
            close();
        };

        const onKey = (e) => {
            if (e.key === "Escape") close();
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("touchstart", onMouseDown, { passive: true });
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("touchstart", onMouseDown);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
            window.removeEventListener("keydown", onKey);
        };
    }, [menu]);

    /*
    |--------------------------------------------------------------------------
    | MENU DOWNLOAD (hidden card render karke PNG)
    |--------------------------------------------------------------------------
    */
    const startDownload = async (emp) => {
        if (exportJob || downloading) return;

        const token = getSafeEmployeeId(emp, employees.indexOf(emp));

        try {
            const url = await QRCode.toDataURL(buildQrText(emp, token), QR_OPTIONS);
            setExportJob({ emp, token, url });
        } catch (error) {
            console.error("QR generation failed:", error);
            alert("QR generate nahi ho saka.");
        }
    };

    useEffect(() => {
        if (!exportJob) return;

        let cancelled = false;

        const timer = setTimeout(async () => {
            if (cancelled) return;

            await downloadCard(
                "export-card-front",
                `${getEmployeeName(exportJob.emp).replace(/\s+/g, "_")}_ID_Card`
            );

            if (!cancelled) setExportJob(null);
        }, 450);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportJob]);

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */
    if (loading) {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
                <p className="text-sm font-semibold">Loading Official ID Cards...</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5 antialiased font-sans text-slate-900 pb-10">
            {/* FONTS + PRINT CSS */}
            <style jsx global>{`
                @import url("https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap");

                @page {
                    size: auto;
                    margin: 0;
                }

                @media print {
                    html,
                    body {
                        width: 100%;
                        height: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

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

                    .card-fit,
                    .card-fit > div {
                        transform: none !important;
                        width: auto !important;
                        height: auto !important;
                    }

                    #printable-card-front,
                    #printable-card-back {
                        position: fixed !important;
                        left: 50% !important;
                        top: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                    }

                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* HEADER */}
            <div className="no-print bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Employee Directory & Badges
                        </span>
                        <span className="text-xs text-slate-400 font-medium">CR80 Standard</span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
                        {COMPANY_LEGAL}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                        Manage employee badges, preview ID cards and export high-resolution cards.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, ID, role or dept..."
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-600 transition"
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* EMPLOYEE TABLE */}
            <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="py-3.5 px-6">Employee</th>
                                <th className="py-3.5 px-5">Employee ID</th>
                                <th className="py-3.5 px-5">Designation</th>
                                <th className="py-3.5 px-5">Department</th>
                                <th className="py-3.5 px-5">Contact</th>
                                <th className="py-3.5 px-6 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.map((emp, index) => {
                                const name = getEmployeeName(emp);
                                const designation = getDesignation(emp);
                                const department = getDepartment(emp);
                                const location = getLocation(emp);
                                const token = getSafeEmployeeId(emp, index);

                                return (
                                    <tr
                                        key={emp._id || emp.id || index}
                                        className="hover:bg-blue-50/40 transition-colors duration-200"
                                    >
                                        <td className="py-3.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 border overflow-hidden flex items-center justify-center shrink-0">
                                                    {emp.avatar || emp.photo ? (
                                                        <img src={emp.avatar || emp.photo} alt={name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-blue-600">{name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{name}</p>
                                                    <p className="text-[11px] text-slate-400 truncate">{emp.email || "No email"}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-5">
                                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-200">
                                                {token}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-5 font-semibold">{designation}</td>

                                        <td className="py-3.5 px-5">
                                            <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs">{department}</span>
                                        </td>


                                        <td className="py-3.5 px-5 text-xs font-mono">{emp.phone || "—"}</td>

                                        <td className="py-3.5 px-6 text-right">
                                            <button
                                                type="button"
                                                data-menu-btn
                                                aria-label="Actions"
                                                onClick={(e) => openMenu(emp, e)}
                                                className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm rounded-xl transition duration-200"
                                            >
                                                <MoreVertical size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE */}
                <div className="md:hidden divide-y">
                    {filteredEmployees.map((emp, index) => {
                        const name = getEmployeeName(emp);
                        const designation = getDesignation(emp);
                        const department = getDepartment(emp);
                        const location = getLocation(emp);
                        const token = getSafeEmployeeId(emp, index);

                        return (
                            <div
                                key={emp._id || emp.id || index}
                                className="p-4 space-y-3 transition duration-200 hover:bg-blue-50/40"
                            >
                                <div className="flex justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 border overflow-hidden flex items-center justify-center shrink-0">
                                            {emp.avatar || emp.photo ? (
                                                <img src={emp.avatar || emp.photo} alt={name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-blue-600">{name.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <h4 className="font-bold text-sm truncate">{name}</h4>
                                            <p className="text-xs text-slate-500 truncate">{designation}</p>
                                        </div>
                                    </div>

                                    <span className="h-fit px-2 py-1 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded">
                                        {token}
                                    </span>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-2 text-xs space-y-0.5">
                                    <div>
                                        <span className="text-slate-400">Department:</span> <b>{department}</b>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Location:</span> <b>{location || "—"}</b>
                                    </div>
                                </div>

                                <div className="text-xs space-y-1">
                                    <div className="flex gap-2">
                                        <Mail size={13} />
                                        <span className="truncate">{emp.email || "No email"}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Phone size={13} />
                                        <span>{emp.phone || "No phone"}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedEmp(emp);
                                            setIsFlipped(false);
                                        }}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition duration-200"
                                    >
                                        <IdCard size={14} />
                                        Show ID Card
                                    </button>

                                    <button
                                        type="button"
                                        data-menu-btn
                                        aria-label="Actions"
                                        onClick={(e) => openMenu(emp, e)}
                                        className="px-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-200"
                                    >
                                        <Menu size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!filteredEmployees.length && (
                    <div className="p-12 text-center text-slate-500 text-sm">No employee found.</div>
                )}
            </div>

            {/* ACTION MENU */}
            {menu && (
                <div
                    ref={menuRef}
                    className="no-print fixed z-[70] bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 overflow-hidden"
                    style={{ top: menu.top, left: menu.left, width: MENU_W }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedEmp(menu.emp);
                            setIsFlipped(false);
                            setMenu(null);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left transition"
                    >
                        <Eye size={15} />
                        View Card
                    </button>

                    <button
                        type="button"
                        disabled={!!exportJob || downloading}
                        onClick={() => {
                            const emp = menu.emp;
                            setMenu(null);
                            startDownload(emp);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 text-left transition disabled:opacity-50"
                    >
                        <Download size={15} />
                        Download HD PNG
                    </button>
                </div>
            )}

            {/* DOWNLOAD PROGRESS */}
            {exportJob && (
                <div className="no-print fixed bottom-5 right-5 z-[80] flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xl">
                    <Loader2 size={14} className="animate-spin" />
                    Generating HD Card...
                </div>
            )}

            {/* HIDDEN CARD FOR MENU DOWNLOAD */}
            {exportJob && (
                <div aria-hidden="true" className="no-print" style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
                    <IDCardFront
                        id="export-card-front"
                        employee={exportJob.emp}
                        fullName={getEmployeeName(exportJob.emp)}
                        designation={getDesignation(exportJob.emp)}
                        token={exportJob.token}
                        qrCodeUrl={exportJob.url}
                    />
                </div>
            )}

            {/* CARD PREVIEW MODAL */}
            {selectedEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedEmp(null);
                                setPendingPrint(false);
                            }}
                            className="absolute top-3 right-3 z-30 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition"
                            aria-label="Close"
                        >
                            <X size={15} />
                        </button>

                        {/* CARD */}
                        <div className="p-5 sm:p-8 bg-slate-50 flex justify-center items-center">
                            <CardFit>
                                {!isFlipped ? (
                                    <IDCardFront
                                        id="printable-card-front"
                                        employee={selectedEmp}
                                        fullName={getEmployeeName(selectedEmp)}
                                        designation={getDesignation(selectedEmp)}
                                        token={selectedToken}
                                        qrCodeUrl={qrReady ? qrState.url : ""}
                                    />
                                ) : (
                                    <IDCardBack id="printable-card-back" />
                                )}
                            </CardFit>
                        </div>

                        {/* ACTIONS */}
                        <div className="no-print p-5 sm:p-7 flex-1 flex flex-col justify-between gap-5">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                    <CheckCircle2 size={13} />
                                    Ready for Print / Export
                                </div>

                                <div>
                                    <h3 className="text-lg font-black">{getEmployeeName(selectedEmp)}</h3>

                                    <p className="text-xs font-bold text-blue-600 font-mono">
                                        {selectedToken} • {getDesignation(selectedEmp)}
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                                    <div className="flex gap-2">
                                        <ShieldCheck size={15} className="shrink-0" />
                                        <span>
                                            QR scan karne par phone me employee ki details (naam, roll no, designation,
                                            department, location) dikhengi. Internet ki zarurat nahi.
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsFlipped((value) => !value)}
                                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition duration-200"
                                >
                                    <FlipHorizontal size={14} />
                                    Flip to {isFlipped ? "Front" : "Back / Terms"}
                                </button>
                            </div>

                            <div className="border-t pt-4 space-y-2">
                                <button
                                    type="button"
                                    disabled={pendingPrint || !qrReady}
                                    onClick={() => printEmployeeCard(selectedEmp)}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 hover:shadow-md disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition duration-200"
                                >
                                    {pendingPrint ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                    Print Badge
                                </button>

                                <button
                                    type="button"
                                    disabled={downloading || !qrReady}
                                    onClick={() =>
                                        downloadCard(
                                            !isFlipped ? "printable-card-front" : "printable-card-back",
                                            `${getEmployeeName(selectedEmp).replace(/\s+/g, "_")}_ID_Card${isFlipped ? "_Back" : ""}`
                                        )
                                    }
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 hover:shadow-md disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition duration-200"
                                >
                                    {downloading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Generating HD Card...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={14} />
                                            Download HD PNG
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}











// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import {
//     Printer,
//     Search,
//     X,
//     CheckCircle2,
//     Loader2,
//     Edit3,
//     Upload,
//     Camera,
//     Save,
//     FlipHorizontal,
//     Download,
//     Eye,
//     Mail,
//     Phone,
//     IdCard,
//     ShieldCheck,
//     Menu,
//     MoreVertical,
// } from "lucide-react";

// import api from "@/lib/api";
// import { toPng } from "html-to-image";
// import QRCode from "qrcode";

// const COMPANY_NAME = "FourPaysave";
// const COMPANY_SUB = "HI Tech Solutions";
// const COMPANY_LEGAL = "FOUR PAYSAVE HI TECH SOLUTIONS PVT LTD";
// const COMPANY_WEB = "4PAYSAVE.COM";

// /*
// |--------------------------------------------------------------------------
// | QR SETTINGS
// |--------------------------------------------------------------------------
// | QR_VERIFY_URL = "" (khali)  -> QR ke andar employee ke details text me
// |                                hote hain (offline, internet nahi chahiye).
// | QR_VERIFY_URL = "https://4paysave.com/verify"
// |                              -> QR scan par link khulega:
// |                                https://4paysave.com/verify/FPS0009
// |                                (link chhota hota hai, isliye scan sabse
// |                                fast hota hai)
// |--------------------------------------------------------------------------
// */
// const QR_VERIFY_URL = "https://4paysave.com/verify";
// const QR_COLOR = "#2F6FD0";

// /*
// |--------------------------------------------------------------------------
// | ID CARD SIZE + COLORS
// |--------------------------------------------------------------------------
// */
// const CARD_WIDTH = 300;
// const CARD_HEIGHT = 510;

// const CARD_BLUE = "#0A70F5";
// const CARD_NAVY = "#14145A";
// const CARD_BLACK = "#15153F";
// const CARD_FONT = "Poppins, Inter, 'Segoe UI', system-ui, sans-serif";

// const HEX_CLIP =
//     "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

// const PHOTO_SIZE = 145;
// const PHOTO_STROKE = 7;

// const octagonPoints = (size, inset) => {
//     const w = size - inset * 2;
//     const a = w * 0.2929;

//     return [
//         [inset + a, inset],
//         [inset + w - a, inset],
//         [inset + w, inset + a],
//         [inset + w, inset + w - a],
//         [inset + w - a, inset + w],
//         [inset + a, inset + w],
//         [inset, inset + w - a],
//         [inset, inset + a],
//     ];
// };

// const PHOTO_POINTS = octagonPoints(PHOTO_SIZE, PHOTO_STROKE / 2);
// const PHOTO_SVG_POINTS = PHOTO_POINTS.map(([x, y]) => `${x},${y}`).join(" ");
// const PHOTO_CLIP = `polygon(${PHOTO_POINTS.map(([x, y]) => `${x}px ${y}px`).join(
//     ","
// )})`;

// const isHexObjectId = (value) =>
//     typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value.trim());

// /*
// |--------------------------------------------------------------------------
// | Employee ID
// |--------------------------------------------------------------------------
// */
// const getSafeEmployeeId = (employee, index = 0) => {
//     const candidates = [
//         employee?.employeeId,
//         employee?.empId,
//         employee?.employeeCode,
//         employee?.code,
//     ];

//     const valid = candidates.find(
//         (value) =>
//             value !== undefined &&
//             value !== null &&
//             String(value).trim() &&
//             !isHexObjectId(String(value).trim())
//     );

//     if (valid) {
//         return String(valid).trim().toUpperCase();
//     }

//     return `FPS${String(Math.max(index, 0) + 1).padStart(4, "0")}`;
// };

// /*
// |--------------------------------------------------------------------------
// | Name
// |--------------------------------------------------------------------------
// */
// const getEmployeeName = (employee) => {
//     if (!employee) return "Personnel Name";

//     if (employee.name?.trim()) {
//         return employee.name.trim();
//     }

//     const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

//     return name || "Personnel Name";
// };

// /*
// |--------------------------------------------------------------------------
// | BLUE CORNER SHAPES (front + back)
// |--------------------------------------------------------------------------
// */
// function CornerShapes({ variant = "front" }) {
//     return (
//         <svg
//             viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
//             width={CARD_WIDTH}
//             height={CARD_HEIGHT}
//             className="absolute inset-0 pointer-events-none z-0"
//             fill={CARD_BLUE}
//             stroke={CARD_BLUE}
//             strokeWidth="14"
//             strokeLinejoin="round"
//         >
//             {/* top right - big rounded triangle */}
//             <polygon points="158,-12 320,-12 320,18 254,84" />

//             {/* right side - half diamond (front only) */}
//             {variant === "front" && (
//                 <polygon points="249.5,128.5 330,48 330,209" />
//             )}

//             {/* bottom left - navy edge + blue */}
//             <g stroke="none">
//                 <polygon
//                     points="-12,405 58.7,476 58.7,522 -12,522"
//                     fill={CARD_NAVY}
//                     transform="translate(4,-4)"
//                 />
//                 <polygon
//                     points="-12,405 58.7,476 58.7,522 -12,522"
//                     fill={CARD_BLUE}
//                 />
//             </g>

//             {/* bottom right - half diamond */}
//             <polygon points="272.5,458.5 330,401 330,516" />

//             {/* bottom right - peak */}
//             <polygon points="241,468 187,522 295,522" />
//         </svg>
//     );
// }

// function BrandLogo() {
//     return (
//         <div
//             className="flex items-center justify-center shrink-0"
//             style={{
//                 width: 30,
//                 height: 35,
//                 clipPath: HEX_CLIP,
//                 background: `linear-gradient(135deg, ${CARD_BLUE}, #22B8F0)`,
//             }}
//         >
//             <span
//                 className="text-white font-extrabold leading-none text-itality"
//                 style={{ fontSize: 19 }}
//             >
//                 P
//             </span>
//         </div>
//     );
// }

// function BrandName({ size = 17 }) {
//     return (
//         <p
//             className="font-bold whitespace-nowrap leading-none"
//             style={{
//                 fontSize: size,
//                 letterSpacing: "-0.06em",
//                 transform: "scaleX(0.8)",
//                 transformOrigin: "left center",
//             }}
//         >
//             <span style={{ color: CARD_BLUE, fontWeight: 500 }}>FOUR</span>{" "}
//             <span style={{ color: CARD_BLACK }}>PAYSAVE</span>
//         </p>
//     );
// }

// /*
// |--------------------------------------------------------------------------
// | QR FRAME (infinity + Together Forever)
// |--------------------------------------------------------------------------
// */
// const QR_FRAME = { left: 66, top: 414, size: 90 };
// const QR_SIZE = 64;

// function QrBlock({ qrCodeUrl }) {
//     return (
//         <>
//             {/* frame */}
//             <div
//                 className="absolute z-10"
//                 style={{
//                     left: QR_FRAME.left,
//                     top: QR_FRAME.top,
//                     width: QR_FRAME.size,
//                     height: QR_FRAME.size,
//                     border: "1.5px solid #9CC3F2",
//                     borderRadius: 9,
//                     background: "#fff",
//                 }}
//             />

//             {/* QR */}
//             <div
//                 className="absolute z-20 flex items-center justify-center bg-white"
//                 style={{
//                     left: QR_FRAME.left + (QR_FRAME.size - QR_SIZE) / 2,
//                     top: QR_FRAME.top + 10,
//                     width: QR_SIZE,
//                     height: QR_SIZE,
//                 }}
//             >
//                 {qrCodeUrl ? (
//                     <img
//                         src={qrCodeUrl}
//                         alt="Employee QR"
//                         className="w-full h-full object-contain"
//                     />
//                 ) : (
//                     <Loader2
//                         className="w-5 h-5 animate-spin"
//                         style={{ color: CARD_BLUE }}
//                     />
//                 )}
//             </div>

//             {/* infinity */}
//             <div
//                 className="absolute z-30 bg-white flex items-center justify-center"
//                 style={{
//                     left: QR_FRAME.left + 6,
//                     top: QR_FRAME.top - 6,
//                     width: 26,
//                     height: 12,
//                 }}
//             >
//                 <svg viewBox="0 0 40 18" width="24" height="11" fill="none">
//                     <path
//                         d="M20 9 C 14 -1, 2 -1, 2 9 C 2 19, 14 19, 20 9 C 26 -1, 38 -1, 38 9 C 38 19, 26 19, 20 9 Z"
//                         stroke={CARD_NAVY}
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                     />
//                 </svg>
//             </div>

//             {/* tagline */}
//             <div
//                 className="absolute z-30"
//                 style={{
//                     left: QR_FRAME.left + 36,
//                     top: QR_FRAME.top + QR_FRAME.size - 18,
//                     transform: "rotate(-5deg)",
//                     fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
//                     color: CARD_NAVY,
//                     background: "#fff",
//                     padding: "0 2px",
//                 }}
//             >
//                 <p
//                     className="text-[11px] font-semibold leading-[11px]"
//                     style={{ marginLeft: 8 }}
//                 >
//                     Together
//                 </p>
//                 <p className="text-[11px] font-semibold leading-[11px]">
//                     Forever
//                 </p>
//             </div>
//         </>
//     );
// }

// /*
// |--------------------------------------------------------------------------
// | ID CARD FRONT
// |--------------------------------------------------------------------------
// */
// function IDCardFront({
//     id,
//     employee,
//     fullName,
//     designation,
//     token,
//     qrCodeUrl,
// }) {
//     const nameSize = fullName.length > 22 ? 14 : fullName.length > 17 ? 16 : 18;
//     const email = employee?.email || "staff@4paysave.com";
//     const emailSize = email.length > 28 ? 10.5 : email.length > 24 ? 12 : 13;

//     return (
//         <div
//             id={id}
//             className="relative overflow-hidden select-none shrink-0 bg-white"
//             style={{
//                 width: `${CARD_WIDTH}px`,
//                 height: `${CARD_HEIGHT}px`,
//                 borderRadius: "10px",
//                 border: "1px solid #e5e7eb",
//                 boxShadow: "0 4px 16px rgba(15,23,42,.10)",
//                 fontFamily: CARD_FONT,
//             }}
//         >
//             <CornerShapes variant="front" />

//             {/* LOGO */}
//             <div
//                 className="absolute z-10 flex items-center"
//                 style={{ top: 19, left: 20, gap: 4 }}
//             >
//                 <BrandLogo />

//                 <div style={{ width: 100 }}>
//                     <BrandName />

//                     <div
//                         className="flex items-center mt-[5px]"
//                         style={{
//                             gap: 4,
//                             transform: "scaleX(0.72)",
//                             transformOrigin: "left center",
//                             width: 150,
//                         }}
//                     >
//                         <span
//                             className="block h-px shrink-0"
//                             style={{ width: 14, background: CARD_BLUE }}
//                         />
//                         <span
//                             className="font-medium uppercase whitespace-nowrap"
//                             style={{ fontSize: 6.5, color: "#222" }}
//                         >
//                             HI TECH SOLUTIONS PVT LTD
//                         </span>
//                     </div>
//                 </div>
//             </div>

//             {/* PHOTO */}
//             <div
//                 className="absolute z-10"
//                 style={{
//                     top: 94,
//                     left: (CARD_WIDTH - PHOTO_SIZE) / 2,
//                     width: PHOTO_SIZE,
//                     height: PHOTO_SIZE,
//                 }}
//             >
//                 <div
//                     className="absolute inset-0 bg-slate-100 overflow-hidden flex items-center justify-center"
//                     style={{ clipPath: PHOTO_CLIP }}
//                 >
//                     {employee?.avatar || employee?.photo ? (
//                         <img
//                             src={employee.avatar || employee.photo}
//                             alt={fullName}
//                             crossOrigin="anonymous"
//                             className="w-full h-full object-cover"
//                         />
//                     ) : (
//                         <span
//                             className="text-4xl font-bold"
//                             style={{ color: CARD_BLUE }}
//                         >
//                             {fullName.charAt(0).toUpperCase()}
//                         </span>
//                     )}
//                 </div>

//                 <svg
//                     viewBox={`0 0 ${PHOTO_SIZE} ${PHOTO_SIZE}`}
//                     width={PHOTO_SIZE}
//                     height={PHOTO_SIZE}
//                     className="absolute inset-0 pointer-events-none"
//                     fill="none"
//                     stroke={CARD_NAVY}
//                     strokeWidth={PHOTO_STROKE}
//                     strokeLinejoin="round"
//                 >
//                     <polygon points={PHOTO_SVG_POINTS} />
//                 </svg>
//             </div>

//             {/* NAME */}
//             <div
//                 className="absolute z-10 left-0 right-0 text-center px-3"
//                 style={{ top: 243 }}
//             >
//                 <h3
//                     className="font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-[26px]"
//                     style={{
//                         color: CARD_BLUE,
//                         fontSize: nameSize,
//                         letterSpacing: "-0.01em",
//                     }}
//                 >
//                     {fullName}
//                 </h3>
//             </div>

//             {/* DESIGNATION */}
//             <div
//                 className="absolute z-10 left-0 right-0 flex justify-center px-6"
//                 style={{ top: 277 }}
//             >
//                 <div
//                     className="flex items-center rounded-md max-w-full"
//                     style={{
//                         background: CARD_NAVY,
//                         height: 23,
//                         padding: "0 9px",
//                     }}
//                 >
//                     <span
//                         className="block font-bold text-white uppercase truncate leading-none"
//                         style={{ fontSize: 11.5, letterSpacing: "-0.01em" }}
//                     >
//                         {designation}
//                     </span>
//                 </div>
//             </div>

//             {/* DETAILS */}
//             <div
//                 className="absolute z-10"
//                 style={{
//                     top: 327,
//                     left: 32,
//                     right: 6,
//                     color: CARD_NAVY,
//                     fontSize: 13,
//                 }}
//             >
//                 <div
//                     className="grid items-center"
//                     style={{
//                         gridTemplateColumns: "56px 8px 1fr",
//                         height: 20.5,
//                     }}
//                 >
//                     <span className="font-bold">ID No</span>
//                     <span>:</span>
//                     <span className="uppercase">{token}</span>
//                 </div>

//                 <div
//                     className="grid items-center"
//                     style={{
//                         gridTemplateColumns: "56px 8px 1fr",
//                         height: 20.5,
//                     }}
//                 >
//                     <span className="font-bold">Email</span>
//                     <span>:</span>
//                     <span
//                         className="truncate"
//                         style={{ fontSize: emailSize }}
//                     >
//                         {email}
//                     </span>
//                 </div>

//                 <div
//                     className="grid items-center"
//                     style={{
//                         gridTemplateColumns: "56px 8px 1fr",
//                         height: 20.5,
//                     }}
//                 >
//                     <span className="font-bold">Phone</span>
//                     <span>:</span>
//                     <span>{employee?.phone || "+91 00000 00000"}</span>
//                 </div>
//             </div>

//             {/* QR */}
//             <QrBlock qrCodeUrl={qrCodeUrl} />
//         </div>
//     );
// }

// /*
// |--------------------------------------------------------------------------
// | ID CARD BACK
// |--------------------------------------------------------------------------
// */
// function IDCardBack({ id }) {
//     return (
//         <div
//             id={id}
//             className="relative flex flex-col justify-between overflow-hidden select-none shrink-0 bg-white"
//             style={{
//                 width: `${CARD_WIDTH}px`,
//                 height: `${CARD_HEIGHT}px`,
//                 borderRadius: "10px",
//                 border: "1px solid #e5e7eb",
//                 boxShadow: "0 4px 16px rgba(15,23,42,.10)",
//                 padding: "22px 24px 24px",
//                 fontFamily: CARD_FONT,
//             }}
//         >
//             <CornerShapes variant="back" />

//             <div className="relative z-10 space-y-4">
//                 <div className="flex items-center gap-1">
//                     <BrandLogo />

//                     <div style={{ width: 100 }}>
//                         <BrandName />
//                     </div>
//                 </div>

//                 <h4
//                     className="text-[12px] font-bold uppercase tracking-wider border-b border-slate-200 pb-1 mt-6"
//                     style={{ color: CARD_NAVY }}
//                 >
//                     Terms & Conditions
//                 </h4>

//                 <ul
//                     className="text-[10.5px] font-medium space-y-2.5 list-disc pl-4 pr-6"
//                     style={{ color: CARD_NAVY }}
//                 >
//                     <li>
//                         This card remains the exclusive property of{" "}
//                         {COMPANY_LEGAL}.
//                     </li>
//                     <li>This card is strictly non-transferable.</li>
//                     <li>
//                         Must be visibly worn at all times on workplace
//                         premises.
//                     </li>
//                     <li>
//                         If found, please return to Human Resources
//                         immediately.
//                     </li>
//                     <li>
//                         Scan the QR code on the front to view employee
//                         details.
//                     </li>
//                 </ul>
//             </div>

//             <div className="relative z-10 space-y-2 pb-14 text-center">
//                 <div className="flex flex-col items-center">
//                     <div className="w-36 border-b border-slate-500 mb-1" />

//                     <p
//                         className="text-[10.5px] font-semibold"
//                         style={{ color: CARD_NAVY }}
//                     >
//                         Authorized Signature
//                     </p>
//                 </div>

//                 <div
//                     className="text-[10px] font-semibold"
//                     style={{ color: CARD_BLUE }}
//                 >
//                     {COMPANY_NAME} {COMPANY_SUB}
//                 </div>

//                 <div
//                     className="text-[9.5px] font-semibold tracking-widest"
//                     style={{ color: CARD_NAVY }}
//                 >
//                     {COMPANY_WEB}
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default function EmployeeIDCardsPage() {
//     const [employees, setEmployees] = useState([]);
//     const [departmentsMap, setDepartmentsMap] = useState({});
//     const [designationsMap, setDesignationsMap] = useState({});

//     const [loading, setLoading] = useState(true);
//     const [search, setSearch] = useState("");

//     const [selectedEmp, setSelectedEmp] = useState(null);
//     const [isFlipped, setIsFlipped] = useState(false);

//     const [downloading, setDownloading] = useState(false);
//     const [pendingPrint, setPendingPrint] = useState(false);

//     // action menu (three line) + background download job
//     const [menu, setMenu] = useState(null); // { emp, top, left }
//     const [exportJob, setExportJob] = useState(null); // { emp, token, url }
//     const menuRef = useRef(null);

//     const [editingEmp, setEditingEmp] = useState(null);
//     const [saving, setSaving] = useState(false);

//     // { text: QR ka source text, url: generated data URL }
//     const [qrState, setQrState] = useState({ text: "", url: "" });

//     const [editFormData, setEditFormData] = useState({
//         name: "",
//         designation: "",
//         department: "",
//         phone: "",
//         email: "",
//         dob: "",
//         employeeId: "",
//         avatar: "",
//     });

//     const fileInputRef = useRef(null);

//     /*
//     |--------------------------------------------------------------------------
//     | LOCAL AVATAR MERGE
//     |--------------------------------------------------------------------------
//     */
//     const mergeWithLocalAvatars = (list) => {
//         try {
//             const stored = JSON.parse(
//                 localStorage.getItem("4ps_emp_avatars") || "{}"
//             );

//             return list.map((emp, index) => {
//                 const dbId = String(emp._id || emp.id || "");

//                 return {
//                     ...emp,
//                     employeeId: getSafeEmployeeId(emp, index),
//                     avatar: stored[dbId] || emp.avatar || emp.photo || "",
//                 };
//             });
//         } catch {
//             return list;
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | LOOKUPS
//     |--------------------------------------------------------------------------
//     */
//     const fetchLookupData = async () => {
//         try {
//             const [deptRes, desigRes] = await Promise.allSettled([
//                 api.get("/departments"),
//                 api.get("/designations"),
//             ]);

//             if (deptRes.status === "fulfilled") {
//                 const data = Array.isArray(deptRes.value?.data)
//                     ? deptRes.value.data
//                     : deptRes.value?.data?.departments || [];

//                 const map = {};

//                 data.forEach((item) => {
//                     const id = String(item._id || item.id || "");

//                     if (id) {
//                         map[id] =
//                             item.name ||
//                             item.title ||
//                             item.departmentName ||
//                             "General";
//                     }
//                 });

//                 setDepartmentsMap(map);
//             }

//             if (desigRes.status === "fulfilled") {
//                 const data = Array.isArray(desigRes.value?.data)
//                     ? desigRes.value.data
//                     : desigRes.value?.data?.designations || [];

//                 const map = {};

//                 data.forEach((item) => {
//                     const id = String(item._id || item.id || "");

//                     if (id) {
//                         map[id] =
//                             item.name ||
//                             item.title ||
//                             item.designationName ||
//                             "Executive";
//                     }
//                 });

//                 setDesignationsMap(map);
//             }
//         } catch (error) {
//             console.warn("Lookup data unavailable", error);
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | FETCH EMPLOYEES
//     |--------------------------------------------------------------------------
//     */
//     const fetchEmployees = async () => {
//         setLoading(true);

//         try {
//             await fetchLookupData();

//             const response = await api.get("/employees");

//             const data = Array.isArray(response?.data)
//                 ? response.data
//                 : Array.isArray(response?.data?.employees)
//                     ? response.data.employees
//                     : [];

//             setEmployees(mergeWithLocalAvatars(data));
//         } catch (error) {
//             console.error("Employee fetch failed:", error);

//             try {
//                 const localData = JSON.parse(
//                     localStorage.getItem("4ps_emp_data") || "[]"
//                 );

//                 if (Array.isArray(localData)) {
//                     setEmployees(mergeWithLocalAvatars(localData));
//                 }
//             } catch { }
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchEmployees();
//     }, []);

//     /*
//     |--------------------------------------------------------------------------
//     | DEPARTMENT
//     |--------------------------------------------------------------------------
//     */
//     const getDepartment = (emp) => {
//         const value = emp?.department;

//         if (!value) return "General";

//         if (typeof value === "object") {
//             return (
//                 value.name ||
//                 value.title ||
//                 value.departmentName ||
//                 "General"
//             );
//         }

//         const text = String(value).trim();

//         if (departmentsMap[text]) {
//             return departmentsMap[text];
//         }

//         if (isHexObjectId(text)) {
//             return "IT & Tech";
//         }

//         return text || "General";
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | DESIGNATION
//     |--------------------------------------------------------------------------
//     */
//     const getDesignation = (emp) => {
//         const value = emp?.designation;

//         if (!value) {
//             return emp?.role || "Executive";
//         }

//         if (typeof value === "object") {
//             return (
//                 value.name ||
//                 value.title ||
//                 value.designationName ||
//                 emp?.role ||
//                 "Executive"
//             );
//         }

//         const text = String(value).trim();

//         if (designationsMap[text]) {
//             return designationsMap[text];
//         }

//         if (isHexObjectId(text)) {
//             return emp?.role || "Executive";
//         }

//         return text || emp?.role || "Executive";
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | FILTER
//     |--------------------------------------------------------------------------
//     */
//     const filteredEmployees = useMemo(() => {
//         const query = search.toLowerCase().trim();

//         return employees.filter((emp, index) => {
//             const name = getEmployeeName(emp).toLowerCase();
//             const designation = getDesignation(emp).toLowerCase();
//             const department = getDepartment(emp).toLowerCase();
//             const employeeId = getSafeEmployeeId(emp, index).toLowerCase();

//             return (
//                 !query ||
//                 name.includes(query) ||
//                 designation.includes(query) ||
//                 department.includes(query) ||
//                 employeeId.includes(query)
//             );
//         });
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [employees, search, departmentsMap, designationsMap]);

//     /*
//     |--------------------------------------------------------------------------
//     | QR TEXT
//     |--------------------------------------------------------------------------
//     | Chhota payload = chhote card par bhi QR fast scan hota hai.
//     */
//     const buildQrText = (employee, token) => {
//         if (QR_VERIFY_URL) {
//             return `${QR_VERIFY_URL.replace(/\/+$/, "")}/${encodeURIComponent(
//                 token
//             )}`;
//         }

//         return [
//             getEmployeeName(employee),
//             token,
//             getDesignation(employee),
//             employee?.phone ? String(employee.phone) : null,
//         ]
//             .filter(Boolean)
//             .join("\n");
//     };

//     const selectedToken = selectedEmp
//         ? getSafeEmployeeId(selectedEmp, employees.indexOf(selectedEmp))
//         : "";

//     const selectedQrText = useMemo(
//         () => (selectedEmp ? buildQrText(selectedEmp, selectedToken) : ""),
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//         [selectedEmp, selectedToken, designationsMap, departmentsMap]
//     );

//     const qrReady = !!selectedQrText && qrState.text === selectedQrText;

//     /*
//     |--------------------------------------------------------------------------
//     | GENERATE QR
//     |--------------------------------------------------------------------------
//     */
//     useEffect(() => {
//         if (!selectedQrText) {
//             setQrState({ text: "", url: "" });
//             return;
//         }

//         let cancelled = false;

//         QRCode.toDataURL(selectedQrText, {
//             width: 512,
//             margin: 0,
//             errorCorrectionLevel: "L",
//             color: {
//                 dark: QR_COLOR,
//                 light: "#FFFFFF",
//             },
//         })
//             .then((url) => {
//                 if (!cancelled) {
//                     setQrState({ text: selectedQrText, url });
//                 }
//             })
//             .catch((error) => {
//                 console.error("QR generation failed:", error);
//             });

//         return () => {
//             cancelled = true;
//         };
//     }, [selectedQrText]);

//     /*
//     |--------------------------------------------------------------------------
//     | PRINT (QR ready hone ke baad hi print)
//     |--------------------------------------------------------------------------
//     */
//     const printEmployeeCard = (employee) => {
//         setSelectedEmp(employee);
//         setIsFlipped(false);
//         setPendingPrint(true);
//     };

//     useEffect(() => {
//         if (!pendingPrint || !qrReady) return;

//         const timer = setTimeout(async () => {
//             try {
//                 await document.fonts?.ready;
//             } catch { }

//             setPendingPrint(false);
//             window.print();
//         }, 350);

//         return () => clearTimeout(timer);
//     }, [pendingPrint, qrReady]);

//     /*
//     |--------------------------------------------------------------------------
//     | HIGH QUALITY DOWNLOAD
//     |--------------------------------------------------------------------------
//     */
//     const downloadCard = async (cardId, fileName) => {
//         const element = document.getElementById(cardId);

//         if (!element) {
//             console.error("Card element not found");
//             return;
//         }

//         setDownloading(true);

//         try {
//             try {
//                 await document.fonts?.ready;
//             } catch { }

//             await new Promise((resolve) => setTimeout(resolve, 300));

//             const dataUrl = await toPng(element, {
//                 cacheBust: true,
//                 pixelRatio: 4,
//                 backgroundColor: "#ffffff",
//                 width: CARD_WIDTH,
//                 height: CARD_HEIGHT,
//                 style: {
//                     margin: "0",
//                     transform: "none",
//                 },
//                 filter: (node) => {
//                     if (node?.dataset?.excludeDownload === "true") {
//                         return false;
//                     }

//                     return true;
//                 },
//             });

//             const link = document.createElement("a");

//             link.download = `${fileName}.png`;
//             link.href = dataUrl;

//             document.body.appendChild(link);
//             link.click();
//             link.remove();
//         } catch (error) {
//             console.error("High quality card download failed:", error);

//             alert(
//                 "ID card download nahi ho saka. Please image URL/CORS check karein."
//             );
//         } finally {
//             setDownloading(false);
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | EDIT
//     |--------------------------------------------------------------------------
//     */
//     const openEdit = (employee, event) => {
//         event?.stopPropagation();

//         const index = employees.indexOf(employee);
//         const token = getSafeEmployeeId(employee, index);

//         setEditingEmp(employee);

//         setEditFormData({
//             name: getEmployeeName(employee),
//             designation: getDesignation(employee),
//             department: getDepartment(employee),
//             phone: employee?.phone || "",
//             email: employee?.email || "",
//             dob: employee?.dob
//                 ? new Date(employee.dob).toISOString().split("T")[0]
//                 : "",
//             employeeId: token,
//             avatar: employee?.avatar || employee?.photo || "",
//         });
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | IMAGE UPLOAD
//     |--------------------------------------------------------------------------
//     */
//     const handleImageUpload = (event) => {
//         const file = event.target.files?.[0];

//         if (!file) return;

//         if (!file.type.startsWith("image/")) {
//             alert("Please select a valid image.");
//             return;
//         }

//         const reader = new FileReader();

//         reader.onloadend = () => {
//             setEditFormData((prev) => ({
//                 ...prev,
//                 avatar: reader.result,
//             }));
//         };

//         reader.readAsDataURL(file);
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | SAVE EMPLOYEE
//     |--------------------------------------------------------------------------
//     */
//     const saveEmployee = async (event) => {
//         event.preventDefault();

//         if (!editingEmp) return;

//         setSaving(true);

//         const dbId = String(editingEmp._id || editingEmp.id || "");

//         try {
//             const payload = {
//                 name: editFormData.name.trim(),
//                 designation: editFormData.designation.trim(),
//                 department: editFormData.department.trim(),
//                 phone: editFormData.phone.trim(),
//                 email: editFormData.email.trim(),
//                 dob: editFormData.dob,
//                 employeeId: editFormData.employeeId.trim().toUpperCase(),
//                 avatar: editFormData.avatar,
//             };

//             try {
//                 await api.put(`/employees/${dbId}`, payload);
//             } catch (error) {
//                 console.warn(
//                     "Backend update failed. Keeping local update.",
//                     error
//                 );
//             }

//             // Save avatar locally
//             try {
//                 const avatars = JSON.parse(
//                     localStorage.getItem("4ps_emp_avatars") || "{}"
//                 );

//                 if (payload.avatar) {
//                     avatars[dbId] = payload.avatar;

//                     localStorage.setItem(
//                         "4ps_emp_avatars",
//                         JSON.stringify(avatars)
//                     );
//                 }
//             } catch { }

//             setEmployees((prev) =>
//                 prev.map((item) =>
//                     String(item._id || item.id) === dbId
//                         ? { ...item, ...payload }
//                         : item
//                 )
//             );

//             if (
//                 selectedEmp &&
//                 String(selectedEmp._id || selectedEmp.id) === dbId
//             ) {
//                 setSelectedEmp((prev) => ({ ...prev, ...payload }));
//             }

//             setEditingEmp(null);
//         } catch (error) {
//             console.error("Employee update failed:", error);
//             alert("Employee update failed.");
//         } finally {
//             setSaving(false);
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | ACTION MENU (View / Edit / Download)
//     |--------------------------------------------------------------------------
//     */
//     const MENU_W = 176;
//     const MENU_H = 150;

//     const openMenu = (emp, event) => {
//         event.stopPropagation();

//         const rect = event.currentTarget.getBoundingClientRect();

//         let top = rect.bottom + 6;
//         if (top + MENU_H > window.innerHeight) {
//             top = Math.max(8, rect.top - MENU_H - 6);
//         }

//         const left = Math.min(
//             Math.max(8, rect.right - MENU_W),
//             window.innerWidth - MENU_W - 8
//         );

//         setMenu((prev) => (prev?.emp === emp ? null : { emp, top, left }));
//     };

//     useEffect(() => {
//         if (!menu) return;

//         const close = () => setMenu(null);

//         const onMouseDown = (e) => {
//             if (menuRef.current?.contains(e.target)) return;
//             if (e.target.closest?.("[data-menu-btn]")) return;
//             close();
//         };

//         const onKey = (e) => {
//             if (e.key === "Escape") close();
//         };

//         window.addEventListener("mousedown", onMouseDown);
//         window.addEventListener("touchstart", onMouseDown, { passive: true });
//         window.addEventListener("scroll", close, true);
//         window.addEventListener("resize", close);
//         window.addEventListener("keydown", onKey);

//         return () => {
//             window.removeEventListener("mousedown", onMouseDown);
//             window.removeEventListener("touchstart", onMouseDown);
//             window.removeEventListener("scroll", close, true);
//             window.removeEventListener("resize", close);
//             window.removeEventListener("keydown", onKey);
//         };
//     }, [menu]);

//     /*
//     |--------------------------------------------------------------------------
//     | DOWNLOAD DIRECTLY FROM MENU (card ko hidden render karke PNG banta hai)
//     |--------------------------------------------------------------------------
//     */
//     const startDownload = async (emp) => {
//         if (exportJob || downloading) return;

//         const token = getSafeEmployeeId(emp, employees.indexOf(emp));

//         try {
//             const url = await QRCode.toDataURL(buildQrText(emp, token), {
//                 width: 512,
//                 margin: 0,
//                 errorCorrectionLevel: "L",
//                 color: { dark: QR_COLOR, light: "#FFFFFF" },
//             });

//             setExportJob({ emp, token, url });
//         } catch (error) {
//             console.error("QR generation failed:", error);
//             alert("QR generate nahi ho saka.");
//         }
//     };

//     useEffect(() => {
//         if (!exportJob) return;

//         let cancelled = false;

//         const timer = setTimeout(async () => {
//             if (cancelled) return;

//             await downloadCard(
//                 "export-card-front",
//                 `${getEmployeeName(exportJob.emp).replace(/\s+/g, "_")}_ID_Card`
//             );

//             if (!cancelled) setExportJob(null);
//         }, 450);

//         return () => {
//             cancelled = true;
//             clearTimeout(timer);
//         };
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [exportJob]);

//     /*
//     |--------------------------------------------------------------------------
//     | LOADING
//     |--------------------------------------------------------------------------
//     */
//     if (loading) {
//         return (
//             <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-500">
//                 <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />

//                 <p className="text-sm font-semibold">
//                     Loading Official ID Cards...
//                 </p>
//             </div>
//         );
//     }

//     return (
//         <div className="w-full space-y-5 antialiased font-sans text-slate-900 pb-10">
//             {/* FONTS + PRINT CSS */}
//             <style jsx global>{`
//                 @import url("https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap");

//                 @page {
//                     size: auto;
//                     margin: 0;
//                 }

//                 @media print {
//                     html,
//                     body {
//                         width: 100%;
//                         height: 100%;
//                         margin: 0 !important;
//                         padding: 0 !important;
//                         background: white !important;
//                     }

//                     body * {
//                         visibility: hidden !important;
//                     }

//                     #printable-card-front,
//                     #printable-card-front *,
//                     #printable-card-back,
//                     #printable-card-back * {
//                         visibility: visible !important;
//                         -webkit-print-color-adjust: exact !important;
//                         print-color-adjust: exact !important;
//                     }

//                     #printable-card-front,
//                     #printable-card-back {
//                         position: fixed !important;
//                         left: 50% !important;
//                         top: 50% !important;
//                         transform: translate(-50%, -50%) !important;
//                         margin: 0 !important;
//                         box-shadow: none !important;
//                     }

//                     .no-print {
//                         display: none !important;
//                     }
//                 }
//             `}</style>

//             {/* HEADER */}
//             <div className="no-print bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
//                 <div>
//                     <div className="flex items-center gap-2">
//                         <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
//                             Employee Directory & Badges
//                         </span>

//                         <span className="text-xs text-slate-400 font-medium">
//                             CR80 Standard
//                         </span>
//                     </div>

//                     <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
//                         {COMPANY_LEGAL}
//                     </h1>

//                     <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
//                         Manage employee badges, preview ID cards and export
//                         high-resolution cards.
//                     </p>
//                 </div>

//                 <div className="relative w-full md:w-80">
//                     <Search
//                         size={16}
//                         className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
//                     />

//                     <input
//                         value={search}
//                         onChange={(e) => setSearch(e.target.value)}
//                         placeholder="Search name, ID, role or dept..."
//                         className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-600"
//                     />

//                     {search && (
//                         <button
//                             type="button"
//                             onClick={() => setSearch("")}
//                             className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
//                         >
//                             <X size={14} />
//                         </button>
//                     )}
//                 </div>
//             </div>

//             {/* EMPLOYEE TABLE */}
//             <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
//                 <div className="hidden md:block overflow-x-auto">
//                     <table className="w-full text-left min-w-[900px]">
//                         <thead>
//                             <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
//                                 <th className="py-3.5 px-6">Employee</th>
//                                 <th className="py-3.5 px-5">Employee ID</th>
//                                 <th className="py-3.5 px-5">Designation</th>
//                                 <th className="py-3.5 px-5">Department</th>
//                                 <th className="py-3.5 px-5">Contact</th>
//                                 <th className="py-3.5 px-6 text-right">Action</th>
//                             </tr>
//                         </thead>

//                         <tbody className="divide-y divide-slate-100">
//                             {filteredEmployees.map((emp, index) => {
//                                 const name = getEmployeeName(emp);
//                                 const designation = getDesignation(emp);
//                                 const department = getDepartment(emp);
//                                 const token = getSafeEmployeeId(emp, index);

//                                 return (
//                                     <tr
//                                         key={emp._id || emp.id || index}
//                                         className="hover:bg-slate-50 transition"
//                                     >
//                                         <td className="py-3.5 px-6">
//                                             <div className="flex items-center gap-3">
//                                                 <div className="w-10 h-10 rounded-full bg-slate-100 border overflow-hidden flex items-center justify-center">
//                                                     {emp.avatar || emp.photo ? (
//                                                         <img
//                                                             src={emp.avatar || emp.photo}
//                                                             alt={name}
//                                                             className="w-full h-full object-cover"
//                                                         />
//                                                     ) : (
//                                                         <span className="font-bold text-blue-600">
//                                                             {name.charAt(0).toUpperCase()}
//                                                         </span>
//                                                     )}
//                                                 </div>

//                                                 <div className="min-w-0">
//                                                     <p className="font-bold text-slate-900 truncate">
//                                                         {name}
//                                                     </p>

//                                                     <p className="text-[11px] text-slate-400 truncate">
//                                                         {emp.email || "No email"}
//                                                     </p>
//                                                 </div>
//                                             </div>
//                                         </td>

//                                         <td className="py-3.5 px-5">
//                                             <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-200">
//                                                 {token}
//                                             </span>
//                                         </td>

//                                         <td className="py-3.5 px-5 font-semibold">
//                                             {designation}
//                                         </td>

//                                         <td className="py-3.5 px-5">
//                                             <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs">
//                                                 {department}
//                                             </span>
//                                         </td>

//                                         <td className="py-3.5 px-5 text-xs font-mono">
//                                             {emp.phone || "—"}
//                                         </td>

//                                         <td className="py-3.5 px-6 text-right">
//                                             <button
//                                                 type="button"
//                                                 data-menu-btn
//                                                 aria-label="Actions"
//                                                 onClick={(e) => openMenu(emp, e)}
//                                                 className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition"
//                                             >
//                                                 <MoreVertical size={15} />
//                                             </button>
//                                         </td>
//                                     </tr>
//                                 );
//                             })}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* MOBILE */}
//                 <div className="md:hidden divide-y">
//                     {filteredEmployees.map((emp, index) => {
//                         const name = getEmployeeName(emp);
//                         const designation = getDesignation(emp);
//                         const department = getDepartment(emp);
//                         const token = getSafeEmployeeId(emp, index);

//                         return (
//                             <div
//                                 key={emp._id || emp.id || index}
//                                 className="p-4 space-y-3"
//                             >
//                                 <div className="flex justify-between gap-3">
//                                     <div className="flex items-center gap-3">
//                                         <div className="w-11 h-11 rounded-full bg-slate-100 border overflow-hidden flex items-center justify-center">
//                                             {emp.avatar || emp.photo ? (
//                                                 <img
//                                                     src={emp.avatar || emp.photo}
//                                                     alt={name}
//                                                     className="w-full h-full object-cover"
//                                                 />
//                                             ) : (
//                                                 <span className="font-bold text-blue-600">
//                                                     {name.charAt(0).toUpperCase()}
//                                                 </span>
//                                             )}
//                                         </div>

//                                         <div>
//                                             <h4 className="font-bold text-sm">{name}</h4>

//                                             <p className="text-xs text-slate-500">
//                                                 {designation}
//                                             </p>
//                                         </div>
//                                     </div>

//                                     <span className="h-fit px-2 py-1 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded">
//                                         {token}
//                                     </span>
//                                 </div>

//                                 <div className="bg-slate-50 rounded-lg p-2 text-xs">
//                                     <span className="text-slate-400">Department:</span>{" "}
//                                     <b>{department}</b>
//                                 </div>

//                                 <div className="text-xs space-y-1">
//                                     <div className="flex gap-2">
//                                         <Mail size={13} />
//                                         <span>{emp.email || "No email"}</span>
//                                     </div>

//                                     <div className="flex gap-2">
//                                         <Phone size={13} />
//                                         <span>{emp.phone || "No phone"}</span>
//                                     </div>
//                                 </div>

//                                 <div className="flex gap-2 pt-2 border-t">
//                                     <button
//                                         type="button"
//                                         onClick={() => {
//                                             setSelectedEmp(emp);
//                                             setIsFlipped(false);
//                                         }}
//                                         className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
//                                     >
//                                         <IdCard size={14} />
//                                         Show ID Card
//                                     </button>

//                                     <button
//                                         type="button"
//                                         data-menu-btn
//                                         aria-label="Actions"
//                                         onClick={(e) => openMenu(emp, e)}
//                                         className="px-3 bg-slate-100 rounded-xl"
//                                     >
//                                         <Menu size={16} />
//                                     </button>
//                                 </div>
//                             </div>
//                         );
//                     })}
//                 </div>

//                 {!filteredEmployees.length && (
//                     <div className="p-12 text-center text-slate-500 text-sm">
//                         No employee found.
//                     </div>
//                 )}
//             </div>

//             {/* ACTION MENU */}
//             {menu && (
//                 <div
//                     ref={menuRef}
//                     className="no-print fixed z-[70] bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 overflow-hidden"
//                     style={{ top: menu.top, left: menu.left, width: MENU_W }}
//                 >
//                     <button
//                         type="button"
//                         onClick={() => {
//                             setSelectedEmp(menu.emp);
//                             setIsFlipped(false);
//                             setMenu(null);
//                         }}
//                         className="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left"
//                     >
//                         <Eye size={15} />
//                         View Card
//                     </button>

//                     <button
//                         type="button"
//                         onClick={() => {
//                             openEdit(menu.emp);
//                             setMenu(null);
//                         }}
//                         className="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left"
//                     >
//                         <Edit3 size={15} />
//                         Edit
//                     </button>

//                     <button
//                         type="button"
//                         disabled={!!exportJob || downloading}
//                         onClick={() => {
//                             const emp = menu.emp;
//                             setMenu(null);
//                             startDownload(emp);
//                         }}
//                         className="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 text-left disabled:opacity-50"
//                     >
//                         <Download size={15} />
//                         Download HD PNG
//                     </button>
//                 </div>
//             )}

//             {/* DOWNLOAD PROGRESS */}
//             {exportJob && (
//                 <div className="no-print fixed bottom-5 right-5 z-[80] flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xl">
//                     <Loader2 size={14} className="animate-spin" />
//                     Generating HD Card...
//                 </div>
//             )}

//             {/* HIDDEN CARD FOR MENU DOWNLOAD */}
//             {exportJob && (
//                 <div
//                     aria-hidden="true"
//                     className="no-print"
//                     style={{
//                         position: "fixed",
//                         left: -10000,
//                         top: 0,
//                         pointerEvents: "none",
//                     }}
//                 >
//                     <IDCardFront
//                         id="export-card-front"
//                         employee={exportJob.emp}
//                         fullName={getEmployeeName(exportJob.emp)}
//                         designation={getDesignation(exportJob.emp)}
//                         token={exportJob.token}
//                         qrCodeUrl={exportJob.url}
//                     />
//                 </div>
//             )}

//             {/* CARD PREVIEW MODAL */}
//             {selectedEmp && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
//                     <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] overflow-y-auto">
//                         <button
//                             type="button"
//                             onClick={() => {
//                                 setSelectedEmp(null);
//                                 setPendingPrint(false);
//                             }}
//                             className="no-print absolute top-3 right-3 z-30 p-2 bg-slate-100 rounded-full"
//                         >
//                             <X size={15} />
//                         </button>

//                         {/* CARD */}
//                         <div className="p-5 sm:p-8 bg-slate-50 flex justify-center items-center">
//                             {!isFlipped ? (
//                                 <IDCardFront
//                                     id="printable-card-front"
//                                     employee={selectedEmp}
//                                     fullName={getEmployeeName(selectedEmp)}
//                                     designation={getDesignation(selectedEmp)}
//                                     token={selectedToken}
//                                     qrCodeUrl={qrReady ? qrState.url : ""}
//                                 />
//                             ) : (
//                                 <IDCardBack id="printable-card-back" />
//                             )}
//                         </div>

//                         {/* ACTIONS */}
//                         <div className="no-print p-5 sm:p-7 flex-1 flex flex-col justify-between gap-5">
//                             <div className="space-y-4">
//                                 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
//                                     <CheckCircle2 size={13} />
//                                     Ready for Print / Export
//                                 </div>

//                                 <div>
//                                     <h3 className="text-lg font-black">
//                                         {getEmployeeName(selectedEmp)}
//                                     </h3>

//                                     <p className="text-xs font-bold text-blue-600 font-mono">
//                                         {selectedToken} •{" "}
//                                         {getDesignation(selectedEmp)}
//                                     </p>
//                                 </div>

//                                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
//                                     <div className="flex gap-2">
//                                         <ShieldCheck size={15} className="shrink-0" />

//                                         <span>
//                                             {QR_VERIFY_URL
//                                                 ? "QR scan karne par employee verify page khulega."
//                                                 : "QR scan karne par employee ke details seedha dikhenge. Link ya internet ki zarurat nahi."}
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <button
//                                     type="button"
//                                     onClick={() => setIsFlipped((value) => !value)}
//                                     className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex justify-center items-center gap-2"
//                                 >
//                                     <FlipHorizontal size={14} />
//                                     Flip to {isFlipped ? "Front" : "Back / Terms"}
//                                 </button>
//                             </div>

//                             <div className="border-t pt-4 space-y-2">
//                                 <div className="flex gap-2">
//                                     <button
//                                         type="button"
//                                         disabled={pendingPrint}
//                                         onClick={() => printEmployeeCard(selectedEmp)}
//                                         className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
//                                     >
//                                         {pendingPrint ? (
//                                             <Loader2 size={14} className="animate-spin" />
//                                         ) : (
//                                             <Printer size={14} />
//                                         )}
//                                         Print Badge
//                                     </button>

//                                     <button
//                                         type="button"
//                                         onClick={() => openEdit(selectedEmp)}
//                                         className="px-4 py-2.5 bg-slate-100 rounded-xl text-xs font-bold"
//                                     >
//                                         Edit
//                                     </button>
//                                 </div>

//                                 <button
//                                     type="button"
//                                     disabled={downloading || !qrReady}
//                                     onClick={() =>
//                                         downloadCard(
//                                             !isFlipped
//                                                 ? "printable-card-front"
//                                                 : "printable-card-back",
//                                             `${getEmployeeName(selectedEmp).replace(
//                                                 /\s+/g,
//                                                 "_"
//                                             )}_ID_Card${isFlipped ? "_Back" : ""}`
//                                         )
//                                     }
//                                     className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
//                                 >
//                                     {downloading ? (
//                                         <>
//                                             <Loader2 size={14} className="animate-spin" />
//                                             Generating HD Card...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <Download size={14} />
//                                             Download HD PNG
//                                         </>
//                                     )}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* EDIT MODAL */}
//             {editingEmp && (
//                 <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
//                     <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden">
//                         <div className="p-5 border-b flex items-center justify-between">
//                             <div>
//                                 <h3 className="font-black">Edit Badge Information</h3>

//                                 <p className="text-xs text-slate-500">
//                                     Update employee ID card details.
//                                 </p>
//                             </div>

//                             <button
//                                 type="button"
//                                 onClick={() => setEditingEmp(null)}
//                                 className="p-2 bg-slate-100 rounded-full"
//                             >
//                                 <X size={15} />
//                             </button>
//                         </div>

//                         <form
//                             onSubmit={saveEmployee}
//                             className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-90px)]"
//                         >
//                             {/* PHOTO */}
//                             <div className="flex flex-col items-center">
//                                 <div className="relative w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
//                                     {editFormData.avatar ? (
//                                         <img
//                                             src={editFormData.avatar}
//                                             alt="Preview"
//                                             className="w-full h-full object-cover"
//                                         />
//                                     ) : (
//                                         <Camera className="text-slate-400" />
//                                     )}

//                                     <button
//                                         type="button"
//                                         onClick={() => fileInputRef.current?.click()}
//                                         className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center"
//                                     >
//                                         <Upload size={16} />
//                                     </button>
//                                 </div>

//                                 <input
//                                     ref={fileInputRef}
//                                     type="file"
//                                     accept="image/*"
//                                     onChange={handleImageUpload}
//                                     className="hidden"
//                                 />

//                                 <button
//                                     type="button"
//                                     onClick={() => fileInputRef.current?.click()}
//                                     className="mt-2 text-xs font-bold text-blue-600"
//                                 >
//                                     Upload Square Headshot
//                                 </button>
//                             </div>

//                             <div className="grid sm:grid-cols-2 gap-3">
//                                 {[
//                                     ["Full Name", "name", true],
//                                     ["Employee ID", "employeeId", true],
//                                     ["Designation", "designation", true],
//                                     ["Department", "department", false],
//                                     ["Phone", "phone", false],
//                                     ["Email", "email", false],
//                                 ].map(([label, field, required]) => (
//                                     <div key={field}>
//                                         <label className="block text-xs font-bold text-slate-700 mb-1">
//                                             {label}
//                                         </label>

//                                         <input
//                                             type={field === "email" ? "email" : "text"}
//                                             required={required}
//                                             value={editFormData[field]}
//                                             onChange={(e) =>
//                                                 setEditFormData((prev) => ({
//                                                     ...prev,
//                                                     [field]: e.target.value,
//                                                 }))
//                                             }
//                                             className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600"
//                                         />
//                                     </div>
//                                 ))}
//                             </div>

//                             <div className="border-t pt-4 flex justify-end gap-2">
//                                 <button
//                                     type="button"
//                                     onClick={() => setEditingEmp(null)}
//                                     className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold"
//                                 >
//                                     Cancel
//                                 </button>

//                                 <button
//                                     type="submit"
//                                     disabled={saving}
//                                     className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
//                                 >
//                                     {saving ? (
//                                         <Loader2 size={14} className="animate-spin" />
//                                     ) : (
//                                         <Save size={14} />
//                                     )}

//                                     {saving ? "Saving..." : "Save Changes"}
//                                 </button>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }






// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import {
//     Printer,
//     Search,
//     X,
//     CheckCircle2,
//     Loader2,
//     Edit3,
//     Upload,
//     Camera,
//     Save,
//     FlipHorizontal,
//     Download,
//     Eye,
//     Mail,
//     Phone,
//     IdCard,
//     ShieldCheck,
// } from "lucide-react";

// import api from "@/lib/api";
// import { toPng } from "html-to-image";
// import QRCode from "qrcode";

// const COMPANY_NAME = "FourPaysave";
// const COMPANY_SUB = "HI Tech Solutions";
// const COMPANY_LEGAL = "FOUR PAYSAVE HI TECH SOLUTIONS PVT LTD";
// const COMPANY_WEB = "4PAYSAVE.COM";

// /*
// |--------------------------------------------------------------------------
// | ID CARD SIZE + COLORS
// |--------------------------------------------------------------------------
// */
// const CARD_WIDTH = 300;
// const CARD_HEIGHT = 500;

// const CARD_BLUE = "#0A66FF";
// const CARD_NAVY = "#14145A";
// const CARD_FONT = "Poppins, Inter, 'Segoe UI', system-ui, sans-serif";

// const OCTAGON_CLIP =
//     "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";

// const HEX_CLIP =
//     "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

// const isHexObjectId = (value) =>
//     typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value.trim());

// /*
// |--------------------------------------------------------------------------
// | Employee ID
// |--------------------------------------------------------------------------
// */
// const getSafeEmployeeId = (employee, index = 0) => {
//     const candidates = [
//         employee?.employeeId,
//         employee?.empId,
//         employee?.employeeCode,
//         employee?.code,
//     ];

//     const valid = candidates.find(
//         (value) =>
//             value !== undefined &&
//             value !== null &&
//             String(value).trim() &&
//             !isHexObjectId(String(value).trim())
//     );

//     if (valid) {
//         return String(valid).trim().toUpperCase();
//     }

//     return `EMP${String(index + 1).padStart(4, "0")}`;
// };

// /*
// |--------------------------------------------------------------------------
// | Name
// |--------------------------------------------------------------------------
// */
// const getEmployeeName = (employee) => {
//     if (!employee) return "Personnel Name";

//     if (employee.name?.trim()) {
//         return employee.name.trim();
//     }

//     const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

//     return name || "Personnel Name";
// };

// /*
// |--------------------------------------------------------------------------
// | BLUE CORNER SHAPES (front + back)
// |--------------------------------------------------------------------------
// */
// function CornerShapes({ variant = "front" }) {
//     return (
//         <svg
//             viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
//             width={CARD_WIDTH}
//             height={CARD_HEIGHT}
//             className="absolute inset-0 pointer-events-none z-0"
//             fill={CARD_BLUE}
//             stroke={CARD_BLUE}
//             strokeWidth="14"
//             strokeLinejoin="round"
//         >
//             {/* top right - big */}
//             <polygon points="200,-12 312,-12 312,122" />

//             {/* right side - small block (front only) */}
//             {variant === "front" && <polygon points="252,140 312,130 312,166" />}

//             {/* bottom left */}
//             <polygon points="-12,402 -12,512 100,512" />

//             {/* bottom right */}
//             <polygon points="312,408 312,512 190,512" />
//         </svg>
//     );
// }

// function BrandLogo({ size = 34 }) {
//     return (
//         <div
//             className="flex items-center justify-center shrink-0"
//             style={{
//                 width: size,
//                 height: size + 4,
//                 clipPath: HEX_CLIP,
//                 background: `linear-gradient(135deg, ${CARD_BLUE}, #22B8F0)`,
//             }}
//         >
//             <span
//                 className="text-white font-extrabold leading-none"
//                 style={{ fontSize: size * 0.5 }}
//             >
//                 P
//             </span>
//         </div>
//     );
// }

// /*
// |--------------------------------------------------------------------------
// | ID CARD FRONT
// |--------------------------------------------------------------------------
// */
// function IDCardFront({
//     id,
//     employee,
//     fullName,
//     designation,
//     token,
//     qrCodeUrl,
// }) {
//     const nameSize = fullName.length > 20 ? 14 : fullName.length > 16 ? 16 : 18;

//     return (
//         <div
//             id={id}
//             className="relative overflow-hidden select-none shrink-0 bg-white"
//             style={{
//                 width: `${CARD_WIDTH}px`,
//                 height: `${CARD_HEIGHT}px`,
//                 borderRadius: "10px",
//                 border: "1px solid #e5e7eb",
//                 boxShadow: "0 4px 16px rgba(15,23,42,.10)",
//                 fontFamily: CARD_FONT,
//             }}
//         >
//             <CornerShapes variant="front" />

//             {/* LOGO */}
//             <div
//                 className="absolute z-10 flex items-center gap-2"
//                 style={{ top: 18, left: 20 }}
//             >
//                 <BrandLogo />

//                 <div className="leading-none">
//                     <p className="text-[16px] font-extrabold tracking-tight whitespace-nowrap">
//                         <span style={{ color: CARD_NAVY }}>FOUR</span>{" "}
//                         <span style={{ color: CARD_BLUE }}>PAYSAVE</span>
//                     </p>

//                     <div className="flex items-center gap-1 mt-[4px]">
//                         <span className="block w-2 h-px bg-slate-400" />
//                         <span className="text-[5.5px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
//                             HI TECH SOLUTIONS PVT LTD
//                         </span>
//                     </div>
//                 </div>
//             </div>

//             {/* PHOTO */}
//             <div
//                 className="absolute z-10"
//                 style={{
//                     top: 94,
//                     left: (CARD_WIDTH - 148) / 2,
//                     width: 148,
//                     height: 148,
//                     padding: 7,
//                     clipPath: OCTAGON_CLIP,
//                     background: CARD_NAVY,
//                 }}
//             >
//                 <div
//                     style={{
//                         width: "100%",
//                         height: "100%",
//                         padding: 3,
//                         background: "#fff",
//                         clipPath: OCTAGON_CLIP,
//                     }}
//                 >
//                     <div
//                         className="w-full h-full bg-slate-100 overflow-hidden flex items-center justify-center"
//                         style={{ clipPath: OCTAGON_CLIP }}
//                     >
//                         {employee?.avatar || employee?.photo ? (
//                             <img
//                                 src={employee.avatar || employee.photo}
//                                 alt={fullName}
//                                 crossOrigin="anonymous"
//                                 className="w-full h-full object-cover"
//                             />
//                         ) : (
//                             <span
//                                 className="text-4xl font-bold"
//                                 style={{ color: CARD_BLUE }}
//                             >
//                                 {fullName.charAt(0).toUpperCase()}
//                             </span>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* NAME */}
//             <div
//                 className="absolute z-10 left-0 right-0 text-center px-3"
//                 style={{ top: 247 }}
//             >
//                 <h3
//                     className="font-bold uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis leading-[26px]"
//                     style={{ color: CARD_BLUE, fontSize: nameSize }}
//                 >
//                     {fullName}
//                 </h3>
//             </div>

//             {/* DESIGNATION */}
//             <div
//                 className="absolute z-10 left-0 right-0 flex justify-center px-6"
//                 style={{ top: 280 }}
//             >
//                 <div
//                     className="px-4 py-[5px] rounded-md max-w-full"
//                     style={{ background: CARD_NAVY }}
//                 >
//                     <span className="block text-[10px] font-bold text-white uppercase tracking-wider truncate leading-tight">
//                         {designation}
//                     </span>
//                 </div>
//             </div>

//             {/* DETAILS */}
//             <div
//                 className="absolute z-10 space-y-[5px] text-[11.5px]"
//                 style={{ top: 318, left: 38, right: 14, color: CARD_NAVY }}
//             >
//                 <div className="grid grid-cols-[50px_10px_1fr] items-center leading-[17px]">
//                     <span className="font-semibold">ID No</span>
//                     <span>:</span>
//                     <span className="font-medium uppercase">{token}</span>
//                 </div>

//                 <div className="grid grid-cols-[50px_10px_1fr] items-center leading-[17px]">
//                     <span className="font-semibold">Email</span>
//                     <span>:</span>
//                     <span className="font-medium truncate">
//                         {employee?.email || "staff@4paysave.com"}
//                     </span>
//                 </div>

//                 <div className="grid grid-cols-[50px_10px_1fr] items-center leading-[17px]">
//                     <span className="font-semibold">Phone</span>
//                     <span>:</span>
//                     <span className="font-medium">
//                         {employee?.phone || "+91 00000 00000"}
//                     </span>
//                 </div>
//             </div>

//             {/* QR */}
//             <div
//                 className="absolute z-10 bg-white flex items-center justify-center"
//                 style={{ left: 84, bottom: 16, width: 96, height: 96 }}
//             >
//                 {qrCodeUrl ? (
//                     <img
//                         src={qrCodeUrl}
//                         alt="Employee QR"
//                         className="w-full h-full object-contain"
//                     />
//                 ) : (
//                     <Loader2
//                         className="w-5 h-5 animate-spin"
//                         style={{ color: CARD_BLUE }}
//                     />
//                 )}
//             </div>

//             {/* TAGLINE */}
//             <div
//                 className="absolute z-10"
//                 style={{
//                     left: 188,
//                     bottom: 26,
//                     transform: "rotate(-6deg)",
//                     fontFamily: "Georgia, 'Times New Roman', serif",
//                 }}
//             >
//                 <p className="text-[11px] italic text-slate-500 leading-tight">
//                     Together
//                 </p>
//                 <p className="text-[11px] italic text-slate-500 leading-tight">
//                     Forever
//                 </p>
//             </div>
//         </div>
//     );
// }

// /*
// |--------------------------------------------------------------------------
// | ID CARD BACK
// |--------------------------------------------------------------------------
// */
// function IDCardBack({ id }) {
//     return (
//         <div
//             id={id}
//             className="relative flex flex-col justify-between overflow-hidden select-none shrink-0 bg-white"
//             style={{
//                 width: `${CARD_WIDTH}px`,
//                 height: `${CARD_HEIGHT}px`,
//                 borderRadius: "10px",
//                 border: "1px solid #e5e7eb",
//                 boxShadow: "0 4px 16px rgba(15,23,42,.10)",
//                 padding: "22px 24px 24px",
//                 fontFamily: CARD_FONT,
//             }}
//         >
//             <CornerShapes variant="back" />

//             <div className="relative z-10 space-y-4">
//                 <div className="flex items-center gap-2">
//                     <BrandLogo size={30} />

//                     <p className="text-[14px] font-extrabold tracking-tight whitespace-nowrap">
//                         <span style={{ color: CARD_NAVY }}>FOUR</span>{" "}
//                         <span style={{ color: CARD_BLUE }}>PAYSAVE</span>
//                     </p>
//                 </div>

//                 <h4
//                     className="text-[12px] font-bold uppercase tracking-wider border-b border-slate-200 pb-1 mt-6"
//                     style={{ color: CARD_NAVY }}
//                 >
//                     Terms & Conditions
//                 </h4>

//                 <ul
//                     className="text-[10.5px] font-medium space-y-2.5 list-disc pl-4 pr-6"
//                     style={{ color: CARD_NAVY }}
//                 >
//                     <li>
//                         This card remains the exclusive property of{" "}
//                         {COMPANY_LEGAL}.
//                     </li>
//                     <li>This card is strictly non-transferable.</li>
//                     <li>
//                         Must be visibly worn at all times on workplace
//                         premises.
//                     </li>
//                     <li>
//                         If found, please return to Human Resources
//                         immediately.
//                     </li>
//                     <li>
//                         Scan the QR code on the front to view employee
//                         details.
//                     </li>
//                 </ul>
//             </div>

//             <div className="relative z-10 space-y-2 pb-14 text-center">
//                 <div className="flex flex-col items-center">
//                     <div className="w-36 border-b border-slate-500 mb-1" />

//                     <p
//                         className="text-[10.5px] font-semibold"
//                         style={{ color: CARD_NAVY }}
//                     >
//                         Authorized Signature
//                     </p>
//                 </div>

//                 <div
//                     className="text-[10px] font-semibold"
//                     style={{ color: CARD_BLUE }}
//                 >
//                     {COMPANY_NAME} {COMPANY_SUB}
//                 </div>

//                 <div
//                     className="text-[9.5px] font-semibold tracking-widest"
//                     style={{ color: CARD_NAVY }}
//                 >
//                     {COMPANY_WEB}
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default function EmployeeIDCardsPage() {
//     const [employees, setEmployees] = useState([]);
//     const [departmentsMap, setDepartmentsMap] = useState({});
//     const [designationsMap, setDesignationsMap] = useState({});

//     const [loading, setLoading] = useState(true);
//     const [search, setSearch] = useState("");

//     const [selectedEmp, setSelectedEmp] = useState(null);
//     const [isFlipped, setIsFlipped] = useState(false);

//     const [downloading, setDownloading] = useState(false);

//     const [editingEmp, setEditingEmp] = useState(null);
//     const [saving, setSaving] = useState(false);

//     const [qrCodeUrl, setQrCodeUrl] = useState("");

//     const [editFormData, setEditFormData] = useState({
//         name: "",
//         designation: "",
//         department: "",
//         phone: "",
//         email: "",
//         dob: "",
//         employeeId: "",
//         avatar: "",
//     });

//     const fileInputRef = useRef(null);

//     /*
//     |--------------------------------------------------------------------------
//     | LOCAL AVATAR MERGE
//     |--------------------------------------------------------------------------
//     */
//     const mergeWithLocalAvatars = (list) => {
//         try {
//             const stored = JSON.parse(
//                 localStorage.getItem("4ps_emp_avatars") || "{}"
//             );

//             return list.map((emp, index) => {
//                 const dbId = String(emp._id || emp.id || "");

//                 return {
//                     ...emp,
//                     employeeId: getSafeEmployeeId(emp, index),
//                     avatar: stored[dbId] || emp.avatar || emp.photo || "",
//                 };
//             });
//         } catch {
//             return list;
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | LOOKUPS
//     |--------------------------------------------------------------------------
//     */
//     const fetchLookupData = async () => {
//         try {
//             const [deptRes, desigRes] = await Promise.allSettled([
//                 api.get("/departments"),
//                 api.get("/designations"),
//             ]);

//             if (deptRes.status === "fulfilled") {
//                 const data = Array.isArray(deptRes.value?.data)
//                     ? deptRes.value.data
//                     : deptRes.value?.data?.departments || [];

//                 const map = {};

//                 data.forEach((item) => {
//                     const id = String(item._id || item.id || "");

//                     if (id) {
//                         map[id] =
//                             item.name ||
//                             item.title ||
//                             item.departmentName ||
//                             "General";
//                     }
//                 });

//                 setDepartmentsMap(map);
//             }

//             if (desigRes.status === "fulfilled") {
//                 const data = Array.isArray(desigRes.value?.data)
//                     ? desigRes.value.data
//                     : desigRes.value?.data?.designations || [];

//                 const map = {};

//                 data.forEach((item) => {
//                     const id = String(item._id || item.id || "");

//                     if (id) {
//                         map[id] =
//                             item.name ||
//                             item.title ||
//                             item.designationName ||
//                             "Executive";
//                     }
//                 });

//                 setDesignationsMap(map);
//             }
//         } catch (error) {
//             console.warn("Lookup data unavailable", error);
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | FETCH EMPLOYEES
//     |--------------------------------------------------------------------------
//     */
//     const fetchEmployees = async () => {
//         setLoading(true);

//         try {
//             await fetchLookupData();

//             const response = await api.get("/employees");

//             const data = Array.isArray(response?.data)
//                 ? response.data
//                 : Array.isArray(response?.data?.employees)
//                     ? response.data.employees
//                     : [];

//             setEmployees(mergeWithLocalAvatars(data));
//         } catch (error) {
//             console.error("Employee fetch failed:", error);

//             try {
//                 const localData = JSON.parse(
//                     localStorage.getItem("4ps_emp_data") || "[]"
//                 );

//                 if (Array.isArray(localData)) {
//                     setEmployees(mergeWithLocalAvatars(localData));
//                 }
//             } catch { }
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchEmployees();
//     }, []);

//     /*
//     |--------------------------------------------------------------------------
//     | DEPARTMENT
//     |--------------------------------------------------------------------------
//     */
//     const getDepartment = (emp) => {
//         const value = emp?.department;

//         if (!value) return "General";

//         if (typeof value === "object") {
//             return (
//                 value.name ||
//                 value.title ||
//                 value.departmentName ||
//                 "General"
//             );
//         }

//         const text = String(value).trim();

//         if (departmentsMap[text]) {
//             return departmentsMap[text];
//         }

//         if (isHexObjectId(text)) {
//             return "IT & Tech";
//         }

//         return text || "General";
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | DESIGNATION
//     |--------------------------------------------------------------------------
//     */
//     const getDesignation = (emp) => {
//         const value = emp?.designation;

//         if (!value) {
//             return emp?.role || "Executive";
//         }

//         if (typeof value === "object") {
//             return (
//                 value.name ||
//                 value.title ||
//                 value.designationName ||
//                 emp?.role ||
//                 "Executive"
//             );
//         }

//         const text = String(value).trim();

//         if (designationsMap[text]) {
//             return designationsMap[text];
//         }

//         if (isHexObjectId(text)) {
//             return emp?.role || "Executive";
//         }

//         return text || emp?.role || "Executive";
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | FILTER
//     |--------------------------------------------------------------------------
//     */
//     const filteredEmployees = useMemo(() => {
//         const query = search.toLowerCase().trim();

//         return employees.filter((emp, index) => {
//             const name = getEmployeeName(emp).toLowerCase();
//             const designation = getDesignation(emp).toLowerCase();
//             const department = getDepartment(emp).toLowerCase();
//             const employeeId = getSafeEmployeeId(emp, index).toLowerCase();

//             return (
//                 !query ||
//                 name.includes(query) ||
//                 designation.includes(query) ||
//                 department.includes(query) ||
//                 employeeId.includes(query)
//             );
//         });
//     }, [employees, search, departmentsMap, designationsMap]);

//     /*
//     |--------------------------------------------------------------------------
//     | QR TEXT
//     |--------------------------------------------------------------------------
//     | Link nahi hai. Employee ke details seedha QR ke andar text me hain,
//     | isliye scan karte hi phone scanner details dikha deta hai.
//     | Koi server / localhost / internet ki zarurat nahi.
//     */
//     const buildQrText = (employee, token) =>
//         [
//             COMPANY_LEGAL,
//             "--- EMPLOYEE DETAILS ---",
//             `Name: ${getEmployeeName(employee)}`,
//             `Employee ID: ${token}`,
//             `Designation: ${getDesignation(employee)}`,
//             `Department: ${getDepartment(employee)}`,
//             employee?.email ? `Email: ${employee.email}` : null,
//             employee?.phone ? `Phone: ${employee.phone}` : null,
//             "Status: Active Employee",
//         ]
//             .filter(Boolean)
//             .join("\n");

//     /*
//     |--------------------------------------------------------------------------
//     | GENERATE QR
//     |--------------------------------------------------------------------------
//     */
//     useEffect(() => {
//         let cancelled = false;

//         const generateQR = async () => {
//             if (!selectedEmp) {
//                 setQrCodeUrl("");
//                 return;
//             }

//             const index = employees.indexOf(selectedEmp);
//             const token = getSafeEmployeeId(selectedEmp, index);

//             try {
//                 const qr = await QRCode.toDataURL(
//                     buildQrText(selectedEmp, token),
//                     {
//                         width: 500,
//                         margin: 1,
//                         errorCorrectionLevel: "M",
//                         color: {
//                             dark: CARD_NAVY,
//                             light: "#FFFFFF",
//                         },
//                     }
//                 );

//                 if (!cancelled) {
//                     setQrCodeUrl(qr);
//                 }
//             } catch (error) {
//                 console.error("QR generation failed:", error);

//                 if (!cancelled) {
//                     setQrCodeUrl("");
//                 }
//             }
//         };

//         generateQR();

//         return () => {
//             cancelled = true;
//         };
//     }, [selectedEmp, employees, departmentsMap, designationsMap]);

//     /*
//     |--------------------------------------------------------------------------
//     | PRINT
//     |--------------------------------------------------------------------------
//     */
//     const printEmployeeCard = (employee) => {
//         setSelectedEmp(employee);
//         setIsFlipped(false);

//         setTimeout(() => {
//             window.print();
//         }, 500);
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | HIGH QUALITY DOWNLOAD
//     |--------------------------------------------------------------------------
//     */
//     const downloadCard = async (cardId, fileName) => {
//         const element = document.getElementById(cardId);

//         if (!element) {
//             console.error("Card element not found");
//             return;
//         }

//         setDownloading(true);

//         try {
//             // Wait for QR/image rendering
//             await new Promise((resolve) => setTimeout(resolve, 300));

//             const dataUrl = await toPng(element, {
//                 cacheBust: true,
//                 pixelRatio: 4,
//                 backgroundColor: "#ffffff",
//                 width: CARD_WIDTH,
//                 height: CARD_HEIGHT,
//                 style: {
//                     margin: "0",
//                     transform: "none",
//                 },
//                 filter: (node) => {
//                     if (node?.dataset?.excludeDownload === "true") {
//                         return false;
//                     }

//                     return true;
//                 },
//             });

//             const link = document.createElement("a");

//             link.download = `${fileName}.png`;
//             link.href = dataUrl;

//             document.body.appendChild(link);
//             link.click();
//             link.remove();
//         } catch (error) {
//             console.error("High quality card download failed:", error);

//             alert(
//                 "ID card download nahi ho saka. Please image URL/CORS check karein."
//             );
//         } finally {
//             setDownloading(false);
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | EDIT
//     |--------------------------------------------------------------------------
//     */
//     const openEdit = (employee, event) => {
//         event?.stopPropagation();

//         const index = employees.indexOf(employee);
//         const token = getSafeEmployeeId(employee, index);

//         setEditingEmp(employee);

//         setEditFormData({
//             name: getEmployeeName(employee),
//             designation: getDesignation(employee),
//             department: getDepartment(employee),
//             phone: employee?.phone || "",
//             email: employee?.email || "",
//             dob: employee?.dob
//                 ? new Date(employee.dob).toISOString().split("T")[0]
//                 : "",
//             employeeId: token,
//             avatar: employee?.avatar || employee?.photo || "",
//         });
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | IMAGE UPLOAD
//     |--------------------------------------------------------------------------
//     */
//     const handleImageUpload = (event) => {
//         const file = event.target.files?.[0];

//         if (!file) return;

//         if (!file.type.startsWith("image/")) {
//             alert("Please select a valid image.");
//             return;
//         }

//         const reader = new FileReader();

//         reader.onloadend = () => {
//             setEditFormData((prev) => ({
//                 ...prev,
//                 avatar: reader.result,
//             }));
//         };

//         reader.readAsDataURL(file);
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | SAVE EMPLOYEE
//     |--------------------------------------------------------------------------
//     */
//     const saveEmployee = async (event) => {
//         event.preventDefault();

//         if (!editingEmp) return;

//         setSaving(true);

//         const dbId = String(editingEmp._id || editingEmp.id || "");

//         try {
//             const payload = {
//                 name: editFormData.name.trim(),
//                 designation: editFormData.designation.trim(),
//                 department: editFormData.department.trim(),
//                 phone: editFormData.phone.trim(),
//                 email: editFormData.email.trim(),
//                 dob: editFormData.dob,
//                 employeeId: editFormData.employeeId.trim().toUpperCase(),
//                 avatar: editFormData.avatar,
//             };

//             try {
//                 await api.put(`/employees/${dbId}`, payload);
//             } catch (error) {
//                 console.warn(
//                     "Backend update failed. Keeping local update.",
//                     error
//                 );
//             }

//             // Save avatar locally
//             try {
//                 const avatars = JSON.parse(
//                     localStorage.getItem("4ps_emp_avatars") || "{}"
//                 );

//                 if (payload.avatar) {
//                     avatars[dbId] = payload.avatar;

//                     localStorage.setItem(
//                         "4ps_emp_avatars",
//                         JSON.stringify(avatars)
//                     );
//                 }
//             } catch { }

//             setEmployees((prev) =>
//                 prev.map((item) =>
//                     String(item._id || item.id) === dbId
//                         ? { ...item, ...payload }
//                         : item
//                 )
//             );

//             if (
//                 selectedEmp &&
//                 String(selectedEmp._id || selectedEmp.id) === dbId
//             ) {
//                 setSelectedEmp((prev) => ({ ...prev, ...payload }));
//             }

//             setEditingEmp(null);
//         } catch (error) {
//             console.error("Employee update failed:", error);
//             alert("Employee update failed.");
//         } finally {
//             setSaving(false);
//         }
//     };

//     /*
//     |--------------------------------------------------------------------------
//     | LOADING
//     |--------------------------------------------------------------------------
//     */
//     if (loading) {
//         return (
//             <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-500">
//                 <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />

//                 <p className="text-sm font-semibold">
//                     Loading Official ID Cards...
//                 </p>
//             </div>
//         );
//     }

//     return (
//         <div className="w-full space-y-5 antialiased font-sans text-slate-900 pb-10">
//             {/* PRINT CSS */}
//             <style jsx global>{`
//                 @page {
//                     size: auto;
//                     margin: 0;
//                 }

//                 @media print {
//                     html,
//                     body {
//                         width: 100%;
//                         height: 100%;
//                         margin: 0 !important;
//                         padding: 0 !important;
//                         background: white !important;
//                     }

//                     body * {
//                         visibility: hidden !important;
//                     }

//                     #printable-card-front,
//                     #printable-card-front *,
//                     #printable-card-back,
//                     #printable-card-back * {
//                         visibility: visible !important;
//                         -webkit-print-color-adjust: exact !important;
//                         print-color-adjust: exact !important;
//                     }

//                     #printable-card-front,
//                     #printable-card-back {
//                         position: fixed !important;
//                         left: 50% !important;
//                         top: 50% !important;
//                         transform: translate(-50%, -50%) !important;
//                         margin: 0 !important;
//                         box-shadow: none !important;
//                     }

//                     .no-print {
//                         display: none !important;
//                     }
//                 }
//             `}</style>

//             {/* HEADER */}
//             <div className="no-print bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
//                 <div>
//                     <div className="flex items-center gap-2">
//                         <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
//                             Employee Directory & Badges
//                         </span>

//                         <span className="text-xs text-slate-400 font-medium">
//                             CR80 Standard
//                         </span>
//                     </div>

//                     <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
//                         {COMPANY_LEGAL}
//                     </h1>

//                     <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
//                         Manage employee badges, preview ID cards and export
//                         high-resolution cards.
//                     </p>
//                 </div>

//                 <div className="relative w-full md:w-80">
//                     <Search
//                         size={16}
//                         className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
//                     />

//                     <input
//                         value={search}
//                         onChange={(e) => setSearch(e.target.value)}
//                         placeholder="Search name, ID, role or dept..."
//                         className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-600"
//                     />

//                     {search && (
//                         <button
//                             type="button"
//                             onClick={() => setSearch("")}
//                             className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
//                         >
//                             <X size={14} />
//                         </button>
//                     )}
//                 </div>
//             </div>

//             {/* EMPLOYEE TABLE */}
//             <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
//                 <div className="hidden md:block overflow-x-auto">
//                     <table className="w-full text-left min-w-[900px]">
//                         <thead>
//                             <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
//                                 <th className="py-3.5 px-6">Employee</th>
//                                 <th className="py-3.5 px-5">Employee ID</th>
//                                 <th className="py-3.5 px-5">Designation</th>
//                                 <th className="py-3.5 px-5">Department</th>
//                                 <th className="py-3.5 px-5">Contact</th>
//                                 <th className="py-3.5 px-6 text-right">Action</th>
//                             </tr>
//                         </thead>

//                         <tbody className="divide-y divide-slate-100">
//                             {filteredEmployees.map((emp, index) => {
//                                 const name = getEmployeeName(emp);
//                                 const designation = getDesignation(emp);
//                                 const department = getDepartment(emp);
//                                 const token = getSafeEmployeeId(emp, index);

//                                 return (
//                                     <tr
//                                         key={emp._id || emp.id || index}
//                                         className="hover:bg-slate-50 transition"
//                                     >
//                                         <td className="py-3.5 px-6">
//                                             <div className="flex items-center gap-3">
//                                                 <div className="w-10 h-10 rounded-full bg-slate-100 border overflow-hidden flex items-center justify-center">
//                                                     {emp.avatar || emp.photo ? (
//                                                         <img
//                                                             src={emp.avatar || emp.photo}
//                                                             alt={name}
//                                                             className="w-full h-full object-cover"
//                                                         />
//                                                     ) : (
//                                                         <span className="font-bold text-blue-600">
//                                                             {name.charAt(0).toUpperCase()}
//                                                         </span>
//                                                     )}
//                                                 </div>

//                                                 <div className="min-w-0">
//                                                     <p className="font-bold text-slate-900 truncate">
//                                                         {name}
//                                                     </p>

//                                                     <p className="text-[11px] text-slate-400 truncate">
//                                                         {emp.email || "No email"}
//                                                     </p>
//                                                 </div>
//                                             </div>
//                                         </td>

//                                         <td className="py-3.5 px-5">
//                                             <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-200">
//                                                 {token}
//                                             </span>
//                                         </td>

//                                         <td className="py-3.5 px-5 font-semibold">
//                                             {designation}
//                                         </td>

//                                         <td className="py-3.5 px-5">
//                                             <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs">
//                                                 {department}
//                                             </span>
//                                         </td>

//                                         <td className="py-3.5 px-5 text-xs font-mono">
//                                             {emp.phone || "—"}
//                                         </td>

//                                         <td className="py-3.5 px-6 text-right">
//                                             <div className="inline-flex gap-1.5">
//                                                 <button
//                                                     type="button"
//                                                     onClick={() => {
//                                                         setSelectedEmp(emp);
//                                                         setIsFlipped(false);
//                                                     }}
//                                                     className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
//                                                 >
//                                                     <Eye size={14} />
//                                                     View Card
//                                                 </button>

//                                                 <button
//                                                     type="button"
//                                                     onClick={(e) => openEdit(emp, e)}
//                                                     className="p-1.5 bg-slate-100 rounded-xl"
//                                                 >
//                                                     <Edit3 size={14} />
//                                                 </button>

//                                                 <button
//                                                     type="button"
//                                                     onClick={() => printEmployeeCard(emp)}
//                                                     className="p-1.5 bg-slate-100 rounded-xl"
//                                                 >
//                                                     <Printer size={14} />
//                                                 </button>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 );
//                             })}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* MOBILE */}
//                 <div className="md:hidden divide-y">
//                     {filteredEmployees.map((emp, index) => {
//                         const name = getEmployeeName(emp);
//                         const designation = getDesignation(emp);
//                         const department = getDepartment(emp);
//                         const token = getSafeEmployeeId(emp, index);

//                         return (
//                             <div
//                                 key={emp._id || emp.id || index}
//                                 className="p-4 space-y-3"
//                             >
//                                 <div className="flex justify-between gap-3">
//                                     <div className="flex items-center gap-3">
//                                         <div className="w-11 h-11 rounded-full bg-slate-100 border overflow-hidden flex items-center justify-center">
//                                             {emp.avatar || emp.photo ? (
//                                                 <img
//                                                     src={emp.avatar || emp.photo}
//                                                     alt={name}
//                                                     className="w-full h-full object-cover"
//                                                 />
//                                             ) : (
//                                                 <span className="font-bold text-blue-600">
//                                                     {name.charAt(0).toUpperCase()}
//                                                 </span>
//                                             )}
//                                         </div>

//                                         <div>
//                                             <h4 className="font-bold text-sm">{name}</h4>

//                                             <p className="text-xs text-slate-500">
//                                                 {designation}
//                                             </p>
//                                         </div>
//                                     </div>

//                                     <span className="h-fit px-2 py-1 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded">
//                                         {token}
//                                     </span>
//                                 </div>

//                                 <div className="bg-slate-50 rounded-lg p-2 text-xs">
//                                     <span className="text-slate-400">Department:</span>{" "}
//                                     <b>{department}</b>
//                                 </div>

//                                 <div className="text-xs space-y-1">
//                                     <div className="flex gap-2">
//                                         <Mail size={13} />
//                                         <span>{emp.email || "No email"}</span>
//                                     </div>

//                                     <div className="flex gap-2">
//                                         <Phone size={13} />
//                                         <span>{emp.phone || "No phone"}</span>
//                                     </div>
//                                 </div>

//                                 <div className="flex gap-2 pt-2 border-t">
//                                     <button
//                                         type="button"
//                                         onClick={() => {
//                                             setSelectedEmp(emp);
//                                             setIsFlipped(false);
//                                         }}
//                                         className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
//                                     >
//                                         <IdCard size={14} />
//                                         Show ID Card
//                                     </button>

//                                     <button
//                                         type="button"
//                                         onClick={(e) => openEdit(emp, e)}
//                                         className="px-3 bg-slate-100 rounded-xl text-xs font-bold"
//                                     >
//                                         Edit
//                                     </button>

//                                     <button
//                                         type="button"
//                                         onClick={() => printEmployeeCard(emp)}
//                                         className="p-2 bg-slate-100 rounded-xl"
//                                     >
//                                         <Printer size={14} />
//                                     </button>
//                                 </div>
//                             </div>
//                         );
//                     })}
//                 </div>

//                 {!filteredEmployees.length && (
//                     <div className="p-12 text-center text-slate-500 text-sm">
//                         No employee found.
//                     </div>
//                 )}
//             </div>

//             {/* CARD PREVIEW MODAL */}
//             {selectedEmp && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
//                     <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] overflow-y-auto">
//                         <button
//                             type="button"
//                             onClick={() => setSelectedEmp(null)}
//                             className="no-print absolute top-3 right-3 z-30 p-2 bg-slate-100 rounded-full"
//                         >
//                             <X size={15} />
//                         </button>

//                         {/* CARD */}
//                         <div className="p-5 sm:p-8 bg-slate-50 flex justify-center items-center">
//                             {!isFlipped ? (
//                                 <IDCardFront
//                                     id="printable-card-front"
//                                     employee={selectedEmp}
//                                     fullName={getEmployeeName(selectedEmp)}
//                                     designation={getDesignation(selectedEmp)}
//                                     token={getSafeEmployeeId(
//                                         selectedEmp,
//                                         employees.indexOf(selectedEmp)
//                                     )}
//                                     qrCodeUrl={qrCodeUrl}
//                                 />
//                             ) : (
//                                 <IDCardBack id="printable-card-back" />
//                             )}
//                         </div>

//                         {/* ACTIONS */}
//                         <div className="no-print p-5 sm:p-7 flex-1 flex flex-col justify-between gap-5">
//                             <div className="space-y-4">
//                                 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
//                                     <CheckCircle2 size={13} />
//                                     Ready for Print / Export
//                                 </div>

//                                 <div>
//                                     <h3 className="text-lg font-black">
//                                         {getEmployeeName(selectedEmp)}
//                                     </h3>

//                                     <p className="text-xs font-bold text-blue-600 font-mono">
//                                         {getSafeEmployeeId(
//                                             selectedEmp,
//                                             employees.indexOf(selectedEmp)
//                                         )}{" "}
//                                         • {getDesignation(selectedEmp)}
//                                     </p>
//                                 </div>

//                                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
//                                     <div className="flex gap-2">
//                                         <ShieldCheck size={15} className="shrink-0" />

//                                         <span>
//                                             QR scan karne par employee ke details seedha
//                                             dikhenge. Link ya internet ki zarurat nahi.
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <button
//                                     type="button"
//                                     onClick={() => setIsFlipped((value) => !value)}
//                                     className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex justify-center items-center gap-2"
//                                 >
//                                     <FlipHorizontal size={14} />
//                                     Flip to {isFlipped ? "Front" : "Back / Terms"}
//                                 </button>
//                             </div>

//                             <div className="border-t pt-4 space-y-2">
//                                 <div className="flex gap-2">
//                                     <button
//                                         type="button"
//                                         onClick={() => printEmployeeCard(selectedEmp)}
//                                         className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
//                                     >
//                                         <Printer size={14} />
//                                         Print Badge
//                                     </button>

//                                     <button
//                                         type="button"
//                                         onClick={() => openEdit(selectedEmp)}
//                                         className="px-4 py-2.5 bg-slate-100 rounded-xl text-xs font-bold"
//                                     >
//                                         Edit
//                                     </button>
//                                 </div>

//                                 <button
//                                     type="button"
//                                     disabled={downloading || !qrCodeUrl}
//                                     onClick={() =>
//                                         downloadCard(
//                                             !isFlipped
//                                                 ? "printable-card-front"
//                                                 : "printable-card-back",
//                                             `${getEmployeeName(selectedEmp).replace(
//                                                 /\s+/g,
//                                                 "_"
//                                             )}_ID_Card`
//                                         )
//                                     }
//                                     className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
//                                 >
//                                     {downloading ? (
//                                         <>
//                                             <Loader2 size={14} className="animate-spin" />
//                                             Generating HD Card...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <Download size={14} />
//                                             Download HD PNG
//                                         </>
//                                     )}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* EDIT MODAL */}
//             {editingEmp && (
//                 <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm">
//                     <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden">
//                         <div className="p-5 border-b flex items-center justify-between">
//                             <div>
//                                 <h3 className="font-black">Edit Badge Information</h3>

//                                 <p className="text-xs text-slate-500">
//                                     Update employee ID card details.
//                                 </p>
//                             </div>

//                             <button
//                                 type="button"
//                                 onClick={() => setEditingEmp(null)}
//                                 className="p-2 bg-slate-100 rounded-full"
//                             >
//                                 <X size={15} />
//                             </button>
//                         </div>

//                         <form
//                             onSubmit={saveEmployee}
//                             className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-90px)]"
//                         >
//                             {/* PHOTO */}
//                             <div className="flex flex-col items-center">
//                                 <div className="relative w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
//                                     {editFormData.avatar ? (
//                                         <img
//                                             src={editFormData.avatar}
//                                             alt="Preview"
//                                             className="w-full h-full object-cover"
//                                         />
//                                     ) : (
//                                         <Camera className="text-slate-400" />
//                                     )}

//                                     <button
//                                         type="button"
//                                         onClick={() => fileInputRef.current?.click()}
//                                         className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center"
//                                     >
//                                         <Upload size={16} />
//                                     </button>
//                                 </div>

//                                 <input
//                                     ref={fileInputRef}
//                                     type="file"
//                                     accept="image/*"
//                                     onChange={handleImageUpload}
//                                     className="hidden"
//                                 />

//                                 <button
//                                     type="button"
//                                     onClick={() => fileInputRef.current?.click()}
//                                     className="mt-2 text-xs font-bold text-blue-600"
//                                 >
//                                     Upload Square Headshot
//                                 </button>
//                             </div>

//                             <div className="grid sm:grid-cols-2 gap-3">
//                                 {[
//                                     ["Full Name", "name", true],
//                                     ["Employee ID", "employeeId", true],
//                                     ["Designation", "designation", true],
//                                     ["Department", "department", false],
//                                     ["Phone", "phone", false],
//                                     ["Email", "email", false],
//                                 ].map(([label, field, required]) => (
//                                     <div key={field}>
//                                         <label className="block text-xs font-bold text-slate-700 mb-1">
//                                             {label}
//                                         </label>

//                                         <input
//                                             type={field === "email" ? "email" : "text"}
//                                             required={required}
//                                             value={editFormData[field]}
//                                             onChange={(e) =>
//                                                 setEditFormData((prev) => ({
//                                                     ...prev,
//                                                     [field]: e.target.value,
//                                                 }))
//                                             }
//                                             className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600"
//                                         />
//                                     </div>
//                                 ))}
//                             </div>

//                             <div className="border-t pt-4 flex justify-end gap-2">
//                                 <button
//                                     type="button"
//                                     onClick={() => setEditingEmp(null)}
//                                     className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold"
//                                 >
//                                     Cancel
//                                 </button>

//                                 <button
//                                     type="submit"
//                                     disabled={saving}
//                                     className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
//                                 >
//                                     {saving ? (
//                                         <Loader2 size={14} className="animate-spin" />
//                                     ) : (
//                                         <Save size={14} />
//                                     )}

//                                     {saving ? "Saving..." : "Save Changes"}
//                                 </button>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }


