import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "https://hrms-15-4xfs.onrender.com/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
});

let isRedirecting = false;

// ---------------- REQUEST INTERCEPTOR ----------------
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("hrms_token");
            if (token) {
                if (config.headers?.set) {
                    config.headers.set("Authorization", `Bearer ${token}`);
                } else {
                    config.headers = config.headers || {};
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ---------------- RESPONSE INTERCEPTOR ----------------
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || "";
        const isAuthEndpoint =
            requestUrl.includes("/auth/login") ||
            requestUrl.includes("/auth/register");

        // 1. Handle 403 Forbidden (Role Access Denied)
        if (error.response?.status === 403) {
            if (typeof window !== "undefined") {
                const message =
                    error.response?.data?.message ||
                    "Access Denied: Aapke paas is feature ka access nahi hai.";

                // toastId prevent karta hai multiple duplicate toasts ko agar parallel calls hon
                toast.error(message, { toastId: "role-access-denied" });
            }

            // Next.js red screen / runtime throw na kare, isliye safe empty response return karein
            return Promise.resolve({
                data: null,
                status: 403,
                statusText: "Forbidden",
                headers: error.response.headers,
                config: error.config,
                isDenied: true,
            });
        }

        // 2. Handle 401 Unauthorized (Expired / Invalid Token)
        if (
            error.response?.status === 401 &&
            typeof window !== "undefined" &&
            !isAuthEndpoint
        ) {
            localStorage.removeItem("hrms_token");
            localStorage.removeItem("hrms_user");

            if (window.location.pathname !== "/login" && !isRedirecting) {
                isRedirecting = true;
                toast.error("Session expire ho gaya hai, dobara login karein.", {
                    toastId: "session-expired",
                });
                window.location.href = "/login";
            }

            return Promise.resolve({ data: null, status: 401 });
        }

        // 3. Baaki unknown errors ko normally reject karein
        return Promise.reject(error);
    }
);

export default api;



// import axios from "axios";

// const api = axios.create({
//     baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
//     headers: {
//         "Content-Type": "application/json",
//     },
//     timeout: 15000,
// });

// api.interceptors.request.use((config) => {
//     if (typeof window !== "undefined") {
//         const token = localStorage.getItem("hrms_token");
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//     }
//     return config;
// });

// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         const requestUrl = error.config?.url || "";
//         const isAuthEndpoint = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

//         if (error.response?.status === 401 && typeof window !== "undefined" && !isAuthEndpoint) {
//             localStorage.removeItem("hrms_token");
//             localStorage.removeItem("hrms_user");
//             if (window.location.pathname !== "/login") {
//                 window.location.href = "/login";
//             }
//         }

//         if (typeof window !== "undefined") {
//             const status = error.response?.status || "Network Error";
//             const message = error.response?.data?.message || error.message;

//             // Agar backend hi unreachable hai, ye message explicitly bata do —
//             // taaki "Network Error" console mein confusing na lage
//             const friendlyMessage = !error.response
//                 ? `Backend server (${api.defaults.baseURL}) tak pahunch nahi paaye. Check karo backend chal raha hai ya nahi, aur .env.local mein URL sahi hai ya nahi.`
//                 : message;

//             console.error(
//                 `%c[API Error] ${status} → ${requestUrl}`,
//                 "color: #ef4444; font-weight: bold;",
//                 `\n${friendlyMessage}`
//             );
//         }

//         return Promise.reject(error);
//     }
// );

// export default api;