export default function Table({ columns, data, onRowClick, emptyText = "No records found", loading = false }) {
    if (loading) {
        return (
            <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-11 bg-slate-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl">
            <table className="min-w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className="px-4 sm:px-5 py-3.5 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap"
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-14">
                                <p className="text-slate-400 text-sm">{emptyText}</p>
                            </td>
                        </tr>
                    ) : (
                        data.map((row, i) => (
                            <tr
                                key={row._id || i}
                                onClick={() => onRowClick?.(row)}
                                className={`${onRowClick ? "cursor-pointer hover:bg-indigo-50/40" : ""
                                    } ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-slate-700">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}





// export default function Table({ columns, data, onRowClick, emptyText = "No records found" }) {
//     return (
//         <div className="overflow-x-auto -mx-4 sm:mx-0">
//             <table className="min-w-full text-sm">
//                 <thead>
//                     <tr className="border-b text-left text-gray-500">
//                         {columns.map((col) => (
//                             <th key={col.key} className="px-4 py-3 font-medium whitespace-nowrap">
//                                 {col.label}
//                             </th>
//                         ))}
//                     </tr>
//                 </thead>
//                 <tbody>
//                     {data.length === 0 ? (
//                         <tr>
//                             <td colSpan={columns.length} className="text-center py-8 text-gray-400">
//                                 {emptyText}
//                             </td>
//                         </tr>
//                     ) : (
//                         data.map((row, i) => (
//                             <tr
//                                 key={row._id || i}
//                                 onClick={() => onRowClick?.(row)}
//                                 className={`border-b last:border-0 ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
//                             >
//                                 {columns.map((col) => (
//                                     <td key={col.key} className="px-4 py-3 whitespace-nowrap">
//                                         {col.render ? col.render(row) : row[col.key]}
//                                     </td>
//                                 ))}
//                             </tr>
//                         ))
//                     )}
//                 </tbody>
//             </table>
//         </div>
//     );
// }