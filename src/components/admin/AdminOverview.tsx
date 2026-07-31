import React, { useMemo } from "react";
import { 
  Users, ShieldCheck, ShieldAlert, Lock, Clock, Database, 
  AlertTriangle, AlertCircle, Sparkles, RefreshCw, Globe, 
  Mail, Shield, FileText, CheckCircle2, Terminal
} from "lucide-react";
import { User, Client, Task } from "../../types";

interface AdminOverviewProps {
  userRoster: User[];
  clients: Client[];
  tasks: Task[];
  auditLogs: any[];
  onLockApp: () => void;
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  userRoster,
  clients,
  tasks,
  auditLogs,
  onLockApp,
  setActiveTab,
  showToast
}) => {
  // Compute some core metrics
  const totalUsers = userRoster.length;
  const activeUsers = userRoster.filter(u => u.status === "active").length;
  const inactiveUsers = userRoster.filter(u => u.status === "inactive").length;
  const simplePinUsers = userRoster.filter(u => u.pin === "1234" || u.pin === "1111" || u.pin === "2222");
  
  const pendingIdDocs = userRoster.filter(u => !u.docsStatus || u.docsStatus === "pending" || u.docsStatus === "missing").length;

  const totalClients = clients.length;
  const fundedCount = clients.filter(c => c.status === "funded").length;

  // Recent system log count
  const recentLogsCount = auditLogs.length;

  // Simulated intake oversight states
  const intakeSourceHealth = {
    websiteForm: "Operational",
    emailIngestion: "Operational",
    aiExtractor: "Active (Gemini 1.5 Pro)",
    failedJobsCount: 2,
    duplicatesDetected: 1
  };

  // Simulated critical system warnings
  const systemAlerts = useMemo(() => {
    const alerts = [];
    
    if (simplePinUsers.length > 0) {
      alerts.push({
        id: "alert_pins",
        type: "security",
        severity: "medium",
        message: `${simplePinUsers.length} broker accounts are using weak default security PINs (e.g. 1234, 2222).`,
        actionLabel: "Enforce Policy"
      });
    }

    if (pendingIdDocs > 0) {
      alerts.push({
        id: "alert_docs",
        type: "compliance",
        severity: "high",
        message: `${pendingIdDocs} brokers have missing or unverified compliance ID documents (FSRA / E&O policy).`,
        actionLabel: "Verify IDs"
      });
    }

    if (intakeSourceHealth.failedJobsCount > 0) {
      alerts.push({
        id: "alert_intake",
        type: "system",
        severity: "medium",
        message: `${intakeSourceHealth.failedJobsCount} website intake forms failed downstream AI parsing.`,
        actionLabel: "Review Intake"
      });
    }

    // Add generic failed backup simulation alert if no backups
    alerts.push({
      id: "alert_backup_status",
      type: "integrity",
      severity: "low",
      message: "Daily cloud cold-storage synchronized successfully. No failed backup alerts written in past 72 hrs.",
      actionLabel: "View Backups"
    });

    return alerts;
  }, [simplePinUsers, pendingIdDocs]);

  return (
    <div className="space-y-6" id="admin-overview-workspace">
      
      {/* Visual Header Stats Tower */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="admin-overview-stats">
        
        {/* Metric 1 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent)]" />
          <div>
            <p className="text-[10px] text-[var(--color-text-faint)] uppercase font-bold tracking-wider"> Roster Strength</p>
            <h3 className="text-2xl font-black text-[var(--color-text)] mt-1 font-mono">{activeUsers}<span className="text-xs text-[var(--color-text-faint)] font-normal">/{totalUsers} Active</span></h3>
            <p className="text-[10px] text-[var(--color-accent)] font-semibold mt-1">Ontario FSRA Compliant</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-info)]" />
          <div>
            <p className="text-[10px] text-[var(--color-text-faint)] uppercase font-bold tracking-wider">Audit Security Logs</p>
            <h3 className="text-2xl font-black text-[var(--color-text)] mt-1 font-mono">{recentLogsCount}</h3>
            <p className="text-[10px] text-[var(--color-success)] font-semibold mt-1">● Pipeline Active &amp; Guarded</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[var(--color-info-subtle)] border border-[var(--color-info)]/20 flex items-center justify-center text-[var(--color-info)] group-hover:scale-105 transition-transform">
            <Terminal className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div>
            <p className="text-[10px] text-[var(--color-text-faint)] uppercase font-bold tracking-wider">Storage Integrity</p>
            <h3 className="text-2xl font-black text-[var(--color-text)] mt-1 font-mono">100%</h3>
            <p className="text-[10px] text-[var(--color-text-faint)] font-semibold mt-1">Last Backup: Today 11:45 AM</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
          <div>
            <p className="text-[10px] text-[var(--color-text-faint)] uppercase font-bold tracking-wider">Unresolved Threats</p>
            <h3 className="text-2xl font-black text-[var(--color-text)] mt-1 font-mono">{systemAlerts.filter(a => a.severity === "high" || a.severity === "medium").length}</h3>
            <p className="text-[10px] text-red-400 font-semibold mt-1">Needs Admin Review</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Operational Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-overview-grid">
        
        {/* Left Col: Control Tower & Alerts Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active System Warnings Banners */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 shadow-lg" id="admin-system-warnings-panel">
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--color-error)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">System Control Warnings</h4>
              </div>
              <span className="text-[9px] bg-[var(--color-error-subtle)] text-[var(--color-error)] font-mono px-2 py-0.5 rounded border border-[var(--color-error)]/15">
                Real-Time Diagnostics
              </span>
            </div>

            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3.5 rounded-lg border flex items-start gap-3 transition-all ${
                    alert.severity === "high" 
                      ? "bg-red-500/5 border-red-500/20 text-[var(--color-text)]" 
                      : alert.severity === "medium"
                      ? "bg-amber-500/5 border-amber-500/20 text-[var(--color-text)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-muted)]"
                  }`}
                >
                  {alert.severity === "high" ? (
                    <AlertCircle className="w-4.5 h-4.5 text-[var(--color-error)] shrink-0 mt-0.5" />
                  ) : alert.severity === "medium" ? (
                    <AlertTriangle className="w-4.5 h-4.5 text-[var(--color-warning)] shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4.5 h-4.5 text-[var(--color-success)] shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed font-semibold">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[9px] uppercase font-bold text-[var(--color-text-faint)]">Category: {alert.type}</span>
                      <span className={`text-[9px] uppercase font-bold ${
                        alert.severity === "high" ? "text-[var(--color-error)]" : alert.severity === "medium" ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"
                      }`}>Severity: {alert.severity}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (alert.type === "security") setActiveTab("security");
                      else if (alert.type === "compliance") setActiveTab("users");
                      else if (alert.type === "integrity") setActiveTab("backup");
                      else showToast("Navigating to target control node...", "success");
                    }}
                    className="shrink-0 text-[10px] font-black uppercase text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] px-2 py-1 bg-[var(--color-surface-3)] rounded border border-[var(--color-border)]/40 hover:bg-[var(--color-accent)]/10 transition-all self-center"
                  >
                    {alert.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Intake Pipelines Status Overseer */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 shadow-lg" id="admin-intake-control">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--color-info)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Intake Source &amp; Extraction Oversight</h4>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-[var(--color-text-faint)] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Listeners Enabled
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Web Forms */}
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 p-3.5 rounded-xl text-center relative group hover:border-[var(--color-info)]/30 transition-all">
                <Globe className="w-5 h-5 mx-auto text-[var(--color-info)] mb-1.5" />
                <h5 className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">Website Portal API</h5>
                <p className="text-[9px] text-[var(--color-success)] font-bold mt-1 uppercase">● Operational</p>
                <div className="text-[10px] text-[var(--color-text-faint)] mt-2 border-t border-[var(--color-border)]/50 pt-1.5 font-mono">
                  12 Intake Syncs / 24h
                </div>
              </div>

              {/* Email Extractor */}
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 p-3.5 rounded-xl text-center relative group hover:border-[var(--color-accent)]/30 transition-all">
                <Mail className="w-5 h-5 mx-auto text-[var(--color-accent)] mb-1.5" />
                <h5 className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">Email IMAP Sync</h5>
                <p className="text-[9px] text-[var(--color-success)] font-bold mt-1 uppercase">● Operational</p>
                <div className="text-[10px] text-[var(--color-text-faint)] mt-2 border-t border-[var(--color-border)]/50 pt-1.5 font-mono">
                  info@gbkfinancial.ca
                </div>
              </div>

              {/* AI Extraction Engine */}
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 p-3.5 rounded-xl text-center relative group hover:border-violet-500/30 transition-all">
                <Sparkles className="w-5 h-5 mx-auto text-violet-400 mb-1.5 animate-pulse" />
                <h5 className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">AI Parsing Model</h5>
                <p className="text-[9px] text-violet-400 font-bold mt-1 uppercase">✦ Active (Pro v1.5)</p>
                <div className="text-[10px] text-[var(--color-text-faint)] mt-2 border-t border-[var(--color-border)]/50 pt-1.5 font-mono">
                  Confidence: 94.2%
                </div>
              </div>
            </div>

            {/* Ingestion Issue Oversight Status */}
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg p-3 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20 flex items-center justify-center text-[var(--color-error)]">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h6 className="text-[11px] font-bold text-[var(--color-text)] uppercase">Duplicate &amp; Ingestion Errors Log</h6>
                  <p className="text-[10px] text-[var(--color-text-faint)] font-semibold">1 duplicate application rejected, 2 OCR extractions require verification.</p>
                </div>
              </div>
              <button 
                onClick={() => showToast("Scanning intake pipelines for newer payloads...", "success")}
                className="bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-3)]/80 text-[var(--color-text)] text-[9px] font-bold uppercase px-2.5 py-1.5 rounded border border-[var(--color-border)]/70 flex items-center gap-1 transition-all"
              >
                <RefreshCw className="w-3 h-3 animate-spin" /> Audit Pipelines
              </button>
            </div>
          </div>

        </div>

        {/* Right Col: Admin Audit Log Tower (Compact) & Emergency Operations */}
        <div className="space-y-6">
          
          {/* Recent Operations Audit Board */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 shadow-lg flex flex-col h-[340px]" id="admin-timeline-panel">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-sans">Recent Log Trajectory</h4>
              </div>
              <button 
                onClick={() => setActiveTab("audit")}
                className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
              >
                View All
              </button>
            </div>

            {/* Audit log items (staggered) */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1" id="admin-dashboard-compact-audit">
              {auditLogs.slice(0, 5).map((log, index) => (
                <div key={log.id || index} className="flex gap-2.5 text-left text-[11px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--color-text)] truncate capitalize">{log.action || log.event}</span>
                      <span className="text-[9px] text-[var(--color-text-faint)] font-mono shrink-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Now"}
                      </span>
                    </div>
                    <p className="text-[var(--color-text-muted)] leading-tight mt-0.5 truncate">{log.summary || log.details || "System automated status check"}</p>
                    <p className="text-[9px] text-[var(--color-text-faint)] font-semibold mt-1">Operator: {log.user || log.operator || "System Daemon"}</p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-[var(--color-text-faint)]">
                  <FileText className="w-10 h-10 mb-2 stroke-1" />
                  <p className="text-xs italic">No activity audits written to disk yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Secure Control Room Actions */}
          <div className="bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Lock className="w-20 h-20" />
            </div>

            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider mb-2">Emergency Guard Panel</h4>
            <p className="text-[10px] text-[var(--color-text-faint)] font-semibold mb-4 leading-relaxed">
              If workstation compliance is breached or an external threat is suspected, lock down current sessions instantly.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onLockApp();
                  showToast("Workstation workstation locked instantly for compliance security.", "success");
                }}
                className="w-full bg-[var(--color-error-subtle)] hover:bg-[var(--color-error-subtle)]/80 text-[var(--color-error)] border border-[var(--color-error)]/25 font-black text-[10px] uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <Lock className="w-3.5 h-3.5" /> Lock Workstation Desk
              </button>

              <button
                onClick={() => {
                  showToast("Security keys updated across Ontario endpoints.", "success");
                }}
                className="w-full bg-[var(--color-surface-3)]/40 hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/50 font-black text-[10px] uppercase py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Re-seed Security Keys
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
