
// components/layout/Navbar.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Bell,
    User,
    LogOut,
    ChevronDown,
    ShieldCheck,
    CalendarDays,
    Clock,
    Wallet,
    ListChecks,
    Megaphone,
    CheckCheck,
    Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { menuConfig } from "@/data/menuConfig";
import { useAuth } from "@/context/AuthContext";

/* Change these two paths if your pages live somewhere else */
// const NOTIFICATIONS_PATH = "/communication/notifications";
// const PROFILE_PATH = "/profile";
const NOTIFICATIONS_PATH = "/communication/notifications";
const PROFILE_PATH = "/self-service/profile";

const POLL_MS = 30 * 1000;

const TYPE_STYLE = {
    leave: [CalendarDays, "bg-amber-50 text-amber-600"],
    attendance: [Clock, "bg-sky-50 text-sky-600"],
    payroll: [Wallet, "bg-emerald-50 text-emerald-600"],
    task: [ListChecks, "bg-violet-50 text-violet-600"],
    announcement: [Megaphone, "bg-rose-50 text-rose-600"],
    general: [Bell, "bg-slate-100 text-slate-500"],
};

const getBreadcrumb = (pathname) => {
    if (pathname === "/" || pathname === "/dashboard") {
        return [{ label: "Dashboard", href: "/dashboard" }];
    }

    for (const item of menuConfig) {
        const matchedChild = item.children?.find((c) => c.href === pathname);
        if (matchedChild) {
            return [
                { label: item.label, href: item.children[0]?.href || "#" },
                { label: matchedChild.label, href: matchedChild.href },
            ];
        }
        if (!item.children && item.href === pathname) {
            return [{ label: item.label, href: item.href }];
        }
    }

    const segments = pathname.split("/").filter(Boolean);
    const readable = segments.map((seg) =>
        seg
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
    );
    return readable.map((label, i) => ({
        label,
        href: "/" + segments.slice(0, i + 1).join("/"),
    }));
};

const roleBadge = (role) => {
    const map = {
        admin: { label: "Super Admin", className: "bg-indigo-50 text-indigo-700" },
        hr: { label: "HR Manager", className: "bg-violet-50 text-violet-700" },
        manager: { label: "Manager", className: "bg-blue-50 text-blue-700" },
        employee: { label: "Employee", className: "bg-slate-100 text-slate-600" },
    };
    return map[role] || map.employee;
};

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

