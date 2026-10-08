"use client";
import { useEffect, useState } from "react";
import {
    LogIn,
    LogOut,
    RefreshCw,
    MapPin,
    X,
    Eye,
    ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

const PRIVILEGED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

// Office details. NAME aur ADDRESS apna daalo.
const OFFICE_LOCATION = {
    name: "FourPaySave Hi Tech Solution.", // <-- yahan company ka naam
    address: "jamdoli agra road, Jaipur, Rajasthan", // <-- yahan pura address
    lat: 26.890373334979436,
    lng: 75.87398927116433,
    allowedRadius: 100, // itni door tak punch allowed (meters)
    nearRadius: 200, // itne andar ho to company ka address save hoga (meters)
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const coordsLabel = (lat, lng) =>
    `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

// Coordinates ko readable address me convert karta hai.
// Sirf city mile to coordinates jod deta hai, taaki data generic na rahe.
const getReadableAddress = async (lat, lng) => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
            { signal: controller.signal }
        );
        clearTimeout(timer);

        if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

        const data = await res.json();
        const a = data.address || {};

        const parts = [
            ...new Set(
                [
                    a.house_number,
                    a.road,
                    a.neighbourhood || a.suburb || a.residential,
                    a.city_district,
                    a.city || a.town || a.village,
                ].filter(Boolean)
            ),
        ];

        // Road/area mila to seedha use karo
        if (parts.length >= 2) return parts.join(", ");

        // Sirf city mili to coordinates saath me jod do
        const base =
            parts[0] ||
            (data.display_name
                ? data.display_name.split(",").slice(0, 2).join(",").trim()
                : "");

        return base ? `${base} (${coordsLabel(lat, lng)})` : coordsLabel(lat, lng);
    } catch (error) {
        console.error("Geocoding error:", error);
        return coordsLabel(lat, lng);
    }
};

// Office ke paas ho to company address, warna reverse geocoding
const resolveLocationLabel = async (lat, lng, distance) => {
    if (distance <= OFFICE_LOCATION.nearRadius) {
        return `${OFFICE_LOCATION.name}, ${OFFICE_LOCATION.address}`;
    }
    return getReadableAddress(lat, lng);
};

// Value (string / {address} / {lat,lng}) ko text me convert karta hai
const formatPlace = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
        if (value.address) return String(value.address);
        if (value.lat != null && value.lng != null) {
            return coordsLabel(value.lat, value.lng);
        }
    }
    return "";
};

const getInLocation = (row) =>
    formatPlace(row.inLocation) ||
    formatPlace(row.inAddress) ||
    formatPlace(row.checkInLocation) ||
    formatPlace(row.inCoordinates) ||
    formatPlace(row.location?.in) ||
    "";

const getOutLocation = (row) =>
    formatPlace(row.outLocation) ||
    formatPlace(row.outAddress) ||
    formatPlace(row.checkOutLocation) ||
    formatPlace(row.outCoordinates) ||
    formatPlace(row.location?.out) ||
    "";

const getMapLink = (coords) =>
    coords?.lat != null && coords?.lng != null
        ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
        : null;

export default function AttendancePage() {
    const { user: authUser } = useAuth();
    const [records, setRecords] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getLoggedInUserData = () => {
        try {
            const rawUser = localStorage.getItem("hrms_user");
            const parsed = rawUser ? JSON.parse(rawUser) : null;

            const userId =
                authUser?._id ||
                authUser?.id ||
                authUser?.employee?._id ||
                parsed?.employee?._id ||
                parsed?.employee?.id ||
                (typeof parsed?.employee === "string" ? parsed?.employee : null) ||
                parsed?._id ||
                null;
            const userName =
                authUser?.name ||
                authUser?.username ||
                parsed?.employee?.name ||
                parsed?.name ||
                parsed?.username ||
                "Staff Member";
            const userDept =
                authUser?.department ||
                authUser?.role ||
                parsed?.employee?.department ||
                parsed?.department ||
                parsed?.role ||
                "Employee";
            const userRole =
                authUser?.role || authUser?.userRole || parsed?.role || parsed?.userRole || "employee";

            return {
                id: userId,
                name: userName,
                department: userDept,
                role: typeof userRole === "string" ? userRole.toLowerCase().trim() : "employee",
            };
        } catch (e) {
            console.error("Storage parse error:", e);
            return { id: null, name: "Staff Member", department: "Employee", role: "employee" };
        }
    };

    const loggedInUser = getLoggedInUserData();
    const isPrivileged = PRIVILEGED_ROLES.includes(loggedInUser.role);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const params = { date };
            if (!isPrivileged && loggedInUser.id) {
                params.employeeId = loggedInUser.id;
            }

            const { data } = await api.get("/attendance", { params });
            let list = Array.isArray(data) ? data : data.attendance || data.data || [];

            if (!isPrivileged && loggedInUser.id) {
                list = list.filter((r) => {
                    const empObj =
                        typeof r.employee === "object" && r.employee !== null ? r.employee : null;
                    const empId =
                        empObj?._id || empObj?.id || (typeof r.employee === "string" ? r.employee : null);
                    const empName = empObj?.name || r.name;
                    return (
                        empId === loggedInUser.id ||
                        (empName && empName.toLowerCase() === loggedInUser.name.toLowerCase())
                    );
                });
            }

            setRecords(list);
        } catch (err) {
            console.error(err);
            toast.error("Attendance records load nahi ho paye.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (loggedInUser.id) {
            fetchAttendance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, loggedInUser.id]);

    const punch = (type) => {
        if (!loggedInUser.id) {
            toast.error("User session expired or ID missing. Please log in again.");
            return;
        }

        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        const isIn = type === "checkin";
        setActionLoading(type);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                const distance = calculateDistance(
                    userLat,
                    userLng,
                    OFFICE_LOCATION.lat,
                    OFFICE_LOCATION.lng
                );

                if (distance > OFFICE_LOCATION.allowedRadius) {
                    toast.error(
                        `${isIn ? "Punch In" : "Punch Out"} Failed: Aap office location se bahar hain (${Math.round(distance)}m door).`
                    );
                    setActionLoading(null);
                    return;
                }

                const address = await resolveLocationLabel(userLat, userLng, distance);
                const coords = { lat: userLat, lng: userLng };

                try {
                    if (isIn) {
                        await api.post("/attendance/check-in", {
                            employee: loggedInUser.id,
                            name: loggedInUser.name,
                            location: coords,
                            inLocation: address,
                            inCoordinates: coords,
                        });
                        toast.success("Checked in successfully!");
                    } else {
                        await api.put("/attendance/check-out", {
                            employee: loggedInUser.id,
                            location: coords,
                            outLocation: address,
                            outCoordinates: coords,
                        });
                        toast.success("Checked out successfully!");
                    }
                    fetchAttendance();
                } catch (err) {
                    toast.error(
                        err.response?.data?.message || (isIn ? "Check-in failed" : "Check-out failed")
                    );
                } finally {
                    setActionLoading(null);
                }
            },
            () => {
                setActionLoading(null);
                toast.error("Location access denied. Please enable GPS.");
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const handleCheckIn = () => punch("checkin");
    const handleCheckOut = () => punch("checkout");

    const columns = [
        {
            key: "employee",
            label: "Profile",
            render: (row) => {
                const empObj =
                    typeof row.employee === "object" && row.employee !== null ? row.employee : null;
                const empName = empObj?.name || empObj?.fullName || row.name || loggedInUser.name;
                const empId = empObj?.employeeId || empObj?.id || "EMP-001";
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                            {empName ? empName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                            <span className="font-bold text-slate-900 block text-xs">{empName}</span>
                            <span className="text-[11px] font-semibold text-slate-400">ID: {empId}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: "date",
            label: "Date",
            render: (row) => (
                <span className="text-xs font-semibold text-slate-700">
                    {row.date
                        ? new Date(row.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })
                        : "—"}
                </span>
            ),
        },
        {
            key: "leave",
            label: "Leave",
            render: (row) => <span className="text-slate-400 font-semibold">{row.leave || "—"}</span>,
        },
        {
            key: "punchRecords",
            label: "Punch records",
            render: (row) => (
                <button
                    onClick={() => {
                        setSelectedRecord(row);
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                >
                    <Eye size={12} /> View Details
                </button>
            ),
        },
        {
            key: "checkIn",
            label: "Punch In",
            render: (row) => (
                <span className="text-xs font-bold text-slate-700">
                    {row.checkIn
                        ? new Date(row.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                </span>
            ),
        },
        {
            key: "inLocation",
            label: "In Location",
            render: (row) => {
                const place = getInLocation(row);
                return (
                    <div className="flex items-center gap-1 text-xs text-slate-600 max-w-[240px]">
                        <MapPin size={12} className="text-indigo-500 shrink-0" />
                        <span className="truncate" title={place || undefined}>
                            {place || "—"}
                        </span>
                    </div>
                );
            },
        },
        {
            key: "outLocation",
            label: "Out Location",
            render: (row) => {
                const place = getOutLocation(row);
                return (
                    <div className="flex items-center gap-1 text-xs text-slate-600 max-w-[240px]">
                        <MapPin size={12} className="text-rose-400 shrink-0" />
                        <span className="truncate" title={place || undefined}>
                            {place || "—"}
                        </span>
                    </div>
                );
            },
        },
        {
            key: "checkOut",
            label: "Punch Out",
            render: (row) => (
                <span className="text-xs font-bold text-slate-700">
                    {row.checkOut
                        ? new Date(row.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                </span>
            ),
        },
        {
            key: "behavior",
            label: "Behavior",
            render: (row) => {
                const isLate =
                    row.behavior === "Late" || (row.checkIn && new Date(row.checkIn).getHours() > 10);
                return (
                    <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border ${isLate
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : "bg-emerald-50 text-emerald-600 border-emerald-200"
                            }`}
                    >
                        {isLate ? "Late" : "Regular"}
                    </span>
                );
            },
        },
        {
            key: "workHours",
            label: "Total Hours",
            render: (row) => (
                <span className="text-xs font-bold text-slate-800">
                    {row.workHours ? `${row.workHours} hrs` : "0h 0m"}
                </span>
            ),
        },
    ];

    const inCoords = selectedRecord?.inCoordinates || selectedRecord?.location?.in;
    const outCoords = selectedRecord?.outCoordinates || selectedRecord?.location?.out;
    const inMap = getMapLink(inCoords);
    const outMap = getMapLink(outCoords);

    return (
        <div className="max-w-[1500px] mx-auto space-y-6 pb-12">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Attendance list</h1>
                    <p className="text-sm text-slate-500">
                        Real-time attendance logs & geofenced punch tracking
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAttendance}
                        className="p-3 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
                    </button>
                    <Button
                        onClick={handleCheckIn}
                        loading={actionLoading === "checkin"}
                        className="bg-indigo-600 text-white rounded-2xl px-5 py-3 text-xs font-bold cursor-pointer"
                    >
                        <LogIn size={16} /> Punch In
                    </Button>
                    <Button
                        onClick={handleCheckOut}
                        loading={actionLoading === "checkout"}
                        className="bg-rose-600 text-white rounded-2xl px-5 py-3 text-xs font-bold cursor-pointer"
                    >
                        <LogOut size={16} /> Punch Out
                    </Button>
                </div>
            </div>

            {/* Date Selector */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-extrabold text-slate-500 uppercase">Select Date:</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer"
                    />
                </div>
                <p className="text-xs font-semibold text-slate-400">
                    Showing logs for{" "}
                    <span className="font-bold text-slate-700">{new Date(date).toDateString()}</span>
                </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
                {loading ? (
                    <div className="py-20 text-center">
                        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 font-bold">
                        No attendance logs found for this date.
                    </div>
                ) : (
                    <Table columns={columns} data={records} />
                )}
            </div>

            {/* Modal */}
            {isModalOpen && selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-base">Punch Details</h3>
                            <button onClick={() => setIsModalOpen(false)} className="cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs text-slate-600">
                                <b>In Location:</b> {getInLocation(selectedRecord) || "—"}
                            </p>
                            {inMap && (
                                <a
                                    href={inMap}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                                >
                                    <ExternalLink size={11} /> Open in Google Maps
                                </a>
                            )}
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs text-slate-600">
                                <b>Out Location:</b> {getOutLocation(selectedRecord) || "—"}
                            </p>
                            {outMap && (
                                <a
                                    href={outMap}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                                >
                                    <ExternalLink size={11} /> Open in Google Maps
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}





// "use client";
// import { useEffect, useState } from "react";
// import {
//     LogIn,
//     LogOut,
//     Calendar,
//     Clock,
//     UserCheck,
//     UserX,
//     RefreshCw,
//     Timer,
//     CheckCircle2
// } from "lucide-react";
// import api from "@/lib/api";
// import Table from "@/components/ui/Table";
// import Button from "@/components/ui/Button";
// import { toast } from "react-toastify";
// import { useAuth } from "@/context/AuthContext";

// const PRIVILEGED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

// export default function AttendancePage() {
//     const { user: authUser } = useAuth();
//     const [records, setRecords] = useState([]);
//     const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
//     const [loading, setLoading] = useState(true);
//     const [actionLoading, setActionLoading] = useState(null);

//     // Helper: LocalStorage ya AuthContext se active user ki details nikalne ke liye
//     const getLoggedInUserData = () => {
//         try {
//             const rawUser = localStorage.getItem("hrms_user");
//             const parsed = rawUser ? JSON.parse(rawUser) : null;

//             const userId = authUser?._id || authUser?.id || authUser?.employee?._id || parsed?.employee?._id || parsed?.employee?.id || (typeof parsed?.employee === "string" ? parsed?.employee : null) || parsed?._id || parsed?.id || null;
//             const userName = authUser?.name || authUser?.username || parsed?.employee?.name || parsed?.name || parsed?.username || "Staff Member";
//             const userDept = authUser?.department || authUser?.role || parsed?.employee?.department || parsed?.department || parsed?.role || "Employee";
//             const userRole = authUser?.role || authUser?.userRole || parsed?.role || parsed?.userRole || "employee";

//             return {
//                 id: userId,
//                 name: userName,
//                 department: userDept,
//                 role: typeof userRole === 'string' ? userRole.toLowerCase().trim() : 'employee'
//             };
//         } catch (e) {
//             console.error("Storage parse error:", e);
//             return { id: null, name: "Staff Member", department: "Employee", role: "employee" };
//         }
//     };

//     const loggedInUser = getLoggedInUserData();
//     const isPrivileged = PRIVILEGED_ROLES.includes(loggedInUser.role);

//     const fetchAttendance = async () => {
//         setLoading(true);
//         try {
//             const params = { date };
//             if (!isPrivileged && loggedInUser.id) {
//                 params.employeeId = loggedInUser.id;
//             }

//             const { data } = await api.get("/attendance", { params });
//             let list = Array.isArray(data) ? data : (data.attendance || data.data || []);

//             // Strict Filter: Agar employee hai toh sirf uska hi record table me dikhega
//             if (!isPrivileged && loggedInUser.id) {
//                 list = list.filter((r) => {
//                     const empObj = typeof r.employee === "object" && r.employee !== null ? r.employee : null;
//                     const empId = empObj?._id || empObj?.id || (typeof r.employee === "string" ? r.employee : null);
//                     const empName = empObj?.name || r.name;
//                     return empId === loggedInUser.id || (empName && empName.toLowerCase() === loggedInUser.name.toLowerCase());
//                 });
//             }

//             setRecords(list);
//         } catch (err) {
//             console.error(err);
//             toast.error("Attendance records load nahi ho paye.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         if (loggedInUser.id) {
//             fetchAttendance();
//         }
//     }, [date, loggedInUser.id]);

//     const handleCheckIn = async () => {
//         if (!loggedInUser.id) {
//             toast.error("User session expired or ID missing. Please log in again.");
//             return;
//         }

//         setActionLoading("checkin");
//         try {
//             await api.post("/attendance/check-in", {
//                 employee: loggedInUser.id,
//                 name: loggedInUser.name
//             });
//             toast.success("Checked in successfully!");
//             fetchAttendance();
//         } catch (err) {
//             toast.error(err.response?.data?.message || "Check-in failed");
//         } finally {
//             setActionLoading(null);
//         }
//     };

//     const handleCheckOut = async () => {
//         if (!loggedInUser.id) {
//             toast.error("User session expired or ID missing. Please log in again.");
//             return;
//         }

//         setActionLoading("checkout");
//         try {
//             await api.put("/attendance/check-out", { employee: loggedInUser.id });
//             toast.success("Checked out successfully!");
//             fetchAttendance();
//         } catch (err) {
//             toast.error(err.response?.data?.message || "Check-out failed");
//         } finally {
//             setActionLoading(null);
//         }
//     };

//     const totalEmployees = records.length;
//     const presentCount = records.filter((r) => r.status?.toLowerCase() === "present" || r.status?.toLowerCase() === "half-day").length;
//     const absentCount = records.filter((r) => r.status?.toLowerCase() === "absent").length;
//     const attendanceRate = totalEmployees > 0
//         ? Math.round((presentCount / totalEmployees) * 100)
//         : 0;

//     const columns = [
//         {
//             key: "employee",
//             label: "Employee",
//             render: (row) => {
//                 const empObj = typeof row.employee === "object" && row.employee !== null ? row.employee : null;
//                 const empName = empObj?.name || empObj?.fullName || empObj?.username || row.userName || row.name || loggedInUser.name;
//                 const empDept = empObj?.department || empObj?.role || row.department || loggedInUser.department;

//                 return (
//                     <div className="flex items-center gap-3.5 group/item">
//                         <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-extrabold text-xs shadow-sm shadow-indigo-100 group-hover/item:scale-105 transition-transform">
//                             {empName ? empName.charAt(0).toUpperCase() : "U"}
//                         </div>
//                         <div>
//                             <span className="font-bold text-slate-900 block text-xs leading-snug group-hover/item:text-indigo-600 transition-colors">
//                                 {empName}
//                             </span>
//                             <span className="text-[11px] font-semibold text-slate-400 capitalize">
//                                 {empDept}
//                             </span>
//                         </div>
//                     </div>
//                 );
//             },
//         },
//         {
//             key: "checkIn",
//             label: "Check In",
//             render: (row) => (
//                 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
//                     <Clock size={13} className="text-emerald-500" />
//                     <span>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
//                 </div>
//             ),
//         },
//         {
//             key: "checkOut",
//             label: "Check Out",
//             render: (row) => (
//                 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
//                     <Clock size={13} className="text-rose-400" />
//                     <span>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
//                 </div>
//             ),
//         },
//         {
//             key: "workHours",
//             label: "Work Hours",
//             render: (row) => (
//                 <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 font-bold text-slate-700 text-xs shadow-2xs">
//                     <Timer size={13} className="text-slate-400" />
//                     {row.workHours ? `${row.workHours} hrs` : (row.hours ? `${row.hours} hrs` : "—")}
//                 </span>
//             ),
//         },
//         {
//             key: "status",
//             label: "Status",
//             render: (row) => {
//                 const statusStr = (row.status || "present").toLowerCase();
//                 const isPresent = statusStr === "present" || statusStr === "half-day";
//                 return (
//                     <span
//                         className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full border capitalize shadow-2xs ${isPresent
//                             ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
//                             : "bg-rose-50 text-rose-700 border-rose-200/80"
//                             }`}
//                     >
//                         <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? "bg-emerald-500" : "bg-rose-500"}`} />
//                         {row.status || "Present"}
//                     </span>
//                 );
//             },
//         },
//     ];

//     return (
//         <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
//             {/* Header */}
//             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
//                 <div>
//                     <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Attendance Tracker</h1>
//                     <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Real-time attendance logs, punch times, and shift analytics</p>
//                 </div>

//                 <div className="flex flex-wrap items-center gap-3">
//                     <button
//                         onClick={fetchAttendance}
//                         className="p-3 border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-200 shadow-2xs cursor-pointer"
//                         title="Refresh Attendance"
//                     >
//                         <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
//                     </button>

//                     <Button
//                         onClick={handleCheckIn}
//                         loading={actionLoading === "checkin"}
//                         className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl px-5 py-3 font-bold text-xs shadow-md shadow-emerald-100 transition-all duration-200 flex items-center gap-2 cursor-pointer"
//                     >
//                         <LogIn size={16} /> Punch In
//                     </Button>

//                     <Button
//                         onClick={handleCheckOut}
//                         loading={actionLoading === "checkout"}
//                         className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-2xl px-5 py-3 font-bold text-xs shadow-md shadow-rose-100 transition-all duration-200 flex items-center gap-2 cursor-pointer"
//                     >
//                         <LogOut size={16} /> Punch Out
//                     </Button>
//                 </div>
//             </div>

//             {/* Metrics */}
//             <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Records</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{totalEmployees}</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <Calendar size={22} />
//                     </div>
//                 </div>

//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Present Today</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{presentCount}</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <UserCheck size={22} />
//                     </div>
//                 </div>

//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wider">Absent Today</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{absentCount}</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <UserX size={22} />
//                     </div>
//                 </div>

//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-violet-600 uppercase tracking-wider">Attendance Rate</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{attendanceRate}%</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <CheckCircle2 size={22} />
//                     </div>
//                 </div>
//             </div>

//             {/* Date Filter */}
//             <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                 <div className="flex items-center gap-3">
//                     <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Select Date:</label>
//                     <input
//                         type="date"
//                         value={date}
//                         onChange={(e) => setDate(e.target.value)}
//                         className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer shadow-2xs"
//                     />
//                 </div>
//                 <p className="text-xs font-semibold text-slate-400">
//                     Showing logs for <span className="font-bold text-slate-700">{new Date(date).toDateString()}</span>
//                 </p>
//             </div>

//             {/* Table */}
//             <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
//                 {loading ? (
//                     <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
//                         <RefreshCw size={24} className="animate-spin text-indigo-600" />
//                         <p className="text-xs font-semibold text-slate-500">Fetching attendance logs...</p>
//                     </div>
//                 ) : records.length === 0 ? (
//                     <div className="text-center py-20 text-slate-400">
//                         <Calendar size={40} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
//                         <p className="font-bold text-slate-700 text-sm">No attendance logs found for this date</p>
//                         <p className="text-xs text-slate-400 mt-1 font-medium">Select a different date or punch in to record attendance.</p>
//                     </div>
//                 ) : (
//                     <div className="overflow-x-auto">
//                         <Table columns={columns} data={records} />
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }