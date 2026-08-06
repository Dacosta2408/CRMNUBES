import React, { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Mail, Star, Send, FileText, Trash2, ArrowLeft, RefreshCw, MailOpen, 
  User, CheckCircle2, AlertCircle, Plus, Calendar, Clock, Lock, 
  Link as LinkIcon, Paperclip, ChevronDown, Check, Reply, Sliders,
  FileCheck, ShieldAlert, Sparkles, MessageSquare, LogOut, CheckSquare,
  Archive, Inbox, ShieldCheck
} from "lucide-react";
import { Email, EmailTemplate, Client, Task, Event } from "../types";
import { sendEmail } from "../lib/bridgeService";

interface EmailViewProps {
  emailsState: { inbox: Email[]; sent: Email[]; scheduled: Email[]; queued: Email[] };
  setEmailsState: React.Dispatch<React.SetStateAction<{ inbox: Email[]; sent: Email[]; scheduled: Email[]; queued: Email[] }>>;
  templates: EmailTemplate[];
  currentUser: any;
  onOpenCompose?: (templateId?: string) => void;
  showToast: (msg: string, type?: any, icon?: string) => void;
  clients?: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  events?: Event[];
  setEvents?: React.Dispatch<React.SetStateAction<Event[]>>;
  onOpenClient?: (id: string) => void;
  logActivity?: (action: string, target?: string) => void;
  docVault?: Record<string, any>;
  setDocVault?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  bridgeOnline?: boolean;
  onNavigateSettings?: () => void;
}

const MORTGAGE_PREPARED_TEMPLATES = [
  {
    id: "m-welcome",
    name: "1. Intro & Document Checklist",
    desc: "Welcome letter & required initial files list",
    subject: "Welcome to GBK Financial — Next Steps & Document Checklist",
    body: "Hi {{first}},\n\nThank you for choosing GBK Financial for your mortgage needs! We're excited to guide you through your home financing journey.\n\nTo begin preparing your file for underwriting, please send over the following initial documents at your earliest convenience:\n• Government Photo ID (Passport or Driver's Licence for all borrowers)\n• Two most recent pay stubs\n• Letter of Employment (on corporate letterhead, signed)\n• 2 years of T4s and Notice of Assessments (NOAs)\n• 90-day bank statements showing down payment source\n\nYou can reply directly to this email with attachments or drag them into our client portal. Reach out anytime if you have questions.\n\nBest regards,\n\n{{signature}}"
  },
  {
    id: "m-preapproval",
    name: "2. Pre-Approval Best Practices",
    desc: "Pre-approved home buyers rules",
    subject: "Congratulations! Your GBK Mortgage Pre-Approval is Ready",
    body: "Hi {{first}},\n\nFantastic news! We have successfully structured your pre-approval up to a maximum purchase budget of ${{amount}} based on our preliminary review.\n\nBefore you start submitting active offers, please keep these crucial rules in mind to protect your approval status:\n1. Do NOT make any major purchases on credit (avoid financing new cars, furniture, appliances etc.).\n2. Maintain your current employment status (do not switch positions or change pay structures).\n3. Keep your down payment stability intact and trackable in your primary accounts.\n\nLet us know as soon as you find a property you love so we can verify the address details and confirm the rate sheet.\n\nBest regards,\n\n{{signature}}"
  },
  {
    id: "m-commitment",
    name: "3. Conditional Commitment Conditions",
    desc: "Lender commitment conditions task",
    subject: "Outstanding Client Conditions - Commitment Approval Issued by {{lender}}",
    body: "Hi {{first}},\n\nWe have received a conditional commitment from {{lender}} for your loan request of ${{amount}} at an interest rate of {{rate}}%!\n\nTo get the final sign-off and move your file to fully approved, the underwriter has requested the following outstanding conditions immediately:\n• Signed mortgage application and borrower consent forms (attached)\n• Completed Gift Letter from immediate family (if any portion of downpayment is gifted)\n• Proof of deposit check clearance from your solicitor\n\nPlease submit these items as soon as possible so we can secure your final mortgage package.\n\nBest regards,\n\n{{signature}}"
  },
  {
    id: "m-appraisal",
    name: "4. Property Appraisal Coordinator",
    desc: "Underwriting appraisal payment link",
    subject: "Action Required: Property Appraisal Order — {{first}}",
    body: "Hi {{first}},\n\nAs part of the underwriter clearance guidelines, {{lender}} requires an independent professional appraisal of the property to verify its market valuation.\n\nWe have scheduled the appraiser to visit the property this week. To finalize the scheduling, please complete the appraisal payment at the secure link below:\n\n🔗 Appraisal Invoice Payment Portal: gbkfinancial.ca/pay/appraisal-deposit\n\nOnce paid, the team will transmit the electronic report directly to {{lender}} to resolve this file's condition.\n\nBest regards,\n\n{{signature}}"
  },
  {
    id: "m-finalclear",
    name: "5. Fully Approved & Legal Instructions",
    desc: "Cleared commitment and instructed lawyer",
    subject: "Great News! Your File is Fully Approved & Instructed",
    body: "Hi {{first}},\n\nWe are thrilled to let you know that {{lender}} has cleared all outstanding conditions! Your mortgage file is officially fully approved.\n\nOur operations desk has transmitted the final legal instructions to your real estate lawyer. Here are your next steps:\n1. Your solicitor will contact you shortly to schedule an appointment to sign the final transfer deeds and mortgage charge registry.\n2. You will need to bring bank drafts for the remaining balance of the down payment and closing costs.\n3. Keep a copy of your home insurance binder ready for your lawyer.\n\nIf you have any last-minute questions before closing day, don't hesitate to reach out!\n\nBest regards,\n\n{{signature}}"
  },
  {
    id: "m-funded",
    name: "6. Closed congratulation & First Repay",
    desc: "Successful checkout closed greetings",
    subject: "Welcome Home! Your Mortgage has Funded successfully",
    body: "Hi {{first}},\n\nCongratulations! Your transaction has officially closed and funded today. The keys are yours!\n\nHere is a quick summary of your mortgage details for your peace of mind:\n• Primary Lender: {{lender}}\n• Principal Loan: ${{amount}}\n• Interest Rate: {{rate}}%\n\nYour first automated repayment is scheduled to draw from your bank account shortly. We will check in with you in a few weeks to make sure everything has settled in beautifully.\n\nThank you for choosing GBK Financial. It was an honor working with you!\n\nBest regards,\n\n{{signature}}"
  }
];

interface ConfirmModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
}

// Module-level in-memory cache for EmailView state preservation across component mounts
let inMemoryGmailLoggedIn = false;
let inMemoryGmailLoginEmail = "";
let inMemoryGmailSignature = "";
let inMemoryGmailDrafts: string | null = null;
let inMemoryGmailArchive: string | null = null;

