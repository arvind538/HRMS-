"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return; // jab tak auth check chal raha hai, wait karo

        if (user) {
            router.replace("/dashboard");
        } else {
            router.replace("/login");
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-sm text-gray-400">Loading HRMS...</p>
            </div>
        </div>
    );
}