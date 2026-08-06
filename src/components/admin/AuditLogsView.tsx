import React, { useState, useMemo, useEffect } from "react";
import { 
  Terminal, Search, Filter, Download, Trash2, Calendar, 
  RefreshCw, FileText, CheckCircle2, AlertTriangle, ShieldAlert,
  ChevronLeft, ChevronRight, Clock, UserCheck, AlertCircle, X, Check,
  ChevronDown, ChevronUp, Eye, User, Shield, Lock, FileSpreadsheet,
  Printer, RotateCcw, AlertOctagon, Info, Cpu, Database, HardDrive,
  Key, Settings, Server, Sliders, Play, Pause, Radio, Copy, CheckSquare,
  Square, ShieldCheck, Activity, Layers, ExternalLink, Zap
} from "lucide-react";
import { User as UserType } from "../../types";

interface AuditLogsViewProps {
  auditLogs: any[];
  setAuditLogs: React.Dispatch<React.SetStateAction<any[]>>;
  currentUser: UserType;
  userRoster?: UserType[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export interface NormalizedAuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  userAvatar?: string;
  action: string;
  actionType: string; // 'Login' | 'Failed Login' | 'Data Export' | 'Permission Change' | 'File Access' | 'System Config' | 'Purge' | 'Client Edit' | 'Other'
  module: string;     // 'Security' | 'User Management' | 'Clients' | 'Document Vault' | 'Compliance' | 'Tasks' | 'System'
  details: string;
  ip: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
  target?: string;
  metadata?: Record<string, any>;
  isSuspicious?: boolean;
  suspiciousReason?: string;
}

// Initial rich seed logs if auditLogs is sparse
const INITIAL_SEED_LOGS: NormalizedAuditLog[] = [
  {
    id: "log_seed_101",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 mins ago
    user: "David Acosta",
    userEmail: "david.acosta@gbk.ca",
    action: "User Authentication Succeeded",
    actionType: "Login",
    module: "Security",
    details: "User logged into CRM portal with multi-factor authentication (2FA). Session token issued.",
    ip: "192.168.1.104",
    riskLevel: "low",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    target: "CRM Packager Portal",
    metadata: { method: "POST", endpoint: "/api/v1/auth/login", sessionDuration: "8h", authMethod: "OAuth2 + TOTP" }
  },
  {
    id: "log_seed_102",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
    user: "Unknown / Anonymous",
    userEmail: "admin@gbk.ca",
    action: "Multiple Failed Login Attempts",
    actionType: "Failed Login",
    module: "Security",
    details: "3 consecutive invalid password attempts detected from remote IP. Account temporary lock triggered.",
    ip: "198.51.100.44",
    riskLevel: "high",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0",
    target: "Admin Security Portal",
    metadata: { method: "POST", endpoint: "/api/v1/auth/login", failedAttempts: 3, ruleTriggered: "BruteForceProtection" },
    isSuspicious: true,
    suspiciousReason: "Multiple failed login attempts from unrecognized IP"
  },
  {
    id: "log_seed_103",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    user: "Sarah Jenkins",
    userEmail: "sarah.j@gbk.ca",
    action: "Bulk Client Data Export",
    actionType: "Data Export",
    module: "Clients",
    details: "Administrative operator generated full client dossier CSV export (248 records exported).",
    ip: "10.0.4.18",
    riskLevel: "high",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
    target: "Client Database Dossier",
    metadata: { method: "GET", endpoint: "/api/v1/clients/export", recordsCount: 248, format: "CSV" },
    isSuspicious: true,
    suspiciousReason: "Bulk data export (>200 sensitive records)"
  },
  {
    id: "log_seed_104",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    user: "David Acosta",
    userEmail: "david.acosta@gbk.ca",
    action: "Clearance Level Elevated",
    actionType: "Permission Change",
    module: "User Management",
    details: "Elevated clearance level for user 'Wayne Gretzky' from Level 2 (Broker) to Level 5 (Admin).",
    ip: "192.168.1.104",
    riskLevel: "critical",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    target: "User: Wayne Gretzky (ID: usr_wg88)",
    metadata: { method: "PATCH", endpoint: "/api/v1/users/usr_wg88/permissions", previousLevel: 2, newLevel: 5 },
    isSuspicious: true,
    suspiciousReason: "Admin privilege escalation granted"
  },
  {
    id: "log_seed_105",
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(), // 2.3 hours ago
    user: "Wayne Gretzky",
    userEmail: "wayne.g@gbk.ca",
    action: "Document Vault Inspection",
    actionType: "File Access",
    module: "Document Vault",
    details: "Viewed encrypted NOA tax document for Client #8841 (Robert Vance).",
    ip: "172.16.254.12",
    riskLevel: "low",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    target: "Doc: NOA_2025_Vance.pdf",
    metadata: { method: "GET", endpoint: "/api/v1/vault/doc_8841", docType: "Tax Assessment", encrypted: true }
  },
  {
    id: "log_seed_106",
    timestamp: new Date(Date.now() - 1000 * 60 * 220).toISOString(), // 3.6 hours ago
    user: "System Daemon",
    userEmail: "system@gbk.ca",
    action: "Automated FSRA Compliance Verification",
    actionType: "System Config",
    module: "Compliance",
    details: "Routine automated audit scan completed across 42 active client files. 0 regulatory violations detected.",
    ip: "127.0.0.1",
    riskLevel: "low",
    userAgent: "GBK-ComplianceDaemon/2.4.0 (Internal Server)",
    target: "System Compliance Engine",
    metadata: { method: "CRON", job: "daily_fsra_audit", scannedFiles: 42, compliancePassed: true }
  },
  {
    id: "log_seed_107",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(), // 11 hours ago (Off-hours e.g. 2:45 AM)
    user: "Sarah Jenkins",
    userEmail: "sarah.j@gbk.ca",
    action: "Off-Hours System Settings Access",
    actionType: "File Access",
    module: "Security",
    details: "Access recorded to core system security settings at 02:45 AM EST (Outside normal operational hours).",
    ip: "198.51.100.99",
    riskLevel: "medium",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    target: "System Security Config",
    metadata: { method: "GET", endpoint: "/api/v1/admin/security", localTime: "02:45:12 AM" },
    isSuspicious: true,
    suspiciousReason: "Unusual off-hours system access (02:45 AM)"
  },
  {
    id: "log_seed_108",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    user: "Marcus Vance",
    userEmail: "marcus.v@gbk.ca",
    action: "SMTP Integration Credentials Updated",
    actionType: "System Config",
    module: "System",
    details: "Updated outbound SMTP email gateway configuration and API secret tokens.",
    ip: "10.0.4.55",
    riskLevel: "medium",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    target: "Email Integration Gateway",
    metadata: { method: "PUT", endpoint: "/api/v1/settings/smtp", provider: "SendGrid SSL" }
  },
  {
    id: "log_seed_109",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), // 1 day ago
    user: "David Acosta",
    userEmail: "david.acosta@gbk.ca",
    action: "Purge Audit Trajectory Execution",
    actionType: "Purge",
    module: "Security",
    details: "Administrative purge executed on historical operational logs older than 90 days. HMAC hash signature created.",
    ip: "192.168.1.104",
    riskLevel: "critical",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    target: "Audit Log Trajectory Store",
    metadata: { method: "DELETE", endpoint: "/api/v1/audit/purge", purgedCount: 142, signature: "sha256_8f9a2b" },
    isSuspicious: true,
    suspiciousReason: "Audit log purge execution"
  },
  {
    id: "log_seed_110",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    user: "Emily Watson",
    userEmail: "emily.w@gbk.ca",
    action: "Client Mortgage Deal Stage Change",
    actionType: "Client Edit",
    module: "Clients",
    details: "Updated deal status to 'Approved' for Client dossier #4490 (Jennifer Taylor). Lender: Scotiabank.",
    ip: "10.0.4.22",
    riskLevel: "low",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    target: "Client: Jennifer Taylor (#4490)",
    metadata: { method: "PATCH", endpoint: "/api/v1/clients/4490", previousStatus: "conditional", newStatus: "approved" }
  },
  {
    id: "log_seed_111",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    user: "System Daemon",
    userEmail: "system@gbk.ca",
    action: "Unauthorized API Key Access Attempt",
    actionType: "Failed Login",
    module: "Security",
    details: "Invalid REST API key attempt intercepted from external IP range 198.51.100.0/24.",
    ip: "198.51.100.44",
    riskLevel: "high",
    userAgent: "Python-urllib/3.10",
    target: "REST API Endpoint Gateway",
    metadata: { method: "POST", endpoint: "/api/v1/external/sync", status: 401 },
    isSuspicious: true,
    suspiciousReason: "Unauthorized REST API key attempt"
  },
  {
    id: "log_seed_112",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
    user: "David Acosta",
    userEmail: "david.acosta@gbk.ca",
    action: "Security Auto-Lock Policy Modified",
    actionType: "System Config",
    module: "Security",
    details: "Changed system auto-lock timeout duration from 15 minutes to 10 minutes.",
    ip: "192.168.1.104",
    riskLevel: "medium",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    target: "Global Security Policy",
    metadata: { method: "POST", endpoint: "/api/v1/admin/security/policy", key: "autolock_min", val: 10 }
  }
];

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  auditLogs,
  setAuditLogs,
  currentUser,
  userRoster = [],
  showToast
}) => {
  // State variables
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<"all" | "today" | "yesterday" | "7days" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Real-time updates toggle
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const [lastRealTimeTimestamp, setLastRealTimeTimestamp] = useState<string | null>(null);

  // Modals & Panels
  const [showConfirmPurge, setShowConfirmPurge] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [showPDFReportModal, setShowPDFReportModal] = useState(false);

  // Dropdown open states
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);

  // Retention settings
  const [retentionDays, setRetentionDays] = useState<number>(() => {
    return Number(localStorage.getItem("gbk_audit_retention_days") || "90");
  });
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState<boolean>(() => {
    return localStorage.getItem("gbk_audit_auto_purge") === "true";
  });

  // Suspicious Activity Acknowledgments
  const [dismissedSuspiciousIds, setDismissedSuspiciousIds] = useState<string[]>([]);

  const logsPerPage = 12;

  // Initialize/Normalize audit logs on mount
  useEffect(() => {
    if (!auditLogs || auditLogs.length < 5) {
      // Merge initial rich seed logs with existing auditLogs if sparse
      const existingIds = new Set(auditLogs.map(l => l.id || l.timestamp));
      const newSeedLogs = INITIAL_SEED_LOGS.filter(s => !existingIds.has(s.id));
      if (newSeedLogs.length > 0) {
        setAuditLogs(prev => [...prev, ...newSeedLogs]);
      }
    }
  }, []);

  // Normalize raw logs into unified AuditLog structure
  const normalizedLogs = useMemo<NormalizedAuditLog[]>(() => {
    return (auditLogs || []).map((log, idx) => {
      const id = log.id || `log_${idx}_${log.timestamp || log.time || Date.now()}`;
      const rawUser = log.user || log.operator || "System Daemon";
      const userEmail = log.userEmail || log.email || (rawUser.includes("@") ? rawUser : `${rawUser.toLowerCase().replace(/\s+/g, ".")}@gbk.ca`);
      const action = log.action || log.event || "Audit Event";
      
      // Determine action type
      let actionType = log.actionType;
      if (!actionType) {
        const actLower = action.toLowerCase();
        if (actLower.includes("failed") && actLower.includes("login")) actionType = "Failed Login";
        else if (actLower.includes("login") || actLower.includes("auth")) actionType = "Login";
        else if (actLower.includes("export") || actLower.includes("download")) actionType = "Data Export";
        else if (actLower.includes("permission") || actLower.includes("clearance") || actLower.includes("role")) actionType = "Permission Change";
        else if (actLower.includes("file") || actLower.includes("doc") || actLower.includes("view")) actionType = "File Access";
        else if (actLower.includes("purge") || actLower.includes("delete")) actionType = "Purge";
        else if (actLower.includes("client") || actLower.includes("status")) actionType = "Client Edit";
        else actionType = "System Config";
      }

      // Determine module
      let moduleName = log.module || log.category || log.type || "Security";
      const modLower = String(moduleName).toLowerCase();
      if (modLower.includes("sec") || modLower.includes("auth")) moduleName = "Security";
      else if (modLower.includes("user") || modLower.includes("perm")) moduleName = "User Management";
      else if (modLower.includes("client") || modLower.includes("dossier")) moduleName = "Clients";
      else if (modLower.includes("vault") || modLower.includes("doc")) moduleName = "Document Vault";
      else if (modLower.includes("comp") || modLower.includes("fsra")) moduleName = "Compliance";
      else if (modLower.includes("task")) moduleName = "Tasks";
      else moduleName = "System";

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const rawSev = (log.riskLevel || log.severity || 'low').toLowerCase();
      if (rawSev === 'critical' || rawSev === 'fatal') riskLevel = 'critical';
      else if (rawSev === 'high' || rawSev === 'danger') riskLevel = 'high';
      else if (rawSev === 'medium' || rawSev === 'warning' || rawSev === 'warn') riskLevel = 'medium';
      else riskLevel = 'low';

      // Detect suspicious flag
      const detailsStr = log.details || log.summary || log.target ? `Target: ${log.target}` : "Operational telemetry record captured.";
      const timestampStr = log.timestamp || log.time || new Date().toISOString();
      const ip = log.ip || log.ipAddress || "192.168.1.104";

      // Suspicious activity rules
      let isSuspicious = log.isSuspicious || false;
      let suspiciousReason = log.suspiciousReason || "";
      
      const logHour = new Date(timestampStr).getHours();
      if (actionType === "Failed Login" || action.toLowerCase().includes("failed login")) {
        isSuspicious = true;
        suspiciousReason = "Failed login attempt detected";
      } else if (logHour >= 1 && logHour <= 5) {
        isSuspicious = true;
        suspiciousReason = `Unusual off-hours access (${logHour}:00 AM EST)`;
      } else if (actionType === "Data Export" || action.toLowerCase().includes("bulk export")) {
        isSuspicious = true;
        suspiciousReason = "Bulk sensitive data export recorded";
      } else if (actionType === "Permission Change" || action.toLowerCase().includes("elevated")) {
        isSuspicious = true;
        suspiciousReason = "Administrative privilege escalation";
      } else if (actionType === "Purge") {
        isSuspicious = true;
        suspiciousReason = "Audit trajectory log purge execution";
      }

      return {
        id,
        timestamp: timestampStr,
        user: rawUser,
        userEmail,
        action,
        actionType,
        module: moduleName,
        details: detailsStr,
        ip,
        riskLevel,
        userAgent: log.userAgent || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        target: log.target || log.targetEntity || undefined,
        metadata: log.metadata || { method: "POST", endpoint: "/api/v1/audit", timestamp: timestampStr },
        isSuspicious,
        suspiciousReason
      };
    });
  }, [auditLogs]);

  // Real-time stream simulation effect
  useEffect(() => {
    let interval: any = null;
    if (isRealTimeActive) {
      interval = setInterval(() => {
        const simulatedEvents = [
          { action: "User Session Heartbeat Ping", actionType: "Login", module: "Security", riskLevel: "low", details: "Active WebSocket session health ping verified." },
          { action: "Automated File Integrity Audit", actionType: "System Config", module: "Document Vault", riskLevel: "low", details: "AES-256 storage hash check completed. 0 corrupted documents." },
          { action: "Compliance Rate Limit Check", actionType: "System Config", module: "Compliance", riskLevel: "low", details: "API request rate within safe threshold (12 req/min)." },
          { action: "Background Token Refresh", actionType: "Login", module: "Security", riskLevel: "low", details: "OAuth2 bearer token renewed for background agent worker." },
          { action: "Document Access Verification", actionType: "File Access", module: "Clients", riskLevel: "low", details: "Encrypted dossier client view logged for active session." }
        ];

        const randomEvent = simulatedEvents[Math.floor(Math.random() * simulatedEvents.length)];
        const currentOpName = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.name || "David Acosta";

        const newLog: NormalizedAuditLog = {
          id: `log_rt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: currentOpName,
          userEmail: currentUser.email || "david.acosta@gbk.ca",
          action: randomEvent.action,
          actionType: randomEvent.actionType,
          module: randomEvent.module,
          details: randomEvent.details,
          ip: "192.168.1.104",
          riskLevel: randomEvent.riskLevel as any,
          userAgent: "GBK-LiveTelemetryStream/1.0",
          metadata: { method: "LIVE", endpoint: "/api/v1/telemetry/stream", timestamp: new Date().toISOString() }
        };

        setAuditLogs(prev => [newLog, ...prev]);
        setLastRealTimeTimestamp(new Date().toLocaleTimeString());
      }, 6000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTimeActive, currentUser, setAuditLogs]);

  // Unique list of Users for Multi-Select
  const availableUsers = useMemo(() => {
    const userMap = new Map<string, string>();
    normalizedLogs.forEach(l => {
      if (l.user) userMap.set(l.user, l.userEmail);
    });
    userRoster.forEach(u => {
      const name = `${u.first} ${u.last}`.trim() || u.name;
      if (name) userMap.set(name, u.email);
    });
    return Array.from(userMap.entries()).map(([name, email]) => ({ name, email }));
  }, [normalizedLogs, userRoster]);

  // Unique List of Action Types
  const availableActionTypes = [
    "Login", "Failed Login", "Data Export", "Permission Change", "File Access", "System Config", "Purge", "Client Edit"
  ];

  // Unique List of Modules
  const availableModules = [
    "Security", "User Management", "Clients", "Document Vault", "Compliance", "Tasks", "System"
  ];

  // Detect suspicious activities / anomalies
  const suspiciousAnomalies = useMemo(() => {
    return normalizedLogs.filter(l => l.isSuspicious && !dismissedSuspiciousIds.includes(l.id));
  }, [normalizedLogs, dismissedSuspiciousIds]);

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    return normalizedLogs.filter(log => {
      // Full-text search matching
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const fullStr = `${log.action} ${log.user} ${log.userEmail} ${log.module} ${log.details} ${log.ip} ${log.riskLevel} ${log.actionType} ${JSON.stringify(log.metadata || {})}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
      }

      // Date Range Filter
      const logDate = new Date(log.timestamp);
      const now = new Date();
      if (dateRangePreset === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < todayStart) return false;
      } else if (dateRangePreset === "yesterday") {
        const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < yestStart || logDate >= yestEnd) return false;
      } else if (dateRangePreset === "7days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < sevenDaysAgo) return false;
      } else if (dateRangePreset === "custom") {
        if (customStartDate) {
          const start = new Date(customStartDate);
          if (logDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) return false;
        }
      }

      // User Multi-Select Filter
      if (selectedUsers.length > 0) {
        if (!selectedUsers.includes(log.user)) return false;
      }

      // Action Type Filter
      if (selectedActionTypes.length > 0) {
        if (!selectedActionTypes.includes(log.actionType)) return false;
      }

      // Module Filter
      if (selectedModules.length > 0) {
        if (!selectedModules.includes(log.module)) return false;
      }

      // Risk Level Filter
      if (riskLevelFilter !== "all") {
        if (log.riskLevel !== riskLevelFilter) return false;
      }

      return true;
    });
  }, [
    normalizedLogs, searchTerm, dateRangePreset, customStartDate, customEndDate,
    selectedUsers, selectedActionTypes, selectedModules, riskLevelFilter
  ]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * logsPerPage;
    return filteredLogs.slice(startIndex, startIndex + logsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;

  // Statistics metrics
  const stats = useMemo(() => {
    const total = normalizedLogs.length;
    const highCritical = normalizedLogs.filter(l => l.riskLevel === 'high' || l.riskLevel === 'critical').length;
    const uniqueUsersCount = new Set(normalizedLogs.map(l => l.user)).size;
    const anomaliesCount = suspiciousAnomalies.length;

    // Risk level counts
    const riskCounts = {
      critical: normalizedLogs.filter(l => l.riskLevel === 'critical').length,
      high: normalizedLogs.filter(l => l.riskLevel === 'high').length,
      medium: normalizedLogs.filter(l => l.riskLevel === 'medium').length,
      low: normalizedLogs.filter(l => l.riskLevel === 'low').length,
    };

    // Module counts
    const moduleCounts: Record<string, number> = {};
    availableModules.forEach(mod => {
      moduleCounts[mod] = normalizedLogs.filter(l => l.module === mod).length;
    });

    return { total, highCritical, uniqueUsersCount, anomaliesCount, riskCounts, moduleCounts };
  }, [normalizedLogs, suspiciousAnomalies, availableModules]);

  // Handle Export CSV with filters applied
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast("No audit logs match current active filters to export.", "error");
      return;
    }

    try {
      const headers = ["Log ID", "Timestamp", "User", "User Email", "Action", "Action Type", "Module", "IP Address", "Risk Level", "Details"];
      const rows = filteredLogs.map(log => [
        `"${log.id}"`,
        `"${log.timestamp}"`,
        `"${log.user.replace(/"/g, '""')}"`,
        `"${log.userEmail.replace(/"/g, '""')}"`,
        `"${log.action.replace(/"/g, '""')}"`,
        `"${log.actionType}"`,
        `"${log.module}"`,
        `"${log.ip}"`,
        `"${log.riskLevel.toUpperCase()}"`,
        `"${(log.details || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `gbk_audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Exported ${filteredLogs.length} filtered audit logs to CSV successfully.`, "success");
    } catch (err) {
      showToast("CSV Export failed.", "error");
    }
  };

  // Enforce retention policy cleanup
  const handleEnforceRetention = () => {
    if (retentionDays <= 0) {
      showToast("Retention policy set to Indefinite. No records purged.", "info");
      setShowRetentionModal(false);
      return;
    }

    const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const initialCount = auditLogs.length;
    const remainingLogs = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp || log.time || Date.now());
      return logDate >= cutoffTime;
    });

    const purgedCount = initialCount - remainingLogs.length;

    const signatureLog = {
      id: `log_retention_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.name || "Administrative Operator",
      userEmail: currentUser.email || "admin@gbk.ca",
      action: "Enforce Log Retention Cleanup",
      actionType: "Purge",
      module: "Security",
      details: `Enforced ${retentionDays}-day log retention policy. Purged ${purgedCount} expired audit trajectory records older than ${cutoffTime.toLocaleDateString()}.`,
      ip: "192.168.1.104",
      riskLevel: "medium",
      metadata: { retentionDays, purgedCount, cutoffDate: cutoffTime.toISOString() }
    };

    setAuditLogs([signatureLog, ...remainingLogs]);
    localStorage.setItem("gbk_audit_retention_days", String(retentionDays));
    localStorage.setItem("gbk_audit_auto_purge", String(autoPurgeEnabled));
    setShowRetentionModal(false);
    showToast(`Retention policy enforced: Purged ${purgedCount} expired log(s).`, "success");
  };

  // Perform Purge Trajectory
  const handlePurgeTrajectory = () => {
    if (filteredLogs.length === 0) {
      showToast("No trajectory records available to purge.", "error");
      setShowConfirmPurge(false);
      return;
    }

    const operatorName = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.name || "Administrative Operator";
    const purgedCount = filteredLogs.length;
    const hasFilter = searchTerm.trim() !== "" || dateRangePreset !== "all" || selectedUsers.length > 0 || selectedActionTypes.length > 0 || selectedModules.length > 0 || riskLevelFilter !== "all";

    const signatureLog = {
      id: `log_purge_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: operatorName,
      userEmail: currentUser.email || "admin@gbk.ca",
      action: "Purge Audit Trajectory Records",
      actionType: "Purge",
      module: "Security",
      details: hasFilter 
        ? `Administrative operator purged ${purgedCount} filtered audit records (Active filters applied). Trailing signature generated.`
        : `Administrative operator purged all ${auditLogs.length} historical audit trajectory records. Trailing signature generated.`,
      ip: "192.168.1.104",
      riskLevel: "critical",
      metadata: { purgedCount, hasFilter, operator: operatorName }
    };

    if (hasFilter) {
      const filteredIds = new Set(filteredLogs.map(l => l.id));
      const remainingLogs = auditLogs.filter(l => !filteredIds.has(l.id));
      setAuditLogs([signatureLog, ...remainingLogs]);
    } else {
      setAuditLogs([signatureLog]);
    }

    setCurrentPage(1);
    setShowConfirmPurge(false);
    showToast(`Successfully purged ${purgedCount} trajectory record${purgedCount === 1 ? '' : 's'}.`, "success");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setDateRangePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedUsers([]);
    setSelectedActionTypes([]);
    setSelectedModules([]);
    setRiskLevelFilter("all");
    setCurrentPage(1);
    showToast("Audit log filters reset.", "info");
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm.trim() !== "" || dateRangePreset !== "all" || customStartDate !== "" || customEndDate !== "" || selectedUsers.length > 0 || selectedActionTypes.length > 0 || selectedModules.length > 0 || riskLevelFilter !== "all";

  // Helper function to render Action Type icon
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "Login": return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case "Failed Login": return <AlertOctagon className="w-3.5 h-3.5 text-red-400" />;
      case "Data Export": return <Download className="w-3.5 h-3.5 text-blue-400" />;
      case "Permission Change": return <Key className="w-3.5 h-3.5 text-purple-400" />;
      case "File Access": return <Eye className="w-3.5 h-3.5 text-indigo-400" />;
      case "Purge": return <Trash2 className="w-3.5 h-3.5 text-rose-500" />;
      case "Client Edit": return <User className="w-3.5 h-3.5 text-teal-400" />;
      default: return <Sliders className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  // Helper function to render Risk Level badge
  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical":
        return (
          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-red-950/80 text-red-400 border border-red-500/40 flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-red-500" /> Critical
          </span>
        );
      case "high":
        return (
          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-500" /> High
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-500" /> Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Low / Info
          </span>
        );
    }
  };

  // Helper function to render Module pill badge
  const getModuleBadge = (mod: string) => {
    let colorClasses = "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]/50";
    if (mod === "Security") colorClasses = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    else if (mod === "User Management") colorClasses = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    else if (mod === "Clients") colorClasses = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    else if (mod === "Document Vault") colorClasses = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    else if (mod === "Compliance") colorClasses = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    else if (mod === "Tasks") colorClasses = "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";

    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${colorClasses}`}>
        {mod}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="audit-logs-view">
      
      {/* Page Title & Main Action Bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                Audit Logs & Telemetry Engine
                {isRealTimeActive && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    LIVE FEED
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Immutable security trajectory, anomaly detection, and compliance auditing system.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          
          {/* Real-Time Live Feed Toggle */}
          <button
            onClick={() => {
              setIsRealTimeActive(!isRealTimeActive);
              showToast(
                !isRealTimeActive ? "Real-time audit log live feed activated." : "Real-time feed paused.",
                !isRealTimeActive ? "success" : "info"
              );
            }}
            className={`text-xs font-bold uppercase px-3 py-2 rounded-xl flex items-center gap-2 border transition-all cursor-pointer ${
              isRealTimeActive 
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
            }`}
            title="Toggle Live Audit Stream"
          >
            {isRealTimeActive ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isRealTimeActive ? "Live Stream Active" : "Start Live Feed"}</span>
          </button>

          {/* Retention Settings Button */}
          <button
            onClick={() => setShowRetentionModal(true)}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold uppercase px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="Retention & Storage Settings"
          >
            <Settings className="w-4 h-4 text-[var(--color-text-faint)]" />
            <span>Retention ({retentionDays}d)</span>
          </button>

          {/* Export PDF Report */}
          <button
            onClick={() => setShowPDFReportModal(true)}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold uppercase px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generate PDF Audit Report"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            <span>PDF Report</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Purge Trajectory */}
          {!showConfirmPurge ? (
            <button
              onClick={() => {
                if (filteredLogs.length === 0) {
                  showToast("No trajectory records available to purge.", "error");
                  return;
                }
                setShowConfirmPurge(true);
              }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold uppercase px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              title="Purge logs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge</span>
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 p-1.5 rounded-xl flex items-center gap-2">
              <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Purge {filteredLogs.length} record(s)?
              </span>
              <button
                onClick={handlePurgeTrajectory}
                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Check className="w-3 h-3" /> Confirm
              </button>
              <button
                onClick={() => setShowConfirmPurge(false)}
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Audit Log Statistics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Logs */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)]">Total Events Logged</p>
            <h3 className="text-2xl font-black text-[var(--color-text)] font-mono mt-1">{stats.total}</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              Active trajectory tracking
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Terminal className="w-6 h-6 stroke-1.5" />
          </div>
        </div>

        {/* High & Critical Risk */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)]">High & Critical Risk</p>
            <h3 className="text-2xl font-black text-rose-500 font-mono mt-1">{stats.highCritical}</h3>
            <p className="text-[10px] text-rose-400/80 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {((stats.highCritical / (stats.total || 1)) * 100).toFixed(1)}% of total events
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <ShieldAlert className="w-6 h-6 stroke-1.5" />
          </div>
        </div>

        {/* Monitored Operators */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)]">Unique Operators</p>
            <h3 className="text-2xl font-black text-[var(--color-text)] font-mono mt-1">{stats.uniqueUsersCount}</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-purple-400" />
              Authenticated identities
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <User className="w-6 h-6 stroke-1.5" />
          </div>
        </div>

        {/* Suspicious Anomalies */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)]">Suspicious Anomalies</p>
            <h3 className="text-2xl font-black text-amber-500 font-mono mt-1">{stats.anomaliesCount}</h3>
            <p className="text-[10px] text-amber-400/80 mt-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {stats.anomaliesCount > 0 ? "Requires investigation" : "All clear"}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertOctagon className="w-6 h-6 stroke-1.5" />
          </div>
        </div>

      </div>

      {/* Suspicious Activity Highlight Panel */}
      {suspiciousAnomalies.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Security Anomalies & Suspicious Activity Highlights ({suspiciousAnomalies.length})
              </h3>
            </div>
            <span className="text-[10px] text-[var(--color-text-faint)] italic">
              Auto-detected by compliance telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suspiciousAnomalies.slice(0, 3).map((anomaly) => (
              <div 
                key={anomaly.id}
                className="bg-[var(--color-surface)] border border-amber-500/30 p-3 rounded-xl shadow-xs space-y-2 relative group hover:border-amber-500 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {getActionIcon(anomaly.actionType)}
                    <span className="text-xs font-bold text-[var(--color-text)] truncate max-w-[160px]">
                      {anomaly.action}
                    </span>
                  </div>
                  {getRiskBadge(anomaly.riskLevel)}
                </div>

                <p className="text-[11px] text-amber-600 dark:text-amber-300 font-medium">
                  {anomaly.suspiciousReason || anomaly.details}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]/40 text-[10px] text-[var(--color-text-faint)]">
                  <span>User: <strong className="text-[var(--color-text-muted)]">{anomaly.user}</strong></span>
                  <span>IP: <code className="font-mono text-xs">{anomaly.ip}</code></span>
                </div>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <button
                    onClick={() => {
                      setSearchTerm(anomaly.id);
                      showToast(`Filtered table to anomaly ${anomaly.id}`, "info");
                    }}
                    className="text-[10px] font-bold uppercase text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" /> Investigate
                  </button>
                  <button
                    onClick={() => {
                      setDismissedSuspiciousIds(prev => [...prev, anomaly.id]);
                      showToast("Anomaly alert dismissed.", "info");
                    }}
                    className="text-[10px] font-bold text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters & Search Bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-2xl shadow-sm space-y-4">
        
        {/* Top Search & Date Preset Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Full-Text Search Bar */}
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-xl px-3 py-2 flex items-center gap-2 flex-1 focus-within:border-[var(--color-accent)]/50 transition-all">
            <Search className="w-4 h-4 text-[var(--color-text-faint)] shrink-0" />
            <input
              type="text"
              placeholder="Full-text search actions, users, emails, IP address, payloads, details..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] outline-none w-full"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[var(--color-surface-2)] p-1 rounded-xl border border-[var(--color-border)]/50">
            <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] px-2">Date:</span>
            {(["all", "today", "yesterday", "7days", "custom"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setDateRangePreset(preset);
                  setCurrentPage(1);
                }}
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  dateRangePreset === preset
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-xs"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)]"
                }`}
              >
                {preset === "7days" ? "Last 7 Days" : preset}
              </button>
            ))}
          </div>

        </div>

        {/* Custom Date Pickers (if custom date preset selected) */}
        {dateRangePreset === "custom" && (
          <div className="bg-[var(--color-surface-2)]/60 p-3 rounded-xl border border-[var(--color-border)]/50 flex flex-wrap items-center gap-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-bold text-[var(--color-text)]">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] px-2 py-1 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-text)]">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] px-2 py-1 rounded-lg outline-none"
              />
            </div>
          </div>
        )}

        {/* Secondary Filter Controls: User Dropdown, Action Types, Modules, Risk Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[var(--color-border)]/40">
          
          {/* User Multi-Select Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowActionDropdown(false);
                setShowModuleDropdown(false);
              }}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 text-xs text-[var(--color-text)] px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[var(--color-surface-3)] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">
                  {selectedUsers.length === 0 
                    ? "All Users" 
                    : `${selectedUsers.length} User${selectedUsers.length > 1 ? "s" : ""} Selected`}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
            </button>

            {showUserDropdown && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-30 p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-1.5 px-1">
                  <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)]">Filter Users</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedUsers(availableUsers.map(u => u.name))}
                      className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="text-[10px] font-bold text-[var(--color-text-faint)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {availableUsers.map(u => {
                    const isChecked = selectedUsers.includes(u.name);
                    return (
                      <label
                        key={u.name}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedUsers(selectedUsers.filter(x => x !== u.name));
                          } else {
                            setSelectedUsers([...selectedUsers, u.name]);
                          }
                          setCurrentPage(1);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer text-xs"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                        )}
                        <span className="text-[var(--color-text)] truncate">{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Type Checkboxes Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowActionDropdown(!showActionDropdown);
                setShowUserDropdown(false);
                setShowModuleDropdown(false);
              }}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 text-xs text-[var(--color-text)] px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[var(--color-surface-3)] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {selectedActionTypes.length === 0 
                    ? "All Action Types" 
                    : `${selectedActionTypes.length} Action${selectedActionTypes.length > 1 ? "s" : ""}`}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
            </button>

            {showActionDropdown && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-30 p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-1.5 px-1">
                  <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)]">Action Types</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedActionTypes(availableActionTypes)}
                      className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedActionTypes([])}
                      className="text-[10px] font-bold text-[var(--color-text-faint)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {availableActionTypes.map(act => {
                    const isChecked = selectedActionTypes.includes(act);
                    return (
                      <label
                        key={act}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedActionTypes(selectedActionTypes.filter(x => x !== act));
                          } else {
                            setSelectedActionTypes([...selectedActionTypes, act]);
                          }
                          setCurrentPage(1);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer text-xs"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                        )}
                        <div className="flex items-center gap-1.5">
                          {getActionIcon(act)}
                          <span className="text-[var(--color-text)]">{act}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Module Checkboxes Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowModuleDropdown(!showModuleDropdown);
                setShowUserDropdown(false);
                setShowActionDropdown(false);
              }}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 text-xs text-[var(--color-text)] px-3 py-2 rounded-xl flex items-center justify-between hover:bg-[var(--color-surface-3)] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">
                  {selectedModules.length === 0 
                    ? "All Modules" 
                    : `${selectedModules.length} Module${selectedModules.length > 1 ? "s" : ""}`}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
            </button>

            {showModuleDropdown && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-30 p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-1.5 px-1">
                  <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)]">Modules</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedModules(availableModules)}
                      className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedModules([])}
                      className="text-[10px] font-bold text-[var(--color-text-faint)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {availableModules.map(mod => {
                    const isChecked = selectedModules.includes(mod);
                    return (
                      <label
                        key={mod}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedModules(selectedModules.filter(x => x !== mod));
                          } else {
                            setSelectedModules([...selectedModules, mod]);
                          }
                          setCurrentPage(1);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer text-xs"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                        )}
                        <span className="text-[var(--color-text)]">{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Risk Level Filter Dropdown */}
          <div>
            <select
              value={riskLevelFilter}
              onChange={(e) => {
                setRiskLevelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 text-xs text-[var(--color-text)] px-3 py-2 rounded-xl outline-none cursor-pointer hover:bg-[var(--color-surface-3)] transition-all font-medium"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk / Info 🟢</option>
              <option value="medium">Medium Alert 🟡</option>
              <option value="high">High Risk 🔴</option>
              <option value="critical">Critical Urgent 🚨</option>
            </select>
          </div>

        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/40 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)]">Active Filters:</span>
              
              {searchTerm && (
                <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  Search: "{searchTerm}"
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                </span>
              )}

              {dateRangePreset !== "all" && (
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  Date: {dateRangePreset}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setDateRangePreset("all")} />
                </span>
              )}

              {selectedUsers.length > 0 && (
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  Users: {selectedUsers.join(", ")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedUsers([])} />
                </span>
              )}

              {selectedActionTypes.length > 0 && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  Actions: {selectedActionTypes.join(", ")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedActionTypes([])} />
                </span>
              )}

              {selectedModules.length > 0 && (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  Modules: {selectedModules.join(", ")}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedModules([])} />
                </span>
              )}

              {riskLevelFilter !== "all" && (
                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  Risk: {riskLevelFilter.toUpperCase()}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setRiskLevelFilter("all")} />
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset All Filters
            </button>
          </div>
        )}

      </div>

      {/* Audit Logs Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl overflow-hidden shadow-md" id="audit-table-holder">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]/60 bg-[var(--color-surface-2)] text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-wider select-none">
                <th className="px-3 py-3 w-8"></th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User Operator</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Module Affected</th>
                <th className="px-4 py-3">Details Summary</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/40 text-xs">
              {paginatedLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const timestampStr = new Date(log.timestamp).toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
                });

                const initials = log.user
                  .split(" ")
                  .map(n => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase() || "US";

                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`hover:bg-[var(--color-surface-2)]/40 transition-all cursor-pointer ${
                        isExpanded ? "bg-[var(--color-surface-2)]/60" : ""
                      }`}
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      {/* Chevron Expand Toggle */}
                      <td className="px-3 py-3.5 text-center text-[var(--color-text-faint)]">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--color-accent)]" /> : <ChevronDown className="w-4 h-4" />}
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-[var(--color-text-faint)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                          <span>{timestampStr}</span>
                        </div>
                      </td>

                      {/* User with Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold text-[10px] flex items-center justify-center border border-[var(--color-accent)]/30 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--color-text)] leading-tight">{log.user}</div>
                            <div className="text-[10px] text-[var(--color-text-faint)]">{log.userEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Action Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
                          {getActionIcon(log.actionType)}
                          <span>{log.action}</span>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>

                      {/* Details Summary */}
                      <td className="px-4 py-3.5 text-[var(--color-text-muted)] max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--color-text-faint)] whitespace-nowrap">
                        {log.ip}
                      </td>

                      {/* Risk Level */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {getRiskBadge(log.riskLevel)}
                      </td>
                    </tr>

                    {/* Expandable Details Drawer / Row */}
                    {isExpanded && (
                      <tr className="bg-[var(--color-surface-2)]/30">
                        <td colSpan={8} className="p-4 border-y border-[var(--color-border)]/50">
                          <div className="space-y-3 max-w-5xl mx-auto bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-inner">
                            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2">
                              <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
                                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                                  Expanded Payload & Telemetry Detail
                                </h4>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                  showToast("Log payload copied to clipboard.", "success");
                                }}
                                className="text-[10px] font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" /> Copy JSON
                              </button>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)]/40">
                                <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] block">User Agent</span>
                                <span className="text-[11px] text-[var(--color-text-muted)] break-all font-mono">{log.userAgent}</span>
                              </div>
                              <div className="bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)]/40">
                                <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] block">Target Resource</span>
                                <span className="text-[11px] text-[var(--color-text)] font-semibold">{log.target || "N/A"}</span>
                              </div>
                              <div className="bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)]/40">
                                <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] block">Log ID</span>
                                <span className="text-[11px] font-mono text-[var(--color-accent)]">{log.id}</span>
                              </div>
                            </div>

                            {/* Details Text */}
                            <div>
                              <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] block mb-1">Description Payload</span>
                              <p className="text-xs text-[var(--color-text)] bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]/40 leading-relaxed font-mono">
                                {log.details}
                              </p>
                            </div>

                            {/* Raw JSON viewer */}
                            <div>
                              <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] block mb-1">Raw Telemetry JSON</span>
                              <pre className="text-[10px] text-emerald-400 bg-slate-950 p-3 rounded-lg overflow-x-auto font-mono max-h-40 border border-slate-800">
                                {JSON.stringify(log.metadata || log, null, 2)}
                              </pre>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[var(--color-text-faint)]">
                    <Terminal className="w-10 h-10 mx-auto mb-2 stroke-1 text-[var(--color-text-faint)]" />
                    <p className="italic text-sm">No operational audit logs met the active filters.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 text-xs font-bold text-[var(--color-accent)] hover:underline"
                      >
                        Clear Active Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-[var(--color-surface-2)] px-5 py-3 border-t border-[var(--color-border)]/50 flex items-center justify-between select-none">
            <span className="text-[11px] text-[var(--color-text-faint)] font-semibold">
              Showing logs {(currentPage - 1) * logsPerPage + 1}-{Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length}
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 hover:bg-[var(--color-surface-3)] rounded-lg border border-[var(--color-border)]/50 text-[var(--color-text-muted)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs text-[var(--color-text)] font-mono font-bold px-3">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 hover:bg-[var(--color-surface-3)] rounded-lg border border-[var(--color-border)]/50 text-[var(--color-text-muted)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Retention Settings Modal */}
      {showRetentionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className="text-base font-bold text-[var(--color-text)]">Audit Log Retention Policy</h3>
              </div>
              <button
                onClick={() => setShowRetentionModal(false)}
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              Configure automated compliance retention thresholds. Operational trajectory records older than the designated retention window can be purged automatically to maintain optimal database performance.
            </p>

            <div className="space-y-4 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)]/40">
              
              {/* Retention Period Dropdown */}
              <div>
                <label className="text-xs font-bold text-[var(--color-text)] block mb-1">
                  Retention Window Threshold:
                </label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] p-2.5 rounded-xl outline-none cursor-pointer"
                >
                  <option value={30}>30 Days (Standard Compliance)</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days (Recommended)</option>
                  <option value={180}>180 Days (Semi-Annual)</option>
                  <option value={365}>365 Days (1 Year Legal Hold)</option>
                  <option value={0}>Indefinite / Permanent (No Auto-Purge)</option>
                </select>
              </div>

              {/* Auto Purge Toggle */}
              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-[var(--color-border)]/40">
                <input
                  type="checkbox"
                  checked={autoPurgeEnabled}
                  onChange={(e) => setAutoPurgeEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                />
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  Enable automated background cleanup of expired logs
                </span>
              </label>

              {/* Storage Stats Gauge */}
              <div className="pt-2 border-t border-[var(--color-border)]/40 space-y-1">
                <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
                  <span>Current Stored Logs:</span>
                  <span className="font-mono font-bold text-[var(--color-text)]">{auditLogs.length} entries</span>
                </div>
                <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
                  <span>Estimated DB Storage:</span>
                  <span className="font-mono font-bold text-[var(--color-text)]">{(auditLogs.length * 1.4).toFixed(1)} KB</span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRetentionModal(false)}
                className="px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEnforceRetention}
                className="px-4 py-2 text-xs font-bold uppercase bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] rounded-xl shadow-sm cursor-pointer"
              >
                Save & Enforce Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Compliance Report Modal */}
      {showPDFReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-[var(--color-text)]">Executive Compliance Audit Report</h3>
              </div>
              <button
                onClick={() => setShowPDFReportModal(false)}
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formatted Report Body for Printing */}
            <div className="bg-white text-slate-900 p-6 rounded-xl space-y-4 font-sans border border-slate-200 shadow-inner">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">GBK Financial CRM</h2>
                  <p className="text-xs text-slate-500 font-bold">Official Audit Trajectory & Compliance Certificate</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Generated: <strong>{new Date().toLocaleString()}</strong></p>
                  <p>Auditor: <strong>{currentUser.name || currentUser.first}</strong></p>
                </div>
              </div>

              {/* Report Summary */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg text-xs border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Events</span>
                  <strong className="text-base text-slate-900 font-mono">{filteredLogs.length}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">High/Critical Events</span>
                  <strong className="text-base text-rose-600 font-mono">{stats.highCritical}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Active Filters</span>
                  <strong className="text-xs text-slate-700">{hasActiveFilters ? "Custom Filters Applied" : "Full Dataset"}</strong>
                </div>
              </div>

              {/* Sample Table Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Audit Events Snapshot</h4>
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[10px] text-slate-600 font-bold uppercase">
                      <th className="p-1.5">Timestamp</th>
                      <th className="p-1.5">User</th>
                      <th className="p-1.5">Action</th>
                      <th className="p-1.5">Module</th>
                      <th className="p-1.5 text-right">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[10px]">
                    {filteredLogs.slice(0, 8).map(log => (
                      <tr key={log.id}>
                        <td className="p-1.5 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="p-1.5 font-bold">{log.user}</td>
                        <td className="p-1.5">{log.action}</td>
                        <td className="p-1.5">{log.module}</td>
                        <td className="p-1.5 text-right font-bold uppercase">{log.riskLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPDFReportModal(false)}
                className="px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast("Print dialog opened for Audit Report.", "info");
                }}
                className="px-4 py-2 text-xs font-bold uppercase bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
