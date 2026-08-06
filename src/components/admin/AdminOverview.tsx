import React, { useState, useMemo, useEffect } from "react";
import { 
  Users, ShieldCheck, ShieldAlert, Lock, Clock, Database, 
  AlertTriangle, AlertCircle, Sparkles, RefreshCw, Globe, 
  Mail, Shield, FileText, CheckCircle2, Terminal, Activity,
  TrendingUp, UserPlus, Megaphone, HardDrive, Filter, Search,
  ArrowRight, ChevronRight, Check, X, Server, BarChart3, Layers,
  Cpu, Wifi, Radio, Info, ExternalLink, Download, Play, Pause,
  Eye, Zap, CheckCircle, ShieldX, Bell, UserCheck
} from "lucide-react";
import { User, Client, Task } from "../../types";

export interface AdminOverviewProps {
  userRoster: User[];
  setUserRoster?: React.Dispatch<React.SetStateAction<User[]>>;
  clients: Client[];
  tasks: Task[];
  auditLogs: any[];
  setAuditLogs?: React.Dispatch<React.SetStateAction<any[]>>;
  onLockApp: () => void;
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  userRoster,
  setUserRoster,
  clients,
  tasks,
  auditLogs,
  setAuditLogs,
  onLockApp,
  setActiveTab,
  showToast
}) => {
  // --- STATE MANAGEMENT ---
  const [chartTimeRange, setChartTimeRange] = useState<"7d" | "14d" | "30d">("7d");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activitySearch, setActivitySearch] = useState<string>("");
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  // Modals state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedActivityLog, setSelectedActivityLog] = useState<any | null>(null);
  const [selectedAlertForAction, setSelectedAlertForAction] = useState<any | null>(null);

  // Quick Add User Form State
  const [newUserForm, setNewUserForm] = useState({
    first: "",
    last: "",
    email: "",
    role: "Broker",
    licenseNumber: "",
    fsraNum: "",
    brokerage: "GBK Financial Ltd."
  });

  // Announcement Form State
  const [announcementForm, setAnnouncementForm] = useState({
    headline: "",
    message: "",
    priority: "normal" as "normal" | "urgent" | "critical",
    targetRole: "all"
  });

  // Backup Execution State
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStep, setBackupStep] = useState("");
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupLogs, setBackupLogs] = useState<string[]>([]);

  // Update Check State
  const [isScanningUpdates, setIsScanningUpdates] = useState(false);
  const [updateScanResult, setUpdateScanResult] = useState<string | null>(null);

  // System Alerts local state (to allow dismissal or quick actions)
  const [resolvedAlertIds, setResolvedAlertIds] = useState<string[]>([]);

  // --- CORE METRICS CALCULATIONS ---
  const totalUsers = userRoster.length;
  const activeUsersCount = userRoster.filter(u => u.status === "active" || u.status === "Active").length;
  const simplePinUsers = userRoster.filter(u => u.pin === "1234" || u.pin === "1111" || u.pin === "2222");
  const pendingIdDocs = userRoster.filter(u => !u.docsStatus || u.docsStatus === "pending" || u.docsStatus === "missing").length;

  const totalClients = clients.length;
  const totalTasks = tasks.length;
  const totalAuditLogs = auditLogs.length;

  // Currently online active users simulation
  const currentlyOnlineUsers = useMemo(() => {
    // Top 3-5 users from roster as online right now
    return userRoster.slice(0, Math.min(6, userRoster.length));
  }, [userRoster]);

  // System Health Metrics Data
  const systemHealthData = {
    uptime: {
      last24h: 100,
      last7d: 99.99,
      last30d: 99.95,
      status: "Operational"
    },
    activeUsersNow: currentlyOnlineUsers.length,
    peakUsersToday: Math.max(currentlyOnlineUsers.length + 3, 12),
    apiLatency: {
      avgMs: 38,
      p95Ms: 82,
      minMs: 14,
      errorRate: "0.01%"
    },
    database: {
      sizeMb: 148,
      totalCapacityMb: 10240,
      recordCount: totalClients + totalTasks + totalAuditLogs + totalUsers,
      tables: {
        clients: totalClients,
        tasks: totalTasks,
        auditLogs: totalAuditLogs,
        roster: totalUsers
      }
    },
    storage: {
      usedGb: 14.2,
      totalGb: 100,
      breakdown: {
        vaultDocsGb: 9.8,
        backupsGb: 3.1,
        cacheGb: 1.3
      }
    }
  };

  // --- LOGIN TRENDS DATA (7d, 14d, 30d) ---
  const loginTrendData = useMemo(() => {
    if (chartTimeRange === "7d") {
      return [
        { day: "Mon", logins: 42, uniqueUsers: 14, peakHour: "10:00 AM" },
        { day: "Tue", logins: 58, uniqueUsers: 18, peakHour: "02:00 PM" },
        { day: "Wed", logins: 65, uniqueUsers: 21, peakHour: "11:00 AM" },
        { day: "Thu", logins: 51, uniqueUsers: 16, peakHour: "03:00 PM" },
        { day: "Fri", logins: 74, uniqueUsers: 24, peakHour: "01:00 PM" },
        { day: "Sat", logins: 18, uniqueUsers: 7, peakHour: "11:30 AM" },
        { day: "Sun", logins: 22, uniqueUsers: 8, peakHour: "04:00 PM" }
      ];
    } else if (chartTimeRange === "14d") {
      return [
        { day: "Jul 24", logins: 38, uniqueUsers: 12, peakHour: "09:30 AM" },
        { day: "Jul 25", logins: 45, uniqueUsers: 15, peakHour: "10:00 AM" },
        { day: "Jul 26", logins: 50, uniqueUsers: 17, peakHour: "02:00 PM" },
        { day: "Jul 27", logins: 62, uniqueUsers: 20, peakHour: "11:00 AM" },
        { day: "Jul 28", logins: 59, uniqueUsers: 19, peakHour: "03:00 PM" },
        { day: "Jul 29", logins: 70, uniqueUsers: 22, peakHour: "01:00 PM" },
        { day: "Jul 30", logins: 25, uniqueUsers: 9, peakHour: "12:00 PM" },
        { day: "Jul 31", logins: 20, uniqueUsers: 8, peakHour: "02:00 PM" },
        { day: "Aug 01", logins: 48, uniqueUsers: 16, peakHour: "10:30 AM" },
        { day: "Aug 02", logins: 54, uniqueUsers: 18, peakHour: "01:30 PM" },
        { day: "Aug 03", logins: 68, uniqueUsers: 22, peakHour: "11:00 AM" },
        { day: "Aug 04", logins: 61, uniqueUsers: 20, peakHour: "03:00 PM" },
        { day: "Aug 05", logins: 79, uniqueUsers: 25, peakHour: "02:00 PM" },
        { day: "Aug 06", logins: 83, uniqueUsers: 26, peakHour: "10:00 AM" }
      ];
    } else {
      return [
        { day: "Wk 1", logins: 280, uniqueUsers: 24, peakHour: "Mon 10am" },
        { day: "Wk 2", logins: 340, uniqueUsers: 26, peakHour: "Wed 11am" },
        { day: "Wk 3", logins: 310, uniqueUsers: 25, peakHour: "Fri 1pm" },
        { day: "Wk 4", logins: 395, uniqueUsers: 28, peakHour: "Thu 2pm" }
      ];
    }
  }, [chartTimeRange]);

  // New User Onboarding Growth Data
  const newUserTrendData = [
    { period: "May", newUsers: 3, verified: 3 },
    { period: "Jun", newUsers: 5, verified: 4 },
    { period: "Jul", newUsers: 8, verified: 7 },
    { period: "Aug", newUsers: 4, verified: 4 }
  ];

  // Most Active Users List
  const mostActiveUsers = useMemo(() => {
    return userRoster.map((u, idx) => {
      const userClients = clients.filter(c => c.assignedBroker === u.id || c.agent === u.id || c.referredBy === u.id).length;
      const activityScore = (idx === 0 ? 98 : idx === 1 ? 87 : idx === 2 ? 76 : Math.max(30, 65 - idx * 8));
      return {
        ...u,
        activityScore,
        totalLoginsThisMonth: Math.max(12, 64 - idx * 7),
        filesManaged: userClients,
        lastActiveTime: u.lastActive || u.lastLogin || "Today 11:20 AM"
      };
    }).sort((a, b) => b.activityScore - a.activityScore).slice(0, 5);
  }, [userRoster, clients]);

  // Activity Heatmap Matrix (Day vs Time Blocks)
  const activityHeatmap = [
    { day: "Mon", morning: 85, afternoon: 95, evening: 40, night: 10 },
    { day: "Tue", morning: 90, afternoon: 100, evening: 55, night: 15 },
    { day: "Wed", morning: 95, afternoon: 88, evening: 45, night: 12 },
    { day: "Thu", morning: 80, afternoon: 92, evening: 60, night: 20 },
    { day: "Fri", morning: 88, afternoon: 98, evening: 70, night: 25 },
    { day: "Sat", morning: 30, afternoon: 40, evening: 20, night: 5 },
    { day: "Sun", morning: 20, afternoon: 35, evening: 25, night: 8 }
  ];

  // Helper for heatmap cell color
  const getHeatmapColor = (value: number) => {
    if (value >= 80) return "bg-[var(--color-accent)] text-white font-bold";
    if (value >= 50) return "bg-[var(--color-accent)]/60 text-white font-semibold";
    if (value >= 25) return "bg-[var(--color-accent)]/30 text-[var(--color-text)]";
    return "bg-[var(--color-surface-2)] text-[var(--color-text-faint)]";
  };

  // --- SYSTEM ALERTS LIST ---
  const initialAlerts = useMemo(() => {
    const alerts = [];

    if (simplePinUsers.length > 0) {
      alerts.push({
        id: "alert_weak_pins",
        category: "Security",
        priority: "P2 Warning",
        severity: "medium",
        title: "Weak Workstation Access PINs Detected",
        message: `${simplePinUsers.length} broker account(s) are using vulnerable simple access PINs (e.g. 1234, 2222).`,
        recommendedAction: "Enforce Policy",
        targetTab: "security"
      });
    }

    if (pendingIdDocs > 0) {
      alerts.push({
        id: "alert_pending_compliance",
        category: "Compliance",
        priority: "P1 Critical",
        severity: "high",
        title: "Missing FSRA / E&O Compliance Records",
        message: `${pendingIdDocs} broker profile(s) require E&O insurance or license renewal documentation.`,
        recommendedAction: "Verify IDs",
        targetTab: "users"
      });
    }

    alerts.push({
      id: "alert_intake_parse",
      category: "System Intake",
      priority: "P2 Warning",
      severity: "medium",
      title: "AI Extraction Payload Exception",
      message: "2 mortgage application Webhook forms triggered OCR confidence warnings under 85%.",
      recommendedAction: "Review Intake",
      targetTab: "defaults"
    });

    alerts.push({
      id: "alert_backup_sync",
      category: "Integrity",
      priority: "P3 Notice",
      severity: "low",
      title: "Z Drive Cold Storage Snapshot Verified",
      message: "Daily encrypted DB dump completed automatically at 11:45 AM. Zero checksum drift.",
      recommendedAction: "View Backups",
      targetTab: "backup"
    });

    return alerts;
  }, [simplePinUsers, pendingIdDocs]);

  const activeSystemAlerts = initialAlerts.filter(a => !resolvedAlertIds.includes(a.id));

  // --- FILTERED ACTIVITY FEED ---
  const filteredActivityLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Category filter
      if (activityFilter !== "all") {
        const cat = (log.category || log.action || "").toLowerCase();
        if (activityFilter === "security" && !cat.includes("security") && !cat.includes("lock") && !cat.includes("pin")) return false;
        if (activityFilter === "user" && !cat.includes("user") && !cat.includes("roster") && !cat.includes("permission")) return false;
        if (activityFilter === "data" && !cat.includes("client") && !cat.includes("export") && !cat.includes("backup")) return false;
        if (activityFilter === "system" && !cat.includes("system") && !cat.includes("bridge") && !cat.includes("intake")) return false;
        if (activityFilter === "compliance" && !cat.includes("compliance") && !cat.includes("audit") && !cat.includes("fsra")) return false;
      }

      // Search query filter
      if (activitySearch.trim() !== "") {
        const query = activitySearch.toLowerCase();
        const matchText = `${log.action || ''} ${log.details || ''} ${log.operator || ''} ${log.user || ''} ${log.category || ''}`.toLowerCase();
        if (!matchText.includes(query)) return false;
      }

      return true;
    });
  }, [auditLogs, activityFilter, activitySearch]);

  // --- HANDLERS ---

  // Handle Quick Add User Submit
  const handleQuickAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.first || !newUserForm.last || !newUserForm.email) {
      showToast("Please fill in required fields (First, Last, Email)", "error");
      return;
    }

    const createdUser: User = {
      id: `usr_${Date.now()}`,
      first: newUserForm.first,
      last: newUserForm.last,
      email: newUserForm.email,
      role: newUserForm.role,
      status: "active",
      brokerage: newUserForm.brokerage,
      licenseNumber: newUserForm.licenseNumber || "M2400998",
      fsraNum: newUserForm.fsraNum || "FSRA-10988",
      lastLogin: new Date().toISOString(),
      created: new Date().toISOString(),
      pin: "4321",
      docsStatus: "verified"
    };

    if (setUserRoster) {
      setUserRoster(prev => [createdUser, ...prev]);
    }

    if (setAuditLogs) {
      setAuditLogs(prev => [{
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: "User Management",
        action: "Create User",
        operator: "Admin Operator",
        details: `Quick registered broker user ${createdUser.first} ${createdUser.last} (${createdUser.email})`,
        severity: "info"
      }, ...prev]);
    }

    setIsAddUserModalOpen(false);
    setNewUserForm({
      first: "", last: "", email: "", role: "Broker", licenseNumber: "", fsraNum: "", brokerage: "GBK Financial Ltd."
    });
    showToast(`Successfully added user ${createdUser.first} ${createdUser.last} to system roster!`, "success", "👤");
  };

  // Handle Send Announcement
  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.headline || !announcementForm.message) {
      showToast("Please enter announcement headline and body message", "error");
      return;
    }

    if (setAuditLogs) {
      setAuditLogs(prev => [{
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: "System Broadcast",
        action: "Send Announcement",
        operator: "Admin Operator",
        details: `Broadcasted '${announcementForm.headline}' [Priority: ${announcementForm.priority.toUpperCase()}] to ${announcementForm.targetRole}`,
        severity: announcementForm.priority === "critical" ? "high" : "info"
      }, ...prev]);
    }

    setIsAnnouncementModalOpen(false);
    showToast(`System announcement '${announcementForm.headline}' broadcasted to all active broker terminals!`, "success", "📢");
    setAnnouncementForm({ headline: "", message: "", priority: "normal", targetRole: "all" });
  };

  // Handle Run Backup
  const handleStartBackup = () => {
    setIsBackupRunning(true);
    setBackupProgress(0);
    setBackupLogs(["[SYS] Initiating cold-storage database snapshot..."]);

    setTimeout(() => {
      setBackupProgress(25);
      setBackupStep("Dumping Firestore & Local Storage schemas...");
      setBackupLogs(prev => [...prev, "[DB] Dumped 1,482 client records & audit logs."]);
    }, 600);

    setTimeout(() => {
      setBackupProgress(60);
      setBackupStep("Compressing document attachments & vault files...");
      setBackupLogs(prev => [...prev, "[STORAGE] Encrypted 14.2 GB payload with AES-256."]);
    }, 1300);

    setTimeout(() => {
      setBackupProgress(90);
      setBackupStep("Uploading encrypted archive to Z Drive redundant cluster...");
      setBackupLogs(prev => [...prev, "[Z-DRIVE] Snapshot archived to z-drive/backups/gbk_backup_20260806.tar.gz."]);
    }, 2000);

    setTimeout(() => {
      setBackupProgress(100);
      setBackupStep("Backup completed successfully!");
      setBackupLogs(prev => [...prev, "[SUCCESS] Full system backup verified successfully (Checksum: 0x8F92A1)."]);
      setIsBackupRunning(false);

      if (setAuditLogs) {
        setAuditLogs(prev => [{
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          category: "System Integrity",
          action: "Manual Backup",
          operator: "Admin Operator",
          details: "Executed manual encrypted backup snapshot of database & vault attachments.",
          severity: "info"
        }, ...prev]);
      }

      showToast("Manual system backup completed successfully!", "success", "💾");
    }, 2700);
  };

  // Handle Check for Updates Scan
  const handleScanForUpdates = () => {
    setIsScanningUpdates(true);
    setUpdateScanResult(null);

    setTimeout(() => {
      setIsScanningUpdates(false);
      setUpdateScanResult("System software is up to date (Running v2.4.1 Build 2026-08-05). All bridge API contracts match.");
      showToast("System update check completed — System is fully up to date!", "success", "✨");
    }, 1200);
  };

  // Handle Alert Quick Action
  const handleExecuteAlertAction = (alert: any) => {
    if (alert.targetTab) {
      setActiveTab(alert.targetTab);
      showToast(`Navigated to ${alert.category} management panel.`, "info", "🚀");
    } else {
      setSelectedAlertForAction(alert);
    }
  };

  const handleResolveAlert = (alertId: string) => {
    setResolvedAlertIds(prev => [...prev, alertId]);
    setSelectedAlertForAction(null);
    showToast("Alert resolved and dismissed from system dashboard.", "success", "✅");
  };

  return (
    <div className="space-y-6 max-w-7xl pb-16" id="admin-overview-enhanced-workspace">
      
      {/* SECTION 1: SYSTEM HEALTH CARDS */}
      <div className="space-y-3" id="admin-overview-health-section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-sans">
              System Infrastructure &amp; Health Telemetry
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* Health Card 1: Uptime */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-faint)]">System Uptime</span>
              <Wifi className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--color-text)] font-mono tracking-tight">
                {systemHealthData.uptime.last24h}%
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold text-[var(--color-text-muted)]">
                <span className="text-emerald-400">7d: {systemHealthData.uptime.last7d}%</span>
                <span>•</span>
                <span>30d: {systemHealthData.uptime.last30d}%</span>
              </div>
            </div>
            <div className="w-full bg-[var(--color-surface-2)] h-1.5 rounded-full mt-3 overflow-hidden flex">
              <div className="bg-emerald-400 h-full w-[99.9%]" />
            </div>
          </div>

          {/* Health Card 2: Active Users Right Now */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-faint)]">Active Users Now</span>
              <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[var(--color-text)] font-mono tracking-tight">
                  {systemHealthData.activeUsersNow}
                </span>
                <span className="text-xs text-[var(--color-text-faint)] font-medium">
                  / {totalUsers} total
                </span>
              </div>
              <div className="text-[10px] text-blue-400 font-semibold mt-1">
                Peak Today: {systemHealthData.peakUsersToday} Concurrent
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 overflow-hidden">
              {currentlyOnlineUsers.map((u, i) => (
                <div 
                  key={u.id || i}
                  title={`${u.first} ${u.last} (${u.role})`}
                  className="w-5 h-5 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)] text-[9px] font-bold text-[var(--color-accent)] flex items-center justify-center shrink-0"
                >
                  {u.first ? u.first[0] : "U"}
                </div>
              ))}
            </div>
          </div>

          {/* Health Card 3: API Response Time */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-faint)]">API Avg Latency</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--color-text)] font-mono tracking-tight">
                {systemHealthData.apiLatency.avgMs} <span className="text-xs text-[var(--color-text-faint)] font-normal">ms</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                p95: {systemHealthData.apiLatency.p95Ms}ms • Errors: {systemHealthData.apiLatency.errorRate}
              </div>
            </div>
            <div className="mt-3 text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-center">
              Optimal (&lt; 50ms)
            </div>
          </div>

          {/* Health Card 4: Database Size */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-faint)]">Database Size</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--color-text)] font-mono tracking-tight">
                {systemHealthData.database.sizeMb} <span className="text-xs text-[var(--color-text-faint)] font-normal">MB</span>
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-1">
                {systemHealthData.database.recordCount} Total Entity Records
              </div>
            </div>
            <div className="text-[9px] text-[var(--color-text-faint)] mt-3 font-mono truncate">
              {totalClients} Clients | {totalAuditLogs} Audit Logs
            </div>
          </div>

          {/* Health Card 5: Storage Used / Available */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-faint)]">Vault Storage</span>
              <HardDrive className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div>
              <div className="text-2xl font-black text-[var(--color-text)] font-mono tracking-tight">
                {systemHealthData.storage.usedGb} <span className="text-xs text-[var(--color-text-faint)] font-normal">/ {systemHealthData.storage.totalGb} GB</span>
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-1">
                {(systemHealthData.storage.totalGb - systemHealthData.storage.usedGb).toFixed(1)} GB Available
              </div>
            </div>
            <div className="w-full bg-[var(--color-surface-2)] h-1.5 rounded-full mt-3 overflow-hidden flex">
              <div 
                className="bg-[var(--color-accent)] h-full" 
                style={{ width: `${(systemHealthData.storage.usedGb / systemHealthData.storage.totalGb) * 100}%` }} 
              />
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: QUICK ACTION BUTTONS */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-4 rounded-2xl shadow-sm space-y-2" id="admin-quick-actions-bar">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Admin Command Center Quick Actions
          </span>
          <span className="text-[10px] text-[var(--color-text-faint)] italic">Direct system operations</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* Action 1: Add User */}
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </button>

          {/* Action 2: Send Announcement */}
          <button
            onClick={() => setIsAnnouncementModalOpen(true)}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-purple-400" /> Send Announcement
          </button>

          {/* Action 3: Run Backup */}
          <button
            onClick={() => {
              setIsBackupModalOpen(true);
              if (!isBackupRunning && backupProgress === 0) handleStartBackup();
            }}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Database className="w-4 h-4 text-emerald-400" /> Run Backup
          </button>

          {/* Action 4: View Audit Logs */}
          <button
            onClick={() => setActiveTab("audit")}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-blue-400" /> View Audit Logs
          </button>

          {/* Action 5: Check for Updates */}
          <button
            onClick={() => {
              setIsUpdateModalOpen(true);
              handleScanForUpdates();
            }}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer col-span-2 sm:col-span-1"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" /> Check Updates
          </button>
        </div>
      </div>

      {/* SECTION 2: USER ACTIVITY METRICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-activity-metrics-grid">
        
        {/* Metric 1 & 2: Logins & New Users Visual Charts */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-5 rounded-2xl shadow-sm space-y-5">
          
          {/* Chart 1: Logins Line Chart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--color-accent)]" /> Broker Login Volume &amp; Sessions
                </h4>
                <p className="text-[10px] text-[var(--color-text-muted)]">Authentication frequency across Ontario broker terminals.</p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border)]">
                {(["7d", "14d", "30d"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setChartTimeRange(range)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase transition-all cursor-pointer ${
                      chartTimeRange === range 
                        ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-xs" 
                        : "text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom SVG / Bar Visual Line Chart representation */}
            <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]/60 rounded-xl p-4 space-y-3">
              <div className="flex items-end justify-between h-36 gap-2 pt-4 px-2 border-b border-[var(--color-border)]/50 pb-1">
                {loginTrendData.map((item, idx) => {
                  const maxLogins = Math.max(...loginTrendData.map(d => d.logins), 100);
                  const heightPct = Math.round((item.logins / maxLogins) * 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                        <span className="font-bold text-[var(--color-accent)]">{item.logins} logins</span> • {item.uniqueUsers} users ({item.peakHour})
                      </div>

                      <div 
                        className="w-full bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)] rounded-t-md transition-all relative border-t-2 border-[var(--color-accent)]"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[var(--color-text-faint)] opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.logins}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-[var(--color-text-faint)] truncate max-w-full">{item.day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)] px-1">
                <span>Avg Daily Logins: {Math.round(loginTrendData.reduce((acc, curr) => acc + curr.logins, 0) / loginTrendData.length)}</span>
                <span className="text-emerald-400 font-semibold">● Peak Activity: {Math.max(...loginTrendData.map(d => d.logins))} sessions</span>
              </div>
            </div>
          </div>

          {/* Chart 2: New Users Registrations Chart */}
          <div className="space-y-2 border-t border-[var(--color-border)]/60 pt-4">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> New Broker Onboarding Velocity
              </h5>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">+200% MoM Growth</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {newUserTrendData.map((data, i) => (
                <div key={i} className="bg-[var(--color-surface-2)] p-2.5 rounded-xl border border-[var(--color-border)]/50 text-center">
                  <span className="text-[10px] text-[var(--color-text-faint)] uppercase font-bold block">{data.period}</span>
                  <span className="text-lg font-black text-[var(--color-text)] font-mono block mt-0.5">+{data.newUsers}</span>
                  <span className="text-[9px] text-emerald-400 font-semibold block">{data.verified} Verified</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Metric 3 & 4: Most Active Users & Heatmap */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-5 rounded-2xl shadow-sm space-y-5">
          
          {/* Most Active Users Ranking List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Top Active Broker Ranking
              </h4>
              <span className="text-[10px] text-[var(--color-text-faint)]">30-Day Activity Index</span>
            </div>

            <div className="space-y-2">
              {mostActiveUsers.map((user, idx) => (
                <div 
                  key={user.id || idx}
                  className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]/60 p-3 rounded-xl border border-[var(--color-border)]/60 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                      idx === 0 ? "bg-amber-400 text-black" : idx === 1 ? "bg-slate-300 text-black" : idx === 2 ? "bg-amber-700 text-white" : "bg-[var(--color-surface-3)] text-[var(--color-text-faint)]"
                    }`}>
                      #{idx + 1}
                    </span>

                    <div>
                      <h5 className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                        {user.first} {user.last}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-semibold">
                          {user.role}
                        </span>
                      </h5>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        {user.totalLoginsThisMonth} Logins • {user.filesManaged} Active Client Files
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black font-mono text-[var(--color-accent)] block">
                      {user.activityScore} pts
                    </span>
                    <span className="text-[9px] text-[var(--color-text-faint)] block">
                      Active: {user.lastActiveTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Activity Heatmap Grid */}
          <div className="space-y-2 border-t border-[var(--color-border)]/60 pt-4">
            <div className="flex items-center justify-between mb-1">
              <h5 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Weekly Activity Heatmap
              </h5>
              <span className="text-[9px] text-[var(--color-text-faint)]">System Traffic Density</span>
            </div>

            <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]/60 rounded-xl p-3 overflow-x-auto">
              <div className="min-w-[320px]">
                <div className="grid grid-cols-5 text-[9px] font-bold uppercase text-[var(--color-text-faint)] mb-2 text-center">
                  <span>Day</span>
                  <span>Morn (8-12)</span>
                  <span>Aft (12-5)</span>
                  <span>Eve (5-9)</span>
                  <span>Night (9-8)</span>
                </div>

                <div className="space-y-1.5">
                  {activityHeatmap.map((row) => (
                    <div key={row.day} className="grid grid-cols-5 gap-1.5 text-[10px] font-mono items-center text-center">
                      <span className="font-bold text-[var(--color-text)] text-[10px]">{row.day}</span>
                      <div className={`py-1 rounded text-[9px] ${getHeatmapColor(row.morning)}`}>{row.morning}%</div>
                      <div className={`py-1 rounded text-[9px] ${getHeatmapColor(row.afternoon)}`}>{row.afternoon}%</div>
                      <div className={`py-1 rounded text-[9px] ${getHeatmapColor(row.evening)}`}>{row.evening}%</div>
                      <div className={`py-1 rounded text-[9px] ${getHeatmapColor(row.night)}`}>{row.night}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SECTION 5 & 4: ALERTS WIDGET & RECENT ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-alerts-activity-grid">
        
        {/* SECTION 5: SYSTEM ALERTS WIDGET */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/80 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-sans">
                Active System Alerts ({activeSystemAlerts.length})
              </h4>
            </div>
            <span className="text-[9px] bg-red-500/10 text-red-400 font-mono font-bold px-2 py-0.5 rounded border border-red-500/20">
              Action Required
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {activeSystemAlerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                  alert.severity === "high"
                    ? "bg-red-500/5 border-red-500/25"
                    : alert.severity === "medium"
                    ? "bg-amber-500/5 border-amber-500/25"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      alert.severity === "high" ? "bg-red-500/20 text-red-300" : alert.severity === "medium" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
                    }`}>
                      {alert.priority}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-faint)] uppercase font-bold">{alert.category}</span>
                  </div>

                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    title="Dismiss alert"
                    className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <h5 className="text-xs font-bold text-[var(--color-text)]">{alert.title}</h5>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{alert.message}</p>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => handleExecuteAlertAction(alert)}
                    className="bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-accent)] text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-[var(--color-accent)]/30 transition-all cursor-pointer flex items-center gap-1"
                  >
                    {alert.recommendedAction} <ChevronRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="text-[10px] text-[var(--color-text-faint)] hover:underline cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            ))}

            {activeSystemAlerts.length === 0 && (
              <div className="py-12 text-center text-[var(--color-text-faint)] space-y-2">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 stroke-1" />
                <p className="text-xs font-bold text-[var(--color-text)]">Zero Unresolved System Threats</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">All security, compliance, and intake triggers are nominal.</p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: RECENT ACTIVITY FEED */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)]/80 p-5 rounded-2xl shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/80 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[var(--color-accent)]" />
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-sans">
                  Real-Time Activity Audit Stream
                </h4>
                <p className="text-[10px] text-[var(--color-text-muted)]">Live operations telemetry across entire workstation framework.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLiveStreaming 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-faint)] border-[var(--color-border)]"
                }`}
              >
                {isLiveStreaming ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Streaming
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" /> Stream Paused
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Activity Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            
            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              {[
                { id: "all", label: "All Logs" },
                { id: "security", label: "Security" },
                { id: "user", label: "User Mgmt" },
                { id: "data", label: "Data & Files" },
                { id: "system", label: "System" },
                { id: "compliance", label: "Compliance" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivityFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                    activityFilter === tab.id
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-xs"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative shrink-0 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
              <input
                type="text"
                placeholder="Search audit activity..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Activity Stream List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredActivityLogs.map((log, index) => (
              <div
                key={log.id || index}
                onClick={() => setSelectedActivityLog(log)}
                className="p-3 rounded-xl bg-[var(--color-surface-2)]/80 hover:bg-[var(--color-surface-3)] border border-[var(--color-border)]/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    log.severity === "high" ? "bg-red-400 animate-pulse" : log.severity === "medium" ? "bg-amber-400" : "bg-[var(--color-accent)]"
                  }`} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text)] truncate capitalize">
                        {log.action || log.event || "Activity Executed"}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-surface-3)] text-[var(--color-text-faint)] border border-[var(--color-border)] shrink-0">
                        {log.category || "System"}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                      {log.details || log.summary || "System activity log executed."}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-[var(--color-text-faint)] block">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                  </span>
                  <span className="text-[9px] text-[var(--color-accent)] group-hover:underline font-semibold block mt-0.5">
                    View Details →
                  </span>
                </div>
              </div>
            ))}

            {filteredActivityLogs.length === 0 && (
              <div className="py-12 text-center text-[var(--color-text-faint)] space-y-2">
                <FileText className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-xs italic">No activity logs matching current query filters.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- MODALS SECTION --- */}

      {/* MODAL 1: ADD USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Quick Register New Broker User</h3>
              </div>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleQuickAddUserSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.first}
                    onChange={e => setNewUserForm({ ...newUserForm, first: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.last}
                    onChange={e => setNewUserForm({ ...newUserForm, last: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  placeholder="j.smith@gbkfinancial.ca"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Role Permission</label>
                  <select
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                  >
                    <option value="Broker">Broker</option>
                    <option value="Agent">Agent</option>
                    <option value="Assistant">Assistant</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">FSRA License #</label>
                  <input
                    type="text"
                    value={newUserForm.fsraNum}
                    onChange={e => setNewUserForm({ ...newUserForm, fsraNum: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                    placeholder="M2400112"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] px-4 py-2 rounded-xl font-bold uppercase cursor-pointer shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Broadcast System Announcement</h3>
              </div>
              <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSendAnnouncement} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Headline *</label>
                <input
                  type="text"
                  required
                  value={announcementForm.headline}
                  onChange={e => setAnnouncementForm({ ...announcementForm, headline: e.target.value })}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  placeholder="e.g. Scheduled Bridge Maintenance Today 8 PM EST"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Announcement Details *</label>
                <textarea
                  rows={4}
                  required
                  value={announcementForm.message}
                  onChange={e => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  placeholder="Provide complete maintenance windows or operational details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Priority Signal</label>
                  <select
                    value={announcementForm.priority}
                    onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.value as any })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer font-bold"
                  >
                    <option value="normal">Normal Information</option>
                    <option value="urgent">Urgent Warning</option>
                    <option value="critical">Critical Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">Target Audience</label>
                  <select
                    value={announcementForm.targetRole}
                    onChange={e => setAnnouncementForm({ ...announcementForm, targetRole: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                  >
                    <option value="all">All Roster Users</option>
                    <option value="Broker">Brokers Only</option>
                    <option value="Agent">Agents Only</option>
                    <option value="Admin">Admins Only</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold uppercase cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Megaphone className="w-4 h-4" /> Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RUN BACKUP PROGRESS MODAL */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Cold-Storage System Backup</h3>
              </div>
              <button 
                onClick={() => {
                  if (!isBackupRunning) setIsBackupModalOpen(false);
                }} 
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1 text-[10px] font-bold uppercase">
                  <span className="text-[var(--color-text)]">{backupStep || "Ready to execute backup"}</span>
                  <span className="font-mono text-emerald-400">{backupProgress}%</span>
                </div>
                <div className="w-full bg-[var(--color-surface-2)] h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${backupProgress}%` }} />
                </div>
              </div>

              {/* Terminal Logs */}
              <div className="bg-black/80 p-3 rounded-xl font-mono text-[10px] text-emerald-400 space-y-1 h-36 overflow-y-auto border border-emerald-500/20">
                {backupLogs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                {!isBackupRunning && backupProgress === 100 ? (
                  <button
                    onClick={() => setIsBackupModalOpen(false)}
                    className="bg-emerald-500 text-black px-4 py-2 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                ) : (
                  <button
                    onClick={handleStartBackup}
                    disabled={isBackupRunning}
                    className="bg-[var(--color-accent)] text-[var(--color-text-inverse)] px-4 py-2 rounded-xl font-bold uppercase cursor-pointer disabled:opacity-50"
                  >
                    {isBackupRunning ? "Executing Backup..." : "Run Backup Now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CHECK UPDATES SCAN MODAL */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center mx-auto border border-[var(--color-accent)]/20">
              <RefreshCw className={`w-6 h-6 ${isScanningUpdates ? "animate-spin" : ""}`} />
            </div>

            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
              {isScanningUpdates ? "Scanning Central Deployment Registry..." : "Update Diagnostics Result"}
            </h3>

            {isScanningUpdates ? (
              <p className="text-xs text-[var(--color-text-muted)]">Verifying bridge API protocols, client bundle hashes, and migration manifests...</p>
            ) : (
              <p className="text-xs text-emerald-400 font-semibold leading-relaxed bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                {updateScanResult}
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                disabled={isScanningUpdates}
                className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ACTIVITY LOG DETAILS MODAL */}
      {selectedActivityLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Audit Telemetry Event Payload
                </h3>
              </div>
              <button onClick={() => setSelectedActivityLog(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)]/60 font-mono text-[11px]">
                <div>
                  <span className="text-[var(--color-text-faint)] block text-[9px]">ACTION TYPE</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedActivityLog.action || selectedActivityLog.event || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)] block text-[9px]">OPERATOR</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedActivityLog.operator || selectedActivityLog.user || "System"}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)] block text-[9px]">CATEGORY</span>
                  <span className="font-bold text-[var(--color-accent)]">{selectedActivityLog.category || "General"}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-faint)] block text-[9px]">TIMESTAMP</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedActivityLog.timestamp ? new Date(selectedActivityLog.timestamp).toLocaleString() : "Now"}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase block mb-1">Log Description &amp; Details</label>
                <div className="bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)]/60 text-[var(--color-text-muted)] font-mono text-[11px] leading-relaxed">
                  {selectedActivityLog.details || selectedActivityLog.summary || "No additional text payload recorded."}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase block mb-1">Raw Json Frame</label>
                <pre className="bg-black/80 text-emerald-400 p-3 rounded-xl font-mono text-[10px] overflow-x-auto border border-emerald-500/20">
                  {JSON.stringify(selectedActivityLog, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedActivityLog(null)}
                  className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Close Payload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: ALERT ACTION DIALOG */}
      {selectedAlertForAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-xs font-bold uppercase">Investigate Alert Trigger</h3>
                <p className="text-[10px] text-[var(--color-text-faint)]">{selectedAlertForAction.category}</p>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {selectedAlertForAction.message}
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedAlertForAction(null)}
                className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAlert(selectedAlertForAction.id)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
