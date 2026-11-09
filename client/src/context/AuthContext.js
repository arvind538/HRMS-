"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";

const AuthContext = createContext(null);

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
const isPublicPath = (p) => PUBLIC_PATHS.some((x) => p === x || p?.startsWith(`${x}/`));

const SHARED_FIELDS = ["name", "email", "phone", "countryCode", "gender", "address", "timezone", "avatar"];
const pickShared = (obj = {}) =>
    SHARED_FIELDS.reduce((acc, k) => {
        if (obj[k] !== undefined) acc[k] = obj[k];
        return acc;
    }, {});

const buildUser = (account) => {
    const role = String(account?.role || "employee").toLowerCase().trim();
    const employee =
        account?.employee && typeof account.employee === "object"
            ? { ...account.employee, role }
            : { name: account?.name, email: account?.email, role };
    return { ...account, role, employee };
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const userRef = useRef(null);

    // State aur ref ek saath update ho (updateUser me latest value ke liye)
    const setUserSafe = useCallback((next) => {
        userRef.current = next;
        setUser(next);
    }, []);

    /* Purane localStorage ka data saaf karo (ek baar, safe hai) */
    useEffect(() => {
        try {
            localStorage.removeItem("hrms_token");
            localStorage.removeItem("hrms_user");
        } catch { }
    }, []);

    /* Server se session check: cookie valid hai to user milega */
    // const refreshUser = useCallback(async () => {
    //     try {
    //         const { data } = await api.get("/auth/me");
    //         if (!data?._id) {
    //             setUserSafe(null);
    //             return null;
    //         }
    //         const merged = buildUser({ ...(userRef.current || {}), ...data });
    //         setUserSafe(merged);
    //         return merged;
    //     } catch (err) {
    //         if (err?.response?.status === 401) setUserSafe(null);
    //         return null;
    //     }
    // }, [setUserSafe]);

    const refreshUser = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me", {
                params: { _: Date.now() },
                headers: { "Cache-Control": "no-cache" },
            });
            if (!data?._id) {
                setUserSafe(null);
                return null;
            }
            const merged = buildUser({ ...(userRef.current || {}), ...data });
            setUserSafe(merged);
            return merged;
        } catch (err) {
            if (err?.response?.status === 401) setUserSafe(null);
            return null;
        }
    }, [setUserSafe]);


    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } catch { }
        setUserSafe(null);
        router.replace("/login");
    }, [router, setUserSafe]);

    /* Profile se update: state me turant badlega, dashboard/header sab jagah dikhega */
    const updateUser = useCallback(
        (patch) => {
            const prev = userRef.current;
            if (!prev || !patch) return;
            const shared = pickShared(patch);
            const next = buildUser({
                ...prev,
                ...shared,
                employee: { ...(prev.employee || {}), ...shared },
            });
            setUserSafe(next);
        },
        [setUserSafe]
    );

    /* Page load par session check */
    useEffect(() => {
        refreshUser().finally(() => setLoading(false));
    }, [refreshUser]);

    /* api.js me 401 aaye (session khatam) to login par bhejo */
    useEffect(() => {
        const onUnauthorized = () => setUserSafe(null);
        window.addEventListener("hrms:unauthorized", onUnauthorized);
        return () => window.removeEventListener("hrms:unauthorized", onUnauthorized);
    }, [setUserSafe]);

    /* Route guard */
    useEffect(() => {
        if (loading) return;
        const publicPage = isPublicPath(pathname);
        const isResetPage = pathname?.startsWith("/reset-password");

        if (!user && !publicPage) router.replace("/login");
        else if (user && publicPage && !isResetPage) router.replace("/dashboard");
    }, [user, loading, pathname, router]);

    const login = async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        const data = res?.data || {};

        // Backend ka shape kuch bhi ho sakta hai: direct user, { user }, ya { data }
        const account = data.user || data.data || data;
        const id = account?._id || account?.id;

        if (!id) {
            console.error("LOGIN RESPONSE:", data);
            throw new Error("Login ka response user data nahi bhej raha. Console me LOGIN RESPONSE dekho.");
        }

        const userData = buildUser({ ...account, _id: id });
        setUserSafe(userData);
        router.replace("/dashboard");
        return userData;
    };

    if (loading && !isPublicPath(pathname)) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
                <Loader2 size={30} className="animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                updateUser,
                setUser: updateUser,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
