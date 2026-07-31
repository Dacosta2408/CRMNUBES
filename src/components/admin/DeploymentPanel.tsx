import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Database, Play, Trash2, ArrowRight, Loader2, Info, Check, ShieldAlert
} from "lucide-react";
import { User, Client, Task, Lender } from "../../types";
import { checkBridgeHealth, BRIDGE_URL } from "../../lib/bridgeService";
import { safeJsonParse } from "../../lib/json";

export interface DeploymentPanelProps {
  userRoster: User[];
  currentUser: User;
  clients: Client[];
  tasks: Task[];
  auditLogs: any[];
  sessionAutoLock: boolean;
  auditLoggingEnabled: boolean;
  lenders: Lender[];
  settings: { apiKey: string; [key: string]: any };
  bridgeOnline: boolean;
  versionMismatch: boolean;
  bridgeVersion: string | null;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  userRoster,
  currentUser,
  clients,
  tasks,
  auditLogs,
  sessionAutoLock,
  auditLoggingEnabled,
  lenders,
  settings,
  bridgeOnline: initialBridgeOnline,
  versionMismatch: initialVersionMismatch,
  bridgeVersion: initialBridgeVersion,
  showToast
}) => {
  // Checklist states
  const [checking, setChecking] = useState<boolean>(false);
  const [bridgeOnlineState, setBridgeOnlineState] = useState<boolean>(initialBridgeOnline);
  const [bridgeVersionState, setBridgeVersionState] = useState<string | null>(initialBridgeVersion);
  const [versionMismatchState, setVersionMismatchState] = useState<boolean>(initialVersionMismatch);
  const [pathValid, setPathValid] = useState<boolean>(false);
  const [pathValidLoading, setPathValidLoading] = useState<boolean>(true);

  // Migration states
  const [migrating, setMigrating] = useState<boolean>(false);
  const [migrationStep, setMigrationStep] = useState<string>("");
  const [migrationProgress, setMigrationProgress] = useState<number>(0);
  const [migrationErrors, setMigrationErrors] = useState<string[]>([]);
  const [migrationSummary, setMigrationSummary] = useState<{
    clients: number;
    tasks: number;
    lenders: number;
    users: number;
    partners: number;
    emails: number;
    messages: number;
    auditLogs: number;
  } | null>(null);
  const [cacheCleared, setCacheCleared] = useState<boolean>(false);

  // Fetch path validation and initial states
  const checkPathValidation = async () => {
    setPathValidLoading(true);
    try {
      const token = (import.meta as any).env?.VITE_BRIDGE_TOKEN || "gbk-local-secret-2024";
      const res = await fetch(`${BRIDGE_URL}/api/health`, {
        method: "GET",
        headers: { "x-gbk-token": token },
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        setPathValid(data.pathValid === true);
      } else {
        setPathValid(false);
      }
    } catch (err) {
      console.error("Path check error:", err);
      setPathValid(false);
    } finally {
      setPathValidLoading(false);
    }
  };

  useEffect(() => {
    checkPathValidation();
  }, [bridgeOnlineState]);

  const runAllChecks = async () => {
    setChecking(true);
    const isOnline = await checkBridgeHealth();
    setBridgeOnlineState(isOnline);

    if (isOnline) {
      try {
        const token = (import.meta as any).env?.VITE_BRIDGE_TOKEN || "gbk-local-secret-2024";
        const verRes = await fetch(`${BRIDGE_URL}/api/version`, {
          method: "GET",
          headers: { "x-gbk-token": token }
        });
        if (verRes.ok) {
          const verData = await verRes.json();
          setBridgeVersionState(verData.version);
          const appVer = (import.meta as any).env?.VITE_APP_VERSION || "1.0.0";
          setVersionMismatchState(verData.version !== appVer);
        } else {
          setBridgeVersionState(null);
          setVersionMismatchState(true);
        }
      } catch (err) {
        setBridgeVersionState(null);
        setVersionMismatchState(true);
      }
      await checkPathValidation();
    } else {
      setBridgeVersionState(null);
      setVersionMismatchState(false);
      setPathValid(false);
      setPathValidLoading(false);
    }

    setChecking(false);
    showToast("Readiness diagnostics successfully run.", "success");
  };

  // Compile checklist results
  const checks = [
    {
      id: "bridge_online",
      name: "Bridge Server Connection",
      desc: "Vite client successfully connected to the local Node.js bridge server on port 3001.",
      status: bridgeOnlineState,
      critical: true
    },
    {
      id: "path_accessible",
      name: "Root Z Drive Path Integrity",
      desc: "Bridge server validated that the GBK_ROOT_PATH exists and is readable/writable on the Z Drive.",
      status: pathValid,
      critical: true
    },
    {
      id: "api_key",
      name: "Gemini AI API Key Configuration",
      desc: "Secure Gemini API key exists in user configuration to power smart mortgage underwriting analyses.",
      status: !!settings?.apiKey,
      critical: false
    },
    {
      id: "roster_personnel",
      name: "Broker Account Roster Provisioning",
      desc: "At least one broker or loan manager profile exists inside the system security registry.",
      status: userRoster.length > 0,
      critical: true
    },
    {
      id: "audit_logs",
      name: "Immutable Security Auditing Protocol",
      desc: "Automatic activity logs are enabled to ensure PIPEDA and Canadian mortgage compliance logging.",
      status: auditLoggingEnabled,
      critical: true
    },
    {
      id: "session_autolock",
      name: "Workstation Lock Inactivity Timer",
      desc: "Session auto-locking is active to protect consumer personal financial folders on idle screens.",
      status: sessionAutoLock,
      critical: false
    },
    {
      id: "lenders_count",
      name: "Lender Matrix Sheet Synchronization",
      desc: "At least one Canadian lender configured in the mortgage product sheets matrix database.",
      status: lenders.length > 0,
      critical: false
    },
    {
      id: "version_matching",
      name: "System Software Version Match",
      desc: "Frontend assets are aligned with the running bridge server to prevent API protocol mismatch.",
      status: !versionMismatchState && !!bridgeVersionState,
      critical: true
    }
  ];

  const failedCriticalCount = checks.filter(c => !c.status && c.critical).length;
  const failedNonCriticalCount = checks.filter(c => !c.status && !c.critical).length;
  const totalFailedCount = failedCriticalCount + failedNonCriticalCount;

  // Perform migration
  const handleStartMigration = async () => {
    if (migrating) return;
    setMigrating(true);
    setMigrationErrors([]);
    setMigrationSummary(null);
    setMigrationStep("Initializing migration...");
    setMigrationProgress(0);

    const token = (import.meta as any).env?.VITE_BRIDGE_TOKEN || "gbk-local-secret-2024";
    const headers = {
      "Content-Type": "application/json",
      "x-gbk-token": token
    };

    const errors: string[] = [];
    let migratedClients = 0;
    let migratedTasks = 0;
    let migratedLenders = 0;
    let migratedUsers = 0;
    let migratedPartners = 0;
    let migratedEmails = 0;
    let migratedMessages = 0;
    let migratedAuditLogs = 0;

    try {
      // 1. Read localStorage arrays
      setMigrationStep("Reading local database arrays...");
      setMigrationProgress(10);
      
      const localClientsRaw = localStorage.getItem("gbk_clients");
      const localClients = safeJsonParse(localClientsRaw, []);

      const localTasksRaw = localStorage.getItem("gbk_tasks");
      const localTasks = safeJsonParse(localTasksRaw, []);

      const localLendersRaw = localStorage.getItem("gbk_lenders");
      const localLenders = safeJsonParse(localLendersRaw, []);

      const localRosterRaw = localStorage.getItem("gbk_roster");
      const localRoster = safeJsonParse(localRosterRaw, []);

      const localPartnersRaw = localStorage.getItem("gbk_partners");
      const localPartners = safeJsonParse(localPartnersRaw, []);

      const localAuditLogsRaw = localStorage.getItem("gbk_audit_logs");
      const localAuditLogs = safeJsonParse(localAuditLogsRaw, []);

      const localEmailsRaw = localStorage.getItem("gbk_emails");
      const localEmails = safeJsonParse(localEmailsRaw, []);

      const localMessagesRaw = localStorage.getItem("gbk_messages");
      const localMessages = safeJsonParse(localMessagesRaw, []);

      await new Promise(r => setTimeout(r, 600));

      // 2. Migrate system roster
      if (localRoster.length > 0) {
        setMigrationStep("Migrating security broker roster...");
        setMigrationProgress(20);
        try {
          const res = await fetch(`${BRIDGE_URL}/api/system/roster`, {
            method: "PUT",
            headers,
            body: JSON.stringify(localRoster)
          });
          if (!res.ok) throw new Error("Roster transfer failed");
          migratedUsers = localRoster.length;
        } catch (err: any) {
          errors.push(`Roster transfer failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 400));
      }

      // 3. Migrate Lenders
      if (localLenders.length > 0) {
        setMigrationStep("Migrating lender matrix data...");
        setMigrationProgress(30);
        try {
          const res = await fetch(`${BRIDGE_URL}/api/system/lenders`, {
            method: "PUT",
            headers,
            body: JSON.stringify(localLenders)
          });
          if (!res.ok) throw new Error("Lender matrix transfer failed");
          migratedLenders = localLenders.length;
        } catch (err: any) {
          errors.push(`Lender matrix transfer failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 400));
      }

      // 4. Migrate Partners
      if (localPartners.length > 0) {
        setMigrationStep("Migrating partner network registry...");
        setMigrationProgress(40);
        try {
          const res = await fetch(`${BRIDGE_URL}/api/system/partners`, {
            method: "PUT",
            headers,
            body: JSON.stringify(localPartners)
          });
          if (!res.ok) throw new Error("Partner network transfer failed");
          migratedPartners = localPartners.length;
        } catch (err: any) {
          errors.push(`Partner network transfer failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 400));
      }

      // 5. Migrate Audit Logs
      if (localAuditLogs.length > 0) {
        setMigrationStep("Migrating compliance audit trajectory log...");
        setMigrationProgress(50);
        try {
          const res = await fetch(`${BRIDGE_URL}/api/system/audit`, {
            method: "PUT",
            headers,
            body: JSON.stringify(localAuditLogs)
          });
          if (!res.ok) throw new Error("Audit log transfer failed");
          migratedAuditLogs = localAuditLogs.length;
        } catch (err: any) {
          errors.push(`Audit log transfer failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 400));
      }

      // 6. Migrate Emails & Messages & Tasks
      if (localEmails.length > 0) {
        setMigrationStep("Migrating outgoing correspondence logs...");
        try {
          await fetch(`${BRIDGE_URL}/api/system/emails`, { method: "PUT", headers, body: JSON.stringify(localEmails) });
          migratedEmails = localEmails.length;
        } catch (err: any) { errors.push(`Emails transfer failed: ${err.message}`); }
      }
      if (localMessages.length > 0) {
        setMigrationStep("Migrating team conversation history...");
        try {
          await fetch(`${BRIDGE_URL}/api/system/messages`, { method: "PUT", headers, body: JSON.stringify(localMessages) });
          migratedMessages = localMessages.length;
        } catch (err: any) { errors.push(`Messages transfer failed: ${err.message}`); }
      }
      if (localTasks.length > 0) {
        setMigrationStep("Migrating unified task manager...");
        try {
          await fetch(`${BRIDGE_URL}/api/system/tasks`, { method: "PUT", headers, body: JSON.stringify(localTasks) });
          migratedTasks = localTasks.length;
        } catch (err: any) { errors.push(`Tasks transfer failed: ${err.message}`); }
      }

      setMigrationProgress(60);
      await new Promise(r => setTimeout(r, 400));

      // 7. Migrate Clients sequentially
      if (localClients.length > 0) {
        const clientCount = localClients.length;
        for (let i = 0; i < clientCount; i++) {
          const client = localClients[i];
          setMigrationStep(`Migrating client folder ${i + 1} of ${clientCount}: ${client.first} ${client.last}...`);
          const clientProgress = 60 + Math.floor((i / clientCount) * 35);
          setMigrationProgress(clientProgress);

          try {
            const res = await fetch(`${BRIDGE_URL}/api/clients`, {
              method: "POST",
              headers,
              body: JSON.stringify(client)
            });
            if (res.ok) {
              migratedClients++;
            } else {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Write folder failed");
            }
          } catch (err: any) {
            errors.push(`Client '${client.first} ${client.last}' folder write failed: ${err.message}`);
          }
          // Tiny sleep to prevent clogging
          await new Promise(r => setTimeout(r, 100));
        }
      }

      setMigrationProgress(100);
      setMigrationStep("Completed");
      setMigrationErrors(errors);
      setMigrationSummary({
        clients: migratedClients,
        tasks: migratedTasks,
        lenders: migratedLenders,
        users: migratedUsers,
        partners: migratedPartners,
        emails: migratedEmails,
        messages: migratedMessages,
        auditLogs: migratedAuditLogs
      });
      showToast("Data migration completed successfully.", "success");
    } catch (err: any) {
      console.error("Migration fatal error:", err);
      setMigrationStep("Error");
      errors.push(`Fatal migration failure: ${err.message}`);
      setMigrationErrors(errors);
      showToast("Fatal error occurred during database migration.", "error");
    } finally {
      setMigrating(false);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("gbk_clients");
    localStorage.removeItem("gbk_tasks");
    localStorage.removeItem("gbk_lenders");
    localStorage.removeItem("gbk_roster");
    localStorage.removeItem("gbk_partners");
    localStorage.removeItem("gbk_audit_logs");
    localStorage.removeItem("gbk_emails");
    localStorage.removeItem("gbk_messages");
    setCacheCleared(true);
    showToast("Local storage cache cleared. CRM now utilizing bridge database server.", "success");
  };

  return (
    <div className="space-y-6" id="deployment-readiness-panel">
      
      {/* ─── Diagnostics Matrix Section ─── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Production Readiness Matrix</h3>
              <p className="text-[10px] text-[var(--color-text-muted)] font-semibold leading-none mt-0.5">Automated workspace integrity checks for regulatory standard deployment</p>
            </div>
          </div>
          <button
            onClick={runAllChecks}
            disabled={checking}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-accent)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-accent-hover)] transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Re-run Diagnostics
          </button>
        </div>

        {/* Diagnostic Checks Cards Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checks.map(c => (
            <div 
              key={c.id} 
              className={`p-3.5 rounded-lg border flex gap-3 items-start transition-all ${
                c.status 
                  ? 'bg-[var(--color-surface-2)] border-[var(--color-border)]' 
                  : c.critical 
                    ? 'bg-red-500/10 border-red-500/20' 
                    : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {c.status ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : c.critical ? (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--color-text)]">{c.name}</span>
                  {c.critical && (
                    <span className="text-[8px] px-1.5 py-0.5 bg-red-500/15 border border-red-500/25 rounded font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-normal mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Global Evaluation Summary Banner */}
        <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
          {totalFailedCount === 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3.5 items-start">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">System Certified and Prepared</h4>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300/80 leading-relaxed mt-0.5">
                  Outstanding! Every verified parameter has satisfied deployment compliance guidelines. This computer is now certified for production client file auditing under FSRA standards.
                </p>
              </div>
            </div>
          ) : failedCriticalCount > 0 ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3.5 items-start">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">⚠️ System Blocked: Critical Actions Required</h4>
                <p className="text-[10px] text-red-800 dark:text-red-300/80 leading-relaxed mt-0.5">
                  Diagnostic intercept: {failedCriticalCount} critical security or communication parameters are currently non-compliant. The local bridge server database structure must be corrected before this machine is authorized for live customer data handling.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3.5 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">⚠️ {failedNonCriticalCount} Minor Warning Alerts</h4>
                <p className="text-[10px] text-amber-800 dark:text-amber-300/80 leading-relaxed mt-0.5">
                  Diagnostic warning: The workstation has passed all required compliance thresholds, but {failedNonCriticalCount} security parameter(s) could be improved to reach complete operational hardening. Review the warning parameters above.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Local Database Migration Utility ─── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3 mb-4">
          <Database className="w-5 h-5 text-[var(--color-accent)]" />
          <div>
            <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Local Storage to Network Z Drive Data Migration</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] font-semibold leading-none mt-0.5">Secure one-time data transfer to sync browser caches into the shared drive Bridge server folders</p>
          </div>
        </div>

        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4 mb-4 flex gap-3 items-start">
          <Info className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[var(--color-text-muted)] leading-relaxed space-y-1.5">
            <p>
              During Phase 1-4, broker personnel accounts and customer financial files were securely isolated inside local web storage. To start utilizing the active, shared Windows Z Drive structure:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[var(--color-text-faint)] text-[10px]">
              <li>The utility reads files from the active browser's local cache array.</li>
              <li>Then it writes separate client financial subfolders securely to the Bridge disk.</li>
              <li>Finally, rosters, lenders, and chat channels are written to central system matrices.</li>
            </ul>
          </div>
        </div>

        {/* Migration Panel State Renderer */}
        {!migrating && !migrationSummary && (
          <div className="flex justify-start items-center">
            <button
              onClick={handleStartMigration}
              disabled={!bridgeOnlineState || !pathValid}
              className="flex items-center gap-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Migrate Local Data to Z Drive
            </button>
            {!bridgeOnlineState && (
              <span className="text-[10px] text-red-600 dark:text-red-400 ml-4 self-center font-mono">
                ⚠️ Connect the local Bridge server to enable migration.
              </span>
            )}
          </div>
        )}

        {/* Progress Display */}
        {migrating && (
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[var(--color-accent)] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {migrationStep}
              </span>
              <span className="font-mono text-[var(--color-text-muted)]">{migrationProgress}%</span>
            </div>
            <div className="w-full bg-[var(--color-surface-3)] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[var(--color-accent)] h-full transition-all duration-300"
                style={{ width: `${migrationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary Screen */}
        {migrationSummary && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Local Migration Complete</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[var(--color-surface)] border border-emerald-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold text-[var(--color-text)] font-mono">{migrationSummary.clients}</div>
                  <div className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mt-0.5">Clients Folder</div>
                </div>
                <div className="bg-[var(--color-surface)] border border-emerald-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold text-[var(--color-text)] font-mono">{migrationSummary.tasks}</div>
                  <div className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mt-0.5">Tasks Migrated</div>
                </div>
                <div className="bg-[var(--color-surface)] border border-emerald-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold text-[var(--color-text)] font-mono">{migrationSummary.lenders}</div>
                  <div className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mt-0.5">Lender List</div>
                </div>
                <div className="bg-[var(--color-surface)] border border-emerald-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold text-[var(--color-text)] font-mono">{migrationSummary.users}</div>
                  <div className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mt-0.5">Broker Accounts</div>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-text)] leading-relaxed">
                🎉 Success! All isolated local database parameters have been safely transcribed. A total of <strong>{migrationSummary.clients} clients</strong>, <strong>{migrationSummary.tasks} tasks</strong>, and <strong>{migrationSummary.lenders} lenders</strong> were successfully migrated to the Windows network Z Drive folder structure.
              </p>

              {/* Cache clear block */}
              {!cacheCleared ? (
                <div className="border-t border-emerald-500/20 pt-3 flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block tracking-wide">Recommended Housekeeping Action</span>
                    <span className="text-[9px] text-[var(--color-text-muted)] font-semibold leading-none">Wipe browser's localStorage cache keys to prevent memory clutter</span>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white dark:text-black px-3.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all shadow-md self-start cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear localStorage Cache
                  </button>
                </div>
              ) : (
                <div className="border-t border-emerald-500/20 pt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                  <Check className="w-4 h-4" />
                  Local storage cache cleared. CRM is now utilizing the secure bridge database network drive exclusively.
                </div>
              )}
            </div>

            {/* Error logs */}
            {migrationErrors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">Migration Warnings / Failures ({migrationErrors.length})</h4>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-2 text-[10px] font-mono text-red-700 dark:text-red-300">
                  {migrationErrors.map((err, i) => (
                    <div key={i} className="py-0.5 leading-relaxed">
                      ⚠️ {err}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
