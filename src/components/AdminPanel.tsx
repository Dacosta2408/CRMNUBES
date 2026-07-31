import React, { useState, useMemo } from "react";
import { 
  Users, Shield, ShieldAlert, ShieldCheck, Lock, Clock, Search, Filter, 
  Download, Eye, Edit3, Trash2, Key, ToggleLeft, ToggleRight, CheckSquare, 
  UserPlus, Check, AlertTriangle, X, RefreshCw, Layers, Database, ArrowRight, 
  Info, Mail, Phone, Calendar, UserCheck, AlertCircle, FileSpreadsheet, LockKeyhole,
  Terminal, Bell, LayoutDashboard, Volume2
} from "lucide-react";
import { User, Client, Task, Lender } from "../types";

// Import modular sub-panels
import { AdminOverview } from "./admin/AdminOverview";
import { UserManagement } from "./admin/UserManagement";
import { PermissionsView } from "./admin/PermissionsView";
import { SecurityView } from "./admin/SecurityView";
import { BackupRecoveryPanel } from "./BackupRecoveryPanel";
import { AuditLogsView } from "./admin/AuditLogsView";
import { SystemAlerts } from "./admin/SystemAlerts";
import { DeploymentPanel } from "./admin/DeploymentPanel";
import { CrmDefaultsView } from "./admin/CrmDefaultsView";

interface AdminPanelProps {
  userRoster: User[];
  setUserRoster: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  clients: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
  tasks: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  auditLogs: any[];
  setAuditLogs: React.Dispatch<React.SetStateAction<any[]>>;
  sessionAutoLock: boolean;
  setAutoLockEnabled: (val: boolean) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (val: number) => void;
  auditLoggingEnabled: boolean;
  setAuditLogEnabled: (val: boolean) => void;
  onLockApp: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  lenders?: Lender[];
  settings?: any;
  bridgeOnline?: boolean;
  versionMismatch?: boolean;
  bridgeVersion?: string | null;
}

type AdminTab = "overview" | "users" | "permissions" | "security" | "defaults" | "backup" | "audit" | "alerts" | "deployment";

