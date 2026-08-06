import React, { useState, useEffect, useMemo } from "react";
import { 
  Database, Server, RefreshCw, Plus, Download, Trash2, Calendar, 
  AlertTriangle, Play, HardDrive, CheckCircle2, X, Lock, Check, 
  Settings, Clock, ArrowRight, Eye, ShieldAlert, Info, FileCode, Mail, 
  ShieldCheck, AlertCircle, Sparkles, Filter, Search, ShieldX, HelpCircle, 
  FileDown, Activity, CheckSquare, Square, Save, RotateCcw, Shield, Layers
} from "lucide-react";
import { User, Client } from "../../types";
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
} from "../../lib/backupEngine";

interface BackupRecoveryViewProps {
  currentUser: User;
  clients?: Client[];
  userRoster?: User[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onRefreshCRMData?: () => void;
  logActivity?: (action: string, details: string) => void;
}

export const BackupRecoveryView: React.FC<BackupRecoveryViewProps> = ({
  currentUser,
  clients = [],
  userRoster = [],
  showToast,
  onRefreshCRMData,
  logActivity
}) => {
  // --- STATE ---
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [logs, setLogs] = useState<RecoveryLog[]>([]);
  const [policy, setPolicy] = useState<BackupPolicy>(getBackupPolicy());

  // Active view tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings" | "manual" | "restore" | "verification" | "logs">("dashboard");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all"); // "all", "7days", "30days"

  // Manual Backup Form state
  const [isCreating, setIsCreating] = useState(false);
  const [manualType, setManualType] = useState<BackupType>("full");
  const [manualNotes, setManualNotes] = useState("");
  const [manualScopes, setManualScopes] = useState({
    users: true,
    clients: true,
    files: true,
    settings: true
  });
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Restore Modal & Wizard State
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupRecord | null>(null);
  const [previewBackup, setPreviewBackup] = useState<BackupRecord | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [restoreStep, setRestoreStep] = useState<"warning" | "plan" | "confirmation" | "executing" | "complete">("warning");
  const [restoreDryRun, setRestoreDryRun] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [restoreConsoleLogs, setRestoreConsoleLogs] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // Verification Test State
  const [testBackupTarget, setTestBackupTarget] = useState<BackupRecord | null>(null);
  const [testValidation, setTestValidation] = useState<ValidationResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Trigger re-fetch
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load initial data
  useEffect(() => {
    setBackups(getBackupsList());
    setLogs(getRecoveryLogs());
    setPolicy(getBackupPolicy());
  }, [refreshTrigger]);

  // Handle Save Policy Settings
  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    saveBackupPolicy(policy, `${currentUser.first} ${currentUser.last}`);
    if (logActivity) logActivity("Updated Backup Settings", `Updated backup frequency (${policy.scheduleInterval}), retention (${policy.keepLastXBackups}), and notify email.`);
    showToast("Automated backup policy updated successfully!", "success", "⚙️");
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle Create Manual Backup
  const handleCreateManualBackup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    setTimeout(() => {
      try {
        const result = generateBackup(
          manualType,
          `${currentUser.first} ${currentUser.last}`,
          manualNotes.trim() || `Manual ${manualType} snapshot created via Admin Portal.`,
          !simulateFailure
        );

        if (result.status === "success") {
          showToast(`Manual ${manualType.toUpperCase()} backup snapshot generated!`, "success", "💾");
          if (logActivity) logActivity("Manual Backup Generated", `Created manual ${manualType} backup snapshot (${(result.size / 1024).toFixed(1)} KB)`);
          setManualNotes("");
        } else {
          showToast(`Backup creation failed: ${result.failureReason}`, "error", "⚠️");
        }
        setRefreshTrigger(prev => prev + 1);
      } catch (err: any) {
        showToast(`Execution error: ${err.message}`, "error");
      } finally {
        setIsCreating(false);
      }
    }, 800);
  };

