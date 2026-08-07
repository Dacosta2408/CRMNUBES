import React, { useState, useMemo } from "react";
import { 
  Heart, Calendar, Mail, MessageSquare, Plus, CheckSquare, 
  UserPlus, CheckCircle, RefreshCw, AlertTriangle, ChevronRight, 
  Clock, Search, User, Filter, ArrowUpRight, DollarSign, Send,
  Trash, Edit2, Check, X, ShieldAlert, Award, FileText, Sparkles
} from "lucide-react";
import { Client, Task, User as SystemUser } from "../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RetentionProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  userRoster: SystemUser[];
  currentUser: SystemUser;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
}

type StreamType = "birthdays" | "renewals" | "anniversaries" | "reengage";

interface RetentionTemplate {
  id: string;
  name: string;
  type: "email" | "sms";
  subject?: string;
  body: string;
}

export const getMaturityDate = (c: Client): Date | null => {
  if (c.maturityDate) {
    const d = new Date(c.maturityDate);
    return isNaN(d.getTime()) ? null : d;
  }
  if (c.fundedDate) {
    const fDate = new Date(c.fundedDate);
    if (isNaN(fDate.getTime())) return null;
    let termYears = 5;
    if (c.mortgageTerm) {
      const parsed = parseInt(c.mortgageTerm, 10);
      if (!isNaN(parsed) && parsed > 0) {
        termYears = parsed;
      }
    }
    return new Date(fDate.getTime() + termYears * 365 * 24 * 3600000);
  }
  return null;
};

