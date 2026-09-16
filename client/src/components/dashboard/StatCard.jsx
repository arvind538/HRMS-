// src/components/dashboard/StatCard.jsx
export default function StatCard({ label, value, icon: Icon, color = "bg-indigo-100 text-indigo-700", trend }) {
    return (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-sm shadow-slate-200/40 hover:shadow-md hover:shadow-slate-200/60 transition-shadow">
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${trend.startsWith("-") ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                            }`}
                    >
                        {trend}
                    </span>
                )}
            </div>
            <p className="mt-3 text-xs sm:text-sm text-slate-400 font-medium truncate">{label}</p>
            <p className="text-xl sm:text-[26px] font-bold text-slate-900 mt-0.5">{value}</p>
        </div>
    );
}



// export default function StatCard({ label, value, icon: Icon, color = "bg-indigo-100 text-indigo-700", trend }) {
//     return (
//         <div className="bg-white rounded-xl p-5 shadow-sm border">
//             <div className="flex items-start justify-between">
//                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
//                     <Icon size={20} />
//                 </div>
//                 {trend && (
//                     <span
//                         className={`text-xs font-medium px-2 py-1 rounded-full ${trend.startsWith("-")
//                             ? "bg-red-50 text-red-600"
//                             : "bg-green-50 text-green-600"
//                             }`}
//                     >
//                         {trend}
//                     </span>
//                 )}
//             </div>
//             <p className="mt-3 text-sm text-gray-500">{label}</p>
//             <p className="text-2xl font-bold text-gray-800">{value}</p>
//         </div>
//     );
// }