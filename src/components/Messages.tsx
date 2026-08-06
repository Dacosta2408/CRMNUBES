import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Send, FileText, Bookmark, Users, HelpCircle, Search, 
  X, Pin, Plus, AlertCircle, CheckCircle, Check, ArrowRight, 
  Trash2, Bell, Tag, Link2, Paperclip, Phone, MoreHorizontal,
  ChevronRight, Sparkles, Smile, ShieldAlert, BadgeInfo, Calendar, Eye, Upload,
  Pencil, BookmarkCheck, ExternalLink, RefreshCw, MessageSquare, Star, Wifi, WifiOff, Clock, Filter, Download, Archive
} from "lucide-react";
import { Client, Task, Message, SavedMessage, MessageAction, MessagePermission, ChannelInfo, User } from "../types";
import { Avatar } from "./Avatar";
import { UserStatusModal } from "./UserStatusModal";
import { TypingIndicator } from "./TypingIndicator";
import { startTyping, stopTyping, subscribeToTyping, TypingUser } from "../lib/typingService";
import { DEFAULT_USERS } from "../data";
import { getNotesForClient, saveNotesForClient, logActivityEvent, FileNote } from "../lib/activityEngine";
import { getUserFullName, getUserPhotoUrl } from "../lib/userUtils";
import { 
  canAccessMessages, 
  canAccessChannel, 
  canSendMessage, 
  canEditMessage, 
  canDeleteMessage, 
  canSaveMessage,
  getActiveTeamUsers,
  canViewUserInChannel,
  getChannelMembers
} from "../lib/permissions";
import { 
  getAccessibleChannels,
  getMessages,
  sendMessage,
  updateMessage,
  softDeleteMessage,
  saveMessage,
  unsaveMessage,
  markChannelRead,
  searchMessages,
  updateMessageApi, 
  softDeleteMessageApi, 
  saveMessageApi, 
  unsaveMessageApi, 
  getSavedMessagesApi,
  getActiveUsers,
  getActiveUsersApi,
  getAccessibleChannelsApi 
} from "../lib/api";

interface MessagesProps {
  messages: Record<string, any[]>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  clients: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
  currentUser: User;
  activeChannel: string;
  setActiveChannel: (ch: string) => void;
  linkedChatClientId: string | null;
  setLinkedChatClientId: (id: string | null) => void;
  onOpenClient: (id: string) => void;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  userRoster?: User[];
  setUserRoster?: React.Dispatch<React.SetStateAction<User[]>>;
}

// Deprecated hard-coded TEAM_ROSTER fallback for backwards compatibility
export const TEAM_ROSTER = DEFAULT_USERS.map(u => ({
  id: u.id,
  name: u.displayName || `${u.first} ${u.last}`.trim(),
  role: u.jobTitle || u.role,
  status: u.status === 'active' ? 'online' : 'offline',
  statusLabel: u.status === 'active' ? 'Active 🟢' : 'Offline ⚪',
  color: u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500',
  avatar: u.photo || null
}));

