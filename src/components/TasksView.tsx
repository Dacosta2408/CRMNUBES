import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  motion, AnimatePresence 
} from "motion/react";
import { 
  CheckSquare, Plus, Trash2, Edit3, X, Sparkles, User, 
  AlertTriangle, Check, RefreshCw, Calendar, ListFilter, 
  SlidersHorizontal, Radio, Layers, Folder, CheckCircle, 
  Clock, Play, ArrowRight, UserCheck, Star, Activity, PlusCircle,
  TrendingUp, Compass, ArrowLeftRight, CheckSquare2, FileText, Bell, Link2, Info
} from "lucide-react";
import { Task, Client, Event } from "../types";

// Extended Task typing to support rich operational characteristics
export interface ExtendedTask extends Task {
  category?: string; // e.g. "Client Follow-up"
  dueTime?: string; // e.g. "14:00"
  reminder?: string; // e.g. "15m before"
  subtasks?: { id: string; title: string; done: boolean }[];
  auditLogs?: { timestamp: string; action: string; user: string }[];
  extendedStatus?: 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled';
  calendarSync?: boolean; // toggle to push/pull to/from team calendar
}

interface TasksViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  clients: Client[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  events?: Event[];
  setEvents?: React.Dispatch<React.SetStateAction<Event[]>>;
  userRoster?: any[];
  currentUser?: any;
}

export const TASK_CATEGORIES = [
  { value: "Client Follow-up", color: "bg-[var(--color-warning)]", border: "border-[var(--color-warning)]/25", text: "text-amber-700 dark:text-[var(--color-warning)]", lightBg: "bg-[var(--color-warning-subtle)]", glow: "shadow-[0_0_12px_rgba(200,146,42,0.15)]" },
  { value: "Document Collection", color: "bg-teal-500", border: "border-teal-500/25", text: "text-teal-700 dark:text-teal-400", lightBg: "bg-teal-500/10", glow: "shadow-[0_0_12px_rgba(20,184,166,0.15)]" },
  { value: "Lender Follow-up", color: "bg-cyan-500", border: "border-cyan-500/25", text: "text-cyan-700 dark:text-cyan-400", lightBg: "bg-cyan-500/10", glow: "shadow-[0_0_12px_rgba(6,182,212,0.15)]" },
  { value: "Underwriting Review", color: "bg-rose-500", border: "border-rose-500/25", text: "text-rose-700 dark:text-rose-400", lightBg: "bg-rose-500/10", glow: "shadow-[0_0_12px_rgba(244,63,94,0.15)]" },
  { value: "Compliance", color: "bg-emerald-500", border: "border-emerald-500/25", text: "text-emerald-700 dark:text-emerald-400", lightBg: "bg-emerald-500/10", glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]" },
  { value: "Appointment", color: "bg-amber-600", border: "border-amber-600/25", text: "text-amber-800 dark:text-amber-400", lightBg: "bg-amber-600/10", glow: "shadow-[0_0_12px_rgba(217,119,6,0.15)]" },
  { value: "Internal Admin", color: "bg-[#8e95a3]", border: "border-[#8e95a3]/25", text: "text-slate-700 dark:text-slate-400", lightBg: "bg-[#8e95a3]/10", glow: "shadow-[0_0_12px_rgba(142,149,163,0.15)]" },
  { value: "Renewal", color: "bg-blue-500", border: "border-blue-500/25", text: "text-blue-700 dark:text-blue-400", lightBg: "bg-blue-500/10", glow: "shadow-[0_0_12px_rgba(59,130,246,0.15)]" },
  { value: "Retention", color: "bg-orange-500", border: "border-orange-500/25", text: "text-orange-700 dark:text-orange-400", lightBg: "bg-orange-500/10", glow: "shadow-[0_0_12px_rgba(249,115,22,0.15)]" },
  { value: "Partner Follow-up", color: "bg-sky-500", border: "border-sky-500/25", text: "text-sky-700 dark:text-sky-400", lightBg: "bg-sky-500/10", glow: "shadow-[0_0_12px_rgba(14,165,233,0.15)]" }
];

export const PRIORITY_SCHEME = {
  urgent: { label: "Urgent 🌋", text: "text-[var(--color-error)]", border: "border-[var(--color-error)]/30", bg: "bg-[var(--color-error-subtle)]" },
  high: { label: "High 🌋", text: "text-[var(--color-warning)]", border: "border-[var(--color-warning)]/30", bg: "bg-[var(--color-warning-subtle)]" },
  medium: { label: "Medium ⚠️", text: "text-blue-400", border: "border-blue-300/25", bg: "bg-blue-500/10" },
  low: { label: "Low ☕", text: "text-slate-400", border: "border-slate-500/25", bg: "bg-slate-500/10" }
};

