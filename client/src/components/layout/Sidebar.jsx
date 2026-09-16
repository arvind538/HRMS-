"use client";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    ChevronDown,
    Menu as MenuIcon,
    X as CloseIcon,
    LogOut,
    LayoutGrid,
    Search,
    ShieldCheck
} from "lucide-react";
import { menuConfig } from "@/data/menuConfig";
import { useAuth } from "@/context/AuthContext";

function MenuGroup({ item, pathname, isOpen, onToggle, onItemClick }) {
    const Icon = item.icon;
    const hasChildren = Boolean(item.children?.length);
    const isActiveChild = hasChildren && item.children.some((c) => pathname === c.href);
    const isDirectActive = !hasChildren && pathname === item.href;

    if (!hasChildren) {
        return (
            <Link
                href={item.href || "#"}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mb-1 ${isDirectActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/40"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
            >
                {Icon && (
                    <Icon
                        size={19}
                        className={`transition-transform duration-200 group-hover:scale-105 ${isDirectActive ? "text-white" : "text-slate-400 group-hover:text-white"
                            }`}
                    />
                )}
                <span className="truncate">{item.label}</span>
            </Link>
        );
    }

    return (
        <div className="mb-1">
            <button
                type="button"
                onClick={onToggle}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActiveChild
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
            >
                <span className="flex items-center gap-3 truncate">
                    {Icon && (
                        <Icon
                            size={19}
                            className={`transition-colors duration-200 ${isActiveChild ? "text-white" : "text-slate-400 group-hover:text-white"
                                }`}
                        />
                    )}
                    <span className="truncate">{item.label}</span>
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform duration-300 ease-in-out ${isActiveChild ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                        } ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Submenu Dropdown */}
            <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="ml-5 mt-1 pl-4 border-l-2 border-white/10 flex flex-col gap-1 py-1">
                        {item.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            const ChildIcon = child.icon;

                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={onItemClick}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors duration-150 ${isChildActive
                                        ? "text-white bg-indigo-600 font-semibold"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {ChildIcon && <ChildIcon size={15} className="shrink-0" />}
                                    <span className="truncate">{child.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Role ke hisaab se readable label banata hai
const roleLabel = (role) => {
    const map = {
        admin: "Super Admin",
        hr: "HR Manager",
        manager: "Manager",
        employee: "Employee",
    };
    return map[role] || "Guest";
};

// Naam se initials nikaalta hai avatar ke liye
const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

function SidebarContent({ pathname, openGroup, setOpenGroup, onItemClick }) {
    const [search, setSearch] = useState("");
    const { user, logout } = useAuth();
    const router = useRouter();

    const filteredMenu = search.trim()
        ? menuConfig
            .map((item) => ({
                ...item,
                children: item.children?.filter((c) =>
                    c.label.toLowerCase().includes(search.toLowerCase())
                ),
            }))
            .filter(
                (item) =>
                    item.label.toLowerCase().includes(search.toLowerCase()) ||
                    (item.children && item.children.length > 0)
            )
        : menuConfig;

    const initials = getInitials(user?.name);

    // Footer pe click karte hi /profile pe le jaata hai
    const handleProfileClick = () => {
        onItemClick?.(); // agar mobile drawer khula hai, usse close kar do
        router.push("/profile");
    };

    // Sign-out button ka click profile-click tak bubble na kare, isliye stopPropagation
    const handleLogout = (e) => {
        e.stopPropagation();
        onItemClick?.();
        router.push("/profile");
        toast.success("Welcome to My Profile!")
        // logout();
    };

    return (
        <div className="flex flex-col h-full bg-[#0f1729] select-none">
            {/* Brand Header */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10 shrink-0">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/50">
                    <LayoutGrid size={22} />
                </div>
                <div>
                    <h1 className="text-base font-bold tracking-tight text-white leading-none">
                        HRMS Portal
                    </h1>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Enterprise Workspace</p>
                </div>
            </div>

            {/* Search */}
            <div className="px-3.5 pt-4 pb-2 shrink-0">
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search menus..."
                        className="w-full bg-white/5 text-sm text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-3.5 py-2 space-y-0.5">
                {filteredMenu.map((item) => (
                    <MenuGroup
                        key={item.label}
                        item={item}
                        pathname={pathname}
                        isOpen={search.trim() ? true : openGroup === item.label}
                        onToggle={() => setOpenGroup(openGroup === item.label ? null : item.label)}
                        onItemClick={onItemClick}
                    />
                ))}
            </nav>

            {/* User Footer Profile — ab real user data, clickable → /profile */}
            <div className="p-3 border-t border-white/10 shrink-0">
                <button
                    type="button"
                    onClick={handleProfileClick}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
                >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                            {initials}
                        </div>
                        <div className="truncate text-left">
                            <p className="text-xs font-semibold text-white truncate">
                                {user?.name || "Guest User"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                <ShieldCheck size={10} className="shrink-0" />
                                {roleLabel(user?.role)}
                            </p>
                        </div>
                    </div>
                    <span
                        role="button"
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors shrink-0 text-bold-2xl"
                        title="profile"
                    >
                        <LogOut size={16} />
                    </span>
                </button>
            </div>
        </div>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState(null);

    useEffect(() => {
        const activeParent = menuConfig.find((item) =>
            item.children?.some((child) => child.href === pathname)
        );
        if (activeParent) {
            setOpenGroup(activeParent.label);
        }
    }, [pathname]);

    return (
        <>
            {/* Mobile/Tablet Header Bar (< 1024px) */}
            <header className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-40 shadow-sm">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Open Navigation"
                >
                    <MenuIcon size={22} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                        <LayoutGrid size={18} />
                    </div>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight">HRMS Portal</h1>
                </div>
                <div className="w-9" />
            </header>

            {/* Desktop Persistent Sidebar (>= 1024px) */}
            <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-screen sticky top-0 z-20">
                <SidebarContent
                    pathname={pathname}
                    openGroup={openGroup}
                    setOpenGroup={setOpenGroup}
                />
            </aside>

            {/* Mobile/Tablet Drawer Backdrop & Panel — FIX: lg:hidden add kiya taaki desktop pe kabhi na dikhe */}
            <div
                className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${mobileOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
                    }`}
            >
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
                />

                <div
                    className={`relative w-72 max-w-[85vw] h-full shadow-2xl transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                        }`}
                >
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="absolute top-4 right-3.5 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
                        aria-label="Close Navigation"
                    >
                        <CloseIcon size={18} />
                    </button>

                    <SidebarContent
                        pathname={pathname}
                        openGroup={openGroup}
                        setOpenGroup={setOpenGroup}
                        onItemClick={() => setMobileOpen(false)}
                    />
                </div>
            </div>
        </>
    );
}



// // components/layout/Sidebar.jsx
// "use client";
// import { useState } from "react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { ChevronDown, Menu as MenuIcon } from "lucide-react";
// import { menuConfig } from "@/data/menuConfig";
// import MobileDrawer from "./MobileDrawer";

// function MenuGroup({ item, pathname, isOpen, onToggle }) {
//     const Icon = item.icon;
//     const hasActiveChild = item.children?.some((c) => pathname === c.href);

//     return (
//         <div className="mb-1">
//             <button
//                 onClick={onToggle}
//                 className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
//           ${hasActiveChild ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`}
//             >
//                 <span className="flex items-center gap-3">
//                     <Icon size={18} />
//                     {item.label}
//                 </span>
//                 <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
//             </button>

//             {isOpen && (
//                 <div className="ml-8 mt-1 flex flex-col gap-0.5 border-l border-gray-200 pl-3">
//                     {item.children.map((child) => (
//                         <Link
//                             key={child.href}
//                             href={child.href}
//                             className={`px-2 py-1.5 rounded-md text-sm transition-colors
//                 ${pathname === child.href
//                                     ? "text-indigo-700 font-semibold bg-indigo-50"
//                                     : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
//                         >
//                             {child.label}
//                         </Link>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// }

// function SidebarContent({ pathname, openGroup, setOpenGroup }) {
//     return (
//         <div className="flex flex-col h-full overflow-y-auto px-3 py-4">
//             <div className="px-2 mb-6">
//                 <h1 className="text-xl font-bold text-indigo-700">🏢 HRMS</h1>
//             </div>
//             {menuConfig.map((item) => (
//                 <MenuGroup
//                     key={item.label}
//                     item={item}
//                     pathname={pathname}
//                     isOpen={openGroup === item.label}
//                     onToggle={() => setOpenGroup(openGroup === item.label ? null : item.label)}
//                 />
//             ))}
//         </div>
//     );
// }

// export default function Sidebar() {
//     const pathname = usePathname();
//     const [mobileOpen, setMobileOpen] = useState(false);
//     const [openGroup, setOpenGroup] = useState("Dashboard");

//     return (
//         <>
//             {/* Mobile top bar — sirf lg breakpoint se neeche dikhega */}
//             <div className="lg:hidden flex items-center justify-between bg-white border-b px-4 py-3 sticky top-0 z-30">
//                 <h1 className="text-lg font-bold text-indigo-700">🏢 HRMS</h1>
//                 <button onClick={() => setMobileOpen(true)}>
//                     <MenuIcon size={24} />
//                 </button>
//             </div>

//             {/* Desktop fixed sidebar — sirf lg aur usse upar dikhega */}
//             <aside className="hidden lg:block w-72 shrink-0 bg-white border-r h-screen sticky top-0">
//                 <SidebarContent pathname={pathname} openGroup={openGroup} setOpenGroup={setOpenGroup} />
//             </aside>

//             {/* Mobile/tablet slide-in drawer */}
//             <MobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
//                 <SidebarContent pathname={pathname} openGroup={openGroup} setOpenGroup={setOpenGroup} />
//             </MobileDrawer>
//         </>
//     );
// }