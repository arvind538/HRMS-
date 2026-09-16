// src/context/AuthContext.js
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { saveAuth, getStoredUser, getToken, clearAuth, isTokenExpired } from "@/lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = getToken();
        const storedUser = getStoredUser();

        if (token && storedUser && !isTokenExpired(token)) {
            setUser(storedUser);
        } else {
            clearAuth();
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });

            // Extract token and user data from backend response
            const { token, employee, ...restUserData } = data.user || data;

            // FIX: Ensure employee is never stored as raw null if we want a fallback or clean structure
            const userData = {
                ...restUserData,
                employee: employee || restUserData._id // Falls back to user id if employee profile is missing/null
            };

            saveAuth(userData, token);
            setUser(userData);
            router.push("/dashboard");
            return userData;
        } catch (error) {
            console.error("Login context error:", error);
            throw error;
        }
    };

    // Register keeps account creation separate and redirects to login page
    const register = async (formData) => {
        try {
            const { data } = await api.post("/auth/register", formData);
            router.push("/login");
            return data;
        } catch (error) {
            console.error("Register context error:", error);
            throw error;
        }
    };

    const logout = () => {
        clearAuth();
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};