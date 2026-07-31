import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, Clipboard, Check, RefreshCw, Send, FileText, Mail, 
  FileCheck, CheckSquare, Plus, AlertCircle, User, CheckCircle2, 
  Trash2, Landmark, History, MessageSquare, ChevronRight, HelpCircle,
  FileSpreadsheet, ShieldAlert, ArrowRight, CornerDownRight, ChevronDown,
  Search
} from "lucide-react";
import { Client, Task, User as CRMUser } from "../types";
import { getNotesForClient, saveNotesForClient, logActivityEvent, FileNote } from "../lib/activityEngine";
import { generateChecklistForClient, evaluateChecklistReadiness } from "../lib/checklistEngine";
import { BRIDGE_URL } from "../lib/bridgeService";
import { safeJsonParse } from "../lib/json";

const renderInlineMarkdown = (text: string) => {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const processed = escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
  return { __html: processed };
};

interface AIAssistantCenterProps {
  clients: Client[];
  currentUser: CRMUser;
  docVault: Record<string, any>;
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">) => void;
  onUpdateClient: (updated: Client) => void;
  showToast: (msg: string, type?: "success" | "error" | "info", icon?: string) => void;
  currentClient?: Client | null;
  onSelectClient?: (client: Client | null) => void;
  onOpenClientDetail?: (clientId: string) => void;
}

interface AIHistoryItem {
  id: string;
  clientId: string;
  clientName: string;
  toolName: string;
  timestamp: string;
  prompt: string;
  response: string;
}

export const AIAssistantCenter: React.FC<AIAssistantCenterProps> = ({
  clients,
  currentUser,
  docVault,
  tasks,
  onAddTask,
  onUpdateClient,
  showToast,
  currentClient: propCurrentClient,
  onSelectClient,
  onOpenClientDetail
}) => {
  // Main states
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [userHasChosen, setUserHasChosen] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>("");
  const [aiOutput, setAiOutput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<string>("summary");

  const loadingMessages = useMemo(() => [
    "Analyzing file qualifiers...",
    "Consulting Canadian Monoline Ratios...",
    "Evaluating stress test thresholds...",
    "Drafting output..."
  ], []);

  useEffect(() => {
    if (!loading) {
      setLoadingMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading, loadingMessages]);
  
  // Search query states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  
  // Custom Raw Ingest text state for Intake Summary Tool
  const [rawIntakeText, setRawIntakeText] = useState<string>("");

  // Extracted tasks state from Task Builder tool
  const [extractedTasks, setExtractedTasks] = useState<Array<{ title: string; priority: "high" | "medium" | "low"; notes: string }>>([]);

  // AI results history stored locally
  const [history, setHistory] = useState<AIHistoryItem[]>(() => {
    const saved = localStorage.getItem("gbk_ai_assistance_history");
    return safeJsonParse(saved, []);
  });

  const [copied, setCopied] = useState<boolean>(false);

  // Scroll tracking and auto-scroll states & refs
  const outputScrollRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

  const handleScroll = () => {
    const container = outputScrollRef.current;
    if (!container) return;
    const isCloseToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    setIsAtBottom(isCloseToBottom);
  };

  // Auto-scroll when output or loading state changes if at bottom
  useEffect(() => {
    if (isAtBottom && outputScrollRef.current) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  }, [aiOutput, loading, isAtBottom]);

  // Role-based allowed clients logic
  const isOwnerOrManager = useMemo(() => {
    return currentUser.role === "Developer/Admin" || currentUser.role === "Admin";
  }, [currentUser.role]);

  const allowedClients = useMemo(() => {
    if (isOwnerOrManager) return clients;
    const currentFullName = `${currentUser.first} ${currentUser.last}`.trim().toLowerCase();
    const filtered = clients.filter(c => {
      return c.agent && c.agent.trim().toLowerCase() === currentFullName;
    });
    return filtered.length > 0 ? filtered : clients;
  }, [clients, isOwnerOrManager, currentUser]);

  // Filter clients based on user search query
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return allowedClients.slice(0, 50);
    }
    return allowedClients.filter(c => {
      const first = (c.first || "").toLowerCase();
      const last = (c.last || "").toLowerCase();
      const name = `${first} ${last}`;
      const email = (c.email || "").toLowerCase();
      const cell = (c.cell || "").toLowerCase();
      const addr = (c.addr || "").toLowerCase();
      const lender = (c.lender || "").toLowerCase();
      const status = (c.status || "").toLowerCase();
      const co = (c.co || "").toLowerCase();
      
      return first.includes(q) ||
             last.includes(q) ||
             name.includes(q) ||
             email.includes(q) ||
             cell.includes(q) ||
             addr.includes(q) ||
             lender.includes(q) ||
             status.includes(q) ||
             co.includes(q);
    });
  }, [allowedClients, searchQuery]);

  // Unified client selection and prop synchronization
  useEffect(() => {
    if (propCurrentClient) {
      // Check permission: Is this client allowed for the current user?
      const isAllowed = allowedClients.some(c => c.id === propCurrentClient.id);
      if (isAllowed) {
        if (selectedClientId !== propCurrentClient.id) {
          setSelectedClientId(propCurrentClient.id);
        }
      } else {
        // Restricted or deleted client: clear from context
        setSelectedClientId("");
        if (onSelectClient) {
          onSelectClient(null);
        }
      }
    } else {
      // Auto-fallback only if user has not chosen and current client is empty
      if (!userHasChosen && selectedClientId === "" && allowedClients.length > 0) {
        const fallback = allowedClients[0];
        setSelectedClientId(fallback.id);
        if (onSelectClient) {
          onSelectClient(fallback);
        }
      } else if (selectedClientId !== "" && !userHasChosen) {
        // If the parent client is null and no choice was made, clear it
        setSelectedClientId("");
      }
    }
  }, [propCurrentClient, allowedClients, selectedClientId, onSelectClient, userHasChosen]);

  // Selection change handler that syncs with parent database
  const handleSelectClient = (clientId: string) => {
    setUserHasChosen(true);
    setSelectedClientId(clientId);
    setAiOutput("");
    setExtractedTasks([]);
    if (onSelectClient) {
      const client = clients.find(c => c.id === clientId) || null;
      onSelectClient(client);
    }
  };

  // Selected client memo
  const currentClient = useMemo(() => {
    return allowedClients.find(c => c.id === selectedClientId) || clients.find(c => c.id === selectedClientId) || null;
  }, [allowedClients, clients, selectedClientId]);

  // Save history helper
  const saveHistory = (newHistory: AIHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("gbk_ai_assistance_history", JSON.stringify(newHistory));
  };

  // Clear history
  const handleClearHistory = () => {
    saveHistory([]);
    showToast("AI history cleared.", "info");
  };

  // Helper to format currency
  const formatCurrency = (val: string | number | undefined) => {
    if (!val) return "$0";
    const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) : val;
    return isNaN(num) ? "$0" : `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  // Calculate quick metrics for the active client
  const clientMetrics = useMemo(() => {
    if (!currentClient) return null;
    const incomeVal = Number(currentClient.income || 0);
    const coIncomeVal = Number(currentClient.coIncome || 0);
    const combinedIncome = incomeVal + coIncomeVal;
    
    const mtgAmt = Number(currentClient.mtgamt || 0);
    const propVal = Number(currentClient.propval || 0);
    const ltv = propVal > 0 ? (mtgAmt / propVal) * 100 : 0;

    const beacon = Number(currentClient.beacon || 0);
    const status = (currentClient.status || "").toLowerCase();
    
    let fileHealth: "strong" | "review" | "atrisk" = "atrisk";
    if (beacon >= 680 && ltv <= 80 && (status === "approved" || status === "working")) {
      fileHealth = "strong";
    } else if (beacon >= 600 && ltv <= 90) {
      fileHealth = "review";
    }

    return {
      combinedIncome,
      ltv: Math.round(ltv),
      fileHealth,
    };
  }, [currentClient]);

  // Generate dynamic client notes and document status text for AI context
  const getClientContextString = (client: Client): string => {
    const clientDocs = docVault[client.id] || 
                       docVault[client.id.toLowerCase()] || 
                       docVault[Object.keys(docVault).find(key => key.toLowerCase() === client.id.toLowerCase()) || ""] || 
                       {};
    const docsSummary = Object.keys(clientDocs)
      .map(key => {
        const d = clientDocs[key];
        return `- ${d.label || key}: status is "${d.status || 'unknown'}"`;
      })
      .join("\n");

    const notes = getNotesForClient(client);
    const notesSummary = notes.slice(0, 5).map(n => `[${n.type.toUpperCase()} by ${n.author} at ${new Date(n.timestamp).toLocaleDateString()}]: ${n.content}`).join("\n");

    return `