const timeAgo = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    if (diff < 60 * 1000) return "Just now";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} hr ago`;
    if (diff < 48 * 60 * 60 * 1000) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const breadcrumb = getBreadcrumb(pathname);

    const [profileOpen, setProfileOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [recent, setRecent] = useState([]);
    const [loadingRecent, setLoadingRecent] = useState(false);

    const profileRef = useRef(null);
    const bellRef = useRef(null);
    const loggedIn = Boolean(user);

    const loadCount = useCallback(async () => {
        try {
            const { data } = await api.get("/communication/notifications/unread-count");
            setUnread(Number(data?.count) || 0);
        } catch {
            /* the badge simply stays as it was */
        }
    }, []);

    const loadRecent = useCallback(async () => {
        setLoadingRecent(true);
        try {
            const { data } = await api.get("/communication/notifications");
            setRecent(Array.isArray(data) ? data.slice(0, 6) : []);
        } catch {
            /* keep the old list */
        } finally {
            setLoadingRecent(false);
        }
    }, []);

    /* Unread count: on load, on every page change, every 30 seconds, and when the tab is opened again */
    useEffect(() => {
        if (!loggedIn) return undefined;
        loadCount();
        const refresh = () => document.visibilityState === "visible" && loadCount();
        const timer = setInterval(refresh, POLL_MS);
        document.addEventListener("visibilitychange", refresh);
        window.addEventListener("hrms:notifications-changed", loadCount);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
            window.removeEventListener("hrms:notifications-changed", loadCount);
        };
    }, [loggedIn, pathname, loadCount]);

    useEffect(() => {
        if (bellOpen) loadRecent();
    }, [bellOpen, loadRecent]);

    useEffect(() => {
        const onDown = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") {
                setProfileOpen(false);
                setBellOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown, { passive: true });
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const markRead = async (n) => {
        if (n.isRead) return;
        setRecent((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        setUnread((c) => Math.max(0, c - 1));
        try {
            await api.put(`/communication/notifications/${n._id}/read`);
        } catch {
            loadCount();
            loadRecent();
        }
    };

    const openItem = (n) => {
        markRead(n);
        setBellOpen(false);
        const link = typeof n.link === "string" && n.link.startsWith("/") ? n.link : NOTIFICATIONS_PATH;
        router.push(link);
    };

    const markAllRead = async () => {
        if (!unread) return;
        setRecent((prev) => prev.map((x) => ({ ...x, isRead: true })));
        setUnread(0);
        try {
            await api.put("/communication/notifications/mark-all-read");
        } catch {
            loadCount();
            loadRecent();
        }
    };

    const badge = roleBadge(user?.role);
    const initials = getInitials(user?.name);

    const handleLogout = () => {
        setProfileOpen(false);
        logout();
    };

    return (
        <header className="w-full bg-white/95 backdrop-blur-md border-t-2 border-b-2 border-slate-200 sticky top-0 z-30 transition-all">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 min-w-0">
                    <Link
                        href="/dashboard"
                        className="hidden sm:block text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                        HRMatrix
                    </Link>
                    {breadcrumb.map((crumb, i) => {
                        const isLast = i === breadcrumb.length - 1;
                        return (
                            <div key={crumb.href + i} className="flex items-center gap-1.5 min-w-0">
                                <span className="hidden sm:inline text-slate-300 text-sm font-bold">/</span>
                                {isLast ? (
                                    <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">{crumb.label}</h2>
                                ) : (
                                    <Link
                                        href={crumb.href}
                                        className="hidden sm:block text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors truncate"
                                    >
                                        {crumb.label}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {/* Notifications (on mobile the panel is as wide as the screen, so this wrapper is not positioned) */}
                    <div className="sm:relative" ref={bellRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setBellOpen((o) => !o);
                                setProfileOpen(false);
                            }}
                            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                            aria-expanded={bellOpen}
                            className={`relative p-2 rounded-xl transition-all duration-200 active:scale-95 focus:outline-none ${bellOpen ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                                }`}
                        >
                            <Bell size={20} />
                            {unread > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                                    {unread > 99 ? "99+" : unread}
                                </span>
                            )}
                        </button>

                        <div
                            className={`absolute left-3 right-3 top-full mt-2 sm:left-auto sm:right-0 sm:w-[24rem] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-300/40 z-50 overflow-hidden origin-top-right transition-all duration-200 ease-out ${bellOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                                }`}
                        >
                            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                                    <p className="text-[11px] text-slate-400">{unread > 0 ? `${unread} unread` : "You are all caught up"}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={markAllRead}
                                    disabled={!unread}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <CheckCheck size={14} /> Mark all read
                                </button>
                            </div>

                            <div className="max-h-[60dvh] sm:max-h-96 overflow-y-auto overscroll-contain">
                                {loadingRecent && recent.length === 0 ? (
                                    <div className="py-10 flex justify-center">
                                        <Loader2 size={20} className="animate-spin text-indigo-600" />
                                    </div>
                                ) : recent.length === 0 ? (
                                    <div className="py-10 px-6 text-center">
                                        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                                            <Bell size={20} />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-600">No notifications yet</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Leave, task and payroll updates will appear here.</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {recent.map((n) => {
                                            const [Icon, tone] = TYPE_STYLE[n.type] || TYPE_STYLE.general;
                                            return (
                                                <li key={n._id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openItem(n)}
                                                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${n.isRead ? "hover:bg-slate-50" : "bg-indigo-50/50 hover:bg-indigo-50"
                                                            }`}
                                                    >
                                                        <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${tone}`}>
                                                            <Icon size={16} />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex items-start justify-between gap-2">
                                                                <span className={`text-xs break-words ${n.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>
                                                                    {n.title}
                                                                </span>
                                                                {!n.isRead && <span className="mt-1 w-2 h-2 shrink-0 rounded-full bg-indigo-600" />}
                                                            </span>
                                                            <span className="block mt-0.5 text-[11px] text-slate-500 leading-snug line-clamp-2 break-words">{n.message}</span>
                                                            <span className="block mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            <Link
                                href={NOTIFICATIONS_PATH}
                                onClick={() => setBellOpen(false)}
                                className="block text-center px-4 py-3 border-t border-slate-100 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                                View all notifications
                            </Link>
                        </div>
                    </div>

                    {/* Profile */}
                    <div className="relative" ref={profileRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setProfileOpen((o) => !o);
                                setBellOpen(false);
                            }}
                            aria-expanded={profileOpen}
                            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all duration-200 active:scale-95 focus:outline-none"
                        >
                            <div className="relative">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center shadow-sm transition-transform duration-300 hover:rotate-6">
                                    {initials}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>

                            <div className="hidden md:flex flex-col text-left min-w-0">
                                <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">{user?.name || "Guest"}</span>
                                <span className="text-[10px] text-slate-400 leading-tight">{badge.label}</span>
                            </div>

                            <ChevronDown
                                size={15}
                                className={`text-slate-400 transition-transform duration-300 shrink-0 ${profileOpen ? "rotate-180 text-indigo-600" : ""}`}
                            />
                        </button>

                        <div
                            className={`absolute right-0 mt-2 w-60 bg-white rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-200/50 py-1.5 origin-top-right transition-all duration-200 ease-out z-50 ${profileOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                                }`}
                        >
                            <div className="px-4 py-3 border-b-2 border-slate-100 bg-slate-50/50 rounded-t-2xl">
                                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || "Guest User"}</p>
                                <p className="text-[11px] text-slate-400 truncate">{user?.email || "—"}</p>
                                <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${badge.className}`}>
                                    <ShieldCheck size={12} />
                                    <span>{badge.label}</span>
                                </div>
                            </div>

                            <div className="p-1 space-y-0.5">
                                <Link
                                    href={PROFILE_PATH}
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors duration-150"
                                >
                                    <User size={15} />
                                    <span>My Profile</span>
                                </Link>
                            </div>

                            <div className="p-1 border-t-2 border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors duration-150"
                                >
                                    <LogOut size={15} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}









// // components/layout/Navbar.jsx
// "use client";

// import { useState, useRef, useEffect } from "react";
// import { usePathname, useRouter } from "next/navigation";
// import Link from "next/link";
// import {
//     Bell,
//     User,
//     Settings,
//     LogOut,
//     ChevronDown,
//     ShieldCheck
// } from "lucide-react";
// import { menuConfig } from "@/data/menuConfig";
// import { useAuth } from "@/context/AuthContext";

// const getBreadcrumb = (pathname) => {
//     if (pathname === "/" || pathname === "/dashboard") {
//         return [{ label: "Dashboard", href: "/dashboard" }];
//     }

//     for (const item of menuConfig) {
//         const matchedChild = item.children?.find((c) => c.href === pathname);
//         if (matchedChild) {
//             return [
//                 { label: item.label, href: item.children[0]?.href || "#" },
//                 { label: matchedChild.label, href: matchedChild.href },
//             ];
//         }
//         if (!item.children && item.href === pathname) {
//             return [{ label: item.label, href: item.href }];
//         }
//     }

//     const segments = pathname.split("/").filter(Boolean);
//     const readable = segments.map((seg) =>
//         seg
//             .split("-")
//             .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//             .join(" ")
//     );
//     return readable.map((label, i) => ({
//         label,
//         href: "/" + segments.slice(0, i + 1).join("/"),
//     }));
// };

// const roleBadge = (role) => {
//     const map = {
//         admin: { label: "Super Admin", className: "bg-indigo-50 text-indigo-700" },
//         hr: { label: "HR Manager", className: "bg-violet-50 text-violet-700" },
//         manager: { label: "Manager", className: "bg-blue-50 text-blue-700" },
//         employee: { label: "Employee", className: "bg-slate-100 text-slate-600" },
//     };
//     return map[role] || map.employee;
// };

// const getInitials = (name) => {
//     if (!name) return "U";
//     const parts = name.trim().split(" ");
//     return parts.length > 1
//         ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//         : parts[0].slice(0, 2).toUpperCase();
// };

// export default function Navbar() {
//     const pathname = usePathname();
//     const router = useRouter();
//     const { user, logout } = useAuth();
//     const breadcrumb = getBreadcrumb(pathname);

//     const [profileOpen, setProfileOpen] = useState(false);
//     const [notificationCount] = useState(3);
//     const dropdownRef = useRef(null);

//     useEffect(() => {
//         function handleClickOutside(event) {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 setProfileOpen(false);
//             }
//         }
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const badge = roleBadge(user?.role);
//     const initials = getInitials(user?.name);

//     const handleLogout = () => {
//         setProfileOpen(false);
//         logout();
//     };

//     return (
//         /* Top aur Bottom borders ko bold (border-t-2 border-b-2) aur smooth slate color diya gaya hai */
//         <header className="w-full bg-white/95 backdrop-blur-md border-t-2 border-b-2 border-slate-200 sticky top-0 z-30 transition-all">
//             <div className="flex items-center justify-between px-4 sm:px-6 py-3">
//                 {/* Breadcrumb Trail */}
//                 <div className="flex items-center gap-2 min-w-0">
//                     <Link
//                         href="/dashboard"
//                         className="hidden sm:block text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
//                     >
//                         HRMatrix
//                     </Link>
//                     {breadcrumb.map((crumb, i) => {
//                         const isLast = i === breadcrumb.length - 1;
//                         return (
//                             <div key={crumb.href + i} className="flex items-center gap-1.5 min-w-0">
//                                 <span className="hidden sm:inline text-slate-300 text-sm font-bold">/</span>
//                                 {isLast ? (
//                                     <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">
//                                         {crumb.label}
//                                     </h2>
//                                 ) : (
//                                     <Link
//                                         href={crumb.href}
//                                         className="hidden sm:block text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors truncate"
//                                     >
//                                         {crumb.label}
//                                     </Link>
//                                 )}
//                             </div>
//                         );
//                     })}
//                 </div>

//                 {/* Right Action Icons */}
//                 <div className="flex items-center gap-2 sm:gap-4 shrink-0">
//                     <button
//                         type="button"
//                         className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all duration-200 active:scale-95 focus:outline-none"
//                         aria-label="Notifications"
//                     >
//                         <Bell size={20} />
//                         {notificationCount > 0 && (
//                             <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
//                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
//                                 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
//                             </span>
//                         )}
//                     </button>

//                     {/* Profile Dropdown Container */}
//                     <div className="relative" ref={dropdownRef}>
//                         <button
//                             type="button"
//                             onClick={() => setProfileOpen(!profileOpen)}
//                             className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all duration-200 active:scale-95 focus:outline-none"
//                         >
//                             <div className="relative">
//                                 <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center shadow-sm transition-transform duration-300 hover:rotate-6">
//                                     {initials}
//                                 </div>
//                                 <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
//                             </div>

//                             <div className="hidden md:flex flex-col text-left min-w-0">
//                                 <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
//                                     {user?.name || "Guest"}
//                                 </span>
//                                 <span className="text-[10px] text-slate-400 leading-tight">
//                                     {badge.label}
//                                 </span>
//                             </div>

//                             <ChevronDown
//                                 size={15}
//                                 className={`text-slate-400 transition-transform duration-300 shrink-0 ${profileOpen ? "rotate-180 text-indigo-600" : ""}`}
//                             />
//                         </button>

//                         {/* Profile Dropdown Menu */}
//                         <div
//                             className={`absolute right-0 mt-2 w-60 bg-white rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-200/50 py-1.5 origin-top-right transition-all duration-200 ease-out z-50 ${profileOpen
//                                 ? "opacity-100 scale-100 translate-y-0"
//                                 : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
//                                 }`}
//                         >
//                             <div className="px-4 py-3 border-b-2 border-slate-100 bg-slate-50/50 rounded-t-2xl">
//                                 <p className="text-xs font-semibold text-slate-900 truncate">
//                                     {user?.name || "Guest User"}
//                                 </p>
//                                 <p className="text-[11px] text-slate-400 truncate">
//                                     {user?.email || "—"}
//                                 </p>
//                                 <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${badge.className}`}>
//                                     <ShieldCheck size={12} />
//                                     <span>{badge.label}</span>
//                                 </div>
//                             </div>

//                             <div className="p-1 space-y-0.5">
//                                 <Link
//                                     href="/profile"
//                                     onClick={() => setProfileOpen(false)}
//                                     className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors duration-150"
//                                 >
//                                     <User size={15} />
//                                     <span>My Profile</span>
//                                 </Link>

//                             </div>

//                             <div className="p-1 border-t-2 border-slate-100">
//                                 <button
//                                     type="button"
//                                     onClick={handleLogout}
//                                     className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors duration-150"
//                                 >
//                                     <LogOut size={15} />
//                                     <span>Sign Out</span>
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </header>
//     );
// }





// "use client";
// import { usePathname } from "next/navigation";
// import { Bell, UserCircle } from "lucide-react";

// // URL segment se readable title banane ka helper
// const getPageTitle = (pathname) => {
//     const segments = pathname.split("/").filter(Boolean);
//     if (segments.length === 0) return "Dashboard";
//     const last = segments[segments.length - 1];
//     return last
//         .split("-")
//         .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//         .join(" ");
// };

// export default function Navbar() {
//     const pathname = usePathname();
//     const title = getPageTitle(pathname);

//     return (
//         <header className="hidden lg:flex items-center justify-between bg-white border-b px-6 py-3">
//             <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
//             <div className="flex items-center gap-4">
//                 <Bell size={20} className="text-gray-500" />
//                 <UserCircle size={28} className="text-gray-600" />
//             </div>
//         </header>
//     );
// }