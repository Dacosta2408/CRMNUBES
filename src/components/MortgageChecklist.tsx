import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckSquare, Plus, RefreshCw, AlertTriangle, CheckCircle2, 
  Clock, HelpCircle, Calendar, User, Save, Trash2, ChevronDown, 
  ChevronRight, AlertCircle, FileText, Sparkles, Check, X
} from "lucide-react";
import { Client, User as CRMUser } from "../types";
import { 
  ChecklistItem, 
  CHECKLIST_CATEGORIES, 
  generateChecklistForClient, 
  evaluateChecklistReadiness,
  STAGES_ORDER
} from "../lib/checklistEngine";
import { logActivityEvent } from "../lib/activityEngine";

interface MortgageChecklistProps {
  client: Client;
  currentUser: CRMUser;
  docVault: Record<string, any>;
  setDocVault: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  agentNames: string[];
  showToast: (msg: string, type?: "success" | "error" | "info", icon?: string) => void;
}

export const MortgageChecklist: React.FC<MortgageChecklistProps> = ({
  client,
  currentUser,
  docVault,
  setDocVault,
  agentNames,
  showToast
}) => {
  // Load or initialize checklist items from localStorage
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem(`gbk_checklist_items_${client.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing checklist items", e);
      }
    }
    return generateChecklistForClient(client);
  });

  // Save to localStorage when items list changes
  useEffect(() => {
    localStorage.setItem(`gbk_checklist_items_${client.id}`, JSON.stringify(items));
    // Also dispatch custom event to notify App.tsx or FileReadiness if they want to recalculate
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("checklist-updated", { detail: { clientId: client.id } }));
    }, 0);
    return () => clearTimeout(timer);
  }, [items, client.id]);

  // If client details change (e.g. status or type), we can let user know they can re-generate,
  // but let's not force overwrite their customized lists.
  // Instead, let's provide a visible button to 'Sync / Regenerate to Template Rules'.

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    // Expand categories with pending tasks by default, other categories collapsed
    const defaultStates: Record<string, boolean> = {};
    CHECKLIST_CATEGORIES.forEach(cat => {
      defaultStates[cat] = true; // start all expanded for great visibility
    });
    return defaultStates;
  });

  // Editing state for notes, due date, owner
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editOwner, setEditOwner] = useState("");

  // New custom item modal/form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<typeof CHECKLIST_CATEGORIES[number]>("Client Intake");
  const [newItemRequired, setNewItemRequired] = useState(true);
  const [newItemStage, setNewItemStage] = useState<typeof STAGES_ORDER[number]>("working");

  // Sync checklist with DocVault dynamically
  const syncedItems = useMemo(() => {
    const clientVault = docVault[client.id] || {};
    return items.map(item => {
      if (item.linkedDocId) {
        const doc = clientVault[item.linkedDocId] || {};
        const docStatus = doc.status || "required";

        // Sync rules:
        // 'approved' / 'waived' / 'na' -> Completed
        // 'under_review' / 'received' -> Needs Review
        // 'requested' -> Waiting on Client
        // 'required' -> Not Started (if it was previously Completed, we revert it unless manually waived)
        let resolvedStatus = item.status;
        if (docStatus === "approved" || docStatus === "waived" || docStatus === "na") {
          resolvedStatus = "Completed";
        } else if (docStatus === "under_review" || docStatus === "received") {
          resolvedStatus = "Needs Review";
        } else if (docStatus === "requested") {
          resolvedStatus = "Waiting on Client";
        } else if (docStatus === "required" && (item.status === "Completed" || item.status === "Needs Review" || item.status === "Waiting on Client")) {
          resolvedStatus = "Not Started";
        }

        return {
          ...item,
          status: resolvedStatus
        };
      }
      return item;
    });
  }, [items, docVault, client.id]);

  // Compute readiness
  const readiness = useMemo(() => {
    return evaluateChecklistReadiness(client, items, docVault);
  }, [client, items, docVault]);

  // Toggle category expand
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Update an item's status manually
  const handleUpdateStatus = (itemId: string, newStatus: ChecklistItem["status"]) => {
    const matchedItem = items.find(i => i.id === itemId);
    if (matchedItem) {
      logActivityEvent({
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        eventType: "checklist_updated",
        user: `${currentUser.first} ${currentUser.last}`,
        timestamp: new Date().toISOString(),
        description: `Marked checklist condition "${matchedItem.name}" as [${newStatus}]`,
        details: `Category: ${matchedItem.category} | Linked stage: ${matchedItem.linkedStage || "General"}`
      });

      // Also sync back to document vault if it's a linked doc item!
      if (matchedItem.linkedDocId) {
        const clientVault = docVault[client.id] || {};
        const currentDoc = clientVault[matchedItem.linkedDocId] || {};
        let docVaultStatus = currentDoc.status || "required";

        if (newStatus === "Completed") docVaultStatus = "approved";
        else if (newStatus === "Waived") docVaultStatus = "waived";
        else if (newStatus === "Waiting on Client") docVaultStatus = "requested";
        else if (newStatus === "Needs Review") docVaultStatus = "under_review";
        else if (newStatus === "Not Started") docVaultStatus = "required";

        const updatedDocs = {
          ...clientVault,
          [matchedItem.linkedDocId]: {
            ...currentDoc,
            status: docVaultStatus,
            reviewedBy: `${currentUser.first} ${currentUser.last}`,
            reviewedAt: new Date().toISOString()
          }
        };
        setDocVault(prev => ({ ...prev, [client.id]: updatedDocs }));
      }
    }

    const isCompleted = newStatus === "Completed" || newStatus === "Waived";
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: newStatus,
          completionTimestamp: isCompleted ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    }));
    showToast(`Task status updated successfully.`, "success", "✓");
  };

  // Start editing item metadata
  const startEditing = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditNotes(item.notes || "");
    setEditDueDate(item.dueDate || "");
    setEditOwner(item.assignedOwner || "");
  };

  // Save item edits
  const saveEdits = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          notes: editNotes,
          dueDate: editDueDate,
          assignedOwner: editOwner,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    }));
    setEditingItemId(null);
    showToast("Task details updated.", "success", "💾");
  };

  // Reset checklist to template rules
  const handleResetChecklist = () => {
    if (window.confirm("Are you sure you want to reset this client's checklist? This will overwrite any custom tasks, notes, due dates, and custom assignments.")) {
      const freshList = generateChecklistForClient(client);
      setItems(freshList);
      showToast("Checklist successfully reset to default rules.", "info", "🔄");
    }
  };

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const customId = `custom_${Date.now()}`;
    const newItem: ChecklistItem = {
      id: customId,
      name: newItemName.trim(),
      category: newItemCategory,
      required: newItemRequired,
      status: "Not Started",
      notes: "",
      assignedOwner: currentUser.first + " " + currentUser.last,
      dueDate: "",
      linkedStage: newItemStage,
      updatedAt: new Date().toISOString()
    };

    // Log operational timeline event
    logActivityEvent({
      clientId: client.id,
      clientName: `${client.first} ${client.last}`,
      eventType: "checklist_updated",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Added custom/bespoke checklist condition: "${newItem.name}"`,
      details: `Category: ${newItem.category} | Stage: ${newItem.linkedStage || "General"}`
    });

    setItems(prev => [...prev, newItem]);
    setNewItemName("");
    setShowAddModal(false);
    showToast(`Bespoke condition added: "${newItem.name}"`, "success", "✨");
  };

  // Delete custom item
  const handleDeleteItem = (itemId: string) => {
    const matchedItem = items.find(item => item.id === itemId);
    if (window.confirm("Are you sure you want to delete this custom checklist item?")) {
      if (matchedItem) {
        logActivityEvent({
          clientId: client.id,
          clientName: `${client.first} ${client.last}`,
          eventType: "checklist_updated",
          user: `${currentUser.first} ${currentUser.last}`,
          timestamp: new Date().toISOString(),
          description: `Deleted checklist condition: "${matchedItem.name}"`
        });
      }
      setItems(prev => prev.filter(item => item.id !== itemId));
      showToast("Custom task removed.", "info", "🗑️");
    }
  };

  // Status Styling record
  const itemStatusStyles: Record<ChecklistItem["status"], { label: string; bg: string; border: string; text: string; dot: string }> = {
    "Not Started": { label: "Not Started", bg: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-400" },
    "Waiting on Client": { label: "Waiting Client", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
    "In Progress": { label: "In Progress", bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-400", dot: "bg-sky-400" },
    "Submitted": { label: "Submitted", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
    "Completed": { label: "Completed", bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", dot: "bg-green-400" },
    "Blocked": { label: "Blocked", bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
    "Waived": { label: "Waived", bg: "bg-emerald-500/5", border: "border-emerald-500/15", text: "text-emerald-400/80", dot: "bg-emerald-400" },
    "Needs Review": { label: "Needs Review", bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", dot: "bg-indigo-400" }
  };

  return (
    <div className="flex flex-col gap-5 text-xs text-[var(--color-text-muted)]">
      
      {/* 1. CHECKLIST HEADER & METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[var(--color-surface-2)]/45 border border-[var(--color-border)] p-4 rounded-xl">
        {/* Progress & Title */}
        <div className="flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4.5 w-4.5 text-[var(--color-primary)]" />
            <h3 className="text-sm font-black uppercase text-[var(--color-text)] tracking-wider">File Checklist Engine</h3>
          </div>
          <p className="text-[10px] text-[var(--color-text-faint)] font-semibold leading-relaxed">
            Dynamic file workflow generated for <strong className="text-[var(--color-text)]">{(client.type || "Purchase").toUpperCase()}</strong> file &amp; <strong className="text-[var(--color-text)]">{(client.emptype || "Salaried").toUpperCase()}</strong> situation.
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1 bg-[#6fa3b8]/10 hover:bg-[#6fa3b8]/20 text-[#6fa3b8] border border-[#6fa3b8]/30 rounded-md font-bold uppercase tracking-wider flex items-center gap-1 transition-colors text-[9px]"
            >
              <Plus className="w-3 h-3" /> Bespoke Item
            </button>
            <button
              onClick={handleResetChecklist}
              className="px-2.5 py-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-md font-bold uppercase tracking-wider flex items-center gap-1 transition-colors text-[9px]"
              title="Reset items checklist back to standard system templates"
            >
              <RefreshCw className="w-3 h-3" /> Reset Rules
            </button>
          </div>
        </div>

        {/* Completion Bar */}
        <div className="bg-[var(--color-surface-2)]/80 border border-[var(--color-border)] p-3 rounded-lg flex flex-col justify-center gap-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
            <span>Workflow Completeness</span>
            <span className="text-[var(--color-primary)] font-mono">{readiness.checklistScore}%</span>
          </div>
          <div className="w-full bg-[var(--color-surface-3)] rounded-full h-2 overflow-hidden border border-[var(--color-border)]">
            <div 
              className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] h-full transition-all duration-500 rounded-full" 
              style={{ width: `${readiness.checklistScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[8px] text-[var(--color-text-faint)] uppercase font-black tracking-widest mt-0.5">
            <span>{syncedItems.filter(i => i.status === "Completed" || i.status === "Waived").length} Completed</span>
            <span>{syncedItems.filter(i => i.required).length} Required Steps</span>
          </div>
        </div>

        {/* Dynamic State Indicator */}
        <div className={`p-3 rounded-lg border flex flex-col justify-center gap-1.5 ${
          readiness.readinessState === "Ready" 
            ? "bg-green-500/5 border-green-500/10 text-green-400" 
            : readiness.readinessState === "Blocked"
            ? "bg-red-500/5 border-red-500/10 text-red-400"
            : "bg-amber-500/5 border-amber-500/10 text-amber-400"
        }`}>
          <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>File Readiness Status</span>
          </div>
          <div className="font-bold text-[var(--color-text)] text-xs">
            {readiness.readinessState === "Blocked" ? "File is BLOCKED from stage progression" : readiness.readinessState}
          </div>
          <p className="text-[9px] text-[var(--color-text-muted)] italic font-medium line-clamp-2">
            {readiness.blockerReason}
          </p>
        </div>
      </div>

      {/* 2. OVERALL STAGE READINESS PROGRESS CARDS */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3">
        <h4 className="text-[9px] text-[var(--color-accent)] uppercase font-black tracking-widest mb-3 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Underwriting Stage Progression Audit
        </h4>
        <div className="flex flex-wrap gap-2 md:grid md:grid-cols-7 text-[9px] font-black uppercase tracking-wider text-center">
          {STAGES_ORDER.map((stage) => {
            const isCurrent = client.status === stage;
            const stageIndex = STAGES_ORDER.indexOf(stage);
            const currentStageIndex = STAGES_ORDER.indexOf(client.status as typeof STAGES_ORDER[number]);
            
            // Calculate active blockers for this specific stage
            const stageBlockers = syncedItems.filter(item => {
              return item.required && 
                     item.linkedStage === stage && 
                     item.status !== "Completed" && 
                     item.status !== "Waived";
            });

            const hasActiveBlocker = stageBlockers.length > 0;
            const isPast = stageIndex < currentStageIndex;
            const isFuture = stageIndex > currentStageIndex;

            let cardBg = "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-faint)]/65";
            if (isCurrent) {
              cardBg = hasActiveBlocker 
                ? "bg-red-500/10 border-red-500/20 text-red-400 shadow-md ring-1 ring-red-500/10" 
                : "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)] shadow-md ring-1 ring-[var(--color-primary)]/10";
            } else if (isPast) {
              cardBg = "bg-green-500/5 border-green-500/15 text-green-400";
            }

            return (
              <div 
                key={stage} 
                className={`p-2 rounded-lg border ${cardBg} flex flex-col justify-between items-center min-h-[50px] transition-all`}
                title={`${stage.toUpperCase()} Stage requirements`}
              >
                <span className="font-black truncate w-full">{stage}</span>
                {isCurrent && (
                  <span className="text-[7px] bg-[var(--color-surface-3)] px-1 py-0.2 rounded mt-1 text-[var(--color-text)] block font-extrabold">ACTIVE</span>
                )}
                {hasActiveBlocker && (
                  <span className="text-[7px] text-red-400 mt-1 block">⚠️ {stageBlockers.length} BLOCKED</span>
                )}
                {!hasActiveBlocker && !isFuture && !isCurrent && (
                  <span className="text-green-500 text-[8px] mt-1 block">✓ CLEARED</span>
                )}
                {isFuture && stageBlockers.length > 0 && (
                  <span className="text-[var(--color-text-faint)]/45 text-[7px] mt-1 block font-semibold">{stageBlockers.length} Pending</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CHECKLIST WORKING SECTIONS */}
      <div className="flex flex-col gap-3">
        {CHECKLIST_CATEGORIES.map(category => {
          const categoryItems = syncedItems.filter(i => i.category === category);
          if (categoryItems.length === 0) return null; // hide empty categories to stay uncluttered

          const isExpanded = expandedCategories[category];
          const completedInCat = categoryItems.filter(i => i.status === "Completed" || i.status === "Waived").length;
          const totalInCat = categoryItems.length;

          return (
            <div key={category} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden transition-all">
              
              {/* Category Subheader */}
              <div 
                onClick={() => toggleCategory(category)}
                className="px-4 py-2.5 bg-[var(--color-surface-2)]/80 hover:bg-[var(--color-surface-3)] cursor-pointer flex items-center justify-between border-b border-[var(--color-border)] transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                  )}
                  <span className="font-black uppercase tracking-wider text-[var(--color-text)]">{category}</span>
                  <span className="text-[8px] px-1.5 py-0.2 bg-[var(--color-surface-3)] text-[var(--color-text-muted)] rounded font-black font-mono">
                    {completedInCat}/{totalInCat}
                  </span>
                </div>
                
                {/* Category summary completion */}
                <div className="flex items-center gap-2">
                  {completedInCat === totalInCat ? (
                    <span className="text-[8px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Cleared</span>
                  ) : categoryItems.some(i => i.status === "Blocked") ? (
                    <span className="text-[8px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full uppercase">Blocked</span>
                  ) : (
                    <span className="text-[8px] text-[var(--color-text-faint)] font-black uppercase">Pending</span>
                  )}
                </div>
              </div>
               {/* Category Items List */}
              {isExpanded && (
                <div className="divide-y divide-[var(--color-border)]">
                  {categoryItems.map(item => {
                    const statusStyle = itemStatusStyles[item.status] || itemStatusStyles["Not Started"];
                    const isEditing = editingItemId === item.id;
                    const isCustom = item.id.startsWith("custom_");

                    return (
                      <div key={item.id} className="p-3.5 hover:bg-[var(--color-surface-2)]/30 transition-colors flex flex-col gap-2.5">
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          
                          {/* Item text/label */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.required ? (
                                <span className="bg-red-500/10 border border-red-500/25 text-red-400 text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded tracking-widest">REQUIRED</span>
                              ) : (
                                <span className="bg-zinc-500/10 border border-zinc-500/25 text-[var(--color-text-muted)] text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded tracking-widest">OPTIONAL</span>
                              )}
                              <span className="text-[var(--color-text)] font-bold text-[11.5px]">{item.name}</span>
                              {isCustom && (
                                <span className="bg-[#6fa3b8]/15 border border-[#6fa3b8]/25 text-[#6fa3b8] text-[7px] font-black uppercase px-1.5 py-0.2 rounded">Bespoke</span>
                              )}
                            </div>

                            {/* Linked stage / Linked document tags */}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[8.5px] font-black uppercase tracking-wider text-[var(--color-text-faint)]">
                              <span>Required for Stage: <strong className="text-[var(--color-text-muted)] font-black">{item.linkedStage}</strong></span>
                              {item.linkedDocId && (
                                <span className="flex items-center gap-1 bg-[#6fa3b8]/5 border border-[#6fa3b8]/10 text-[#6fa3b8] px-2 py-0.5 rounded">
                                  <FileText className="w-2.5 h-2.5" /> Direct Doc Link: {item.linkedDocId}
                                </span>
                              )}
                            </div>

                            {/* Item notes */}
                            {item.notes && !isEditing && (
                              <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 pl-3 border-l-2 border-[var(--color-border)] leading-relaxed italic font-medium">
                                {item.notes}
                              </p>
                            )}

                            {/* Due date & Assigned Broker metadata */}
                            {!isEditing && (item.dueDate || item.assignedOwner) && (
                              <div className="flex items-center gap-3 mt-1.5 text-[9px] text-[#8e95a3]">
                                {item.dueDate && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Calendar className="w-3 h-3 text-[var(--color-text-faint)]" /> Due: {item.dueDate}
                                  </span>
                                )}
                                {item.assignedOwner && (
                                  <span className="flex items-center gap-1 font-medium uppercase">
                                    <User className="w-3 h-3 text-[var(--color-text-faint)]" /> Owner: {item.assignedOwner}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Item status selectors & Action controls */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                            
                            {/* Simple Status Indicator Badge */}
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text} flex items-center gap-1 shrink-0`}>
                              <span className={`w-1 h-1 rounded-full ${statusStyle.dot}`} />
                              {statusStyle.label}
                            </span>

                            {/* Change status manual drop down */}
                            <select 
                              value={item.status}
                              onChange={(e) => handleUpdateStatus(item.id, e.target.value as ChecklistItem["status"])}
                              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[9px] rounded p-1 font-black uppercase text-[var(--color-text)] focus:outline-none cursor-pointer"
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="Waiting on Client">Waiting on Client</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Submitted">Submitted</option>
                              <option value="Completed">Completed</option>
                              <option value="Blocked">Blocked</option>
                              <option value="Waived">Waived</option>
                              <option value="Needs Review">Needs Review</option>
                            </select>

                            {/* Edit parameters button */}
                            {!isEditing && (
                              <button 
                                onClick={() => startEditing(item)}
                                className="p-1.5 text-[9px] uppercase bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-bold transition-colors"
                                title="Edit item details"
                              >
                                Edit
                              </button>
                            )}

                            {isCustom && !isEditing && (
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded border border-red-500/10"
                                title="Delete bespoke item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                        </div>

                        {/* Expandable Editing Panel */}
                        {isEditing && (
                          <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] p-3 rounded-lg flex flex-col gap-3 mt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Due Date */}
                              <div className="space-y-1">
                                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Due Date</label>
                                <input 
                                  type="date" 
                                  value={editDueDate}
                                  onChange={(e) => setEditDueDate(e.target.value)}
                                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded p-1.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
                                />
                              </div>

                              {/* Owner */}
                              <div className="space-y-1">
                                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Assigned Owner</label>
                                <select 
                                  value={editOwner}
                                  onChange={(e) => setEditOwner(e.target.value)}
                                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded p-1.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 font-bold uppercase"
                                >
                                  <option value="">Unassigned</option>
                                  {agentNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1">
                              <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-black">Internal Underwriter Notes / Blockers</label>
                              <textarea 
                                rows={2}
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Log requirements notes, phone conversations, follow-up timelines, or specific clearing details..."
                                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded p-1.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 placeholder-[var(--color-text-faint)]/40 font-semibold"
                              />
                            </div>

                            {/* Save/Cancel Controls */}
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setEditingItemId(null)}
                                className="px-2.5 py-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] rounded-md text-[9px] font-black uppercase text-[var(--color-text-muted)]"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => saveEdits(item.id)}
                                className="px-2.5 py-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/20 rounded-md text-[9px] font-black uppercase text-[var(--color-primary)] flex items-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" /> Save Changes
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* 4. BESPOKE ITEM ADDITION MODAL overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
          <form 
            onSubmit={handleAddCustomItem}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-5 shadow-2xl relative flex flex-col gap-4 text-xs"
          >
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded bg-[var(--color-surface-2)]"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-xs font-black uppercase text-[var(--color-primary)] tracking-widest border-b border-[var(--color-border)] pb-2">
              Add Bespoke Checklist Condition
            </h3>

            {/* Task Name */}
            <div className="space-y-1.5">
              <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black">Item Description / Condition Clause</label>
              <input 
                type="text" 
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Verify teacher job contract details with Board of Education"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded p-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] font-semibold placeholder-[var(--color-text-faint)]/40"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black">Workflow Category</label>
                <select 
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as typeof CHECKLIST_CATEGORIES[number])}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded p-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] font-bold uppercase"
                >
                  {CHECKLIST_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Linked Stage */}
              <div className="space-y-1.5">
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black">Linked Target File Stage</label>
                <select 
                  value={newItemStage}
                  onChange={(e) => setNewItemStage(e.target.value as typeof STAGES_ORDER[number])}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded p-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] font-bold uppercase"
                >
                  {STAGES_ORDER.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Required Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" 
                id="newItemRequired"
                checked={newItemRequired}
                onChange={(e) => setNewItemRequired(e.target.checked)}
                className="rounded border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <label htmlFor="newItemRequired" className="font-black text-[var(--color-text-muted)] text-[9px] uppercase cursor-pointer">
                Strict Underwriting Requirement (Acts as stage progression blocker)
              </label>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] rounded-lg text-[9px] font-black uppercase text-[var(--color-text-muted)] border border-[var(--color-border)]"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-3 py-1.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/20 rounded-lg text-[9px] font-black uppercase text-[var(--color-primary)]"
              >
                Add Condition
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
