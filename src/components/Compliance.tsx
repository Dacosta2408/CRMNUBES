import React, { useState, useMemo, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, FileText, Clock, Search, Filter, 
  Download, Eye, Edit3, Lock, CheckCircle, AlertTriangle, 
  FileSpreadsheet, Sparkles, User, RefreshCw, X, Shield, 
  Layers, Database, ArrowRight, Check, AlertCircle, Info,
  CheckSquare, Activity, ExternalLink, FileCheck, FolderCheck, Users, Trash2
} from "lucide-react";
import { Client, Task, User as SystemUser } from "../types";
import { CHECKLIST_RULES, STATUS_STYLING } from "./document/constants";

interface ComplianceProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  userRoster: SystemUser[];
  setUserRoster?: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  currentUser: SystemUser;
  auditLogs: any[];
  setAuditLogs: React.Dispatch<React.SetStateAction<any[]>>;
  docVault: Record<string, any>;
  setDocVault: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  sessionAutoLock: boolean;
  setAutoLockEnabled: (val: boolean) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (val: number) => void;
  auditLoggingEnabled: boolean;
  setAuditLogEnabled: (val: boolean) => void;
  onLockApp: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onOpenClient?: (id: string, initialTab?: string) => void;
}

type ComplianceTab = "checklist" | "timeline" | "security" | "exceptions";

