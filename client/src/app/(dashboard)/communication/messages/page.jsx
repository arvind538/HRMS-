"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Ban, Check, CheckCheck, ChevronDown, Clock, Copy, Eye, Image as ImageIcon, Loader2,
  MessageSquare, Paperclip, Search, Send, Trash2, Users, X,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

const MAX_LEN = 2000;
const MAX_IMG = 5 * 1024 * 1024; // 5 MB
const MESSAGE_POLL_MS = 4000;
const CHAT_POLL_MS = 10000;
const ROLE_LABEL = { admin: "Admin", hr: "HR", manager: "Manager", employee: "Employee" };
const COLORS = ["bg-indigo-600", "bg-emerald-600", "bg-rose-500", "bg-amber-500", "bg-sky-600", "bg-violet-600", "bg-teal-600", "bg-pink-600"];

/* ----------------------------- helpers ----------------------------- */

const idOf = (v) => String(v?._id || v || "");
const colorFor = (id) => COLORS[[...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];

const initialsOf = (name) => {
  const parts = String(name || "?").trim().split(" ").filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
};

const dayKey = (v) => new Date(v).toLocaleDateString("en-CA");
const timeLabel = (v) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const dayLabel = (v) => {
  const d = new Date(v);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

const listTime = (v) => {
  const d = new Date(v);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return timeLabel(d);
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB");
};

/* uploaded files are served by the API server, e.g. /uploads/chat/abc.png */
const fileUrl = (p) => {
  if (!p) return "";
  if (/^(https?:|blob:|data:)/.test(p)) return p;
  let origin = "http://localhost:5000";
  try {
    origin = new URL(api.defaults.baseURL || origin).origin;
  } catch { }
  return `${origin}${p.startsWith("/") ? "" : "/"}${p}`;
};

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast.success("Copied");
};

const previewOf = (lm, me) => {
  if (!lm) return "";
  const prefix = idOf(lm.sender) === me ? "You: " : "";
  if (lm.isDeleted) return `${prefix}Message deleted`;
  return `${prefix}${lm.image && !lm.content ? "📷 Photo" : lm.content}`;
};

function Avatar({ person, size = "w-11 h-11", text = "text-sm" }) {
  return (
    <div className={`${size} ${text} ${colorFor(person?._id)} shrink-0 rounded-full text-white font-bold flex items-center justify-center`}>
      {initialsOf(person?.name)}
    </div>
  );
}

/* ---------------------------- one message --------------------------- */

const Bubble = memo(function Bubble({ m, mine, first, name, selectMode, selected, onToggle, onOpenMenu, onLongPress, onImage, onImgLoad }) {
  const timer = useRef(null);
  const clear = () => clearTimeout(timer.current);
  const start = () => {
    clear();
    if (!m.pending && !m.isDeleted) timer.current = setTimeout(() => onLongPress(m._id), 450);
  };

  const deleted = !!m.isDeleted;
  const hasImg = !!m.image && !deleted;
  const src = hasImg ? fileUrl(m.image) : "";

  return (
    <div
      onClick={() => selectMode && !m.pending && onToggle(m._id)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (window.matchMedia?.("(pointer: coarse)").matches) return;
        if (!m.pending && !selectMode) onOpenMenu(m, e.clientX, e.clientY);
      }}
      onTouchStart={start}
      onTouchEnd={clear}
      onTouchMove={clear}
      onTouchCancel={clear}
      className={`group flex items-start px-3 sm:px-6 transition-colors select-none sm:select-text ${first ? "pt-2" : "pt-0.5"} pb-0.5 ${selected ? "bg-[#00a884]/20" : ""} ${selectMode ? "cursor-pointer" : ""}`}
    >
      {selectMode && (
        <span className={`mr-3 mt-2 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? "bg-[#00a884] border-[#00a884] text-white" : "border-slate-400 bg-white"}`}>
          {selected && <Check size={12} strokeWidth={3} />}
        </span>
      )}

      <div className={`flex-1 min-w-0 flex ${mine ? "justify-end" : "justify-start"}`}>
        <div
          className={`relative max-w-[85%] md:max-w-[65%] rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-slate-900 ${hasImg ? "p-1" : "px-2.5 py-1.5"} ${mine ? "bg-[#d9fdd3]" : "bg-white"} ${first ? (mine ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
        >
          {!selectMode && !deleted && !m.pending && (
            <button
              type="button"
              aria-label="Message options"
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                onOpenMenu(m, r.right - 176, r.bottom + 4);
              }}
              className={`absolute top-1 right-1 z-10 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition cursor-pointer ${hasImg ? "bg-black/45 text-white" : "bg-black/5 text-slate-500 hover:bg-black/10"}`}
            >
              <ChevronDown size={16} />
            </button>
          )}

          {name && <p className="px-1 pb-0.5 text-[12px] font-bold text-[#008069] truncate">{name}</p>}

          {deleted ? (
            <p className="flex items-center gap-1.5 text-[13.5px] italic text-slate-500 pr-2">
              <Ban size={14} /> This message was deleted
            </p>
          ) : (
            <>
              {hasImg && (
                <button
                  type="button"
                  onClick={(e) => {
                    if (selectMode) return;
                    e.stopPropagation();
                    onImage(src);
                  }}
                  className="relative block overflow-hidden rounded-md bg-slate-200 cursor-zoom-in"
                >
                  <img src={src} alt="Shared" loading="lazy" draggable={false} onLoad={onImgLoad} className="block max-h-72 w-auto max-w-full min-h-[96px] min-w-[140px] object-cover" />
                  {m.pending && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </span>
                  )}
                </button>
              )}
              {m.content && (
                <p className={`whitespace-pre-wrap break-words text-[14.2px] leading-snug ${hasImg ? "px-1.5 pt-1" : ""} ${!hasImg ? "pr-1" : ""}`}>{m.content}</p>
              )}
            </>
          )}

          <div className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] text-slate-500 ${hasImg ? "px-1.5 pb-0.5" : ""}`}>
            <span>{timeLabel(m.createdAt)}</span>
            {mine && !deleted && (m.pending ? <Clock size={11} /> : m.isRead ? <CheckCheck size={15} className="text-[#53bdeb]" /> : <Check size={15} />)}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ------------------------------- page ------------------------------ */

export default function InternalMessagesPage() {
  const { user } = useAuth();
  const me = String(user?._id || "");
  const isAdmin = user?.role === "admin";

  const [contacts, setContacts] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [attach, setAttach] = useState(null); // { file, url }
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [menu, setMenu] = useState(null); // { m, x, y }
  const [delIds, setDelIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [viewer, setViewer] = useState("");
  const [showDown, setShowDown] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const stickRef = useRef(true);
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const selectMode = selected.size > 0;

  /* ---- loaders ---- */
  const loadChats = useCallback(async () => {
    try {
      const { data } = await api.get(isAdmin ? "/communication/admin/conversations" : "/communication/conversations");
      const list = Array.isArray(data) ? data : [];
      setChats(
        list
          .filter((c) => (isAdmin ? Array.isArray(c.users) && c.users.length === 2 : c.user))
          .map((c) => ({ ...c, key: isAdmin ? c.users.map((u) => u._id).sort().join("_") : c.user._id }))
      );
    } catch { }
  }, [isAdmin]);

  const loadMessages = useCallback(
    async (key, { silent = false } = {}) => {
      try {
        const [a, b] = key.split("_");
        const url = isAdmin ? `/communication/admin/messages/${a}/${b}` : `/communication/messages/${key}`;
        const { data } = await api.get(url, { params: { limit: 300 } });
        const list = Array.isArray(data) ? data : [];

        setMessages((prev) => {
          const unsent = prev.filter((m) => m.pending);
          const merged = [...list, ...unsent];
          const same =
            prev.length === merged.length &&
            prev.every((m, i) => m._id === merged[i]._id && m.isRead === merged[i].isRead && !!m.isDeleted === !!merged[i].isDeleted);
          return same ? prev : merged;
        });

        if (!isAdmin && list.some((m) => idOf(m.sender) === key && !m.isRead)) {
          api.put(`/communication/messages/${key}/read`).catch(() => { });
          setChats((prev) => prev.map((c) => (c.key === key ? { ...c, unread: 0 } : c)));
        }
      } catch {
        if (!silent) toast.error("Failed to load the conversation.");
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!me) return undefined;
    let alive = true;
    const jobs = [loadChats()];
    if (!isAdmin) {
      jobs.push(
        api
          .get("/communication/contacts")
          .then((r) => alive && setContacts(Array.isArray(r.data) ? r.data : []))
          .catch(() => toast.error("Failed to load the employee directory."))
      );
    }
    Promise.allSettled(jobs).then(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [me, isAdmin, loadChats]);

  /* chat list refresh */
  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && loadChats(), CHAT_POLL_MS);
    return () => clearInterval(timer);
  }, [loadChats]);

  /* open a conversation, then keep it fresh */
  useEffect(() => {
    setSelected(new Set());
    if (!activeId) return undefined;
    setMessages([]);
    setOpening(true);
    stickRef.current = true;
    loadMessages(activeId).finally(() => setOpening(false));

    const timer = setInterval(() => document.visibilityState === "visible" && loadMessages(activeId, { silent: true }), MESSAGE_POLL_MS);
    return () => clearInterval(timer);
  }, [activeId, loadMessages]);

  /* scroll to the newest message (only when the reader is already at the bottom) */
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, opening]);

  /* the message box grows with the text */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, activeId]);

  /* Esc closes the top-most layer */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (viewer) setViewer("");
      else if (delIds.length) setDelIds([]);
      else if (menu) setMenu(null);
      else if (selected.size) setSelected(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, delIds, menu, selected]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = gap < 120;
    setShowDown((v) => (v === gap > 400 ? v : gap > 400));
  };

  const toBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const onImgLoad = useCallback(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, []);

  /* ---- derived ---- */
  const activeChat = useMemo(() => chats.find((c) => c.key === activeId) || null, [chats, activeId]);

  // Admin accounts are never shown to HR / Manager / Employee
  const adminIds = useMemo(() => new Set(contacts.filter((c) => c.role === "admin").map((c) => c._id)), [contacts]);
  const visibleContacts = useMemo(() => (isAdmin ? [] : contacts.filter((c) => c.role !== "admin" && c._id !== me)), [contacts, isAdmin, me]);
  const visibleChats = useMemo(
    () => (isAdmin ? chats : chats.filter((c) => c.user.role !== "admin" && !adminIds.has(c.user._id))),
    [chats, isAdmin, adminIds]
  );

  const activePerson = useMemo(
    () => (isAdmin ? null : visibleContacts.find((c) => c._id === activeId) || visibleChats.find((c) => c.key === activeId)?.user || null),
    [isAdmin, visibleContacts, visibleChats, activeId]
  );

  const q = search.trim().toLowerCase();
  const shownChats = visibleChats.filter((c) =>
    !q ? true : isAdmin ? c.users.some((u) => u.name.toLowerCase().includes(q)) : c.user.name.toLowerCase().includes(q)
  );
  const shownContacts = visibleContacts.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || String(c.employeeId || "").toLowerCase().includes(q) || (ROLE_LABEL[c.role] || "").toLowerCase().includes(q)
  );
  const totalUnread = isAdmin ? 0 : chats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const rightId = isAdmin ? activeChat?.users?.[0]?._id : me; // admin view: first person on the right
  const nameOf = (id) => activeChat?.users?.find((u) => u._id === idOf(id))?.name;

  const items = useMemo(() => {
    const out = [];
    let lastDay = "";
    let lastSender = "";
    messages.forEach((m) => {
      const key = dayKey(m.createdAt);
      const s = idOf(m.sender);
      if (key !== lastDay) {
        out.push({ type: "day", key, label: dayLabel(m.createdAt) });
        lastDay = key;
        lastSender = "";
      }
      out.push({ type: "msg", m, first: s !== lastSender });
      lastSender = s;
    });
    return out;
  }, [messages]);

  /* ---- actions ---- */
  const openChat = (key) => {
    if (!isAdmin && adminIds.has(key)) return;
    setActiveId(key);
    setText("");
    clearAttach();
    setTab("chats");
    setSearch("");
  };

  function clearAttach() {
    setAttach((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Only images can be sent.");
    if (file.size > MAX_IMG) return toast.error("Image must be smaller than 5 MB.");
    setAttach((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    inputRef.current?.focus();
  };

  const onPaste = (e) => {
    const img = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
    if (img) {
      e.preventDefault();
      pickFile(img);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (isAdmin || !activeId) return;
    pickFile([...(e.dataTransfer?.files || [])][0]);
  };

  const send = async () => {
    const content = text.trim();
    if ((!content && !attach) || !activeId || isAdmin) return;

    const sentAttach = attach;
    const temp = {
      _id: `tmp-${Date.now()}`,
      sender: me,
      receiver: activeId,
      content,
      image: sentAttach?.url || "",
      createdAt: new Date().toISOString(),
      isRead: false,
      pending: true,
    };
    setMessages((prev) => [...prev, temp]);
    setText("");
    setAttach(null);
    stickRef.current = true;

    try {
      let body = { receiver: activeId, content };
      let config;
      if (sentAttach) {
        body = new FormData();
        body.append("receiver", activeId);
        body.append("content", content);
        body.append("image", sentAttach.file);
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }
      const { data } = await api.post("/communication/messages", body, config);
      setMessages((prev) =>
        prev.some((m) => m._id === data._id) ? prev.filter((m) => m._id !== temp._id) : prev.map((m) => (m._id === temp._id ? data : m))
      );
      if (sentAttach?.url) URL.revokeObjectURL(sentAttach.url);
      loadChats();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== temp._id));
      setText(content);
      setAttach(sentAttach);
      toast.error(err?.response?.data?.message || "Failed to send the message.");
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarse) {
      e.preventDefault();
      send();
    }
  };

  /* selection / menu / delete */
  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const longPress = useCallback((id) => {
    navigator.vibrate?.(15);
    setSelected((prev) => new Set(prev).add(id));
  }, []);

  const openMenu = useCallback((m, x, y) => {
    setMenu({
      m,
      x: Math.max(8, Math.min(x, window.innerWidth - 188)),
      y: Math.max(8, Math.min(y, window.innerHeight - 160)),
    });
  }, []);

  const copySelected = async () => {
    const lines = messages.filter((m) => selected.has(m._id) && !m.isDeleted && m.content).map((m) => m.content);
    if (!lines.length) return toast.info("Nothing to copy (images have no text).");
    await copyText(lines.join("\n"));
    setSelected(new Set());
  };

  const delMsgs = messages.filter((m) => delIds.includes(m._id));
  const canEveryone = isAdmin || (delMsgs.length > 0 && delMsgs.every((m) => idOf(m.sender) === me && !m.isDeleted));

  const doDelete = async (forEveryone) => {
    const ids = delIds.filter((id) => !String(id).startsWith("tmp-"));
    setDeleting(true);
    try {
      if (ids.length) await api.delete("/communication/messages", { data: { ids, forEveryone } });
      setMessages((prev) =>
        forEveryone
          ? prev.map((m) => (ids.includes(m._id) ? { ...m, isDeleted: true, content: "", image: "" } : m))
          : prev.filter((m) => !ids.includes(m._id))
      );
      setSelected(new Set());
      setDelIds([]);
      loadChats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a884]" />
      </div>
    );
  }

  const hasChat = isAdmin ? !!activeChat : !!activePerson;

  return (
    <div className="w-full max-w-6xl mx-auto px-0 sm:px-4 py-2 sm:py-4">
      <div className="h-[calc(100dvh-7rem)] min-h-[460px] bg-white sm:rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden">
        {/* ============ Left: chats and contacts ============ */}
        <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 shrink-0 flex-col border-r border-slate-200`}>
          <div className="px-4 h-14 flex items-center justify-between bg-[#f0f2f5]">
            <h1 className="text-lg font-bold text-slate-800">{isAdmin ? "All Conversations" : "Messages"}</h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#008069] border border-slate-200">
                <Eye size={12} /> Monitoring
              </span>
            )}
          </div>

          <div className="px-3 py-2 space-y-2 border-b border-slate-100">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAdmin ? "Search by employee name" : "Search name, ID or role"}
                className="w-full pl-10 pr-3 py-2 bg-[#f0f2f5] rounded-lg text-base sm:text-sm outline-none focus:ring-2 focus:ring-[#00a884]/40"
              />
            </div>
            {!isAdmin && (
              <div className="flex gap-1">
                {[
                  ["chats", "Chats", totalUnread],
                  ["contacts", "Contacts", 0],
                ].map(([key, label, badge]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex-1 inline-flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${tab === key ? "bg-[#d9fdd3] text-[#008069]" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    {label}
                    {badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#25d366] text-white text-[10px] flex items-center justify-center">{badge}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {tab === "chats" || isAdmin ? (
              shownChats.length === 0 ? (
                <div className="py-14 px-6 text-center space-y-2">
                  <MessageSquare size={30} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">{q ? "No chats found" : "No conversations yet"}</p>
                  {!isAdmin && (
                    <button type="button" onClick={() => setTab("contacts")} className="text-xs font-bold text-[#008069] cursor-pointer">
                      Start a new chat
                    </button>
                  )}
                </div>
              ) : isAdmin ? (
                shownChats.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => openChat(c.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 hover:bg-[#f5f6f6] transition cursor-pointer ${activeId === c.key ? "bg-[#f0f2f5]" : ""}`}
                  >
                    <div className="relative w-11 h-11 shrink-0">
                      <div className="absolute left-0 top-0"><Avatar person={c.users[0]} size="w-8 h-8" text="text-[10px]" /></div>
                      <div className="absolute right-0 bottom-0 rounded-full ring-2 ring-white"><Avatar person={c.users[1]} size="w-8 h-8" text="text-[10px]" /></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{c.users[0].name} ↔ {c.users[1].name}</p>
                        <span className="text-[10px] shrink-0 text-slate-400">{c.lastMessage && listTime(c.lastMessage.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {c.lastMessage ? `${c.users.find((u) => u._id === idOf(c.lastMessage.sender))?.name?.split(" ")[0] || ""}: ${c.lastMessage.isDeleted ? "Message deleted" : c.lastMessage.image && !c.lastMessage.content ? "📷 Photo" : c.lastMessage.content}` : ""}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                shownChats.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => openChat(c.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 hover:bg-[#f5f6f6] transition cursor-pointer ${activeId === c.key ? "bg-[#f0f2f5]" : ""}`}
                  >
                    <Avatar person={c.user} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{c.user.name}</p>
                        <span className={`text-[10px] shrink-0 ${c.unread ? "text-[#25d366] font-bold" : "text-slate-400"}`}>{listTime(c.lastMessage.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          {c.lastMessage.image && !c.lastMessage.isDeleted && <ImageIcon size={12} className="shrink-0" />}
                          <span className="truncate">{previewOf(c.lastMessage, me)}</span>
                        </p>
                        {c.unread > 0 && (
                          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#25d366] text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
            ) : shownContacts.length === 0 ? (
              <div className="py-14 px-6 text-center space-y-2">
                <Users size={30} className="mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No contacts found</p>
              </div>
            ) : (
              shownContacts.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => openChat(c._id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 hover:bg-[#f5f6f6] transition cursor-pointer"
                >
                  <Avatar person={c} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ROLE_LABEL[c.role] || "Employee"}
                      {c.employeeId ? ` · ${c.employeeId}` : ""}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ============ Right: conversation ============ */}
        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`${activeId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col relative`}
        >
          {!activeId || !hasChat ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center bg-[#f0f2f5]">
              <div className="w-16 h-16 rounded-full bg-white text-[#00a884] flex items-center justify-center shadow-sm">
                <MessageSquare size={28} />
              </div>
              <p className="font-bold text-slate-700">{isAdmin ? "Conversation Monitor" : "Internal Messaging"}</p>
              <p className="text-xs text-slate-500 max-w-xs">
                {isAdmin
                  ? "Select a conversation to view the messages exchanged between HR, managers and employees."
                  : "Select a chat or a colleague from the list to start talking. Messages stay inside your company HRMS."}
              </p>
            </div>
          ) : (
            <>
              {/* header */}
              {selectMode ? (
                <div className="flex items-center gap-3 px-3 sm:px-5 h-14 bg-[#f0f2f5] border-b border-slate-200">
                  <button type="button" onClick={() => setSelected(new Set())} className="p-2 -ml-1 rounded-full text-slate-600 hover:bg-slate-200 cursor-pointer" aria-label="Cancel selection">
                    <X size={20} />
                  </button>
                  <p className="flex-1 text-sm font-bold text-slate-800">{selected.size} selected</p>
                  <button type="button" onClick={copySelected} className="p-2.5 rounded-full text-slate-600 hover:bg-slate-200 cursor-pointer" aria-label="Copy">
                    <Copy size={18} />
                  </button>
                  <button type="button" onClick={() => setDelIds([...selected])} className="p-2.5 rounded-full text-rose-600 hover:bg-rose-50 cursor-pointer" aria-label="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 sm:px-5 h-14 bg-[#f0f2f5] border-b border-slate-200">
                  <button type="button" onClick={() => setActiveId("")} className="md:hidden p-2 -ml-1 rounded-full text-slate-600 hover:bg-slate-200 cursor-pointer" aria-label="Back to chats">
                    <ArrowLeft size={20} />
                  </button>
                  {isAdmin ? (
                    <>
                      <div className="relative w-10 h-10 shrink-0">
                        <div className="absolute left-0 top-0"><Avatar person={activeChat.users[0]} size="w-7 h-7" text="text-[9px]" /></div>
                        <div className="absolute right-0 bottom-0 rounded-full ring-2 ring-[#f0f2f5]"><Avatar person={activeChat.users[1]} size="w-7 h-7" text="text-[9px]" /></div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{activeChat.users[0].name} ↔ {activeChat.users[1].name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {ROLE_LABEL[activeChat.users[0].role] || "Employee"} & {ROLE_LABEL[activeChat.users[1].role] || "Employee"} · Admin view
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar person={activePerson} size="w-10 h-10" text="text-xs" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{activePerson.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {ROLE_LABEL[activePerson.role] || "Employee"}
                          {activePerson.employeeId ? ` · ${activePerson.employeeId}` : ""}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* messages */}
              <div
                ref={listRef}
                onScroll={onScroll}
                className="flex-1 overflow-y-auto overscroll-contain py-3 bg-[#efeae2]"
                style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
              >
                {opening && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00a884]" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="h-full flex items-center justify-center px-4">
                    <p className="text-xs text-slate-500 bg-[#fff5c4] px-4 py-2 rounded-lg shadow-sm text-center">
                      {isAdmin ? "No messages in this conversation." : "No messages yet. Say hello to start the conversation!"}
                    </p>
                  </div>
                ) : (
                  items.map((item) => {
                    if (item.type === "day") {
                      return (
                        <div key={`d-${item.key}`} className="flex justify-center py-2">
                          <span className="px-3 py-1 rounded-lg bg-white/90 text-[11.5px] font-semibold text-slate-500 shadow-sm">{item.label}</span>
                        </div>
                      );
                    }
                    const m = item.m;
                    const mine = idOf(m.sender) === rightId;
                    return (
                      <Bubble
                        key={m._id}
                        m={m}
                        mine={mine}
                        first={item.first}
                        name={isAdmin && item.first ? nameOf(m.sender) : ""}
                        selectMode={selectMode}
                        selected={selected.has(m._id)}
                        onToggle={toggleSelect}
                        onOpenMenu={openMenu}
                        onLongPress={longPress}
                        onImage={setViewer}
                        onImgLoad={onImgLoad}
                      />
                    );
                  })
                )}
              </div>

              {showDown && (
                <button
                  type="button"
                  onClick={toBottom}
                  aria-label="Scroll to latest"
                  className="absolute right-4 bottom-24 w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronDown size={20} />
                </button>
              )}

              {/* composer */}
              {isAdmin ? (
                <div className="px-4 py-3 bg-[#f0f2f5] border-t border-slate-200 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                  <Eye size={14} /> Admin view · read only (you can delete messages)
                </div>
              ) : (
                <div className="bg-[#f0f2f5] border-t border-slate-200 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  {attach && (
                    <div className="px-3 sm:px-5 pt-3">
                      <div className="relative inline-block">
                        <img src={attach.url} alt="Preview" className="h-24 w-auto max-w-[220px] rounded-lg border border-slate-200 object-cover shadow-sm" />
                        <button
                          type="button"
                          onClick={clearAttach}
                          aria-label="Remove image"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shadow cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-end gap-2 px-3 sm:px-5 py-2.5">
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Attach image"
                      className="w-11 h-11 shrink-0 rounded-full text-slate-500 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
                    >
                      <Paperclip size={20} />
                    </button>
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={text}
                      maxLength={MAX_LEN}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={onKeyDown}
                      onPaste={onPaste}
                      placeholder={attach ? "Add a caption" : "Type a message"}
                      className="flex-1 min-w-0 resize-none px-4 py-3 bg-white rounded-3xl text-base sm:text-sm outline-none focus:ring-2 focus:ring-[#00a884]/30 max-h-[120px]"
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={!text.trim() && !attach}
                      className="w-11 h-11 shrink-0 rounded-full bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      aria-label="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  {text.length > MAX_LEN - 200 && <p className="px-5 pb-1 text-right text-[10px] text-slate-400">{text.length}/{MAX_LEN}</p>}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ============ message menu ============ */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div style={{ left: menu.x, top: menu.y }} className="fixed z-50 w-44 rounded-xl bg-white py-1.5 shadow-xl border border-slate-100">
            {menu.m.content && (
              <button type="button" onClick={() => { copyText(menu.m.content); setMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Copy size={16} /> Copy
              </button>
            )}
            <button type="button" onClick={() => { toggleSelect(menu.m._id); setMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Check size={16} /> Select
            </button>
            <button type="button" onClick={() => { setDelIds([menu.m._id]); setMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 cursor-pointer">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </>
      )}

      {/* ============ delete dialog ============ */}
      {delIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !deleting && setDelIds([])}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Delete {delIds.length > 1 ? `${delIds.length} messages` : "message"}?</h3>
            <p className="mt-1 text-xs text-slate-500">
              {isAdmin ? "This removes the message for everyone in the conversation." : "Choose how you want to delete."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {canEveryone && (
                <button type="button" disabled={deleting} onClick={() => doDelete(true)} className="w-full rounded-full border border-slate-200 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
                  {deleting ? "Deleting..." : "Delete for everyone"}
                </button>
              )}
              {!isAdmin && (
                <button type="button" disabled={deleting} onClick={() => doDelete(false)} className="w-full rounded-full border border-slate-200 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
                  Delete for me
                </button>
              )}
              <button type="button" disabled={deleting} onClick={() => setDelIds([])} className="w-full rounded-full py-2.5 text-sm font-bold text-[#008069] hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ image viewer ============ */}
      {viewer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewer("")}>
          <button type="button" onClick={() => setViewer("")} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 cursor-pointer">
            <X size={22} />
          </button>
          <img src={viewer} alt="Full size" onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}




// "use client";
// import { useEffect, useState, useCallback, useRef } from "react";
// import { Send, Loader2, MessageSquare, UserCheck } from "lucide-react";
// import api from "@/lib/api";
// import { toast } from "react-toastify";
// import { useAuth } from "@/context/AuthContext";

// export default function InternalMessagesPage() {
//   const { user } = useAuth();
//   const [employees, setEmployees] = useState([]);
//   const [selectedUser, setSelectedUser] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);
//   const scrollRef = useRef(null);

//   useEffect(() => {
//     api.get("/employees")
//       .then(({ data }) => setEmployees(Array.isArray(data) ? data : []))
//       .catch(() => toast.error("Failed to load employee directory."))
//       .finally(() => setLoading(false));
//   }, []);

//   const fetchMessages = useCallback(async (userId) => {
//     if (!userId) return;
//     try {
//       const { data } = await api.get(`/communication/messages/${userId}`);
//       setMessages(Array.isArray(data) ? data : []);
//     } catch (err) {
//       toast.error("Failed to load conversation history.");
//     }
//   }, []);

//   useEffect(() => {
//     if (selectedUser) fetchMessages(selectedUser);
//   }, [selectedUser, fetchMessages]);

//   useEffect(() => {
//     scrollRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const handleSend = async (e) => {
//     e.preventDefault();
//     if (!text.trim() || !selectedUser) return;
//     setSending(true);
//     try {
//       await api.post("/communication/messages", { receiver: selectedUser, content: text });
//       setText("");
//       fetchMessages(selectedUser);
//     } catch (err) {
//       toast.error("Failed to send message.");
//     } finally {
//       setSending(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex min-h-[60vh] items-center justify-center">
//         <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Page Header */}
//       <div className="flex-col md:flex-row md:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
//         <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Internal Messaging</h1>
//         <p className="text-xs text-slate-500 mt-1">Direct and secure communication channels with colleagues.</p>
//       </div>

//       {/* Main Chat Container */}
//       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px] overflow-hidden">

//         {/* User Selection Header */}
//         <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
//           <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
//             <UserCheck size={18} />
//           </div>
//           <select
//             value={selectedUser}
//             onChange={(e) => setSelectedUser(e.target.value)}
//             className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-700 font-medium cursor-pointer"
//           >
//             <option value="">-- Choose a colleague to chat --</option>
//             {employees
//               .filter((e) => e._id !== user?.employee?._id && e._id !== user?._id) // Don't show self if applicable
//               .map((e) => (
//                 <option key={e._id} value={e._id}>{e.name} ({e.designation || "Employee"})</option>
//               ))}
//           </select>
//         </div>

//         {/* Message Stream Window */}
//         <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
//           {!selectedUser ? (
//             <div className="h-full flex items-center justify-center text-slate-400 text-sm flex-col space-y-2">
//               <MessageSquare size={36} className="text-slate-300 animate-pulse" />
//               <p className="font-semibold text-slate-600">No chat selected</p>
//               <p className="text-xs text-slate-400">Select a colleague from the dropdown above to start a conversation.</p>
//             </div>
//           ) : messages.length === 0 ? (
//             <div className="h-full flex items-center justify-center text-center">
//               <p className="text-xs text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
//                 No messages yet. Send a greeting to start the conversation!
//               </p>
//             </div>
//           ) : (
//             messages.map((m) => {
//               const isMine = m.sender === user?._id || m.sender?._id === user?._id || m.sender === user?.employee?._id;
//               return (
//                 <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"} transition-all`}>
//                   <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${isMine
//                     ? "bg-indigo-600 text-white rounded-br-xs"
//                     : "bg-white border border-slate-100 text-slate-800 rounded-bl-xs"
//                     }`}>
//                     <p className="leading-relaxed break-words">{m.content}</p>
//                     <p className={`text-[10px] mt-1.5 text-right font-medium ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
//                       {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                     </p>
//                   </div>
//                 </div>
//               );
//             })
//           )}
//           <div ref={scrollRef} />
//         </div>

//         {/* Message Input Box */}
//         <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white flex gap-3 items-center">
//           <input
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             disabled={!selectedUser}
//             placeholder={selectedUser ? "Type your message here..." : "Select a colleague first to type..."}
//             className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed"
//           />
//           <button
//             type="submit"
//             disabled={sending || !selectedUser || !text.trim()}
//             className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm active:scale-[0.98]"
//             title="Send Message"
//           >
//             {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
//           </button>
//         </form>

//       </div>
//     </div>
//   );
// }