Client Profile Name: ${client.first} ${client.last}
Co-Applicant: ${client.co || "None"}
Status/Stage: ${client.status.toUpperCase()}
Subject Property Address: ${client.addr || "Not specified"}
Property Value: ${formatCurrency(client.propval)}
Mortgage Requested: ${formatCurrency(client.mtgamt)}
Combined Income: ${formatCurrency(clientMetrics?.combinedIncome)}/year
Primary Employer/Tenure: ${client.emptype || "Not fully specified"}
Credit Score (Beacon): ${client.beacon || "Not provided"}
Monthly Debts: ${formatCurrency(client.debts)}
Property Taxes: ${formatCurrency(client.tax)}/yr

CURRENT DOCUMENT STATUS IN VAULT:
${docsSummary || "No documents uploaded yet."}

RECENT TEAM NOTES ON THE FILE:
${notesSummary || "No notes logged yet."}
`;
  };

  // TRIGGER AI WORKFLOW
  const triggerAITool = async (toolKey: string, payloadOverride?: string) => {
    if (!currentClient && toolKey !== "intake_raw" && toolKey !== "custom") {
      showToast("Please select a client file first.", "error");
      return;
    }

    setLoading(true);
    setAiOutput("");
    setExtractedTasks([]);
    setActiveTool(toolKey);
    setIsAtBottom(true);

    const clientName = currentClient ? `${currentClient.first} ${currentClient.last}` : "General System Context";
    const clientContext = currentClient ? getClientContextString(currentClient) : "";

    let prompt = "";
    let systemInstruction = "You are a senior Canadian mortgage broker, underwriter, and expert systems companion at GBK Financial (Ontario, Canada). ";

    // Role-based adaptations
    if (currentUser.role.toLowerCase().includes("broker") || currentUser.role.toLowerCase().includes("agent")) {
      systemInstruction += "Focus highly on saving broker time, creating polite client drafting, highlighting next sales steps, pre-approval hold timelines, and conversion triggers.";
    } else {
      systemInstruction += "Focus strictly on compliance audit, GDS/TDS stress test verification, alt-lender policy exceptions, file credit risk, and manager-level brief oversight.";
    }

    switch (toolKey) {
      case "summary":
        prompt = `Perform a comprehensive, professional mortgage file underwrite and file summary. Break the analysis into these precise sections with professional headers:
1. UNDERWRITING PROFILE: Elegantly list Loan-to-Value (LTV), credit risk tier, and estimated GDS/TDS compliance.
2. FILE KEY STRENGTHS: Bullet points detailing the strongest qualifying aspects (income stability, beacon, etc).
3. POTENTIAL RISKS & BLOCKED RATIOS: Bullet points outlining any issues with down payment verification, tenure, property type, or high ratios.
4. MATCHING LENDER tier WORKFLOW: Recommendation of Lender Category (A-Lender e.g., MCAP/TD; Alt-A/B-Lender e.g., Equitable Bank; or Private/Equity) with an explanation of why.
5. RECOMMENDATION NOTES: Concise underwriter checklist summary.`;
        break;

      case "missing_docs":
        prompt = `Compare the client's file stage (${currentClient?.status}), their employment type (${currentClient?.emptype || "salary"}), and vault document status.
