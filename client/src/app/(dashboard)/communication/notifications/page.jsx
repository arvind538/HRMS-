"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  RefreshCw,
  CalendarDays,
  Clock,
  Wallet,
  ListChecks,
  MessageSquare,
  Megaphone,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

const POLL_MS = 30 * 1000;

const TYPES = {
  leave: { icon: CalendarDays, box: "bg-amber-50 text-amber-600", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  attendance: { icon: Clock, box: "bg-sky-50 text-sky-600", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  payroll: { icon: Wallet, box: "bg-emerald-50 text-emerald-600", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  task: { icon: ListChecks, box: "bg-violet-50 text-violet-600", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  message: { icon: MessageSquare, box: "bg-indigo-50 text-indigo-600", pill: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  announcement: { icon: Megaphone, box: "bg-rose-50 text-rose-600", pill: "bg-rose-50 text-rose-700 border-rose-200" },
  general: { icon: Bell, box: "bg-slate-100 text-slate-500", pill: "bg-slate-100 text-slate-600 border-slate-200" },
};
const typeOf = (n) => TYPES[String(n.type || "").toLowerCase()] || TYPES.general;

const dayKey = (v) => new Date(v).toLocaleDateString("en-CA");

const timeLabel = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min ago`;
  if (dayKey(d) === dayKey(new Date())) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const fullTime = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const groupOf = (v) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = dayKey(v);
  if (key === dayKey(new Date())) return "Today";
  if (key === dayKey(yesterday)) return "Yesterday";
  return "Earlier";
};

const linkOf = (n) => {
  const link = n.link || n.url || n.href;
  return typeof link === "string" && link.startsWith("/") ? link : "";
};

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function NotificationsPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all"); // all | unread

  const fetchData = useCallback(async ({ silent = false, background = false } = {}) => {
    if (!background) {
      if (silent) setRefreshing(true);
      else setLoading(true);
    }
    try {
      const { data } = await api.get("/communication/notifications");
      setItems(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error("Notification fetch error:", err?.response?.data || err.message);
      if (!background) setError(err?.response?.data?.message || "Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* New notifications arrive on their own, every 30 seconds and when the tab is opened again */
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && fetchData({ background: true });
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchData]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const grouped = useMemo(() => {
    const list = tab === "unread" ? items.filter((n) => !n.isRead) : items;
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    list.forEach((n) => groups[groupOf(n.createdAt)].push(n));
    return Object.entries(groups).filter(([, rows]) => rows.length);
  }, [items, tab]);

  const markRead = async (n) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    try {
      await api.put(`/communication/notifications/${n._id}/read`);
    } catch (err) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: false } : x)));
      toast.error(err?.response?.data?.message || "Failed to update the notification.");
    }
  };

  const openItem = (n) => {
    markRead(n);
    const link = linkOf(n);
    if (link) router.push(link);
  };

  const markAllRead = async () => {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    const before = items;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.put("/communication/notifications/mark-all-read");
      toast.success("All notifications marked as read.");
    } catch (err) {
      setItems(before);
      toast.error(err?.response?.data?.message || "Failed to update the notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-5 antialiased pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <BellRing size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 border-2 border-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {unreadCount > 0 ? (
                <>
                  You have <strong className="text-indigo-600">{unreadCount}</strong> unread notification{unreadCount !== 1 ? "s" : ""}.
                </>
              ) : (
                "You are all caught up."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchData({ silent: true })}
            disabled={loading || refreshing}
            className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount || markingAll}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          ["all", "All", items.length],
          ["unread", "Unread", unreadCount],
        ].map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition cursor-pointer ${tab === key
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
              }`}
          >
            {label}
            <span className={`px-1.5 rounded-full text-[10px] ${tab === key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchData()}
            className="self-end sm:self-auto px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-4 sm:p-5 flex gap-3.5 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 py-16 px-4 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Bell size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700">{tab === "unread" ? "No unread notifications" : "No notifications yet"}</p>
          <p className="text-xs text-slate-400 mt-1">
            {tab === "unread" ? "Everything has been read." : "Alerts about leave, attendance, payroll and tasks will show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([group, rows]) => (
            <section key={group}>
              <h2 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group}</h2>
              <ul className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                {rows.map((n) => {
                  const t = typeOf(n);
                  const Icon = t.icon;
                  const typeName = String(n.type || "general").toLowerCase();
                  return (
                    <li key={n._id}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className={`w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 text-left transition-colors duration-150 cursor-pointer ${n.isRead ? "bg-white hover:bg-slate-50" : "bg-indigo-50/50 hover:bg-indigo-50"
                          }`}
                      >
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${t.box}`}>
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-sm break-words ${n.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>{n.title}</p>
                            {!n.isRead && <span className="mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full bg-indigo-600 ring-4 ring-indigo-100" aria-label="Unread" />}
                          </div>
                          {n.message && <p className="mt-1 text-xs text-slate-600 leading-relaxed break-words line-clamp-2">{n.message}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span title={fullTime(n.createdAt)}>{timeLabel(n.createdAt)}</span>
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${t.pill}`}>{typeName}</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}