// src/components/auth/RoleGuard.jsx
"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccessPath } from "@/data/permissions";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function RoleGuard({ children }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [checked, setChecked] = useState(false);
    const [allowed, setAllowed] = useState(true);

    useEffect(() => {
        if (loading) return;

        // If the user is not logged in, redirect to the login page
        if (!user) {
            router.replace("/login");
            return;
        }

        // Check role permissions for the current path
        const hasAccess = canAccessPath(user.role, pathname);
        setAllowed(hasAccess);
        setChecked(true);
    }, [user, loading, pathname, router]);

    // Auth state is loading — show a spinner
    if (loading || !checked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 size={28} className="animate-spin text-indigo-600 transition-transform duration-300 hover:scale-110" />
            </div>
        );
    }

    // Access denied — show "Unauthorized" screen, do not render the page
    if (!allowed) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-105 hover:bg-rose-100">
                    <ShieldAlert size={28} className="text-rose-500 transition-colors duration-200 hover:text-rose-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h2>
                <p className="text-sm text-slate-500 max-w-sm">
                    Your role ({user?.role}) does not have permission to access this page.
                </p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return children;
}