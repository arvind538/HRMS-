"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Star } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { Box, errMsg } from "./rui";

export const RECO = {
    hire: { label: "Hire", tone: "emerald" },
    "next-round": { label: "Next round", tone: "sky" },
    reject: { label: "Reject", tone: "rose" },
};

export const Stars = ({ value = 0, size = 13 }) => (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={size} className={s <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}
    </span>
);

const chip = "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-indigo-200 bg-white hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-700 text-xs font-bold transition active:scale-95 cursor-pointer";

/* A guided chat that collects feedback, a rating and a recommendation, then submits them. */
export default function FeedbackChat({ interview, onClose, onDone }) {
    const name = interview.candidate?.name || "the candidate";
    const [msgs, setMsgs] = useState([]);
    const [step, setStep] = useState("wait"); // wait | feedback | rating | reco | confirm | sending | done
    const [typing, setTyping] = useState(false);
    const [text, setText] = useState("");
    const data = useRef({ feedback: "", rating: 0, recommendation: "" });
    const timers = useRef([]);
    const list = useRef(null);
    const input = useRef(null);

    const later = useCallback((fn, ms) => {
        const t = setTimeout(fn, ms);
        timers.current.push(t);
    }, []);

    /* the assistant "types" for a moment, then each line appears */
    const say = useCallback((lines, then) => {
        const arr = Array.isArray(lines) ? lines : [lines];
        setTyping(true);
        arr.forEach((line, i) =>
            later(() => {
                setMsgs((m) => [...m, { from: "bot", text: line }]);
                if (i === arr.length - 1) {
                    setTyping(false);
                    then?.();
                }
            }, 650 * (i + 1))
        );
    }, [later]);

    const me = (t) => setMsgs((m) => [...m, { from: "me", text: t }]);

    useEffect(() => {
        say([`Hi! I will help you record your feedback for ${name} (${interview.round} round).`, "First, how did the interview go? Write a few lines: skills, communication, attitude."], () => {
            setStep("feedback");
            later(() => input.current?.focus(), 50);
        });
        return () => {
            timers.current.forEach(clearTimeout);
            timers.current = [];
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
    }, [msgs, typing, step]);

    const send = (e) => {
        e?.preventDefault();
        if (step !== "feedback" || typing) return;
        const t = text.trim();
        if (t.length < 3) return toast.info("Please write a little more.");
        setText("");
        me(t);
        data.current.feedback = t;
        setStep("wait");
        say("Thanks! How would you rate the candidate overall? Tap 1 (poor) to 5 (excellent).", () => setStep("rating"));
    };

    const pickRating = (n) => {
        me(`${n} out of 5`);
        data.current.rating = n;
        setStep("wait");
        say("Got it. And what do you recommend?", () => setStep("reco"));
    };

    const pickReco = (k) => {
        me(RECO[k].label);
        data.current.recommendation = k;
        const d = data.current;
        setStep("wait");
        say(["Here is what I will send:", `Feedback: ${d.feedback}\nRating: ${d.rating}/5\nRecommendation: ${RECO[k].label}`, "Shall I submit it?"], () => setStep("confirm"));
    };

    const submit = async () => {
        me("Submit");
        setStep("sending");
        setTyping(true);
        try {
            await api.put(`/recruitment/interviews/${interview._id}/feedback`, data.current);
            setTyping(false);
            toast.success("Feedback submitted.");
            onDone?.();
            say("Your feedback is submitted. Thank you!", () => setStep("done"));
        } catch (err) {
            setTyping(false);
            const m = await errMsg(err, "Unable to submit the feedback.");
            say(`I could not submit it: ${m}`, () => setStep("confirm"));
        }
    };

    const restart = () => {
        me("Start over");
        data.current = { feedback: "", rating: 0, recommendation: "" };
        setStep("wait");
        say("No problem, let us start again. How did the interview go?", () => {
            setStep("feedback");
            later(() => input.current?.focus(), 50);
        });
    };

    const canType = step === "feedback" && !typing;

    const footer = (
        <form onSubmit={send} className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-end gap-2">
            <textarea
                ref={input}
                rows={1}
                value={text}
                maxLength={2000}
                disabled={!canType}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={canType ? "Type your feedback..." : step === "rating" || step === "reco" || step === "confirm" ? "Choose an option above" : "Please wait..."}
                className="flex-1 resize-none max-h-28 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-base sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-indigo-500 disabled:opacity-60 transition"
            />
            <button type="submit" disabled={!canType || text.trim().length < 3} aria-label="Send" className="w-11 h-11 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center justify-center transition active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-default">
                <Send size={16} />
            </button>
        </form>
    );

    return (
        <Box title="Feedback assistant" subtitle={`${name} • ${interview.round} round`} onClose={onClose} locked={step === "sending"} size="max-w-lg" footer={footer}>
            <div ref={list} className="h-[48vh] sm:h-[420px] overflow-y-auto overscroll-contain space-y-3 pr-1">
                {msgs.map((m, i) => (
                    <div key={i} className={`flex items-end gap-2 ${m.from === "me" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                        {m.from === "bot" && <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Bot size={15} /></div>}
                        <div className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line break-words ${m.from === "me" ? "bg-indigo-600 text-white rounded-2xl rounded-br-md" : "bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md"}`}>{m.text}</div>
                    </div>
                ))}

                {typing && (
                    <div className="flex items-end gap-2">
                        <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Bot size={15} /></div>
                        <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                            {[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </div>
                    </div>
                )}

                {!typing && step === "rating" && (
                    <div className="flex flex-wrap gap-2 pl-9">
                        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => pickRating(n)} className={chip}>{n} <Star size={13} className="fill-amber-400 text-amber-400" /></button>)}
                    </div>
                )}
                {!typing && step === "reco" && (
                    <div className="flex flex-wrap gap-2 pl-9">
                        {Object.entries(RECO).map(([k, r]) => <button key={k} type="button" onClick={() => pickReco(k)} className={chip}>{r.label}</button>)}
                    </div>
                )}
                {!typing && step === "confirm" && (
                    <div className="flex flex-wrap gap-2 pl-9">
                        <button type="button" onClick={submit} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer">Submit feedback</button>
                        <button type="button" onClick={restart} className={chip}>Start over</button>
                    </div>
                )}
                {!typing && step === "done" && (
                    <div className="pl-9"><button type="button" onClick={onClose} className={chip}>Close</button></div>
                )}
            </div>
        </Box>
    );
}