// Escalation Flag UI Schemes
export const ESCALATION_FLAGS = {
  normal: { label: "Normal Update", color: "text-slate-400 border-white/5 bg-transparent", icon: null },
  urgent: { label: "🚨 Urgent Escalation", color: "text-red-400 border-red-500/20 bg-red-500/5", icon: "🌋" },
  blocked: { label: "🛑 Deal Blocked", color: "text-rose-400 border-rose-500/20 bg-rose-500/5", icon: "🛑" },
  lender_pending: { label: "🏦 Lender Pending", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5", icon: "🏦" },
  client_pending: { label: "📝 Client Pending", color: "text-amber-400 border-amber-500/20 bg-amber-500/5", icon: "📝" },
  compliance: { label: "⚖️ Compliance Concern", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", icon: "⚖️" }
};

export const ESCALATION_GRADIENTS: Record<string, string> = {
  normal: "",
  urgent: "linear-gradient(135deg, #FF416C 0%, #FFB347 100%)",
  blocked: "linear-gradient(135deg, #FF00CC 0%, #3333FF 100%)",
  lender_pending: "linear-gradient(135deg, #00FFFF 0%, #0077FF 100%)",
  client_pending: "linear-gradient(135deg, #FF8800 0%, #FCEE21 100%)",
  compliance: "linear-gradient(135deg, #56AB2F 0%, #A8E063 100%)"
};

const chatColorGradients: Record<string, string> = {
  sunset:   "linear-gradient(135deg, #FF416C 0%, #FFB347 100%)",
  royal:    "linear-gradient(135deg, #6A11C8 0%, #FF758C 100%)",
  arctic:   "linear-gradient(135deg, #00FFFF 0%, #0077FF 100%)",
  neon:     "linear-gradient(135deg, #FF00CC 0%, #3333FF 100%)",
  citrus:   "linear-gradient(135deg, #FF8800 0%, #FCEE21 100%)",
  ocean:    "linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)",
  nature:   "linear-gradient(135deg, #56AB2F 0%, #A8E063 100%)",
  warm:     "linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)",
  lavender: "linear-gradient(135deg, #8360C3 0%, #FF8FBF 100%)",
};
const DEFAULT_CHAT_GRADIENT = chatColorGradients.ocean;

// ==========================================
// Reusable Clearance Matrix Permission Helpers
// ==========================================

export function canViewAttachment(attachment: any, message: any, currentUser: any): boolean {
  if (!attachment) return false;
  return canAccessChannel(currentUser, null);
}

// Utility: Format Date Separators
function getFormattedDateSeparator(dateStr?: string, timestampStr?: string): string {
  try {
    const target = timestampStr ? new Date(timestampStr) : new Date();
    if (isNaN(target.getTime())) return dateStr || "Today";
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (target.toDateString() === today.toDateString()) return "Today";
    if (target.toDateString() === yesterday.toDateString()) return "Yesterday";

    return target.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr || "Today";
  }
}

export const Messages: React.FC<MessagesProps> = ({
  messages,
  setMessages,
  clients,
  setClients,
  currentUser,
  activeChannel,
  setActiveChannel,
  linkedChatClientId,
  setLinkedChatClientId,
  onOpenClient,
  tasks,
  setTasks,
  showToast,
  userRoster,
  setUserRoster
}) => {
  const currentUserId = currentUser?.id || "staff_me";

  const authorInitials = useMemo(() => {
    return ((currentUser?.first?.[0] || "") + (currentUser?.last?.[0] || "")).toUpperCase() || "ME";
  }, [currentUser]);

  // Network & Connection State (Req 5)
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'offline'>('connected');

  useEffect(() => {
    const handleOnline = () => {
      setConnectionState('connected');
      if (showToast) showToast("Connection restored 🟢", "success", "📶");
    };
    const handleOffline = () => {
      setConnectionState('offline');
      if (showToast) showToast("Connection offline 🔴 Unsent drafts saved locally.", "warning", "⚠️");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Per-User Read Tracking State (Req 1)
  const [userReadState, setUserReadState] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`gbk_read_state_${currentUserId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading read state:", e);
    }
    return {};
  });

  // Save read state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`gbk_read_state_${currentUserId}`, JSON.stringify(userReadState));
    } catch (e) {
      console.error("Error saving read state:", e);
    }
  }, [userReadState, currentUserId]);

  // Favorite Channels State (Req 7)
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`gbk_favorite_channels_${currentUserId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error reading favorite channels:", e);
    }
    return ["dm_wayne"];
  });

  const toggleFavoriteChannel = (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteChannels(prev => {
      const next = prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId];
      localStorage.setItem(`gbk_favorite_channels_${currentUserId}`, JSON.stringify(next));
      return next;
    });
  };

  // Draft Preservation Per Channel (Req 4)
  const [channelDrafts, setChannelDrafts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`gbk_channel_drafts_${currentUserId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error loading channel drafts:", e);
    }
    return {};
  });

  const [msgInputText, setMsgInputText] = useState("");

  // Restore & save draft when changing active channel
  const prevChannelRef = useRef<string>(activeChannel);
  useEffect(() => {
    const prevCh = prevChannelRef.current;
    if (prevCh && prevCh !== activeChannel) {
      // Save draft for previous channel
      setChannelDrafts(prev => {
        const updated = { ...prev, [prevCh]: msgInputText };
        localStorage.setItem(`gbk_channel_drafts_${currentUserId}`, JSON.stringify(updated));
        return updated;
      });
    }
    // Restore draft for new channel
    setMsgInputText(channelDrafts[activeChannel] || "");
    prevChannelRef.current = activeChannel;
  }, [activeChannel, currentUserId]);

  // Search & Advanced Filters (Req 2)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSender, setSearchSender] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [hasAttachmentsFilter, setHasAttachmentsFilter] = useState(false);
  const [savedOnlyFilter, setSavedOnlyFilter] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const [selectedEscalationFilter, setSelectedEscalationFilter] = useState<string>("all");
  const [selectedClientSearch, setSelectedClientSearch] = useState<string>("");
  const [msgPriority, setMsgPriority] = useState<"urgent" | "blocked" | "lender_pending" | "client_pending" | "compliance" | "normal">("normal");

  // Document drafts attached to composer from user's computer
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string }[]>([]);

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Action Menu, Edit & Delete States
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [isDeletingMsg, setIsDeletingMsg] = useState(false);

  // Thread Panel & Replies State (Req 3)
  const [activeThreadParentMsg, setActiveThreadParentMsg] = useState<Message | null>(null);
  const [threadReplyInput, setThreadReplyInput] = useState("");

  // Pagination State Per Channel (Req 8)
  const [visibleMessageCount, setVisibleMessageCount] = useState<Record<string, number>>({});
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Message Delivery States (Req 4 & 5)
  const [sendingMessageIds, setSendingMessageIds] = useState<Set<string>>(new Set());
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(new Set());

  // Personal Bookmarked Saved Messages state (per-user)
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>(() => {
    try {
      const local = localStorage.getItem(`gbk_saved_messages_${currentUserId}`);
      if (local) return JSON.parse(local);
    } catch (e) {
      console.error("Failed to parse saved messages from localStorage:", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(`gbk_saved_messages_${currentUserId}`, JSON.stringify(savedMessages));
    } catch (e) {
      console.error("Failed to store saved messages in localStorage:", e);
    }
  }, [savedMessages, currentUserId]);

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
  const [activeTypingUsers, setActiveTypingUsers] = useState<TypingUser[]>([]);
  const [activeTouchActionsMsgId, setActiveTouchActionsMsgId] = useState<string | null>(null);
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  const typingDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-populate seenMsgIdsRef when activeChannel or messages change so history does not animate
  useEffect(() => {
    const list = messages[activeChannel] || [];
    list.forEach((m: any) => {
      if (m?.id) seenMsgIdsRef.current.add(m.id);
    });
  }, [activeChannel, messages]);

  // Subscribe to typing state for active channel
  useEffect(() => {
    if (!activeChannel || activeChannel === "saved-messages") {
      setActiveTypingUsers([]);
      return;
    }

    const unsubscribe = subscribeToTyping(activeChannel, (users) => {
      setActiveTypingUsers(users);
    });

    return () => {
      if (typingDebounceTimerRef.current) clearTimeout(typingDebounceTimerRef.current);
      stopTyping(activeChannel, currentUserId);
      unsubscribe();
    };
  }, [activeChannel, currentUserId]);

  // Handle composer input change with debounced typing signal
  const handleComposerInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMsgInputText(val);

    if (activeChannel === "saved-messages") return;

    if (val.trim()) {
      startTyping(activeChannel, {
        id: currentUserId,
        name: currentUser.displayName || `${currentUser.first} ${currentUser.last}`.trim() || "You"
      });

      if (typingDebounceTimerRef.current) clearTimeout(typingDebounceTimerRef.current);
      typingDebounceTimerRef.current = setTimeout(() => {
        stopTyping(activeChannel, currentUserId);
      }, 3000);
    } else {
      if (typingDebounceTimerRef.current) clearTimeout(typingDebounceTimerRef.current);
      stopTyping(activeChannel, currentUserId);
    }
  };

  // Close message action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuMsgId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Audit channel access event
  useEffect(() => {
    if (activeChannel && activeChannel !== "saved-messages") {
      try {
        logActivityEvent({
          timestamp: new Date().toISOString(),
          eventType: "channel_accessed",
          action: "channel.accessed",
          user: `${currentUser.first} ${currentUser.last}`,
          description: `Accessed team channel / chat thread: ${activeChannel}`
        });
      } catch (e) {
        // silent
      }
    }
  }, [activeChannel, currentUser]);

  const [isRefreshingTeam, setIsRefreshingTeam] = useState(false);

  // Refresh Team Roster from shared API / backend source
  const refreshTeamRoster = async () => {
    if (isRefreshingTeam) return;
    setIsRefreshingTeam(true);
    try {
      const activeUsers = await getActiveUsers();
      if (Array.isArray(activeUsers) && activeUsers.length > 0 && setUserRoster) {
        setUserRoster(prev => {
          // Merge activeUsers into prev by stable ID
          const map = new Map<string, User>();
          prev.forEach(u => map.set(u.id, u));
          activeUsers.forEach(u => map.set(u.id, u));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Error refreshing team roster:", err);
    } finally {
      setIsRefreshingTeam(false);
    }
  };

  // Real-Time Event & Focus Listeners
  useEffect(() => {
    // Refresh on component mount
    refreshTeamRoster();

    // Refresh on window focus
    const handleFocus = () => {
      refreshTeamRoster();
    };
    window.addEventListener("focus", handleFocus);

    // Listen to real-time user events
    const handleUserChangeEvent = () => {
      refreshTeamRoster();
    };

    window.addEventListener("user.created", handleUserChangeEvent);
    window.addEventListener("user.updated", handleUserChangeEvent);
    window.addEventListener("user.profilePhotoUpdated", handleUserChangeEvent);
    window.addEventListener("user.statusChanged", handleUserChangeEvent);
    window.addEventListener("user.permissionsChanged", handleUserChangeEvent);
    window.addEventListener("user.changed", handleUserChangeEvent);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("user.created", handleUserChangeEvent);
      window.removeEventListener("user.updated", handleUserChangeEvent);
      window.removeEventListener("user.profilePhotoUpdated", handleUserChangeEvent);
      window.removeEventListener("user.statusChanged", handleUserChangeEvent);
      window.removeEventListener("user.permissionsChanged", handleUserChangeEvent);
      window.removeEventListener("user.changed", handleUserChangeEvent);
    };
  }, []);

  // Derive Chat Roster cleanly from central user source by stable user.id
  const chatRoster = useMemo(() => {
    const rawList = (userRoster && userRoster.length > 0) ? userRoster : DEFAULT_USERS;
    
    // De-duplicate by stable user.id
    const userMap = new Map<string, User>();
    rawList.forEach(u => {
      if (u && u.id) {
        userMap.set(u.id, u);
      }
    });

    if (currentUser && currentUser.id) {
      const existing = userMap.get(currentUser.id);
      userMap.set(currentUser.id, { ...existing, ...currentUser });
    }

    const uniqueUsers = Array.from(userMap.values());

    return uniqueUsers
      .filter(u => {
        if (!u) return false;
        const st = (u.status || "").toLowerCase();
        // Exclude inactive, disabled, or deleted users from active team directory
        if (st === 'inactive' || st === 'disabled' || st === 'deleted' || st === 'pending') return false;
        return canAccessMessages(u);
      })
      .map(u => {
        const fullName = getUserFullName(u);
        const photo = getUserPhotoUrl(u);
        const userRole = u.jobTitle || u.role || "Mortgage Specialist";
        
        const availability = (u.availability || u.userStatus?.availability || (u.status === 'active' ? 'available' : 'offline')) as any;
        let status = "online";
        let statusLabel = "Available 🟢";
        let color = "bg-emerald-500";

        if (availability === 'busy') {
          status = "busy";
          statusLabel = "Busy 🔴";
          color = "bg-rose-500";
        } else if (availability === 'in_meeting') {
          status = "in_meeting";
          statusLabel = "In a meeting 📅";
          color = "bg-purple-500";
        } else if (availability === 'on_call') {
          status = "on_call";
          statusLabel = "On a call 📞";
          color = "bg-blue-500";
        } else if (availability === 'do_not_disturb') {
          status = "do_not_disturb";
          statusLabel = "Do not disturb ⛔";
          color = "bg-rose-600";
        } else if (availability === 'away') {
          status = "away";
          statusLabel = "Away 🟡";
          color = "bg-amber-500";
        } else if (availability === 'offline') {
          status = "offline";
          statusLabel = "Offline ⚪";
          color = "bg-slate-400";
        }

        return {
          id: u.id,
          name: fullName,
          first: u.first || "",
          last: u.last || "",
          role: userRole,
          status: status,
          availability: availability,
          statusLabel: statusLabel,
          color: color,
          chatColor: (u as any).chatColor || color,
          avatar: photo,
          email: u.email,
          rawUser: u
        };
      });
  }, [userRoster, currentUser]);

  // Mark channel read when opened (Req 1)
  useEffect(() => {
    if (activeChannel && activeChannel !== "saved-messages") {
      handleMarkChannelRead(activeChannel);
    }
  }, [activeChannel]);

  const handleMarkChannelRead = (channelId: string) => {
    const nowIso = new Date().toISOString();
    setUserReadState(prev => ({
      ...prev,
      [channelId]: nowIso
    }));
    markChannelRead(channelId, currentUserId).catch(() => {});
  };

  const handleMarkAllChannelsRead = () => {
    const nowIso = new Date().toISOString();
    const updated: Record<string, string> = {};
    chatRoster.forEach(tm => {
      updated[tm.id] = nowIso;
    });
    setUserReadState(updated);
    if (showToast) showToast("All channels marked as read", "success", "✓");
  };

  // Compute Unread Counts per channel (Req 1)
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    chatRoster.forEach(tm => {
      const channelMsgs = messages[tm.id] || [];
      const lastRead = userReadState[tm.id];
      if (!lastRead) {
        // Default seed unread count for demo if never opened
        counts[tm.id] = tm.id === "dm_wayne" ? 1 : 0;
      } else {
        const lastReadTime = new Date(lastRead).getTime();
        const unread = channelMsgs.filter((m: any) => {
          const msgTime = m.createdAt ? new Date(m.createdAt).getTime() : 0;
          return msgTime > lastReadTime && m.senderId !== currentUserId;
        });
        counts[tm.id] = unread.length;
      }
    });
    return counts;
  }, [chatRoster, messages, userReadState, currentUserId]);

  const currentChannelDetails = useMemo(() => {
    if (activeChannel === "saved-messages") {
      return {
        name: "Saved Messages",
        role: "Personal Bookmarks",
        status: "active",
        statusLabel: `${savedMessages.length} saved`,
        color: "bg-amber-400",
        chatColor: "amber",
        privacy: "personal-bookmarks",
        isChannel: false,
        icon: "🔖",
        avatar: null
      };
    }

    const dm = chatRoster.find(t => 
      t.id === activeChannel || 
      (t.id === 'u_waynem' && activeChannel === 'dm_wayne') || 
      (t.id === 'u_david' && activeChannel === 'dm_david') ||
      (t.id === 'u_jeffb' && activeChannel === 'dm_jeff') ||
      (t.id === 'u_timb' && activeChannel === 'dm_tim') ||
      (t.id === 'u_jameyb' && activeChannel === 'dm_jamey') ||
      (t.id === 'u_matthewb' && activeChannel === 'dm_matt') ||
      (t.id === 'u_jasonm' && activeChannel === 'dm_jason')
    );
    if (dm) {
      return { 
        name: dm.name, 
        role: dm.role, 
        status: dm.status, 
        statusLabel: dm.statusLabel, 
        color: dm.color, 
        avatar: dm.avatar,
        chatColor: dm.chatColor,
        privacy: "direct-message", 
        isChannel: false, 
        icon: "👤" 
      };
    }
    return { name: "Direct Message", role: "Team Member", status: "offline", statusLabel: "Offline", color: "bg-slate-500", privacy: "direct-message", isChannel: false, icon: "👤", avatar: null };
  }, [activeChannel, chatRoster, savedMessages]);

  // Sanitize raw channel messages
  const rawChannelMessages = useMemo(() => {
    if (activeChannel === "saved-messages") return [];

    let list = messages[activeChannel];
    if (!list) {
      if (activeChannel === 'u_waynem') list = messages['dm_wayne'];
      else if (activeChannel === 'dm_wayne') list = messages['u_waynem'];
      else if (activeChannel === 'u_david') list = messages['dm_david'];
      else if (activeChannel === 'dm_david') list = messages['u_david'];
      else if (activeChannel === 'u_jeffb') list = messages['dm_jeff'];
      else if (activeChannel === 'u_timb') list = messages['dm_tim'];
      else if (activeChannel === 'u_jameyb') list = messages['dm_jamey'];
      else if (activeChannel === 'u_matthewb') list = messages['dm_matt'];
      else if (activeChannel === 'u_jasonm') list = messages['dm_jason'];
    }
    const finalMsgList = list || [];
    return finalMsgList.map((m: any, idx) => ({
      id: m.id || `m_seeded_${activeChannel}_${idx}`,
      senderId: m.senderId || "staff_other",
      authorId: m.authorId || m.senderId || "staff_other",
      author: m.author || "Teammate",
      initials: m.initials || m.author?.slice(0, 2).toUpperCase() || "TM",
      role: m.role || (m.author === "Tim Brown" ? "Broker Principal" : m.author === "Wayne MacLeod" ? "BDM" : m.author === "Jeff Brown" ? "Assistant" : "Mortgage Agent"),
      senderChatColor: m.senderChatColor || chatRoster.find(u => u.id === m.senderId || u.name === m.author)?.chatColor,
      text: m.text || m.content || "",
      content: m.content || m.text || "",
      time: m.time || "10:00 AM",
      date: m.date || "Today",
      createdAt: m.createdAt || new Date().toISOString(),
      editedAt: m.editedAt || undefined,
      deletedAt: m.deletedAt || undefined,
      deletedBy: m.deletedBy || undefined,
      replyToId: m.replyToId || undefined,
      replies: m.replies || [],
      replyCount: m.replies?.length || m.replyCount || 0,
      clientTag: m.clientTag || undefined,
      clientId: m.clientId || (m.clientTag ? clients.find(c => m.clientTag.includes(c.last))?.id : undefined),
      priority: m.priority || "normal",
      pinned: m.pinned || false,
      status: m.status || (failedMessageIds.has(m.id) ? 'failed' : sendingMessageIds.has(m.id) ? 'sending' : 'sent'),
      attachments: m.attachments || [],
      mentions: m.mentions || [],
      readBy: m.readBy || ["TB", "WM", "JM"],
      reactions: m.reactions || {}
    }));
  }, [messages, activeChannel, clients, chatRoster, sendingMessageIds, failedMessageIds]);

  // Search Filtered Messages across channels or within current channel (Req 2)
  const filteredMessages = useMemo(() => {
    return rawChannelMessages.filter(m => {
      // Content Search
      const textMatches = searchQuery === "" || m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.author.toLowerCase().includes(searchQuery.toLowerCase());
      // Sender Filter
      const senderMatches = !searchSender || m.author.toLowerCase().includes(searchSender.toLowerCase());
      // Priority Filter
      const priorityMatches = selectedEscalationFilter === "all" || m.priority === selectedEscalationFilter;
      // Client Filter
      const clientMatches = selectedClientSearch === "" || m.clientId === selectedClientSearch;
      // Attachments Filter
      const attachmentMatches = !hasAttachmentsFilter || (m.attachments && m.attachments.length > 0);
      // Saved Filter
      const isSaved = savedMessages.some(sm => sm.messageId === m.id);
      const savedMatches = !savedOnlyFilter || isSaved;
      // Date Range Filter
      let dateMatches = true;
      if (searchStartDate) {
        const msgTime = new Date(m.createdAt).getTime();
        const startTime = new Date(searchStartDate).getTime();
        if (msgTime < startTime) dateMatches = false;
      }
      if (searchEndDate) {
        const msgTime = new Date(m.createdAt).getTime();
        const endTime = new Date(searchEndDate).getTime() + 86400000;
        if (msgTime > endTime) dateMatches = false;
      }

      return textMatches && senderMatches && priorityMatches && clientMatches && attachmentMatches && savedMatches && dateMatches;
    });
  }, [rawChannelMessages, searchQuery, searchSender, selectedEscalationFilter, selectedClientSearch, hasAttachmentsFilter, savedOnlyFilter, searchStartDate, searchEndDate, savedMessages]);

  // Pagination Slice (Req 8)
  const channelLimit = visibleMessageCount[activeChannel] || 25;
  const paginatedMessages = useMemo(() => {
    if (filteredMessages.length <= channelLimit) return filteredMessages;
    return filteredMessages.slice(filteredMessages.length - channelLimit);
  }, [filteredMessages, channelLimit]);

  const hasMoreOlderMessages = filteredMessages.length > paginatedMessages.length;

  const handleLoadOlderMessages = () => {
    setIsLoadingOlder(true);
    setTimeout(() => {
      setVisibleMessageCount(prev => ({
        ...prev,
        [activeChannel]: (prev[activeChannel] || 25) + 25
      }));
      setIsLoadingOlder(false);
    }, 400);
  };

  // Grouping & Date Separators (Req 6)
  const groupedMessageBlocks = useMemo(() => {
    const blocks: Array<{
      type: 'date_separator' | 'message_group';
      id: string;
      dateLabel?: string;
      messages?: any[];
      isGroupedHeader?: boolean;
    }> = [];

    let currentDateStr = "";

    paginatedMessages.forEach((msg, idx) => {
      const dateLabel = getFormattedDateSeparator(msg.date, msg.createdAt);
      if (dateLabel !== currentDateStr) {
        currentDateStr = dateLabel;
        blocks.push({
          type: 'date_separator',
          id: `date_sep_${idx}_${dateLabel}`,
          dateLabel
        });
      }

      const prevBlock = blocks[blocks.length - 1];
      if (
        prevBlock &&
        prevBlock.type === 'message_group' &&
        prevBlock.messages &&
        prevBlock.messages.length > 0
      ) {
        const lastMsg = prevBlock.messages[prevBlock.messages.length - 1];
        const isSameAuthor = lastMsg.senderId === msg.senderId || lastMsg.author === msg.author;
        const timeDiff = Math.abs(new Date(msg.createdAt).getTime() - new Date(lastMsg.createdAt).getTime());
        const isWithin5Mins = timeDiff < 300000; // 5 minutes

        if (isSameAuthor && isWithin5Mins && !msg.priority && msg.priority === 'normal') {
          prevBlock.messages.push(msg);
          return;
        }
      }

      blocks.push({
        type: 'message_group',
        id: `msg_group_${msg.id}`,
        messages: [msg]
      });
    });

    return blocks;
  }, [paginatedMessages]);

  const pinnedChannelMessages = useMemo(() => {
    return rawChannelMessages.filter(m => m.pinned && !m.deletedAt);
  }, [rawChannelMessages]);

  // Saved Messages view items
  const savedMessageItems = useMemo(() => {
    if (activeChannel !== "saved-messages") return [];
    const result: { savedItem: SavedMessage; message: any; channelName: string; channelId: string }[] = [];

    savedMessages.forEach(sm => {
      let foundMsg: any = null;
      let foundChannelKey = sm.channelId;

      for (const key in messages) {
        const match = (messages[key] || []).find((m: any) => m.id === sm.messageId);
        if (match) {
          foundMsg = match;
          foundChannelKey = key;
          break;
        }
      }

      if (foundMsg) {
        const rosterMatch = chatRoster.find(r => r.id === foundChannelKey);
        const channelName = rosterMatch ? rosterMatch.name : foundChannelKey;
        result.push({
          savedItem: sm,
          message: {
            ...foundMsg,
            text: foundMsg.text || foundMsg.content || ""
          },
          channelName,
          channelId: foundChannelKey
        });
      }
    });

    return result;
  }, [activeChannel, savedMessages, messages, chatRoster]);

  // Send Message with Composer & Network Retry (Req 4)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeChannel === "saved-messages") return;

    const trimmed = msgInputText.trim();
    if (!trimmed && attachedFiles.length === 0) return;

    if (!canSendMessage(null, currentUser)) {
      if (showToast) showToast("Your account permission is read-only for team messages.", "error", "🔒");
      return;
    }

    const tempMsgId = `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    // Duplicate Protection
    if (sendingMessageIds.has(tempMsgId)) return;

    let clientTag: string | undefined = undefined;
    let clientId: string | undefined = undefined;

    if (selectedClientSearch || linkedChatClientId) {
      const targetId = selectedClientSearch || linkedChatClientId;
      const linkedClient = clients.find(c => c.id === targetId);
      if (linkedClient) {
        clientTag = `[Client: ${linkedClient.first} ${linkedClient.last}]`;
        clientId = linkedClient.id;
      }
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: Message = {
      id: tempMsgId,
      channelId: activeChannel,
      senderId: currentUserId,
      authorId: currentUserId,
      author: currentUser.displayName || `${currentUser.first} ${currentUser.last}`.trim() || "You",
      initials: authorInitials,
      role: currentUser.jobTitle || currentUser.role || "Mortgage Broker",
      text: trimmed,
      content: trimmed,
      time: formattedTime,
      date: "Today",
      createdAt: now.toISOString(),
      priority: msgPriority,
      pinned: false,
      status: connectionState === 'offline' ? 'failed' : 'sending',
      attachments: attachedFiles.map(f => ({ name: f.name, size: f.size, type: f.type, url: "#" })),
      mentions: [],
      clientTag,
      clientId,
      readBy: [authorInitials],
      reactions: {},
      replies: [],
      replyCount: 0
    };

    // Append to local state immediately
    setMessages(prev => {
      const currentList = prev[activeChannel] || [];
      const updatedList = [...currentList, newMsg];
      const updatedObj = { ...prev, [activeChannel]: updatedList };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });

    // Clear composer inputs, typing state & channel draft
    if (typingDebounceTimerRef.current) clearTimeout(typingDebounceTimerRef.current);
    stopTyping(activeChannel, currentUserId);

    setMsgInputText("");
    setAttachedFiles([]);
    setMsgPriority("normal");
    setChannelDrafts(prev => {
      const updated = { ...prev, [activeChannel]: "" };
      localStorage.setItem(`gbk_channel_drafts_${currentUserId}`, JSON.stringify(updated));
      return updated;
    });

    setSendingMessageIds(prev => new Set(prev).add(tempMsgId));

    // Audit Event
    logActivityEvent({
      timestamp: now.toISOString(),
      eventType: "message_created",
      action: "message.created",
      user: `${currentUser.first} ${currentUser.last}`,
      description: `Sent message in ${currentChannelDetails.name}: "${trimmed.slice(0, 50)}"`
    });

    // Call Backend API
    if (connectionState !== 'offline') {
      try {
        const res = await sendMessage(activeChannel, newMsg);
        setSendingMessageIds(prev => {
          const next = new Set(prev);
          next.delete(tempMsgId);
          return next;
        });

        // Update message status to sent
        setMessages(prev => {
          const currentList = prev[activeChannel] || [];
          const updatedList = currentList.map((m: any) => m.id === tempMsgId ? { ...m, status: 'sent' } : m);
          return { ...prev, [activeChannel]: updatedList };
        });
      } catch {
        setSendingMessageIds(prev => {
          const next = new Set(prev);
          next.delete(tempMsgId);
          return next;
        });
        setFailedMessageIds(prev => new Set(prev).add(tempMsgId));
        setMessages(prev => {
          const currentList = prev[activeChannel] || [];
          const updatedList = currentList.map((m: any) => m.id === tempMsgId ? { ...m, status: 'failed' } : m);
          return { ...prev, [activeChannel]: updatedList };
        });
      }
    } else {
      setSendingMessageIds(prev => {
        const next = new Set(prev);
        next.delete(tempMsgId);
        return next;
      });
      setFailedMessageIds(prev => new Set(prev).add(tempMsgId));
    }
  };

  // Retry Failed Message (Req 4 & 5)
  const handleRetryMessage = async (msg: any) => {
    setFailedMessageIds(prev => {
      const next = new Set(prev);
      next.delete(msg.id);
      return next;
    });
    setSendingMessageIds(prev => new Set(prev).add(msg.id));

    setMessages(prev => {
      const list = prev[activeChannel] || [];
      const updated = list.map((m: any) => m.id === msg.id ? { ...m, status: 'sending' } : m);
      return { ...prev, [activeChannel]: updated };
    });

    try {
      await sendMessage(activeChannel, msg);
      setSendingMessageIds(prev => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
      setMessages(prev => {
        const list = prev[activeChannel] || [];
        const updated = list.map((m: any) => m.id === msg.id ? { ...m, status: 'sent' } : m);
        return { ...prev, [activeChannel]: updated };
      });
      if (showToast) showToast("Message resent successfully", "success", "✓");
    } catch {
      setSendingMessageIds(prev => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
      setFailedMessageIds(prev => new Set(prev).add(msg.id));
      setMessages(prev => {
        const list = prev[activeChannel] || [];
        const updated = list.map((m: any) => m.id === msg.id ? { ...m, status: 'failed' } : m);
        return { ...prev, [activeChannel]: updated };
      });
      if (showToast) showToast("Failed to send message", "error", "⚠️");
    }
  };

  // Thread Reply Send Handler (Req 3)
  const handleSendThreadReply = () => {
    if (!activeThreadParentMsg || !threadReplyInput.trim()) return;

    const trimmed = threadReplyInput.trim();
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const replyObj: Message = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      channelId: activeChannel,
      senderId: currentUserId,
      authorId: currentUserId,
      author: currentUser.displayName || `${currentUser.first} ${currentUser.last}`.trim() || "You",
      initials: authorInitials,
      role: currentUser.jobTitle || currentUser.role || "Mortgage Broker",
      text: trimmed,
      content: trimmed,
      time: formattedTime,
      date: "Today",
      createdAt: now.toISOString(),
      replyToId: activeThreadParentMsg.id,
      status: 'sent'
    };

    setMessages(prev => {
      const channelMsgs = prev[activeChannel] || [];
      const updatedMsgs = channelMsgs.map((m: any) => {
        if (m.id === activeThreadParentMsg.id) {
          const existingReplies = m.replies || [];
          return {
            ...m,
            replies: [...existingReplies, replyObj],
            replyCount: existingReplies.length + 1
          };
        }
        return m;
      });

      const updatedObj = { ...prev, [activeChannel]: updatedMsgs };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });

    // Update parent message state in activeThreadParentMsg
    setActiveThreadParentMsg(prev => {
      if (!prev) return null;
      const existingReplies = prev.replies || [];
      return {
        ...prev,
        replies: [...existingReplies, replyObj],
        replyCount: existingReplies.length + 1
      };
    });

    setThreadReplyInput("");

    logActivityEvent({
      timestamp: now.toISOString(),
      eventType: "message_created",
      action: "message.reply_created",
      user: `${currentUser.first} ${currentUser.last}`,
      description: `Replied in thread on message in ${currentChannelDetails.name}`
    });
  };

  // Toggle bookmark saved message (Req 11 Audit)
  const handleToggleSaveMessage = async (msg: Message, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isSaved = savedMessages.some(sm => sm.messageId === msg.id);

    if (isSaved) {
      setSavedMessages(prev => prev.filter(sm => sm.messageId !== msg.id));
      unsaveMessage(msg.id, currentUserId).catch(() => {});
      logActivityEvent({
        timestamp: new Date().toISOString(),
        eventType: "message_unsaved",
        action: "message.unsaved",
        user: `${currentUser.first} ${currentUser.last}`,
        description: `Unsaved message: "${msg.text.slice(0, 40)}"`
      });
      if (showToast) showToast("Removed from Saved Messages", "info", "🔖");
    } else {
      const newSaved: SavedMessage = {
        id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        messageId: msg.id,
        channelId: activeChannel,
        userId: currentUserId,
        savedAt: new Date().toISOString()
      };
      setSavedMessages(prev => [newSaved, ...prev]);
      saveMessage(msg.id, currentUserId, activeChannel).catch(() => {});
      logActivityEvent({
        timestamp: new Date().toISOString(),
        eventType: "message_saved",
        action: "message.saved",
        user: `${currentUser.first} ${currentUser.last}`,
        description: `Saved message from ${msg.author}: "${msg.text.slice(0, 40)}"`
      });
      if (showToast) showToast("Saved to Bookmarks", "success", "🔖");
    }
  };

  // Toggle Pinned status
  const handleTogglePinMessage = (msgId: string) => {
    setMessages(prev => {
      const list = prev[activeChannel] || [];
      const updatedList = list.map((m: any) => {
        if (m.id === msgId) {
          const nextPinned = !m.pinned;
          if (showToast) showToast(nextPinned ? "Message pinned to top" : "Message unpinned", "info", "📌");
          return { ...m, pinned: nextPinned };
        }
        return m;
      });
      const updatedObj = { ...prev, [activeChannel]: updatedList };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });
  };

  // Inline Message Editing (Req 11 Audit)
  const handleStartEditing = (msg: Message, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditMessage(msg, currentUser)) {
      if (showToast) showToast("You can only edit your own messages.", "error", "🔒");
      return;
    }
    setEditingMsgId(msg.id);
    setEditContent(msg.text || msg.content || "");
    setActiveMenuMsgId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMsgId || !editContent.trim()) return;
    setIsSavingEdit(true);

    const nowIso = new Date().toISOString();

    setMessages(prev => {
      const list = prev[activeChannel] || [];
      const updatedList = list.map((m: any) => {
        if (m.id === editingMsgId) {
          return {
            ...m,
            text: editContent.trim(),
            content: editContent.trim(),
            editedAt: nowIso
          };
        }
        return m;
      });
      const updatedObj = { ...prev, [activeChannel]: updatedList };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });

    updateMessage(editingMsgId, editContent.trim()).catch(() => {});

    logActivityEvent({
      timestamp: nowIso,
      eventType: "message_edited",
      action: "message.edited",
      user: `${currentUser.first} ${currentUser.last}`,
      description: `Edited message content in channel ${activeChannel}`
    });

    setIsSavingEdit(false);
    setEditingMsgId(null);
    setEditContent("");
    if (showToast) showToast("Message updated", "success", "✏️");
  };

  // Soft Delete Message (Req 11 Audit)
  const handleConfirmSoftDelete = async (msgId: string) => {
    setIsDeletingMsg(true);
    const nowIso = new Date().toISOString();

    setMessages(prev => {
      const list = prev[activeChannel] || [];
      const updatedList = list.map((m: any) => {
        if (m.id === msgId) {
          return {
            ...m,
            text: "[This message was deleted]",
            content: "[This message was deleted]",
            deletedAt: nowIso,
            deletedBy: currentUserId
          };
        }
        return m;
      });
      const updatedObj = { ...prev, [activeChannel]: updatedList };
      localStorage.setItem("gbk_messages", JSON.stringify(updatedObj));
      return updatedObj;
    });

    softDeleteMessage(msgId, currentUserId).catch(() => {});

    logActivityEvent({
      timestamp: nowIso,
      eventType: "message_deleted",
      action: "message.deleted",
      user: `${currentUser.first} ${currentUser.last}`,
      description: `Deleted message in channel ${activeChannel}`
    });

    setIsDeletingMsg(false);
    setConfirmDeleteMsgId(null);
    setActiveMenuMsgId(null);
    if (showToast) showToast("Message deleted", "info", "🗑️");
  };

  // Attachment Download Audit (Req 11)
  const handleDownloadAttachment = (att: any, msg: any) => {
    logActivityEvent({
      timestamp: new Date().toISOString(),
      eventType: "message_attachment_downloaded",
      action: "message.attachment_downloaded",
      user: `${currentUser.first} ${currentUser.last}`,
      description: `Downloaded attachment "${att.name}" from message in ${activeChannel}`
    });
    if (showToast) showToast(`Downloading ${att.name}`, "info", "📎");
  };

  // Handle local desktop file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttached = Array.from(files).map(f => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      type: f.type || "Document"
    }));

    setAttachedFiles(prev => [...prev, ...newAttached]);
    if (showToast) showToast(`Attached ${newAttached.length} file(s)`, "info", "📎");
  };

  // Toggle Message Reaction Emoji
  const handleToggleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => {
      const list = prev[activeChannel] || [];
      const updatedList = list.map((m: any) => {
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

  // Task Conversion Wizard
  const handleOpenTaskWizard = (msg: Message) => {
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

    let assigned = "Jeff Brown";
    if (msg.author !== "You" && msg.author !== (`${currentUser.first} ${currentUser.last}`)) {
      assigned = msg.author;
    }

    setWizardDraftTask({
      title: msg.text.length > 110 ? msg.text.substring(0, 107) + "..." : msg.text,
      notes: `Escalated directly from Internal Team Thread [Direct Message: ${msg.author}] posted at ${msg.time}.\n\nOriginal statement: "${msg.text}"`,
      priority: msg.priority === "urgent" || msg.priority === "blocked" ? "high" : "medium",
      category,
      clientId: msg.clientId || "",
      dueDate: "2026-08-15",
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
      createdBy: `${currentUser.first} ${currentUser.last}`,
      subtasks: [],
      calendarSync: true,
      auditLogs: [
        { timestamp: new Date().toISOString(), action: `Task generated via Internal Message escalation thread`, user: `${currentUser.first} ${currentUser.last}` }
      ]
    };

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

  const handleJumpToChannel = (targetChannelId: string, targetMsgId: string) => {
    setActiveChannel(targetChannelId);
    setTimeout(() => {
      const el = document.getElementById(`msg_${targetMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-amber-400");
        setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 2500);
      }
    }, 200);
  };

  // Text Highlighting Helper (Req 2)
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/30 text-amber-200 font-bold px-0.5 rounded">{part}</mark>
      ) : part
    );
  };

  return (
    <div className="flex bg-[var(--color-bg)] border border-[var(--color-border)]/70 rounded-2xl overflow-hidden shadow-2xl h-full min-h-0 divide-x divide-[var(--color-border)]/70 select-none text-left relative" id="team-messaging-core">
      
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />

      {/* ============================================================== */}
      {/* BAR 1: LEFT NAVIGATION INDEX FOR CHANNELS & MEMBERS (WIDTH 60) */}
      {/* ============================================================== */}
      <div className="w-60 shrink-0 flex flex-col h-full bg-[var(--color-surface)]/45 select-none min-h-0">
        
        {/* Workspace Brand & Connection Status (Req 5) */}
        <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-panel)]/50 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-[var(--color-text)] truncate uppercase tracking-wider flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                connectionState === 'connected' ? 'bg-emerald-500 animate-pulse' :
                connectionState === 'reconnecting' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
              }`} />
              Team Hub
            </h4>
          </div>
          
          {/* Connection Pill & Mark All Read */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleMarkAllChannelsRead}
              className="text-[9.5px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 transition-all"
              title="Mark all channels as read"
            >
              Read All
            </button>
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border ${
              connectionState === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              connectionState === 'reconnecting' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {connectionState}
            </span>
          </div>
        </div>

        {/* Categories, Channels & Colleagues Segment */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          
          {/* Section A: Personal Bookmarks / Saved Messages */}
          <div>
            <div className="px-1.5 text-[9.5px] font-extrabold text-[var(--color-text-faint)] uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>Personal</span>
            </div>

            <button
              onClick={() => setActiveChannel("saved-messages")}
              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                activeChannel === "saved-messages" 
                  ? "bg-amber-500/10 border border-amber-500/25 text-amber-400" 
                  : "border border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[var(--color-text)] font-extrabold">Saved Messages</div>
                  <div className="text-[8.5px] text-amber-400/80 font-semibold">Bookmarks</div>
                </div>
              </span>

              {savedMessages.length > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {savedMessages.length}
                </span>
              )}
            </button>
          </div>

          {/* Section B: Favorite Channels (Req 7) */}
          {favoriteChannels.length > 0 && (
            <div>
              <div className="px-1.5 text-[9.5px] font-extrabold text-[var(--color-text-faint)] uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" /> Favorites
                </span>
              </div>

              <div className="space-y-0.5">
                {chatRoster.filter(tm => favoriteChannels.includes(tm.id)).map(tm => {
                  const isActive = activeChannel === tm.id;
                  const countBadge = unreadCounts[tm.id] || 0;
                  const isUnread = countBadge > 0;

                  return (
                    <div
                      key={`fav_${tm.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveChannel(tm.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveChannel(tm.id); }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        isActive 
                          ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/15 text-[var(--color-accent)]" 
                          : "border border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="relative flex-shrink-0">
                          <Avatar src={tm.avatar} name={tm.name} size="sm" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[var(--color-bg)] ${tm.color}`} />
                        </span>
                        <div className="min-w-0">
                          <div className={`truncate ${isUnread ? 'font-black text-[var(--color-text)]' : 'text-[var(--color-text)] opacity-90'}`}>
                            {tm.name}
                          </div>
                          <div className="text-[8.5px] text-[var(--color-text-faint)] truncate font-semibold">{tm.role}</div>
                        </div>
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => toggleFavoriteChannel(tm.id, e)}
                          className="text-amber-400 hover:text-amber-300 p-0.5"
                          title="Remove from favorites"
                        >
                          <Star className="w-3 h-3 fill-amber-400" />
                        </button>
                        {countBadge > 0 && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black bg-[var(--color-accent)] text-black">
                            {countBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section C: All Channels & Direct Colleagues (Req 1 & 7) */}
          <div>
            <div className="px-1.5 text-[9.5px] font-extrabold text-[var(--color-text-faint)] uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>Team Channels</span>
              <span className="text-[8.5px] font-semibold text-[var(--color-text-faint)] opacity-70">Central Roster</span>
            </div>

            <div className="space-y-0.5 animate-fade-in">
              {chatRoster.map(tm => {
                const isActive = activeChannel === tm.id;
                const countBadge = unreadCounts[tm.id] || 0;
                const isUnread = countBadge > 0;
                const isFav = favoriteChannels.includes(tm.id);

                return (
                  <div
                    key={tm.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveChannel(tm.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveChannel(tm.id); }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all group cursor-pointer ${
                      isActive 
                        ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/15 text-[var(--color-accent)]" 
                        : "border border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="relative flex-shrink-0">
                        <div
                          className="rounded-full p-[2px]"
                          style={{
                            background: chatColorGradients[tm.chatColor ?? ""] ?? DEFAULT_CHAT_GRADIENT
                          }}
                        >
                          <Avatar
                            src={tm.avatar}
                            name={tm.name}
                            size="sm"
                          />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[var(--color-bg)] ${tm.color}`} />
                      </span>
                      <div className="min-w-0">
                        <div className={`truncate ${isUnread ? 'font-black text-[var(--color-text)]' : 'text-[var(--color-text)] opacity-90'}`}>
                          {tm.name}
                        </div>
                        <div className="text-[8.5px] text-[var(--color-text-faint)] truncate font-semibold">{tm.role}</div>
                        {(() => {
                           const lastMsgArr = messages[tm.id] || [];
                           const lastMsg = lastMsgArr[lastMsgArr.length - 1];
                           return lastMsg ? (
                             <div className="text-[8px] text-[var(--color-text-faint)] truncate max-w-[110px] mt-0.5 font-normal italic">
                              {lastMsg.deletedAt ? "[Deleted]" : (lastMsg.text || lastMsg.content)}
                             </div>
                           ) : null;
                        })()}
                      </div>
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => toggleFavoriteChannel(tm.id, e)}
                        className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isFav ? 'text-amber-400 opacity-100' : 'text-[var(--color-text-faint)] hover:text-amber-400'}`}
                        title={isFav ? "Unfavorite channel" : "Favorite channel"}
                      >
                        <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>

                      {countBadge > 0 && (
                        <span 
                          className="font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black"
                          style={{
                            background: `${chatColorGradients[tm.chatColor ?? ""] ?? DEFAULT_CHAT_GRADIENT}`,
                            color: "white",
                            boxShadow: "0 0 8px rgba(0,0,0,0.3)"
                          }}
                        >
                          {countBadge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Current User Session Overview */}
        <div 
          onClick={() => setIsStatusModalOpen(true)}
          className="p-3 border-t border-[var(--color-border)] bg-[var(--color-panel)]/30 flex items-center justify-between gap-2 shrink-0 cursor-pointer hover:bg-[var(--color-surface-2)]/60 transition-colors group"
          title="Click to change availability status"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={getUserPhotoUrl(currentUser) || (currentUser as any)?.avatar}
              first={currentUser.first}
              last={currentUser.last}
              name={currentUser.displayName || getUserFullName(currentUser)}
              availability={(currentUser.availability || (currentUser as any)?.userStatus?.availability || 'available') as any}
              showStatus={true}
              size="sm"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-black text-[var(--color-text)] truncate leading-tight group-hover:text-[var(--color-accent)] transition-colors">
                {currentUser.first} {currentUser.last}
              </div>
              <div className="text-[8.5px] text-[var(--color-text-muted)] truncate font-semibold uppercase">
                {currentUser.role || "Mortgage Broker (Owner)"}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-accent)] shrink-0 group-hover:border-[var(--color-accent)]/50 transition-colors">
            Set Status
          </span>
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
              <div
                className="rounded-full p-[2px]"
                style={{
                  background: chatColorGradients[currentChannelDetails?.chatColor ?? ""] ?? DEFAULT_CHAT_GRADIENT
                }}
              >
                {currentChannelDetails.avatar ? (
                  <img src={currentChannelDetails.avatar} alt={currentChannelDetails.name} className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--color-panel)] border border-[var(--color-border)] flex items-center justify-center font-mono text-xs font-black text-[var(--color-text-muted)]">
                    {currentChannelDetails.name.split(" ").map(n => n[0]).join("")}
                  </div>
                )}
              </div>
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

          {activeChannel !== "saved-messages" && (
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

              {/* Advanced Search Toggle (Req 2) */}
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={`p-1.5 rounded-xl border flex items-center justify-center gap-1 text-[10.5px] font-bold transition-all ${
                  showAdvancedSearch || searchSender || hasAttachmentsFilter || savedOnlyFilter || searchStartDate
                    ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "bg-[var(--color-panel)] border-[var(--color-border)]/70 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                }`}
                title="Advanced Filters"
              >
                <Filter className="w-3 h-3" />
                <span>Filters</span>
              </button>

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
                value={selectedClientSearch || linkedChatClientId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedClientSearch(val);
                  if (setLinkedChatClientId) {
                    setLinkedChatClientId(val || null);
                  }
                }}
                className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-[10.5px] text-[var(--color-text-muted)] focus:outline-none font-bold shrink-0 max-w-[190px] sm:max-w-[210px] truncate"
                title="Link to Client / Filter messages by deal file"
              >
                <option value="">📎 All Clients</option>
                {clients.map(c => {
                  const tagDetail = c.stage || c.status || c.lender || "Active";
                  return (
                    <option key={c.id} value={c.id}>
                      {c.first} {c.last} ({tagDetail})
                    </option>
                  );
                })}
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
          )}

        </div>

        {/* ADVANCED SEARCH FILTERS DRAWER (Req 2) */}
        {showAdvancedSearch && activeChannel !== "saved-messages" && (
          <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-3 flex flex-wrap items-center gap-3 text-xs animate-slide-down">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Sender:</span>
              <input
                type="text"
                placeholder="Sender name..."
                value={searchSender}
                onChange={(e) => setSearchSender(e.target.value)}
                className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] w-28 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">From:</span>
              <input
                type="date"
                value={searchStartDate}
                onChange={(e) => setSearchStartDate(e.target.value)}
                className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">To:</span>
              <input
                type="date"
                value={searchEndDate}
                onChange={(e) => setSearchEndDate(e.target.value)}
                className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={hasAttachmentsFilter}
                onChange={(e) => setHasAttachmentsFilter(e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-0"
              />
              <span>📎 With Attachments</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={savedOnlyFilter}
                onChange={(e) => setSavedOnlyFilter(e.target.checked)}
                className="rounded border-[var(--color-border)] text-amber-400 focus:ring-0"
              />
              <span>🔖 Bookmarked Only</span>
            </label>

            {(searchSender || searchStartDate || searchEndDate || hasAttachmentsFilter || savedOnlyFilter) && (
              <button
                onClick={() => {
                  setSearchSender("");
                  setSearchStartDate("");
                  setSearchEndDate("");
                  setHasAttachmentsFilter(false);
                  setSavedOnlyFilter(false);
                }}
                className="text-[10px] font-extrabold text-rose-400 hover:underline ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* HIGH-VISIBILITY PINNED MESSAGE COMPONENT DRAWER */}
        {activeChannel !== "saved-messages" && pinnedChannelMessages.length > 0 && showPinsPanel && (
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

        {/* ============================================================== */}
        {/* SAVED MESSAGES VIEW MODE */}
        {/* ============================================================== */}
        {activeChannel === "saved-messages" ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[var(--color-bg)]">
            {savedMessageItems.length > 0 ? (
              savedMessageItems.map(({ savedItem, message: msg, channelName, channelId }) => {
                const isCurrentUserVal = msg.senderId === currentUserId || (currentUser.first && msg.author?.includes(currentUser.first));
                const priorityUI = ESCALATION_FLAGS[msg.priority || "normal"];

                return (
                  <div key={savedItem.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col gap-3 shadow-md text-left">
                    <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)]">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <span>Saved from: <b className="text-[var(--color-accent)]">{channelName}</b></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleJumpToChannel(channelId, msg.id)}
                          className="text-[10px] font-extrabold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                        >
                          Jump to Thread <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleToggleSaveMessage(msg, e)}
                          className="text-[10px] font-bold text-rose-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Avatar src={msg.authorAvatar} name={msg.author} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)]">
                          <span>{msg.author}</span>
                          <span className="text-[10px] font-normal text-[var(--color-text-faint)]">{msg.time} · {msg.date}</span>
                        </div>
                        <p className="text-xs text-[var(--color-text)]/90 mt-1 whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--color-text-faint)]">
                <Bookmark className="w-12 h-12 mb-3 text-amber-400/40" />
                <h4 className="text-sm font-bold text-[var(--color-text)] mb-1">No Saved Messages</h4>
                <p className="text-xs max-w-sm">Bookmark important team messages, client updates, or lender instructions to access them quickly here.</p>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* STANDARD CHAT THREAD VIEW MODE WITH GROUPING & SEPARATORS (Req 6 & 8) */
          /* ============================================================== */
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg)] relative">
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Load Older Messages Pagination Header (Req 8) */}
              {hasMoreOlderMessages && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={handleLoadOlderMessages}
                    disabled={isLoadingOlder}
                    className="px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2"
                  >
                    {isLoadingOlder ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--color-accent)]" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>Load older messages</span>
                  </button>
                </div>
              )}

              {/* Message Blocks (Date Separators + Grouped Messages) */}
              {groupedMessageBlocks.length > 0 ? (
                groupedMessageBlocks.map(block => {
                  if (block.type === 'date_separator') {
                    return (
                      <div key={block.id} className="flex items-center my-4 select-none">
                        <div className="flex-1 border-t border-[var(--color-border)]/60" />
                        <span className="px-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-faint)] bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-full py-0.5 shadow-sm">
                          {block.dateLabel}
                        </span>
                        <div className="flex-1 border-t border-[var(--color-border)]/60" />
                      </div>
                    );
                  }

                  const msgs = block.messages || [];
                  if (msgs.length === 0) return null;

                  return (
                    <div key={block.id} className="space-y-1.5">
                      {msgs.map((msg, msgIdx) => {
                        const isFirstInGroup = msgIdx === 0;
                        const isEdited = Boolean(msg.editedAt);
                        const isSoftDeleted = Boolean(msg.deletedAt);
                        const isSaved = savedMessages.some(sm => sm.messageId === msg.id);
                        const replyCount = (msg.replies || []).length || msg.replyCount || 0;

                        // STRICT ALIGNMENT CHECK using authorId or senderId
                        const isOutgoing = msg.authorId ? msg.authorId === currentUserId : msg.senderId === currentUserId;

                        // Entrance animation check (only animate once for new messages)
                        const isNew = !seenMsgIdsRef.current.has(msg.id);
                        if (isNew && msg.id) {
                          seenMsgIdsRef.current.add(msg.id);
                        }
                        const animationClass = isNew
                          ? (isOutgoing ? "animate-msg-enter-outgoing" : "animate-msg-enter-incoming")
                          : "";

                        const escalationUI = ESCALATION_FLAGS[msg.priority || "normal"];

                        return (
                          <div
                            key={msg.id}
                            id={`msg_${msg.id}`}
                            className={`w-full flex my-1.5 ${isOutgoing ? 'justify-end' : 'justify-start'} group relative select-text`}
                          >
                            <div className={`flex items-end gap-2 max-w-[88%] sm:max-w-[75%] lg:max-w-[70%] ${isOutgoing ? 'flex-row-reverse' : 'flex-row'} ${animationClass}`}>
                              
                              {/* Avatar */}
                              <div className="shrink-0 mb-0.5">
                                {isFirstInGroup ? (
                                  <Avatar src={msg.authorAvatar} name={msg.author} size="sm" />
                                ) : (
                                  <div className="w-7 h-7" />
                                )}
                              </div>

                              {/* Main Content & Bubble Container */}
                              <div className={`flex flex-col min-w-0 ${isOutgoing ? 'items-end' : 'items-start'}`}>
                                
                                {/* Sender label and role (for incoming first message) */}
                                {isFirstInGroup && !isOutgoing && (
                                  <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <span className="text-[11px] font-bold text-[var(--color-text)]">{msg.author}</span>
                                    {msg.role && (
                                      <span className="text-[9px] font-semibold text-[var(--color-text-faint)]">· {msg.role}</span>
                                    )}
                                    {msg.priority && msg.priority !== "normal" && escalationUI && (
                                      <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded border ${escalationUI.color}`}>
                                        {escalationUI.label}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Outgoing Header flag if priority escalation */}
                                {isFirstInGroup && isOutgoing && msg.priority && msg.priority !== "normal" && escalationUI && (
                                  <div className="flex items-center gap-1 mb-1 px-1">
                                    <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded border ${escalationUI.color}`}>
                                      {escalationUI.label}
                                    </span>
                                  </div>
                                )}

                                {/* Action Toolbar on Hover/Focus/Touch */}
                                <div className="relative group/bubble">
                                  
                                  {/* Action Bar */}
                                  <div
                                    className={`absolute top-0 -translate-y-full mb-1 ${isOutgoing ? 'right-0' : 'left-0'} 
                                    opacity-0 group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100 
                                    ${activeTouchActionsMsgId === msg.id ? 'opacity-100' : ''} 
                                    flex items-center gap-0.5 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl p-1 shadow-lg z-20 transition-opacity`}
                                  >
                                    {/* Reply */}
                                    <button
                                      onClick={() => setActiveThreadParentMsg(msg)}
                                      aria-label="Reply to message"
                                      className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                                      title="Reply in thread"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Bookmark */}
                                    <button
                                      onClick={(e) => handleToggleSaveMessage(msg, e)}
                                      aria-label={isSaved ? "Remove Bookmark" : "Save Message"}
                                      className={`p-1 rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-amber-400 ${isSaved ? 'text-amber-400' : 'text-[var(--color-text-muted)] hover:text-amber-400'}`}
                                      title={isSaved ? "Remove Bookmark" : "Save Message"}
                                    >
                                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400' : ''}`} />
                                    </button>

                                    {/* Pin */}
                                    <button
                                      onClick={() => handleTogglePinMessage(msg.id)}
                                      aria-label={msg.pinned ? "Unpin Message" : "Pin Message"}
                                      className={`p-1 rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${msg.pinned ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'}`}
                                      title={msg.pinned ? "Unpin Message" : "Pin Message"}
                                    >
                                      <Pin className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Edit */}
                                    {canEditMessage(msg, currentUser) && !isSoftDeleted && (
                                      <button
                                        onClick={(e) => handleStartEditing(msg, e)}
                                        aria-label="Edit message"
                                        className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                        title="Edit Message"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Delete */}
                                    {canDeleteMessage(msg, currentUser) && !isSoftDeleted && (
                                      <button
                                        onClick={() => setConfirmDeleteMsgId(msg.id)}
                                        aria-label="Delete message"
                                        className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-rose-400 text-rose-400 hover:text-rose-300"
                                        title="Delete Message"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Convert to Task */}
                                    <button
                                      onClick={() => handleOpenTaskWizard(msg)}
                                      aria-label="Convert message to operational task"
                                      className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-amber-400 text-amber-400"
                                      title="Convert to Operational Task"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* BUBBLE STYLING */}
                                  {isSoftDeleted ? (
                                    <div className="px-3.5 py-2 rounded-2xl bg-[var(--color-surface-2)]/40 border border-dashed border-[var(--color-border)] text-[var(--color-text-faint)] italic text-xs flex items-center gap-2">
                                      <Trash2 className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                      <span>[This message was deleted]</span>
                                    </div>
                                  ) : editingMsgId === msg.id ? (
                                    <div className="p-2.5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-accent)] w-full min-w-[240px]">
                                      <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl p-2 text-xs text-[var(--color-text)] focus:outline-none"
                                        rows={2}
                                      />
                                      <div className="flex items-center justify-end gap-2 mt-2">
                                        <button
                                          onClick={() => setEditingMsgId(null)}
                                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={handleSaveEdit}
                                          disabled={isSavingEdit || !editContent.trim()}
                                          className="px-3 py-1 rounded-lg bg-[var(--color-accent)] text-black text-xs font-black shadow-md hover:opacity-90"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => setActiveTouchActionsMsgId(prev => prev === msg.id ? null : msg.id)}
                                      className={`px-3.5 py-2.5 shadow-sm text-xs w-fit ${
                                        isOutgoing
                                          ? "bg-blue-600 dark:bg-blue-600 text-white rounded-2xl rounded-br-xs border border-blue-500/30"
                                          : "bg-[var(--color-surface-2)] text-[var(--color-text)] rounded-2xl rounded-bl-xs border border-[var(--color-border)]"
                                      }`}
                                    >
                                      {/* Text Content */}
                                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere] break-words leading-relaxed font-normal">
                                        {renderHighlightedText(msg.text || msg.content || "", searchQuery)}
                                        {isEdited && (
                                          <span className={`text-[9px] italic ml-1.5 ${isOutgoing ? 'text-blue-100/70' : 'text-[var(--color-text-faint)]'}`}>
                                            (edited)
                                          </span>
                                        )}
                                      </p>

                                      {/* Client Link Tag */}
                                      {msg.clientTag && (
                                        <div className="mt-1.5 flex items-center gap-1">
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (msg.clientId) onOpenClient(msg.clientId);
                                            }}
                                            className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer hover:underline flex items-center gap-1 ${
                                              isOutgoing
                                                ? "bg-white/15 text-white border border-white/20"
                                                : "text-[var(--color-accent)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20"
                                            }`}
                                          >
                                            <Tag className="w-3 h-3" />
                                            {msg.clientTag}
                                          </span>
                                        </div>
                                      )}

                                      {/* Attachments */}
                                      {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {msg.attachments.map((att: any, idx: number) => (
                                            <div
                                              key={idx}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadAttachment(att, msg);
                                              }}
                                              className={`rounded-xl p-2 flex items-center gap-2 cursor-pointer transition-all text-xs border ${
                                                isOutgoing
                                                  ? "bg-blue-700/60 border-blue-400/40 text-white hover:bg-blue-700"
                                                  : "bg-[var(--color-panel)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]/50"
                                              }`}
                                            >
                                              <Paperclip className={`w-3.5 h-3.5 ${isOutgoing ? 'text-blue-100' : 'text-[var(--color-accent)]'}`} />
                                              <div className="min-w-0">
                                                <div className="font-bold truncate max-w-[130px]">{att.name}</div>
                                                <div className={`text-[8.5px] ${isOutgoing ? 'text-blue-200/80' : 'text-[var(--color-text-faint)]'}`}>{att.size}</div>
                                              </div>
                                              <Download className="w-3 h-3 ml-1 opacity-80" />
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Thread Reply Badge */}
                                      {replyCount > 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveThreadParentMsg(msg);
                                          }}
                                          className={`mt-2 flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-xl transition-all border ${
                                            isOutgoing
                                              ? "bg-white/15 text-white border-white/20 hover:bg-white/25"
                                              : "text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20"
                                          }`}
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                                          <ChevronRight className="w-3 h-3" />
                                        </button>
                                      )}

                                    </div>
                                  )}

                                </div>

                                {/* Timestamp & Status below bubble */}
                                <div className={`flex items-center gap-1.5 text-[9.5px] mt-1 px-1 ${
                                  isOutgoing ? 'text-[var(--color-text-faint)] justify-end' : 'text-[var(--color-text-faint)] justify-start'
                                }`}>
                                  <span>{msg.time}</span>
                                  {isOutgoing && msg.status === 'sending' && (
                                    <span className="text-amber-400 flex items-center gap-1 font-bold">
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sending...
                                    </span>
                                  )}
                                  {isOutgoing && msg.status === 'failed' && (
                                    <button
                                      onClick={() => handleRetryMessage(msg)}
                                      className="text-rose-400 font-extrabold underline flex items-center gap-1"
                                    >
                                      <AlertCircle className="w-2.5 h-2.5" /> Failed (Retry)
                                    </button>
                                  )}
                                  {msg.pinned && (
                                    <span className="text-[var(--color-accent)] flex items-center gap-0.5 font-bold">
                                      <Pin className="w-2.5 h-2.5" /> Pinned
                                    </span>
                                  )}
                                </div>

                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--color-text-faint)]">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-xs font-bold">No messages matching criteria.</p>
                </div>
              )}

            </div>

            {/* Delete Confirmation Modal */}
            {confirmDeleteMsgId && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-left space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Message?</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">This will soft-delete the message while preserving thread context for teammates.</p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setConfirmDeleteMsgId(null)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmSoftDelete(confirmDeleteMsgId)}
                      disabled={isDeletingMsg}
                      className="px-4 py-1.5 rounded-xl bg-rose-500 text-white font-black text-xs shadow-md hover:bg-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* IMPROVED MESSAGE COMPOSER */}
            {/* ============================================================== */}
            <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/60 flex flex-col gap-2 shrink-0">
              
              {/* Typing Indicator above composer inputs */}
              <TypingIndicator typingUsers={activeTypingUsers} currentUserId={currentUserId} />

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1 border-b border-[var(--color-border)]/40">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-[11px] flex items-center gap-2">
                      <Paperclip className="w-3 h-3 text-[var(--color-accent)]" />
                      <span className="font-bold text-[var(--color-text)] truncate max-w-[120px]">{file.name}</span>
                      <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-[var(--color-text-muted)] hover:text-rose-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Main Textarea Form */}
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder={`Message ${currentChannelDetails.name}... (Enter sends, Shift+Enter new line)`}
                    value={msgInputText}
                    onChange={handleComposerInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-2xl p-3 pr-20 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]/50 transition-all resize-none"
                  />

                  {/* Character Counter & Action Buttons inside composer */}
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <span className={`text-[9.5px] font-mono font-bold ${msgInputText.length > 1800 ? 'text-amber-400' : 'text-[var(--color-text-faint)]'}`}>
                      {msgInputText.length}/2000
                    </span>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
                      title="Attach documents"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <button
                      type="submit"
                      disabled={!msgInputText.trim() && attachedFiles.length === 0}
                      className="p-2 rounded-xl bg-[var(--color-accent)] text-black font-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>

            </div>

          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* BAR 3: EXPANDABLE THREAD PANEL / SIDEBAR (Req 3) */}
      {/* ============================================================== */}
      {activeThreadParentMsg && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)]/80 flex flex-col h-full animate-slide-left z-20">
          
          {/* Thread Header */}
          <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-panel)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-xs text-[var(--color-text)]">
              <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Thread Replies</span>
            </div>
            <button
              onClick={() => setActiveThreadParentMsg(null)}
              className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Parent Message Card */}
          <div className="p-3 border-b border-[var(--color-border)]/60 bg-[var(--color-panel)]/30 text-xs text-left">
            <div className="flex items-center gap-2 mb-1">
              <Avatar src={activeThreadParentMsg.authorAvatar} name={activeThreadParentMsg.author} size="sm" />
              <div>
                <div className="font-bold text-[var(--color-text)]">{activeThreadParentMsg.author}</div>
                <div className="text-[9px] text-[var(--color-text-faint)]">{activeThreadParentMsg.time}</div>
              </div>
            </div>
            <p className="text-[var(--color-text)]/90 mt-1 whitespace-pre-wrap">{activeThreadParentMsg.text}</p>
          </div>

          {/* Thread Replies List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-left">
            {(activeThreadParentMsg.replies && activeThreadParentMsg.replies.length > 0) ? (
              activeThreadParentMsg.replies.map(rep => (
                <div key={rep.id} className="bg-[var(--color-bg)]/80 border border-[var(--color-border)]/60 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[var(--color-text)]">{rep.author}</span>
                    <span className="text-[9px] text-[var(--color-text-faint)]">{rep.time}</span>
                  </div>
                  <p className="text-[var(--color-text)]/90 whitespace-pre-wrap">{rep.text}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[var(--color-text-faint)] text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No replies yet in this thread.</p>
              </div>
            )}
          </div>

          {/* Thread Composer */}
          <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <form onSubmit={(e) => { e.preventDefault(); handleSendThreadReply(); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Reply to thread..."
                value={threadReplyInput}
                onChange={(e) => setThreadReplyInput(e.target.value)}
                className="flex-1 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!threadReplyInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-black font-black text-xs disabled:opacity-40"
              >
                Reply
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TASK CONVERSION WIZARD SIDEBAR MODAL */}
      {/* ============================================================== */}
      {isTaskWizardOpen && wizardDraftTask && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 select-text">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 max-w-md w-full shadow-2xl text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2 font-black text-sm text-[var(--color-accent)]">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Escalate Message to Task</span>
              </div>
              <button onClick={() => setIsTaskWizardOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--color-text-muted)] block mb-1">Task Title</label>
                <input
                  type="text"
                  value={wizardDraftTask.title}
                  onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, title: e.target.value })}
                  className="w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl p-2 text-xs text-[var(--color-text)] focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[var(--color-text-muted)] block mb-1">Category</label>
                  <select
                    value={wizardDraftTask.category}
                    onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, category: e.target.value })}
                    className="w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl p-2 text-xs text-[var(--color-text)] focus:outline-none"
                  >
                    <option value="Client Follow-up">Client Follow-up</option>
                    <option value="Underwriting Review">Underwriting Review</option>
                    <option value="Lender Follow-up">Lender Follow-up</option>
                    <option value="Document Collection">Document Collection</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[var(--color-text-muted)] block mb-1">Assignee</label>
                  <select
                    value={wizardDraftTask.assignedTo}
                    onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, assignedTo: e.target.value })}
                    className="w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl p-2 text-xs text-[var(--color-text)] focus:outline-none"
                  >
                    {chatRoster.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--color-text-muted)] block mb-1">Task Notes</label>
                <textarea
                  rows={3}
                  value={wizardDraftTask.notes}
                  onChange={(e) => setWizardDraftTask({ ...wizardDraftTask, notes: e.target.value })}
                  className="w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl p-2 text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <button
                onClick={() => setIsTaskWizardOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitWizardTask}
                className="px-4 py-1.5 rounded-xl bg-[var(--color-accent)] text-black font-black text-xs shadow-md hover:opacity-90"
              >
                Generate Operational Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Status Selector Modal */}
      <UserStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentUserId={currentUserId}
        onStatusUpdated={() => refreshTeamRoster()}
      />

    </div>
  );
};
