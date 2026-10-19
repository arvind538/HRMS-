"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  MessageSquare,
  Headphones,
  ChevronDown,
  ChevronUp,
  Send,
  FileText,
  LifeBuoy,
  CircleHelp,
  UserRound,
  Loader2,
  Inbox,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";

const CATEGORIES = [
  "Login & Account",
  "Attendance",
  "Leave Management",
  "Payroll & Salary",
  "Employee Profile",
  "Documents & ID Card",
  "Technical Issue",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "Waiting for Employee",
  "Resolved",
  "Closed",
];

const INITIAL_FORM = {
  title: "",
  category: "Technical Issue",
  priority: "Medium",
  description: "",
};

function normalizeTickets(response) {
  const body = response?.data;

  // Supports common Express response formats:
  // { tickets: [] }, { data: [] }, or a direct array.
  const list = Array.isArray(body)
    ? body
    : Array.isArray(body?.tickets)
      ? body.tickets
      : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.data?.tickets)
          ? body.data.tickets
          : null;

  if (!list) {
    throw new Error(
      "Invalid tickets response. Please check the backend API response."
    );
  }

  return list;
}

function getTicketId(ticket) {
  return ticket?._id || ticket?.id || ticket?.ticketId || "";
}

function getStatus(status = "Open") {
  const value = String(status).toLowerCase();

  if (value === "in progress" || value === "in-progress") {
    return "In Progress";
  }

  if (
    value === "waiting for employee" ||
    value === "waiting_for_employee"
  ) {
    return "Waiting for Employee";
  }

  if (value === "resolved") return "Resolved";
  if (value === "closed") return "Closed";
  if (value === "assigned") return "Assigned";

  return "Open";
}

function statusClasses(status) {
  const normalized = getStatus(status);

  const styles = {
    Open: "bg-red-50 text-red-700 ring-red-200",
    Assigned: "bg-purple-50 text-purple-700 ring-purple-200",
    "In Progress": "bg-blue-50 text-blue-700 ring-blue-200",
    "Waiting for Employee": "bg-amber-50 text-amber-800 ring-amber-200",
    Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Closed: "bg-gray-100 text-gray-700 ring-gray-200",
  };

  return styles[normalized] || styles.Open;
}

