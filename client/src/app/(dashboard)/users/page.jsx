"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Trash2,
  ShieldAlert,
  Link2,
  CheckCircle2,
  XCircle,
  Filter,
  UserCheck,
  Search,
  UserCog,
  Shield,
  ChevronDown
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [linkModalUser, setLinkModalUser] = useState(null);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [linking, setLinking] = useState(false);
  const [actionId, setActionId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users", {
        params: roleFilter ? { role: roleFilter } : {},
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to retrieve user accounts.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    api.get("/employees")
      .then(({ data }) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => setEmployees([]));
  }, []);

  const handleRoleChange = async (id, role) => {
    setActionId(id);
    try {
      await api.put(`/users/${id}/role`, { role });
      toast.success("Role permission updated successfully.");
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role assignment.");
    } finally {
      setActionId(null);
    }
  };

  const handleToggleActive = async (id) => {
    setActionId(id);
    try {
      await api.put(`/users/${id}/toggle-active`);
      toast.success("User access status changed.");
      await fetchData();
    } catch (err) {
      toast.error("Failed to alter user status.");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account? This action is irreversible.")) {
      return;
    }
    setActionId(id);
    try {
      await api.delete(`/users/${id}`);
      toast.success("Account permanently removed.");
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account.");
    } finally {
      setActionId(null);
    }
  };

  const openLinkModal = (user) => {
    setLinkModalUser(user);
    setSelectedEmpId(user.employee?._id || "");
  };

  const handleLinkEmployee = async () => {
    if (!selectedEmpId) {
      return toast.warning("Please choose an employee record from the list.");
    }
    setLinking(true);
    try {
      await api.put(`/users/${linkModalUser._id}/link-employee`, { employeeId: selectedEmpId });
      toast.success("Account successfully associated with employee profile.");
      setLinkModalUser(null);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to complete employee linking.");
    } finally {
      setLinking(false);
    }
  };

  const availableEmployees = useMemo(() => {
    const linkedIds = new Set(
      users.filter((u) => u.employee).map((u) => u.employee._id)
    );
    return employees.filter(
      (e) => !linkedIds.has(e._id) || e._id === linkModalUser?.employee?._id
    );
  }, [employees, users, linkModalUser]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.employee?.name?.toLowerCase().includes(query) ||
        u.employee?.employeeId?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const admins = users.filter((u) => u.role === "admin" || u.role === "hr").length;
    return { total, active, admins };
  }, [users]);

  // Helper function to return dynamic styles and color accents for each system role
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "admin":
        return "bg-rose-50 text-rose-700 border-rose-200/80 focus:ring-rose-500/20 focus:border-rose-600";
      case "hr":
        return "bg-purple-50 text-purple-700 border-purple-200/80 focus:ring-purple-500/20 focus:border-purple-600";
      case "manager":
        return "bg-amber-50 text-amber-700 border-amber-200/80 focus:ring-amber-500/20 focus:border-amber-600";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/80 focus:ring-indigo-500/20 focus:border-indigo-600";
    }
  };

  const columns = [
    {
      key: "name",
      label: "User Profile",
      render: (r) => (
        <div className="flex items-center gap-3 py-1.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-500/20 uppercase">
            {r.name ? r.name.charAt(0) : "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 text-sm tracking-tight">{r.name}</span>
            <span className="text-xs text-slate-400 font-normal">{r.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Access Role",
      render: (r) => {
        const isSelf = r._id === currentUser?._id;
        return (
          <div className="relative inline-block min-w-[150px]">
            <div className="relative flex items-center">
              <span className="absolute left-2.5 pointer-events-none text-slate-400">
                <Shield size={13} />
              </span>
              <select
                value={r.role}
                disabled={isSelf || actionId === r._id}
                onChange={(e) => handleRoleChange(r._id, e.target.value)}
                className={`w-full pl-8 pr-7 py-1.5 text-xs font-semibold rounded-xl border shadow-2xs appearance-none transition-all duration-200 hover:border-slate-300 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer ${getRoleBadgeStyle(
                  r.role
                )}`}
              >
                <option value="employee" className="bg-white text-slate-800">Employee</option>
                <option value="manager" className="bg-white text-slate-800">Manager</option>
                <option value="hr" className="bg-white text-slate-800">HR Administrator</option>
                <option value="admin" className="bg-white text-slate-800">System Admin</option>
              </select>
              <span className="absolute right-2.5 pointer-events-none text-slate-400">
                <ChevronDown size={13} />
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "employee",
      label: "Directory Mapping",
      render: (r) =>
        r.employee ? (
          <button
            onClick={() => openLinkModal(r)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-lg transition-all shadow-2xs"
          >
            <UserCheck size={14} className="text-emerald-600" />
            <span className="font-semibold">{r.employee.name}</span>
            <span className="text-emerald-500/80 text-[11px]">({r.employee.employeeId})</span>
          </button>
        ) : (
          <button
            onClick={() => openLinkModal(r)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-1.5 rounded-lg transition-all shadow-2xs"
          >
            <Link2 size={13} className="text-indigo-500" />
            <span>Attach Record</span>
          </button>
        ),
    },
    {
      key: "isActive",
      label: "Account Status",
      render: (r) => {
        const isSelf = r._id === currentUser?._id;
        return (
          <button
            disabled={isSelf || actionId === r._id}
            onClick={() => handleToggleActive(r._id)}
            className="group flex items-center gap-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Badge variant={r.isActive ? "success" : "danger"} className="px-2.5 py-1">
              <span className="flex items-center gap-1.5">
                {r.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {r.isActive ? "Active" : "Suspended"}
              </span>
            </Badge>
          </button>
        );
      },
    },
    {
      key: "createdAt",
      label: "Joined Date",
      render: (r) => (
        <span className="text-xs text-slate-500 font-medium">
          {new Date(r.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const isSelf = r._id === currentUser?._id;
        return (
          <div className="flex justify-end pr-2">
            <button
              disabled={isSelf || actionId === r._id}
              onClick={() => handleDelete(r._id)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={isSelf ? "Current session cannot be deleted" : "Delete user"}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <UserCog size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              User Access Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 pl-1">
            Oversee authentication credentials, system roles, and employee directory mappings.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total</span>
            <span className="text-lg font-bold text-slate-800">{stats.total}</span>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60 text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Active</span>
            <span className="text-lg font-bold text-emerald-700">{stats.active}</span>
          </div>
          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60 text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Admins</span>
            <span className="text-lg font-bold text-indigo-700">{stats.admins}</span>
          </div>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by user name, email, or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl font-medium text-slate-700 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-9 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="">All Access Levels</option>
              <option value="admin">System Admin</option>
              <option value="hr">HR Administrator</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm font-medium text-slate-500">Loading directory credentials...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredUsers}
            emptyText="No user profiles found matching the current search or filter criteria."
          />
        )}
      </div>

      {/* Security Info Banner */}
      <div className="rounded-xl bg-slate-900 text-slate-300 border border-slate-800 p-4 flex items-center gap-3 text-xs shadow-md">
        <div className="p-2 bg-slate-800 text-indigo-400 rounded-lg shrink-0">
          <ShieldAlert size={18} />
        </div>
        <p className="leading-relaxed">
          <strong className="text-white">Self-Modification Security:</strong> For security governance, you cannot revoke your own admin role privileges, suspend your active status, or delete your active session credentials.
        </p>
      </div>

      {/* Association Modal */}
      <Modal
        isOpen={!!linkModalUser}
        onClose={() => setLinkModalUser(null)}
        title="Associate Personnel Record"
      >
        <div className="space-y-5 pt-2">
          <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-4 text-xs text-slate-700 leading-relaxed">
            Linking profile for <span className="font-bold text-indigo-950">{linkModalUser?.name}</span> (<span className="text-indigo-600">{linkModalUser?.email}</span>). Associating a staff record grants this account self-service capabilities for leaves, attendances, and payroll receipts.
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Select Directory Record
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl shadow-2xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
            >
              <option value="">-- Choose unassigned employee record --</option>
              {availableEmployees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} — {e.employeeId} ({e.designation || "Staff"})
                </option>
              ))}
            </select>
          </div>

          {availableEmployees.length === 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3.5 leading-relaxed">
              No unlinked employees are available. Please register an unassigned employee inside the Employee Directory module first.
            </p>
          )}

          <div className="pt-3 flex gap-2.5 justify-end">
            <Button
              variant="outline"
              onClick={() => setLinkModalUser(null)}
              disabled={linking}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkEmployee}
              loading={linking}
              disabled={availableEmployees.length === 0}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirm Association
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}