import React, { useState, useEffect, useMemo } from "react";
import { 
  Bell, AlertCircle, AlertTriangle, CheckCircle, Send, Trash2, 
  Megaphone, ShieldAlert, Sparkles, Clock, Globe, Calendar, UserCheck,
  Flame, ArrowUpRight, Check, Plus, MessageSquare, Filter, Search,
  FileText, Settings, Activity, Wrench, ShieldCheck, Zap,
  TrendingUp, X, RefreshCw, Users, BarChart2, CheckCircle2, Bookmark
} from "lucide-react";
import { User } from "../../types";
import { safeJsonParse } from "../../lib/json";

interface SystemAlertsProps {
  userRoster: User[];
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  logActivity: (action: string, details: string) => void;
}

export type AlertPriority = "critical" | "high" | "medium" | "low" | "info";
export type AlertCategory = "Compliance" | "Underwriting" | "IT & Security" | "Lender Rate" | "General Operations" | "Client Escrow";
export type NotificationChannel = "Email" | "In-App Bell" | "SMS" | "Admin Push";

export interface AlertComment {
  id: string;
  author: string;
  authorRole: string;
  text: string;
  timestamp: string;
}

export interface SystemAlertItem {
  id: string;
  title: string;
  description: string;
  category: AlertCategory;
  priority: AlertPriority;
  assignedToId: string;
  assignedToName: string;
  dueDate: string;
  channels: NotificationChannel[];
  status: "active" | "resolved" | "snoozed";
  snoozedUntil?: string;
  createdAt: string;
  createdBy: string;
  resolvedAt?: string;
  resolvedBy?: string;
  escalated?: boolean;
  comments: AlertComment[];
}

export interface AlertTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  category: AlertCategory;
  priority: AlertPriority;
  channels: NotificationChannel[];
}

export interface MaintenanceSchedule {
  id: string;
  enabled: boolean;
  title: string;
  startTime: string;
  endTime: string;
  affectedSystems: string[];
  noticeMessage: string;
  scheduledBy: string;
}

interface BroadcastMessage {
  id: string;
  sender: string;
  senderRole: string;
  message: string;
  type: "critical" | "warning" | "info";
  timestamp: string;
  active: boolean;
}

const CATEGORIES: AlertCategory[] = [
  "Compliance",
  "Underwriting",
  "IT & Security",
  "Lender Rate",
  "General Operations",
  "Client Escrow"
];

const ALL_CHANNELS: NotificationChannel[] = ["Email", "In-App Bell", "SMS", "Admin Push"];

const DEFAULT_TEMPLATES: AlertTemplate[] = [
  {
    id: "tpl_1",
    name: "FSRA License Renewal Audit",
    title: "Mandatory FSRA Ontario Licence Audit cutoff",
    description: "Ensure all active brokers submit updated licence registration documentation before compliance audit.",
    category: "Compliance",
    priority: "critical",
    channels: ["Email", "In-App Bell", "Admin Push"]
  },
  {
    id: "tpl_2",
    name: "Lender Rate Surge Notice",
    title: "Prime Lending Rate benchmark shift",
    description: "Major lender prime rate adjustment published. Update rate calculators and client disclosures immediately.",
    category: "Lender Rate",
    priority: "high",
    channels: ["In-App Bell", "SMS"]
  },
  {
    id: "tpl_3",
    name: "Server Database Index Optimization",
    title: "Scheduled DB Performance Maintenance",
    description: "Core database vacuuming and re-indexing scheduled during low-volume hours.",
    category: "IT & Security",
    priority: "medium",
    channels: ["Email"]
  },
  {
    id: "tpl_4",
    name: "Escrow Discrepancy Alert",
    title: "Unmatched Client Trust Escrow Deposit",
    description: "Wire transfer received without matched deal reference number. Requires immediate verification.",
    category: "Client Escrow",
    priority: "high",
    channels: ["Email", "SMS", "In-App Bell"]
  }
];

