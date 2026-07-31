import React, { useState, useEffect, useMemo } from "react";
import { 
  Phone, Mail, MessageSquare, Calendar, User, Clock, Search, Filter, 
  Plus, Trash2, Save, AlertTriangle, CheckCircle2, AlertCircle, Sparkles, 
  Send, ListFilter, ChevronDown, RefreshCw, Edit2, Archive, Check, ArrowRight
} from "lucide-react";
import { Client, User as CRMUser, Task, Event } from "../types";
import { 
  FileNote, 
  FileFollowUp, 
  ActivityEvent, 
  getNotesForClient, 
  saveNotesForClient, 
  getActivitiesForClient, 
  logActivityEvent, 
  getFollowUpsForClient, 
  saveFollowUpsForClient 
} from "../lib/activityEngine";

interface MortgageActivityTrackerProps {
  client: Client;
  currentUser: CRMUser;
  onUpdateClient: (updated: Client) => void;
  agentNames: string[];
  activeSubTab: "notes" | "activity";
  showToast: (msg: string, type?: "success" | "error" | "info", icon?: string) => void;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  events?: Event[];
  setEvents?: React.Dispatch<React.SetStateAction<Event[]>>;
}

export const MortgageActivityTracker: React.FC<MortgageActivityTrackerProps> = ({
  client,
  currentUser,
  onUpdateClient,
  agentNames,
  activeSubTab,
  showToast,
  tasks,
  setTasks,
  events,
  setEvents
}) => {
  // --- STATE ---
  const [notes, setNotes] = useState<FileNote[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [followUps, setFollowUps] = useState<FileFollowUp[]>([]);

  // Filtering states
  const [notesSearch, setNotesSearch] = useState("");
  const [notesFilterType, setNotesFilterType] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Input states for New Note
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState<FileNote["type"]>("general");
  const [newNoteTags, setNewNoteTags] = useState("");

  // Input states for Log Communication
  const [showLogComm, setShowLogComm] = useState(false);
  const [commType, setCommType] = useState<FileNote["communicationDetails"]["type"]>("phone_call");
  const [commDirection, setCommDirection] = useState<FileNote["communicationDetails"]["direction"]>("outgoing");
  const [commSummary, setCommSummary] = useState("");
  const [commNextStep, setCommNextStep] = useState("");
  const [commNextDueDate, setCommNextDueDate] = useState("");

  // Input states for Follow Up
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [followUpTimeStart, setFollowUpTimeStart] = useState("09:00");
  const [followUpTimeEnd, setFollowUpTimeEnd] = useState("10:00");
  const [followUpOwner, setFollowUpOwner] = useState(client.agent || "");
  const [followUpPriority, setFollowUpPriority] = useState<FileFollowUp["priority"]>("medium");
  const [followUpActionType, setFollowUpActionType] = useState<"task" | "calendar" | "both">("both");
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Edit State for existing note
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedNoteContent, setEditedNoteContent] = useState("");

  // Trigger loading state refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- REFRESH DATA ---
  useEffect(() => {
    setNotes(getNotesForClient(client));
    setActivities(getActivitiesForClient(client.id));
    setFollowUps(getFollowUpsForClient(client.id));
  }, [client, refreshTrigger]);

  // Listener to pick up modifications in other components
  useEffect(() => {
    const handleChecklistOrActivityUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener("activity-logged", handleChecklistOrActivityUpdate);
    window.addEventListener("checklist-updated", handleChecklistOrActivityUpdate);
    return () => {
      window.removeEventListener("activity-logged", handleChecklistOrActivityUpdate);
      window.removeEventListener("checklist-updated", handleChecklistOrActivityUpdate);
    };
  }, []);

  // --- ACTIONS ---

  // Log a custom note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const tagsArray = newNoteTags
      .split(",")
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag !== "");

    const newNote: FileNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      clientId: client.id,
      author: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      type: newNoteType,
      content: newNoteContent.trim(),
      tags: tagsArray.length > 0 ? tagsArray : undefined
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    saveNotesForClient(client.id, updatedNotes);

    // Auto-log system activity event
    logActivityEvent({
      clientId: client.id,
      clientName: `${client.first} ${client.last}`,
      eventType: "note_added",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Logged a new ${newNoteType} underwriter note: "${newNote.content.substring(0, 50)}..."`
    });

    setNewNoteContent("");
    setNewNoteTags("");
    setRefreshTrigger(prev => prev + 1);
    showToast("File note successfully logged.", "success", "📝");
  };

  // Start editing a note
  const startEditNote = (note: FileNote) => {
    setEditingNoteId(note.id);
    setEditedNoteContent(note.content);
  };

  // Save edited note
  const saveEditedNote = (noteId: string) => {
    const previous = notes.find(n => n.id === noteId);
    if (!previous || !editedNoteContent.trim()) return;

    const updatedNotes = notes.map(n => {
      if (n.id === noteId) {
        const history = n.editHistory || [];
        return {
          ...n,
          content: editedNoteContent.trim(),
          editHistory: [
            ...history,
            {
              editor: `${currentUser.first} ${currentUser.last}`,
              timestamp: new Date().toISOString(),
              previousContent: previous.content
            }
          ]
        };
      }
      return n;
    });

    setNotes(updatedNotes);
    saveNotesForClient(client.id, updatedNotes);
    setEditingNoteId(null);

    logActivityEvent({
      clientId: client.id,
      clientName: `${client.first} ${client.last}`,
      eventType: "note_edited",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Modified underwriter note details`
    });

    setRefreshTrigger(prev => prev + 1);
    showToast("Underwriter note successfully updated.", "success", "💾");
  };

  // Delete a note
  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this file note? This action cannot be undone.")) {
      const updatedNotes = notes.filter(n => n.id !== noteId);
      setNotes(updatedNotes);
      saveNotesForClient(client.id, updatedNotes);
      setRefreshTrigger(prev => prev + 1);
      showToast("Note removed.", "info", "🗑️");
    }
  };

  // Log communication event
  const handleLogCommunication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commSummary.trim()) return;

    const commNoteId = `comm_${Date.now()}`;
    const descText = `[${commDirection.toUpperCase()} ${commType.replace("_", " ").toUpperCase()}] ${commSummary}`;

    // Create note record for communication
    const commNote: FileNote = {
      id: commNoteId,
      clientId: client.id,
      author: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      type: "call",
      content: descText,
      communicationDetails: {
        type: commType,
        direction: commDirection,
        nextActionNeeded: commNextStep.trim() || undefined,
        nextActionDueDate: commNextDueDate || undefined,
        status: commNextStep.trim() ? "unresolved" : "resolved"
      }
    };

    const updatedNotes = [commNote, ...notes];
    setNotes(updatedNotes);
    saveNotesForClient(client.id, updatedNotes);

    // Auto log timeline activity
    logActivityEvent({
      clientId: client.id,
      clientName: `${client.first} ${client.last}`,
      eventType: "communication_logged",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Logged client outreach: ${commType.replace("_", " ")} (${commDirection}) - "${commSummary.substring(0, 55)}..."`
    });

    // Create a follow-up automatically if next action is entered
    if (commNextStep.trim()) {
      const newFollowUp: FileFollowUp = {
        id: `fup_${Date.now()}`,
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        title: commNextStep.trim(),
        dueDate: commNextDueDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
        assignedOwner: client.agent || `${currentUser.first} ${currentUser.last}`,
        priority: "medium",
        status: "pending",
        createdTime: new Date().toISOString()
      };

      const updatedFollowUps = [...followUps, newFollowUp];
      setFollowUps(updatedFollowUps);
      saveFollowUpsForClient(client.id, updatedFollowUps);

      // Sync next follow up date to client object immutably
      const pendingFups = updatedFollowUps.filter(fup => fup.status === "pending");
      pendingFups.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const nextDate = pendingFups.length > 0 ? pendingFups[0].dueDate : undefined;

      onUpdateClient({
        ...client,
        nextFollowUpDate: nextDate,
        updatedAt: new Date().toISOString()
      });

      logActivityEvent({
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        eventType: "followup_added",
        user: `${currentUser.first} ${currentUser.last}`,
        timestamp: new Date().toISOString(),
        description: `Scheduled critical follow-up: "${newFollowUp.title}" due by ${newFollowUp.dueDate}`
      });
    }

    setCommSummary("");
    setCommNextStep("");
    setCommNextDueDate("");
    setShowLogComm(false);
    setRefreshTrigger(prev => prev + 1);
    showToast("Communication successfully logged.", "success", "📞");
  };

  // Add dedicated Follow-Up
  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle.trim() || !followUpDueDate) return;

    let taskId: string | undefined = undefined;
    let eventId: string | undefined = undefined;

    const timeRangeStr = `Scheduled Time: ${followUpTimeStart} - ${followUpTimeEnd}`;
    const integratedNotes = [timeRangeStr, followUpNotes.trim()].filter(Boolean).join("\n\n");

    // Create central Task if selected Task or Both
    if ((followUpActionType === "task" || followUpActionType === "both") && setTasks) {
      taskId = `t_fup_${Date.now()}`;
      const newTask: Task = {
        id: taskId,
        title: `${followUpTitle.trim()} (${followUpTimeStart} - ${followUpTimeEnd})`,
        status: "open",
        priority: followUpPriority === "critical" ? "high" : followUpPriority,
        dueDate: followUpDueDate,
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        assignedTo: followUpOwner || `${currentUser.first} ${currentUser.last}`,
        notes: integratedNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: `${currentUser.first} ${currentUser.last}`
      };
      setTasks(prevTasks => [...(prevTasks || []), newTask]);
    }

    // Create central Calendar Event if selected Calendar or Both
    if ((followUpActionType === "calendar" || followUpActionType === "both") && setEvents) {
      eventId = `ev_fup_${Date.now()}`;
      const newEvent: Event = {
        id: eventId,
        title: followUpTitle.trim(),
        date: followUpDueDate,
        time: followUpTimeStart, // Keep purely formatted as HH:MM for slot indexing
        type: "client",
        clientId: client.id,
        notes: integratedNotes,
        createdBy: `${currentUser.first} ${currentUser.last}`
      };
      setEvents(prevEvents => [...(prevEvents || []), newEvent]);
    }

    const newFollowUp: FileFollowUp = {
      id: `fup_${Date.now()}`,
      clientId: client.id,
      clientName: `${client.first} ${client.last}`,
      title: followUpTitle.trim(),
      dueDate: followUpDueDate,
      assignedOwner: followUpOwner || `${currentUser.first} ${currentUser.last}`,
      priority: followUpPriority,
      status: "pending",
      createdTime: new Date().toISOString(),
      taskId,
      eventId,
      timeStart: followUpTimeStart,
      timeEnd: followUpTimeEnd
    };

    const updatedFollowUps = [...followUps, newFollowUp];
    setFollowUps(updatedFollowUps);
    saveFollowUpsForClient(client.id, updatedFollowUps);

    // Sync next follow up date to client object immutably
    const pendingFups = updatedFollowUps.filter(fup => fup.status === "pending");
    pendingFups.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nextDate = pendingFups.length > 0 ? pendingFups[0].dueDate : undefined;

    onUpdateClient({
      ...client,
      nextFollowUpDate: nextDate,
      updatedAt: new Date().toISOString()
    });

    // Log Activity Event
    logActivityEvent({
      clientId: client.id,
      clientName: `${client.first} ${client.last}`,
      eventType: "followup_added",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Created integrated ${followUpActionType} follow-up task: "${newFollowUp.title}" (Assigned to: ${newFollowUp.assignedOwner})`
    });

    setFollowUpTitle("");
    setFollowUpDueDate("");
    setFollowUpTimeStart("09:00");
    setFollowUpTimeEnd("10:00");
    setFollowUpNotes("");
    setFollowUpActionType("both");
    setShowAddFollowUp(false);
    setRefreshTrigger(prev => prev + 1);
    
    let destMsg = "Task & Calendar Event";
    if (followUpActionType === "task") destMsg = "Task only";
    if (followUpActionType === "calendar") destMsg = "Calendar Event only";
    showToast(`Follow-up scheduled in central CRM (${destMsg})`, "success", "⏰");
  };

  // Resolve / Complete Follow-Up
  const handleToggleFollowUp = (fupId: string) => {
    const targetFup = followUps.find(f => f.id === fupId);
    if (!targetFup) return;

    const isCompleted = targetFup.status === "completed";
    const newStatus = isCompleted ? "pending" : "completed";

    // Synchronize toggle with the central Task state if linked
    if (targetFup.taskId && setTasks) {
      setTasks(prevTasks => prevTasks.map(t => {
        if (t.id === targetFup.taskId) {
          return {
            ...t,
            status: isCompleted ? "open" : "done",
            completedAt: isCompleted ? null : new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      }));
    }

    const updated = followUps.map(fup => {
      if (fup.id === fupId) {
        // Log event
        logActivityEvent({
          clientId: client.id,
          clientName: `${client.first} ${client.last}`,
          eventType: isCompleted ? "followup_added" : "followup_completed",
          user: `${currentUser.first} ${currentUser.last}`,
          timestamp: new Date().toISOString(),
          description: isCompleted 
            ? `Re-opened follow-up task: "${fup.title}"` 
            : `Completed follow-up task: "${fup.title}"`
        });

        return {
          ...fup,
          status: newStatus as any,
          completedTime: isCompleted ? undefined : new Date().toISOString()
        };
      }
      return fup;
    });

    setFollowUps(updated);
    saveFollowUpsForClient(client.id, updated);

    // Sync next follow up date to client object immutably
    const pendingFups = updated.filter(fup => fup.status === "pending");
    pendingFups.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nextDate = pendingFups.length > 0 ? pendingFups[0].dueDate : undefined;

    onUpdateClient({
      ...client,
      nextFollowUpDate: nextDate,
      updatedAt: new Date().toISOString()
    });

    setRefreshTrigger(prev => prev + 1);
    showToast("Follow-up status synchronized.", "success", "✓");
  };

  // Delete Follow-Up
  const handleDeleteFollowUp = (fupId: string) => {
    const targetFup = followUps.find(f => f.id === fupId);

    // Clean up linked central Task
    if (targetFup?.taskId && setTasks) {
      setTasks(prevTasks => prevTasks.filter(t => t.id !== targetFup.taskId));
    }

    // Clean up linked central Event
    if (targetFup?.eventId && setEvents) {
      setEvents(prevEvents => prevEvents.filter(e => e.id !== targetFup.eventId));
    }

    const updated = followUps.filter(fup => fup.id !== fupId);
    setFollowUps(updated);
    saveFollowUpsForClient(client.id, updated);

    // Sync next follow up date to client object immutably
    const pendingFups = updated.filter(fup => fup.status === "pending");
    pendingFups.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nextDate = pendingFups.length > 0 ? pendingFups[0].dueDate : undefined;

    onUpdateClient({
      ...client,
      nextFollowUpDate: nextDate,
      updatedAt: new Date().toISOString()
    });

    setRefreshTrigger(prev => prev + 1);
    showToast("Follow-up task deleted from CRM.", "info", "🗑️");
  };

  // --- FILTERS & COMPUTATIONS ---

  // Search Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.content.toLowerCase().includes(notesSearch.toLowerCase()) || 
                            n.author.toLowerCase().includes(notesSearch.toLowerCase()) ||
                            (n.tags && n.tags.some(t => t.includes(notesSearch.toLowerCase())));
      const matchesType = notesFilterType === "all" || n.type === notesFilterType;
      return matchesSearch && matchesType;
    });
  }, [notes, notesSearch, notesFilterType]);

  // Search Activities
  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return activities;
    return activities.filter(act => {
      if (activityFilter === "notes_only" && (act.eventType === "note_added" || act.eventType === "note_edited")) return true;
      if (activityFilter === "comm_only" && act.eventType === "communication_logged") return true;
      if (activityFilter === "followup_only" && (act.eventType === "followup_added" || act.eventType === "followup_completed")) return true;
      if (activityFilter === "doc_only" && (act.eventType === "document_uploaded" || act.eventType === "document_reviewed")) return true;
      if (activityFilter === "checklist_only" && act.eventType === "checklist_updated") return true;
      if (activityFilter === "stage_only" && act.eventType === "stage_change") return true;
      if (activityFilter === "compliance_only" && act.eventType === "compliance_flagged") return true;
      return false;
    });
  }, [activities, activityFilter]);

  // Dynamic resolution of follow-up state using real-time central task state
  const resolvedFollowUps = useMemo(() => {
    return followUps.map(fup => {
      if (fup.taskId && tasks) {
        const matchedTask = tasks.find(t => t.id === fup.taskId);
        if (matchedTask) {
          return {
            ...fup,
            status: matchedTask.status === "done" ? ("completed" as const) : ("pending" as const)
          };
        }
      }
      return fup;
    });
  }, [followUps, tasks]);

  // Underwriter Bottleneck Diagnostics (Manager checks)
  const auditDiagnostics = useMemo(() => {
    const hasPendingFollowUp = resolvedFollowUps.some(fup => fup.status === "pending");
    const activeFollowUps = resolvedFollowUps.filter(fup => fup.status === "pending");
    
    // Check stale (no communication/update events in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const lastEvent = activities.length > 0 ? new Date(activities[0].timestamp) : new Date(client.createdAt || Date.now());
    const isStale = lastEvent < sevenDaysAgo;

    // Check overdue follow-ups
    const todayStr = new Date().toISOString().split("T")[0];
    const overdueFollowUps = activeFollowUps.filter(fup => fup.dueDate < todayStr);

    // Repeated document chases (where activity description logs 'Requested' or 'chase' multiple times for same document ID)
    let isChasingHeavy = false;
    const countMap: Record<string, number> = {};
    activities.forEach(act => {
      if (act.description.toLowerCase().includes("awaiting client") || act.description.toLowerCase().includes("chase")) {
        const idKey = act.details || "unknown";
        countMap[idKey] = (countMap[idKey] || 0) + 1;
        if (countMap[idKey] >= 3) {
          isChasingHeavy = true;
        }
      }
    });

    return {
      hasPendingFollowUp,
      pendingCount: activeFollowUps.length,
      isStale,
      lastInteractionDays: Math.round((Date.now() - lastEvent.getTime()) / (1000 * 60 * 60 * 24)),
      overdueFollowUps,
      hasOverdue: overdueFollowUps.length > 0,
      isChasingHeavy
    };
  }, [activities, resolvedFollowUps, client]);

  // Color mappings for note categories
  const noteTypeBadges: Record<FileNote["type"], { label: string; bg: string; text: string }> = {
    general: { label: "General", bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/10", text: "text-zinc-400" },
    broker: { label: "Broker Note", bg: "bg-teal-500/10 text-teal-400 border-teal-500/10", text: "text-teal-400" },
    manager: { label: "Manager Review", bg: "bg-amber-500/10 text-amber-400 border-amber-500/10", text: "text-amber-400" },
    call: { label: "Outreach Log", bg: "bg-blue-500/10 text-blue-400 border-blue-500/10", text: "text-blue-400" },
    lender: { label: "Lender Correspondence", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/10", text: "text-indigo-400" },
    underwriting: { label: "Underwriting", bg: "bg-rose-500/10 text-rose-400 border-rose-500/10", text: "text-rose-400" },
    internal: { label: "Internal Only", bg: "bg-orange-500/10 text-orange-400 border-orange-500/10", text: "text-orange-400" },
    lawyer: { label: "Solicitor Update", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/10", text: "text-emerald-400" },
    partner: { label: "Partner/BDM Update", bg: "bg-violet-500/10 text-violet-400 border-violet-500/ violet-10", text: "text-violet-400" }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 text-xs text-[var(--color-text-muted)]">
      
      {/* LEFT OR UPPER SECTION: Main Notes / Activities Workspace */}
      <div className="flex-1 space-y-4">
        
        {/* TAB INTERACTIVE CONTENT */}
        {activeSubTab === "notes" ? (
          
          /* NOTES TAB WORKSPACE */
          <div className="space-y-4">
            
            {/* Notes Tool bar search and filter */}
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                <input 
                  type="text" 
                  placeholder="Search file notes or keywords..."
                  value={notesSearch}
                  onChange={(e) => setNotesSearch(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2 text-[11px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <ListFilter className="h-3.5 w-3.5 text-[var(--color-text-faint)] shrink-0" />
                <select 
                  value={notesFilterType}
                  onChange={(e) => setNotesFilterType(e.target.value)}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1.5 text-[10px] uppercase font-black tracking-wider text-[var(--color-text)] focus:outline-none w-full sm:w-auto"
                >
                  <option value="all">All Note Types</option>
                  <option value="general">General</option>
                  <option value="broker">Broker Notes</option>
                  <option value="manager">Manager Notes</option>
                  <option value="call">Outreach/Calls</option>
                  <option value="lender">Lender Notes</option>
                  <option value="underwriting">Underwriting Notes</option>
                  <option value="internal">Internal Only</option>
                  <option value="lawyer">Solicitor/Lawyer</option>
                  <option value="partner">Partners/BDMs</option>
                </select>
              </div>
            </div>

            {/* Note addition editor */}
            <form onSubmit={handleAddNote} className="bg-[var(--color-surface-2)]/45 border border-[var(--color-border)] p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="font-black uppercase tracking-wider text-[var(--color-text)] text-xs">New Intentional File Note</span>
                </div>
                
                {/* Note type selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold">Category:</span>
                  <select 
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value as FileNote["type"])}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] uppercase font-bold text-[var(--color-text)] focus:outline-none"
                  >
                    <option value="general">General Notes</option>
                    <option value="broker">Broker Notes</option>
                    <option value="manager">Manager Notes</option>
                    <option value="lender">Lender Correspondence</option>
                    <option value="underwriting">Underwriting Details</option>
                    <option value="internal">Internal Private</option>
                    <option value="lawyer">Solicitor Information</option>
                    <option value="partner">BDM/Partner Details</option>
                  </select>
                </div>
              </div>

              {/* Text Input */}
              <textarea 
                rows={8}
                required
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Compose professional underwriting notes, compliance updates, phone calls, or file decisions..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/60 font-semibold"
              />

              {/* Tags & Submit */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <input 
                  type="text" 
                  value={newNoteTags}
                  onChange={(e) => setNewNoteTags(e.target.value)}
                  placeholder="Comma separated tags: (e.g. salary, appraisal, exception)"
                  className="w-full sm:max-w-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-[10px] text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none font-semibold"
                />

                <button 
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/20 rounded-md text-[9px] font-black uppercase tracking-wider text-[var(--color-accent)] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Log File Note
                </button>
              </div>
            </form>

            {/* Notes List Bubble Rendering */}
            <div className="space-y-3.5">
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
                  <p className="text-[var(--color-text-faint)] italic font-medium">No notes found matching your active filter criteria.</p>
                </div>
              ) : (
                filteredNotes.map(n => {
                  const badge = noteTypeBadges[n.type] || noteTypeBadges["general"];
                  const isEditing = editingNoteId === n.id;

                  return (
                    <div key={n.id} className="p-4 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl flex flex-col gap-3 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-3)]/10 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-[var(--color-text)] uppercase text-[10px] tracking-wide">{n.author}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-[var(--color-surface-3)]/40 ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-[var(--color-text-faint)] font-mono text-[9px]">{new Date(n.timestamp).toLocaleString()}</span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea 
                            rows={3}
                            value={editedNoteContent}
                            onChange={(e) => setEditedNoteContent(e.target.value)}
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingNoteId(null)}
                              className="px-2 py-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] rounded text-[8.5px] uppercase font-black text-[var(--color-text-muted)]"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => saveEditedNote(n.id)}
                              className="px-2 py-1 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded text-[8.5px] uppercase font-black text-[var(--color-accent)] flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" /> Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-[var(--color-text)] font-semibold leading-relaxed whitespace-pre-wrap">{n.content}</p>
                          
                          {/* Tags Rendering */}
                          {n.tags && n.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {n.tags.map(tag => (
                                <span key={tag} className="text-[8px] bg-[#6fa3b8]/5 border border-[#6fa3b8]/10 text-[#6fa3b8] px-1.5 py-0.2 rounded font-mono font-bold">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Communication Metadata if exists */}
                          {n.communicationDetails && (
                            <div className="mt-2 p-2 bg-[var(--color-surface-3)]/60 border border-[var(--color-border)] rounded-lg text-[9px] text-[var(--color-text-muted)] flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2 uppercase font-black tracking-wider text-[var(--color-text-muted)]">
                                <Clock className="w-3 h-3" />
                                <span>Type: {n.communicationDetails.type.replace("_", " ")}</span>
                                <span>•</span>
                                <span>Direction: {n.communicationDetails.direction}</span>
                              </div>
                              {n.communicationDetails.nextActionNeeded && (
                                <div className="text-[var(--color-accent)] font-semibold italic text-right">
                                  Action: {n.communicationDetails.nextActionNeeded} (Due: {n.communicationDetails.nextActionDueDate || "Immediate"})
                                </div>
                              )}
                            </div>
                          )}

                          {/* Edit History tracker */}
                          {n.editHistory && n.editHistory.length > 0 && (
                            <span className="text-[7.5px] text-[var(--color-text-faint)] block font-mono">
                              Edited {n.editHistory.length} times. Last edit by {n.editHistory[n.editHistory.length - 1].editor} at {new Date(n.editHistory[n.editHistory.length - 1].timestamp).toLocaleDateString()}
                            </span>
                          )}

                          {/* Admin tools */}
                          <div className="flex justify-end gap-2 pt-1 border-t border-[var(--color-border)]/20">
                            <button 
                              onClick={() => startEditNote(n)}
                              className="text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] uppercase font-bold flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-2.5 h-2.5" /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteNote(n.id)}
                              className="text-[9px] text-red-400/50 hover:text-red-400 uppercase font-bold flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        ) : (
          
          /* ACTIVITY TIMELINE TAB WORKSPACE */
          <div className="space-y-4">
            
            {/* Timeline Filter toolbar */}
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-widest flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" /> Unified Operations Audit Trail
              </span>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-3.5 w-3.5 text-[var(--color-text-faint)] shrink-0" />
                <select 
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1.5 text-[10px] uppercase font-black tracking-wider text-[var(--color-text)] focus:outline-none w-full sm:w-auto"
                >
                  <option value="all">All File Events</option>
                  <option value="notes_only">Notes Logs Only</option>
                  <option value="comm_only">Communications</option>
                  <option value="followup_only">Follow-Ups</option>
                  <option value="doc_only">Document Activities</option>
                  <option value="checklist_only">Workflow Changes</option>
                  <option value="stage_only">Stage Changes</option>
                  <option value="compliance_only">Compliance Exception Flags</option>
                </select>
              </div>
            </div>

            {/* Render Chronological List */}
            <div className="relative border-l-2 border-[var(--color-border)] pl-4 py-1.5 space-y-5">
              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl ml-2">
                  <p className="text-[var(--color-text-faint)] italic font-medium">No operational activity logs found for this filter query.</p>
                </div>
              ) : (
                filteredActivities.map((act) => {
                  // Determine dynamic icons/colors for event types
                  let dotColor = "bg-zinc-500 border-zinc-600";
                  let eventTitleColor = "text-[var(--color-text)]";

                  if (act.eventType === "stage_change") {
                    dotColor = "bg-[var(--color-accent)] border-[var(--color-accent)]";
                    eventTitleColor = "text-[var(--color-accent)] font-black";
                  } else if (act.eventType === "compliance_flagged") {
                    dotColor = "bg-red-500 border-red-500 animate-pulse";
                    eventTitleColor = "text-red-400 font-extrabold";
                  } else if (act.eventType === "document_uploaded" || act.eventType === "document_reviewed") {
                    dotColor = "bg-[#6fa3b8] border-[#6fa3b8]";
                    eventTitleColor = "text-[#6fa3b8] font-bold";
                  } else if (act.eventType === "note_added") {
                    dotColor = "bg-indigo-500 border-indigo-600";
                  } else if (act.eventType === "followup_completed") {
                    dotColor = "bg-green-500 border-green-500";
                  }

                  return (
                    <div key={act.id} className="relative group pl-1 animate-fade-in select-none">
                      {/* Interactive Dot */}
                      <span className={`absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface)] ${dotColor} transition-transform group-hover:scale-125`} />
                      
                      <div className="flex items-center justify-between text-[8px] text-[var(--color-text-faint)] uppercase tracking-widest font-black mb-1.5">
                        <span className="text-[var(--color-text-muted)] font-extrabold">{act.user}</span>
                        <span className="font-mono">{new Date(act.timestamp).toLocaleString()}</span>
                      </div>

                      <div className={`text-xs font-semibold ${eventTitleColor} flex items-center gap-1.5 flex-wrap`}>
                        <span className="uppercase tracking-wider text-[10px] font-black">[{act.eventType.replace("_", " ")}]</span>
                        <span>{act.description}</span>
                      </div>

                      {act.details && (
                        <p className="text-[10px] text-[var(--color-text-muted)] pl-3 border-l border-[var(--color-border)] mt-1 italic font-medium">
                          {act.details}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* RIGHT SECTION: Follow-Ups, Underwriting Warnings, and Metrics Panel */}
      <div className="w-full xl:w-72 shrink-0 space-y-4">
        
        {/* DIAGNOSTIC WARNINGS (MANAGER BOTTLE-NECK WATCH) */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-3 shadow-md">
          <h4 className="text-[9.5px] text-[var(--color-accent)] uppercase font-black tracking-widest flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Underwriting Audit Health
          </h4>

          {/* Warning: File Stale */}
          {auditDiagnostics.isStale && (
            <div className="p-2.5 bg-amber-500/5 border border-amber-500/15 text-amber-400 rounded-lg flex items-start gap-2 text-[10px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black uppercase tracking-wider">File Touch Stale</strong>
                <span>Last file outreach or change logged was {auditDiagnostics.lastInteractionDays} days ago. Ensure files are kept updated daily.</span>
              </div>
            </div>
          )}

          {/* Warning: No follow-up scheduled */}
          {!auditDiagnostics.hasPendingFollowUp && (
            <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/15 text-indigo-400 rounded-lg flex items-start gap-2 text-[10px]">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black uppercase tracking-wider">No Next Follow-Up</strong>
                <span>No future follow-up outreach is currently scheduled. We advise assigning a task.</span>
              </div>
            </div>
          )}

          {/* Warning: Overdue item exists */}
          {auditDiagnostics.hasOverdue && (
            <div className="p-2.5 bg-red-500/5 border border-red-500/15 text-red-400 rounded-lg flex items-start gap-2 text-[10px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black uppercase tracking-wider">Overdue Tasks Active</strong>
                <span>You have {auditDiagnostics.overdueFollowUps.length} follow-up tasks currently sitting overdue.</span>
              </div>
            </div>
          )}

          {/* Warning: Heavy document chases */}
          {auditDiagnostics.isChasingHeavy && (
            <div className="p-2.5 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/15 text-[var(--color-accent)] rounded-lg flex items-start gap-2 text-[10px]">
              <Archive className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black uppercase tracking-wider">Excessive Document Chases</strong>
                <span>At least one document requirement has triggered 3+ chases. Escalate to manager review.</span>
              </div>
            </div>
          )}

          {/* Healthy Status Display */}
          {!auditDiagnostics.isStale && auditDiagnostics.hasPendingFollowUp && !auditDiagnostics.hasOverdue && !auditDiagnostics.isChasingHeavy && (
            <div className="p-3 bg-green-500/5 border border-green-500/15 text-green-400 rounded-lg flex items-center gap-2 text-[10px] font-semibold">
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-green-400" />
              <span>File communication cadence and operational follow-ups are fully healthy.</span>
            </div>
          )}
        </div>

        {/* INTEGRATED FOLLOW-UPS TRACKER PANEL */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <h4 className="text-[9.5px] text-[var(--color-accent)] uppercase font-black tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Scheduled Follow-Ups
            </h4>
            
            <button 
              onClick={() => setShowAddFollowUp(!showAddFollowUp)}
              className="p-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              title="Add follow-up task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Follow-up additions input form inline */}
          {showAddFollowUp && (
            <form onSubmit={handleCreateFollowUp} className="bg-[var(--color-surface-3)]/40 border border-[var(--color-border)] p-3 rounded-lg space-y-2.5">
              <div className="space-y-1">
                <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">Follow-Up Action</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Call client for bank statements"
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">Target Date</label>
                  <input 
                    type="date" 
                    required
                    value={followUpDueDate}
                    onChange={(e) => setFollowUpDueDate(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1 text-[10px] text-[var(--color-text)] focus:outline-none font-semibold"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">Priority</label>
                  <select 
                    value={followUpPriority}
                    onChange={(e) => setFollowUpPriority(e.target.value as any)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1 text-[10px] font-extrabold text-[var(--color-text)] focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Time Frame inputs */}
              <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface)]/40 p-2 rounded border border-[var(--color-border)]/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[8px] uppercase font-black text-[var(--color-text-faint)]">
                    <Clock className="w-2.5 h-2.5 text-[var(--color-accent)]" />
                    <span>Start Time</span>
                  </div>
                  <input 
                    type="time" 
                    required
                    value={followUpTimeStart}
                    onChange={(e) => setFollowUpTimeStart(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1 text-[10px] text-[var(--color-text)] focus:outline-none font-semibold"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[8px] uppercase font-black text-[var(--color-text-faint)]">
                    <Clock className="w-2.5 h-2.5 text-[var(--color-accent)]" />
                    <span>End Time</span>
                  </div>
                  <input 
                    type="time" 
                    required
                    value={followUpTimeEnd}
                    onChange={(e) => setFollowUpTimeEnd(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1 text-[10px] text-[var(--color-text)] focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">CRM Action Destination</label>
                <select 
                  value={followUpActionType}
                  onChange={(e) => setFollowUpActionType(e.target.value as any)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1 text-[10px] font-extrabold text-[var(--color-text)] focus:outline-none"
                >
                  <option value="task">Task Only</option>
                  <option value="calendar">Calendar Event Only</option>
                  <option value="both">Both (Task & Calendar Event)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">Notes / Details (Optional)</label>
                <textarea 
                  placeholder="Details for task descriptions or calendar notes..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1.5 text-[10px] text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none font-semibold resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">Owner</label>
                <select 
                  value={followUpOwner}
                  onChange={(e) => setFollowUpOwner(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1 text-[10px] font-extrabold uppercase text-[var(--color-text)] focus:outline-none"
                >
                  {agentNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <button 
                  type="button" 
                  onClick={() => setShowAddFollowUp(false)}
                  className="px-2 py-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded text-[9px] uppercase font-black"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-2 py-1 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] rounded text-[9px] uppercase font-black"
                >
                  Schedule
                </button>
              </div>
            </form>
          )}

          {/* List Follow-Ups */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {resolvedFollowUps.length === 0 ? (
              <p className="text-[10px] text-[var(--color-text-faint)] italic text-center py-4 font-semibold">No follow-ups recorded on this file.</p>
            ) : (
              resolvedFollowUps.map(fup => {
                const isCompleted = fup.status === "completed";
                const isOverdue = !isCompleted && fup.dueDate < new Date().toISOString().split("T")[0];

                let priorityStyle = "text-zinc-400 bg-zinc-500/10";
                if (fup.priority === "high") priorityStyle = "text-orange-400 bg-orange-500/10";
                if (fup.priority === "critical") priorityStyle = "text-red-400 bg-red-500/10 animate-pulse";

                let typeBadge = null;
                if (fup.taskId && fup.eventId) {
                  typeBadge = <span className="px-1 py-0.2 rounded font-black tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/10">Task & Cal</span>;
                } else if (fup.taskId) {
                  typeBadge = <span className="px-1 py-0.2 rounded font-black tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/10">Task</span>;
                } else if (fup.eventId) {
                  typeBadge = <span className="px-1 py-0.2 rounded font-black tracking-widest text-pink-400 bg-pink-500/10 border border-pink-500/10">Cal</span>;
                } else {
                  typeBadge = <span className="px-1 py-0.2 rounded font-black tracking-widest text-zinc-500 bg-zinc-500/5 border border-zinc-500/5">Local</span>;
                }

                return (
                  <div 
                    key={fup.id} 
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2.5 transition-colors ${
                      isCompleted 
                        ? "bg-green-500/5 border-green-500/10 text-[var(--color-text-muted)]/40" 
                        : isOverdue
                        ? "bg-red-500/5 border-red-500/15 hover:bg-red-500/10"
                        : "bg-[var(--color-surface-3)]/20 border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]/40"
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {/* Check box control */}
                      <button 
                        onClick={() => handleToggleFollowUp(fup.id)}
                        className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isCompleted ? "bg-green-500 border-green-600 text-black" : "border-[var(--color-border)] bg-[var(--color-surface)] text-transparent"
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[4px]" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <span className={`block font-extrabold truncate text-[10.5px] ${isCompleted ? "line-through text-[var(--color-text-faint)]/60 font-medium" : "text-[var(--color-text)]"}`}>
                          {fup.title}
                        </span>
                        
                        <div className="flex items-center gap-2 mt-1 text-[8px] uppercase font-black text-[var(--color-text-faint)]">
                          <span className={`px-1 py-0.2 rounded font-black tracking-widest ${priorityStyle}`}>{fup.priority}</span>
                          {typeBadge}
                          <span className={isOverdue ? "text-red-400 font-extrabold" : ""}>Due: {fup.dueDate}</span>
                          {fup.timeStart && fup.timeEnd && (
                            <span className="text-[var(--color-accent)] font-bold flex items-center gap-0.5 normal-case">
                              <Clock className="w-2.5 h-2.5 shrink-0 text-[var(--color-accent)]" />
                              <span>{fup.timeStart} - {fup.timeEnd}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteFollowUp(fup.id)}
                      className="text-[var(--color-text-faint)] hover:text-red-400 shrink-0 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* OUTREACH LOGGING MODAL popup */}
      {showLogComm && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none animate-fade-in">
          <form 
            onSubmit={handleLogCommunication}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-5 shadow-2xl relative flex flex-col gap-4 text-xs"
          >
            <h3 className="text-xs font-black uppercase text-[var(--color-accent)] tracking-widest border-b border-[var(--color-border)] pb-2">
              Log Operations Outreach or Touchpoint
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Comm Type */}
              <div className="space-y-1.5">
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Outreach Type</label>
                <select 
                  value={commType}
                  onChange={(e) => setCommType(e.target.value as any)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-bold uppercase"
                >
                  <option value="phone_call">📞 Phone Call</option>
                  <option value="voicemail">📟 Voicemail</option>
                  <option value="email">✉️ Outgoing Email</option>
                  <option value="sms">💬 SMS / SMS Text</option>
                  <option value="meeting">👥 In-person Meeting</option>
                  <option value="lender_update">🏛️ Lender Underwriter</option>
                  <option value="client_chase">🔄 Document Chase</option>
                  <option value="solicitor">⚖️ Solicitor Lawyer</option>
                </select>
              </div>

              {/* Direction */}
              <div className="space-y-1.5">
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Outreach Direction</label>
                <select 
                  value={commDirection}
                  onChange={(e) => setCommDirection(e.target.value as any)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-bold uppercase"
                >
                  <option value="outgoing">Outgoing Outbound</option>
                  <option value="incoming">Incoming Inbound</option>
                </select>
              </div>
            </div>

            {/* Conversation Summary */}
            <div className="space-y-1.5">
              <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Outreach Summary & notes</label>
              <textarea 
                rows={3}
                required
                value={commSummary}
                onChange={(e) => setCommSummary(e.target.value)}
                placeholder="Log exact discussion parameters, files discussed, lender confirmation numbers, or follow up promises..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
              />
            </div>

            {/* Next Action Scheduling */}
            <div className="border-t border-[var(--color-border)] pt-3.5 space-y-3">
              <span className="text-[9px] text-[var(--color-accent)] font-black uppercase tracking-widest block">Optionally Schedule Future Follow-Up Outreach</span>
              
              <div className="space-y-1.5">
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Next Planned Action</label>
                <input 
                  type="text" 
                  value={commNextStep}
                  onChange={(e) => setCommNextStep(e.target.value)}
                  placeholder="e.g. Call client back to confirm receipt of paystub files"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text)] focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Planned Action Due Date</label>
                  <input 
                    type="date" 
                    value={commNextDueDate}
                    onChange={(e) => setCommNextDueDate(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-1.5 text-[var(--color-text)] focus:outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-end gap-2.5 border-t border-[var(--color-border)] pt-3">
              <button 
                type="button" 
                onClick={() => setShowLogComm(false)}
                className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg text-[9px] font-black uppercase"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-3 py-1.5 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Log Touchpoint
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
