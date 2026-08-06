import React, { useState, useMemo } from "react";
import { 
  Users, UserPlus, Search, Filter, Edit3, Shield, Key, Eye, 
  Trash2, ToggleLeft, ToggleRight, Check, X, Mail, Phone, Clock,
  FileCheck, ShieldAlert, Award, AlertCircle, FileText, RefreshCw, UserX,
  Briefcase, Building2, CheckSquare, Download, Printer, ChevronRight,
  ShieldCheck, Sparkles, Send, FileSpreadsheet, Layers, UserCheck, HelpCircle,
  BarChart2, FileUp, CheckCircle2, User, Tag
} from "lucide-react";
import { User as UserType, Client, Task, ModulePermissions, PermissionLevel, OnboardingTask } from "../../types";
import { Avatar } from "../Avatar";
import { generateRosterPDF, exportRosterCSV } from "../../lib/rosterPdfGenerator";
import { DEFAULT_CLEARANCE_LEVELS, DEFAULT_MODULE_KEYS, ROLE_PRESETS } from "../../lib/clearanceMatrixDefaults";
import { UserActivityTimeline } from "./UserActivityTimeline";
import { UserComparisonModal } from "./UserComparisonModal";
import { UserOffboardingModal } from "./UserOffboardingModal";
import { UserMergeModal } from "./UserMergeModal";
import { UserBulkImportModal } from "./UserBulkImportModal";
import { UserTagsManagerModal } from "./UserTagsManagerModal";
import { UserOrgChart } from "./UserOrgChart";

interface UserManagementProps {
  userRoster: UserType[];
  setUserRoster: React.Dispatch<React.SetStateAction<UserType[]>>;
  currentUser: UserType;
  clients: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  logActivity: (action: string, details: string) => void;
}

type UserSubTab = "roster" | "brokers" | "onboarding" | "clearance" | "orgchart" | "activity";

