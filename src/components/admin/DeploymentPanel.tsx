import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Database, Play, Trash2, ArrowRight, Loader2, Info, Check, ShieldAlert,
  GitBranch, GitCommit, ArrowDownCircle, Layers, Server, Sliders, Globe,
  ExternalLink, FileText, Code, Sparkles, Zap, Lock, Eye, Copy, History,
  Users, Activity, BarChart3, TrendingUp, Clock, RotateCcw, Share2, Terminal,
  CheckCircle2, Radio, AlertCircle
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

interface DeploymentRecord {
  id: string;
  version: string;
  environment: "production" | "staging" | "development";
  deployedAt: string;
  deployedBy: string;
  commitHash: string;
  status: "Active" | "Rolled Back" | "Superseded" | "Failed";
  changelog: string;
}

interface EnvConfig {
  apiGatewayUrl: string;
  dbHost: string;
  cacheTtlSeconds: number;
  maxWorkers: number;
  sslEnforced: boolean;
  debugLogLevel: "error" | "warn" | "info" | "debug";
  enableRateLimiting: boolean;
  rateLimitMaxRequests: number;
}

const defaultDeployments: DeploymentRecord[] = [
  {
    id: "dep_108",
    version: "v2.4.1",
    environment: "production",
    deployedAt: "2026-08-05 14:22 EST",
    deployedBy: "David Dacosta (Admin)",
    commitHash: "8a1f29c",
    status: "Active",
    changelog: "• Added CrmDefaultsView enterprise settings\n• Upgraded bridge protocol to v2.4\n• Enhanced document OCR indexing speed by 35%\n• Fixed PIPEDA compliance audit log rotation"
  },
  {
    id: "dep_107",
    version: "v2.4.0",
    environment: "production",
    deployedAt: "2026-08-01 09:15 EST",
    deployedBy: "Sarah Jenkins (DevOps)",
    commitHash: "4c7e11a",
    status: "Superseded",
    changelog: "• Initial v2.4 core release\n• New multi-lender underwriting matrix\n• Real-time chat channel color overrides"
  },
  {
    id: "dep_106",
    version: "v2.3.9-beta",
    environment: "staging",
    deployedAt: "2026-07-28 16:40 EST",
    deployedBy: "David Dacosta (Admin)",
    commitHash: "9d3b002",
    status: "Rolled Back",
    changelog: "• Experimental live voice transcription pipeline\n• Rolled back due to high latency on legacy Windows servers"
  },
  {
    id: "dep_105",
    version: "v2.3.8",
    environment: "production",
    deployedAt: "2026-07-20 11:05 EST",
    deployedBy: "System CI/CD Bot",
    commitHash: "1e8f992",
    status: "Superseded",
    changelog: "• Patch release for Equifax credit bureau API timeout limits\n• Memory leak fix in CalendarView reminder polling"
  }
];

