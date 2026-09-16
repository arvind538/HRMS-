export default function Button({
    children,
    variant = "primary",
    size = "md",
    loading = false,
    className = "",
    ...props
}) {
    const base = "font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200",
        secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
        danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200",
        outline: "border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700",
        ghost: "hover:bg-slate-100 text-slate-600",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2.5 text-sm",
        lg: "px-5 py-3 text-base",
    };

    return (
        <button
            disabled={loading}
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {loading ? "Loading..." : children}
        </button>
    );
}



// export default function Button({
//     children,
//     variant = "primary",
//     size = "md",
//     loading = false,
//     className = "",
//     ...props
// }) {
//     const base = "font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

//     const variants = {
//         primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
//         secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
//         danger: "bg-red-600 hover:bg-red-700 text-white",
//         outline: "border border-gray-300 hover:bg-gray-50 text-gray-700",
//     };

//     const sizes = {
//         sm: "px-3 py-1.5 text-xs",
//         md: "px-4 py-2 text-sm",
//         lg: "px-5 py-2.5 text-base",
//     };

//     return (
//         <button
//             disabled={loading}
//             className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
//             {...props}
//         >
//             {loading ? "Loading..." : children}
//         </button>
//     );
// }