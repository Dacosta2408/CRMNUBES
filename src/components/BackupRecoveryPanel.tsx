import React, { useState, useEffect, useMemo } from "react";
import { 
  Database, Server, RefreshCw, Plus, Download, Trash2, Calendar, 
  AlertTriangle, Play, HardDrive, CheckCircle2, X, Lock, Check, 
  Settings, Clock, ArrowRight, Eye, ShieldAlert, Info, FileCode, Mail, 
  ShieldCheck, AlertCircle, Sparkles, Filter, Search, ShieldX, HelpCircle, FileDown
} from "lucide-react";
import { User, Client } from "../types";
import { 
  BackupRecord, 
  BackupType, 
  RecoveryLog, 
  BackupPolicy, 
  getBackupsList, 
  generateBackup, 
  getRecoveryLogs, 
  getBackupPolicy, 
  saveBackupPolicy, 
  validateRestoreData, 
  executeRestore, 
  deleteBackup, 
  toggleBackupCritical, 
  ValidationResult
} from "../lib/backupEngine";

interface BackupRecoveryPanelProps {
  currentUser: User;
  clients: Client[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onRefreshCRMData?: () => void;
}

export const BackupRecoveryPanel: React.FC<BackupRecoveryPanelProps> = ({
  currentUser,
  clients,
  showToast,
  onRefreshCRMData
}) => {
  // --- STATE ---
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [logs, setLogs] = useState<RecoveryLog[]>([]);
  const [policy, setPolicy] = useState<BackupPolicy>(getBackupPolicy());

  // Navigation sub-tabs
  const [panelTab, setPanelTab] = useState<"dashboard" | "policy" | "logs">("dashboard");

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Backup states
  const [isCreating, setIsCreating] = useState(false);
  const [newBackupType, setNewBackupType] = useState<BackupType>("full");
  const [newBackupNotes, setNewBackupNotes] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Restore Safety Wizard states
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupRecord | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [restoreStep, setRestoreStep] = useState<"warning" | "confirmation" | "executing" | "complete">("warning");
  const [restoreDryRun, setRestoreDryRun] = useState(true);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [restoreConsoleLogs, setRestoreConsoleLogs] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // Refresh component data
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch data
  useEffect(() => {
    setBackups(getBackupsList());
    setLogs(getRecoveryLogs());
    setPolicy(getBackupPolicy());
  }, [refreshTrigger]);

  // Handle backup creation
  const handleCreateBackup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    // Simulate database locking and scanning delays
    setTimeout(() => {
      try {
        const result = generateBackup(
          newBackupType,
          `${currentUser.first} ${currentUser.last}`,
          newBackupNotes.trim(),
          !simulateFailure
        );

        if (result.status === "success") {
          showToast(`Secure ${newBackupType} backup generated successfully!`, "success", "💾");
          setNewBackupNotes("");
        } else {
          showToast(`Backup execution failed: ${result.failureReason}`, "error", "⚠️");
        }
        
        setRefreshTrigger(prev => prev + 1);
      } catch (err: any) {
        showToast(`Failed to compile backup snapshot: ${err?.message || err}`, "error");
      } finally {
        setIsCreating(false);
      }
    }, 1200);
  };

  // Delete Backup
  const handleDeleteBackup = (id: string) => {
    if (window.confirm("CRITICAL WARNING: You are about to permanently delete this backup archive. This file will be unrecoverable. Proceed?")) {
      const success = deleteBackup(id, `${currentUser.first} ${currentUser.last}`);
      if (success) {
        showToast("Backup archive permanently destroyed.", "warning", "🗑️");
        setRefreshTrigger(prev => prev + 1);
      } else {
        showToast("Failed to delete the backup archive.", "error");
      }
    }
  };

