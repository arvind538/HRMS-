"use client";

import React, { useState, useEffect } from "react";
import { Plus, Ticket, Clock, CheckCircle, AlertCircle, X } from "lucide-react";
import { toast } from "react-toastify";

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal open/close aur form data handle karne ke liye naye states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", priority: "Medium" });

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const mockData = [
          { _id: "TKT-001", title: "Laptop not connecting to WiFi", description: "Getting IP configuration error.", status: "Open", priority: "High", createdAt: "2026-09-08T10:00:00Z" },
          { _id: "TKT-002", title: "Need access to HR Portal", description: "My account shows access denied.", status: "In Progress", priority: "Medium", createdAt: "2026-09-07T14:30:00Z" },
          { _id: "TKT-003", title: "Mouse is not working", description: "Right click is broken.", status: "Resolved", priority: "Low", createdAt: "2026-09-05T09:15:00Z" },
        ];

        setTickets(mockData);
        setLoading(false);
      } catch (err) {
        setError("Failed to load tickets. Please try again.");
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Form submit handle karne ke liye (Abhi ke liye dummy, baad me axios laga lena)
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("New Ticket Data:", formData);
    toast.success("Ticket created successfully!");

    // Form reset karein aur modal band karein
    setFormData({ title: "", description: "", priority: "Medium" });
    setIsModalOpen(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Open": return "bg-red-100 text-red-700 border-red-200";
      case "In Progress": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Resolved": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Loading tickets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg border border-red-100 m-6">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600" />
            Support Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Raise and track tickets for IT or HR assistance.
          </p>
        </div>

        {/* Yahan onClick add kiya gaya hai */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">No active tickets</h3>
            <p>You don't have any support tickets at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-gray-900">{ticket.title}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      <span className="font-medium">
                        ID: {ticket._id}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                      {ticket.priority} Priority
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL KA CODE YAHAN HAI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Ticket</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Mouse not working"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe your issue..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Submit Ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}