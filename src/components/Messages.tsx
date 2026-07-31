import React, { useState, useMemo, useEffect } from "react";
import { 
  Send, FileText, Bookmark, Users, HelpCircle, Search, 
  X, Pin, Plus, AlertCircle, CheckCircle, Check, ArrowRight, 
  Trash2, Bell, Tag, Link2, Paperclip, Phone, MoreHorizontal,
  ChevronRight, Sparkles, Smile, ShieldAlert, BadgeInfo, Calendar, UserPlus, Eye
} from "lucide-react";
import { Client, Task } from "../types";

interface Message {
  id: string;
  senderId: string;
  author: string;
  initials: string;
  role: string;
  text: string;
  time: string;
  date: string;
  clientTag?: string;
  clientId?: string;
  priority?: "urgent" | "blocked" | "lender_pending" | "client_pending" | "compliance" | "normal";
  pinned?: boolean;
  attachments?: { name: string; size: string; type: string }[];
  mentions?: string[];
  readBy?: string[];
  reactions?: Record<string, string[]>;
}

interface MessagesProps {
  messages: Record<string, any[]>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  clients: Client[];
  currentUser: {
    first: string;
    last: string;
    role?: string;
    avatar?: string;
    photo?: string;
    [key: string]: any;
  };
  activeChannel: string;
  setActiveChannel: (ch: string) => void;
  linkedChatClientId: string | null;
  setLinkedChatClientId: (id: string | null) => void;
  onOpenClient: (id: string) => void;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  userRoster?: any[];
}

