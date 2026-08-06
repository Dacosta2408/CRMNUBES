import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, ShieldCheck, Lock, ToggleLeft, ToggleRight, 
  Key, RefreshCw, AlertTriangle, AlertCircle, Terminal, 
  Clock, Globe, ShieldX, Smartphone, Monitor, Download,
  FileText, Search, Filter, Plus, Trash2, Copy, Check,
  UserCheck, UserX, Unlock, Zap, ChevronDown, CheckCircle2,
  Sliders, Shield
} from "lucide-react";
import { User } from "../../types";
import { generateSecurityReportPDF, exportSecurityReportCSV } from "../../lib/rosterPdfGenerator";

interface SecurityViewProps {
  userRoster: User[];
  currentUser: User;
  sessionAutoLock: boolean;
  setAutoLockEnabled: (val: boolean) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (val: number) => void;
  auditLoggingEnabled: boolean;
  setAuditLogEnabled: (val: boolean) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  logActivity: (action: string, details: string) => void;
}

export interface DeviceSession {
  id: string;
  user: string;
  email: string;
  role: string;
  device: string;
  os: string;
  browser: string;
  ip: string;
  location: string;
  time: string;
  status: "authorized" | "flagged" | "blocked";
}

export interface FailedLoginAttempt {
  id: string;
  email: string;
  user?: string;
  ip: string;
  location: string;
  attempts: number;
  lastAttempt: string;
  lockedOut: boolean;
}

export interface IPRule {
  id: string;
  ip: string;
  type: "whitelist" | "blacklist";
  note: string;
  addedBy: string;
  date: string;
}

export interface SecurityIncident {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "info";
  event: string;
  userOrIp: string;
  details: string;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  userRoster,
  currentUser,
  sessionAutoLock,
  setAutoLockEnabled,
  autoLockMinutes,
  setAutoLockMinutes,
  auditLoggingEnabled,
  setAuditLogEnabled,
  showToast,
  logActivity
}) => {
  // Password Policy State
  const [minPasswordLength, setMinPasswordLength] = useState(12);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireLowercase, setRequireLowercase] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<string>("90");
  const [passwordHistoryCount, setPasswordHistoryCount] = useState(5);

  // Admin Password Reset Modal / Tool State
  const [targetResetUser, setTargetResetUser] = useState<string>(userRoster[0]?.id || "");
  const [generatedTempPassword, setGeneratedTempPassword] = useState("");
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(true);
  const [copiedTempPass, setCopiedTempPass] = useState(false);

  // Failed Login Threshold & State
  const [failedLockoutThreshold, setFailedLockoutThreshold] = useState(5);
  const [failedAttempts, setFailedAttempts] = useState<FailedLoginAttempt[]>([
    {
      id: "fa_1",
      email: "intruder.test@unknown-vpn.io",
      user: "Unknown User",
      ip: "185.220.101.5",
      location: "Frankfurt, DE (Tor Exit Node)",
      attempts: 6,
      lastAttempt: "10 mins ago",
      lockedOut: true
    },
    {
      id: "fa_2",
      email: "tim.brown@gbkfinancial.ca",
      user: "Tim Brown",
      ip: "99.230.12.89",
      location: "Barrie, ON",
      attempts: 3,
      lastAttempt: "1 hour ago",
      lockedOut: false
    },
    {
      id: "fa_3",
      email: "admin.temp@gbkfinancial.ca",
      user: "Unassigned Agent",
      ip: "198.51.100.42",
      location: "Ottawa, ON",
      attempts: 5,
      lastAttempt: "3 hours ago",
      lockedOut: true
    }
  ]);

  // Active Sessions
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([
    {
      id: "sess_1",
      user: `${currentUser.first} ${currentUser.last}`,
      email: currentUser.email,
      role: currentUser.role,
      device: "MacBook Pro 16",
      os: "macOS Ventura",
      browser: "Chrome 127",
      ip: "192.168.1.15",
      location: "Toronto, ON (Your Current Session)",
      time: "Just Now",
      status: "authorized"
    },
    {
      id: "sess_2",
      user: "Tim Brown",
      email: "tim.brown@gbkfinancial.ca",
      role: "Broker",
      device: "Windows Workstation",
      os: "Windows 11",
      browser: "Edge 126",
      ip: "99.230.12.89",
      location: "Barrie, ON",
      time: "25 mins ago",
      status: "authorized"
    },
    {
      id: "sess_3",
      user: "Wayne MacLeod",
      email: "wayne.macleod@gbkfinancial.ca",
      role: "Broker",
      device: "iPhone 15 Pro",
      os: "iOS 17.2",
      browser: "Safari Mobile",
      ip: "172.56.21.103",
      location: "Orillia, ON",
      time: "2 hours ago",
      status: "authorized"
    },
    {
      id: "sess_4",
      user: "Unknown Session Token",
      email: "external.access@proxy.de",
      role: "Guest",
      device: "Linux Shell Terminal",
      os: "Ubuntu Desktop",
      browser: "Firefox 120",
      ip: "185.220.101.5",
      location: "Frankfurt, DE (Tor Relay Node)",
      time: "1 day ago",
      status: "flagged"
    },
    {
      id: "sess_5",
      user: "Jeff Brown",
      email: "jeff.brown@gbkfinancial.ca",
      role: "Broker",
      device: "Android Tablet",
      os: "Android 14",
      browser: "Chrome Mobile",
      ip: "74.12.93.44",
      location: "Sudbury, ON",
      time: "2 days ago",
      status: "authorized"
    }
  ]);

  // 2FA Enforcement per role
  const [mfaByRole, setMfaByRole] = useState<Record<string, boolean>>({
    "Developer/Admin": true,
    "Admin": true,
    "Broker": true,
    "Agent": false
  });

  // IP Whitelist / Blacklist
  const [ipRules, setIpRules] = useState<IPRule[]>([
    {
      id: "ip_1",
      ip: "192.168.1.0/24",
      type: "whitelist",
      note: "Toronto HQ Subnet",
      addedBy: "System Admin",
      date: "2026-01-10"
    },
    {
      id: "ip_2",
      ip: "185.220.101.5",
      type: "blacklist",
      note: "Blocked Malicious Tor Node",
      addedBy: `${currentUser.first} ${currentUser.last}`,
      date: "2026-08-01"
    }
  ]);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newIpNote, setNewIpNote] = useState("");
  const [newIpType, setNewIpType] = useState<"whitelist" | "blacklist">("whitelist");

  // Security Incidents Log
  const [incidents, setIncidents] = useState<SecurityIncident[]>([
    {
      id: "inc_1",
      timestamp: "Today, 11:45 AM",
      severity: "high",
      event: "Account Auto-Locked",
      userOrIp: "intruder.test@unknown-vpn.io",
      details: "Exceeded 5 failed login attempts from IP 185.220.101.5."
    },
    {
      id: "inc_2",
      timestamp: "Yesterday, 03:20 PM",
      severity: "critical",
      event: "Risky Connection Flagged",
      userOrIp: "185.220.101.5",
      details: "Connection attempt detected from known Tor Exit Node in Germany."
    },
    {
      id: "inc_3",
      timestamp: "Aug 04, 2026, 09:10 AM",
      severity: "medium",
      event: "Password Policy Updated",
      userOrIp: `${currentUser.first} ${currentUser.last}`,
      details: "Minimum password length updated to 12 characters."
    },
    {
      id: "inc_4",
      timestamp: "Aug 02, 2026, 02:00 PM",
      severity: "info",
      event: "Session Revocation",
      userOrIp: "Tim Brown",
      details: "Admin terminated stale Windows Workstation session."
    }
  ]);
  const [incidentSearch, setIncidentSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Handlers for Session Management
  const handleForceLogoutSession = (sessionId: string, userName: string) => {
    setDeviceSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: "blocked" as const } : s));
    
    // Log Incident
    const newInc: SecurityIncident = {
      id: `inc_${Date.now()}`,
      timestamp: "Just Now",
      severity: "medium",
      event: "Session Revoked",
      userOrIp: userName,
      details: `Administrative token revocation triggered for session ID ${sessionId}`
    };
    setIncidents(prev => [newInc, ...prev]);

    logActivity("Session Terminated", `Revoked access token for session ${sessionId} (${userName}).`);
    showToast(`Successfully terminated active session for ${userName}.`, "success");
  };

  const handleForceLogoutAllSessions = () => {
    // Revoke all sessions except the current user's session
    let count = 0;
    setDeviceSessions(prev => prev.map(s => {
      if (s.user.includes(currentUser.first) && s.status === "authorized") return s;
      count++;
      return { ...s, status: "blocked" as const };
    }));

    logActivity("Bulk Sessions Terminated", `Force logged out ${count} active staff sessions.`);
    showToast(`Force logged out ${count} staff session(s).`, "success");
  };

  // Password Policy Save
  const handleSavePasswordPolicy = () => {
    logActivity(
      "Password Policy Modified", 
      `Min Length: ${minPasswordLength}, Uppercase: ${requireUppercase}, Expiry: ${passwordExpiryDays} days`
    );
    showToast("Password & Authentication policy saved successfully.", "success");
  };

  // Admin Generate Temp Password
  const handleGenerateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 14; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedTempPassword(pass);
    setCopiedTempPass(false);
  };

  const handleExecutePasswordReset = () => {
    const targetUser = userRoster.find(u => u.id === targetResetUser);
    if (!targetUser) return;

    logActivity(
      "Admin Password Reset", 
      `Reset credentials for ${targetUser.first} ${targetUser.last}. Mandatory change on next login: ${forceChangeOnLogin}`
    );

    // Log Incident
    const newInc: SecurityIncident = {
      id: `inc_${Date.now()}`,
      timestamp: "Just Now",
      severity: "high",
      event: "Administrative Password Reset",
      userOrIp: `${targetUser.first} ${targetUser.last}`,
      details: `Temporary password generated by ${currentUser.first} ${currentUser.last}`
    };
    setIncidents(prev => [newInc, ...prev]);

    showToast(`Password successfully reset for ${targetUser.first} ${targetUser.last}.`, "success");
    setGeneratedTempPassword("");
  };

  // Failed Login Unlock User
  const handleUnlockUser = (id: string, email: string) => {
    setFailedAttempts(prev => prev.map(f => f.id === id ? { ...f, attempts: 0, lockedOut: false } : f));
    
    // Log Incident
    const newInc: SecurityIncident = {
      id: `inc_${Date.now()}`,
      timestamp: "Just Now",
      severity: "info",
      event: "User Account Unlocked",
      userOrIp: email,
      details: `Admin unlocked user account after failed login lockout.`
    };
    setIncidents(prev => [newInc, ...prev]);

    logActivity("User Unlocked", `Admin cleared failed login counters for ${email}.`);
    showToast(`Account unlocked for ${email}.`, "success");
  };

  // Add IP Rule
  const handleAddIpRule = () => {
    if (!newIpAddress.trim()) {
      showToast("Please enter a valid IP address or CIDR subnet.", "error");
      return;
    }

    const newRule: IPRule = {
      id: `ip_${Date.now()}`,
      ip: newIpAddress.trim(),
      type: newIpType,
      note: newIpNote.trim() || "Administrative Rule",
      addedBy: `${currentUser.first} ${currentUser.last}`,
      date: new Date().toISOString().split("T")[0]
    };

    setIpRules(prev => [newRule, ...prev]);
    setNewIpAddress("");
    setNewIpNote("");

    logActivity("IP Security Rule Added", `Added ${newIpType.toUpperCase()} rule for ${newRule.ip}`);
    showToast(`Added ${newIpType} rule for ${newRule.ip}`, "success");
  };

  const handleRemoveIpRule = (id: string, ip: string) => {
    setIpRules(prev => prev.filter(r => r.id !== id));
    logActivity("IP Security Rule Removed", `Removed IP rule for ${ip}`);
    showToast(`Removed IP rule for ${ip}`, "info");
  };

  // Toggle 2FA per role
  const handleToggle2FAForRole = (role: string) => {
    if (role === "Developer/Admin") {
      showToast("Developer/Admin accounts strictly require 2FA.", "error");
      return;
    }
    setMfaByRole(prev => {
      const next = !prev[role];
      logActivity("2FA Role Policy Updated", `2FA enforcement for '${role}' set to ${next}`);
      return { ...prev, [role]: next };
    });
    showToast(`2FA policy updated for ${role}.`, "success");
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (severityFilter !== "all" && inc.severity !== severityFilter) return false;
      if (incidentSearch) {
        const q = incidentSearch.toLowerCase();
        return inc.event.toLowerCase().includes(q) || inc.userOrIp.toLowerCase().includes(q) || inc.details.toLowerCase().includes(q);
      }
      return true;
    });
  }, [incidents, severityFilter, incidentSearch]);

  return (
    <div className="space-y-6" id="security-manager">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-base font-extrabold text-[var(--color-text)]">Enterprise Security Guard &amp; Session Management</h3>
          </div>
          <p className="text-xs text-[var(--color-text-faint)] mt-1">
            Real-time active session revocation, password policy rules, failed login monitoring, IP access controls, and security audit logs.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              generateSecurityReportPDF(deviceSessions, incidents, ipRules);
              showToast("Security audit PDF report downloaded.", "success");
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/80 text-xs font-bold text-[var(--color-text)] rounded-lg transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>PDF Security Report</span>
          </button>
          
          <button
            onClick={() => {
              exportSecurityReportCSV(deviceSessions, incidents, ipRules);
              showToast("Security CSV exported.", "success");
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-accent)] text-black font-extrabold text-xs rounded-lg hover:bg-[var(--color-accent)]/90 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>Active Sessions</span>
            <Monitor className="w-4 h-4 text-[var(--color-info)]" />
          </div>
          <p className="text-2xl font-black text-[var(--color-text)] mt-2">
            {deviceSessions.filter(s => s.status === "authorized").length}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">
            ● Authorized Handles Active
          </span>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>Failed Attempt Locks</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-400 mt-2">
            {failedAttempts.filter(f => f.lockedOut).length}
          </p>
          <span className="text-[10px] text-[var(--color-text-faint)] mt-1 block">
            Accounts Currently Locked
          </span>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>IP Filter Rules</span>
            <Globe className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <p className="text-2xl font-black text-[var(--color-text)] mt-2">
            {ipRules.length}
          </p>
          <span className="text-[10px] text-[var(--color-text-faint)] mt-1 block">
            {ipRules.filter(r => r.type === "whitelist").length} Whitelist / {ipRules.filter(r => r.type === "blacklist").length} Blacklist
          </span>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>2FA Policy</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            {Object.values(mfaByRole).filter(Boolean).length} / {Object.keys(mfaByRole).length}
          </p>
          <span className="text-[10px] text-[var(--color-text-faint)] mt-1 block">
            Roles Mandating 2FA
          </span>
        </div>
      </div>

      {/* 1. Active Session Management Dashboard */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-[var(--color-surface-2)] px-5 py-3.5 border-b border-[var(--color-border)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-xs font-extrabold text-[var(--color-text)] uppercase tracking-wider">
              Active User Sessions Dashboard ({deviceSessions.length})
            </h4>
          </div>

          <button
            onClick={handleForceLogoutAllSessions}
            className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-extrabold uppercase rounded-lg hover:bg-red-500/25 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ShieldX className="w-3.5 h-3.5" />
            <span>Force Logout All Other Sessions</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]/50 bg-[var(--color-surface-2)] text-[9px] text-[var(--color-text-faint)] uppercase font-black tracking-wider">
                <th className="px-5 py-3">User &amp; Email</th>
                <th className="px-5 py-3">Device / OS / Browser</th>
                <th className="px-5 py-3">IP Address</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Activity</th>
                <th className="px-5 py-3 text-right">Session Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/40 text-xs text-[var(--color-text-muted)]">
              {deviceSessions.map(session => (
                <tr key={session.id} className="hover:bg-[var(--color-surface-2)]/25 transition-all">
                  
                  {/* User */}
                  <td className="px-5 py-3">
                    <div className="font-bold text-[var(--color-text)]">{session.user}</div>
                    <div className="text-[10px] text-[var(--color-text-faint)]">{session.email} • {session.role}</div>
                  </td>

                  {/* Device */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-[11px]">
                      {session.device.includes("Mac") || session.device.includes("Windows") ? (
                        <Monitor className="w-3.5 h-3.5 text-[var(--color-text-faint)] shrink-0" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5 text-[var(--color-text-faint)] shrink-0" />
                      )}
                      <span>{session.device}</span>
                    </div>
                    <div className="text-[10px] text-[var(--color-text-faint)]">{session.os} ({session.browser})</div>
                  </td>

                  {/* IP */}
                  <td className="px-5 py-3">
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded border border-[var(--color-border)]/40">
                      {session.ip}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="px-5 py-3 font-semibold text-[var(--color-text-muted)]">
                    {session.location}
                  </td>

                  {/* Timestamp */}
                  <td className="px-5 py-3 text-[var(--color-text-faint)] font-mono text-[10px]">
                    {session.time}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3 text-right">
                    {session.status === "blocked" ? (
                      <span className="text-[9px] bg-red-500/15 text-red-400 font-bold uppercase border border-red-500/20 px-2 py-1 rounded">
                        Revoked / Blocked
                      </span>
                    ) : (
                      <button
                        onClick={() => handleForceLogoutSession(session.id, session.user)}
                        className="text-[10px] text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-lg uppercase font-bold transition-all cursor-pointer"
                      >
                        Force Logout
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Password Policy Configuration vs Password Reset Modal Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Password Policy Configuration */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Password Policy Configuration</h4>
            </div>
            <span className="text-[9px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-mono px-2 py-0.5 rounded font-bold">
              FSRA &amp; PIPEDA Compliant
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Minimum Length */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[var(--color-text)]">Minimum Password Length</span>
                <span className="font-mono text-[var(--color-accent)] font-bold">{minPasswordLength} Characters</span>
              </div>
              <input
                type="range"
                min={8}
                max={32}
                value={minPasswordLength}
                onChange={(e) => setMinPasswordLength(parseInt(e.target.value))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[var(--color-text-faint)] font-mono">
                <span>8 chars</span>
                <span>16 chars</span>
                <span>32 chars</span>
              </div>
            </div>

            {/* Complexity Toggles */}
            <div className="space-y-2 border-t border-[var(--color-border)]/40 pt-3">
              <span className="font-bold text-[var(--color-text)] block mb-1">Complexity Requirements</span>
              
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 bg-[var(--color-surface-2)]/50 rounded-lg cursor-pointer border border-[var(--color-border)]/40">
                  <input
                    type="checkbox"
                    checked={requireUppercase}
                    onChange={(e) => setRequireUppercase(e.target.checked)}
                    className="rounded border-[var(--color-border)] cursor-pointer"
                  />
                  <span>Uppercase Letters (A-Z)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[var(--color-surface-2)]/50 rounded-lg cursor-pointer border border-[var(--color-border)]/40">
                  <input
                    type="checkbox"
                    checked={requireLowercase}
                    onChange={(e) => setRequireLowercase(e.target.checked)}
                    className="rounded border-[var(--color-border)] cursor-pointer"
                  />
                  <span>Lowercase Letters (a-z)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[var(--color-surface-2)]/50 rounded-lg cursor-pointer border border-[var(--color-border)]/40">
                  <input
                    type="checkbox"
                    checked={requireNumbers}
                    onChange={(e) => setRequireNumbers(e.target.checked)}
                    className="rounded border-[var(--color-border)] cursor-pointer"
                  />
                  <span>Numbers (0-9)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[var(--color-surface-2)]/50 rounded-lg cursor-pointer border border-[var(--color-border)]/40">
                  <input
                    type="checkbox"
                    checked={requireSpecialChars}
                    onChange={(e) => setRequireSpecialChars(e.target.checked)}
                    className="rounded border-[var(--color-border)] cursor-pointer"
                  />
                  <span>Symbols (!@#$%^&*)</span>
                </label>
              </div>
            </div>

            {/* Password Expiry & History */}
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)]/40 pt-3">
              <div>
                <label className="font-bold text-[var(--color-text)] block mb-1">Password Expiry</label>
                <select
                  value={passwordExpiryDays}
                  onChange={(e) => setPasswordExpiryDays(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                >
                  <option value="never">Never Expire</option>
                  <option value="30">Every 30 Days</option>
                  <option value="60">Every 60 Days</option>
                  <option value="90">Every 90 Days</option>
                  <option value="180">Every 180 Days</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[var(--color-text)] block mb-1">Prevent Password Reuse</label>
                <select
                  value={passwordHistoryCount}
                  onChange={(e) => setPasswordHistoryCount(parseInt(e.target.value))}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                >
                  <option value={0}>Disabled (Allow Any)</option>
                  <option value={3}>Last 3 Passwords</option>
                  <option value={5}>Last 5 Passwords</option>
                  <option value={10}>Last 10 Passwords</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSavePasswordPolicy}
              className="w-full py-2 bg-[var(--color-accent)] text-black font-extrabold text-xs rounded-lg hover:bg-[var(--color-accent)]/90 transition-all cursor-pointer shadow"
            >
              Save Password Policy Settings
            </button>
          </div>
        </div>

        {/* 3. Password Reset for Users (Admins Only) */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3 mb-4">
              <Key className="w-4 h-4 text-[var(--color-info)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Admin User Password Reset Tool</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--color-text)] block mb-1">Target Account</label>
                <select
                  value={targetResetUser}
                  onChange={(e) => {
                    setTargetResetUser(e.target.value);
                    setGeneratedTempPassword("");
                  }}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                >
                  {userRoster.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first} {u.last} ({u.role} - {u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Temp Password Display */}
              {generatedTempPassword ? (
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-accent)]/30 p-3 rounded-xl space-y-2 animate-fadeIn">
                  <span className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider block">Generated Temporary Credentials</span>
                  
                  <div className="flex items-center justify-between bg-[var(--color-surface)] p-2 rounded-lg border border-[var(--color-border)]">
                    <span className="font-mono text-sm font-bold text-[var(--color-accent)] tracking-wide">{generatedTempPassword}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTempPassword);
                        setCopiedTempPass(true);
                        setTimeout(() => setCopiedTempPass(false), 2000);
                      }}
                      className="p-1.5 hover:bg-[var(--color-surface-2)] rounded text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedTempPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceChangeOnLogin}
                      onChange={(e) => setForceChangeOnLogin(e.target.checked)}
                      className="rounded border-[var(--color-border)] cursor-pointer"
                    />
                    <span>Force password change on user's next login</span>
                  </label>
                </div>
              ) : (
                <button
                  onClick={handleGenerateTempPassword}
                  className="w-full py-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/80 text-[var(--color-text)] font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--color-info)]" />
                  <span>Generate Secure Temporary Password</span>
                </button>
              )}
            </div>
          </div>

          {generatedTempPassword && (
            <button
              onClick={handleExecutePasswordReset}
              className="w-full py-2.5 bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-lg hover:bg-red-600 transition-all cursor-pointer shadow mt-4"
            >
              Confirm &amp; Dispatch Password Reset
            </button>
          )}
        </div>

      </div>

      {/* Grid: Failed Login Monitoring vs 2FA Enforcement & IP Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 4. Failed Login Monitoring */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Failed Login &amp; Account Lockouts</h4>
            </div>
            
            <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-faint)]">
              <span>Auto-Lock Threshold:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={failedLockoutThreshold}
                onChange={(e) => setFailedLockoutThreshold(parseInt(e.target.value) || 5)}
                className="w-10 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-1 text-center text-xs font-mono font-bold"
              />
              <span>attempts</span>
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border)]/40 max-h-64 overflow-y-auto">
            {failedAttempts.map(item => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-text)]">{item.email}</span>
                    {item.lockedOut && (
                      <span className="text-[8px] bg-red-500/20 text-red-400 font-extrabold px-1.5 py-0.5 rounded uppercase">
                        Locked Out
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-faint)] mt-0.5">
                    IP: {item.ip} ({item.location}) • {item.attempts} failed tries • {item.lastAttempt}
                  </div>
                </div>

                {item.lockedOut ? (
                  <button
                    onClick={() => handleUnlockUser(item.id, item.email)}
                    className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase rounded-lg hover:bg-emerald-500/25 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Unlock</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    Warning
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. 2FA Enforcement per role */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[var(--color-info)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Role-Based 2FA Enforcement</h4>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">TOTP / Authenticator App</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.keys(mfaByRole).map(role => {
              const isEnforced = mfaByRole[role];
              const isDev = role === "Developer/Admin";

              return (
                <div key={role} className="flex items-center justify-between p-2.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)]/40 rounded-xl">
                  <div>
                    <span className="font-bold text-[var(--color-text)]">{role}</span>
                    <span className="text-[10px] text-[var(--color-text-faint)] block">
                      {isEnforced ? "2FA authentication strictly required on login" : "Optional user opt-in 2FA"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle2FAForRole(role)}
                    disabled={isDev}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      isEnforced 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-faint)] border-[var(--color-border)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {isEnforced ? "Enforced" : "Optional"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 6. IP Whitelist / Blacklist Management */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">IP Address Whitelist &amp; Blacklist Management</h4>
          </div>
          <span className="text-[10px] text-[var(--color-text-faint)] font-mono">{ipRules.length} Configured Rules</span>
        </div>

        {/* Add IP Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--color-surface-2)]/50 p-3 rounded-xl border border-[var(--color-border)]/50">
          <div>
            <input
              type="text"
              placeholder="IP Address (e.g. 192.168.1.100 or 10.0.0.0/16)"
              value={newIpAddress}
              onChange={(e) => setNewIpAddress(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Label / Note (e.g. Office HQ)"
              value={newIpNote}
              onChange={(e) => setNewIpNote(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none"
            />
          </div>

          <div>
            <select
              value={newIpType}
              onChange={(e) => setNewIpType(e.target.value as "whitelist" | "blacklist")}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none font-bold"
            >
              <option value="whitelist">Whitelist (Permit Access)</option>
              <option value="blacklist">Blacklist (Block Access)</option>
            </select>
          </div>

          <button
            onClick={handleAddIpRule}
            className="w-full py-1.5 bg-[var(--color-accent)] text-black font-extrabold text-xs rounded-lg hover:bg-[var(--color-accent)]/90 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add IP Rule</span>
          </button>
        </div>

        {/* IP Rules List */}
        <div className="divide-y divide-[var(--color-border)]/40">
          {ipRules.map(rule => (
            <div key={rule.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                  rule.type === "whitelist" 
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                    : "bg-red-500/15 text-red-400 border-red-500/30"
                }`}>
                  {rule.type}
                </span>

                <div>
                  <span className="font-mono font-bold text-[var(--color-text)]">{rule.ip}</span>
                  <span className="text-[var(--color-text-faint)] ml-2">• {rule.note}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Added by {rule.addedBy} on {rule.date}</span>
                <button
                  onClick={() => handleRemoveIpRule(rule.id, rule.ip)}
                  className="text-red-400 hover:text-red-300 p-1 rounded cursor-pointer"
                  title="Remove Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Security Incident Log with Filters */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--color-border)]/50 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Security Incident &amp; Audit Log</h4>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-[var(--color-text-faint)]" />
              <input
                type="text"
                placeholder="Search log events..."
                value={incidentSearch}
                onChange={(e) => setIncidentSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text)] outline-none"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)]/40 max-h-72 overflow-y-auto pr-1">
          {filteredIncidents.length === 0 ? (
            <p className="text-xs text-[var(--color-text-faint)] italic py-4 text-center">No security incidents match the filter criteria.</p>
          ) : (
            filteredIncidents.map(inc => (
              <div key={inc.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border mt-0.5 shrink-0 ${
                    inc.severity === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                    inc.severity === "high" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                    inc.severity === "medium" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                    "bg-slate-500/20 text-slate-300 border-slate-500/30"
                  }`}>
                    {inc.severity}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text)]">{inc.event}</span>
                      <span className="text-[10px] text-[var(--color-accent)] font-mono">({inc.userOrIp})</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-faint)] mt-0.5">{inc.details}</p>
                  </div>
                </div>

                <span className="text-[10px] text-[var(--color-text-faint)] font-mono shrink-0">{inc.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