Generate a structured, professional report titled: "REQUISITION LIST & FILE COMPLETENESS AUDIT".
- List of Approved/Received Documents (explain briefly why they are acceptable).
- List of OUTSTANDING / MISSING Documents (specifically tailored to their profile - e.g., if self-employed, demand 2-years of NOAs/T1 Generals; if salaried, demand Letter of Employment and pay stubs; if purchasing, demand MLS listing & Agreement of Purchase and Sale).
- Explain exactly why each outstanding document is critical to clear downstream lender conditions.`;
        break;

      case "follow_up":
        const subTemplate = payloadOverride || "outstanding_docs";
        if (subTemplate === "outstanding_docs") {
          prompt = `Draft a personalized, highly professional client email requesting outstanding/missing mortgage application documents. 
Include placeholders or direct mentions of missing files (referencing pay stubs, Letter of Employment, down payment bank statements, etc).
Keep the tone helpful, reassuring, yet urgent to keep the file moving.
Use Canadian terminology, mention OSFI guidelines or stress test validation, and make it easy to read with neat bullet points.`;
        } else if (subTemplate === "borderline_tds") {
          prompt = `Draft a polite, expert mortgage advisory email to the client counseling them on borderline debt service (GDS/TDS) ratios.
Explain what GDS/TDS is simply. Explain how paying off a small balance (e.g. credit cards, car loans) will significantly increase their qualifying loan limit or shift them into a lower interest rate A-Lender product.
Provide a clear, strategic recommendation table.`;
        } else if (subTemplate === "status_update") {
          if (!currentClient) {
            showToast("Please select a client file for the status update email", "error");
            setLoading(false);
            return;
          }
          prompt = `Draft a beautiful client status update email. Let them know the underwriting team has reviewed their file status as [${currentClient?.status.toUpperCase()}] and outline the upcoming milestone, explaining what happens next in the Canadian mortgage process (e.g., appraisal, commitment signing, legal instructions).`;
        }
        break;

      case "partner_comm":
        const partnerType = payloadOverride || "lender";
        if (partnerType === "lender") {
          prompt = `Draft a formal submission summary email to a Canadian monoline or institutional underwriter (e.g. First National, MCAP, TD, RMG) pitching this file.
Clearly outline the client strength narrative (e.g. strong professional tenure, high net-worth, clear explanation of any credit blemishes), request specific rate-hold validation, and justify why this file fits their core underwriting guidelines.`;
        } else if (partnerType === "realtor") {
          prompt = `Draft a professional status update email to the client's Realtor. 
