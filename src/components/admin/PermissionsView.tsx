import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, Shield, Users, Layers, LayoutGrid, CheckSquare, 
  Settings, Key, AlertTriangle, AlertCircle, Sparkles, Check, X,
  Search, Filter, Download, FileText, History, Info, RotateCcw,
  Zap, Eye, Edit3, ShieldAlert, ChevronDown, CheckCircle2
} from "lucide-react";
import { User } from "../../types";
import { generatePermissionsPDF, exportPermissionsCSV } from "../../lib/rosterPdfGenerator";

interface PermissionsViewProps {
  userRoster: User[];
  setUserRoster: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  logActivity: (action: string, details: string) => void;
}

export type PermissionLevel = "manage" | "edit" | "view" | "none";

export interface CRMModule {
  key: string;
  name: string;
  category: string;
  description: string;
  sensitive?: boolean;
}

export interface PermissionChangeLog {
  id: string;
  timestamp: string;
  actor: string;
  targetUser: string;
  module: string;
  oldLevel: PermissionLevel;
  newLevel: PermissionLevel;
}

export const crmModulesList: CRMModule[] = [
  { key: "dashboard", name: "Operations Dashboard", category: "Core", description: "Brokerage parameters, messages, and task summaries." },
  { key: "clients", name: "Client Database & SIN", category: "Core", description: "Borrower records, credit scores, and financial data." },
  { key: "pipeline", name: "Underwriting Pipeline", category: "Core", description: "Mortgage stages from lead to final funded milestone." },
  { key: "tasks", name: "Task & Compliance Desk", category: "Operations", description: "Task delegation, reminders, and conditions tracking." },
  { key: "messages", name: "Team Chat & Channels", category: "Communication", description: "Internal group chats, direct messaging, and announcements." },
  { key: "email", name: "Connected Email Hub", category: "Communication", description: "Client commitment templates and IMAP synchronization." },
  { key: "calendar", name: "Events & Renewal Timeline", category: "Operations", description: "Meetings, loan maturity dates, and team calendar." },
  { key: "documents", name: "Secure Document Vault", category: "Core", description: "Legal checklists, identity proof, and tax stubs." },
  { key: "reports", name: "Analytics & KPI Audits", category: "Analytics", description: "Conversion metrics, lender share, and performance logs." },
  { key: "ai_intake", name: "AI Document Reading", category: "AI Tools", description: "Gemini AI document parsing and OCR ingestion." },
  { key: "admin_control", name: "Admin Control Center", category: "System", description: "System oversight, recruitment, and security policies.", sensitive: true },
  { key: "export_data", name: "Data Export Suite", category: "System", description: "Export CSV/PDF reports and client databases.", sensitive: true }
];

// Default permission levels per user role
export const roleDefaultMatrix: Record<string, Record<string, PermissionLevel>> = {
  "Developer/Admin": {
    dashboard: "manage", clients: "manage", pipeline: "manage", tasks: "manage",
    messages: "manage", email: "manage", calendar: "manage", documents: "manage",
    reports: "manage", ai_intake: "manage", admin_control: "manage", export_data: "manage"
  },
  "Admin": {
    dashboard: "manage", clients: "manage", pipeline: "manage", tasks: "manage",
    messages: "manage", email: "manage", calendar: "manage", documents: "manage",
    reports: "manage", ai_intake: "manage", admin_control: "manage", export_data: "manage"
  },
  "Broker": {
    dashboard: "view", clients: "manage", pipeline: "manage", tasks: "manage",
    messages: "edit", email: "edit", calendar: "edit", documents: "manage",
    reports: "view", ai_intake: "edit", admin_control: "none", export_data: "none"
  },
  "Agent": {
    dashboard: "view", clients: "edit", pipeline: "edit", tasks: "edit",
    messages: "edit", email: "edit", calendar: "edit", documents: "view",
    reports: "none", ai_intake: "view", admin_control: "none", export_data: "none"
  }
};

