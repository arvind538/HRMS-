"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";

import {
    ChevronDown,
    ChevronsLeft,
    ChevronsRight,
    Menu as MenuIcon,
    X as CloseIcon,
    LogOut,
    LayoutGrid,
    Search,
    ShieldCheck,
} from "lucide-react";

import { menuConfig } from "@/data/menuConfig";
import { useAuth } from "@/context/AuthContext";
import { canAccessPath } from "@/data/permissions";

const BRAND_NAME = "HRMS";
const BRAND_TAGLINE = "Enterprise Workspace";
const SHOW_TAGLINE = false;
const SHOW_SEARCH = true;

/* Ye items "Main Menu" ke upar direct link ki tarah dikhenge (overview/submenu nahi) */
const PINNED_LABELS = ["dashboard", "task", "tasks", "team"];
const isPinned = (item) => PINNED_LABELS.includes(item.label.trim().toLowerCase());

/* Tiny className joiner - no extra package */
const cn = (...classes) => classes.filter(Boolean).join(" ");

/* Thin visible scrollbar */
const SCROLLBAR =
    "[scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400";

/* "/employees/12" should keep "/employees" highlighted */
const matchesPath = (pathname, href) =>
    Boolean(href) &&
    href !== "#" &&
    (pathname === href || pathname.startsWith(`${href}/`));

/* When two sibling links both match, the most specific one wins */
const bestChildHref = (children = [], pathname) =>
    children
        .filter((child) => matchesPath(pathname, child.href))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href || null;

const roleLabel = (role) => {
    const map = {
        admin: "Super Admin",
        hr: "HR Manager",
        manager: "Manager",
        employee: "Employee",
    };
    return map[role] || "Guest";
};

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

/* =========================================================
   BRAND LOGO
========================================================= */