export const Retention: React.FC<RetentionProps> = ({
  clients,
  setClients,
  tasks,
  setTasks,
  userRoster,
  currentUser,
  showToast
}) => {
  const [activeStream, setActiveStream] = useState<StreamType>("birthdays");
  const [renewalTier, setRenewalTier] = useState<"2yr" | "1yr" | "6mo" | "4mo">("6mo");
  const [sortOrder, setSortOrder] = useState<"soonest" | "last_contacted" | "mortgage_amount">("soonest");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("All");

  // Interaction Modal/Drawer States
  const [outreachClient, setOutreachClient] = useState<Client | null>(null);
  const [outreachType, setOutreachType] = useState<"email" | "sms" | "outcome" | null>(null);

  // Email / SMS Composition States
  const [compSubject, setCompSubject] = useState("");
  const [compBody, setCompBody] = useState("");
  const [customSms, setCustomSms] = useState("");

  // Snooze state
  const [snoozeMenuClientId, setSnoozeMenuClientId] = useState<string | null>(null);

  const handleSnooze = (client: Client, days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const targetDate = d.toISOString().split("T")[0];

    setClients(prev => prev.map(c => c.id === client.id ? { ...c, nextFollowUpDate: targetDate, updatedAt: new Date().toISOString() } : c));
    showToast(`Snoozed — follow-up set for ${targetDate}`, "info");
    setSnoozeMenuClientId(null);
  };

  const getTouchpointCount = (client: Client): number => {
    let count = client.lastContactedDate ? 1 : 0;
    if (client.retentionNotes) {
      const match = client.retentionNotes.match(/\(?(\d+)\s*touchpoints?\)?/i);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed)) {
          count += parsed;
        }
      }
    }
    return count;
  };

  // Outcome Logging States
  const [outcomeType, setOutcomeType] = useState<string>("contacted");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");

  // Task Creation inline state
  const [taskClient, setTaskClient] = useState<Client | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");

  // Convert to Lead Confirmation modal state
  const [convertConfirmClient, setConvertConfirmClient] = useState<Client | null>(null);

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

  // Stream calculations
  const streamsData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentYearStr = String(currentYear);

    // 1. Birthdays (next 30 days or passed in last 7 days; exclude if acknowledged this year)
    const birthdays = clients.filter(c => {
      if (c.birthdayAcknowledged === currentYearStr) return false;
      if (!c.dob) return false;
      const dobDate = new Date(c.dob);
      const bMonth = dobDate.getMonth();
      const bDay = dobDate.getDate();
      
      const thisYearBD = new Date(currentYear, bMonth, bDay);
      let diffDays = Math.ceil((thisYearBD.getTime() - now.getTime()) / (24 * 3600000));
      
      if (diffDays < -7) {
        // Try next year
        const nextYearBD = new Date(currentYear + 1, bMonth, bDay);
        diffDays = Math.ceil((nextYearBD.getTime() - now.getTime()) / (24 * 3600000));
      }
      
      return diffDays >= -7 && diffDays <= 30;
    });

    // 2. Renewals categorized into 4 tiers (funded/closed status only)
    const renewals2yr: Client[] = [];
    const renewals1yr: Client[] = [];
    const renewals6mo: Client[] = [];
    const renewals4mo: Client[] = [];
    const renewalsAll: Client[] = [];

    clients.forEach(c => {
      const statusLower = (c.status || "").toLowerCase();
      if (statusLower !== "funded" && statusLower !== "closed") return;

      const matDate = getMaturityDate(c);
      if (!matDate) return;

      const diffMs = matDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 3600000));

      if (diffDays >= 0 && diffDays <= 730) {
        renewalsAll.push(c);
        if (diffDays >= 366 && diffDays <= 730) {
          renewals2yr.push(c);
        } else if (diffDays >= 181 && diffDays <= 365) {
          renewals1yr.push(c);
        } else if (diffDays >= 121 && diffDays <= 180) {
          renewals6mo.push(c);
        } else if (diffDays >= 0 && diffDays <= 120) {
          renewals4mo.push(c);
        }
      }
    });

    // 3. Funding Anniversaries (within 30 days)
    const anniversaries = clients.filter(c => {
      if (!c.fundedDate) return false;
      const fDate = new Date(c.fundedDate);
      const fMonth = fDate.getMonth();
      const fDay = fDate.getDate();

      const thisYearAnn = new Date(currentYear, fMonth, fDay);
      let diffDays = Math.ceil((thisYearAnn.getTime() - now.getTime()) / (24 * 3600000));

      if (diffDays < -7) {
        const nextYearAnn = new Date(currentYear + 1, fMonth, fDay);
        diffDays = Math.ceil((nextYearAnn.getTime() - now.getTime()) / (24 * 3600000));
      }

      return diffDays >= -7 && diffDays <= 30;
    });

    // 4. Re-engage targets (no touchpoint for > 90 days and in post-close or active state)
    const reengage = clients.filter(c => {
      const activeOrFunded = ["funded", "closed", "open", "working"].includes(c.status);
      if (!activeOrFunded) return false;

      const lastTouchStr = c.lastContactedDate || c.updatedAt || c.createdAt;
      const lastTouch = new Date(lastTouchStr);
      const diffDays = Math.ceil((now.getTime() - lastTouch.getTime()) / (24 * 3600000));
      return diffDays >= 90;
    });

    return {
      birthdays,
      renewals: {
        "2yr": renewals2yr,
        "1yr": renewals1yr,
        "6mo": renewals6mo,
        "4mo": renewals4mo,
        all: renewalsAll
      },
      anniversaries,
      reengage
    };
  }, [clients]);

  // Match owner by checking assignedBroker, retentionOwner and agent fields
  const matchesAgent = useMemo(() => {
    return (c: Client) => {
      if (activeAgentFilter === "All") return true;
      const target = activeAgentFilter.toLowerCase();
      const broker = c.assignedBroker ? c.assignedBroker.toLowerCase() : "";
      const owner = c.retentionOwner ? c.retentionOwner.toLowerCase() : "";
      const ag = c.agent ? c.agent.toLowerCase() : "";
      if (broker === target || owner === target || ag === target) return true;
      if (!c.assignedBroker && !c.retentionOwner && !c.agent && c.source && c.source.toLowerCase().includes(target)) {
        return true;
      }
      return false;
    };
  }, [activeAgentFilter]);

  // Filter clients under the active stream by search + agent owner & apply sort order
  const filteredStreamClients = useMemo(() => {
    let list: Client[] = [];
    if (activeStream === "birthdays") list = streamsData.birthdays;
    else if (activeStream === "renewals") list = streamsData.renewals[renewalTier];
    else if (activeStream === "anniversaries") list = streamsData.anniversaries;
    else if (activeStream === "reengage") list = streamsData.reengage;

    const filtered = list.filter(c => {
      if (!matchesAgent(c)) return false;

      // Search term filter
      const s = searchTerm.toLowerCase();
      return (
        (c.first || "").toLowerCase().includes(s) ||
        (c.last || "").toLowerCase().includes(s) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.lender && c.lender.toLowerCase().includes(s))
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "mortgage_amount") {
        const amtA = Number(a.mtgamt || 0);
        const amtB = Number(b.mtgamt || 0);
        return amtB - amtA;
      }

      if (sortOrder === "last_contacted") {
        const timeA = a.lastContactedDate ? new Date(a.lastContactedDate).getTime() : 0;
        const timeB = b.lastContactedDate ? new Date(b.lastContactedDate).getTime() : 0;
        return timeA - timeB;
      }

      // "soonest"
      if (activeStream === "renewals") {
        const matA = getMaturityDate(a)?.getTime() ?? Infinity;
        const matB = getMaturityDate(b)?.getTime() ?? Infinity;
        return matA - matB;
      }

      if (activeStream === "birthdays") {
        const getBdayDiff = (c: Client) => {
          if (!c.dob) return Infinity;
          const now = new Date();
          const dob = new Date(c.dob);
          const nextBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
          let diff = Math.ceil((nextBday.getTime() - now.getTime()) / (24 * 3600000));
          if (diff < -7) {
            nextBday.setFullYear(now.getFullYear() + 1);
            diff = Math.ceil((nextBday.getTime() - now.getTime()) / (24 * 3600000));
          }
          return diff;
        };
        return getBdayDiff(a) - getBdayDiff(b);
      }

      if (activeStream === "anniversaries") {
        const getAnnivDiff = (c: Client) => {
          if (!c.fundedDate) return Infinity;
          const now = new Date();
          const fDate = new Date(c.fundedDate);
          const nextAnniv = new Date(now.getFullYear(), fDate.getMonth(), fDate.getDate());
          let diff = Math.ceil((nextAnniv.getTime() - now.getTime()) / (24 * 3600000));
          if (diff < 0) {
            nextAnniv.setFullYear(now.getFullYear() + 1);
            diff = Math.ceil((nextAnniv.getTime() - now.getTime()) / (24 * 3600000));
          }
          return diff;
        };
        return getAnnivDiff(a) - getAnnivDiff(b);
      }

      if (activeStream === "reengage") {
        const timeA = new Date(a.lastContactedDate || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.lastContactedDate || b.updatedAt || b.createdAt || 0).getTime();
        return timeA - timeB;
      }

      return 0;
    });
  }, [activeStream, renewalTier, streamsData, searchTerm, matchesAgent, sortOrder]);

  // Overall metric stats
  const metrics = useMemo(() => {
    const totalClients = clients.length;
    const completedOutreach = clients.filter(c => c.lastContactedDate).length;
    const rate = totalClients > 0 ? Math.round((completedOutreach / totalClients) * 100) : 0;
    
    return {
      totalBirthdays: streamsData.birthdays.length,
      totalRenewals: streamsData.renewals.all.length,
      totalAnniversaries: streamsData.anniversaries.length,
      totalReengage: streamsData.reengage.length,
      outreachCompletionRate: rate
    };
  }, [streamsData, clients]);

  // Default Email / SMS templates per category
  const getTemplates = (type: StreamType, client: Client): { email: RetentionTemplate; sms: RetentionTemplate } => {
    const signature = `${currentUser.first} ${currentUser.last}`;
    const lenderName = client.lender || "your lender";
    
    // Anniversary calculations
    let yearsFunded = 1;
    if (client.fundedDate) {
      yearsFunded = new Date().getFullYear() - new Date(client.fundedDate).getFullYear();
      if (yearsFunded <= 0) yearsFunded = 1;
    }

    let renewalSubject = "6-Month Renewal Advisory — Let's Plan Your Next Term";
    let renewalTimeframeText = "approximately 6 months";
    let renewalTemplateName = "6-Month Renewal Advisory";

    if (renewalTier === "4mo") {
      renewalSubject = "Action Required: Your Mortgage Renews in Under 4 Months";
      renewalTimeframeText = "under 4 months";
      renewalTemplateName = "4-Month Renewal Advisory";
    } else if (renewalTier === "6mo") {
      renewalSubject = "6-Month Renewal Advisory — Let's Plan Your Next Term";
      renewalTimeframeText = "approximately 6 months";
      renewalTemplateName = "6-Month Renewal Advisory";
    } else if (renewalTier === "1yr") {
      renewalSubject = "Early Planning — Your Mortgage Renewal Is 1 Year Away";
      renewalTimeframeText = "approximately 1 year";
      renewalTemplateName = "1-Year Renewal Advisory";
    } else if (renewalTier === "2yr") {
      renewalSubject = "Long-Range Check-In — Renewal Horizon 2 Years Out";
      renewalTimeframeText = "approximately 2 years";
      renewalTemplateName = "2-Year Renewal Advisory";
    }

    const templatesMap: Record<StreamType, { email: RetentionTemplate; sms: RetentionTemplate }> = {
      birthdays: {
        email: {
          id: "temp_bd_email",
          name: "Happy Birthday Check-in",
          type: "email",
          subject: `Happy Birthday, ${client.first}! 🎂 From GBK Financial`,
          body: `Hi ${client.first},\n\nWishing you a truly spectacular birthday today! 🎂\n\nI wanted to take a quick moment away from mortgage charts to wish you and your loved ones an exceptional day filled with joy, celebration, and relaxation. Thank you so much for being an incredibly valued member of the GBK Financial family. We deeply appreciate your trust and partnership.\n\nEnjoy your special day, and let me know if there's ever anything we can do to make your financial journey smoother!\n\nBest regards,\n\n${signature}\nGBK Financial`
        },
        sms: {
          id: "temp_bd_sms",
          name: "SMS Birthday Note",
          type: "sms",
          body: `Happy Birthday, ${client.first}! 🎂 Wishing you an amazing day of celebration and relaxation. Thank you for being a wonderful client of GBK Financial! - ${signature}`
        }
      },
      renewals: {
        email: {
          id: `temp_ren_${renewalTier}_email`,
          name: renewalTemplateName,
          type: "email",
          subject: renewalSubject,
          body: `Hi ${client.first},\n\nI hope everything is going wonderfully with your home. I'm reaching out proactively because your mortgage with ${lenderName} is approaching its maturity and renewal window in ${renewalTimeframeText}.\n\nTypically, lenders send automated renewal packages with standard retail interest rates, hoping you'll sign without checking other options. At GBK Financial, we have direct access to over 50 prime, alternative, and private underwriting panels. By planning early, we can lock in maximum savings and protect your household budget from unnecessary expenses.\n\nLet's schedule a brief 10-minute strategy call this week to review your current rate, explore optimization opportunities, or discuss equity options. Here's my direct line. When works best for you?\n\nWarm regards,\n\n${signature}\nOntario Mortgage Broker, GBK Financial`
        },
        sms: {
          id: `temp_ren_${renewalTier}_sms`,
          name: "SMS Renewal Warning",
          type: "sms",
          body: `Hi ${client.first}, your mortgage with ${lenderName} is renewing in ${renewalTimeframeText}! Don't sign the bank's automatic package without shopping around. Let's find you the best market rates. When's a good time for a quick call? - ${signature}, GBK`
        }
      },
      anniversaries: {
        email: {
          id: "temp_ann_email",
          name: "Funding Anniversary Value Check",
          type: "email",
          subject: `Happy Mortgage Anniversary, ${client.first}! 🎉 (Equity Review Inside)`,
          body: `Hi ${client.first},\n\nCan you believe it has been ${yearsFunded} year${yearsFunded > 1 ? "s" : ""} since your mortgage at ${lenderName} was funded? Time flies! 🎉\n\nI always like to mark this milestone by checking in and offering a complimentary Equity & Market Valuation review. Over the past few years, mortgage terms and property values have fluctuated, and there may be strategic ways to optimize your current financial layout (like consolidated restructuring, home improvement financing, or simply auditing GDS/TDS health).\n\nHow is the home treating you? I'd love to hear how you're doing. Let's connect for a quick friendly check-in whenever you have a moment!\n\nBest regards,\n\n${signature}\nGBK Financial`
        },
        sms: {
          id: "temp_ann_sms",
          name: "SMS Anniversary Check-in",
          type: "sms",
          body: `Happy mortgage anniversary, ${client.first}! 🎉 Can't believe it's been ${yearsFunded} year${yearsFunded > 1 ? "s" : ""} since we funded your home loan with ${lenderName}. Hope the home is treating you excellently! Let me know if you ever need an equity check-in. - ${signature}`
        }
      },
      reengage: {
        email: {
          id: "temp_re_email",
          name: "Long-Time Friendly Re-engagement",
          type: "email",
          subject: `Friendly hello from GBK Financial / Thinking of you, ${client.first}`,
          body: `Hi ${client.first},\n\nIt's been a while since we last spoke, and I wanted to reach out to check in and see how everything is going with you and your family!\n\nAt GBK Financial, we consider our clients relationships for life, not just transactions. I wanted to verify if your current home setup is still meeting your needs, or if you've been contemplating any new real estate ventures, purchase renewals, or family expansions.\n\nEven if you're not planning any changes today, I'm always here to answer market questions, discuss the latest Bank of Canada interest rate decisions, or run custom calculators for you. \n\nI'd love to hear how you're doing. Drop me a line whenever you're free!\n\nBest regards,\n\n${signature}\nPrincipal Broker Team, GBK Financial`
        },
        sms: {
          id: "temp_re_sms",
          name: "SMS Light Catch-up",
          type: "sms",
          body: `Hi ${client.first}! It's been a while since we last caught up. Hope you and the family are doing great in the home. Just checking in to see how everything is going! - ${signature}, GBK Financial`
        }
      }
    };

    return templatesMap[type];
  };

  // Launch outreach interface
  const handleOpenOutreach = (client: Client, type: "email" | "sms" | "outcome") => {
    setOutreachClient(client);
    setOutreachType(type);
    
    const temps = getTemplates(activeStream, client);

    if (type === "email") {
      setCompSubject(temps.email.subject || "");
      setCompBody(temps.email.body);
    } else if (type === "sms") {
      setCustomSms(temps.sms.body);
    } else if (type === "outcome") {
      setOutcomeType("contacted");
      setOutcomeNotes("");
      setNextFollowUp("");
    }
  };

  // Handle saving direct outcomes
  const handleLogOutcomeSave = () => {
    if (!outreachClient) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const currentYearStr = String(new Date().getFullYear());

    const updatedClients = clients.map(c => {
      if (c.id === outreachClient.id) {
        const updated: Client = {
          ...c,
          lastContactedDate: todayStr,
          nextFollowUpDate: nextFollowUp || c.nextFollowUpDate,
          retentionOutcome: outcomeType,
          retentionNotes: outcomeNotes || c.retentionNotes,
          updatedAt: new Date().toISOString()
        };
        if (activeStream === "renewals") {
          updated.renewalNotified = todayStr;
        } else if (activeStream === "birthdays") {
          updated.birthdayAcknowledged = currentYearStr;
        }
        return updated;
      }
      return c;
    });

    setClients(updatedClients);
    showToast(`Logged outreach outcome for ${outreachClient.first} ${outreachClient.last}: ${outcomeType.toUpperCase()}`, "success");
    
    // Close modal
    setOutreachClient(null);
    setOutreachType(null);
  };

  // One-click Task trigger modal loading
  const handleOpenTaskCreation = (client: Client) => {
    setTaskClient(client);
    
    let reason = "Follow up";
    if (activeStream === "birthdays") reason = "Send birthday congratulations card & call";
    else if (activeStream === "renewals") reason = "Conduct mortgage renewal review analysis";
    else if (activeStream === "anniversaries") reason = "Reach out for mortgage anniversary check-in and equity review";
    else if (activeStream === "reengage") reason = "Re-engage client, touchpoint regarding current rates";

    setTaskTitle(`${reason} for ${client.first} ${client.last}`);
    
    // Set due date to 3 days from now
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setTaskDueDate(d.toISOString().split("T")[0]);
    setTaskPriority("medium");
  };

  const handleSaveTask = () => {
    if (!taskClient) return;

    const newTask: Task = {
      id: `task_ret_${Date.now()}`,
      title: taskTitle,
      status: "open",
      priority: taskPriority,
      dueDate: taskDueDate,
      clientId: taskClient.id,
      clientName: `${taskClient.first} ${taskClient.last}`,
      assignedTo: taskClient.assignedBroker || taskClient.retentionOwner || `${currentUser.first} ${currentUser.last}`,
      notes: `Retention stream automated workflow follow-up task. Triggered from ${activeStream.toUpperCase()} category list.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: `${currentUser.first} ${currentUser.last}`
    };

    setTasks([newTask, ...tasks]);
    showToast(`Successfully scheduled retention task for ${taskClient.first}!`, "success");
    setTaskClient(null);
  };

  // Convert retention item into new Lead/Active file - opens modal
  const handleConvertToLead = (client: Client) => {
    setConvertConfirmClient(client);
  };

  const handleConfirmConvert = () => {
    if (!convertConfirmClient) return;
    const client = convertConfirmClient;

    const clonedLead: Client = {
      ...client,
      id: `c_lead_${Date.now()}`,
      status: "lead",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fundedDate: undefined,
      maturityDate: undefined,
      lender: undefined,
      mtgamt: client.mtgamt, // keep the amount or set as general scenario
      source: `CRM Retention (${activeStream.toUpperCase()})`,
      aiSummary: `Created from past client retention follow-up. Historical file ID: ${client.id}.`
    };

    // Update the parent's status or notes to indicate opportunity was identified and lead created
    const updatedClients = clients.map(c => {
      if (c.id === client.id) {
        return {
          ...c,
          retentionNotes: `Converted to new lead file ${clonedLead.id} on ${new Date().toLocaleDateString()}`,
          retentionOutcome: "renewal opportunity created",
          lastContactedDate: new Date().toISOString().split("T")[0]
        };
      }
      return c;
    });

    setClients([clonedLead, ...updatedClients]);
    showToast(`Success! Generated new active CRM Lead file for ${client.first} ${client.last}!`, "success");
    setConvertConfirmClient(null);
  };

  // Export PDF Report function
  const handleExportPDF = () => {
    if (filteredStreamClients.length === 0) {
      showToast("No retention records available to export.", "warning");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const todayStr = new Date().toISOString().split("T")[0];
      const currentUserFull = `${currentUser.first} ${currentUser.last}`;

      let streamTitle = "Birthdays";
      if (activeStream === "renewals") streamTitle = `Renewals (${renewalTier} Tier)`;
      else if (activeStream === "anniversaries") streamTitle = "Anniversaries";
      else if (activeStream === "reengage") streamTitle = "Re-engage";

      // Report Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(30, 41, 59);
      doc.text("GBK Financial — CRM Client Retention Report", 14, 15);

      doc.setFontSize(10.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Active Stream: ${streamTitle}`, 14, 21.5);

      // Metadata Block
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);

      const metaLine1 = `Generated: ${todayStr}   |   Generated By: ${currentUserFull}   |   Selected Owner: ${activeAgentFilter || "All"}`;
      const metaLine2 = `Search Term: ${searchTerm.trim() || "None"}${activeStream === "renewals" ? `   |   Renewal Tier: ${renewalTier}` : ""}   |   Total Targets: ${filteredStreamClients.length}`;

      doc.text(metaLine1, 14, 27);
      doc.text(metaLine2, 14, 31.5);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 34.5, 283, 34.5);

      // Table Columns (exact requested order)
      const tableColumns = [
        "Client Name",
        "Status",
        "Owner",
        "Email",
        "Cell",
        "Address",
        "Lender",
        "Mortgage Amount",
        "Maturity Date",
        "Mortgage Term",
        "Last Contacted",
        "Next Follow-up",
        "Outcome",
        "Notes"
      ];

      // Table Rows
      const tableRows = filteredStreamClients.map(client => {
        const owner = client.assignedBroker || client.retentionOwner || client.agent || currentUserFull;
        const matDate = getMaturityDate(client);
        const formattedMatDate = matDate ? matDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";
        const mtgAmtStr = client.mtgamt ? `$${Number(client.mtgamt).toLocaleString()}` : "N/A";
        const mtgTermStr = client.mortgageTerm ? `${client.mortgageTerm}-Yr Term` : "N/A";

        return [
          `${client.first} ${client.last}`,
          client.status || "N/A",
          owner,
          client.email || "N/A",
          client.cell || "N/A",
          client.addr || "N/A",
          client.lender || "N/A",
          mtgAmtStr,
          formattedMatDate,
          mtgTermStr,
          client.lastContactedDate || "N/A",
          client.nextFollowUpDate || "N/A",
          client.retentionOutcome || "None",
          client.retentionNotes || ""
        ];
      });

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 38,
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          overflow: "linebreak",
          textColor: [51, 65, 85]
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Client Name
          1: { cellWidth: 12 }, // Status
          2: { cellWidth: 18 }, // Owner
          3: { cellWidth: 22 }, // Email
          4: { cellWidth: 16 }, // Cell
          5: { cellWidth: 22 }, // Address
          6: { cellWidth: 16 }, // Lender
          7: { cellWidth: 18 }, // Mortgage Amount
          8: { cellWidth: 16 }, // Maturity Date
          9: { cellWidth: 15 }, // Mortgage Term
          10: { cellWidth: 15 }, // Last Contacted
          11: { cellWidth: 16 }, // Next Follow-up
          12: { cellWidth: 18 }, // Outcome
          13: { cellWidth: "auto" } // Notes
        },
        margin: { top: 15, right: 14, bottom: 15, left: 14 }
      });

      // --- Client Detail Appendix Section ---
      const _finalY = (doc as any).lastAutoTable?.finalY || 100;
      
      // Start appendix on a new page after main table
      doc.addPage();
      let currentY = 15;

      // Appendix Section Header (top of first appendix page)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text("Client Detail Appendix", 14, currentY);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Detailed Individual Client Records, Contract Details & Retention History Notes", 14, currentY + 5);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, currentY + 8, 283, currentY + 8);

      currentY += 14;

      filteredStreamClients.forEach((client, idx) => {
        const owner = client.assignedBroker || client.retentionOwner || client.agent || currentUserFull;
        const matDate = getMaturityDate(client);
        const formattedMatDate = matDate ? matDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";
        const mtgAmtStr = client.mtgamt ? `$${Number(client.mtgamt).toLocaleString()}` : "N/A";
        const mtgTermStr = client.mortgageTerm ? `${client.mortgageTerm}-Yr Term` : "N/A";

        let renewalNotifiedStr = "No";
        if (client.renewalNotified) {
          const rDate = new Date(client.renewalNotified);
          renewalNotifiedStr = !isNaN(rDate.getTime()) ? rDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : client.renewalNotified;
        }

        let birthdayAckStr = "No";
        if (client.birthdayAcknowledged) {
          birthdayAckStr = `Yes (${client.birthdayAcknowledged})`;
        }

        const items = [
          { label: "Client Name", val: `${client.first} ${client.last}` },
          { label: "CRM Status", val: client.status || "N/A" },
          { label: "Retention Owner", val: owner },
          { label: "Email", val: client.email || "N/A" },
          { label: "Cell", val: client.cell || "N/A" },
          { label: "Address", val: client.addr || "N/A" },
          { label: "Lender", val: client.lender || "N/A" },
          { label: "Mortgage Amount", val: mtgAmtStr },
          { label: "Maturity Date", val: formattedMatDate },
          { label: "Mortgage Term", val: mtgTermStr },
          { label: "Last Contacted", val: client.lastContactedDate || "N/A" },
          { label: "Next Follow-up", val: client.nextFollowUpDate || "N/A" },
          { label: "Retention Outcome", val: client.retentionOutcome || "None" },
          { label: "Renewal Notified", val: renewalNotifiedStr },
          { label: "Birthday Acknowledged", val: birthdayAckStr }
        ];

        // Stream-Specific Insight calculation helper
        const getStreamSpecificInsights = (c: Client) => {
          const now = new Date();
          const insightItems: { label: string; val: string }[] = [];

          if (activeStream === "renewals") {
            const mDate = getMaturityDate(c);
            let daysRemainingStr = "N/A";
            let tierStr = "Outside Active Renewal Window";

            if (mDate) {
              const diffMs = mDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (24 * 3600000));
              daysRemainingStr = `${diffDays} days`;

              if (diffDays >= 0 && diffDays <= 120) tierStr = "4-Month Tier";
              else if (diffDays >= 121 && diffDays <= 180) tierStr = "6-Month Tier";
              else if (diffDays >= 181 && diffDays <= 365) tierStr = "1-Year Tier";
              else if (diffDays >= 366 && diffDays <= 730) tierStr = "2-Year Tier";
            }

            let matSource = "N/A";
            if (c.maturityDate) {
              matSource = "Recorded Maturity Date";
            } else if (c.fundedDate) {
              matSource = "Computed from Funded Date + Mortgage Term";
            }

            let renNotifiedStr = "No";
            if (c.renewalNotified) {
              const rDate = new Date(c.renewalNotified);
              renNotifiedStr = !isNaN(rDate.getTime()) ? rDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : String(c.renewalNotified);
            }

            const mtgAmt = Number(c.mtgamt || 0);
            let revPriority = "Unspecified";
            if (mtgAmt >= 750000) revPriority = "High Balance Opportunity";
            else if (mtgAmt >= 400000) revPriority = "Standard Balance Review";
            else if (mtgAmt > 0) revPriority = "Routine Renewal Review";

            insightItems.push(
              { label: "Renewal Tier", val: tierStr },
              { label: "Days Remaining", val: daysRemainingStr },
              { label: "Maturity Source", val: matSource },
              { label: "Renewal Notified", val: renNotifiedStr },
              { label: "Revenue Priority", val: revPriority }
            );
          } else if (activeStream === "birthdays") {
            let upcomingBdayStr = "N/A";
            let bdayStatus = "Outside Active Birthday Window";

            if (c.dob) {
              const bday = new Date(c.dob);
              if (!isNaN(bday.getTime())) {
                const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
                let diffDays = Math.ceil((thisYearBday.getTime() - now.getTime()) / (24 * 3600000));
                let targetBday = thisYearBday;

                if (diffDays < -7) {
                  targetBday = new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate());
                  diffDays = Math.ceil((targetBday.getTime() - now.getTime()) / (24 * 3600000));
                }

                upcomingBdayStr = targetBday.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

                if (diffDays <= 0 && diffDays >= -7) {
                  bdayStatus = "Recently Passed";
                } else if (diffDays >= 0 && diffDays <= 30) {
                  bdayStatus = "Upcoming";
                }
              }
            }

            insightItems.push(
              { label: "Upcoming Birthday", val: upcomingBdayStr },
              { label: "Birthday Window Status", val: bdayStatus },
              { label: "Birthday Acknowledged", val: c.birthdayAcknowledged || "No" },
              { label: "Relationship Touchpoint Purpose", val: "Goodwill / Personal Client Retention" }
            );
          } else if (activeStream === "anniversaries") {
            let yearsStr = "N/A";
            let upcomingAnnStr = "N/A";
            let annStatus = "Outside Active Anniversary Window";
            let equityRev = "N/A";

            if (c.fundedDate) {
              const fDate = new Date(c.fundedDate);
              if (!isNaN(fDate.getTime())) {
                const rawYears = now.getFullYear() - fDate.getFullYear();
                const years = Math.max(1, rawYears);
                yearsStr = `${years} Year${years === 1 ? "" : "s"}`;

                const thisYearAnn = new Date(now.getFullYear(), fDate.getMonth(), fDate.getDate());
                let diffDays = Math.ceil((thisYearAnn.getTime() - now.getTime()) / (24 * 3600000));
                let targetAnn = thisYearAnn;

                if (diffDays < -7) {
                  targetAnn = new Date(now.getFullYear() + 1, fDate.getMonth(), fDate.getDate());
                  diffDays = Math.ceil((targetAnn.getTime() - now.getTime()) / (24 * 3600000));
                }

                upcomingAnnStr = targetAnn.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

                if (diffDays <= 0 && diffDays >= -7) {
                  annStatus = "Recently Passed";
                } else if (diffDays >= 0 && diffDays <= 30) {
                  annStatus = "Upcoming";
                }

                if (years >= 3) equityRev = "Strong Review Opportunity";
                else if (years === 2) equityRev = "Moderate Review Opportunity";
                else if (years === 1) equityRev = "Early Relationship Check-In";
              }
            }

            insightItems.push(
              { label: "Years Since Funding", val: yearsStr },
              { label: "Upcoming Anniversary Date", val: upcomingAnnStr },
              { label: "Anniversary Window Status", val: annStatus },
              { label: "Equity Review Opportunity", val: equityRev }
            );
          } else if (activeStream === "reengage") {
            let daysSinceStr = "N/A";
            let reengageStatus = "N/A";
            let urgency = "N/A";

            const lastTouchStr = c.lastContactedDate || c.updatedAt || c.createdAt;
            if (lastTouchStr) {
              const lastTouch = new Date(lastTouchStr);
              if (!isNaN(lastTouch.getTime())) {
                const diffDays = Math.ceil((now.getTime() - lastTouch.getTime()) / (24 * 3600000));
                daysSinceStr = `${diffDays} days`;

                if (diffDays >= 180) {
                  reengageStatus = "Dormant";
                  urgency = "Immediate Outreach Recommended";
                } else if (diffDays >= 120) {
                  reengageStatus = "Cold";
                  urgency = "High Priority";
                } else if (diffDays >= 90) {
                  reengageStatus = "Cooling";
                  urgency = "Standard Reconnect";
                } else {
                  reengageStatus = "Active";
                  urgency = "Low Priority";
                }
              }
            }

            insightItems.push(
              { label: "Days Since Last Contact", val: daysSinceStr },
              { label: "Re-engagement Status", val: reengageStatus },
              { label: "Follow-up Urgency", val: urgency },
              { label: "Relationship Recovery Goal", val: "Rebuild engagement and surface new financing opportunities" }
            );
          }

          return insightItems;
        };

        const insightItems = getStreamSpecificInsights(client);

        const notesText = client.retentionNotes || "No retention notes logged.";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        const wrappedNotes = doc.splitTextToSize(notesText, 269);
        const notesHeight = wrappedNotes.length * 3.2;

        const baseGridHeight = Math.ceil(items.length / 3) * 4.2;
        const insightGridHeight = insightItems.length > 0 ? (7 + Math.ceil(insightItems.length / 3) * 4.2) : 0;
        const estimatedBlockHeight = 8 + baseGridHeight + insightGridHeight + 5 + notesHeight + 8;

        if (currentY + estimatedBlockHeight > 190) {
          doc.addPage();
          currentY = 16;
        }

        // Client full name subsection heading
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${idx + 1}. ${client.first} ${client.last}`, 14, currentY);

        currentY += 2;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(14, currentY, 283, currentY);
        currentY += 4.5;

        // Render label/value grid (3 columns across 269mm)
        const colWidth = 87;
        const colGap = 3;
        const rowHeight = 4.2;
        const startYGrid = currentY;

        items.forEach((item, itemIdx) => {
          const colIdx = itemIdx % 3;
          const rowIdx = Math.floor(itemIdx / 3);
          const x = 14 + colIdx * (colWidth + colGap);
          const y = startYGrid + rowIdx * rowHeight;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(71, 85, 105);
          doc.text(`${item.label}:`, x, y);

          const labelWidth = doc.getTextWidth(`${item.label}: `);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(30, 41, 59);
          doc.text(String(item.val), x + labelWidth + 0.5, y);
        });

        const totalGridRows = Math.ceil(items.length / 3);
        currentY = startYGrid + totalGridRows * rowHeight + 2;

        // Stream-Specific Insight Subsection
        if (insightItems.length > 0) {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(14, currentY, 283, currentY);
          currentY += 3.5;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text("Stream-Specific Insight", 14, currentY);
          currentY += 4;

          const startYInsightGrid = currentY;

          insightItems.forEach((item, itemIdx) => {
            const colIdx = itemIdx % 3;
            const rowIdx = Math.floor(itemIdx / 3);
            const x = 14 + colIdx * (colWidth + colGap);
            const y = startYInsightGrid + rowIdx * rowHeight;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.text(`${item.label}:`, x, y);

            const labelWidth = doc.getTextWidth(`${item.label}: `);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(30, 41, 59);
            
            const valStr = String(item.val);
            doc.text(valStr, x + labelWidth + 0.5, y);
          });

          const totalInsightRows = Math.ceil(insightItems.length / 3);
          currentY = startYInsightGrid + totalInsightRows * rowHeight + 2.5;
        }

        // Retention Notes Section
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text("Retention Notes:", 14, currentY);
        currentY += 3.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(wrappedNotes, 14, currentY);
        currentY += notesHeight + 6;

        // Divider between client blocks
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(14, currentY - 3, 283, currentY - 3);
      });

      // Footers across all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, 283 - 14, 202, { align: "right" });
        doc.text("GBK Financial CRM — Confidential Client Retention Report", 14, 202);
      }

      const filename = `GBK_Retention_${activeStream}_${todayStr}.pdf`;
      doc.save(filename);

      showToast("Retention PDF report generated successfully.", "success");
    } catch (err) {
      console.error("Failed to generate retention PDF:", err);
      showToast("Failed to generate PDF report.", "error");
    }
  };

  // Fast email sender simulation
  const handleSendEmailSimulation = () => {
    if (!outreachClient) return;

    // Simulate sending email (adds notes to the client)
    const todayStr = new Date().toISOString().split("T")[0];
    const currentYearStr = String(new Date().getFullYear());

    const updatedClients = clients.map(c => {
      if (c.id === outreachClient.id) {
        const updated: Client = {
          ...c,
          lastContactedDate: todayStr,
          retentionOutcome: "contacted",
          retentionNotes: `Sent Retention Email: "${compSubject}"`,
          updatedAt: new Date().toISOString()
        };
        if (activeStream === "renewals") {
          updated.renewalNotified = todayStr;
        } else if (activeStream === "birthdays") {
          updated.birthdayAcknowledged = currentYearStr;
        }
        return updated;
      }
      return c;
    });

    setClients(updatedClients);
    showToast(`Email successfully delivered to ${outreachClient.first} (${outreachClient.email})!`, "success");
    
    setOutreachClient(null);
    setOutreachType(null);
  };

  // Fast SMS sender simulation
  const handleSendSmsSimulation = () => {
    if (!outreachClient) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const currentYearStr = String(new Date().getFullYear());

    const updatedClients = clients.map(c => {
      if (c.id === outreachClient.id) {
        const updated: Client = {
          ...c,
          lastContactedDate: todayStr,
          retentionOutcome: "contacted",
          retentionNotes: `Sent SMS Outreach: "${customSms.slice(0, 40)}..."`,
          updatedAt: new Date().toISOString()
        };
        if (activeStream === "renewals") {
          updated.renewalNotified = todayStr;
        } else if (activeStream === "birthdays") {
          updated.birthdayAcknowledged = currentYearStr;
        }
        return updated;
      }
      return c;
    });

    setClients(updatedClients);
    showToast(`SMS outreach sent to ${outreachClient.cell || "client device"}!`, "success");

    setOutreachClient(null);
    setOutreachType(null);
  };

  // Update Owner assigned to client
  const handleUpdateOwner = (clientId: string, ownerName: string) => {
    const updated = clients.map(c => {
      if (c.id === clientId) {
        return { ...c, assignedBroker: ownerName, retentionOwner: ownerName, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    setClients(updated);
    showToast("Updated relationship owner assignment.", "info");
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden" id="retention-module-root">
      
      {/* Top Header Panel */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="retention-header-bar">
        <div>
          <h2 className="text-sm font-black uppercase text-[var(--color-accent)] tracking-widest flex items-center gap-1.5">
            <Heart className="h-4 w-4 fill-current text-[var(--color-accent)]" /> CRM Client Retention Desk
          </h2>
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">Post-close lifecycle automation, relationship nurturing, and proactive renewal locks</p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Agent Filter */}
          {isPrivileged ? (
            <div className="flex items-center gap-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2 py-1 rounded-lg text-xs">
              <Filter className="h-3 w-3 text-[var(--color-accent)]" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-transparent border-none text-[11px] text-[var(--color-text)] focus:outline-none font-bold"
              >
                <option value="All" className="bg-[var(--color-bg)]">All Owners</option>
                {userRoster.map(u => (
                  <option key={u.id} value={`${u.first} ${u.last}`} className="bg-[var(--color-bg)]">{u.first} {u.last}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[10px] text-[var(--color-accent)] font-black uppercase px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> personal client ledger
            </div>
          )}

          {/* Search */}
          <div className="relative bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1 flex items-center w-48 sm:w-60">
            <Search className="h-3.5 w-3.5 text-[var(--color-text-faint)] shrink-0 mr-1.5" />
            <input
              type="text"
              placeholder="Search past clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-[11px] text-[var(--color-text)] focus:outline-none w-full font-semibold placeholder-[var(--color-text-faint)]"
            />
          </div>
        </div>
      </div>

      {/* Overview Metric Stats Dashboard Banner */}
      <div className="bg-[var(--color-surface)] px-6 py-4 border-b border-[var(--color-border)]/60 grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0" id="retention-stats-panel">
        <button 
          onClick={() => setActiveStream("birthdays")}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
            activeStream === "birthdays" 
              ? "bg-[#b5a642]/10 border-[#b5a642]/40 shadow-md" 
              : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)]"
          }`}
        >
          <div className="flex justify-between items-center text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-all">
            <span className="text-[9px] uppercase font-black tracking-wider">Birthdays (30d)</span>
            <span className="text-pink-400 font-bold text-xs">🎂</span>
          </div>
          <span className="text-lg font-black block mt-1 text-[var(--color-text)]">{metrics.totalBirthdays}</span>
          <span className="text-[8px] text-[#b5a642] font-bold block mt-0.5">Nurture Touchpoint</span>
        </button>

        <button 
          onClick={() => setActiveStream("renewals")}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
            activeStream === "renewals" 
              ? "bg-[#6fa3b8]/10 border-[#6fa3b8]/40 shadow-md" 
              : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)]"
          }`}
        >
          <div className="flex justify-between items-center text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-all">
            <span className="text-[9px] uppercase font-black tracking-wider">Renewals (730d)</span>
            <span className="text-[#6fa3b8] font-bold text-xs">🔄</span>
          </div>
          <span className="text-lg font-black block mt-1 text-[var(--color-text)]">{metrics.totalRenewals}</span>
          <span className="text-[8px] text-emerald-500 font-bold block mt-0.5">High revenue risk</span>
        </button>

        <button 
          onClick={() => setActiveStream("anniversaries")}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
            activeStream === "anniversaries" 
              ? "bg-amber-500/10 border-amber-500/30 shadow-md" 
              : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)]"
          }`}
        >
          <div className="flex justify-between items-center text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-all">
            <span className="text-[9px] uppercase font-black tracking-wider">Anniversaries</span>
            <span className="text-amber-400 font-bold text-xs">🎉</span>
          </div>
          <span className="text-lg font-black block mt-1 text-[var(--color-text)]">{metrics.totalAnniversaries}</span>
          <span className="text-[8px] text-amber-500 dark:text-amber-300 font-bold block mt-0.5">Equity leverage moment</span>
        </button>

        <button 
          onClick={() => setActiveStream("reengage")}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
            activeStream === "reengage" 
              ? "bg-purple-500/10 border-purple-500/30 shadow-md" 
              : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)]"
          }`}
        >
          <div className="flex justify-between items-center text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-all">
            <span className="text-[9px] uppercase font-black tracking-wider">Re-engage Cold</span>
            <span className="text-purple-400 font-bold text-xs">⏰</span>
          </div>
          <span className="text-lg font-black block mt-1 text-[var(--color-text)]">{metrics.totalReengage}</span>
          <span className="text-[8px] text-purple-500 dark:text-purple-300 font-bold block mt-0.5">Quiet &gt; 90 Days</span>
        </button>

        <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-left hidden md:block">
          <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-black tracking-wider block">CRM Touchpoint Density</span>
          <span className="text-lg font-black block mt-1 text-[var(--color-accent)] font-mono">{metrics.outreachCompletionRate}%</span>
          <div className="w-full bg-[var(--color-surface)] h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-[var(--color-accent)] h-full" style={{ width: `${metrics.outreachCompletionRate}%` }} />
          </div>
        </div>
      </div>

      {/* Main Stream Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Stream Banner description & Sub-tier controls */}
        <div className="bg-[var(--color-surface-2)]/45 border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-xs">
              <span className="text-[var(--color-accent)] font-black uppercase tracking-wider block">
                {activeStream === "birthdays" && "🎂 Client Birthday Nurture Engine"}
                {activeStream === "renewals" && `🔄 Mortgage Renewal Defense Pipeline — ${renewalTier === "4mo" ? "4-Month Tier" : renewalTier === "6mo" ? "6-Month Tier" : renewalTier === "1yr" ? "1-Year Tier" : "2-Year Tier"}`}
                {activeStream === "anniversaries" && "🎉 Mortgage Funding Anniversary Touchpoints"}
                {activeStream === "reengage" && "⏰ Long-Time Cold Relationship Recovery Radar"}
              </span>
              <span className="text-[var(--color-text-muted)] block mt-0.5 font-semibold">
                {activeStream === "birthdays" && "Nurturing professional goodwill. Send birthdays warm check-ins without pressure."}
                {activeStream === "renewals" && "Defend funded clients before retail lenders lock them into high-rate default renewals."}
                {activeStream === "anniversaries" && "Identify strategic mortgage equity adjustments, GDS/TDS health reviews or property appreciation metrics."}
                {activeStream === "reengage" && "Ensure no client goes quiet. Rekindle relationships with personalized market updates."}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] rounded-lg text-xs font-bold transition-all border border-[var(--color-border)] flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Export Filtered Retention Records as PDF Report"
              >
                <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Export PDF
              </button>

              <div className="flex items-center gap-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1 text-xs">
                <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Sort:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "soonest" | "last_contacted" | "mortgage_amount")}
                  className="bg-transparent text-xs text-[var(--color-text)] font-bold focus:outline-none cursor-pointer"
                >
                  <option value="soonest" className="bg-[var(--color-bg)]">Soonest</option>
                  <option value="last_contacted" className="bg-[var(--color-bg)]">Last Contacted</option>
                  <option value="mortgage_amount" className="bg-[var(--color-bg)]">Mortgage Amount</option>
                </select>
              </div>
              <div className="shrink-0 bg-[var(--color-accent)]/10 px-3 py-1.5 rounded-full text-[10px] font-black text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                {filteredStreamClients.length} targets identified
              </div>
            </div>
          </div>

          {/* Renewal Sub-tier Tab Row */}
          {activeStream === "renewals" && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-[var(--color-border)]/50">
              <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider mr-1">Renewal Horizon Tiers:</span>
              {(["2yr", "1yr", "6mo", "4mo"] as const).map(tier => {
                const labels: Record<string, string> = { "2yr": "2 Yr", "1yr": "1 Yr", "6mo": "6 Mo", "4mo": "4 Mo" };
                const isActive = renewalTier === tier;
                const count = streamsData.renewals[tier].filter(matchesAgent).length;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setRenewalTier(tier)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "bg-[var(--color-accent)] text-black font-black shadow-sm"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)] border border-[var(--color-border)]"
                    }`}
                  >
                    <span>{labels[tier]}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? "bg-black/20 text-black font-black" : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Targets List */}
        {filteredStreamClients.length === 0 ? (
          <div className="bg-[var(--color-surface)]/40 border border-[var(--color-border)] rounded-2xl p-16 text-center space-y-2">
            <Heart className="h-10 w-10 text-[var(--color-text-faint)] mx-auto" />
            <p className="text-sm font-black text-[var(--color-text-muted)] uppercase">No target files matched</p>
            <p className="text-xs text-[var(--color-text-faint)] max-w-sm mx-auto font-medium">There are no client portfolios matching these timeline variables or filters at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5" id="retention-client-grid">
            {filteredStreamClients.map((client) => {
              const currentOwner = client.assignedBroker || client.retentionOwner || client.agent || `${currentUser.first} ${currentUser.last}`;
              
              // Anniversary year computation
              let yearsVal = 0;
              if (client.fundedDate) {
                yearsVal = new Date().getFullYear() - new Date(client.fundedDate).getFullYear();
                if (yearsVal <= 0) yearsVal = 1;
              }

              return (
                <div 
                  key={client.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] rounded-2xl p-5 flex flex-col justify-between transition-all"
                  id={`retention-card-${client.id}`}
                >
                  {/* Card upper row */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[var(--color-text)] hover:text-[var(--color-accent)] transition-all cursor-pointer">
                          {client.first} {client.last}
                        </span>
                        <span className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] text-[8px] font-black uppercase px-2 py-0.5 rounded border border-[var(--color-border)]">
                          {client.status.toUpperCase()}
                        </span>
                        {activeStream === "renewals" && (() => {
                          const matDate = getMaturityDate(client);
                          if (!matDate) return null;
                          const diffMs = matDate.getTime() - new Date().getTime();
                          const diffDays = Math.ceil(diffMs / (24 * 3600000));
                          if (diffDays <= 120) {
                            return (
                              <span className="bg-red-500/15 text-red-400 border border-red-500/30 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                🔴 Urgent
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <span className="text-[10px] text-[var(--color-text-faint)] font-semibold block mt-1">{client.addr || "No registered address"}</span>
                    </div>

                    <div className="text-right text-xs">
                      {activeStream === "birthdays" && (
                        <div className="bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                          Birthday: {client.dob ? new Date(client.dob).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                        </div>
                      )}
                      {activeStream === "renewals" && (() => {
                        const matDate = getMaturityDate(client);
                        const dateStr = matDate ? matDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";
                        const isComputed = !client.maturityDate && !!client.fundedDate;
                        
                        let diffDays = 0;
                        let chipClass = "text-red-400 bg-red-500/10 border-red-500/20";
                        if (matDate) {
                          const diffMs = matDate.getTime() - new Date().getTime();
                          diffDays = Math.ceil(diffMs / (24 * 3600000));
                          if (diffDays > 365) {
                            chipClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                          } else if (diffDays >= 181) {
                            chipClass = "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
                          } else if (diffDays >= 121) {
                            chipClass = "text-orange-400 bg-orange-400/10 border-orange-400/20";
                          } else {
                            chipClass = "text-red-400 bg-red-500/10 border-red-500/20";
                          }
                        }

                        return (
                          <div className="bg-[#6fa3b8]/15 border border-[#6fa3b8]/30 text-[#6fa3b8] text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                            <span>Maturity: {dateStr}</span>
                            {isComputed && <span className="text-[8px] opacity-80 font-semibold">(Computed)</span>}
                            {matDate && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${chipClass}`}>
                                {diffDays} days
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {activeStream === "anniversaries" && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                          Anniversary: {yearsVal} Year{yearsVal > 1 ? "s" : ""}
                        </div>
                      )}
                      {activeStream === "reengage" && (
                        <div className="bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                          Quiet: {client.lastContactedDate ? "Last Touch " + client.lastContactedDate : "Never Contacted"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Portfolio parameters panel */}
                  <div className="grid grid-cols-3 gap-2 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl p-3 my-4 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold block">Funded Lender</span>
                      <span className="text-[var(--color-text)] truncate block mt-0.5">{client.lender || "Scotiabank"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold block">Mortgage Amount</span>
                      <span className="text-[var(--color-text)] block mt-0.5">${(Number(client.mtgamt || 0)).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-bold block">
                        {activeStream === "renewals" ? "Mortgage Term" : "Client Contact"}
                      </span>
                      <span className="text-[var(--color-text)] block mt-0.5 text-[10px] truncate">
                        {activeStream === "renewals"
                          ? (client.mortgageTerm ? (client.mortgageTerm.toLowerCase().includes("term") ? client.mortgageTerm : client.mortgageTerm.toLowerCase().includes("-yr") ? `${client.mortgageTerm} Term` : `${client.mortgageTerm}-Yr Term`) : "5-Yr (Est.)")
                          : client.email}
                      </span>
                    </div>
                  </div>

                  {/* Operational Settings panel */}
                  <div className="border-t border-[var(--color-border)] pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                    
                    {/* Relationship Owner Assignment */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-[10px] text-[var(--color-text-muted)] font-semibold shrink-0">Owner:</span>
                      <select
                        value={currentOwner}
                        onChange={(e) => handleUpdateOwner(client.id, e.target.value)}
                        className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-1 text-[11px] text-[var(--color-text)] font-bold max-w-[140px]"
                      >
                        {userRoster.map(u => (
                          <option key={u.id} value={`${u.first} ${u.last}`} className="bg-[var(--color-bg)]">{u.first} {u.last}</option>
                        ))}
                      </select>
                    </div>

                    {/* Follow up status indicators */}
                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-black uppercase text-[var(--color-text-faint)]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div>
                          <span className="text-[var(--color-text-faint)]/60 mr-1">Last Touch:</span>
                          <span className="text-[var(--color-text-muted)] font-mono">{client.lastContactedDate || "None Logged"}</span>
                        </div>
                        {(() => {
                          const tpCount = getTouchpointCount(client);
                          return (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-[var(--color-border)] text-[var(--color-text-faint)] bg-[var(--color-surface-2)]/60 normal-case">
                              {tpCount === 0 ? "No touchpoints yet" : `${tpCount} touchpoint${tpCount === 1 ? "" : "s"}`}
                            </span>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="text-[var(--color-text-faint)]/60 mr-1">Next Call:</span>
                        <span className="text-[var(--color-accent)] font-mono">{client.nextFollowUpDate || "Not Set"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Outcome indicator summary if present */}
                  {client.retentionOutcome && (
                    <div className="bg-[var(--color-surface-2)] border-l-2 border-[var(--color-accent)] px-3 py-1.5 rounded-r mt-3 text-[11px] text-[var(--color-text-muted)] italic flex justify-between items-center">
                      <span>Outcome: "{client.retentionOutcome.toUpperCase()}" - {client.retentionNotes}</span>
                      <span className="text-[9px] text-[var(--color-text-faint)] not-italic font-mono">{client.lastContactedDate}</span>
                    </div>
                  )}

                  {/* Action Controls Section */}
                  <div className="border-t border-[var(--color-border)] mt-4 pt-4 flex flex-wrap gap-2 justify-between">
                    {/* Quick outreach channels */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenOutreach(client, "email")}
                        className="p-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] rounded-lg transition-all flex items-center gap-1 text-[11px] font-black uppercase border border-[var(--color-border)] cursor-pointer"
                        title="Send Email Campaign"
                      >
                        <Mail className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Email
                      </button>
                      <button 
                        onClick={() => handleOpenOutreach(client, "sms")}
                        className="p-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] rounded-lg transition-all flex items-center gap-1 text-[11px] font-black uppercase border border-[var(--color-border)] cursor-pointer"
                        title="Send SMS check-in"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#6fa3b8]" /> SMS
                      </button>
                      <button 
                        onClick={() => handleOpenOutreach(client, "outcome")}
                        className="p-2 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-lg transition-all flex items-center gap-1 text-[11px] font-black uppercase border border-[var(--color-accent)]/20 cursor-pointer"
                        title="Log Outreach Action"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Log Outcome
                      </button>
                    </div>

                    {/* Process / Scheduler triggers */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={() => setSnoozeMenuClientId(snoozeMenuClientId === client.id ? null : client.id)}
                          className="p-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg transition-all text-[11px] font-black uppercase border border-[var(--color-border)] flex items-center gap-1 cursor-pointer"
                          title="Snooze Follow-up"
                        >
                          <Clock className="h-3.5 w-3.5 text-blue-400" /> Snooze
                        </button>
                        {snoozeMenuClientId === client.id && (
                          <div className="absolute right-0 sm:left-0 sm:right-auto bottom-full mb-1 z-30 w-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl p-1 flex flex-col gap-0.5 text-xs">
                            <div className="text-[9px] font-black uppercase text-[var(--color-text-faint)] px-2 py-1 border-b border-[var(--color-border)]/50">
                              Snooze Follow-up
                            </div>
                            {[7, 14, 30].map(days => (
                              <button
                                key={days}
                                onClick={() => handleSnooze(client, days)}
                                className="w-full text-left px-2 py-1.5 hover:bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold rounded transition-colors cursor-pointer text-xs"
                              >
                                {days} days
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenTaskCreation(client)}
                        className="p-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] rounded-lg transition-all text-[11px] font-black uppercase border border-[var(--color-border)] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-500" /> Create Task
                      </button>
                      
                      {(activeStream === "renewals" || activeStream === "reengage" || activeStream === "anniversaries") && (
                        <button
                          onClick={() => handleConvertToLead(client)}
                          className="px-3 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black font-black rounded-lg transition-all text-[11px] font-black uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Convert to Lead
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outreach modal windows overlay */}
      {outreachClient && outreachType && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" id="outreach-overlay">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl p-6 relative flex flex-col max-h-[90vh] overflow-hidden shadow-xl">
            
            {/* Close */}
            <button 
              onClick={() => { setOutreachClient(null); setOutreachType(null); }}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider text-[var(--color-accent)] flex items-center gap-2 mb-2">
              {outreachType === "email" && <Mail className="h-5 w-5" />}
              {outreachType === "sms" && <MessageSquare className="h-5 w-5" />}
              {outreachType === "outcome" && <CheckCircle className="h-5 w-5" />}
              {outreachType === "email" && `Send Retention Email to ${outreachClient.first}`}
              {outreachType === "sms" && `Compose SMS to ${outreachClient.first}`}
              {outreachType === "outcome" && `Log Interaction Outcome: ${outreachClient.first} ${outreachClient.last}`}
            </h3>
            <p className="text-xs text-[var(--color-text-faint)] font-semibold mb-4 border-b border-[var(--color-border)] pb-3">
              Target Profile: ID {outreachClient.id} • Assigned Owner: {outreachClient.retentionOwner || `${currentUser.first} ${currentUser.last}`}
            </p>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-semibold">
              {/* EMAIL COMPOSER PANEL */}
              {outreachType === "email" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">To Email Address</label>
                    <input 
                      type="text" 
                      value={outreachClient.email} 
                      disabled 
                      className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] text-[var(--color-text-muted)] px-3 py-2 rounded-lg cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Email Subject</label>
                    <input 
                      type="text" 
                      value={compSubject} 
                      onChange={(e) => setCompSubject(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30 font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Email Body Content</label>
                      <span className="text-[9px] text-[var(--color-accent)]">Placeholders resolved</span>
                    </div>
                    <textarea 
                      rows={12}
                      value={compBody} 
                      onChange={(e) => setCompBody(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2.5 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30 font-sans leading-relaxed"
                    />
                  </div>
                </>
              )}

              {/* SMS COMPOSER PANEL */}
              {outreachType === "sms" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Client Mobile Number</label>
                    <input 
                      type="text" 
                      value={outreachClient.cell || "(No Mobile Registered)"} 
                      disabled 
                      className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] text-[var(--color-text-muted)] px-3 py-2 rounded-lg cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">SMS Text Message</label>
                    <textarea 
                      rows={6}
                      value={customSms} 
                      onChange={(e) => setCustomSms(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2.5 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30 font-semibold"
                    />
                    <div className="flex justify-between text-[9px] text-[var(--color-text-faint)] mt-1">
                      <span>SMS character limit check (standard length)</span>
                      <span className={`font-mono font-bold ${
                        customSms.length > 320 
                          ? "text-red-400" 
                          : customSms.length > 160 
                            ? "text-amber-400" 
                            : "text-emerald-400"
                      }`}>
                        {customSms.length} chars
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* MANUAL INTERACTION OUTCOME LOGGER */}
              {outreachType === "outcome" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Interaction Outcome Type</label>
                      <select
                        value={outcomeType}
                        onChange={(e) => setOutcomeType(e.target.value)}
                        className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30"
                      >
                        <option value="contacted" className="bg-[var(--color-bg)] text-[var(--color-text)]">Contacted (Spoke directly)</option>
                        <option value="no response" className="bg-[var(--color-bg)] text-[var(--color-text)]">No Response (Left Voicemail/Text)</option>
                        <option value="booked review" className="bg-[var(--color-bg)] text-[var(--color-text)]">Booked Mortgage Review Meeting</option>
                        <option value="referred someone" className="bg-[var(--color-bg)] text-[var(--color-text)]">Referred Someone New</option>
                        <option value="renewal opportunity created" className="bg-[var(--color-bg)] text-[var(--color-text)]">Renewal Opportunity Created</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Next Follow-up Due Date</label>
                      <input 
                        type="date"
                        value={nextFollowUp}
                        onChange={(e) => setNextFollowUp(e.target.value)}
                        className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-3">
                    <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Conversation Log Notes</label>
                    <textarea 
                      rows={5}
                      value={outcomeNotes} 
                      onChange={(e) => setOutcomeNotes(e.target.value)}
                      placeholder="Add summary notes regarding current housing updates, GDS interest rates discussed, or next timeline expectations..."
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30 font-medium"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal actions footer */}
            <div className="border-t border-[var(--color-border)] mt-5 pt-4 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setOutreachClient(null); setOutreachType(null); }}
                className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] rounded-lg text-xs font-bold transition-all border border-[var(--color-border)]"
              >
                Cancel
              </button>
              
              {outreachType === "email" && (
                <button
                  onClick={handleSendEmailSimulation}
                  className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all"
                >
                  <Send className="h-3.5 w-3.5" /> Deliver Email
                </button>
              )}

              {outreachType === "sms" && (
                <button
                  onClick={handleSendSmsSimulation}
                  className="px-4 py-2 bg-[#6fa3b8] hover:bg-[#568fa5] text-black rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all"
                >
                  <Send className="h-3.5 w-3.5" /> Transmit SMS
                </button>
              )}

              {outreachType === "outcome" && (
                <button
                  onClick={handleLogOutcomeSave}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-xs font-black uppercase transition-all"
                >
                  Save Log Entry
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Task Creation Modal overlay */}
      {taskClient && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" id="task-creation-overlay">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 relative flex flex-col text-xs font-semibold shadow-xl">
            
            {/* Close */}
            <button 
              onClick={() => setTaskClient(null)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider text-[var(--color-accent)] flex items-center gap-2 mb-3">
              <CheckSquare className="h-5 w-5" /> Create Retention Follow-up Task
            </h3>
            <p className="text-[var(--color-text-faint)] mb-4 border-b border-[var(--color-border)] pb-2 font-semibold">
              Client: {taskClient.first} {taskClient.last} • Assigned: {taskClient.retentionOwner || `${currentUser.first} ${currentUser.last}`}
            </p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Task Objective Title</label>
                <input 
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 rounded-lg font-bold focus:outline-none focus:border-[var(--color-accent)]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Action Due Date</label>
                  <input 
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase text-[var(--color-text-faint)] font-bold">Priority Status</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[var(--color-accent)]/30"
                  >
                    <option value="high" className="bg-[var(--color-bg)]">🔴 High Priority</option>
                    <option value="medium" className="bg-[var(--color-bg)]">🟡 Medium Priority</option>
                    <option value="low" className="bg-[var(--color-bg)]">🟢 Low Priority</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] mt-5 pt-4 flex justify-end gap-3">
              <button
                onClick={() => setTaskClient(null)}
                className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] rounded-lg text-xs font-bold transition-all border border-[var(--color-border)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black rounded-lg text-xs font-black uppercase transition-all cursor-pointer"
              >
                Schedule Task
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Convert to Active Lead Confirmation Modal */}
      {convertConfirmClient && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" id="convert-lead-modal-overlay">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 relative flex flex-col text-xs font-semibold shadow-xl">
            
            {/* Close */}
            <button 
              onClick={() => setConvertConfirmClient(null)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider text-[var(--color-accent)] flex items-center gap-2 mb-2">
              <UserPlus className="h-5 w-5" /> Convert to Active Lead
            </h3>
            <p className="text-[var(--color-text-faint)] mb-4 border-b border-[var(--color-border)] pb-3 font-semibold text-[11px] leading-relaxed">
              This action clones the historic client profile into a new active mortgage lead file while preserving their original funded and closed records.
            </p>

            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2.5 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-faint)] font-bold uppercase text-[9px]">Client Profile</span>
                <span className="text-[var(--color-text)] font-black">{convertConfirmClient.first} {convertConfirmClient.last}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-faint)] font-bold uppercase text-[9px]">Current Status</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30">
                  {convertConfirmClient.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-faint)] font-bold uppercase text-[9px]">Current Lender</span>
                <span className="text-[var(--color-text-muted)] font-semibold">{convertConfirmClient.lender || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-faint)] font-bold uppercase text-[9px]">Mortgage Amount</span>
                <span className="text-[var(--color-text)] font-mono font-bold">
                  {convertConfirmClient.mtgamt ? `$${Number(convertConfirmClient.mtgamt).toLocaleString()}` : "N/A"}
                </span>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 flex justify-end gap-3">
              <button
                onClick={() => setConvertConfirmClient(null)}
                className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] rounded-lg text-xs font-bold transition-all border border-[var(--color-border)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConvert}
                className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" /> Confirm — Convert
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