export const permissionTemplates: { name: string; label: string; level: number; matrix: Record<string, PermissionLevel> }[] = [
  {
    name: "view_only",
    label: "Level 1 - View Only",
    level: 1,
    matrix: {
      dashboard: "view", clients: "view", pipeline: "view", tasks: "view",
      messages: "view", email: "view", calendar: "view", documents: "view",
      reports: "view", ai_intake: "view", admin_control: "none", export_data: "none"
    }
  },
  {
    name: "basic_agent",
    label: "Level 2 - Basic Agent",
    level: 2,
    matrix: {
      dashboard: "view", clients: "edit", pipeline: "edit", tasks: "edit",
      messages: "edit", email: "edit", calendar: "edit", documents: "view",
      reports: "none", ai_intake: "view", admin_control: "none", export_data: "none"
    }
  },
  {
    name: "power_broker",
    label: "Level 3 - Power Broker",
    level: 3,
    matrix: {
      dashboard: "view", clients: "manage", pipeline: "manage", tasks: "manage",
      messages: "edit", email: "edit", calendar: "edit", documents: "manage",
      reports: "view", ai_intake: "edit", admin_control: "none", export_data: "none"
    }
  },
  {
    name: "dept_manager",
    label: "Level 4 - Department Manager",
    level: 4,
    matrix: {
      dashboard: "manage", clients: "manage", pipeline: "manage", tasks: "manage",
      messages: "manage", email: "manage", calendar: "manage", documents: "manage",
      reports: "manage", ai_intake: "manage", admin_control: "view", export_data: "manage"
    }
  },
  {
    name: "full_admin",
    label: "Level 5 - Full Admin",
    level: 5,
    matrix: {
      dashboard: "manage", clients: "manage", pipeline: "manage", tasks: "manage",
      messages: "manage", email: "manage", calendar: "manage", documents: "manage",
      reports: "manage", ai_intake: "manage", admin_control: "manage", export_data: "manage"
    }
  }
];