export const AdminPanel: React.FC<AdminPanelProps> = ({
  userRoster,
  setUserRoster,
  currentUser,
  setCurrentUser,
  clients,
  setClients,
  tasks,
  setTasks,
  auditLogs,
  setAuditLogs,
  sessionAutoLock,
  setAutoLockEnabled,
  autoLockMinutes,
  setAutoLockMinutes,
  auditLoggingEnabled,
  setAuditLogEnabled,
  onLockApp,
  showToast,
  lenders = [],
  settings = { apiKey: "" },
  bridgeOnline = false,
  versionMismatch = false,
  bridgeVersion = null
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Determine authorized role access
  const hasAccess = useMemo(() => {
    const role = currentUser.role;
    return role === "Developer/Admin" || role === "Admin" || currentUser.isOwner;
  }, [currentUser]);

  // Log activity helper
  const logActivity = (action: string, details: string) => {
    if (!auditLoggingEnabled) return;
    
    const logItem = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: activeTab === "users" ? "User Management" : activeTab === "permissions" ? "Permissions" : activeTab === "security" ? "Security" : "System",
      action,
      operator: `${currentUser.first} ${currentUser.last}`,
      user: `${currentUser.first} ${currentUser.last}`,
      details,
      severity: action.toLowerCase().includes("block") || action.toLowerCase().includes("purge") || action.toLowerCase().includes("override") ? "high" : "info"
    };

    setAuditLogs(prev => [logItem, ...prev.slice(0, 199)]);
  };

  // Guard Clause: Access Denied Shield for Unauthorized Roles
  if (!hasAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-bg)] h-full relative overflow-hidden" id="admin-guard-shield">
        {/* Abstract radar sweep or background shield */}
        <div className="absolute w-96 h-96 rounded-full bg-[var(--color-error)]/5 animate-pulse filter blur-3xl pointer-events-none" />
        
        <div className="max-w-md bg-[var(--color-surface)] border border-[var(--color-error)]/25 rounded-2xl p-8 text-center shadow-2xl relative">
          <div className="w-16 h-16 rounded-full bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20 flex items-center justify-center text-[var(--color-error)] mx-auto mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-black text-[var(--color-text)] uppercase tracking-wider">Access Breach Intercepted</h2>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-3">
            Your current security profile level (<span className="text-[var(--color-error)] font-bold">{currentUser.role}</span>) does not possess clearance for the high-level Admin Control Center.
          </p>

          <div className="bg-[var(--color-error-subtle)] border border-[var(--color-error)]/15 rounded-lg p-3 mt-4 text-[11px] text-[var(--color-error)]/90 leading-normal text-left font-mono">
            ⚠️ WORKSTATION LOGGED: This unauthorized lookup attempt has been recorded in the security logs under user {currentUser.first} {currentUser.last}.
          </div>

          <div className="mt-6 border-t border-[var(--color-border)]/70 pt-4">
            <span className="text-[10px] text-[var(--color-text-faint)] uppercase font-bold tracking-wider">Ontario FSRA Mortgage Compliance Directive</span>
          </div>
        </div>
      </div>
    );
  }

  // Right Tab Title & Descriptions
  const tabMetadata: Record<AdminTab, { title: string; desc: string }> = {
    overview: {
      title: "Control Tower Overview",
      desc: "Live visibility of active personnel counts, threat alerts, extraction health, and operational diagnostics."
    },
    users: {
      title: "Roster Control & Onboarding",
      desc: "Onboard new mortgage brokers, edit field registry, manage credentials, and inspect FSRA compliance documents."
    },
    permissions: {
      title: "Clearance Grid Matrix",
      desc: "Customize role access templates and map user-level overrides to individual secure nodes."
    },
    security: {
      title: "Security & Device Session Registry",
      desc: "Override auto-lock timers, whitelists, review risky external IP addresses, and enforce security policies."
    },
    defaults: {
      title: "CRM Pipeline & Intake Defaults",
      desc: "Configure global pipeline board stage labels, default assigned agents, ingestion sources, and intake document checklists."
    },
    backup: {
      title: "Storage Integrity & Disaster Recovery",
      desc: "Perform cold-storage sync, check validation status, download backup images, and initiate restoration."
    },
    audit: {
      title: "Operations Trajectory Log",
      desc: "Inspect, search, filter, and export immutable CSV operational logs for compliance regulatory audits."
    },
    alerts: {
      title: "Global System Notice Broadcaster",
      desc: "Broadcast, manage, and dispatch active notice banners to all broker workstation workspaces."
    },
    deployment: {
      title: "Deployment & Production Readiness",
      desc: "Audit your CRM's status, check local bridge connectivity, and migrate local database cache arrays to the network Z Drive."
    }
  };

  const currentMeta = tabMetadata[activeTab];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-bg)] overflow-hidden" id="admin-unified-control-center">
      
      {/* Visual Header bar */}
      <div className="h-14 border-b border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-[var(--color-error)] animate-pulse" />
          <div>
            <h1 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">High-Level Operations Control Center</h1>
            <p className="text-[10px] text-[var(--color-text-muted)] font-semibold leading-none mt-0.5">GBK Internal Mortgage Brokerage Console</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[9px] bg-[var(--color-error-subtle)] text-[var(--color-error)] font-mono px-2 py-0.5 rounded border border-[var(--color-error)]/15 uppercase font-black">
            System Overseer Access
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-semibold hidden sm:inline">
            Active Operator: <span className="text-[var(--color-accent)] font-black">{currentUser.first} {currentUser.last}</span>
          </span>
        </div>
      </div>

      {/* Main Grid Sub-Navigation & Sub-Viewport */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side Navigation Panel */}
        <aside className="w-60 border-r border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 flex flex-col justify-between p-4 select-none shrink-0 overflow-y-auto hidden md:flex" id="admin-sub-navigation">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-faint)] block px-2.5 mb-2">Control Nodes</span>
              
              <div className="space-y-1">
                {/* 1. Overview */}
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "overview" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" /> Control Tower
                </button>

                {/* 2. User Management */}
                <button
                  onClick={() => setActiveTab("users")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "users" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" /> User Management
                </button>

                {/* 3. Permissions */}
                <button
                  onClick={() => setActiveTab("permissions")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "permissions" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" /> Clearance Matrix
                </button>

                {/* 4. Security */}
                <button
                  onClick={() => setActiveTab("security")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "security" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <LockKeyhole className="w-4 h-4 shrink-0" /> Security Policies
                </button>

                {/* 5. CRM Defaults */}
                <button
                  onClick={() => setActiveTab("defaults")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "defaults" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" /> CRM Defaults
                </button>
              </div>
            </div>

            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-faint)] block px-2.5 mb-2">System CONTINUITY</span>
              
              <div className="space-y-1">
                {/* 5. Backup & Recovery */}
                <button
                  onClick={() => setActiveTab("backup")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "backup" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" /> Backups &amp; Recovery
                </button>

                {/* Deployment Readiness (Owner / Master Admin only) */}
                {(currentUser.role === "Developer/Admin" || currentUser.isOwner) && (
                  <button
                    onClick={() => setActiveTab("deployment")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === "deployment" 
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--color-accent)]" /> Deployment Readiness
                  </button>
                )}

                {/* 6. Audit Logs */}
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "audit" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <Terminal className="w-4 h-4 shrink-0" /> Audit Trajectory
                </button>

                {/* 7. System Alerts / Broadcasts */}
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "alerts" 
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
                  }`}
                >
                  <Bell className="w-4 h-4 shrink-0" /> Notice Broadcaster
                </button>
              </div>
            </div>
          </div>

          {/* Secure compliance notice bottom */}
          <div className="bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]/70 rounded-xl p-3 text-[10px] text-[var(--color-text-faint)] leading-relaxed">
            🛡️ <span className="text-[var(--color-text-muted)] font-bold">FSRA Standard:</span> Underwriting logs are securely recorded on local storage arrays daily.
          </div>
        </aside>

        {/* Core Sub-Viewport Content Panel */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-bg)]">
          
          {/* Subheader context bar */}
          <div className="bg-[var(--color-surface-2)]/50 border-b border-[var(--color-border)]/70 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">{currentMeta.title}</h2>
              <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">{currentMeta.desc}</p>
            </div>
            
            {/* Mobile Subnavigation (Toggles only when viewport is smaller) */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto py-1">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as AdminTab)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-[11px] text-[var(--color-accent)] px-2.5 py-1 rounded outline-none cursor-pointer font-bold"
              >
                <option value="overview">Tower Overview</option>
                <option value="users">Roster Control</option>
                <option value="permissions">Clearance Matrix</option>
                <option value="security">Security Policy</option>
                <option value="defaults">CRM Defaults</option>
                <option value="backup">Database Backup</option>
                {(currentUser.role === "Owner / Master Admin" || currentUser.isOwner) && (
                  <option value="deployment">Deployment Readiness</option>
                )}
                <option value="audit">Audit Trajectory</option>
                <option value="alerts">Notice Broadcast</option>
              </select>
            </div>
          </div>

          {/* Content scroll frame */}
          <div className="flex-1 overflow-y-auto p-6" id="admin-subview-frame">
            {activeTab === "overview" && (
              <AdminOverview 
                userRoster={userRoster}
                clients={clients}
                tasks={tasks}
                auditLogs={auditLogs}
                onLockApp={onLockApp}
                setActiveTab={(tab) => setActiveTab(tab as AdminTab)}
                showToast={(msg, type) => showToast(msg, type)}
              />
            )}

            {activeTab === "users" && (
              <UserManagement 
                userRoster={userRoster}
                setUserRoster={setUserRoster}
                currentUser={currentUser}
                clients={clients}
                setClients={setClients}
                tasks={tasks}
                setTasks={setTasks}
                showToast={(msg, type) => showToast(msg, type)}
                logActivity={logActivity}
              />
            )}

            {activeTab === "permissions" && (
              <PermissionsView 
                userRoster={userRoster}
                setUserRoster={setUserRoster}
                currentUser={currentUser}
                showToast={(msg, type) => showToast(msg, type)}
                logActivity={logActivity}
              />
            )}

            {activeTab === "security" && (
              <SecurityView 
                userRoster={userRoster}
                currentUser={currentUser}
                sessionAutoLock={sessionAutoLock}
                setAutoLockEnabled={setAutoLockEnabled}
                autoLockMinutes={autoLockMinutes}
                setAutoLockMinutes={setAutoLockMinutes}
                auditLoggingEnabled={auditLoggingEnabled}
                setAuditLogEnabled={setAuditLogEnabled}
                showToast={(msg, type) => showToast(msg, type)}
                logActivity={logActivity}
              />
            )}

            {activeTab === "defaults" && (
              <CrmDefaultsView
                userRoster={userRoster}
                currentUser={currentUser}
                showToast={(msg, type, icon) => showToast(msg, type, icon)}
                logActivity={logActivity}
              />
            )}

            {activeTab === "backup" && (
              <BackupRecoveryPanel 
                currentUser={currentUser}
                clients={clients}
                showToast={(msg, type) => showToast(msg, type as any)}
                onRefreshCRMData={() => showToast("CRM database arrays refreshed successfully.", "success")}
              />
            )}

            {activeTab === "deployment" && (
              <DeploymentPanel 
                userRoster={userRoster}
                currentUser={currentUser}
                clients={clients}
                tasks={tasks}
                auditLogs={auditLogs}
                sessionAutoLock={sessionAutoLock}
                auditLoggingEnabled={auditLoggingEnabled}
                lenders={lenders}
                settings={settings}
                bridgeOnline={bridgeOnline}
                versionMismatch={versionMismatch}
                bridgeVersion={bridgeVersion}
                showToast={showToast}
              />
            )}

            {activeTab === "audit" && (
              <AuditLogsView 
                auditLogs={auditLogs}
                setAuditLogs={setAuditLogs}
                currentUser={currentUser}
                showToast={(msg, type) => showToast(msg, type)}
              />
            )}

            {activeTab === "alerts" && (
              <SystemAlerts 
                userRoster={userRoster}
                currentUser={currentUser}
                showToast={(msg, type) => showToast(msg, type)}
                logActivity={logActivity}
              />
            )}
          </div>
        </main>

      </div>

    </div>
  );
};
