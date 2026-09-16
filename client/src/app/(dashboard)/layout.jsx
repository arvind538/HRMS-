
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import RoleGuard from "@/components/auth/RoleGuard";

export default function DashboardLayout({ children }) {
    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 w-full">
                <Navbar />
                <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-[1600px] w-full mx-auto">
                    <RoleGuard>{children}</RoleGuard>
                </main>
            </div>
        </div>
    );
}













// import Navbar from "@/components/layout/Navbar";
// import Sidebar from "@/components/layout/Sidebar";


// export default function DashboardLayout({ children }) {
//     return (
//         <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
//             <Sidebar />
//             <div className="flex-1 flex flex-col min-w-0 w-full">
//                 <Navbar />
//                 <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-[1600px] w-full mx-auto">
//                     {children}
//                 </main>

//             </div>
//         </div>
//     );
// }