function priorityClasses(priority) {
  const styles = {
    Low: "bg-gray-100 text-gray-700",
    Medium: "bg-blue-50 text-blue-700",
    High: "bg-orange-50 text-orange-700",
    Urgent: "bg-red-50 text-red-700",
  };

  return styles[priority] || styles.Medium;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expandedTicket, setExpandedTicket] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  // const fetchTickets = useCallback(async (isRefresh = false) => {
  //   if (isRefresh) {
  //     setRefreshing(true);
  //   } else {
  //     setLoading(true);
  //   }

  //   setPageError("");

  //   try {
  //     // Expected endpoint: GET /api/support/tickets
  //     const response = await api.get("/support/tickets");
  //     const list = normalizeTickets(response);

  //     setTickets(list);
  //   } catch (error) {
  //     const message = getErrorMessage(error);
  //     setPageError(message);
  //     toast.error(`Unable to load support tickets: ${message}`);
  //   } finally {
  //     setLoading(false);
  //     setRefreshing(false);
  //   }
  // }, []);

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError("");

    try {
      const response = await api.get("/support/tickets");
      setTickets(normalizeTickets(response));
    } catch (error) {
      const message =
        error?.response?.status === 404
          ? "Support service is not available yet. Please contact your administrator."
          : getErrorMessage(error);

      setPageError(message);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !submitting) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [isModalOpen, submitting]);

  const stats = useMemo(() => {
    const active = tickets.filter(
      (ticket) =>
        !["Resolved", "Closed"].includes(getStatus(ticket.status))
    );

    return {
      total: tickets.length,
      active: active.length,
      inProgress: tickets.filter(
        (ticket) =>
          getStatus(ticket.status) === "In Progress"
      ).length,
      resolved: tickets.filter(
        (ticket) =>
          ["Resolved", "Closed"].includes(getStatus(ticket.status))
      ).length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const id = String(
        ticket.ticketNumber ||
        ticket.ticketId ||
        getTicketId(ticket)
      ).toLowerCase();

      const title = String(ticket.title || "").toLowerCase();
      const description = String(ticket.description || "").toLowerCase();
      const category = String(ticket.category || "").toLowerCase();

      const matchesSearch =
        !query ||
        id.includes(query) ||
        title.includes(query) ||
        description.includes(query) ||
        category.includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        getStatus(ticket.status) === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        ticket.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (formData.title.trim().length < 5) {
      errors.title = "Title must contain at least 5 characters.";
    }

    if (formData.title.trim().length > 120) {
      errors.title = "Title cannot exceed 120 characters.";
    }

    if (formData.description.trim().length < 10) {
      errors.description =
        "Please describe your problem in at least 10 characters.";
    }

    if (formData.description.trim().length > 3000) {
      errors.description =
        "Description cannot exceed 3000 characters.";
    }

    if (!CATEGORIES.includes(formData.category)) {
      errors.category = "Please select a valid category.";
    }

    if (!PRIORITIES.includes(formData.priority)) {
      errors.priority = "Please select a valid priority.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || !validateForm()) return;

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        priority: formData.priority,
        description: formData.description.trim(),
      };

      // Expected endpoint: POST /api/support/tickets
      // The backend must derive employee identity from authentication.
      const response = await api.post("/support/tickets", payload);

      if (response.status < 200 || response.status >= 300) {
        throw new Error("Ticket could not be created.");
      }

      const body = response.data;
      const createdTicket =
        body?.ticket ||
        body?.data?.ticket ||
        body?.data ||
        body;

      // Update immediately if the API returns the created ticket.
      if (
        createdTicket &&
        typeof createdTicket === "object" &&
        getTicketId(createdTicket)
      ) {
        setTickets((previous) => [
          createdTicket,
          ...previous.filter(
            (ticket) =>
              getTicketId(ticket) !== getTicketId(createdTicket)
          ),
        ]);
      } else {
        // Otherwise retrieve the server's saved list.
        await fetchTickets(true);
      }

      setFormData(INITIAL_FORM);
      setFormErrors({});
      setIsModalOpen(false);

      toast.success(
        `Ticket created successfully${createdTicket?.ticketNumber
          ? `: ${createdTicket.ticketNumber}`
          : ""
        }`
      );
    } catch (error) {
      toast.error(
        `Ticket creation failed: ${getErrorMessage(error)}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;

    setIsModalOpen(false);
    setFormErrors({});
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Page header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Headphones size={25} />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Help & Support
            </h1>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Report an issue, get assistance and track your requests.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchTickets(true)}
            disabled={refreshing || loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus size={17} />
            New Ticket
          </button>
        </div>
      </section>

      {/* Quick help */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <CircleHelp className="mt-0.5 shrink-0 text-indigo-600" size={21} />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Need quick help?
            </h2>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Choose the right category and describe the steps that caused
              the issue so the support team can investigate.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <MessageSquare
            className="mt-0.5 shrink-0 text-indigo-600"
            size={21}
          />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Track every request
            </h2>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Check your ticket status and the latest updates here.
              Contact HR or IT if you need additional assistance.
            </p>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total Tickets",
            value: stats.total,
            icon: Ticket,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Active Tickets",
            value: stats.active,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "In Progress",
            value: stats.inProgress,
            icon: RefreshCw,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Resolved / Closed",
            value: stats.resolved,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium leading-5 text-gray-500 sm:text-sm">
                  {item.label}
                </span>

                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bg} ${item.color}`}
                >
                  <Icon size={18} />
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold text-gray-900">
                {loading ? "—" : item.value}
              </p>
            </div>
          );
        })}
      </section>

      {/* Ticket list */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                My Support Requests
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View and track the tickets submitted from your account.
              </p>
            </div>

            <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {filteredTickets.length}{" "}
              {filteredTickets.length === 1 ? "request" : "requests"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, ID or issue..."
                aria-label="Search support tickets"
                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by ticket status"
              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="All">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by ticket category"
              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="All">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 py-12 text-center">
            <Loader2 className="mb-3 animate-spin text-indigo-600" size={32} />
            <p className="text-sm font-medium text-gray-700">
              Loading your support tickets...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Please wait a moment.
            </p>
          </div>
        ) : pageError ? (
          <div className="px-4 py-12 text-center sm:px-8">
            <AlertCircle className="mx-auto mb-3 text-red-500" size={34} />
            <h3 className="font-semibold text-gray-900">
              Could not load your tickets
            </h3>
            <p className="mx-auto mt-2 max-w-lg break-words text-sm text-gray-500">
              {pageError}
            </p>

            <button
              type="button"
              onClick={() => fetchTickets()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Inbox size={27} />
            </div>

            <h3 className="font-semibold text-gray-900">
              {tickets.length === 0
                ? "No support tickets yet"
                : "No matching tickets found"}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
              {tickets.length === 0
                ? "If you have a problem with attendance, leave, payroll or your account, create a ticket and our support team can assist you."
                : "Try changing your search text or filters."}
            </p>

            {tickets.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Plus size={17} />
                Create Your First Ticket
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                }}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTickets.map((ticket) => {
              const id = getTicketId(ticket);
              const isExpanded = expandedTicket === id;
              const displayId =
                ticket.ticketNumber ||
                ticket.ticketId ||
                id ||
                "Pending ID";
              const status = getStatus(ticket.status);

              return (
                <article
                  key={id || displayId}
                  className="p-4 transition hover:bg-gray-50/70 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-600">
                          {displayId}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(status)}`}
                        >
                          {status}
                        </span>
                      </div>

                      <h3 className="mt-3 break-words text-base font-semibold text-gray-900">
                        {ticket.title || "Untitled ticket"}
                      </h3>

                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                        {ticket.description || "No description provided."}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} />
                          {formatDate(ticket.createdAt)}
                        </span>

                        {ticket.category && (
                          <span className="inline-flex items-center gap-1.5">
                            <FileText size={14} />
                            {ticket.category}
                          </span>
                        )}

                        {ticket.assignedTo && (
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound size={14} />
                            Assigned to{" "}
                            {typeof ticket.assignedTo === "object"
                              ? ticket.assignedTo.name || "Support team"
                              : ticket.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <span
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${priorityClasses(ticket.priority)}`}
                      >
                        {ticket.priority || "Medium"} Priority
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTicket(isExpanded ? null : id)
                        }
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? "Hide ticket details"
                            : "Show ticket details"
                        }
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        Details
                        {isExpanded ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Ticket Details
                      </h4>

                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-gray-500">Ticket ID</p>
                          <p className="mt-1 break-all font-medium text-gray-800">
                            {displayId}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Last Updated
                          </p>
                          <p className="mt-1 text-gray-800">
                            {formatDate(ticket.updatedAt || ticket.createdAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Current Status
                          </p>
                          <p className="mt-1 font-medium text-gray-800">
                            {status}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Resolution Notes
                          </p>
                          <p className="mt-1 break-words text-gray-800">
                            {ticket.resolutionNotes ||
                              ticket.resolution ||
                              "No resolution notes have been added yet."}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs leading-5 text-gray-500">
                        Need to add information or respond to your support
                        team? Use your organization's configured support
                        reply feature or contact HR/IT with this ticket ID.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Create ticket modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting
            ) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
            className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <LifeBuoy size={21} />
                </div>

                <div>
                  <h2
                    id="ticket-modal-title"
                    className="text-lg font-bold text-gray-900"
                  >
                    Create Support Ticket
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Explain your issue so the right team can help you.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close ticket form"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
              <div>
                <label
                  htmlFor="ticket-title"
                  className="mb-1.5 block text-sm font-semibold text-gray-700"
                >
                  Issue Title <span className="text-red-500">*</span>
                </label>

                <input
                  id="ticket-title"
                  type="text"
                  required
                  minLength={5}
                  maxLength={120}
                  autoFocus
                  value={formData.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  placeholder="e.g. Attendance is missing for 10 October"
                  className="min-h-11 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                {formErrors.title && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.title}
                  </p>
                )}

                <p className="mt-1 text-right text-xs text-gray-400">
                  {formData.title.length}/120
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ticket-category"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>

                  <select
                    id="ticket-category"
                    required
                    value={formData.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  {formErrors.category && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="ticket-priority"
                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                  >
                    Priority <span className="text-red-500">*</span>
                  </label>

                  <select
                    id="ticket-priority"
                    required
                    value={formData.priority}
                    onChange={(event) =>
                      updateField("priority", event.target.value)
                    }
                    className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>

                  {formErrors.priority && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.priority}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="ticket-description"
                  className="mb-1.5 block text-sm font-semibold text-gray-700"
                >
                  Describe Your Problem{" "}
                  <span className="text-red-500">*</span>
                </label>

                <textarea
                  id="ticket-description"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  value={formData.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="When did the issue occur? Which page were you using? What error did you see, and what have you already tried?"
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                {formErrors.description && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.description}
                  </p>
                )}

                <p className="mt-1 text-right text-xs text-gray-400">
                  {formData.description.length}/3000
                </p>
              </div>

              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-700"
                  />
                  <p className="text-xs leading-5 text-amber-900">
                    Do not include your password, OTP, authentication
                    tokens or complete bank details in the ticket.
                    Include only the information needed to investigate
                    your issue.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Creating Ticket...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

// "use client";

// import React, { useState, useEffect } from "react";
// import { Plus, Ticket, Clock, CheckCircle, AlertCircle, X } from "lucide-react";
// import { toast } from "react-toastify";

// export default function SupportTicketsPage() {
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Modal open/close aur form data handle karne ke liye naye states
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [formData, setFormData] = useState({ title: "", description: "", priority: "Medium" });

//   useEffect(() => {
//     const fetchTickets = async () => {
//       try {
//         await new Promise((resolve) => setTimeout(resolve, 1500));
//         const mockData = [
//           { _id: "TKT-001", title: "Laptop not connecting to WiFi", description: "Getting IP configuration error.", status: "Open", priority: "High", createdAt: "2026-09-08T10:00:00Z" },
//           { _id: "TKT-002", title: "Need access to HR Portal", description: "My account shows access denied.", status: "In Progress", priority: "Medium", createdAt: "2026-09-07T14:30:00Z" },
//           { _id: "TKT-003", title: "Mouse is not working", description: "Right click is broken.", status: "Resolved", priority: "Low", createdAt: "2026-09-05T09:15:00Z" },
//         ];

//         setTickets(mockData);
//         setLoading(false);
//       } catch (err) {
//         setError("Failed to load tickets. Please try again.");
//         setLoading(false);
//       }
//     };

//     fetchTickets();
//   }, []);

//   // Form submit handle karne ke liye (Abhi ke liye dummy, baad me axios laga lena)
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     console.log("New Ticket Data:", formData);
//     toast.success("Ticket created successfully!");

//     // Form reset karein aur modal band karein
//     setFormData({ title: "", description: "", priority: "Medium" });
//     setIsModalOpen(false);
//   };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "Open": return "bg-red-100 text-red-700 border-red-200";
//       case "In Progress": return "bg-blue-100 text-blue-700 border-blue-200";
//       case "Resolved": return "bg-green-100 text-green-700 border-green-200";
//       default: return "bg-gray-100 text-gray-700 border-gray-200";
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-96 text-gray-500">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
//         Loading tickets...
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg border border-red-100 m-6">
//         <AlertCircle className="w-8 h-8 mx-auto mb-2" />
//         <p>{error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 max-w-6xl mx-auto space-y-6 relative">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//             <Ticket className="w-6 h-6 text-indigo-600" />
//             Support Tickets
//           </h1>
//           <p className="text-sm text-gray-500 mt-1">
//             Raise and track tickets for IT or HR assistance.
//           </p>
//         </div>

//         {/* Yahan onClick add kiya gaya hai */}
//         <button
//           onClick={() => setIsModalOpen(true)}
//           className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm"
//         >
//           <Plus className="w-4 h-4" />
//           New Ticket
//         </button>
//       </div>

//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//         {tickets.length === 0 ? (
//           <div className="p-12 text-center text-gray-500">
//             <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
//             <h3 className="text-lg font-medium text-gray-900">No active tickets</h3>
//             <p>You don't have any support tickets at the moment.</p>
//           </div>
//         ) : (
//           <div className="divide-y divide-gray-100">
//             {tickets.map((ticket) => (
//               <div key={ticket._id} className="p-5 hover:bg-gray-50 transition-colors">
//                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
//                   <div className="space-y-1">
//                     <div className="flex items-center gap-3">
//                       <h3 className="text-base font-semibold text-gray-900">{ticket.title}</h3>
//                       <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
//                         {ticket.status}
//                       </span>
//                     </div>
//                     <p className="text-sm text-gray-600 line-clamp-1">{ticket.description}</p>
//                     <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
//                       <span className="flex items-center gap-1">
//                         <Clock className="w-3.5 h-3.5" />
//                         {new Date(ticket.createdAt).toLocaleDateString()}
//                       </span>
//                       <span className="font-medium">
//                         ID: {ticket._id}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="flex-shrink-0">
//                     <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
//                       {ticket.priority} Priority
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* MODAL KA CODE YAHAN HAI */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
//             <button
//               onClick={() => setIsModalOpen(false)}
//               className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
//             >
//               <X className="w-5 h-5" />
//             </button>

//             <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Ticket</h2>

//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
//                 <input
//                   required
//                   type="text"
//                   className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
//                   placeholder="e.g. Mouse not working"
//                   value={formData.title}
//                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
//                 <select
//                   className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
//                   value={formData.priority}
//                   onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
//                 >
//                   <option value="Low">Low</option>
//                   <option value="Medium">Medium</option>
//                   <option value="High">High</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
//                 <textarea
//                   required
//                   rows="3"
//                   className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
//                   placeholder="Describe your issue..."
//                   value={formData.description}
//                   onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//                 ></textarea>
//               </div>

//               <button
//                 type="submit"
//                 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors"
//               >
//                 Submit Ticket
//               </button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }