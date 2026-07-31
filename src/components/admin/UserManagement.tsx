import React, { useState, useMemo } from "react";
import { 
  Users, UserPlus, Search, Filter, Edit3, Shield, Key, Eye, 
  Trash2, ToggleLeft, ToggleRight, Check, X, Mail, Phone, Clock,
  FileCheck, ShieldAlert, Award, AlertCircle, FileText, RefreshCw, UserX
} from "lucide-react";
import { User, Client, Task } from "../../types";

interface UserManagementProps {
  userRoster: User[];
  setUserRoster: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  clients: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  logActivity: (action: string, details: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  userRoster,
  setUserRoster,
  currentUser,
  clients,
  setClients,
  tasks = [],
  setTasks,
  showToast,
  logActivity
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Onboard / Recuit staff modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<User["role"]>("Broker");
  const [newPin, setNewPin] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFsra, setNewFsra] = useState("");
  const [newFsraExpiry, setNewFsraExpiry] = useState("");
  const [newEoCarrier, setNewEoCarrier] = useState("");
  const [newEoPolicy, setNewEoPolicy] = useState("");
  const [newEoExpiry, setNewEoExpiry] = useState("");

  // Edit staff modal states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<User["role"]>("Broker");
  const [editPin, setEditPin] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editFsra, setEditFsra] = useState("");
  const [editFsraExpiry, setEditFsraExpiry] = useState("");
  const [editEoCarrier, setEditEoCarrier] = useState("");
  const [editEoPolicy, setEditEoPolicy] = useState("");
  const [editEoExpiry, setEditEoExpiry] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  // Doc / ID review states
  const [reviewingUser, setReviewingUser] = useState<User | null>(null);

  // Compute dynamic client count assigned per broker
  const brokerFileCount = useMemo(() => {
    const counts: Record<string, number> = {};
    userRoster.forEach(u => { counts[u.id] = 0; });
    clients.forEach(c => {
      const ownerName = c.retentionOwner || "";
      const matched = userRoster.find(u => `${u.first} ${u.last}`.toLowerCase() === ownerName.toLowerCase());
      if (matched) { counts[matched.id]++; }
    });
    return counts;
  }, [clients, userRoster]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return userRoster.filter(u => {
      const nameMatch = `${u.first} ${u.last}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.jobTitle || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const roleMatch = roleFilter === "all" || u.role === roleFilter;
      const statusMatch = statusFilter === "all" || u.status === statusFilter;

      return nameMatch && roleMatch && statusMatch;
    });
  }, [userRoster, searchTerm, roleFilter, statusFilter]);

  // Create User submit handler
  const handleOnboardUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirst || !newLast || !newEmail || !newPin) {
      showToast("First, Last Name, Email and Pin are strictly required.", "error");
      return;
    }

    const newUser: User = {
      id: `u_${Date.now()}`,
      first: newFirst,
      last: newLast,
      email: newEmail,
      phone: newPhone || "(705) 555-0100",
      role: newRole,
      status: "active",
      pin: newPin,
      lastLogin: new Date().toISOString(),
      created: new Date().toISOString().split("T")[0],
      displayName: `${newFirst} ${newLast}`,
      jobTitle: newTitle || newRole,
      fsraNum: newFsra,
      fsraExpiry: newFsraExpiry,
      eoInsurer: newEoCarrier,
      eoPolicy: newEoPolicy,
      eoExpiry: newEoExpiry,
      docsStatus: newFsra ? "pending" : "missing"
    };

    const updated = [...userRoster, newUser];
    setUserRoster(updated);
    logActivity("Onboarded Staff Member", `${newUser.first} ${newUser.last} assigned role of ${newUser.role}`);
    showToast(`Onboarded ${newUser.first} successfully!`, "success");

    // Reset states
    setNewFirst(""); setNewLast(""); setNewEmail(""); setNewPhone(""); setNewPin(""); setNewTitle("");
    setNewFsra(""); setNewFsraExpiry(""); setNewEoCarrier(""); setNewEoPolicy(""); setNewEoExpiry("");
    setShowAddModal(false);
  };

  // Edit User load
  const loadEditUser = (user: User) => {
    setEditingUser(user);
    setEditFirst(user.first);
    setEditLast(user.last);
    setEditEmail(user.email);
    setEditPhone(user.phone || "");
    setEditRole(user.role);
    setEditPin(user.pin || "");
    setEditTitle(user.jobTitle || user.role);
    setEditFsra(user.fsraNum || "");
    setEditFsraExpiry(user.fsraExpiry || "");
    setEditEoCarrier(user.eoInsurer || "");
    setEditEoPolicy(user.eoPolicy || "");
    setEditEoExpiry(user.eoExpiry || "");
    setEditStatus(user.status);
  };

  // Submit edit
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUser: User = {
      ...editingUser,
      first: editFirst,
      last: editLast,
      email: editEmail,
      phone: editPhone,
      role: editRole,
      pin: editPin,
      jobTitle: editTitle,
      fsraNum: editFsra,
      fsraExpiry: editFsraExpiry,
      eoInsurer: editEoCarrier,
      eoPolicy: editEoPolicy,
      eoExpiry: editEoExpiry,
      status: editStatus,
      displayName: `${editFirst} ${editLast}`,
      docsStatus: editFsra ? (editingUser.docsStatus === "verified" ? "verified" : "pending") : "missing"
    };

    const updated = userRoster.map(u => u.id === editingUser.id ? updatedUser : u);
    setUserRoster(updated);
    logActivity("Edited Staff Member", `${updatedUser.first} ${updatedUser.last} updated by administrative operator.`);
    showToast(`User parameters saved for ${updatedUser.first}.`, "success");
    setEditingUser(null);
  };

  // Calculate workload per user
  const getUserWorkload = (u: User) => {
    const uId = (u.id || "").toLowerCase();
    const fullNameLower = `${u.first || ""} ${u.last || ""}`.trim().toLowerCase();

    const assignedClients = (clients || []).filter(c => {
      const owner = (c.retentionOwner || "").toLowerCase();
      const agent = (c.agent || "").toLowerCase();
      const assignedTo = ((c as any).assignedTo || "").toLowerCase();
      const assignedBroker = ((c as any).assignedBroker || "").toLowerCase();
      return (
        (uId && (owner === uId || agent === uId || assignedTo === uId || assignedBroker === uId)) ||
        (fullNameLower && (owner === fullNameLower || agent === fullNameLower || assignedTo === fullNameLower || assignedBroker === fullNameLower))
      );
    });

    const assignedTasks = (tasks || []).filter(t => {
      const owner = ((t as any).owner || (t as any).assignedTo || (t as any).agent || (t as any).assignedUser || "").toLowerCase();
      return (
        (uId && owner === uId) ||
        (fullNameLower && owner === fullNameLower)
      );
    });

    return {
      clientCount: assignedClients.length,
      taskCount: assignedTasks.length,
      totalWorkload: assignedClients.length + assignedTasks.length
    };
  };

  // Reassign Workload states & handler
  const [reassigningUserId, setReassigningUserId] = useState<string | null>(null);
  const [targetReassignId, setTargetReassignId] = useState<string>("");

  const handleReassignUserWorkload = (fromUserId: string, toUserId: string) => {
    if (!toUserId) {
      showToast("Please select an active staff member to receive the workload.", "error");
      return;
    }

    const sourceUser = userRoster.find(u => u.id === fromUserId);
    const targetUser = userRoster.find(u => u.id === toUserId);
    if (!sourceUser || !targetUser) return;

    const sourceFullName = `${sourceUser.first || ""} ${sourceUser.last || ""}`.trim() || sourceUser.displayName || sourceUser.email;
    const targetFullName = `${targetUser.first || ""} ${targetUser.last || ""}`.trim() || targetUser.displayName || targetUser.email;

    const sourceIdLower = sourceUser.id.toLowerCase();
    const sourceNameLower = sourceFullName.toLowerCase();

    const { clientCount, taskCount } = getUserWorkload(sourceUser);

    // Reassign Clients
    if (setClients) {
      setClients(prev => prev.map(c => {
        let updated = { ...c };
        let changed = false;

        const owner = (c.retentionOwner || "").toLowerCase();
        if (owner === sourceIdLower || owner === sourceNameLower) {
          updated.retentionOwner = targetFullName;
          changed = true;
        }
        const agent = (c.agent || "").toLowerCase();
        if (agent === sourceIdLower || agent === sourceNameLower) {
          updated.agent = targetFullName;
          changed = true;
        }
        if ((c as any).assignedTo) {
          const ass = ((c as any).assignedTo || "").toLowerCase();
          if (ass === sourceIdLower || ass === sourceNameLower) {
            (updated as any).assignedTo = targetFullName;
            changed = true;
          }
        }
        if ((c as any).assignedBroker) {
          const ab = ((c as any).assignedBroker || "").toLowerCase();
          if (ab === sourceIdLower || ab === sourceNameLower) {
            (updated as any).assignedBroker = targetFullName;
            changed = true;
          }
        }
        return changed ? updated : c;
      }));
    }

    // Reassign Tasks
    if (setTasks) {
      setTasks(prev => prev.map(t => {
        let updated = { ...t };
        let changed = false;

        ["owner", "assignedTo", "agent", "assignedUser"].forEach(field => {
          const val = ((t as any)[field] || "").toLowerCase();
          if (val === sourceIdLower || val === sourceNameLower) {
            (updated as any)[field] = targetFullName;
            changed = true;
          }
        });

        return changed ? updated : t;
      }));
    }

    const adminFullName = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.email || "Admin";
    logActivity("Reassigned broker staff workload", `${sourceFullName} -> ${targetFullName}`);
    showToast(`Reassigned ${clientCount} clients and ${taskCount} tasks from ${sourceFullName} to ${targetFullName}.`, "success");
    setReassigningUserId(null);
    setTargetReassignId("");
  };

  // Inline toggle / deactivate user status
  const handleToggleStatus = (u: User) => {
    if (u.id === currentUser.id) {
      showToast("You cannot deactivate your own admin account.", "error");
      return;
    }

    const nextStatus = u.status === "active" ? "inactive" : "active";
    const updatedUser = { ...u, status: nextStatus as "active" | "inactive" };
    const updated = userRoster.map(r => r.id === u.id ? updatedUser : r);
    setUserRoster(updated);

    const userFullName = `${u.first || ""} ${u.last || ""}`.trim() || u.email;

    if (nextStatus === "inactive") {
      logActivity("Deactivated broker staff account", `Deactivated account for ${userFullName}`);
      showToast(`${userFullName} was marked inactive.`, "success");
    } else {
      logActivity("Activated broker staff account", `Reactivated account for ${userFullName}`);
      showToast(`${userFullName} was marked active.`, "success");
    }
  };

  // Force random PIN reset
  const handleResetPin = (u: User) => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const updatedUser = { ...u, pin: randomPin };
    const updated = userRoster.map(r => r.id === u.id ? updatedUser : r);
    setUserRoster(updated);
    logActivity("Admin PIN Reset Triggered", `Generated random security PIN entry for broker ${u.first} ${u.last}`);
    showToast(`New security PIN for ${u.first} is: ${randomPin}`, "success");
  };

  // Compliance Doc Verify approval
  const handleVerifyDocs = (u: User, approve: boolean) => {
    const updatedUser = { ...u, docsStatus: approve ? "verified" : "missing" };
    const updated = userRoster.map(r => r.id === u.id ? updatedUser : r);
    setUserRoster(updated);
    logActivity(
      approve ? "Approved Broker ID" : "Rejected Broker ID",
      `${u.first} ${u.last} compliance credentials state updated to ${updatedUser.docsStatus}`
    );
    showToast(approve ? "Documents marked verified" : "Documents rejected", "success");
    setReviewingUser(null);
  };

  // Delete User handler
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleDeleteUser = (userId: string) => {
    const targetUser = userRoster.find(u => u.id === userId);
    if (!targetUser) return;

    const targetFullName = `${targetUser.first || ""} ${targetUser.last || ""}`.trim() || targetUser.displayName || targetUser.email || "Staff Member";

    // Prevent self deletion
    if (targetUser.id === currentUser.id) {
      showToast("You cannot delete your own admin account.", "error");
      setDeletingUserId(null);
      return;
    }

    // Prevent deleting last privileged admin
    const privilegedAdmins = userRoster.filter(u => ["Developer/Admin", "Admin"].includes(u.role));
    if (["Developer/Admin", "Admin"].includes(targetUser.role) && privilegedAdmins.length <= 1) {
      showToast("At least one privileged admin account must remain active.", "error");
      setDeletingUserId(null);
      return;
    }

    // Workload safety check
    const { clientCount, taskCount } = getUserWorkload(targetUser);
    if (clientCount > 0 || taskCount > 0) {
      showToast("Reassign this staff member’s active workload before deleting the account.", "error");
      return;
    }

    setUserRoster(prev => prev.filter(u => u.id !== userId));

    logActivity("Deleted broker staff account", `Removed account ${targetFullName} (${targetUser.email}) from system roster.`);
    showToast(`${targetFullName} was removed from the broker staff roster.`, "success");
    setDeletingUserId(null);
  };

  return (
    <div className="space-y-6" id="user-management-panel">
      
      {/* Search and Filters Header bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-2.5 py-1.5 flex items-center gap-2 w-full sm:w-64 focus-within:border-[var(--color-accent)]/30 transition-all">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
            <input 
              type="text" 
              placeholder="Search by name, email, role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] outline-none w-full"
            />
          </div>

          {/* Role Filter */}
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 text-xs text-[var(--color-text)] px-2.5 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-[var(--color-surface-3)] transition-all"
          >
            <option value="all">All Roles</option>
            <option value="Developer/Admin">Developer/Admin</option>
            <option value="Admin">Admin</option>
            <option value="Broker">Broker</option>
          </select>

          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 text-xs text-[var(--color-text)] px-2.5 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-[var(--color-surface-3)] transition-all"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Onboard recruiting button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-4 py-2 rounded-lg flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" /> Onboard Broker Staff
        </button>
      </div>

      {/* Roster Main Table grid layout */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-x-auto shadow-md" id="roster-table-container">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--color-border)]/50 bg-[var(--color-surface-2)] text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-wider select-none">
              <th className="px-5 py-3">Broker Profile</th>
              <th className="px-5 py-3">System Access Role</th>
              <th className="px-5 py-3">Compliance Documents</th>
              <th className="px-5 py-3">Roster Load Status</th>
              <th className="px-5 py-3">Account Security PIN</th>
              <th className="px-5 py-3 text-right">Administrative Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]/40 text-xs">
            {filteredRoster.map((user) => {
              const { clientCount, taskCount, totalWorkload } = getUserWorkload(user);
              const hasDocs = user.fsraNum || user.eoInsurer;
              const isSelf = user.id === currentUser.id;

              return (
                <tr key={user.id} className="hover:bg-[var(--color-surface-2)]/25 transition-all">
                  
                  {/* Avatar & Profile */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.photo ? (
                        <img 
                          src={user.photo} 
                          alt={user.first} 
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-[var(--color-accent)]/40" 
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] uppercase">
                          {user.first[0]}{user.last[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                          {user.first} {user.last}
                          {isSelf && (
                            <span className="text-[8px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-mono px-1.5 py-0.5 rounded uppercase border border-[var(--color-accent)]/25">
                              You
                            </span>
                          )}
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            user.status === "active" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                            {user.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--color-text-faint)] leading-normal font-semibold">
                          {user.jobTitle || user.role} • {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Access Role */}
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                      user.role === "Developer/Admin" || user.role === "Admin"
                        ? "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error)]/20"
                        : "bg-[var(--color-info)]/15 text-[var(--color-info)] border-[var(--color-info)]/20"
                    }`}>
                      {user.role}
                    </span>
                  </td>

                  {/* Compliance documents ID status */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {hasDocs ? (
                        <button
                          onClick={() => setReviewingUser(user)}
                          className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            user.docsStatus === "verified"
                              ? "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]/20"
                              : "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/20"
                          }`}
                        >
                          <Eye className="w-3 h-3" /> 
                          {user.docsStatus === "verified" ? "Verified" : "Pending Verification"}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error)]/20">
                          <ShieldAlert className="w-3 h-3 animate-pulse" /> Missing Uploads
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Client roster load status */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--color-text)]">
                        {clientCount} Clients • {taskCount} Tasks
                      </span>
                      {totalWorkload > 0 ? (
                        <span className="text-[10px] text-amber-500 font-semibold mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Reassign needed before deletion
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                          Clear (No active workload)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Account PIN */}
                  <td className="px-5 py-4 font-mono text-[11px] text-[var(--color-accent)] font-black">
                    •••• <span className="text-[var(--color-text-faint)] text-[10px] ml-1">({user.pin ? "Defined" : "Not Set"})</span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    {["Developer/Admin", "Admin"].includes(currentUser.role) || currentUser.isOwner ? (
                      deletingUserId === user.id ? (
                        totalWorkload > 0 ? (
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-left max-w-xs ml-auto">
                            <p className="text-[10px] text-red-400 font-semibold mb-1">
                              Active workload remaining ({clientCount} clients, {taskCount} tasks). Reassign workload first!
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setDeletingUserId(null);
                                  setReassigningUserId(user.id);
                                  setTargetReassignId("");
                                }}
                                className="px-2 py-1 text-[9px] font-bold uppercase rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-all cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" /> Reassign Workload
                              </button>
                              <button
                                onClick={() => setDeletingUserId(null)}
                                className="px-2 py-1 text-[9px] font-bold uppercase rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 p-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer shadow-sm"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeletingUserId(null)}
                              className="px-2.5 py-1 text-[9px] font-bold uppercase rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Deactivate / Activate Button */}
                          <button
                            onClick={() => handleToggleStatus(user)}
                            title={user.status === "active" ? "Deactivate User" : "Activate User"}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                              user.status === "active"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                            }`}
                          >
                            {user.status === "active" ? (
                              <>
                                <UserX className="w-3.5 h-3.5" /> Deactivate
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Activate
                              </>
                            )}
                          </button>

                          {/* Reassign Workload Button */}
                          <button
                            onClick={() => {
                              setReassigningUserId(user.id);
                              setTargetReassignId("");
                            }}
                            title="Reassign Workload"
                            className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Reassign
                          </button>

                          {/* Reset Pin */}
                          <button
                            onClick={() => handleResetPin(user)}
                            title="Generate Random Pin Tokens"
                            className="p-1.5 hover:bg-[var(--color-surface-2)] rounded-lg border border-transparent hover:border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-accent)] transition-all cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => loadEditUser(user)}
                            title="Edit Broker Fields"
                            className="p-1.5 hover:bg-[var(--color-surface-2)] rounded-lg border border-transparent hover:border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => setDeletingUserId(user.id)}
                            title="Delete Broker Staff Account"
                            className="p-1.5 hover:bg-red-500/20 rounded-lg border border-transparent hover:border-red-500/30 text-[var(--color-text-faint)] hover:text-red-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-[10px] text-[var(--color-text-faint)] italic">Read-only view</span>
                    )}
                  </td>

                </tr>
              );
            })}

            {filteredRoster.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[var(--color-text-faint)]">
                  <Users className="w-10 h-10 mx-auto mb-2 stroke-1" />
                  <p className="italic">No brokers matched the search parameters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── ONBOARD RECRUIT MODAL ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden text-left" id="onboard-modal-form">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Onboard New Broker Staff Member</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleOnboardUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">First Name</label>
                  <input 
                    type="text" 
                    required
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    placeholder="David"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Last Name</label>
                  <input 
                    type="text" 
                    required
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    placeholder="Acosta"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="vdacosta@gbkfinancial.ca"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Phone Number</label>
                  <input 
                    type="text" 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(705) 555-0100"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Role Group</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as User["role"])}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                  >
                    <option value="Broker">Broker</option>
                    <option value="Admin">Admin</option>
                    <option value="Developer/Admin">Developer/Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Security PIN (4 digits)</label>
                  <input 
                    type="password" 
                    required
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="1234"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30 font-mono tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Job Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Mortgage Underwriter"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                  />
                </div>
              </div>

              {/* Compliance documents credentials subheaders */}
              <div className="border-t border-[var(--color-border)]/50 pt-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)] mb-3">Ontario Compliance Registrations</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">FSRA Licence Number</label>
                    <input 
                      type="text" 
                      value={newFsra}
                      onChange={(e) => setNewFsra(e.target.value)}
                      placeholder="M1900XXXX"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Licence Expiry Date</label>
                    <input 
                      type="date" 
                      value={newFsraExpiry}
                      onChange={(e) => setNewFsraExpiry(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">E&amp;O Insurer</label>
                    <input 
                      type="text" 
                      value={newEoCarrier}
                      onChange={(e) => setNewEoCarrier(e.target.value)}
                      placeholder="Trisura"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">E&amp;O Policy Number</label>
                    <input 
                      type="text" 
                      value={newEoPolicy}
                      onChange={(e) => setNewEoPolicy(e.target.value)}
                      placeholder="EO-88992-XX"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Policy Expiry</label>
                    <input 
                      type="date" 
                      value={newEoExpiry}
                      onChange={(e) => setNewEoExpiry(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface-3)] border border-[var(--color-border)]/50 p-3.5 rounded-lg text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                🚨 <span className="text-[var(--color-text)] font-bold">Onboarding Consent:</span> Newly created staff credentials must be shared with the broker directly. PIN codes are stored in local secure memory nodes.
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--color-border)]/50 pt-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[var(--color-border)]/50 rounded-lg text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-black uppercase px-5 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Commit Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT USER MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden text-left" id="edit-user-modal">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[var(--color-info)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Modify Broker Credentials: {editingUser.first} {editingUser.last}</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">First Name</label>
                  <input 
                    type="text" 
                    required
                    value={editFirst}
                    onChange={(e) => setEditFirst(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Last Name</label>
                  <input 
                    type="text" 
                    required
                    value={editLast}
                    onChange={(e) => setEditLast(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Phone Number</label>
                  <input 
                    type="text" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Role Group</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as User["role"])}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                  >
                    <option value="Broker">Broker</option>
                    <option value="Admin">Admin</option>
                    <option value="Developer/Admin">Developer/Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Security PIN (4 digits)</label>
                  <input 
                    type="password" 
                    required
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30 font-mono tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Job Title</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">System Status Flag</label>
                <div className="flex items-center gap-4 bg-[var(--color-surface-2)] p-2 rounded-lg border border-[var(--color-border)]/50">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                    <input 
                      type="radio" 
                      name="status"
                      checked={editStatus === "active"}
                      onChange={() => setEditStatus("active")}
                      className="text-[var(--color-info)]"
                    />
                    <span>Active Broker Node</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                    <input 
                      type="radio" 
                      name="status"
                      checked={editStatus === "inactive"}
                      onChange={() => setEditStatus("inactive")}
                      className="text-red-500"
                    />
                    <span className="text-red-400 font-bold">Inactive / Suspended</span>
                  </label>
                </div>
              </div>

              {/* Compliance documents credentials subheaders */}
              <div className="border-t border-[var(--color-border)]/50 pt-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-info)] mb-3">Ontario Compliance Registrations</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">FSRA Licence Number</label>
                    <input 
                      type="text" 
                      value={editFsra}
                      onChange={(e) => setEditFsra(e.target.value)}
                      placeholder="M1900XXXX"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Licence Expiry Date</label>
                    <input 
                      type="date" 
                      value={editFsraExpiry}
                      onChange={(e) => setEditFsraExpiry(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">E&amp;O Insurer</label>
                    <input 
                      type="text" 
                      value={editEoCarrier}
                      onChange={(e) => setEditEoCarrier(e.target.value)}
                      placeholder="Trisura"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">E&amp;O Policy Number</label>
                    <input 
                      type="text" 
                      value={editEoPolicy}
                      onChange={(e) => setEditEoPolicy(e.target.value)}
                      placeholder="EO-88992-XX"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-info)]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Policy Expiry</label>
                    <input 
                      type="date" 
                      value={editEoExpiry}
                      onChange={(e) => setEditEoExpiry(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--color-border)]/50 pt-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-[var(--color-border)]/50 rounded-lg text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[var(--color-info)] hover:bg-[var(--color-info)]/80 text-[var(--color-text-inverse)] text-xs font-black uppercase px-5 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── COMPLIANCE ID REVIEW POPUP ─── */}
      {reviewingUser && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-left" id="review-modal">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Verify Broker Registrations: {reviewingUser.first}</h3>
              </div>
              <button onClick={() => setReviewingUser(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Document Info Cards */}
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 p-4 rounded-xl space-y-3.5">
                <div className="flex gap-2.5">
                  <FileText className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
                  <div>
                    <p className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-wider">FSRA Licencing Dossier</p>
                    <p className="text-xs font-bold text-[var(--color-text)] mt-0.5">Licence No: {reviewingUser.fsraNum || "Not Entered"}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Expiry: {reviewingUser.fsraExpiry || "None"}</p>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)]/50 pt-3.5 flex gap-2.5">
                  <Shield className="w-5 h-5 text-[var(--color-info)] shrink-0" />
                  <div>
                    <p className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-wider">Errors &amp; Omissions Liability Policy</p>
                    <p className="text-xs font-bold text-[var(--color-text)] mt-0.5">Insurer: {reviewingUser.eoInsurer || "Not Entered"}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Policy: {reviewingUser.eoPolicy || "None"}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Expiry: {reviewingUser.eoExpiry || "None"}</p>
                  </div>
                </div>
              </div>

              {/* Simulated ID Attachment View */}
              <div className="bg-[var(--color-surface-3)] border border-[var(--color-border)]/50 rounded-xl h-44 flex flex-col items-center justify-center text-center p-4">
                <FileCheck className="w-8 h-8 text-[var(--color-accent)] mb-2 animate-bounce" />
                <span className="text-xs font-bold text-[var(--color-text)]/80 uppercase">FSRA_LICENCE_PROOF_M19.PDF</span>
                <span className="text-[10px] text-[var(--color-text-faint)] font-semibold mt-1">Uploaded securely on {reviewingUser.created}</span>
                <button 
                  onClick={() => showToast("Opening simulated secure PDF attachment...", "success")}
                  className="text-[9px] text-[var(--color-accent)] font-black uppercase mt-3 tracking-widest hover:underline cursor-pointer"
                >
                  View Original Dossier Document
                </button>
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--color-border)]/50 pt-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => handleVerifyDocs(reviewingUser, false)}
                  className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer"
                >
                  Reject &amp; Force Re-upload
                </button>
                <button 
                  type="button" 
                  onClick={() => handleVerifyDocs(reviewingUser, true)}
                  className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer"
                >
                  Approve Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── REASSIGN WORKLOAD MODAL ─── */}
      {reassigningUserId && (() => {
        const sourceUser = userRoster.find(u => u.id === reassigningUserId);
        if (!sourceUser) return null;

        const { clientCount, taskCount } = getUserWorkload(sourceUser);
        const eligibleTargets = userRoster.filter(u => u.id !== sourceUser.id && u.status !== "inactive");

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
              <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--color-accent)]" />
                  <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">
                    Reassign Staff Workload
                  </h3>
                </div>
                <button 
                  onClick={() => { setReassigningUserId(null); setTargetReassignId(""); }} 
                  className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-[var(--color-text)]">
                      {sourceUser.first} {sourceUser.last}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-faint)]">
                      {sourceUser.role} • {sourceUser.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-xs text-[var(--color-accent)]">
                      {clientCount} Clients • {taskCount} Tasks
                    </div>
                    <div className="text-[10px] text-[var(--color-text-faint)] uppercase font-semibold">
                      Active Workload
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">
                    Select Target Staff Member
                  </label>
                  {eligibleTargets.length > 0 ? (
                    <select
                      value={targetReassignId}
                      onChange={(e) => setTargetReassignId(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] cursor-pointer"
                    >
                      <option value="">-- Choose Active Staff Member --</option>
                      {eligibleTargets.map(target => (
                        <option key={target.id} value={target.id}>
                          {target.first} {target.last} ({target.role}) - {target.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-500 font-semibold p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      No active staff member is available for reassignment. Please activate or onboard a team member first.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]/50">
                  <button
                    type="button"
                    onClick={() => { setReassigningUserId(null); setTargetReassignId(""); }}
                    className="px-4 py-2 text-xs font-bold uppercase rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!targetReassignId || eligibleTargets.length === 0}
                    onClick={() => handleReassignUserWorkload(sourceUser.id, targetReassignId)}
                    className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Confirm Reassignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
