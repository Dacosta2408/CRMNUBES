import React, { useState, useEffect } from "react";
import { 
  Sparkles, FileText, UploadCloud, CheckCircle2, X, AlertCircle, Plus, Info, 
  ChevronRight, User, Users, MapPin, Briefcase, DollarSign, Building, Percent, 
  FileCheck, ArrowRight, ClipboardList, Check, RefreshCw, HardDrive, AlertTriangle
} from "lucide-react";
import { Client, User as CRMUser } from "../types";

interface ApplicationIntakeProps {
  mode: "manual" | "ai";
  preloadedText?: string;
  preloadedFileName?: string;
  onClearPreloaded?: () => void;
  currentUser: CRMUser;
  clients: Client[];
  onClose: () => void;
  onCreateClient: (
    clientData: Client, 
    fileMetadata: { name: string; size: string; content?: string } | null, 
    alertAction: 'create' | 'merge',
    suggestedDocs?: Array<{ id: string; name: string; desc: string; category: string }>,
    starterTasks?: Array<{ title: string; priority: 'high' | 'medium' | 'low'; notes: string }>
  ) => void;
  agentNames: string[];
  apiKeySet: boolean;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
}

export const ApplicationIntake: React.FC<ApplicationIntakeProps> = ({
  mode,
  preloadedText = "",
  preloadedFileName = "",
  onClearPreloaded,
  currentUser,
  clients,
  onClose,
  onCreateClient,
  agentNames,
  apiKeySet,
  showToast
}) => {
  const isAdmin = currentUser.role === "Developer/Admin" || currentUser.role === "Admin" || currentUser.isOwner === true;

  // --- WORKFLOW PROCESS STEPPER ---
  type WorkflowStepType = "upload" | "review" | "finalize";
  const [workflowStep, setWorkflowStep] = useState<WorkflowStepType>(
    mode === "manual" ? "review" : "upload"
  );

  // --- REVIEW TABS ---
  type TabType = "personal" | "address" | "employment" | "otherIncome" | "property" | "mortgage" | "submit";
  const [activeTab, setActiveTab] = useState<TabType>("personal");

  // --- EXTRACTION STATES ---
  const [isLoading, setIsLoading] = useState(false);
  const [rawText, setRawText] = useState(preloadedText);
  const [fileName, setFileName] = useState(preloadedFileName);
  const [fileSize, setFileSize] = useState(preloadedFileName ? "18 KB" : "");
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Track fields and metadata
  const [fields, setFields] = useState<Record<string, string>>({});
  const [intakeNotes, setIntakeNotes] = useState<string>("");

  // Target Agent & Selected Target Status
  const [assignedAgent, setAssignedAgent] = useState<string>("");
  const [intakeStatus, setIntakeStatus] = useState<'working' | 'lead'>('working');

  // Load preloaded text from Z-Drive or anywhere
  useEffect(() => {
    if (preloadedText) {
      setRawText(preloadedText);
    }
    if (preloadedFileName) {
      setFileName(preloadedFileName);
      setFileSize("18 KB");
    }
  }, [preloadedText, preloadedFileName]);

  // Set default assigned agent on mount
  useEffect(() => {
    if (currentUser) {
      setAssignedAgent(currentUser.first + " " + currentUser.last);
    }
  }, [currentUser]);

  const handleFieldChange = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handlePillSelect = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckboxToggle = (key: string) => {
    setFields(prev => ({ ...prev, [key]: prev[key] === "1" ? "" : "1" }));
  };

  // --- SAMPLES PAYLOAD FOR DEMO ---
  const handleLoadSample = (sampleType: 'barrie' | 'newmarket') => {
    setIsLoading(true);
    setTimeout(() => {
      let samplePayload: Record<string, string> = {};
      let originalFileName = "";
      let originalSize = "";
      
      if (sampleType === 'barrie') {
        originalFileName = "Jane_Smith_Barrie_Purchase_Application.pdf";
        originalSize = "324 KB";
        samplePayload = {
          // Applicant Personal
          app_first: "Jane",
          app_last: "Smith",
          app_email: "jane.smith@email.com",
          app_cell: "(705) 555-1212",
          app_dob_m: "08",
          app_dob_d: "14",
          app_dob_y: "1988",
          app_marital: "Single",
          app_sin: "555-014-921",
          app_contact: "Email",
          app_dependents: "1",
          
          // Applicant Address
          app_housing: "Rent",
          app_addr: "182 Bayfield Street",
          app_unit: "Apt 4B",
          app_city: "Barrie",
          app_prov: "ON",
          app_post: "L4M 3B5",
          app_res_yrs: "2",
          app_res_mos: "6",
          
          // Applicant Employment
          app_inc_employed: "1",
          app_emp1_name: "Royal Victoria Regional Health Centre",
          app_emp1_addr: "201 Georgian Dr",
          app_emp1_city: "Barrie",
          app_emp1_prov: "ON",
          app_emp1_post: "L4M 6M2",
          app_emp1_tel: "(705) 728-9090",
          app_emp1_status: "Full Time",
          app_emp1_yrs: "5",
          app_emp1_mos: "2",
          app_emp1_title: "Senior Registered Nurse",
          app_emp1_type: "Salary",
          app_emp1_income: "98500",

          // Property Details
          prop_type: "Detached",
          prop_style: "Two Storey",
          prop_tenure: "Freehold",
          prop_age: "12",
          prop_area: "2100",
          prop_area_unit: "Sq Ft",
          prop_lot: "50",
          prop_lot_unit: "Sq Ft",
          prop_garage_type: "Attached",
          prop_garage_size: "Double",
          prop_heat: "Forced Air Gas",
          prop_water: "Municipal",
          prop_sewage: "Municipal",
          prop_hotwater: "Gas",
          prop_value: "620000",
          prop_orig_price: "410000",
          prop_purchase_date: "05/12/2019",
          prop_tax_in_mtg: "No",
          prop_tax: "3800",
          prop_condo_fees: "0",

          // First Mortgage
          mtg1_balance: "395000",
          mtg1_payment: "2450",
          mtg1_freq: "Monthly",
          mtg1_maturity: "10/15/2027",
          mtg1_rate: "4.89",
          mtg1_rate_type: "Fixed",
          mtg1_term_type: "Closed",
          mtg1_holder: "TD Bank",
          mtg1_loan_type: "Mortgage",
          mtg1_orig_amount: "430000",
          mtg1_number: "TD-4882195",
        };
      } else {
        originalFileName = "Michael_Sutton_Newmarket_BFS_Refi.pdf";
        originalSize = "412 KB";
        samplePayload = {
          // Applicant Personal
          app_first: "Michael",
          app_last: "Sutton",
          app_email: "sutton.m@suttonconsulting.ca",
          app_cell: "(905) 555-8833",
          app_dob_m: "11",
          app_dob_d: "03",
          app_dob_y: "1974",
          app_marital: "Married",
          app_sin: "400-928-111",
          app_contact: "Phone",
          app_dependents: "2",

          // Co-Applicant Personal
          co_first: "Sarah",
          co_last: "Sutton",
          co_email: "sarah.sutton@email.com",
          co_cell: "(905) 555-8834",
          co_dob_m: "04",
          co_dob_d: "25",
          co_dob_y: "1977",
          co_marital: "Married",
          co_sin: "400-928-112",
          co_contact: "Email",
          co_dependents: "2",

          // Applicant Address (Owns, no previous)
          app_housing: "Own",
          app_addr: "82 Eagle Street",
          app_unit: "",
          app_city: "Newmarket",
          app_prov: "ON",
          app_post: "L3Y 1J4",
          app_res_yrs: "8",
          app_res_mos: "0",

          // Applicant Employment
          app_inc_self: "1",
          app_self_name: "Sutton Consulting Inc.",
          app_self_yrs: "6",
          app_self_start: "02/2020",
          app_self_income: "142000",

          // Co-Applicant Employment
          co_inc_employed: "1",
          co_emp1_name: "York Region District School Board",
          co_emp1_city: "Aurora",
          co_emp1_prov: "ON",
          co_emp1_status: "Full Time",
          co_emp1_yrs: "11",
          co_emp1_mos: "4",
          co_emp1_title: "Secondary School Teacher",
          co_emp1_type: "Salary",
          co_emp1_income: "92000",

          // Property Details
          prop_type: "Detached",
          prop_style: "Two Storey",
          prop_tenure: "Freehold",
          prop_age: "24",
          prop_area: "2800",
          prop_area_unit: "Sq Ft",
          prop_lot: "60",
          prop_lot_unit: "Sq Ft",
          prop_garage_type: "Attached",
          prop_garage_size: "Double",
          prop_heat: "Forced Air Gas",
          prop_water: "Municipal",
          prop_sewage: "Municipal",
          prop_hotwater: "Gas",
          prop_value: "1150000",
          prop_orig_price: "680000",
          prop_purchase_date: "08/14/2016",
          prop_tax_in_mtg: "No",
          prop_tax: "5200",
          prop_condo_fees: "0",

          // First Mortgage
          mtg1_balance: "510000",
          mtg1_payment: "3100",
          mtg1_freq: "Monthly",
          mtg1_maturity: "04/30/2028",
          mtg1_rate: "5.19",
          mtg1_rate_type: "Fixed",
          mtg1_term_type: "Closed",
          mtg1_holder: "Scotiabank",
          mtg1_loan_type: "Mortgage",
          mtg1_orig_amount: "550000",
          mtg1_number: "SCO-9921445",
        };
      }

      setFileName(originalFileName);
      setFileSize(originalSize);
      setFields(samplePayload);
      setIntakeNotes("AI successfully matched and pre-aligned values from the official application email file format.");
      setIsLoading(false);
      setWorkflowStep("review");
      showToast(`Sample application parsed and extracted successfully!`, "success", "✨");
    }, 1000);
  };

  // --- REAL PARSER VIA GEMINI ON SERVER ---
  const handleExtractWithAI = async () => {
    if (!rawText.trim()) {
      showToast("Please enter or paste application text before extracting.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      if (!apiKeySet) {
        showToast("Gemini API key is not configured, falling back to simulated extraction...", "warning", "⚙️");
        handleLoadSample('barrie');
        return;
      }

      const res = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }) 
      });

      if (!res.ok) throw new Error("Server extraction failed");
      const data = await res.json();
      
      // Map extracted values
      const rawFields: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          rawFields[k] = String(v);
        }
      });

      // Special helper for dates (e.g., birthdate splits "1988-08-14")
      if (rawFields.app_dob && rawFields.app_dob.includes("-")) {
        const parts = rawFields.app_dob.split("-");
        if (parts.length === 3) {
          rawFields.app_dob_y = parts[0];
          rawFields.app_dob_m = parts[1];
          rawFields.app_dob_d = parts[2];
        }
      }
      if (rawFields.co_dob && rawFields.co_dob.includes("-")) {
        const parts = rawFields.co_dob.split("-");
        if (parts.length === 3) {
          rawFields.co_dob_y = parts[0];
          rawFields.co_dob_m = parts[1];
          rawFields.co_dob_d = parts[2];
        }
      }

      // Map primary address and property values
      if (rawFields.prop_addr) {
        rawFields.app_addr = rawFields.prop_addr;
      }

      setFields(rawFields);
      setIntakeNotes(`Successfully extracted parameters using Gemini 3.5 Flash.`);
      setWorkflowStep("review");
      showToast("Application parsed with Gemini AI successfully!", "success", "✓");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to parse application text. Falling back to sample Barrie data...", "error");
      handleLoadSample('barrie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uFile = e.target.files[0];
      setFileName(uFile.name);
      setFileSize(`${Math.round(uFile.size / 1024)} KB`);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const textContent = evt.target?.result as string;
        setRawText(textContent || "");
        showToast(`Loaded ${uFile.name}. Click 'Extract with AI' to parse.`, "info");
      };
      reader.readAsText(uFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const uFile = e.dataTransfer.files[0];
      setFileName(uFile.name);
      setFileSize(`${Math.round(uFile.size / 1024)} KB`);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const textContent = evt.target?.result as string;
        setRawText(textContent || "");
        showToast(`Dropped ${uFile.name}. Click 'Extract with AI' to parse.`, "info");
      };
      reader.readAsText(uFile);
    }
  };

  // --- SUBMIT COMPILATION ---
  const handleCommissionFile = () => {
    // Validate primary applicant names & email
    const first = fields.app_first?.trim();
    const last = fields.app_last?.trim();
    const email = fields.app_email?.trim();

    if (!first || !last) {
      showToast("First name and last name are required under Personal tab.", "error");
      setActiveTab("personal");
      return;
    }
    if (!email || !email.includes("@")) {
      showToast("A valid email is required under Personal tab.", "error");
      setActiveTab("personal");
      return;
    }

    // Map fields into Client structure
    const dobString = fields.app_dob_y && fields.app_dob_m && fields.app_dob_d 
      ? `${fields.app_dob_y}-${fields.app_dob_m}-${fields.app_dob_d}` 
      : "";

    const finalClient: Client = {
      id: "cli_" + Math.random().toString(36).substr(2, 9),
      first,
      last,
      email,
      cell: fields.app_cell || "",
      dob: dobString || undefined,
      marital: fields.app_marital || "",
      sin: fields.app_sin || "",
      dep: fields.app_dependents || "",
      co: fields.co_first && fields.co_last ? `${fields.co_first} ${fields.co_last}` : undefined,
      coEmail: fields.co_email || "",
      income: fields.app_emp1_income || fields.app_self_income || "",
      coIncome: fields.co_emp1_income || fields.co_self_income || "",
      emptype: fields.app_inc_self === "1" ? "BFS / Self-Employed" : fields.app_emp1_status || "Salaried",
      beacon: fields.beacon || "710",
      propval: fields.prop_value || "0",
      mtgamt: fields.mtg1_balance || "0",
      debts: fields.debts || "0",
      tax: fields.prop_tax || "0",
      condo: fields.prop_condo_fees || "0",
      heat: fields.prop_heat || "150",
      addr: fields.app_addr || "",
      proptype: fields.prop_type || "",
      tenure: fields.prop_tenure || "",
      source: mode === "ai" ? "AI Application Intake" : "Manual CRM Form",
      status: intakeStatus === "working" ? "working" : "lead",
      agent: assignedAgent || currentUser.first + " " + currentUser.last,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appData: fields,
      aiSummary: intakeNotes || "Client successfully added into GBK CRM."
    };

    // Automated underwriter document requirements based on client details
    const suggestedDocs = [
      { id: "doc_id_proof", name: "Two Pieces of Government Photo ID", desc: "For FINTRAC compliance. Must be unexpired and match names perfectly.", category: "Compliance" }
    ];

    if (fields.app_inc_self === "1") {
      suggestedDocs.push({ id: "doc_bfs_tax", name: "2 Years of CRA Notice of Assessment (NOA)", desc: "Required to verify business income and verify zero balance taxes owing.", category: "Income" });
      suggestedDocs.push({ id: "doc_bfs_articles", name: "Articles of Incorporation / Business Licence", desc: "Proof of active business registry for at least 24 months.", category: "Income" });
    } else {
      suggestedDocs.push({ id: "doc_emp_letter", name: "Employment Letter & Recent Paystub", desc: "Dated within last 30 days, confirming salary, position, and full-time status.", category: "Income" });
    }

    if (fields.prop_value) {
      suggestedDocs.push({ id: "doc_purchase_agr", name: "Agreement of Purchase and Sale (APS) & MLS Listing", desc: "Required for property underwriting assessment.", category: "Property" });
    }

    const starterTasks = [
      { title: "Review extracted data integrity", priority: "high" as const, notes: "Verify SIN, email and complete DOB matches client identification documents." },
      { title: "Request checklist documents", priority: "high" as const, notes: `Send automated checklist of ${suggestedDocs.length} items to ${email}.` }
    ];

    onCreateClient(finalClient, fileName ? { name: fileName, size: fileSize } : null, "create", suggestedDocs, starterTasks);
    onClose();
    if (onClearPreloaded) onClearPreloaded();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 z-40 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-surface-2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-primary)] rounded-xl text-[var(--color-text-inverse)] shadow-sm">
              <Sparkles className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider">
                {mode === "ai" ? "✨ AI Full Application Intake" : "📋 Manual Client Intake Form"}
              </h2>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                {mode === "ai" 
                  ? "Take application forms from emails or PDFs, parse them with Gemini AI, and instantly populate a secure CRM file" 
                  : "Manually fill out a complete, structured mortgage application to initiate a new file"}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { onClose(); if (onClearPreloaded) onClearPreloaded(); }}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1.5 hover:bg-[var(--color-surface-2)]/80 rounded-lg transition-all"
            id="close-intake-modal-btn"
          >
            ✕
          </button>
        </div>

        {/* Outer body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* AI Intake Zone (only in AI mode & Upload step) */}
          {mode === "ai" && workflowStep === "upload" && (
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6" id="ai-upload-workflow-box">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  isDragActive 
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" 
                    : "border-[var(--color-border)] bg-[var(--color-bg)]/30 hover:bg-[var(--color-surface-2)]/30"
                }`}
              >
                <div className="p-4 bg-[var(--color-surface-2)] rounded-full text-[var(--color-primary)]">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Drag &amp; Drop Mortgage Application File</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Supports application text formats, HTML templates, PDFs, or email notes.</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <label className="px-4 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-semibold rounded-lg cursor-pointer transition-all">
                    Browse File
                    <input type="file" onChange={handleFileUpload} className="hidden" accept=".txt,.html,.pdf,.doc,.docx" />
                  </label>
                  <span className="text-[10px] text-[var(--color-text-faint)]">or</span>
                  <button 
                    onClick={() => handleLoadSample('barrie')}
                    className="px-4 py-1.5 bg-[var(--color-accent-subtle)] text-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]/20 border border-[var(--color-accent)]/20 text-xs font-semibold rounded-lg transition-all"
                  >
                    Load Sample A (Barrie)
                  </button>
                  <button 
                    onClick={() => handleLoadSample('newmarket')}
                    className="px-4 py-1.5 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]/20 border border-[var(--color-primary)]/20 text-xs font-semibold rounded-lg transition-all"
                  >
                    Load Sample B (Newmarket)
                  </button>
                </div>
                {fileName && (
                  <div className="mt-3 px-3 py-1.5 bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg text-xs font-bold flex items-center gap-2">
                     <FileCheck className="w-4 h-4" />
                     <span>Loaded: {fileName} ({fileSize})</span>
                  </div>
                )}
              </div>

              {/* Paste Text / Email Application Form Field */}
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-accent)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-accent)]" /> Paste Application Text / Email Content
                  </h4>
                  {!apiKeySet && (
                    <span className="text-[9px] badge-warning border border-[var(--color-warning)]/10 px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Simulated AI Mode
                    </span>
                  )}
                </div>

                <textarea 
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the mortgage application content, credit details, or copy/pasted email form here. Example: Jane Smith, single, cell 705-555-1212. Works at RVH Hospital in Barrie, salary 98,500. Buying a house for 620,000..."
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/40 font-mono leading-relaxed"
                />

                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={handleExtractWithAI}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] disabled:opacity-40 text-[var(--color-text-inverse)] font-black text-xs uppercase tracking-wider rounded-lg hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>AI is Analyzing &amp; Populating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>✦ Extract with Gemini AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Review Form Workspace (AI Stage 2 / Manual Stage 1) */}
          {workflowStep === "review" && (
            <div className="flex-grow flex flex-col overflow-hidden" id="structured-review-workspace">
              {/* Stepper Tab Indicators */}
              <div className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] overflow-x-auto scrollbar-none flex shrink-0">
                {(["personal", "address", "employment", "otherIncome", "property", "mortgage", "submit"] as TabType[]).map((tab, idx) => {
                  const isActive = activeTab === tab;
                  const labelMap: Record<string, string> = {
                    personal: "Personal",
                    address: "Address",
                    employment: "Employment",
                    otherIncome: "Other Income",
                    property: "Property",
                    mortgage: "Mortgage",
                    submit: "Review & Save"
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 md:flex-initial justify-center min-w-max flex-shrink-0 px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-bold transition-all border-b-2 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                        isActive 
                          ? "text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent-subtle)]" 
                          : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]"
                      }`}
                    >
                      <span className={`s-bubble w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border shrink-0 ${
                        isActive ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "border-[var(--color-border)]"
                      }`}>{idx + 1}</span>
                      <span className="s-label whitespace-nowrap font-bold">{labelMap[tab]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Scrollable Contents */}
              <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg)]">
                {/* ℹ️ Premium Dynamic Contextual Helper Banner */}
                <div className="mb-6 p-4 rounded-xl border bg-[var(--color-surface-2)]/60 backdrop-blur-sm shadow-sm flex items-start gap-3"
                  style={{
                    borderColor: "rgba(124, 58, 237, 0.15)",
                    borderLeft: "3px solid var(--color-accent)"
                  }}
                >
                  <div className="p-1.5 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent)] shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">
                      {activeTab === "personal" && "1. Client & Co-Applicant Verification"}
                      {activeTab === "address" && "2. Residential History Logging"}
                      {activeTab === "employment" && "3. Professional & Active Employment tenure"}
                      {activeTab === "income" && "4. Supplemental Income & Cashflows"}
                      {activeTab === "property" && "5. Real Estate Collateral parameters"}
                      {activeTab === "mortgage" && "6. Loan Structure & Underwriting terms"}
                      {activeTab === "submit" && "7. Final Submission Checklist"}
                    </h5>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium leading-relaxed max-w-2xl">
                      {activeTab === "personal" && "Enter authentic details for the primary borrower and co-borrower. Date of Birth and contact channels are required to generate automated email workflows."}
                      {activeTab === "address" && "Input three contiguous years of residency. If the applicant has lived at their current address for less than 36 months, make sure to populate the previous address fields to prevent credit bureau check failures."}
                      {activeTab === "employment" && "Detail primary professional records. Mortgages require a steady income baseline; include complete salary or guaranteed hours with accurate employer contacts."}
                      {activeTab === "income" && "Verify all secondary income sources such as active rental property leases, military pensions, investment dividends, or legal child support records."}
                      {activeTab === "property" && "Define the physical property address, estimated valuation, and tax rolls. For pre-approvals without a specific subject property, check the 'Pre-Approval / No Address' flag."}
                      {activeTab === "mortgage" && "Specify the desired principal requested, loan amortization timeline, and current interest rates to calculate real-time debt ratios and pricing options."}
                      {activeTab === "submit" && "Review parsed data fields side-by-side with your client file. Confirm accuracy and resolve missing records prior to synchronizing this deal to the central workspace."}
                    </p>
                  </div>
                </div>

                {/* 1. PERSONAL INFORMATION */}
                {activeTab === "personal" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="tab-personal-form">
                    {/* Applicant */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-primary)]/20">Applicant</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">First Name *</label>
                          <input type="text" value={fields.app_first || ""} onChange={(e) => handleFieldChange("app_first", e.target.value)} placeholder="Jane" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Last Name *</label>
                          <input type="text" value={fields.app_last || ""} onChange={(e) => handleFieldChange("app_last", e.target.value)} placeholder="Smith" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Email Address *</label>
                        <input type="email" value={fields.app_email || ""} onChange={(e) => handleFieldChange("app_email", e.target.value)} placeholder="jane@email.com" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Date of Birth</label>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" value={fields.app_dob_m || ""} onChange={(e) => handleFieldChange("app_dob_m", e.target.value)} placeholder="MM" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          <input type="text" value={fields.app_dob_d || ""} onChange={(e) => handleFieldChange("app_dob_d", e.target.value)} placeholder="DD" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          <input type="text" value={fields.app_dob_y || ""} onChange={(e) => handleFieldChange("app_dob_y", e.target.value)} placeholder="YYYY" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Marital Status</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Married", "Single", "Divorced", "Separated", "Common-Law", "Widowed"].map(m => (
                            <button key={m} type="button" onClick={() => handlePillSelect("app_marital", m)} className={`px-3 py-1 rounded text-[11px] border transition-all cursor-pointer ${fields.app_marital === m ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{m}</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">S.I.N.</label>
                          <input type="text" value={fields.app_sin || ""} onChange={(e) => handleFieldChange("app_sin", e.target.value)} placeholder="000-000-000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Credit Beacon Score</label>
                          <input type="number" value={fields.beacon || ""} onChange={(e) => handleFieldChange("beacon", e.target.value)} placeholder="720" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Cell Phone</label>
                          <input type="text" value={fields.app_cell || ""} onChange={(e) => handleFieldChange("app_cell", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Home Phone</label>
                          <input type="text" value={fields.app_home || ""} onChange={(e) => handleFieldChange("app_home", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Work Phone</label>
                          <input type="text" value={fields.app_work || ""} onChange={(e) => handleFieldChange("app_work", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Fax</label>
                          <input type="text" value={fields.app_fax || ""} onChange={(e) => handleFieldChange("app_fax", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Daytime Phone</label>
                          <input type="text" value={fields.app_day || ""} onChange={(e) => handleFieldChange("app_day", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Evening Phone</label>
                          <input type="text" value={fields.app_evening || ""} onChange={(e) => handleFieldChange("app_evening", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Preferred Contact</label>
                          <div className="flex gap-2">
                            {["Email", "Phone"].map(c => (
                              <button key={c} type="button" onClick={() => handlePillSelect("app_contact", c)} className={`flex-1 py-1.5 rounded text-xs border cursor-pointer transition-all ${fields.app_contact === c ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{c}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Dependents Under 18</label>
                          <input type="number" value={fields.app_dependents || ""} onChange={(e) => handleFieldChange("app_dependents", e.target.value)} placeholder="0" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>
                    </div>

                    {/* Co-Applicant */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-surface-3)] text-[var(--color-text-muted)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-border)]">Co-Applicant (Optional)</span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">First Name</label>
                          <input type="text" value={fields.co_first || ""} onChange={(e) => handleFieldChange("co_first", e.target.value)} placeholder="John" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Last Name</label>
                          <input type="text" value={fields.co_last || ""} onChange={(e) => handleFieldChange("co_last", e.target.value)} placeholder="Smith" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Email Address</label>
                        <input type="email" value={fields.co_email || ""} onChange={(e) => handleFieldChange("co_email", e.target.value)} placeholder="john@email.com" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Date of Birth</label>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" value={fields.co_dob_m || ""} onChange={(e) => handleFieldChange("co_dob_m", e.target.value)} placeholder="MM" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          <input type="text" value={fields.co_dob_d || ""} onChange={(e) => handleFieldChange("co_dob_d", e.target.value)} placeholder="DD" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          <input type="text" value={fields.co_dob_y || ""} onChange={(e) => handleFieldChange("co_dob_y", e.target.value)} placeholder="YYYY" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Marital Status</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Married", "Single", "Divorced", "Separated", "Common-Law", "Widowed"].map(m => (
                            <button key={m} type="button" onClick={() => handlePillSelect("co_marital", m)} className={`px-3 py-1 rounded text-[11px] border transition-all cursor-pointer ${fields.co_marital === m ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{m}</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">S.I.N.</label>
                          <input type="text" value={fields.co_sin || ""} onChange={(e) => handleFieldChange("co_sin", e.target.value)} placeholder="000-000-000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Cell Phone</label>
                          <input type="text" value={fields.co_cell || ""} onChange={(e) => handleFieldChange("co_cell", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Home Phone</label>
                          <input type="text" value={fields.co_home || ""} onChange={(e) => handleFieldChange("co_home", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Work Phone</label>
                          <input type="text" value={fields.co_work || ""} onChange={(e) => handleFieldChange("co_work", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Fax</label>
                          <input type="text" value={fields.co_fax || ""} onChange={(e) => handleFieldChange("co_fax", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Daytime Phone</label>
                          <input type="text" value={fields.co_day || ""} onChange={(e) => handleFieldChange("co_day", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Evening Phone</label>
                          <input type="text" value={fields.co_evening || ""} onChange={(e) => handleFieldChange("co_evening", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Preferred Contact</label>
                          <div className="flex gap-2">
                            {["Email", "Phone"].map(c => (
                              <button key={c} type="button" onClick={() => handlePillSelect("co_contact", c)} className={`flex-1 py-1.5 rounded text-xs border cursor-pointer transition-all ${fields.co_contact === c ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{c}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Dependents Under 18</label>
                        <input type="number" value={fields.co_dependents || ""} onChange={(e) => handleFieldChange("co_dependents", e.target.value)} placeholder="0" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ADDRESS INFORMATION */}
                {activeTab === "address" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="tab-address-form">
                    {/* Applicant Address */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-primary)]/20">Applicant Address</span>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Currently</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Own", "Rent", "Live with Relatives", "Live With Others"].map(h => (
                            <button key={h} type="button" onClick={() => handlePillSelect("app_housing", h)} className={`px-3 py-1 rounded text-[11px] border transition-all cursor-pointer ${fields.app_housing === h ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{h}</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-3">
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Street Address *</label>
                          <input type="text" value={fields.app_addr || ""} onChange={(e) => handleFieldChange("app_addr", e.target.value)} placeholder="123 Main St" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Unit</label>
                          <input type="text" value={fields.app_unit || ""} onChange={(e) => handleFieldChange("app_unit", e.target.value)} placeholder="Apt 4B" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">City</label>
                          <input type="text" value={fields.app_city || ""} onChange={(e) => handleFieldChange("app_city", e.target.value)} placeholder="Barrie" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Province</label>
                          <input type="text" value={fields.app_prov || ""} onChange={(e) => handleFieldChange("app_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Postal Code</label>
                          <input type="text" value={fields.app_post || ""} onChange={(e) => handleFieldChange("app_post", e.target.value)} placeholder="L4M 3B5" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Years at Residence</label>
                          <input type="number" value={fields.app_res_yrs || ""} onChange={(e) => handleFieldChange("app_res_yrs", e.target.value)} placeholder="3" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Months</label>
                          <input type="number" value={fields.app_res_mos || ""} onChange={(e) => handleFieldChange("app_res_mos", e.target.value)} placeholder="6" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      {/* Previous Address Block */}
                      <div className="pt-4 border-t border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-accent)] uppercase font-bold tracking-wider mb-2 block">Previous Address (If less than 3 years)</span>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div className="col-span-3">
                            <input type="text" value={fields.app_prev_addr || ""} onChange={(e) => handleFieldChange("app_prev_addr", e.target.value)} placeholder="Previous Street Address" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          </div>
                          <div>
                            <input type="text" value={fields.app_prev_unit || ""} onChange={(e) => handleFieldChange("app_prev_unit", e.target.value)} placeholder="Unit" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" value={fields.app_prev_city || ""} onChange={(e) => handleFieldChange("app_prev_city", e.target.value)} placeholder="City" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          <input type="text" value={fields.app_prev_prov || ""} onChange={(e) => handleFieldChange("app_prev_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          <input type="text" value={fields.app_prev_post || ""} onChange={(e) => handleFieldChange("app_prev_post", e.target.value)} placeholder="Postal" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>
                    </div>

                    {/* Co-Applicant Address */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-surface-3)] text-[var(--color-text-muted)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-border)]">Co-Applicant Address</span>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Currently</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Own", "Rent", "Live with Relatives", "Live With Others"].map(h => (
                            <button key={h} type="button" onClick={() => handlePillSelect("co_housing", h)} className={`px-3 py-1 rounded text-[11px] border transition-all cursor-pointer ${fields.co_housing === h ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{h}</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-3">
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Street Address</label>
                          <input type="text" value={fields.co_addr || ""} onChange={(e) => handleFieldChange("co_addr", e.target.value)} placeholder="123 Main St" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Unit</label>
                          <input type="text" value={fields.co_unit || ""} onChange={(e) => handleFieldChange("co_unit", e.target.value)} placeholder="Apt 4B" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">City</label>
                          <input type="text" value={fields.co_city || ""} onChange={(e) => handleFieldChange("co_city", e.target.value)} placeholder="Barrie" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Province</label>
                          <input type="text" value={fields.co_prov || ""} onChange={(e) => handleFieldChange("co_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Postal Code</label>
                          <input type="text" value={fields.co_post || ""} onChange={(e) => handleFieldChange("co_post", e.target.value)} placeholder="L4M 3B5" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Years at Residence</label>
                          <input type="number" value={fields.co_res_yrs || ""} onChange={(e) => handleFieldChange("co_res_yrs", e.target.value)} placeholder="3" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Months</label>
                          <input type="number" value={fields.co_res_mos || ""} onChange={(e) => handleFieldChange("co_res_mos", e.target.value)} placeholder="6" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      {/* Co-Applicant Previous Address Block */}
                      {fields.co_res_yrs && parseInt(fields.co_res_yrs, 10) < 3 && (
                        <div className="pt-4 border-t border-[var(--color-border)]">
                          <span className="text-[10px] text-[var(--color-accent)] uppercase font-bold tracking-wider mb-2 block">Previous Address (If less than 3 years)</span>
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <div className="col-span-3">
                              <input type="text" value={fields.co_prev_addr || ""} onChange={(e) => handleFieldChange("co_prev_addr", e.target.value)} placeholder="Previous Street Address" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            </div>
                            <div>
                              <input type="text" value={fields.co_prev_unit || ""} onChange={(e) => handleFieldChange("co_prev_unit", e.target.value)} placeholder="Unit" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input type="text" value={fields.co_prev_city || ""} onChange={(e) => handleFieldChange("co_prev_city", e.target.value)} placeholder="City" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            <input type="text" value={fields.co_prev_prov || ""} onChange={(e) => handleFieldChange("co_prev_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            <input type="text" value={fields.co_prev_post || ""} onChange={(e) => handleFieldChange("co_prev_post", e.target.value)} placeholder="Postal" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. EMPLOYMENT INFORMATION */}
                {activeTab === "employment" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="tab-employment-form">
                    {/* Applicant Employment */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-primary)]/20">Applicant Employment</span>
                      
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Income Sources</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleCheckboxToggle("app_inc_employed")} className={`flex-1 py-1.5 rounded text-xs border cursor-pointer transition-all ${fields.app_inc_employed === "1" ? "bg-[var(--color-primary-subtle)] border-[var(--color-primary)] text-[var(--color-text)] font-semibold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>Employed</button>
                          <button type="button" onClick={() => handleCheckboxToggle("app_inc_self")} className={`flex-1 py-1.5 rounded text-xs border cursor-pointer transition-all ${fields.app_inc_self === "1" ? "bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-text)] font-semibold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>Self-Employed</button>
                        </div>
                      </div>

                      {/* Primary Employed Details block */}
                      {fields.app_inc_employed === "1" && (
                        <div className="space-y-4">
                          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                            <span className="text-[10px] text-[var(--color-primary)] uppercase font-extrabold tracking-wider block">Primary Employer Details</span>
                            <div>
                              <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Employer Name</label>
                              <input type="text" value={fields.app_emp1_name || ""} onChange={(e) => handleFieldChange("app_emp1_name", e.target.value)} placeholder="Company Inc." className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Job Title</label>
                                <input type="text" value={fields.app_emp1_title || ""} onChange={(e) => handleFieldChange("app_emp1_title", e.target.value)} placeholder="Manager" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Gross Annual Income</label>
                                <input type="number" value={fields.app_emp1_income || ""} onChange={(e) => handleFieldChange("app_emp1_income", e.target.value)} placeholder="95000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Time (Yrs)</label>
                                <input type="number" value={fields.app_emp1_yrs || ""} onChange={(e) => handleFieldChange("app_emp1_yrs", e.target.value)} placeholder="3" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Months</label>
                                <input type="number" value={fields.app_emp1_mos || ""} onChange={(e) => handleFieldChange("app_emp1_mos", e.target.value)} placeholder="4" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Status</label>
                                <select value={fields.app_emp1_status || ""} onChange={(e) => handleFieldChange("app_emp1_status", e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                                  <option value="">Select</option>
                                  <option value="Full Time">Full Time</option>
                                  <option value="Part Time">Part Time</option>
                                  <option value="Contract">Contract</option>
                                  <option value="Seasonal">Seasonal</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Secondary Job (Optional) */}
                          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                            <span className="text-[10px] text-teal-500 uppercase font-extrabold tracking-wider block">Secondary Employer (If applicable)</span>
                            <div>
                              <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Employer Name</label>
                              <input type="text" value={fields.app_emp2_name || ""} onChange={(e) => handleFieldChange("app_emp2_name", e.target.value)} placeholder="Second Job Ltd." className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Job Title</label>
                                <input type="text" value={fields.app_emp2_title || ""} onChange={(e) => handleFieldChange("app_emp2_title", e.target.value)} placeholder="Associate" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Gross Annual Income</label>
                                <input type="number" value={fields.app_emp2_income || ""} onChange={(e) => handleFieldChange("app_emp2_income", e.target.value)} placeholder="25000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Time (Yrs)</label>
                                <input type="number" value={fields.app_emp2_yrs || ""} onChange={(e) => handleFieldChange("app_emp2_yrs", e.target.value)} placeholder="1" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Months</label>
                                <input type="number" value={fields.app_emp2_mos || ""} onChange={(e) => handleFieldChange("app_emp2_mos", e.target.value)} placeholder="2" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Status</label>
                                <select value={fields.app_emp2_status || ""} onChange={(e) => handleFieldChange("app_emp2_status", e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                                  <option value="">Select</option>
                                  <option value="Part Time">Part Time</option>
                                  <option value="Full Time">Full Time</option>
                                  <option value="Contract">Contract</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Previous Job (Required if under 3 years) */}
                          {fields.app_emp1_yrs && parseInt(fields.app_emp1_yrs, 10) < 3 && (
                            <div className="bg-[var(--color-surface-2)] border border-amber-500/20 p-4 rounded-xl space-y-3">
                              <span className="text-[10px] text-amber-500 uppercase font-extrabold tracking-wider block">Previous Employer (Required - Under 3 yrs on job)</span>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Employer Name</label>
                                <input type="text" value={fields.app_prev_emp_name || ""} onChange={(e) => handleFieldChange("app_prev_emp_name", e.target.value)} placeholder="Old Company Corp" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Job Title</label>
                                  <input type="text" value={fields.app_prev_emp_title || ""} onChange={(e) => handleFieldChange("app_prev_emp_title", e.target.value)} placeholder="Specialist" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Gross Annual Income</label>
                                  <input type="number" value={fields.app_prev_emp_income || ""} onChange={(e) => handleFieldChange("app_prev_emp_income", e.target.value)} placeholder="75000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Time (Yrs)</label>
                                  <input type="number" value={fields.app_prev_emp_yrs || ""} onChange={(e) => handleFieldChange("app_prev_emp_yrs", e.target.value)} placeholder="2" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Months</label>
                                  <input type="number" value={fields.app_prev_emp_mos || ""} onChange={(e) => handleFieldChange("app_prev_emp_mos", e.target.value)} placeholder="0" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Primary Self-Employed block */}
                      {fields.app_inc_self === "1" && (
                        <div className="bg-[var(--color-surface-2)] border border-[var(--color-accent)]/20 p-4 rounded-xl space-y-3">
                          <span className="text-[10px] text-[var(--color-accent)] uppercase font-extrabold tracking-wider block">Self-Employment / BFS</span>
                          <div>
                            <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Business / Company Name</label>
                            <input type="text" value={fields.app_self_name || ""} onChange={(e) => handleFieldChange("app_self_name", e.target.value)} placeholder="My Corporation" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Years in Business</label>
                              <input type="number" value={fields.app_self_yrs || ""} onChange={(e) => handleFieldChange("app_self_yrs", e.target.value)} placeholder="5" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                            </div>
                            <div>
                              <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">BFS Annual Net Income</label>
                              <input type="number" value={fields.app_self_income || ""} onChange={(e) => handleFieldChange("app_self_income", e.target.value)} placeholder="110000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Co-Applicant Employment */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-surface-3)] text-[var(--color-text-muted)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-border)]">Co-Applicant Employment</span>
                      
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Income Sources</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleCheckboxToggle("co_inc_employed")} className={`flex-1 py-1.5 rounded text-xs border cursor-pointer transition-all ${fields.co_inc_employed === "1" ? "bg-[var(--color-primary-subtle)] border-[var(--color-primary)] text-[var(--color-text)] font-semibold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>Employed</button>
                          <button type="button" onClick={() => handleCheckboxToggle("co_inc_self")} className={`flex-1 py-1.5 rounded text-xs border cursor-pointer transition-all ${fields.co_inc_self === "1" ? "bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-text)] font-semibold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>Self-Employed</button>
                        </div>
                      </div>

                      {/* Co-Applicant Employed Details block */}
                      {fields.co_inc_employed === "1" && (
                        <div className="space-y-4">
                          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                            <span className="text-[10px] text-[var(--color-primary)] uppercase font-extrabold tracking-wider block">Co-Applicant Employer Details</span>
                            <div>
                              <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Employer Name</label>
                              <input type="text" value={fields.co_emp1_name || ""} onChange={(e) => handleFieldChange("co_emp1_name", e.target.value)} placeholder="School Board" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Job Title</label>
                                <input type="text" value={fields.co_emp1_title || ""} onChange={(e) => handleFieldChange("co_emp1_title", e.target.value)} placeholder="Teacher" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Gross Annual Income</label>
                                <input type="number" value={fields.co_emp1_income || ""} onChange={(e) => handleFieldChange("co_emp1_income", e.target.value)} placeholder="85000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Time (Yrs)</label>
                                <input type="number" value={fields.co_emp1_yrs || ""} onChange={(e) => handleFieldChange("co_emp1_yrs", e.target.value)} placeholder="3" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Months</label>
                                <input type="number" value={fields.co_emp1_mos || ""} onChange={(e) => handleFieldChange("co_emp1_mos", e.target.value)} placeholder="4" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Status</label>
                                <select value={fields.co_emp1_status || ""} onChange={(e) => handleFieldChange("co_emp1_status", e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                                  <option value="">Select</option>
                                  <option value="Full Time">Full Time</option>
                                  <option value="Part Time">Part Time</option>
                                  <option value="Contract">Contract</option>
                                  <option value="Seasonal">Seasonal</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Secondary Job (Optional) */}
                          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                            <span className="text-[10px] text-teal-500 uppercase font-extrabold tracking-wider block">Secondary Employer (If applicable)</span>
                            <div>
                              <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Employer Name</label>
                              <input type="text" value={fields.co_emp2_name || ""} onChange={(e) => handleFieldChange("co_emp2_name", e.target.value)} placeholder="Second Job Ltd." className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Job Title</label>
                                <input type="text" value={fields.co_emp2_title || ""} onChange={(e) => handleFieldChange("co_emp2_title", e.target.value)} placeholder="Associate" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Gross Annual Income</label>
                                <input type="number" value={fields.co_emp2_income || ""} onChange={(e) => handleFieldChange("co_emp2_income", e.target.value)} placeholder="25000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Time (Yrs)</label>
                                <input type="number" value={fields.co_emp2_yrs || ""} onChange={(e) => handleFieldChange("co_emp2_yrs", e.target.value)} placeholder="1" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Months</label>
                                <input type="number" value={fields.co_emp2_mos || ""} onChange={(e) => handleFieldChange("co_emp2_mos", e.target.value)} placeholder="2" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Status</label>
                                <select value={fields.co_emp2_status || ""} onChange={(e) => handleFieldChange("co_emp2_status", e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                                  <option value="">Select</option>
                                  <option value="Part Time">Part Time</option>
                                  <option value="Full Time">Full Time</option>
                                  <option value="Contract">Contract</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Previous Job (Required if under 3 years) */}
                          {fields.co_emp1_yrs && parseInt(fields.co_emp1_yrs, 10) < 3 && (
                            <div className="bg-[var(--color-surface-2)] border border-amber-500/20 p-4 rounded-xl space-y-3">
                              <span className="text-[10px] text-amber-500 uppercase font-extrabold tracking-wider block">Previous Employer (Required - Under 3 yrs on job)</span>
                              <div>
                                <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Employer Name</label>
                                <input type="text" value={fields.co_prev_emp_name || ""} onChange={(e) => handleFieldChange("co_prev_emp_name", e.target.value)} placeholder="Old School Corp" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Job Title</label>
                                  <input type="text" value={fields.co_prev_emp_title || ""} onChange={(e) => handleFieldChange("co_prev_emp_title", e.target.value)} placeholder="Specialist" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Gross Annual Income</label>
                                  <input type="number" value={fields.co_prev_emp_income || ""} onChange={(e) => handleFieldChange("co_prev_emp_income", e.target.value)} placeholder="75000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Time (Yrs)</label>
                                  <input type="number" value={fields.co_prev_emp_yrs || ""} onChange={(e) => handleFieldChange("co_prev_emp_yrs", e.target.value)} placeholder="2" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Months</label>
                                  <input type="number" value={fields.co_prev_emp_mos || ""} onChange={(e) => handleFieldChange("co_prev_emp_mos", e.target.value)} placeholder="0" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Co-Applicant Self-Employed block */}
                      {fields.co_inc_self === "1" && (
                        <div className="bg-[var(--color-surface-2)] border border-[var(--color-accent)]/20 p-4 rounded-xl space-y-3">
                          <span className="text-[10px] text-[var(--color-accent)] uppercase font-extrabold tracking-wider block">Co-Applicant Self-Employment</span>
                          <div>
                            <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Business Name</label>
                            <input type="text" value={fields.co_self_name || ""} onChange={(e) => handleFieldChange("co_self_name", e.target.value)} placeholder="Spouse Biz Inc." className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Annual Net Income</label>
                            <input type="number" value={fields.co_self_income || ""} onChange={(e) => handleFieldChange("co_self_income", e.target.value)} placeholder="65000" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. OTHER INCOME */}
                {activeTab === "otherIncome" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="tab-other-income-form">
                    {/* Applicant Other Income */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-primary)]/20">Applicant Other Income</span>
                      
                      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase block">Source 1</span>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Income Type / Description</label>
                          <input type="text" value={fields.app_other0_specify || ""} onChange={(e) => handleFieldChange("app_other0_specify", e.target.value)} placeholder="e.g. Pension, Rental, Child Support" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Amount ($)</label>
                            <input type="number" value={fields.app_other0_amount || ""} onChange={(e) => handleFieldChange("app_other0_amount", e.target.value)} placeholder="500" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Frequency</label>
                            <select value={fields.app_other0_freq || ""} onChange={(e) => handleFieldChange("app_other0_freq", e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                              <option value="Monthly">Monthly</option>
                              <option value="Annually">Annually</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Co-Applicant Other Income */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-surface-3)] text-[var(--color-text-muted)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-border)]">Co-Applicant Other Income</span>
                      
                      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase block">Source 1</span>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Income Type / Description</label>
                          <input type="text" value={fields.co_other0_specify || ""} onChange={(e) => handleFieldChange("co_other0_specify", e.target.value)} placeholder="e.g. Rental Income" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Amount ($)</label>
                            <input type="number" value={fields.co_other0_amount || ""} onChange={(e) => handleFieldChange("co_other0_amount", e.target.value)} placeholder="600" className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Frequency</label>
                            <select value={fields.co_other0_freq || ""} onChange={(e) => handleFieldChange("co_other0_freq", e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                              <option value="Monthly">Monthly</option>
                              <option value="Annually">Annually</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. PROPERTY DETAILS */}
                {activeTab === "property" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="tab-property-form">
                    {/* Characteristics */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-accent)]/20">Property Details</span>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Property Type</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Detached", "Semi-Detached", "Townhouse", "Condo", "Other"].map(p => (
                            <button key={p} type="button" onClick={() => handlePillSelect("prop_type", p)} className={`px-3 py-1 rounded text-[11px] border cursor-pointer transition-all ${fields.prop_type === p ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{p}</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Tenure Type</label>
                          <select value={fields.prop_tenure || ""} onChange={(e) => handleFieldChange("prop_tenure", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30">
                            <option value="Freehold">Freehold</option>
                            <option value="Leasehold">Leasehold</option>
                            <option value="Condominium">Condominium</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Property Age (Yrs)</label>
                          <input type="number" value={fields.prop_age || ""} onChange={(e) => handleFieldChange("prop_age", e.target.value)} placeholder="10" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Lot Size</label>
                          <input type="text" value={fields.prop_lot || ""} onChange={(e) => handleFieldChange("prop_lot", e.target.value)} placeholder="50 x 120" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Building Area (SqFt)</label>
                          <input type="number" value={fields.prop_area || ""} onChange={(e) => handleFieldChange("prop_area", e.target.value)} placeholder="2200" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Garage</label>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={fields.prop_garage_type || ""} onChange={(e) => handleFieldChange("prop_garage_type", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30">
                            <option value="Attached">Attached</option>
                            <option value="Detached">Detached</option>
                            <option value="None">None</option>
                          </select>
                          <select value={fields.prop_garage_size || ""} onChange={(e) => handleFieldChange("prop_garage_size", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30">
                            <option value="Single">Single</option>
                            <option value="Double">Double</option>
                            <option value="Triple">Triple</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Financials / Utilities */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-accent)]/20">Property Financials</span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Estimated Value *</label>
                          <input type="number" value={fields.prop_value || ""} onChange={(e) => handleFieldChange("prop_value", e.target.value)} placeholder="650000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Original Price</label>
                          <input type="number" value={fields.prop_orig_price || ""} onChange={(e) => handleFieldChange("prop_orig_price", e.target.value)} placeholder="450000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Purchase Date</label>
                          <input type="text" value={fields.prop_purchase_date || ""} onChange={(e) => handleFieldChange("prop_purchase_date", e.target.value)} placeholder="MM/DD/YYYY" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Yearly Property Tax</label>
                          <input type="number" value={fields.prop_tax || ""} onChange={(e) => handleFieldChange("prop_tax", e.target.value)} placeholder="4100" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Condo Fees (Monthly)</label>
                          <input type="number" value={fields.prop_condo_fees || ""} onChange={(e) => handleFieldChange("prop_condo_fees", e.target.value)} placeholder="350" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Heating (Monthly)</label>
                          <input type="number" value={fields.prop_heat || ""} onChange={(e) => handleFieldChange("prop_heat", e.target.value)} placeholder="150" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Water Source</label>
                          <select value={fields.prop_water || ""} onChange={(e) => handleFieldChange("prop_water", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30">
                            <option value="Municipal">Municipal</option>
                            <option value="Well">Well</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Sewage</label>
                          <select value={fields.prop_sewage || ""} onChange={(e) => handleFieldChange("prop_sewage", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30">
                            <option value="Municipal">Municipal</option>
                            <option value="Septic">Septic</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-faint)] mb-1">Heat Fuel</label>
                          <select value={fields.prop_heat_source || ""} onChange={(e) => handleFieldChange("prop_heat_source", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded p-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30">
                            <option value="Forced Air Gas">FA Gas</option>
                            <option value="Electric Baseboard">Elec Base</option>
                            <option value="Forced Air Electric">FA Elec</option>
                            <option value="Forced Air Oil">FA Oil</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. MORTGAGE DETAILS */}
                {activeTab === "mortgage" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="tab-mortgage-form">
                    {/* First Mortgage */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-primary)]/20">First Mortgage</span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Requested Amount / Bal *</label>
                          <input type="number" value={fields.mtg1_balance || ""} onChange={(e) => handleFieldChange("mtg1_balance", e.target.value)} placeholder="450000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Monthly Payment</label>
                          <input type="number" value={fields.mtg1_payment || ""} onChange={(e) => handleFieldChange("mtg1_payment", e.target.value)} placeholder="2800" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Interest Rate (%)</label>
                          <input type="number" step="0.01" value={fields.mtg1_rate || ""} onChange={(e) => handleFieldChange("mtg1_rate", e.target.value)} placeholder="4.99" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Rate Type</label>
                          <div className="flex gap-2">
                            {["Fixed", "Variable"].map(r => (
                              <button key={r} type="button" onClick={() => handlePillSelect("mtg1_rate_type", r)} className={`flex-1 py-1.5 rounded text-xs border cursor-pointer transition-all ${fields.mtg1_rate_type === r ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)] font-bold" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}>{r}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Maturity Date</label>
                          <input type="text" value={fields.mtg1_maturity || ""} onChange={(e) => handleFieldChange("mtg1_maturity", e.target.value)} placeholder="MM/DD/YYYY" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Lender / Holder</label>
                          <input type="text" value={fields.mtg1_holder || ""} onChange={(e) => handleFieldChange("mtg1_holder", e.target.value)} placeholder="TD Bank" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Payment Frequency</label>
                          <select value={fields.mtg1_freq || ""} onChange={(e) => handleFieldChange("mtg1_freq", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-weekly">Bi-weekly</option>
                            <option value="Monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Term Type</label>
                          <select value={fields.mtg1_term_type || ""} onChange={(e) => handleFieldChange("mtg1_term_type", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30">
                            <option value="Closed">Closed</option>
                            <option value="Open">Open</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Second Mortgage */}
                    <div className="space-y-4">
                      <span className="text-[10px] bg-[var(--color-surface-3)] text-[var(--color-text-muted)] px-2.5 py-1 rounded font-black uppercase tracking-widest block w-max border border-[var(--color-border)]">Second Mortgage</span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Balance Owing</label>
                          <input type="number" value={fields.mtg2_balance || ""} onChange={(e) => handleFieldChange("mtg2_balance", e.target.value)} placeholder="0" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Monthly Payment</label>
                          <input type="number" value={fields.mtg2_payment || ""} onChange={(e) => handleFieldChange("mtg2_payment", e.target.value)} placeholder="0" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Second Mortgage Holder</label>
                        <input type="text" value={fields.mtg2_holder || ""} onChange={(e) => handleFieldChange("mtg2_holder", e.target.value)} placeholder="e.g. Private Lender" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30" />
                      </div>

                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Purpose of Second Mortgage</label>
                        <textarea rows={3} value={fields.mtg2_purpose || ""} onChange={(e) => handleFieldChange("mtg2_purpose", e.target.value)} placeholder="Debt consolidation, renovation, etc." className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-mono" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. REVIEW & SUBMIT */}
                {activeTab === "submit" && (
                  <div className="space-y-6" id="tab-review-submit-box">
                    <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] p-6 rounded-2xl">
                      <h3 className="text-sm font-extrabold text-[var(--color-text)] uppercase tracking-wider mb-3">CRM Intake &amp; Ownership Assignment</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1.5">Assign Broker / Agent Owner</label>
                          <select 
                            value={assignedAgent} 
                            disabled={!isAdmin}
                            onChange={(e) => setAssignedAgent(e.target.value)}
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 disabled:opacity-75 disabled:cursor-not-allowed font-semibold"
                          >
                            {agentNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                          {!isAdmin && (
                            <span className="text-[9px] text-[var(--color-text-faint)] font-bold mt-1 block">
                              ℹ️ Files are auto-assigned to you (Admins can reassign).
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1.5">Intake File Status</label>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => setIntakeStatus("working")}
                              className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${intakeStatus === "working" ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}
                            >
                              📁 Active Underwriting File
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setIntakeStatus("lead")}
                              className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${intakeStatus === "lead" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"}`}
                            >
                              ⭐ Lead Generation File
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 p-5 rounded-2xl">
                      <h4 className="text-xs font-extrabold text-[var(--color-primary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Info className="w-4 h-4" /> Privacy &amp; Consent Statement
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                        By submitting this application, you confirm that all information provided is accurate and complete. Your personal information will be handled securely and in accordance with applicable Canadian privacy legislation (PIPEDA). All credit checks are authorized under active client engagement disclosures.
                      </p>
                      <div className="text-[9px] text-[var(--color-text-faint)] mt-3 font-mono">
                        GBK Financial • Licence #11921 • Barrie, Ontario
                      </div>
                    </div>

                    {/* Final Action Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleCommissionFile}
                        className="px-8 py-3 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] text-[var(--color-text-inverse)] font-extrabold text-xs uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl transition-all shadow-md cursor-pointer"
                        id="commission-new-crm-file-btn"
                      >
                        ✦ Commission CRM Mortgage File
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer navigation */}
              <div className="px-6 py-4 bg-[var(--color-surface-1)] border-t border-[var(--color-border)] flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === "ai") {
                      setWorkflowStep("upload");
                    } else {
                      onClose();
                    }
                  }}
                  className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  {mode === "ai" ? "← Back to AI Upload" : "Cancel"}
                </button>

                <div className="flex items-center gap-2">
                  {(["personal", "address", "employment", "otherIncome", "property", "mortgage", "submit"] as TabType[]).indexOf(activeTab) > 0 && (
                    <button
                      onClick={() => {
                        const tabs = ["personal", "address", "employment", "otherIncome", "property", "mortgage", "submit"] as TabType[];
                        const currentIdx = tabs.indexOf(activeTab);
                        setActiveTab(tabs[currentIdx - 1]);
                      }}
                      className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Previous Step
                    </button>
                  )}

                  {(["personal", "address", "employment", "otherIncome", "property", "mortgage", "submit"] as TabType[]).indexOf(activeTab) < 6 ? (
                    <button
                      onClick={() => {
                        const tabs = ["personal", "address", "employment", "otherIncome", "property", "mortgage", "submit"] as TabType[];
                        const currentIdx = tabs.indexOf(activeTab);
                        setActiveTab(tabs[currentIdx + 1]);
                      }}
                      className="px-5 py-2 bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-text-inverse)] text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleCommissionFile}
                      className="px-6 py-2 bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-text-inverse)] text-xs font-black rounded-lg transition-all cursor-pointer"
                    >
                      Commission File
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