export const UserManagement: React.FC<UserManagementProps> = ({
  userRoster,
  setUserRoster,
  currentUser,
  clients,
  setClients,
  tasks = [],
  setTasks,
  showToast,
  logActivity
}) => {
  const [activeSubTab, setActiveSubTab] = useState<UserSubTab>("roster");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clearanceFilter, setClearanceFilter] = useState<number | "all">("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");

  // Multi-select Bulk Actions
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // New Modals State
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [offboardingUser, setOffboardingUser] = useState<UserType | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([
    "Senior Broker", "GTA East", "Commercial", "High Performer", "VIP Handler", "Needs Renewal", "Probation"
  ]);

  // Modals state
  const [profileUserModal, setProfileUserModal] = useState<UserType | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editRole, setEditRole] = useState<string>("Broker");
  const [editBrokerage, setEditBrokerage] = useState<string>("GBK Financial");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editClearance, setEditClearance] = useState<number>(2);
  const [editSpecialPerms, setEditSpecialPerms] = useState<Record<string, boolean>>({
    canExport: true,
    canManageUsers: false,
    canAccessAdmin: false,
    canViewReports: true,
    canManageCompliance: false
  });

  // Edit Broker Admin Details Modal
  const [editingBroker, setEditingBroker] = useState<UserType | null>(null);
  const [brokerCommission, setBrokerCommission] = useState<string>("85/15 Split");
  const [brokerTerritory, setBrokerTerritory] = useState<string>("Greater Toronto Area");
  const [brokerTier, setBrokerTier] = useState<string>("Tier 1 - Managing Broker");
  const [brokerNotes, setBrokerNotes] = useState<string>("");

  // Assign Agents Modal
  const [assigningBroker, setAssigningBroker] = useState<UserType | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // Export Options Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv" | "excel">("pdf");
  const [exportScope, setExportScope] = useState<"all" | "selected" | "filtered">("filtered");
  const [includeStats, setIncludeStats] = useState(true);

  // Bulk Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");

  // 5-Step Onboarding Wizard Modal
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1); // 6 is success
  
  // Wizard State
  const [wizFirst, setWizFirst] = useState("");
  const [wizLast, setWizLast] = useState("");
  const [wizEmail, setWizEmail] = useState("");
  const [wizPhone, setWizPhone] = useState("");
  const [wizRole, setWizRole] = useState<string>("Agent");
  const [wizBrokerage, setWizBrokerage] = useState("GBK Financial");
  const [wizLicense, setWizLicense] = useState("");
  const [wizStartDate, setWizStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [wizReportingTo, setWizReportingTo] = useState("");
  
  // Step 2 Account
  const [wizUsername, setWizUsername] = useState("");
  const [wizTempPass, setWizTempPass] = useState(`GBK-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [wizSendWelcome, setWizSendWelcome] = useState(true);
  const [wizRequirePassChange, setWizRequirePassChange] = useState(true);
  const [wizClearance, setWizClearance] = useState<number>(2);

  // Step 3 Permissions
  const [wizModuleAccess, setWizModuleAccess] = useState<Record<string, boolean>>({
    dashboard: true, clients: true, pipeline: true, tasks: true, messages: true,
    email: true, calendar: true, documents: true, lenderSheets: true, partners: true,
    calculators: true, reports: false, aiAssistant: true, adminPanel: false, userManagement: false
  });
  const [wizSpecialPerms, setWizSpecialPerms] = useState<Record<string, boolean>>({
    canExport: true, canManageUsers: false, canAccessAdmin: false, canViewReports: true
  });

  // Step 4 Onboarding Tasks & Mentor
  const [wizChecklist, setWizChecklist] = useState<OnboardingTask[]>([
    { id: "1", title: "Complete profile in Settings > My Profile", completed: false, required: true },
    { id: "2", title: "Upload profile photo and signature logo", completed: false, required: true },
    { id: "3", title: "Review FSRA mortgage compliance guidelines", completed: false, required: true },
    { id: "4", title: "Complete CRM platform training modules", completed: false, required: false },
    { id: "5", title: "Set up 2FA and security PIN code", completed: false, required: true },
    { id: "6", title: "Meet with managing broker for orientation", completed: false, required: false }
  ]);
  const [wizMentorId, setWizMentorId] = useState("");
  const [wizProbationDays, setWizProbationDays] = useState(60);

  // Created user result for wizard step 6
  const [createdUser, setCreatedUser] = useState<UserType | null>(null);

  // Reassign Workload Modal
  const [reassigningUserId, setReassigningUserId] = useState<string | null>(null);
  const [targetReassignId, setTargetReassignId] = useState<string>("");

  // Clearance Matrix Tab Local State
  const [matrixState, setMatrixState] = useState<Record<number, Record<string, PermissionLevel>>>(() => {
    const initial: Record<number, Record<string, PermissionLevel>> = {};
    DEFAULT_CLEARANCE_LEVELS.forEach(lvl => {
      const mods = { ...lvl.defaultModules } as unknown as Record<string, PermissionLevel>;
      initial[lvl.level] = mods;
    });
    return initial;
  });

  // Calculate workloads
  const getUserWorkload = (u: UserType) => {
    const uId = (u.id || "").toLowerCase();
    const fullNameLower = `${u.first || ""} ${u.last || ""}`.trim().toLowerCase();

    const assignedClients = (clients || []).filter(c => {
      const owner = (c.retentionOwner || "").toLowerCase();
      const agent = (c.agent || "").toLowerCase();
      const assignedTo = ((c as any).assignedTo || "").toLowerCase();
      return (
        (uId && (owner === uId || agent === uId || assignedTo === uId)) ||
        (fullNameLower && (owner === fullNameLower || agent === fullNameLower || assignedTo === fullNameLower))
      );
    });

    const assignedTasks = (tasks || []).filter(t => {
      const owner = ((t as any).owner || (t as any).assignedTo || (t as any).agent || "").toLowerCase();
      return (
        (uId && owner === uId) ||
        (fullNameLower && owner === fullNameLower)
      );
    });

    return {
      clientCount: assignedClients.length,
      taskCount: assignedTasks.length
    };
  };

  // Filtered roster calculation
  const filteredRoster = useMemo(() => {
    return userRoster.filter(u => {
      const search = searchTerm.toLowerCase().trim();
      const nameMatch = !search || 
        `${u.first || ""} ${u.last || ""}`.toLowerCase().includes(search) ||
        (u.email || "").toLowerCase().includes(search) ||
        (u.brokerage || "").toLowerCase().includes(search) ||
        (u.jobTitle || "").toLowerCase().includes(search);

      const roleMatch = roleFilter === "all" || u.role === roleFilter;
      
      const uStatus = (u.status || "active").toLowerCase();
      const statusMatch = statusFilter === "all" || uStatus === statusFilter.toLowerCase();

      const uClearance = u.clearanceLevel || (u.role === "Developer/Admin" ? 6 : u.role === "Admin" ? 5 : u.role === "Broker" ? 3 : 2);
      const clearanceMatch = clearanceFilter === "all" || uClearance === clearanceFilter;

      const tagMatch = selectedTagFilter === "all" || (u.tags && u.tags.includes(selectedTagFilter));

      return nameMatch && roleMatch && statusMatch && clearanceMatch && tagMatch;
    });
  }, [userRoster, searchTerm, roleFilter, statusFilter, clearanceFilter, selectedTagFilter]);

  // Dashboard Stats
  const totalCount = userRoster.length;
  const activeCount = userRoster.filter(u => (u.status || "").toLowerCase() === "active").length;
  const pendingCount = userRoster.filter(u => (u.status || "").toLowerCase() === "pending").length;
  const inactiveCount = userRoster.filter(u => (u.status || "").toLowerCase() === "inactive").length;
  const brokersCount = userRoster.filter(u => u.role === "Broker").length;
  const agentsCount = userRoster.filter(u => u.role === "Agent").length;
  const adminCount = userRoster.filter(u => u.role === "Admin" || u.role === "Developer/Admin").length;

  // Toggle single user select
  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select All visible
  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredRoster.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredRoster.map(u => u.id));
    }
  };

  // Bulk Status Change
  const handleBulkStatusChange = (status: "active" | "inactive" | "pending") => {
    if (selectedUserIds.length === 0) return;
    
    // Prevent self deactivation if included
    if (status === "inactive" && selectedUserIds.includes(currentUser.id)) {
      showToast("You cannot deactivate your own admin account in bulk.", "error");
      return;
    }

    const updated = userRoster.map(u => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, status };
      }
      return u;
    });

    setUserRoster(updated);
    logActivity("Bulk Status Update", `Changed status of ${selectedUserIds.length} users to ${status}`);
    showToast(`Updated status of ${selectedUserIds.length} users to ${status}.`, "success");
    setSelectedUserIds([]);
  };

  // Bulk Clearance Change
  const handleBulkClearanceChange = (level: number) => {
    if (selectedUserIds.length === 0) return;

    const updated = userRoster.map(u => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, clearanceLevel: level };
      }
      return u;
    });

    setUserRoster(updated);
    logActivity("Bulk Clearance Level Update", `Assigned Clearance Level ${level} to ${selectedUserIds.length} users`);
    showToast(`Assigned Clearance Level ${level} to ${selectedUserIds.length} users.`, "success");
    setSelectedUserIds([]);
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;

    if (selectedUserIds.includes(currentUser.id)) {
      showToast("You cannot delete your own admin account.", "error");
      return;
    }

    const updated = userRoster.filter(u => !selectedUserIds.includes(u.id));
    setUserRoster(updated);
    logActivity("Bulk User Deletion", `Deleted ${selectedUserIds.length} staff accounts from the system.`);
    showToast(`Removed ${selectedUserIds.length} users from the roster.`, "success");
    setSelectedUserIds([]);
  };

  // Save Edit User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUser: UserType = {
      ...editingUser,
      role: editRole,
      brokerage: editBrokerage,
      status: editStatus as any,
      clearanceLevel: editClearance,
      specialPermissions: editSpecialPerms
    };

    setUserRoster(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
    logActivity("Updated User Profile", `Updated permissions and role for ${editingUser.first} ${editingUser.last}`);
    showToast(`Updated profile settings for ${editingUser.first} ${editingUser.last}.`, "success");
    setEditingUser(null);
  };

  // Save Edit Broker Details
  const handleSaveBrokerDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBroker) return;

    const updatedBroker: UserType = {
      ...editingBroker,
      commissionRate: brokerCommission,
      territory: brokerTerritory,
      brokerTier: brokerTier,
      adminNotes: brokerNotes
    };

    setUserRoster(prev => prev.map(u => u.id === editingBroker.id ? updatedBroker : u));
    logActivity("Updated Broker Details", `Updated admin broker metrics for ${editingBroker.first} ${editingBroker.last}`);
    showToast(`Updated broker metrics for ${editingBroker.first}.`, "success");
    setEditingBroker(null);
  };

  // Save Assign Agents to Broker
  const handleSaveAssignAgents = () => {
    if (!assigningBroker) return;

    const brokerFullName = `${assigningBroker.first} ${assigningBroker.last}`;

    const updated = userRoster.map(u => {
      if (selectedAgentIds.includes(u.id)) {
        return { ...u, reportingTo: brokerFullName };
      }
      return u;
    });

    setUserRoster(updated);
    logActivity("Assigned Agents to Broker", `Assigned ${selectedAgentIds.length} agents to ${brokerFullName}`);
    showToast(`Assigned ${selectedAgentIds.length} agents to ${assigningBroker.first}.`, "success");
    setAssigningBroker(null);
  };

  // Wizard Finish (Create User)
  const handleWizardSubmit = () => {
    if (!wizFirst || !wizLast || !wizEmail) {
      showToast("First name, last name, and email are required.", "error");
      return;
    }

    const newUser: UserType = {
      id: `usr_${Date.now()}`,
      first: wizFirst,
      last: wizLast,
      email: wizEmail,
      phone: wizPhone || "(705) 555-0199",
      role: wizRole,
      brokerage: wizBrokerage || "GBK Financial",
      licenseNumber: wizLicense,
      status: "pending",
      clearanceLevel: wizClearance,
      created: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      lastLogin: "Never",
      lastActive: "Pending Onboarding",
      reportingTo: wizReportingTo,
      onboardingCompleted: false,
      onboardingTasks: wizChecklist,
      onboardingStartDate: wizStartDate,
      probationPeriodDays: wizProbationDays,
      mentorId: wizMentorId,
      jobTitle: wizRole,
      displayName: `${wizFirst} ${wizLast}`,
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      specialPermissions: wizSpecialPerms
    };

    setUserRoster(prev => [newUser, ...prev]);
    setCreatedUser(newUser);
    logActivity("Onboarded New Staff Member", `Created account for ${newUser.first} ${newUser.last} (${newUser.email}) - Clearance Level ${newUser.clearanceLevel}`);
    showToast(`Created staff account for ${newUser.first} ${newUser.last}!`, "success");
    setWizardStep(6); // Success Step
  };

  // Execute Export
  const handleExecuteExport = () => {
    let targetUsers = userRoster;
    if (exportScope === "selected") {
      targetUsers = userRoster.filter(u => selectedUserIds.includes(u.id));
      if (targetUsers.length === 0) {
        showToast("No users selected to export.", "error");
        return;
      }
    } else if (exportScope === "filtered") {
      targetUsers = filteredRoster;
    }

    if (exportFormat === "pdf") {
      generateRosterPDF(targetUsers, { includeStats });
      showToast(`Exported ${targetUsers.length} users to PDF!`, "success");
    } else {
      exportRosterCSV(targetUsers);
      showToast(`Exported ${targetUsers.length} users to CSV!`, "success");
    }

    setShowExportModal(false);
  };

  // Reassign Workload execution
  const handleReassignUserWorkload = (fromUserId: string, toUserId: string) => {
    if (!toUserId) {
      showToast("Select a valid staff member to receive workload.", "error");
      return;
    }

    const sourceUser = userRoster.find(u => u.id === fromUserId);
    const targetUser = userRoster.find(u => u.id === toUserId);
    if (!sourceUser || !targetUser) return;

    const sourceName = `${sourceUser.first} ${sourceUser.last}`;
    const targetName = `${targetUser.first} ${targetUser.last}`;

    const { clientCount, taskCount } = getUserWorkload(sourceUser);

    if (setClients) {
      setClients(prev => prev.map(c => {
        if (c.retentionOwner === sourceName || c.agent === sourceName) {
          return { ...c, retentionOwner: targetName, agent: targetName };
        }
        return c;
      }));
    }

    if (setTasks) {
      setTasks(prev => prev.map(t => {
        if ((t as any).assignedTo === sourceName || (t as any).owner === sourceName) {
          return { ...t, assignedTo: targetName, owner: targetName } as any;
        }
        return t;
      }));
    }

    logActivity("Reassigned Workload", `Reassigned ${clientCount} clients and ${taskCount} tasks from ${sourceName} to ${targetName}`);
    showToast(`Reassigned workload from ${sourceName} to ${targetName}.`, "success");
    setReassigningUserId(null);
    setTargetReassignId("");
  };

  // Offboarding Handler
  const handleExecuteOffboarding = (data: {
    targetUserId: string;
    revokeAccess: boolean;
    archiveAccount: boolean;
    deleteAccount: boolean;
    exportPackage: boolean;
  }) => {
    if (!offboardingUser) return;

    const sourceName = `${offboardingUser.first} ${offboardingUser.last}`;
    const targetUser = userRoster.find(u => u.id === data.targetUserId);
    const targetName = targetUser ? `${targetUser.first} ${targetUser.last}` : "System Admin";

    // Transfer clients & tasks
    if (data.targetUserId && setClients) {
      setClients(prev => prev.map(c => {
        if (c.retentionOwner === sourceName || c.agent === sourceName || c.assignedBroker === sourceName) {
          return { ...c, retentionOwner: targetName, agent: targetName, assignedBroker: targetName };
        }
        return c;
      }));
    }

    if (data.targetUserId && setTasks) {
      setTasks(prev => prev.map(t => {
        if ((t as any).assignedTo === sourceName || (t as any).owner === sourceName) {
          return { ...t, assignedTo: targetName, owner: targetName } as any;
        }
        return t;
      }));
    }

    // Account Disposition
    if (data.deleteAccount) {
      setUserRoster(prev => prev.filter(u => u.id !== offboardingUser.id));
      logActivity("Offboarded & Deleted Account", `Offboarded and permanently removed ${sourceName} from roster. Reassigned files to ${targetName}.`);
      showToast(`Offboarded and removed ${sourceName} from roster.`, "success");
    } else {
      setUserRoster(prev => prev.map(u => {
        if (u.id === offboardingUser.id) {
          return { ...u, status: "inactive", clearanceLevel: 0 };
        }
        return u;
      }));
      logActivity("Offboarded Staff Account", `Completed offboarding protocol for ${sourceName}. Deactivated account and reassigned workload to ${targetName}.`);
      showToast(`Offboarded and deactivated account for ${sourceName}.`, "success");
    }

    setOffboardingUser(null);
  };

  // Merge Handler
  const handleExecuteMerge = (mergedPrimaryUser: UserType, duplicateUserIdToRemove: string) => {
    const dupUser = userRoster.find(u => u.id === duplicateUserIdToRemove);
    if (!dupUser) return;

    const dupName = `${dupUser.first} ${dupUser.last}`;
    const primaryName = `${mergedPrimaryUser.first} ${mergedPrimaryUser.last}`;

    // Reassign clients & tasks
    if (setClients) {
      setClients(prev => prev.map(c => {
        if (c.retentionOwner === dupName || c.agent === dupName || c.assignedBroker === dupName) {
          return { ...c, retentionOwner: primaryName, agent: primaryName, assignedBroker: primaryName };
        }
        return c;
      }));
    }

    if (setTasks) {
      setTasks(prev => prev.map(t => {
        if ((t as any).assignedTo === dupName || (t as any).owner === dupName) {
          return { ...t, assignedTo: primaryName, owner: primaryName } as any;
        }
        return t;
      }));
    }

    // Update roster: update primary, remove duplicate
    setUserRoster(prev => prev.filter(u => u.id !== duplicateUserIdToRemove).map(u => u.id === mergedPrimaryUser.id ? mergedPrimaryUser : u));

    logActivity("Merged Duplicate Accounts", `Merged duplicate user ${dupName} into ${primaryName}. Reassigned all client files and tasks.`);
    showToast(`Merged duplicate accounts into ${primaryName}!`, "success");
    setShowMergeModal(false);
  };

  // Import Handler
  const handleImportUsers = (newUsers: UserType[]) => {
    setUserRoster(prev => [...newUsers, ...prev]);
    logActivity("Bulk CSV Staff Import", `Imported ${newUsers.length} staff accounts from CSV file.`);
  };

  // Apply Tags Handler
  const handleApplyTagsToUsers = (tag: string, action: "add" | "remove") => {
    if (selectedUserIds.length === 0) {
      showToast("Select staff members from the roster first.", "warning");
      return;
    }

    setUserRoster(prev => prev.map(u => {
      if (selectedUserIds.includes(u.id)) {
        const currentTags = u.tags || [];
        if (action === "add") {
          return { ...u, tags: Array.from(new Set([...currentTags, tag])) };
        } else {
          return { ...u, tags: currentTags.filter(t => t !== tag) };
        }
      }
      return u;
    }));

    logActivity("Updated User Tags", `${action === "add" ? "Assigned" : "Removed"} tag "${tag}" for ${selectedUserIds.length} users.`);
    showToast(`${action === "add" ? "Assigned" : "Removed"} tag "${tag}" for ${selectedUserIds.length} staff members.`, "success");
  };

  return (
    <div className="space-y-6" id="user-management-panel">
      
      {/* ─── TOP SECTION SUB-NAVIGATION ─── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-2 rounded-xl flex items-center justify-between gap-2 overflow-x-auto select-none shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab("roster")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "roster"
                ? "bg-[var(--color-accent)] text-white shadow-md"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            }`}
          >
            <Users className="w-4 h-4" /> Roster Control ({totalCount})
          </button>

          <button
            onClick={() => setActiveSubTab("brokers")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "brokers"
                ? "bg-[var(--color-accent)] text-white shadow-md"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Broker Profiles ({brokersCount})
          </button>

          <button
            onClick={() => setActiveSubTab("onboarding")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "onboarding"
                ? "bg-[var(--color-accent)] text-white shadow-md"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Onboarding Pipeline ({pendingCount})
          </button>

          <button
            onClick={() => setActiveSubTab("clearance")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "clearance"
                ? "bg-[var(--color-accent)] text-white shadow-md"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Clearance Matrix
          </button>

          <button
            onClick={() => setActiveSubTab("orgchart")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "orgchart"
                ? "bg-[var(--color-accent)] text-white shadow-md"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            }`}
          >
            <Building2 className="w-4 h-4" /> Org Chart
          </button>

          <button
            onClick={() => setActiveSubTab("activity")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "activity"
                ? "bg-[var(--color-accent)] text-white shadow-md"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            }`}
          >
            <Clock className="w-4 h-4" /> Activity Timeline
          </button>
        </div>

        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={() => {
              setWizardStep(1);
              setShowWizardModal(true);
            }}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" /> Onboard Staff Wizard
          </button>
        </div>
      </div>

      {/* ─── SUB-TAB 1: ROSTER CONTROL ─── */}
      {activeSubTab === "roster" && (
        <div className="space-y-6">
          
          {/* Roster Overview Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)] block">Total Staff</span>
              <span className="text-xl font-extrabold text-[var(--color-text)] mt-1 block">{totalCount}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Active System Roster</span>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">Active Users</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{activeCount}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Full Workstation Access</span>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">Pending Onboard</span>
              <span className="text-xl font-extrabold text-amber-400 mt-1 block">{pendingCount}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Completing Setup</span>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block">Inactive / Suspended</span>
              <span className="text-xl font-extrabold text-red-400 mt-1 block">{inactiveCount}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Access Suspended</span>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)] block">Brokers &amp; Agents</span>
              <span className="text-xl font-extrabold text-[var(--color-accent)] mt-1 block">{brokersCount + agentsCount}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{brokersCount} Brokers | {agentsCount} Agents</span>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-info)] block">Admins &amp; Devs</span>
              <span className="text-xl font-extrabold text-[var(--color-info)] mt-1 block">{adminCount}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">System Oversight</span>
            </div>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm">
            
            {/* Search & Select Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-1.5 flex items-center gap-2 min-w-[220px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                <input 
                  type="text" 
                  placeholder="Search name, email, brokerage..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] outline-none w-full"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="Broker">Broker</option>
                <option value="Agent">Agent</option>
                <option value="Admin">Admin</option>
                <option value="Assistant">Assistant</option>
                <option value="Developer/Admin">Developer / Admin</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Clearance Level Filter */}
              <select
                value={clearanceFilter.toString()}
                onChange={(e) => setClearanceFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="all">All Clearance Levels</option>
                <option value="1">Level 1 - View Only</option>
                <option value="2">Level 2 - Basic User</option>
                <option value="3">Level 3 - Power User</option>
                <option value="4">Level 4 - Manager</option>
                <option value="5">Level 5 - Admin</option>
                <option value="6">Level 6 - Super Admin</option>
              </select>

              {/* Tag Filter */}
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
              >
                <option value="all">All Tags</option>
                {availableTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {(searchTerm || roleFilter !== "all" || statusFilter !== "all" || clearanceFilter !== "all" || selectedTagFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setClearanceFilter("all");
                    setSelectedTagFilter("all");
                  }}
                  className="text-[10px] text-[var(--color-accent)] font-bold uppercase hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Quick Export / Print / Compare / Merge Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={() => setShowComparisonModal(true)}
                className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" /> Compare Users
              </button>

              <button
                onClick={() => setShowMergeModal(true)}
                className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Merge Users
              </button>

              <button
                onClick={() => setShowTagsModal(true)}
                className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Tags
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Export
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5 text-[var(--color-info)]" /> Bulk Import
              </button>
            </div>
          </div>

          {/* Bulk Actions Floating Toolbar */}
          {selectedUserIds.length > 0 && (
            <div className="bg-[var(--color-accent)] text-white p-3 rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <CheckSquare className="w-4 h-4" />
                <span>{selectedUserIds.length} staff member{selectedUserIds.length > 1 ? "s" : ""} selected</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const selectedUsers = userRoster.filter(u => selectedUserIds.includes(u.id));
                    generateRosterPDF(selectedUsers, { title: "GBK MORTGAGE BROKERAGE - SELECTED STAFF EXPORT" });
                    showToast(`Exported ${selectedUsers.length} selected users to PDF.`, "success");
                  }}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Export Selected
                </button>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusChange(e.target.value as any);
                      e.target.value = "";
                    }
                  }}
                  className="bg-white/20 text-white rounded px-2.5 py-1 text-[10px] font-bold uppercase outline-none cursor-pointer"
                >
                  <option value="" className="text-black">Set Status...</option>
                  <option value="active" className="text-black">Mark Active</option>
                  <option value="pending" className="text-black">Mark Pending</option>
                  <option value="inactive" className="text-black">Mark Inactive</option>
                </select>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkClearanceChange(parseInt(e.target.value));
                      e.target.value = "";
                    }
                  }}
                  className="bg-white/20 text-white rounded px-2.5 py-1 text-[10px] font-bold uppercase outline-none cursor-pointer"
                >
                  <option value="" className="text-black">Set Clearance Level...</option>
                  <option value="1" className="text-black">Level 1 - View Only</option>
                  <option value="2" className="text-black">Level 2 - Basic User</option>
                  <option value="3" className="text-black">Level 3 - Power User</option>
                  <option value="4" className="text-black">Level 4 - Manager</option>
                  <option value="5" className="text-black">Level 5 - Admin</option>
                  <option value="6" className="text-black">Level 6 - Super Admin</option>
                </select>

                <button
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Delete Selected
                </button>

                <button
                  onClick={() => setSelectedUserIds([])}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold uppercase transition-all cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* User List Table */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider">
                    <th className="p-3 text-center w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedUserIds.length === filteredRoster.length && filteredRoster.length > 0}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role / Job Title</th>
                    <th className="p-3">Brokerage / Company</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Clearance Level</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 text-xs">
                  {filteredRoster.map(u => {
                    const workload = getUserWorkload(u);
                    const isSelected = selectedUserIds.includes(u.id);
                    const uStatus = (u.status || "active").toLowerCase();
                    const clearanceLevel = u.clearanceLevel || (u.role === "Developer/Admin" ? 6 : u.role === "Admin" ? 5 : u.role === "Broker" ? 3 : 2);

                    return (
                      <tr 
                        key={u.id} 
                        className={`hover:bg-[var(--color-surface-2)]/40 transition-colors ${isSelected ? "bg-[var(--color-accent)]/5" : ""}`}
                      >
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectUser(u.id)}
                            className="cursor-pointer"
                          />
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${u.first || ""} ${u.last || ""}`} src={u.photo || u.profilePhoto} size="md" />
                            <div>
                              <p className="font-bold text-[var(--color-text)]">{u.first} {u.last}</p>
                              <p className="text-[10px] text-[var(--color-text-faint)]">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                              u.role === "Developer/Admin" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                              u.role === "Admin" ? "bg-[var(--color-info)]/15 text-[var(--color-info)] border-[var(--color-info)]/20" :
                              u.role === "Broker" ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/20" :
                              "bg-slate-500/15 text-slate-300 border-slate-500/20"
                            }`}>
                              {u.role}
                            </span>
                            <p className="text-[10px] text-[var(--color-text-faint)] mt-0.5">{u.jobTitle || u.role}</p>
                          </div>
                        </td>

                        <td className="p-3">
                          <p className="font-bold text-[var(--color-text)]">{u.brokerage || "GBK Financial"}</p>
                          <p className="text-[10px] text-[var(--color-text-faint)]">Lic: {u.licenseNumber || u.fsraNum || "FSRA Registered"}</p>
                        </td>

                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            uStatus === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            uStatus === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${uStatus === "active" ? "bg-emerald-400" : uStatus === "pending" ? "bg-amber-400" : "bg-red-400"}`} />
                            {uStatus}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-[10px] font-extrabold text-[var(--color-text)]">
                            <Shield className="w-3 h-3 text-[var(--color-accent)]" /> Level {clearanceLevel}
                          </span>
                        </td>

                        <td className="p-3">
                          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold">{u.lastActive || u.lastLogin || "Today"}</p>
                          <p className="text-[9px] text-[var(--color-text-faint)]">{workload.clientCount} clients • {workload.taskCount} tasks</p>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setProfileUserModal(u)}
                              title="View Full User Profile"
                              className="p-1.5 hover:bg-[var(--color-surface-3)] text-[var(--color-info)] rounded cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditRole(u.role);
                                setEditBrokerage(u.brokerage || "GBK Financial");
                                setEditStatus((u.status || "active").toLowerCase());
                                setEditClearance(clearanceLevel);
                              }}
                              title="Edit Permissions & Role"
                              className="p-1.5 hover:bg-[var(--color-surface-3)] text-[var(--color-accent)] rounded cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (u.id === currentUser.id) {
                                  showToast("You cannot deactivate your own account.", "error");
                                  return;
                                }
                                const nextStatus = uStatus === "active" ? "inactive" : "active";
                                setUserRoster(prev => prev.map(item => item.id === u.id ? { ...item, status: nextStatus as any } : item));
                                showToast(`Marked ${u.first} ${u.last} as ${nextStatus}.`, "success");
                              }}
                              title={uStatus === "active" ? "Suspend / Deactivate" : "Activate"}
                              className={`p-1.5 hover:bg-[var(--color-surface-3)] rounded cursor-pointer transition-colors ${
                                uStatus === "active" ? "text-red-400" : "text-emerald-400"
                              }`}
                            >
                              {uStatus === "active" ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => setReassigningUserId(u.id)}
                              title="Reassign Workload"
                              className="p-1.5 hover:bg-[var(--color-surface-3)] text-amber-400 rounded cursor-pointer transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setOffboardingUser(u)}
                              title="Start Offboarding Checklist"
                              className="p-1.5 hover:bg-red-500/10 text-red-400 rounded cursor-pointer transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRoster.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[var(--color-text-faint)] italic">
                        No staff members match the selected search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── SUB-TAB 2: BROKER PROFILES ─── */}
      {activeSubTab === "brokers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Licensed Broker Roster</h3>
              <p className="text-[10px] text-[var(--color-text-muted)] font-semibold">Real-time sync with Settings profile metrics &amp; clearance levels.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRoster.filter(u => u.role === "Broker" || (u.jobTitle || "").toLowerCase().includes("broker")).map(b => {
              const assignedAgents = userRoster.filter(agent => 
                agent.reportingTo === b.id || 
                agent.reportingTo === `${b.first} ${b.last}` || 
                agent.reportingTo === b.email
              );

              const workload = getUserWorkload(b);

              return (
                <div key={b.id} className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${b.first} ${b.last}`} src={b.photo || b.profilePhoto} size="lg" />
                        <div>
                          <h4 className="font-extrabold text-sm text-[var(--color-text)]">{b.first} {b.last}</h4>
                          <span className="text-[10px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/20 px-2 py-0.5 rounded font-black uppercase">
                            {b.brokerTier || "Tier 1 - Managing Broker"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] border-b border-[var(--color-border)]/40 pb-1.5">
                        <span className="text-[var(--color-text-faint)] uppercase font-bold">Brokerage</span>
                        <span className="font-bold text-[var(--color-text)]">{b.brokerage || "GBK Financial"}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] border-b border-[var(--color-border)]/40 pb-1.5">
                        <span className="text-[var(--color-text-faint)] uppercase font-bold">FSRA License #</span>
                        <span className="font-mono text-[var(--color-accent)] font-bold">{b.licenseNumber || b.fsraNum || "M19008821"}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] border-b border-[var(--color-border)]/40 pb-1.5">
                        <span className="text-[var(--color-text-faint)] uppercase font-bold">Commission Split</span>
                        <span className="font-bold text-emerald-400">{b.commissionRate || "85/15 Split"}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] border-b border-[var(--color-border)]/40 pb-1.5">
                        <span className="text-[var(--color-text-faint)] uppercase font-bold">Territory / Region</span>
                        <span className="font-semibold text-[var(--color-text)]">{b.territory || "Greater Toronto Area"}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] border-b border-[var(--color-border)]/40 pb-1.5">
                        <span className="text-[var(--color-text-faint)] uppercase font-bold">Assigned Agents</span>
                        <span className="font-bold text-[var(--color-info)]">{assignedAgents.length} Agents</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--color-text-faint)] uppercase font-bold">Active Clients / Files</span>
                        <span className="font-extrabold text-[var(--color-accent)]">{workload.clientCount} Active Deals</span>
                      </div>
                    </div>

                    {b.adminNotes && (
                      <div className="mt-3 bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)]/50 text-[10px] text-[var(--color-text-muted)] italic">
                        📌 {b.adminNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--color-border)]/50">
                    <button
                      onClick={() => setProfileUserModal(b)}
                      className="px-2.5 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 text-[10px] font-bold uppercase rounded-lg text-[var(--color-text)] transition-all cursor-pointer"
                    >
                      View Profile
                    </button>

                    <button
                      onClick={() => {
                        setEditingBroker(b);
                        setBrokerCommission(b.commissionRate || "85/15 Split");
                        setBrokerTerritory(b.territory || "Greater Toronto Area");
                        setBrokerTier(b.brokerTier || "Tier 1 - Managing Broker");
                        setBrokerNotes(b.adminNotes || "");
                      }}
                      className="px-2.5 py-1.5 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/20 text-[10px] font-bold uppercase rounded-lg text-[var(--color-accent)] transition-all cursor-pointer"
                    >
                      Edit Metrics
                    </button>

                    <button
                      onClick={() => {
                        setAssigningBroker(b);
                        const brokerFullName = `${b.first} ${b.last}`;
                        const currentAssigned = userRoster.filter(u => u.reportingTo === brokerFullName || u.reportingTo === b.id).map(u => u.id);
                        setSelectedAgentIds(currentAssigned);
                      }}
                      className="col-span-2 px-2.5 py-1.5 bg-[var(--color-info)]/10 hover:bg-[var(--color-info)]/20 border border-[var(--color-info)]/20 text-[10px] font-bold uppercase rounded-lg text-[var(--color-info)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Assign Agents to Broker
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 3: ONBOARDING PIPELINE ─── */}
      {activeSubTab === "onboarding" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl flex items-center justify-between shadow-md">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">New Staff Onboarding Pipeline</h3>
              <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">Track setup checklists, mentor assignments, and welcome credentials for pending staff.</p>
            </div>

            <button
              onClick={() => {
                setWizardStep(1);
                setShowWizardModal(true);
              }}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Onboard New Broker Staff
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userRoster.filter(u => (u.status || "").toLowerCase() === "pending").map(pending => {
              const tasks = pending.onboardingTasks || [
                { id: "1", title: "Complete profile in Settings", completed: false },
                { id: "2", title: "Upload profile photo", completed: false },
                { id: "3", title: "Review FSRA compliance documents", completed: false },
                { id: "4", title: "Complete training modules", completed: false },
                { id: "5", title: "Set up 2FA", completed: false }
              ];

              const completedCount = tasks.filter(t => t.completed).length;
              const percent = Math.round((completedCount / tasks.length) * 100);

              return (
                <div key={pending.id} className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${pending.first} ${pending.last}`} src={pending.photo || pending.profilePhoto} size="md" />
                      <div>
                        <h4 className="font-bold text-sm text-[var(--color-text)]">{pending.first} {pending.last}</h4>
                        <p className="text-[10px] text-[var(--color-text-faint)]">{pending.email} • {pending.role}</p>
                      </div>
                    </div>

                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                      Pending Setup
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span className="text-[var(--color-text-faint)]">Onboarding Progress</span>
                      <span className="text-[var(--color-accent)]">{completedCount}/{tasks.length} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-2)] h-2 rounded-full overflow-hidden">
                      <div className="bg-[var(--color-accent)] h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  {/* Onboarding Checklist Tasks */}
                  <div className="bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]/50 space-y-1.5">
                    {tasks.map(t => (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer hover:opacity-80">
                        <input 
                          type="checkbox" 
                          checked={t.completed}
                          onChange={() => {
                            const updatedTasks = tasks.map(item => item.id === t.id ? { ...item, completed: !item.completed } : item);
                            const updatedUser = { ...pending, onboardingTasks: updatedTasks };
                            setUserRoster(prev => prev.map(u => u.id === pending.id ? updatedUser : u));
                            showToast(`Updated checklist for ${pending.first}.`, "success");
                          }}
                          className="cursor-pointer"
                        />
                        <span className={t.completed ? "line-through text-[var(--color-text-faint)]" : "font-medium"}>{t.title}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]/50">
                    <span>Start Date: <strong className="text-[var(--color-text)]">{pending.onboardingStartDate || "Today"}</strong></span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => showToast(`Simulated welcome email sent to ${pending.email}`, "success")}
                        className="text-[var(--color-accent)] font-extrabold uppercase hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Resend Welcome
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {userRoster.filter(u => (u.status || "").toLowerCase() === "pending").length === 0 && (
              <div className="col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-8 rounded-xl text-center text-[var(--color-text-faint)] italic">
                No staff members currently in the onboarding pipeline. Click "Onboard New Broker Staff" above to start the wizard.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 4: CLEARANCE MATRIX ─── */}
      {activeSubTab === "clearance" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">System Clearance Matrix (Levels 1 to 6)</h3>
              <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">Define permission levels across 15 system modules. Presets apply automatically to user roles.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  showToast("Saved Clearance Matrix configurations to global system state.", "success");
                  logActivity("Updated Clearance Matrix", "Reconfigured default clearance level permissions across 15 CRM modules.");
                }}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                Save Matrix Changes
              </button>
            </div>
          </div>

          {/* Role Presets */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)] block">Quick Role Clearance Presets</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_PRESETS).map(([roleName, info]) => (
                <div key={roleName} className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                  <span className="font-bold text-[var(--color-text)]">{roleName}</span>
                  <span className="text-[10px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] px-1.5 py-0.5 rounded font-black uppercase">
                    Level {info.clearanceLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clearance Matrix Table */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider">
                    <th className="p-3.5 w-64">System Module</th>
                    {DEFAULT_CLEARANCE_LEVELS.map(lvl => (
                      <th key={lvl.level} className="p-3.5 text-center min-w-[120px]">
                        <div>Level {lvl.level}</div>
                        <div className="text-[8px] opacity-70 font-normal">{lvl.name.split("-")[1] || ""}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 text-xs">
                  {DEFAULT_MODULE_KEYS.map(mod => (
                    <tr key={mod.key} className="hover:bg-[var(--color-surface-2)]/30 transition-colors">
                      <td className="p-3.5 font-bold text-[var(--color-text)]">
                        <div>{mod.name}</div>
                        <p className="text-[9px] text-[var(--color-text-faint)] font-normal">{mod.description}</p>
                      </td>

                      {DEFAULT_CLEARANCE_LEVELS.map(lvl => {
                        const currentVal = matrixState[lvl.level]?.[mod.key] || "none";

                        return (
                          <td key={lvl.level} className="p-3.5 text-center">
                            <select
                              value={currentVal}
                              onChange={(e) => {
                                const nextVal = e.target.value as PermissionLevel;
                                setMatrixState(prev => ({
                                  ...prev,
                                  [lvl.level]: {
                                    ...prev[lvl.level],
                                    [mod.key]: nextVal
                                  }
                                }));
                              }}
                              className={`text-[10px] font-bold uppercase rounded px-2 py-1 outline-none border cursor-pointer ${
                                currentVal === "manage" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                currentVal === "edit" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                currentVal === "view" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}
                            >
                              <option value="none" className="text-black">None</option>
                              <option value="view" className="text-black">View</option>
                              <option value="edit" className="text-black">Edit</option>
                              <option value="manage" className="text-black">Manage</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: VIEW USER PROFILE CARD ─── */}
      {profileUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden text-left">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">User Profile Dossier: {profileUserModal.first} {profileUserModal.last}</h3>
              </div>
              <button onClick={() => setProfileUserModal(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex items-center gap-4 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)]/50">
                <Avatar name={`${profileUserModal.first} ${profileUserModal.last}`} src={profileUserModal.photo || profileUserModal.profilePhoto} size="lg" />
                <div>
                  <h3 className="text-base font-extrabold text-[var(--color-text)]">{profileUserModal.first} {profileUserModal.last}</h3>
                  <p className="text-xs text-[var(--color-text-faint)]">{profileUserModal.email} • {profileUserModal.phone || "No phone registered"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/20 px-2 py-0.5 rounded font-black uppercase">
                      {profileUserModal.role}
                    </span>
                    <span className="text-[10px] bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/20 px-2 py-0.5 rounded font-black uppercase">
                      Clearance Level {profileUserModal.clearanceLevel || 2}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[var(--color-surface-2)]/50 p-3 rounded-lg border border-[var(--color-border)]/50">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] block">Brokerage</span>
                  <span className="font-extrabold text-[var(--color-text)] mt-0.5 block">{profileUserModal.brokerage || "GBK Financial"}</span>
                </div>

                <div className="bg-[var(--color-surface-2)]/50 p-3 rounded-lg border border-[var(--color-border)]/50">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] block">License Number</span>
                  <span className="font-mono text-[var(--color-accent)] font-bold mt-0.5 block">{profileUserModal.licenseNumber || profileUserModal.fsraNum || "M1900XXXX"}</span>
                </div>

                <div className="bg-[var(--color-surface-2)]/50 p-3 rounded-lg border border-[var(--color-border)]/50">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] block">Account Status</span>
                  <span className="font-extrabold text-emerald-400 mt-0.5 block uppercase">{profileUserModal.status || "active"}</span>
                </div>

                <div className="bg-[var(--color-surface-2)]/50 p-3 rounded-lg border border-[var(--color-border)]/50">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] block">Account Created</span>
                  <span className="font-semibold text-[var(--color-text)] mt-0.5 block">{profileUserModal.created || "2026-01-15"}</span>
                </div>

                <div className="bg-[var(--color-surface-2)]/50 p-3 rounded-lg border border-[var(--color-border)]/50">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] block">Last Active</span>
                  <span className="font-semibold text-[var(--color-text)] mt-0.5 block">{profileUserModal.lastActive || profileUserModal.lastLogin || "Today"}</span>
                </div>

                <div className="bg-[var(--color-surface-2)]/50 p-3 rounded-lg border border-[var(--color-border)]/50">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] block">Workload</span>
                  <span className="font-extrabold text-[var(--color-accent)] mt-0.5 block">
                    {getUserWorkload(profileUserModal).clientCount} Clients
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => {
                    showToast(`Password reset email dispatched to ${profileUserModal.email}.`, "success");
                  }}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
                >
                  Send Password Reset Email
                </button>
                <button
                  onClick={() => setProfileUserModal(null)}
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT USER MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden text-left">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Edit User Permissions: {editingUser.first} {editingUser.last}</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]/50 p-3 rounded-lg text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                ℹ️ <strong>Settings Synchronization:</strong> Name ({editingUser.first} {editingUser.last}), Email ({editingUser.email}), and License # are managed by the user in Settings &gt; My Profile.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Role Group</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                  >
                    <option value="Broker">Broker</option>
                    <option value="Agent">Agent</option>
                    <option value="Admin">Admin</option>
                    <option value="Assistant">Assistant</option>
                    <option value="Developer/Admin">Developer / Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Brokerage / Company</label>
                  <input
                    type="text"
                    value={editBrokerage}
                    onChange={(e) => setEditBrokerage(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Onboarding</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Clearance Level (1 to 6)</label>
                  <select
                    value={editClearance}
                    onChange={(e) => setEditClearance(parseInt(e.target.value))}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer font-bold text-[var(--color-accent)]"
                  >
                    <option value={1}>Level 1 - View Only</option>
                    <option value={2}>Level 2 - Basic User</option>
                    <option value={3}>Level 3 - Power User</option>
                    <option value={4}>Level 4 - Manager</option>
                    <option value={5}>Level 5 - Admin</option>
                    <option value={6}>Level 6 - Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Special Permissions */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-2">Special Permissions Overrides</label>
                <div className="space-y-2 bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]/50">
                  {Object.entries({
                    canExport: "Can Export Roster & Client Data (PDF/CSV)",
                    canManageUsers: "Can Onboard and Manage Staff Users",
                    canAccessAdmin: "Can Access Admin Control Center",
                    canViewReports: "Can Access Pipeline KPI & Financial Reports"
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={!!editSpecialPerms[key]}
                        onChange={(e) => setEditSpecialPerms(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileUserModal(editingUser);
                    setEditingUser(null);
                  }}
                  className="text-xs text-[var(--color-accent)] font-bold uppercase hover:underline cursor-pointer"
                >
                  View Full Profile
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: EDIT BROKER DETAILS ─── */}
      {editingBroker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-left">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Edit Broker Admin Metrics: {editingBroker.first}</h3>
              </div>
              <button onClick={() => setEditingBroker(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveBrokerDetails} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Commission Split / Rate</label>
                <input
                  type="text"
                  value={brokerCommission}
                  onChange={(e) => setBrokerCommission(e.target.value)}
                  placeholder="e.g. 85/15 Split"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Territory / Region</label>
                <input
                  type="text"
                  value={brokerTerritory}
                  onChange={(e) => setBrokerTerritory(e.target.value)}
                  placeholder="e.g. Greater Toronto Area"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Broker Tier / Level</label>
                <select
                  value={brokerTier}
                  onChange={(e) => setBrokerTier(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                >
                  <option value="Tier 1 - Managing Broker">Tier 1 - Managing Broker</option>
                  <option value="Tier 2 - Senior Broker">Tier 2 - Senior Broker</option>
                  <option value="Tier 3 - Associate Broker">Tier 3 - Associate Broker</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Internal Admin Notes</label>
                <textarea
                  value={brokerNotes}
                  onChange={(e) => setBrokerNotes(e.target.value)}
                  placeholder="Private notes regarding quota, agreements, performance..."
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setEditingBroker(null)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
                >
                  Save Metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: ASSIGN AGENTS TO BROKER ─── */}
      {assigningBroker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Assign Reporting Agents: {assigningBroker.first} {assigningBroker.last}</h3>
              </div>
              <button onClick={() => setAssigningBroker(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <span className="text-xs text-[var(--color-text-muted)] block">Select agents that report directly to Managing Broker <strong>{assigningBroker.first} {assigningBroker.last}</strong>:</span>

              <div className="max-h-60 overflow-y-auto space-y-2 bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]/50">
                {userRoster.filter(u => u.id !== assigningBroker.id).map(u => {
                  const isChecked = selectedAgentIds.includes(u.id);

                  return (
                    <label key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-[var(--color-surface-3)] cursor-pointer text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedAgentIds(prev => isChecked ? prev.filter(i => i !== u.id) : [...prev, u.id]);
                          }}
                          className="cursor-pointer"
                        />
                        <span className="font-bold text-[var(--color-text)]">{u.first} {u.last}</span>
                        <span className="text-[10px] text-[var(--color-text-faint)]">({u.role})</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-faint)]">{u.email}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setAssigningBroker(null)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignAgents}
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
                >
                  Save Assignments ({selectedAgentIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: 5-STEP ONBOARD BROKER STAFF WIZARD ─── */}
      {showWizardModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-left">
            
            {/* Stepper Header */}
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[var(--color-accent)]" /> Onboard Broker Staff Wizard
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)]">Step {wizardStep} of 5 - {
                  wizardStep === 1 ? "Basic Information" :
                  wizardStep === 2 ? "Account Setup & Password" :
                  wizardStep === 3 ? "Permissions & Clearance" :
                  wizardStep === 4 ? "Onboarding Checklist & Mentor" :
                  wizardStep === 5 ? "Review & Confirmation" : "Complete!"
                }</p>
              </div>
              <button onClick={() => setShowWizardModal(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            {/* Stepper Progress Bar */}
            {wizardStep <= 5 && (
              <div className="flex border-b border-[var(--color-border)]/50 bg-[var(--color-surface-2)]/40 text-[10px] font-bold uppercase text-[var(--color-text-faint)]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div 
                    key={s} 
                    className={`flex-1 py-2 text-center border-r last:border-r-0 border-[var(--color-border)]/50 ${
                      wizardStep === s ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-extrabold" :
                      wizardStep > s ? "bg-emerald-500/10 text-emerald-400" : ""
                    }`}
                  >
                    {s}. {s === 1 ? "Basic Info" : s === 2 ? "Account" : s === 3 ? "Permissions" : s === 4 ? "Checklist" : "Review"}
                  </div>
                ))}
              </div>
            )}

            <div className="p-6 space-y-4">
              
              {/* STEP 1: BASIC INFORMATION */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">First Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={wizFirst} 
                        onChange={(e) => setWizFirst(e.target.value)} 
                        placeholder="John"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Last Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={wizLast} 
                        onChange={(e) => setWizLast(e.target.value)} 
                        placeholder="Smith"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Work Email Address *</label>
                      <input 
                        type="email" 
                        required 
                        value={wizEmail} 
                        onChange={(e) => {
                          setWizEmail(e.target.value);
                          setWizUsername(e.target.value);
                        }} 
                        placeholder="jsmith@gbkfinancial.ca"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        value={wizPhone} 
                        onChange={(e) => setWizPhone(e.target.value)} 
                        placeholder="(416) 555-0199"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Role Group *</label>
                      <select 
                        value={wizRole} 
                        onChange={(e) => setWizRole(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                      >
                        <option value="Agent">Mortgage Agent</option>
                        <option value="Broker">Mortgage Broker</option>
                        <option value="Assistant">Admin Assistant</option>
                        <option value="Admin">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">FSRA License Number</label>
                      <input 
                        type="text" 
                        value={wizLicense} 
                        onChange={(e) => setWizLicense(e.target.value)} 
                        placeholder="M20009988"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Reporting To (Manager)</label>
                      <select 
                        value={wizReportingTo} 
                        onChange={(e) => setWizReportingTo(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Managing Broker --</option>
                        {userRoster.filter(u => u.role === "Broker" || u.role === "Admin").map(m => (
                          <option key={m.id} value={`${m.first} ${m.last}`}>{m.first} {m.last} ({m.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={wizStartDate} 
                        onChange={(e) => setWizStartDate(e.target.value)} 
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ACCOUNT SETUP */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Username (Email)</label>
                    <input 
                      type="text" 
                      value={wizUsername || wizEmail} 
                      readOnly 
                      className="w-full bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text-faint)] outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Temporary Password</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={wizTempPass} 
                        onChange={(e) => setWizTempPass(e.target.value)} 
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-accent)] font-mono font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setWizTempPass(`GBK-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="px-3 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg text-xs font-bold cursor-pointer shrink-0"
                      >
                        Generate New
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)]/50">
                    <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={wizSendWelcome} 
                        onChange={(e) => setWizSendWelcome(e.target.checked)} 
                        className="cursor-pointer"
                      />
                      <span className="font-bold">Send welcome email with login credentials upon creation</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={wizRequirePassChange} 
                        onChange={(e) => setWizRequirePassChange(e.target.checked)} 
                        className="cursor-pointer"
                      />
                      <span>Require password change on first workstation login</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: PERMISSIONS & ACCESS */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Initial Clearance Level (1 to 6)</label>
                    <select
                      value={wizClearance}
                      onChange={(e) => setWizClearance(parseInt(e.target.value))}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none font-bold text-[var(--color-accent)] cursor-pointer"
                    >
                      <option value={1}>Level 1 - View Only (Read-Only CRM Access)</option>
                      <option value={2}>Level 2 - Basic User (Agent Deal Management)</option>
                      <option value={3}>Level 3 - Power User (Broker AI Processing &amp; Exports)</option>
                      <option value={4}>Level 4 - Manager (Team Management &amp; Assign Leads)</option>
                      <option value={5}>Level 5 - Admin (Full User Roster Management)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-2">Module Access Toggles</label>
                    <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)]/50 max-h-48 overflow-y-auto">
                      {DEFAULT_MODULE_KEYS.map(m => (
                        <label key={m.key} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!wizModuleAccess[m.key]}
                            onChange={(e) => setWizModuleAccess(prev => ({ ...prev, [m.key]: e.target.checked }))}
                            className="cursor-pointer"
                          />
                          <span>{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: ONBOARDING CHECKLIST & MENTOR */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-2">Assign Initial Onboarding Checklist</label>
                    <div className="space-y-2 bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)]/50">
                      {wizChecklist.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-xs text-[var(--color-text)]">
                          <span className="font-medium">{t.title}</span>
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Required</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Assign Onboarding Mentor</label>
                      <select 
                        value={wizMentorId} 
                        onChange={(e) => setWizMentorId(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Senior Mentor --</option>
                        {userRoster.map(u => (
                          <option key={u.id} value={u.id}>{u.first} {u.last} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Probation Period</label>
                      <select 
                        value={wizProbationDays} 
                        onChange={(e) => setWizProbationDays(parseInt(e.target.value))}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                      >
                        <option value={30}>30 Days</option>
                        <option value={60}>60 Days</option>
                        <option value={90}>90 Days</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & CREATE */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <div className="bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)]/50 space-y-3 text-xs">
                    <h4 className="font-extrabold text-[var(--color-accent)] uppercase tracking-wider text-[11px]">User Account Summary</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-[var(--color-text-faint)] block text-[10px]">FULL NAME</span> <strong>{wizFirst} {wizLast}</strong></div>
                      <div><span className="text-[var(--color-text-faint)] block text-[10px]">EMAIL ADDRESS</span> <strong>{wizEmail}</strong></div>
                      <div><span className="text-[var(--color-text-faint)] block text-[10px]">ROLE GROUP</span> <strong>{wizRole}</strong></div>
                      <div><span className="text-[var(--color-text-faint)] block text-[10px]">CLEARANCE LEVEL</span> <strong>Level {wizClearance}</strong></div>
                      <div><span className="text-[var(--color-text-faint)] block text-[10px]">REPORTING TO</span> <strong>{wizReportingTo || "None"}</strong></div>
                      <div><span className="text-[var(--color-text-faint)] block text-[10px]">TEMP PASSWORD</span> <strong className="font-mono text-[var(--color-accent)]">{wizTempPass}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: SUCCESS SCREEN */}
              {wizardStep === 6 && createdUser && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <h3 className="text-base font-extrabold text-[var(--color-text)] uppercase tracking-wider">Staff Account Onboarded Successfully!</h3>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto">
                    Account credentials generated for <strong>{createdUser.first} {createdUser.last}</strong>. The user appears on the Pending Onboarding pipeline list.
                  </p>

                  <div className="bg-[var(--color-surface-2)] p-4 rounded-xl border border-[var(--color-border)]/50 max-w-sm mx-auto text-left text-xs space-y-1 font-mono">
                    <p><strong>Username:</strong> {createdUser.email}</p>
                    <p><strong>Temp Password:</strong> <span className="text-[var(--color-accent)] font-bold">{wizTempPass}</span></p>
                    <p><strong>Security PIN:</strong> {createdUser.pin}</p>
                  </div>

                  <div className="flex justify-center gap-3 pt-4">
                    <button
                      onClick={() => showToast(`Welcome email sent to ${createdUser.email}`, "success")}
                      className="px-4 py-2 bg-[var(--color-accent)] text-white text-xs font-bold uppercase rounded-lg shadow cursor-pointer"
                    >
                      Send Welcome Email
                    </button>
                    <button
                      onClick={() => {
                        setShowWizardModal(false);
                        setProfileUserModal(createdUser);
                      }}
                      className="px-4 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold uppercase rounded-lg cursor-pointer"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Footer Buttons */}
              {wizardStep <= 5 && (
                <div className="flex justify-between items-center pt-4 border-t border-[var(--color-border)]">
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                      className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                    >
                      Back
                    </button>
                  ) : <div />}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWizardModal(false)}
                      className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                    >
                      Cancel
                    </button>

                    {wizardStep < 5 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (wizardStep === 1 && (!wizFirst || !wizLast || !wizEmail)) {
                            showToast("First name, last name, and email are required.", "error");
                            return;
                          }
                          setWizardStep((prev) => (prev + 1) as any);
                        }}
                        className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold uppercase rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        Next Step <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleWizardSubmit}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase rounded-lg shadow-md cursor-pointer"
                      >
                        Create User Account
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: EXPORT OPTIONS MODAL ─── */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-left">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Export Roster Options</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportFormat("pdf")}
                    className={`p-3 rounded-lg border text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      exportFormat === "pdf" ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> PDF Document
                  </button>

                  <button
                    onClick={() => setExportFormat("csv")}
                    className={`p-3 rounded-lg border text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      exportFormat === "csv" ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> CSV Spreadsheet
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Export Scope</label>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value as any)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                >
                  <option value="filtered">Filtered View ({filteredRoster.length} users)</option>
                  <option value="all">Entire Roster ({userRoster.length} users)</option>
                  {selectedUserIds.length > 0 && (
                    <option value="selected">Selected Users ({selectedUserIds.length} users)</option>
                  )}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer pt-2">
                <input 
                  type="checkbox" 
                  checked={includeStats} 
                  onChange={(e) => setIncludeStats(e.target.checked)} 
                  className="cursor-pointer"
                />
                <span>Include Summary Statistics &amp; FSRA Header Banner</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold uppercase rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 7: BULK IMPORT MODAL ─── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
            <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-[var(--color-info)]" />
                <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Bulk Import Staff CSV</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--color-text-muted)]">Paste CSV data below with columns: First, Last, Email, Role, Phone, License.</p>

              <textarea
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder="First,Last,Email,Role,Phone,License&#10;Alice,Jones,ajones@gbk.ca,Agent,(416)555-0101,M2001122"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 text-xs font-mono text-[var(--color-text)] outline-none h-36 resize-none"
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportCsvText("First,Last,Email,Role,Phone,License\nSarah,Connor,sconnor@gbk.ca,Broker,(416) 555-0188,M19004455\nDavid,Miller,dmiller@gbk.ca,Agent,(416) 555-0199,M20008899");
                  }}
                  className="text-xs text-[var(--color-accent)] font-bold uppercase hover:underline cursor-pointer"
                >
                  Insert Sample Data
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!importCsvText.trim()) {
                        showToast("Please enter CSV data.", "error");
                        return;
                      }
                      const lines = importCsvText.trim().split("\n").slice(1);
                      let count = 0;
                      lines.forEach(line => {
                        const parts = line.split(",").map(p => p.trim());
                        if (parts.length >= 3) {
                          const newUser: UserType = {
                            id: `usr_imp_${Date.now()}_${Math.random()}`,
                            first: parts[0] || "Imported",
                            last: parts[1] || "Staff",
                            email: parts[2],
                            role: parts[3] || "Agent",
                            phone: parts[4] || "(416) 555-0100",
                            licenseNumber: parts[5] || "",
                            status: "active",
                            created: new Date().toISOString().split("T")[0],
                            lastLogin: "Never",
                            jobTitle: parts[3] || "Agent",
                            displayName: `${parts[0]} ${parts[1]}`
                          };
                          setUserRoster(prev => [newUser, ...prev]);
                          count++;
                        }
                      });
                      showToast(`Imported ${count} new staff members successfully!`, "success");
                      setShowImportModal(false);
                      setImportCsvText("");
                    }}
                    className="px-5 py-2 bg-[var(--color-accent)] text-white text-xs font-bold uppercase rounded-lg cursor-pointer"
                  >
                    Import Users
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 8: REASSIGN WORKLOAD MODAL ─── */}
      {reassigningUserId && (() => {
        const sourceUser = userRoster.find(u => u.id === reassigningUserId);
        if (!sourceUser) return null;

        const workload = getUserWorkload(sourceUser);
        const eligibleTargets = userRoster.filter(u => u.id !== sourceUser.id && (u.status || "").toLowerCase() === "active");

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-left">
              <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--color-accent)]" />
                  <h3 className="font-bold text-[var(--color-text)] uppercase tracking-wider text-xs">Reassign Staff Workload</h3>
                </div>
                <button onClick={() => setReassigningUserId(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer">✕</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-[var(--color-surface-2)] p-3 rounded-lg border border-[var(--color-border)]/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-[var(--color-text)]">{sourceUser.first} {sourceUser.last}</div>
                    <div className="text-[10px] text-[var(--color-text-faint)]">{sourceUser.role} • {sourceUser.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-xs text-[var(--color-accent)]">{workload.clientCount} Clients • {workload.taskCount} Tasks</div>
                    <div className="text-[10px] text-[var(--color-text-faint)] uppercase font-semibold">Active Workload</div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--color-text-faint)] mb-1">Select Target Active Staff Member</label>
                  <select
                    value={targetReassignId}
                    onChange={(e) => setTargetReassignId(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Target Active Staff Member --</option>
                    {eligibleTargets.map(t => (
                      <option key={t.id} value={t.id}>{t.first} {t.last} ({t.role}) - {t.email}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setReassigningUserId(null)}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-muted)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!targetReassignId}
                    onClick={() => handleReassignUserWorkload(sourceUser.id, targetReassignId)}
                    className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold uppercase rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Confirm Reassignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── SUB-TAB 5: ORGANIZATIONAL CHART ─── */}
      {activeSubTab === "orgchart" && (
        <UserOrgChart 
          users={userRoster} 
          clients={clients} 
          onSelectUser={(u) => setProfileUserModal(u)} 
        />
      )}

      {/* ─── SUB-TAB 6: USER ACTIVITY TIMELINE ─── */}
      {activeSubTab === "activity" && (
        <UserActivityTimeline 
          users={userRoster} 
          showToast={showToast} 
        />
      )}

      {/* ─── MODAL: USER COMPARISON MODAL ─── */}
      {showComparisonModal && (
        <UserComparisonModal
          users={userRoster}
          initialSelectedUserIds={selectedUserIds}
          clients={clients}
          tasks={tasks}
          onClose={() => setShowComparisonModal(false)}
          showToast={showToast}
        />
      )}

      {/* ─── MODAL: USER MERGE TOOL ─── */}
      {showMergeModal && (
        <UserMergeModal
          userRoster={userRoster}
          clients={clients}
          tasks={tasks}
          onClose={() => setShowMergeModal(false)}
          onExecuteMerge={handleExecuteMerge}
          showToast={showToast}
        />
      )}

      {/* ─── MODAL: OFFBOARDING CHECKLIST WORKFLOW ─── */}
      {offboardingUser && (
        <UserOffboardingModal
          offboardingUser={offboardingUser}
          userRoster={userRoster}
          clients={clients}
          tasks={tasks}
          onClose={() => setOffboardingUser(null)}
          onExecuteOffboarding={handleExecuteOffboarding}
          showToast={showToast}
        />
      )}

      {/* ─── MODAL: TAGS & LABELS MANAGER ─── */}
      {showTagsModal && (
        <UserTagsManagerModal
          userRoster={userRoster}
          selectedUserIds={selectedUserIds}
          availableTags={availableTags}
          onUpdateAvailableTags={setAvailableTags}
          onApplyTagsToUsers={handleApplyTagsToUsers}
          onClose={() => setShowTagsModal(false)}
          showToast={showToast}
        />
      )}

    </div>
  );
};