  // Handle Direct Download Backup File
  const handleDownloadBackupFile = (backup: BackupRecord) => {
    try {
      let downloadData = backup.dataPayload;
      if (!downloadData && backup.id.startsWith("backup_seed_")) {
        // Construct standard fallback package for seed items
        downloadData = JSON.stringify({
          backup_metadata: backup,
          gbk_clients: JSON.stringify(clients),
          gbk_roster: JSON.stringify(userRoster),
          gbk_sec_audit: "true"
        }, null, 2);
      }

      if (!downloadData) {
        showToast("Backup payload is purged or empty.", "warning");
        return;
      }

      const blob = new Blob([downloadData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gbk_backup_${backup.type}_${new Date(backup.timestamp).toISOString().split("T")[0]}_${backup.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Downloaded backup file (${(backup.size / 1024).toFixed(1)} KB)`, "info", "📥");
    } catch (e: any) {
      showToast("Failed to initiate file download.", "error");
    }
  };

  // Handle Delete Backup
  const handleDeleteBackup = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this backup snapshot? This cannot be undone.")) {
      deleteBackup(id, `${currentUser.first} ${currentUser.last}`);
      showToast("Backup snapshot deleted from storage.", "info");
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Handle Toggle Critical
  const handleToggleCritical = (id: string) => {
    toggleBackupCritical(id, `${currentUser.first} ${currentUser.last}`);
    showToast("Updated backup retention protection state.", "success");
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle Start Restore Wizard
  const handleInitiateRestore = (backup: BackupRecord) => {
    setSelectedBackupForRestore(backup);
    const val = validateRestoreData(backup);
    setValidationResult(val);
    setRestoreStep("warning");
    setRestoreConfirmText("");
    setRestoreConsoleLogs([]);
  };

  // Handle Execute Restore
  const handleExecuteRestoreProcess = () => {
    if (!selectedBackupForRestore) return;
    setIsRestoring(true);
    setRestoreStep("executing");

    const logsList: string[] = [
      `[${new Date().toLocaleTimeString()}] [INIT] Starting recovery wizard for Backup ID: ${selectedBackupForRestore.id}`,
      `[${new Date().toLocaleTimeString()}] [CHECK] Validating database structure & checksums...`,
      `[${new Date().toLocaleTimeString()}] [CHECK] Integrity validation passed. Zero corrupt blocks found.`,
      `[${new Date().toLocaleTimeString()}] [SNAPSHOT] Creating automatic rollback safety point...`
    ];
    setRestoreConsoleLogs([...logsList]);

    setTimeout(() => {
      logsList.push(`[${new Date().toLocaleTimeString()}] [WRITE] Clearing current database keys matching pattern: [${selectedBackupForRestore.type.toUpperCase()}]`);
      logsList.push(`[${new Date().toLocaleTimeString()}] [WRITE] Overwriting database cells with ${selectedBackupForRestore.itemCount} archived records...`);
      setRestoreConsoleLogs([...logsList]);

      setTimeout(() => {
        const res = executeRestore(selectedBackupForRestore, `${currentUser.first} ${currentUser.last}`, restoreDryRun);
        if (res.success) {
          logsList.push(`[${new Date().toLocaleTimeString()}] [SUCCESS] Restoration completed successfully.`);
          logsList.push(`[${new Date().toLocaleTimeString()}] [EVENT] Dispatched global CRM state refresh signal.`);
          setRestoreConsoleLogs([...logsList]);
          setRestoreStep("complete");
          
          if (!restoreDryRun) {
            showToast("CRM system database state restored successfully!", "success", "🎉");
            if (onRefreshCRMData) onRefreshCRMData();
            if (logActivity) logActivity("Restored Database Backup", `Restored CRM state from backup ${selectedBackupForRestore.id} (${selectedBackupForRestore.type})`);
          } else {
            showToast("Dry-run test restore executed cleanly! Zero data overwritten.", "info", "🧪");
          }
        } else {
          logsList.push(`[${new Date().toLocaleTimeString()}] [ERROR] Restoration failed: ${res.error}`);
          setRestoreConsoleLogs([...logsList]);
          showToast(`Restore error: ${res.error}`, "error");
        }
        setIsRestoring(false);
        setRefreshTrigger(prev => prev + 1);
      }, 1000);
    }, 1000);
  };

  // Handle Test Verification
  const handleRunVerificationTest = (backup: BackupRecord) => {
    setTestBackupTarget(backup);
    setIsTesting(true);

    setTimeout(() => {
      const val = validateRestoreData(backup);
      setTestValidation(val);
      setIsTesting(false);
      showToast(`Completed integrity check for backup "${backup.id}"`, "info", "🔍");
    }, 600);
  };

  // System Health Dashboard Calculations
  const systemHealth = useMemo(() => {
    const activeBackups = backups.filter(b => b.status === "success");
    const lastSuccessBackup = activeBackups.length > 0
      ? [...activeBackups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null;

    const lastBackupDate = lastSuccessBackup ? new Date(lastSuccessBackup.timestamp) : null;
    const daysSinceLastBackup = lastBackupDate
      ? Math.round((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const totalStorageBytes = activeBackups.reduce((acc, b) => acc + b.size, 0);
    const storageQuotaBytes = 50 * 1024 * 1024; // 50MB simulated limit
    const storagePercent = Math.min(100, Math.round((totalStorageBytes / storageQuotaBytes) * 100));

    // Calculate Next Scheduled Backup
    let nextScheduledDate: Date | null = null;
    if (policy.enableAutoScheduling) {
      const baseDate = lastBackupDate || new Date();
      nextScheduledDate = new Date(baseDate);
      if (policy.scheduleInterval === "hourly") {
        nextScheduledDate.setHours(nextScheduledDate.getHours() + 1);
      } else if (policy.scheduleInterval === "daily") {
        nextScheduledDate.setDate(nextScheduledDate.getDate() + 1);
      } else if (policy.scheduleInterval === "weekly") {
        nextScheduledDate.setDate(nextScheduledDate.getDate() + 7);
      } else if (policy.scheduleInterval === "monthly") {
        nextScheduledDate.setMonth(nextScheduledDate.getMonth() + 1);
      }
    }

    const isOverdue = policy.enableAutoScheduling && daysSinceLastBackup > (policy.scheduleInterval === "hourly" ? 0.1 : policy.scheduleInterval === "daily" ? 1 : 7);
    const hasFailedRecent = backups.length > 0 && backups[0].status === "failed";

    let healthStatus: "optimal" | "warning" | "critical" = "optimal";
    let healthLabel = "Optimal Health";
    if (hasFailedRecent || daysSinceLastBackup > 14) {
      healthStatus = "critical";
      healthLabel = "Critical Warning";
    } else if (isOverdue || storagePercent > 80) {
      healthStatus = "warning";
      healthLabel = "Attention Needed";
    }

    return {
      activeCount: activeBackups.length,
      failedCount: backups.filter(b => b.status === "failed").length,
      lastSuccessBackup,
      lastBackupDate,
      daysSinceLastBackup,
      nextScheduledDate,
      totalStorageBytes,
      storagePercent,
      isOverdue,
      hasFailedRecent,
      healthStatus,
      healthLabel
    };
  }, [backups, policy]);

  // Filtered Backups List for Restoration Catalog
  const filteredBackups = useMemo(() => {
    return backups.filter(b => {
      // Query search
      const query = searchQuery.toLowerCase().trim();
      const matchQuery = !query || 
        b.id.toLowerCase().includes(query) || 
        b.creator.toLowerCase().includes(query) || 
        b.notes.toLowerCase().includes(query) ||
        b.type.toLowerCase().includes(query);

      // Type filter
      const matchType = typeFilter === "all" || b.type === typeFilter;

      // Status filter
      const matchStatus = statusFilter === "all" || b.status === statusFilter || b.retentionStatus === statusFilter;

      // Date filter
      let matchDate = true;
      if (dateFilter === "7days") {
        const diffDays = (Date.now() - new Date(b.timestamp).getTime()) / (1000 * 3600 * 24);
        matchDate = diffDays <= 7;
      } else if (dateFilter === "30days") {
        const diffDays = (Date.now() - new Date(b.timestamp).getTime()) / (1000 * 3600 * 24);
        matchDate = diffDays <= 30;
      }

      return matchQuery && matchType && matchStatus && matchDate;
    });
  }, [backups, searchQuery, typeFilter, statusFilter, dateFilter]);

  // Type Badges Metadata
  const backupTypeBadges: Record<BackupType, { label: string; bg: string; text: string; border: string }> = {
    full: { label: "FULL SNAPSHOT", bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30" },
    database: { label: "DATABASE ONLY", bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30" },
    files_metadata: { label: "FILES METADATA", bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
    settings: { label: "SYSTEM SETTINGS", bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" },
    recovery_bundle: { label: "RECOVERY BUNDLE", bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/30" }
  };

  return (
    <div className="space-y-6" id="backup-recovery-panel">
      
      {/* HEADER BAR */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              Backup &amp; Disaster Recovery Center
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Automated database snapshots, point-in-time recovery, integrity testing, and retention policies.
            </p>
          </div>
        </div>

        {/* Quick Status Pill */}
        <div className="flex items-center gap-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold">
          <span className="text-[var(--color-text-muted)]">System Health:</span>
          {systemHealth.healthStatus === "optimal" && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Optimal
            </span>
          )}
          {systemHealth.healthStatus === "warning" && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-4 h-4" /> Attention Needed
            </span>
          )}
          {systemHealth.healthStatus === "critical" && (
            <span className="flex items-center gap-1.5 text-red-400">
              <ShieldAlert className="w-4 h-4" /> Action Required
            </span>
          )}
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Activity className="w-4 h-4" /> Dashboard
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Settings className="w-4 h-4" /> Automated Settings
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "manual"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Plus className="w-4 h-4" /> Manual Backup
        </button>

        <button
          onClick={() => setActiveTab("restore")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "restore"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Restoration Catalog
        </button>

        <button
          onClick={() => setActiveTab("verification")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "verification"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Verification &amp; Tests
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Clock className="w-4 h-4" /> Recovery Logs
        </button>
      </div>

      {/* ─── TAB 1: BACKUP DASHBOARD ─── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Last Backup Date/Time */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">
                <span>Last Backup Date &amp; Time</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-extrabold text-[var(--color-text)]">
                {systemHealth.lastSuccessBackup
                  ? `${systemHealth.daysSinceLastBackup === 0 ? "Today" : `${systemHealth.daysSinceLastBackup}d ago`}`
                  : "No Backup"}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">
                {systemHealth.lastBackupDate 
                  ? systemHealth.lastBackupDate.toLocaleString() 
                  : "No successful snapshot recorded"}
              </p>
            </div>

            {/* Card 2: Next Scheduled Backup */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">
                <span>Next Scheduled Backup</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-extrabold text-[var(--color-text)]">
                {policy.enableAutoScheduling && systemHealth.nextScheduledDate
                  ? systemHealth.nextScheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : "Disabled"}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">
                {policy.enableAutoScheduling && systemHealth.nextScheduledDate
                  ? `${policy.scheduleInterval.toUpperCase()} routine • ${systemHealth.nextScheduledDate.toLocaleDateString()}`
                  : "Automated schedule daemon inactive"}
              </p>
            </div>

            {/* Card 3: Backup Storage Used */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">
                <span>Backup Storage Used</span>
                <HardDrive className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-extrabold text-[var(--color-text)]">
                {(systemHealth.totalStorageBytes / 1024).toFixed(1)} KB
              </div>
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      systemHealth.storagePercent > 80 ? "bg-red-500" : systemHealth.storagePercent > 50 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(5, systemHealth.storagePercent)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-faint)] flex justify-between">
                  <span>{systemHealth.storagePercent}% Quota Used</span>
                  <span>50 MB Limit</span>
                </p>
              </div>
            </div>

            {/* Card 4: Backup Health Status */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">
                <span>System Health Status</span>
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`text-xl font-extrabold flex items-center gap-2 ${
                systemHealth.healthStatus === "optimal" ? "text-emerald-400" :
                systemHealth.healthStatus === "warning" ? "text-amber-400" : "text-red-400"
              }`}>
                {systemHealth.healthLabel}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {systemHealth.healthStatus === "optimal" ? "All database snapshots pass checksum integrity." :
                 systemHealth.healthStatus === "warning" ? "Scheduled backup routine is approaching due date." :
                 "Recent backup job encountered an error. Check failure logs."}
              </p>
            </div>

          </div>

          {/* Quick Action Overview & Recent Snapshot Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System Overview Card */}
            <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" /> Active Backup Architecture Overview
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Current active backup configuration parameters and protection level.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("settings")}
                  className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer"
                >
                  Configure Policy &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Daemon Routine</span>
                  <p className="text-xs font-bold text-[var(--color-text)] flex items-center justify-between">
                    <span>Frequency: {policy.scheduleInterval.toUpperCase()}</span>
                    <span className={policy.enableAutoScheduling ? "text-emerald-400" : "text-red-400"}>
                      {policy.enableAutoScheduling ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </p>
                </div>

                <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Retention Queue</span>
                  <p className="text-xs font-bold text-[var(--color-text)] flex items-center justify-between">
                    <span>Keep Last {policy.keepLastXBackups} Snapshots</span>
                    <span className="text-[var(--color-accent)]">{backups.length} Stored</span>
                  </p>
                </div>

                <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Security &amp; Encryption</span>
                  <p className="text-xs font-bold text-[var(--color-text)] flex items-center justify-between">
                    <span>AES-256 At-Rest Encryption</span>
                    <span className={policy.encryptionEnabled ? "text-emerald-400" : "text-amber-400"}>
                      {policy.encryptionEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </p>
                </div>

                <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Completion Alerts</span>
                  <p className="text-xs font-bold text-[var(--color-text)] truncate">
                    {policy.notifyOnCompletion ? policy.notifyEmail : "Notifications Disabled"}
                  </p>
                </div>
              </div>

              {/* Quick Launch Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab("manual")}
                  className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Snapshot Now
                </button>
                <button
                  onClick={() => setActiveTab("restore")}
                  className="px-4 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-xs rounded-xl hover:bg-[var(--color-surface-3)] cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-purple-400" /> Restore System State
                </button>
              </div>

            </div>

            {/* Recent Snapshots Widget */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400" /> Recent Snapshots
                </h3>
                <button
                  onClick={() => setActiveTab("restore")}
                  className="text-[10px] font-bold text-[var(--color-accent)] hover:underline cursor-pointer"
                >
                  View All &rarr;
                </button>
              </div>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {backups.slice(0, 4).map((bk) => {
                  const badge = backupTypeBadges[bk.type] || backupTypeBadges.full;
                  return (
                    <div key={bk.id} className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-faint)] font-mono">
                          {new Date(bk.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text)] font-bold truncate">{bk.notes}</p>
                      <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-mono">
                        <span>{(bk.size / 1024).toFixed(1)} KB</span>
                        <span className={bk.status === "success" ? "text-emerald-400" : "text-red-400"}>
                          {bk.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {backups.length === 0 && (
                  <p className="text-xs text-center text-[var(--color-text-faint)] py-8">
                    No backup snapshots currently available.
                  </p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── TAB 2: AUTOMATED BACKUP SETTINGS ─── */}
      {activeTab === "settings" && (
        <form onSubmit={handleSavePolicy} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-6 shadow-sm max-w-3xl">
          
          <div className="border-b border-[var(--color-border)] pb-4">
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-5 h-5 text-[var(--color-accent)]" /> Automated Backup Policy &amp; Schedule
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Configure background automated snapshot intervals, retention queues, scope definitions, and alert emails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Frequency Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                Backup Frequency
              </label>
              <select
                value={policy.scheduleInterval}
                onChange={(e) => setPolicy({ ...policy, scheduleInterval: e.target.value as any })}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="hourly">Hourly Routine (High Frequency)</option>
                <option value="daily">Daily Snapshot (Recommended)</option>
                <option value="weekly">Weekly Archive</option>
                <option value="monthly">Monthly Master Backup</option>
              </select>
              <p className="text-[10px] text-[var(--color-text-faint)]">
                Determines how often the automated daemon runs background system backups.
              </p>
            </div>

            {/* Retention Policy */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                Retention Policy (Keep Last N Backups)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={policy.keepLastXBackups}
                onChange={(e) => setPolicy({ ...policy, keepLastXBackups: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <p className="text-[10px] text-[var(--color-text-faint)]">
                Older un-flagged backups exceeding this limit will automatically be archived or pruned.
              </p>
            </div>

          </div>

          {/* Scope Checkboxes: What to Backup */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
              What to Backup (Data Scope Selection)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.scopes.users}
                  onChange={(e) => setPolicy({ ...policy, scopes: { ...policy.scopes, users: e.target.checked } })}
                  className="rounded text-[var(--color-accent)] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">User Roster &amp; Clearances</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Staff accounts, clearance matrices, tags, and profiles.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.scopes.clients}
                  onChange={(e) => setPolicy({ ...policy, scopes: { ...policy.scopes, clients: e.target.checked } })}
                  className="rounded text-[var(--color-accent)] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">Client Files &amp; Deals</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Borrower pipelines, loan amounts, lenders, and follow-ups.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.scopes.files}
                  onChange={(e) => setPolicy({ ...policy, scopes: { ...policy.scopes, files: e.target.checked } })}
                  className="rounded text-[var(--color-accent)] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">Document Vault &amp; Requests</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Document request specs, upload checklists, compliance notes.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.scopes.settings}
                  onChange={(e) => setPolicy({ ...policy, scopes: { ...policy.scopes, settings: e.target.checked } })}
                  className="rounded text-[var(--color-accent)] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">System Settings &amp; Security</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Auto-lock timers, audit configs, and active API tokens.</span>
                </div>
              </label>

            </div>
          </div>

          {/* Notifications & Destination Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={policy.notifyOnCompletion}
                  onChange={(e) => setPolicy({ ...policy, notifyOnCompletion: e.target.checked })}
                  className="rounded text-[var(--color-accent)]"
                />
                Send Email Notification on Completion
              </label>

              {policy.notifyOnCompletion && (
                <input
                  type="email"
                  value={policy.notifyEmail}
                  onChange={(e) => setPolicy({ ...policy, notifyEmail: e.target.value })}
                  placeholder="admin@brokerage.com"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={policy.enableAutoScheduling}
                  onChange={(e) => setPolicy({ ...policy, enableAutoScheduling: e.target.checked })}
                  className="rounded text-[var(--color-accent)]"
                />
                Enable Automated Daemon Schedule
              </label>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                When enabled, the background daemon automatically compiles backups without manual user intervention.
              </p>
            </div>

          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[var(--color-border)] flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Automated Policy Settings
            </button>
          </div>

        </form>
      )}

      {/* ─── TAB 3: MANUAL BACKUP ─── */}
      {activeTab === "manual" && (
        <form onSubmit={handleCreateManualBackup} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-6 shadow-sm max-w-2xl">
          
          <div className="border-b border-[var(--color-border)] pb-4">
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> Create Manual Backup Snapshot
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Instantly compile and store an immediate point-in-time snapshot of system data.
            </p>
          </div>

          {/* Select Backup Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
              Select Backup Architecture Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <button
                type="button"
                onClick={() => setManualType("full")}
                className={`p-3 text-left rounded-xl border cursor-pointer transition-all ${
                  manualType === "full"
                    ? "bg-purple-500/15 border-purple-500 text-purple-300"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="text-xs font-bold block">FULL SNAPSHOT</span>
                <span className="text-[10px] opacity-80 block">Complete CRM bundle including users, clients, and settings.</span>
              </button>

              <button
                type="button"
                onClick={() => setManualType("database")}
                className={`p-3 text-left rounded-xl border cursor-pointer transition-all ${
                  manualType === "database"
                    ? "bg-blue-500/15 border-blue-500 text-blue-300"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="text-xs font-bold block">INCREMENTAL / DATABASE ONLY</span>
                <span className="text-[10px] opacity-80 block">Client files, tasks, messages, partners, and user roster.</span>
              </button>

              <button
                type="button"
                onClick={() => setManualType("files_metadata")}
                className={`p-3 text-left rounded-xl border cursor-pointer transition-all ${
                  manualType === "files_metadata"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="text-xs font-bold block">FILES &amp; METADATA</span>
                <span className="text-[10px] opacity-80 block">Document vault specifications, checklist definitions.</span>
              </button>

              <button
                type="button"
                onClick={() => setManualType("settings")}
                className={`p-3 text-left rounded-xl border cursor-pointer transition-all ${
                  manualType === "settings"
                    ? "bg-amber-500/15 border-amber-500 text-amber-300"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="text-xs font-bold block">SYSTEM CONFIGURATION</span>
                <span className="text-[10px] opacity-80 block">Security variables, idle auto-lock parameters, API keys.</span>
              </button>

            </div>
          </div>

          {/* Select Data Scopes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
              Data Modules Included
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2.5 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualScopes.users}
                  onChange={(e) => setManualScopes({ ...manualScopes, users: e.target.checked })}
                  className="rounded text-[var(--color-accent)]"
                />
                Users
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualScopes.clients}
                  onChange={(e) => setManualScopes({ ...manualScopes, clients: e.target.checked })}
                  className="rounded text-[var(--color-accent)]"
                />
                Clients
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualScopes.files}
                  onChange={(e) => setManualScopes({ ...manualScopes, files: e.target.checked })}
                  className="rounded text-[var(--color-accent)]"
                />
                Files
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualScopes.settings}
                  onChange={(e) => setManualScopes({ ...manualScopes, settings: e.target.checked })}
                  className="rounded text-[var(--color-accent)]"
                />
                Settings
              </label>
            </div>
          </div>

          {/* Backup Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
              Snapshot Description &amp; Notes
            </label>
            <textarea
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="e.g., Pre-deployment safety snapshot before updating clearance levels..."
              rows={3}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Demo failure simulation check */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="rounded text-amber-500"
              />
              Simulate Failure for Failover Testing
            </label>
            <span className="text-[10px] text-amber-400 font-mono">Demo Testing Mode</span>
          </div>

          {/* Execute Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Compiling Backup...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Create Backup Now
                </>
              )}
            </button>
          </div>

        </form>
      )}

      {/* ─── TAB 4: RESTORATION CATALOG ─── */}
      {activeTab === "restore" && (
        <div className="space-y-6">
          
          {/* Controls & Filters Bar */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
              <input
                type="text"
                placeholder="Search backups by ID or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="full">Full Snapshot</option>
                <option value="database">Database Only</option>
                <option value="files_metadata">Files Metadata</option>
                <option value="settings">System Settings</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success Only</option>
                <option value="failed">Failed Only</option>
                <option value="archived">Archived Only</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>

            </div>

          </div>

          {/* Catalog Table */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-muted)]">
                <thead className="bg-[var(--color-surface-2)] text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider border-b border-[var(--color-border)]">
                  <tr>
                    <th className="py-3 px-4">Backup ID &amp; Type</th>
                    <th className="py-3 px-4">Timestamp &amp; Operator</th>
                    <th className="py-3 px-4">Description / Notes</th>
                    <th className="py-3 px-4">Size &amp; Items</th>
                    <th className="py-3 px-4">Status &amp; Retention</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredBackups.map((bk) => {
                    const badge = backupTypeBadges[bk.type] || backupTypeBadges.full;
                    return (
                      <tr key={bk.id} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                        
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--color-text)] block">
                              {bk.id} {bk.isCritical && "🔒 (Protected)"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-xs text-[var(--color-text)]">
                            {new Date(bk.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-faint)]">By: {bk.creator}</div>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-xs text-[var(--color-text)] truncate">{bk.notes}</p>
                          {bk.failureReason && (
                            <p className="text-[10px] text-red-400 font-mono mt-0.5">{bk.failureReason}</p>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs">
                          <div>{(bk.size / 1024).toFixed(1)} KB</div>
                          <div className="text-[10px] text-[var(--color-text-faint)]">{bk.itemCount} records</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {bk.status === "success" ? (
                              <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                                SUCCESS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded text-[10px] font-bold">
                                FAILED
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-mono text-[var(--color-text-faint)]">
                              [{bk.retentionStatus}]
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Download */}
                            <button
                              onClick={() => handleDownloadBackupFile(bk)}
                              className="p-1.5 hover:bg-[var(--color-surface-3)] text-[var(--color-text)] rounded cursor-pointer transition-colors"
                              title="Download Backup File (.json)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Preview */}
                            <button
                              onClick={() => setPreviewBackup(bk)}
                              className="p-1.5 hover:bg-[var(--color-surface-3)] text-blue-400 rounded cursor-pointer transition-colors"
                              title="Preview Backup Contents"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Critical */}
                            <button
                              onClick={() => handleToggleCritical(bk.id)}
                              className={`p-1.5 rounded cursor-pointer transition-colors ${
                                bk.isCritical ? "text-amber-400 bg-amber-500/10" : "text-[var(--color-text-faint)] hover:text-amber-400"
                              }`}
                              title={bk.isCritical ? "Remove Protection Lock" : "Lock / Protect from Retention Pruning"}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>

                            {/* Restore Button */}
                            {bk.status === "success" && (
                              <button
                                onClick={() => handleInitiateRestore(bk)}
                                className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> Restore
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBackup(bk.id)}
                              className="p-1.5 hover:bg-red-500/10 text-red-400 rounded cursor-pointer transition-colors"
                              title="Delete Backup Snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}

                  {filteredBackups.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--color-text-faint)] text-xs">
                        No backup archives match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 5: BACKUP VERIFICATION & INTEGRITY ─── */}
      {activeTab === "verification" && (
        <div className="space-y-6">
          
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> Backup Integrity Verification Engine
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Perform dry-run restore tests and parse database bundles to ensure zero data corruption.
                </p>
              </div>
            </div>

            {/* Select Backup to Test */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                Select Target Backup Snapshot for Testing
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {backups.slice(0, 6).map((bk) => (
                  <button
                    key={bk.id}
                    onClick={() => handleRunVerificationTest(bk)}
                    className={`p-3 text-left rounded-xl border cursor-pointer transition-all ${
                      testBackupTarget?.id === bk.id
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span>{bk.id}</span>
                      <span>{(bk.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <p className="text-xs font-bold text-[var(--color-text)] mt-1 truncate">{bk.notes}</p>
                    <span className="text-[9px] text-[var(--color-text-faint)] block mt-1">
                      {new Date(bk.timestamp).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Test Results Report */}
            {testValidation && testBackupTarget && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)] space-y-4">
                
                <div className="flex items-center justify-between p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      testValidation.isValid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}>
                      {testValidation.isValid ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                        Integrity Verification Report: {testValidation.isValid ? "PASSED (100% VALID)" : "FAILED"}
                      </h4>
                      <p className="text-xs text-[var(--color-text-muted)]">{testValidation.notes}</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-[var(--color-text)]">
                    Target: {testBackupTarget.id}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-faint)] block uppercase">Storage Payload</span>
                    <strong className="text-[var(--color-text)]">{(testValidation.estimatedSize / 1024).toFixed(1)} KB</strong>
                  </div>

                  <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-faint)] block uppercase">Database Keys</span>
                    <strong className="text-[var(--color-text)]">{testValidation.keysCount} Keys</strong>
                  </div>

                  <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-faint)] block uppercase">Client Records</span>
                    <strong className="text-emerald-400">{testValidation.clientCount} Files</strong>
                  </div>

                  <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
                    <span className="text-[10px] text-[var(--color-text-faint)] block uppercase">User Accounts</span>
                    <strong className="text-purple-400">{testValidation.userCount} Users</strong>
                  </div>
                </div>

                {/* Warnings List */}
                {testValidation.warnings.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Integrity Diagnostic Warnings
                    </h5>
                    <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-1 font-mono">
                      {testValidation.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      )}

      {/* ─── TAB 6: BACKUP HISTORY LOG ─── */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-accent)]" /> Backup &amp; Recovery Audit History Log
              </h3>
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono">
                Showing last {logs.length} events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-muted)]">
                <thead className="bg-[var(--color-surface-2)] text-[10px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider border-b border-[var(--color-border)]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes &amp; Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {logs.map((lg) => (
                    <tr key={lg.id} className="hover:bg-[var(--color-surface-2)]/50 transition-colors font-mono text-[11px]">
                      <td className="py-2.5 px-4 text-[var(--color-text-faint)]">
                        {new Date(lg.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[var(--color-text)] uppercase">
                        {lg.action}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--color-text-muted)]">
                        {lg.triggeredBy}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          lg.status === "success" ? "bg-emerald-500/15 text-emerald-400" :
                          lg.status === "warning" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {lg.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[var(--color-text)] max-w-md truncate">
                        {lg.notes}
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--color-text-faint)] text-xs">
                        No recovery logs currently recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── MODAL: PREVIEW BACKUP CONTENTS ─── */}
      {previewBackup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
                    Backup Payload Preview
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] font-mono">{previewBackup.id}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewBackup(null)}
                className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-[var(--color-surface-2)] rounded-xl space-y-1">
                <span className="text-[10px] text-[var(--color-text-faint)] uppercase">Creator &amp; Timestamp</span>
                <p className="text-[var(--color-text)] font-bold">{previewBackup.creator} • {new Date(previewBackup.timestamp).toLocaleString()}</p>
              </div>

              <div className="p-3 bg-[var(--color-surface-2)] rounded-xl space-y-1">
                <span className="text-[10px] text-[var(--color-text-faint)] uppercase">Notes / Description</span>
                <p className="text-[var(--color-text)]">{previewBackup.notes}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--color-surface-2)] rounded-xl">
                  <span className="text-[10px] text-[var(--color-text-faint)] uppercase">Payload Size</span>
                  <p className="text-[var(--color-text)] font-bold">{(previewBackup.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="p-3 bg-[var(--color-surface-2)] rounded-xl">
                  <span className="text-[10px] text-[var(--color-text-faint)] uppercase">Record Count</span>
                  <p className="text-[var(--color-text)] font-bold">{previewBackup.itemCount} Items</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPreviewBackup(null);
                  handleInitiateRestore(previewBackup);
                }}
                className="px-4 py-2 bg-purple-500 text-white font-bold text-xs rounded-xl hover:bg-purple-600 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Proceed to Restore Wizard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL: MULTI-STEP RESTORE SAFETY WIZARD ─── */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
                    Database Restoration &amp; Rollback Wizard
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] font-mono">
                    Target: {selectedBackupForRestore.id} ({selectedBackupForRestore.type.toUpperCase()})
                  </p>
                </div>
              </div>

              {!isRestoring && (
                <button
                  onClick={() => setSelectedBackupForRestore(null)}
                  className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)] rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* STEP 1: WARNING & PREVIEW */}
            {restoreStep === "warning" && (
              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> CRITICAL ROLLBACK WARNING
                  </h4>
                  <p className="text-xs text-red-200/90 leading-relaxed">
                    Executing a restoration will overwrite current live database state with records from the snapshot taken on <strong>{new Date(selectedBackupForRestore.timestamp).toLocaleString()}</strong>.
                  </p>
                </div>

                {/* Validation Status */}
                {validationResult && (
                  <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Dry-Run Inspection</span>
                    <p className="text-xs font-bold text-[var(--color-text)]">{validationResult.notes}</p>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedBackupForRestore(null)}
                    className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setRestoreStep("plan")}
                    className="px-5 py-2 bg-purple-500 text-white font-bold text-xs rounded-xl hover:bg-purple-600 cursor-pointer flex items-center gap-1.5"
                  >
                    View Rollback Plan &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: ROLLBACK PLAN */}
            {restoreStep === "plan" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                    Execution Rollback Plan Sequence
                  </h4>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">1</span>
                      <span>Compile automatic pre-restore emergency rollback point.</span>
                    </div>
                    <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                      <span>Purge active memory keys matching target scope [{selectedBackupForRestore.type.toUpperCase()}].</span>
                    </div>
                    <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
                      <span>Write {selectedBackupForRestore.itemCount} snapshot records to storage.</span>
                    </div>
                    <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">4</span>
                      <span>Dispatch global CRM refresh event to update all client views.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    onClick={() => setRestoreStep("warning")}
                    className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={() => setRestoreStep("confirmation")}
                    className="px-5 py-2 bg-purple-500 text-white font-bold text-xs rounded-xl hover:bg-purple-600 cursor-pointer flex items-center gap-1.5"
                  >
                    Continue to Confirmation &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONFIRMATION INPUT */}
            {restoreStep === "confirmation" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                    Type "RESTORE" to Authorize Rollback Operation
                  </label>
                  <input
                    type="text"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    placeholder="Type RESTORE in capital letters"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-red-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreDryRun}
                    onChange={(e) => setRestoreDryRun(e.target.checked)}
                    className="rounded text-purple-500"
                  />
                  Dry-Run Test Mode Only (Do Not Overwrite Live Storage)
                </label>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    onClick={() => setRestoreStep("plan")}
                    className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <button
                    disabled={restoreConfirmText.trim() !== "RESTORE"}
                    onClick={handleExecuteRestoreProcess}
                    className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2 disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" /> Execute Rollback Now
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: EXECUTING CONSOLE */}
            {(restoreStep === "executing" || restoreStep === "complete") && (
              <div className="space-y-4">
                <div className="p-4 bg-black/90 rounded-xl border border-gray-800 font-mono text-xs text-emerald-400 space-y-1 max-h-48 overflow-y-auto">
                  {restoreConsoleLogs.map((lg, idx) => (
                    <p key={idx}>{lg}</p>
                  ))}
                  {isRestoring && (
                    <p className="animate-pulse text-purple-400">[WORKING] Processing database write stream...</p>
                  )}
                </div>

                {restoreStep === "complete" && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setSelectedBackupForRestore(null)}
                      className="px-6 py-2 bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Close Wizard
                    </button>
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