export const PermissionsView: React.FC<PermissionsViewProps> = ({
  userRoster,
  setUserRoster,
  currentUser,
  showToast,
  logActivity
}) => {
  // State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [permLevelFilter, setPermLevelFilter] = useState<string>("all");
  const [moduleAccessFilter, setModuleAccessFilter] = useState<string>("all");
  const [moduleAccessRequirement, setModuleAccessRequirement] = useState<string>("any");
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showWarningDetails, setShowWarningDetails] = useState(false);
  const [changeLogs, setChangeLogs] = useState<PermissionChangeLog[]>([
    {
      id: "log_1",
      timestamp: "Today, 11:20 AM",
      actor: `${currentUser.first} ${currentUser.last}`,
      targetUser: "Wayne MacLeod",
      module: "Underwriting Pipeline",
      oldLevel: "edit",
      newLevel: "manage"
    },
    {
      id: "log_2",
      timestamp: "Yesterday, 4:15 PM",
      actor: `${currentUser.first} ${currentUser.last}`,
      targetUser: "Jeff Brown",
      module: "Admin Control Center",
      oldLevel: "manage",
      newLevel: "none"
    }
  ]);

  // Utility to determine effective permission level for a user on a module
  const getUserPermission = (user: User, moduleKey: string): PermissionLevel => {
    // 1. Check custom overrides in permOverrides or modulePermissions
    const customPerms = (user as any).modulePermissions || user.permOverrides || {};
    if (customPerms[moduleKey] !== undefined) {
      const val = customPerms[moduleKey];
      if (typeof val === "boolean") {
        return val ? "manage" : "none";
      }
      return val as PermissionLevel;
    }
    // 2. Check role default matrix
    const roleMatrix = roleDefaultMatrix[user.role] || roleDefaultMatrix["Broker"];
    return roleMatrix[moduleKey] || "none";
  };

  // Set permission level for a user & module
  const setPermissionForUser = (user: User, moduleKey: string, newLevel: PermissionLevel) => {
    // Safety check: Cannot revoke your own master admin_control
    if (user.id === currentUser.id && moduleKey === "admin_control" && newLevel === "none") {
      showToast("Compliance Rule: You cannot revoke Admin Control access from your own account.", "error");
      return;
    }

    const currentLevel = getUserPermission(user, moduleKey);
    if (currentLevel === newLevel) return;

    const currentPerms = { ...((user as any).modulePermissions || user.permOverrides || {}) };
    currentPerms[moduleKey] = newLevel;

    const updatedUser = { 
      ...user, 
      modulePermissions: currentPerms,
      permOverrides: currentPerms
    };

    setUserRoster(prev => prev.map(u => u.id === user.id ? updatedUser : u));

    // Log history
    const moduleObj = crmModulesList.find(m => m.key === moduleKey);
    const newLog: PermissionChangeLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
      actor: `${currentUser.first} ${currentUser.last}`,
      targetUser: `${user.first} ${user.last}`,
      module: moduleObj?.name || moduleKey,
      oldLevel: currentLevel,
      newLevel
    };

    setChangeLogs(prev => [newLog, ...prev]);
    logActivity("Permission Level Updated", `${user.first} ${user.last} - ${moduleObj?.name}: ${currentLevel.toUpperCase()} → ${newLevel.toUpperCase()}`);
    showToast(`Updated access for ${user.first} (${moduleObj?.name} set to ${newLevel.toUpperCase()})`, "success");
  };

  // Cycle permission level: none -> view -> edit -> manage -> none
  const cyclePermissionLevel = (user: User, moduleKey: string) => {
    const current = getUserPermission(user, moduleKey);
    let next: PermissionLevel = "none";
    if (current === "none") next = "view";
    else if (current === "view") next = "edit";
    else if (current === "edit") next = "manage";
    else if (current === "manage") next = "none";
    setPermissionForUser(user, moduleKey, next);
  };

  // Calculate overprivileged users
  const overprivilegedUsers = useMemo(() => {
    return userRoster.filter(u => {
      // Non-admin roles with manage/edit on admin_control or export_data
      const isAdmin = u.role === "Admin" || u.role === "Developer/Admin";
      if (!isAdmin) {
        const adminControl = getUserPermission(u, "admin_control");
        const exportData = getUserPermission(u, "export_data");
        if (adminControl === "manage" || adminControl === "edit" || exportData === "manage") {
          return true;
        }
      }
      return false;
    });
  }, [userRoster]);

  // Bulk apply template
  const handleBulkApplyTemplate = (templateName: string) => {
    if (selectedUserIds.length === 0) return;
    const template = permissionTemplates.find(t => t.name === templateName);
    if (!template) return;

    let updatedCount = 0;
    const updatedRoster = userRoster.map(u => {
      if (selectedUserIds.includes(u.id)) {
        // Prevent revoking admin's own admin_control
        const newPerms = { ...template.matrix };
        if (u.id === currentUser.id) {
          newPerms.admin_control = "manage";
        }
        updatedCount++;
        return {
          ...u,
          clearanceLevel: template.level,
          modulePermissions: newPerms,
          permOverrides: newPerms
        };
      }
      return u;
    });

    setUserRoster(updatedRoster);
    logActivity("Bulk Permissions Updated", `Applied '${template.label}' template to ${updatedCount} users.`);
    showToast(`Applied ${template.label} to ${updatedCount} user(s).`, "success");
  };

  // Bulk set single module permission
  const handleBulkSetModule = (moduleKey: string, level: PermissionLevel) => {
    if (selectedUserIds.length === 0) return;
    const moduleObj = crmModulesList.find(m => m.key === moduleKey);

    let count = 0;
    const updatedRoster = userRoster.map(u => {
      if (selectedUserIds.includes(u.id)) {
        if (u.id === currentUser.id && moduleKey === "admin_control" && level === "none") {
          return u;
        }
        count++;
        const currentPerms = { ...((u as any).modulePermissions || u.permOverrides || {}) };
        currentPerms[moduleKey] = level;
        return {
          ...u,
          modulePermissions: currentPerms,
          permOverrides: currentPerms
        };
      }
      return u;
    });

    setUserRoster(updatedRoster);
    logActivity("Bulk Module Permission Set", `Set ${moduleObj?.name || moduleKey} to ${level.toUpperCase()} for ${count} users.`);
    showToast(`Set ${moduleObj?.name} access to ${level.toUpperCase()} for ${count} user(s).`, "success");
  };

  // Fix overprivileged users automatically
  const handleFixOverprivileged = () => {
    const updatedRoster = userRoster.map(u => {
      const isAdmin = u.role === "Admin" || u.role === "Developer/Admin";
      if (!isAdmin) {
        const perms = { ...((u as any).modulePermissions || u.permOverrides || {}) };
        perms.admin_control = "none";
        perms.export_data = "none";
        return { ...u, modulePermissions: perms, permOverrides: perms };
      }
      return u;
    });

    setUserRoster(updatedRoster);
    logActivity("Security Remediation", "Automatically revoked Admin Control and Export Data rights from non-admin accounts.");
    showToast("Successfully corrected overprivileged user permissions.", "success");
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return userRoster.filter(user => {
      // Search
      const name = `${user.first || ""} ${user.last || ""} ${user.email || ""}`.toLowerCase();
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Role filter
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }
      // Permission level filter
      if (permLevelFilter !== "all") {
        const hasManage = crmModulesList.some(m => getUserPermission(user, m.key) === "manage");
        const hasEdit = crmModulesList.some(m => getUserPermission(user, m.key) === "edit");
        const allViewOrNone = crmModulesList.every(m => getUserPermission(user, m.key) === "view" || getUserPermission(user, m.key) === "none");
        
        if (permLevelFilter === "manage" && !hasManage) return false;
        if (permLevelFilter === "edit" && !hasEdit) return false;
        if (permLevelFilter === "view_only" && !allViewOrNone) return false;
      }
      // Module Access filter
      if (moduleAccessFilter !== "all") {
        const perm = getUserPermission(user, moduleAccessFilter);
        if (moduleAccessRequirement === "manage" && perm !== "manage") return false;
        if (moduleAccessRequirement === "edit_manage" && (perm !== "edit" && perm !== "manage")) return false;
        if (moduleAccessRequirement === "any" && perm === "none") return false;
      }

      return true;
    });
  }, [userRoster, searchQuery, roleFilter, permLevelFilter, moduleAccessFilter, moduleAccessRequirement]);

  // Handle select all users
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  // Toggle single user select
  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Style helper for permission badges
  const getBadgeStyle = (level: PermissionLevel) => {
    switch (level) {
      case "manage":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25";
      case "edit":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25";
      case "view":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25";
      case "none":
        return "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20";
    }
  };

  return (
    <div className="space-y-6" id="permissions-manager">
      
      {/* Header & Warning Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-base font-extrabold text-[var(--color-text)]">Visual Role & Module Permissions Matrix</h3>
          </div>
          <p className="text-xs text-[var(--color-text-faint)] mt-1">
            Configure fine-grained module permissions (<span className="text-emerald-400 font-bold">MANAGE</span>, <span className="text-amber-400 font-bold">EDIT</span>, <span className="text-blue-400 font-bold">VIEW</span>, <span className="text-red-400 font-bold">NONE</span>) across all team members.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* History Log Toggle */}
          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 hover:bg-[var(--color-surface-2)]/80 text-xs font-bold text-[var(--color-text)] rounded-lg transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Audit History ({changeLogs.length})</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-accent)] text-black font-extrabold text-xs rounded-lg hover:bg-[var(--color-accent)]/90 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
              <button
                onClick={() => {
                  generatePermissionsPDF(userRoster, crmModulesList, getUserPermission);
                  showToast("Permissions PDF report generated.", "success");
                }}
                className="w-full text-left px-3 py-2 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center gap-2 cursor-pointer font-semibold"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>Export as PDF</span>
              </button>
              <button
                onClick={() => {
                  exportPermissionsCSV(userRoster, crmModulesList, getUserPermission);
                  showToast("Permissions CSV exported.", "success");
                }}
                className="w-full text-left px-3 py-2 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export as CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning System for Overprivileged Users */}
      {overprivilegedUsers.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-2">
                Compliance Warning: {overprivilegedUsers.length} Overprivileged Account(s) Detected
              </h4>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                Staff members with Broker/Agent roles currently hold elevated access rights (<span className="text-red-300 font-mono">Admin Control</span> or <span className="text-red-300 font-mono">Data Export</span>).
              </p>
              
              {showWarningDetails && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {overprivilegedUsers.map(u => (
                    <span key={u.id} className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md font-bold">
                      {u.first} {u.last} ({u.role})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowWarningDetails(!showWarningDetails)}
              className="px-2.5 py-1.5 text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 font-bold transition-all cursor-pointer"
            >
              {showWarningDetails ? "Hide List" : "Inspect List"}
            </button>
            <button
              onClick={handleFixOverprivileged}
              className="px-3 py-1.5 text-[10px] bg-red-500 text-white font-extrabold uppercase tracking-wider rounded-lg hover:bg-red-600 transition-all shadow cursor-pointer flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>Enforce Role Boundaries</span>
            </button>
          </div>
        </div>
      )}

      {/* Audit History Drawer */}
      {showLogDrawer && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Permission Modification Audit History</h4>
            </div>
            <button
              onClick={() => setShowLogDrawer(false)}
              className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[var(--color-border)]/40 pr-1">
            {changeLogs.length === 0 ? (
              <p className="text-xs text-[var(--color-text-faint)] italic py-3 text-center">No permission changes logged yet.</p>
            ) : (
              changeLogs.map(log => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs gap-4">
                  <div>
                    <span className="font-bold text-[var(--color-text)]">{log.targetUser}</span>
                    <span className="text-[var(--color-text-faint)]"> • {log.module}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono uppercase bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded text-[var(--color-text-faint)]">
                        {log.oldLevel} → <span className="text-[var(--color-accent)] font-bold">{log.newLevel}</span>
                      </span>
                      <span className="text-[10px] text-[var(--color-text-faint)]">Modified by {log.actor}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-faint)] shrink-0">{log.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--color-text-faint)]" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--color-text-faint)] shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="Developer/Admin">Developer / Admin</option>
              <option value="Admin">Admin</option>
              <option value="Broker">Broker</option>
              <option value="Agent">Agent</option>
            </select>
          </div>

          {/* Permission Filter */}
          <div>
            <select
              value={permLevelFilter}
              onChange={(e) => setPermLevelFilter(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
            >
              <option value="all">Filter Permission Rights</option>
              <option value="manage">Has MANAGE Rights</option>
              <option value="edit">Has EDIT Rights</option>
              <option value="view_only">View Only / Restricted</option>
            </select>
          </div>

          {/* Module Access Feature */}
          <div className="flex items-center gap-1.5">
            <select
              value={moduleAccessFilter}
              onChange={(e) => setModuleAccessFilter(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
            >
              <option value="all">Find Access to Module...</option>
              {crmModulesList.map(m => (
                <option key={m.key} value={m.key}>{m.name}</option>
              ))}
            </select>

            {moduleAccessFilter !== "all" && (
              <select
                value={moduleAccessRequirement}
                onChange={(e) => setModuleAccessRequirement(e.target.value)}
                className="w-32 bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer font-semibold"
              >
                <option value="any">Any Level</option>
                <option value="edit_manage">Edit/Manage</option>
                <option value="manage">Manage Only</option>
              </select>
            )}
          </div>

        </div>

        {/* Bulk Actions Toolbar (Appears when 1+ users selected) */}
        {selectedUserIds.length > 0 && (
          <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-bold text-[var(--color-accent)]">
                {selectedUserIds.length} User(s) Selected for Bulk Update
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Apply Preset Template */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkApplyTemplate(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer font-bold"
              >
                <option value="">Apply Clearance Template...</option>
                {permissionTemplates.map(t => (
                  <option key={t.name} value={t.name}>{t.label}</option>
                ))}
              </select>

              {/* Set Single Module */}
              <div className="flex items-center gap-1">
                <select
                  id="bulk-module-select"
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                >
                  <option value="">Select Module...</option>
                  {crmModulesList.map(m => (
                    <option key={m.key} value={m.key}>{m.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const sel = (document.getElementById("bulk-module-select") as HTMLSelectElement)?.value;
                    if (sel) handleBulkSetModule(sel, "manage");
                  }}
                  className="px-2 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase rounded hover:bg-emerald-500/30 cursor-pointer"
                >
                  Set Manage
                </button>
                <button
                  onClick={() => {
                    const sel = (document.getElementById("bulk-module-select") as HTMLSelectElement)?.value;
                    if (sel) handleBulkSetModule(sel, "edit");
                  }}
                  className="px-2 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase rounded hover:bg-amber-500/30 cursor-pointer"
                >
                  Set Edit
                </button>
                <button
                  onClick={() => {
                    const sel = (document.getElementById("bulk-module-select") as HTMLSelectElement)?.value;
                    if (sel) handleBulkSetModule(sel, "view");
                  }}
                  className="px-2 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold uppercase rounded hover:bg-blue-500/30 cursor-pointer"
                >
                  Set View
                </button>
                <button
                  onClick={() => {
                    const sel = (document.getElementById("bulk-module-select") as HTMLSelectElement)?.value;
                    if (sel) handleBulkSetModule(sel, "none");
                  }}
                  className="px-2 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-extrabold uppercase rounded hover:bg-red-500/30 cursor-pointer"
                >
                  Deny
                </button>
              </div>

              <button
                onClick={() => setSelectedUserIds([])}
                className="text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text)] underline cursor-pointer ml-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Permissions Visual Matrix Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-hidden shadow-xl">
        <div className="bg-[var(--color-surface-2)] px-5 py-3 border-b border-[var(--color-border)]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-[var(--color-text)] uppercase tracking-wider">
              Staff Members vs Module Permissions Matrix
            </span>
            <span className="text-[10px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-mono px-2 py-0.5 rounded font-bold">
              {filteredUsers.length} Users Displayed
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> MANAGE
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> EDIT
            </span>
            <span className="flex items-center gap-1 font-bold text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> VIEW
            </span>
            <span className="flex items-center gap-1 font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400"></span> NONE
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]/50 bg-[var(--color-surface-2)] text-[9px] text-[var(--color-text-faint)] uppercase font-black tracking-wider select-none">
                <th className="px-4 py-3 sticky left-0 z-20 bg-[var(--color-surface-2)] w-60 border-r border-[var(--color-border)]/50">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-[var(--color-border)] cursor-pointer"
                    />
                    <span>User &amp; Role</span>
                  </div>
                </th>
                
                {crmModulesList.map(mod => {
                  const isHighlighted = moduleAccessFilter === mod.key;
                  return (
                    <th 
                      key={mod.key} 
                      className={`px-3 py-3 text-center min-w-[100px] ${isHighlighted ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-extrabold" : ""}`}
                    >
                      <div className="truncate font-extrabold" title={mod.description}>{mod.name}</div>
                      <div className="text-[8px] opacity-60 normal-case font-normal truncate">{mod.category}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--color-border)]/40 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={crmModulesList.length + 1} className="py-8 text-center text-xs text-[var(--color-text-faint)] italic">
                    No users match the selected search and permission filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const isOverpriv = overprivilegedUsers.some(o => o.id === user.id);

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-[var(--color-surface-2)]/30 transition-all ${isSelected ? "bg-[var(--color-accent)]/5" : ""} ${isOverpriv ? "bg-red-500/5" : ""}`}
                    >
                      {/* Sticky User Cell */}
                      <td className="px-4 py-3 sticky left-0 z-10 bg-[var(--color-surface)] border-r border-[var(--color-border)]/50">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(user.id)}
                            className="rounded border-[var(--color-border)] cursor-pointer"
                          />

                          <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--color-accent)]/20">
                            {user.first ? user.first[0] : "U"}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[var(--color-text)] truncate">{user.first} {user.last}</span>
                              {isOverpriv && (
                                <span className="text-[8px] bg-red-500/20 text-red-400 font-extrabold px-1 rounded uppercase">
                                  Warn
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-faint)] truncate">
                              {user.role} • Lvl {user.clearanceLevel || 1}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Module Cells */}
                      {crmModulesList.map(mod => {
                        const perm = getUserPermission(user, mod.key);
                        const isHighlightedCol = moduleAccessFilter === mod.key;

                        return (
                          <td 
                            key={mod.key} 
                            className={`px-2 py-2 text-center transition-all ${isHighlightedCol ? "bg-[var(--color-accent)]/10" : ""}`}
                          >
                            <button
                              onClick={() => cyclePermissionLevel(user, mod.key)}
                              title={`Click to cycle level (${perm.toUpperCase()})`}
                              className={`w-full py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${getBadgeStyle(perm)}`}
                            >
                              {perm}
                            </button>
                          </td>
                        );
                      })}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-[var(--color-surface-2)]/60 px-5 py-3 border-t border-[var(--color-border)]/50 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-[var(--color-text-faint)]">
          <div>
            💡 <span className="font-semibold text-[var(--color-text)]">Pro Tip:</span> Click any permission badge in the matrix to cycle rights (<span className="text-red-400">NONE</span> → <span className="text-blue-400">VIEW</span> → <span className="text-amber-400">EDIT</span> → <span className="text-emerald-400">MANAGE</span>).
          </div>
          <div>
            Total Matrix Nodes: <span className="font-mono text-[var(--color-accent)]">{filteredUsers.length * crmModulesList.length} permissions checked</span>
          </div>
        </div>
      </div>

    </div>
  );
};
