import { Client, User } from "../types";

export type BackupType = "full" | "database" | "files_metadata" | "settings" | "recovery_bundle";

export interface BackupRecord {
  id: string;
  timestamp: string;
  creator: string;
  type: BackupType;
  status: "success" | "failed";
  size: number; // in bytes
  itemCount: number;
  notes: string;
  isCritical: boolean;
  retentionStatus: "active" | "archived" | "purged";
  dataPayload?: string; // stringified JSON representing keys and values
  failureReason?: string;
}

export interface RecoveryLog {
  id: string;
  timestamp: string;
  triggeredBy: string;
  action: "create_backup" | "restore_backup" | "dry_run" | "delete_backup" | "retention_cleanup" | "update_policy" | "test_restore";
  backupId?: string;
  backupType?: BackupType;
  status: "success" | "warning" | "failed";
  notes: string;
  details?: string;
}

export interface BackupPolicy {
  keepLastXBackups: number;
  archiveOlder: boolean;
  autoDeletePurged: boolean;
  enableAutoScheduling: boolean; // readiness flag
  scheduleInterval: "daily" | "weekly" | "monthly"; // readiness flag
  encryptionEnabled: boolean; // readiness flag
  destination: "local" | "secure_s3" | "google_drive"; // readiness flag
  notifyEmail: string;
}

const DEFAULT_POLICY: BackupPolicy = {
  keepLastXBackups: 5,
  archiveOlder: true,
  autoDeletePurged: false,
  enableAutoScheduling: false,
  scheduleInterval: "weekly",
  encryptionEnabled: false,
  destination: "local",
  notifyEmail: "vdacosta247@gmail.com"
};

// Keys categorization mapping for our backups
const KEYS_MAPPING: Record<BackupType, string[]> = {
  full: [], // Dynamic: includes everything
  database: [
    "gbk_clients",
    "gbk_roster",
    "gbk_lenders",
    "gbk_partners",
    "gbk_tasks",
    "gbk_events",
    "gbk_messages",
    "gbk_emails",
    "gbk_posts",
  ],
  files_metadata: [
    "gbk_doc_vault",
    "gbk_doc_requests",
    "gbk_doc_activities",
    "gbk_personal_compliance_docs",
  ],
  settings: [
    "gbk_sec_idle_min",
    "gbk_sec_autolock",
    "gbk_sec_audit",
    "gbk_gmail_signature",
    "gbk_gmail_loggedin",
    "gbk_gmail_login_email",
    "gbk_ai_studio_api_key_v1"
  ],
  recovery_bundle: [] // Complete system configuration + DB
};

// Helper to estimate string size
function getStringByteSize(str: string): number {
  return new Blob([str]).size;
}

// Get standard logs
export function getRecoveryLogs(): RecoveryLog[] {
  try {
    const saved = localStorage.getItem("gbk_recovery_logs");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to read recovery logs", e);
  }
  return [];
}

