import { ArrowRight, LayoutGrid, Loader2 } from "lucide-react";

const BRAND_NAME = "HRMS Portal"; // apna brand name yahan badlo

export default function AuthShell({ title, subtitle, children, footer }) {
    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-[#EEEEFA] flex items-center justify-center px-4 py-8 sm:py-12">
            {/* Dotted pattern */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-6 h-28 w-40 opacity-70 sm:left-10 sm:top-10"
                style={{
                    backgroundImage: "radial-gradient(#C3C3E6 1.5px, transparent 1.5px)",
                    backgroundSize: "16px 16px",
                }}
            />
            {/* Soft glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-10 h-60 w-60 rounded-full bg-indigo-300/40 blur-3xl"
            />

            <div className="relative w-full max-w-[440px]">
                {/* Brand */}
                <div className="flex items-center justify-center gap-2.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-900 text-white shadow-lg shadow-indigo-500/30">
                        <LayoutGrid size={20} />
                    </div>
                    <span className="text-2xl font-extrabold uppercase tracking-tight text-[#14123a]">
                        {BRAND_NAME}
                    </span>
                </div>

                {/* Heading */}
                <div className="mt-7 text-center">
                    <h1 className="text-2xl font-bold text-slate-600">{title}</h1>
                    {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
                </div>

                {/* Card */}
                <div className="mt-6 rounded-3xl border border-white bg-white p-5 shadow-xl shadow-indigo-900/5 sm:p-7">
                    {children}
                </div>

                {footer && <div className="mt-5 text-center text-xs text-slate-400">{footer}</div>}
            </div>
        </div>
    );
}

export function AuthField({ id, label, icon: Icon, error, right, required = true, ...inputProps }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <Icon
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600"
                />
                <input
                    id={id}
                    aria-invalid={Boolean(error)}
                    {...inputProps}
                    className={`h-12 w-full rounded-2xl border bg-[#F5F5FB] pl-11 ${right ? "pr-12" : "pr-4"
                        } text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 sm:text-sm ${error
                            ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                            : "border-indigo-100 focus:border-indigo-400 focus:ring-indigo-500/15"
                        }`}
                />
                {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
            </div>
            {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
        </div>
    );
}

export function AuthButton({ loading, loadingText = "Please wait...", withArrow = true, children, className = "", ...props }) {
    return (
        <button
            {...props}
            disabled={loading || props.disabled}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-600 hover:to-indigo-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
            {loading ? (
                <>
                    <Loader2 size={17} className="animate-spin" />
                    {loadingText}
                </>
            ) : (
                <>
                    {children}
                    {withArrow && <ArrowRight size={17} />}
                </>
            )}
        </button>
    );
}