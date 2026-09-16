"use client";
import { X } from "lucide-react";

export default function MobileDrawer({ isOpen, onClose, children }) {
    if (!isOpen) return null;

    return (
        <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl">
                <button onClick={onClose} className="absolute top-4 right-4">
                    <X size={22} />
                </button>
                {children}
            </div>
        </div>
    );
}