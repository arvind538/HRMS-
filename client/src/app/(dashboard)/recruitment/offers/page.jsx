"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  FileCheck2,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  Briefcase,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Printer,
  Send,
  Building2,
  Mail,
  ShieldCheck,
  Check
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const STATUS_THEMES = {
  draft: { label: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-200" },
  sent: { label: "Offer Sent", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  accepted: { label: "Accepted", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  declined: { label: "Declined", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function OfferLettersPage() {
  const [offers, setOffers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal & Drawer States
  const [modalOpen, setModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const [form, setForm] = useState({
    candidate: "",
    designation: "",
    offeredSalary: "",
    joiningDate: "",
    validUntil: "",
    probationMonths: 3,
    workLocation: "Jaipur, Rajasthan",
    notes: "",
  });

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [offRes, candRes] = await Promise.all([
        api.get("/recruitment/offers"),
        api.get("/recruitment/candidates"),
      ]);

      const rawOffers = Array.isArray(offRes?.data)
        ? offRes.data
        : Array.isArray(offRes?.data?.data)
          ? offRes.data.data
          : [];

      const rawCandidates = Array.isArray(candRes?.data)
        ? candRes.data
        : Array.isArray(candRes?.data?.data)
          ? candRes.data.data
          : [];

      setOffers(rawOffers);

      const eligible = rawCandidates.filter((c) => {
        const s = String(c.status || "").toLowerCase();
        return s !== "rejected" && s !== "hired";
      });
      setCandidates(eligible.length > 0 ? eligible : rawCandidates);
    } catch (err) {
      toast.error("Offers ya candidates load nahi ho paye.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCandidateSelect = (candId) => {
    const selected = candidates.find((c) => (c._id || c.id) === candId);
    setForm((prev) => ({
      ...prev,
      candidate: candId,
      designation:
        selected?.jobPosition?.title || selected?.position || prev.designation,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/recruitment/offers", {
        ...form,
        offeredSalary: Number(form.offeredSalary),
      });
      toast.success("Offer Letter successfully created!");
      setModalOpen(false);
      setForm({
        candidate: "",
        designation: "",
        offeredSalary: "",
        joiningDate: "",
        validUntil: "",
        probationMonths: 3,
        workLocation: "Jaipur, Rajasthan",
        notes: "",
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Offer create nahi ho paya.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (e, id, newStatus) => {
    e.stopPropagation();
    try {
      await api.put(`/recruitment/offers/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus.toUpperCase()}`);
      setOffers((prev) =>
        prev.map((item) =>
          (item._id || item.id) === id ? { ...item, status: newStatus } : item
        )
      );
      if (selectedOffer && (selectedOffer._id || selectedOffer.id) === id) {
        setSelectedOffer((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update fail ho gaya.");
    }
  };

  const filteredOffers = useMemo(() => {
    return offers.filter((item) => {
      const candName = (item.candidate?.name || "").toLowerCase();
      const desig = (item.designation || "").toLowerCase();
      const currentStatus = String(item.status || "draft").toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = candName.includes(q) || desig.includes(q);
      const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [offers, searchQuery, statusFilter]);

  const totalOffers = offers.length;
  const acceptedOffers = offers.filter((o) => o.status === "accepted").length;
  const pendingOffers = offers.filter(
    (o) => o.status === "sent" || o.status === "draft"
  ).length;

  // Selected Offer Calculations for Print
  const printSalary = Number(selectedOffer?.offeredSalary) || 0;
  const printAnnualCTC = printSalary * 12;
  const printBasic = Math.round(printSalary * 0.5);
  const printHRA = Math.round(printSalary * 0.3);
  const printSpecial = Math.round(printSalary * 0.2);
  const formattedJoiningDate = selectedOffer?.joiningDate
    ? new Date(selectedOffer.joiningDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : "Immediate";
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FileCheck2 size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Offer Letters & Proposals
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-11">
            Issue formal compensation proposals, joining timelines, and acceptance status
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            title="Refresh offers"
            className="p-2.5 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin text-indigo-600" : ""}
            />
          </button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 py-2.5 font-medium shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> New Offer
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Offers Issued
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalOffers}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <FileCheck2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Accepted Candidates
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{acceptedOffers}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Awaiting Acceptance
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{pendingOffers}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate or designation..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { key: "all", label: "All Proposals" },
            { key: "draft", label: "Drafts" },
            { key: "sent", label: "Sent" },
            { key: "accepted", label: "Accepted" },
            { key: "declined", label: "Declined" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${statusFilter === tab.key
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-50/80 text-slate-600 hover:bg-slate-100"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Candidate</th>
                <th className="py-4 px-6">Designation</th>
                <th className="py-4 px-6">Offered CTC</th>
                <th className="py-4 px-6">Joining Date</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="py-4 px-6"><div className="h-6 bg-slate-100 rounded-full w-20" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-100 rounded w-4 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <FileCheck2 size={34} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-bold text-slate-800 text-sm">Koi offer record nahi mila</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Naya proposal create karne ke liye "New Offer" button par click karein.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOffers.map((item) => {
                  const offId = item._id || item.id;
                  const currentStatus = String(item.status || "draft").toLowerCase();
                  const theme = STATUS_THEMES[currentStatus] || STATUS_THEMES.draft;

                  return (
                    <tr
                      key={offId}
                      onClick={() => setSelectedOffer(item)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                            {item.candidate?.name ? item.candidate.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                              {item.candidate?.name || "Unnamed Candidate"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {item.candidate?.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Briefcase size={13} className="text-slate-400" />
                          <span>{item.designation || "—"}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 flex items-center gap-0.5 font-mono">
                          <span>₹</span>
                          <span>{Number(item.offeredSalary || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">/mo</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>
                            {item.joiningDate
                              ? new Date(item.joiningDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(e, offId, e.target.value)}
                          className={`pl-2.5 pr-6 py-1 border rounded-full text-[11px] font-bold capitalize appearance-none focus:outline-none cursor-pointer transition-all ${theme.bg}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex p-1.5 rounded-xl text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                          <ChevronRight size={16} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offer Dossier Side-Drawer on Row Click */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-100">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                    Offer Specification
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {selectedOffer.candidate?.name || "Offer Details"}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-indigo-600" />
                  <span className="font-bold text-xs text-slate-900">
                    {selectedOffer.designation}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_THEMES[selectedOffer.status]?.bg || STATUS_THEMES.draft.bg
                    }`}
                >
                  {selectedOffer.status || "Draft"}
                </span>
              </div>

              {/* Compensation Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Compensation Package
                </h4>
                <div className="bg-slate-50/80 rounded-3xl p-5 space-y-3.5 border border-slate-100 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-400 font-medium">Monthly Gross</span>
                    <span className="font-bold text-slate-900 font-mono">
                      ₹{Number(selectedOffer.offeredSalary || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-400 font-medium">Annualized CTC</span>
                    <span className="font-bold text-indigo-600 font-mono text-sm">
                      ₹{(Number(selectedOffer.offeredSalary || 0) * 12).toLocaleString()} / yr
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-400 font-medium">Joining Target Date</span>
                    <span className="font-bold text-slate-800">
                      {selectedOffer.joiningDate
                        ? new Date(selectedOffer.joiningDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400 font-medium">Candidate Email</span>
                    <span className="font-mono text-slate-700">
                      {selectedOffer.candidate?.email || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Print Proposal Button (Triggers A4 Offer Letter View) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-2xl text-xs font-bold text-indigo-700 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <Printer size={15} />
                  <span>Print Formal Proposal Letter</span>
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <Button
                onClick={() => setSelectedOffer(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3 font-semibold text-xs cursor-pointer"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Corporate A4 Offer Letter Modal (4paysave Hi Tech Solution) */}
      {printModalOpen && selectedOffer && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-slate-100 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
            {/* Action Bar (Screen Only) */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Building2 size={20} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Official Offer Letter Preview</h2>
                  <p className="text-[11px] text-slate-500">4paysave Hi Tech Solution • Corporate Proposal</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print / Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* A4 Document Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/60">
              <div
                id="printable-offer-letter"
                className="bg-white w-full max-w-[800px] min-h-[1080px] p-8 sm:p-12 shadow-md rounded-xl text-slate-800 text-[13px] leading-relaxed flex flex-col justify-between border border-slate-100"
              >
                <div>
                  {/* Header / Letterhead */}
                  <div className="flex items-start justify-between border-b-2 border-indigo-900 pb-5 mb-6">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-indigo-950 uppercase">
                        4paysave Hi Tech Solution
                      </h1>
                      <p className="text-xs font-semibold text-indigo-600 tracking-wide mt-0.5">
                        Empowering Enterprise Technology, Cloud Architecture & Fintech
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Corporate Office: Jaipur, Rajasthan, India | contact@4paysave.com
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono text-xs font-bold rounded-md">
                        REF: 4PS/HR/2026/0{selectedOffer._id ? selectedOffer._id.slice(-4).toUpperCase() : "8812"}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Date: {currentDate}</p>
                    </div>
                  </div>

                  {/* Candidate Details */}
                  <div className="mb-6 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Private & Confidential</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{selectedOffer.candidate?.name || "Candidate Name"}</p>
                    <p className="text-slate-600 text-xs">{selectedOffer.candidate?.email || "candidate@email.com"}</p>
                  </div>

                  {/* Subject & Salutation */}
                  <div className="space-y-3">
                    <p className="font-bold text-slate-900 underline underline-offset-4">
                      Subject: Letter of Offer & Appointment for the position of "{selectedOffer.designation}"
                    </p>
                    <p>Dear <span className="font-semibold text-slate-900">{selectedOffer.candidate?.name || "Candidate"}</span>,</p>
                    <p className="text-justify text-slate-700">
                      Following your performance and interaction during the recruitment evaluation process, the leadership board of{" "}
                      <strong className="text-slate-900">4paysave Hi Tech Solution</strong> is pleased to offer you the position of{" "}
                      <strong className="text-slate-900">{selectedOffer.designation}</strong>. We are confident that your technical competencies and professional skills will drive substantial excellence to our engineering standards.
                    </p>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="my-5 space-y-2.5 text-slate-700 text-xs">
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-900 min-w-[20px]">1.</span>
                      <p>
                        <strong>Commencement Date:</strong> Your scheduled reporting and onboarding date will be{" "}
                        <strong className="text-indigo-950">{formattedJoiningDate}</strong> at our office facility.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="font-bold text-slate-900 min-w-[20px]">2.</span>
                      <p>
                        <strong>Total Emoluments:</strong> Your Annual Cost to Company (CTC) will be fixed at{" "}
                        <strong className="text-indigo-950">₹{printAnnualCTC.toLocaleString("en-IN")}</strong>{" "}
                        (INR {printAnnualCTC.toLocaleString("en-IN")} per annum), structured at a monthly compensation of{" "}
                        <strong className="text-indigo-950">₹{printSalary.toLocaleString("en-IN")}</strong>, subject to statutory tax deductions and compliance withholdings.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="font-bold text-slate-900 min-w-[20px]">3.</span>
                      <p>
                        <strong>Probation & Confirmation:</strong> You will be on probationary review for a duration of{" "}
                        <strong>{selectedOffer.probationMonths || 3} Months</strong>. Upon formal assessment of conduct, milestone delivery, and attendance, your appointment will be regularized in writing.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="font-bold text-slate-900 min-w-[20px]">4.</span>
                      <p>
                        <strong>Code of Conduct & Confidentiality:</strong> You will strictly observe the non-disclosure policy of 4paysave Hi Tech Solution regarding proprietary codebase, intellectual algorithms, customer records, and enterprise infrastructure.
                      </p>
                    </div>
                  </div>

                  {/* Annexure A: Salary Breakdown */}
                  <div className="my-6">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Annexure - A : Compensation & Structure Details
                    </p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-indigo-950 text-white font-semibold">
                            <th className="py-2.5 px-4">Salary Breakdown Components</th>
                            <th className="py-2.5 px-4 text-right">Monthly (₹)</th>
                            <th className="py-2.5 px-4 text-right">Annualized (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-700">
                          <tr>
                            <td className="py-2 px-4 font-sans font-medium">Basic Pay Component (50%)</td>
                            <td className="py-2 px-4 text-right">₹{printBasic.toLocaleString("en-IN")}</td>
                            <td className="py-2 px-4 text-right">₹{(printBasic * 12).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 font-sans font-medium">House Rent Allowance - HRA (30%)</td>
                            <td className="py-2 px-4 text-right">₹{printHRA.toLocaleString("en-IN")}</td>
                            <td className="py-2 px-4 text-right">₹{(printHRA * 12).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 font-sans font-medium">Special / Performance Allowance (20%)</td>
                            <td className="py-2 px-4 text-right">₹{printSpecial.toLocaleString("en-IN")}</td>
                            <td className="py-2 px-4 text-right">₹{(printSpecial * 12).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                            <td className="py-2.5 px-4 font-sans">Total Guaranteed CTC</td>
                            <td className="py-2.5 px-4 text-right">₹{printSalary.toLocaleString("en-IN")}</td>
                            <td className="py-2.5 px-4 text-right text-indigo-700">₹{printAnnualCTC.toLocaleString("en-IN")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Acceptance Signatures */}
                <div className="pt-6 border-t border-slate-200 mt-6">
                  <p className="text-xs text-slate-600 mb-6 text-justify">
                    Please confirm your acceptance of this appointment offer by counter-signing this formal letter within 3 calendar business days.
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-3">
                    <div>
                      <p className="font-bold text-slate-900">For 4paysave Hi Tech Solution</p>
                      <div className="h-12 flex items-end">
                        <span className="font-serif italic text-indigo-800 text-base font-bold">Authorized Signatory</span>
                      </div>
                      <div className="border-t border-slate-300 pt-1 mt-1 text-[11px] text-slate-500">
                        <p className="font-bold text-slate-800">Director / Head of HR</p>
                        <p>Human Resources & Talent Management</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900">Candidate Acceptance</p>
                      <div className="h-12 flex items-end text-slate-400 italic text-[11px]">
                        Signature: ______________________
                      </div>
                      <div className="border-t border-slate-300 pt-1 mt-1 text-[11px] text-slate-500">
                        <p className="font-bold text-slate-800">{selectedOffer.candidate?.name || "Candidate"}</p>
                        <p>Date: _____ / _____ / 2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Print CSS to enforce clean A4 export */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-offer-letter,
              #printable-offer-letter * {
                visibility: visible !important;
              }
              #printable-offer-letter {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 18mm !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Create Offer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <FileCheck2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Draft Formal Offer Letter
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select candidate, configure compensation package, and joining deadline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Select Candidate *</label>
                <select
                  required
                  value={form.candidate}
                  onChange={(e) => handleCandidateSelect(e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name} {c.jobPosition?.title ? `(${c.jobPosition.title})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Official Designation *</label>
                <input
                  required
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Offered Salary (₹/month) *
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={form.offeredSalary}
                      onChange={(e) =>
                        setForm({ ...form, offeredSalary: e.target.value })
                      }
                      placeholder="e.g. 75000"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Estimated Annual CTC
                  </label>
                  <div className="mt-1.5 px-3.5 py-2.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs font-bold text-indigo-700 flex items-center justify-between">
                    <span>
                      ₹
                      {form.offeredSalary
                        ? (Number(form.offeredSalary) * 12).toLocaleString()
                        : "0"}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-normal uppercase">
                      Per Annum
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={form.joiningDate}
                    onChange={(e) =>
                      setForm({ ...form, joiningDate: e.target.value })
                    }
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Probation Period (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={form.probationMonths}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        probationMonths: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <Button
                  type="submit"
                  loading={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3 font-semibold text-xs shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Generate & Save Offer</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}