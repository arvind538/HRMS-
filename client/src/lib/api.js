import axios from "axios";

// Same origin ("/api"): Next.js rewrites send it to the backend, and the cookie is saved by the browser
const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    timeout: 60000,
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const cfg = error?.config;
        const status = error?.response?.status;
        const isGet = String(cfg?.method || "get").toLowerCase() === "get";
        const transient = !error.response || [502, 503, 504].includes(status); // network down or the server is waking up

        // only GET is repeated. Saving or deleting is never repeated by itself.
        if (cfg && isGet && transient && !axios.isCancel(error) && (cfg.__retry || 0) < 2) {
            cfg.__retry = (cfg.__retry || 0) + 1;
            await wait(1500 * cfg.__retry);
            return api(cfg);
        }

        const url = String(cfg?.url || "");
        const isAuthCall = /\/auth\/(login|me|logout)/.test(url);
        if (status === 401 && !isAuthCall && typeof window !== "undefined") {
            window.dispatchEvent(new Event("hrms:unauthorized"));
        }
        return Promise.reject(error);
    }
);

export default api;
