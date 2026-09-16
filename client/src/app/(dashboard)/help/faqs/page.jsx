"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown,
  HelpCircle,
  Clock,
  CalendarCheck,
  CreditCard,
  UserCheck,
  Search,
  BookOpen,
  ArrowUpRight,
  PhoneCall,
  FileQuestion,
  X,
  Layers,
} from "lucide-react";

const FAQ_CATEGORIES = [
  {
    category: "Attendance",
    icon: Clock,
    badge: "Daily Logs",
    accent: "text-blue-600 bg-blue-50 border-blue-100",
    items: [
      {
        q: "How do I mark my daily attendance check-in?",
        a: "Navigate to 'Attendance' → 'Self Attendance' from the sidebar and click the 'Punch In' button. The system will automatically record your current check-in timestamp and IP location.",
      },
      {
        q: "What should I do if I forget to check out?",
        a: "Your record will show a missing check-out timestamp. Contact your reporting Manager or HR team — they can adjust your work hours via the 'Attendance Regularization' dashboard.",
      },
      {
        q: "Can I regularize missed punches from previous weeks?",
        a: "Yes, you can file a regularization request within 7 working days. Go to 'Attendance' → 'Regularization Requests', select the disputed date, provide justification, and submit for manager approval.",
      },
    ],
  },
  {
    category: "Leave Management",
    icon: CalendarCheck,
    badge: "Time Off",
    accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
    items: [
      {
        q: "How can I apply for leave?",
        a: "Go to 'Leave Management' → 'Apply Leave', select your leave type, choose the start and end dates, provide a brief reason, and submit the request for manager approval.",
      },
      {
        q: "Where can I check my remaining leave balance?",
        a: "Visit the 'Leave Management' → 'Leave Balance' page to view a detailed breakdown of your allocated, consumed, and remaining leaves categorized by Casual, Sick, and Earned leaves.",
      },
      {
        q: "Can I cancel an already approved leave request?",
        a: "If the leave date is in the future, open 'Leave History' and click 'Cancel Request'. For past dates, you must contact HR Operations to manually reverse the credited quotas.",
      },
    ],
  },
  {
    category: "Payroll & Compensation",
    icon: CreditCard,
    badge: "Finance",
    accent: "text-amber-600 bg-amber-50 border-amber-100",
    items: [
      {
        q: "Where can I find and download my monthly payslips?",
        a: "Go to 'Employee Self Service' → 'My Payslips', choose the respective month and year, and click 'View Payslip' to preview or download the official PDF receipt.",
      },
      {
        q: "On which date is monthly payroll processed?",
        a: "Salary disbursal follows corporate payroll policy, typically initiated on the final working day of each calendar month. Please verify in 'Settings' → 'Payroll Schedule' or reach out directly to the HR & Finance Operations desk.",
      },
      {
        q: "How do I submit investment declarations for income tax exemptions?",
        a: "Navigate to 'Payroll' → 'Tax Declarations'. Upload required proof documents (80C, HRA, Medical Insurance) during the designated tax filing window before the end of Q3.",
      },
    ],
  },
  {
    category: "Account & Security",
    icon: UserCheck,
    badge: "Profile & Auth",
    accent: "text-violet-600 bg-violet-50 border-violet-100",
    items: [
      {
        q: "What should I do if I forget my password?",
        a: "Self-service password recovery is currently restricted by organization security policy. Please reach out to your IT Administrator to issue an encrypted password reset token.",
      },
      {
        q: "How do I update my personal profile information?",
        a: "Click on your profile avatar in the top navbar, select 'My Profile', update the editable personal and contact details, and click 'Save Changes'.",
      },
      {
        q: "How can I update my registered salary bank account?",
        a: "Submit a support ticket under the 'Finance & Payroll' category attaching a cancelled cheque or bank statement bearing your name and IFSC code for validation.",
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-2xl transition-all duration-200 overflow-hidden ${open
        ? "border-indigo-200/90 bg-indigo-50/20 shadow-xs"
        : "border-slate-200/80 bg-white hover:border-slate-300"
        }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left gap-4 transition-colors"
      >
        <span
          className={`text-sm sm:text-base font-bold transition-colors leading-snug ${open ? "text-indigo-950" : "text-slate-900 hover:text-indigo-600"
            }`}
        >
          {q}
        </span>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${open
            ? "bg-indigo-600 text-white rotate-180 shadow-md shadow-indigo-600/20"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
        >
          <ChevronDown size={17} strokeWidth={2.5} />
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed border-t border-slate-100/90 mt-1">
            {a}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const totalQuestionsCount = useMemo(() => {
    return FAQ_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
  }, []);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q)
      ),
    })).filter(
      (cat) =>
        (selectedCategory === "All" || cat.category === selectedCategory) &&
        cat.items.length > 0
    );
  }, [search, selectedCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 antialiased">
      {/* Light Clean Enterprise Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-slate-50 border border-slate-100/60 pointer-events-none -z-0" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wider">
            <BookOpen size={13} className="text-indigo-600" />
            <span>Knowledge Base & Self-Service</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Instant answers and step-by-step procedures covering attendance tracking, leave allotments, tax deductions, and security credentials.
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search procedures, attendance, payslips, leaves..."
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50/80 hover:bg-slate-50 text-sm font-medium rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all shadow-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === "All"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
          >
            All Topics ({totalQuestionsCount})
          </button>
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setSelectedCategory(cat.category)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.category
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
            >
              {cat.category} ({cat.items.length})
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-400 self-end sm:self-auto flex items-center gap-1.5">
          <Layers size={13} />
          <span>
            {filteredCategories.reduce((sum, c) => sum + c.items.length, 0)} articles listed
          </span>
        </div>
      </div>

      {/* Structured Category Accordion Sections */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.category}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${cat.accent}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                      {cat.category}
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Frequently addressed operations & policies
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  {cat.badge}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {cat.items.map((item) => (
                  <FAQItem key={item.q} {...item} />
                ))}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3">
            <FileQuestion size={36} className="mx-auto text-slate-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                No matching articles located
              </p>
              <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">
                No entries match your search query &ldquo;{search}&rdquo;. Try another term or submit an inquiry to the HR Helpdesk.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
              }}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Reset Search & Filters
            </button>
          </div>
        )}
      </div>

      {/* Enterprise Resolution Footer Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <HelpCircle size={24} />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-base font-bold text-slate-900">
              Need further clarification or personalized assistance?
            </h4>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Our People Operations desk is available to address ticketed inquiries directly.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/help/tickets"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all shrink-0"
          >
            <span>Raise Support Ticket</span>
            <ArrowUpRight size={15} />
          </Link>
          <Link
            href="/help/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors shrink-0"
          >
            <PhoneCall size={15} />
            <span>Contact Desk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}