export const Compliance: React.FC<ComplianceProps> = ({
  clients,
  setClients,
  tasks,
  setTasks,
  userRoster,
  setUserRoster,
  currentUser,
  auditLogs,
  setAuditLogs,
  docVault,
  setDocVault,
  sessionAutoLock,
  setAutoLockEnabled,
  autoLockMinutes,
  setAutoLockMinutes,
  auditLoggingEnabled,
  setAuditLogEnabled,
  onLockApp,
  showToast,
  onOpenClient
}) => {
  const [activeTab, setActiveTab] = useState<ComplianceTab>("checklist");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("All");
  
  // Timeline filters
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineActionFilter, setTimelineActionFilter] = useState("All");
  const [timelinePage, setTimelinePage] = useState(1);
  const LOGS_PER_PAGE = 50;

  useEffect(() => {
    setTimelinePage(1);
  }, [timelineSearch, timelineActionFilter]);

  // Selection states for detail modals
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newComplianceNote, setNewComplianceNote] = useState("");
  const [snoozedExceptions, setSnoozedExceptions] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gbk_snoozed_exceptions') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('gbk_snoozed_exceptions', JSON.stringify(snoozedExceptions));
  }, [snoozedExceptions]);

  const [resolvedExceptions, setResolvedExceptions] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gbk_resolved_exceptions') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('gbk_resolved_exceptions', JSON.stringify(resolvedExceptions));
  }, [resolvedExceptions]);

  // Check permissions: Owner/Admin see all, brokers see their own.
  const isPrivileged = useMemo(() => {
    return ["Developer/Admin", "Admin"].includes(currentUser.role);
  }, [currentUser]);

  const activeAgentFilter = useMemo(() => {
    if (!isPrivileged) {
      return `${currentUser.first} ${currentUser.last}`;
    }
    return selectedAgent;
  }, [isPrivileged, currentUser, selectedAgent]);

  // User Management state & memoized filter
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [reassigningUserId, setReassigningUserId] = useState<string | null>(null);
  const [targetReassignId, setTargetReassignId] = useState<string>("");

  const handleToggleStatus = (u: SystemUser) => {
    if (u.id === currentUser.id) {
      showToast("You cannot deactivate your own admin account.", "error");
      return;
    }

    const nextStatus = u.status === "active" ? "inactive" : "active";
    if (setUserRoster) {
      setUserRoster(prev => prev.map(r => r.id === u.id ? { ...r, status: nextStatus as "active" | "inactive" } : r));
    }

    const userFullName = `${u.first || ""} ${u.last || ""}`.trim() || u.email;
    const adminFullName = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.email || "Admin";

    const logItem = {
      user: adminFullName,
      action: nextStatus === "inactive" ? "Deactivated broker staff account" : "Activated broker staff account",
      target: userFullName,
      time: new Date().toISOString()
    };
    setAuditLogs(prev => [logItem, ...prev]);

    if (nextStatus === "inactive") {
      showToast(`${userFullName} was marked inactive.`, "success");
    } else {
      showToast(`${userFullName} was marked active.`, "success");
    }
  };

  const handleReassignUserWorkload = (fromUserId: string, toUserId: string) => {
    if (!toUserId) {
      showToast("Please select an active staff member to receive the workload.", "error");
      return;
    }

    const sourceUser = userRoster.find(u => u.id === fromUserId);
    const targetUser = userRoster.find(u => u.id === toUserId);
    if (!sourceUser || !targetUser) return;

    const sourceFullName = `${sourceUser.first || ""} ${sourceUser.last || ""}`.trim() || sourceUser.displayName || sourceUser.email;
    const targetFullName = `${targetUser.first || ""} ${targetUser.last || ""}`.trim() || targetUser.displayName || targetUser.email;

    const sourceIdLower = sourceUser.id.toLowerCase();
    const sourceNameLower = sourceFullName.toLowerCase();

    const { clientCount, taskCount } = getUserMetrics(sourceUser);

    // Reassign Clients
    if (setClients) {
      setClients(prev => prev.map(c => {
        let updated = { ...c };
        let changed = false;

        const owner = (c.retentionOwner || "").toLowerCase();
        if (owner === sourceIdLower || owner === sourceNameLower) {
          updated.retentionOwner = targetFullName;
          changed = true;
        }
        const agent = (c.agent || "").toLowerCase();
        if (agent === sourceIdLower || agent === sourceNameLower) {
          updated.agent = targetFullName;
          changed = true;
        }
        if ((c as any).assignedTo) {
          const ass = ((c as any).assignedTo || "").toLowerCase();
          if (ass === sourceIdLower || ass === sourceNameLower) {
            (updated as any).assignedTo = targetFullName;
            changed = true;
          }
        }
        if ((c as any).assignedBroker) {
          const ab = ((c as any).assignedBroker || "").toLowerCase();
          if (ab === sourceIdLower || ab === sourceNameLower) {
            (updated as any).assignedBroker = targetFullName;
            changed = true;
          }
        }
        return changed ? updated : c;
      }));
    }

    // Reassign Tasks
    if (setTasks) {
      setTasks(prev => prev.map(t => {
        let updated = { ...t };
        let changed = false;

        ["owner", "assignedTo", "agent", "assignedUser"].forEach(field => {
          const val = ((t as any)[field] || "").toLowerCase();
          if (val === sourceIdLower || val === sourceNameLower) {
            (updated as any)[field] = targetFullName;
            changed = true;
          }
        });

        return changed ? updated : t;
      }));
    }

    const adminFullName = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.email || "Admin";
    const logItem = {
      user: adminFullName,
      action: "Reassigned broker staff workload",
      target: `${sourceFullName} -> ${targetFullName}`,
      time: new Date().toISOString()
    };
    setAuditLogs(prev => [logItem, ...prev]);

    showToast(`Reassigned ${clientCount} clients and ${taskCount} tasks from ${sourceFullName} to ${targetFullName}.`, "success");
    setReassigningUserId(null);
    setTargetReassignId("");
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = userRoster.find(u => u.id === userId);
    if (!targetUser) return;

    const targetFullName = `${targetUser.first || ""} ${targetUser.last || ""}`.trim() || targetUser.displayName || targetUser.email || "Staff Member";

    // Prevent self deletion
    if (targetUser.id === currentUser.id) {
      showToast("You cannot delete your own admin account.", "error");
      setDeletingUserId(null);
      return;
    }

    // Prevent deleting last privileged admin
    const privilegedAdmins = userRoster.filter(u => ["Developer/Admin", "Admin"].includes(u.role));
    if (["Developer/Admin", "Admin"].includes(targetUser.role) && privilegedAdmins.length <= 1) {
      showToast("At least one privileged admin account must remain active.", "error");
      setDeletingUserId(null);
      return;
    }

    // Workload safety safeguard
    const { clientCount, taskCount } = getUserMetrics(targetUser);
    if (clientCount > 0 || taskCount > 0) {
      showToast("Reassign this staff member’s active workload before deleting the account.", "warning");
      return;
    }

    // Remove from roster state
    if (setUserRoster) {
      setUserRoster(prev => prev.filter(u => u.id !== userId));
    }

    // Add audit log
    const adminFullName = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.email || "Admin";
    const logItem = {
      user: adminFullName,
      action: "Deleted broker staff account",
      target: targetFullName,
      time: new Date().toISOString()
    };
    setAuditLogs(prev => [logItem, ...prev]);

    // Show toast and reset deleting state
    showToast(`Broker staff member ${targetFullName} was removed.`, "success");
    setDeletingUserId(null);
  };

  const filteredUsers = useMemo(() => {
    if (!userRoster || userRoster.length === 0) return [];
    const term = userSearchTerm.trim().toLowerCase();
    if (!term) return userRoster;
    return userRoster.filter(user => {
      const fullName = `${user.first || ""} ${user.last || ""}`.toLowerCase();
      const email = (user.email || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      return fullName.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [userRoster, userSearchTerm]);

  const getPrivilegeScope = (role: string) => {
    if (role === "Developer/Admin") return "Full Access";
    if (role === "Admin") return "Admin Access";
    return "Restricted to Own Files";
  };

  const getUserMetrics = (u: SystemUser | null | undefined) => {
    if (!u) return { clientCount: 0, taskCount: 0, lastActivity: "No activity logged" };
    const fullName = `${u.first || ""}` + (u.last ? ` ${u.last}` : "");
    const trimmedFullName = fullName.trim();
    const lowerName = trimmedFullName.toLowerCase();
    const uId = (u.id || "").toLowerCase();

    // Assigned Clients count
    const clientCount = clients.filter(c => {
      const agent = (c.agent || "").toLowerCase();
      const owner = (c.retentionOwner || "").toLowerCase();
      const assignedTo = ((c as any).assignedTo || "").toLowerCase();
      const assignedBroker = ((c as any).assignedBroker || "").toLowerCase();

      return (
        (uId && (agent === uId || owner === uId || assignedTo === uId || assignedBroker === uId)) ||
        (lowerName && (agent === lowerName || owner === lowerName || assignedTo === lowerName || assignedBroker === lowerName || agent.includes(lowerName) || owner.includes(lowerName)))
      );
    }).length;

    // Assigned Tasks count
    const taskCount = tasks.filter(t => {
      const taskAssigned = (t.assignedTo || "").toLowerCase();
      return (
        (uId && taskAssigned === uId) ||
        (lowerName && (taskAssigned === lowerName || taskAssigned.includes(lowerName)))
      );
    }).length;

    // Last Activity from auditLogs or lastLogin
    const lastLog = auditLogs.find(log => {
      if (!log || !log.user) return false;
      const logUser = String(log.user).toLowerCase();
      return (
        (lowerName && logUser === lowerName) ||
        (uId && logUser === uId) ||
        (u.first && logUser.includes(u.first.toLowerCase()))
      );
    });

    let lastActivity = "No activity logged";
    if (lastLog && lastLog.time) {
      try {
        const d = new Date(lastLog.time);
        lastActivity = isNaN(d.getTime())
          ? String(lastLog.time)
          : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      } catch {
        lastActivity = String(lastLog.time);
      }
    } else if (u.lastLogin) {
      try {
        const d = new Date(u.lastLogin);
        lastActivity = isNaN(d.getTime())
          ? String(u.lastLogin)
          : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      } catch {
        lastActivity = String(u.lastLogin);
      }
    }

    return { clientCount, taskCount, lastActivity };
  };

  // Dynamic utility to evaluate documents compliance for a client against Client Database and CHECKLIST_RULES
  const getClientDocStats = (clientOrId: Client | string) => {
    const client = typeof clientOrId === "string" ? clients.find(cl => cl.id === clientOrId) : clientOrId;
    const clientId = typeof clientOrId === "string" ? clientOrId : clientOrId?.id;
    const clientDocs = (clientId ? docVault[clientId] : {}) || {};

    const activeRules = client ? CHECKLIST_RULES.filter(rule => rule.evaluate(client)) : CHECKLIST_RULES;

    let requiredCount = 0;
    let receivedCount = 0;
    let verifiedCount = 0;

    activeRules.forEach(rule => {
      const state = clientDocs[rule.id] || { status: rule.req ? "required" : "na" };
      const st = (state.status || "").toLowerCase();
      
      if (rule.req && st !== "na" && st !== "waived") {
        requiredCount++;
        const hasAttachedFile = (state.files && state.files.length > 0) || !!state.path || !!state.fileName;
        if (["received", "under_review", "verified", "approved"].includes(st) || hasAttachedFile) {
          receivedCount++;
          if (["verified", "approved"].includes(st)) {
            verifiedCount++;
          }
        }
      }
    });

    const isComplete = requiredCount > 0 ? receivedCount >= requiredCount : true;
    const isVerified = requiredCount > 0 ? verifiedCount >= requiredCount : true;

    return {
      totalRequired: Math.max(requiredCount, 1),
      totalReceived: Math.min(receivedCount, Math.max(requiredCount, 1)),
      totalVerified: verifiedCount,
      isComplete,
      isVerified,
      percent: requiredCount > 0 ? Math.min(100, Math.round((receivedCount / requiredCount) * 100)) : 100
    };
  };

  // Helper to check SIN masking compliance
  const formatSinValue = (sin?: string) => {
    if (!sin) return "Not Entered";
    const cleaned = sin.replace(/\D/g, "");
    if (cleaned.length === 9) {
      return `XXX-XXX-${cleaned.slice(5)}`;
    }
    return sin.length > 4 ? `*...* ${sin.slice(-4)}` : "Masked File";
  };

  // Filter clients for compliance monitoring
  const clientComplianceList = useMemo(() => {
    return clients.filter(c => {
      const agentId = c.assignedBroker || c.retentionOwner || c.agent || c.assignedTo;
      const agentUser = agentId ? userRoster.find(u => `${u.first || ""} ${u.last || ""}`.trim() === agentId || u.id === agentId || (u.first && u.first === agentId)) : null;
      const owner = agentUser ? `${agentUser.first || ""} ${agentUser.last || ""}`.trim() : agentId || `${currentUser.first || ""} ${currentUser.last || ""}`.trim();
      const matchesAgent = activeAgentFilter === "All" || owner.toLowerCase().includes(activeAgentFilter.toLowerCase()) || activeAgentFilter.toLowerCase().includes(owner.toLowerCase()) || activeAgentFilter.toLowerCase().includes(owner.toLowerCase().split(' ')[0]);
      
      if (!matchesAgent) return false;

      const s = searchTerm.toLowerCase();
      return (
        (c.first || "").toLowerCase().includes(s) ||
        (c.last || "").toLowerCase().includes(s) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.lender && c.lender.toLowerCase().includes(s)) ||
        (c.status && c.status.toLowerCase().includes(s))
      );
    });
  }, [clients, activeAgentFilter, searchTerm, userRoster]);

  // Expose exceptions radar
  const complianceExceptions = useMemo(() => {
    const now = new Date();
    const anomalies: {
      clientId: string;
      clientName: string;
      agent: string;
      type: "missing_docs" | "stagnation" | "no_communication" | "ai_unconfirmed" | "financials_incomplete";
      severity: "high" | "medium" | "low";
      description: string;
      actionable: string;
    }[] = [];

    clients.forEach(c => {
      const agentId = c.assignedBroker || c.retentionOwner || c.agent || c.assignedTo;
      const agentUser = agentId ? userRoster.find(u => `${u.first || ""} ${u.last || ""}`.trim() === agentId || u.id === agentId || (u.first && u.first === agentId)) : null;
      const owner = agentUser ? `${agentUser.first || ""} ${agentUser.last || ""}`.trim() : agentId || `${currentUser.first || ""} ${currentUser.last || ""}`.trim();
      const docStats = getClientDocStats(c.id);

      // Exception 1: In lender status but missing key documents
      if ((c.status === "lender" || c.status === "conditional") && docStats.totalReceived < docStats.totalRequired) {
        anomalies.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          agent: owner,
          type: "missing_docs",
          severity: "high",
          description: `Active folder sitting in ${c.status.toUpperCase()} stage but missing ${docStats.totalRequired - docStats.totalReceived} mandatory underwriting files.`,
          actionable: "Open Client documents tab and upload missing PDF verification files."
        });
      }

      // Exception 2: Folder stagnation (sitting in stage too long without updates)
      const lastUpdateStr = c.updatedAt || c.createdAt;
      const daysInStage = Math.ceil((now.getTime() - new Date(lastUpdateStr).getTime()) / (24 * 3600000));
      if (daysInStage > 30 && ["open", "working", "conditional", "lender"].includes(c.status)) {
        anomalies.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          agent: owner,
          type: "stagnation",
          severity: "medium",
          description: `Folder sitting inactive in "${c.status.toUpperCase()}" status for ${daysInStage} consecutive days without workflow change.`,
          actionable: "Audit files pipeline. Update lender comments, or advance status to clear backlog."
        });
      }

      // Exception 3: Quiet relationship (no recorded follow-up in 90 days for funded clients)
      const lastTouchStr = c.lastContactedDate || c.updatedAt || c.createdAt;
      const daysSinceTouch = Math.ceil((now.getTime() - new Date(lastTouchStr).getTime()) / (24 * 3600000));
      if (daysSinceTouch > 90 && c.status === "funded") {
        anomalies.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          agent: owner,
          type: "no_communication",
          severity: "low",
          description: `Post-close client has zero noted outreach logs for ${daysSinceTouch} days since file funding.`,
          actionable: "Trigger CRM Birthday or Mortgage Anniversary retention check-in template."
        });
      }

      // Exception 4: Incomplete core data on newly opened files
      const hasCrucialData = c.email && c.dob && c.income;
      if (!hasCrucialData && ["open", "working"].includes(c.status)) {
        anomalies.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          agent: owner,
          type: "financials_incomplete",
          severity: "medium",
          description: `Core KYC parameters missing (such as DOB, validated income streams, or verified co-signer profiles).`,
          actionable: "Conduct formal client interview to complete GDS/TDS safety benchmarks."
        });
      }

      // Exception 5: AI Summaries lacking human broker confirmation
      if (c.aiSummary && !c.appData?.aiConfirmed) {
        anomalies.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          agent: owner,
          type: "ai_unconfirmed",
          severity: "low",
          description: "AI-generated intake report is active but has not received human broker compliance validation.",
          actionable: "Open file, review AI-synthesized report parameters, and click Confirm Compliance Checklist."
        });
      }
    });

    return anomalies.filter(an => {
      const key = `${an.clientId}-${an.type}`;
      return !snoozedExceptions.includes(key) && !resolvedExceptions.includes(key);
    });
  }, [clients, docVault, userRoster, snoozedExceptions, resolvedExceptions]);

  // Overall metric calculations
  const metrics = useMemo(() => {
    const totalCount = clients.length;
    let cleanCount = 0;
    let attentionCount = 0;
    let riskCount = 0;

    clients.forEach(c => {
      const docStats = getClientDocStats(c.id);
      const isMissingCritical = (c.status === "lender" || c.status === "conditional") && docStats.totalReceived < 4;
      const daysSinceTouch = c.lastContactedDate 
        ? Math.ceil((new Date().getTime() - new Date(c.lastContactedDate).getTime()) / (24 * 3600000)) 
        : 100;

      if (isMissingCritical || (c.status === "funded" && daysSinceTouch > 180)) {
        riskCount++;
      } else if (docStats.totalReceived < docStats.totalRequired || !c.dob || !c.email) {
        attentionCount++;
      } else {
        cleanCount++;
      }
    });

    const cleanPct = totalCount > 0 ? Math.round((cleanCount / totalCount) * 100) : 100;

    // Filtered timeline count for the active user
    const totalViews = auditLogs.filter(log => String(log?.action || "").toLowerCase().includes("view")).length;
    const totalSensitive = auditLogs.filter(log => {
      const act = String(log?.action || "").toLowerCase();
      return act.includes("sin") || act.includes("export") || act.includes("credentials") || act.includes("credential");
    }).length;

    return {
      totalClients: totalCount,
      cleanCount,
      attentionCount,
      riskCount,
      cleanPct,
      totalViews,
      totalSensitive,
      exceptionsCount: complianceExceptions.length
    };
  }, [clients, docVault, auditLogs, complianceExceptions]);

  // Reusable audit log helper
  const appendAuditLog = (action: string, target: string) => {
    const user = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.email || "System User";
    const logItem = {
      user,
      action,
      target,
      time: new Date().toISOString()
    };
    setAuditLogs(prev => [logItem, ...prev]);
  };

  // Handler to log compliance audit notes
  const handleAddComplianceNote = () => {
    const targetClientId = selectedClient?.id;
    if (!targetClientId || !newComplianceNote.trim()) return;

    const formattedTime = new Date().toLocaleString();
    const updatedClients = clients.map(c => {
      if (c.id === targetClientId) {
        const currentNotes = c.retentionNotes || "";
        return {
          ...c,
          retentionNotes: currentNotes 
            ? `${currentNotes}\n[Compliance - ${formattedTime}]: ${newComplianceNote}`
            : `[Compliance - ${formattedTime}]: ${newComplianceNote}`,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    setClients(updatedClients);
    
    // Log in Audit Logs
    appendAuditLog("Logged compliance note", `${selectedClient.first} ${selectedClient.last}`);

    showToast(`Compliance note registered for ${selectedClient.first}!`, "success");
    setNewComplianceNote("");
  };

  // Human Confirmation of AI summaries
  const handleConfirmAiSummary = (clientId: string) => {
    const updated = clients.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          appData: {
            ...(c.appData || {}),
            aiConfirmed: true,
            aiConfirmedBy: `${currentUser.first} ${currentUser.last}`,
            aiConfirmedAt: new Date().toISOString()
          }
        };
      }
      return c;
    });
    setClients(updated);

    appendAuditLog("Confirmed AI report compliance", clientId);

    showToast("AI Intake summary successfully certified and locked.", "success");
  };

  // CSV Audit log exporter
  const generateCsvReport = () => {
    let csv = "Timestamp,User,Action,Target Client/Resource\n";
    auditLogs.forEach(log => {
      const time = log?.time || "";
      const user = log?.user || "";
      const action = log?.action || "";
      const target = log?.target || "";
      csv += `"${time}","${user}","${action}","${target}"\n`;
    });
    return csv;
  };

  // Individual Document Status Modifier inside checklist expander
  const handleUpdateDocStatusChecklist = (clientId: string, docId: string, status: string) => {
    const clientDocs = docVault[clientId] || {};
    const existingDoc = clientDocs[docId] || {};
    const updatedDocs = {
      ...clientDocs,
      [docId]: {
        ...existingDoc,
        status,
        updatedAt: new Date().toISOString(),
        path: existingDoc.path || existingDoc.fileName || `Status updated via compliance audit to ${status.toUpperCase()}`
      }
    };
    setDocVault(prev => ({
      ...prev,
      [clientId]: updatedDocs
    }));

    window.dispatchEvent(new CustomEvent("checklist-updated", { detail: { clientId, docId, status } }));

    // Audit log
    appendAuditLog(`Set doc '${docId}' status to ${status.toUpperCase()}`, clientId);

    showToast(`Updated document status to ${status.toUpperCase()}`, "info");
  };

  // Filtered Audit logs for the search table
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (!log) return false;
      const s = timelineSearch.toLowerCase();
      const userStr = String(log.user || "").toLowerCase();
      const actionStr = String(log.action || "").toLowerCase();
      const targetStr = String(log.target || "").toLowerCase();

      const matchesSearch = 
        userStr.includes(s) || 
        actionStr.includes(s) || 
        targetStr.includes(s);

      if (!matchesSearch) return false;

      if (timelineActionFilter === "All") return true;
      if (timelineActionFilter === "sensitive") {
        return (
          actionStr.includes("sin") ||
          actionStr.includes("export") ||
          actionStr.includes("login") ||
          actionStr.includes("unlock") ||
          actionStr.includes("credential")
        );
      }
      if (timelineActionFilter === "documents") {
        return actionStr.includes("doc");
      }
      if (timelineActionFilter === "view") {
        return actionStr.includes("view");
      }
      return true;
    });
  }, [auditLogs, timelineSearch, timelineActionFilter]);

  const handlePrintClientReport = (c: Client) => {
    const docStats = getClientDocStats(c.id);
    const clientDocs = docVault[c.id] || {};
    const agentId = c.retentionOwner || c.agent || c.assignedTo;
    const agentUser = agentId ? userRoster.find(u => `${u.first || ""} ${u.last || ""}`.trim() === agentId || u.id === agentId || (u.first && u.first === agentId)) : null;
    const owner = agentUser ? `${agentUser.first || ""} ${agentUser.last || ""}`.trim() : agentId || `${currentUser.first || ""} ${currentUser.last || ""}`.trim();
    const printedBy = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.email;
    const printedAt = new Date().toLocaleString();
    // GDS/TDS Calculations
    const income = Number(c.income || 0);
    const debts = Number(c.debts || 0);
    const mtgamt = Number(c.mtgamt || 0);
    const monthlyIncome = income / 12;
    const estMonthlyPayment = mtgamt * 0.005;
    const gds = monthlyIncome > 0 ? ((estMonthlyPayment + Number(c.heat || 0) + Number(c.condo || 0) + Number(c.tax || 0) / 12) / monthlyIncome * 100).toFixed(1) : "N/A";
    const tds = monthlyIncome > 0 ? ((estMonthlyPayment + debts / 12 + Number(c.heat || 0) + Number(c.condo || 0) + Number(c.tax || 0) / 12) / monthlyIncome * 100).toFixed(1) : "N/A";
    const gdsColor = Number(gds) < 32 ? "#22c55e" : Number(gds) < 39 ? "#f59e0b" : "#ef4444";
    const tdsColor = Number(tds) < 44 ? "#22c55e" : Number(tds) < 50 ? "#f59e0b" : "#ef4444";
    // Document checklist rows
    const activeRules = CHECKLIST_RULES.filter(rule => rule.evaluate(c));
    const docRows = activeRules.map(doc => {
      const state = clientDocs[doc.id] || { status: doc.req ? "required" : "na" };
      const st = (state.status || (doc.req ? "required" : "na")).toLowerCase();
      const attachedFiles = state.files || [];
      const fileName = attachedFiles[0]?.fileName || state.fileName || state.path || "—";
      let statusLabel = "⚠ REQUIRED";
      let statusColor = "#ef4444";
      if (st === "verified" || st === "approved") {
        statusLabel = "★ VERIFIED";
        statusColor = "#22c55e";
      } else if (st === "received" || st === "under_review") {
        statusLabel = "✓ RECEIVED";
        statusColor = "#3b82f6";
      } else if (st === "na" || st === "waived") {
        statusLabel = "N/A";
        statusColor = "#6b7280";
      }
      return `<tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:6px 8px;font-size:11px;color:#374151">${doc.label}</td>
        <td style="padding:6px 8px;font-size:11px;font-weight:700;color:${statusColor}">${statusLabel}</td>
        <td style="padding:6px 8px;font-size:10px;color:#6b7280">${fileName}</td>
      </tr>`;
    }).join("");
    // AI confirmation status
    const isAiConfirmed = !!c.appData?.aiConfirmed;
    const aiStatus = c.aiSummary
      ? (isAiConfirmed
          ? `✓ Confirmed by ${c.appData?.aiConfirmedBy || "Broker"} on ${c.appData?.aiConfirmedAt ? new Date(c.appData.aiConfirmedAt).toLocaleDateString() : "—"}`
          : "⚠ Awaiting Human Broker Confirmation")
      : "No AI Summary on File";
    // Compliance certification status
    const isComplianceCertified = !!c.appData?.complianceCertified;
    const certStatus = isComplianceCertified
      ? `✓ Certified by ${c.appData?.complianceCertifiedBy || "Broker"} on ${c.appData?.complianceCertifiedAt ? new Date(c.appData.complianceCertifiedAt).toLocaleDateString() : "—"}`
      : "Not Yet Certified";
    // calcSnapshot data if available
    const snap = c.calcSnapshot;
    const snapSection = snap ? `
      <div style="margin-top:20px">
        <h3 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#1f2937;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:10px">📊 Calculator Snapshot (Saved ${new Date(snap.savedAt).toLocaleDateString()})</h3>
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          ${snap.stressTest ? `<tr><td style="padding:4px 8px;color:#6b7280">Stress Test Max Mortgage</td><td style="padding:4px 8px;font-weight:700;color:#1f2937">$${snap.stressTest.maxQualifiedMortgage?.toLocaleString()}</td><td style="padding:4px 8px;color:#6b7280">Est. Payment @ Contract Rate</td><td style="padding:4px 8px;font-weight:700;color:#1f2937">$${snap.stressTest.estPaymentAtContract?.toLocaleString()}/mo</td></tr>` : ""}
          ${snap.gdsTds ? `<tr><td style="padding:4px 8px;color:#6b7280">GDS (Calculator)</td><td style="padding:4px 8px;font-weight:700;color:${snap.gdsTds.gds < 32 ? "#22c55e" : "#ef4444"}">${snap.gdsTds.gds?.toFixed(1)}%</td><td style="padding:4px 8px;color:#6b7280">TDS (Calculator)</td><td style="padding:4px 8px;font-weight:700;color:${snap.gdsTds.tds < 44 ? "#22c55e" : "#ef4444"}">${snap.gdsTds.tds?.toFixed(1)}%</td></tr>` : ""}
          ${snap.cmhc ? `<tr><td style="padding:4px 8px;color:#6b7280">CMHC Premium</td><td style="padding:4px 8px;font-weight:700;color:#1f2937">$${snap.cmhc.premiumAmount?.toLocaleString()} (${snap.cmhc.premiumPct}%)</td><td style="padding:4px 8px;color:#6b7280">LTV Ratio</td><td style="padding:4px 8px;font-weight:700;color:#1f2937">${snap.cmhc.ltvRatio?.toFixed(1)}%</td></tr>` : ""}
          ${snap.paymentCalc ? `<tr><td style="padding:4px 8px;color:#6b7280">Monthly Payment</td><td style="padding:4px 8px;font-weight:700;color:#1f2937">$${snap.paymentCalc.monthly?.toLocaleString()}</td><td style="padding:4px 8px;color:#6b7280">Total Interest</td><td style="padding:4px 8px;font-weight:700;color:#1f2937">$${snap.paymentCalc.totalInterest?.toLocaleString()}</td></tr>` : ""}
        </table>
      </div>` : "";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Compliance Report — ${c.first} ${c.last}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; padding: 32px; font-size: 12px; }
      @media print {
        body { padding: 16px; }
        .no-print { display: none !important; }
        @page { margin: 1.5cm; size: A4 portrait; }
      }
      .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1f2937; padding-bottom:16px; margin-bottom:24px; }
      .logo { font-size:18px; font-weight:900; letter-spacing:-.5px; color:#1f2937; }
      .logo span { color:#0d9488; }
      .report-title { font-size:11px; color:#6b7280; margin-top:4px; }
      .meta { text-align:right; font-size:10px; color:#6b7280; line-height:1.7; }
      .section { margin-bottom:24px; }
      h3 { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:#1f2937; border-bottom:2px solid #e5e7eb; padding-bottom:6px; margin-bottom:10px; }
      table { width:100%; border-collapse:collapse; }
      td, th { padding:6px 8px; vertical-align:top; }
      th { font-size:10px; text-transform:uppercase; color:#6b7280; font-weight:700; background:#f9fafb; text-align:left; }
      .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
      .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
      .kpi { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
      .kpi-label { font-size:9px; text-transform:uppercase; font-weight:700; color:#6b7280; margin-bottom:4px; }
      .kpi-value { font-size:16px; font-weight:900; color:#1f2937; }
      .status-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; background:#f3f4f6; color:#374151; }
      .notes-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:12px; font-size:11px; line-height:1.7; color:#374151; white-space:pre-wrap; min-height:60px; }
      .footer { margin-top:32px; border-top:1px solid #e5e7eb; padding-top:12px; font-size:9px; color:#9ca3af; display:flex; justify-content:space-between; }
      .print-btn { position:fixed; top:20px; right:20px; background:#0d9488; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; }
    </style></head><body>
    <button class="print-btn no-print" onclick="window.print()">🖨 Print / Save PDF</button>
    <div class="header">
      <div>
        <div class="logo">GBK <span>Financial</span></div>
        <div class="report-title">Client Compliance & Underwriting Report</div>
        <div style="margin-top:8px"><span class="status-badge">${c.status.toUpperCase()}</span>${isComplianceCertified ? ' <span class="status-badge" style="background:#dcfce7;color:#15803d">✓ COMPLIANCE CERTIFIED</span>' : ''}</div>
      </div>
      <div class="meta">
        <div><strong>Printed By:</strong> ${printedBy}</div>
        <div><strong>Print Date:</strong> ${printedAt}</div>
        <div><strong>Assigned Broker:</strong> ${owner}</div>
        <div><strong>Client ID:</strong> ${c.id}</div>
      </div>
    </div>
    <!-- KPI Strip -->
    <div class="section grid-4">
      <div class="kpi"><div class="kpi-label">Docs Received</div><div class="kpi-value">${docStats.totalReceived}/${docStats.totalRequired}</div></div>
      <div class="kpi"><div class="kpi-label">Docs Verified</div><div class="kpi-value">${docStats.totalVerified}/${docStats.totalRequired}</div></div>
      <div class="kpi"><div class="kpi-label">GDS (Est.)</div><div class="kpi-value" style="color:${gdsColor}">${gds}%</div></div>
      <div class="kpi"><div class="kpi-label">TDS (Est.)</div><div class="kpi-value" style="color:${tdsColor}">${tds}%</div></div>
    </div>
    <div class="grid-2">
      <!-- Personal & KYC -->
      <div class="section">
        <h3>👤 Borrower Profile & KYC</h3>
        <table>
          <tr><td style="color:#6b7280;width:45%">Full Name</td><td><strong>${c.first} ${c.last}</strong></td></tr>
          <tr><td style="color:#6b7280">Date of Birth</td><td>${c.dob || "Not Provided"}</td></tr>
          <tr><td style="color:#6b7280">Marital Status</td><td>${c.marital || "Not Specified"}</td></tr>
          <tr><td style="color:#6b7280">Dependants</td><td>${c.dep ?? "0"}</td></tr>
          <tr><td style="color:#6b7280">Email</td><td>${c.email || "—"}</td></tr>
          <tr><td style="color:#6b7280">Cell Phone</td><td>${c.cell || "—"}</td></tr>
          <tr><td style="color:#6b7280">Address</td><td>${c.addr || "Not Provided"}</td></tr>
          <tr><td style="color:#6b7280">SIN (Masked)</td><td style="font-weight:700;color:#b45309">${formatSinValue(c.sin)}</td></tr>
          <tr><td style="color:#6b7280">Co-Applicant</td><td>${c.co || "None"}</td></tr>
          ${c.coEmail ? `<tr><td style="color:#6b7280">Co-Applicant Email</td><td>${c.coEmail}</td></tr>` : ""}
          <tr><td style="color:#6b7280">Referred By</td><td>${c.referredBy || "—"}</td></tr>
          <tr><td style="color:#6b7280">Lead Source</td><td>${c.source || "—"}</td></tr>
        </table>
      </div>
      <!-- Financial Profile -->
      <div class="section">
        <h3>💰 Financial & Property Details</h3>
        <table>
          <tr><td style="color:#6b7280;width:45%">Employment Type</td><td>${c.emptype || "Not Specified"}</td></tr>
          <tr><td style="color:#6b7280">Primary Income</td><td><strong>$${Number(c.income || 0).toLocaleString()}/yr</strong></td></tr>
          <tr><td style="color:#6b7280">Co-Applicant Income</td><td>$${Number(c.coIncome || 0).toLocaleString()}/yr</td></tr>
          <tr><td style="color:#6b7280">Monthly Debts</td><td>$${Number(c.debts || 0).toLocaleString()}/mo</td></tr>
          <tr><td style="color:#6b7280">Beacon Score</td><td>${c.beacon || "Not Provided"}</td></tr>
          <tr><td style="color:#6b7280">Property Value</td><td>$${Number(c.propval || 0).toLocaleString()}</td></tr>
          <tr><td style="color:#6b7280">Mortgage Amount</td><td>$${Number(c.mtgamt || 0).toLocaleString()}</td></tr>
          <tr><td style="color:#6b7280">Property Type</td><td>${c.proptype || "—"}</td></tr>
          <tr><td style="color:#6b7280">Tenure</td><td>${c.tenure || "—"}</td></tr>
          <tr><td style="color:#6b7280">Property Taxes</td><td>$${Number(c.tax || 0).toLocaleString()}/yr</td></tr>
          <tr><td style="color:#6b7280">Heating Costs</td><td>$${Number(c.heat || 0).toLocaleString()}/mo</td></tr>
          <tr><td style="color:#6b7280">Condo Fees</td><td>$${Number(c.condo || 0).toLocaleString()}/mo</td></tr>
          <tr><td style="color:#6b7280">Assigned Lender</td><td><strong>${c.lender || "Not Assigned"}</strong></td></tr>
          <tr><td style="color:#6b7280">Mortgage Term</td><td>${c.mortgageTerm ? c.mortgageTerm + " Year(s)" : "—"}</td></tr>
          <tr><td style="color:#6b7280">Maturity Date</td><td>${c.maturityDate || "—"}</td></tr>
          <tr><td style="color:#6b7280">Funded Date</td><td>${c.fundedDate || "—"}</td></tr>
        </table>
      </div>
    </div>
    <!-- Document Checklist -->
    <div class="section">
      <h3>📁 Required Document Checklist</h3>
      <table>
        <thead><tr><th>Document</th><th>Status</th><th>File / Notes</th></tr></thead>
        <tbody>${docRows}</tbody>
      </table>
    </div>
    <!-- AI Summary & Certification -->
    <div class="grid-2">
      <div class="section">
        <h3>🤖 AI Intake Report Status</h3>
        <div class="notes-box" style="min-height:80px">${c.aiSummary ? `<div style="font-style:italic;color:#374151;margin-bottom:8px">"${c.aiSummary}"</div><div style="font-size:10px;color:#6b7280">${aiStatus}</div>` : "No AI Summary on file."}</div>
      </div>
      <div class="section">
        <h3>✅ Compliance Certification</h3>
        <div class="notes-box" style="min-height:80px">
          <div style="font-weight:700;color:${isComplianceCertified ? "#15803d" : "#b45309"}">${certStatus}</div>
          <div style="margin-top:8px;font-size:10px;color:#6b7280">File Cleanliness: ${docStats.percent}% (${docStats.totalReceived}/${docStats.totalRequired} docs received, ${docStats.totalVerified} verified)</div>
        </div>
      </div>
    </div>
    ${snapSection}
    <!-- Compliance Notes -->
    <div class="section">
      <h3>📝 Auditor Notes & Compliance Decisions</h3>
      <div class="notes-box">${c.retentionNotes || "No compliance notes recorded for this client."}</div>
    </div>
    <div class="footer">
      <div>GBK Financial CRM — Confidential. For internal broker use only. Do not distribute without authorization.</div>
      <div>Generated: ${printedAt} | By: ${printedBy}</div>
    </div>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    appendAuditLog("Generated Compliance Print Report", `${c.first} ${c.last}`);
    showToast(`Print report opened for ${c.first} ${c.last}.`, "info");
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden font-sans" id="compliance-module-root">
      
      {/* Central Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 sm:px-6 sm:py-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="compliance-header">
        <div>
          <h2 className="text-sm font-black uppercase text-[var(--color-accent)] tracking-wider flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--color-accent)] shrink-0" /> Compliance &amp; Governance
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
            Monitor file cleanliness, audit history, process exceptions, and security policies.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2.5">
          {isPrivileged ? (
            <div className="flex items-center gap-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-xs">
              <Filter className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-transparent border-none text-xs text-[var(--color-text)] focus:outline-none font-bold cursor-pointer"
              >
                <option value="All" className="bg-[var(--color-surface-2)]">All Broker Ledgers</option>
                {userRoster.map(u => (
                  <option key={u.id} value={`${u.first} ${u.last}`} className="bg-[var(--color-surface-2)]">{u.first} {u.last}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[10px] text-[var(--color-accent)] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Personal Compliance View
            </div>
          )}

          {activeTab === "checklist" && (
            <div className="relative bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 flex items-center w-full sm:w-60">
              <Search className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search file checklists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none w-full font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer ml-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metric Stats Banner */}
      <div className="bg-[var(--color-surface)] px-4 sm:px-6 py-4 border-b border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0" id="compliance-metrics">
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3.5 text-left flex flex-col justify-between transition-all hover:border-[var(--color-border)]/80">
          <div className="flex justify-between items-center text-[var(--color-text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">File Cleanliness Index</span>
            <span className="text-[var(--color-accent)] font-bold text-xs">★</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black block text-[var(--color-text)]">{metrics.cleanPct}%</span>
            <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5 font-medium">
              {metrics.cleanCount} of {metrics.totalClients} folders certified ready
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3.5 text-left flex flex-col justify-between transition-all hover:border-[var(--color-border)]/80">
          <div className="flex justify-between items-center text-[var(--color-text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Process Exceptions</span>
            <span className="text-red-400 font-bold text-xs">⚠️</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black block text-red-400 font-mono">{metrics.exceptionsCount}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5 font-medium">
              Files requiring manual audit review
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3.5 text-left flex flex-col justify-between transition-all hover:border-[var(--color-border)]/80">
          <div className="flex justify-between items-center text-[var(--color-text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sensitive Field Access</span>
            <span className="text-amber-400 font-bold text-xs">🛡️</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black block text-amber-400 font-mono">{metrics.totalSensitive}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5 font-medium">
              SIN and security requests logged
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3.5 text-left flex flex-col justify-between transition-all hover:border-[var(--color-border)]/80">
          <div className="flex justify-between items-center text-[var(--color-text-muted)]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Audit Log Volume</span>
            <span className="text-emerald-400 font-bold text-xs">📈</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black block text-emerald-400 font-mono">{auditLogs.length}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5 font-medium">
              Total operational events recorded
            </span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 sm:px-6 py-2.5 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3" id="compliance-tab-bar">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === "checklist" ? "bg-[var(--color-surface-2)] text-[var(--color-accent)] border-[var(--color-border)] shadow-xs" : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50 border-transparent font-medium"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" /> Checklists &amp; Audit
          </button>
          <button
            onClick={() => setActiveTab("exceptions")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative whitespace-nowrap cursor-pointer border ${
              activeTab === "exceptions" ? "bg-[var(--color-surface-2)] text-[var(--color-accent)] border-[var(--color-border)] shadow-xs" : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50 border-transparent font-medium"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" /> Exceptions
            {metrics.exceptionsCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                {metrics.exceptionsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === "timeline" ? "bg-[var(--color-surface-2)] text-[var(--color-accent)] border-[var(--color-border)] shadow-xs" : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50 border-transparent font-medium"
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Audit Log
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === "security" ? "bg-[var(--color-surface-2)] text-[var(--color-accent)] border-[var(--color-border)] shadow-xs" : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50 border-transparent font-medium"
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Security &amp; Admin
          </button>
        </div>

        <button
          onClick={() => {
            onLockApp();
            showToast("Workstation locked instantly for compliance security.", "info");
          }}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" /> Emergency Lock
        </button>
      </div>

      {/* Content Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* CHECKLISTS AND READINESS RADAR */}
        {activeTab === "checklist" && (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs">
                <span className="text-[var(--color-accent)] font-bold uppercase tracking-wider block">🛡️ Client File Audit &amp; Checklists</span>
                <span className="text-[var(--color-text-muted)] block mt-0.5 font-medium">
                  Review document collections, verify GDS/TDS parameters, log clearance decisions, and mark files as audit-ready.
                </span>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] uppercase text-[9px] tracking-wider border-b border-[var(--color-border)]">
                    <tr>
                      <th className="p-4">Borrower Name</th>
                      <th className="p-4">Assigned Broker</th>
                      <th className="p-4">Pipeline Stage</th>
                      <th className="p-4">Income / Debt</th>
                      <th className="p-4">Doc Checklist</th>
                      <th className="p-4">Verification Score</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {clientComplianceList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center bg-[var(--color-surface)]">
                          <FileText className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold text-[var(--color-text)]">No client files found</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium max-w-sm mx-auto">
                            {searchTerm ? "No files matched your search filter criteria." : "No client files are currently assigned to this broker view."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      clientComplianceList.map(c => {
                        const docStats = getClientDocStats(c.id);
                        const agentId = c.assignedBroker || c.retentionOwner || c.agent || c.assignedTo;
                        const agentUser = agentId ? userRoster.find(u => `${u.first || ""} ${u.last || ""}`.trim() === agentId || u.id === agentId || (u.first && u.first === agentId)) : null;
                        const owner = agentUser ? `${agentUser.first || ""} ${agentUser.last || ""}`.trim() : agentId || `${currentUser.first || ""} ${currentUser.last || ""}`.trim();
                        const verifiedScore = Math.round((docStats.totalVerified / docStats.totalRequired) * 100);

                        let indexColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                        let label = "CLEAN";
                        if (docStats.totalReceived < 3) {
                          indexColor = "text-red-400 bg-red-500/10 border-red-500/20";
                          label = "CRITICAL RISK";
                        } else if (docStats.totalReceived < docStats.totalRequired) {
                          indexColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                          label = "ATTENTION NEEDED";
                        }

                        return (
                        <React.Fragment key={c.id}>
                          <tr className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                            <td className="p-4">
                              <div className="text-[var(--color-text)] font-bold">{c.first} {c.last}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[180px] mt-0.5">{c.addr || "No registered address"}</div>
                            </td>
                            <td className="p-4 text-[var(--color-text-muted)] font-semibold">{owner}</td>
                            <td className="p-4">
                              <span className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] text-[9px] font-black uppercase px-2 py-0.5 rounded border border-[var(--color-border)]">
                                {c.status.toUpperCase()}
                              </span>
                              {!!c.appData?.complianceCertified && (
                                <div className="mt-1">
                                  <span className="text-emerald-400 bg-emerald-500/10 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                                    ✓ Certified
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="text-[var(--color-text)]">${Number(c.income || 0).toLocaleString()}/yr</div>
                              <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Debts: ${Number(c.debts || 0).toLocaleString()}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[var(--color-text)] font-mono">{docStats.totalReceived}/{docStats.totalRequired}</span>
                                <div className="w-16 bg-[var(--color-surface-2)] h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[var(--color-accent)] h-full" style={{ width: `${docStats.percent}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-[9px] border font-black uppercase ${indexColor}`}>
                                {label} ({verifiedScore}% verified)
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                                className="px-3 py-1.5 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 border border-[var(--color-border)] text-[var(--color-accent)] rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer"
                              >
                                {selectedClient?.id === c.id ? "Close Audit" : "Audit File"}
                              </button>
                            </td>
                          </tr>

                          {/* Nested compliance client detail audit card */}
                          {selectedClient?.id === c.id && (
                            <tr>
                              <td colSpan={7} className="bg-[var(--color-surface-2)] p-6 border-y border-[var(--color-border)]">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-semibold">
                                  
                                   {/* Left col: documents checklist */}
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-widest flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Client Database Documents Audit
                                      </h4>
                                      {onOpenClient && (
                                        <button
                                          onClick={() => onOpenClient(c.id, "documents")}
                                          className="text-[9px] font-black uppercase text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          Open Vault <ExternalLink className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>

                                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                      {(() => {
                                        const clientVault = docVault[c.id] || {};
                                        const activeRules = CHECKLIST_RULES.filter(rule => rule.evaluate(c));
                                        const activeRuleIds = new Set(activeRules.map(r => r.id));

                                        // Also gather any additional document keys present in docVault[c.id]
                                        const extraDocIds = Object.keys(clientVault).filter(id => !activeRuleIds.has(id));

                                        const allDocItems = [
                                          ...activeRules.map(r => ({
                                            id: r.id,
                                            label: r.label,
                                            category: r.category,
                                            description: r.description,
                                            req: r.req
                                          })),
                                          ...extraDocIds.map(id => {
                                            const docData = clientVault[id] || {};
                                            return {
                                              id,
                                              label: docData.label || docData.name || id.replace(/_/g, " ").toUpperCase(),
                                              category: docData.category || "General",
                                              description: docData.description || "Client database uploaded document",
                                              req: false
                                            };
                                          })
                                        ];

                                        if (allDocItems.length === 0) {
                                          return (
                                            <div className="p-4 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                                              No specific document requirements configured for this file.
                                            </div>
                                          );
                                        }

                                        return allDocItems.map(doc => {
                                          const state = clientVault[doc.id] || { status: doc.req ? "required" : "na" };
                                          const st = (state.status || (doc.req ? "required" : "na")).toLowerCase();

                                          const attachedFiles = state.files || [];
                                          const fileName = attachedFiles[0]?.fileName || state.fileName || state.path || null;
                                          const uploadTime = attachedFiles[0]?.uploadedAt || state.updatedAt;

                                          return (
                                            <div key={doc.id} className="p-2.5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex flex-col gap-1.5">
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                                      {doc.category}
                                                    </span>
                                                    <span className="text-[var(--color-text)] font-bold text-xs truncate">{doc.label}</span>
                                                  </div>

                                                  <div className="mt-1 flex items-center gap-1.5 text-[9px]">
                                                    {fileName ? (
                                                      <span className="text-emerald-400 font-mono flex items-center gap-1 truncate max-w-[180px]">
                                                        <FileCheck className="h-3 w-3 shrink-0" />
                                                        {fileName}
                                                      </span>
                                                    ) : (
                                                      <span className="text-[var(--color-text-faint)] italic">No file uploaded yet</span>
                                                    )}
                                                    {uploadTime && (
                                                      <span className="text-[var(--color-text-faint)] font-mono text-[8px]">
                                                        • {new Date(uploadTime).toLocaleDateString()}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>

                                                <select
                                                  value={st}
                                                  onChange={(e) => handleUpdateDocStatusChecklist(c.id, doc.id, e.target.value)}
                                                  className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[9px] font-black uppercase p-1.5 rounded-lg focus:outline-none focus:border-[var(--color-accent)] shrink-0 cursor-pointer"
                                                >
                                                  <option value="required">Required</option>
                                                  <option value="requested">Requested</option>
                                                  <option value="received">✓ Received</option>
                                                  <option value="under_review">Under Review</option>
                                                  <option value="verified">★ Verified</option>
                                                  <option value="approved">✓ Approved</option>
                                                  <option value="rejected">✕ Rejected</option>
                                                  <option value="waived">Waived</option>
                                                  <option value="na">N/A</option>
                                                </select>
                                              </div>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>

                                  {/* Center col: financial safety parameters */}
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-widest mb-3">
                                        📈 Mortgage GDS/TDS safety constraints
                                      </h4>
                                      <div className="p-3.5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-2.5">
                                        <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                                          <span className="text-[var(--color-text-muted)]">Primary Income:</span>
                                          <span className="text-[var(--color-text)] font-mono">${Number(c.income || 0).toLocaleString()}/yr</span>
                                        </div>
                                        <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                                          <span className="text-[var(--color-text-muted)]">Mortgage Loan Amt:</span>
                                          <span className="text-[var(--color-text)] font-mono">${Number(c.mtgamt || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                                          <span className="text-[var(--color-text-muted)]">Registered SIN:</span>
                                          <span className="text-amber-500 font-mono font-bold">{c.sin ? formatSinValue(c.sin) : "Not Provided"}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                                          <span className="text-[var(--color-text-muted)]">Client Date of Birth:</span>
                                          <span className="text-[var(--color-text)] font-mono">{c.dob || "Not Entered"}</span>
                                        </div>
                                        {c.co && (
                                          <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                                            <span className="text-[var(--color-text-muted)]">Co-Signer Added:</span>
                                            <span className="text-[var(--color-accent)] truncate max-w-[120px]">{c.co}</span>
                                          </div>
                                        )}
                                        {(() => {
                                          const mtgamtNum = Number(c.mtgamt || 0);
                                          const incomeNum = Number(c.income || 0);
                                          const debtsNum = Number(c.debts || 0);
                                          const monthlyIncome = incomeNum > 0 ? incomeNum / 12 : 0;
                                          const monthlyPayment = mtgamtNum * 0.005;
                                          const gdsVal = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : null;
                                          const tdsVal = monthlyIncome > 0 ? ((monthlyPayment + (debtsNum / 12)) / monthlyIncome) * 100 : null;

                                          const getGdsColor = (val: number | null) => {
                                            if (val === null) return "text-[var(--color-text-muted)]";
                                            if (val < 32) return "text-emerald-400";
                                            if (val <= 39) return "text-amber-400";
                                            return "text-red-400";
                                          };

                                          const getTdsColor = (val: number | null) => {
                                            if (val === null) return "text-[var(--color-text-muted)]";
                                            if (val < 44) return "text-emerald-400";
                                            if (val <= 50) return "text-amber-400";
                                            return "text-red-400";
                                          };

                                          return (
                                            <>
                                              <div className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                                                <span className="text-[var(--color-text-muted)]">Estimated GDS Ratio:</span>
                                                <span className={`font-mono font-bold ${getGdsColor(gdsVal)}`}>
                                                  {gdsVal !== null ? `${gdsVal.toFixed(1)}%` : "N/A"}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-[var(--color-text-muted)]">Estimated TDS Ratio:</span>
                                                <span className={`font-mono font-bold ${getTdsColor(tdsVal)}`}>
                                                  {tdsVal !== null ? `${tdsVal.toFixed(1)}%` : "N/A"}
                                                </span>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>

                                    {/* AI summaries check */}
                                    {c.aiSummary && (
                                      <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-black">AI Intake Report Verification</span>
                                          {!!c.appData?.aiConfirmed ? (
                                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                              ✓ Locked
                                            </span>
                                          ) : (
                                            <span className="text-[9px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded uppercase">
                                              Awaiting Review
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-3 leading-relaxed italic">
                                          {c.aiSummary}
                                        </p>
                                        {!c.appData?.aiConfirmed && (
                                          <button
                                            onClick={() => handleConfirmAiSummary(c.id)}
                                            className="w-full py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-black text-[9px] uppercase rounded-lg tracking-wider transition-all cursor-pointer"
                                          >
                                            Confirm AI Accuracy &amp; Approve Intake
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Right col: log notes, outcomes, and clearance actions */}
                                  <div className="flex flex-col justify-between">
                                    <div>
                                      <h4 className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-widest mb-3">
                                        📝 Compliance Auditing Notes &amp; Decisions
                                      </h4>
                                      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3 rounded-xl max-h-40 overflow-y-auto mb-3 text-[11px] leading-relaxed text-[var(--color-text)] whitespace-pre-line font-mono">
                                        {c.retentionNotes || "No manual compliance clearance records logged yet for this folder."}
                                      </div>
                                      
                                      <textarea
                                        rows={3}
                                        value={newComplianceNote}
                                        onChange={(e) => setNewComplianceNote(e.target.value)}
                                        placeholder="Add permanent auditor commentary regarding document validation exceptions or GDS overrides..."
                                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]/30 font-semibold"
                                      />
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                      <button onClick={() => handlePrintClientReport(c)} className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-[10px] font-black uppercase border border-blue-500/20 transition-all cursor-pointer">
                                        🖨 Print Report
                                      </button>
                                      <button
                                        onClick={handleAddComplianceNote}
                                        className="flex-1 py-2 bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-offset)]/80 text-[var(--color-text)] rounded-lg text-[10px] font-black uppercase border border-[var(--color-border)] transition-all cursor-pointer"
                                      >
                                        Log Auditor Note
                                      </button>
                                      {isPrivileged ? (
                                        <button
                                          onClick={() => {
                                            appendAuditLog("Certified Client File Audit-Ready", `${c.first} ${c.last}`);
                                            
                                            // Update status to approved or add a verified flag
                                            const updated = clients.map(cl => {
                                              if (cl.id === c.id) {
                                                return {
                                                  ...cl,
                                                  appData: {
                                                    ...(cl.appData || {}),
                                                    complianceCertified: true,
                                                    complianceCertifiedBy: `${currentUser.first} ${currentUser.last}`,
                                                    complianceCertifiedAt: new Date().toISOString()
                                                  }
                                                };
                                              }
                                              return cl;
                                            });
                                            setClients(updated);

                                            showToast(`File certified and cleared for submission!`, "success");
                                            setSelectedClient(null);
                                          }}
                                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer"
                                        >
                                          Clear File Compliance
                                        </button>
                                      ) : (
                                        <div className="flex-1 py-2 bg-[var(--color-surface-2)] text-[var(--color-text-faint)] rounded-lg text-[10px] font-black uppercase border border-[var(--color-border)] text-center flex items-center justify-center">
                                          Manager approval required to certify
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EXCEPTIONS RADAR */}
        {activeTab === "exceptions" && (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs">
                <span className="text-[var(--color-accent)] font-bold uppercase tracking-wider block">⚠️ Process Exceptions &amp; Audit Flags</span>
                <span className="text-[var(--color-text-muted)] block mt-0.5 font-medium">
                  Automated checks for document gaps, pipeline stagnation, and unconfirmed AI summaries.
                </span>
              </div>
            </div>

            {complianceExceptions.length === 0 ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 text-center space-y-3">
                <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto opacity-90" />
                <p className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">No Process Exceptions Flagged</p>
                <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto font-medium leading-relaxed">
                  All active client files conform to required compliance standards.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="exceptions-grid">
                {complianceExceptions.map((ex, index) => {
                  let badge = "bg-red-500/10 text-red-400 border-red-500/20";
                  if (ex.severity === "medium") badge = "bg-amber-500/10 text-amber-300 border-amber-500/20";
                  if (ex.severity === "low") badge = "bg-purple-500/10 text-purple-300 border-purple-500/20";

                  return (
                    <div key={index} className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border)]/80 rounded-2xl p-5 flex flex-col justify-between transition-all">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-xs text-[var(--color-text)] font-bold">{ex.clientName}</span>
                            <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5 font-medium">Broker: {ex.agent}</span>
                          </div>
                          <span className={`px-2.5 py-1 text-[9px] border font-bold uppercase rounded-md tracking-wider ${badge}`}>
                            {ex.severity} RISK
                          </span>
                        </div>

                        <div className="my-4 space-y-2.5 text-xs">
                          <p className="text-[var(--color-text)] font-medium leading-relaxed">{ex.description}</p>
                          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-xl flex gap-2.5">
                            <Info className="h-4 w-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold block">Suggested Action:</span>
                              <p className="text-xs text-[var(--color-text)] font-medium mt-0.5 leading-relaxed">{ex.actionable}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-[var(--color-border)] pt-3 flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => {
                            const key = `${ex.clientId}-${ex.type}`;
                            setResolvedExceptions(prev => [...prev, key]);
                            appendAuditLog(`Resolved exception (${ex.type})`, ex.clientName);
                            showToast(`Marked exception for ${ex.clientName} as resolved.`, "success");
                          }}
                          className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
                        </button>
                        <button
                          onClick={() => {
                            const key = `${ex.clientId}-${ex.type}`;
                            setSnoozedExceptions(prev => [...prev, key]);
                            appendAuditLog(`Snoozed exception (${ex.type}) 7 days`, ex.clientName);
                            showToast(`Snoozed exception for ${ex.clientName} for 7 days.`, "info");
                          }}
                          className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="h-3.5 w-3.5" /> Snooze 7 Days
                        </button>
                        <button
                          onClick={() => {
                            const found = clients.find(cl => cl.id === ex.clientId);
                            if (found) {
                              setSelectedClient(found);
                              setActiveTab("checklist");
                              showToast(`Loaded audit desk for ${found.first}!`, "info");
                            }
                          }}
                          className="px-3 py-1.5 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 border border-[var(--color-border)] text-[var(--color-accent)] rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          Audit File <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AUDIT LOG TIMELINE */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs">
                <span className="text-[var(--color-accent)] font-bold uppercase tracking-wider block">🕒 Audit Log &amp; Timeline</span>
                <span className="text-[var(--color-text-muted)] block mt-0.5 font-medium">
                  Activity log tracking client views, exports, credential access, and document updates.
                </span>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-3.5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Export Audit Records
              </button>
            </div>

            {/* Audit log filters */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold shrink-0">Filter:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: "All", label: "All Logs" },
                    { id: "sensitive", label: "Sensitive Only" },
                    { id: "documents", label: "Documents" },
                    { id: "view", label: "File Views" }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setTimelineActionFilter(btn.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        timelineActionFilter === btn.id 
                          ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" 
                          : "bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] border-[var(--color-border)]"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 flex items-center w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Filter timeline records..."
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none w-full font-medium"
                />
                {timelineSearch && (
                  <button
                    onClick={() => setTimelineSearch("")}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden p-6 space-y-4">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-[var(--color-text)]">No audit logs found</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium max-w-sm mx-auto">
                    No activity records match the selected filter criteria.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative border-l border-[var(--color-border)] ml-3 pl-6 space-y-6">
                    {filteredAuditLogs.slice(0, timelinePage * LOGS_PER_PAGE).map((log, index) => {
                      let isSensitive = 
                        log.action.toLowerCase().includes("sin") || 
                        log.action.toLowerCase().includes("export") ||
                        log.action.toLowerCase().includes("credentials") ||
                        log.action.toLowerCase().includes("locked") ||
                        log.action.toLowerCase().includes("unlock");

                      return (
                        <div key={index} className="relative group">
                          {/* Bullet */}
                          <div className={`absolute -left-[30px] top-1 w-3 h-3 rounded-full border-2 bg-[var(--color-bg)] group-hover:scale-125 transition-transform ${
                            isSensitive ? "border-amber-400" : "border-[var(--color-accent)]"
                          }`} />
                          
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                            <div className="text-xs">
                              <span className="text-[var(--color-text)] font-bold">{log.user}</span>
                              <span className="text-[var(--color-text-muted)] mx-1.5">performed</span>
                              <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                                isSensitive ? "text-amber-500 bg-amber-500/10" : "text-[var(--color-text)] bg-[var(--color-surface-2)]"
                              }`}>
                                {log.action}
                              </span>
                              {log.target && (
                                <>
                                  <span className="text-[var(--color-text-muted)] mx-1.5">on</span>
                                  <span className="text-[var(--color-text)] font-semibold">{log.target}</span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                              {new Date(log.time).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredAuditLogs.length > timelinePage * LOGS_PER_PAGE && (
                    <div className="pt-4 text-center border-t border-[var(--color-border)]/50">
                      <div className="text-[10px] text-[var(--color-text-muted)] text-center font-mono mb-2">
                        Showing {Math.min(timelinePage * LOGS_PER_PAGE, filteredAuditLogs.length)} of {filteredAuditLogs.length} log entries
                      </div>
                      <button
                        onClick={() => setTimelinePage(prev => prev + 1)}
                        className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* SECURITY & SENSITIVE DATA CONTROLS */}
        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Security Header Banner */}
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs">
                <span className="text-[var(--color-accent)] font-black uppercase tracking-wider block">🔒 System Security &amp; Access Controls</span>
                <span className="text-[var(--color-text-muted)] block mt-0.5 font-semibold">
                  Manage team user permissions, configure session auto-lock thresholds and audit policies, and monitor sensitive data masking.
                </span>
              </div>
            </div>

            {/* SECTION 1: USER MANAGEMENT */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-border)] pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--color-accent)]" />
                    User Management
                  </h3>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-semibold leading-relaxed">
                    Review team roles, workload visibility, and account-level admin actions.
                  </p>
                </div>

                {/* Local Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Filter team members by name or role..."
                    className="w-full pl-9 pr-8 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-all"
                  />
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table or Cards */}
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl my-2">
                  <Users className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-[var(--color-text)]">
                    {userSearchTerm ? "No matching users found" : "No users available"}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium max-w-sm mx-auto">
                    {userSearchTerm
                      ? "No team members matched your filter criteria. Try adjusting your search term."
                      : "User accounts will appear here once team members are added to the CRM."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-offset)]/50 text-[10px] uppercase font-black tracking-wider text-[var(--color-text-muted)]">
                          <th className="p-3.5">Team Member</th>
                          <th className="p-3.5">Role &amp; Privilege Scope</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Workload</th>
                          <th className="p-3.5">Last Activity</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {filteredUsers.map((user) => {
                          const fullName = `${user.first || ""} ${user.last || ""}`.trim() || user.displayName || user.email || "Unnamed User";
                          const roleName = user.role || "Broker";
                          const scope = getPrivilegeScope(roleName);
                          const statusText = user.status ? (user.status.charAt(0).toUpperCase() + user.status.slice(1)) : "Active";
                          const isActive = statusText.toLowerCase() === "active";
                          const { clientCount, taskCount, lastActivity } = getUserMetrics(user);

                          return (
                            <tr key={user.id} className="hover:bg-[var(--color-surface)]/60 transition-colors">
                              {/* Full Name & Email */}
                              <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center font-black text-[11px] text-[var(--color-accent)] shrink-0">
                                    {(user.first?.[0] || user.email?.[0] || "U").toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-[var(--color-text)] block leading-tight">{fullName}</span>
                                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{user.email || "No email"}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Role & Scope */}
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <span className="inline-block bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-[9px] uppercase px-2 py-0.5 rounded tracking-wide">
                                    {roleName}
                                  </span>
                                  <span className="block text-[9px] font-bold text-[var(--color-accent)]">
                                    {scope}
                                  </span>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  isActive
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                                  {statusText}
                                </span>
                              </td>

                              {/* Workload */}
                              <td className="p-3.5">
                                <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--color-text-muted)]">
                                  <span title="Assigned Clients">
                                    <strong className="text-[var(--color-text)] font-mono text-xs">{clientCount}</strong> clients
                                  </span>
                                  <span className="text-[var(--color-border)]">•</span>
                                  <span title="Assigned Tasks">
                                    <strong className="text-[var(--color-text)] font-mono text-xs">{taskCount}</strong> tasks
                                  </span>
                                </div>
                              </td>

                              {/* Last Activity */}
                              <td className="p-3.5 text-[10px] text-[var(--color-text-muted)] font-mono">
                                {lastActivity}
                              </td>

                              {/* Actions */}
                              <td className="p-3.5 text-right">
                                {isPrivileged ? (
                                  deletingUserId === user.id ? (
                                    <div className="flex flex-col items-end gap-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-left max-w-xs ml-auto">
                                      {(clientCount > 0 || taskCount > 0) && (
                                        <p className="text-[10px] text-amber-400 font-semibold leading-tight">
                                          This user is still assigned to {clientCount} client{clientCount === 1 ? '' : 's'} and {taskCount} task{taskCount === 1 ? '' : 's'}. Reassign workload before deletion.
                                        </p>
                                      )}
                                      <div className="flex items-center gap-1.5 self-end">
                                        {(clientCount > 0 || taskCount > 0) && (
                                          <button
                                            onClick={() => {
                                              setDeletingUserId(null);
                                              setReassigningUserId(user.id);
                                              setTargetReassignId("");
                                            }}
                                            className="px-2 py-1 text-[9px] font-bold uppercase rounded bg-[var(--color-accent)] text-white transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <RefreshCw className="w-3 h-3" /> Reassign
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteUser(user.id)}
                                          className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer shadow-sm"
                                        >
                                          Confirm Delete
                                        </button>
                                        <button
                                          onClick={() => setDeletingUserId(null)}
                                          className="px-2.5 py-1 text-[9px] font-bold uppercase rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] transition-all cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleToggleStatus(user)}
                                        className={`px-2 py-1 text-[9px] font-bold uppercase rounded border transition-all cursor-pointer ${
                                          user.status === "active"
                                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
                                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                                        }`}
                                      >
                                        {user.status === "active" ? "Deactivate" : "Activate"}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setReassigningUserId(user.id);
                                          setTargetReassignId("");
                                        }}
                                        className="px-2 py-1 text-[9px] font-bold uppercase rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <RefreshCw className="w-3 h-3 text-[var(--color-accent)]" /> Reassign Workload
                                      </button>
                                      <button
                                        onClick={() => setDeletingUserId(user.id)}
                                        className="px-2 py-1 text-[9px] font-bold uppercase rounded border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Delete User
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-[10px] text-[var(--color-text-muted)] italic">Read-only view</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Card List View */}
                  <div className="block md:hidden space-y-3">
                    {filteredUsers.map((user) => {
                      const fullName = `${user.first || ""} ${user.last || ""}`.trim() || user.displayName || user.email || "Unnamed User";
                      const roleName = user.role || "Broker";
                      const scope = getPrivilegeScope(roleName);
                      const statusText = user.status ? (user.status.charAt(0).toUpperCase() + user.status.slice(1)) : "Active";
                      const isActive = statusText.toLowerCase() === "active";
                      const { clientCount, taskCount, lastActivity } = getUserMetrics(user);

                      return (
                        <div key={user.id} className="p-4 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center font-black text-xs text-[var(--color-accent)] shrink-0">
                                {(user.first?.[0] || user.email?.[0] || "U").toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-xs text-[var(--color-text)] block">{fullName}</span>
                                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{user.email || "No email"}</span>
                              </div>
                            </div>

                            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                              {statusText}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <span className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black uppercase px-2 py-0.5 rounded">
                              {roleName}
                            </span>
                            <span className="text-[var(--color-accent)] font-bold">
                              {scope}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-border)]">
                            <div>
                              <span className="text-[var(--color-text-muted)] block text-[9px] uppercase font-bold">Assigned Workload</span>
                              <span className="text-[var(--color-text)] font-semibold">{clientCount} clients • {taskCount} tasks</span>
                            </div>
                            <div>
                              <span className="text-[var(--color-text-muted)] block text-[9px] uppercase font-bold">Last Activity</span>
                              <span className="text-[var(--color-text)] font-mono text-[10px]">{lastActivity}</span>
                            </div>
                          </div>

                          {isPrivileged ? (
                            deletingUserId === user.id ? (
                              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                                {(clientCount > 0 || taskCount > 0) && (
                                  <p className="text-[10px] text-amber-400 font-semibold leading-tight">
                                    This user is still assigned to {clientCount} client{clientCount === 1 ? '' : 's'} and {taskCount} task{taskCount === 1 ? '' : 's'}. Reassign workload before deletion.
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="flex-1 py-1.5 text-[9px] font-extrabold uppercase rounded bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer text-center"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    onClick={() => setDeletingUserId(null)}
                                    className="flex-1 py-1.5 text-[9px] font-bold uppercase rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] transition-all cursor-pointer text-center"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  onClick={() => showToast("Role editor flow not yet connected.", "info")}
                                  className="flex-1 py-1 text-[9px] font-bold uppercase rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] transition-all cursor-pointer text-center"
                                >
                                  Edit Role
                                </button>
                                <button
                                  onClick={() => showToast("Reset access flow not yet connected.", "info")}
                                  className="flex-1 py-1 text-[9px] font-bold uppercase rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-offset)] text-[var(--color-text)] transition-all cursor-pointer text-center"
                                >
                                  Reset Access
                                </button>
                                <button
                                  onClick={() => setDeletingUserId(user.id)}
                                  className="flex-1 py-1 text-[9px] font-bold uppercase rounded border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete User
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-[var(--color-text-muted)] italic block text-right">Read-only view</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* SECTION 2: SECURITY POLICIES */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
              <div className="border-b border-[var(--color-border)] pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[var(--color-accent)]" />
                  Security Policies
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-semibold leading-relaxed">
                  Configure operational guidelines for session timeouts, audit logs, and emergency locks.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                {/* Policy 1: Session Auto-Lock */}
                <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[var(--color-text)] font-bold block text-xs">Session Auto-Lock</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block leading-relaxed font-normal">
                        Automatically locks inactive sessions after the selected idle period.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !sessionAutoLock;
                        setAutoLockEnabled(nextVal);
                        showToast(`Session auto-lock ${nextVal ? "enabled" : "disabled"}.`, "info");
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer shrink-0 ${
                        sessionAutoLock ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-offset)]"
                      }`}
                    >
                      <div className={`bg-[var(--color-surface)] w-5 h-5 rounded-full transition-transform duration-200 transform ${
                        sessionAutoLock ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Auto-lock Minutes selector inside the card */}
                  {sessionAutoLock && (
                    <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold">Idle Threshold</span>
                      <select
                        value={autoLockMinutes}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value));
                          setAutoLockMinutes(val);
                          showToast(`Workstation idle threshold updated to ${val} minutes.`, "info");
                        }}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                      >
                        <option value={3} className="bg-[var(--color-surface-2)]">3 Minutes (High Security)</option>
                        <option value={5} className="bg-[var(--color-surface-2)]">5 Minutes</option>
                        <option value={10} className="bg-[var(--color-surface-2)]">10 Minutes</option>
                        <option value={15} className="bg-[var(--color-surface-2)]">15 Minutes</option>
                        <option value={30} className="bg-[var(--color-surface-2)]">30 Minutes</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Policy 2: Audit Logging */}
                <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[var(--color-text)] font-bold block text-xs">Immutable Audit Logging</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block leading-relaxed font-normal">
                        Records sensitive workflow actions to the audit timeline for oversight.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !auditLoggingEnabled;
                        setAuditLogEnabled(nextVal);
                        showToast(`Process audit log pipeline ${nextVal ? "active" : "dormant"}.`, "info");
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer shrink-0 ${
                        auditLoggingEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-offset)]"
                      }`}
                    >
                      <div className={`bg-[var(--color-surface)] w-5 h-5 rounded-full transition-transform duration-200 transform ${
                        auditLoggingEnabled ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px]">
                    <span className="text-[var(--color-text-muted)] uppercase font-bold">Pipeline Status</span>
                    <span className={auditLoggingEnabled ? "text-emerald-400 font-bold" : "text-[var(--color-text-muted)]"}>
                      {auditLoggingEnabled ? "✓ Active & Logging" : "Dormant"}
                    </span>
                  </div>
                </div>

                {/* Policy 3: Emergency Workstation Lock */}
                <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-3 md:col-span-2">
                  <div>
                    <span className="text-[var(--color-text)] font-bold block text-xs">Emergency Workstation Lock</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block leading-relaxed font-normal">
                      Instantly lock the current workstation session for compliance security.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onLockApp();
                      showToast("Workstation locked instantly for compliance security.", "info");
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black uppercase px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" /> Emergency Lock
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: SENSITIVE DATA CONTROLS */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
              <div className="border-b border-[var(--color-border)] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[var(--color-accent)]" />
                    Sensitive Data Controls
                  </h3>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-semibold leading-relaxed">
                    Monitor access to highly sensitive client data and keep masking behavior visible.
                  </p>
                </div>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase font-black tracking-wider">
                  Active &amp; Enforced
                </span>
              </div>

              {/* Compact Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] block">SIN Masking</span>
                  <span className="text-xs font-black text-emerald-400 block mt-0.5">Enforced (Last 4 Masked)</span>
                </div>
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] block">Protected Field Visibility</span>
                  <span className="text-xs font-black text-[var(--color-text)] block mt-0.5">Audited Access Only</span>
                </div>
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-[var(--color-text-muted)] block">Sensitive Access Events</span>
                  <span className="text-xs font-black text-amber-400 font-mono block mt-0.5">
                    {auditLogs.filter(l => l.action && (l.action.toLowerCase().includes("sin") || l.action.toLowerCase().includes("export") || l.action.toLowerCase().includes("credential"))).length} Logged
                  </span>
                </div>
              </div>

              {/* SIN Masking List */}
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-text-muted)] font-semibold">
                  Social Insurance Numbers (SIN) are strictly masked by default. Only authorized brokers may audit access records.
                </p>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {clients.map(cl => (
                    <div key={cl.id} className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[var(--color-text)] font-bold block">{cl.first} {cl.last}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">File Status: {cl.status.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 rounded-lg text-amber-500 font-mono font-bold text-[11px] select-none">
                          {cl.sin ? formatSinValue(cl.sin) : "Not Configured"}
                        </span>
                        {cl.sin && (
                          <button
                            onClick={() => {
                              appendAuditLog("Audited masked SIN field", `${cl.first} ${cl.last}`);
                              showToast(`SIN access for ${cl.first} logged to immutable database audit records!`, "warning", "🛡️");
                            }}
                            className="text-[9px] text-[var(--color-accent)] hover:underline font-black uppercase inline-block cursor-pointer bg-transparent border-none shrink-0"
                          >
                            Trace Access Log
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" id="export-overlay">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 relative flex flex-col text-xs font-semibold shadow-2xl">
            <button 
              onClick={() => setShowExportModal(false)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-5 w-5 text-[var(--color-accent)]" /> Export Audit Records
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] font-medium mb-6">
              This will download all audit log entries as a CSV file.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-offset)]/80 text-[var(--color-text)] rounded-lg text-xs font-bold transition-all border border-[var(--color-border)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const csvData = generateCsvReport();
                  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", "gbk-audit-log.csv");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);

                  appendAuditLog("Exported Compliance Audit Log CSV", "System Audit Table");

                  setShowExportModal(false);
                  showToast("Audit log exported successfully.", "success");
                }}
                className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] rounded-lg text-xs font-black uppercase transition-all cursor-pointer shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Workload Modal */}
      {reassigningUserId && (() => {
        const sourceUser = userRoster.find(u => u.id === reassigningUserId);
        if (!sourceUser) return null;

        const { clientCount, taskCount } = getUserMetrics(sourceUser);
        const eligibleTargets = userRoster.filter(u => u.id !== sourceUser.id && (u.status || "active").toLowerCase() !== "inactive");

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
              <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--color-accent)]" />
                  <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">
                    Reassign Staff Workload
                  </h3>
                </div>
                <button 
                  onClick={() => { setReassigningUserId(null); setTargetReassignId(""); }} 
                  className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-[var(--color-text)]">
                      {sourceUser.first} {sourceUser.last}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">
                      {sourceUser.role} • {sourceUser.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-xs text-[var(--color-accent)]">
                      {clientCount} Clients • {taskCount} Tasks
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">
                      Active Workload
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">
                    Select Target Staff Member
                  </label>
                  {eligibleTargets.length > 0 ? (
                    <select
                      value={targetReassignId}
                      onChange={(e) => setTargetReassignId(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] cursor-pointer"
                    >
                      <option value="">-- Choose Active Staff Member --</option>
                      {eligibleTargets.map(target => (
                        <option key={target.id} value={target.id}>
                          {target.first} {target.last} ({target.role}) - {target.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-500 font-semibold p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      No active staff member is available for reassignment. Please activate or onboard a team member first.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]/50">
                  <button
                    type="button"
                    onClick={() => { setReassigningUserId(null); setTargetReassignId(""); }}
                    className="px-4 py-2 text-xs font-bold uppercase rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!targetReassignId || eligibleTargets.length === 0}
                    onClick={() => handleReassignUserWorkload(sourceUser.id, targetReassignId)}
                    className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Confirm Reassignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