// Seeded Teammates for Direct Messages with precise roles & live availability indicators
export const TEAM_ROSTER = [
  { id: "dm_david", name: "David Acosta", role: "Owner / Master Admin", status: "online", statusLabel: "Active 🟢", color: "bg-emerald-500", avatar: null },
  { id: "dm_wayne", name: "Wayne MacLeod", role: "BDM / Senior Broker", status: "busy", statusLabel: "In Lender Call 📞", color: "bg-red-400", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "dm_jeff", name: "Jeff Brown", role: "Admin Assistant", status: "online", statusLabel: "Processing paystubs 🟢", color: "bg-emerald-500", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "dm_tim", name: "Tim Brown", role: "Broker Principal", status: "offline", statusLabel: "Offline ⚪", color: "bg-slate-500", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "dm_jamey", name: "Jamey Brown", role: "Mortgage Broker", status: "away", statusLabel: "Reviewing files 🟡", color: "bg-amber-500", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "dm_matt", name: "Matt Brown", role: "Mortgage Broker", status: "online", statusLabel: "Processing BFS file 🟢", color: "bg-emerald-500", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "dm_jason", name: "Jason Myszkowski", role: "Mortgage Broker", status: "away", statusLabel: "On-site visit 🟡", color: "bg-amber-500", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80" }
];

// Escalation Flag UI Schemes
export const ESCALATION_FLAGS = {
  normal: { label: "Normal Update", color: "text-slate-400 border-white/5 bg-transparent", icon: null },
  urgent: { label: "🚨 Urgent Escalation", color: "text-red-400 border-red-500/20 bg-red-500/5", icon: "🌋" },
  blocked: { label: "🛑 Deal Blocked", color: "text-rose-400 border-rose-500/20 bg-rose-500/5", icon: "🛑" },
  lender_pending: { label: "🏦 Lender Pending", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5", icon: "🏦" },
  client_pending: { label: "📝 Client Pending", color: "text-amber-400 border-amber-500/20 bg-amber-500/5", icon: "📝" },
  compliance: { label: "⚖️ Compliance Concern", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", icon: "⚖️" }
};

export const Messages: React.FC<MessagesProps> = ({
  messages,
  setMessages,
  clients,
  currentUser,
  activeChannel,
  setActiveChannel,
  linkedChatClientId,
  setLinkedChatClientId,
  onOpenClient,
  tasks,
  setTasks,
  showToast,
  userRoster
}) => {
  const authorInitials = useMemo(() => {
    return ((currentUser?.first?.[0] || "") + (currentUser?.last?.[0] || "")).toUpperCase() || "ME";
  }, [currentUser]);

  // Input composer & searching controls
  const [msgInputText, setMsgInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEscalationFilter, setSelectedEscalationFilter] = useState<string>("all");
  const [selectedClientSearch, setSelectedClientSearch] = useState<string>("");
  const [showClientLinkDropdown, setShowClientLinkDropdown] = useState(false);
  const [clientDropdownSearch, setClientDropdownSearch] = useState("");
  const [msgPriority, setMsgPriority] = useState<"urgent" | "blocked" | "lender_pending" | "client_pending" | "compliance" | "normal">("normal");

  // Mock document drafts attached to composer
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [showAttachPresets, setShowAttachPresets] = useState(false);

  // Unread Trackers simulated dynamically in state
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(() => {
    return {
      "dm_wayne": 1
    };
  });

  // Task conversion wizard sidebar modal
  const [isTaskWizardOpen, setIsTaskWizardOpen] = useState(false);
  const [wizardDraftTask, setWizardDraftTask] = useState<{
    title: string;
    notes: string;
    priority: "high" | "medium" | "low" | "urgent";
    category: string;
    clientId: string;
    dueDate: string;
    assignedTo: string;
  } | null>(null);

  // Pins Panel toggle
  const [showPinsPanel, setShowPinsPanel] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Chat Roster representing the 7 actual Admin Panel users + any custom ones
  const [chatRoster, setChatRoster] = useState<any[]>(() => {
    const saved = localStorage.getItem("gbk_chat_roster");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return TEAM_ROSTER;
  });

  // Persist chat roster
  useEffect(() => {
    localStorage.setItem("gbk_chat_roster", JSON.stringify(chatRoster));
  }, [chatRoster]);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Mortgage Broker");
  const [newMemberStatusLabel, setNewMemberStatusLabel] = useState("Active 🟢");

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newId = `dm_${Date.now()}`;
    const statusColor = 
      newMemberStatusLabel.includes("🟢") || newMemberStatusLabel.toLowerCase().includes("online") || newMemberStatusLabel.toLowerCase().includes("active") ? "bg-emerald-500" :
      newMemberStatusLabel.includes("🔴") || newMemberStatusLabel.toLowerCase().includes("busy") || newMemberStatusLabel.toLowerCase().includes("call") ? "bg-red-400" :
      newMemberStatusLabel.includes("🟡") || newMemberStatusLabel.toLowerCase().includes("away") || newMemberStatusLabel.toLowerCase().includes("site") ? "bg-amber-500" : "bg-slate-500";

    const newMember = {
      id: newId,
      name: newMemberName.trim(),
      role: newMemberRole.trim() || "Mortgage Broker",
      status: "online",
      statusLabel: newMemberStatusLabel.trim() || "Active 🟢",
      color: statusColor,
      avatar: null
    };

    setChatRoster(prev => [...prev, newMember]);
    setNewMemberName("");
    setNewMemberRole("Mortgage Broker");
    setNewMemberStatusLabel("Active 🟢");
    setAddMemberOpen(false);
    setActiveChannel(newId);
    if (showToast) {
      showToast(`${newMember.name} added to Team Hub discussion roster`, "success", "👤");
    }
  };

  useEffect(() => {
    const dm = chatRoster.find(t => t.id === activeChannel);
    if (!dm) { setTypingUser(null); return; }
    const delay = setTimeout(() => {
      setTypingUser(dm.name.split(" ")[0]);
      setTimeout(() => setTypingUser(null), 3000);
    }, 1500);
    return () => clearTimeout(delay);
  }, [activeChannel, chatRoster]);

  // Sync out unread counter when user opens a channel
  useEffect(() => {
    if (unreadCounts[activeChannel]) {
      setUnreadCounts(prev => ({
        ...prev,
        [activeChannel]: 0
      }));
    }
  }, [activeChannel, unreadCounts]);

  const currentChannelDetails = useMemo(() => {
    const dm = chatRoster.find(t => t.id === activeChannel);
    if (dm) {
      return { 
        name: dm.name, 
        role: dm.role, 
        status: dm.status, 
        statusLabel: dm.statusLabel, 
        color: dm.color, 
        avatar: dm.avatar,
        privacy: "direct-message", 
        isChannel: false, 
        icon: "👤" 
      };
    }
    return { name: "Direct Message", role: "Team Member", status: "offline", statusLabel: "Offline", color: "bg-slate-500", privacy: "direct-message", isChannel: false, icon: "👤", avatar: null };
  }, [activeChannel, chatRoster]);

  // Sanitize message objects to match full operational model
  const rawChannelMessages = useMemo(() => {
    const list = messages[activeChannel] || [];
    return list.map((m: any, idx) => ({
      id: m.id || `m_seeded_${activeChannel}_${idx}`,
      senderId: m.senderId || "staff_other",
      author: m.author || "Teammate",
      initials: m.initials || m.author?.slice(0, 2).toUpperCase() || "TM",
      role: m.role || (m.author === "Tim Brown" ? "Broker Principal" : m.author === "Wayne MacLeod" ? "BDM" : m.author === "Jeff Brown" ? "Assistant" : "Mortgage Agent"),
      text: m.text || "",
      time: m.time || "10:00 AM",
      date: m.date || "Today",
      clientTag: m.clientTag || undefined,
      clientId: m.clientId || (m.clientTag ? clients.find(c => m.clientTag.includes(c.last))?.id : undefined),
      priority: m.priority || "normal",
      pinned: m.pinned || false,
      attachments: m.attachments || [],
      mentions: m.mentions || [],
      readBy: m.readBy || ["TB", "WM", "JM"],
      reactions: m.reactions || {}
    }));
  }, [messages, activeChannel, clients]);

  // Dynamic filter lists
  const filteredMessages = useMemo(() => {
    return rawChannelMessages.filter(m => {
      const textMatches = searchQuery === "" || m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.author.toLowerCase().includes(searchQuery.toLowerCase());
      const priorityMatches = selectedEscalationFilter === "all" || m.priority === selectedEscalationFilter;
      const clientMatches = selectedClientSearch === "" || m.clientId === selectedClientSearch;
      return textMatches && priorityMatches && clientMatches;
    });
  }, [rawChannelMessages, searchQuery, selectedEscalationFilter, selectedClientSearch]);

  const pinnedChannelMessages = useMemo(() => {
    return rawChannelMessages.filter(m => m.pinned);
  }, [rawChannelMessages]);

  // Helper template string inserts
  const handleInsertTemplate = (type: string) => {
    const templates: Record<string, { body: string; priority: any }> = {
      "follow-up": {
        body: "Checking in on the outstanding documents. I have sent an automated reminder to the borrower to secure their signed commitment summary and updated paystubs.",
        priority: "client_pending"
      },
      "lender-update": {
        body: "🏦 TD came back on the submission! Turnaround details: CONDITIONAL COMMITMENT issued. Turnaround under active review at funding desk.",
        priority: "lender_pending"
      },
      "doc-checklist": {
        body: "Missing Checklist Audited: Paystubs and tax NOA are verified. We are awaiting 90-day bank history records for matching validation before direct dispatch.",
        priority: "client_pending"
      },
      "blocked-file": {
        body: "🛑 FILE BLOCKED: Underwriting reported appraisal shortfall. Appraisal came in at $40K below purchase valuation. Need to re-evaluate capital source options with the team.",
        priority: "blocked"
      },
      "compliance-pass": {
        body: "⚖️ Compliance checks are completely clear. All anti-money-laundering audits, broker disclosures, and client IDs align with standards. This file is cleared for pre-funding release.",
        priority: "compliance"
      },
      "closing-funded": {
        body: "💰 TRANSACTION FUNDED! Confirmation package has flown to solicitor list, commission schedules are drawn, and first post-close follow-up sequence is queued in retention loop.",
        priority: "normal"
      }
    };

    const target = templates[type];
    if (target) {
      setMsgInputText(target.body);
      setMsgPriority(target.priority);
      if (showToast) {
        showToast(`Template inserted: ${type.replace("-", " ")}`, "success", "📋");
      }
    }
  };

  // Attach Preset Helper
  const handleAttachPresetAction = (fileName: string, mime: string, size: string) => {
    setAttachedFiles(prev => {
      if (prev.some(f => f.name === fileName)) return prev;
      return [...prev, { name: fileName, size, type: mime }];
    });
    setShowAttachPresets(false);
  };

  // Primary messaging dispatch
  const handleSendMessage = () => {
    if (!msgInputText.trim() && attachedFiles.length === 0) return;

    const authorName = currentUser.first + " " + currentUser.last;
    const authorInitials = (currentUser.first[0] + currentUser.last[0]).toUpperCase();
    const now = new Date();

    const selectedClient = clients.find(c => c.id === linkedChatClientId);

    const newMsg: Message = {
      id: "m_user_" + Date.now(),
      senderId: "staff_me",
      author: authorName,
      initials: authorInitials,
      role: "Mortgage Broker (Owner)",
      text: msgInputText.trim(),
      time: now.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }),
      date: "Today",
      priority: msgPriority,
      clientTag: selectedClient ? `${selectedClient.last} File` : undefined,
      clientId: linkedChatClientId || undefined,
      attachments: attachedFiles,
      pinned: false,
      mentions: msgInputText.includes("@") ? extractMentions(msgInputText) : [],
      readBy: [authorInitials]
    };

    // Update parent state
    setMessages(prev => {
      const updated = {
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), newMsg]
      };
      // Keep localStorage current
      localStorage.setItem("gbk_messages", JSON.stringify(updated));
      return updated;
    });

    // Reset composer state
    setMsgInputText("");
    setAttachedFiles([]);
    setMsgPriority("normal");
    setLinkedChatClientId(null);
    if (showToast) {
      showToast("Ops update successfully dispatched to team!", "success", "📤");
    }
  };

  // Extract simple @ prefixes
  const extractMentions = (text: string) => {
    const list: string[] = [];
    const words = text.split(" ");
    words.forEach(w => {
      if (w.startsWith("@") && w.length > 2) {
        list.push(w.slice(1));
      }
    });
    return list;
  };

  // Pin / Unpin on click toggle
  const handleTogglePinMessage = (msgId: string) => {
    setMessages(prev => {
      const activeList = prev[activeChannel] || [];
      const updatedList = activeList.map((m: any) => {
        if (m.id === msgId) {
          const nextPinned = !m.pinned;
          if (showToast) {
            showToast(nextPinned ? "Message pinned to channel banner." : "Message removed from pin boards.", "info", "📌");
          }
          return { ...m, pinned: nextPinned };
        }
        return m;
      });
      const updatedObj = { ...prev, [activeChannel]: updatedList };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });
  };

  // Delete message safely
  const handleDeleteMessage = (msgId: string) => {
    setMessages(prev => {
      const activeList = prev[activeChannel] || [];
      const updatedList = activeList.filter((m: any) => m.id !== msgId);
      const updatedObj = { ...prev, [activeChannel]: updatedList };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });
  };

  // Toggle emoji reaction
  const handleToggleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => {
      const activeList = prev[activeChannel] || [];
      const updatedList = activeList.map((m: any) => {
        if (m.id === msgId) {
          const reactions = { ...(m.reactions || {}) };
          const currentReactors = reactions[emoji] || [];
          let nextReactors;
          if (currentReactors.includes(authorInitials)) {
            nextReactors = currentReactors.filter((init: string) => init !== authorInitials);
          } else {
            nextReactors = [...currentReactors, authorInitials];
          }
          if (nextReactors.length === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = nextReactors;
          }
          return { ...m, reactions };
        }
        return m;
      });
      const updatedObj = { ...prev, [activeChannel]: updatedList };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });
  };

  // Convert Message into a structured Task Wizard Workflow
  const handleOpenTaskWizard = (msg: Message) => {
    // Guess best Category based on message content or priority
    let category = "Client Follow-up";
    if (msg.priority === "blocked" || msg.priority === "urgent") {
      category = "Underwriting Review";
    } else if (msg.priority === "lender_pending") {
      category = "Lender Follow-up";
    } else if (msg.priority === "client_pending") {
      category = "Document Collection";
    } else if (msg.priority === "compliance") {
      category = "Compliance";
    }

    // Default assignee selection
    let assigned = "Jeff Brown"; // assistant defaults
    if (msg.author !== "You" && msg.author !== (currentUser.first + " " + currentUser.last)) {
      assigned = msg.author; // assign back to writer
    }

    setWizardDraftTask({
      title: msg.text.length > 110 ? msg.text.substring(0, 107) + "..." : msg.text,
      notes: `Escalated directly from Internal Team Thread [Direct Message: ${msg.author}] posted at ${msg.time}.\n\nOriginal statement: "${msg.text}"`,
      priority: msg.priority === "urgent" || msg.priority === "blocked" ? "high" : "medium",
      category,
      clientId: msg.clientId || "",
      dueDate: "2026-06-25", // few days ahead
      assignedTo: assigned
    });

    setIsTaskWizardOpen(true);
  };

  const handleCommitWizardTask = () => {
    if (!wizardDraftTask || !setTasks) return;

    if (!wizardDraftTask.title.trim()) {
      if (showToast) showToast("Task title cannot be blank.", "error", "⚠️");
      return;
    }

    const linkedClient = clients.find(c => c.id === wizardDraftTask.clientId);
    const taskId = `task_messages_${Date.now()}`;

    const newSystemTask: Task & { category: string; subtasks: any[]; auditLogs: any[]; extendedStatus: string; calendarSync: boolean } = {
      id: taskId,
      title: wizardDraftTask.title.trim(),
      status: "open",
      extendedStatus: "todo",
      priority: wizardDraftTask.priority === "urgent" ? "high" : wizardDraftTask.priority as any,
      category: wizardDraftTask.category,
      dueDate: wizardDraftTask.dueDate || undefined,
      clientId: wizardDraftTask.clientId || undefined,
      clientName: linkedClient ? `${linkedClient.first} ${linkedClient.last}` : undefined,
      assignedTo: wizardDraftTask.assignedTo,
      notes: wizardDraftTask.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.first + " " + currentUser.last,
      subtasks: [],
      calendarSync: true,
      auditLogs: [
        { timestamp: new Date().toISOString(), action: `Task generated via Internal Message escalation thread`, user: currentUser.first + " " + currentUser.last }
      ]
    };

    // Write to State
    setTasks(prev => {
      const updated = [newSystemTask, ...prev];
      localStorage.setItem("gbk_tasks", JSON.stringify(updated));
      return updated;
    });

    if (showToast) {
      showToast(`Operational Task assigned to ${wizardDraftTask.assignedTo}!`, "success", "⚡");
    }

    setIsTaskWizardOpen(false);
    setWizardDraftTask(null);
  };

  // Dropdown list generation of clients matched with searches
  const filteredDropdownClients = useMemo(() => {
    return clients.filter(c => {
      const terms = clientDropdownSearch.toLowerCase();
      return terms === "" || 
        c.first.toLowerCase().includes(terms) || 
        c.last.toLowerCase().includes(terms) ||
        (c.lender || "").toLowerCase().includes(terms);
    });
  }, [clients, clientDropdownSearch]);

  return (
    <div className="flex bg-[var(--color-bg)] border border-[var(--color-border)]/70 rounded-2xl overflow-hidden shadow-2xl h-full min-h-0 divide-x divide-[var(--color-border)]/70 select-none text-left" id="team-messaging-core">
      
      {/* ============================================================== */}
      {/* BAR 1: LEFT NAVIGATION INDEX FOR CHANNELS & MEMBERS (WIDTH 56) */}
      {/* ============================================================== */}
      <div className="w-56 shrink-0 flex flex-col h-full bg-[var(--color-surface)]/45 select-none min-h-0">
        
        {/* Workspace Brand Summary */}
        <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-panel)]/50 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-[var(--color-text)] truncate uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Team Hub
            </h4>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] opacity-80" />
        </div>

        {/* Categories, Channels & Colleagues Segment */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-5">
          
          {/* Section B: Direct Colleagues Roster */}
          <div>
            <div className="px-1.5 text-[9.5px] font-extrabold text-[var(--color-text-faint)] uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>Team Channels</span>
              <UserPlus 
                className={`w-3.5 h-3.5 cursor-pointer transition-colors ${addMemberOpen ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-faint)] hover:text-[var(--color-text)]'}`}
                onClick={() => setAddMemberOpen(!addMemberOpen)} 
              />
            </div>

            {addMemberOpen && (
              <form onSubmit={handleAddMember} className="m-1 p-2 bg-[var(--color-panel)]/50 border border-[var(--color-border)] rounded-xl space-y-1.5 animate-fade-in text-[10px] mb-3">
                <div className="font-extrabold text-[var(--color-accent)] text-[8.5px] uppercase tracking-widest mb-0.5">Add to Chat</div>
                
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text)] focus:outline-none"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Role (e.g. Underwriter)"
                    value={newMemberRole}
                    onChange={e => setNewMemberRole(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text)] focus:outline-none"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Status (e.g. Active 🟢)"
                    value={newMemberStatusLabel}
                    onChange={e => setNewMemberStatusLabel(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 pt-1">
                  <button
                    type="submit"
                    className="flex-1 bg-[var(--color-accent)] text-black font-black text-[9px] uppercase tracking-wider py-0.5 rounded hover:opacity-90 transition-opacity"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMemberOpen(false)}
                    className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 text-[var(--color-text-muted)] font-bold text-[9px] uppercase tracking-wider py-0.5 rounded transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-0.5 animate-fade-in">
              {chatRoster.map(tm => {
                const isActive = activeChannel === tm.id;
                const countBadge = unreadCounts[tm.id] || 0;
                return (
                  <button
                    key={tm.id}
                    onClick={() => setActiveChannel(tm.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      isActive 
                        ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/15 text-[var(--color-accent)]" 
                        : "border border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="relative flex-shrink-0">
                        {tm.avatar ? (
                          <img src={tm.avatar} alt={tm.name} className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)]" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-[var(--color-panel)] border border-[var(--color-border)] font-mono text-[9px] flex items-center justify-center text-[var(--color-text-muted)]">
                            {tm.name.split(" ").map(n => n[0]).join("")}
                          </span>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[var(--color-bg)] ${tm.color}`} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[var(--color-text)] opacity-90">{tm.name}</div>
                        <div className="text-[8.5px] text-[var(--color-text-faint)] truncate font-semibold">{tm.role}</div>
                        {(() => {
                           const lastMsgArr = messages[tm.id] || [];
                           const lastMsg = lastMsgArr[lastMsgArr.length - 1];
                           return lastMsg ? (
                             <div className="text-[8px] text-[var(--color-text-faint)] truncate max-w-[110px] mt-0.5 font-normal italic">{lastMsg.text}</div>
                           ) : null;
                        })()}
                      </div>
                    </span>

                    {countBadge > 0 && (
                      <span className="bg-red-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black">
                        {countBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Current User Session Overview */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-panel)]/30 flex items-center gap-2.5 shrink-0">
          <div className="relative">
            {(currentUser.avatar || currentUser.photo) ? (
              <img src={currentUser.avatar || currentUser.photo} alt={currentUser.first} className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-accent)] to-yellow-600 text-black text-xs font-black flex items-center justify-center shrink-0">
                {((currentUser.first?.[0] || "") + (currentUser.last?.[0] || "")).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--color-bg)] bg-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black text-[var(--color-text)] truncate leading-tight">{currentUser.first} {currentUser.last}</div>
            <div className="text-[8.5px] text-[var(--color-text-muted)] truncate font-semibold uppercase">{currentUser.role || "Mortgage Broker (Owner)"}</div>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* BAR 2: CENTRAL INTERACTIVE CHAT PANEL & FILTERS (WEIGHT FLEX-1) */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--color-bg)]">
        
        {/* Dynamic Channel Header with Search bar utilities & indicators */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/40 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shrink-0 select-none">
          
          <div className="min-w-0 flex items-center gap-3">
            <div className="relative shrink-0">
              {currentChannelDetails.avatar ? (
                <img src={currentChannelDetails.avatar} alt={currentChannelDetails.name} className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[var(--color-panel)] border border-[var(--color-border)] flex items-center justify-center font-mono text-xs font-black text-[var(--color-text-muted)]">
                  {currentChannelDetails.name.split(" ").map(n => n[0]).join("")}
                </div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--color-bg)] ${currentChannelDetails.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-black text-[var(--color-text)] flex items-center gap-2 leading-none">
                {currentChannelDetails.name}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[9px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]/50 rounded-md px-1.5 py-0.5 font-bold uppercase leading-none">
                  {currentChannelDetails.role}
                </span>
                <span className="text-[10px] text-[var(--color-text-faint)] font-semibold leading-none flex items-center gap-1">
                  {currentChannelDetails.statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Thread Search queries */}
            <div className="relative w-full sm:w-40">
              <input
                type="text"
                placeholder="Search thread..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl pl-3 pr-7 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] w-full focus:outline-none"
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <Search className="absolute right-2.5 top-2 text-[var(--color-text-faint)] w-3 h-3" />
              )}
            </div>

            {/* Escalation filter SELECTOR dropdown */}
            <select
              value={selectedEscalationFilter}
              onChange={(e) => setSelectedEscalationFilter(e.target.value)}
              className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-[10.5px] text-[var(--color-text-muted)] focus:outline-none font-bold shrink-0"
            >
              <option value="all">🏷️ All Flags</option>
              <option value="normal">🟢 Normal Updates</option>
              <option value="urgent">🌋 Urgent Escalations</option>
              <option value="blocked">🛑 Deal Blocked</option>
              <option value="lender_pending">🏦 Lender Pending</option>
              <option value="client_pending">📝 Client Pending</option>
              <option value="compliance">⚖️ Compliance Audit</option>
            </select>

            {/* Quick client linking filter */}
            <select
              value={selectedClientSearch}
              onChange={(e) => setSelectedClientSearch(e.target.value)}
              className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-[10.5px] text-[var(--color-text-muted)] focus:outline-none font-bold shrink-0 max-w-[130px]"
            >
              <option value="">📎 All Deals</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.last}</option>
              ))}
            </select>

            {/* Toggle pins panel button */}
            {pinnedChannelMessages.length > 0 && (
              <button
                onClick={() => setShowPinsPanel(!showPinsPanel)}
                className={`p-1.5 rounded-xl border flex items-center justify-center gap-1 text-[10.5px] font-black transition-all ${
                  showPinsPanel 
                    ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)]" 
                    : "bg-[var(--color-panel)] border-[var(--color-border)]/70 text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>Pins ({pinnedChannelMessages.length})</span>
              </button>
            )}

          </div>

        </div>

        {/* HIGH-VISIBILITY PINNED MESSAGE COMPONENT DRAWER */}
        {pinnedChannelMessages.length > 0 && showPinsPanel && (
          <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-accent)]/20 p-3 flex flex-col gap-2 select-none animate-slide-down">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-accent)] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Pin className="w-3 h-3 animate-bounce" />
                Pinned Operational Directives ({pinnedChannelMessages.length})
              </span>
              <button onClick={() => setShowPinsPanel(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
              {pinnedChannelMessages.map(pm => (
                <div key={pm.id} className="bg-[var(--color-bg)]/60 border border-[var(--color-border)]/70 p-2 rounded-xl text-left flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-faint)]">
                      <b className="text-[var(--color-text-muted)]">{pm.author}</b> · {pm.time}
                    </div>
                    <p className="text-[var(--color-text)]/90 mt-1 italic font-medium">"{pm.text}"</p>
                  </div>
                  <button 
                    onClick={() => handleTogglePinMessage(pm.id)}
                    className="text-[var(--color-text-faint)] hover:text-red-400 font-bold text-[10px] uppercase tracking-wider shrink-0"
                  >
                    Unpin
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread Canvas List Stream */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[var(--color-bg)]">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((msg, index) => {
              const isCurrentUserVal = msg.senderId === "staff_me" || msg.author.includes(currentUser.first);
              const priorityUI = ESCALATION_FLAGS[msg.priority || "normal"];

              // highlight if is current user name being tagged e.g., @David
              const isMentioned = msg.text.includes(`@${currentUser.first}`) || msg.text.includes("@brokers") || msg.mentions?.some(m => m.toLowerCase().includes(currentUser.first.toLowerCase()));

              return (
                <React.Fragment key={msg.id}>
                  {index > 0 && filteredMessages[index - 1].date !== msg.date && (
                    <div className="flex items-center gap-3 my-2 select-none w-full col-span-full">
                      <div className="flex-1 h-px bg-[var(--color-border)]/40" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-faint)] px-2">{msg.date}</span>
                      <div className="flex-1 h-px bg-[var(--color-border)]/40" />
                    </div>
                  )}
                  <div 
                    className={`flex gap-3 max-w-[85%] group select-none transition-all ${
                      isCurrentUserVal ? "self-end flex-row-reverse" : "self-start"
                    }`}
                    id={`msg_${msg.id}`}
                  >
                    {/* Sender Symbol / Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-[11px] border shadow-md select-none ${
                        isCurrentUserVal 
                          ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)]/30 text-[var(--color-accent)]" 
                          : "bg-[var(--color-panel)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                      }`}>
                        {msg.initials}
                      </div>
                      {msg.priority !== "normal" && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border border-[var(--color-bg)] flex items-center justify-center font-black text-[7px] text-white">
                          !
                        </span>
                      )}
                    </div>

                    {/* Message details box */}
                    <div className="min-w-0">
                      
                      {/* Metadata Header line */}
                      <div className={`flex items-center gap-2 mb-1 text-[10px] ${isCurrentUserVal ? "justify-end" : ""}`}>
                        <span className="font-extrabold text-[var(--color-text-muted)]">{msg.author}</span>
                        <span className="px-1.5 py-0.2 bg-[var(--color-surface-2)] text-[var(--color-text-faint)] rounded-md scale-95 font-semibold text-[8px] tracking-wider uppercase border border-[var(--color-border)]/50">
                          {msg.role}
                        </span>
                        <span className="text-[var(--color-text-faint)] font-semibold">{msg.time}</span>
                      </div>

                      {/* Content Speech block with gradient borders for mentions */}
                      <div className={`p-3 rounded-2xl text-[11.5px] leading-relaxed relative ${
                        isMentioned 
                          ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/40 rounded-tl-none ring-1 ring-[var(--color-accent)]/50 shadow-[0_0_15px_rgba(181,166,66,0.1)]"
                          : isCurrentUserVal 
                            ? "bg-[var(--color-accent)]/15 text-[var(--color-text)] border border-[var(--color-accent)]/25 rounded-tr-none" 
                            : "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]/70 rounded-tl-none shadow-md"
                      }`}>
                        
                        {/* Priority Warning Header */}
                        {msg.priority && msg.priority !== "normal" && (
                          <div className={`text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 ${priorityUI.color.split(" ")[0]}`}>
                            <span>{priorityUI.label}</span>
                          </div>
                        )}

                        {/* Actual Narrative text */}
                        <p className="whitespace-pre-wrap selection:bg-[var(--color-accent)]/40 selection:text-white">{msg.text}</p>

                        {/* Active emoji reactions inside message bubble */}
                        {msg.reactions && Object.keys(msg.reactions).some(emoji => {
                          const reactors = (msg.reactions?.[emoji] || []) as string[];
                          return reactors.length > 0;
                        }) && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {Object.entries(msg.reactions).map(([emoji, reactorsVal]) => {
                              const reactors = (reactorsVal || []) as string[];
                              if (reactors.length === 0) return null;
                              const hasReacted = reactors.includes(authorInitials);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                                    hasReacted 
                                      ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)]/40 text-[var(--color-accent)]" 
                                      : "bg-[var(--color-panel)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                                  }`}
                                  title={`Reacted by: ${reactors.join(", ")}`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-black text-[9px]">{reactors.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Render mock document links attached */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-3 space-y-1 pt-2.5 border-t border-[var(--color-border)]/50">
                            <div className="text-[8.5px] uppercase font-black tracking-widest text-[var(--color-accent)] mb-1.5">Attached Deal Documents</div>
                            {msg.attachments.map((at, of) => (
                              <div key={of} className="flex items-center justify-between p-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-xl text-left">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-[10px] text-[var(--color-text)] font-bold truncate">{at.name}</div>
                                    <div className="text-[8.5px] text-[var(--color-text-faint)]">{at.size} · PDF</div>
                                  </div>
                                </div>
                                <Eye className="w-3.5 h-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer opacity-50 hover:opacity-100 transition-opacity" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tied Client File Action Bar tag */}
                        {msg.clientTag && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--color-border)]/50 flex items-center justify-between">
                            <button 
                              onClick={() => {
                                if (msg.clientId) onOpenClient(msg.clientId);
                              }}
                              className="px-2 py-1 text-[9.5px] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] rounded-lg font-black text-[var(--color-accent)] flex items-center gap-1.5 transition-colors border border-[var(--color-accent)]/10"
                            >
                              <Link2 className="w-3 h-3 text-[var(--color-accent)]" /> 
                              <span>File Active: {msg.clientTag}</span>
                            </button>
                          </div>
                        )}

                      </div>

                      {/* Operational Action Controls on hover layer */}
                      <div className={`flex items-center gap-2.5 mt-1 opacity-50 hover:opacity-100 transition-opacity justify-end ${
                        isCurrentUserVal ? "flex-row-reverse" : "flex-row"
                      }`}>
                        {["👍", "✅", "🚨"].map(emoji => {
                          const reactors = msg.reactions?.[emoji] || [];
                          const hasReacted = reactors.includes(authorInitials);
                          return (
                            <button 
                              key={emoji} 
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`text-[10px] px-1.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                                hasReacted 
                                  ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)]/40 text-[var(--color-accent)]" 
                                  : "bg-[var(--color-panel)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                              }`}
                            >
                              <span>{emoji}</span> 
                              {reactors.length > 0 && <span className="font-black">{reactors.length}</span>}
                            </button>
                          );
                        })}

                        {/* Convert to task is very important */}
                        {setTasks && (
                          <button
                            onClick={() => handleOpenTaskWizard(msg)}
                            className="text-[9.5px] bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)] hover:text-black border border-[var(--color-accent)]/20 px-2 py-0.5 rounded-md text-[var(--color-accent)] font-black transition-all flex items-center gap-1"
                            title="Generate a CRM Task from this discussion comment"
                          >
                            ⚡ Convert to Task
                          </button>
                        )}

                        <button
                          onClick={() => handleTogglePinMessage(msg.id)}
                          className={`text-[9px] font-bold uppercase transition-colors hover:text-[var(--color-accent)] ${msg.pinned ? "text-[var(--color-accent)]" : "text-[var(--color-text-faint)]"}`}
                        >
                          {msg.pinned ? "Unpin 📌" : "Pin 📌"}
                        </button>

                        {isCurrentUserVal && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-[9px] text-[var(--color-text-faint)] hover:text-rose-500 font-bold uppercase transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      {isCurrentUserVal && msg.readBy && msg.readBy.length > 1 && (
                        <div className="text-[8.5px] text-[var(--color-text-faint)] text-right mt-0.5 font-semibold">
                          Read by {msg.readBy.filter(r => r !== authorInitials).join(", ")}
                        </div>
                      )}

                    </div>
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="my-auto text-center p-12">
              <Users className="w-10 h-10 text-[var(--color-text-faint)]/20 mx-auto mb-2" />
              <div className="text-xs font-black text-[var(--color-text-faint)] uppercase tracking-widest">No matching comments</div>
              <p className="text-[10.5px] text-[var(--color-text-faint)] mt-1 max-w-xs mx-auto">
                No pipeline updates found matching criteria inside channel. Discard constraints to review full thread history.
              </p>
            </div>
          )}
        </div>

        {typingUser && (
          <div className="px-4 pb-1 text-[9.5px] text-[var(--color-text-faint)] italic font-semibold animate-pulse select-none">
            {typingUser} is typing...
          </div>
        )}

        {/* Composer Entry Area & Templates */}
        <div className="p-4 border-t border-[var(--color-border)]/65 shrink-0 bg-[var(--color-surface)]/65">
          
          {/* Active Preset Files or Links Indicators */}
          {(linkedChatClientId || attachedFiles.length > 0) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              
              {/* Linked client block */}
              {linkedChatClientId && (
                <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 text-[var(--color-accent)] select-none">
                  <Link2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span>Linked deal tie: <b>{clients.find(x => x.id === linkedChatClientId)?.first} {clients.find(x => x.id === linkedChatClientId)?.last}</b></span>
                  <button onClick={() => setLinkedChatClientId(null)} className="text-[var(--color-accent)] hover:text-white font-bold ml-1.5">✕</button>
                </div>
              )}

              {/* Attachments listing */}
              {attachedFiles.map((fi, idx) => (
                <div key={idx} className="bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-xl text-[10.5px] flex items-center gap-2 text-blue-300">
                  <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold truncate max-w-[120px]">{fi.name}</span>
                  <button 
                    onClick={() => setAttachedFiles(p => p.filter((_, o) => o !== idx))} 
                    className="text-blue-300 hover:text-white font-bold ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}

            </div>
          )}

          {/* Composer Main Input Box Layout */}
          <div className="flex gap-2.5 items-end">
            
            {/* Input wrap */}
            <div className="flex-grow flex flex-col bg-[var(--color-panel)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-left">
              
              {/* Top Selector tags */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-2 mb-2 select-none">
                
                {/* Level Priority / Urgency marker select */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] text-[var(--color-text-faint)] font-black uppercase tracking-wider">Escalation Tag:</span>
                  <select
                    value={msgPriority}
                    onChange={(e) => setMsgPriority(e.target.value as any)}
                    className="bg-transparent border-none text-[10px] text-[var(--color-accent)] font-black focus:outline-none cursor-pointer outline-none"
                  >
                    <option value="normal">🟢 Normal Alert</option>
                    <option value="urgent">🚨 Urgent Escalation</option>
                    <option value="blocked">🛑 Deal Blocked</option>
                    <option value="lender_pending">🏦 Lender Pending</option>
                    <option value="client_pending">📝 Client Pending</option>
                    <option value="compliance">⚖️ Compliance Audit</option>
                  </select>
                </div>

                {/* Live Client dropdown links selection */}
                <div className="relative select-none">
                  <button 
                    onClick={() => setShowClientLinkDropdown(!showClientLinkDropdown)}
                    className="text-[9.5px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 font-bold"
                  >
                    <Link2 className="w-3 h-3 text-[var(--color-accent)]" /> 
                    {linkedChatClientId ? "Linked ☑" : "Link Client File"}
                  </button>

                  {showClientLinkDropdown && (
                    <div className="absolute bottom-full right-0 mb-3 bg-[var(--color-surface-2)] border border-[var(--color-border)]/80 rounded-2xl p-2.5 max-h-56 overflow-y-auto w-60 z-30 shadow-2xl">
                      <div className="text-[9.5px] uppercase font-black text-[var(--color-text-faint)] mb-2">Deal Portfolios</div>
                      <input
                        type="text"
                        placeholder="Search borrowers..."
                        value={clientDropdownSearch}
                        onChange={(e) => setClientDropdownSearch(e.target.value)}
                        className="bg-[var(--color-bg)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1 text-[10.5px] text-[var(--color-text)] w-full mb-2 focus:outline-none placeholder-[var(--color-text-faint)]/60"
                      />
                      <div className="space-y-0.5">
                        <button
                          onClick={() => {
                            setLinkedChatClientId(null);
                            setShowClientLinkDropdown(false);
                          }}
                          className="w-full text-left p-1.5 hover:bg-[var(--color-surface-3)] text-[10.5px] text-[var(--color-text-faint)] rounded font-semibold italic"
                        >
                          -- Clear linked files --
                        </button>
                        {filteredDropdownClients.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              setLinkedChatClientId(c.id);
                              setShowClientLinkDropdown(false);
                            }}
                            className="p-1.5 hover:bg-[var(--color-surface-3)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg cursor-pointer truncate font-bold flex items-center justify-between"
                          >
                            <span>{c.first} {c.last}</span>
                            <span className="text-[8.5px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-1 rounded font-mono scale-90">{c.lender || "Prime"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Textarea Narrative */}
              <textarea 
                value={msgInputText}
                onChange={(e) => setMsgInputText(e.target.value)}
                placeholder={`Message in ${currentChannelDetails.name}... (Standard @mentions supported)`}
                rows={2}
                className="bg-transparent border-none text-xs text-[var(--color-text)] focus:outline-none w-full outline-none resize-none py-1 h-11"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

            </div>

            {/* Submit Arrow button */}
            <button 
              onClick={handleSendMessage}
              className="p-3.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent)] text-black font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center shrink-0 h-10 w-10 disabled:opacity-40"
              disabled={!msgInputText.trim() && attachedFiles.length === 0}
            >
              <Send className="w-4 h-4 text-black" />
            </button>
          </div>

          {/* Quick Operational templates & mock file preset selector lines */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 select-none border-t border-[var(--color-border)]/60 pt-3">
            
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] text-[var(--color-accent)] font-black uppercase tracking-widest mr-1.5">Insert Template:</span>
              <button 
                onClick={() => handleInsertTemplate("follow-up")}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--color-panel)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-bold border border-[var(--color-border)] transition-all"
              >
                📋 Client Follow-Up
              </button>
              <button 
                onClick={() => handleInsertTemplate("lender-update")}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--color-panel)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-bold border border-[var(--color-border)] transition-all"
              >
                🏦 Lender Notice
              </button>
              <button 
                onClick={() => handleInsertTemplate("doc-checklist")}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--color-panel)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-bold border border-[var(--color-border)] transition-all"
              >
                📝 Docs Collector
              </button>
              <button 
                onClick={() => handleInsertTemplate("blocked-file")}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/10 transition-all"
              >
                🛑 Deal Blocked
              </button>
              <button 
                onClick={() => handleInsertTemplate("compliance-pass")}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/10 transition-all"
              >
                ⚖️ Audit Pass
              </button>
              <button onClick={() => handleInsertTemplate("closing-funded")}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/10 transition-all">
                💰 Deal Funded
              </button>
            </div>

            {/* Quick local attachments */}
            <div className="relative">
              <button 
                onClick={() => setShowAttachPresets(!showAttachPresets)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--color-panel)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] text-[10px] font-extrabold border border-[var(--color-border)] transition-all flex items-center gap-1"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach Doc</span>
              </button>

              {showAttachPresets && (
                <div className="absolute bottom-full right-0 mb-2 bg-[var(--color-surface-2)] border border-[var(--color-border)]/80 rounded-2xl p-1.5 w-60 z-30 shadow-2xl">
                  <div className="text-[9.5px] uppercase font-black text-[var(--color-text-faint)] px-2 py-1 select-none">Simulate Brokerage Files</div>
                  {[
                    { name: "signed_commitment_summary.pdf", type: "application/pdf", size: "340 KB" },
                    { name: "employment_verification_letter.pdf", type: "application/pdf", size: "1.1 MB" },
                    { name: "bank_history_90_days.pdf", type: "application/pdf", size: "4.2 MB" },
                    { name: "property_appraisal_barrie.pdf", type: "application/pdf", size: "3.5 MB" }
                  ].map((pr, id) => (
                    <button
                      key={id}
                      onClick={() => handleAttachPresetAction(pr.name, pr.type, pr.size)}
                      className="w-full text-left p-2 hover:bg-[var(--color-surface-3)] text-[11px] font-semibold rounded-lg truncate text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{pr.name}</span>
                      <span className="text-[9px] text-[var(--color-accent)] shrink-0">{pr.size}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ============================================================== */}
      {/* COLUMN 3: BIDIRECTIONAL MESSAGING-TASK CONVERSION WIZARD SIDEBAR */}
      {/* ============================================================== */}
      {isTaskWizardOpen && wizardDraftTask && (
        <div className="w-80 shrink-0 bg-[var(--color-surface)] p-4 flex flex-col h-full min-h-0 border-l border-[var(--color-border)]/70 select-none animate-slide-left">
          
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-3 mb-4">
            <div>
              <div className="text-[10px] text-[var(--color-accent)] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[var(--color-accent)] animate-pulse" />
                Tasking Pipeline Engine
              </div>
              <h3 className="text-xs font-black text-[var(--color-text)] mt-1">Message Escalation Wizard</h3>
            </div>
            <button 
              onClick={() => {
                setIsTaskWizardOpen(false);
                setWizardDraftTask(null);
              }}
              className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10.5px] text-[var(--color-text-faint)] leading-relaxed mb-4">
            Convert custom brokerage discussions instantly into a tracked operational milestone for file accountability.
          </p>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            
            {/* Task title input */}
            <div>
              <label className="text-[9.5px] uppercase text-[var(--color-text-faint)] font-extrabold tracking-wider block mb-1.5">Action Milestone Description</label>
              <textarea
                value={wizardDraftTask.title}
                onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, title: e.target.value })}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-semibold"
                rows={2}
              />
            </div>

            {/* CRM Client target */}
            <div>
              <label className="text-[9.5px] uppercase text-[var(--color-text-faint)] font-extrabold tracking-wider block mb-1.5">Client File Context</label>
              <select
                value={wizardDraftTask.clientId}
                onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, clientId: e.target.value })}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-bold"
              >
                <option value="">-- No active client tie --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.first} {c.last}</option>
                ))}
              </select>
            </div>

            {/* Task Category */}
            <div>
              <label className="text-[9.5px] uppercase text-[var(--color-text-faint)] font-extrabold tracking-wider block mb-1.5">Organizational Category</label>
              <select
                value={wizardDraftTask.category}
                onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, category: e.target.value })}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-bold"
              >
                <option value="Client Follow-up">Client Follow-up</option>
                <option value="Document Collection">Document Collection</option>
                <option value="Lender Follow-up">Lender Follow-up</option>
                <option value="Underwriting Review">Underwriting Review</option>
                <option value="Compliance">Compliance Check</option>
                <option value="Appointment">Scheduling</option>
                <option value="Internal Admin">Internal Admin</option>
                <option value="Renewal">Renewal Tracker</option>
                <option value="Retention">Retention Outreach</option>
              </select>
            </div>

            {/* Assigned person */}
            <div>
              <label className="text-[9.5px] uppercase text-[var(--color-text-faint)] font-extrabold tracking-wider block mb-1.5">Assign Responsibility</label>
              <select
                value={wizardDraftTask.assignedTo}
                onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, assignedTo: e.target.value })}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-bold"
              >
                {userRoster && userRoster.length > 0 ? (
                  userRoster.map(u => (
                    <option key={u.id} value={`${u.first} ${u.last}`}>{u.first} {u.last} ({u.role})</option>
                  ))
                ) : (
                  <>
                    <option value="David Acosta">David Acosta (Me)</option>
                    <option value="Jeff Brown">Jeff Brown (Admin Assistant)</option>
                    <option value="Wayne MacLeod">Wayne MacLeod (Senior Broker)</option>
                    <option value="Sarah Chen">Sarah Chen (Compliance Auditor)</option>
                    <option value="Tim Brown">Tim Brown (Broker Principal)</option>
                  </>
                )}
              </select>
            </div>

            {/* Risk priority level */}
            <div>
              <label className="text-[9.5px] uppercase text-[var(--color-text-faint)] font-extrabold tracking-wider block mb-1.5">Risk Level Urgency</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["urgent", "high", "medium", "low"] as const).map(prio => {
                  const isSelect = wizardDraftTask.priority === prio;
                  return (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setWizardDraftTask({ ...wizardDraftTask, priority: prio })}
                      className={`py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${
                        isSelect 
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-black" 
                          : "bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {prio}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduling DueDate */}
            <div>
              <label className="text-[9.5px] uppercase text-[var(--color-text-faint)] font-extrabold tracking-wider block mb-1.5">Schedules Due Date</label>
              <input
                type="date"
                value={wizardDraftTask.dueDate}
                onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, dueDate: e.target.value })}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-bold"
              />
            </div>

            {/* Custom Notes */}
            <div>
              <label className="text-[9.5px] uppercase text-[var(--color-text-faint)] font-extrabold tracking-wider block mb-1.5">Internal Trail Context Notes</label>
              <textarea
                value={wizardDraftTask.notes}
                onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, notes: e.target.value })}
                className="w-full bg-[var(--color-panel)] border border-[var(--color-border)]/70 rounded-xl p-2.5 text-[11px] text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/10 leading-relaxed font-semibold h-24"
              />
            </div>

          </div>

          <div className="border-t border-[var(--color-border)]/70 pt-3 mt-3 shrink-0">
            <button
              onClick={handleCommitWizardTask}
              className="w-full py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent)] text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg select-none"
            >
              <span>Add to Workflow Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
