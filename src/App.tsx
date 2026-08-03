import React, { useState, useEffect, useRef } from "react";
import { 
  Users, Layers, Calendar, CheckSquare, MessageSquare, 
  BrainCircuit, Calculator, ShieldAlert, Mail, BarChart3, Heart, 
  ShieldCheck, FileText, Key, LogOut, Lock, Search, ChevronDown, Settings as SettingsIcon, 
  Trash2, Copy, Send, Plus, CheckCircle2, AlertTriangle, 
  Clock, Award, Globe, FileSpreadsheet, Share2, Sparkles, Filter, 
  MailOpen, RefreshCw, Phone, MessageCircle, HardDrive, Sun, Moon
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { encryptValue, decryptValue } from "./lib/cryptoUtils";
import { hashPin } from "./hooks/useAuth";
import { 
  DEFAULT_CLIENTS, DEFAULT_LENDERS, DEFAULT_USERS, DEFAULT_MESSAGES, 
  DEFAULT_EMAILS, DEFAULT_TEMPLATES, DEFAULT_PARTNERS 
} from "./data";
import { Client, Lender, User, Task, Event, Email, EmailTemplate, Partner, Post } from "./types";
import { safeJsonParse } from "./lib/json";
import { Sidebar } from "./components/Sidebar";
import { Avatar } from "./components/Avatar";
import { Dashboard } from "./components/Dashboard";
import { ClientsList } from "./components/ClientsList";
import { Calculators } from "./components/Calculators";
import { AIAssistantCenter } from "./components/AIAssistantCenter";
import { ApplicationIntake } from "./components/ApplicationIntake";
import { Messages } from "./components/Messages";
import { EmailView } from "./components/EmailView";
import { LenderSheets } from "./components/LenderSheets";
import { CalendarView } from "./components/CalendarView";
import { TasksView } from "./components/TasksView";
import { Partners } from "./components/Partners";
import { Reports } from "./components/Reports";
import { Retention } from "./components/Retention";
import { Compliance } from "./components/Compliance";
import { AdminPanel } from "./components/AdminPanel";
import { FileReadiness } from "./components/FileReadiness";
import { Settings } from "./components/Settings";
import { ZDrivePanel } from "./components/ZDrivePanel";
import { logActivityEvent } from "./lib/activityEngine";
import { useClients } from "./hooks/useClients";
import { useTasks } from "./hooks/useTasks";
import { useCalendar } from "./hooks/useCalendar";
import { useAI } from "./hooks/useAI";
import { useAuth } from "./hooks/useAuth";
import { useCalculators } from "./hooks/useCalculators";
import { fd, pn, cPmt, pToAmt } from "./lib/formatters";
import { ClientDetailPanel } from "./components/ClientDetailPanel";
import { checkBridgeHealth, getBridgeVersion } from "./lib/bridgeService";

export default function App() {
  const shouldReduceMotion = useReducedMotion();
  const TAB_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    clients: "Clients",
    pipeline: "Pipeline",
    calculators: "Calculators",
    ai: "AI Assistant Center",
    messages: "Messages",
    emails: "Email",
    lenders: "Lender Sheets",
    calendar: "Calendar",
    tasks: "Tasks",
    partners: "Partners",
    reports: "Reports",
    retention: "Client Retention",
    compliance: "Compliance",
    file_readiness: "File Readiness",
    admin: "Admin Panel",
    settings: "Settings"
  };

  const TAB_TITLE_GRADIENTS: Record<string, string> = {
    dashboard:      "linear-gradient(90deg, #00C6FF, #0072FF)",   // Ocean Breeze
    clients:        "linear-gradient(90deg, #FF416C, #FFB347)",   // Sunset Vibes
    pipeline:       "linear-gradient(90deg, #FF416C, #FFB347)",   // Sunset Vibes
    calculators:    "linear-gradient(90deg, #FF8800, #FCEE21)",   // Citrus Burst
    ai:             "linear-gradient(90deg, #6A11CB, #FF758C)",   // Royal Purple
    messages:       "linear-gradient(90deg, #00FFFF, #0077FF)",   // Arctic Glacier
    emails:         "linear-gradient(90deg, #00C6FF, #0072FF)",   // Ocean Breeze
    lenders:        "linear-gradient(90deg, #56AB2F, #A8E063)",   // Nature Fresh
    calendar:       "linear-gradient(90deg, #8360C3, #FF8FBF)",   // Lavender Sky
    tasks:          "linear-gradient(90deg, #FF7E5F, #FEB47B)",   // Warm Horizon
    partners:       "linear-gradient(90deg, #56AB2F, #A8E063)",   // Nature Fresh
    reports:        "linear-gradient(90deg, #FF8800, #FCEE21)",   // Citrus Burst
    retention:      "linear-gradient(90deg, #FF00CC, #3333FF)",   // Neon Dream
    compliance:     "linear-gradient(90deg, #6A11CB, #FF758C)",   // Royal Purple
    file_readiness: "linear-gradient(90deg, #FF7E5F, #FEB47B)",   // Warm Horizon
    admin:          "linear-gradient(90deg, #FF416C, #FFB347)",   // Sunset Vibes
    settings:       "linear-gradient(90deg, #8360C3, #FF8FBF)",   // Lavender Sky
  };

  // ─── REMAINING SHARED STATE ───
  const [lenders, setLenders] = useState<Lender[]>(() => {
    const saved = localStorage.getItem("gbk_lenders");
    return safeJsonParse(saved, DEFAULT_LENDERS);
  });
  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem("gbk_partners");
    return safeJsonParse(saved, DEFAULT_PARTNERS);
  });
  const [messages, setMessages] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem("gbk_messages");
    return safeJsonParse(saved, DEFAULT_MESSAGES);
  });
  const [emailsState, setEmailsState] = useState<{ inbox: Email[]; sent: Email[]; scheduled: Email[]; queued: Email[] }>(() => {
    const saved = localStorage.getItem("gbk_emails");
    if (saved) {
      try {
        const parsed = safeJsonParse(saved, null as any);
        if (parsed) {
          const filterMock = (arr: Email[]) => (arr || []).filter(e => e && e.id && !e.id.startsWith("ie") && !e.id.startsWith("dr-"));
          return {
            inbox: filterMock(parsed.inbox),
            sent: filterMock(parsed.sent),
            scheduled: filterMock(parsed.scheduled),
            queued: filterMock(parsed.queued)
          };
        }
      } catch (e) {
        return DEFAULT_EMAILS;
      }
    }
    return DEFAULT_EMAILS;
  });
  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem("gbk_posts");
    return safeJsonParse(saved, []);
  });

  const [activeTab, setActiveTab ] = useState<string>("dashboard");
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [detailTab, setDetailTab] = useState<string>("overview");

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("gbk_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gbk_theme", theme);
  }, [theme]);

  // Z Drive Bridge online state
  const [bridgeOnline, setBridgeOnline] = useState<boolean>(false);
  const [bridgeVersion, setBridgeVersion] = useState<string | null>(null);
  const [versionMismatch, setVersionMismatch] = useState<boolean>(false);

  // Monitor bridge server connectivity
  useEffect(() => {
    async function checkHealth() {
      const isOnline = await checkBridgeHealth();
      setBridgeOnline(isOnline);
      if (isOnline) {
        const verInfo = await getBridgeVersion();
        if (verInfo) {
          setBridgeVersion(verInfo.version);
          const appVer = (import.meta as any).env?.VITE_APP_VERSION || "1.0.0";
          setVersionMismatch(verInfo.version !== appVer);
        }
      } else {
        setBridgeVersion(null);
        setVersionMismatch(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Notifications / Toast
  const [toastMessage, setToastMessage] = useState<{ msg: string; icon?: string; type: "success" | "error" } | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem("gbk_audit_logs");
    return safeJsonParse(saved, [
      { user: "David Acosta", action: "Logged in", target: "CRM Packager Portal", time: new Date(Date.now() - 400000).toISOString() },
      { user: "David Acosta", action: "Viewed file", target: "David Martinez", time: new Date(Date.now() - 300000).toISOString() }
    ]);
  });

  // Security toggles
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    return Number(localStorage.getItem("gbk_sec_idle_min") || "10");
  });
  const [sessionAutoLock, setAutoLockEnabled] = useState<boolean>(() => {
    return localStorage.getItem("gbk_sec_autolock") !== "false";
  });
  const [auditLoggingEnabled, setAuditLogEnabled] = useState<boolean>(() => {
    return localStorage.getItem("gbk_sec_audit") !== "false";
  });
  // Broadcast Notification Banners
  const [broadcastBanners, setBroadcastBanners] = useState<any[]>(() => {
    const saved = localStorage.getItem("gbk_admin_broadcasts");
    return safeJsonParse(saved, []);
  });

  useEffect(() => {
    const saved = localStorage.getItem("gbk_admin_broadcasts");
    if (saved) {
      setBroadcastBanners(safeJsonParse(saved, []));
    }
  }, []);

  // Email Compose state
  const [emailComposeOpen, setEmailComposeOpen] = useState<boolean>(false);
  const [compTo, setCompTo] = useState<string>("");
  const [compSubject, setCompSubject] = useState<string>("");
  const [compBody, setCompBody] = useState<string>("");

  // Active channel in Direct/Announcements chat
  const [activeChannel, setActiveChannel] = useState<string>("dm_wayne");
  const [linkedChatClientId, setLinkedChatClientId] = useState<string | null>(null);

  // Document Vault State Storage
  const [docVault, setDocVault] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem("gbk_doc_vault");
    return safeJsonParse(saved, {});
  });

  // Modals Inputs
  const [newClientOpen, setNewClientOpen] = useState<boolean>(false);
  const [zDriveOpen, setZDriveOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState<boolean>(false);

  const [calendarLaunchIntent, setCalendarLaunchIntent] = useState<{
    clientId?: string;
    dateStr?: string;
    timeStr?: string;
    openModal?: boolean;
  } | null>(null);

  const [settings, setSettings] = useState({ 
    apiKey: localStorage.getItem("gbk_apiKey") || "" 
  });

  useEffect(() => { 
    localStorage.setItem("gbk_apiKey", settings.apiKey); 
  }, [settings.apiKey]);

  // ─── UTILITIES & HELPER FUNCTIONS ───

  function showToast(msg: string, type: "success" | "error" = "success", icon?: string) {
    setToastMessage({ msg, type, icon });
    setTimeout(() => setToastMessage(null), 3500);
  }

  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current) {
    sessionIdRef.current = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  }

  function logActivity(action: string, target?: string) {
    if (!auditLoggingEnabled) return;
    const logItem = {
      user: currentUser.first + " " + currentUser.last,
      action,
      target: target || "",
      time: new Date().toISOString(),
      ipAddress: "localhost",
      sessionId: sessionIdRef.current,
      tabContext: activeTab
    };
    setAuditLogs(prev => [logItem, ...prev.slice(0, 199)]);
  }

  // ─── HOOK CALLS ───
  const {
    currentUser,
    setCurrentUser,
    appLocked,
    setAppLocked,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    userRoster,
    setUserRoster,
    lockoutTries,
    setLockoutTries,
    lockoutActive,
    setLockoutActive,
    profileModalOpen,
    setProfileModalOpen,
    profileTab,
    setProfileTab,
    activeHost,
    setActiveHost,
    activePort,
    setActivePort,
    activeUsername,
    setActiveUsername,
    activePassword,
    setActivePassword,
    suFirst,
    setSuFirst,
    suLast,
    setSuLast,
    suEmail,
    setSuEmail,
    suRole,
    setSuRole,
    suPhone,
    setSuPhone,
    suPin,
    setSuPin,
    suFsra,
    setSuFsra,
    suHost,
    setSuHost,
    suPort,
    setSuPort,
    suPass,
    setSuPass,
    swTargetId,
    setSwTargetId,
    swPin,
    setSwPin,
    swError,
    setSwError,
    handleUnlock,
    isOwner,
    getAgentNames
  } = useAuth({ showToast, logActivity });

  // --- USER SELF SERVICE STATE ---
  const [profFirst, setProfFirst] = useState("");
  const [profLast, setProfLast] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profFsra, setProfFsra] = useState("");
  const [profPhoto, setProfPhoto] = useState("");
  const [profPin, setProfPin] = useState("");

  useEffect(() => {
    if (profileModalOpen && currentUser) {
      setProfFirst(currentUser.first || "");
      setProfLast(currentUser.last || "");
      setProfPhone(currentUser.phone || "");
      setProfFsra(currentUser.fsraNum || "");
      setProfPhoto(currentUser.photo || "");
      setProfPin(currentUser.pin || "");
    }
  }, [profileModalOpen, currentUser]);

  const {
    clients,
    setClients,
    currentClient,
    setCurrentClient,
    clientViewMode,
    setClientViewMode,
    openClient,
    closeDetail,
    handleUpdateClient,
    handleUpdateClientStatus,
    handleCreateClient,
    handleDeleteClient
  } = useClients({
    currentUser,
    logActivity,
    showToast,
    setDetailTab,
    logActivityEvent
  });

  const {
    tasks,
    setTasks,
    taskFilter,
    setTaskFilter,
    taskModalOpen,
    setTaskModalOpen,
    editingTaskId,
    setEditingTaskId
  } = useTasks({
    currentUser,
    showToast
  });

  const {
    events,
    setEvents,
    calDate,
    setCalDate,
    calSelectedDate,
    setCalSelectedDate,
    calEventModalOpen,
    setCalEventModalOpen
  } = useCalendar();

  const {
    aiClientId,
    setAiClientId,
    aiSelectedClient,
    setAiSelectedClient,
    aiHistory,
    setAiHistory,
    aiInputText,
    setAiInputText,
    aiLoading,
    setAiLoading,
    aiIntakeOpen,
    setAiIntakeOpen,
    applicationIntakeOpen,
    setApplicationIntakeOpen,
    aiIntakeEditingId,
    setAiIntakeOpenEditId,
    aiIntakeText,
    setAiIntakeText,
    aiIntakeLoading,
    setAiIntakeLoading,
    aiIntakeFields,
    setAiIntakeFields,
    highlightedAiFields,
    setHighlightedAiFields,
    intakePreloadedText,
    setIntakePreloadedText,
    intakePreloadedFileName,
    setIntakePreloadedFileName,
    runGeneralAIChat,
    triggerUnderwritingAnalysis,
    underwritingLoading,
    underwritingError,
    triggerAIIntakeExtract,
    handleSaveAIIntake,
    openApplicationIntake,
    openManualIntake
  } = useAI({
    clients,
    setClients,
    currentUser,
    showToast,
    logActivity,
    setCurrentClient,
    setNewClientOpen,
    currentClient
  });

  const {
    calcClientId,
    setCalcClientId,
    stIncome,
    setStIncome,
    stCoIncome,
    setStCoIncome,
    stDebts,
    setStDebts,
    stCondo,
    setStCondo,
    stTax,
    setStTax,
    stHeat,
    setStHeat,
    stRate,
    setStRate,
    stAmortization,
    setStAmortization,
    pcAmount,
    setPcAmount,
    pcRate,
    setPcRate,
    pcAm,
    setPcAm,
    pcFreq,
    setPcFreq,
    gcIncome,
    setGcIncome,
    gcPmt,
    setGcPmt,
    gcTax,
    setGcTax,
    gcHeat,
    setGcHeat,
    gcCondo,
    setGcCondo,
    gcDebts,
    setGcDebts,
    hrRate,
    setHrRate,
    hrHrs,
    setHrHrs,
    seY1,
    setSeY1,
    seY2,
    setSeY2,
    handleLoadClientToCalc,
    handleClearCalcClient,
    handleSaveCalcToClient
  } = useCalculators({ clients, onUpdateClient: handleUpdateClient, showToast });

  const calcSelectedClient = clients.find(c => c.id === calcClientId) ?? null;

  // Local storage writing side-effects
  useEffect(() => { localStorage.setItem("gbk_lenders", JSON.stringify(lenders)); }, [lenders]);
  useEffect(() => { localStorage.setItem("gbk_partners", JSON.stringify(partners)); }, [partners]);
  useEffect(() => { localStorage.setItem("gbk_messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("gbk_emails", JSON.stringify(emailsState)); }, [emailsState]);
  useEffect(() => { localStorage.setItem("gbk_posts", JSON.stringify(posts)); }, [posts]);
  useEffect(() => { localStorage.setItem("gbk_audit_logs", JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem("gbk_doc_vault", JSON.stringify(docVault)); }, [docVault]);

  // Idle Timer auto-locking mechanism
  const idleTimeoutRef = useRef<any>(null);
  const resetIdleTimer = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (!sessionAutoLock) return;
    idleTimeoutRef.current = setTimeout(() => {
      if (currentUser.pin && currentUser.pin.length === 4) {
        setAppLocked(true);
      }
    }, autoLockMinutes * 60 * 1000);
  };

  const handleTabChange = (tab: string) => {
    resetIdleTimer();
    setApplicationIntakeOpen(false);
    setNewClientOpen(false);
    setActiveTab(tab);
  };

  useEffect(() => {
    if (activeTab === "calculators") {
      setApplicationIntakeOpen(false);
      setNewClientOpen(false);
      setIntakePreloadedText("");
      setIntakePreloadedFileName("");
      closeDetail();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleActivity = () => resetIdleTimer();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);
    resetIdleTimer();
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [sessionAutoLock, autoLockMinutes, currentUser]);

  // Global listener for the Backup Restore event to synchronize all states in memory
  useEffect(() => {
    const handleRestoreEvent = (e: any) => {
      const savedClients = localStorage.getItem("gbk_clients");
      if (savedClients) setClients(safeJsonParse(savedClients, []));
      
      const savedLenders = localStorage.getItem("gbk_lenders");
      if (savedLenders) setLenders(safeJsonParse(savedLenders, []));
      
      const savedPartners = localStorage.getItem("gbk_partners");
      if (savedPartners) setPartners(safeJsonParse(savedPartners, []));
      
      const savedTasks = localStorage.getItem("gbk_tasks");
      if (savedTasks) setTasks(safeJsonParse(savedTasks, []));
      
      const savedEvents = localStorage.getItem("gbk_events");
      if (savedEvents) setEvents(safeJsonParse(savedEvents, []));
      
      const savedMessages = localStorage.getItem("gbk_messages");
      if (savedMessages) setMessages(safeJsonParse(savedMessages, {}));
      
      const savedEmails = localStorage.getItem("gbk_emails");
      if (savedEmails) setEmailsState(safeJsonParse(savedEmails, DEFAULT_EMAILS));
      
      const savedPosts = localStorage.getItem("gbk_posts");
      if (savedPosts) setPosts(safeJsonParse(savedPosts, []));
      
      const savedRoster = localStorage.getItem("gbk_roster");
      if (savedRoster) setUserRoster(safeJsonParse(savedRoster, []));
      
      const savedAudit = localStorage.getItem("gbk_audit_logs");
      if (savedAudit) setAuditLogs(safeJsonParse(savedAudit, []));
      
      // Update our current user state if they still exist or have updated parameters
      if (savedRoster) {
        const currentRoster = safeJsonParse(savedRoster, []);
        const updatedSelf = currentRoster.find((u: any) => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
        }
      }
    };

    window.addEventListener("gbk-crm-restored", handleRestoreEvent);
    return () => {
      window.removeEventListener("gbk-crm-restored", handleRestoreEvent);
    };
  }, [currentUser]);



  function handleCreateClientFromIntake(
    finalClient: Client, 
    fileMeta: { name: string; size: string; content?: string } | null,
    alertAction: 'create' | 'merge',
    suggestedDocs?: Array<{ id: string; name: string; desc: string; category: string }>,
    starterTasks?: Array<{ title: string; priority: 'high' | 'medium' | 'low'; notes: string }>
  ) {
    if (alertAction === 'merge') {
      handleUpdateClient({ ...finalClient, id: finalClient.id });
      logActivity("Merged Intake application fields into existing client", finalClient.first + " " + finalClient.last);
      showToast("Data successfully merged into existing client record!", "success");
    } else {
      handleCreateClient(finalClient);
      logActivity("Created new file via Application Intake PDF", finalClient.first + " " + finalClient.last);
      showToast("Active mortgage file created successfully!", "success");
    }

    // Initialize/update docVault for original PDF AND suggested documents
    setDocVault(prev => {
      const clientDocs = prev[finalClient.id] || {};
      const updated = { ...clientDocs };

      if (fileMeta) {
        updated.original_application_pdf = {
          id: "original_application_pdf",
          clientId: finalClient.id,
          status: "approved" as const,
          notes: "Uploaded source application PDF",
          files: [
            {
              id: "v_1",
              fileName: fileMeta.name,
              fileSize: fileMeta.size,
              uploadedAt: new Date().toISOString(),
              uploadedBy: currentUser.first + " " + currentUser.last,
              path: "/uploads/" + fileMeta.name
            }
          ],
          label: "Source Mortgage Application Form (Uploaded PDF)",
          category: "Other",
          description: "Original signed/uploaded web or portal mortgage application.",
          isCustom: true
        };
      }

      // Populate required document slots to setup downstream Document Manager
      if (suggestedDocs && suggestedDocs.length > 0) {
        suggestedDocs.forEach(doc => {
          if (!updated[doc.id]) {
            updated[doc.id] = {
              id: doc.id,
              clientId: finalClient.id,
              status: "required",
              files: [],
              label: doc.name,
              category: doc.category,
              description: doc.desc,
              isCustom: false
            };
          }
        });
      }

      const newVault = {
        ...prev,
        [finalClient.id]: updated
      };
      
      // Persist in localStorage to match the core state strategy
      localStorage.setItem("gbk_doc_vault", JSON.stringify(newVault));
      return newVault;
    });

    if (fileMeta) {
      const savedActivities = localStorage.getItem("gbk_doc_activities");
      const currentActivities = safeJsonParse(savedActivities, []);
      const newActivity = {
        id: "act_" + Date.now(),
        clientId: finalClient.id,
        clientName: finalClient.first + " " + finalClient.last,
        docId: "original_application_pdf",
        docName: "Source Mortgage Application Form (Uploaded PDF)",
        action: "uploaded",
        user: currentUser.first + " " + currentUser.last,
        timestamp: new Date().toISOString(),
        details: `Uploaded source application PDF ${fileMeta.name} (${fileMeta.size}) via Intake panel.`
      };
      localStorage.setItem("gbk_doc_activities", JSON.stringify([newActivity, ...currentActivities]));
    }

    // Populate checklist starter logic tasks to setup downstream Task Manager
    if (starterTasks && starterTasks.length > 0) {
      const newTasks: Task[] = starterTasks.map((t, index) => ({
        id: "task_" + (Date.now() + index),
        title: t.title,
        status: "open",
        priority: t.priority,
        clientId: finalClient.id,
        clientName: finalClient.first + " " + finalClient.last,
        assignedTo: finalClient.agent || (currentUser.first + " " + currentUser.last),
        notes: t.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser.first + " " + currentUser.last
      }));
      setTasks(prev => {
        const updated = [...newTasks, ...prev];
        localStorage.setItem("gbk_tasks", JSON.stringify(updated));
        return updated;
      });
    }

    setApplicationIntakeOpen(false);
  }



  function handleOpenComposeWithDetails(to: string, subject: string, body: string) {
    setCompTo(to);
    setCompSubject(subject);
    setCompBody(body);
    setEmailComposeOpen(true);
    setActiveTab("emails");
  }

  return (
    <div className="flex h-screen bg-[var(--color-bg)] font-sans text-[var(--color-text)] overflow-hidden">
      
      {/* ── Security Lock Screen Overlay ── */}
      <AnimatePresence>
        {appLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center flex-col gap-6"
            style={{
              background: "linear-gradient(135deg, #060d1a 0%, #0a0f23 40%, #06050f 100%)"
            }}
          >
            <div 
              className="absolute inset-0 animate-pulse pointer-events-none"
              style={{ background: "radial-gradient(circle at center, rgba(0,198,255,0.10) 0%, rgba(106,17,203,0.07) 40%, transparent 70%)" }}
            />
            <motion.div 
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="lock-panel-ring p-8 w-80 text-center shadow-2xl relative"
              style={{
                background: "var(--grad-lock-panel)",
                borderRadius: "20px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 198, 255, 0.08)"
              }}
            >
              {/* Orb glow halo layer — must be first child */}
              <div className="lock-orb-halo" aria-hidden="true" />
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--grad-lock-icon)", boxShadow: "0 4px 18px rgba(0, 198, 255, 0.35)" }}>
                <Lock className="w-6 h-6 text-[var(--color-text-inverse)]" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-text)] mb-1">Workstation Locked</h3>
              <p className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider mb-6">Enter 4-digit security PIN to resume</p>
              
              <input 
                type="password" 
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                disabled={lockoutActive}
                className="w-full tracking-widest text-center text-3xl font-mono py-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-[var(--color-accent)] mb-4 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed font-black"
                onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
              />

              <button 
                onClick={handleUnlock}
                disabled={lockoutActive}
                className="w-full text-[var(--color-text-inverse)] font-black uppercase tracking-wider text-[11px] py-3.5 rounded-xl hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-[0_0_28px_rgba(0,198,255,0.45)]"
                style={{ background: "var(--grad-lock-button)", boxShadow: "0 4px 20px rgba(0, 198, 255, 0.25)" }}
              >
                Unlock Workstation
              </button>

              {pinError && (
                <div className="text-xs text-[var(--color-error)] mt-4 font-bold uppercase tracking-wide">{pinError}</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Global Live Toast Alert ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border max-w-sm shadow-xl"
            style={{
              background: "var(--glass-bg)",
              borderColor: toastMessage.type === "error" ? "rgba(224,92,110,0.3)" : "rgba(200, 146, 42, 0.3)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              boxShadow: toastMessage.type === "error" ? "0 4px 20px rgba(224,92,110,0.15)" : "0 4px 20px rgba(200, 146, 42, 0.15)"
            }}
          >
            <div className="text-base select-none shrink-0">{toastMessage.icon || "✓"}</div>
            <span className="text-[11px] font-bold text-[var(--color-text)] leading-tight">{toastMessage.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Sidebar Navigation Panel ─── */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        clients={clients}
        tasks={tasks}
        events={events}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onLockApp={() => setAppLocked(true)}
        isOwner={isOwner()}
        onOpenProfileManager={() => setProfileModalOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--color-bg)]">
        
        {/* Version Mismatch Banner */}
        {versionMismatch && (
          <div className="bg-[var(--color-warning-subtle)] border-b border-[var(--color-warning)]/20 px-6 py-2 flex items-center gap-2 text-xs text-[var(--color-warning)] font-semibold select-none shrink-0">
            <span>⚠️</span>
            <span>
              Version mismatch detected. Bridge server is running <strong>v{bridgeVersion}</strong> but the app is <strong>v{(import.meta as any).env?.VITE_APP_VERSION || "1.0.0"}</strong>. Please restart the bridge server.
            </span>
          </div>
        )}
        
        {/* Top Header */}
        <header 
          className="relative z-40 h-14 flex items-center justify-between px-6 shrink-0 select-none"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            borderBottom: "1px solid var(--color-divider)"
          }}
        >
          <div
            className="text-sm font-semibold tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: TAB_TITLE_GRADIENTS[activeTab] || "linear-gradient(90deg, var(--color-text), var(--color-text-muted))" }}
          >
            {TAB_LABELS[activeTab] || activeTab} Section
          </div>
          <div className="flex items-center gap-3">
            {/* Quick search input */}
            <div className="relative">
              <div 
                className="px-3.5 py-1.5 flex items-center gap-2 w-48 focus-within:w-64 transition-all duration-300 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 hover:border-[var(--color-accent)]/30 focus-within:border-[var(--color-accent)]/50 focus-within:shadow-[0_0_12px_var(--color-accent-subtle)]"
              >
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Quick locate client…" 
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                  }}
                  className="bg-transparent border-none text-[11px] text-[var(--color-text-muted)] focus:text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-75 focus:outline-none w-full font-medium transition-colors duration-150"
                />
              </div>

              {activeTab !== "clients" && activeTab !== "pipeline" && globalSearch.trim().length > 0 && (
                <div className="absolute top-full mt-1 right-0 w-60 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--color-text-faint)] border-b border-[var(--color-divider)]">
                    Matched Clients
                  </div>
                  {(() => {
                    const matched = clients.filter(c => {
                      const q = globalSearch.toLowerCase();
                      return (c.first + " " + c.last).toLowerCase().includes(q) ||
                             (c.email || "").toLowerCase().includes(q) ||
                             (c.cell || "").includes(q) ||
                             (c.addr || "").toLowerCase().includes(q) ||
                             (c.lender || "").toLowerCase().includes(q);
                    }).slice(0, 5);

                    if (matched.length > 0) {
                      return matched.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            openClient(c.id);
                            setGlobalSearch("");
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors flex flex-col gap-0.5 cursor-pointer"
                        >
                          <span className="font-bold">{c.first} {c.last}</span>
                          <span className="text-[10px] text-[var(--color-text-muted)] capitalize">{c.status} • {c.email || "No email"}</span>
                        </button>
                      ));
                    } else {
                      return (
                        <div className="px-2.5 py-2 text-xs text-[var(--color-text-faint)] italic">
                          No clients matched
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Z Drive Button with Online Indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => setZDriveOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(103,111,157,0.15)] hover:border-[var(--color-primary)]"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "var(--glass-blur)",
                  WebkitBackdropFilter: "var(--glass-blur)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--color-text-muted)"
                }}
                id="header-z-drive-btn"
              >
                <HardDrive className="w-3.5 h-3.5" /> Z Drive
              </button>
              {bridgeOnline && (
                <div className="flex items-center" title="Z Drive Online">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse"></span>
                  </span>
                </div>
              )}
            </div>

            {/* New Client Button */}
            <button 
              onClick={openManualIntake}
              className="flex items-center gap-1 px-4 py-1.5 text-[11px] font-extrabold text-[var(--color-text-inverse)] transition-all shrink-0 hover:shadow-[0_0_22px_rgba(0,198,255,0.45)] duration-200 active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(90deg, #00C6FF 0%, #0072FF 100%)",
                borderRadius: "9999px",
                boxShadow: "0 0 14px rgba(0, 198, 255, 0.30)"
              }}
              id="header-new-client-btn"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> New Client
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-full hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)] transition-all cursor-pointer text-[var(--color-text-muted)] shrink-0"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[var(--color-accent)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--color-primary)]" />
              )}
            </button>

            {/* Vertical Divider */}
            <div className="w-px h-5 bg-[var(--color-divider)] shrink-0 mx-0.5" />

            {/* Top Header Profile Section */}
            <div className="relative shrink-0">
              <div
                className="p-[1.5px] rounded-full shrink-0"
                style={{ background: "linear-gradient(90deg, #FF416C, #FFB347)" }}
                id="header-profile-dropdown-container"
              >
                <button
                  onClick={() => setHeaderProfileOpen(!headerProfileOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer text-left select-none"
                  style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "var(--glass-blur)",
                    WebkitBackdropFilter: "var(--glass-blur)"
                  }}
                  id="header-profile-button"
                >
                  <Avatar
                    src={currentUser.photo}
                    first={currentUser.first}
                    last={currentUser.last}
                    name={currentUser.displayName}
                    size="sm"
                  />
                  <div className="hidden md:block">
                    <div className="text-[10px] font-black text-[var(--color-text)] leading-tight">
                      {currentUser.displayName || `${currentUser.first} ${currentUser.last}`}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                </button>
              </div>

              {/* Dropdown Menu */}
              {headerProfileOpen && (
                <>
                  {/* Invisible full-screen overlay to close the dropdown */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setHeaderProfileOpen(false)} 
                  />
                  
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-100"
                    id="header-profile-dropdown-menu"
                  >
                    <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-[var(--color-divider)] mb-1.5">
                      <Avatar
                        src={currentUser.photo}
                        first={currentUser.first}
                        last={currentUser.last}
                        name={currentUser.displayName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] uppercase font-black tracking-widest text-[var(--color-text-faint)]">Broker Account</p>
                        <p className="text-xs font-black text-[var(--color-text)] truncate">{currentUser.displayName || `${currentUser.first} ${currentUser.last}`}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">{currentUser.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setHeaderProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded-lg transition-all text-left cursor-pointer"
                    >
                      <SettingsIcon className="w-4 h-4 text-[var(--color-accent)]" />
                      <span>My Profile &amp; Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileTab("profile");
                        setProfileModalOpen(true);
                        setHeaderProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded-lg transition-all text-left cursor-pointer"
                    >
                      <Key className="w-4 h-4 text-[var(--color-accent)]" />
                      <span>Sync Credentials</span>
                    </button>

                    <div className="border-t border-[var(--color-divider)] my-1.5" />

                    <button
                      onClick={() => {
                        setAppLocked(true);
                        setHeaderProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] rounded-lg transition-all text-left cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Lock Workstation</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Active System Broadcast Banners */}
        {broadcastBanners.filter(b => b.active).map((banner) => {
          const isCritical = banner.type === "critical";
          const isWarning = banner.type === "warning";
          const colorClass = isCritical 
            ? "text-[var(--color-error)]" 
            : isWarning 
              ? "text-[var(--color-warning)]" 
              : "text-[var(--color-success)]";
          const bgVal = isCritical 
            ? "var(--color-error-subtle)" 
            : isWarning 
              ? "var(--color-warning-subtle)" 
              : "var(--color-success-subtle)";
          const borderVal = "var(--color-border)";
          
          return (
            <div 
              key={banner.id} 
              className="px-6 py-2.5 text-[10px] flex items-center justify-between gap-4 border-b shrink-0 font-bold uppercase tracking-wider select-none"
              style={{
                background: bgVal,
                borderColor: borderVal,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)"
              }}
            >
              <div className={`flex items-center gap-2 truncate ${colorClass}`}>
                {isCritical ? (
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate">
                  <strong className="mr-1.5 font-black">[{banner.type} broadcast]:</strong>
                  <span className="text-[var(--color-text)] normal-case font-semibold">{banner.message}</span>
                </span>
              </div>
              <button 
                onClick={() => {
                  setBroadcastBanners(prev => prev.map(b => b.id === banner.id ? { ...b, active: false } : b));
                }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] shrink-0 font-black px-2.5 py-1 rounded-full transition-all text-[8px] tracking-widest cursor-pointer"
              >
                ✕ Dismiss
              </button>
            </div>
          );
        })}

        {/* Tab content viewer area */}
        <main className="flex-1 overflow-hidden p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="h-full w-full"
            >
              {activeTab === "dashboard" && (
            <Dashboard 
              clients={clients}
              tasks={tasks}
              events={events}
              auditLogs={auditLogs}
              currentUser={currentUser}
              docVault={docVault}
              onOpenClient={openClient}
              onAddClient={openManualIntake}
              onOpenNewClientIntake={openApplicationIntake}
              onOpenAIIntake={openApplicationIntake}
              onAddTask={() => setActiveTab("tasks")}
              onAddPartner={() => setActiveTab("partners")}
              onAddEvent={() => setCalEventModalOpen(true)}
              setActiveTab={setActiveTab}
              onCompleteTask={(taskId) => {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "done", completedAt: new Date().toISOString() } : t));
                showToast("Task completed successfully!", "success");
              }}
              onClearLogs={() => setAuditLogs([])}
            />
          )}

           {activeTab === "clients" && (
            <ClientsList 
              clients={clients}
              lenders={lenders}
              onOpenClient={openClient}
              onAddClient={openManualIntake}
              onOpenAIIntake={openApplicationIntake}
              onOpenNewClientIntake={openApplicationIntake}
              viewMode={clientViewMode}
              setViewMode={setClientViewMode}
              agentNames={getAgentNames()}
              searchQuery={globalSearch}
              onSearchQueryChange={setGlobalSearch}
              docVault={docVault}
              onUpdateClientStatus={handleUpdateClientStatus}
              currentUser={currentUser}
            />
          )}

          {activeTab === "pipeline" && (
            <ClientsList 
              clients={clients}
              lenders={lenders}
              onOpenClient={openClient}
              onAddClient={openManualIntake}
              onOpenAIIntake={openApplicationIntake}
              onOpenNewClientIntake={openApplicationIntake}
              viewMode="pipeline"
              setViewMode={setClientViewMode}
              agentNames={getAgentNames()}
              searchQuery={globalSearch}
              onSearchQueryChange={setGlobalSearch}
              docVault={docVault}
              onUpdateClientStatus={handleUpdateClientStatus}
              currentUser={currentUser}
              onUpdateClient={handleUpdateClient}
            />
          )}

          {activeTab === "calculators" && (
            <Calculators 
              clients={clients}
              calcClientId={calcClientId}
              setCalcClientId={setCalcClientId}
              stIncome={stIncome}
              setStIncome={setStIncome}
              stCoIncome={stCoIncome}
              setStCoIncome={setStCoIncome}
              stDebts={stDebts}
              setStDebts={setStDebts}
              stCondo={stCondo}
              setStCondo={setStCondo}
              stTax={stTax}
              setStTax={setStTax}
              stHeat={stHeat}
              setStHeat={setStHeat}
              stRate={stRate}
              setStRate={setStRate}
              stAmortization={stAmortization}
              setStAmortization={setStAmortization}
              pcAmount={pcAmount}
              setPcAmount={setPcAmount}
              pcRate={pcRate}
              setPcRate={setPcRate}
              pcAm={pcAm}
              setPcAm={setPcAm}
              pcFreq={pcFreq}
              setPcFreq={setPcFreq}
              gcIncome={gcIncome}
              setGcIncome={setGcIncome}
              gcPmt={gcPmt}
              setGcPmt={setGcPmt}
              gcTax={gcTax}
              setGcTax={setGcTax}
              gcHeat={gcHeat}
              setGcHeat={setGcHeat}
              gcCondo={gcCondo}
              setGcCondo={setGcCondo}
              gcDebts={gcDebts}
              setGcDebts={setGcDebts}
              hrRate={hrRate}
              setHrRate={setHrRate}
              hrHrs={hrHrs}
              setHrHrs={setHrHrs}
              seY1={seY1}
              setSeY1={setSeY1}
              seY2={seY2}
              setSeY2={setSeY2}
              onLoadClientToCalc={handleLoadClientToCalc}
              onClearCalcClient={handleClearCalcClient}
              cPmt={cPmt}
              pToAmt={pToAmt}
              fd={fd}
              showToast={showToast}
              selectedClient={calcSelectedClient}
              onSaveCalcToClient={handleSaveCalcToClient}
              onNavigateToClient={(id) => {
                openClient(id);
                setActiveTab("clients");
              }}
            />
          )}

          {activeTab === "ai" && (
            <AIAssistantCenter 
              clients={clients}
              currentUser={currentUser}
              docVault={docVault}
              tasks={tasks}
              onAddTask={(newTask) => {
                const addedTask: Task = {
                  ...newTask,
                  id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  createdBy: `${currentUser.first} ${currentUser.last}`
                };
                setTasks(prev => {
                  const updated = [...prev, addedTask];
                  localStorage.setItem("gbk_tasks", JSON.stringify(updated));
                  return updated;
                });
              }}
              onUpdateClient={handleUpdateClient}
              showToast={showToast}
              currentClient={currentClient}
              onSelectClient={setCurrentClient}
              onOpenClientDetail={(id) => {
                openClient(id);
                setActiveTab("clients");
              }}
            />
          )}

          {activeTab === "messages" && (
            <Messages 
              messages={messages}
              setMessages={setMessages}
              clients={clients}
              setClients={setClients}
              currentUser={currentUser}
              activeChannel={activeChannel}
              setActiveChannel={setActiveChannel}
              linkedChatClientId={linkedChatClientId}
              setLinkedChatClientId={setLinkedChatClientId}
              onOpenClient={openClient}
              tasks={tasks}
              setTasks={setTasks}
              showToast={showToast}
              userRoster={userRoster}
              setUserRoster={setUserRoster}
            />
          )}

          {activeTab === "emails" && (
            <EmailView 
              emailsState={emailsState}
              setEmailsState={setEmailsState}
              templates={DEFAULT_TEMPLATES}
              currentUser={currentUser}
              onOpenCompose={() => setEmailComposeOpen(true)}
              showToast={showToast}
              clients={clients}
              setClients={setClients}
              tasks={tasks}
              setTasks={setTasks}
              events={events}
              setEvents={setEvents}
              onOpenClient={openClient}
              logActivity={logActivity}
              docVault={docVault}
              setDocVault={setDocVault}
              bridgeOnline={bridgeOnline}
              onNavigateSettings={() => setActiveTab("settings")}
            />
          )}

          {activeTab === "lenders" && (
            <LenderSheets 
              lenders={lenders}
              setLenders={setLenders}
              clients={clients}
              showToast={showToast}
              onOpenComposeEmail={handleOpenComposeWithDetails}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView 
              events={events}
              setEvents={setEvents}
              tasks={tasks}
              setTasks={setTasks}
              clients={clients}
              showToast={showToast}
              calendarLaunchIntent={calendarLaunchIntent}
              clearCalendarLaunchIntent={() => setCalendarLaunchIntent(null)}
              currentUser={currentUser}
              userRoster={userRoster}
            />
          )}

          {activeTab === "tasks" && (
            <TasksView 
              tasks={tasks}
              setTasks={setTasks}
              clients={clients}
              showToast={showToast}
              events={events}
              setEvents={setEvents}
              userRoster={userRoster}
              currentUser={currentUser}
            />
          )}

          {activeTab === "partners" && (
            <Partners 
              partners={partners}
              setPartners={setPartners}
              clients={clients}
              tasks={tasks}
              setTasks={setTasks}
              currentUser={currentUser}
              userRoster={userRoster}
              showToast={showToast}
              onOpenComposeEmail={handleOpenComposeWithDetails}
            />
          )}

          {activeTab === "reports" && (
            <Reports 
              clients={clients}
              lenders={lenders}
              userRoster={userRoster}
              currentUser={currentUser}
              tasks={tasks}
              partners={partners}
              showToast={showToast}
            />
          )}

          {activeTab === "retention" && (
            <Retention 
              clients={clients}
              setClients={setClients}
              tasks={tasks}
              setTasks={setTasks}
              userRoster={userRoster}
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {activeTab === "compliance" && (
            <Compliance 
              clients={clients}
              setClients={setClients}
              tasks={tasks}
              setTasks={setTasks}
              userRoster={userRoster}
              setUserRoster={setUserRoster}
              currentUser={currentUser}
              auditLogs={auditLogs}
              setAuditLogs={setAuditLogs}
              docVault={docVault}
              setDocVault={setDocVault}
              sessionAutoLock={sessionAutoLock}
              setAutoLockEnabled={setAutoLockEnabled}
              autoLockMinutes={autoLockMinutes}
              setAutoLockMinutes={setAutoLockMinutes}
              auditLoggingEnabled={auditLoggingEnabled}
              setAuditLogEnabled={setAuditLogEnabled}
              onLockApp={() => setAppLocked(true)}
              showToast={showToast}
              onOpenClient={openClient}
            />
          )}

          {activeTab === "file_readiness" && (
            <FileReadiness 
              clients={clients}
              currentUser={currentUser}
              docVault={docVault}
              setDocVault={setDocVault}
              onOpenClient={openClient}
              showToast={showToast}
              agentNames={getAgentNames()}
              isOwnerOrManager={currentUser.role === 'Developer/Admin' || currentUser.role === 'Admin'}
              onUpdateClient={handleUpdateClient}
            />
          )}

          {activeTab === "admin" && (
            <AdminPanel 
              userRoster={userRoster}
              setUserRoster={setUserRoster}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              clients={clients}
              setClients={setClients}
              tasks={tasks}
              setTasks={setTasks}
              auditLogs={auditLogs}
              setAuditLogs={setAuditLogs}
              sessionAutoLock={sessionAutoLock}
              setAutoLockEnabled={setAutoLockEnabled}
              autoLockMinutes={autoLockMinutes}
              setAutoLockMinutes={setAutoLockMinutes}
              auditLoggingEnabled={auditLoggingEnabled}
              setAuditLogEnabled={setAuditLogEnabled}
              onLockApp={() => setAppLocked(true)}
              showToast={showToast}
              lenders={lenders}
              settings={settings}
              bridgeOnline={bridgeOnline}
              versionMismatch={versionMismatch}
              bridgeVersion={bridgeVersion}
            />
          )}

          {activeTab === "settings" && (
            <Settings 
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              userRoster={userRoster}
              setUserRoster={setUserRoster}
              showToast={showToast}
              onLockApp={() => setAppLocked(true)}
              clients={clients}
              bridgeOnline={bridgeOnline}
            />
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ✦ New Client Intake / PDF Application Intake Overlay ✦ */}
      {applicationIntakeOpen && activeTab !== "calculators" && (
        <ApplicationIntake
          mode="ai"
          preloadedText={intakePreloadedText}
          preloadedFileName={intakePreloadedFileName}
          onClearPreloaded={() => {
            setIntakePreloadedText("");
            setIntakePreloadedFileName("");
          }}
          currentUser={currentUser}
          clients={clients}
          onClose={() => setApplicationIntakeOpen(false)}
          onCreateClient={handleCreateClientFromIntake}
          agentNames={getAgentNames()}
          apiKeySet={!!settings.apiKey}
          showToast={showToast}
        />
      )}

      {/* ✦ Manual Client Intake Form Modal Overlay ✦ */}
      {newClientOpen && activeTab !== "calculators" && (
        <ApplicationIntake
          mode="manual"
          currentUser={currentUser}
          clients={clients}
          onClose={() => setNewClientOpen(false)}
          onCreateClient={(newClient) => {
            handleCreateClient(newClient);
            logActivity("Created new file manually", `${newClient.first} ${newClient.last}`);
            showToast("Manual client file created successfully!", "success");
          }}
          agentNames={getAgentNames()}
          apiKeySet={!!settings.apiKey}
          showToast={showToast}
        />
      )}

      {/* ✦ Z Drive Panel Overlay ✦ */}
      {zDriveOpen && (
        <ZDrivePanel
          isOpen={zDriveOpen}
          onClose={() => setZDriveOpen(false)}
          onSendToIntake={(content, name) => {
            setIntakePreloadedText(content);
            setIntakePreloadedFileName(name);
            openApplicationIntake();
            setZDriveOpen(false);
          }}
          showToast={showToast}
        />
      )}

      {/* Detail panel slider */}
      <ClientDetailPanel
        currentClient={(activeTab === "ai" || activeTab === "calculators") ? null : currentClient}
        currentUser={currentUser}
        clients={clients}
        lenders={lenders}
        docVault={docVault}
        setDocVault={setDocVault}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        closeDetail={closeDetail}
        openClient={openClient}
        handleUpdateClient={handleUpdateClient}
        handleUpdateClientStatus={handleUpdateClientStatus}
        handleDeleteClient={handleDeleteClient}
        triggerUnderwritingAnalysis={triggerUnderwritingAnalysis}
        underwritingLoading={underwritingLoading}
        underwritingError={underwritingError}
        getAgentNames={getAgentNames}
        showToast={showToast}
        bridgeOnline={bridgeOnline}
        tasks={tasks}
        setTasks={setTasks}
        events={events}
        setEvents={setEvents}
        onNavigateToCalculators={(clientId) => {
          setCalcClientId(clientId);
          handleLoadClientToCalc(clientId);
          closeDetail();
          setApplicationIntakeOpen(false);
          setNewClientOpen(false);
          setIntakePreloadedText("");
          setIntakePreloadedFileName("");
          handleTabChange("calculators");
        }}
        onScheduleClientActivity={(clientId) => {
          setCalendarLaunchIntent({
            clientId,
            dateStr: new Date().toISOString().split("T")[0],
            openModal: true
          });
          closeDetail();
          handleTabChange("calendar");
        }}
      />

      {/* Settings Modal config */}
      <AnimatePresence>
        {settingsModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--glass-bg)] backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={shouldReduceMotion ? { scale: 1 } : { scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { scale: 1 } : { scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="panel-card w-full max-w-sm p-6 shadow-2xl relative border-t-2" 
              style={{ borderTopColor: "var(--color-accent)", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3), 0 0 24px rgba(200, 146, 42, 0.05)" }}
            >
              <button onClick={() => setSettingsModalOpen(false)} className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-full hover:bg-[var(--color-surface-2)] transition-all cursor-pointer">✕</button>
              <h3 className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest mb-4 border-b pb-2" style={{ borderColor: "var(--color-divider)" }}>CRM Configuration</h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Interactive Advisor Name</label>
                  <input 
                    type="text" 
                    value={currentUser.first + " " + currentUser.last}
                    onChange={(e) => {
                      const parts = e.target.value.split(" ");
                      setCurrentUser(prev => ({ ...prev, first: parts[0] || "", last: parts.slice(1).join(" ") }));
                    }}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Gemini API Key</label>
                  <input 
                    type="password" 
                    value={settings.apiKey || ""}
                    onChange={(e) => {
                      const apiVal = e.target.value;
                      setSettings(prev => ({ ...prev, apiKey: apiVal }));
                      localStorage.setItem("gbk_apiKey", apiVal);
                    }}
                    placeholder="sk-ant-api03-..."
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                  />
                  <span className="text-[9px] text-[var(--color-text-faint)] font-bold mt-1.5 block leading-normal">Stored locally inside browser sandbox cache. Allows instant AI reports.</span>
                </div>

                <button 
                  onClick={() => {
                    setSettingsModalOpen(false);
                    showToast("Configuration safely saved!", "success");
                  }}
                  className="w-full mt-2 text-[var(--color-text-inverse)] font-black uppercase tracking-wider text-[10px] py-3 rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(200,146,42,0.25)]"
                  style={{ background: "var(--grad-warm-highlight)" }}
                >
                  Save and Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile/Signup & Credential Manager Modal */}
      <AnimatePresence>
        {profileModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--glass-bg)] backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div 
              initial={shouldReduceMotion ? { scale: 1 } : { scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { scale: 1 } : { scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="border rounded-3xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-t-2"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                borderTopColor: "var(--color-accent)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3), 0 0 24px rgba(200, 146, 42, 0.05)"
              }}
            >
              <button 
                onClick={() => setProfileModalOpen(false)} 
                className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-full hover:bg-[var(--color-border)]/5 transition-all cursor-pointer text-sm"
              >
                ✕
              </button>
              
              <h3 className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest mb-4 pb-2 border-b animate-pulse" style={{ borderColor: "var(--color-divider)" }}>
                Broker Account & Credentials
              </h3>
              
              {/* Tabs */}
              <div className="flex border-b mb-5 shrink-0" style={{ borderColor: "var(--color-divider)" }}>
                {[
                  { id: 'profile', label: 'Active Sync' },
                  { id: 'signup', label: 'Sign Up' },
                  { id: 'switch', label: 'Switch Broker' }
                ].map(tab => {
                  const isSelected = profileTab === tab.id;
                  return (
                    <button 
                      key={tab.id}
                      onClick={() => {
                        setProfileTab(tab.id as any);
                        if (tab.id === 'switch') {
                          setSwError("");
                          setSwPin("");
                        }
                      }} 
                      className={`flex-1 pb-2.5 text-[9px] uppercase font-black tracking-widest text-center border-b-2 transition-colors cursor-pointer ${
                        isSelected 
                          ? 'border-[var(--color-accent)] text-[var(--color-accent)]' 
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB CONTENT: PROFILE SYNC EDIT */}
              {profileTab === 'profile' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--color-surface-2)] p-4 rounded-2xl border border-[var(--color-border)] flex flex-col gap-3">
                    <div className="flex items-center gap-3 border-b pb-2 mb-1" style={{ borderColor: "var(--color-divider)" }}>
                      <Avatar 
                        src={profPhoto} 
                        first={profFirst} 
                        last={profLast} 
                        name={`${profFirst} ${profLast}`} 
                        size="lg" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-[var(--color-text)] truncate">{profFirst} {profLast}</div>
                        <div className="text-[10px] text-[var(--color-accent)] font-extrabold uppercase tracking-wider">{currentUser.role}</div>
                      </div>
                      {profPhoto && (
                        <button
                          type="button"
                          onClick={() => setProfPhoto("")}
                          className="text-[9px] text-[var(--color-error, #e05c6e)] hover:underline font-bold uppercase tracking-wider"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1">First Name</label>
                        <input 
                          type="text" 
                          value={profFirst}
                          onChange={(e) => setProfFirst(e.target.value)}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1">Last Name</label>
                        <input 
                          type="text" 
                          value={profLast}
                          onChange={(e) => setProfLast(e.target.value)}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1">Phone</label>
                        <input 
                          type="text" 
                          value={profPhone}
                          onChange={(e) => setProfPhone(e.target.value)}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1">FSRA Licence</label>
                        <input 
                          type="text" 
                          value={profFsra}
                          onChange={(e) => setProfFsra(e.target.value)}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1">Security PIN (4-digit)</label>
                        <input 
                          type="password" 
                          maxLength={4}
                          value={profPin}
                          onChange={(e) => setProfPin(e.target.value.replace(/\D/g, ""))}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1">Avatar Photo URL</label>
                        <input 
                          type="text" 
                          placeholder="https://... or upload below"
                          value={profPhoto}
                          onChange={(e) => setProfPhoto(e.target.value)}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    {/* Quick Avatar File Upload & Preset Selection */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]/50">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">Presets:</span>
                        {[
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                          "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
                          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                        ].map((presetUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setProfPhoto(presetUrl)}
                            className="w-5 h-5 rounded-full overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all cursor-pointer shrink-0"
                          >
                            <img src={presetUrl} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>

                      <label className="text-[9px] font-extrabold uppercase text-[var(--color-accent)] hover:underline cursor-pointer">
                        Upload Image File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                showToast("Image file size exceeds 5MB limit", "error");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const result = ev.target?.result as string;
                                if (result) {
                                  setProfPhoto(result);
                                  showToast("Image loaded into profile photo", "success");
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex justify-end mt-1">
                      <button
                        onClick={async () => {
                          if (!profFirst || !profLast || !profPin) {
                            showToast("First name, Last name, and security PIN are required.", "error");
                            return;
                          }
                          if (profPin.length !== 4) {
                            showToast("Security PIN must be exactly 4 digits.", "error");
                            return;
                          }
                          const plainPin = profPin;
                          const encryptedPin = await encryptValue(plainPin, plainPin);
                          const pinHash = await hashPin(plainPin, currentUser.id);

                          const updatedUserForRoster = {
                            ...currentUser,
                            first: profFirst,
                            last: profLast,
                            phone: profPhone,
                            fsraNum: profFsra,
                            photo: profPhoto || null,
                            pin: encryptedPin,
                            pinHash
                          };

                          const updatedUserInMemory = {
                            ...currentUser,
                            first: profFirst,
                            last: profLast,
                            phone: profPhone,
                            fsraNum: profFsra,
                            photo: profPhoto || null,
                            pin: profPin
                          };

                          setCurrentUser(updatedUserInMemory);
                          const updatedRoster = userRoster.map(u => u.id === currentUser.id ? updatedUserForRoster : u);
                          setUserRoster(updatedRoster);
                          localStorage.setItem("gbk_roster", JSON.stringify(updatedRoster));
                          logActivity(`Updated personal profile details`, currentUser.email);
                          showToast("Profile details updated successfully!", "success", "👤");
                        }}
                        className="bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-text-inverse)] font-black uppercase text-[9px] px-3 py-1.5 rounded-lg tracking-wider cursor-pointer shadow-sm transition-all"
                      >
                        Save Profile Details
                      </button>
                    </div>
                  </div>

                  <span className="text-[8px] uppercase font-black tracking-widest text-[var(--color-text-faint)] mt-1">Workspace Credentials Settings</span>
                  
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Incoming IMAP/SMTP Username</label>
                      <input 
                        type="text" 
                        placeholder="e.g. email@gbkfinancial.ca"
                        value={activeUsername}
                        onChange={(e) => setActiveUsername(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Email App Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••••••••••"
                        value={activePassword}
                        onChange={(e) => setActivePassword(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-mono font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Server Host</label>
                        <input 
                          type="text" 
                          placeholder="e.g. imap.gmail.com"
                          value={activeHost}
                          onChange={(e) => setActiveHost(e.target.value)}
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Server Port</label>
                        <input 
                          type="text" 
                          placeholder="993"
                          value={activePort}
                          onChange={(e) => setActivePort(e.target.value)}
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-mono font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-3 border-t pt-4" style={{ borderColor: "var(--color-divider)" }}>
                      <button 
                        onClick={() => {
                          const updatedUser = {
                            ...currentUser,
                            emailHost: "",
                            emailPort: "",
                            emailUsername: "",
                            emailPassword: ""
                          };
                          setCurrentUser(updatedUser);
                          const updatedRoster = userRoster.map(u => u.id === currentUser.id ? updatedUser : u);
                          setUserRoster(updatedRoster);
                          localStorage.setItem("gbk_roster", JSON.stringify(updatedRoster));
                          localStorage.removeItem("gbk_gmail_loggedin");
                          logActivity(`Disconnected Workspace email credentials`, currentUser.email);
                          showToast("Workspace credentials disconnected successfully.", "success", "🔓");
                          setProfileModalOpen(false);
                        }}
                        className="flex-1 bg-[var(--color-error-subtle)] hover:bg-[var(--color-error)]/20 border border-[var(--color-error)]/25 text-[var(--color-error)] font-bold text-[10px] py-3 rounded-xl transition-all cursor-pointer"
                      >
                        Disconnect Sync
                      </button>
                      <button 
                        onClick={async () => {
                          const plainPin = currentUser.pin;
                          const encryptedPassword = activePassword ? await encryptValue(activePassword, plainPin) : "";
                          const encryptedPin = await encryptValue(plainPin, plainPin);
                          const pinHash = await hashPin(plainPin, currentUser.id);
 
                          const updatedUserForRoster = {
                            ...currentUser,
                            emailHost: activeHost,
                            emailPort: activePort,
                            emailUsername: activeUsername,
                            emailPassword: encryptedPassword,
                            pin: encryptedPin,
                            pinHash
                          };
 
                          const updatedUserInMemory = {
                            ...currentUser,
                            emailHost: activeHost,
                            emailPort: activePort,
                            emailUsername: activeUsername,
                            emailPassword: activePassword
                          };
 
                          setCurrentUser(updatedUserInMemory);
                          const updatedRoster = userRoster.map(u => u.id === currentUser.id ? updatedUserForRoster : u);
                          setUserRoster(updatedRoster);
                          localStorage.setItem("gbk_roster", JSON.stringify(updatedRoster));
                          logActivity(`Configured custom email credentials`, currentUser.email);
                          showToast("Workspace Credentials Sync Enabled!", "success", "🔐");
                          setProfileModalOpen(false);
                        }}
                        className="flex-1 text-[var(--color-text-inverse)] font-black uppercase tracking-wider text-[10px] py-3 rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(200,146,42,0.15)]"
                        style={{ background: "var(--grad-warm-highlight)" }}
                      >
                        ✓ Save & Sync
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: SIGN UP */}
              {profileTab === 'signup' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!suFirst || !suLast || !suEmail || !suPin) {
                      showToast("Please fill out First Name, Last Name, Email, and PIN.", "error");
                      return;
                    }
                    const newUserId = `u_${Date.now()}`;
                    const pinHash = await hashPin(suPin, newUserId);
                    const encryptedPin = await encryptValue(suPin, suPin);
                    const encryptedEmailPassword = suPass ? await encryptValue(suPass, suPin) : undefined;
 
                    const newUserRecord: User = {
                      id: newUserId,
                      first: suFirst,
                      last: suLast,
                      email: suEmail,
                      role: suRole,
                      status: 'active',
                      phone: suPhone || undefined,
                      pin: encryptedPin,
                      pinHash,
                      lastLogin: new Date().toISOString(),
                      created: new Date().toISOString().split("T")[0],
                      fsraNum: suFsra || undefined,
                      emailHost: suHost,
                      emailPort: suPort,
                      emailUsername: suEmail,
                      emailPassword: encryptedEmailPassword
                    };
                    const newRoster = [...userRoster, newUserRecord];
                    setUserRoster(newRoster);
                    localStorage.setItem("gbk_roster", JSON.stringify(newRoster));
                    
                    const decryptedUserRecord: User = {
                      ...newUserRecord,
                      pin: suPin,
                      emailPassword: suPass || undefined
                    };
                    setCurrentUser(decryptedUserRecord);
                    setProfileModalOpen(false);
                    setSuFirst("");
                    setSuLast("");
                    setSuEmail("");
                    setSuPin("");
                    setSuPhone("");
                    setSuFsra("");
                    setSuPass("");
                    logActivity(`Signed up new Broker account: ${newUserRecord.first} ${newUserRecord.last}`, newUserRecord.email);
                    showToast(`Welcome aboard, ${newUserRecord.first}! Signed up successfully!`, "success", "🌟");
                  }} 
                  className="flex flex-col gap-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">First Name</label>
                      <input 
                        type="text" 
                        value={suFirst}
                        onChange={(e) => setSuFirst(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Last Name</label>
                      <input 
                        type="text" 
                        value={suLast}
                        onChange={(e) => setSuLast(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Business Email</label>
                    <input 
                      type="email" 
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      placeholder="e.g. agent@gbkfinancial.ca"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Security PIN (4 Digits)</label>
                      <input 
                        type="password" 
                        maxLength={4}
                        value={suPin}
                        onChange={(e) => setSuPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] text-center tracking-widest font-mono focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">FSRA Licence #</label>
                      <input 
                        type="text" 
                        value={suFsra}
                        onChange={(e) => setSuFsra(e.target.value)}
                        placeholder="e.g. M230045"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-black tracking-widest mb-1.5">Operational Role</label>
                    <select 
                      value={suRole}
                      onChange={(e) => setSuRole(e.target.value as any)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-bold cursor-pointer"
                    >
                      <option value="Broker">🏡 Broker / Lead Advisor</option>
                      <option value="Admin">💼 Operations Admin</option>
                      <option value="Developer/Admin">👑 Developer / Master Admin</option>
                    </select>
                  </div>

                  <span className="text-[8px] uppercase font-black tracking-widest text-[var(--color-text-faint)] mt-1.5">Optional GSuite Email host Sync</span>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="imap.gmail.com"
                      value={suHost}
                      onChange={(e) => setSuHost(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-mono font-semibold"
                    />
                    <input 
                      type="password" 
                      placeholder="Gmail App Password"
                      value={suPass}
                      onChange={(e) => setSuPass(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 transition-all font-mono font-semibold"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full mt-2 text-[var(--color-text-inverse)] font-black uppercase tracking-wider text-[10px] py-3 rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(200,146,42,0.25)]"
                    style={{ background: "var(--grad-warm-highlight)" }}
                  >
                    Register and Login as Agent
                  </button>
                </form>
              )}

              {/* TAB CONTENT: SWITCH ACTIVE USER */}
              {profileTab === 'switch' && (
                <div className="flex flex-col gap-3">
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin">
                    {userRoster.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSwTargetId(u.id);
                          setSwPin("");
                          setSwError("");
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          swTargetId === u.id 
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]' 
                            : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-black ${swTargetId === u.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>{u.first} {u.last}</div>
                          <div className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider mt-0.5">{u.role}</div>
                        </div>
                        <div className="text-[10px] text-[var(--color-text-faint)] truncate font-mono max-w-[140px] font-bold">{u.email}</div>
                      </button>
                    ))}
                  </div>

                  {swTargetId && (
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const match = userRoster.find(u => u.id === swTargetId);
                        if (!match) {
                          setSwError("Target user profile not found");
                          return;
                        }

                        let pinMatches = false;
                        if (match.pinHash) {
                          const hashed = await hashPin(swPin, match.id);
                          pinMatches = (match.pinHash === hashed);
                        } else {
                          pinMatches = (match.pin === swPin);
                        }

                        if (pinMatches) {
                          const decryptedEmailPassword = match.emailPassword ? await decryptValue(match.emailPassword, swPin) : undefined;
                          const decryptedUser: User = {
                            ...match,
                            pin: swPin,
                            emailPassword: decryptedEmailPassword || undefined
                          };
                          setCurrentUser(decryptedUser);
                          setProfileModalOpen(false);
                          setSwTargetId("");
                          setSwPin("");
                          setSwError("");
                          logActivity(`Switched Workspace to user ${match.first} ${match.last}`, match.email);
                          showToast(`Switched workspace to ${match.first} ${match.last}!`, "success", "👤");
                        } else {
                          setSwError("Incorrect 4-digit PIN code");
                          setSwPin("");
                        }
                      }} 
                      className="mt-2 border-t pt-4 flex flex-col gap-2.5"
                      style={{ borderColor: "var(--color-divider)" }}
                    >
                      <div className="text-[10px] text-[var(--color-text-muted)] mb-1 font-bold">Enter your 4-digit Security PIN to switch:</div>
                      
                      <div className="flex gap-3">
                        <input 
                          type="password"
                          maxLength={4}
                          value={swPin}
                          onChange={(e) => setSwPin(e.target.value.replace(/\D/g, ""))}
                          placeholder="••••"
                          className="w-32 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 text-center text-sm font-mono font-black tracking-widest text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)]/40"
                          required
                        />
                        <button 
                          type="submit"
                          className="flex-1 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/25 text-[var(--color-accent)] font-black uppercase tracking-wider text-[10px] py-3 rounded-xl transition-all cursor-pointer"
                        >
                          Confirm Switch
                        </button>
                      </div>

                      {swError && (
                        <span className="text-[10px] text-[var(--color-error)] mt-1 font-bold uppercase tracking-wider">{swError}</span>
                      )}
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
