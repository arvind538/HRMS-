// components/layout/Navbar.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Bell,
    User,
    Settings,
    LogOut,
    ChevronDown,
    ShieldCheck
} from "lucide-react";
import { menuConfig } from "@/data/menuConfig";
import { useAuth } from "@/context/AuthContext";

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

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const breadcrumb = getBreadcrumb(pathname);

    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationCount] = useState(3);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const badge = roleBadge(user?.role);
    const initials = getInitials(user?.name);

    const handleLogout = () => {
        setProfileOpen(false);
        logout();
    };

    return (
        /* Top aur Bottom borders ko bold (border-t-2 border-b-2) aur smooth slate color diya gaya hai */
        <header className="w-full bg-white/95 backdrop-blur-md border-t-2 border-b-2 border-slate-200 sticky top-0 z-30 transition-all">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                {/* Breadcrumb Trail */}
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
                                    <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">
                                        {crumb.label}
                                    </h2>
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

                {/* Right Action Icons */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <button
                        type="button"
                        className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all duration-200 active:scale-95 focus:outline-none"
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                        {notificationCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                            </span>
                        )}
                    </button>

                    {/* Profile Dropdown Container */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all duration-200 active:scale-95 focus:outline-none"
                        >
                            <div className="relative">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center shadow-sm transition-transform duration-300 hover:rotate-6">
                                    {initials}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>

                            <div className="hidden md:flex flex-col text-left min-w-0">
                                <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                                    {user?.name || "Guest"}
                                </span>
                                <span className="text-[10px] text-slate-400 leading-tight">
                                    {badge.label}
                                </span>
                            </div>

                            <ChevronDown
                                size={15}
                                className={`text-slate-400 transition-transform duration-300 shrink-0 ${profileOpen ? "rotate-180 text-indigo-600" : ""}`}
                            />
                        </button>

                        {/* Profile Dropdown Menu */}
                        <div
                            className={`absolute right-0 mt-2 w-60 bg-white rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-200/50 py-1.5 origin-top-right transition-all duration-200 ease-out z-50 ${profileOpen
                                ? "opacity-100 scale-100 translate-y-0"
                                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                                }`}
                        >
                            <div className="px-4 py-3 border-b-2 border-slate-100 bg-slate-50/50 rounded-t-2xl">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                    {user?.name || "Guest User"}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">
                                    {user?.email || "—"}
                                </p>
                                <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${badge.className}`}>
                                    <ShieldCheck size={12} />
                                    <span>{badge.label}</span>
                                </div>
                            </div>

                            <div className="p-1 space-y-0.5">
                                <Link
                                    href="/profile"
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors duration-150"
                                >
                                    <User size={15} />
                                    <span>My Profile</span>
                                </Link>
                                <Link
                                    href="/settings/general"
                                    onClick={() => setProfileOpen(false)}
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors duration-150"
                                >
                                    <Settings size={15} />
                                    <span>Account Settings</span>
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