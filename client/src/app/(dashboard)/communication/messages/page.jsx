"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Send, Loader2, MessageSquare, UserCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function InternalMessagesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get("/employees")
      .then(({ data }) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load employee directory."))
      .finally(() => setLoading(false));
  }, []);

  const fetchMessages = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data } = await api.get(`/communication/messages/${userId}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load conversation history.");
    }
  }, []);

  useEffect(() => {
    if (selectedUser) fetchMessages(selectedUser);
  }, [selectedUser, fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedUser) return;
    setSending(true);
    try {
      await api.post("/communication/messages", { receiver: selectedUser, content: text });
      setText("");
      fetchMessages(selectedUser);
    } catch (err) {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Internal Messaging</h1>
        <p className="text-xs text-slate-500 mt-1">Direct and secure communication channels with colleagues.</p>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px] overflow-hidden">

        {/* User Selection Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserCheck size={18} />
          </div>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-700 font-medium cursor-pointer"
          >
            <option value="">-- Choose a colleague to chat --</option>
            {employees
              .filter((e) => e._id !== user?.employee?._id && e._id !== user?._id) // Don't show self if applicable
              .map((e) => (
                <option key={e._id} value={e._id}>{e.name} ({e.designation || "Employee"})</option>
              ))}
          </select>
        </div>

        {/* Message Stream Window */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
          {!selectedUser ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm flex-col space-y-2">
              <MessageSquare size={36} className="text-slate-300 animate-pulse" />
              <p className="font-semibold text-slate-600">No chat selected</p>
              <p className="text-xs text-slate-400">Select a colleague from the dropdown above to start a conversation.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-xs text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                No messages yet. Send a greeting to start the conversation!
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender === user?._id || m.sender?._id === user?._id || m.sender === user?.employee?._id;
              return (
                <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"} transition-all`}>
                  <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${isMine
                    ? "bg-indigo-600 text-white rounded-br-xs"
                    : "bg-white border border-slate-100 text-slate-800 rounded-bl-xs"
                    }`}>
                    <p className="leading-relaxed break-words">{m.content}</p>
                    <p className={`text-[10px] mt-1.5 text-right font-medium ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white flex gap-3 items-center">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!selectedUser}
            placeholder={selectedUser ? "Type your message here..." : "Select a colleague first to type..."}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={sending || !selectedUser || !text.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm active:scale-[0.98]"
            title="Send Message"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>

      </div>
    </div>
  );
}