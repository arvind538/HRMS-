export default function Card({ title, subtitle, action, children, className = "", noPadding = false }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-200/40 ${noPadding ? "" : "p-5 sm:p-6"} ${className}`}>
            {(title || action) && (
                <div className={`flex items-start justify-between gap-3 ${noPadding ? "px-5 sm:px-6 pt-5 sm:pt-6" : ""} mb-4`}>
                    <div>
                        {title && <h3 className="font-semibold text-slate-900 text-[15px]">{title}</h3>}
                        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}


// export default function Card({ title, action, children, className = "" }) {
//     return (
//         <div className={`bg-white rounded-xl border shadow-sm p-4 sm:p-5 ${className}`}>
//             {(title || action) && (
//                 <div className="flex items-center justify-between mb-4">
//                     {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
//                     {action}
//                 </div>
//             )}
//             {children}
//         </div>
//     );
// }