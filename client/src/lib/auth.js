// Client-side helper functions — token/user ko localStorage mein manage karne ke liye

export const saveAuth = (user, token) => {
    localStorage.setItem("hrms_token", token);
    localStorage.setItem("hrms_user", JSON.stringify(user));
};

export const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("hrms_token");
};

export const getStoredUser = () => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("hrms_user");
    return user ? JSON.parse(user) : null;
};

export const clearAuth = () => {
    localStorage.removeItem("hrms_token");
    localStorage.removeItem("hrms_user");
};

export const isAuthenticated = () => !!getToken();

// JWT payload decode karta hai (bina library ke) — expiry check karne ke kaam aata hai
export const decodeToken = (token) => {
    try {
        const payload = token.split(".")[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
};

export const isTokenExpired = (token) => {
    const decoded = decodeToken(token);
    if (!decoded?.exp) return true;
    return Date.now() >= decoded.exp * 1000;
};