"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  HelpCircle,
  MessageCircleQuestion,
  UserCog,
  ArrowRight,
  Search,
  LifeBuoy,
  PhoneCall,
  Ticket,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  X,
  Compass,
} from "lucide-react";

const HELP_TOPICS = [
  {
    icon: BookOpen,
    title: "Getting Started & Portal Tour",
    desc: "First-time login guidelines, employee dashboard orientation, role setup, and basic security settings.",
    href: "/help/faqs",
    tag: "Essential",
    accent: "indigo",
    articlesCount: 8,
  },
  {
    icon: UserCog,
    title: "Attendance, Biometrics & Leaves",
    desc: "Remote check-in/out, regularization requests, leave application workflows, and annual quota calculation.",
    href: "/help/faqs",
    tag: "High Volume",
    accent: "emerald",
    articlesCount: 14,
  },
  {
    icon: MessageCircleQuestion,
    title: "Payroll, Payslips & Deductions",
    desc: "Tax declaration guidelines, monthly payslip breakdowns, provident fund deductions, and Form-16 issuance.",
    href: "/help/faqs",
    tag: "Finance",
    accent: "amber",
    articlesCount: 11,
  },
  {
    icon: HelpCircle,
    title: "Account Security & System Issues",
    desc: "Two-factor authentication setup, SSO troubleshooting, profile locks, and general portal errors.",
    href: "/help/tickets",
    tag: "Technical",
    accent: "rose",
    articlesCount: 6,
  },
];

const POPULAR_QUERIES = [
  "Apply for casual leave",
  "Download Form-16",
  "Regularize attendance punch",
  "Update bank account IFSC",
  "Reset company password",
];

const QUICK_ACTIONS = [
  {
    title: "Raise Support Ticket",
    desc: "Direct issue logging with SLA tracking",
    href: "/help/tickets",
    icon: Ticket,
  },
  {
    title: "Employee Handbook",
    desc: "Official corporate guidelines & policies",
    href: "/help/faqs",
    icon: FileText,
  },
  {
    title: "Direct HR Helpline",
    desc: "Call or live chat with People Ops",
    href: "/help/contact",
    icon: PhoneCall,
  },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return HELP_TOPICS;
    return HELP_TOPICS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.tag.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 antialiased">
      {/* Light Clean Enterprise Header */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle decorative background ring */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-slate-50 border border-slate-100/60 pointer-events-none -z-0" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold uppercase tracking-wider">
            <Compass size={13} className="text-indigo-600" />
            <span>Employee Knowledge Base & Support</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            How can our HR Ops desk support you?
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
            Search comprehensive documentation, resolve portal questions, or submit assistance requisitions to HR.
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-4 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leaves, payroll slips, attendance regularization..."
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50/80 hover:bg-slate-50 text-sm font-medium rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Popular Query Chips */}
            <div className="flex items-center justify-center flex-wrap gap-1.5 mt-3.5 text-xs">
              <span className="text-slate-400 font-medium mr-1">Frequent:</span>
              {POPULAR_QUERIES.map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => setSearchQuery(query)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 text-xs font-medium border border-slate-200/60 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                  {action.title}
                </h2>
                <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                  {action.desc}
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </Link>
          );
        })}
      </div>

      {/* Documentation Category Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Knowledge Base Catalogs
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Select an operational section to review self-help articles and walkthroughs
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Showing {filteredTopics.length} of {HELP_TOPICS.length} sections
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link
                key={topic.title}
                href={topic.href}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                      <Icon size={22} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {topic.tag}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                      {topic.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
                      {topic.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <FileText size={13} />
                    {topic.articlesCount} Verified Guides
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <span>Read Articles</span>
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredTopics.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
            <HelpCircle size={32} className="mx-auto text-slate-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                No matching documentation found
              </p>
              <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">
                We couldn&apos;t locate any articles matching &ldquo;{searchQuery}&rdquo;. Try using broader terms or reach out to the helpdesk.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Clear Search Query
            </button>
          </div>
        )}
      </div>

      {/* Support Availability Notice & Helpdesk Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 hidden sm:flex">
            <LifeBuoy size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900">
              Need personalized operational assistance?
            </h4>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                HR Helpdesk Active
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> Standard SLA: Within 2 Hours
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          <Link
            href="/help/tickets"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all"
          >
            <Ticket size={15} />
            <span>Submit Ticket</span>
          </Link>
          <Link
            href="/help/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <PhoneCall size={15} />
            <span>Contact People Ops</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// "use client";
// import Link from "next/link";
// import { BookOpen, HelpCircle, MessageCircleQuestion, UserCog, ArrowRight } from "lucide-react";

// const HELP_TOPICS = [
//   { icon: BookOpen, title: "Getting Started", desc: "HRMS portal use karna seekho — login, dashboard navigation, profile setup.", href: "/help/faqs" },
//   { icon: UserCog, title: "Attendance & Leave", desc: "Check-in/out kaise kare, leave apply karna, balance dekhna.", href: "/help/faqs" },
//   { icon: MessageCircleQuestion, title: "Payroll & Payslips", desc: "Apni payslip download karna, salary breakdown samajhna.", href: "/help/faqs" },
//   { icon: HelpCircle, title: "Common Issues", desc: "Login problems, forgot password, aur technical issues ka solution.", href: "/help/tickets" },
// ];

// export default function HelpCenterPage() {
//   return (
//     <div className="space-y-6">
//       <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white text-center">
//         <h1 className="text-2xl font-bold">How can we help you?</h1>
//         <p className="text-indigo-100 text-sm mt-1">Guides, FAQs, aur support — sab ek jagah</p>
//       </div>

//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//         {HELP_TOPICS.map((topic) => {
//           const Icon = topic.icon;
//           return (
//             <Link key={topic.title} href={topic.href} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
//               <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
//                 <Icon size={18} />
//               </div>
//               <h3 className="font-bold text-slate-900 flex items-center justify-between">
//                 {topic.title}
//                 <ArrowRight size={15} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
//               </h3>
//               <p className="text-xs text-slate-500 mt-1.5">{topic.desc}</p>
//             </Link>
//           );
//         })}
//       </div>

//       <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
//         <p className="text-sm text-slate-600">Apna sawal nahi mila?</p>
//         <div className="flex items-center justify-center gap-3 mt-3">
//           <Link href="/help/tickets" className="text-sm font-semibold text-indigo-600 hover:underline">Raise a Ticket</Link>
//           <span className="text-slate-300">·</span>
//           <Link href="/help/contact" className="text-sm font-semibold text-indigo-600 hover:underline">Contact HR</Link>
//         </div>
//       </div>
//     </div>
//   );
// }