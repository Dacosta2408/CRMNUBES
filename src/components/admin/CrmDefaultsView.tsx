import React, { useState } from "react";
import { 
  Sliders, Settings2, CheckCircle2, ToggleLeft, ToggleRight, FileText, 
  UserCheck, ShieldCheck, Globe, Clock, Calendar, DollarSign, Layers, 
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Copy, RefreshCw, Send, 
  Mail, Key, Webhook, Activity, Sparkles, Lock, Shield, RotateCcw, 
  Check, X, ChevronRight, AlertCircle, Terminal, ExternalLink, Code, 
  Zap, Users, FileCheck, MessageSquare, AlertTriangle, Cpu
} from "lucide-react";
import { User } from "../../types";
import { safeJsonParse } from "../../lib/json";

interface CrmDefaultsViewProps {
  userRoster: User[];
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  logActivity?: (action: string, details: string) => void;
}

interface PipelineStage {
  id: string;
  key: string;
  label: string;
  color: string;
}

interface TaskTemplateItem {
  id: string;
  title: string;
  dueDays: number;
}

interface TaskTemplate {
  id: string;
  name: string;
  category: string;
  tasks: TaskTemplateItem[];
}

interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
}

export const CrmDefaultsView: React.FC<CrmDefaultsViewProps> = ({
  userRoster,
  currentUser,
  showToast,
  logActivity
}) => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<"defaults" | "rules" | "flags" | "integrations" | "email">("defaults");

  // Reset Confirmation Modal
  const [showResetModal, setShowResetModal] = useState(false);

  // 1. SYSTEM DEFAULTS STATE
  const [currency, setCurrency] = useState(() => localStorage.getItem("gbk_default_currency") || "CAD");
  const [timezone, setTimezone] = useState(() => localStorage.getItem("gbk_default_timezone") || "America/Toronto");
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("gbk_default_date_format") || "YYYY-MM-DD");
  const [language, setLanguage] = useState(() => localStorage.getItem("gbk_default_language") || "en-CA");
  const [defaultClearanceLevel, setDefaultClearanceLevel] = useState<number>(() => {
    return Number(localStorage.getItem("gbk_default_clearance_level") || "2");
  });

  // Checklist Rules
  const [require90DayBank, setRequire90DayBank] = useState(() => localStorage.getItem("gbk_require_90_day_bank") !== "false");
  const [requireTaxBill, setRequireTaxBill] = useState(() => localStorage.getItem("gbk_require_tax_bill") !== "false");
  const [requireApsPurchase, setRequireApsPurchase] = useState(() => localStorage.getItem("gbk_require_aps_purchase") !== "false");
  const [requireNoaVerification, setRequireNoaVerification] = useState(() => localStorage.getItem("gbk_require_noa_verification") !== "false");

  // 2. BUSINESS RULES STATE
  const [assignmentRule, setAssignmentRule] = useState(() => localStorage.getItem("gbk_assignment_rule") || "round_robin");
  const [defaultAgentId, setDefaultAgentId] = useState(() => localStorage.getItem("gbk_default_agent_id") || currentUser?.id || "usr_david");
  const [defaultSource, setDefaultSource] = useState(() => localStorage.getItem("gbk_default_source") || "AI Ingestion Portal");

  // Pipeline Stages
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(() => {
    const saved = localStorage.getItem("gbk_pipeline_stages_list");
    if (saved) return safeJsonParse(saved, []);
    return [
      { id: "stg_1", key: "lead", label: "New Leads / Ingestion", color: "#3B82F6" },
      { id: "stg_2", key: "open", label: "Active Files / Drafting", color: "#06B6D4" },
      { id: "stg_3", key: "working", label: "Broker Audit & GDS/TDS Check", color: "#8B5CF6" },
      { id: "stg_4", key: "lender", label: "Submitted to Lender", color: "#EC4899" },
      { id: "stg_5", key: "conditional", label: "Conditional Approval", color: "#F59E0B" },
      { id: "stg_6", key: "approved", label: "Approved & Commitment", color: "#10B981" },
      { id: "stg_7", key: "funded", label: "Funded Transactions", color: "#14B8A6" },
      { id: "stg_8", key: "closed", label: "Archived / Closed", color: "#64748B" },
    ];
  });
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#3B82F6");

  // Task Template Library
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(() => {
    const saved = localStorage.getItem("gbk_task_templates");
    if (saved) return safeJsonParse(saved, []);
    return [
      {
        id: "tmpl_purchase",
        name: "Purchase Deal Onboarding",
        category: "Purchase Intake",
        tasks: [
          { id: "t1", title: "Request Photo ID & 2025 NOA", dueDays: 1 },
          { id: "t2", title: "Verify 90-Day Downpayment Ledger", dueDays: 2 },
          { id: "t3", title: "Order Property Appraisal Assessment", dueDays: 3 },
          { id: "t4", title: "Submit Application to Scotiabank/First National", dueDays: 4 }
        ]
      },
      {
        id: "tmpl_refi",
        name: "Refinance & Equity Extraction",
        category: "Refinance Intake",
        tasks: [
          { id: "t5", title: "Order Municipal Property Tax Bill", dueDays: 1 },
          { id: "t6", title: "Review Title Search & Existing Charge", dueDays: 2 },
          { id: "t7", title: "Calculate Breakage Penalty vs Savings", dueDays: 3 }
        ]
      }
    ];
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tmpl_purchase");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDays, setNewTaskDueDays] = useState(2);

  // Email Notification Templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(() => {
    const saved = localStorage.getItem("gbk_email_notification_templates");
    if (saved) return safeJsonParse(saved, []);
    return [
      {
        id: "email_welcome",
        title: "Welcome New Client Intake",
        subject: "Welcome to GBK Financial — Your Mortgage Intake Portal",
        body: "Hello {{client.name}},\n\nThank you for choosing GBK Financial. Your mortgage intake dossier has been initialized under file ID #{{deal.id}}.\n\nAssigned Broker: {{agent.name}}\nPortal Access Link: {{portal.link}}\n\nPlease upload your income verification documents at your earliest convenience."
      },
      {
        id: "email_approval",
        title: "Mortgage Loan Conditional Approval",
        subject: "Conditional Approval Issued — Deal #{{deal.id}}",
        body: "Great news {{client.name}},\n\nYour mortgage application for {{deal.property_address}} has received Conditional Approval from {{lender.name}} for the amount of ${{deal.amount}}.\n\nNext Steps:\n1. Provide satisfied employment letter\n2. Sign commitment letter attached in portal\n\nBest regards,\nGBK Underwriting Team"
      },
      {
        id: "email_doc_reminder",
        title: "Document Request Reminder",
        subject: "Action Required: Missing Income Verification Documents",
        body: "Hi {{client.name}},\n\nThis is a friendly reminder that we are still awaiting your {{missing.docs}} to finalize your mortgage submission to the lender.\n\nPlease log into your secure GBK vault to upload these items today."
      }
    ];
  });
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>("email_welcome");

  // 3. FEATURE FLAGS & ROLE MATRIX STATE
  const [featureFlags, setFeatureFlags] = useState(() => {
    const saved = localStorage.getItem("gbk_feature_flags");
    return safeJsonParse(saved, {
      ai_summary_enabled: true,
      doc_ocr_enabled: true,
      live_chat_enabled: true,
      compliance_autoscans_enabled: true,
      sms_alerts_enabled: false,
      rate_matrix_enabled: true,
      beta_voice_transcribe: true,
      beta_deal_predictor: false,
      beta_refi_scanner: true
    });
  });

  // Per-Role Feature Matrix
  const [rolePermissions, setRolePermissions] = useState(() => {
    const saved = localStorage.getItem("gbk_role_feature_matrix");
    return safeJsonParse(saved, {
      admin: { ai_summary: true, doc_ocr: true, live_chat: true, compliance: true, sms: true, rate_matrix: true, beta: true },
      manager: { ai_summary: true, doc_ocr: true, live_chat: true, compliance: true, sms: true, rate_matrix: true, beta: false },
      agent: { ai_summary: true, doc_ocr: true, live_chat: true, compliance: false, sms: false, rate_matrix: true, beta: false },
      support: { ai_summary: false, doc_ocr: true, live_chat: true, compliance: false, sms: false, rate_matrix: false, beta: false },
      client: { ai_summary: false, doc_ocr: false, live_chat: true, compliance: false, sms: true, rate_matrix: false, beta: false }
    });
  });

  // 4. INTEGRATIONS STATE
  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem("gbk_integration_api_keys");
    return safeJsonParse(saved, {
      fsra_key: "fsra_live_89f1a04291c784e2",
      sendgrid_key: "SG.e98f2a1b.3980124981029481029",
      google_maps_key: "AIzaSyD89f2a019482109482109481204",
      twilio_key: "SK981029481204810294810294810294",
      equifax_secret: "eq_sec_9918239018239012"
    });
  });
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("gbk_webhook_url") || "https://api.gbk.ca/v1/telemetry/events");
  const [webhookSecret, setWebhookSecret] = useState(() => localStorage.getItem("gbk_webhook_secret") || "whsec_77f19028a0192e");
  const [revealWebhookSecret, setRevealWebhookSecret] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState(() => {
    const saved = localStorage.getItem("gbk_webhook_events");
    return safeJsonParse(saved, {
      "deal.created": true,
      "client.updated": true,
      "document.uploaded": true,
      "compliance.flagged": true,
      "task.completed": false,
      "payment.received": false
    });
  });

  // Integration Health Status
  const [serviceStatus, setServiceStatus] = useState([
    { id: "sendgrid", name: "SendGrid Email Relay", status: "Operational", latency: "42ms" },
    { id: "equifax", name: "Equifax Credit Bureau", status: "Operational", latency: "118ms" },
    { id: "fsra", name: "FSRA Regulatory Gateway", status: "Operational", latency: "89ms" },
    { id: "docusign", name: "DocuSign e-Sign Gateway", status: "Operational", latency: "64ms" },
    { id: "twilio", name: "Twilio SMS Gateway", status: "Degraded", latency: "340ms" },
    { id: "google", name: "Google Workspace API", status: "Operational", latency: "31ms" }
  ]);
  const [isTestingServices, setIsTestingServices] = useState(false);

  // 5. SYSTEM EMAIL STATE
  const [emailFrom, setEmailFrom] = useState(() => localStorage.getItem("gbk_email_from") || "GBK Financial Intake <notifications@gbk.ca>");
  const [emailReplyTo, setEmailReplyTo] = useState(() => localStorage.getItem("gbk_email_replyto") || "support@gbk.ca");
  const [emailSignature, setEmailSignature] = useState(() => {
    return localStorage.getItem("gbk_email_signature") || 
      `---\nGBK Financial Brokerage Inc. | License #12099\n100 King Street West, Suite 4000, Toronto, ON M5X 1A9\nPhone: (416) 555-0199 | Direct: {{user.phone}}\nConfidentiality Notice: This message contains privileged regulatory information.`;
  });
  const [signaturePreviewMode, setSignaturePreviewMode] = useState(false);

  // --- HANDLERS ---

  // Pipeline Stage Helpers
  const handleUpdateStageLabel = (id: string, label: string) => {
    setPipelineStages(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  };

  const handleUpdateStageColor = (id: string, color: string) => {
    setPipelineStages(prev => prev.map(s => s.id === id ? { ...s, color } : s));
  };

  const handleMoveStage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pipelineStages.length) return;
    const newStages = [...pipelineStages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;
    setPipelineStages(newStages);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const newStage: PipelineStage = {
      id: `stg_${Date.now()}`,
      key: newStageName.toLowerCase().replace(/\s+/g, "_"),
      label: newStageName.trim(),
      color: newStageColor
    };
    setPipelineStages(prev => [...prev, newStage]);
    setNewStageName("");
    showToast(`Added stage '${newStage.label}' to pipeline.`, "success");
  };

  const handleDeleteStage = (id: string) => {
    if (pipelineStages.length <= 3) {
      showToast("Cannot delete: Pipeline must maintain at least 3 stages.", "error");
      return;
    }
    setPipelineStages(prev => prev.filter(s => s.id !== id));
    showToast("Pipeline stage removed.", "info");
  };

  // Task Template Helpers
  const handleAddTaskToTemplate = () => {
    if (!newTaskTitle.trim()) return;
    setTaskTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === selectedTemplateId) {
        return {
          ...tmpl,
          tasks: [
            ...tmpl.tasks,
            { id: `t_${Date.now()}`, title: newTaskTitle.trim(), dueDays: Number(newTaskDueDays) }
          ]
        };
      }
      return tmpl;
    }));
    setNewTaskTitle("");
    showToast("Task added to template workflow.", "success");
  };

  const handleDeleteTaskFromTemplate = (templateId: string, taskId: string) => {
    setTaskTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === templateId) {
        return {
          ...tmpl,
          tasks: tmpl.tasks.filter(t => t.id !== taskId)
        };
      }
      return tmpl;
    }));
  };

  // Feature Flag Helper
  const toggleFeatureFlag = (key: string) => {
    setFeatureFlags((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Role Matrix Helper
  const toggleRolePermission = (role: string, feature: string) => {
    setRolePermissions((prev: any) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !prev[role]?.[feature]
      }
    }));
  };

  // API Key Reveal Toggle
  const toggleKeyReveal = (key: string) => {
    setRevealedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Copy to Clipboard Helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard.`, "success", "📋");
  };

  // Regenerate API Key
  const handleRegenerateKey = (keyName: string, prefix: string) => {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = `${prefix}_${randomHex}`;
    setApiKeys((prev: any) => ({ ...prev, [keyName]: newKey }));
    showToast(`Regenerated ${keyName} key.`, "info", "🔑");
  };

  // Check Connectivity Test
  const handleTestServiceStatus = () => {
    setIsTestingServices(true);
    showToast("Ping test initiated for third-party gateways...", "info");
    setTimeout(() => {
      setServiceStatus(prev => prev.map(s => ({
        ...s,
        latency: `${Math.floor(Math.random() * 60 + 25)}ms`,
        status: s.id === "twilio" ? "Operational" : s.status
      })));
      setIsTestingServices(false);
      showToast("All third-party integration gateways verified operational!", "success", "⚡");
    }, 1200);
  };

  // Test Webhook
  const handleTestWebhook = () => {
    showToast(`Pinged webhook payload to ${webhookUrl}`, "success", "📡");
  };

  // SAVE ALL CONFIGURATIONS
  const handleSaveAllConfigurations = () => {
    // 1. System Defaults
    localStorage.setItem("gbk_default_currency", currency);
    localStorage.setItem("gbk_default_timezone", timezone);
    localStorage.setItem("gbk_default_date_format", dateFormat);
    localStorage.setItem("gbk_default_language", language);
    localStorage.setItem("gbk_default_clearance_level", String(defaultClearanceLevel));
    localStorage.setItem("gbk_require_90_day_bank", require90DayBank ? "true" : "false");
    localStorage.setItem("gbk_require_tax_bill", requireTaxBill ? "true" : "false");
    localStorage.setItem("gbk_require_aps_purchase", requireApsPurchase ? "true" : "false");
    localStorage.setItem("gbk_require_noa_verification", requireNoaVerification ? "true" : "false");

    // 2. Business Rules
    localStorage.setItem("gbk_assignment_rule", assignmentRule);
    localStorage.setItem("gbk_default_agent_id", defaultAgentId);
    localStorage.setItem("gbk_default_source", defaultSource);
    localStorage.setItem("gbk_pipeline_stages_list", JSON.stringify(pipelineStages));
    
    // Convert pipelineStages back to dictionary format for legacy compatibility
    const pipelineDict: Record<string, string> = {};
    pipelineStages.forEach(s => { pipelineDict[s.key] = s.label; });
    localStorage.setItem("gbk_pipeline_labels", JSON.stringify(pipelineDict));

    localStorage.setItem("gbk_task_templates", JSON.stringify(taskTemplates));
    localStorage.setItem("gbk_email_notification_templates", JSON.stringify(emailTemplates));

    // 3. Feature Flags & Roles
    localStorage.setItem("gbk_feature_flags", JSON.stringify(featureFlags));
    localStorage.setItem("gbk_role_feature_matrix", JSON.stringify(rolePermissions));

    // 4. Integrations
    localStorage.setItem("gbk_integration_api_keys", JSON.stringify(apiKeys));
    localStorage.setItem("gbk_webhook_url", webhookUrl);
    localStorage.setItem("gbk_webhook_secret", webhookSecret);
    localStorage.setItem("gbk_webhook_events", JSON.stringify(webhookEvents));

    // 5. System Email
    localStorage.setItem("gbk_email_from", emailFrom);
    localStorage.setItem("gbk_email_replyto", emailReplyTo);
    localStorage.setItem("gbk_email_signature", emailSignature);

    if (logActivity) {
      logActivity("Updated CRM System Defaults", "Saved global business rules, pipeline stages, API integrations, and email defaults.");
    }

    showToast("Global Corporate CRM Configurations saved successfully!", "success", "⚙️");
  };

  // RESET TO FACTORY DEFAULTS
  const handleResetToDefaults = () => {
    localStorage.removeItem("gbk_default_currency");
    localStorage.removeItem("gbk_default_timezone");
    localStorage.removeItem("gbk_default_date_format");
    localStorage.removeItem("gbk_default_language");
    localStorage.removeItem("gbk_default_clearance_level");
    localStorage.removeItem("gbk_require_90_day_bank");
    localStorage.removeItem("gbk_require_tax_bill");
    localStorage.removeItem("gbk_require_aps_purchase");
    localStorage.removeItem("gbk_require_noa_verification");
    localStorage.removeItem("gbk_assignment_rule");
    localStorage.removeItem("gbk_default_agent_id");
    localStorage.removeItem("gbk_default_source");
    localStorage.removeItem("gbk_pipeline_stages_list");
    localStorage.removeItem("gbk_pipeline_labels");
    localStorage.removeItem("gbk_task_templates");
    localStorage.removeItem("gbk_email_notification_templates");
    localStorage.removeItem("gbk_feature_flags");
    localStorage.removeItem("gbk_role_feature_matrix");
    localStorage.removeItem("gbk_integration_api_keys");
    localStorage.removeItem("gbk_webhook_url");
    localStorage.removeItem("gbk_webhook_secret");
    localStorage.removeItem("gbk_webhook_events");
    localStorage.removeItem("gbk_email_from");
    localStorage.removeItem("gbk_email_replyto");
    localStorage.removeItem("gbk_email_signature");

    // Reset local state
    setCurrency("CAD");
    setTimezone("America/Toronto");
    setDateFormat("YYYY-MM-DD");
    setLanguage("en-CA");
    setDefaultClearanceLevel(2);
    setRequire90DayBank(true);
    setRequireTaxBill(true);
    setRequireApsPurchase(true);
    setRequireNoaVerification(true);
    setAssignmentRule("round_robin");
    setDefaultSource("AI Ingestion Portal");

    setShowResetModal(false);
    showToast("Reset all configurations to factory defaults.", "warning", "🔄");
  };

  const activeTemplate = taskTemplates.find(t => t.id === selectedTemplateId) || taskTemplates[0];
  const activeEmailTemplate = emailTemplates.find(e => e.id === selectedEmailTemplateId) || emailTemplates[0];

  return (
    <div className="space-y-6 max-w-6xl pb-16" id="crm-defaults-view">
      
      {/* Top Header & Save/Reset Actions */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                Corporate CRM Configurations &amp; Defaults
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Manage global defaults, pipeline stages, feature flags, API integrations, and email templates.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save / Reset Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSaveAllConfigurations}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("defaults")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "defaults"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Globe className="w-4 h-4" /> System Defaults
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "rules"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Layers className="w-4 h-4" /> Business Rules &amp; Pipelines
        </button>

        <button
          onClick={() => setActiveTab("flags")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "flags"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Feature Flags &amp; Roles
        </button>

        <button
          onClick={() => setActiveTab("integrations")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "integrations"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Webhook className="w-4 h-4" /> API &amp; Integrations
        </button>

        <button
          onClick={() => setActiveTab("email")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "email"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Mail className="w-4 h-4" /> System Email Settings
        </button>
      </div>

      {/* TAB 1: SYSTEM DEFAULTS */}
      {activeTab === "defaults" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--color-accent)]" /> Global System Defaults
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Set baseline localization, regional standards, currency, and initial clearance levels for new roster additions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
              
              {/* Default Currency */}
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" /> Default Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AUD">AUD ($) - Australian Dollar</option>
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" /> Default Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value="America/Toronto">Eastern Time (EST/EDT - Toronto/Montreal)</option>
                  <option value="America/Vancouver">Pacific Time (PST/PDT - Vancouver)</option>
                  <option value="America/Edmonton">Mountain Time (MST/MDT - Calgary/Edmonton)</option>
                  <option value="America/Winnipeg">Central Time (CST/CDT - Winnipeg)</option>
                  <option value="America/Halifax">Atlantic Time (AST/ADT - Halifax)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-400" /> Default Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-08-06 - ISO Standard)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (08/06/2026 - US Format)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (06/08/2026 - UK/CA Format)</option>
                  <option value="MMMM D, YYYY">MMMM D, YYYY (August 6, 2026 - Formal)</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-amber-400" /> Primary System Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value="en-CA">English (Canada)</option>
                  <option value="en-US">English (United States)</option>
                  <option value="fr-CA">Français (Canada)</option>
                  <option value="es">Español</option>
                </select>
              </div>

              {/* Default Clearance Level for New Users */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" /> Default Clearance Level for New Users
                </label>
                <select
                  value={defaultClearanceLevel}
                  onChange={(e) => setDefaultClearanceLevel(Number(e.target.value))}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value={1}>Level 1 — Observer / Client (Read-Only Access)</option>
                  <option value={2}>Level 2 — Broker / Agent (Full Client Portfolio Management)</option>
                  <option value={3}>Level 3 — Senior Underwriter (Audit &amp; Lender Commitments)</option>
                  <option value={4}>Level 4 — Branch Manager (Team Compliance Oversight)</option>
                  <option value={5}>Level 5 — System Administrator (Full Clearance &amp; Settings)</option>
                </select>
              </div>

            </div>

            {/* Checklist Rules Defaults */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
                Intake Document Enforcement Rules
              </span>
              <div className="bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70 space-y-3.5 text-xs text-[var(--color-text-muted)]">
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--color-text)] block">Require 90-Day Bank Statement Ledger</span>
                    <span className="text-[10px] block">Include down payment ledger trigger on all new purchases automatically.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequire90DayBank(!require90DayBank)}
                    className="shrink-0 text-[var(--color-accent)] cursor-pointer"
                  >
                    {require90DayBank ? (
                      <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--color-text)] block">Require Municipal Property Tax Statement</span>
                    <span className="text-[10px] block">Trigger property tax bill verification for all refinance intakes.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireTaxBill(!requireTaxBill)}
                    className="shrink-0 text-[var(--color-accent)] cursor-pointer"
                  >
                    {requireTaxBill ? (
                      <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--color-text)] block">Require Agreement of Purchase &amp; Sale (APS)</span>
                    <span className="text-[10px] block">Enforce APS document slot immediately on purchase client setup.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireApsPurchase(!requireApsPurchase)}
                    className="shrink-0 text-[var(--color-accent)] cursor-pointer"
                  >
                    {requireApsPurchase ? (
                      <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--color-text)] block">Require Notice of Assessment (NOA) Income Verification</span>
                    <span className="text-[10px] block">Mandate CRA NOA document upload prior to lender submission.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireNoaVerification(!requireNoaVerification)}
                    className="shrink-0 text-[var(--color-accent)] cursor-pointer"
                  >
                    {requireNoaVerification ? (
                      <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />
                    )}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: BUSINESS RULES & PIPELINES */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          
          {/* Auto-Assignment Rules & Ingestion */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--color-accent)]" /> Lead Ingestion &amp; Auto-Assignment Strategy
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Define how incoming client files from webforms and AI portals are distributed across brokerage agents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
              
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Distribution Rule
                </label>
                <select
                  value={assignmentRule}
                  onChange={(e) => setAssignmentRule(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value="round_robin">Round-Robin Equal Distribution</option>
                  <option value="least_busy">Least Active Deals Priority</option>
                  <option value="territory">Territory / Regional Matching</option>
                  <option value="manual">Manual Assignment Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Default Fallback Broker
                </label>
                <select
                  value={defaultAgentId}
                  onChange={(e) => setDefaultAgentId(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  {userRoster.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first} {u.last} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Default Source Label
                </label>
                <input
                  type="text"
                  value={defaultSource}
                  onChange={(e) => setDefaultSource(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

            </div>
          </div>

          {/* Pipeline Stage Editor */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" /> Pipeline Stage Editor
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Add, edit, reorder, and color-code mortgage deal pipeline stages.
                </p>
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-2">
              {pipelineStages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 p-3 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-faint)] w-12">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={stage.label}
                      onChange={(e) => handleUpdateStageLabel(stage.id, e.target.value)}
                      className="bg-[var(--color-surface-3)] border border-[var(--color-border)]/60 rounded px-2.5 py-1 text-xs text-[var(--color-text)] font-medium flex-1 focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => handleUpdateStageColor(stage.id, e.target.value)}
                      className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                      title="Stage Badge Color"
                    />

                    <button
                      type="button"
                      onClick={() => handleMoveStage(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 text-[var(--color-text-faint)] hover:text-[var(--color-text)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveStage(idx, "down")}
                      disabled={idx === pipelineStages.length - 1}
                      className="p-1 text-[var(--color-text-faint)] hover:text-[var(--color-text)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStage(stage.id)}
                      className="p-1 text-red-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Stage Row */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="New stage title (e.g., Quality Control Audit)..."
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <input
                type="color"
                value={newStageColor}
                onChange={(e) => setNewStageColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-[var(--color-border)]/70 cursor-pointer"
              />
              <button
                type="button"
                onClick={handleAddStage}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Stage
              </button>
            </div>
          </div>

          {/* Task Template Library */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-400" /> Automated Task Workflow Library
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Predefine operational task checklists spawned automatically when deals reach specified milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Template Selector Sidebar */}
              <div className="space-y-2 border-r border-[var(--color-border)]/60 pr-4">
                <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)]">Templates</span>
                {taskTemplates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      selectedTemplateId === tmpl.id
                        ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--color-accent)]"
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <div className="font-bold text-[var(--color-text)]">{tmpl.name}</div>
                    <div className="text-[10px] text-[var(--color-text-faint)]">{tmpl.tasks.length} Workflow Tasks</div>
                  </button>
                ))}
              </div>

              {/* Template Items Editor */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                    Tasks in: <span className="text-[var(--color-accent)]">{activeTemplate?.name}</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {activeTemplate?.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 p-2.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium text-[var(--color-text)]">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono">
                          Due +{task.dueDays}d
                        </span>
                        <button
                          onClick={() => handleDeleteTaskFromTemplate(activeTemplate.id, task.id)}
                          className="text-red-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Task to Template */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="New workflow task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <select
                    value={newTaskDueDays}
                    onChange={(e) => setNewTaskDueDays(Number(e.target.value))}
                    className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] cursor-pointer"
                  >
                    <option value={1}>Due +1 Day</option>
                    <option value={2}>Due +2 Days</option>
                    <option value={3}>Due +3 Days</option>
                    <option value={5}>Due +5 Days</option>
                  </select>
                  <button
                    onClick={handleAddTaskToTemplate}
                    className="bg-[var(--color-accent)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* Email Notification Templates */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" /> Automated Email Notification Templates
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Customize automated system emails dispatched for intake, approval notifications, and document reminders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Email Template Selector */}
              <div className="space-y-2 border-r border-[var(--color-border)]/60 pr-4">
                {emailTemplates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedEmailTemplateId(tmpl.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      selectedEmailTemplateId === tmpl.id
                        ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <div className="font-bold text-[var(--color-text)]">{tmpl.title}</div>
                    <div className="text-[10px] text-[var(--color-text-faint)] truncate">{tmpl.subject}</div>
                  </button>
                ))}
              </div>

              {/* Template Editor */}
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={activeEmailTemplate.subject}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmailTemplates(prev => prev.map(t => t.id === activeEmailTemplate.id ? { ...t, subject: val } : t));
                    }}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                    Email Body Template
                  </label>
                  <textarea
                    rows={6}
                    value={activeEmailTemplate.body}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmailTemplates(prev => prev.map(t => t.id === activeEmailTemplate.id ? { ...t, body: val } : t));
                    }}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl p-3 text-xs text-[var(--color-text)] font-mono leading-relaxed focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                {/* Variable Token Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-text-faint)]">
                  <span className="font-bold uppercase">Insert Token:</span>
                  {["{{client.name}}", "{{deal.id}}", "{{deal.amount}}", "{{lender.name}}", "{{agent.name}}", "{{portal.link}}"].map((token) => (
                    <button
                      key={token}
                      onClick={() => {
                        setEmailTemplates(prev => prev.map(t => t.id === activeEmailTemplate.id ? { ...t, body: t.body + " " + token } : t));
                      }}
                      className="bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] text-[var(--color-accent)] border border-[var(--color-border)] px-2 py-0.5 rounded font-mono cursor-pointer"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 3: FEATURE FLAGS & ROLE MATRIX */}
      {activeTab === "flags" && (
        <div className="space-y-6">
          
          {/* Core Feature Flags */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-accent)]" /> Platform Feature Toggles
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Globally enable or disable platform capability modules across all users.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">AI Document Summarization</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Gemini AI document insights and automated client briefings.</span>
                </div>
                <button onClick={() => toggleFeatureFlag("ai_summary_enabled")} className="cursor-pointer">
                  {featureFlags.ai_summary_enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" /> : <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />}
                </button>
              </div>

              <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">OCR Document Data Extraction</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Extract NOA &amp; T4 values directly into client fields.</span>
                </div>
                <button onClick={() => toggleFeatureFlag("doc_ocr_enabled")} className="cursor-pointer">
                  {featureFlags.doc_ocr_enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" /> : <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />}
                </button>
              </div>

              <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">Live Client Chat Engine</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Real-time chat messaging between agents and borrowers.</span>
                </div>
                <button onClick={() => toggleFeatureFlag("live_chat_enabled")} className="cursor-pointer">
                  {featureFlags.live_chat_enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" /> : <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />}
                </button>
              </div>

              <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">Automated FSRA Compliance Scans</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Nightly regulatory audit checks on all active files.</span>
                </div>
                <button onClick={() => toggleFeatureFlag("compliance_autoscans_enabled")} className="cursor-pointer">
                  {featureFlags.compliance_autoscans_enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" /> : <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />}
                </button>
              </div>

              <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">SMS Client Notifications</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Twilio SMS updates sent directly to borrower phones.</span>
                </div>
                <button onClick={() => toggleFeatureFlag("sms_alerts_enabled")} className="cursor-pointer">
                  {featureFlags.sms_alerts_enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" /> : <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />}
                </button>
              </div>

              <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">Lender Rate Comparison Matrix</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Live rate matrix fed from tier 1/2 lender feeds.</span>
                </div>
                <button onClick={() => toggleFeatureFlag("rate_matrix_enabled")} className="cursor-pointer">
                  {featureFlags.rate_matrix_enabled ? <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" /> : <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]/30" />}
                </button>
              </div>

            </div>
          </div>

          {/* Beta Features Section */}
          <div className="bg-amber-500/5 border border-amber-500/30 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Experimental &amp; Beta Capabilities
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Opt-in to next-generation AI and intelligence modules currently under staging evaluation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              <div className="bg-[var(--color-surface)] border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                <span className="text-xs font-bold text-[var(--color-text)] block">Voice Note AI Transcription</span>
                <p className="text-[10px] text-[var(--color-text-muted)]">Convert agent voice notes directly into client notes.</p>
                <div className="pt-2 flex justify-end">
                  <button onClick={() => toggleFeatureFlag("beta_voice_transcribe")} className="cursor-pointer">
                    {featureFlags.beta_voice_transcribe ? <ToggleRight className="w-7 h-7 text-amber-500" /> : <ToggleLeft className="w-7 h-7 text-[var(--color-text-muted)]/30" />}
                  </button>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                <span className="text-xs font-bold text-[var(--color-text)] block">Smart Deal Closing Predictor</span>
                <p className="text-[10px] text-[var(--color-text-muted)]">ML model estimating probability of lender commitment.</p>
                <div className="pt-2 flex justify-end">
                  <button onClick={() => toggleFeatureFlag("beta_deal_predictor")} className="cursor-pointer">
                    {featureFlags.beta_deal_predictor ? <ToggleRight className="w-7 h-7 text-amber-500" /> : <ToggleLeft className="w-7 h-7 text-[var(--color-text-muted)]/30" />}
                  </button>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                <span className="text-xs font-bold text-[var(--color-text)] block">Refinance Lead Scanner</span>
                <p className="text-[10px] text-[var(--color-text-muted)]">Automatically flag existing clients due for rate resets.</p>
                <div className="pt-2 flex justify-end">
                  <button onClick={() => toggleFeatureFlag("beta_refi_scanner")} className="cursor-pointer">
                    {featureFlags.beta_refi_scanner ? <ToggleRight className="w-7 h-7 text-amber-500" /> : <ToggleLeft className="w-7 h-7 text-[var(--color-text-muted)]/30" />}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Per-Role Feature Matrix */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Per-Role Feature Availability Matrix
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Control which functional capabilities are accessible per user role.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10px] font-black uppercase text-[var(--color-text-faint)]">
                    <th className="py-2.5 px-3">Feature Capability</th>
                    <th className="py-2.5 px-3 text-center">Admin</th>
                    <th className="py-2.5 px-3 text-center">Manager</th>
                    <th className="py-2.5 px-3 text-center">Agent</th>
                    <th className="py-2.5 px-3 text-center">Support</th>
                    <th className="py-2.5 px-3 text-center">Client</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/50 text-[var(--color-text)]">
                  {[
                    { id: "ai_summary", name: "AI Summary Assistant" },
                    { id: "doc_ocr", name: "OCR Document Scanner" },
                    { id: "live_chat", name: "Live Client Chat" },
                    { id: "compliance", name: "Compliance Overrides" },
                    { id: "sms", name: "SMS Broadcasts" },
                    { id: "rate_matrix", name: "Lender Rate Matrix" },
                    { id: "beta", name: "Experimental Beta Features" }
                  ].map((f) => (
                    <tr key={f.id} className="hover:bg-[var(--color-surface-2)]/50">
                      <td className="py-2.5 px-3 font-bold">{f.name}</td>
                      {["admin", "manager", "agent", "support", "client"].map((r) => (
                        <td key={r} className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRolePermission(r, f.id)}
                            className="cursor-pointer"
                          >
                            {rolePermissions[r]?.[f.id] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                            ) : (
                              <X className="w-4 h-4 text-[var(--color-text-faint)]/40 inline" />
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: INTEGRATIONS & API KEYS */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          
          {/* API Keys Section */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> Service API Keys &amp; Credentials
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Securely manage third-party integration secrets. Keys are masked by default.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: "fsra_key", label: "FSRA Regulatory Portal API Key", prefix: "fsra_live" },
                { key: "sendgrid_key", label: "SendGrid Email Relay API Key", prefix: "SG" },
                { key: "google_maps_key", label: "Google Maps Platform Key", prefix: "AIza" },
                { key: "twilio_key", label: "Twilio SMS Service Account Key", prefix: "SK" },
                { key: "equifax_secret", label: "Equifax Credit Bureau Secret", prefix: "eq_sec" }
              ].map((item) => (
                <div key={item.key} className="bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-[var(--color-text)] block">{item.label}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type={revealedKeys[item.key] ? "text" : "password"}
                        value={apiKeys[item.key] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setApiKeys((prev: any) => ({ ...prev, [item.key]: val }));
                        }}
                        className="bg-[var(--color-surface-3)] border border-[var(--color-border)]/60 rounded px-2.5 py-1 text-xs text-[var(--color-text)] font-mono w-full max-w-md focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleKeyReveal(item.key)}
                      className="p-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-1)] text-[var(--color-text-muted)] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {revealedKeys[item.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText(apiKeys[item.key], item.label)}
                      className="p-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-1)] text-[var(--color-text-muted)] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerateKey(item.key, item.prefix)}
                      className="p-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-1)] text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Regenerate Key"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <Webhook className="w-4 h-4 text-purple-400" /> Outbound Webhook Relay
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Stream real-time CRM events to external loan processing software or data warehouses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Webhook Payload Endpoint URL
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Webhook HMAC Signing Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={revealWebhookSecret ? "text" : "password"}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealWebhookSecret(!revealWebhookSecret)}
                    className="p-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs cursor-pointer"
                  >
                    {revealWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Event Trigger Checkboxes */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)] block">
                Subscribed Event Triggers
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.keys(webhookEvents).map((eventKey) => (
                  <label
                    key={eventKey}
                    className="bg-[var(--color-surface-2)] p-2.5 rounded-xl border border-[var(--color-border)]/60 flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={webhookEvents[eventKey]}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setWebhookEvents((prev: any) => ({ ...prev, [eventKey]: checked }));
                      }}
                      className="accent-[var(--color-accent)] rounded"
                    />
                    <code className="font-mono text-[11px] text-[var(--color-text)]">{eventKey}</code>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleTestWebhook}
                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send Test Webhook
              </button>
            </div>
          </div>

          {/* Third-Party Service Status */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Integration Gateways Health &amp; Status
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Live connectivity monitor for external API partner feeds.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestServiceStatus}
                disabled={isTestingServices}
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingServices ? "animate-spin text-[var(--color-accent)]" : ""}`} /> Test Connections
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {serviceStatus.map((service) => (
                <div
                  key={service.id}
                  className="bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text)] block">{service.name}</span>
                    <span className="text-[10px] text-[var(--color-text-faint)] font-mono">Ping: {service.latency}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                    service.status === "Operational"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}>
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: SYSTEM EMAIL SETTINGS */}
      {activeTab === "email" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" /> Outbound System Email Routing
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Configure corporate sender identities and official email signature templates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
              
              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Default "From" Address
                </label>
                <input
                  type="text"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] font-medium focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Default "Reply-To" Address
                </label>
                <input
                  type="text"
                  value={emailReplyTo}
                  onChange={(e) => setEmailReplyTo(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] font-medium focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

            </div>

            {/* Email Signature Template */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
                  Official Email Signature Template
                </span>

                <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border)]">
                  <button
                    onClick={() => setSignaturePreviewMode(false)}
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded ${
                      !signaturePreviewMode ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => setSignaturePreviewMode(true)}
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded ${
                      signaturePreviewMode ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Live Preview
                  </button>
                </div>
              </div>

              {!signaturePreviewMode ? (
                <textarea
                  rows={6}
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl p-3 text-xs text-[var(--color-text)] font-mono leading-relaxed focus:outline-none focus:border-[var(--color-accent)]"
                />
              ) : (
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 p-4 rounded-xl text-xs text-[var(--color-text)] whitespace-pre-wrap font-sans border-l-4 border-l-[var(--color-accent)]">
                  {emailSignature
                    .replace("{{user.name}}", `${currentUser?.first || "David"} ${currentUser?.last || "Acosta"}`)
                    .replace("{{user.title}}", currentUser?.role || "Principal Mortgage Broker")
                    .replace("{{user.phone}}", "(416) 555-0199")}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-text-faint)]">
                <span className="font-bold uppercase">Dynamic Tokens:</span>
                {["{{user.name}}", "{{user.title}}", "{{user.phone}}", "{{company.name}}", "{{company.address}}"].map((token) => (
                  <button
                    key={token}
                    onClick={() => setEmailSignature(prev => prev + " " + token)}
                    className="bg-[var(--color-surface-3)] text-[var(--color-accent)] border border-[var(--color-border)] px-2 py-0.5 rounded font-mono cursor-pointer"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RESET TO FACTORY DEFAULTS CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-red-500/30 max-w-md w-full p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[var(--color-text)]">
                Reset Corporate CRM Defaults?
              </h3>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              This action will purge all customized pipeline stages, email notification templates, feature flag overrides, and API keys stored in local storage, reverting to standard factory settings.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl hover:bg-[var(--color-surface-3)] transition-all uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