export const EmailView: React.FC<EmailViewProps> = ({
  emailsState,
  setEmailsState,
  templates,
  currentUser,
  showToast,
  clients = [],
  setClients,
  tasks = [],
  setTasks,
  events = [],
  setEvents,
  onOpenClient,
  logActivity,
  docVault = {},
  setDocVault,
  bridgeOnline = false,
  onNavigateSettings
}) => {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig | null>(null);

  // ── AUTH & SECTIONS STATES ──
  const [loginEmail, setLoginEmail] = useState<string>(() => {
    return currentUser?.email || inMemoryGmailLoginEmail || "david.acosta@gbkfinancial.ca";
  });

  const [smtpHost, setSmtpHost] = useState<string>("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState<string>("587");
  const [smtpUsername, setSmtpUsername] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const savedHost = localStorage.getItem("gbk_gmail_smtp_host") || "smtp.gmail.com";
    const savedPort = localStorage.getItem("gbk_gmail_smtp_port") || "587";
    const savedUser = localStorage.getItem("gbk_gmail_smtp_username") || currentUser?.email || "";
    const savedConfigured = localStorage.getItem("gbk_gmail_smtp_configured") === "true";

    setSmtpHost(savedHost);
    setSmtpPort(savedPort);
    setSmtpUsername(savedUser);
    setIsLoggedIn(savedConfigured);
    setLoginEmail(currentUser?.email || savedUser || "david.acosta@gbkfinancial.ca");
  }, [currentUser]);

  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // ── AI SUMMARIZE STATES & HANDLER ──
  const [summaryText, setSummaryText] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showSummaryPanel, setShowSummaryPanel] = useState<boolean>(false);

  useEffect(() => {
    setSummaryText("");
    setSummaryError(null);
    setShowSummaryPanel(false);
  }, [selectedEmail?.id]);

  const handleSummarizeEmail = async () => {
    if (!selectedEmail) return;
    const emailText = selectedEmail.body || selectedEmail.preview || "";
    if (!emailText.trim()) {
      showToast("Selected email has no content to summarize.", "info");
      return;
    }

    setIsSummarizing(true);
    setShowSummaryPanel(true);
    setSummaryText("");
    setSummaryError(null);

    try {
      const promptText = `Summarize this email in 2–3 sentences for a mortgage broker CRM.\n\nEmail Content:\n${emailText}`;
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env.VITE_GEMINI_API_KEY : "");

      let responseText = "";

      if (apiKey && apiKey.trim() !== "" && apiKey !== "undefined") {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: promptText
        });
        responseText = response.text || "";
      } else {
        // Fallback to server route if client VITE_GEMINI_API_KEY is not set
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: promptText,
            history: []
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate AI summary");
        responseText = data.reply || "";
      }

      if (!responseText.trim()) {
        throw new Error("Empty summary received from Gemini API.");
      }

      setSummaryText(responseText.trim());
    } catch (err: any) {
      console.error("AI Summarize error:", err);
      setSummaryError(err.message || "Failed to generate AI summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // ── SMART REPLIES STATES & HANDLERS ──
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingSmartReplies, setIsGeneratingSmartReplies] = useState<boolean>(false);
  const [smartRepliesError, setSmartRepliesError] = useState<string | null>(null);

  const handleFetchSmartReplies = async (targetEmail?: Email) => {
    const emailToUse = targetEmail || selectedEmail;
    if (!emailToUse) return;
    const bodyText = emailToUse.body || emailToUse.preview || "";
    if (!bodyText.trim()) return;

    setIsGeneratingSmartReplies(true);
    setSmartRepliesError(null);

    try {
      const promptText = `Suggest 3 short professional reply options for a mortgage broker. Return as JSON array of strings.\n\nEmail Content:\n${bodyText}`;
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env.VITE_GEMINI_API_KEY : "");

      let responseText = "";

      if (apiKey && apiKey.trim() !== "" && apiKey !== "undefined") {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: promptText
        });
        responseText = response.text || "";
      } else {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: promptText,
            history: []
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch smart replies");
        responseText = data.reply || "";
      }

      let cleaned = responseText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      }

      let parsed: string[] = [];
      try {
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(cleaned);
        }
      } catch (pErr) {
        parsed = cleaned
          .split("\n")
          .map(line => line.replace(/^[0-9+\-*."'\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 3);
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        setSmartReplies(parsed.slice(0, 3));
      } else {
        throw new Error("Could not parse smart replies array");
      }
    } catch (err: any) {
      console.error("Smart replies error:", err);
      setSmartRepliesError("Failed to generate smart replies");
      setSmartReplies([
        "Thank you for sending this over. I'm reviewing the details now and will get back to you shortly.",
        "Got it! I've updated your file in our system and will let you know if anything else is needed.",
        "Thanks! Let's schedule a brief phone call to discuss the next steps."
      ]);
    } finally {
      setIsGeneratingSmartReplies(false);
    }
  };

  useEffect(() => {
    if (selectedEmail) {
      setSmartReplies([]);
      handleFetchSmartReplies(selectedEmail);
    }
  }, [selectedEmail?.id]);

  const handleSelectSmartReply = (replyText: string) => {
    if (!selectedEmail) return;
    const recipientEmail = selectedEmail.fromEmail || loginEmail || "VDacosta247@gmail.com";
    const recipientName = selectedEmail.from || recipientEmail;

    setComposeTo(recipientName);
    setComposeToEmail(recipientEmail);
    const origSubj = selectedEmail.subject || "Inquiry";
    setComposeSubject(origSubj.toLowerCase().startsWith("re:") ? origSubj : `Re: ${origSubj}`);
    setComposeBody(replyText);
    if (selectedEmail.clientId) {
      setSelectedClientLink(selectedEmail.clientId);
    }
    setIsComposeOpen(true);
    showToast("Smart reply loaded into Compose modal!", "info");
  };
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mailboxScope, setMailboxScope] = useState<string>("personal");
  const [signatureText, setSignatureText] = useState<string>(() => {
    return inMemoryGmailSignature || 
      `Regards,\n\n${currentUser.first} ${currentUser.last}\nSenior Mortgage Advisor, GBK Financial\nPhone: ${currentUser.phone || "(416) 555-0105"}\nWeb: gbkfinancial.ca`;
  });
  const [showSignatureEdit, setShowSignatureEdit] = useState<boolean>(false);

  // Draft / Custom folder pools (internal simulation)
  const [draftsList, setDraftsList] = useState<Email[]>(() => {
    const saved = localStorage.getItem("gbk_gmail_drafts");
    if (saved) {
      try {
        const parsed: Email[] = JSON.parse(saved);
        return parsed.filter(e => e && e.id && !e.id.startsWith("ie") && !e.id.startsWith("dr-"));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [archivedList, setArchivedList] = useState<Email[]>(() => {
    const saved = localStorage.getItem("gbk_gmail_archives");
    if (saved) {
      try {
        const parsed: Email[] = JSON.parse(saved);
        return parsed.filter(e => e && e.id && !e.id.startsWith("ie") && !e.id.startsWith("dr-"));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [trashList, setTrashList] = useState<Email[]>(() => {
    const saved = localStorage.getItem("gbk_gmail_trash");
    if (saved) {
      try {
        const parsed: Email[] = JSON.parse(saved);
        return parsed.filter(e => e && e.id && !e.id.startsWith("ie") && !e.id.startsWith("dr-"));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("gbk_gmail_drafts", JSON.stringify(draftsList));
    inMemoryGmailDrafts = JSON.stringify(draftsList);
  }, [draftsList]);

  useEffect(() => {
    localStorage.setItem("gbk_gmail_archives", JSON.stringify(archivedList));
    inMemoryGmailArchive = JSON.stringify(archivedList);
  }, [archivedList]);

  useEffect(() => {
    localStorage.setItem("gbk_gmail_trash", JSON.stringify(trashList));
  }, [trashList]);

  // ── WIZARD DIALOG STATES (TASK/EVENT CREATION OVERLAYS) ──
  const [isTaskWizardOpen, setIsTaskWizardOpen] = useState<boolean>(false);
  const [taskWizardTitle, setTaskWizardTitle] = useState<string>("");
  const [taskWizardPriority, setTaskWizardPriority] = useState<"high" | "medium" | "low">("high");
  const [taskWizardDueDate, setTaskWizardDueDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
  const [taskWizardNotes, setTaskWizardNotes] = useState<string>("");
  const [taskWizardAssignee, setTaskWizardAssignee] = useState<string>("Jeff Brown");

  const [isEventWizardOpen, setIsEventWizardOpen] = useState<boolean>(false);
  const [eventWizardTitle, setEventWizardTitle] = useState<string>("");
  const [eventWizardDate, setEventWizardDate] = useState<string>(new Date(Date.now() + 172800000).toISOString().split("T")[0]);
  const [eventWizardTime, setEventWizardTime] = useState<string>("10:00");
  const [eventWizardType, setEventWizardType] = useState<"client" | "meeting" | "lender" | "personal">("client");
  const [eventWizardNotes, setEventWizardNotes] = useState<string>("");

  // ── COMPOSE FLOW DIALOG STATES ──
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>("");
  const [composeToEmail, setComposeToEmail] = useState<string>("");
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [composeCc, setComposeCc] = useState<string>("");
  const [composeBcc, setComposeBcc] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeBody, setComposeBody] = useState<string>("");
  const [composeAttachments, setComposeAttachments] = useState<Array<{ name: string; size: string }>>([]);
  const [selectedClientLink, setSelectedClientLink] = useState<string>("");
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  const [showClientDropdown, setShowClientDropdown] = useState<boolean>(false);
  const [composePriority, setComposePriority] = useState<"urgent" | "normal" | "low">("normal");
  const [scheduleSendTime, setScheduleSendTime] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState<boolean>(false);

  // ── AI WRITE STATES & HANDLER ──
  const [showAiWritePopup, setShowAiWritePopup] = useState<boolean>(false);
  const [aiWriteInstruction, setAiWriteInstruction] = useState<string>("");
  const [isGeneratingAiWrite, setIsGeneratingAiWrite] = useState<boolean>(false);
  const [aiWriteError, setAiWriteError] = useState<string | null>(null);

  const handleAiWriteSubmit = async () => {
    if (!aiWriteInstruction.trim()) return;
    setIsGeneratingAiWrite(true);
    setAiWriteError(null);

    const currentUserName = currentUser?.name || currentUser?.displayName || (currentUser?.first ? `${currentUser.first} ${currentUser.last || ''}`.trim() : "") || "David Acosta";
    const promptText = `Write a professional mortgage broker email based on this instruction: ${aiWriteInstruction.trim()}. Sign off as ${currentUserName}, GBK Financial.`;

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env.VITE_GEMINI_API_KEY : "");
      let generatedText = "";

      if (apiKey && apiKey.trim() !== "" && apiKey !== "undefined") {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: promptText
        });
        generatedText = response.text || "";
      } else {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: promptText,
            history: []
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate email content");
        generatedText = data.reply || "";
      }

      if (!generatedText.trim()) {
        throw new Error("No response generated from Gemini API.");
      }

      setComposeBody(generatedText.trim());
      setShowAiWritePopup(false);
      setAiWriteInstruction("");
      showToast("AI email draft generated and inserted!", "success");
    } catch (err: any) {
      console.error("AI Write error:", err);
      setAiWriteError(err.message || "Failed to generate AI email text");
    } finally {
      setIsGeneratingAiWrite(false);
    }
  };



  // STAR / UNSTAR EMAIL TOGGLE
  const toggleStarEmail = (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    const nextStarred = !email.starred;

    const updateArr = (arr: Email[]) => (arr || []).map(item => item.id === email.id ? { ...item, starred: nextStarred } : item);

    setEmailsState(prev => ({
      inbox: updateArr(prev.inbox),
      sent: updateArr(prev.sent),
      scheduled: updateArr(prev.scheduled),
      queued: updateArr(prev.queued || [])
    }));
    setDraftsList(updateArr);
    setArchivedList(updateArr);
    setTrashList(updateArr);

    if (selectedEmail && selectedEmail.id === email.id) {
      setSelectedEmail(prev => prev ? { ...prev, starred: nextStarred } : null);
    }

    showToast(nextStarred ? "Starred email" : "Unstarred email", "info", "★");
  };

  // RESTORE EMAIL FROM TRASH TO INBOX
  const handleRestoreFromTrash = (email: Email) => {
    setTrashList(prev => prev.filter(item => item.id !== email.id));
    setEmailsState(prev => ({
      ...prev,
      inbox: [{ ...email, unread: false }, ...prev.inbox]
    }));
    showToast(`Restored "${email.subject || 'message'}" back to Inbox!`, "success", "📥");
    if (logActivity) logActivity("Restored email from trash to inbox", email.subject);
  };

  const handleDeleteEmail = (e: React.MouseEvent | undefined, email: Email) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!email || !email.id) return;

    if (activeFolder === "trash") {
      setConfirmModal({
        title: "Permanently Delete Email",
        message: `Are you sure you want to permanently delete "${email.subject || '(no subject)'}" from Trash? This action cannot be undone.`,
        confirmText: "Permanently Delete",
        confirmVariant: "danger",
        onConfirm: () => {
          setTrashList(prev => prev.filter(item => item.id !== email.id));
          if (selectedEmail?.id === email.id) {
            setSelectedEmail(null);
          }
          showToast("Email permanently removed from Trash.", "success");
          if (logActivity) logActivity("Permanently deleted email from trash", email.subject);
        }
      });
    } else {
      // Move to Trash
      setEmailsState(prev => ({
        inbox: (prev.inbox || []).filter(item => item.id !== email.id),
        sent: (prev.sent || []).filter(item => item.id !== email.id),
        scheduled: (prev.scheduled || []).filter(item => item.id !== email.id),
        queued: (prev.queued || []).filter(item => item.id !== email.id)
      }));

      setDraftsList(prev => prev.filter(item => item.id !== email.id));
      setArchivedList(prev => prev.filter(item => item.id !== email.id));

      setTrashList(prev => [{ ...email }, ...prev]);

      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }

      showToast("Email moved to Trash.", "info", "🗑️");
      if (logActivity) logActivity("Moved email correspondence to Trash", email.subject);
    }
  };

  const handleClearCurrentFolder = () => {
    const currentList = getMailboxEmails();
    if (currentList.length === 0) return;

    setConfirmModal({
      title: `Clear ${activeFolder.toUpperCase()} Folder`,
      message: `Are you sure you want to permanently delete ALL ${currentList.length} emails in the ${activeFolder} folder?`,
      confirmText: "Clear All",
      confirmVariant: "danger",
      onConfirm: () => {
        if (activeFolder === "drafts") {
          setDraftsList([]);
        } else if (activeFolder === "archived") {
          setArchivedList([]);
        } else if (activeFolder === "trash") {
          setTrashList([]);
        } else {
          setEmailsState(prev => {
            const key = activeFolder as keyof typeof prev;
            if (key && prev[key]) {
              return {
                ...prev,
                [key]: []
              };
            }
            return prev;
          });
        }

        setSelectedEmail(null);
        showToast(`Permanently cleared all emails in ${activeFolder} folder.`, "success");
        if (logActivity) logActivity("Cleared email folder", activeFolder);
      }
    });
  };

  const handleSaveSignature = () => {
    inMemoryGmailSignature = signatureText;
    setShowSignatureEdit(false);
    showToast("Broker signature saved successfully!", "success");
  };

  const openReplyCompose = (email: Email) => {
    setIsComposeOpen(true);
    setSelectedClientLink(email.clientId || "");
    setComposeTo(email.from || "");
    setComposeToEmail(email.fromEmail || "");
    const baseSubject = email.subject || "";
    setComposeSubject(baseSubject.startsWith("Re:") ? baseSubject : `Re: ${baseSubject}`);
    const quoted = email.body || email.preview || "";
    setComposeBody(
      `Hi ${email.from || ""},\n\n` +
      `\n\n--- Original message ---\nFrom: ${email.from} <${email.fromEmail}>\nSubject: ${email.subject}\n\n${quoted}`
    );
    setIsScheduled(false);
  };

  // ── CONSTRUCT ACTIVE DIRECTORY (GMAIL STRUCTURE) ──
  const getMailboxEmails = () => {
    if (activeFolder === "inbox") return emailsState.inbox;
    if (activeFolder === "starred") {
      const all = [
        ...emailsState.inbox,
        ...emailsState.sent,
        ...emailsState.scheduled,
        ...(emailsState.queued || []),
        ...draftsList,
        ...archivedList,
        ...trashList
      ];
      const seen = new Set<string>();
      return all.filter(e => {
        if (e && e.starred && !seen.has(e.id)) {
          seen.add(e.id);
          return true;
        }
        return false;
      });
    }
    if (activeFolder === "scheduled") return emailsState.scheduled;
    if (activeFolder === "sent") return emailsState.sent;
    if (activeFolder === "drafts") return draftsList;
    if (activeFolder === "archived") return archivedList;
    if (activeFolder === "trash") return trashList;
    return [];
  };

  const currentEmails = getMailboxEmails();

  // Search filter
  const filteredEmails = currentEmails.filter(email => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (email.from || "").toLowerCase().includes(query) ||
      (email.to || "").toLowerCase().includes(query) ||
      (email.fromEmail || "").toLowerCase().includes(query) ||
      (email.toEmail || "").toLowerCase().includes(query) ||
      (email.subject || "").toLowerCase().includes(query) ||
      (email.preview || "").toLowerCase().includes(query) ||
      (email.body || "").toLowerCase().includes(query) ||
      (email.clientMatch || "").toLowerCase().includes(query)
    );
  });

  // Client matcher engine
  const findClientMatch = (email: Email | null): Client | undefined => {
    if (!email) return undefined;
    const testEmail = (email.fromEmail || email.toEmail || "").toLowerCase();
    const testName = (email.from || email.to || "").toLowerCase();
    
    // First match by exact email fields
    const directMatch = clients.find(c => 
      c.email.toLowerCase() === testEmail || 
      c.coEmail?.toLowerCase() === testEmail
    );
    if (directMatch) return directMatch;

    // Fallback match on client match label
    if (email.clientMatch) {
      const labelMatch = clients.find(c => 
        c.last.toLowerCase().includes(email.clientMatch!.toLowerCase()) ||
        c.first.toLowerCase().includes(email.clientMatch!.toLowerCase())
      );
      if (labelMatch) return labelMatch;
    }

    // Match on content containing first/last names
    const wordMatch = clients.find(c => 
      testName.includes(c.first.toLowerCase()) || 
      testName.includes(c.last.toLowerCase())
    );
    return wordMatch;
  };

  const activeMatchedClient = findClientMatch(selectedEmail);

  // ── CRM SHORTCUT DIRECT CALLS ──

  // LOG TO CLIENT notes
  const handleLogToClientFile = () => {
    if (!selectedEmail) return;
    const matched = findClientMatch(selectedEmail);
    if (!matched) {
      showToast("Cannot Log: No corresponding CRM Client matched to this sender address.", "error");
      return;
    }

    setConfirmModal({
      title: "Log to Client Dossier",
      message: `Log this email chain safely into ${matched.first} ${matched.last}'s Client Dossier Audit Notes?`,
      confirmText: "Log to Dossier",
      confirmVariant: "primary",
      onConfirm: () => {
        const timestamp = new Date().toLocaleString("en-CA");
        const formattedEmailLog = `\n\n------- COMM LINK RECORDED (${timestamp}) -------\nDirection: INBOUND EMAIL\nFrom: ${selectedEmail.from} <${selectedEmail.fromEmail}>\nSubject: ${selectedEmail.subject}\nBody Summary:\n${selectedEmail.body || selectedEmail.preview}\n--------------------------------------------`;

        if (setClients) {
          setClients(prev => prev.map(c => {
            if (c.id === matched.id) {
              const currentSummary = c.aiSummary || "";
              return {
                ...c,
                aiSummary: currentSummary ? `${currentSummary}${formattedEmailLog}` : `Email Link Logged:${formattedEmailLog}`,
                updatedAt: new Date().toISOString()
              };
            }
            return c;
          }));
          showToast(`Recorded communication log into ${matched.first} ${matched.last}'s file dossier!`, "success", "📋");
          if (logActivity) logActivity(`Logged email correspondence to ${matched.first} ${matched.last}`, selectedEmail.subject);
        }
      }
    });
  };

  // OPEN CLIENT CARD OVERLAY
  const handleOpenClientCard = () => {
    if (!selectedEmail) return;
    const matched = findClientMatch(selectedEmail);
    if (!matched) {
      showToast("No matched client to open.", "error");
      return;
    }
    if (onOpenClient) {
      onOpenClient(matched.id);
      showToast(`Showing CRM details for ${matched.first} ${matched.last}...`, "success");
    }
  };

  // TRIGGER CREATE TASK Popover
  const handleOpenTaskWizard = async () => {
    if (!selectedEmail) return;

    const fallbackTitle = `Follow up on: ${selectedEmail.subject}`;
    setTaskWizardTitle(fallbackTitle);
    setTaskWizardPriority("high");
    setTaskWizardNotes(`Transposed from Email received from ${selectedEmail.from} (${selectedEmail.fromEmail}):\n\n"${selectedEmail.preview || selectedEmail.body?.substring(0, 300)}"`);

    const emailBody = selectedEmail.body || selectedEmail.preview || "";

    if (emailBody.trim()) {
      try {
        const promptText = `Extract the main action item and urgency (high/medium/low) from this email: ${emailBody}. Return JSON: {title, priority}.`;
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env.VITE_GEMINI_API_KEY : "");

        let responseText = "";

        if (apiKey && apiKey.trim() !== "" && apiKey !== "undefined") {
          const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptText
          });
          responseText = response.text || "";
        } else {
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: promptText,
              history: []
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to extract task details");
          responseText = data.reply || "";
        }

        let cleaned = responseText.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        }

        let parsed: { title?: string; priority?: string } = {};
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else if (cleaned) {
          parsed = JSON.parse(cleaned);
        }

        if (parsed.title && typeof parsed.title === "string" && parsed.title.trim()) {
          setTaskWizardTitle(parsed.title.trim());
        }

        if (parsed.priority && typeof parsed.priority === "string") {
          const normPriority = parsed.priority.toLowerCase().trim();
          if (normPriority === "high" || normPriority === "medium" || normPriority === "low") {
            setTaskWizardPriority(normPriority as "high" | "medium" | "low");
          }
        }
      } catch (err) {
        console.error("AI task extraction error:", err);
      }
    }

    setIsTaskWizardOpen(true);
  };

  const handleSaveTaskFromWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskWizardTitle) return;

    const matched = findClientMatch(selectedEmail);
    const newTask: Task = {
      id: "ct_" + Date.now(),
      title: taskWizardTitle,
      status: "open",
      priority: taskWizardPriority,
      dueDate: taskWizardDueDate,
      clientId: matched?.id,
      clientName: matched ? `${matched.first} ${matched.last}` : undefined,
      assignedTo: taskWizardAssignee,
      notes: taskWizardNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.first + " " + currentUser.last
    };

    if (setTasks) {
      setTasks(prev => [newTask, ...prev]);
    }

    setIsTaskWizardOpen(false);
    showToast(`Task assigned to ${taskWizardAssignee} from email!`, "success", "✓");
    
    if (logActivity) {
      logActivity(
        `Created follow-up task "${taskWizardTitle}" from inbox item`,
        matched ? `${matched.first} ${matched.last}` : "Unlinked email"
      );
    }
  };

  // TRIGGER EVENT MEETING POPUP WITH AI EXTRACTION
  const handleOpenEventWizard = async () => {
    if (!selectedEmail) return;

    // Set fallback defaults
    const fallbackTitle = `Meeting with ${selectedEmail.from}`;
    const fallbackDate = new Date(Date.now() + 172800000).toISOString().split("T")[0];
    const fallbackTime = "10:00";

    setEventWizardTitle(fallbackTitle);
    setEventWizardDate(fallbackDate);
    setEventWizardTime(fallbackTime);
    setEventWizardNotes(`Inbound Callback request stemming from:\n"${selectedEmail.subject}"`);

    const emailBody = selectedEmail.body || selectedEmail.preview || "";

    if (emailBody.trim()) {
      try {
        const promptText = `Extract meeting date, time, and title from this email: ${emailBody}. Return JSON: {title, date (YYYY-MM-DD), time (HH:MM)}.`;
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env.VITE_GEMINI_API_KEY : "");

        let responseText = "";

        if (apiKey && apiKey.trim() !== "" && apiKey !== "undefined") {
          const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptText
          });
          responseText = response.text || "";
        } else {
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: promptText,
              history: []
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to extract meeting details");
          responseText = data.reply || "";
        }

        let cleaned = responseText.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        }

        let parsed: { title?: string; date?: string; time?: string } = {};
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else if (cleaned) {
          parsed = JSON.parse(cleaned);
        }

        let hasDetails = false;
        if (parsed.title && typeof parsed.title === "string" && parsed.title.trim()) {
          setEventWizardTitle(parsed.title.trim());
          hasDetails = true;
        }
        if (parsed.date && typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date.trim())) {
          setEventWizardDate(parsed.date.trim());
          hasDetails = true;
        }
        if (parsed.time && typeof parsed.time === "string" && parsed.time.trim()) {
          let timeVal = parsed.time.trim();
          if (/^\d{1,2}:\d{2}$/.test(timeVal)) {
            const [h, m] = timeVal.split(":");
            timeVal = `${h.padStart(2, "0")}:${m}`;
          }
          setEventWizardTime(timeVal);
          hasDetails = true;
        }

        if (hasDetails) {
          showToast("AI detected meeting details", "success");
        }
      } catch (err) {
        console.error("AI meeting extraction error:", err);
      }
    }

    setIsEventWizardOpen(true);
  };

  const handleSaveEventFromWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventWizardTitle) return;

    const matched = findClientMatch(selectedEmail);
    const newEvent: Event = {
      id: "ce_" + Date.now(),
      title: eventWizardTitle,
      date: eventWizardDate,
      time: eventWizardTime,
      type: eventWizardType,
      clientId: matched?.id || null,
      notes: eventWizardNotes,
      createdBy: currentUser.first + " " + currentUser.last
    };

    if (setEvents) {
      setEvents(prev => [newEvent, ...prev]);
    }

    setIsEventWizardOpen(false);
    showToast("Event successfully plotted on Calendar!", "success", "📅");

    if (logActivity) {
      logActivity(
        `Scheduled calendar deadline "${eventWizardTitle}" from email`,
        matched ? `${matched.first} ${matched.last}` : "Unlinked email"
      );
    }
  };

  // FILE VERIFICATION AUTO UPLOAD
  const handleSaveAttachmentToVault = (fileName: string, matchedClientId: string, docIndexId: string) => {
    if (!setDocVault || !docVault) {
      showToast("Integration Error: Document vault state missing.", "error");
      return;
    }

    const clientObj = clients.find(c => c.id === matchedClientId);
    const targetClientName = clientObj ? `${clientObj.first} ${clientObj.last}` : "Client File";

    const confirmed = window.confirm(`Import physical attachment file "${fileName}" directly into ${targetClientName}'s CRM folder?`);
    if (!confirmed) return;

    const clientDocs = docVault[matchedClientId] || {};
    const updatedDocs = {
      ...clientDocs,
      [docIndexId]: {
        status: "received",
        path: `gbk-secured-vault://${matchedClientId}/${docIndexId}/${fileName}`,
        notes: `Extracted automatically from Workspace Inbox Attachment`,
        receivedAt: new Date().toISOString()
      }
    };

    setDocVault(prev => ({
      ...prev,
      [matchedClientId]: updatedDocs
    }));

    showToast(`Approved & mapped "${fileName}" inside CRM checklist folder!`, "success", "★");

    if (logActivity) {
      logActivity(`Verified attachment upload: ${fileName} mapped on system checklist`, targetClientName);
    }
  };

  // ── COMPOSE INTERACTION HANDLERS ──

  // Open rich template insert or blank compose
  const handleComposeWithTemplate = (templateId?: string) => {
    setIsComposeOpen(true);
    if (!templateId) {
      setComposeTo("");
      setComposeToEmail("");
      setComposeSubject("");
      setComposeBody("");
      setSelectedClientLink("");
      setIsScheduled(false);
      return;
    }

    const selectedTemplate = MORTGAGE_PREPARED_TEMPLATES.find(t => t.id === templateId) || 
                             templates.find(t => t.id === templateId) || 
                             MORTGAGE_PREPARED_TEMPLATES.find(t => t.id === "m-welcome");

    if (selectedTemplate) {
      let clientObj: Client | undefined;
      if (selectedClientLink) {
        clientObj = clients.find(c => c.id === selectedClientLink);
      } else {
        // Grab first borrower for quick autofill preview
        clientObj = clients[0];
        if (clientObj) setSelectedClientLink(clientObj.id);
      }

      setComposeSubject(selectedTemplate.subject);
      setComposeTo(clientObj ? `${clientObj.first} ${clientObj.last}` : "");
      setComposeToEmail(clientObj ? clientObj.email : "");

      // Compile dynamic template variables
      const formattedBody = applyTemplate(selectedTemplate.body, clientObj, signatureText);
      setComposeBody(formattedBody);
    }
  };

  // Update body in real time when client dropdown fluctuates inside compose modal
  useEffect(() => {
    if (isComposeOpen && selectedClientLink) {
      const activeC = clients.find(cl => cl.id === selectedClientLink);
      if (activeC) {
        setComposeTo(`${activeC.first} ${activeC.last}`);
        setComposeToEmail(activeC.email);
        
        // If subject matches a template, update body
        const isTemplated = MORTGAGE_PREPARED_TEMPLATES.some(t => t.subject === composeSubject) || 
                            templates.some(t => t.subject === composeSubject || composeBody.includes("CRA portal") || composeBody.includes("Notice of Assessment"));
        if (isTemplated) {
          // Re-trigger template fill if possible
          const matchedTemp = MORTGAGE_PREPARED_TEMPLATES.find(t => t.subject === composeSubject) || 
                              templates.find(t => t.subject === composeSubject) || 
                              MORTGAGE_PREPARED_TEMPLATES[0];
          if (matchedTemp) {
            setComposeBody(applyTemplate(matchedTemp.body, activeC, signatureText));
          }
        }
      }
    }
  }, [selectedClientLink, composeSubject]);

  const handleRetrySend = async (email: Email) => {
    const host = localStorage.getItem("gbk_gmail_smtp_host") || smtpHost || "smtp.gmail.com";
    const port = localStorage.getItem("gbk_gmail_smtp_port") || smtpPort || "587";
    const username = localStorage.getItem("gbk_gmail_smtp_username") || smtpUsername || loginEmail;
    const password = localStorage.getItem("gbk_gmail_smtp_password_placeholder") || localStorage.getItem("gbk_gmail_smtp_password") || "";

    if (!host || !port || !username || !password) {
      showToast("Cannot send: Gmail SMTP settings are incomplete in Settings. Please configure host, port, username, and app password.", "error");
      return;
    }

    showToast("Retrying email dispatch via SMTP...", "info");
    const success = await sendEmail({
      to: email.toEmail || "",
      subject: email.subject || "",
      body: email.body || "",
      fromName: `${currentUser?.first || "David"} ${currentUser?.last || "Acosta"}`,
      fromEmail: smtpUsername || loginEmail,
      host,
      port,
      username,
      password
    });

    if (success) {
      setEmailsState(prev => ({
        ...prev,
        queued: (prev.queued || []).filter(item => item.id !== email.id),
        sent: [
          { 
            ...email, 
            id: "mail_" + Date.now(), 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            date: "Today" 
          }, 
          ...prev.sent
        ]
      }));

      showToast("Email dispatched successfully on SMTP retry!", "success");
      setSelectedEmail(null);
      if (logActivity) logActivity(`Dispatched queued email via SMTP retry`, email.subject);
    } else {
      showToast("Retry failed. Check SMTP settings or connection status.", "error");
    }
  };

  // SAVE DRAFT FUNCTION
  const handleSaveDraft = () => {
    if (!composeSubject && !composeBody && !composeToEmail) {
      showToast("Nothing to save in draft.", "error");
      return;
    }
    const draftItem: Email = {
      id: "dr_" + Date.now(),
      from: `${currentUser?.first || "David"} ${currentUser?.last || "Acosta"}`,
      fromEmail: loginEmail,
      to: composeTo || composeToEmail || "Unspecified recipient",
      toEmail: composeToEmail,
      subject: composeSubject || "(Draft)",
      body: composeBody,
      preview: composeBody ? composeBody.substring(0, 100) + "..." : "Draft message...",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: "Today",
      unread: false,
      clientId: selectedClientLink
    };

    setDraftsList(prev => [draftItem, ...prev]);
    setIsComposeOpen(false);
    showToast("Saved message as Draft", "success", "📝");
    if (logActivity) logActivity("Saved email draft", draftItem.subject);
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).map((file: File) => ({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB"
      }));
      setComposeAttachments(prev => [...prev, ...filesArray]);
      showToast(`Attached ${filesArray.length} file(s)`, "success", "📎");
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // EXECUTE DISPATCH EMAIL
  const handleSendComposeCommit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!composeToEmail || !composeSubject || !composeBody) {
      showToast("Please fill in Recipient, Subject, and Content body block.", "error");
      return;
    }

    const host = localStorage.getItem("gbk_gmail_smtp_host") || smtpHost || "smtp.gmail.com";
    const port = localStorage.getItem("gbk_gmail_smtp_port") || smtpPort || "587";
    const username = localStorage.getItem("gbk_gmail_smtp_username") || smtpUsername || loginEmail;
    const password = localStorage.getItem("gbk_gmail_smtp_password_placeholder") || localStorage.getItem("gbk_gmail_smtp_password") || "";

    if (!host || !port || !username || !password) {
      showToast("Cannot send: Gmail SMTP settings are incomplete in Settings. Please configure host, port, username, and app password.", "error");
      return;
    }

    const newEmailId = "mail_" + Date.now();
    const newMailRecord: Email = {
      id: newEmailId,
      from: `${currentUser?.first || "David"} ${currentUser?.last || "Acosta"}`,
      fromEmail: smtpUsername || loginEmail,
      to: composeTo || composeToEmail,
      toEmail: composeToEmail,
      subject: composeSubject,
      body: composeBody,
      preview: composeBody.substring(0, 100) + "...",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: "Today",
      unread: false,
      clientId: selectedClientLink
    };

    if (isScheduled) {
      if (!scheduleSendTime) {
        showToast("Please select a targeted datetime queue.", "error");
        return;
      }
      newMailRecord.scheduledFor = scheduleSendTime;
      
      // Save to scheduled registry
      setEmailsState(prev => ({
        ...prev,
        scheduled: [newMailRecord, ...prev.scheduled]
      }));

      showToast(`Campaign queue created! Sending at ${scheduleSendTime.replace("T", " ")}`, "success", "⏰");
      if (logActivity) logActivity(`Scheduled automated outreach email queue`, composeSubject);
      setIsComposeOpen(false);
    } else {
      showToast("Sending email via secure SMTP...", "info");
      const success = await sendEmail({
        to: composeToEmail,
        subject: composeSubject,
        body: composeBody,
        fromName: `${currentUser?.first || "David"} ${currentUser?.last || "Acosta"}`,
        fromEmail: smtpUsername || loginEmail,
        host,
        port,
        username,
        password
      });

      if (success) {
        setEmailsState(prev => ({
          ...prev,
          sent: [newMailRecord, ...prev.sent]
        }));

        // AUTO-LOG OPT-IN Option: Automatically add email contents to Client Dossier Note immediately on outbound
        if (selectedClientLink && setClients) {
          setClients(prev => prev.map(c => {
            if (c.id === selectedClientLink) {
              const currentSummary = c.aiSummary || "";
              const formattedLog = `\n\n------- COMM LINK RECORDED (${new Date().toLocaleString("en-CA")}) -------\nDirection: OUTBOUND EMAIL\nSent By: ${currentUser?.first || "David"} ${currentUser?.last || "Acosta"} via ${smtpUsername || loginEmail}\nTo: ${newMailRecord.to} <${newMailRecord.toEmail}>\nSubject: ${newMailRecord.subject}\nBody Segment:\n${newMailRecord.body}\n--------------------------------------------`;
              return {
                ...c,
                aiSummary: `${currentSummary}${formattedLog}`,
                updatedAt: new Date().toISOString()
              };
            }
            return c;
          }));
          showToast(`Dispatched! Message logged to ${composeTo}'s CRM Dossier file!`, "success", "🚀");
        } else {
          showToast("Email dispatched successfully!", "success", "🚀");
        }

        if (logActivity) logActivity(`Dispatched outbound email template`, composeSubject);
        setIsComposeOpen(false);
      } else {
        showToast("Failed to send email via SMTP. Check SMTP configurations or connection.", "error");
      }
    }
  };

  // DELETE OR ARCHIVE EMAIL
  const handleArchiveEmail = (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    if (!email) return;

    setConfirmModal({
      title: "Archive Communication",
      message: `Safely archive "${email.subject || '(no subject)'}" into secure storage?`,
      confirmText: "Archive Email",
      confirmVariant: "primary",
      onConfirm: () => {
        setEmailsState(prev => {
          const key = activeFolder as keyof typeof prev;
          if (key && prev[key]) {
            return {
              ...prev,
              [key]: prev[key].filter(item => item.id !== email.id)
            };
          }
          return prev;
        });

        setArchivedList(prev => [email, ...prev]);
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(null);
        }
        showToast("Message archived securely.", "success");
      }
    });
  };

  const applyTemplate = (templateBody: string, client?: Client, signature?: string) => {
    let body = templateBody;
    if (client) {
      body = body.replace(/\{\{first\}\}/g, client.first || "");
      body = body.replace(/\{\{lender\}\}/g, client.lender || "TD Canada Trust");
      body = body.replace(/\{\{amount\}\}/g, client.mtgamt ? `$${Number(client.mtgamt).toLocaleString("en-CA")}` : "$550,000");
      const rateVal = client.appData?.rate || "4.79";
      body = body.replace(/\{\{rate\}\}/g, rateVal);
    } else {
      body = body.replace(/\{\{first\}\}/g, "Client");
      body = body.replace(/\{\{lender\}\}/g, "[Lender Name]");
      body = body.replace(/\{\{amount\}\}/g, "[Mortgage Amount]");
      body = body.replace(/\{\{rate\}\}/g, "[Rate]");
    }
    body = body.replace(/\{\{signature\}\}/g, signature || `${currentUser.first} ${currentUser.last}\nGBK Financial Brokerage`);
    return body;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text)]">
      
      {/* ── CENTRAL TWO-COLUMN CONTAINER ── */}
      <div className="flex-1 flex gap-4 min-h-0">
        
        {/* ── LEFT SIDEBAR (FOLDERS & ACTIONS) ── */}
        <div className="w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex flex-col p-3 overflow-y-auto gap-2 shrink-0 select-none shadow-lg">
          <button 
            onClick={() => handleComposeWithTemplate()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition-all mb-2 flex items-center justify-center gap-1.5 shadow-md shadow-red-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Compose Message
          </button>

          {/* ── SMALL SMTP STATUS BADGE ── */}
          <div className="mb-2 p-2 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-lg text-xs">
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[10px] truncate" title={`SMTP Active — ${smtpUsername || loginEmail}`}>
                <span className="shrink-0 text-xs">✅</span>
                <span className="truncate">SMTP Active — {smtpUsername || loginEmail}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-400 font-semibold text-[10px] truncate">
                <span className="shrink-0 text-xs">⚠️</span>
                <span className="truncate">SMTP Not Configured —</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateSettings) {
                      onNavigateSettings();
                    } else {
                      window.dispatchEvent(new CustomEvent("gbk_navigate", { detail: "settings" }));
                    }
                  }}
                  className="underline hover:text-amber-300 cursor-pointer font-bold shrink-0 ml-0.5"
                >
                  Go to Settings
                </button>
              </div>
            )}
          </div>

          <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--color-text-muted)] mb-1 px-1">Directory Folders</span>
          {[
            { id: "inbox", label: "Inbox", count: emailsState.inbox.filter(e => e.unread).length, icon: Mail },
            { id: "starred", label: "Starred", count: getMailboxEmails().filter(e => e.starred).length, icon: Star },
            { id: "scheduled", label: "Snoozed & Scheduled", count: emailsState.scheduled.length, icon: Clock },
            { id: "sent", label: "Sent", count: emailsState.sent.length, icon: Send },
            { id: "drafts", label: "Drafts", count: draftsList.length, icon: FileText },
            { id: "archived", label: "Archive", count: archivedList.length, icon: Archive },
            { id: "trash", label: "Trash", count: trashList.length, icon: Trash2 }
          ].map(f => {
            const Icon = f.icon;
            const isActive = activeFolder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setActiveFolder(f.id); setSelectedEmail(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${isActive ? "bg-red-600/10 text-red-400 border-red-500/10 font-bold" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] border-transparent"}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{f.label}</span>
                </div>
                {f.count > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600/20 text-red-300">
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}



          {/* Pre-Automated Mortgage Email Templates Accelerator */}
          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <span className="block text-[9px] uppercase font-bold tracking-wider text-[var(--color-text-muted)] mb-2 px-1 flex items-center gap-1 font-sans">
              ⚡ Pre-Automated Outlines
            </span>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              {MORTGAGE_PREPARED_TEMPLATES.map((mt) => (
                <button
                  key={mt.id}
                  onClick={() => handleComposeWithTemplate(mt.id)}
                  className="w-full text-left px-2 py-1.5 rounded bg-[var(--color-surface-2)]/20 hover:bg-red-600/10 border border-[var(--color-border)] hover:border-red-500/20 text-[10px] text-[var(--color-text-muted)] hover:text-red-300 transition-all flex flex-col gap-0.5 group cursor-pointer"
                  title={mt.desc}
                >
                  <span className="font-semibold truncate group-hover:text-red-400">{mt.name}</span>
                  <span className="text-[8px] text-[var(--color-text-faint)] truncate">{mt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email Signature Module */}
          <div className="mt-auto border-t border-[var(--color-border)] pt-3">
            <button 
              onClick={() => setShowSignatureEdit(!showSignatureEdit)}
              className="w-full text-left text-[10px] text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <Sliders className="w-3 h-3" /> Customize Signature
            </button>
            {showSignatureEdit && (
              <div className="mt-2 flex flex-col gap-1.5">
                <textarea 
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-1 text-[10px] font-mono text-[var(--color-text)] h-24 focus:outline-none"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                />
                <button 
                  onClick={handleSaveSignature}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 text-[var(--color-text)] text-[9px] font-semibold py-1 rounded cursor-pointer"
                >
                  ✓ Update Signature
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTRAL COLUMN (EMAIL DIRECTORY SEARCH & LIST) ── */}
        <div className="w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex flex-col min-h-0 shrink-0 overflow-hidden shadow-lg">
          <div className="p-3 border-b border-[var(--color-border)] flex flex-col gap-2 bg-[var(--color-surface-2)]/20 select-none">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] capitalize">{activeFolder} Folder</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold">Qty: {filteredEmails.length}</span>
                {filteredEmails.length > 0 && (
                  <button
                    onClick={handleClearCurrentFolder}
                    className="text-[9px] text-red-500 hover:text-red-700 hover:underline cursor-pointer font-bold uppercase"
                    title="Permanently delete all emails in this folder"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search correspondence..." 
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-red-600 w-full font-sans shadow-inner placeholder-[var(--color-text-faint)]"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredEmails.length > 0 ? filteredEmails.map((e) => {
              const matchedC = findClientMatch(e);
              const initials = (e.from || e.to || "?").split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
              const isSelected = selectedEmail?.id === e.id;
              
              return (
                <div 
                  key={e.id}
                  onClick={() => {
                    setSelectedEmail(e);
                    // Mock mark unread read
                    if (e.unread) {
                      e.unread = false;
                    }
                  }}
                  className={`flex flex-col p-3.5 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-2)] transition-all select-none ${isSelected ? "bg-[var(--color-surface-3)] border-l-2 border-l-red-500" : ""} ${e.unread ? "bg-red-500/5" : ""}`}
                >
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <span className={`text-xs truncate max-w-[140px] ${e.unread ? "font-bold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                      {activeFolder === "sent" ? `To: ${e.to}` : e.from}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-[var(--color-text-faint)] font-mono">{e.time}</span>
                      <button
                        onClick={(event) => toggleStarEmail(event, e)}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${e.starred ? "text-amber-400 hover:text-amber-300" : "text-[var(--color-text-faint)] hover:text-amber-400"}`}
                        title={e.starred ? "Unstar message" : "Star message"}
                      >
                        <Star className={`w-3 h-3 ${e.starred ? "fill-amber-400" : ""}`} />
                      </button>
                      {activeFolder === "trash" && (
                        <button
                          onClick={(event) => { event.stopPropagation(); handleRestoreFromTrash(e); }}
                          className="text-[var(--color-text-faint)] hover:text-emerald-400 p-0.5 rounded hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="Restore email to Inbox"
                        >
                          <Inbox className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(event) => handleDeleteEmail(event, e)}
                        className="text-[var(--color-text-faint)] hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-500/10 cursor-pointer"
                        title={activeFolder === "trash" ? "Permanently delete email" : "Move to Trash"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className={`text-xs truncate ${e.unread ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                    {e.subject || "(no subject)"}
                  </div>
                  
                  <div className="text-[10px] text-[var(--color-text-muted)] truncate mt-1">
                    {e.preview || e.body || ""}
                  </div>

                  {/* AUTO MATCHED BADGE ELEMENT */}
                  {matchedC && (
                    <div className="mt-2 flex items-center justify-between text-[8px] bg-red-950/20 text-red-300 border border-red-900/45 px-1.5 py-0.5 rounded w-max select-none">
                      <span className="font-semibold flex items-center gap-1">
                        <User className="w-2.5 h-2.5" /> Link Mapped: {matchedC.first} {matchedC.last}
                      </span>
                    </div>
                  )}
                  
                  {e.scheduledFor && (
                    <div className="mt-2 flex items-center gap-1 text-[8px] text-[var(--color-accent)] font-mono select-none">
                      <Clock className="w-2.5 h-2.5" /> Queue: {e.scheduledFor.replace("T", " ")}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-[var(--color-text-faint)] gap-3">
                <MailOpen className="w-8 h-8 opacity-40 shrink-0" />
                <span>No emails match filters.</span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (DETAILED CONTENT & CRM ACTIONS ACTION-SHORTCUTS) ── */}
        <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex flex-col min-h-0 overflow-y-auto shadow-lg relative">
          
          {selectedEmail ? (
            <div className="flex-grow flex flex-col min-h-0">
              
              {/* DETAIL ACTIONS HEADER PANEL */}
              <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/35 sticky top-0 bg-[var(--color-surface)] z-10 flex flex-wrap items-center justify-between gap-2.5 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="px-2 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" /> List
                  </button>
                  <span className="text-[10px] font-mono text-[var(--color-accent)] tracking-wider select-none bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10 px-1.5 py-0.5 rounded font-bold">
                    ID: {selectedEmail.id}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeFolder === "queued" ? (
                    <button 
                      onClick={() => handleRetrySend(selectedEmail)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500/20 rounded text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Send
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => selectedEmail && openReplyCompose(selectedEmail)}
                        className="px-2 py-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                      <button 
                        onClick={(e) => handleArchiveEmail(e, selectedEmail)}
                        className="px-2 py-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-3)]/80 border border-[var(--color-border)] rounded text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
                        title="Archive communication log"
                      >
                        <Archive className="w-3 h-3" /> Archive
                      </button>
                      <button 
                        onClick={(e) => selectedEmail && handleDeleteEmail(e, selectedEmail)}
                        className="px-2 py-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer"
                        title="Permanently delete email"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" /> Delete
                      </button>
                      <button
                        onClick={() => {
                          if (!selectedEmail) return;
                          const updateArr = (arr: Email[]) => (arr || []).map(item => item.id === selectedEmail.id ? { ...item, unread: true } : item);
                          setEmailsState(prev => ({
                            inbox: updateArr(prev.inbox),
                            sent: updateArr(prev.sent),
                            scheduled: updateArr(prev.scheduled),
                            queued: updateArr(prev.queued || [])
                          }));
                          setDraftsList(updateArr);
                          setArchivedList(updateArr);
                          setTrashList(updateArr);
                          setSelectedEmail(prev => prev ? { ...prev, unread: true } : null);
                        }}
                        className="px-2 py-1 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
                      >
                        <MailOpen className="w-3 h-3" /> Mark unread
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* CRM WORKFLOW ACTION SIDEBAR SHORTCUTS */}
              <div className="bg-red-500/5 border-b border-red-500/10 p-3 select-none">
                <span className="block text-[8px] tracking-wider uppercase font-bold text-red-400 mb-2">
                  🛡 COMM DESK INTEGRATION SHORTCUTS (ACTIVE OPERATIONAL WORKFLOW)
                </span>
                
                <div className="flex flex-wrap gap-2">
                  {/* Action 1: Log message to dossier */}
                  <button 
                    onClick={handleLogToClientFile}
                    className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] px-2.5 py-1.5 rounded text-[10px] font-semibold flex items-center gap-1.5 shadow-md shadow-black/30 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" /> Log to Dossier
                  </button>

                  {/* Action 2: Open client in full screen */}
                  {activeMatchedClient ? (
                    <button 
                      onClick={handleOpenClientCard}
                      className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] px-2.5 py-1.5 rounded text-[10px] font-semibold flex items-center gap-1.5 shadow-md shadow-black/30 transition-all cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Open File Folder ({activeMatchedClient.last})
                    </button>
                  ) : null}

                  {/* Action 3: Create Task */}
                  <button 
                    onClick={handleOpenTaskWizard}
                    className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] px-2.5 py-1.5 rounded text-[10px] font-semibold flex items-center gap-1.5 shadow-md shadow-black/30 transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Create CRM Task
                  </button>

                  {/* Action 4: Create Event */}
                  <button 
                    onClick={handleOpenEventWizard}
                    className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] px-2.5 py-1.5 rounded text-[10px] font-semibold flex items-center gap-1.5 shadow-md shadow-black/30 transition-all cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-400" /> Calendar Meeting
                  </button>

                  {/* Action 5: Mock Quick SMS out */}
                  {activeMatchedClient?.cell && (
                    <button 
                      onClick={() => {
                        const smsMsg = window.prompt(`Type follow-up SMS message to send directly to matched mobile ${activeMatchedClient.cell}:`, `Hi ${activeMatchedClient.first}, got your email! Appulating underwriter conditions check sheet now. - David`);
                        if (smsMsg) {
                          showToast(`Direct SMS outreach sent to ${activeMatchedClient.first}!`, "success", "💬");
                          if (logActivity) logActivity(`Dispatched out SMS ping to borrower`, activeMatchedClient.first);
                        }
                      }}
                      className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] px-2.5 py-1.5 rounded text-[10px] font-semibold flex items-center gap-1.5 shadow-md shadow-black/30 transition-all hover:border-red-500/25 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400" /> Mobile SMS
                    </button>
                  )}

                  {/* Action 6: AI Summarize */}
                  <button 
                    onClick={handleSummarizeEmail}
                    disabled={isSummarizing}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded text-[10px] font-bold flex items-center gap-1.5 shadow-md shadow-black/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSummarizing ? (
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    AI Summarize
                  </button>
                </div>
              </div>

              {/* EMAIL BODY CONTENT AREA */}
              <div className="p-6 flex-grow overflow-auto">
                <h2 className="text-base font-bold text-[var(--color-text)] mb-2 leading-tight">
                  {selectedEmail.subject || "(no subject)"}
                </h2>
                
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 mb-4 select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center font-bold text-xs text-red-400">
                      {(selectedEmail.from || selectedEmail.to || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text)]">{selectedEmail.from || "Greg Brown"}</h4>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{selectedEmail.fromEmail || loginEmail || "VDacosta247@gmail.com"}</p>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono text-right select-none">
                    <div>Time: {selectedEmail.time}</div>
                    <div className="mt-0.5">{selectedEmail.date}</div>
                  </div>
                </div>

                {/* Main Text Body */}
                <div className="text-xs text-[var(--color-text)] leading-relaxed whitespace-pre-wrap font-sans bg-[var(--color-surface-2)]/30 p-4 rounded-xl border border-[var(--color-border)]">
                  {selectedEmail.body || selectedEmail.preview || "No transcript content."}
                </div>

                {/* ── COLLAPSIBLE AI SUMMARY PANEL ── */}
                {showSummaryPanel && (
                  <div className="mt-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl transition-all select-none">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/20">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>AI Email Summary</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSummaryPanel(false)}
                        className="text-[10px] text-amber-400/80 hover:text-amber-300 font-semibold px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors cursor-pointer"
                      >
                        Collapse
                      </button>
                    </div>

                    {isSummarizing ? (
                      <div className="flex items-center gap-2 text-xs text-amber-300/90 py-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                        <span>Generating summary for mortgage broker CRM...</span>
                      </div>
                    ) : summaryError ? (
                      <div className="text-xs text-red-400 py-1 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                        <div>
                          <span>{summaryError}</span>
                          <button
                            onClick={handleSummarizeEmail}
                            className="block mt-1 text-[10px] font-bold underline hover:text-red-300 cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    ) : summaryText ? (
                      <p className="text-xs text-[var(--color-text)] leading-relaxed whitespace-pre-wrap select-text">
                        {summaryText}
                      </p>
                    ) : null}
                  </div>
                )}

                {/* ── SMART REPLIES ROW ── */}
                <div className="mt-4 pt-3 border-t border-[var(--color-border)]/60 select-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Smart Replies
                    </span>
                    {isGeneratingSmartReplies && (
                      <span className="text-[10px] text-amber-400/80 flex items-center gap-1 font-mono">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Generating AI replies...
                      </span>
                    )}
                  </div>

                  {isGeneratingSmartReplies ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-16 bg-[var(--color-surface-2)]/50 rounded-xl border border-[var(--color-border)] animate-pulse p-2.5 flex flex-col justify-center gap-1.5">
                          <div className="h-2.5 bg-amber-500/20 rounded w-3/4"></div>
                          <div className="h-2 bg-[var(--color-text-muted)]/20 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : smartReplies.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {smartReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSmartReply(reply)}
                          className="p-3 bg-[var(--color-surface-2)]/60 hover:bg-amber-500/10 border border-[var(--color-border)] hover:border-amber-500/40 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between"
                          title="Click to compose reply"
                        >
                          <p className="text-xs text-[var(--color-text)] group-hover:text-amber-200 line-clamp-3 leading-snug">
                            "{reply}"
                          </p>
                          <div className="mt-2 text-[9px] font-bold uppercase tracking-wider text-amber-400/80 flex items-center gap-1 group-hover:text-amber-300">
                            <span>Use Reply</span>
                            <span className="text-[11px]">→</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFetchSmartReplies()}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 underline cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate Smart Replies
                    </button>
                  )}
                </div>

                {/* ── ATTACHMENTS VAULT SECTION ── */}
                <div className="mt-6 border-t border-[var(--color-border)] pt-4 select-none">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-red-400 mb-3 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" /> Extracted Secure Email Attachments ({selectedEmail.attachments?.length || 0} {selectedEmail.attachments?.length === 1 ? "File" : "Files"})
                  </span>

                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selectedEmail.attachments.map((doc, idx) => {
                        const fileLabel = doc.label || doc.name || doc.filename || `Attachment_${idx + 1}.pdf`;
                        const fileSize = doc.size || "Secured Stream";
                        const extCode = doc.extCode || doc.id || `doc_${idx}`;
                        const targetClientId = activeMatchedClient?.id || selectedEmail.clientId || "c_smith";
                        const isAlreadyMapped = docVault[targetClientId]?.[extCode]?.status === "received";

                        return (
                          <div key={doc.id || idx} className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                <div className="text-xs font-semibold text-[var(--color-text)]">{fileLabel}</div>
                                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-mono">Secured Vault Stream • {fileSize}</div>
                              </div>
                            </div>

                            <button 
                              onClick={() => handleSaveAttachmentToVault(fileLabel, targetClientId, extCode)}
                              className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border transition-all cursor-pointer ${isAlreadyMapped ? "bg-emerald-950/20 text-emerald-400 border-emerald-900" : "bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 border-[var(--color-accent)]/20 text-[var(--color-accent)]"}`}
                            >
                              {isAlreadyMapped ? "✓ Imported & Mapped in CRM" : "📁 Save to CRM Dossier"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] italic">
                      No attachments detected in this message.
                    </p>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 select-none text-white/30 text-center">
              <MailOpen className="w-12 h-12 opacity-30 mb-3 text-white" />
              <h3 className="text-sm font-semibold mb-1">No Message Selected</h3>
              <p className="text-[11px] max-w-sm leading-relaxed text-white/40">
                Pick a communication record thread from the sidebar list catalog to read headers, attachments, and trigger integrated workflow loggers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── COMPOSE EMAIL DIALOG MODAL OVERLAY (GMAIL PARITY) ── */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-[var(--glass-bg)] backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-4xl p-5 shadow-2xl relative flex flex-col max-h-[92vh]">
            <button 
              onClick={() => setIsComposeOpen(false)} 
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-bold p-1 hover:bg-[var(--color-surface-2)] rounded text-xs cursor-pointer z-10"
            >
              ✕
            </button>
            
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-3 border-b border-[var(--color-border)] pb-2.5 flex items-center gap-1.5 shrink-0">
              <Send className="w-4 h-4 text-red-500" /> New Outbound Message
            </h3>

            <form onSubmit={handleSendComposeCommit} className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 min-h-0 pr-1">
              
              {/* LEFT COLUMN: METADATA FIELDS */}
              <div className="flex flex-col gap-3">
                
                {/* From Account */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">
                    From Account
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text)] font-semibold truncate max-w-[180px]">
                    {loginEmail}
                  </span>
                </div>

                {/* CRM Client Search Combobox */}
                <div className="relative">
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">
                    Link CRM Client (Optional)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={clientSearchQuery || (clients.find(c => c.id === selectedClientLink) ? `${clients.find(c => c.id === selectedClientLink)?.first} ${clients.find(c => c.id === selectedClientLink)?.last}` : "")}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Search client by name or email..."
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50 pr-7"
                    />
                    {(clientSearchQuery || selectedClientLink) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientLink("");
                          setClientSearchQuery("");
                          setShowClientDropdown(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-bold p-0.5"
                        title="Clear client selection"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Combobox Dropdown */}
                  {showClientDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowClientDropdown(false)} 
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 divide-y divide-[var(--color-border)]/50">
                        {clients
                          .filter(cl => {
                            const q = clientSearchQuery.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              cl.first.toLowerCase().includes(q) ||
                              cl.last.toLowerCase().includes(q) ||
                              cl.email.toLowerCase().includes(q)
                            );
                          })
                          .map(cl => (
                            <div 
                              key={cl.id}
                              onClick={() => {
                                setSelectedClientLink(cl.id);
                                setClientSearchQuery(`${cl.first} ${cl.last}`);
                                setShowClientDropdown(false);
                                if (!composeTo) setComposeTo(`${cl.first} ${cl.last}`);
                                if (!composeToEmail) setComposeToEmail(cl.email);
                              }}
                              className="p-2 hover:bg-[var(--color-surface-2)] cursor-pointer text-xs flex items-center justify-between transition-colors"
                            >
                              <div>
                                <div className="font-semibold text-[var(--color-text)]">{cl.first} {cl.last}</div>
                                <div className="text-[10px] text-[var(--color-text-muted)]">{cl.email}</div>
                              </div>
                              {selectedClientLink === cl.id && (
                                <span className="text-[10px] text-emerald-400 font-bold">Linked</span>
                              )}
                            </div>
                          ))}
                        {clients.filter(cl => {
                          const q = clientSearchQuery.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            cl.first.toLowerCase().includes(q) ||
                            cl.last.toLowerCase().includes(q) ||
                            cl.email.toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <div className="p-2.5 text-xs text-[var(--color-text-muted)] italic">
                            No matching clients found
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Linked Badge */}
                  {selectedClientLink && (
                    <div className="mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <span>✅ Linked:</span>
                      <span>
                        {clients.find(c => c.id === selectedClientLink)
                          ? `${clients.find(c => c.id === selectedClientLink)?.first} ${clients.find(c => c.id === selectedClientLink)?.last}`
                          : selectedClientLink}
                      </span>
                    </div>
                  )}
                </div>

                {/* Priority Flag Selector */}
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">
                    Priority Urgency
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setComposePriority("urgent")}
                      className={`flex-1 py-1 px-2 text-xs rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer ${
                        composePriority === "urgent"
                          ? "bg-red-500/20 text-red-400 border-red-500/50 shadow-sm"
                          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
                      }`}
                      title="Urgent Priority"
                    >
                      🔴 <span className="text-[10px]">Urgent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposePriority("normal")}
                      className={`flex-1 py-1 px-2 text-xs rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer ${
                        composePriority === "normal"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm"
                          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
                      }`}
                      title="Normal Priority"
                    >
                      🟡 <span className="text-[10px]">Normal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposePriority("low")}
                      className={`flex-1 py-1 px-2 text-xs rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer ${
                        composePriority === "low"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm"
                          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
                      }`}
                      title="Low Priority"
                    >
                      🟢 <span className="text-[10px]">Low</span>
                    </button>
                  </div>
                </div>

                {/* Fast Response Template */}
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Fast Response Template</label>
                  <select 
                    onChange={(e) => handleComposeWithTemplate(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/45 rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                  >
                    <option value="">-- Choose Campaign Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Recipient Coordinates & Cc/Bcc toggles */}
                <div className="flex flex-col gap-2 shrink-0 bg-[var(--color-surface-2)]/30 p-2.5 rounded-xl border border-[var(--color-border)]">
                  {/* Header row: label + Cc/Bcc toggles */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider">Recipients</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowCc(!showCc)}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer border ${showCc ? "bg-red-600/10 text-red-400 border-red-500/20" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] border-transparent"}`}
                      >
                        Cc
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBcc(!showBcc)}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer border ${showBcc ? "bg-red-600/10 text-red-400 border-red-500/20" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] border-transparent"}`}
                      >
                        Bcc
                      </button>
                    </div>
                  </div>
                  {/* To Name - full width */}
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-0.5 tracking-wider">To Name</label>
                    <input
                      type="text"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="E.g. David Martinez"
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                  {/* To Email - full width */}
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-0.5 tracking-wider">To Email *</label>
                    <input
                      type="email"
                      value={composeToEmail}
                      onChange={(e) => setComposeToEmail(e.target.value)}
                      required
                      placeholder="E.g. borrower@example.com"
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                  {/* Optional Cc input */}
                  {showCc && (
                    <div className="animate-fade-in">
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-0.5 tracking-wider">Cc Email</label>
                      <input
                        type="email"
                        value={composeCc}
                        onChange={(e) => setComposeCc(e.target.value)}
                        placeholder="E.g. lawyer@realestatellp.com"
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-red-500/50"
                      />
                    </div>
                  )}
                  {/* Optional Bcc input */}
                  {showBcc && (
                    <div className="animate-fade-in">
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-0.5 tracking-wider">Bcc Email</label>
                      <input
                        type="email"
                        value={composeBcc}
                        onChange={(e) => setComposeBcc(e.target.value)}
                        placeholder="E.g. archive@example.com"
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-red-500/50"
                      />
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold mb-0.5 tracking-wider">Subject Title *</label>
                  <input 
                    type="text" 
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    required
                    placeholder="Subject title..."
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] focus:outline-none focus:border-red-500/50"
                  />
                </div>

                {/* Campaign Schedule Toggle */}
                <div className="p-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="scheduleToggle" 
                        checked={isScheduled} 
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className="rounded text-red-500 bg-[var(--color-surface)] border-[var(--color-border)]/15 cursor-pointer"
                      />
                      <label htmlFor="scheduleToggle" className="text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer select-none flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Schedule Delivery
                      </label>
                    </div>
                  </div>

                  {isScheduled && (
                    <input 
                      type="datetime-local" 
                      value={scheduleSendTime}
                      onChange={(e) => setScheduleSendTime(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] text-[var(--color-text)] focus:outline-none font-mono"
                    />
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: FULL-HEIGHT MESSAGE BODY & ACTIONS */}
              <div className="flex flex-col gap-2 min-h-[380px] h-full border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface-2)]/30">
                
                {/* Rich Toolbar */}
                <div className="flex items-center justify-between p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 text-xs rounded-t-lg shrink-0">
                  <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                    <label className="px-2 py-1 hover:bg-[var(--color-surface-3)] rounded hover:text-[var(--color-text)] cursor-pointer flex items-center gap-1 text-[10px] font-medium" title="Attach file">
                      <Paperclip className="w-3.5 h-3.5 text-red-400" /> Attach
                      <input type="file" multiple onChange={handleAttachmentChange} className="hidden" />
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setComposeBody(prev => prev + `\n\n${signatureText}`)}
                      className="px-2 py-1 hover:bg-[var(--color-surface-3)] rounded hover:text-[var(--color-text)] cursor-pointer flex items-center gap-1 text-[10px] font-medium" 
                      title="Insert Signature"
                    >
                      <Sliders className="w-3.5 h-3.5 text-blue-400" /> Signature
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAiWritePopup(prev => !prev);
                        setAiWriteError(null);
                      }}
                      className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded cursor-pointer flex items-center gap-1 text-[10px] font-bold transition-all" 
                      title="AI Email Writer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Write
                    </button>
                  </div>
                  <span className="text-[9px] text-[var(--color-text-faint)] font-mono">Gmail Rich Composer</span>
                </div>

                {/* AI Write Instruction Popup */}
                {showAiWritePopup && (
                  <div className="p-2.5 bg-amber-500/10 border-b border-[var(--color-border)] flex flex-col gap-2 text-xs select-none rounded-lg shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Email Writer Prompt
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAiWritePopup(false)}
                        className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="E.g., Ask client for missing NOA documents..."
                        value={aiWriteInstruction}
                        onChange={(e) => setAiWriteInstruction(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAiWriteSubmit();
                          }
                        }}
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={handleAiWriteSubmit}
                        disabled={isGeneratingAiWrite || !aiWriteInstruction.trim()}
                        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                      >
                        {isGeneratingAiWrite ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Writing...
                          </>
                        ) : (
                          "Generate"
                        )}
                      </button>
                    </div>
                    {aiWriteError && (
                      <div className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {aiWriteError}
                      </div>
                    )}
                  </div>
                )}

                {/* Textarea expanding to fill available vertical space */}
                <textarea 
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  placeholder="Write message body here..."
                  className="w-full flex-grow min-h-[320px] bg-transparent p-3 text-xs text-[var(--color-text)] focus:outline-none font-sans leading-relaxed resize-none border border-[var(--color-border)]/60 rounded-lg bg-[var(--color-surface)]/40"
                />

                {/* Attachments chips display */}
                {composeAttachments.length > 0 && (
                  <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap gap-1.5 rounded-b-lg shrink-0">
                    {composeAttachments.map((att, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] text-[var(--color-text)] px-2 py-0.5 rounded-full font-mono">
                        <Paperclip className="w-3 h-3 text-emerald-400" />
                        {att.name} ({att.size})
                        <button type="button" onClick={() => handleRemoveAttachment(i)} className="text-red-400 hover:text-red-300 ml-1 font-bold cursor-pointer">✕</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Live Word / Character Counter */}
                <div className="flex justify-end items-center text-[9px] text-[var(--color-text-muted)] font-mono px-1 shrink-0">
                  Words: {composeBody.trim() ? composeBody.trim().split(/\s+/).length : 0} | Chars: {composeBody.length}
                </div>

                {/* Action Buttons Bar at bottom of right column */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-auto select-none shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="p-2 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Discard draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={handleSaveDraft}
                      className="px-3.5 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-red-950/20 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> 
                      {isScheduled ? "Queue Delivery" : "Send Message"}
                    </button>
                  </div>
                </div>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── CRM TASK CREATION popover DIALOG ── */}
      {isTaskWizardOpen && (
        <div className="fixed inset-0 bg-[rgba(12,13,20,0.75)] z-50 flex items-center justify-center p-4 backdrop-blur-[8px] select-none">
          <div className="panel-card border border-[var(--color-accent)]/30 w-full max-w-sm p-5 shadow-2xl relative">
            <button 
              onClick={() => setIsTaskWizardOpen(false)} 
              className="absolute right-4 top-4 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            >
              ✕
            </button>
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider mb-4 border-b border-[var(--color-divider)] pb-2 flex items-center gap-1 text-[var(--color-accent)]">
              <CheckSquare className="w-4 h-4 text-[var(--color-accent)]" /> Convert Email to CRM Task
            </h4>
            
            <form onSubmit={handleSaveTaskFromWizard} className="flex flex-col gap-3">
              <div>
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">CRM Title</label>
                <input 
                  type="text" 
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30"
                  value={taskWizardTitle}
                  onChange={(e) => setTaskWizardTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Priority</label>
                  <select 
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
                    value={taskWizardPriority}
                    onChange={(e) => setTaskWizardPriority(e.target.value as any)}
                  >
                    <option value="high" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">🔴 High</option>
                    <option value="medium" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">🟡 Medium</option>
                    <option value="low" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Due Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
                    value={taskWizardDueDate}
                    onChange={(e) => setTaskWizardDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Assigned Staff Broker</label>
                <select 
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
                  value={taskWizardAssignee}
                  onChange={(e) => setTaskWizardAssignee(e.target.value)}
                >
                  <option value="Jeff Brown" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">Jeff Brown (Broker)</option>
                  <option value="Tim Brown" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">Tim Brown (Admin)</option>
                  <option value="Wayne MacLeod" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">Wayne MacLeod (Admin)</option>
                  <option value="Jamey Brown" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">Jamey Brown (Broker)</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Description Brief</label>
                <textarea 
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none h-20 resize-none font-sans"
                  value={taskWizardNotes}
                  onChange={(e) => setTaskWizardNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
                <button 
                  type="button" 
                  onClick={() => setIsTaskWizardOpen(false)}
                  className="bg-transparent hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-3 py-1.5 rounded text-[10px] font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold px-4 py-1.5 rounded text-[10px] flex items-center gap-1 hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  Create Task Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CRM CALENDAR EVENT DIALOG ── */}
      {isEventWizardOpen && (
        <div className="fixed inset-0 bg-[rgba(12,13,20,0.75)] z-50 flex items-center justify-center p-4 backdrop-blur-[8px] select-none">
          <div className="panel-card border border-[var(--color-accent)]/30 w-full max-w-sm p-5 shadow-2xl relative">
            <button 
              onClick={() => setIsEventWizardOpen(false)} 
              className="absolute right-4 top-4 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            >
              ✕
            </button>
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider mb-4 border-b border-[var(--color-divider)] pb-2 flex items-center gap-1 text-[var(--color-accent)]">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" /> Convert Email to Calendar Event
            </h4>
            
            <form onSubmit={handleSaveEventFromWizard} className="flex flex-col gap-3">
              <div>
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Meeting Title</label>
                <input 
                  type="text" 
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none"
                  value={eventWizardTitle}
                  onChange={(e) => setEventWizardTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none"
                    value={eventWizardDate}
                    onChange={(e) => setEventWizardDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Hour/Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none font-mono"
                    value={eventWizardTime}
                    onChange={(e) => setEventWizardTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Event Category</label>
                <select 
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none text-[11px]"
                  value={eventWizardType}
                  onChange={(e) => setEventWizardType(e.target.value as any)}
                >
                  <option value="client" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">👤 Client Advisory Meeting</option>
                  <option value="meeting" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">🏢 Internal Company Board Session</option>
                  <option value="lender" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">🏦 External Lender BDM Negotiation</option>
                  <option value="personal" className="bg-[var(--color-surface-3)] text-[var(--color-text)]">🔒 Private Schedule Reserve</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] text-[var(--color-text-muted)] uppercase font-bold mb-1 tracking-wider">Meeting Context Notes</label>
                <textarea 
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none h-20 resize-none font-sans"
                  value={eventWizardNotes}
                  onChange={(e) => setEventWizardNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
                <button 
                  type="button" 
                  onClick={() => setIsEventWizardOpen(false)}
                  className="bg-transparent hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-3 py-1.5 rounded text-[10px] font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-bold px-4 py-1.5 rounded text-[10px] transition-colors"
                >
                  Submit Calendar Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CUSTOM REUSABLE CONFIRMATION MODAL (IFRAME-SAFE) ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full shrink-0 ${confirmModal.confirmVariant === "danger" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)]">{confirmModal.title}</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  action();
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer shadow-sm ${
                  confirmModal.confirmVariant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
