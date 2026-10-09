"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { saveAuth, getStoredUser, getToken, clearAuth, isTokenExpired } from "@/lib/auth";

const AuthContext = createContext(null);

/* Pages that can be opened without login */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
const isPublicPath = (pathname) =>
    PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

/* Cookies are read by middleware.js (if you use it). Safe to keep otherwise. */
const setCookies = (token, role) => {
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `role=${role || "employee"}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

const clearCookies = () => {
    if (typeof document === "undefined") return;
    document.cookie = "token=; path=/; max-age=0";
    document.cookie = "role=; path=/; max-age=0";
};



const buildUser = (account, employeeProfile) => {
    const role = String(account?.role || "employee").toLowerCase().trim();
    const employee =
        employeeProfile && typeof employeeProfile === "object"
            ? { ...employeeProfile, role }
            : { name: account?.name, email: account?.email, role };
    return { ...account, role, employee };
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const booted = useRef(false);

    const logout = useCallback(() => {
        clearAuth();
        clearCookies();
        setUser(null);
        router.replace("/login");
    }, [router]);

    /* Restore the session on first load, then refresh the profile quietly */
    useEffect(() => {
        if (booted.current) return;
        booted.current = true;

        const token = getToken();
        const storedUser = getStoredUser();

        if (!token || !storedUser || isTokenExpired(token)) {
            clearAuth();
            clearCookies();
            setLoading(false);
            return;
        }

        setUser(storedUser);
        setCookies(token, storedUser.role);
        setLoading(false);

        // Pick up role changes, and sign out accounts that the admin disabled
        api
            .get("/auth/me")
            .then((res) => {
                const fresh = res?.data;
                if (!fresh?._id) return;
                const merged = buildUser({ ...storedUser, ...fresh }, fresh.employee);
                saveAuth(merged, token);
                setCookies(token, merged.role);
                setUser(merged);
            })
            .catch((err) => {
                const status = err?.response?.status;
                if (status === 401 || status === 403) logout();
            });
    }, [logout]);

    /* Route guard */
    useEffect(() => {
        if (loading) return;
        const publicPage = isPublicPath(pathname);
        const isResetPage = pathname?.startsWith("/reset-password");

        if (!user && !publicPage) router.replace("/login");
        // A logged-in user may still open a reset link, so the reset page is not redirected
        else if (user && publicPage && !isResetPage) router.replace("/dashboard");
    }, [user, loading, pathname, router]);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });

            const token = data?.token;
            if (!token) throw new Error("Login response did not include a token.");

            // Backend response: { _id, name, email, role, employee, token }
            // (also supports { token, user: {...} })
            const { token: _token, user: nested, ...flat } = data;
            const account = nested || flat;

            if (!account?.role && !account?.email) {
                throw new Error("Unable to read your profile from the login response.");
            }

            const userData = buildUser(account, account.employee);

            saveAuth(userData, token);
            setCookies(token, userData.role);
            setUser(userData);
            router.replace("/dashboard");
            return userData;
        } catch (error) {
            console.error("Login context error:", error);
            throw error;
        }
    };

    /* Stop protected pages from flashing while the session is being checked */
    if (loading && !isPublicPath(pathname)) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
                <Loader2 size={30} className="animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};





// "use client";

// import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import { Loader2 } from "lucide-react";
// import api from "@/lib/api";
// import { saveAuth, getStoredUser, getToken, clearAuth, isTokenExpired } from "@/lib/auth";

// const AuthContext = createContext(null);

// /* Pages that can be opened without login */
// const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
// const isPublicPath = (pathname) =>
//     PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

// /* Cookies are read by middleware.js (if you use it). Safe to keep otherwise. */
// const setCookies = (token, role) => {
//     if (typeof document === "undefined") return;
//     const maxAge = 60 * 60 * 24 * 7;
//     document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
//     document.cookie = `role=${role || "employee"}; path=/; max-age=${maxAge}; SameSite=Lax`;
// };

// const clearCookies = () => {
//     if (typeof document === "undefined") return;
//     document.cookie = "token=; path=/; max-age=0";
//     document.cookie = "role=; path=/; max-age=0";
// };

// export function AuthProvider({ children }) {
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const router = useRouter();
//     const pathname = usePathname();
//     const booted = useRef(false);

//     const logout = useCallback(() => {
//         clearAuth();
//         clearCookies();
//         setUser(null);
//         router.replace("/login");
//     }, [router]);

//     /* Restore the session on first load, then refresh the profile quietly */
//     useEffect(() => {
//         if (booted.current) return;
//         booted.current = true;

//         const token = getToken();
//         const storedUser = getStoredUser();

//         if (!token || !storedUser || isTokenExpired(token)) {
//             clearAuth();
//             clearCookies();
//             setLoading(false);
//             return;
//         }

//         setUser(storedUser);
//         setCookies(token, storedUser.role);
//         setLoading(false);

//         // Pick up role changes, and sign out accounts that were disabled by the admin
//         api
//             .get("/employees/me")
//             .then((res) => {
//                 const fresh = res?.data?.employee || res?.data?.user;
//                 if (!fresh) return;
//                 const merged = { ...storedUser, ...fresh, employee: storedUser.employee || null };
//                 saveAuth(merged, token);
//                 setCookies(token, merged.role);
//                 setUser(merged);
//             })
//             .catch((err) => {
//                 const status = err?.response?.status;
//                 if (status === 401 || status === 403) logout();
//             });
//     }, [logout]);

//     /* Route guard: logged-out users see only public pages, logged-in users skip the login pages */
//     useEffect(() => {
//         if (loading) return;
//         const publicPage = isPublicPath(pathname);

//         if (!user && !publicPage) router.replace("/login");
//         else if (user && publicPage) router.replace("/dashboard");
//     }, [user, loading, pathname, router]);

//     // const login = async (email, password) => {
//     //     try {
//     //         const { data } = await api.post("/auth/login", { email, password });

//     //         // Backend response: { token, user: { _id, employeeId, name, email, role, avatar } }
//     //         const token = data.token;
//     //         const account = data.user || {};
//     //         if (!token) throw new Error("Login response did not include a token.");

//     //         const { employee, ...rest } = account;
//     //         const userData = { ...rest, employee: employee || null };

//     //         saveAuth(userData, token);
//     //         setCookies(token, userData.role);
//     //         setUser(userData);
//     //         router.replace("/dashboard");
//     //         return userData;
//     //     } catch (error) {
//     //         console.error("Login context error:", error);
//     //         throw error;
//     //     }
//     // };
//     const login = async (email, password) => {
//         try {
//             const { data } = await api.post("/auth/login", { email, password });

//             const token = data.token;
//             if (!token) throw new Error("Login response did not include a token.");

//             // Shape 1: { token, user: {...} }   Shape 2: { token, _id, name, role, ... }
//             const { token: _t, user, employee, message, success, ...flat } = data;
//             let account = user || (flat.role || flat.email ? flat : null);

//             // Shape 3: login response has no user data -> fetch the profile
//             if (!account) {
//                 saveAuth({ employee: null }, token); // so api.js can attach the token
//                 for (const url of ["/auth/me", "/employees/me"]) {
//                     try {
//                         const res = await api.get(url);
//                         const p = res?.data?.employee || res?.data?.user || res?.data;
//                         if (p && (p.role || p.email)) {
//                             account = p;
//                             break;
//                         }
//                     } catch { }
//                 }
//             }

//             if (!account) throw new Error("Unable to load your profile after login.");

//             const userData = {
//                 ...account,
//                 role: String(account.role || employee?.role || "employee").toLowerCase().trim(),
//                 employee: employee || account,
//             };

//             saveAuth(userData, token);
//             setCookies(token, userData.role);
//             setUser(userData);
//             router.replace("/dashboard");
//             return userData;
//         } catch (error) {
//             console.error("Login context error:", error);
//             throw error;
//         }
//     };

//     /* Stop protected pages from flashing while the session is being checked */
//     if (loading && !isPublicPath(pathname)) {
//         return (
//             <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
//                 <Loader2 size={30} className="animate-spin text-indigo-600" />
//             </div>
//         );
//     }

//     return (
//         <AuthContext.Provider value={{ user, loading, login, logout }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

// export const useAuth = () => {
//     const context = useContext(AuthContext);
//     if (!context) throw new Error("useAuth must be used within AuthProvider");
//     return context;
// };


// "use client";
// import { createContext, useContext, useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import api from "@/lib/api";
// import { saveAuth, getStoredUser, getToken, clearAuth, isTokenExpired } from "@/lib/auth";

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const router = useRouter();

//     useEffect(() => {
//         const token = getToken();
//         const storedUser = getStoredUser();

//         if (token && storedUser && !isTokenExpired(token)) {
//             setUser(storedUser);
//         } else {
//             clearAuth();
//         }
//         setLoading(false);
//     }, []);

//     const login = async (email, password) => {
//         try {
//             const { data } = await api.post("/auth/login", { email, password });

//             const { token, employee, ...restUserData } = data.user || data;
//             const userData = {
//                 ...restUserData,
//                 employee: employee || null,
//             };

//             saveAuth(userData, token);
//             setUser(userData);
//             router.push("/dashboard");
//             return userData;
//         } catch (error) {
//             console.error("Login context error:", error);
//             throw error;
//         }
//     };

//     // const register = async (formData) => {
//     //     try {
//     //         const { data } = await api.post("/auth/register", formData);
//     //         router.push("/login");
//     //         return data;
//     //     } catch (error) {
//     //         console.error("Register context error:", error);
//     //         throw error;
//     //     }
//     // };

//     const logout = () => {
//         clearAuth();
//         setUser(null);
//         router.push("/login");
//     };

//     return (
//         <AuthContext.Provider value={{ user, loading, login, logout }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

// export const useAuth = () => {
//     const context = useContext(AuthContext);
//     if (!context) throw new Error("useAuth must be used within AuthProvider");
//     return context;
// };





// // // src/context/AuthContext.js
// // "use client";
// // import { createContext, useContext, useState, useEffect } from "react";
// // import { useRouter } from "next/navigation";
// // import api from "@/lib/api";
// // import { saveAuth, getStoredUser, getToken, clearAuth, isTokenExpired } from "@/lib/auth";

// // const AuthContext = createContext(null);

// // export function AuthProvider({ children }) {
// //     const [user, setUser] = useState(null);
// //     const [loading, setLoading] = useState(true);
// //     const router = useRouter();

// //     useEffect(() => {
// //         const token = getToken();
// //         const storedUser = getStoredUser();

// //         if (token && storedUser && !isTokenExpired(token)) {
// //             setUser(storedUser);
// //         } else {
// //             clearAuth();
// //         }
// //         setLoading(false);
// //     }, []);

// //     const login = async (email, password) => {
// //         try {
// //             const { data } = await api.post("/auth/login", { email, password });

// //             // Extract token and user data from backend response
// //             const { token, employee, ...restUserData } = data.user || data;

// //             // FIX: Ensure employee is never stored as raw null if we want a fallback or clean structure
// //             const userData = {
// //                 ...restUserData,
// //                 employee: employee || restUserData._id // Falls back to user id if employee profile is missing/null
// //             };

// //             saveAuth(userData, token);
// //             setUser(userData);
// //             router.push("/dashboard");
// //             return userData;
// //         } catch (error) {
// //             console.error("Login context error:", error);
// //             throw error;
// //         }
// //     };

// //     // Register keeps account creation separate and redirects to login page
// //     const register = async (formData) => {
// //         try {
// //             const { data } = await api.post("/auth/register", formData);
// //             router.push("/login");
// //             return data;
// //         } catch (error) {
// //             console.error("Register context error:", error);
// //             throw error;
// //         }
// //     };

// //     const logout = () => {
// //         clearAuth();
// //         setUser(null);
// //         router.push("/login");
// //     };

// //     return (
// //         <AuthContext.Provider value={{ user, loading, login, register, logout }}>
// //             {children}
// //         </AuthContext.Provider>
// //     );
// // }

// // export const useAuth = () => {
// //     const context = useContext(AuthContext);
// //     if (!context) throw new Error("useAuth must be used within AuthProvider");
// //     return context;
// // };