export const CHECKLIST_TEMPLATES = [
  {
    name: "Lender Pre-submission Checklist",
    desc: "Verify baseline qualifications before file dispatch.",
    tasks: [
      "Confirm mortgage loan application fields filled out",
      "Verify stated borrower income against T4/NOA records",
      "Review debts, liabilities, and monthly payments ledger",
      "Validate appraisal property details & valuation matches",
      "Check credit bureau report beacon score and liabilities",
      "Draft customized broker explanation note for lender"
    ]
  },
  {
    name: "Lender Condition Set Resolution",
    desc: "Process and satisfy commitment prerequisites.",
    tasks: [
      "Request recent electronic paystubs or contract letter",
      "Gather 90-day bank history for down payment tracing",
      "Review and verify and sign disclosures package",
      "Email scanned proof documentation to lender underwriter",
      "Follow up with BDM of the lending bank to expedite review"
    ]
  },
  {
    name: "Closing & Verification Actions",
    desc: "Coordinate funding instructions and client onboarding.",
    tasks: [
      "Confirm signing agent appointment and setup time",
      "Collect and upload legal attorney instructions letter",
      "Notify real estate partner BDM on closing process",
      "Collect pre-authorized payment form for automated routing",
      "Log completed transaction details in system repository"
    ]
  }
];

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  setTasks,
  clients,
  showToast,
  events,
  setEvents,
  userRoster = [],
  currentUser
}) => {
  const activeUserName = currentUser ? `${currentUser.first} ${currentUser.last}` : "David Acosta";

  // Navigation filters and active layouts
  const [currentGroup, setCurrentGroup] = useState<"me" | "team">("me"); // Assignee mode switcher
  const [activeFilter, setActiveFilter] = useState<string>("all"); // all, today, upcoming, overdue, done, or category values
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>(""); // specific client file tie
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "status">("dueDate");
  const [viewLayout, setViewLayout] = useState<"list" | "board" | "checklist">("list"); // Visual mode toggle

  // Selected Detail Workspace object
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Modal create workflow trigger
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Form states on New Task
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Client Follow-up");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newDueDate, setNewDueDate] = useState("2026-06-22"); // June 2026 default to align are context
  const [newDueTime, setNewDueTime] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newReminder, setNewReminder] = useState("none");
  const [newCalendarSync, setNewCalendarSync] = useState(true);
  const [newAssignedTo, setNewAssignedTo] = useState(activeUserName);

  // Helper inside checklist builder
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Audit Logs output
  const [newAuditLogMsg, setNewAuditLogMsg] = useState("");

  // Current date boundary helper
  const todayStr = "2026-06-22";

  const initialSelectionDone = useRef(false);

  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const clientSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientSelectorRef.current && !clientSelectorRef.current.contains(event.target as Node)) {
        setIsClientSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const hh = hour.toString().padStart(2, "0");
        const mm = min.toString().padStart(2, "0");
        const val = `${hh}:${mm}`;
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const displayMin = mm;
        const label = `${displayHour}:${displayMin} ${period}`;
        options.push({ value: val, label });
      }
    }
    return options;
  }, []);

  // Gracefully parsing and state sanitizing tasks for operational safety
  const sanitizedTasks = useMemo<ExtendedTask[]>(() => {
    return tasks.map(t => {
      const audit = (t as any).auditLogs || [
        { timestamp: t.createdAt || new Date().toISOString(), action: "Task registered in system", user: t.createdBy || "System" }
      ];
      return {
        ...t,
        category: (t as any).category || "Client Follow-up",
        dueTime: (t as any).dueTime || "",
        reminder: (t as any).reminder || "none",
        subtasks: (t as any).subtasks || [],
        auditLogs: audit,
        extendedStatus: (t as any).extendedStatus || (t.status === "done" ? "done" : "todo"),
        calendarSync: (t as any).calendarSync !== undefined ? (t as any).calendarSync : true
      };
    });
  }, [tasks]);

  const selectedTask = useMemo<ExtendedTask | null>(() => {
    if (!selectedTaskId) return null;
    return sanitizedTasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, sanitizedTasks]);

  // Overall statistics
  const stats = useMemo(() => {
    const list = sanitizedTasks;
    const total = list.length;
    const completed = list.filter(t => t.extendedStatus === "done").length;
    const active = total - completed;
    const urgentCount = list.filter(t => t.extendedStatus !== "done" && t.priority === "high").length;
    const overdue = list.filter(t => t.extendedStatus !== "done" && t.dueDate && t.dueDate < todayStr).length;
    const inProgress = list.filter(t => t.extendedStatus === "in_progress").length;
    const waiting = list.filter(t => t.extendedStatus === "waiting").length;

    return { total, completed, active, urgentCount, overdue, inProgress, waiting };
  }, [sanitizedTasks]);

  // Handle bidirectional sync with team calendar
  const syncToCalendarAction = (task: ExtendedTask, eventsList?: Event[]) => {
    if (!setEvents) return;
    const isSyncEnabled = task.calendarSync !== false;

    if (!isSyncEnabled || !task.dueDate || task.extendedStatus === "cancelled") {
      // Remove calendar event
      setEvents(prev => prev.filter(e => e.id !== `ev_task_${task.id}`));
      return;
    }

    // Determine category type representation
    let eventType: 'client' | 'lender' | 'meeting' | 'personal' | 'holiday' | 'birthday' = 'personal';
    if (task.category === "Lender Follow-up" || task.category === "Underwriting Review") {
      eventType = "lender";
    } else if (task.category === "Client Follow-up" || task.category === "Document Collection" || task.category === "Retention") {
      eventType = "client";
    } else if (task.category === "Appointment") {
      eventType = "meeting";
    }

    // Task text layout changes if finished
    const prefix = task.extendedStatus === "done" ? "✓ [COMPLETED TASK]" : "[TASK]";
    const calendarEvent: Event = {
      id: `ev_task_${task.id}`,
      title: `${prefix} ${task.title}`,
      date: task.dueDate,
      time: task.dueTime || undefined,
      type: eventType,
      reminder: task.reminder !== "none" ? task.reminder : undefined,
      clientId: task.clientId || null,
      notes: task.notes || `Daily Task resolution folder. Category: ${task.category}`,
      createdBy: task.createdBy || "David Acosta"
    };

    setEvents(prev => {
      const filtered = prev.filter(e => e.id !== calendarEvent.id);
      return [...filtered, calendarEvent];
    });
  };

  // Safe wrapper to write array back to App state while carrying extended properties safely
  const updateTasksListState = (updater: (prev: ExtendedTask[]) => ExtendedTask[]) => {
    setTasks(prev => {
      const extendedPrev = prev.map(t => {
        // preserve standard fields or existing extended fields
        const et = t as ExtendedTask;
        return {
          ...et,
          category: et.category || "Client Follow-up",
          dueTime: et.dueTime || "",
          reminder: et.reminder || "none",
          subtasks: et.subtasks || [],
          auditLogs: et.auditLogs || [{ timestamp: t.createdAt, action: "Task system initialized", user: t.createdBy }],
          extendedStatus: et.extendedStatus || (t.status === "done" ? "done" : "todo"),
          calendarSync: et.calendarSync !== undefined ? et.calendarSync : true
        };
      });
      const updated = updater(extendedPrev);

      // Save to localStorage just like App.tsx does to avoid desync
      localStorage.setItem("gbk_tasks", JSON.stringify(updated));
      return updated as any;
    });
  };

  // Sync details on start
  useEffect(() => {
    if (!initialSelectionDone.current && sanitizedTasks.length > 0 && selectedTaskId === null) {
      // Find first outstanding item
      const firstActive = sanitizedTasks.find(t => t.extendedStatus !== "done");
      if (firstActive) {
        setSelectedTaskId(firstActive.id);
        initialSelectionDone.current = true;
      }
    }
  }, [sanitizedTasks, selectedTaskId]);

  const handleToggleTaskCheckbox = (taskId: string) => {
    updateTasksListState(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentlyDone = t.extendedStatus === "done";
        const nextStatus = currentlyDone ? "todo" : "done";
        const updatedTask: ExtendedTask = {
          ...t,
          status: nextStatus === "done" ? "done" : "open",
          extendedStatus: nextStatus,
          completedAt: nextStatus === "done" ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
          auditLogs: [
            ...(t.auditLogs || []),
            { 
              timestamp: new Date().toISOString(), 
              action: `Task marked ${nextStatus === "done" ? 'Completed ✅' : 'Outstanding ⚠️'}`, 
              user: activeUserName 
            }
          ]
        };
        showToast(
          nextStatus === "done" ? "Task completed! Excellent work." : "Action record reopened for follow-up.", 
          "success", 
          nextStatus === "done" ? "✓" : "↩"
        );
        // Sync to calendar
        setTimeout(() => syncToCalendarAction(updatedTask), 50);
        return updatedTask;
      }
      return t;
    }));
  };

  const handleRemoveTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId) as ExtendedTask | undefined;
    if (!taskToDelete) return;

    if (window.confirm("Are you sure you want to delete this Daily Task from the portfolio and any assigned schedules?")) {
      // Clear selectedTaskId if the deleted task was currently selected
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }

      setTasks(prev => {
        const filtered = prev.filter(t => t.id !== taskId);
        localStorage.setItem("gbk_tasks", JSON.stringify(filtered));
        return filtered;
      });

      // If calendar sync is enabled for that task, ensure any linked synced event is also removed using the existing task/calendar sync pattern.
      const isSyncEnabled = taskToDelete.calendarSync !== false;
      if (isSyncEnabled && setEvents) {
        setEvents(prev => prev.filter(e => e.id !== `ev_task_${taskId}`));
      }

      showToast("Daily task cleanly removed from CRM logs.", "info", "🗑️");
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast("Please write a task description or action item.", "error", "⚠️");
      return;
    }

    const linkedClient = clients.find(c => c.id === selectedClientId);
    const taskId = `task_${Date.now()}`;

    const activeUserName = currentUser ? `${currentUser.first} ${currentUser.last}` : "David Acosta";

    const newTask: ExtendedTask = {
      id: taskId,
      title: newTitle.trim(),
      status: "open",
      extendedStatus: "todo",
      priority: newPriority,
      category: newCategory,
      dueDate: newDueDate || undefined,
      dueTime: newDueTime || undefined,
      clientId: selectedClientId || undefined,
      clientName: linkedClient ? `${linkedClient.first} ${linkedClient.last}` : undefined,
      assignedTo: newAssignedTo || activeUserName,
      notes: newNotes.trim() || undefined,
      reminder: newReminder,
      calendarSync: newCalendarSync,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: activeUserName,
      subtasks: [],
      auditLogs: [
        { timestamp: new Date().toISOString(), action: "Daily Task manually created", user: activeUserName }
      ]
    };

    updateTasksListState(prev => [newTask, ...prev]);
    showToast("Daily Task successfully logged on portfolio workflow!", "success", "✓");

    // Sync to Calendar if enabled
    if (newCalendarSync && newDueDate) {
      setTimeout(() => syncToCalendarAction(newTask), 50);
    }

    // Select the newly created task immediately
    setSelectedTaskId(taskId);

    // Reset simple form triggers
    setNewTitle("");
    setNewNotes("");
    setNewDueTime("");
    setSelectedClientId("");
    setIsAddingTask(false);
  };

  // Detail panel update handlers
  const handleUpdateTaskDetail = (updated: Partial<ExtendedTask>) => {
    if (!selectedTaskId) return;
    updateTasksListState(prev => prev.map(t => {
      if (t.id === selectedTaskId) {
        const merged: ExtendedTask = {
          ...t,
          ...updated,
          status: updated.extendedStatus === "done" ? "done" : "open",
          updatedAt: new Date().toISOString()
        };
        // Log changes
        const currentAudit = merged.auditLogs || [];
        const changeKeys = Object.keys(updated).filter(k => k !== "auditLogs");
        if (changeKeys.length > 0) {
          const actionText = `Updated attributes: ${changeKeys.map(k => `${k} to "${(merged as any)[k]}"`).join(", ")}`;
          merged.auditLogs = [...currentAudit, { timestamp: new Date().toISOString(), action: actionText, user: activeUserName }];
        }
        
        // Sync immediately with calendar events
        setTimeout(() => syncToCalendarAction(merged), 50);
        return merged;
      }
      return t;
    }));
  };

  // Adds a comment/audit trail manually
  const handleAddAuditLogComment = () => {
    if (!selectedTask || !newAuditLogMsg.trim()) return;
    const currentAudit = selectedTask.auditLogs || [];
    const updatedLogs = [
      ...currentAudit,
      { timestamp: new Date().toISOString(), action: `Outcome recorded: ${newAuditLogMsg.trim()}`, user: activeUserName }
    ];
    handleUpdateTaskDetail({ auditLogs: updatedLogs });
    setNewAuditLogMsg("");
    showToast("Outcome note logged to audit log.", "success", "📝");
  };

  // Add subtasks
  const handleAddSubtask = () => {
    if (!selectedTask || !newSubtaskText.trim()) return;
    const currentSubs = selectedTask.subtasks || [];
    const updatedSubs = [
      ...currentSubs,
      { id: `sub_${Date.now()}`, title: newSubtaskText.trim(), done: false }
    ];
    
    // audit
    const currentAudit = selectedTask.auditLogs || [];
    const updatedLogs = [
      ...currentAudit,
      { timestamp: new Date().toISOString(), action: `Subtask added: "${newSubtaskText.trim()}"`, user: activeUserName }
    ];

    handleUpdateTaskDetail({ 
      subtasks: updatedSubs, 
      auditLogs: updatedLogs
    });

    setNewSubtaskText("");
  };

  const handleToggleSubtask = (subId: string) => {
    if (!selectedTask) return;
    const currentSubs = selectedTask.subtasks || [];
    const updatedSubs = currentSubs.map(s => {
      if (s.id === subId) {
        return { ...s, done: !s.done };
      }
      return s;
    });

    // audit log details
    const toggled = currentSubs.find(s => s.id === subId);
    const logAction = toggled 
      ? `Completed checklist item: "${toggled.title}"`
      : "Updated checklist condition status";

    const currentAudit = selectedTask.auditLogs || [];
    const updatedLogs = [
      ...currentAudit,
      { timestamp: new Date().toISOString(), action: logAction, user: activeUserName }
    ];

    handleUpdateTaskDetail({ 
      subtasks: updatedSubs,
      auditLogs: updatedLogs
    });
  };

  const handleRemoveSubtask = (subId: string) => {
    if (!selectedTask) return;
    const currentSubs = selectedTask.subtasks || [];
    const updatedSubs = currentSubs.filter(s => s.id !== subId);
    handleUpdateTaskDetail({ subtasks: updatedSubs });
  };

  // Applying pre-build checklists templates
  const handleApplyChecklistTemplate = (templateIndex: number) => {
    if (!selectedTask) return;
    const template = CHECKLIST_TEMPLATES[templateIndex];
    if (!template) return;

    const formattedSubs = template.tasks.map((taskStr, offset) => ({
      id: `sub_tmpl_${Date.now()}_${offset}`,
      title: taskStr,
      done: false
    }));

    const currentAudit = selectedTask.auditLogs || [];
    const updatedLogs = [
      ...currentAudit,
      { timestamp: new Date().toISOString(), action: `Applied operational template: "${template.name}"`, user: activeUserName }
    ];

    handleUpdateTaskDetail({
      subtasks: formattedSubs,
      auditLogs: updatedLogs
    });
    showToast(`Template checklist successfully applied!`, "success", "✓");
  };

  // Interactive filtering of feed items
  const sortedAndFilteredTasks = useMemo(() => {
    return sanitizedTasks
      .filter(t => {
        // Query filter
        const lowerQ = searchQuery.toLowerCase();
        const matchesQuery = searchQuery === "" || 
          t.title.toLowerCase().includes(lowerQ) ||
          (t.clientName || "").toLowerCase().includes(lowerQ) ||
          (t.notes || "").toLowerCase().includes(lowerQ) ||
          (t.category || "").toLowerCase().includes(lowerQ);

        if (!matchesQuery) return false;

        // Group filters for "Me" tasks
        if (currentGroup === "me" && t.assignedTo !== "David Acosta") {
          return false;
        }

        // Deal client filters
        if (selectedClientFilter !== "" && t.clientId !== selectedClientFilter) {
          return false;
        }

        // View filter rules
        if (activeFilter === "today") {
          return t.extendedStatus !== "done" && t.dueDate === todayStr;
        }
        if (activeFilter === "upcoming") {
          return t.extendedStatus !== "done" && t.dueDate && t.dueDate > todayStr;
        }
        if (activeFilter === "overdue") {
          return t.extendedStatus !== "done" && t.dueDate && t.dueDate < todayStr;
        }
        if (activeFilter === "done") {
          return t.extendedStatus === "done";
        }
        if (activeFilter === "in_progress") {
          return t.extendedStatus === "in_progress";
        }
        if (activeFilter === "waiting") {
          return t.extendedStatus === "waiting";
        }
        
        // Category filters
        const matchingCategory = TASK_CATEGORIES.some(ct => ct.value === activeFilter);
        if (matchingCategory) {
          return t.category === activeFilter;
        }

        // Default: outstanding / non-completed
        if (activeFilter === "all") {
          return true; // show all
        }

        return t.extendedStatus !== "done";
      })
      .sort((a, b) => {
        if (sortBy === "status") {
          return (a.extendedStatus || "").localeCompare(b.extendedStatus || "");
        }
        if (sortBy === "priority") {
          const order = { urgent: 1, high: 2, medium: 3, low: 4 };
          const pA = order[a.priority as "high" | "medium" | "low" || "medium"] || 3;
          const pB = order[b.priority as "high" | "medium" | "low" || "medium"] || 3;
          return pA - pB;
        }
        // default: dueDate first
        const dateA = a.dueDate || "9999-12-31";
        const dateB = b.dueDate || "9999-12-31";
        return dateA.localeCompare(dateB);
      });
  }, [sanitizedTasks, activeFilter, searchQuery, sortBy, currentGroup, selectedClientFilter]);

  // Color finder helper matching the legend
  const getCategoryColorSchema = (catName: string | undefined) => {
    return TASK_CATEGORIES.find(c => c.value === catName) || {
      color: "bg-slate-400",
      border: "border-slate-500/25",
      text: "text-slate-400",
      lightBg: "bg-slate-500/10",
      glow: ""
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-surface)] min-h-0 select-none text-left" id="broker-daily-tasks-workspace">
      
      {/* ✦ UPPER NAVIGATION HEADER WITH LIVE MONITORING DETAILS ✦ */}
      <div className="p-4 border-b border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 select-none">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] font-mono mb-1">
            <span>ONTARIO MORTGAGE WORKFLOW ENGINE</span>
            <span className="h-1.5 w-1.5 bg-[var(--color-calendar-selected-bg)] rounded-full animate-pulse" />
            <span className="text-[var(--color-calendar-selected-bg)] text-[9.5px] uppercase tracking-wider font-extrabold">Active Portfolio Control Panel</span>
          </div>
          <h1 className="text-xl font-black text-[var(--color-text)] flex items-center gap-2">
            <CheckSquare2 className="w-5 h-5 text-[var(--color-calendar-selected-bg)]" />
            Brokerage Task Command Center
          </h1>
        </div>

        {/* Quick Assignee Switchers */}
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-1 rounded-xl flex items-center shrink-0">
            <button
              onClick={() => setCurrentGroup("me")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentGroup === "me" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <User className="w-3.5 h-3.5" /> My Tasks
            </button>
            <button
              onClick={() => setCurrentGroup("team")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentGroup === "team" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Team Board
            </button>
          </div>

          <button
            onClick={() => setIsAddingTask(true)}
            className="px-4 py-2 bg-[var(--color-calendar-selected-bg)] hover:opacity-90 text-[var(--color-calendar-selected-text)] font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[var(--color-calendar-selected-text)]" /> Log Daily Item
          </button>
        </div>
      </div>

      {/* ✦ 3-COLUMN LAYOUT MAIN IMPLEMENTATION ✦ */}
      <div className="flex-grow flex flex-col xl:flex-row h-full min-h-0 divide-y xl:divide-y-0 xl:divide-x divide-[var(--color-border)]/50">
        
        {/* ========================================================= */}
        {/* COLUMN 1: LEFT FILTERS, STATS & CATEGORIES INDEX (WIDTH 80) */}
        {/* ========================================================= */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col min-h-0 bg-[var(--color-surface)]/40 overflow-y-auto p-4 space-y-4 select-none">
          
          {/* Section A: Live urgencies parameters */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div 
              onClick={() => setActiveFilter("today")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeFilter === "today" ? "bg-[var(--color-error-subtle)] border-[var(--color-error)]/30" : "bg-[var(--color-surface)] border-[var(--color-border)]/70 hover:bg-[var(--color-surface-2)]/40"
              }`}
            >
              <span className="text-[9px] text-[var(--color-error)] font-bold block uppercase tracking-wider mb-1">Today Due</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-[var(--color-error)]">{sanitizedTasks.filter(t => t.extendedStatus !== "done" && t.dueDate === todayStr).length}</span>
                <span className="text-[8.5px] text-[var(--color-text-faint)] font-medium">outstanding</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveFilter("overdue")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeFilter === "overdue" ? "bg-[var(--color-warning-subtle)] border-[var(--color-warning)]/30" : "bg-[var(--color-surface)] border-[var(--color-border)]/70 hover:bg-[var(--color-surface-2)]/40"
              }`}
            >
              <span className="text-[9px] text-[var(--color-warning)] font-bold block uppercase tracking-wider mb-1">Overdue alert</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-[var(--color-warning)]">{stats.overdue}</span>
                <span className="text-[8.5px] text-[var(--color-text-faint)] font-medium">unresolved</span>
              </div>
            </div>
          </div>

          {/* Section B: Dynamic Navigation List of Status filters */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3 shrink-0">
            <span className="text-[10px] font-black text-[var(--color-text-faint)] uppercase tracking-widest block mb-2.5 px-1.5">Agenda Status Folders</span>
            <div className="space-y-1">
              {[
                { id: "all", label: "Outstanding Backlog", count: sanitizedTasks.filter(t => t.extendedStatus !== "done").length, icon: Radio },
                { id: "in_progress", label: "In Active Progress", count: stats.inProgress, icon: Activity },
                { id: "waiting", label: "Waiting On Documents", count: stats.waiting, icon: Clock },
                { id: "done", label: "Resolved / Archived", count: stats.completed, icon: CheckCircle }
              ].map(sub => {
                const isSel = activeFilter === sub.id;
                const IconComp = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setActiveFilter(sub.id);
                      setSelectedClientFilter("");
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border text-[11px] font-bold transition-all ${
                      isSel 
                        ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)]" 
                        : "bg-transparent border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <IconComp className="w-3.5 h-3.5" />
                      {sub.label}
                    </span>
                    <span className="font-mono text-[10px] opacity-60">({sub.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section C: Client File Search Selector */}
          <div ref={clientSelectorRef} className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3 shrink-0 relative" id="client-search-selector-container">
            <span className="text-[10px] font-black text-[var(--color-text-faint)] uppercase tracking-widest block mb-2 px-1.5">View By Client File</span>
            
            {/* Selected Client Indicator / Dropdown Trigger */}
            <div className="relative">
              {selectedClientFilter ? (
                <div className="flex items-center justify-between bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl px-3 py-2 text-xs text-[var(--color-primary)] font-bold">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {(() => {
                        const selClient = clients.find(c => c.id === selectedClientFilter);
                        return selClient ? `${selClient.first} ${selClient.last}` : "Unknown Client";
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientFilter("");
                        setClientSearchQuery("");
                      }}
                      className="p-1 hover:bg-[var(--color-primary)]/20 rounded text-[var(--color-primary)] shrink-0 transition-colors"
                      title="Clear selection"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsClientSelectorOpen(!isClientSelectorOpen)}
                      className="p-1 hover:bg-[var(--color-primary)]/20 rounded text-[var(--color-primary)] shrink-0 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsClientSelectorOpen(!isClientSelectorOpen)}
                  className="w-full flex items-center justify-between bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 hover:border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-muted)] font-bold transition-all text-left"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-faint)]" />
                    <span>-- All Active Client Files --</span>
                  </span>
                  <Compass className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-faint)]" />
                </button>
              )}

              {/* Dropdown search container */}
              {isClientSelectorOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-[var(--color-surface)] border border-[var(--color-border)]/95 rounded-xl shadow-2xl z-50 p-2 space-y-1.5 max-h-60 flex flex-col">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search client name..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg pl-8 pr-7 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary)]/40 font-bold"
                      autoFocus
                    />
                    <FileText className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setClientSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto flex-1 space-y-0.5 max-h-40 pr-1">
                    {/* Reset Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientFilter("");
                        setClientSearchQuery("");
                        setIsClientSelectorOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] flex items-center justify-between"
                    >
                      <span>-- All Active Client Files --</span>
                      {selectedClientFilter === "" && <Check className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
                    </button>

                    {(() => {
                      const filteredClients = clients.filter(c => {
                        const fullName = `${c.first} ${c.last}`.toLowerCase();
                        return fullName.includes(clientSearchQuery.toLowerCase());
                      });

                      if (filteredClients.length === 0) {
                        return (
                          <div className="text-[10px] text-[var(--color-text-faint)] text-center py-3">
                            No matching clients found
                          </div>
                        );
                      }

                      return filteredClients.map(c => {
                        const clientTaskCount = sanitizedTasks.filter(t => t.clientId === c.id && t.extendedStatus !== "done").length;
                        const isSelected = selectedClientFilter === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedClientFilter(c.id);
                              setActiveFilter("all"); // release standard filters to show client ones
                              setIsClientSelectorOpen(false);
                              setClientSearchQuery("");
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between ${
                              isSelected 
                                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" 
                                : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                            }`}
                          >
                            <span className="truncate">{c.first} {c.last}</span>
                            <span className="text-[9px] text-[var(--color-text-faint)] font-mono shrink-0">
                              ({clientTaskCount} remaining)
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section D: Category color codes matching legend */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3 flex-1 flex flex-col min-h-0">
            <span className="text-[10.5px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 flex items-center gap-1.5 px-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" /> 
              Color Coded Groups
            </span>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 select-none">
              {TASK_CATEGORIES.map(et => {
                const count = sanitizedTasks.filter(t => t.category === et.value).length;
                const activeCount = sanitizedTasks.filter(t => t.category === et.value && t.extendedStatus !== "done").length;
                const isSelected = activeFilter === et.value;
                return (
                  <button
                    key={et.value}
                    onClick={() => {
                      setActiveFilter(et.value);
                      setSelectedClientFilter("");
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left border text-[11.5px] font-bold transition-all ${
                      isSelected 
                        ? `${et.lightBg} ${et.border} ${et.text}` 
                        : "bg-transparent border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/50 hover:text-[var(--color-text)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${et.color} ${et.glow} shrink-0`} />
                      <span className="truncate">{et.value}</span>
                    </span>
                    <span className="font-mono text-[9px] opacity-50 shrink-0">
                      ({activeCount}/{count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: CENTER TASK FLOW CANVAS & LAYOUTS (WEIGHT FLEX-1) */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg)]">
          
          {/* Sub-Header view layout selectors and search filter bar */}
          <div className="p-3 border-b border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 select-none">
            {/* Visual layouts selector segment */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-1 rounded-xl flex items-center shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setViewLayout("list")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewLayout === "list" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" /> Pipeline Feed
              </button>
              <button
                onClick={() => setViewLayout("board")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewLayout === "board" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <Compass className="w-3.5 h-3.5" /> Action Board
              </button>
              <button
                onClick={() => setViewLayout("checklist")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewLayout === "checklist" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <CheckSquare2 className="w-3.5 h-3.5" /> Checklist Focus
              </button>
            </div>

            {/* Sorting, Searching utilities */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-44">
                <input
                  type="text"
                  placeholder="Query actions ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl pl-3 pr-8 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 w-full focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl px-2 py-1.5 text-xs text-[var(--color-text-muted)] focus:outline-none font-bold"
              >
                <option value="dueDate">🎯 Date Due</option>
                <option value="priority">🔥 Risk Level</option>
                <option value="status">📂 Task Status</option>
              </select>
            </div>
          </div>

          {/* Active workflow feed list container */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            
            {/* Visual Null State */}
            {sortedAndFilteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--color-border)]/70 rounded-2xl bg-[var(--color-surface-2)]/15 select-none">
                <CheckSquare className="text-[var(--color-text)]/10 w-12 h-12 mb-3" />
                <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-widest">No matching actions</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] max-w-sm mt-1.5 leading-relaxed">
                  Your pipeline is clear! There are no unresolved action requests matching active filters inside this workspace.
                </p>
                {selectedClientFilter && (
                  <button 
                    onClick={() => setSelectedClientFilter("")}
                    className="mt-4 px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-surface-2)] rounded-lg text-[10px] text-[var(--color-primary)] font-black uppercase hover:bg-[var(--color-surface-3)] transition-colors"
                  >
                    Clear Client Filter
                  </button>
                )}
              </div>
            ) : (
              
              /* RENDER CASE 1: STANDARD PIPELINE LIST FEED */
              viewLayout === "list" && (
                <div className="space-y-2.5">
                  {sortedAndFilteredTasks.map(tk => {
                    const isSelected = selectedTaskId === tk.id;
                    const isCompleted = tk.extendedStatus === "done";
                    const isOverdue = !isCompleted && tk.dueDate && tk.dueDate < todayStr;
                    const isUrgent = tk.priority === "high";

                    const badge = getCategoryColorSchema(tk.category);
                    const subtaskCount = tk.subtasks?.length || 0;
                    const subtaskDone = tk.subtasks?.filter(s => s.done).length || 0;
                    const progressPercent = subtaskCount > 0 ? Math.round((subtaskDone / subtaskCount) * 100) : 0;

                    return (
                      <div
                        key={tk.id}
                        onClick={() => setSelectedTaskId(tk.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 text-left ${
                          isSelected 
                            ? "bg-[var(--color-surface-2)] border-[var(--color-border)] ring-1 ring-[var(--color-calendar-selected-bg)]/45 shadow-xl" 
                            : isCompleted 
                              ? "bg-[var(--color-surface-2)]/30 border-[var(--color-border)]/70 opacity-55 hover:opacity-80" 
                              : "bg-[var(--color-surface)] border-[var(--color-border)]/70 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Checked Checkbox */}
                          <div className="pt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => handleToggleTaskCheckbox(tk.id)}
                              className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-surface-2)] accent-[var(--color-calendar-selected-bg)] cursor-pointer"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Title description */}
                              <span className={`text-[13px] font-black leading-relaxed ${
                                isCompleted ? "line-through text-[var(--color-text-faint)] font-normal" : "text-[var(--color-text)]"
                              }`}>
                                {tk.title}
                              </span>

                              {/* Warning Alerts */}
                              {isOverdue && (
                                <span className="text-[8.5px] bg-red-500/10 text-red-400 border border-red-500/15 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE ALERT
                                </span>
                              )}
                            </div>

                            {/* Group Details Badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[10px]">
                              
                              {/* Color category badge matching legend */}
                              <span className={`px-2 py-0.5 rounded-md border text-[9.5px] font-bold ${badge.lightBg} ${badge.text} ${badge.border} flex items-center gap-1.5 shrink-0 shadow-sm`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.color} shrink-0`} />
                                {tk.category}
                              </span>

                              {tk.clientName && (
                                <span className="flex items-center gap-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2 py-0.5 rounded-md text-[var(--color-text)] font-extrabold shrink-0">
                                  <FileText className="w-3.5 h-3.5 text-[var(--color-calendar-selected-bg)] dark:text-amber-400" />
                                  <span>Deal: <span className="text-[var(--color-calendar-selected-bg)] dark:text-amber-400 font-black">{tk.clientName}</span></span>
                                </span>
                              )}

                              {tk.dueDate && (
                                <span className={`flex items-center gap-1.5 font-mono px-2 py-0.5 rounded-md border shrink-0 ${
                                  isOverdue 
                                    ? "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400 font-black" 
                                    : "bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-extrabold"
                                }`}>
                                  <Calendar className="w-3.5 h-3.5 text-[var(--color-calendar-selected-bg)] dark:text-cyan-400" />
                                  <span>Due: {tk.dueDate} {tk.dueTime && `@ ${tk.dueTime}`}</span>
                                </span>
                              )}

                              {tk.assignedTo && (
                                <span className="flex items-center gap-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2 py-0.5 rounded-md text-[var(--color-text)] font-extrabold shrink-0">
                                  <User className="w-3.5 h-3.5 text-[var(--color-calendar-selected-bg)] dark:text-sky-400" />
                                  <span>Owner: <b className="text-[var(--color-text)] font-black">{tk.assignedTo}</b></span>
                                </span>
                              )}

                              {/* Calendar synced badge status */}
                              {tk.calendarSync !== false && tk.dueDate && (
                                <span className="text-[8.5px] bg-[var(--color-calendar-selected-bg)]/10 dark:bg-emerald-500/10 border border-[var(--color-calendar-selected-bg)]/30 dark:border-emerald-500/20 text-[var(--color-calendar-selected-bg)] dark:text-emerald-400 px-2 py-0.5 rounded-md font-black uppercase tracking-wider shrink-0">
                                  📆 Cal Linked
                                </span>
                              )}
                            </div>

                            {/* Nested checklist progress tracker */}
                            {subtaskCount > 0 && (
                              <div className="mt-2.5 w-60 shrink-0 select-none">
                                <div className="flex justify-between items-center text-[9px] text-[var(--color-text-muted)] mb-1">
                                  <span>Checklist Items: <b>{subtaskDone}/{subtaskCount}</b> done</span>
                                  <span className="font-mono">{progressPercent}%</span>
                                </div>
                                <div className="w-full h-1 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                                </div>
                              </div>
                            )}

                          </div>
                        </div>

                        {/* Status badge representation */}
                        <div className="flex items-center gap-2 shrink-0 md:justify-end">
                          <span className={`text-[8.5px] font-black uppercase px-2 py-1 rounded-lg border tracking-wider select-none ${
                            tk.extendedStatus === "done" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" :
                            tk.extendedStatus === "cancelled" ? "bg-slate-500/5 text-slate-500 border-[var(--color-border)]/70 line-through" :
                            tk.extendedStatus === "in_progress" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/15" :
                            tk.extendedStatus === "waiting" ? "bg-orange-500/10 text-orange-400 border-orange-500/15" :
                            "bg-amber-500/5 text-slate-400 border-[var(--color-border)]/70"
                          }`}>
                            {tk.extendedStatus === "todo" ? "To Do" : tk.extendedStatus?.replace("_", " ")}
                          </span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* RENDER CASE 2: BOARD GRID SYSTEM COLUMN COLUMNS VIEW */}
            {viewLayout === "board" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full select-none" id="kanban-scaffolding-box">
                {[
                  { key: "todo", label: "To Do Actions", border: "border-[var(--color-warning)]/20", colorText: "text-amber-700 dark:text-amber-400 font-extrabold" },
                  { key: "in_progress", label: "In active flow", border: "border-cyan-500/20", colorText: "text-cyan-800 dark:text-cyan-300 font-extrabold" },
                  { key: "waiting", label: "Waiting On Info", border: "border-orange-500/20", colorText: "text-orange-800 dark:text-orange-300 font-extrabold" },
                  { key: "done", label: "Done / Completed", border: "border-emerald-500/20", colorText: "text-emerald-800 dark:text-emerald-300 font-extrabold" }
                ].map(col => {
                  const itemsInCol = sortedAndFilteredTasks.filter(t => t.extendedStatus === col.key);
                  return (
                    <div key={col.key} className="flex flex-col bg-[var(--color-surface-2)]/40 border border-[var(--color-border)]/70 rounded-2xl p-2.5 min-h-[300px]">
                      
                      {/* Column title descriptor */}
                      <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--color-border)]/70 mb-3">
                        <span className={`text-[10px] uppercase tracking-wider ${col.colorText}`}>{col.label}</span>
                        <span className="text-[10px] font-mono bg-[var(--color-surface-3)] text-[var(--color-text)] px-1.5 py-0.5 rounded-md font-bold">
                          {itemsInCol.length}
                        </span>
                      </div>

                      {/* Stack internal list items */}
                      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                        {itemsInCol.map(it => {
                          const isSelected = selectedTaskId === it.id;
                          const scheme = getCategoryColorSchema(it.category);
                          return (
                            <div
                              key={it.id}
                              onClick={() => setSelectedTaskId(it.id)}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                isSelected 
                                  ? "bg-[var(--color-surface-2)] border-[var(--color-border)] ring-1 ring-[var(--color-calendar-selected-bg)]/45 shadow-md" 
                                  : "bg-[var(--color-surface)] border-[var(--color-border)]/70 hover:border-[var(--color-border)]"
                              }`}
                            >
                              <span className={`text-[12.5px] font-extrabold block leading-normal text-[var(--color-text)] truncate ${it.extendedStatus === "done" ? "line-through text-[var(--color-text-faint)] font-normal" : ""}`}>
                                {it.title}
                              </span>

                              <div className="flex items-center justify-between mt-2.5">
                                <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md ${scheme.lightBg} ${scheme.text} ${scheme.border} truncate max-w-[80px]`}>
                                  {it.category}
                                </span>

                                {it.dueDate && (
                                  <span className="text-[8.5px] font-mono text-[var(--color-text-muted)] font-bold">{it.dueDate}</span>
                                )}
                              </div>

                              {it.clientName && (
                                <div className="text-[9.5px] text-[var(--color-calendar-selected-bg)] dark:text-amber-400 font-extrabold mt-1.5 truncate">
                                  File: {it.clientName}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* RENDER CASE 3: CHECKLIST FOCUS GRID WITH VISIBLE INDEPENDENT SUBTASKS CHECK BOXES */}
            {viewLayout === "checklist" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedAndFilteredTasks.map(tk => {
                  const isSelected = selectedTaskId === tk.id;
                  const isCompleted = tk.extendedStatus === "done";
                  const subs = tk.subtasks || [];
                  const doneSubs = subs.filter(s => s.done).length;
                  const percent = subs.length > 0 ? Math.round((doneSubs / subs.length) * 100) : 0;
                  const scheme = getCategoryColorSchema(tk.category);

                  return (
                    <div
                      key={tk.id}
                      onClick={() => setSelectedTaskId(tk.id)}
                      className={`p-4 rounded-2xl border flex flex-col text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-[var(--color-surface-2)] border-[var(--color-border)] ring-1 ring-[var(--color-calendar-selected-bg)]/45" 
                          : "bg-[var(--color-surface)] border-[var(--color-border)]/70 hover:border-[var(--color-border)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)]/70 pb-2.5 mb-2.5 select-none">
                        <div>
                          <span className={`text-[13px] font-black block leading-snug text-[var(--color-text)] ${isCompleted ? "line-through text-[var(--color-text-faint)] font-normal" : ""}`}>
                            {tk.title}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-[8.5px] font-black uppercase px-2 py-0.5 rounded border mt-1.5 ${scheme.lightBg} ${scheme.text} ${scheme.border}`}>
                            {tk.category}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono bg-[var(--color-surface-3)] text-[var(--color-text)] px-2 py-0.5 rounded-md font-bold shrink-0">
                          {doneSubs}/{subs.length} Items
                        </span>
                      </div>

                      {/* Subtasks inline loop */}
                      {subs.length === 0 ? (
                        <div className="flex-1 py-4 flex flex-col items-center justify-center text-center">
                          <Check className="w-5 h-5 text-emerald-500 opacity-30 mb-1" />
                          <span className="text-[9.5px] uppercase font-bold text-[var(--color-text-faint)]/40">Empty Checklist Board</span>
                          <span className="text-[8.5px] text-[var(--color-text-faint)]/40 mt-0.5">Click to apply templates in details</span>
                        </div>
                      ) : (
                        <div className="flex-1 space-y-2 mb-3">
                          {subs.map(sb => {
                            return (
                              <button
                                key={sb.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(tk.id);
                                  handleToggleSubtask(sb.id);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-left text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-3)]/60 transition-colors cursor-pointer"
                              >
                                {sb.done ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 border border-slate-400 dark:border-white/35 rounded-md shrink-0 shadow-sm" />
                                )}
                                <span className={sb.done ? "line-through text-[var(--color-text-faint)] font-normal" : "text-[var(--color-text)] font-extrabold"}>
                                  {sb.title}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Progress bar container */}
                      {subs.length > 0 && (
                        <div className="mt-auto pt-2.5 border-t border-[var(--color-border)]/70 bg-transparent select-none">
                          <div className="w-full h-1 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: RIGHT TASK ACTIVE OPERATIONS WORKSPACE (WIDTH 96) */}
        {/* ========================================================= */}
        <div className="w-full xl:w-96 shrink-0 bg-[var(--color-surface)]/20 overflow-y-auto p-4 select-none">
          
          <AnimatePresence mode="wait">
            {!selectedTask ? (
              <div className="h-full flex flex-col justify-center items-center py-24 text-center text-[var(--color-text-faint)] select-none">
                <SlidersHorizontal className="w-8 h-8 opacity-40 mb-3" />
                <span className="text-[10px] font-black uppercase tracking-wider">Select an Action file</span>
                <p className="text-[9.5px] text-[var(--color-text-muted)] mt-1 max-w-xs">Click on any Daily Task from the center list feed to trigger the interactive command panel.</p>
              </div>
            ) : (
              <motion.div
                key={selectedTask.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-xs"
              >
                
                {/* Visual header section */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-[9.5px] uppercase font-black text-[var(--color-text-muted)] tracking-widest font-mono">Operations Folder Details</span>
                    <button
                      onClick={() => handleRemoveTask(selectedTask.id)}
                      className="p-1.5 text-[var(--color-text-faint)] hover:text-red-400 bg-[var(--color-surface-2)] hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors"
                      title="Delete task item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {/* Editable Title descriptor text */}
                    <input
                      type="text"
                      value={selectedTask.title}
                      onChange={(e) => handleUpdateTaskDetail({ title: e.target.value })}
                      className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)]/40 pb-1 text-[13px] font-black text-[var(--color-text)] focus:outline-none transition-colors"
                    />
                    
                    <span className="text-[10px] text-[var(--color-text-muted)] block">Created: <b className="font-mono">{selectedTask.createdAt?.split("T")[0]}</b> by {selectedTask.createdBy || "System"}</span>
                  </div>
                </div>

                {/* Section A: Multi-Toggle Status and Risk Selector */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Status state dropdown mapped correctly to open/done */}
                    <div>
                      <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block mb-1">Status State</label>
                      <select
                        value={selectedTask.extendedStatus}
                        onChange={(e) => {
                          const ext = e.target.value as any;
                          handleUpdateTaskDetail({ 
                            extendedStatus: ext,
                            status: ext === "done" ? "done" : "open",
                            completedAt: ext === "done" ? new Date().toISOString() : null
                          });
                        }}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/20 font-bold"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting">Waiting On Info</option>
                        <option value="done">Completed / Done</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Priority risk rating */}
                    <div>
                      <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block mb-1">Risk Rating</label>
                      <select
                        value={selectedTask.priority}
                        onChange={(e) => handleUpdateTaskDetail({ priority: e.target.value as any })}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none font-bold"
                      >
                        <option value="urgent">🌋 Urgent Task</option>
                        <option value="high">🔥 High Priority</option>
                        <option value="medium">⚠️ Medium</option>
                        <option value="low">☕ Low Risk</option>
                      </select>
                    </div>
                  </div>

                  {/* Broker Assigned element picker */}
                  <div>
                    <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block mb-1">Broker Assigned</label>
                    <select
                      value={selectedTask.assignedTo || "David Acosta"}
                      onChange={(e) => handleUpdateTaskDetail({ assignedTo: e.target.value })}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/20 font-bold"
                    >
                      {userRoster && userRoster.length > 0 ? (
                        userRoster.map(u => (
                          <option key={u.id} value={`${u.first} ${u.last}`}>{u.first} {u.last} ({u.role})</option>
                        ))
                      ) : (
                        <>
                          <option value="David Acosta">David Acosta</option>
                          <option value="Jeff Brown">Jeff Brown</option>
                          <option value="Broker Desk">General Broker Desk</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Operational group categories mapping with full-color preview buttons */}
                  <div>
                    <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block mb-1.5">Primary Folder Category</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TASK_CATEGORIES.map(et => {
                        const isMatch = selectedTask.category === et.value;
                        return (
                          <button
                            key={et.value}
                            type="button"
                            onClick={() => handleUpdateTaskDetail({ category: et.value })}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-bold text-left transition-all ${
                              isMatch 
                                ? `${et.lightBg} ${et.border} ${et.text} ring-1 ring-white/10` 
                                : "bg-[var(--color-surface-2)]/40 border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span className={`w-2 h-2 rounded-full ${et.color} shrink-0`} />
                              <span>{et.value}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Section B: Timing, Calendar Synchronization Integration */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block mb-1">Target Date Due</label>
                      <input
                        type="date"
                        value={selectedTask.dueDate || ""}
                        onChange={(e) => handleUpdateTaskDetail({ dueDate: e.target.value })}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1 text-xs text-[var(--color-text)] font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block mb-1">Start Time (Optional)</label>
                      <select
                        value={selectedTask.dueTime || ""}
                        onChange={(e) => handleUpdateTaskDetail({ dueTime: e.target.value || undefined })}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                      >
                        <option value="">-- No Start Time --</option>
                        {timeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calendar Sync bidirectional selector */}
                  <div className="p-2.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)]/70 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-[var(--color-text)] uppercase">Publish to Team Calendar</span>
                      <input
                        type="checkbox"
                        checked={selectedTask.calendarSync !== false}
                        onChange={(e) => {
                          const boxVal = e.target.checked;
                          handleUpdateTaskDetail({ calendarSync: boxVal });
                        }}
                        className="h-3.5 w-3.5 accent-[var(--color-primary)] rounded cursor-pointer"
                      />
                    </div>
                    <p className="text-[9px] text-[var(--color-text-faint)] leading-relaxed">
                      If enabled, saving this Daily Task automatically provisions a real-time event block onto the Calendar Timeline so team members stay aligned.
                    </p>
                  </div>

                  {/* Reminders drop-down */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Set Reminder Ring</span>
                    <select
                      value={selectedTask.reminder || "none"}
                      onChange={(e) => handleUpdateTaskDetail({ reminder: e.target.value })}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1 text-[11px] text-[var(--color-text)] focus:outline-none font-semibold"
                    >
                      <option value="none">No reminder ping</option>
                      <option value="15m">15 Minutes before</option>
                      <option value="1h">1 Hour before</option>
                      <option value="2h">2 Hours before</option>
                      <option value="1d">1 Day before</option>
                    </select>
                  </div>
                </div>

                {/* Section C: Linked Client Deal detail */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3.5 space-y-3">
                  <div>
                    <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block mb-1">Linked Client File</label>
                    <select
                      value={selectedTask.clientId || ""}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const clientObj = clients.find(cl => cl.id === cid);
                        handleUpdateTaskDetail({
                          clientId: cid || undefined,
                          clientName: clientObj ? `${clientObj.first} ${clientObj.last}` : undefined
                        });
                      }}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/20 font-bold"
                    >
                      <option value="">-- General Unlinked Backlog --</option>
                      {clients.map(cl => (
                        <option key={cl.id} value={cl.id}>{cl.first} {cl.last} ({cl.status})</option>
                      ))}
                    </select>
                  </div>

                  {selectedTask.clientId && (
                    <div className="p-2.5 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 rounded-xl flex items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10.5px] font-black text-[var(--color-text)] block">Jump into client record:</span>
                        <span className="text-[9px] text-[var(--color-primary)] font-semibold mt-0.5 block truncate">
                          Ref: {selectedTask.clientName}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-[var(--color-primary)]/15 hover:bg-[var(--color-primary)]/25 text-[var(--color-primary)] text-[9.5px] font-extrabold uppercase rounded-lg border border-[var(--color-primary)]/20 cursor-pointer transition-colors flex items-center gap-0.5 shrink-0">
                        <Link2 className="w-3 h-3" /> Go File
                      </span>
                    </div>
                  )}
                </div>

                {/* Section D: Checklists subtasks Workspace */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Subtasks Workflow Checklist</span>
                    <span className="text-[9px] text-[var(--color-primary)] bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 rounded px-1.5 py-0.5">
                      {selectedTask.subtasks?.filter(s => s.done).length || 0} / {selectedTask.subtasks?.length || 0} completed
                    </span>
                  </div>

                  {/* Checklist Items Loop */}
                  {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedTask.subtasks.map(sb => (
                        <div 
                          key={sb.id}
                          className="flex items-center justify-between p-2 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]/70 rounded-xl gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(sb.id)}
                            className="flex items-center gap-2 text-left text-[11px] font-semibold text-[var(--color-text)] min-w-0 flex-1"
                          >
                            {sb.done ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 border border-white/20 rounded-md shrink-0" />
                            )}
                            <span className={`truncate ${sb.done ? "line-through text-[var(--color-text-faint)]" : "text-[var(--color-text)]"}`}>{sb.title}</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleRemoveSubtask(sb.id)}
                            className="text-[var(--color-text-faint)]/40 hover:text-red-400 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Subtask addition input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add subtask condition ..."
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 flex-1 focus:outline-none focus:border-[var(--color-primary)]/30"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="p-1.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-black rounded-lg transition-all"
                    >
                      <Plus className="w-4 h-4 animate-pulse" />
                    </button>
                  </div>

                  {/* Checklist Operational templates */}
                  <div className="pt-2 border-t border-[var(--color-border)]/70">
                    <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-semibold block mb-2">Apply Operational Templates</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {CHECKLIST_TEMPLATES.map((tmpl, offset) => (
                        <button
                          key={offset}
                          type="button"
                          onClick={() => handleApplyChecklistTemplate(offset)}
                          className="p-1.5 bg-[var(--color-surface-2)]/30 hover:bg-[var(--color-primary)]/10 border border-[var(--color-border)]/70 hover:border-[var(--color-primary)]/20 rounded-xl text-[10.5px] font-extrabold text-left transition-colors text-[var(--color-primary)] truncate"
                          title={tmpl.desc}
                        >
                          📋 {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section E: Exception description and Notes area */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3.5 space-y-2">
                  <label className="text-[9.5px] text-[var(--color-text-muted)] uppercase font-black block tracking-wider">Exception Instructions & Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Specific instruction notes regarding this file target conditions..."
                    value={selectedTask.notes || ""}
                    onChange={(e) => handleUpdateTaskDetail({ notes: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/20 font-bold leading-relaxed"
                  />
                </div>

                {/* Section F: Live Interactive Audit Trail Logs */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-3.5 space-y-3 shrink-0">
                  <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" /> Audit Trail log
                  </span>

                  {/* Comments Feed list */}
                  <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                    {selectedTask.auditLogs?.map((log, index) => (
                      <div key={index} className="p-2 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)]/70 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[8px] text-[var(--color-text-faint)] font-semibold">
                          <span>{log.user}</span>
                          <span className="font-mono">{log.timestamp?.replace("T", " ")?.split(".")[0]}</span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text)] font-semibold leading-normal">{log.action}</p>
                      </div>
                    ))}
                  </div>

                  {/* Manual Log Action result */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Log intermediate outcome note ..."
                      value={newAuditLogMsg}
                      onChange={(e) => setNewAuditLogMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAuditLogComment()}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 flex-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddAuditLogComment}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/20 text-cyan-400 text-[10.5px] font-black rounded-lg transition-all"
                    >
                      Log
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
          
        </div>

      </div>

      {/* ✦ DYNAMIC POPUP DIALOG CREATE ACTION MODAL (MODAL) ✦ */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 bg-[var(--color-sidebar)]/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 flex items-center justify-between">
                <h3 className="text-xs uppercase font-extrabold text-[var(--color-primary)] tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 fill-[var(--color-primary)]/35 text-[var(--color-primary)]" />
                  Log Mortgage Condition Action
                </h3>
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={handleCreateTask} className="p-4 space-y-4 text-left">
                
                {/* Title and Requirements descriptor */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Requirement Description <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Gather 90-day statements, draft Scotia mortgage package"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 font-bold"
                  />
                </div>

                {/* Color-Coded classification selector matching layout legend exactly */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-2">Classification Division Group</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TASK_CATEGORIES.map(et => {
                      const isMatch = newCategory === et.value;
                      return (
                        <button
                          key={et.value}
                          type="button"
                          onClick={() => setNewCategory(et.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border text-[11px] font-semibold transition-all ${
                            isMatch 
                              ? `${et.lightBg} ${et.border} ${et.text} ${et.glow} border-white/20 ring-1 ring-white/10` 
                              : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)]/70 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${et.color} ${et.glow} shrink-0`} />
                          <span>{et.value}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority status and Associated Client Deal */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Priority Risk Level</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                    >
                      <option value="high">🌋 High Urgency</option>
                      <option value="medium">⚠️ Medium</option>
                      <option value="low">☕ Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Related Client File</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                    >
                      <option value="">-- General Unlinked Task --</option>
                      {clients.map(cl => (
                        <option key={cl.id} value={cl.id}>{cl.first} {cl.last} ({cl.status})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Broker Assigned choice */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Assign Broker Owner</label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                  >
                    {userRoster && userRoster.length > 0 ? (
                      userRoster.map(u => (
                        <option key={u.id} value={`${u.first} ${u.last}`}>{u.first} {u.last} ({u.role})</option>
                      ))
                    ) : (
                      <>
                        <option value="David Acosta">David Acosta</option>
                        <option value="Jeff Brown">Jeff Brown</option>
                        <option value="Broker Desk">General Broker Desk</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Due Date & Optional Due time */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Target Date Due</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Target Start Time (Optional)</label>
                    <select
                      value={newDueTime || ""}
                      onChange={(e) => setNewDueTime(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                    >
                      <option value="">-- No Start Time --</option>
                      {timeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Calendar Sync bidirectional selector */}
                <div className="p-3 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]/70 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[var(--color-text)] uppercase">Push on Team Calendar Scheduler</span>
                    <input
                      type="checkbox"
                      checked={newCalendarSync}
                      onChange={(e) => setNewCalendarSync(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--color-calendar-selected-bg)] rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-[9px] text-[var(--color-text-muted)] leading-relaxed">
                    Instantly syncs with your team calendar overview so appointments and condition checkpoints align.
                  </p>
                </div>

                {/* Dropdown reminder */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Timing Warning Reminder</span>
                  <select
                    value={newReminder}
                    onChange={(e) => setNewReminder(e.target.value)}
                    className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                  >
                    <option value="none">No warning ping</option>
                    <option value="15m">15 Minutes before</option>
                    <option value="1h">1 Hour before</option>
                    <option value="1d">1 Day before</option>
                  </select>
                </div>

                {/* Notes box */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">Exception notes or Specific lists</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific notes regarding document verification criteria, or instructions..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40"
                  />
                </div>

                {/* Modal actions buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-4 py-2 border border-[var(--color-border)]/70 hover:border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[var(--color-calendar-selected-bg)] hover:opacity-90 text-[var(--color-calendar-selected-text)] font-black text-xs rounded-xl transition-all flex items-center gap-1 shadow-lg cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-[var(--color-calendar-selected-text)]" /> Book Action Task
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