Keep client personal financial details completely confidential, but confidently reassure them of the file's progress (e.g. financing condition is on track, pre-approval is solid, or we are finalizing monoline approval). Let them know we are working to clear conditions quickly to support their timeline.`;
        } else {
          prompt = `Draft a clear communication email to the closing Solicitor/Lawyer. Request their progress on title transfer verification, confirm where closing documentation will be directed, and outline the estimated funding date.`;
        }
        break;

      case "tasks":
        prompt = `Analyze the team notes and client financial profile. You must generate 3 specific, highly actionable task objects for the broker workflow.
Format your entire output strictly as a JSON array of objects. Do not wrap in markdown \`\`\`json blocks or backticks. Only return raw JSON.
Each object must have exactly these keys:
- "title": a clear, action-oriented task name (under 50 characters)
- "priority": must be "high", "medium", or "low"
- "notes": details on why this task is critical based on the notes or profile

Example:
[
  {"title": "Request 12-month Rent History", "priority": "high", "notes": "Required to prove strong repayment behavior for Alt-A workflow."},
  {"title": "Order Appraisal Report", "priority": "medium", "notes": "Subject property in rural zone requires localized appraisal verification."}
]`;
        break;

      case "intake_raw":
        const textToDigest = payloadOverride || rawIntakeText;
        if (!textToDigest.trim()) {
          showToast("Please enter some raw application or email intake text first.", "error");
          setLoading(false);
          return;
        }
        prompt = `Analyze this raw mortgage application form text, email inquiries, or broker notes and compile a highly structured INTAKE DIGEST.
Extract applicant names, estimated incomes, credit feedback, mortgage requested, property address, and highlight immediate logical red flags or next actions.
Text to analyze:
${textToDigest}`;
        break;

      case "recommender":
        prompt = `Perform a predictive audit of this file's current status [${currentClient?.status.toUpperCase()}] and potential roadblocks.
        Provide exactly 3 strategic "Next Best Action" recommendations tailored for the broker.
        For example, if the LTV is > 80%, recommend CMHC high-ratio guidelines. If Credit is under 600, recommend alternative monoline or private match. If the file is still a "Lead", suggest immediate initial follow-up templates.
        Make recommendations punchy with bold headers and action timelines.`;
        break;

      case "draft_notes":
        prompt = `Based on the client's mortgage profile, draft a professional, concise internal underwriter file note.
This note will be saved in the client's file history. It should contain:
- FILE STATUS SUMMARY: A concise 2-sentence summary of the current loan-to-value (LTV), income, credit beacon, and property details.
- VERIFICATION LOGS: A brief status log of outstanding/missing files and checklist readiness.
- INTERNAL BROKER ACTION STEPS: Immediate task guidelines for the broker or underwriter.
Keep it compact, highly professional, and written in standard underwriting shorthand.`;
        break;

      case "custom":
        if (!aiInput.trim()) {
          showToast("Please enter a custom question or command.", "error");
          setLoading(false);
          return;
        }
        prompt = aiInput;
        break;

      default:
        prompt = "Provide a general summary of this client file.";
    }

    try {
      const BRIDGE_TOKEN = (import.meta as any).env?.VITE_BRIDGE_TOKEN || "gbk-local-secret-2024";
      const response = await fetch(`/api/ai/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-gbk-token": BRIDGE_TOKEN
        },
        body: JSON.stringify({
          message: prompt,
          history: [],
          clientContext: clientContext
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to contact Gemini");

      const reply = data.reply || "";

      // Check if this was the task builder tool
      if (toolKey === "tasks") {
        try {
          // Attempt to parse clean JSON or clean it of JSON backticks if present
          let cleanJson = reply.trim();
          if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();
          }
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed)) {
            setExtractedTasks(parsed);
            setAiOutput("### AI Extracted Tasks successfully!\nBelow are the suggested items extracted from notes and file analysis. Review and click '+' to add them directly to your CRM checklist.");
          } else {
            setAiOutput(reply);
          }
        } catch (jsonErr) {
          // Fallback to text output if JSON parsing failed
          setAiOutput(reply);
        }
      } else {
        setAiOutput(reply);
      }

      // Save to local history
      const newHistoryItem: AIHistoryItem = {
        id: `ai_${Date.now()}`,
        clientId: currentClient ? currentClient.id : "general",
        clientName: clientName,
        toolName: getToolLabel(toolKey, payloadOverride),
        timestamp: new Date().toISOString(),
        prompt: prompt.substring(0, 100),
        response: reply
      };

      const updatedHistory = [newHistoryItem, ...history].slice(0, 30);
      saveHistory(updatedHistory);
      logActivityEvent({
        clientId: currentClient ? currentClient.id : "general",
        clientName: clientName,
        eventType: "communication_logged",
        user: `${currentUser.first} ${currentUser.last}`,
        timestamp: new Date().toISOString(),
        description: `Generated AI assistance output: "${newHistoryItem.toolName}"`
      });

      showToast("AI suggestion generated!", "success", "✦");
    } catch (err: any) {
      console.error(err);
      setAiOutput(`⚠️ Error: ${err.message}\nPlease make sure your server is running and the Gemini API key is configured correctly.`);
      showToast(err.message, "error", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  // Label helper
  const getToolLabel = (key: string, payload?: string): string => {
    switch (key) {
      case "summary": return "Underwriting File Summary";
      case "missing_docs": return "Missing Documents Requisition";
      case "follow_up": return `Follow-Up Email (${payload || "General"})`;
      case "partner_comm": return `Partner Email (${payload || "General"})`;
      case "tasks": return "AI Task Builder";
      case "intake_raw": return "Raw Ingestion Summary";
      case "recommender": return "Next Step Strategy Recommender";
      case "draft_notes": return "Underwriting Note Drafter";
      case "custom": return "Custom Copilot Prompt";
      default: return "AI Advisor Query";
    }
  };

  // COPY OUTPUT TO CLIPBOARD
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(aiOutput);
    setCopied(true);
    showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // SAVE AS CLIENT INTERNAL FILE NOTE
  const handleSaveToClientNotes = () => {
    if (!currentClient) {
      showToast("No selected client to save notes to.", "error");
      return;
    }

    const currentNotes = getNotesForClient(currentClient);
    const newNote: FileNote = {
      id: `note_ai_${Date.now()}`,
      clientId: currentClient.id,
      author: `✦ GBK AI Copilot`,
      timestamp: new Date().toISOString(),
      type: "underwriting",
      content: `AI WORKFLOW OUTPUT [${getToolLabel(activeTool)}]:\n\n${aiOutput}`,
      tags: ["ai-generated", activeTool]
    };

    const updated = [newNote, ...currentNotes];
    saveNotesForClient(currentClient.id, updated);
    
    // Trigger update on client to refresh CRM wide timestamps
    onUpdateClient({
      ...currentClient,
      updatedAt: new Date().toISOString()
    });

    logActivityEvent({
      clientId: currentClient.id,
      clientName: `${currentClient.first} ${currentClient.last}`,
      eventType: "note_added",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Saved AI-generated underwriting brief to internal file notes.`
    });

    showToast("Saved directly to Client's File Notes!", "success", "💾");
  };

  // ADD EXTRACTED TASK TO CRM LIST
  const handleAddExtractedTask = (title: string, priority: "high" | "medium" | "low", notes: string) => {
    if (!currentClient) return;
    
    onAddTask({
      title,
      status: "open",
      priority,
      clientId: currentClient.id,
      clientName: `${currentClient.first} ${currentClient.last}`,
      notes: `${notes} (Created via GBK AI Workspace)`,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0] // default 1 week out
    });

    setExtractedTasks(prev => prev.filter(t => t.title !== title));
    showToast(`Task added to CRM: "${title}"`, "success", "✅");
  };

  // Pre-load raw text area with sample application if empty
  const loadSampleIntake = () => {
    setRawIntakeText(`From: VDacosta247@gmail.com
Subject: Inquiry - New Mortgage Pre-Approval Ontario

Hi GBK team, I'm hoping to get a pre-approval sorted. My name is Vanessa Dacosta, cell is 416-555-8910.
I'm looking to buy a townhome in Hamilton for around $650,000. I have about $70,000 saved for down payment. 
I work full-time as an HR Manager at Ontario Tech (making $92,000/year, salaried, been there 4 years). 
My credit score is pretty good, around 740 according to my bank app. I do have a car lease payment of $420/month and a student loan with a minimum payment of $150/month. 
Could you please let me know what my max qualifying amount is under the stress test? Thanks!`);
    showToast("Loaded sample intake application.", "info");
  };

  // Group quick actions depending on the role
  const isBroker = currentUser.role.toLowerCase().includes("broker") || currentUser.role.toLowerCase().includes("agent");

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-10 text-sans" id="ai-assistance-center">
      
      {/* 1. CLEAR PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-[var(--color-surface-2)] to-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[rgba(244,163,132,0.15)] text-[var(--color-primary)] rounded-lg">
              <Sparkles className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-wider text-[var(--color-text)]">GBK AI Productivity Workspace</h2>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] max-w-2xl">
            A real-time mortgage operations assistant. Instantly generate professional client emails, run monoline underwriters briefs, draft partner updates, extract tasks from notes, and review files.
          </p>
        </div>
        
        {/* Role-Aware Focus Advisory */}
        <div className="px-3 py-2 rounded-lg bg-[rgba(244,163,132,0.05)] border border-[rgba(244,163,132,0.2)] flex flex-col gap-0.5 max-w-xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-1">
            <User className="w-3 h-3" /> Focus Advisory Active
          </span>
          <span className="text-[9px] text-[var(--color-text)] font-semibold">
            {isBroker 
              ? "Broker Mode: Prioritizing follow-ups, client files, and next steps first."
              : "Admin Mode: Prioritizing qualifiers, file blockers, and monoline emails."
            }
          </span>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE ROW Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CLIENT CONTEXT & QUICK TOOLS (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CLIENT CONTEXT PICKER */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[var(--color-accent)]" /> 1. Selected Client
              </h3>
              <span className="text-[9px] bg-[var(--color-surface-2)] text-[var(--color-text-faint)] px-1.5 py-0.5 rounded font-mono">CRM-LINKED</span>
            </div>
            
            {/* UNIFIED SEARCH & SELECT COMPONENT */}
            <div className="relative space-y-1">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">Search &amp; Select Client</span>
              <div className="relative flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder={currentClient ? `${currentClient.first} ${currentClient.last} (${currentClient.status.toUpperCase()})` : "Type name, email, phone, lender..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 300)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-8 pr-8 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] font-semibold"
                  />
                  <span className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {currentClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserHasChosen(false);
                      handleSelectClient("");
                      setSearchQuery("");
                    }}
                    className="px-2.5 py-1 text-[10px] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-semibold rounded-lg transition"
                    title="Switch to General Knowledge Base (No Client)"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {dropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl divide-y divide-[var(--color-border)]">
                  {currentClient && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setUserHasChosen(false);
                        handleSelectClient("");
                        setSearchQuery("");
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left p-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition font-bold"
                    >
                      ✖ Clear Selection (General Knowledge Base)
                    </button>
                  )}
                  {filteredClients.length === 0 ? (
                    <div className="p-3 text-xs text-[var(--color-text-muted)] text-center">
                      No results for "{searchQuery}"
                    </div>
                  ) : (
                    <>
                      {filteredClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectClient(c.id);
                            setSearchQuery("");
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 hover:bg-[var(--color-surface-2)] transition flex flex-col gap-0.5 ${
                            selectedClientId === c.id ? "bg-[var(--color-surface-2)] border-l-2 border-[var(--color-primary)]" : ""
                          }`}
                        >
                          <span className="text-xs font-bold text-[var(--color-text)] flex items-center justify-between">
                            <span>{c.first} {c.last}</span>
                            {selectedClientId === c.id && <span className="text-[9px] text-[var(--color-primary)] font-black">ACTIVE</span>}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] flex flex-wrap gap-x-2">
                            {c.email && <span>{c.email}</span>}
                            {c.cell && <span>• {c.cell}</span>}
                            {c.lender && <span>• Lender: {c.lender}</span>}
                            <span className="text-[9px] px-1 bg-[var(--color-surface-3)] rounded font-mono uppercase text-[var(--color-accent)]">{c.status}</span>
                          </span>
                        </button>
                      ))}
                      {allowedClients.length > 50 && (
                        <div className="p-2 text-[10px] text-[var(--color-text-muted)] text-center bg-[var(--color-surface-2)] border-t border-[var(--color-border)] font-semibold sticky bottom-0">
                          Showing first 50 results — type to search
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {selectedClientId && currentClient ? (
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text)]">{currentClient.first} {currentClient.last}</span>
                    {clientMetrics?.fileHealth === "strong" && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        STRONG FILE
                      </span>
                    )}
                    {clientMetrics?.fileHealth === "review" && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        REVIEW
                      </span>
                    )}
                    {clientMetrics?.fileHealth === "atrisk" && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wide bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        AT RISK
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenClientDetail && (
                      <button
                        type="button"
                        onClick={() => onOpenClientDetail(currentClient.id)}
                        className="text-[10px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] hover:underline flex items-center gap-0.5 font-bold transition-all"
                      >
                        → Open Full File
                      </button>
                    )}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      currentClient.status === "approved" || currentClient.status === "funded"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : currentClient.status === "conditional" || currentClient.status === "working"
                        ? "bg-[rgba(244,163,132,0.1)] text-[var(--color-primary)] border border-[rgba(244,163,132,0.2)]"
                        : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                    }`}>
                      {currentClient.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  <div>
                    <span className="text-[9px] text-[var(--color-text-faint)] block font-normal uppercase">Mortgage Request</span>
                    <span className="text-[var(--color-text)]">{formatCurrency(currentClient.mtgamt)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--color-text-faint)] block font-normal uppercase">Combined Income</span>
                    <span className="text-[var(--color-text)]">{formatCurrency(clientMetrics?.combinedIncome)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--color-text-faint)] block font-normal uppercase">LTV Ratio</span>
                    <span className={clientMetrics?.ltv && clientMetrics.ltv > 80 ? "text-amber-400" : "text-[var(--color-text)]"}>
                      {clientMetrics?.ltv}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--color-text-faint)] block font-normal uppercase">Beacon Score</span>
                    <span className={currentClient.beacon && Number(currentClient.beacon) < 620 ? "text-rose-400" : "text-[var(--color-text)]"}>
                      {currentClient.beacon || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-[var(--color-text-faint)] pt-1 border-t border-[var(--color-border)] leading-relaxed font-normal">
                  <span className="text-[9px] text-[var(--color-text-muted)] block uppercase">Property Address</span>
                  <span className="text-[var(--color-text-muted)]">{currentClient.addr || "No property loaded yet."}</span>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 text-center">
                <span className="text-xs text-[var(--color-text-muted)]">General advice mode. Choose a client file to activate predictive smart contexts.</span>
              </div>
            )}
          </div>

          {/* 3. QUICK AI WORKFLOW LAUNCHERS - Prioritized by User Role */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-lg space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> 2. Workspace Tools
            </h3>
            
            {/* BROKER-FAVORED TOOLS */}
            {isBroker ? (
              <div className="space-y-2">
                <div className="text-[9px] text-[var(--color-primary)] font-bold uppercase tracking-wider">Broker Top Tools</div>
                <button 
                  onClick={() => triggerAITool("summary")}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                    activeTool === "summary" 
                      ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.5)] text-[var(--color-text)]" 
                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--color-accent)]" /> File Summary Assistant
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button 
                  onClick={() => triggerAITool("recommender")}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                    activeTool === "recommender" 
                      ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.5)] text-[var(--color-text)]" 
                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[var(--color-accent)]" /> Next Step Recommender
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button 
                  onClick={() => triggerAITool("follow_up", "outstanding_docs")}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                    activeTool === "follow_up" 
                      ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.5)] text-[var(--color-text)]" 
                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[var(--color-accent)]" /> Client Follow-Up Drafts
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            ) : (
              /* ADMIN/MANAGER-FAVORED TOOLS */
              <div className="space-y-2">
                <div className="text-[9px] text-[var(--color-primary)] font-bold uppercase tracking-wider">Manager Top Tools</div>
                <button 
                  onClick={() => triggerAITool("missing_docs")}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                    activeTool === "missing_docs" 
                      ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.5)] text-[var(--color-text)]" 
                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[var(--color-accent)]" /> Missing Documents Helper
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button 
                  onClick={() => triggerAITool("summary")}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                    activeTool === "summary" 
                      ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.5)] text-[var(--color-text)]" 
                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[var(--color-accent)]" /> Readiness Audit summary
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button 
                  onClick={() => triggerAITool("partner_comm", "lender")}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                    activeTool === "partner_comm" 
                      ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.5)] text-[var(--color-text)]" 
                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-[var(--color-accent)]" /> Underwriter/Partner Drafts
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            )}

            {/* SHARED COMPLEMENTARY TOOLS */}
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <div className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Additional Tools</div>
              
              {/* If manager show broker tools, if broker show manager tools here */}
              {!isBroker && (
                <>
                  <button 
                    onClick={() => triggerAITool("recommender")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                      activeTool === "recommender" 
                        ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.4)] text-[var(--color-text)]" 
                        : "bg-transparent border-transparent hover:bg-[var(--color-surface-2)]/40 text-[var(--color-text-muted)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--color-text-faint)]" /> Next Step Recommender
                    </span>
                  </button>

                  <button 
                    onClick={() => triggerAITool("follow_up", "outstanding_docs")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                      activeTool === "follow_up" 
                        ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.4)] text-[var(--color-text)]" 
                        : "bg-transparent border-transparent hover:bg-[var(--color-surface-2)]/40 text-[var(--color-text-muted)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[var(--color-text-faint)]" /> Follow-Up Drafts
                    </span>
                  </button>
                </>
              )}

              {isBroker && (
                <>
                  <button 
                    onClick={() => triggerAITool("missing_docs")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                      activeTool === "missing_docs" 
                        ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.4)] text-[var(--color-text)]" 
                        : "bg-transparent border-transparent hover:bg-[var(--color-surface-2)]/40 text-[var(--color-text-muted)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-[var(--color-text-faint)]" /> Missing Documents Helper
                    </span>
                  </button>

                  <button 
                    onClick={() => triggerAITool("partner_comm", "lender")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                      activeTool === "partner_comm" 
                        ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.4)] text-[var(--color-text)]" 
                        : "bg-transparent border-transparent hover:bg-[var(--color-surface-2)]/40 text-[var(--color-text-muted)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Landmark className="w-3.5 h-3.5 text-[var(--color-text-faint)]" /> Partner / Lender Drafts
                    </span>
                  </button>
                </>
              )}

              {/* Tasks Builder */}
              <button 
                onClick={() => triggerAITool("tasks")}
                className={`w-full text-left p-2 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                  activeTool === "tasks" 
                    ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.4)] text-[var(--color-text)]" 
                    : "bg-transparent border-transparent hover:bg-[var(--color-surface-2)]/40 text-[var(--color-text-muted)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-text-faint)]" /> Translate Notes to Tasks
                </span>
              </button>

              {/* Application Ingestion summarizer */}
              <button 
                onClick={() => {
                  setActiveTool("intake_raw");
                  setAiOutput("");
                }}
                className={`w-full text-left p-2 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                  activeTool === "intake_raw" 
                    ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.4)] text-[var(--color-text)]" 
                    : "bg-transparent border-transparent hover:bg-[var(--color-surface-2)]/40 text-[var(--color-text-muted)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-[var(--color-text-faint)]" /> Website Intake Summarizer
                </span>
              </button>

              {/* Underwriting Note Drafter */}
              <button 
                onClick={() => triggerAITool("draft_notes")}
                className={`w-full text-left p-2 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                  activeTool === "draft_notes" 
                    ? "bg-[rgba(244,163,132,0.15)] border-[rgba(244,163,132,0.4)] text-[var(--color-text)]" 
                    : "bg-transparent border-transparent hover:bg-[var(--color-surface-2)]/40 text-[var(--color-text-muted)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[var(--color-text-faint)]" /> Underwriting Note Drafter
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MAIN WORKSPACE CANVAS (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TOP QUICK ACTION BAR (ROW OF BUTTONS) */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3 rounded-xl shadow-lg flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[var(--color-text-muted)] px-2">Quick Commands:</span>
            
            <button 
              onClick={() => triggerAITool("summary")}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Summarize File
            </button>

            <button 
              onClick={() => triggerAITool("missing_docs")}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5 text-[var(--color-accent)]" /> List Missing Docs
            </button>

            <button 
              onClick={() => triggerAITool("follow_up", "outstanding_docs")}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Draft Follow-Up
            </button>

            <button 
              onClick={() => triggerAITool("partner_comm", "lender")}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Landmark className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Draft Partner Email
            </button>

            <button 
              onClick={() => triggerAITool("tasks")}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Tasks from Notes
            </button>

            <button 
              onClick={() => triggerAITool("draft_notes")}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Draft File Note
            </button>

            <button 
              onClick={() => {
                setActiveTool("intake_raw");
                setAiOutput("");
                loadSampleIntake();
              }}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Summarize Ingest submission
            </button>

            <button 
              onClick={() => {
                setActiveTool("custom");
                setAiOutput("");
              }}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[rgba(244,163,132,0.1)] border border-[var(--color-border)] hover:border-[rgba(244,163,132,0.3)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Custom Copilot
            </button>
          </div>

          {/* MAIN CANVAS WORKSPACE SCREEN */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg flex-1 flex flex-col overflow-hidden min-h-[480px] relative">
            
            {/* CANVAS WORKSPACE BAR */}
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text)] flex items-center gap-1">
                  Active Assistant Canvas: <span className="text-[var(--color-accent)] font-black font-mono ml-1">{getToolLabel(activeTool)}</span>
                </h3>
              </div>
              
              {currentClient && (
                <span className="text-[10px] text-[var(--color-text-muted)] font-bold bg-[var(--color-surface-2)] px-2 py-1 rounded border border-[var(--color-border)]">
                  Context: {currentClient.first} {currentClient.last}
                </span>
              )}
            </div>

            {/* WORKSPACE PRESET DETAIL SUB-TABS (Only visible on relevant categories) */}
            {activeTool === "follow_up" && (
              <div className="px-4 py-2 bg-[var(--color-surface-2)]/60 border-b border-[var(--color-border)] flex flex-wrap gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold self-center mr-2">Email Templates:</span>
                <button 
                  onClick={() => triggerAITool("follow_up", "outstanding_docs")}
                  className="px-2.5 py-1 text-[10px] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded"
                >
                  📄 Missing Docs
                </button>
                <button 
                  onClick={() => triggerAITool("follow_up", "borderline_tds")}
                  className="px-2.5 py-1 text-[10px] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded"
                >
                  ⚠️ GDS/TDS counseling
                </button>
                <button 
                  onClick={() => triggerAITool("follow_up", "status_update")}
                  className="px-2.5 py-1 text-[10px] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded"
                >
                  🚀 File Milestone
                </button>
              </div>
            )}

            {activeTool === "partner_comm" && (
              <div className="px-4 py-2 bg-[var(--color-surface-2)]/60 border-b border-[var(--color-border)] flex flex-wrap gap-2">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold self-center mr-2">Partner Templates:</span>
                <button 
                  onClick={() => triggerAITool("partner_comm", "lender")}
                  className="px-2.5 py-1 text-[10px] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded"
                >
                  🏢 Monoline Underwriter Pitch
                </button>
                <button 
                  onClick={() => triggerAITool("partner_comm", "realtor")}
                  className="px-2.5 py-1 text-[10px] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded"
                >
                  🤝 realtor update
                </button>
                <button 
                  onClick={() => triggerAITool("partner_comm", "lawyer")}
                  className="px-2.5 py-1 text-[10px] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded"
                >
                  ⚖️ Solicitor Instructions
                </button>
              </div>
            )}

            {/* SPECIAL SCREEN: INTAKE INGESTION WORKSPACE */}
            {activeTool === "intake_raw" && !aiOutput && !loading && (
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="p-3.5 bg-[rgba(244,163,132,0.05)] border border-[rgba(244,163,132,0.15)] rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-text)] font-bold uppercase block mb-1">Raw website Application / Email-linked Ingestion</span>
                    Paste unformatted email text, application form notes, or phone intake logs here. GBK AI will digest it into key parameters and output a tidy CRM lead dossier summary.
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    rows={10}
                    value={rawIntakeText}
                    onChange={(e) => setRawIntakeText(e.target.value)}
                    placeholder="Paste unformatted lead email, web form submission payload, or underwriter's manual intake text here..."
                    className="w-full flex-grow bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 text-xs font-mono text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[rgba(244,163,132,0.3)] min-h-[220px]"
                  />
                  
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={loadSampleIntake}
                      className="px-3 py-1.5 text-[10px] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded transition font-bold"
                    >
                      💡 Load Sample Email Ingest
                    </button>

                    <button 
                      onClick={() => triggerAITool("intake_raw")}
                      disabled={rawIntakeText.trim().length === 0}
                      className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white text-xs font-black uppercase rounded-lg transition disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" /> Run Intake Analysis
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GENERAL OUTPUT CANVAS (MARKDOWN FORMATTER / RAW TEXT AREA) */}
            {(aiOutput || loading) && (
              <div 
                ref={outputScrollRef}
                onScroll={handleScroll}
                className="flex-grow p-5 overflow-y-auto max-h-[580px] min-h-[385px] scrollbar-thin"
              >
                
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border border-t-[var(--color-primary)] border-[var(--color-border)] animate-spin"></div>
                      <Sparkles className="w-5 h-5 text-[var(--color-accent)] absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div className="space-y-1 text-center">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] block">Invoking AI Underwriting Agent</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] block font-mono animate-pulse">{loadingMessages[loadingMsgIdx]}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Rendered Markdown blocks */}
                    <div className="prose prose-invert max-w-none text-xs text-[var(--color-text-muted)] font-semibold leading-relaxed space-y-3 font-sans">
                      {aiOutput.split("\n").map((line, idx) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("### ")) {
                          return <h4 key={idx} className="text-sm font-black text-[var(--color-accent)] uppercase tracking-wider mt-4 border-b border-[var(--color-border)] pb-1">{trimmed.replace("### ", "")}</h4>;
                        }
                        if (trimmed.startsWith("## ")) {
                          return <h3 key={idx} className="text-base font-black text-[var(--color-accent)] uppercase tracking-wide mt-5 border-b border-[var(--color-border)] pb-1">{trimmed.replace("## ", "")}</h3>;
                        }
                        if (trimmed.startsWith("# ")) {
                          return <h2 key={idx} className="text-lg font-black text-[var(--color-text)] uppercase tracking-widest mt-6 pb-2 border-b-2 border-[rgba(244,163,132,0.3)]">{trimmed.replace("# ", "")}</h2>;
                        }
                        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                          return (
                            <ul key={idx} className="list-disc list-inside ml-2 text-[var(--color-text-muted)] space-y-1">
                              <li dangerouslySetInnerHTML={renderInlineMarkdown(trimmed.substring(2))} />
                            </ul>
                          );
                        }
                        if (/^\d+\.\s/.test(trimmed)) {
                          return (
                            <ol key={idx} className="list-decimal list-inside ml-2 text-[var(--color-text)] space-y-1">
                              <li className="font-bold" dangerouslySetInnerHTML={renderInlineMarkdown(trimmed.replace(/^\d+\.\s/, ""))} />
                            </ol>
                          );
                        }
                        if (trimmed === "") {
                          return <div key={idx} className="h-2" />;
                        }
                        return <p key={idx} className="leading-relaxed text-[var(--color-text-muted)]" dangerouslySetInnerHTML={renderInlineMarkdown(line)} />;
                      })}
                    </div>

                    {/* Extracted JSON Tasks list (ONLY FOR TASKS BUILDER KEY) */}
                    {activeTool === "tasks" && extractedTasks.length > 0 && (
                      <div className="mt-6 border-t border-[var(--color-border)] pt-4 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                          <CheckSquare className="w-4 h-4 text-[var(--color-accent)]" /> Extracted Actionable Items for CRM Checklist:
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {extractedTasks.map((t, idx) => (
                            <div key={idx} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-lg flex justify-between items-start gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded font-black tracking-widest ${
                                    t.priority === "high" 
                                      ? "bg-rose-500/10 text-rose-400" 
                                      : t.priority === "medium"
                                      ? "bg-[rgba(244,163,132,0.1)] text-[var(--color-primary)]"
                                      : "bg-blue-500/10 text-blue-400"
                                  }`}>
                                    {t.priority}
                                  </span>
                                  <span className="text-xs font-bold text-[var(--color-text)]">{t.title}</span>
                                </div>
                                <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{t.notes}</p>
                              </div>
                              <button 
                                onClick={() => handleAddExtractedTask(t.title, t.priority, t.notes)}
                                className="p-1 bg-[rgba(244,163,132,0.1)] hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white rounded transition flex-shrink-0"
                                title="Add to CRM Task List"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* FLOATING JUMP TO LATEST BUTTON */}
            {!isAtBottom && (aiOutput || loading) && (
              <button
                onClick={() => {
                  setIsAtBottom(true);
                  if (outputScrollRef.current) {
                    outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
                  }
                }}
                className="absolute bottom-16 right-4 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg transition-all duration-300 flex items-center gap-1 z-10 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" /> Jump to Latest
              </button>
            )}

            {/* IF NO RESULT AND NOT LOADING, SHOW INTRO PANEL */}
            {!aiOutput && !loading && activeTool !== "intake_raw" && (
              <div className="flex-grow p-10 flex flex-col items-center justify-center text-center gap-6">
                <div className="p-4 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-full text-[var(--color-text-muted)]/30">
                  <MessageSquare className="w-10 h-10 text-[var(--color-accent)]" />
                </div>
                
                <div className="space-y-2 max-w-md">
                  <h4 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Workspace Canvas Empty</h4>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    Select a client on the left or paste raw text to run mortgage underwriting audits, list missing files, generate custom Monoline emails, or draft follow-up alerts.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => triggerAITool("summary")}
                    className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white text-xs font-black uppercase rounded-lg transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" /> Auto-Summarize Active File
                  </button>
                </div>
              </div>
            )}

            {/* CANVAS BOTTOM CONTROL ACTION BAR */}
            {aiOutput && !loading && (
              <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  ✦ Copilot version 3.5-flash | Output ready
                </span>

                <div className="flex items-center gap-2">
                  {/* Copy to clipboard */}
                  <button 
                    onClick={handleCopyToClipboard}
                    className="px-3 py-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
                    {copied ? "Copied" : "Copy Output"}
                  </button>

                  {/* Save to internal client notes */}
                  {currentClient && (
                    <button 
                      onClick={handleSaveToClientNotes}
                      className="px-3 py-1.5 bg-[rgba(244,163,132,0.1)] hover:bg-[rgba(244,163,132,0.2)] border border-[rgba(244,163,132,0.2)] text-[var(--color-primary)] text-[11px] font-black rounded-lg transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Save to Notes
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CUSTOM AD-HOC PROMPT COPILOT BOX */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-lg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Ask custom advisory question</h4>
            
            <div className="flex gap-2">
              <input 
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask about CMHC debt service limits, GDS/TDS calculators, or tell the AI to re-write output..."
                onKeyDown={(e) => { if (e.key === "Enter") triggerAITool("custom"); }}
                className="flex-grow bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button 
                onClick={() => triggerAITool("custom")}
                disabled={loading || !aiInput.trim()}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white text-xs font-black uppercase rounded-lg transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Ask AI
              </button>
            </div>
          </div>

          {/* 4. RECENT INVOCATIONS HISTORY FOOTER */}
          {history.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Recent AI Invocations Log
                </h4>
                
                <button 
                  onClick={handleClearHistory}
                  className="text-[9px] text-rose-400 hover:text-rose-300 uppercase font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear History
                </button>
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                {history.map((h) => (
                  <div 
                    key={h.id} 
                    className="p-2 bg-[var(--color-surface-2)]/50 hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[10px] flex justify-between items-center gap-3 transition cursor-pointer"
                    onClick={() => {
                      setAiOutput(h.response);
                      setActiveTool("custom");
                      // Try to restore client safely
                      const client = allowedClients.find(c => c.id === h.clientId);
                      if (client) handleSelectClient(client.id);
                      showToast(`Restored: ${h.toolName}`, "info");
                    }}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <span className="font-bold text-[var(--color-text)] block">{h.toolName}</span>
                      {h.response && (
                        <span className="text-[9px] text-[var(--color-text-muted)] block truncate opacity-75 italic">
                          {h.response.trim().substring(0, 80)}{h.response.trim().length > 80 ? "..." : ""}
                        </span>
                      )}
                      <span className="text-[var(--color-text-muted)] block">Client: {h.clientName} | {new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[var(--color-primary)] opacity-60" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
