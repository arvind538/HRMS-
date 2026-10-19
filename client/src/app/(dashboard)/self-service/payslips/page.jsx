import PayrollWorkspace from "@/components/payroll/PayrollWorkspace";

export default function Page() {
  return <PayrollWorkspace mine />;
}




// "use client";

// import { useEffect, useState, useCallback, useMemo, useRef } from "react";
// import {
//   Loader2,
//   FileText,
//   IndianRupee,
//   Printer,
//   ChevronRight,
//   TrendingUp,
//   TrendingDown,
//   RefreshCw,
//   X,
//   Sparkles,
//   ShieldCheck,
//   CreditCard,
//   Trash2,
//   Search,
//   MoreVertical,
//   Send,
//   Eye
// } from "lucide-react";
// import api from "@/lib/api";
// import { toast } from "react-toastify";
// import { useAuth } from "@/context/AuthContext";

// export default function MyPayslipsPage() {
//   const { user } = useAuth();
//   const [payrolls, setPayrolls] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [viewing, setViewing] = useState(null);
//   const [deletingId, setDeletingId] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [activeDropdown, setActiveDropdown] = useState(null);

//   const dropdownRef = useRef(null);

//   const monthNames = [
//     "January", "February", "March", "April", "May", "June",
//     "July", "August", "September", "October", "November", "December"
//   ];

