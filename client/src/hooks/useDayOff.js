"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

/* Aaj ki date, India time me, YYYY-MM-DD format */
const todayIST = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function useDayOff() {
    const [state, setState] = useState({
        loaded: false,
        isOff: false,
        type: null,
        name: "",
    });

    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get("/attendance/day-info", {
                params: { date: todayIST() },
            });
            setState({
                loaded: true,
                isOff: Boolean(data?.isOff),
                type: data?.type || null,
                name: data?.name || "",
            });
        } catch {
            // Server error par state ko reset nahi karte, bas loaded mark karte hain
            setState((s) => ({ ...s, loaded: true }));
        }
    }, []);

    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, 60 * 1000);
        return () => clearInterval(timer);
    }, [refresh]);

    const message =
        state.type === "holiday"
            ? `Aaj office band hai${state.name ? ` (${state.name})` : ""}. Punch nahi ho sakta.`
            : "Aaj Sunday (weekly off) hai. Punch nahi ho sakta.";

    return { ...state, message, refresh };
}