function BrandLogo({ showName = true }) {
    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-violet-900 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <LayoutGrid size={17} strokeWidth={2.2} />
            </div>
            {showName && (
                <div className="min-w-0">
                    <span className="block text-[17px] font-extrabold uppercase tracking-tight text-[#14123a] leading-none truncate">
                        {BRAND_NAME}
                    </span>
                    {SHOW_TAGLINE && (
                        <span className="block text-[10px] text-slate-400 font-medium mt-1 truncate">
                            {BRAND_TAGLINE}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/* =========================================================
   MENU GROUP
========================================================= */

const ROW_BASE =
    "group relative flex items-center h-10 rounded-md text-[14px] font-medium transition-colors duration-150";
const ROW_ACTIVE = "bg-[#F1F5F4] text-slate-900";
const ROW_IDLE = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
const ACTIVE_BAR = "absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-indigo-600";

function MenuGroup({ item, pathname, isOpen, onToggle, onItemClick, collapsed, onTip }) {
    const Icon = item.icon;
    const hasChildren = Boolean(item.children?.length);

    const activeChildHref = hasChildren ? bestChildHref(item.children, pathname) : null;
    const isActiveChild = Boolean(activeChildHref);

    /* Pinned items (Dashboard / Tasks) ke andar ke saare pages par highlighted rahenge */
    const isDirectActive =
        !hasChildren &&
        (item.matchHrefs
            ? item.matchHrefs.some((h) => matchesPath(pathname, h))
            : matchesPath(pathname, item.href));

    /* Tooltip for the collapsed sidebar (fixed position, so it is never clipped) */
    const tipProps = collapsed
        ? {
            onMouseEnter: (e) => onTip?.(item.label, e.currentTarget),
            onMouseLeave: () => onTip?.(null),
            onFocus: (e) => onTip?.(item.label, e.currentTarget),
            onBlur: () => onTip?.(null),
        }
        : {};

    const iconClass = (active) =>
        cn(
            "shrink-0 transition-colors duration-150",
            active ? "text-slate-800" : "text-slate-500 group-hover:text-slate-800"
        );

    if (!hasChildren) {
        return (
            <Link
                href={item.href || "#"}
                onClick={onItemClick}
                aria-label={collapsed ? item.label : undefined}
                aria-current={isDirectActive ? "page" : undefined}
                {...tipProps}
                className={cn(
                    ROW_BASE,
                    "mb-1",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    isDirectActive ? ROW_ACTIVE : ROW_IDLE
                )}
            >
                {isDirectActive && <span className={ACTIVE_BAR} />}
                {Icon && <Icon size={19} strokeWidth={1.6} className={iconClass(isDirectActive)} />}
                {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
        );
    }

    return (
        <div className="mb-1">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={!collapsed && isOpen}
                aria-label={collapsed ? item.label : undefined}
                {...tipProps}
                className={cn(
                    ROW_BASE,
                    "w-full",
                    collapsed ? "justify-center px-2" : "justify-between px-3",
                    isActiveChild ? ROW_ACTIVE : ROW_IDLE
                )}
            >
                {isActiveChild && <span className={ACTIVE_BAR} />}

                <span className={cn("flex items-center min-w-0", collapsed ? "justify-center" : "gap-3")}>
                    {Icon && <Icon size={19} strokeWidth={1.6} className={iconClass(isActiveChild)} />}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                </span>

                {!collapsed && (
                    <ChevronDown
                        size={16}
                        strokeWidth={1.8}
                        className={cn(
                            "shrink-0 text-slate-400 transition-transform duration-300 ease-out",
                            isOpen && "rotate-180 text-slate-700"
                        )}
                    />
                )}
            </button>

            {/* Sub menu */}
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    !collapsed && isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0 pointer-events-none"
                )}
            >
                <div className="overflow-hidden">
                    <div className="ml-[21px] my-1 pl-3 border-l border-slate-200 space-y-0.5">
                        {item.children.map((child) => {
                            const isChildActive = child.href === activeChildHref;
                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={onItemClick}
                                    aria-current={isChildActive ? "page" : undefined}
                                    tabIndex={!collapsed && isOpen ? 0 : -1}
                                    className={cn(
                                        "flex items-center min-h-[36px] px-3 rounded-md text-[13px] font-medium transition-colors duration-150",
                                        isChildActive
                                            ? "text-indigo-600 bg-[#F1F5F4] font-semibold"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
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

/* =========================================================
   SIDEBAR CONTENT
========================================================= */

function SidebarContent({
    pathname,
    openGroup,
    setOpenGroup,
    onItemClick,
    onClose,
    collapsed,
    setCollapsed,
    isMobileDrawer = false,
}) {
    const [search, setSearch] = useState("");
    const [mounted, setMounted] = useState(false);
    const [tip, setTip] = useState(null);
    const { user, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!collapsed) setTip(null);
    }, [collapsed]);

    // Server + first client render must match, so user data is used only after mount
    const safeUser = mounted ? user : null;

    const showTip = (label, el) => {
        if (!label || !el) return setTip(null);
        const r = el.getBoundingClientRect();
        setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
    };

    const roleFilteredMenu = useMemo(() => {
        if (!mounted) return [];
        const userRole = user?.role;
        return menuConfig
            .map((item) => {
                const accessibleChildren = item.children
                    ? item.children.filter((child) => canAccessPath(userRole, child.href))
                    : undefined;
                return { ...item, children: accessibleChildren };
            })
            .filter((item) => {
                if (item.children !== undefined) return item.children.length > 0;
                return canAccessPath(userRole, item.href || "");
            });
    }, [mounted, user?.role]);

    /* Dashboard + Tasks: direct link, no submenu / overview */
    const pinnedMenu = useMemo(() => {
        const query = search.trim().toLowerCase();
        return roleFilteredMenu
            .filter(isPinned)
            .map((item) => ({
                ...item,
                href: item.href || item.children?.[0]?.href || "#",
                matchHrefs: [item.href, ...(item.children || []).map((c) => c.href)].filter(Boolean),
                children: undefined,
            }))
            .filter((item) => !query || item.label.toLowerCase().includes(query));
    }, [roleFilteredMenu, search]);

    /* Baaki menu (Main Menu ke neeche) */
    const mainMenu = useMemo(
        () => roleFilteredMenu.filter((item) => !isPinned(item)),
        [roleFilteredMenu]
    );

    const filteredMenu = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return mainMenu;

        return mainMenu
            .map((item) => {
                // Parent matches: keep every sub item
                if (item.label.toLowerCase().includes(query)) return item;
                if (!item.children) return null;
                const children = item.children.filter((child) =>
                    child.label.toLowerCase().includes(query)
                );
                return children.length ? { ...item, children } : null;
            })
            .filter(Boolean);
    }, [mainMenu, search]);

    const initials = mounted ? getInitials(safeUser?.name) : "";

    /* Collapsed sidebar: clicking a group opens the sidebar and that group */
    const handleGroupToggle = (label) => {
        if (collapsed && setCollapsed) {
            setCollapsed(false);
            setOpenGroup(label);
            setTip(null);
            return;
        }
        setOpenGroup(openGroup === label ? null : label);
    };

    const handleProfileClick = () => {
        onItemClick?.();
        router.push("/profile");
    };

    const handleLogout = (e) => {
        e.stopPropagation();
        onItemClick?.();
        toast.success("Logged out successfully!");
        logout?.();
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none relative">
            {/* HEADER */}
            <div
                className={cn(
                    "relative h-[68px] shrink-0 flex items-center border-b border-slate-100",
                    collapsed ? "justify-center px-2" : "justify-between px-5"
                )}
            >
                <BrandLogo showName={!collapsed} />

                {/* Close button (mobile drawer) */}
                {isMobileDrawer && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close sidebar"
                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    >
                        <CloseIcon size={30} />
                    </button>
                )}

                {/* Collapse / expand button (desktop only) */}
                {!isMobileDrawer && setCollapsed && (
                    <button
                        type="button"
                        onClick={() => setCollapsed((prev) => !prev)}
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-50 h-7 w-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-200"
                    >
                        {collapsed ? (
                            <ChevronsRight size={18} strokeWidth={2.2} />
                        ) : (
                            <ChevronsLeft size={18} strokeWidth={2.2} />
                        )}
                    </button>
                )}
            </div>

            {/* SEARCH */}
            {/* {SHOW_SEARCH && !collapsed && (
                <div className="px-4 pt-4 pb-1 shrink-0">
                    <div className="relative">
                        <Search
                            size={15}
                            strokeWidth={1.8}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search menus..."
                            className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 pl-9 pr-3 text-base sm:text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all duration-200"
                        />
                    </div>
                </div>
            )} */}

            {/* PINNED: Dashboard + Tasks (Main Menu se upar) */}
            {mounted && pinnedMenu.length > 0 && (
                <div className={cn("shrink-0 pt-3", collapsed ? "px-3" : "px-3.5")}>
                    {pinnedMenu.map((item) => (
                        <MenuGroup
                            key={item.label}
                            item={item}
                            pathname={pathname}
                            collapsed={collapsed}
                            isOpen={false}
                            onToggle={() => { }}
                            onItemClick={onItemClick}
                            onTip={showTip}
                        />
                    ))}
                </div>
            )}

            {!collapsed && (
                <div className="px-5 pt-4 pb-1.5 shrink-0">
                    <p className="text-[11px] font-semibold text-slate-500">Main Menu</p>
                </div>
            )}

            {/* NAVIGATION */}
            <nav
                onScroll={() => setTip(null)}
                className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-2",
                    SCROLLBAR,
                    collapsed ? "px-3" : "px-3.5"
                )}
            >
                {!mounted ? (
                    <div className="space-y-2 py-2">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-10 rounded-md bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : filteredMenu.length === 0 && pinnedMenu.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">No menu found.</p>
                ) : (
                    filteredMenu.map((item) => (
                        <MenuGroup
                            key={item.label}
                            item={item}
                            pathname={pathname}
                            collapsed={collapsed}
                            isOpen={search.trim() ? true : openGroup === item.label}
                            onToggle={() => handleGroupToggle(item.label)}
                            onItemClick={onItemClick}
                            onTip={showTip}
                        />
                    ))
                )}
            </nav>

            {/* USER PROFILE */}
            <div className="p-3 border-t border-slate-100 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {collapsed ? (
                    <button
                        type="button"
                        onClick={handleProfileClick}
                        title={safeUser?.name || "Profile"}
                        aria-label="Open profile"
                        className="mx-auto h-9 w-9 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center hover:bg-indigo-700 transition-colors"
                    >
                        {initials}
                    </button>
                ) : (
                    <div
                        onClick={handleProfileClick}
                        className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/60 hover:border-indigo-100 transition-all duration-200 cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">
                                    {mounted ? safeUser?.name || "Guest User" : "\u00A0"}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 truncate">
                                    <ShieldCheck size={11} className="shrink-0 text-emerald-500" />
                                    {mounted ? roleLabel(safeUser?.role) : "\u00A0"}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            title="Logout"
                            aria-label="Logout"
                            className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white transition-colors"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Tooltip for the collapsed sidebar */}
            {collapsed && tip && (
                <div
                    role="tooltip"
                    style={{ top: tip.top, left: tip.left }}
                    className="pointer-events-none fixed z-[200] -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl"
                >
                    {tip.label}
                </div>
            )}
        </div>
    );
}

/* =========================================================
   MAIN SIDEBAR
========================================================= */

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState(null);
    const [collapsed, setCollapsed] = useState(false);

    /* Open the group that contains the current page (pinned items skip) */
    useEffect(() => {
        const activeParent = menuConfig.find(
            (item) =>
                !isPinned(item) &&
                item.children?.length &&
                bestChildHref(item.children, pathname)
        );
        if (activeParent) setOpenGroup(activeParent.label);
    }, [pathname]);

    /* Close the drawer after navigation */
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    /* Lock page scroll and support the Escape key while the drawer is open */
    useEffect(() => {
        if (!mobileOpen) return;
        const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [mobileOpen]);

    /* If the screen grows to desktop size while the drawer is open, close it */
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 1024px)");
        const onChange = (e) => e.matches && setMobileOpen(false);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    return (
        <>
            {/* MOBILE / TABLET TOPBAR */}
            <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-3 sm:px-4 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-white border-b border-slate-200 shadow-sm">
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open sidebar"
                    aria-expanded={mobileOpen}
                    className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                >
                    <MenuIcon size={21} />
                </button>

                <BrandLogo />

                <div className="w-10" />
            </header>

            {/* DESKTOP SIDEBAR */}
            <aside
                className={cn(
                    "hidden lg:block h-screen sticky top-0 z-30 shrink-0 overflow-visible transition-[width] duration-300 ease-in-out",
                    collapsed ? "w-[76px]" : "w-[250px] xl:w-[270px]"
                )}
            >
                <SidebarContent
                    pathname={pathname}
                    openGroup={openGroup}
                    setOpenGroup={setOpenGroup}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    isMobileDrawer={false}
                />
            </aside>

            {/* MOBILE SIDEBAR DRAWER */}
            <div
                aria-hidden={!mobileOpen}
                className={cn(
                    "lg:hidden fixed inset-0 z-[100] transition-all duration-300",
                    mobileOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
                )}
            >
                <div
                    onClick={() => setMobileOpen(false)}
                    className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
                />

                <div
                    className={cn(
                        "relative h-[100dvh] w-[280px] max-w-[86vw] shadow-2xl transition-transform duration-300 ease-out",
                        mobileOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <SidebarContent
                        pathname={pathname}
                        openGroup={openGroup}
                        setOpenGroup={setOpenGroup}
                        collapsed={false}
                        setCollapsed={null}
                        isMobileDrawer={true}
                        onItemClick={() => setMobileOpen(false)}
                        onClose={() => setMobileOpen(false)}
                    />
                </div>
            </div>
        </>
    );
}