//   // Close dropdown on outside click
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setActiveDropdown(null);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const employeeId = useMemo(() => {
//     return (
//       user?.employee?._id ||
//       user?.employee?.id ||
//       (typeof user?.employee === "string" ? user?.employee : null) ||
//       user?._id ||
//       user?.id ||
//       null
//     );
//   }, [user]);

//   const extractList = useCallback((resData) => {
//     if (!resData) return [];
//     if (Array.isArray(resData)) return resData;
//     if (Array.isArray(resData?.data)) return resData.data;
//     if (Array.isArray(resData?.data?.payrolls)) return resData.data.payrolls;
//     if (Array.isArray(resData?.data?.records)) return resData.data.records;
//     if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
//     if (Array.isArray(resData?.payrolls)) return resData.payrolls;
//     if (Array.isArray(resData?.records)) return resData.records;
//     if (Array.isArray(resData?.docs)) return resData.docs;
//     if (Array.isArray(resData?.result)) return resData.result;
//     return [];
//   }, []);

//   const fetchPayslips = useCallback(async (isManual = false) => {
//     if (isManual) setRefreshing(true);
//     else setLoading(true);

//     try {
//       let records = [];
//       const directEndpoints = [
//         "/payroll/my-payrolls",
//         "/payroll/my-slips",
//         "/payroll/me",
//         "/payrolls/me",
//         "/payroll"
//       ];

//       for (const endpoint of directEndpoints) {
//         try {
//           const res = await api.get(endpoint);
//           const parsed = extractList(res.data);
//           if (parsed && parsed.length > 0) {
//             records = parsed;
//             break;
//           }
//         } catch {
//           // Try next
//         }
//       }

//       setPayrolls(records);
//     } catch (err) {
//       console.error("Payslips load error:", err);
//       toast.error("Failed to load payroll statements.");
//       setPayrolls([]);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [extractList]);

//   useEffect(() => {
//     fetchPayslips();
//   }, [fetchPayslips]);

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       if (e.key === "Escape") {
//         setViewing(null);
//         setActiveDropdown(null);
//       }
//     };
//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, []);

//   const handleDelete = async (id, e) => {
//     if (e) e.stopPropagation();
//     setActiveDropdown(null);

//     if (!window.confirm("Are you sure you want to delete this payslip?")) {
//       return;
//     }

//     setDeletingId(id);
//     try {
//       const res = await api.delete(`/payroll/${id}`);
//       toast.success(res.data?.message || "Payslip deleted successfully.");
//       setPayrolls((prev) => prev.filter((item) => (item._id || item.id) !== id));
//       if (viewing && (viewing._id === id || viewing.id === id)) {
//         setViewing(null);
//       }
//     } catch (err) {
//       console.error("Delete payslip error:", err);
//       const errMsg =
//         err.response?.data?.message ||
//         err.response?.data?.error ||
//         "Delete route not available on server.";
//       toast.error(errMsg);
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   const handleSendPayslip = (p, e) => {
//     if (e) e.stopPropagation();
//     setActiveDropdown(null);
//     toast.success("Payslip sent successfully to employee email!");
//   };

//   const filteredPayrolls = useMemo(() => {
//     if (!searchTerm.trim()) return payrolls;
//     const q = searchTerm.toLowerCase();
//     return payrolls.filter((p) => {
//       const name = (p.employee?.name || user?.name || "").toLowerCase();
//       const code = (p.employee?.employeeId || p.employee?.code || "").toLowerCase();
//       return name.includes(q) || code.includes(q);
//     });
//   }, [payrolls, searchTerm, user?.name]);

//   if (loading && !refreshing) {
//     return (
//       <div className="py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
//         <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
//           <Loader2 className="animate-spin text-indigo-600 h-7 w-7" />
//         </div>
//         <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
//           Loading monthly salary statements...
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6 max-w-[1500px] mx-auto pb-14 px-3 sm:px-6 font-sans antialiased text-slate-900">
//       {/* Top Header Card */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
//         <div>
//           <div className="flex items-center gap-2.5">
//             <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
//               Payslips
//             </h1>
//             <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 font-mono">
//               <Sparkles size={12} className="text-indigo-600" /> Disbursed Records
//             </span>
//           </div>
//           <p className="text-xs sm:text-sm text-slate-500 mt-1">
//             Review monthly compensations, deductions breakdown, and print formal payment vouchers.
//           </p>
//         </div>

//         <div className="flex items-center gap-3 self-start sm:self-auto">
//           <button
//             onClick={() => fetchPayslips(true)}
//             disabled={refreshing}
//             className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
//           >
//             <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
//             <span>Sync Slips</span>
//           </button>
//         </div>
//       </div>

//       {/* Filter and Search Bar */}
//       <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
//         <div className="relative flex-1 max-w-sm">
//           <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
//           <input
//             type="text"
//             placeholder="Search employee name or ID..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 transition"
//           />
//         </div>
//         <div className="text-xs font-semibold text-slate-600">
//           Total Records: <span className="text-indigo-600 font-bold">{filteredPayrolls.length}</span>
//         </div>
//       </div>

//       {/* Table Container */}
//       <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
//         {filteredPayrolls.length === 0 ? (
//           <div className="py-16 text-center space-y-4">
//             <div className="w-16 h-16 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500">
//               <FileText size={28} />
//             </div>
//             <p className="text-sm font-bold text-slate-800">No payslips found</p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-xs text-slate-600 border-collapse">
//               <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase">
//                 <tr>
//                   <th className="px-5 py-3.5">Employee profile</th>
//                   <th className="px-4 py-3.5">Payrun</th>
//                   <th className="px-4 py-3.5">Period</th>
//                   <th className="px-4 py-3.5">Payrun Type</th>
//                   <th className="px-4 py-3.5">Consider Type</th>
//                   <th className="px-4 py-3.5">Salary</th>
//                   <th className="px-4 py-3.5">Net Salary</th>
//                   <th className="px-4 py-3.5">Status</th>
//                   <th className="px-4 py-3.5 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {filteredPayrolls.map((p, idx) => {
//                   const slipId = p._id || p.id || idx;
//                   const empName = p.employee?.name || user?.name || "Staff Member";
//                   const empCode = p.employee?.employeeId || p.employee?.code || "EMP-001";
//                   const empInitials = empName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
//                   const periodMonth = typeof p.month === "number" ? monthNames[p.month - 1] : p.month || "Monthly";
//                   const periodYear = p.year || new Date().getFullYear();
//                   const netAmount = p.netSalary ?? p.amount ?? p.salary ?? 0;
//                   const grossAmount = p.basicSalary ?? p.grossSalary ?? netAmount;
//                   const isDropdownOpen = activeDropdown === slipId;

//                   return (
//                     <tr key={slipId} className="hover:bg-indigo-50/40 transition-colors group">
//                       {/* Employee Profile */}
//                       <td className="px-5 py-3.5">
//                         <div className="flex items-center gap-3">
//                           <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
//                             {empInitials || "U"}
//                           </div>
//                           <div>
//                             <div className="font-bold text-slate-900">{empName}</div>
//                             <div className="text-[10px] text-slate-400 font-mono">ID: {empCode}</div>
//                           </div>
//                         </div>
//                       </td>

//                       {/* Payrun */}
//                       <td className="px-4 py-3.5 font-mono text-slate-700 whitespace-nowrap">
//                         1 - {new Date(periodYear, typeof p.month === "number" ? p.month : 1, 0).getDate()} - {periodYear}
//                       </td>

//                       {/* Period */}
//                       <td className="px-4 py-3.5 font-medium text-slate-800">
//                         {periodMonth}
//                       </td>

//                       {/* Payrun Type */}
//                       <td className="px-4 py-3.5 text-slate-600">
//                         Settings
//                       </td>

//                       {/* Consider Type */}
//                       <td className="px-4 py-3.5 text-slate-600">
//                         Hour
//                       </td>

//                       {/* Salary */}
//                       <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">
//                         ${Number(grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                       </td>

//                       {/* Net Salary */}
//                       <td className="px-4 py-3.5 font-mono font-bold text-indigo-600">
//                         ${Number(netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                       </td>

//                       {/* Status */}
//                       <td className="px-4 py-3.5">
//                         <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900 text-white font-mono uppercase tracking-wider">
//                           {p.status || "Generated"}
//                         </span>
//                       </td>

//                       {/* Action Menu */}
//                       <td className="px-4 py-3.5 text-right relative">
//                         <button
//                           type="button"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setActiveDropdown(isDropdownOpen ? null : slipId);
//                           }}
//                           className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-500 transition cursor-pointer"
//                         >
//                           <MoreVertical size={16} />
//                         </button>

//                         {isDropdownOpen && (
//                           <div
//                             ref={dropdownRef}
//                             className="absolute right-6 top-12 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-100 text-left"
//                           >
//                             <button
//                               type="button"
//                               onClick={(e) => handleSendPayslip(p, e)}
//                               className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition"
//                             >
//                               <Send size={14} className="text-slate-400" /> Send Payslip
//                             </button>
//                             <button
//                               type="button"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setActiveDropdown(null);
//                                 setViewing(p);
//                               }}
//                               className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2.5 transition"
//                             >
//                               <Eye size={14} className="text-slate-400" /> Payslip Details
//                             </button>
//                             <button
//                               type="button"
//                               onClick={(e) => handleDelete(slipId, e)}
//                               disabled={deletingId === slipId}
//                               className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
//                             >
//                               {deletingId === slipId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
//                             </button>
//                           </div>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Modal for Payslip Inspection */}
//       {viewing && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
//           onClick={() => setViewing(null)}
//         >
//           <div
//             className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
//                   <IndianRupee size={20} />
//                 </div>
//                 <div>
//                   <h2 className="text-base font-bold text-slate-900">Salary Statement Voucher</h2>
//                   <p className="text-xs text-slate-400 font-mono">
//                     Period: {typeof viewing.month === "number" ? monthNames[viewing.month - 1] : viewing.month || ""} {viewing.year || ""}
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={() => window.print()}
//                   className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
//                 >
//                   <Printer size={13} /> Print
//                 </button>
//                 <button
//                   onClick={() => setViewing(null)}
//                   className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
//                 >
//                   <X size={18} />
//                 </button>
//               </div>
//             </div>

//             <div className="p-6 overflow-y-auto space-y-5">
//               <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
//                 <div>
//                   <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
//                     Employee Record
//                   </span>
//                   <p className="text-sm font-bold text-slate-900 mt-0.5">
//                     {viewing.employee?.name || viewing.employee?.fullName || user?.name || "Staff Member"}
//                   </p>
//                   <p className="text-xs text-slate-500 font-mono">
//                     ID: {viewing.employee?.employeeId || viewing.employee?.code || "EMP-CURRENT"} •{" "}
//                     {viewing.employee?.designation || viewing.employee?.role || "Staff"}
//                   </p>
//                 </div>
//                 <div className="sm:text-right">
//                   <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
//                     Payment Status
//                   </span>
//                   <p className="text-xs font-bold text-emerald-600 mt-0.5 uppercase font-mono">
//                     {viewing.status || "DISBURSED / PAID"}
//                   </p>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div className="p-4.5 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
//                   <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
//                     <TrendingUp size={15} />
//                     <span>Earnings</span>
//                   </div>
//                   <div className="space-y-2 text-xs">
//                     <div className="flex justify-between text-slate-600">
//                       <span>Basic Salary</span>
//                       <span className="font-semibold text-slate-900 font-mono">
//                         ${Number(viewing.basicSalary || viewing.grossSalary || 0).toLocaleString()}
//                       </span>
//                     </div>
//                     <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
//                       <span>Gross Salary</span>
//                       <span className="text-emerald-700 font-mono">
//                         ${Number(viewing.grossSalary || viewing.netSalary || 0).toLocaleString()}
//                       </span>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="p-4.5 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
//                   <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
//                     <TrendingDown size={15} />
//                     <span>Deductions</span>
//                   </div>
//                   <div className="space-y-2 text-xs">
//                     <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
//                       <span>Total Deductions</span>
//                       <span className="text-rose-600 font-mono">
//                         -${Number(viewing.totalDeductions || 0).toLocaleString()}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
//                     <CreditCard size={20} />
//                   </div>
//                   <div>
//                     <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
//                       Net Take-Home Pay
//                     </span>
//                     <p className="text-2xl font-black text-indigo-950 font-mono">
//                       ${Number(viewing.netSalary ?? viewing.amount ?? 0).toLocaleString()}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
//               <button
//                 type="button"
//                 onClick={(e) => handleDelete(viewing._id || viewing.id, e)}
//                 disabled={deletingId === (viewing._id || viewing.id)}
//                 className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
//               >
//                 {deletingId === (viewing._id || viewing.id) ? (
//                   <Loader2 size={14} className="animate-spin text-rose-600" />
//                 ) : (
//                   <Trash2 size={14} />
//                 )}
//                 Delete Statement
//               </button>

//               <button
//                 onClick={() => setViewing(null)}
//                 className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
//               >
//                 Close Statement
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }