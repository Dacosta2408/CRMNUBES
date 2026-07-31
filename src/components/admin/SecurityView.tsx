import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, ShieldCheck, Lock, ToggleLeft, ToggleRight, 
  Key, RefreshCw, AlertTriangle, AlertCircle, Terminal, 
  Clock, Globe, ShieldX, Smartphone, Monitor
} from "lucide-react";
import { User } from "../../types";

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

interface DeviceSession {
  id: string;
  user: string;
  device: string;
  os: string;
  ip: string;
  location: string;
  time: string;
  status: "authorized" | "flagged" | "blocked";
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
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [deviceControlActive, setDeviceControlActive] = useState(false);

  // Analyze PIN vulnerabilities
  const weakPinUsers = useMemo(() => {
    return userRoster.filter(u => u.pin === "1234" || u.pin === "1111" || u.pin === "2222" || u.pin === "3333");
  }, [userRoster]);

  // Simulated login/device history logs
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([
    {
      id: "sess_1",
      user: "David Acosta",
      device: "MacBook Pro",
      os: "macOS Ventura",
      ip: "192.168.1.15",
      location: "Toronto, ON (Your Session)",
      time: "Just Now",
      status: "authorized"
    },
    {
      id: "sess_2",
      user: "Tim Brown",
      device: "Windows Desktop",
      os: "Windows 11",
      ip: "99.230.12.89",
      location: "Barrie, ON",
      time: "25 minutes ago",
      status: "authorized"
    },
    {
      id: "sess_3",
      user: "Wayne MacLeod",
      device: "iPhone 15 Pro",
      os: "iOS 17.2",
      ip: "172.56.21.103",
      location: "Orillia, ON",
      time: "2 hours ago",
      status: "authorized"
    },
    {
      id: "sess_4",
      user: "Unknown Broker",
      device: "Linux Shell",
      os: "Ubuntu Desktop",
      ip: "185.220.101.5",
      location: "Frankfurt, DE (Tor Relay Node)",
      time: "1 day ago",
      status: "flagged"
    },
    {
      id: "sess_5",
      user: "Jeff Brown",
      device: "Android Tablet",
      os: "Android 14",
      ip: "74.12.93.44",
      location: "Sudbury, ON",
      time: "2 days ago",
      status: "authorized"
    }
  ]);

  const handleSimulateBlock = (id: string, user: string) => {
    setDeviceSessions(prev => prev.map(s => s.id === id ? { ...s, status: "blocked" as const } : s));
    logActivity("Security Device Blocked", `Administrative blocked session token for ${user} from database lookup nodes.`);
    showToast(`Session ${id} successfully revoked & blocked.`, "success");
  };

  return (
    <div className="space-y-6" id="security-manager">
      
      {/* Policy Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core Policy Switches */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-5">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3">
            <Lock className="w-4.5 h-4.5 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Operational Guard Policies</h4>
          </div>

          {/* Policy 1: Auto-Lock */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className="text-xs font-bold text-[var(--color-text)] block">Auto-Lock Workstation Desk</span>
              <span className="text-[10px] text-[var(--color-text-faint)] leading-normal mt-0.5 block">
                Automatically lock the active workstation to secure sensitive GDS/TDS calculations on inactivity.
              </span>
              
              {sessionAutoLock && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-[var(--color-text-muted)]">Lock threshold:</span>
                  <input 
                    type="number" 
                    min={1} 
                    max={120}
                    value={autoLockMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 5;
                      setAutoLockMinutes(val);
                      logActivity("Auto-Lock Threshold Changed", `Workstation lock idle changed to ${val} minutes.`);
                    }}
                    className="w-14 bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded px-2 py-0.5 text-xs text-[var(--color-text)] outline-none font-mono"
                  />
                  <span className="text-[10px] text-[var(--color-text-faint)]">minutes</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                const nextVal = !sessionAutoLock;
                setAutoLockEnabled(nextVal);
                logActivity("Auto-Lock Flag Toggled", `Station idle protection ${nextVal ? "enabled" : "disabled"}`);
                showToast(`Session auto-lock ${nextVal ? "enabled" : "disabled"}.`, "success");
              }}
              className="text-[var(--color-accent)] cursor-pointer"
            >
              {sessionAutoLock ? (
                <ToggleRight className="w-8 h-8 stroke-[1.5]" />
              ) : (
                <ToggleLeft className="w-8 h-8 stroke-[1.5]" />
              )}
            </button>
          </div>

          <div className="border-t border-[var(--color-border)]/50 my-3" />

          {/* Policy 2: Audit Logs Logging */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className="text-xs font-bold text-[var(--color-text)] block">Immutable Operations Audit Pipeline</span>
              <span className="text-[10px] text-[var(--color-text-faint)] leading-normal mt-0.5 block">
                Force write all credential updates, backup procedures, and underwriting overrides to immutable local storage nodes.
              </span>
            </div>

            <button 
              onClick={() => {
                const nextVal = !auditLoggingEnabled;
                setAuditLogEnabled(nextVal);
                logActivity("Audit Log Stream Toggled", `Global administrative logging pipeline turned ${nextVal ? "ON" : "OFF"}`);
                showToast(`Process audit log pipeline ${nextVal ? "active" : "dormant"}.`, "success");
              }}
              className="text-[var(--color-accent)] cursor-pointer"
            >
              {auditLoggingEnabled ? (
                <ToggleRight className="w-8 h-8 stroke-[1.5]" />
              ) : (
                <ToggleLeft className="w-8 h-8 stroke-[1.5]" />
              )}
            </button>
          </div>
        </div>

        {/* Future-Ready Advanced Protection controls (MFA, Device Lock) */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-5">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3">
            <Smartphone className="w-4.5 h-4.5 text-[var(--color-info)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Advanced Auth Guards</h4>
          </div>

          {/* Policy 3: MFA (Future ready toggle) */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className="text-xs font-bold text-[var(--color-text)] block">Multi-Factor Authenticator (MFA)</span>
              <span className="text-[10px] text-[var(--color-text-faint)] leading-normal mt-0.5 block">
                Require a unique Google Authenticator token or SMS passcode during Ontario broker login desk syncs.
              </span>
            </div>

            <button 
              onClick={() => {
                setMfaEnabled(!mfaEnabled);
                showToast(`Two-factor authorization policy updated.`, "success");
              }}
              className="text-[var(--color-info)] cursor-pointer"
            >
              {mfaEnabled ? (
                <ToggleRight className="w-8 h-8 stroke-[1.5]" />
              ) : (
                <ToggleLeft className="w-8 h-8 stroke-[1.5]" />
              )}
            </button>
          </div>

          <div className="border-t border-[var(--color-border)]/50 my-3" />

          {/* Policy 4: Registered devices enforcement */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className="text-xs font-bold text-[var(--color-text)] block">Device Whitelisting Constraints</span>
              <span className="text-[10px] text-[var(--color-text-faint)] leading-normal mt-0.5 block">
                Restricts active CRM sessions only to pre-registered Mac/Windows devices. Block foreign connection tunnels.
              </span>
            </div>

            <button 
              onClick={() => {
                setDeviceControlActive(!deviceControlActive);
                showToast(`Device whitelisting constraints updated.`, "success");
              }}
              className="text-[var(--color-info)] cursor-pointer"
            >
              {deviceControlActive ? (
                <ToggleRight className="w-8 h-8 stroke-[1.5]" />
              ) : (
                <ToggleLeft className="w-8 h-8 stroke-[1.5]" />
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Security Analysis Vulnerabilities Alerts Panel */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-red-400" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Brokerage Security Warnings</h4>
          </div>
          <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 border border-red-500/15 rounded font-bold">
            Real-Time Analysis
          </span>
        </div>

        {weakPinUsers.length > 0 ? (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-black text-amber-300 uppercase">Vulnerable Credentials Detected</h5>
              <p className="text-[11px] text-amber-200 mt-1 leading-relaxed">
                {weakPinUsers.length} staff members are active on standard security pins (e.g., 1234, 1111). Standard compliance guidelines require all brokers to utilize unique non-repeating credentials.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-mono text-[var(--color-text-faint)]">Vulnerable nodes: {weakPinUsers.map(u => `${u.first} ${u.last}`).join(", ")}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="text-emerald-300 font-bold block">All Accounts Secure</span>
              <span className="text-[var(--color-text-faint)] mt-0.5 block">No simple vulnerable PINs are active in the CRM data layer.</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Authentication Logs & Session History Whitelisting */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-[var(--color-surface-2)] px-5 py-3.5 border-b border-[var(--color-border)]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Authentication &amp; Device Session Registry</h4>
          </div>
          <span className="text-[10px] text-[var(--color-text-faint)] font-semibold font-mono">5 Connection Handles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]/50 bg-[var(--color-surface-2)] text-[9px] text-[var(--color-text-faint)] uppercase font-black tracking-wider select-none">
                <th className="px-5 py-2.5">User</th>
                <th className="px-5 py-2.5">Device / OS</th>
                <th className="px-5 py-2.5">IP Address</th>
                <th className="px-5 py-2.5">Access Location</th>
                <th className="px-5 py-2.5">Activity Timestamp</th>
                <th className="px-5 py-2.5 text-right">Oversight Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/40 text-xs text-[var(--color-text-muted)]">
              {deviceSessions.map((session) => (
                <tr key={session.id} className="hover:bg-[var(--color-surface-2)]/25 transition-all">
                  
                  {/* User */}
                  <td className="px-5 py-3">
                    <span className="font-bold text-[var(--color-text)]">{session.user}</span>
                  </td>

                  {/* Device / OS */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-[11px]">
                      {session.device.includes("Mac") || session.device.includes("Windows") ? (
                        <Monitor className="w-3.5 h-3.5 text-[var(--color-text-faint)] shrink-0" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5 text-[var(--color-text-faint)] shrink-0" />
                      )}
                      <span>{session.device} • <span className="text-[var(--color-text-faint)]">{session.os}</span></span>
                    </div>
                  </td>

                  {/* IP */}
                  <td className="px-5 py-3">
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
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
                    {session.status === "authorized" ? (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold uppercase border border-emerald-500/20 px-2 py-0.5 rounded">
                        Authorized
                      </span>
                    ) : session.status === "blocked" ? (
                      <span className="text-[9px] bg-red-500/10 text-red-500 font-bold uppercase border border-red-500/20 px-2 py-0.5 rounded">
                        Blocked Session
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold uppercase border border-amber-500/20 px-2 py-0.5 rounded animate-pulse">
                          Risky Node
                        </span>
                        <button
                          onClick={() => handleSimulateBlock(session.id, session.user)}
                          className="text-[9px] text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded uppercase font-black transition-all cursor-pointer"
                        >
                          Revoke Access
                        </button>
                      </div>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
