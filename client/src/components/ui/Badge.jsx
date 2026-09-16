// src/components/ui/Badge.jsx
const variants = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/10",
    danger: "bg-rose-50 text-rose-700 ring-rose-600/10",
    info: "bg-blue-50 text-blue-700 ring-blue-600/10",
    neutral: "bg-slate-100 text-slate-600 ring-slate-500/10",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
};

export default function Badge({ children, variant = "neutral", className = "" }) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${variants[variant]} ${className}`}
        >
            {children}
        </span>
    );
}