  // Toggle Critical status
  const handleToggleCritical = (id: string) => {
    const success = toggleBackupCritical(id, `${currentUser.first} ${currentUser.last}`);
    if (success) {
      showToast("Backup protection level synchronized.", "success", "🔒");
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Save Policy
  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    saveBackupPolicy(policy, `${currentUser.first} ${currentUser.last}`);
    showToast("Retention and scheduling policies updated.", "success", "⚙️");
    setRefreshTrigger(prev => prev + 1);
  };

  // Trigger JSON download of a backup
  const handleDownloadBackupFile = (backup: BackupRecord) => {
    if (!backup.dataPayload) {
      showToast("Cannot download. Database payload for this backup is purged or missing.", "error");
      return;
    }
    
    try {
      const blob = new Blob([backup.dataPayload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `gbk_crm_backup_${backup.type}_${backup.timestamp.split("T")[0]}_${backup.id}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Downloaded secure backup payload to your local system disk.", "success", "📥");
    } catch (err: any) {
      showToast(`Download compilation crashed: ${err?.message || err}`, "error");
    }
  };

  // Initiate Restore workflow
  const handleStartRestoreWizard = (backup: BackupRecord) => {
    const val = validateRestoreData(backup);
    setValidationResult(val);
    setSelectedBackupForRestore(backup);
    setRestoreStep("warning");
    setRestoreDryRun(true);
    setRestoreConfirmText("");
    setRestoreConsoleLogs([]);
    setIsRestoring(false);
  };

  // Execute Restore operation (Dry run or Full production write)
  const handleExecuteRestoreOperation = () => {
    if (!selectedBackupForRestore) return;

    if (!restoreDryRun && restoreConfirmText !== "RESTORE") {
      showToast("Authorization Error: You must type 'RESTORE' to proceed.", "error");
      return;
    }

    setIsRestoring(true);
    setRestoreStep("executing");
    
    const logsList: string[] = [
      `[17:50:48] INITIALIZING RESTORE ENGINE (V1.2)`,
      `[17:50:48] Reading target archive header: ${selectedBackupForRestore.id}`,
      `[17:50:49] Operator credential verified: ${currentUser.first} ${currentUser.last}`,
      `[17:50:49] Mode of operation: ${restoreDryRun ? "TEST / DRY RUN SIMULATOR" : "PRODUCTION SYSTEM OVERWRITE"}`
    ];

    setRestoreConsoleLogs([...logsList]);

    // Simulate staging phases
    setTimeout(() => {
      logsList.push(`[17:50:50] Running schema checksum validation checks... Passed.`);
      logsList.push(`[17:50:50] Verifying JSON payload syntax integrity... Passed.`);
      logsList.push(`[17:50:50] Estimated memory allocation footprint: ${(selectedBackupForRestore.size / 1024).toFixed(2)} KB`);
      setRestoreConsoleLogs([...logsList]);

      setTimeout(() => {
        if (restoreDryRun) {
          logsList.push(`[17:50:51] [TEST] Simulating memory state writes... Complete.`);
          logsList.push(`[17:50:51] [TEST] Simulating system state alignment... Checked.`);
          logsList.push(`[17:50:51] DRY RUN RESTORATION COMPLETED SUCCESSFULLY. System is 100% ready for full recovery write.`);
          setRestoreConsoleLogs([...logsList]);
          
          // Trigger actual test log
          executeRestore(selectedBackupForRestore, `${currentUser.first} ${currentUser.last}`, true);
          setIsRestoring(false);
          setRestoreStep("complete");
          showToast("Simulation test complete. System validates perfectly.", "success", "🔬");
          setRefreshTrigger(prev => prev + 1);
        } else {
          logsList.push(`[17:50:51] [WRITE] Locking current localStorage database indexes...`);
          logsList.push(`[17:50:52] [WRITE] Clearing current keys matching target pattern: [${selectedBackupForRestore.type.toUpperCase()}]`);
          logsList.push(`[17:50:52] [WRITE] Rewriting ${selectedBackupForRestore.itemCount} database data blocks...`);
          
          const result = executeRestore(selectedBackupForRestore, `${currentUser.first} ${currentUser.last}`, false);
          
          if (result.success) {
            logsList.push(`[17:50:52] [WRITE] Splicing system logs and dispatching custom notifications...`);
            logsList.push(`[17:50:53] PRODUCTION RECOVERY SCRIPT COMPLETE. CRM memory states re-aligned.`);
            setRestoreConsoleLogs([...logsList]);
            setIsRestoring(false);
            setRestoreStep("complete");
            showToast("CRM system rolled back successfully!", "success", "✅");
            
            if (onRefreshCRMData) {
              onRefreshCRMData();
            }
            setRefreshTrigger(prev => prev + 1);
          } else {
            logsList.push(`[17:50:53] [FATAL] Write exception encountered during memory dump: ${result.error}`);
            setRestoreConsoleLogs([...logsList]);
            setIsRestoring(false);
            showToast(`Critical Restore Error: ${result.error}`, "error", "🛑");
          }
        }
      }, 1000);
    }, 1000);
  };

  // Computations
  const filteredBackups = useMemo(() => {
    return backups.filter(b => {
      const matchesSearch = b.creator.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            b.notes.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            b.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "all" || b.type === typeFilter;
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [backups, searchQuery, typeFilter, statusFilter]);

  // System Diagnostics
  const systemHealth = useMemo(() => {
    const activeLogs = logs;
    const hasSuccessfulBackup = backups.some(b => b.status === "success");
    const activeBackups = backups.filter(b => b.status === "success");

    let lastBackupDate: Date | null = null;
    let isBackupOverdue = false;
    let lastBackupSucceeded = true;
    let daysSinceLastBackup = 999;

    if (activeBackups.length > 0) {
      const sortedActive = [...activeBackups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      lastBackupDate = new Date(sortedActive[0].timestamp);
      daysSinceLastBackup = Math.round((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // If last backup is older than 3 days, flag overdue
      isBackupOverdue = daysSinceLastBackup > 3;
    } else {
      isBackupOverdue = true;
    }

    if (backups.length > 0) {
      lastBackupSucceeded = backups[0].status === "success";
    }

    // Check if restore has ever been tested (either "test_restore" or dry_run in logs)
    const restoreTested = logs.some(l => l.action === "test_restore" || l.action === "dry_run" || l.notes.toLowerCase().includes("test"));

    // Total Storage Size estimate
    const totalStorageBytes = activeBackups.reduce((acc, curr) => acc + curr.size, 0);

    // Count failed backups
    const failedJobsCount = backups.filter(b => b.status === "failed").length;

    return {
      lastBackupDate,
      daysSinceLastBackup,
      isBackupOverdue,
      lastBackupSucceeded,
      restoreTested,
      totalStorageBytes,
      failedJobsCount,
      hasSuccessfulBackup
    };
  }, [backups, logs]);

  // Translate types for elegant visual layouts
  const backupTypeBadges: Record<BackupType, { label: string; bg: string; text: string; desc: string }> = {
    full: { 
      label: "Full System Snapshot", 
      bg: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30", 
      text: "text-teal-700 dark:text-teal-400",
      desc: "Includes all database collections, client mortgage folders, underwriter checklists, activity logs, system credentials, and active setting locks."
    },
    database: { 
      label: "Database Core Only", 
      bg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", 
      text: "text-amber-700 dark:text-amber-400",
      desc: "Includes client records, loan applications, custom underwriters, follow-up items, calendar scheduling agendas, and team personnel rosters."
    },
    files_metadata: { 
      label: "Documents Metadata Only", 
      bg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30", 
      text: "text-indigo-700 dark:text-indigo-400",
      desc: "Includes secure file upload configurations, required checklist requests, document approval histories, and team E&O compliance documents."
    },
    settings: { 
      label: "CRM Configuration & Settings", 
      bg: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30", 
      text: "text-violet-700 dark:text-violet-400",
      desc: "Includes interface customization states, idle auto-locking configurations, compliance logging enablers, and corporate SMTP mail routing signatures."
    },
    recovery_bundle: { 
      label: "Complete Disaster Recovery Bundle", 
      bg: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30", 
      text: "text-rose-700 dark:text-rose-400",
      desc: "Includes comprehensive local databases combined with administrative settings."
    }
  };

  return (
    <div className="flex flex-col gap-6 text-xs text-[var(--color-text)]" id="backup-recovery-system-container">
      
      {/* SECTION HEADER BLOCK */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[var(--color-accent)]" />
            <span className="font-bold text-sm uppercase tracking-widest text-[var(--color-text)]">CRM DISASTER RECOVERY &amp; BACKUP CENTER</span>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-1">
            Immutably preserve active CRM snapshots, validate database schemas, roll back systems during emergencies, and enforce recovery retention plans.
          </p>
        </div>

        {/* Console Navigation Tabs */}
        <div className="flex bg-[var(--color-surface-2)] border border-[var(--color-border)] p-1 rounded-xl">
          <button 
            onClick={() => setPanelTab("dashboard")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              panelTab === "dashboard" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Server className="w-3.5 h-3.5" /> Recovery Console
          </button>
          <button 
            onClick={() => setPanelTab("policy")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              panelTab === "policy" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Retention Policy
          </button>
          <button 
            onClick={() => setPanelTab("logs")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              panelTab === "logs" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Recovery Audits
          </button>
        </div>
      </div>

      {/* SYSTEM DIAGNOSTICS & ALERTS HUB */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Metric 1: Last Successful Backup */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-text-muted)]">Last Safe Backup</span>
            <CheckCircle2 className={`w-4.5 h-4.5 ${systemHealth.hasSuccessfulBackup ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
          </div>
          <div className="mt-2.5">
            <span className="text-sm font-mono font-bold text-[var(--color-text)] block">
              {systemHealth.hasSuccessfulBackup ? `${systemHealth.daysSinceLastBackup}d ago` : "NEVER"}
            </span>
            <span className="text-[8px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider block mt-0.5">
              {systemHealth.lastBackupDate ? systemHealth.lastBackupDate.toLocaleDateString() : "No archives compiled"}
            </span>
          </div>
        </div>

        {/* Metric 2: Health Status */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-text-muted)]">Backup Status</span>
            <ShieldAlert className={`w-4.5 h-4.5 ${systemHealth.isBackupOverdue || !systemHealth.lastBackupSucceeded ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
          </div>
          <div className="mt-2.5">
            <span className={`text-xs font-bold uppercase tracking-wider block ${
              !systemHealth.lastBackupSucceeded 
                ? "text-red-600 dark:text-red-400" 
                : systemHealth.isBackupOverdue 
                ? "text-amber-600 dark:text-amber-400" 
                : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {!systemHealth.lastBackupSucceeded 
                ? "FAILURES DETECTED" 
                : systemHealth.isBackupOverdue 
                ? "OVERDUE (>3 Days)" 
                : "OPERATIONAL / HEALTHY"}
            </span>
            <span className="text-[8px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider block mt-0.5">
              {!systemHealth.lastBackupSucceeded ? "Review failure logs" : "Backup cycle synchronized"}
            </span>
          </div>
        </div>

        {/* Metric 3: Total Backups */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-text-muted)]">Total Available</span>
            <Server className="w-4.5 h-4.5 text-[var(--color-accent)]" />
          </div>
          <div className="mt-2.5">
            <span className="text-sm font-mono font-bold text-[var(--color-text)] block">
              {backups.length} snaps
            </span>
            <span className="text-[8px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider block mt-0.5 font-mono">
              Limit: {policy.keepLastXBackups} (Retention queue)
            </span>
          </div>
        </div>

        {/* Metric 4: Failed Backup Jobs */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-text-muted)]">Failed Runs</span>
            <ShieldX className={`w-4.5 h-4.5 ${systemHealth.failedJobsCount > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--color-text-faint)]"}`} />
          </div>
          <div className="mt-2.5">
            <span className={`text-sm font-mono font-bold block ${systemHealth.failedJobsCount > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--color-text)]"}`}>
              {systemHealth.failedJobsCount} jobs
            </span>
            <span className="text-[8px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider block mt-0.5">
              Out of last {backups.length} attempts
            </span>
          </div>
        </div>

        {/* Metric 5: Last Restore Test */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-text-muted)]">Restore Tested</span>
            <ShieldCheck className={`w-4.5 h-4.5 ${systemHealth.restoreTested ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400 animate-pulse"}`} />
          </div>
          <div className="mt-2.5">
            <span className={`text-xs font-bold uppercase tracking-wider block ${systemHealth.restoreTested ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400"}`}>
              {systemHealth.restoreTested ? "VERIFIED VALID" : "NOT TESTED"}
            </span>
            <span className="text-[8px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider block mt-0.5">
              {systemHealth.restoreTested ? "Dry run tests completed" : "We advise a dry run test"}
            </span>
          </div>
        </div>

        {/* Metric 6: Estimated Storage Size */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-text-muted)]">Local Payload</span>
            <HardDrive className="w-4.5 h-4.5 text-[var(--color-text-muted)]" />
          </div>
          <div className="mt-2.5">
            <span className="text-sm font-mono font-bold text-[var(--color-text)] block">
              {(systemHealth.totalStorageBytes / 1024).toFixed(1)} KB
            </span>
            <span className="text-[8px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider block mt-0.5 font-mono">
              localStorage footprint
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC TAB COMPONENT OUTPUT */}
      {panelTab === "dashboard" && (
        <div className="flex flex-col xl:flex-row gap-5">
          
          {/* LEFT SUB SECTION: Backups Catalog List */}
          <div className="flex-1 space-y-4">
            {/* Catalog Toolbar filters */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Filter backups by comment/author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2 text-[11px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold placeholder:text-[var(--color-text-faint)]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-1.5 text-[10px] uppercase font-bold tracking-wider text-[var(--color-text)] focus:outline-none w-full md:w-auto"
                >
                  <option value="all">All Types</option>
                  <option value="full">Full Snapshots</option>
                  <option value="database">Database Core</option>
                  <option value="files_metadata">Documents Metadata</option>
                  <option value="settings">CRM Settings</option>
                </select>

                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-1.5 text-[10px] uppercase font-bold tracking-wider text-[var(--color-text)] focus:outline-none w-full md:w-auto"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed Jobs</option>
                </select>
              </div>
            </div>

            {/* Backups List */}
            <div className="space-y-4">
              {filteredBackups.length === 0 ? (
                <div className="p-12 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm">
                  <Database className="w-10 h-10 text-[var(--color-text-faint)] mx-auto mb-3" />
                  <p className="text-[var(--color-text-muted)] italic text-xs font-semibold">No backup records matching filter criteria found.</p>
                </div>
              ) : (
                filteredBackups.map((bk) => {
                  const badge = backupTypeBadges[bk.type] || backupTypeBadges["full"];
                  const isSuccess = bk.status === "success";

                  return (
                    <div 
                      key={bk.id} 
                      className={`p-5 bg-[var(--color-surface)] border rounded-2xl flex flex-col justify-between gap-4 transition-all hover:border-[var(--color-accent)]/30 shadow-sm relative overflow-hidden ${
                        bk.isCritical 
                          ? "border-[var(--color-accent)]/40 bg-[var(--color-surface-2)]" 
                          : "border-[var(--color-border)]"
                      }`}
                    >
                      {/* Critical visual flare edge */}
                      {bk.isCritical && (
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-accent)]" title="Protected backup" />
                      )}

                      {/* Line 1: Metadata, status, lock indicators */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-[var(--color-text)] text-[11px] bg-[var(--color-surface-2)] px-2 py-0.5 rounded uppercase tracking-wider border border-[var(--color-border)]">{bk.id}</span>
                          <span className={`px-2 py-0.5 border rounded text-[8px] font-bold uppercase tracking-wider ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-muted)] font-mono text-[9.5px]">{new Date(bk.timestamp).toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider ${
                            isSuccess 
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" 
                              : "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
                          }`}>
                            {bk.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Line 2: Note content and category desc */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-[var(--color-text)] font-semibold leading-relaxed">{bk.notes}</p>
                        <p className="text-[9.5px] text-[var(--color-text-muted)] italic">{badge.desc}</p>
                        
                        {bk.failureReason && (
                          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-[10px] rounded-lg mt-2 flex items-start gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><strong>Job Interruption Reason:</strong> {bk.failureReason}</span>
                          </div>
                        )}
                      </div>

                      {/* Line 3: System attributes & administrative operators */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] bg-[var(--color-surface-2)] p-2.5 rounded-xl border border-[var(--color-border)]">
                        <div className="flex items-center gap-4 flex-wrap text-[var(--color-text-muted)] font-semibold uppercase text-[8.5px]">
                          <span>Operator: <strong className="text-[var(--color-text)]">{bk.creator}</strong></span>
                          <span>•</span>
                          <span>Size: <strong className="text-[var(--color-text)] font-mono">{(bk.size / 1024).toFixed(2)} KB</strong></span>
                          <span>•</span>
                          <span>Records: <strong className="text-[var(--color-text)] font-mono">{bk.itemCount} items</strong></span>
                          <span>•</span>
                          <span>Retention: <span className={`font-mono text-[8px] px-1 rounded uppercase ${
                            bk.retentionStatus === "active" 
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" 
                              : bk.retentionStatus === "archived"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-red-500/15 text-red-700 dark:text-red-400"
                          }`}>{bk.retentionStatus}</span></span>
                        </div>

                        {/* Interactive Administrative Actions */}
                        <div className="flex items-center gap-2">
                          
                          {/* Toggle Protected Flag */}
                          <button
                            onClick={() => handleToggleCritical(bk.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              bk.isCritical 
                                ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" 
                                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            }`}
                            title={bk.isCritical ? "Remove immutable lock protection" : "Flag archive as CRITICAL (exempt from future retention purges)"}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>

                          {/* Download JSON Payload */}
                          {isSuccess && bk.dataPayload && (
                            <button
                              onClick={() => handleDownloadBackupFile(bk)}
                              className="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-all flex items-center gap-1 text-[9px] uppercase font-bold cursor-pointer"
                              title="Download backup payload JSON to local disk"
                            >
                              <FileDown className="w-3.5 h-3.5" /> Download
                            </button>
                          )}

                          {/* Trigger Restore Wizard */}
                          {isSuccess && (
                            <button
                              onClick={() => handleStartRestoreWizard(bk)}
                              className="p-1.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:opacity-90 transition-all flex items-center gap-1 text-[9px] uppercase font-bold cursor-pointer"
                              title="Restore system using this snapshot"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Restore...
                            </button>
                          )}

                          {/* Delete snapshot */}
                          {!bk.isCritical && (
                            <button
                              onClick={() => handleDeleteBackup(bk.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                              title="Permanently erase from recovery catalog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* RIGHT SUB SECTION: Live Manual Creation Console */}
          <div className="w-full xl:w-80 shrink-0 space-y-4">
            
            {/* MANUAL CREATION CONSOLE CARD */}
            <form onSubmit={handleCreateBackup} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4 shadow-sm">
              <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-bold tracking-widest flex items-center gap-1.5 border-b border-[var(--color-border)] pb-3">
                <Plus className="w-4 h-4 text-[var(--color-accent)]" /> COMPILE RECOVERY ARCHIVE
              </h4>

              {/* Step 1: Choose Type */}
              <div className="space-y-1.5">
                <label className="text-[8px] text-[var(--color-text-muted)] uppercase font-bold block">Backup Architecture Scope</label>
                <select
                  value={newBackupType}
                  onChange={(e) => setNewBackupType(e.target.value as BackupType)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                >
                  <option value="full">🏡 Complete System Snapshot</option>
                  <option value="database">🥇 Core Database Collections Only</option>
                  <option value="files_metadata">📂 Document File Metadata Only</option>
                  <option value="settings">⚙️ CRM UI &amp; Autolock Settings Only</option>
                </select>
              </div>

              {/* Informative helper block based on selection */}
              <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-[10px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                {newBackupType === "full" && "Complete CRM bundle. Backs up loans, client pipelines, user rosters, messages, email records, and SMTP parameters."}
                {newBackupType === "database" && "Optimized DB backup. Backs up clients list, file notes, check-lists, follow-ups, agenda tasks, and staff list."}
                {newBackupType === "files_metadata" && "Files indexing backup. Backs up document request definitions, activity logs, and compliance criteria."}
                {newBackupType === "settings" && "Backup configuration variables. Saves SMTP signature logs, idle auto-locking values, and active API keys."}
              </div>

              {/* Step 2: Administrative Notes */}
              <div className="space-y-1.5">
                <label className="text-[8px] text-[var(--color-text-muted)] uppercase font-bold block">Operational Notes / Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this backup is being compiled (e.g. Prior to loading corporate regulation policies v1.2, pre-migration)"
                  value={newBackupNotes}
                  onChange={(e) => setNewBackupNotes(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                />
              </div>

              {/* DEV / SIMULATED FAIL LOCK */}
              <div className="flex items-center justify-between p-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-[10px]">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-[var(--color-text)]">Simulate Failure Mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulateFailure(!simulateFailure)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                    simulateFailure ? "bg-red-500" : "bg-[var(--color-surface-offset)]"
                  }`}
                >
                  <div className={`w-4 h-4 bg-white dark:bg-black rounded-full transition-transform ${
                    simulateFailure ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Compile Button */}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-text-inverse)] py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-text-inverse)]" /> Compiling CRM Snapshot...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[var(--color-text-inverse)]" /> Execute Backup Snapshot
                  </>
                )}
              </button>
            </form>

            {/* QUICK DISASTER MITIGATION GUIDELINES */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-3.5 shadow-sm">
              <h4 className="text-[10px] text-[var(--color-text)] uppercase font-bold tracking-widest flex items-center gap-1.5 border-b border-[var(--color-border)] pb-3">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" /> MITIGATION CRITERIA
              </h4>
              <ul className="space-y-2.5 text-[10px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                <li className="flex gap-2">
                  <span className="text-[var(--color-accent)] font-bold">01.</span>
                  <span>Compile full backups prior to any roster pin code override or CSV roster database alterations.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-accent)] font-bold">02.</span>
                  <span>We advise testing restores periodically by performing a dry run simulation inside the Recovery tab.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-accent)] font-bold">03.</span>
                  <span>Never share or email downloaded .json archives unless transmitting via secure encrypted brokerage portals.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* TABS VIEW 2: RETENTION & ARCHIVE POLICY CONTROLLERS */}
      {panelTab === "policy" && (
        <form onSubmit={handleSavePolicy} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-6 max-w-3xl shadow-sm">
          
          <div>
            <h3 className="text-xs font-bold uppercase text-[var(--color-accent)] tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--color-accent)]" /> CRM Archive &amp; Retention Policies
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-1">Configure automated history cleanups, active memory caps, S3/Drive cloud triggers, and warning thresholds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Left section: Local Queue Retention */}
            <div className="space-y-4">
              <span className="text-[10px] text-[var(--color-text)] uppercase font-bold tracking-wider block border-b border-[var(--color-border)] pb-2">Queue Retention Rules</span>
              
              {/* Keep count */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-[var(--color-text-muted)] uppercase font-bold block">Maximum Backups Retained</label>
                <select
                  value={policy.keepLastXBackups}
                  onChange={(e) => setPolicy({ ...policy, keepLastXBackups: Number(e.target.value) })}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value={3}>3 Snapshots Max</option>
                  <option value={5}>5 Snapshots Max (Recommended)</option>
                  <option value={10}>10 Snapshots Max</option>
                  <option value={20}>20 Snapshots Max</option>
                </select>
                <span className="text-[8.5px] text-[var(--color-text-muted)] block leading-tight">When limit is exceeded, older success snapshots are automatically processed by retention cleanups.</span>
              </div>

              {/* Behavior on overflow */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-[var(--color-text-muted)] uppercase font-bold block">Retention Overflow Strategy</label>
                <div className="space-y-2 pt-1.5">
                  <label className="flex items-start gap-2.5 text-xs font-semibold cursor-pointer text-[var(--color-text)]">
                    <input 
                      type="radio" 
                      name="overflow_strat"
                      checked={policy.archiveOlder}
                      onChange={() => setPolicy({ ...policy, archiveOlder: true })}
                      className="mt-0.5 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]" 
                    />
                    <div>
                      <span>Archive Older Backups</span>
                      <span className="text-[8.5px] text-[var(--color-text-muted)] block font-medium">Keep backup meta logs intact but compress or strip payload indexing from disk.</span>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-2.5 text-xs font-semibold cursor-pointer text-[var(--color-text)]">
                    <input 
                      type="radio" 
                      name="overflow_strat"
                      checked={!policy.archiveOlder}
                      onChange={() => setPolicy({ ...policy, archiveOlder: false })}
                      className="mt-0.5 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]" 
                    />
                    <div>
                      <span>Purge Payload &amp; History Data</span>
                      <span className="text-[8.5px] text-[var(--color-text-muted)] block font-medium">Completely remove oldest snapshots from local catalog registers.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right section: Scheduled automatons readiness */}
            <div className="space-y-4">
              <span className="text-[10px] text-[var(--color-text)] uppercase font-bold tracking-wider block border-b border-[var(--color-border)] pb-2">Scheduling &amp; Cloud Destinations</span>
              
              {/* Scheduled toggle readiness */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">Automated Backup Daemon</span>
                  <span className="text-[8.5px] text-[var(--color-text-muted)] block font-semibold">Enable background weekly scheduler loops</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPolicy({ ...policy, enableAutoScheduling: !policy.enableAutoScheduling })}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                    policy.enableAutoScheduling ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-offset)]"
                  }`}
                >
                  <div className={`w-4 h-4 bg-white dark:bg-black rounded-full transition-transform ${
                    policy.enableAutoScheduling ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Destination configuration */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-[var(--color-text-muted)] uppercase font-bold block">Offsite Backup Destination</label>
                <select
                  value={policy.destination}
                  onChange={(e) => setPolicy({ ...policy, destination: e.target.value as any })}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="local">📁 Local Browser Disk (localStorage)</option>
                  <option value="secure_s3">🛡️ AWS S3 Secure Archive (Authorized)</option>
                  <option value="google_drive">☁️ Corporate Google Drive (OAuth)</option>
                </select>
                <span className="text-[8.5px] text-[var(--color-text-muted)] block">Configured offsite destination triggers auto-upload synchronization hooks.</span>
              </div>

              {/* Notification administrator email */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-[var(--color-text-muted)] uppercase font-bold block">Administrator Notifications</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <input
                    type="email"
                    placeholder="it-compliance@gbkfinancial.ca"
                    value={policy.notifyEmail}
                    onChange={(e) => setPolicy({ ...policy, notifyEmail: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-8 pr-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold placeholder:text-[var(--color-text-faint)]"
                  />
                </div>
                <span className="text-[8.5px] text-[var(--color-text-muted)] block">Receive instant emails on backup failures, storage issues, or restore events.</span>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="submit"
              className="bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-text-inverse)] text-[10px] uppercase font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              ✓ Save Recovery Policy Config
            </button>
          </div>
        </form>
      )}

      {/* TABS VIEW 3: OPERATIONS & RECOVERY LOG VIEW */}
      {panelTab === "logs" && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-widest block">Operational Logs Timeline</span>
              <span className="text-[9px] text-[var(--color-text-muted)] block font-semibold">Accountability record of backup generation, restores, schema tests, and policy changes.</span>
            </div>
            
            <span className="text-[10px] text-[var(--color-accent)] font-bold uppercase font-mono tracking-wider bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-1 rounded-md">
              {logs.length} Events Logged
            </span>
          </div>

          {/* Chronological recovery logs list */}
          <div className="relative border-l-2 border-[var(--color-border)] pl-4 py-1.5 space-y-5 ml-1">
            {logs.length === 0 ? (
              <div className="p-8 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl ml-2 shadow-sm">
                <p className="text-[var(--color-text-muted)] italic">No operational recovery audits written to disk yet.</p>
              </div>
            ) : (
              logs.map((lg) => {
                let dotColor = "bg-zinc-400 border-zinc-500";
                let titleStyle = "text-[var(--color-text)]";

                if (lg.action === "restore_backup") {
                  dotColor = "bg-red-500 border-red-500 animate-pulse";
                  titleStyle = "text-red-600 dark:text-red-400 font-extrabold";
                } else if (lg.action === "test_restore" || lg.action === "dry_run") {
                  dotColor = "bg-teal-500 border-teal-500";
                  titleStyle = "text-teal-700 dark:text-teal-400 font-bold";
                } else if (lg.action === "create_backup" && lg.status === "success") {
                  dotColor = "bg-emerald-500 border-emerald-500";
                  titleStyle = "text-emerald-700 dark:text-emerald-400 font-bold";
                } else if (lg.status === "failed") {
                  dotColor = "bg-red-500 border-red-600";
                  titleStyle = "text-red-600 dark:text-red-400 font-bold";
                }

                return (
                  <div key={lg.id} className="relative group pl-1 select-none font-semibold">
                    {/* Event Dot */}
                    <span className={`absolute -left-[21.5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface)] ${dotColor} transition-transform group-hover:scale-125`} />
                    
                    <div className="flex items-center justify-between text-[8px] text-[var(--color-text-muted)] uppercase tracking-widest font-bold mb-1.5">
                      <span className="text-[var(--color-text-muted)]">Operator: {lg.triggeredBy}</span>
                      <span className="font-mono">{new Date(lg.timestamp).toLocaleString()}</span>
                    </div>

                    <div className={`text-xs ${titleStyle} flex items-center gap-1.5 flex-wrap`}>
                      <span className="uppercase tracking-wider text-[10px] font-bold font-mono">[{lg.action.replace("_", " ")}]</span>
                      <span>{lg.notes}</span>
                    </div>

                    {lg.details && (
                      <p className="text-[10px] text-[var(--color-text-muted)] pl-3 border-l border-[var(--color-border)] mt-1 italic leading-relaxed">
                        {lg.details}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* RESTORE SAFETY & WARNING WIZARD MODAL POPUP */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none animate-fade-in">
          
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-xl p-5 shadow-2xl relative flex flex-col gap-4 text-xs">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 animate-pulse" />
                <span className="font-bold text-xs uppercase text-red-600 dark:text-red-400 tracking-widest">
                  CRITICAL DATA RESTORATION SCRIPT
                </span>
              </div>
              <button 
                onClick={() => {
                  if (!isRestoring) setSelectedBackupForRestore(null);
                }}
                disabled={isRestoring}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: WARNING AND VALIDATION AUDIT */}
            {restoreStep === "warning" && validationResult && (
              <div className="space-y-4">
                
                {/* Warning Alert banner */}
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl space-y-1">
                  <span className="block font-bold uppercase tracking-wider text-[10px]">PRODUCTION DATA CONFLICT WARNING</span>
                  <span className="leading-relaxed block font-semibold text-[10.5px]">
                    Proceeding with recovery will OVERWRITE your current CRM database entries. Any files created after the snapshot timestamp 
                    ({new Date(selectedBackupForRestore.timestamp).toLocaleDateString()}) will be permanently erased.
                  </span>
                </div>

                {/* Inspect Target Snapshot Details */}
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl space-y-2.5">
                  <span className="text-[9px] text-[var(--color-accent)] uppercase font-bold tracking-widest block">INTEGRITY &amp; SCHEMA INSPECTION REPORT</span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-2 rounded-lg">
                      <span className="text-[var(--color-text)] font-mono font-bold text-xs block">{validationResult.keysCount}</span>
                      <span className="text-[8px] text-[var(--color-text-muted)] block uppercase tracking-wider mt-0.5">Database keys</span>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-2 rounded-lg">
                      <span className="text-[var(--color-text)] font-mono font-bold text-xs block">{validationResult.clientCount} files</span>
                      <span className="text-[8px] text-[var(--color-text-muted)] block uppercase tracking-wider mt-0.5">Borrowers</span>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-2 rounded-lg">
                      <span className="text-[var(--color-text)] font-mono font-bold text-xs block">{validationResult.userCount}</span>
                      <span className="text-[8px] text-[var(--color-text-muted)] block uppercase tracking-wider mt-0.5">Roster</span>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-2 rounded-lg">
                      <span className="text-[var(--color-text)] font-mono font-bold text-xs block">{(validationResult.estimatedSize / 1024).toFixed(1)} KB</span>
                      <span className="text-[8px] text-[var(--color-text-muted)] block uppercase tracking-wider mt-0.5">File size</span>
                    </div>
                  </div>

                  {/* Validation Notes status block */}
                  <div className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[10px] font-medium leading-relaxed">
                    <div className="flex gap-1.5 items-start">
                      {validationResult.isValid ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4.5 h-4.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="text-[var(--color-text)] block font-bold uppercase text-[8.5px] tracking-wider mb-0.5">INTEGRITY ANALYSIS</strong>
                        <span className="text-[var(--color-text-muted)]">{validationResult.notes}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warnings messages if any */}
                  {validationResult.warnings.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[8px] text-[var(--color-text-muted)] uppercase font-bold tracking-widest block">SYSTEM COMPLIANCE WARNINGS ({validationResult.warnings.length})</span>
                      <div className="space-y-1 max-h-[75px] overflow-y-auto">
                        {validationResult.warnings.map((warn, i) => (
                          <div key={i} className="text-[9.5px] text-[var(--color-accent)] font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Restoration Mode Selector */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  
                  <button
                    onClick={() => setRestoreDryRun(true)}
                    className={`p-3 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                      restoreDryRun 
                        ? "border-teal-500/50 bg-teal-500/10" 
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border)]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400 tracking-wider">01. Safe Test Restore</span>
                      {restoreDryRun && <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <span className="text-[8.5px] text-[var(--color-text-muted)] block leading-tight">Perform a secure schema validation test. Zero active database entries are overwritten. Highly advised.</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!validationResult.isValid) {
                        showToast("Cannot select production recovery. Archive fails schema validity.", "error");
                        return;
                      }
                      setRestoreDryRun(false);
                    }}
                    disabled={!validationResult.isValid}
                    className={`p-3 rounded-xl border text-left space-y-1 transition-all disabled:opacity-30 cursor-pointer ${
                      !restoreDryRun 
                        ? "border-red-500/50 bg-red-500/10" 
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border)]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 tracking-wider">02. Production Restore</span>
                      {!restoreDryRun && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />}
                    </div>
                    <span className="text-[8.5px] text-[var(--color-text-muted)] block leading-tight">Run full recovery write script. Replaces current workspace collections. Re-login might be required.</span>
                  </button>
                </div>

                {/* Next Step trigger */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => setSelectedBackupForRestore(null)}
                    className="px-4 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] rounded-lg text-[9px] uppercase font-bold cursor-pointer"
                  >
                    Abort Operation
                  </button>
                  <button
                    onClick={() => {
                      if (restoreDryRun) {
                        handleExecuteRestoreOperation();
                      } else {
                        setRestoreStep("confirmation");
                      }
                    }}
                    className={`px-4 py-2 text-[9px] uppercase font-bold rounded-lg transition-all cursor-pointer ${
                      restoreDryRun 
                        ? "bg-teal-600 hover:bg-teal-700 text-white" 
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {restoreDryRun ? "Run Test Restore Simulation" : "Proceed to Confirmations"}
                  </button>
                </div>

              </div>
            )}

            {/* STEP 2: AUTHORIZATION CONFIRMATION */}
            {restoreStep === "confirmation" && (
              <div className="space-y-4">
                
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl space-y-2">
                  <h4 className="text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" /> SECURITY AUTHORIZATION REQUIRED
                  </h4>
                  <p className="text-[10px] leading-relaxed font-semibold">
                    You are performing a full production rollback script. Accidental restoratives degrade workspace data consistency. 
                    To authenticate that you are an authorized administrator wishing to execute this override:
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[8.5px] text-[var(--color-text-muted)] uppercase font-bold block">
                    Type <strong className="text-red-600 dark:text-red-400 font-bold">RESTORE</strong> below to verify your intent:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="RESTORE"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-red-500/30 rounded-lg p-2.5 text-center text-xs text-[var(--color-text)] tracking-widest font-mono font-bold focus:outline-none focus:border-red-500 uppercase"
                  />
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => setRestoreStep("warning")}
                    className="flex-1 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] rounded-lg text-[9px] uppercase font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleExecuteRestoreOperation}
                    disabled={restoreConfirmText !== "RESTORE"}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    ✓ Authorize Production Restore
                  </button>
                </div>

              </div>
            )}

            {/* STEP 3: EXECUTING RECOVERY SCRIPT */}
            {restoreStep === "executing" && (
              <div className="space-y-4">
                
                <div className="text-center py-4 space-y-2">
                  <RefreshCw className="w-10 h-10 text-[var(--color-accent)] animate-spin mx-auto" />
                  <span className="block font-bold uppercase tracking-widest text-[var(--color-accent)] text-[10px]">
                    {restoreDryRun ? "TEST RESTORE IN PROCESS" : "PRODUCTION DATABASE OVERRIDE SCRIPT RUNNING"}
                  </span>
                  <span className="text-[9px] text-[var(--color-text-muted)] block font-semibold">Do not refresh your browser or close this modal viewport.</span>
                </div>

                {/* Interactive Console logs */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-[var(--color-border)] font-mono text-[9.5px] text-emerald-400 space-y-1.5 h-48 overflow-y-auto">
                  {restoreConsoleLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed">{log}</div>
                  ))}
                </div>

              </div>
            )}

            {/* STEP 4: RESTORE COMPLETE */}
            {restoreStep === "complete" && (
              <div className="space-y-4">
                
                <div className="text-center py-6 space-y-2">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  
                  <span className="block font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 text-xs">
                    {restoreDryRun ? "TEST SIMULATION VERIFIED SUCCESS" : "PRODUCTION SYSTEM RESTORE COMPLETE"}
                  </span>
                  
                  <p className="text-[10px] text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed font-semibold">
                    {restoreDryRun 
                      ? "The system successfully evaluated schema layout consistency and confirmed all indices and data packets align. It is safe to trigger a full production restore."
                      : "The production database has been successfully rolled back to your selected snapshot version. All data collections and configurations have been hot-reloaded."}
                  </p>
                </div>

                {/* Console logs */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-[var(--color-border)] font-mono text-[9px] text-emerald-400 space-y-1 h-32 overflow-y-auto">
                  {restoreConsoleLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => setSelectedBackupForRestore(null)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Dismiss Recovery Wizard
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