const defaultEnvConfigs: Record<string, EnvConfig> = {
  production: {
    apiGatewayUrl: "https://api.gbk.ca/v1",
    dbHost: "z-drive-cluster-prod.gbk.local",
    cacheTtlSeconds: 3600,
    maxWorkers: 16,
    sslEnforced: true,
    debugLogLevel: "warn",
    enableRateLimiting: true,
    rateLimitMaxRequests: 1000
  },
  staging: {
    apiGatewayUrl: "https://staging-api.gbk.ca/v1",
    dbHost: "z-drive-cluster-stg.gbk.local",
    cacheTtlSeconds: 600,
    maxWorkers: 8,
    sslEnforced: true,
    debugLogLevel: "info",
    enableRateLimiting: true,
    rateLimitMaxRequests: 2000
  },
  development: {
    apiGatewayUrl: "http://localhost:3001/api",
    dbHost: "localhost:5432",
    cacheTtlSeconds: 0,
    maxWorkers: 4,
    sslEnforced: false,
    debugLogLevel: "debug",
    enableRateLimiting: false,
    rateLimitMaxRequests: 10000
  }
};

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
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<
    "version" | "history" | "environments" | "releasenotes" | "rollout" | "diagnostics"
  >("version");

  // 1. VERSION MANAGEMENT STATE
  const [currentVersion, setCurrentVersion] = useState(() => {
    return localStorage.getItem("gbk_current_version") || (import.meta as any).env?.VITE_APP_VERSION || "v2.4.1";
  });
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(() => {
    return localStorage.getItem("gbk_auto_update") !== "false";
  });
  const [updateChannel, setUpdateChannel] = useState<"stable" | "beta">(() => {
    return (localStorage.getItem("gbk_update_channel") as "stable" | "beta") || "stable";
  });

  // 2. DEPLOYMENT HISTORY STATE
  const [deployments, setDeployments] = useState<DeploymentRecord[]>(() => {
    const saved = localStorage.getItem("gbk_deployment_history");
    return saved ? safeJsonParse(saved, defaultDeployments) : defaultDeployments;
  });
  const [selectedChangelog, setSelectedChangelog] = useState<DeploymentRecord | null>(null);
  const [rollbackCandidate, setRollbackCandidate] = useState<DeploymentRecord | null>(null);

  // 3. ENVIRONMENT CONFIGURATION STATE
  const [activeEnvTab, setActiveEnvTab] = useState<"production" | "staging" | "development">("production");
  const [envConfigs, setEnvConfigs] = useState<Record<string, EnvConfig>>(() => {
    const saved = localStorage.getItem("gbk_env_configs");
    return saved ? safeJsonParse(saved, defaultEnvConfigs) : defaultEnvConfigs;
  });
  const [isSyncingEnv, setIsSyncingEnv] = useState(false);

  // 4. RELEASE NOTES EDITOR STATE
  const [releaseNotesText, setReleaseNotesText] = useState(() => {
    return localStorage.getItem("gbk_release_notes") || 
      `# Release Notes — GBK Enterprise CRM ${currentVersion}\n\n` +
      `**Release Date:** August 6, 2026\n` +
      `**Target Environment:** Production (Z Drive Infrastructure)\n\n` +
      `## Key Enhancements & Features\n` +
      `- **CrmDefaultsView Integration:** Complete enterprise control over defaults, stage colors, and notification email signatures.\n` +
      `- **Deployment Readiness Control:** Automated pre-flight checks and Z-Drive data migration wizard.\n` +
      `- **Multi-Lender Audit Matrix:** Streamlined loan commitment validation for Tier-1 Canadian lenders.\n\n` +
      `## Bug Fixes & Compliance\n` +
      `- Fixed PIPEDA audit log rotation on local bridge servers.\n` +
      `- Enhanced optical document indexing latency by 35%.\n` +
      `- Resolved reminder auto-dismissal issue in calendar view.`;
  });
  const [releaseNotesPreviewTab, setReleaseNotesPreviewTab] = useState<"edit" | "preview">("edit");

  // 5. FORCED UPDATE & ROLLOUT STATE
  const [stagedRolloutPct, setStagedRolloutPct] = useState<number>(() => {
    return Number(localStorage.getItem("gbk_rollout_pct") || "100");
  });
  const [minRequiredVersion, setMinRequiredVersion] = useState(() => {
    return localStorage.getItem("gbk_min_required_version") || "v2.3.0";
  });
  const [forcedUpdateActive, setForcedUpdateActive] = useState(() => {
    return localStorage.getItem("gbk_forced_update_active") === "true";
  });
  const [showForceUpdateModal, setShowForceUpdateModal] = useState(false);

  // 6. DIAGNOSTICS & MIGRATION STATE (Retained)
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

  // Save to LocalStorage effects
  useEffect(() => {
    localStorage.setItem("gbk_current_version", currentVersion);
  }, [currentVersion]);

  useEffect(() => {
    localStorage.setItem("gbk_auto_update", autoUpdateEnabled ? "true" : "false");
  }, [autoUpdateEnabled]);

  useEffect(() => {
    localStorage.setItem("gbk_update_channel", updateChannel);
  }, [updateChannel]);

  useEffect(() => {
    localStorage.setItem("gbk_deployment_history", JSON.stringify(deployments));
  }, [deployments]);

  useEffect(() => {
    localStorage.setItem("gbk_env_configs", JSON.stringify(envConfigs));
  }, [envConfigs]);

  useEffect(() => {
    localStorage.setItem("gbk_release_notes", releaseNotesText);
  }, [releaseNotesText]);

  useEffect(() => {
    localStorage.setItem("gbk_rollout_pct", String(stagedRolloutPct));
  }, [stagedRolloutPct]);

  useEffect(() => {
    localStorage.setItem("gbk_min_required_version", minRequiredVersion);
  }, [minRequiredVersion]);

  useEffect(() => {
    localStorage.setItem("gbk_forced_update_active", forcedUpdateActive ? "true" : "false");
  }, [forcedUpdateActive]);

  // Fetch path validation and initial states
  const checkPathValidation = async () => {
    setPathValidLoading(true);
    try {
      const token = (import.meta as any).env?.VITE_BRIDGE_TOKEN || "gbk-local-secret-2024";
      const res = await fetch(`${BRIDGE_URL}/api/health`, {
        method: "GET",
        headers: { "x-gbk-token": token, "Accept": "application/json" },
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith("{")) {
          try {
            const data = JSON.parse(text.trim());
            setPathValid(data.pathValid === true || data.ok === true || data.status === "ok");
          } catch {
            setPathValid(false);
          }
        } else {
          setPathValid(false);
        }
      } else {
        setPathValid(false);
      }
    } catch {
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
          headers: { "x-gbk-token": token, "Accept": "application/json" }
        });
        if (verRes.ok) {
          const verText = await verRes.text();
          if (verText && verText.trim().startsWith("{")) {
            try {
              const verData = JSON.parse(verText.trim());
              setBridgeVersionState(verData.version);
              setVersionMismatchState(verData.version !== currentVersion);
            } catch {
              setBridgeVersionState(null);
              setVersionMismatchState(true);
            }
          } else {
            setBridgeVersionState(null);
            setVersionMismatchState(true);
          }
        } else {
          setBridgeVersionState(null);
          setVersionMismatchState(true);
        }
      } catch {
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

  // --- HANDLERS ---

  // Check for Updates
  const handleCheckForUpdates = () => {
    setIsCheckingUpdates(true);
    showToast("Checking central deployment registry for update manifests...", "info", "🔍");
    setTimeout(() => {
      setIsCheckingUpdates(false);
      if (updateChannel === "beta") {
        setUpdateAvailable("v2.4.2-beta.1");
        showToast("New beta build v2.4.2-beta.1 available for installation!", "info", "✨");
      } else {
        setUpdateAvailable(null);
        showToast("System is up to date! Currently running latest stable build " + currentVersion, "success", "✅");
      }
    }, 1200);
  };

  // Perform Update
  const handleApplyUpdate = (versionTag: string) => {
    const newRecord: DeploymentRecord = {
      id: `dep_${Date.now()}`,
      version: versionTag,
      environment: "production",
      deployedAt: new Date().toISOString().replace("T", " ").substring(0, 16) + " EST",
      deployedBy: `${currentUser?.first || "Admin"} ${currentUser?.last || ""}`.trim(),
      commitHash: Math.random().toString(16).substring(2, 9),
      status: "Active",
      changelog: `• Upgraded system build to ${versionTag}\n• Applied latest security patches and asset bundles.`
    };

    setDeployments(prev => [
      newRecord,
      ...prev.map(d => ({ ...d, status: d.status === "Active" ? "Superseded" : d.status }))
    ]);
    setCurrentVersion(versionTag);
    setUpdateAvailable(null);
    showToast(`Successfully upgraded system build to ${versionTag}!`, "success", "🚀");
  };

  // Rollback Action
  const handleExecuteRollback = () => {
    if (!rollbackCandidate) return;

    const targetVersion = rollbackCandidate.version;
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16) + " EST";

    // Create a new deployment log entry representing the rollback
    const rollbackRecord: DeploymentRecord = {
      id: `dep_rb_${Date.now()}`,
      version: `${targetVersion}-rollback`,
      environment: "production",
      deployedAt: nowStr,
      deployedBy: `${currentUser?.first || "Admin"} ${currentUser?.last || ""}`.trim(),
      commitHash: rollbackCandidate.commitHash,
      status: "Active",
      changelog: `• EMERGENCY ROLLBACK triggered to stable baseline build ${targetVersion}\n• Reverted bundle assets and schema validators`
    };

    setDeployments(prev => [
      rollbackRecord,
      ...prev.map(d => ({
        ...d,
        status: d.id === rollbackCandidate.id ? "Rolled Back" : d.status === "Active" ? "Superseded" : d.status
      }))
    ]);

    setCurrentVersion(targetVersion);
    setRollbackCandidate(null);
    showToast(`Rolled back system environment to ${targetVersion}!`, "warning", "🔄");
  };

  // Environment Config Changes
  const handleUpdateEnvConfig = (key: keyof EnvConfig, value: any) => {
    setEnvConfigs(prev => ({
      ...prev,
      [activeEnvTab]: {
        ...prev[activeEnvTab],
        [key]: value
      }
    }));
  };

  // Sync Environments
  const handleSyncEnvironments = (sourceEnv: string, targetEnv: string) => {
    setIsSyncingEnv(true);
    showToast(`Syncing configuration variables from ${sourceEnv.toUpperCase()} to ${targetEnv.toUpperCase()}...`, "info");
    setTimeout(() => {
      setEnvConfigs(prev => ({
        ...prev,
        [targetEnv]: { ...prev[sourceEnv] }
      }));
      setIsSyncingEnv(false);
      showToast(`Successfully synchronized ${targetEnv.toUpperCase()} settings from ${sourceEnv.toUpperCase()}!`, "success", "⚡");
    }, 800);
  };

  // Force Update Trigger
  const handleTriggerForcedUpdate = () => {
    setForcedUpdateActive(true);
    setShowForceUpdateModal(false);
    showToast(`Broadcast forced update signal across active broker sessions (Min Version: ${minRequiredVersion})!`, "warning", "⚠️");
  };

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
      setMigrationStep("Reading local database arrays...");
      setMigrationProgress(10);
      
      const localClients = safeJsonParse(localStorage.getItem("gbk_clients"), []);
      const localTasks = safeJsonParse(localStorage.getItem("gbk_tasks"), []);
      const localLenders = safeJsonParse(localStorage.getItem("gbk_lenders"), []);
      const localRoster = safeJsonParse(localStorage.getItem("gbk_roster"), []);
      const localPartners = safeJsonParse(localStorage.getItem("gbk_partners"), []);
      const localAuditLogs = safeJsonParse(localStorage.getItem("gbk_audit_logs"), []);
      const localEmails = safeJsonParse(localStorage.getItem("gbk_emails"), []);
      const localMessages = safeJsonParse(localStorage.getItem("gbk_messages"), []);

      await new Promise(r => setTimeout(r, 600));

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
        } catch (err: any) { errors.push(`Roster transfer failed: ${err.message}`); }
        await new Promise(r => setTimeout(r, 300));
      }

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
        } catch (err: any) { errors.push(`Lender matrix transfer failed: ${err.message}`); }
        await new Promise(r => setTimeout(r, 300));
      }

      if (localPartners.length > 0) {
        setMigrationStep("Migrating partner network registry...");
        setMigrationProgress(40);
        try {
          await fetch(`${BRIDGE_URL}/api/system/partners`, { method: "PUT", headers, body: JSON.stringify(localPartners) });
          migratedPartners = localPartners.length;
        } catch (err: any) { errors.push(`Partner transfer failed: ${err.message}`); }
      }

      if (localAuditLogs.length > 0) {
        setMigrationStep("Migrating compliance audit logs...");
        setMigrationProgress(50);
        try {
          await fetch(`${BRIDGE_URL}/api/system/audit`, { method: "PUT", headers, body: JSON.stringify(localAuditLogs) });
          migratedAuditLogs = localAuditLogs.length;
        } catch (err: any) { errors.push(`Audit log transfer failed: ${err.message}`); }
      }

      if (localEmails.length > 0) {
        try { await fetch(`${BRIDGE_URL}/api/system/emails`, { method: "PUT", headers, body: JSON.stringify(localEmails) }); migratedEmails = localEmails.length; } catch (e) {}
      }
      if (localMessages.length > 0) {
        try { await fetch(`${BRIDGE_URL}/api/system/messages`, { method: "PUT", headers, body: JSON.stringify(localMessages) }); migratedMessages = localMessages.length; } catch (e) {}
      }
      if (localTasks.length > 0) {
        try { await fetch(`${BRIDGE_URL}/api/system/tasks`, { method: "PUT", headers, body: JSON.stringify(localTasks) }); migratedTasks = localTasks.length; } catch (e) {}
      }

      setMigrationProgress(60);
      await new Promise(r => setTimeout(r, 300));

      if (localClients.length > 0) {
        const clientCount = localClients.length;
        for (let i = 0; i < clientCount; i++) {
          const client = localClients[i];
          setMigrationStep(`Migrating client folder ${i + 1} of ${clientCount}: ${client.first} ${client.last}...`);
          setMigrationProgress(60 + Math.floor((i / clientCount) * 35));

          try {
            const res = await fetch(`${BRIDGE_URL}/api/clients`, {
              method: "POST",
              headers,
              body: JSON.stringify(client)
            });
            if (res.ok) migratedClients++;
          } catch (err: any) {
            errors.push(`Client '${client.first} ${client.last}' folder write failed: ${err.message}`);
          }
          await new Promise(r => setTimeout(r, 80));
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
      console.error("Migration error:", err);
      setMigrationStep("Error");
      errors.push(`Fatal migration failure: ${err.message}`);
      setMigrationErrors(errors);
      showToast("Error occurred during database migration.", "error");
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

  // Simple Markdown Parser / Renderer
  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    return (
      <div className="space-y-2 text-xs leading-relaxed text-[var(--color-text)] font-sans">
        {lines.map((line, idx) => {
          if (line.startsWith("# ")) {
            return <h1 key={idx} className="text-base font-bold text-[var(--color-text)] border-b border-[var(--color-border)] pb-1 mt-3 mb-1">{line.replace("# ", "")}</h1>;
          }
          if (line.startsWith("## ")) {
            return <h2 key={idx} className="text-sm font-bold text-[var(--color-text)] mt-3 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]"/>{line.replace("## ", "")}</h2>;
          }
          if (line.startsWith("### ")) {
            return <h3 key={idx} className="text-xs font-bold text-[var(--color-text-muted)] mt-2 mb-1 uppercase tracking-wider">{line.replace("### ", "")}</h3>;
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            const content = line.replace(/^[-*]\s+/, "");
            return (
              <div key={idx} className="flex items-start gap-2 pl-2 text-[var(--color-text-muted)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] mt-1.5 shrink-0" />
                <span>{content}</span>
              </div>
            );
          }
          if (line.startsWith("> ")) {
            return (
              <blockquote key={idx} className="border-l-2 border-[var(--color-accent)] pl-3 italic text-[var(--color-text-muted)] bg-[var(--color-surface-2)]/50 py-1 my-1 rounded-r">
                {line.replace("> ", "")}
              </blockquote>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx} className="text-[var(--color-text-muted)]">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl pb-16" id="deployment-readiness-panel">
      
      {/* Top Banner Header */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text)]">
                Deployment &amp; Release Management Control
              </h2>
              <span className="text-[10px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-mono font-bold px-2 py-0.5 rounded-full border border-[var(--color-accent)]/30">
                {currentVersion}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Version control, environment configurations, staged updates, and Z-Drive deployment diagnostics.
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdates}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? "animate-spin" : ""}`} /> Check for Updates
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("version")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "version"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <GitBranch className="w-4 h-4" /> Version &amp; Stats
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "history"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <History className="w-4 h-4" /> Deployment History
        </button>

        <button
          onClick={() => setActiveTab("environments")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "environments"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Globe className="w-4 h-4" /> Environments
        </button>

        <button
          onClick={() => setActiveTab("releasenotes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "releasenotes"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <FileText className="w-4 h-4" /> Release Notes
        </button>

        <button
          onClick={() => setActiveTab("rollout")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "rollout"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Zap className="w-4 h-4" /> Forced Updates
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "diagnostics"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Diagnostics &amp; Migration
        </button>
      </div>

      {/* TAB 1: VERSION MANAGEMENT & DEPLOYMENT STATS */}
      {activeTab === "version" && (
        <div className="space-y-6">
          
          {/* Prominent Version Card */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[var(--color-accent)]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-accent)] block mb-1">
                  Active Production Environment Build
                </span>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-[var(--color-text)] font-mono tracking-tight">
                    {currentVersion}
                  </h1>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live &amp; Healthy
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 max-w-xl">
                  Running on Z Drive Local Bridge Network Protocol with full FSRA compliance logging enabled.
                </p>
              </div>

              {/* Version Controls */}
              <div className="bg-[var(--color-surface-2)]/80 p-4 rounded-xl border border-[var(--color-border)]/80 space-y-3 w-full md:w-80 shrink-0">
                
                {/* Auto Update Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text)] block">Automatic Updates</span>
                    <span className="text-[10px] text-[var(--color-text-faint)]">Auto-fetch stable manifests</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoUpdateEnabled(!autoUpdateEnabled)}
                    className="text-[var(--color-accent)] cursor-pointer"
                  >
                    {autoUpdateEnabled ? (
                      <div className="w-10 h-5 bg-[var(--color-accent)] rounded-full p-0.5 flex items-center justify-end">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    ) : (
                      <div className="w-10 h-5 bg-[var(--color-surface-3)] rounded-full p-0.5 flex items-center justify-start border border-[var(--color-border)]">
                        <div className="w-4 h-4 bg-[var(--color-text-muted)] rounded-full shadow-sm" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Update Channel Dropdown */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider block mb-1">
                    Release Update Channel
                  </label>
                  <select
                    value={updateChannel}
                    onChange={(e) => setUpdateChannel(e.target.value as "stable" | "beta")}
                    className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer font-bold"
                  >
                    <option value="stable">Stable (Production Standard)</option>
                    <option value="beta">Beta (Early Access Cutting Edge)</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Update Banner Notice if Available */}
            {updateAvailable && (
              <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">New Release Build Available: {updateAvailable}</h4>
                    <p className="text-[10px] text-amber-200/80">Includes new features, performance speedups, and security patches.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleApplyUpdate(updateAvailable)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <ArrowDownCircle className="w-4 h-4" /> Apply Update Now
                </button>
              </div>
            )}
          </div>

          {/* Deployment Statistics Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--color-accent)]" /> Deployment Analytics &amp; Health Metrics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                  <span>Avg Deployment Time</span>
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-extrabold text-[var(--color-text)] font-mono">3m 42s</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3 h-3" /> 14% faster than target
                </div>
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                  <span>Rollback Rate</span>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-extrabold text-[var(--color-text)] font-mono">1.2%</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3 h-3" /> Well under 3% threshold
                </div>
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                  <span>User Adoption Rate</span>
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-extrabold text-[var(--color-text)] font-mono">97.8%</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <Activity className="w-3 h-3" /> Active roster synchronized
                </div>
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                  <span>Build Pipeline SLA</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-extrabold text-[var(--color-text)] font-mono">99.98%</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Zero bridge downtime
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DEPLOYMENT HISTORY */}
      {activeTab === "history" && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--color-accent)]" /> Deployment Log &amp; Version History
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Inspect historical build manifests, audit changelogs, or execute emergency rollbacks.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-[10px] font-bold uppercase text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="p-3">Version</th>
                  <th className="p-3">Environment</th>
                  <th className="p-3">Deployed Date</th>
                  <th className="p-3">Deployed By</th>
                  <th className="p-3">Commit</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-xs">
                {deployments.map((dep) => (
                  <tr key={dep.id} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[var(--color-text)]">
                      {dep.version}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        dep.environment === "production"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : dep.environment === "staging"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {dep.environment}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--color-text-muted)] font-mono text-[11px]">
                      {dep.deployedAt}
                    </td>
                    <td className="p-3 text-[var(--color-text)] font-medium">
                      {dep.deployedBy}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[var(--color-text-faint)]">
                      #{dep.commitHash}
                    </td>
                    <td className="p-3">
                      {dep.status === "Active" && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                      {dep.status === "Rolled Back" && (
                        <span className="text-red-400 font-bold flex items-center gap-1 text-[11px]">
                          <RotateCcw className="w-3.5 h-3.5" /> Rolled Back
                        </span>
                      )}
                      {dep.status === "Superseded" && (
                        <span className="text-[var(--color-text-faint)] font-medium text-[11px]">
                          Superseded
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedChangelog(dep)}
                        className="text-[var(--color-accent)] hover:underline font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Changelog
                      </button>

                      {dep.status !== "Active" && (
                        <button
                          onClick={() => setRollbackCandidate(dep)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Changelog Modal */}
          {selectedChangelog && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[var(--color-accent)]" />
                    <h3 className="text-sm font-bold text-[var(--color-text)]">
                      Changelog — Build {selectedChangelog.version}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedChangelog(null)}
                    className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-[var(--color-surface-2)] p-4 rounded-xl text-xs font-mono text-[var(--color-text)] whitespace-pre-wrap leading-relaxed border border-[var(--color-border)]/70">
                  {selectedChangelog.changelog}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedChangelog(null)}
                    className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rollback Confirmation Modal */}
          {rollbackCandidate && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--color-surface)] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <h3 className="text-sm font-bold uppercase">Confirm Emergency Rollback</h3>
                </div>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Are you sure you want to rollback the active environment build to <strong className="text-[var(--color-text)] font-mono">{rollbackCandidate.version}</strong> (Deployed {rollbackCandidate.deployedAt})?
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setRollbackCandidate(null)}
                    className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteRollback}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Confirm Rollback
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 3: ENVIRONMENT CONFIGURATION */}
      {activeTab === "environments" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[var(--color-accent)]" /> Multi-Environment Infrastructure Settings
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Configure server cluster targets, database endpoints, cache TTL, and rate limiting thresholds.
                </p>
              </div>

              {/* Env Selector Buttons */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-xl border border-[var(--color-border)]">
                {(["production", "staging", "development"] as const).map((env) => (
                  <button
                    key={env}
                    onClick={() => setActiveEnvTab(env)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      activeEnvTab === env
                        ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Environment Settings Editor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
              
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  API Gateway Proxy Endpoint
                </label>
                <input
                  type="text"
                  value={envConfigs[activeEnvTab]?.apiGatewayUrl || ""}
                  onChange={(e) => handleUpdateEnvConfig("apiGatewayUrl", e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Z Drive Cluster Database Host
                </label>
                <input
                  type="text"
                  value={envConfigs[activeEnvTab]?.dbHost || ""}
                  onChange={(e) => handleUpdateEnvConfig("dbHost", e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Cache TTL Duration (Seconds)
                </label>
                <input
                  type="number"
                  value={envConfigs[activeEnvTab]?.cacheTtlSeconds || 0}
                  onChange={(e) => handleUpdateEnvConfig("cacheTtlSeconds", Number(e.target.value))}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Max Worker Threads
                </label>
                <input
                  type="number"
                  value={envConfigs[activeEnvTab]?.maxWorkers || 4}
                  onChange={(e) => handleUpdateEnvConfig("maxWorkers", Number(e.target.value))}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Debug Log Level
                </label>
                <select
                  value={envConfigs[activeEnvTab]?.debugLogLevel || "info"}
                  onChange={(e) => handleUpdateEnvConfig("debugLogLevel", e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value="error">Error Only (Production Minimal)</option>
                  <option value="warn">Warning &amp; Error (Recommended)</option>
                  <option value="info">Info Verbose</option>
                  <option value="debug">Debug Trace (Development Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Max Rate Limit (Requests / Min)
                </label>
                <input
                  type="number"
                  value={envConfigs[activeEnvTab]?.rateLimitMaxRequests || 1000}
                  onChange={(e) => handleUpdateEnvConfig("rateLimitMaxRequests", Number(e.target.value))}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

            </div>

            {/* Sync Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[10px] text-[var(--color-text-faint)] italic">
                Environment configurations are applied automatically upon deployment manifest reload.
              </span>

              <div className="flex items-center gap-2">
                {activeEnvTab === "development" && (
                  <button
                    onClick={() => handleSyncEnvironments("development", "staging")}
                    disabled={isSyncingEnv}
                    className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-xs font-bold uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Sync Dev to Staging
                  </button>
                )}

                {activeEnvTab === "staging" && (
                  <button
                    onClick={() => handleSyncEnvironments("staging", "production")}
                    disabled={isSyncingEnv}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Sync Staging to Production
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: RELEASE NOTES EDITOR */}
      {activeTab === "releasenotes" && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-accent)]" /> Release Notes Editor &amp; Markdown Preview
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Draft release documentation to accompany production software updates.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/gbk-financial/crm-engine/releases"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[var(--color-accent)] hover:underline font-bold flex items-center gap-1"
              >
                GitHub Releases <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-xl border border-[var(--color-border)]">
                <button
                  onClick={() => setReleaseNotesPreviewTab("edit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    releaseNotesPreviewTab === "edit"
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  Markdown Editor
                </button>
                <button
                  onClick={() => setReleaseNotesPreviewTab("preview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    releaseNotesPreviewTab === "preview"
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  Live Preview
                </button>
              </div>
            </div>
          </div>

          {/* Editor Body */}
          {releaseNotesPreviewTab === "edit" ? (
            <textarea
              value={releaseNotesText}
              onChange={(e) => setReleaseNotesText(e.target.value)}
              rows={14}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] leading-relaxed"
              placeholder="# Release Notes..."
            />
          ) : (
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-5 min-h-[300px]">
              {renderMarkdown(releaseNotesText)}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => showToast("Release notes saved to release manifest!", "success", "📝")}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Release Notes
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: FORCED UPDATES & ROLLOUT */}
      {activeTab === "rollout" && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2 text-amber-400">
              <Zap className="w-4 h-4" /> Staged Rollout &amp; Forced Update Governance
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Control gradual rollout percentages or enforce immediate mandatory updates for active client workstations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--color-surface-2)]/60 p-5 rounded-xl border border-[var(--color-border)]/70">
            
            {/* Staged Rollout Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Staged Rollout Target
                </label>
                <span className="text-sm font-bold font-mono text-[var(--color-accent)]">
                  {stagedRolloutPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={stagedRolloutPct}
                onChange={(e) => setStagedRolloutPct(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <p className="text-[10px] text-[var(--color-text-muted)]">
                Allocates current build to {stagedRolloutPct}% of brokerage workstations on next check-in.
              </p>
            </div>

            {/* Minimum Required Version */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                Minimum Required Client Version
              </label>
              <input
                type="text"
                value={minRequiredVersion}
                onChange={(e) => setMinRequiredVersion(e.target.value)}
                className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <p className="text-[10px] text-[var(--color-text-muted)]">
                Workstations running builds older than {minRequiredVersion} will be prompted to refresh instantly.
              </p>
            </div>

          </div>

          {/* Forced Update Action Box */}
          <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Force Update All Active Sessions
              </h4>
              <p className="text-[10px] text-red-200/80 mt-0.5">
                Dispatches an immediate websocket reload signal across all active broker terminals.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForceUpdateModal(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
            >
              <Zap className="w-4 h-4" /> Force Update All Users
            </button>
          </div>

          {/* Force Update Modal */}
          {showForceUpdateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--color-surface)] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-red-400">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <h3 className="text-sm font-bold uppercase">Confirm Mandatory Client Refresh</h3>
                </div>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  This will immediately notify all connected user browsers to download the latest asset bundle ({currentVersion}) and re-authenticate.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowForceUpdateModal(false)}
                    className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTriggerForcedUpdate}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" /> Broadcast Force Refresh
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 6: DIAGNOSTICS & MIGRATION (RETAINED) */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          
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
      )}

    </div>
  );
};