export const SystemAlerts: React.FC<SystemAlertsProps> = ({
  userRoster,
  currentUser,
  showToast,
  logActivity
}) => {
  const [activeTab, setActiveTab] = useState<"alerts" | "create" | "broadcasts" | "maintenance" | "stats">("alerts");

  // State: Alerts list
  const [alerts, setAlerts] = useState<SystemAlertItem[]>([]);
  // State: Templates
  const [templates, setTemplates] = useState<AlertTemplate[]>(DEFAULT_TEMPLATES);
  // State: Maintenance schedules
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);

  // State: Broadcast Banners
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [msgType, setMsgType] = useState<"critical" | "warning" | "info">("info");

  // Filters for Alert History/Dashboard
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<AlertCategory>("Compliance");
  const [formPriority, setFormPriority] = useState<AlertPriority>("high");
  const [formAssigneeId, setFormAssigneeId] = useState<string>(userRoster[0]?.id || "");
  const [formDueDate, setFormDueDate] = useState<string>(
    new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
  );
  const [formChannels, setFormChannels] = useState<NotificationChannel[]>(["Email", "In-App Bell"]);
  const [newTemplateName, setNewTemplateName] = useState("");

  // Modal / Interaction states
  const [selectedAlert, setSelectedAlert] = useState<SystemAlertItem | null>(null);
  const [commentText, setCommentText] = useState("");
  const [reassignUserId, setReassignUserId] = useState("");
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeHours, setSnoozeHours] = useState(24);

  // Maintenance Form State
  const [maintTitle, setMaintTitle] = useState("System Maintenance Window");
  const [maintStart, setMaintStart] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [maintEnd, setMaintEnd] = useState(new Date(Date.now() + 86400000 + 7200000).toISOString().slice(0, 16));
  const [maintSystems, setMaintSystems] = useState("Client Portal, Lender Sync, DocuSign Engine");
  const [maintNotice, setMaintNotice] = useState("Planned infrastructure upgrade. App features will be read-only during window.");

  // Initialize storage
  useEffect(() => {
    const savedAlerts = localStorage.getItem("gbk_admin_system_alerts_v2");
    if (savedAlerts) {
      setAlerts(safeJsonParse(savedAlerts, []));
    } else {
      // Seed initial high-value alerts
      const seeded: SystemAlertItem[] = [
        {
          id: "alt_101",
          title: "FSRA Compliance Certificate Expiry",
          description: "Broker licence renewals for Q3 compliance audit must be verified by end of week.",
          category: "Compliance",
          priority: "critical",
          assignedToId: userRoster[0]?.id || "usr_1",
          assignedToName: userRoster[0] ? `${userRoster[0].first} ${userRoster[0].last}` : "Tim Brown",
          dueDate: new Date(Date.now() - 3600000 * 5).toISOString().split("T")[0], // Overdue!
          channels: ["Email", "In-App Bell", "SMS"],
          status: "active",
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          createdBy: "David Acosta",
          escalated: true,
          comments: [
            {
              id: "cmt_1",
              author: "Tim Brown",
              authorRole: "Admin",
              text: "Sent reminder emails to 12 brokers missing valid COI attachments.",
              timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
            }
          ]
        },
        {
          id: "alt_102",
          title: "TD Canada Trust Rate Cut Disclosure",
          description: "New 5-Year Fixed Mortgage rates updated on server. Verification needed for custom calculators.",
          category: "Lender Rate",
          priority: "high",
          assignedToId: userRoster[1]?.id || "usr_2",
          assignedToName: userRoster[1] ? `${userRoster[1].first} ${userRoster[1].last}` : "Wayne MacLeod",
          dueDate: new Date(Date.now() + 86400000 * 1).toISOString().split("T")[0],
          channels: ["In-App Bell", "Admin Push"],
          status: "active",
          createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
          createdBy: "System Bot",
          comments: []
        },
        {
          id: "alt_103",
          title: "Unmatched Escrow Wire Transfer ($45,000)",
          description: "Ref #TRF-99021 received in Trust Account without assigned loan file reference.",
          category: "Client Escrow",
          priority: "critical",
          assignedToId: currentUser.id,
          assignedToName: `${currentUser.first} ${currentUser.last}`,
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          channels: ["Email", "SMS"],
          status: "active",
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          createdBy: "Finance Department",
          comments: []
        },
        {
          id: "alt_104",
          title: "Stale User Login Token Purge",
          description: "Automated cleanup of unauthenticated sessions older than 30 days completed.",
          category: "IT & Security",
          priority: "info",
          assignedToId: currentUser.id,
          assignedToName: `${currentUser.first} ${currentUser.last}`,
          dueDate: new Date(Date.now() - 86400000 * 1).toISOString().split("T")[0],
          channels: ["In-App Bell"],
          status: "resolved",
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          resolvedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          resolvedBy: `${currentUser.first} ${currentUser.last}`,
          createdBy: "Security Bot",
          comments: [
            {
              id: "cmt_2",
              author: "Security Bot",
              authorRole: "System",
              text: "Purged 14 expired authentication tokens.",
              timestamp: new Date(Date.now() - 86400000 * 1).toISOString()
            }
          ]
        }
      ];
      setAlerts(seeded);
      localStorage.setItem("gbk_admin_system_alerts_v2", JSON.stringify(seeded));
    }

    // Load templates
    const savedTpls = localStorage.getItem("gbk_admin_alert_templates");
    if (savedTpls) {
      setTemplates(safeJsonParse(savedTpls, DEFAULT_TEMPLATES));
    }

    // Load maintenance schedules
    const savedMaint = localStorage.getItem("gbk_admin_maintenance_schedules");
    if (savedMaint) {
      setMaintenance(safeJsonParse(savedMaint, []));
    } else {
      const defaultMaint: MaintenanceSchedule[] = [
        {
          id: "maint_1",
          enabled: false,
          title: "Core Database Cluster Upgrade",
          startTime: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
          endTime: new Date(Date.now() + 86400000 * 3 + 7200000).toISOString().slice(0, 16),
          affectedSystems: ["Client Portal", "Lender Rate Sync", "Document Vault"],
          noticeMessage: "System will undergo scheduled maintenance on Sunday from 02:00 AM to 04:00 AM EST.",
          scheduledBy: `${currentUser.first} ${currentUser.last}`
        }
      ];
      setMaintenance(defaultMaint);
      localStorage.setItem("gbk_admin_maintenance_schedules", JSON.stringify(defaultMaint));
    }

    // Load broadcasts
    const savedBroad = localStorage.getItem("gbk_admin_broadcasts");
    if (savedBroad) {
      setBroadcasts(safeJsonParse(savedBroad, []));
    } else {
      const defaults: BroadcastMessage[] = [
        {
          id: "broad_1",
          sender: "David Acosta",
          senderRole: "Developer/Admin",
          message: "⚠️ Attention Brokers: Please verify that all FSRA Ontario Licence registrations are fully uploaded to your profile vaults before tomorrow's audit cutoff.",
          type: "critical",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          active: true
        },
        {
          id: "broad_2",
          sender: "Tim Brown",
          senderRole: "Admin",
          message: "Rate Sheet Update: TD Canada Trust has updated their 5-Year Fixed benchmark rates. Check Lender Sheets for compliance margins.",
          type: "info",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          active: true
        }
      ];
      setBroadcasts(defaults);
      localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(defaults));
    }
  }, []);

  // Helper save alerts
  const persistAlerts = (newList: SystemAlertItem[]) => {
    setAlerts(newList);
    localStorage.setItem("gbk_admin_system_alerts_v2", JSON.stringify(newList));
  };

  // Helper save maintenance
  const persistMaintenance = (newList: MaintenanceSchedule[]) => {
    setMaintenance(newList);
    localStorage.setItem("gbk_admin_maintenance_schedules", JSON.stringify(newList));
  };

  // Check if an alert is overdue
  const isOverdue = (alert: SystemAlertItem) => {
    if (alert.status === "resolved") return false;
    if (!alert.dueDate) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    return alert.dueDate < todayStr;
  };

  // --- ACTIONS ---

  // Create New Alert
  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Alert title is required.", "error");
      return;
    }
    if (formChannels.length === 0) {
      showToast("Please select at least one notification channel.", "error");
      return;
    }

    const assignedUser = userRoster.find(u => u.id === formAssigneeId);
    const assigneeName = assignedUser ? `${assignedUser.first} ${assignedUser.last}` : "Unassigned";

    const newAlert: SystemAlertItem = {
      id: `alt_${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim() || "No detailed description provided.",
      category: formCategory,
      priority: formPriority,
      assignedToId: formAssigneeId,
      assignedToName: assigneeName,
      dueDate: formDueDate,
      channels: formChannels,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: `${currentUser.first} ${currentUser.last}`,
      comments: []
    };

    const updated = [newAlert, ...alerts];
    persistAlerts(updated);

    logActivity("System Alert Created", `Created ${formPriority.toUpperCase()} alert: "${newAlert.title}" assigned to ${assigneeName}.`);
    showToast(`Alert created and dispatched via ${formChannels.join(", ")}.`, "success");

    // Reset Form
    setFormTitle("");
    setFormDescription("");
    setActiveTab("alerts");
  };

  // Apply Template
  const handleApplyTemplate = (tpl: AlertTemplate) => {
    setFormTitle(tpl.title);
    setFormDescription(tpl.description);
    setFormCategory(tpl.category);
    setFormPriority(tpl.priority);
    setFormChannels(tpl.channels);
    showToast(`Applied template "${tpl.name}".`, "info");
  };

  // Save current form as template
  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      showToast("Please enter a name for the new template.", "error");
      return;
    }
    const newTpl: AlertTemplate = {
      id: `tpl_${Date.now()}`,
      name: newTemplateName.trim(),
      title: formTitle || newTemplateName,
      description: formDescription || "Standard alert preset.",
      category: formCategory,
      priority: formPriority,
      channels: formChannels
    };
    const updated = [...templates, newTpl];
    setTemplates(updated);
    localStorage.setItem("gbk_admin_alert_templates", JSON.stringify(updated));
    showToast(`Saved template "${newTpl.name}".`, "success");
    setNewTemplateName("");
  };

  // Delete Template
  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem("gbk_admin_alert_templates", JSON.stringify(updated));
    showToast("Template removed.", "info");
  };

  // Action: Resolve Alert
  const handleResolveAlert = (id: string) => {
    const updated = alerts.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: "resolved" as const,
          resolvedAt: new Date().toISOString(),
          resolvedBy: `${currentUser.first} ${currentUser.last}`
        };
      }
      return a;
    });
    persistAlerts(updated);

    const target = alerts.find(a => a.id === id);
    if (target) {
      logActivity("System Alert Resolved", `Marked alert "${target.title}" as resolved.`);
      showToast(`Alert "${target.title}" resolved successfully.`, "success");
    }
  };

  // Action: Escalate Alert
  const handleEscalateAlert = (id: string) => {
    const updated = alerts.map(a => {
      if (a.id === id) {
        let nextPriority: AlertPriority = "critical";
        if (a.priority === "info" || a.priority === "low") nextPriority = "medium";
        else if (a.priority === "medium") nextPriority = "high";
        else if (a.priority === "high") nextPriority = "critical";

        return {
          ...a,
          priority: nextPriority,
          escalated: true,
          comments: [
            ...a.comments,
            {
              id: `cmt_${Date.now()}`,
              author: `${currentUser.first} ${currentUser.last}`,
              authorRole: currentUser.role,
              text: `🚨 ESCALATED ALERT priority to ${nextPriority.toUpperCase()}.`,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return a;
    });
    persistAlerts(updated);

    const target = alerts.find(a => a.id === id);
    if (target) {
      logActivity("System Alert Escalated", `Escalated priority for "${target.title}".`);
      showToast(`Alert "${target.title}" escalated.`, "error");
    }
  };

  // Action: Reassign Alert
  const handleReassignAlert = () => {
    if (!selectedAlert || !reassignUserId) return;

    const assignedUser = userRoster.find(u => u.id === reassignUserId);
    if (!assignedUser) return;

    const newName = `${assignedUser.first} ${assignedUser.last}`;

    const updated = alerts.map(a => {
      if (a.id === selectedAlert.id) {
        return {
          ...a,
          assignedToId: assignedUser.id,
          assignedToName: newName,
          comments: [
            ...a.comments,
            {
              id: `cmt_${Date.now()}`,
              author: `${currentUser.first} ${currentUser.last}`,
              authorRole: currentUser.role,
              text: `Reassigned alert to ${newName}.`,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return a;
    });
    persistAlerts(updated);

    logActivity("System Alert Reassigned", `Reassigned alert "${selectedAlert.title}" to ${newName}.`);
    showToast(`Alert reassigned to ${newName}.`, "success");
    setShowReassignModal(false);
  };

  // Action: Snooze Alert
  const handleSnoozeAlert = () => {
    if (!selectedAlert) return;

    const untilDate = new Date(Date.now() + snoozeHours * 3600000).toISOString();

    const updated = alerts.map(a => {
      if (a.id === selectedAlert.id) {
        return {
          ...a,
          status: "snoozed" as const,
          snoozedUntil: untilDate,
          comments: [
            ...a.comments,
            {
              id: `cmt_${Date.now()}`,
              author: `${currentUser.first} ${currentUser.last}`,
              authorRole: currentUser.role,
              text: `Snoozed alert for ${snoozeHours} hours.`,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return a;
    });
    persistAlerts(updated);

    showToast(`Alert snoozed for ${snoozeHours} hour(s).`, "info");
    setShowSnoozeModal(false);
  };

  // Action: Add Comment
  const handleAddComment = () => {
    if (!selectedAlert || !commentText.trim()) return;

    const newCmt: AlertComment = {
      id: `cmt_${Date.now()}`,
      author: `${currentUser.first} ${currentUser.last}`,
      authorRole: currentUser.role,
      text: commentText.trim(),
      timestamp: new Date().toISOString()
    };

    const updated = alerts.map(a => {
      if (a.id === selectedAlert.id) {
        const nextComments = [...a.comments, newCmt];
        setSelectedAlert({ ...a, comments: nextComments });
        return { ...a, comments: nextComments };
      }
      return a;
    });
    persistAlerts(updated);

    setCommentText("");
    showToast("Comment added to alert log.", "success");
  };

  // Delete Alert
  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    persistAlerts(updated);
    if (selectedAlert?.id === id) setSelectedAlert(null);
    showToast("Alert removed from database.", "info");
  };

  // --- MAINTENANCE HANDLERS ---
  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const newSchedule: MaintenanceSchedule = {
      id: `maint_${Date.now()}`,
      enabled: true,
      title: maintTitle.trim(),
      startTime: maintStart,
      endTime: maintEnd,
      affectedSystems: maintSystems.split(",").map(s => s.trim()).filter(Boolean),
      noticeMessage: maintNotice.trim(),
      scheduledBy: `${currentUser.first} ${currentUser.last}`
    };

    const updated = [newSchedule, ...maintenance];
    persistMaintenance(updated);
    logActivity("Maintenance Scheduled", `Scheduled window: ${newSchedule.title}`);
    showToast("Maintenance window created & published.", "success");
  };

  const handleToggleMaintenance = (id: string) => {
    const updated = maintenance.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m);
    persistMaintenance(updated);
    showToast("Maintenance window status updated.", "info");
  };

  const handleDeleteMaintenance = (id: string) => {
    const updated = maintenance.filter(m => m.id !== id);
    persistMaintenance(updated);
    showToast("Maintenance window removed.", "info");
  };

  // --- BROADCAST HANDLERS ---
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) {
      showToast("Broadcast message cannot be empty.", "error");
      return;
    }

    const newBroadcast: BroadcastMessage = {
      id: `broad_${Date.now()}`,
      sender: `${currentUser.first} ${currentUser.last}`,
      senderRole: currentUser.role,
      message: newMsg.trim(),
      type: msgType,
      timestamp: new Date().toISOString(),
      active: true
    };

    const updated = [newBroadcast, ...broadcasts];
    setBroadcasts(updated);
    localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(updated));
    logActivity("Broadcast Notification Dispatched", `Sent ${msgType} system broadcast: "${newBroadcast.message.substring(0, 50)}..."`);
    showToast("Global system broadcast published successfully.", "success");
    setNewMsg("");
  };

  const handleToggleActiveBroadcast = (id: string) => {
    const updated = broadcasts.map(b => b.id === id ? { ...b, active: !b.active } : b);
    setBroadcasts(updated);
    localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(updated));
    showToast("Broadcast visibility updated.", "success");
  };

  const handleDeleteBroadcast = (id: string) => {
    const updated = broadcasts.filter(b => b.id !== id);
    setBroadcasts(updated);
    localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(updated));
    showToast("Broadcast deleted from logs.", "success");
  };

  // --- FILTERED ALERTS ---
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Status filter
      if (filterStatus === "active" && alert.status !== "active") return false;
      if (filterStatus === "resolved" && alert.status !== "resolved") return false;
      if (filterStatus === "snoozed" && alert.status !== "snoozed") return false;
      if (filterStatus === "overdue" && !isOverdue(alert)) return false;

      // Priority filter
      if (filterPriority !== "all" && alert.priority !== filterPriority) return false;

      // Category filter
      if (filterCategory !== "all" && alert.category !== filterCategory) return false;

      // Assignee filter
      if (filterAssignee !== "all" && alert.assignedToId !== filterAssignee) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = alert.title.toLowerCase().includes(q);
        const matchDesc = alert.description.toLowerCase().includes(q);
        const matchAssignee = alert.assignedToName.toLowerCase().includes(q);
        const matchCreator = alert.createdBy.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchAssignee || matchCreator;
      }

      return true;
    });
  }, [alerts, filterStatus, filterPriority, filterCategory, filterAssignee, searchQuery]);

  // --- METRICS / STATS ---
  const stats = useMemo(() => {
    const active = alerts.filter(a => a.status === "active");
    const resolved = alerts.filter(a => a.status === "resolved");
    const overdue = alerts.filter(isOverdue);
    const snoozed = alerts.filter(a => a.status === "snoozed");

    const criticalCount = active.filter(a => a.priority === "critical").length;
    const highCount = active.filter(a => a.priority === "high").length;
    const mediumCount = active.filter(a => a.priority === "medium").length;
    const lowCount = active.filter(a => a.priority === "low").length;
    const infoCount = active.filter(a => a.priority === "info").length;

    // Avg resolution time
    let totalResolutionHours = 0;
    let resolvedWithTimes = 0;
    resolved.forEach(r => {
      if (r.resolvedAt) {
        const created = new Date(r.createdAt).getTime();
        const res = new Date(r.resolvedAt).getTime();
        const diffHours = (res - created) / 3600000;
        if (diffHours >= 0) {
          totalResolutionHours += diffHours;
          resolvedWithTimes++;
        }
      }
    });
    const avgResolutionHours = resolvedWithTimes > 0 ? (totalResolutionHours / resolvedWithTimes).toFixed(1) : "1.8";

    // Resolution Efficiency (% resolved before due date)
    let resolvedBeforeDue = 0;
    resolved.forEach(r => {
      if (r.resolvedAt && r.dueDate) {
        const resDate = r.resolvedAt.split("T")[0];
        if (resDate <= r.dueDate) resolvedBeforeDue++;
      }
    });
    const efficiencyRate = resolved.length > 0 ? Math.round((resolvedBeforeDue / resolved.length) * 100) : 92;

    return {
      totalAlerts: alerts.length,
      activeCount: active.length,
      resolvedCount: resolved.length,
      overdueCount: overdue.length,
      snoozedCount: snoozed.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      avgResolutionHours,
      efficiencyRate
    };
  }, [alerts]);

  // Active Maintenance Window Banner
  const activeMaintenanceWindow = useMemo(() => {
    return maintenance.find(m => m.enabled);
  }, [maintenance]);

  return (
    <div className="space-y-6" id="system-alerts-suite">

      {/* Top Banner & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-base font-extrabold text-[var(--color-text)]">System Alerts &amp; Maintenance Command Center</h3>
          </div>
          <p className="text-xs text-[var(--color-text-faint)] mt-1">
            Real-time incident management, escalation flows, notification dispatching, maintenance scheduling, and alert analytics.
          </p>
        </div>

        {/* View Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-[var(--color-surface-2)] p-1 rounded-xl border border-[var(--color-border)]/60">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "alerts"
                ? "bg-[var(--color-accent)] text-black shadow"
                : "text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts ({stats.activeCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "create"
                ? "bg-[var(--color-accent)] text-black shadow"
                : "text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Alert &amp; Templates</span>
          </button>

          <button
            onClick={() => setActiveTab("broadcasts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "broadcasts"
                ? "bg-[var(--color-accent)] text-black shadow"
                : "text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Notices ({broadcasts.filter(b => b.active).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("maintenance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "maintenance"
                ? "bg-[var(--color-accent)] text-black shadow"
                : "text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Maintenance</span>
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "stats"
                ? "bg-[var(--color-accent)] text-black shadow"
                : "text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Maintenance Mode Active Alert Banner (if enabled) */}
      {activeMaintenanceWindow && (
        <div className="bg-amber-500/15 border-2 border-amber-500/40 p-4 rounded-xl flex items-start justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs uppercase tracking-wider text-amber-300">
                  SYSTEM MAINTENANCE WINDOW ACTIVE
                </span>
                <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                  {activeMaintenanceWindow.startTime} ➔ {activeMaintenanceWindow.endTime}
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium mt-1">
                {activeMaintenanceWindow.noticeMessage}
              </p>
              <div className="text-[10px] text-amber-200/80 mt-1.5">
                Affected Services: <span className="font-bold">{activeMaintenanceWindow.affectedSystems.join(", ")}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleToggleMaintenance(activeMaintenanceWindow.id)}
            className="px-3 py-1 bg-amber-500 text-black font-extrabold text-xs rounded-lg hover:bg-amber-400 cursor-pointer shrink-0"
          >
            Disable Maintenance
          </button>
        </div>
      )}

      {/* OVERDUE ALERTS HIGHLIGHT BANNER */}
      {stats.overdueCount > 0 && activeTab === "alerts" && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-red-400 animate-bounce" />
            <div>
              <span className="font-bold text-xs text-red-300 uppercase tracking-wider block">
                ⚠️ {stats.overdueCount} Overdue Alert(s) Require Immediate Resolution
              </span>
              <p className="text-[11px] text-red-200/80 mt-0.5">
                Target due dates have passed. Filter by "Overdue" to inspect assigned tasks and escalate priority.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus("overdue")}
            className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold rounded-lg hover:bg-red-500/30 transition-all cursor-pointer shrink-0"
          >
            Show Overdue Only
          </button>
        </div>
      )}

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div 
          onClick={() => { setActiveTab("alerts"); setFilterStatus("active"); setFilterPriority("critical"); }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl cursor-pointer hover:border-red-500/50 transition-all shadow"
        >
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>Critical Priority</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400 mt-1">{stats.criticalCount}</p>
          <span className="text-[9px] text-[var(--color-text-faint)] mt-0.5 block">Requires immediate action</span>
        </div>

        <div 
          onClick={() => { setActiveTab("alerts"); setFilterStatus("active"); setFilterPriority("high"); }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl cursor-pointer hover:border-amber-500/50 transition-all shadow"
        >
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>High Priority</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400 mt-1">{stats.highCount}</p>
          <span className="text-[9px] text-[var(--color-text-faint)] mt-0.5 block">Action needed today</span>
        </div>

        <div 
          onClick={() => { setActiveTab("alerts"); setFilterStatus("overdue"); }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl cursor-pointer hover:border-red-400/50 transition-all shadow"
        >
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>Overdue Tasks</span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400 mt-1">{stats.overdueCount}</p>
          <span className="text-[9px] text-red-400/80 font-bold mt-0.5 block">Passed due cutoff</span>
        </div>

        <div 
          onClick={() => { setActiveTab("alerts"); setFilterStatus("resolved"); }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all shadow"
        >
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 mt-1">{stats.resolvedCount}</p>
          <span className="text-[9px] text-[var(--color-text-faint)] mt-0.5 block">Avg {stats.avgResolutionHours}h resolution</span>
        </div>

        <div 
          onClick={() => { setActiveTab("stats"); }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl cursor-pointer hover:border-[var(--color-accent)]/50 transition-all shadow"
        >
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
            <span>Resolution Efficiency</span>
            <Zap className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <p className="text-xl font-black text-[var(--color-accent)] mt-1">{stats.efficiencyRate}%</p>
          <span className="text-[9px] text-[var(--color-text-faint)] mt-0.5 block">Resolved before due date</span>
        </div>
      </div>

      {/* --- TAB 1: ALERTS DASHBOARD & HISTORY --- */}
      {activeTab === "alerts" && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-hidden shadow-lg">
          
          {/* Dashboard Search & Filter Bar */}
          <div className="bg-[var(--color-surface-2)] p-4 border-b border-[var(--color-border)]/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Filter &amp; History Controls</h4>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--color-text-faint)]" />
                <input
                  type="text"
                  placeholder="Search alert title, assignee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text)] outline-none"
                />
              </div>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Alerts</option>
                <option value="overdue">Overdue Alerts 🔥</option>
                <option value="resolved">Recently Resolved</option>
                <option value="snoozed">Snoozed</option>
              </select>

              {/* Priority filter */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer font-medium"
              >
                <option value="all">All Priorities</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟡 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">🟢 Low</option>
                <option value="info">⚪ Info</option>
              </select>

              {/* Category filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer font-medium"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Assignee filter */}
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer font-medium"
              >
                <option value="all">All Assignees</option>
                {userRoster.map(u => (
                  <option key={u.id} value={u.id}>{u.first} {u.last}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Alerts Directory List */}
          <div className="divide-y divide-[var(--color-border)]/40 max-h-[580px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-12 text-center text-[var(--color-text-faint)] space-y-2">
                <Bell className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-sm font-semibold text-[var(--color-text-muted)]">No system alerts found</p>
                <p className="text-xs">Adjust your filter options or create a new alert using the template builder.</p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const overdue = isOverdue(alert);
                const isSelected = selectedAlert?.id === alert.id;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 transition-all hover:bg-[var(--color-surface-2)]/30 ${
                      isSelected ? "bg-[var(--color-surface-2)]/60 border-l-4 border-l-[var(--color-accent)]" : ""
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      
                      {/* Left Block: Icon & Main Details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        
                        {/* Priority Badge Icon */}
                        <div className="mt-0.5 shrink-0">
                          {alert.priority === "critical" ? (
                            <div className="p-2 bg-red-500/15 text-red-400 rounded-xl border border-red-500/30">
                              <AlertCircle className="w-5 h-5" />
                            </div>
                          ) : alert.priority === "high" ? (
                            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/30">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                          ) : alert.priority === "medium" ? (
                            <div className="p-2 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/30">
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-xs text-[var(--color-text)] hover:text-[var(--color-accent)] cursor-pointer" onClick={() => setSelectedAlert(alert)}>
                              {alert.title}
                            </span>

                            {/* Status Pills */}
                            {alert.status === "resolved" ? (
                              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                                Resolved
                              </span>
                            ) : alert.status === "snoozed" ? (
                              <span className="text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded font-bold uppercase">
                                Snoozed
                              </span>
                            ) : overdue ? (
                              <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded font-extrabold uppercase animate-pulse">
                                Overdue 🔥
                              </span>
                            ) : (
                              <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold uppercase">
                                Active
                              </span>
                            )}

                            {alert.escalated && (
                              <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                Escalated
                              </span>
                            )}

                            <span className="text-[9px] bg-[var(--color-surface-2)] text-[var(--color-text-faint)] border border-[var(--color-border)] px-2 py-0.5 rounded font-mono">
                              {alert.category}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                            {alert.description}
                          </p>

                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-text-faint)] font-mono pt-1">
                            <span>Assigned: <strong className="text-[var(--color-text)] font-sans">{alert.assignedToName}</strong></span>
                            <span>•</span>
                            <span>Due: <strong className={overdue ? "text-red-400 font-bold" : "text-[var(--color-text)]"}>{alert.dueDate || "No deadline"}</strong></span>
                            <span>•</span>
                            <span>Channels: {alert.channels.join(", ")}</span>
                            {alert.comments.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-[var(--color-accent)] flex items-center gap-0.5 font-sans font-bold">
                                  <MessageSquare className="w-3 h-3" /> {alert.comments.length} notes
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right Block: Action Buttons */}
                      <div className="flex items-center gap-1.5 self-start shrink-0">
                        {alert.status === "active" && (
                          <>
                            {/* Resolve */}
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Mark alert as resolved"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>

                            {/* Escalate */}
                            <button
                              onClick={() => handleEscalateAlert(alert.id)}
                              className="px-2 py-1 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Escalate alert priority"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Escalate</span>
                            </button>

                            {/* Reassign */}
                            <button
                              onClick={() => {
                                setSelectedAlert(alert);
                                setReassignUserId(alert.assignedToId);
                                setShowReassignModal(true);
                              }}
                              className="px-2 py-1 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Reassign to another user"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Reassign</span>
                            </button>

                            {/* Snooze */}
                            <button
                              onClick={() => {
                                setSelectedAlert(alert);
                                setShowSnoozeModal(true);
                              }}
                              className="px-2 py-1 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Snooze notification"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Snooze</span>
                            </button>
                          </>
                        )}

                        {/* View & Comment */}
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="px-2.5 py-1 bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 text-[10px] font-extrabold uppercase rounded-lg hover:bg-[var(--color-accent)]/25 transition-all cursor-pointer"
                        >
                          Details &amp; Log
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-1 hover:bg-red-500/10 text-[var(--color-text-faint)] hover:text-red-400 rounded transition-all cursor-pointer"
                          title="Delete alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: CREATE ALERT & TEMPLATES --- */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Form: Create Alert */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4.5 h-4.5 text-[var(--color-accent)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Dispatch New System Alert</h4>
              </div>
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Multi-Channel Broadcast</span>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
              
              {/* Alert Title */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1">
                  Alert Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory FSRA Licensing Document Verification"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-all font-semibold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1">
                  Alert Details &amp; Operational Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide explicit context, resolution requirements, or compliance deadlines..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg p-3 text-xs text-[var(--color-text)] outline-none resize-none focus:border-[var(--color-accent)] transition-all"
                />
              </div>

              {/* Grid: Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1">
                    Category Classification
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AlertCategory)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer font-bold"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AlertPriority)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer font-bold"
                  >
                    <option value="critical">🔴 Critical (Immediate Action)</option>
                    <option value="high">🟡 High (24h Window)</option>
                    <option value="medium">🔵 Medium (Standard Priority)</option>
                    <option value="low">🟢 Low (Informational Task)</option>
                    <option value="info">⚪ Info (System Notice)</option>
                  </select>
                </div>
              </div>

              {/* Grid: Assignee & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1">
                    Assign Responsibility To
                  </label>
                  <select
                    value={formAssigneeId}
                    onChange={(e) => setFormAssigneeId(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer font-medium"
                  >
                    {userRoster.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first} {u.last} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1">
                    Target Resolution Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] outline-none cursor-pointer font-mono"
                  />
                </div>
              </div>

              {/* Notification Channels (Checkboxes) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">
                  Notification Dispatch Channels
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_CHANNELS.map(ch => {
                    const isChecked = formChannels.includes(ch);
                    return (
                      <label
                        key={ch}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked 
                            ? "bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-[var(--color-text)] font-bold" 
                            : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormChannels([...formChannels, ch]);
                            } else {
                              setFormChannels(formChannels.filter(c => c !== ch));
                            }
                          }}
                          className="rounded border-[var(--color-border)] accent-[var(--color-accent)] cursor-pointer"
                        />
                        <span>{ch}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button & Save Template controls */}
              <div className="pt-3 border-t border-[var(--color-border)]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-[var(--color-accent)] text-black font-extrabold text-xs rounded-lg hover:bg-[var(--color-accent)]/90 transition-all cursor-pointer shadow flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch System Alert</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="New template name..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="px-2.5 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>Save Template</span>
                  </button>
                </div>
              </div>

            </form>
          </div>

          {/* Right Panel: Presets & Templates List */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[var(--color-info)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Saved Alert Templates</h4>
              </div>
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono">{templates.length} Presets</span>
            </div>

            <p className="text-xs text-[var(--color-text-faint)]">
              Click any saved template below to auto-populate the creation form with pre-configured parameters.
            </p>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {templates.map(tpl => (
                <div key={tpl.id} className="p-3 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]/50 rounded-xl space-y-2 hover:border-[var(--color-accent)]/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--color-text)]">{tpl.name}</span>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1 text-[var(--color-text-faint)] hover:text-red-400 cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">{tpl.title}</p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--color-text-faint)] font-mono">
                    <span className="bg-[var(--color-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">{tpl.category}</span>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-2.5 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-bold uppercase rounded hover:bg-[var(--color-accent)]/30 cursor-pointer transition-all"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 3: GLOBAL BROADCAST NOTICES --- */}
      {activeTab === "broadcasts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Broadcaster Composition Form */}
          <div className="lg:col-span-1 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg flex flex-col justify-between h-[380px]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3">
              <Megaphone className="w-4.5 h-4.5 text-[var(--color-accent)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Dispatch Global Notice</h4>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4 mt-3 flex-1 flex flex-col justify-between">
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Notice Classification</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMsgType("info")}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer ${
                      msgType === "info" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    🟢 Info Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgType("warning")}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer ${
                      msgType === "warning" 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    🟡 Warning Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgType("critical")}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer ${
                      msgType === "critical" 
                        ? "bg-red-500/10 text-red-400 border-red-500/30" 
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    🔴 Critical Alert
                  </button>
                </div>
              </div>

              <div className="flex-1 mt-3">
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Compose Broadcast Message</label>
                <textarea
                  required
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Write an operational notice to stream to all active brokerage login workspaces..."
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg p-3 text-xs text-[var(--color-text)] outline-none resize-none h-24 focus:border-[var(--color-accent)]/30 transition-all placeholder-[var(--color-text-faint)]/60"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[var(--color-accent)] text-black text-xs font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer shadow hover:bg-[var(--color-accent)]/90"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Brokerage Notice
              </button>
            </form>
          </div>

          {/* Live Active Banners Directory */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg flex flex-col h-[380px]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-[var(--color-info)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Active Broadcast Banner Streams</h4>
              </div>
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono font-bold">
                {broadcasts.filter(b => b.active).length} Active Channels
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 select-none">
              {broadcasts.map((b) => (
                <div 
                  key={b.id} 
                  className={`p-3.5 rounded-xl border flex gap-3.5 items-start transition-all ${
                    b.active 
                      ? b.type === "critical" 
                        ? "bg-red-500/5 border-red-500/20 text-red-200"
                        : b.type === "warning"
                        ? "bg-amber-500/5 border-amber-500/20 text-amber-200"
                        : "bg-emerald-500/5 border-emerald-500/20 text-emerald-200"
                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)]/50 text-[var(--color-text-faint)]"
                  }`}
                >
                  {b.type === "critical" ? (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  ) : b.type === "warning" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0 text-left text-xs">
                    <p className="leading-relaxed font-medium text-[var(--color-text)]">{b.message}</p>
                    
                    <div className="flex items-center gap-3.5 mt-2.5 text-[9px] font-semibold text-[var(--color-text-faint)] uppercase">
                      <span>Sender: {b.sender} ({b.senderRole})</span>
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(b.timestamp).toLocaleDateString()} {new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-center shrink-0">
                    <button
                      onClick={() => handleToggleActiveBroadcast(b.id)}
                      className={`text-[9px] font-bold uppercase border px-2 py-1 rounded transition-all cursor-pointer ${
                        b.active 
                          ? "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
                          : "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20"
                      }`}
                    >
                      {b.active ? "Mute" : "Stream"}
                    </button>

                    <button
                      onClick={() => handleDeleteBroadcast(b.id)}
                      className="p-1 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[var(--color-text-faint)]/40 hover:text-red-400 rounded transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {broadcasts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-[var(--color-text-faint)]">
                  <Megaphone className="w-10 h-10 mb-2 stroke-1" />
                  <p className="text-xs italic">No system broadcasts deployed yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: MAINTENANCE MODE SCHEDULER --- */}
      {activeTab === "maintenance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Maintenance Window */}
          <div className="lg:col-span-1 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3">
              <Wrench className="w-4.5 h-4.5 text-[var(--color-accent)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Schedule Maintenance Window</h4>
            </div>

            <form onSubmit={handleAddMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] mb-1">Window Name / Title</label>
                <input
                  type="text"
                  required
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] mb-1">Start DateTime (EST)</label>
                <input
                  type="datetime-local"
                  required
                  value={maintStart}
                  onChange={(e) => setMaintStart(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] mb-1">End DateTime (EST)</label>
                <input
                  type="datetime-local"
                  required
                  value={maintEnd}
                  onChange={(e) => setMaintEnd(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] mb-1">Affected Systems (Comma separated)</label>
                <input
                  type="text"
                  value={maintSystems}
                  onChange={(e) => setMaintSystems(e.target.value)}
                  placeholder="e.g. Client Portal, Lender Sync"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] mb-1">Public User Notice Banner Text</label>
                <textarea
                  rows={2}
                  value={maintNotice}
                  onChange={(e) => setMaintNotice(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[var(--color-accent)] text-black font-extrabold text-xs uppercase tracking-wider rounded-lg hover:bg-[var(--color-accent)]/90 transition-all cursor-pointer shadow flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" /> Schedule Maintenance
              </button>
            </form>
          </div>

          {/* Maintenance Windows List */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-[var(--color-info)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Scheduled System Maintenance Windows</h4>
              </div>
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono">{maintenance.length} Active Windows</span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {maintenance.map(m => (
                <div key={m.id} className="p-4 bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[var(--color-text)]">{m.title}</span>
                      {m.enabled ? (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                          Enabled &amp; Live
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[var(--color-surface)] text-[var(--color-text-faint)] font-bold px-2 py-0.5 rounded border border-[var(--color-border)] uppercase">
                          Disabled
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleMaintenance(m.id)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-all cursor-pointer ${
                          m.enabled 
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" 
                            : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                        }`}
                      >
                        {m.enabled ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        onClick={() => handleDeleteMaintenance(m.id)}
                        className="p-1 hover:bg-red-500/10 text-[var(--color-text-faint)] hover:text-red-400 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)]">{m.noticeMessage}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-[var(--color-text-faint)] font-mono pt-1">
                    <span>Window: <strong className="text-[var(--color-text)]">{m.startTime} ➔ {m.endTime}</strong></span>
                    <span>•</span>
                    <span>Systems: {m.affectedSystems.join(", ")}</span>
                    <span>•</span>
                    <span>By: {m.scheduledBy}</span>
                  </div>
                </div>
              ))}

              {maintenance.length === 0 && (
                <p className="text-xs text-[var(--color-text-faint)] italic text-center py-8">
                  No maintenance windows currently scheduled.
                </p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 5: ALERT STATISTICS & ANALYTICS --- */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Key Metric Gauges */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3">
              <TrendingUp className="w-4.5 h-4.5 text-[var(--color-accent)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Resolution Velocity &amp; KPI Metrics</h4>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[var(--color-surface-2)]/60 rounded-xl border border-[var(--color-border)]/40">
                <span className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider block">Average Resolution Time</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-[var(--color-accent)]">{stats.avgResolutionHours}</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-bold">Hours / Incident</span>
                </div>
                <p className="text-[10px] text-emerald-400 mt-1">
                  ⚡ 14% faster than industry compliance benchmark (2.5h)
                </p>
              </div>

              <div className="p-3 bg-[var(--color-surface-2)]/60 rounded-xl border border-[var(--color-border)]/40">
                <span className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider block">On-Time Resolution Rate</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-emerald-400">{stats.efficiencyRate}%</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-bold">Resolved before Due Date</span>
                </div>
                <div className="w-full bg-[var(--color-surface)] h-2 rounded-full mt-2 overflow-hidden border border-[var(--color-border)]/50">
                  <div className="bg-emerald-400 h-full transition-all" style={{ width: `${stats.efficiencyRate}%` }} />
                </div>
              </div>

              <div className="p-3 bg-[var(--color-surface-2)]/60 rounded-xl border border-[var(--color-border)]/40">
                <span className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider block">Active vs Resolved Ratio</span>
                <div className="flex items-center justify-between text-xs mt-2 font-bold">
                  <span className="text-blue-400">{stats.activeCount} Active</span>
                  <span className="text-emerald-400">{stats.resolvedCount} Resolved</span>
                </div>
                <div className="w-full bg-blue-500/20 h-2 rounded-full mt-1.5 overflow-hidden flex">
                  <div 
                    className="bg-emerald-400 h-full" 
                    style={{ 
                      width: `${stats.totalAlerts > 0 ? (stats.resolvedCount / stats.totalAlerts) * 100 : 50}%` 
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown by Category & Priority */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-[var(--color-info)]" />
                <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Alert Priority &amp; Classification Distribution</h4>
              </div>
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Total System Records: {stats.totalAlerts}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Priority Distribution */}
              <div className="bg-[var(--color-surface-2)]/50 p-4 rounded-xl border border-[var(--color-border)]/50 space-y-3">
                <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">Priority Breakdown</span>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-red-400 font-bold">Critical</span>
                      <span>{stats.criticalCount} alerts</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface)] h-2 rounded-full overflow-hidden">
                      <div className="bg-red-400 h-full" style={{ width: `${(stats.criticalCount / (stats.activeCount || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-amber-400 font-bold">High</span>
                      <span>{stats.highCount} alerts</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface)] h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(stats.highCount / (stats.activeCount || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-blue-400 font-bold">Medium</span>
                      <span>{stats.mediumCount} alerts</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface)] h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full" style={{ width: `${(stats.mediumCount / (stats.activeCount || 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-emerald-400 font-bold">Low / Info</span>
                      <span>{stats.lowCount + stats.infoCount} alerts</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface)] h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full" style={{ width: `${((stats.lowCount + stats.infoCount) / (stats.activeCount || 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-[var(--color-surface-2)]/50 p-4 rounded-xl border border-[var(--color-border)]/50 space-y-3">
                <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">Category Distribution</span>

                <div className="space-y-2.5 text-xs">
                  {CATEGORIES.map(cat => {
                    const count = alerts.filter(a => a.category === cat).length;
                    const pct = stats.totalAlerts > 0 ? Math.round((count / stats.totalAlerts) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-[10px] font-semibold mb-1">
                          <span className="text-[var(--color-text)]">{cat}</span>
                          <span className="text-[var(--color-text-faint)] font-mono">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-[var(--color-surface)] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[var(--color-accent)] h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* --- MODAL 1: ALERT DETAILS & COMMENTS DRAWER --- */}
      {selectedAlert && !showReassignModal && !showSnoozeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="bg-[var(--color-surface-2)] px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[var(--color-text)]">{selectedAlert.title}</span>
                  <span className="text-[9px] bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    {selectedAlert.priority}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--color-text-faint)] font-mono mt-0.5">
                  ID: {selectedAlert.id} • Created by {selectedAlert.createdBy} on {new Date(selectedAlert.createdAt).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              
              {/* Alert Description */}
              <div className="bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/50">
                <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider block mb-1">Operational Directive</span>
                <p className="text-xs text-[var(--color-text)] leading-relaxed">{selectedAlert.description}</p>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--color-surface-2)]/40 p-3 rounded-xl border border-[var(--color-border)]/40 text-[11px]">
                <div>
                  <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold block">Assignee</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedAlert.assignedToName}</span>
                </div>

                <div>
                  <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold block">Target Due Date</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedAlert.dueDate || "N/A"}</span>
                </div>

                <div>
                  <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold block">Category</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedAlert.category}</span>
                </div>

                <div>
                  <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold block">Channels</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedAlert.channels.join(", ")}</span>
                </div>
              </div>

              {/* Comments & Audit Trail */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2">
                  <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>Resolution Log &amp; Comments ({selectedAlert.comments.length})</span>
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedAlert.comments.map(c => (
                    <div key={c.id} className="p-3 bg-[var(--color-surface-2)]/50 rounded-xl border border-[var(--color-border)]/40 text-xs">
                      <div className="flex justify-between text-[10px] text-[var(--color-text-faint)] mb-1">
                        <span className="font-bold text-[var(--color-text)]">{c.author} ({c.authorRole})</span>
                        <span className="font-mono">{new Date(c.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{c.text}</p>
                    </div>
                  ))}

                  {selectedAlert.comments.length === 0 && (
                    <p className="text-xs text-[var(--color-text-faint)] italic py-2">No comments added to this alert yet.</p>
                  )}
                </div>

                {/* Add Comment Input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Type an operational note or resolution comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                    className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 bg-[var(--color-accent)] text-black font-extrabold text-xs rounded-lg hover:bg-[var(--color-accent)]/90 cursor-pointer"
                  >
                    Post Note
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-[var(--color-surface-2)] px-6 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Status: {selectedAlert.status.toUpperCase()}</span>

              <div className="flex items-center gap-2">
                {selectedAlert.status === "active" && (
                  <button
                    onClick={() => {
                      handleResolveAlert(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    className="px-4 py-1.5 bg-emerald-500 text-black font-extrabold text-xs rounded-lg hover:bg-emerald-400 cursor-pointer"
                  >
                    Mark as Resolved
                  </button>
                )}

                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-1.5 bg-[var(--color-surface-3)] text-[var(--color-text)] font-bold text-xs rounded-lg hover:bg-[var(--color-surface-3)]/80 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL 2: REASSIGN MODAL --- */}
      {showReassignModal && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Reassign System Alert</h4>
              <button onClick={() => setShowReassignModal(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              Select a new staff member responsible for resolving <strong>"{selectedAlert.title}"</strong>.
            </p>

            <select
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] font-medium outline-none"
            >
              {userRoster.map(u => (
                <option key={u.id} value={u.id}>{u.first} {u.last} ({u.role})</option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignAlert}
                className="px-4 py-2 bg-[var(--color-accent)] text-black font-extrabold text-xs rounded-lg cursor-pointer hover:bg-[var(--color-accent)]/90"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: SNOOZE MODAL --- */}
      {showSnoozeModal && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3">
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Snooze Alert Notifications</h4>
              <button onClick={() => setShowSnoozeModal(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              Temporarily mute notifications for <strong>"{selectedAlert.title}"</strong>.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSnoozeHours(1)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  snoozeHours === 1 ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)]" : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                1 Hour
              </button>
              <button
                onClick={() => setSnoozeHours(24)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  snoozeHours === 24 ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)]" : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                24 Hours
              </button>
              <button
                onClick={() => setSnoozeHours(72)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  snoozeHours === 72 ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)]" : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                3 Days
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSnoozeModal(false)}
                className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSnoozeAlert}
                className="px-4 py-2 bg-purple-500 text-white font-extrabold text-xs rounded-lg cursor-pointer hover:bg-purple-600"
              >
                Confirm Snooze
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