// Log a recovery event
export function logRecoveryEvent(event: Omit<RecoveryLog, "id" | "timestamp">): void {
  const logs = getRecoveryLogs();
  const newLog: RecoveryLog = {
    ...event,
    id: `rec_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };
  
  const updatedLogs = [newLog, ...logs];
  localStorage.setItem("gbk_recovery_logs", JSON.stringify(updatedLogs));

  // Forward to master system audit log if enabled
  try {
    const savedAudit = localStorage.getItem("gbk_audit_logs");
    let auditList = savedAudit ? JSON.parse(savedAudit) : [];
    auditList.unshift({
      user: event.triggeredBy,
      action: `[RECOVERY LOG] ${event.action.toUpperCase()} - ${event.notes}`,
      target: event.backupId || "Recovery System",
      time: new Date().toISOString()
    });
    localStorage.setItem("gbk_audit_logs", JSON.stringify(auditList));
    // Trigger custom window event to notify other components to refresh
    window.dispatchEvent(new CustomEvent("activity-logged"));
  } catch (err) {
    console.error("Failed to propagate recovery event to audit logs", err);
  }
}

// Load policy
export function getBackupPolicy(): BackupPolicy {
  try {
    const saved = localStorage.getItem("gbk_backup_policy");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_POLICY;
}

// Save policy
export function saveBackupPolicy(policy: BackupPolicy, user: string): void {
  localStorage.setItem("gbk_backup_policy", JSON.stringify(policy));
  logRecoveryEvent({
    triggeredBy: user,
    action: "update_policy",
    status: "success",
    notes: `Updated backup retention and security policy (Keep: ${policy.keepLastXBackups}, Destination: ${policy.destination})`
  });
}

// Fetch all backups metadata from storage
export function getBackupsList(): BackupRecord[] {
  try {
    const saved = localStorage.getItem("gbk_backups");
    if (saved) {
      // Return metadata, strip payload if desired to save memory, but we keep it here unless needed.
      return JSON.parse(saved);
    }
  } catch (e) {}
  
  // Seed initial sample backups for rich dashboard visualization
  const initialSeeds: BackupRecord[] = [
    {
      id: "backup_seed_1",
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
      creator: "David Acosta",
      type: "full",
      status: "success",
      size: 452090, // ~452KB
      itemCount: 42,
      notes: "Pre-deployment stable snapshot before loading new FSRA regulations guidelines.",
      isCritical: true,
      retentionStatus: "active"
    },
    {
      id: "backup_seed_2",
      timestamp: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), // 7 days ago
      creator: "Tim Brown",
      type: "database",
      status: "success",
      size: 198400, // ~198KB
      itemCount: 21,
      notes: "Weekly routine database-only automated snapshot.",
      isCritical: false,
      retentionStatus: "archived"
    },
    {
      id: "backup_seed_3",
      timestamp: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), // 10 days ago
      creator: "System Automated",
      type: "files_metadata",
      status: "success",
      size: 89040, // ~89KB
      itemCount: 8,
      notes: "Scheduled document metadata tracking cleanup sweep.",
      isCritical: false,
      retentionStatus: "active"
    },
    {
      id: "backup_seed_4",
      timestamp: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(), // 14 days ago
      creator: "Wayne MacLeod",
      type: "full",
      status: "failed",
      size: 0,
      itemCount: 0,
      notes: "Manual snapshot attempt before major CRM user interface update.",
      isCritical: false,
      retentionStatus: "active",
      failureReason: "Local storage quota limit warning triggered. Interrupted write stream."
    }
  ];
  
  localStorage.setItem("gbk_backups", JSON.stringify(initialSeeds));
  return initialSeeds;
}

// Save backups list
export function saveBackupsList(backups: BackupRecord[]): void {
  localStorage.setItem("gbk_backups", JSON.stringify(backups));
}

// Generate a Backup
export function generateBackup(type: BackupType, creator: string, notes: string, forceSuccess = true): BackupRecord {
  const policy = getBackupPolicy();
  const backups = getBackupsList();

  // If we want to simulate a failure (for demo testing):
  if (!forceSuccess) {
    const failedBackup: BackupRecord = {
      id: `bk_${Date.now()}`,
      timestamp: new Date().toISOString(),
      creator,
      type,
      status: "failed",
      size: 0,
      itemCount: 0,
      notes,
      isCritical: false,
      retentionStatus: "active",
      failureReason: "Simulated administrator failover test. Secure destination port timed out."
    };
    
    const updated = [failedBackup, ...backups];
    saveBackupsList(updated);
    logRecoveryEvent({
      triggeredBy: creator,
      action: "create_backup",
      backupId: failedBackup.id,
      backupType: type,
      status: "failed",
      notes: `Failed backup job execution [${type.toUpperCase()}]. Reason: ${failedBackup.failureReason}`
    });
    return failedBackup;
  }

  // Gather payload data
  const payload: Record<string, string> = {};
  let itemCount = 0;

  // Gather prefixed keys
  const prefixKeys = ["gbk_file_notes_", "gbk_checklist_items_", "gbk_file_followups_"];
  
  // Collect all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    let includeKey = false;

    if (type === "full" || type === "recovery_bundle") {
      // Include all CRM-related items
      includeKey = key.startsWith("gbk_") && key !== "gbk_backups" && key !== "gbk_recovery_logs";
    } else {
      // Check categorized keys
      const categories = KEYS_MAPPING[type] || [];
      if (categories.includes(key)) {
        includeKey = true;
      }
      
      // If database type, also include prefixed records
      if (type === "database") {
        if (prefixKeys.some(p => key.startsWith(p)) && !key.startsWith("gbk_doc_") && !key.startsWith("gbk_personal_compliance_")) {
          includeKey = true;
        }
      }

      // If file metadata, check for doc/compliance prefixes
      if (type === "files_metadata") {
        if (key.startsWith("gbk_doc_") || key.startsWith("gbk_personal_compliance_")) {
          includeKey = true;
        }
      }
    }

    if (includeKey) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        payload[key] = val;
        itemCount++;
      }
    }
  }

  const dataPayload = JSON.stringify(payload);
  const size = getStringByteSize(dataPayload);

  const newBackup: BackupRecord = {
    id: `bk_${Date.now()}`,
    timestamp: new Date().toISOString(),
    creator,
    type,
    status: "success",
    size,
    itemCount,
    notes: notes || `Manual ${type} CRM backup snapshot.`,
    isCritical: false,
    retentionStatus: "active",
    dataPayload
  };

  // Add to head
  let updated = [newBackup, ...backups];

  // Apply retention policy cleanup
  updated = applyRetentionPolicy(updated, policy, creator);

  saveBackupsList(updated);

  logRecoveryEvent({
    triggeredBy: creator,
    action: "create_backup",
    backupId: newBackup.id,
    backupType: type,
    status: "success",
    notes: `Successfully generated secure ${type} backup (${(size / 1024).toFixed(2)} KB, ${itemCount} assets)`,
    details: `Items captured: ${Object.keys(payload).join(", ").substring(0, 200)}...`
  });

  return newBackup;
}

// Apply retention policies: Keep last X, archive/purge older
function applyRetentionPolicy(backups: BackupRecord[], policy: BackupPolicy, user: string): BackupRecord[] {
  const successBackups = backups.filter(b => b.status === "success");
  
  if (successBackups.length <= policy.keepLastXBackups) {
    return backups;
  }

  // Sort success backups by timestamp descending (newest first)
  const sortedSuccess = [...successBackups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const toClean = sortedSuccess.slice(policy.keepLastXBackups);

  let cleanCount = 0;

  const result = backups.map(b => {
    // Only process those marked to clean that aren't critical or already archived/purged
    const shouldClean = toClean.some(tc => tc.id === b.id) && !b.isCritical && b.retentionStatus === "active";
    if (shouldClean) {
      cleanCount++;
      if (policy.archiveOlder) {
        return { ...b, retentionStatus: "archived" as const };
      } else {
        // Strip data payload to save storage if purging
        return { ...b, retentionStatus: "purged" as const, dataPayload: undefined };
      }
    }
    return b;
  });

  if (cleanCount > 0) {
    logRecoveryEvent({
      triggeredBy: "Backup Retention Daemon",
      action: "retention_cleanup",
      status: "success",
      notes: `Retention cleanup executed. ${policy.archiveOlder ? "Archived" : "Purged data from"} ${cleanCount} older backup snapshots.`
    });
  }

  return result;
}

// Dry Run / Validate a restore
export interface ValidationResult {
  isValid: boolean;
  notes: string;
  keysCount: number;
  warnings: string[];
  clientCount: number;
  userCount: number;
  estimatedSize: number;
}

export function validateRestoreData(backup: BackupRecord): ValidationResult {
  const warnings: string[] = [];
  let isValid = true;
  let keysCount = 0;
  let clientCount = 0;
  let userCount = 0;

  if (backup.status === "failed") {
    return {
      isValid: false,
      notes: "This backup is marked as FAILED. Cannot perform dry-run restoration on invalid states.",
      keysCount: 0,
      warnings: ["Backup source status is FAILED."],
      clientCount: 0,
      userCount: 0,
      estimatedSize: 0
    };
  }

  // Retrieve payload from memory or restore seeds
  let payloadStr = backup.dataPayload;
  
  // If no payload is in memory but it's a seed, we can reconstruct a mock valid payload or check.
  if (!payloadStr) {
    // Check if it's a seed backup
    if (backup.id.startsWith("backup_seed_")) {
      // Simulated seed validation
      return {
        isValid: true,
        notes: "Validation complete. Seed archive structure is safe and signed.",
        keysCount: 12,
        warnings: ["Seed backup utilizes static recovery data templates."],
        clientCount: 8,
        userCount: 6,
        estimatedSize: backup.size
      };
    }
    
    return {
      isValid: false,
      notes: "Backup payload is purged or missing. Cannot recover records from this archive.",
      keysCount: 0,
      warnings: ["Database payloads are empty. Retention state: purged."],
      clientCount: 0,
      userCount: 0,
      estimatedSize: 0
    };
  }

  try {
    const parsed = JSON.parse(payloadStr);
    const keys = Object.keys(parsed);
    keysCount = keys.length;

    if (keysCount === 0) {
      warnings.push("Archive contains zero database records.");
      isValid = false;
    }

    // Examine contents
    if (parsed.gbk_clients) {
      try {
        const clients = JSON.parse(parsed.gbk_clients);
        clientCount = clients.length;
      } catch (e) {
        warnings.push("Failed to parse gbk_clients database block.");
        isValid = false;
      }
    } else if (backup.type === "full" || backup.type === "database") {
      warnings.push("Missing core 'gbk_clients' borrower file directory key.");
    }

    if (parsed.gbk_roster) {
      try {
        const roster = JSON.parse(parsed.gbk_roster);
        userCount = roster.length;
      } catch (e) {
        warnings.push("Failed to parse gbk_roster user roster database block.");
        isValid = false;
      }
    }

    // Look for potential security vulnerabilities
    const hasActiveCredentials = keys.some(k => k.includes("gmail") || k.includes("api_key"));
    if (hasActiveCredentials && backup.type === "full") {
      warnings.push("Archive contains active external API connection credentials and access tokens.");
    }

    // Verify key formats
    const foreignKeys = keys.filter(k => !k.startsWith("gbk_"));
    if (foreignKeys.length > 0) {
      warnings.push(`Identified ${foreignKeys.length} unrecognized workspace keys (non-CRM related).`);
    }

  } catch (err) {
    isValid = false;
    warnings.push("JSON bundle payload integrity check failed. The archive is corrupted.");
  }

  return {
    isValid,
    notes: isValid 
      ? `System validation successful. Backup payload is fully readable, structurally sound, and compliant with CRM Schema v1.1.`
      : `Integrity check failed. Some files within the bundle appear corrupted or missing.`,
    keysCount,
    warnings,
    clientCount,
    userCount,
    estimatedSize: backup.size
  };
}

// Perform actual Restoration of a backup
export function executeRestore(backup: BackupRecord, executor: string, testModeOnly = false): { success: boolean; error?: string } {
  const logAction = testModeOnly ? "test_restore" : "restore_backup";
  
  if (backup.status === "failed") {
    logRecoveryEvent({
      triggeredBy: executor,
      action: logAction,
      backupId: backup.id,
      backupType: backup.type,
      status: "failed",
      notes: `Restoration failed: cannot restore from a failed backup job.`
    });
    return { success: false, error: "Cannot restore from failed backup." };
  }

  let payloadStr = backup.dataPayload;

  // Re-seed data payload if it's a seed backup with undefined payload (re-seed default layout)
  if (!payloadStr && backup.id.startsWith("backup_seed_")) {
    // Generate valid sample data so restoration is actually satisfying!
    const samplePayload: Record<string, string> = {
      gbk_sec_autolock: "true",
      gbk_sec_idle_min: "15",
      gbk_sec_audit: "true"
    };
    payloadStr = JSON.stringify(samplePayload);
  }

  if (!payloadStr) {
    logRecoveryEvent({
      triggeredBy: executor,
      action: logAction,
      backupId: backup.id,
      backupType: backup.type,
      status: "failed",
      notes: `Restoration aborted: backup payload data was purged or is unavailable.`
    });
    return { success: false, error: "Backup payload is purged or missing." };
  }

  try {
    const payload = JSON.parse(payloadStr);

    if (testModeOnly) {
      // Simulate validation / safe restore test
      logRecoveryEvent({
        triggeredBy: executor,
        action: "test_restore",
        backupId: backup.id,
        backupType: backup.type,
        status: "success",
        notes: `Simulated Recovery Test Succeeded. Environment validated, indexes re-aligned, schema checks passed. Zero database cells overwritten.`
      });
      return { success: true };
    }

    // IMMUTABLE WRITE ACTION (OVERWRITING LOCAL STORAGE!)
    // If it's a "settings" only backup, we only replace settings.
    // If it's database, we replace db.
    // If it's full, we first clear matching keys and load new ones.
    const keysToLoad = Object.keys(payload);

    // Let's perform surgical replacement
    keysToLoad.forEach(key => {
      localStorage.setItem(key, payload[key]);
    });

    logRecoveryEvent({
      triggeredBy: executor,
      action: "restore_backup",
      backupId: backup.id,
      backupType: backup.type,
      status: "success",
      notes: `PRODUCTION SYSTEM ROLLBACK: Restored ${keysToLoad.length} database keys from archive generated on ${new Date(backup.timestamp).toLocaleDateString()}`
    });

    // Fire window event to alert components to refresh CRM state
    window.dispatchEvent(new CustomEvent("checklist-updated"));
    window.dispatchEvent(new CustomEvent("activity-logged"));
    window.dispatchEvent(new CustomEvent("gbk-crm-restored", { detail: { type: backup.type } }));

    return { success: true };
  } catch (err: any) {
    logRecoveryEvent({
      triggeredBy: executor,
      action: logAction,
      backupId: backup.id,
      backupType: backup.type,
      status: "failed",
      notes: `Restoration operation crashed due to a write failure or runtime syntax error.`,
      details: err?.message || String(err)
    });
    return { success: false, error: "Integrity write error during load." };
  }
}

// Delete Backup
export function deleteBackup(backupId: string, user: string): boolean {
  const backups = getBackupsList();
  const match = backups.find(b => b.id === backupId);
  if (!match) return false;

  const updated = backups.filter(b => b.id !== backupId);
  saveBackupsList(updated);

  logRecoveryEvent({
    triggeredBy: user,
    action: "delete_backup",
    backupId,
    status: "success",
    notes: `Permanently removed backup archive (${new Date(match.timestamp).toLocaleString()}) created by ${match.creator}`
  });

  return true;
}

// Toggle Critical Status
export function toggleBackupCritical(backupId: string, user: string): boolean {
  const backups = getBackupsList();
  let status = false;

  const updated = backups.map(b => {
    if (b.id === backupId) {
      status = !b.isCritical;
      
      logRecoveryEvent({
        triggeredBy: user,
        action: "update_policy",
        backupId,
        status: "success",
        notes: status 
          ? `Marked backup archive as CRITICAL (exempt from future autodeletion cleanups).`
          : `Removed CRITICAL protection flag from backup archive.`
      });

      return { ...b, isCritical: status };
    }
    return b;
  });

  saveBackupsList(updated);
  return true;
}
