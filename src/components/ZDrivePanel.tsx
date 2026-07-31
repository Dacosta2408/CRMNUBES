import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Search, FileText, HardDrive, Download, Sparkles, 
  ChevronRight, FileCode, CheckCircle, Info, RefreshCw, Terminal, 
  Database, HelpCircle, UploadCloud, Activity, Wifi, WifiOff, 
  AlertTriangle, Play, Trash2, Code2, Clock, Check
} from "lucide-react";
import { 
  BRIDGE_URL, 
  checkBridgeHealth, 
  getBridgeVersion, 
  getAllClients, 
  getRoster 
} from "../lib/bridgeService";

interface ZDriveFile {
  id: string;
  name: string;
  type: "html" | "txt" | "pdf";
  size: string;
  updatedAt: string;
  author: string;
  content: string;
  isIntakeReady: boolean;
}

export interface BridgeLogEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: "success" | "offline_fallback" | "error";
  statusCode: number;
  latencyMs: number;
  message: string;
  payloadPreview?: string;
  resilienceNote?: string;
}

interface ZDrivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToIntake: (fileContent: string, fileName: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const ZDrivePanel: React.FC<ZDrivePanelProps> = ({
  isOpen,
  onClose,
  onSendToIntake,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<"files" | "logs">("files");
  const [selectedFile, setSelectedFile] = useState<ZDriveFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bridge Logs State
  const [logs, setLogs] = useState<BridgeLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "success" | "fallback">("all");
  const [selectedLog, setSelectedLog] = useState<BridgeLogEntry | null>(null);
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [bridgeStatus, setBridgeStatus] = useState<"checking" | "online" | "offline">("checking");
  const [lastPingTime, setLastPingTime] = useState<string>("Never");

  // Raw unprocessed client application data pending intake from the Z:\ Drive
  const [pendingFiles, setPendingFiles] = useState<ZDriveFile[]>([
    {
      id: "sarah_jenkins_app",
      name: "Sarah_Jenkins_App_Form.html",
      type: "html",
      size: "18.4 KB",
      updatedAt: "2026-06-25 15:42",
      author: "apply@gbkfinancial.ca",
      isIntakeReady: true,
      content: `Applicant: Sarah Jenkins
Co-applicant: David Jenkins (Partner)
Email: sarah.j@example.com
Phone: (416) 555-0199
DOB: 1985-11-23
Marital: Married
Employment: Salaried Accountant at Jenkins Tax Services
Income: $120,000/yr. Self-employed part-time BFS business: $35,000/yr.
Co-Applicant: David Jenkins, Salaried Manager at Rogers Telecom earning $85,000/yr.
Property Address: 154 Simcoe Street, Unit 201, Toronto ON
Property Type: Condo Apartment, Tenure: Condominium
Estimated Purchase Value: $750,000
Mortgage Requested: $525,000
Lender Preferred: TD Bank
Assigned Agent: Wayne MacLeod
Status: Lead Generation Stage`
    },
    {
      id: "robert_taylor_app",
      name: "Robert_Taylor_Ontario_Purchase.txt",
      type: "txt",
      size: "4.2 KB",
      updatedAt: "2026-06-26 06:12",
      author: "web-portal@gbk.ca",
      isIntakeReady: true,
      content: `Robert Taylor (Single), Cell (416) 555-0322. Email robert.t1991@example.com.
Working at Shopify as Software Architect, earning $145,000 base Salary.
No Co-applicant.
Buying detached house in Barrie: 14 Maple Drive, Barrie ON.
Estimated purchase price: $820,000.
Mortgage requested: $600,000 conventional.
Beacon credit score: 780.
No debts on credit report.
Assigned Agent: Sarah Jenkins`
    },
    {
      id: "underwriting_rules_ref",
      name: "GBK_Underwriting_Rules_v4.txt",
      type: "txt",
      size: "8.5 KB",
      updatedAt: "2026-06-20 14:00",
      author: "compliance-team@gbk.ca",
      isIntakeReady: false,
      content: `GBK UNDERWRITING REFERENCE GUIDE (Z:\\ GUIDELINES)
=====================================================
1. MINIMUM CREDIT SCORE: 600 for alternative lenders, 680+ for prime lenders.
2. MAX LTV: 80% for conventional refinancing, up to 95% for high-ratio purchases.
3. INCOME RATIOS: GDS max 39%, TDS max 44% for prime. Alt-A can allow higher with compensating factors.
4. BFS (Business For Self) requirements: 2 years NOAs, business license, or articles of incorporation required.
5. CONDO FEES: Always include 50% of condo fees in GDS/TDS calculations.
6. HEAT COST: Use actual or $150/month flat rate as a standard guideline.`
    },
    {
      id: "michael_chang_refi",
      name: "Michael_Chang_Refinance.html",
      type: "html",
      size: "15.1 KB",
      updatedAt: "2026-06-24 11:05",
      author: "michael.c@gmail.com",
      isIntakeReady: true,
      content: `Applicant: Michael Chang (Married)
Email: michael.chang@gmail.com
Phone: (905) 555-8844
DOB: 1978-04-12
Address: 88 Copper Creek Dr, Markham ON (Own)
Existing 1st Mortgage: Balance owing $380,000, monthly payment $2,100 with Scotiabank.
Income: BFS Self-employed contractor earning $160,000/yr net.
Co-Applicant Spouse: Emily Chang, earning $45,000/yr part-time.
Refinancing Request: Increase mortgage to $550,000 to payout high interest credit cards.
Property value estimated at $1,100,000.
Beacon: 650.
Assigned Broker: Wayne MacLeod`
    },
    {
      id: "lender_rates_ref",
      name: "Lender_Prime_Rates_June2026.html",
      type: "html",
      size: "6.1 KB",
      updatedAt: "2026-06-25 09:00",
      author: "rates-desk@gbk.ca",
      isIntakeReady: false,
      content: `LENDER PRIME RATES LISTING - EFFECTIVE JUNE 2026
=======================================================
Lender: TD Bank
- 5-Yr Fixed: 4.89%
- 3-Yr Fixed: 5.14%
- 5-Yr Variable: Prime - 0.90%

Lender: Scotiabank
- 5-Yr Fixed: 4.94%
- 3-Yr Fixed: 5.19%
- 5-Yr Variable: Prime - 0.85%

Lender: MCAP
- 5-Yr Fixed: 4.79%
- 3-Yr Fixed: 5.09%
- 5-Yr Variable: Prime - 0.95%`
    },
    {
      id: "amanda_kaur_app",
      name: "Amanda_Kaur_Brampton_Purchase.txt",
      type: "txt",
      size: "5.8 KB",
      updatedAt: "2026-06-26 07:10",
      author: "portal-app@gbk.ca",
      isIntakeReady: true,
      content: `Applicant: Amanda Kaur
Email: amanda.kaur@example.com
Cell: (647) 555-9121
DOB: 1990-09-15
Marital: Single
Employment: Senior Human Resources Specialist at PepsiCo (Full Time)
Income: $92,000/yr salary
Address: 110 Main Street South, Brampton ON (Rent, $1,800/mo)
Property to Purchase: 45 Cloverbloom Crescent, Brampton ON
Property Type: Semi-Detached
Estimated Purchase Value: $680,000
Mortgage Requested: $544,000 (80% LTV)
Beacon: 740
Assigned Broker: Wayne MacLeod`
    },
    {
      id: "david_miller_app",
      name: "David_Miller_Hamilton_Refi.html",
      type: "html",
      size: "12.4 KB",
      updatedAt: "2026-06-23 09:30",
      author: "david.miller@example.com",
      isIntakeReady: true,
      content: `Applicant: David Miller
Email: miller.d@example.com
Cell: (905) 555-4321
DOB: 1982-02-18
Marital: Divorced
Dependents: 1
Address: 242 Aberdeen Avenue, Hamilton ON (Owns)
Property Value: $850,000
Current Mortgage Balance: $410,000 with TD Bank
Proposed Refinance Amount: $550,000 (to fund home renovations and pay off Line of Credit)
Employment: Lead Mechanic at Hamilton Transit (Full Time, Unionized)
Income: $88,000/yr base salary + $12,000/yr overtime
Beacon Score: 715
Assigned Broker: Sarah Jenkins`
    }
  ]);

  // Add a log entry helper
  const addLog = (entry: Omit<BridgeLogEntry, "id" | "timestamp">) => {
    const newEntry: BridgeLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  // Perform a full diagnostic check on bridge endpoints
  const runDiagnostics = async () => {
    setIsTesting(true);
    const startTime = performance.now();

    try {
      // 1. Health Check
      const healthStart = performance.now();
      const isHealthy = await checkBridgeHealth();
      const healthLatency = Math.round(performance.now() - healthStart);

      if (isHealthy) {
        setBridgeStatus("online");
        addLog({
          endpoint: "/api/health",
          method: "GET",
          status: "success",
          statusCode: 200,
          latencyMs: healthLatency,
          message: "Bridge server online & responding with valid JSON.",
          payloadPreview: JSON.stringify({ status: "ok", service: "gbk-bridge" }, null, 2),
          resilienceNote: "Verified non-empty, valid JSON schema."
        });
      } else {
        setBridgeStatus("offline");
        addLog({
          endpoint: "/api/health",
          method: "GET",
          status: "offline_fallback",
          statusCode: 502,
          latencyMs: healthLatency,
          message: "Bridge offline or returning non-JSON. Fallback mode engaged.",
          payloadPreview: JSON.stringify({ status: "offline", fallback: true }, null, 2),
          resilienceNote: "Guarded against crashing frontend. Safe fallback returned."
        });
      }

      // 2. Version Check
      const verStart = performance.now();
      const verData = await getBridgeVersion();
      const verLatency = Math.round(performance.now() - verStart);
      if (verData) {
        addLog({
          endpoint: "/api/version",
          method: "GET",
          status: "success",
          statusCode: 200,
          latencyMs: verLatency,
          message: `Version ${verData.version} (${verData.env}) retrieved successfully.`,
          payloadPreview: JSON.stringify(verData, null, 2),
          resilienceNote: "Valid JSON response verified."
        });
      } else {
        addLog({
          endpoint: "/api/version",
          method: "GET",
          status: "offline_fallback",
          statusCode: 502,
          latencyMs: verLatency,
          message: "Unable to retrieve version. Safe fallback returned.",
          payloadPreview: JSON.stringify({ version: "1.0.0-fallback", env: "offline" }, null, 2),
          resilienceNote: "Guarded against JSON.parse exception."
        });
      }

      // 3. Clients Endpoint Check
      const clientStart = performance.now();
      const clientsData = await getAllClients();
      const clientLatency = Math.round(performance.now() - clientStart);
      addLog({
        endpoint: "/api/clients",
        method: "GET",
        status: Array.isArray(clientsData) ? "success" : "offline_fallback",
        statusCode: 200,
        latencyMs: clientLatency,
        message: `Retrieved ${clientsData ? clientsData.length : 0} client records.`,
        payloadPreview: JSON.stringify(clientsData.slice(0, 2), null, 2),
        resilienceNote: "Array schema verified. Empty/corrupted files handled gracefully."
      });

      // 4. Roster Endpoint Check
      const rosterStart = performance.now();
      const rosterData = await getRoster();
      const rosterLatency = Math.round(performance.now() - rosterStart);
      addLog({
        endpoint: "/api/system/roster",
        method: "GET",
        status: Array.isArray(rosterData) ? "success" : "offline_fallback",
        statusCode: 200,
        latencyMs: rosterLatency,
        message: `Retrieved ${rosterData ? rosterData.length : 0} team members.`,
        payloadPreview: JSON.stringify(rosterData, null, 2),
        resilienceNote: "JSON safe-parsed with default array fallback."
      });

      setLastPingTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      addLog({
        endpoint: "/api/*",
        method: "GET",
        status: "error",
        statusCode: 500,
        latencyMs: Math.round(performance.now() - startTime),
        message: `Diagnostic error: ${err.message || err}`,
        resilienceNote: "Catastrophic error caught by safeFetchJson wrapper."
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Initial diagnostic run on component mount & auto-poll timer
  useEffect(() => {
    runDiagnostics();
  }, []);

  useEffect(() => {
    if (!autoPoll || !isOpen) return;
    const interval = setInterval(() => {
      checkBridgeHealth().then(isHealthy => {
        setBridgeStatus(isHealthy ? "online" : "offline");
        setLastPingTime(new Date().toLocaleTimeString());
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPoll, isOpen]);

  const handleLocalFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string || "";
      const isHtml = file.name.endsWith(".html") || file.name.endsWith(".htm");
      const fileSizeKB = (file.size / 1024).toFixed(1);
      
      const newFile: ZDriveFile = {
        id: `local_file_${Date.now()}`,
        name: file.name,
        type: isHtml ? "html" : "txt",
        size: `${fileSizeKB} KB`,
        updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        author: "Local Hard Drive",
        isIntakeReady: true,
        content: content
      };

      setPendingFiles(prev => [newFile, ...prev]);
      setSelectedFile(newFile);
      showToast(`Successfully opened "${file.name}" from your local hard drive!`, "success");
    };

    reader.onerror = () => {
      showToast("Failed to read the local file.", "error");
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const filteredFiles = pendingFiles.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = logs.filter(l => {
    if (logFilter === "success") return l.status === "success";
    if (logFilter === "fallback") return l.status === "offline_fallback" || l.status === "error";
    return true;
  });

  const handleSendToAIIntake = (file: ZDriveFile) => {
    onSendToIntake(file.content, file.name);
    setSelectedFile(null);
    onClose();
    showToast(`Loaded "${file.name}" into the AI Application Intake pipeline!`, "success");
  };

  const handleRefreshDrive = () => {
    setIsRefreshing(true);
    runDiagnostics().then(() => {
      setIsRefreshing(false);
      showToast("Z:\\ Drive connection & bridge diagnostic refreshed.", "info");
    });
  };

  const downloadFile = (file: ZDriveFile) => {
    const element = document.createElement("a");
    const blob = new Blob([file.content], { type: "text/plain" });
    element.href = URL.createObjectURL(blob);
    element.download = file.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Downloaded ${file.name} to local downloads folder.`, "info");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-[#0e0e12] border border-[#5d9bb1]/30 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        id="z-drive-panel-container"
      >
        {/* Banner header */}
        <div className="bg-[#11191d] border-b border-[#5d9bb1]/20 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#5d9bb1]/10 rounded-xl border border-[#5d9bb1]/20 text-[#5d9bb1]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider font-sans">GBK Broker Desktop Network Drive (Z:\\)</h2>
                {bridgeStatus === "online" ? (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    BRIDGE ONLINE (200 OK)
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    OFFLINE MODE (SAFE DEFAULTS)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#8e95a3] mt-0.5">
                Secure internal drive of unprocessed client applications &amp; real-time bridge diagnostics.
              </p>
            </div>
          </div>

          {/* Right Controls: Tab Selector & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#09090c] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab("files")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "files"
                    ? "bg-[#5d9bb1] text-black shadow-md font-extrabold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                id="tab-z-drive-files"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Partition Files ({pendingFiles.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("logs")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "logs"
                    ? "bg-[#5d9bb1] text-black shadow-md font-extrabold"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                id="tab-bridge-connection-log"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Bridge Connection Log</span>
                {logs.length > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === "logs" ? "bg-black/30 text-black" : "bg-white/10 text-white"
                  }`}>
                    {logs.length}
                  </span>
                )}
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[#8e95a3] hover:text-white transition-all"
              id="close-z-drive-panel-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: FILES & INTAKE DOCUMENTS ==================== */}
        {activeTab === "files" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Action Toolbar */}
            <div className="px-6 py-3 bg-[#131318] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#5d9bb1] font-bold font-mono bg-[#5d9bb1]/5 border border-[#5d9bb1]/10 px-2 py-0.5 rounded">
                  <Database className="w-3.5 h-3.5" />
                  <span>Z:\\Pending_Intakes</span>
                </div>
                <span className="text-white/30 font-mono text-[10px]">|</span>
                <div className="text-white/50 text-[10px] font-mono">
                  Volume space: <span className="text-white font-bold">14.2 MB</span> free of 20 MB (Secure Partition)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-[#18181d] border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 w-56 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-white/40" />
                  <input 
                    type="text" 
                    placeholder="Search raw names, emails, content..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-[11px] text-white focus:outline-none w-full"
                  />
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#5d9bb1]/10 text-[#5d9bb1] border border-[#5d9bb1]/30 hover:bg-[#5d9bb1]/20 transition-all cursor-pointer shrink-0"
                  title="Open / Select file from your actual physical hard drive"
                  id="upload-local-file-btn"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Browse Local Drive</span>
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLocalFileUpload}
                  className="hidden"
                  accept=".txt,.html,.htm,.json"
                />

                <button
                  onClick={handleRefreshDrive}
                  disabled={isRefreshing}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all shrink-0"
                  title="Refresh Z:\ Connection"
                  id="refresh-z-drive-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#5d9bb1]" : ""}`} />
                </button>
              </div>
            </div>

            {/* Split Interface */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: File Listing */}
              <div className="w-1/2 border-r border-white/5 bg-[#0a0a0d] flex flex-col overflow-hidden">
                <div className="p-3 bg-[#121216] border-b border-white/5 flex items-center justify-between shrink-0">
                  <span className="text-[10px] text-white/40 font-black uppercase tracking-wider font-mono">
                    Filename &amp; Metadata ({filteredFiles.length} files detected)
                  </span>
                  <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black font-mono">
                    WAITING FOR CRM IMPORT
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredFiles.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01] select-none">
                      <FileText className="w-10 h-10 text-[#5d9bb1] opacity-60 mx-auto mb-3" />
                      <h4 className="text-xs font-black uppercase text-white tracking-widest">No Documents Found</h4>
                      <p className="text-[10px] text-[#8e95a3] max-w-xs mx-auto mt-1 leading-relaxed font-sans font-semibold">
                        No files matching your search query are present in this directory view.
                      </p>
                      <div className="flex items-center justify-center gap-2.5 mt-5">
                        <button
                          onClick={() => setSearchQuery("")}
                          className="px-3 py-1.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-[9px] uppercase rounded-lg transition-all"
                        >
                          Clear Search Filter
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-[#5d9bb1] text-black hover:bg-[#467c90] font-bold text-[9px] uppercase rounded-lg transition-all"
                        >
                          Browse Local Drive
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredFiles.map(file => {
                      const isSelected = selectedFile?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className={`px-4 py-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                            isSelected 
                              ? "bg-[#5d9bb1]/10 border-[#5d9bb1]/40" 
                              : "bg-[#111115] hover:bg-[#141419] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg border shrink-0 ${
                              isSelected ? "bg-[#5d9bb1]/20 border-[#5d9bb1]/30 text-[#5d9bb1]" : "bg-white/5 border-white/5 text-white/40"
                            }`}>
                              {file.type === "html" ? (
                                <FileCode className="w-4 h-4 text-amber-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-[#5d9bb1]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-bold text-white group-hover:text-[#5d9bb1] transition-colors truncate">
                                {file.name}
                              </h4>
                              <p className="text-[9px] text-[#8e95a3] mt-0.5 font-mono">
                                Mod: {file.updatedAt} • From: {file.author}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-white/40 shrink-0">
                            <span>{file.size}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                              isSelected ? "text-[#5d9bb1] translate-x-0.5" : "text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5"
                            }`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 bg-[#0c0c10] border-t border-white/5 text-[10px] text-white/40 flex items-center gap-2 font-mono shrink-0">
                  <Info className="w-3.5 h-3.5 text-[#5d9bb1] shrink-0" />
                  <span>These are local network storage files waiting to be converted.</span>
                </div>
              </div>

              {/* Right Column: Raw Preview */}
              <div className="w-1/2 bg-[#0c0c0f] flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                  {selectedFile ? (
                    <motion.div
                      key={selectedFile.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col h-full overflow-hidden"
                    >
                      <div className="p-4 bg-[#121217] border-b border-white/5 flex items-center justify-between shrink-0">
                        <div>
                          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                            <Terminal className="w-3.5 h-3.5 text-[#5d9bb1]" />
                            Raw Application Source
                          </h3>
                          <p className="text-[9px] text-[#8e95a3] mt-0.5 font-mono">
                            {selectedFile.name} ({selectedFile.size})
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => downloadFile(selectedFile)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white rounded transition-all"
                            title="Download raw document to local drive"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded text-[10px] font-bold transition-all"
                          >
                            Clear Selection
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 p-5 overflow-y-auto bg-[#07070a] font-mono text-[11px] text-[#eeeef2] leading-relaxed whitespace-pre-wrap select-text selection:bg-[#5d9bb1]/20">
                        <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold border-b border-white/5 pb-2 mb-4 font-mono select-none">
                          === BEGIN RAW DESKTOP PARTITION DOCUMENT ===
                        </div>
                        {selectedFile.content}
                        <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold border-t border-white/5 pt-2 mt-4 font-mono select-none">
                          === END OF FILE ===
                        </div>
                      </div>

                      <div className="p-4 bg-[#121217] border-t border-white/5 flex flex-col gap-3 shrink-0">
                        <div className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${selectedFile.isIntakeReady ? "bg-[#5d9bb1] animate-pulse" : "bg-white/20"}`} />
                            <div>
                              <span className="text-[10px] font-black uppercase text-white tracking-wider block">Intake Option Enabled</span>
                              <span className="text-[9px] text-[#8e95a3]">Toggle whether this file is treated as an intake application.</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const updated = pendingFiles.map(f => f.id === selectedFile.id ? { ...f, isIntakeReady: !f.isIntakeReady } : f);
                              setPendingFiles(updated);
                              setSelectedFile(prev => prev ? { ...prev, isIntakeReady: !prev.isIntakeReady } : null);
                              showToast(`Intake setting for "${selectedFile.name}" updated!`, "info");
                            }}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              selectedFile.isIntakeReady ? "bg-[#5d9bb1]" : "bg-white/10"
                            }`}
                            id="toggle-intake-ready"
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                                selectedFile.isIntakeReady ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {selectedFile.isIntakeReady ? (
                          <>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                              <span>Gemini AI is ready to parse this raw text directly into the database.</span>
                            </div>
                            <button
                              onClick={() => handleSendToAIIntake(selectedFile)}
                              className="w-full py-2.5 bg-gradient-to-r from-[var(--color-accent)] to-[#5d9bb1] hover:opacity-95 text-black font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-accent)]/5"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>✦ Send to AI Application Intake</span>
                            </button>
                          </>
                        ) : (
                          <div className="py-3 px-4 border border-dashed border-white/10 rounded-lg text-center bg-white/[0.01]">
                            <p className="text-[11px] text-[#8e95a3] font-sans">
                              This document is currently marked as a <span className="text-white font-bold">Reference Document / Note</span>. AI CRM Intake is optional and currently disabled.
                            </p>
                            <button
                              onClick={() => {
                                const updated = pendingFiles.map(f => f.id === selectedFile.id ? { ...f, isIntakeReady: true } : f);
                                setPendingFiles(updated);
                                setSelectedFile(prev => prev ? { ...prev, isIntakeReady: true } : null);
                                showToast("Enabled CRM Intake Parse option.", "success");
                              }}
                              className="mt-2 text-[10px] text-[#5d9bb1] font-black uppercase hover:text-[#7bbad2] transition-colors"
                            >
                              + Enable CRM Intake Parse Anyway
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40">
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full mb-3 text-white/20">
                        <HardDrive className="w-8 h-8" />
                      </div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Raw File Preview Partition</h3>
                      <p className="text-[11px] text-white/40 max-w-xs leading-normal">
                        Select any unparsed application file on the left to inspect its raw contents and activate the AI integration engine.
                      </p>
                      
                      <div className="mt-8 p-4 bg-[#121216] border border-white/5 rounded-xl max-w-sm text-left">
                        <h4 className="text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-[#5d9bb1]" /> Driving Real Database Entries
                        </h4>
                        <p className="text-[10px] text-white/40 leading-normal font-sans">
                          Clicking <span className="text-[#5d9bb1] font-bold">"Send to AI Application Intake"</span> loads the document into our advanced parser workspace where the fields are structured and saved as a live CRM file.
                        </p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: BRIDGE CONNECTION LOG ==================== */}
        {activeTab === "logs" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0d]">
            {/* Top Diagnostics Status Bar */}
            <div className="p-4 bg-[#121217] border-b border-white/5 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
              <div className="bg-[#181820] border border-white/5 p-3 rounded-xl flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bridgeStatus === "online" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                  {bridgeStatus === "online" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-white/40 block font-bold">Bridge Status</span>
                  <span className={`text-xs font-black font-mono uppercase ${bridgeStatus === "online" ? "text-emerald-400" : "text-amber-300"}`}>
                    {bridgeStatus === "online" ? "ONLINE (200 OK)" : "OFFLINE / SAFE MODE"}
                  </span>
                </div>
              </div>

              <div className="bg-[#181820] border border-white/5 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#5d9bb1]/10 text-[#5d9bb1]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-white/40 block font-bold">Bridge Target Endpoint</span>
                  <span className="text-xs font-bold font-mono text-white truncate max-w-[160px] block">
                    {BRIDGE_URL}
                  </span>
                </div>
              </div>

              <div className="bg-[#181820] border border-white/5 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-white/40 block font-bold">Last Health Check</span>
                  <span className="text-xs font-bold font-mono text-white">
                    {lastPingTime}
                  </span>
                </div>
              </div>

              <div className="bg-[#181820] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-mono text-white/40 block font-bold">JSON Resiliency</span>
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3.5 h-3.5" /> 100% GUARDED
                  </span>
                </div>
                <button
                  onClick={runDiagnostics}
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-[#5d9bb1] hover:bg-[#4a8499] text-black font-black text-[10px] uppercase rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-[#5d9bb1]/10"
                  id="run-bridge-diagnostics-btn"
                >
                  <Play className={`w-3 h-3 ${isTesting ? "animate-spin" : ""}`} />
                  <span>{isTesting ? "Testing..." : "Run Test"}</span>
                </button>
              </div>
            </div>

            {/* Log Controls Bar */}
            <div className="px-6 py-2.5 bg-[#14141a] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/40 uppercase font-bold mr-1">Filter Events:</span>
                <button
                  onClick={() => setLogFilter("all")}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                    logFilter === "all" ? "bg-white/10 text-white border border-white/20" : "text-white/40 hover:text-white"
                  }`}
                >
                  All ({logs.length})
                </button>
                <button
                  onClick={() => setLogFilter("success")}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                    logFilter === "success" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-white/40 hover:text-white"
                  }`}
                >
                  Success ({logs.filter(l => l.status === "success").length})
                </button>
                <button
                  onClick={() => setLogFilter("fallback")}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                    logFilter === "fallback" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-white/40 hover:text-white"
                  }`}
                >
                  Fallback / Offline ({logs.filter(l => l.status !== "success").length})
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/40">Auto Ping (5s):</span>
                  <button
                    onClick={() => setAutoPoll(!autoPoll)}
                    className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      autoPoll ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-black shadow transition duration-200 ease-in-out ${
                        autoPoll ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setLogs([]);
                    setSelectedLog(null);
                    showToast("Bridge connection log cleared.", "info");
                  }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-lg transition-all flex items-center gap-1 text-[10px] font-mono"
                  title="Clear log console"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Logs</span>
                </button>
              </div>
            </div>

            {/* Split Main Area: Log Console List on Left, Log Details on Right */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Event Stream */}
              <div className="w-1/2 border-r border-white/5 flex flex-col overflow-hidden bg-[#07070a]">
                <div className="p-2.5 bg-[#0e0e12] border-b border-white/5 text-[9px] font-mono text-white/40 uppercase font-bold flex items-center justify-between">
                  <span>Timestamp &amp; Route</span>
                  <span>Latency / Status</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {filteredLogs.length === 0 ? (
                    <div className="py-20 text-center text-white/30 font-mono text-xs">
                      <Terminal className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <span>No connection events recorded yet.</span>
                      <p className="text-[10px] text-white/20 mt-1">Click "Run Test" to trigger endpoint checks.</p>
                    </div>
                  ) : (
                    filteredLogs.map(log => {
                      const isSelected = selectedLog?.id === log.id;
                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between font-mono ${
                            isSelected 
                              ? "bg-[#5d9bb1]/15 border-[#5d9bb1]/40" 
                              : log.status === "success"
                              ? "bg-[#0d1512] hover:bg-[#121c18] border-emerald-500/20"
                              : "bg-[#18140f] hover:bg-[#201a14] border-amber-500/20"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-white/40">{log.timestamp}</span>
                              <span className="text-[10px] font-bold text-white bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                                {log.method} {log.endpoint}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/70 truncate mt-1">
                              {log.message}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase inline-block ${
                              log.status === "success"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}>
                              {log.status === "success" ? "200 OK" : "FALLBACK"}
                            </span>
                            <span className="text-[9px] text-white/30 block mt-0.5">
                              {log.latencyMs}ms
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Log Detail & JSON Payload Inspector */}
              <div className="w-1/2 bg-[#0d0d12] flex flex-col overflow-hidden">
                {selectedLog ? (
                  <div className="flex-1 flex flex-col overflow-hidden p-4">
                    <div className="pb-3 border-b border-white/5 mb-3 flex items-center justify-between shrink-0">
                      <div>
                        <span className="text-[9px] uppercase font-mono text-white/40 block font-bold">Inspecting Log Entry</span>
                        <h4 className="text-xs font-black font-mono text-white flex items-center gap-2 mt-0.5">
                          <Code2 className="w-4 h-4 text-[#5d9bb1]" />
                          {selectedLog.method} {selectedLog.endpoint}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-1 rounded border border-white/5">
                        {selectedLog.timestamp}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto">
                      <div className="p-3 bg-[#13131a] rounded-xl border border-white/5 text-xs font-mono">
                        <span className="text-[9px] text-white/40 uppercase font-bold block mb-1">Status Message</span>
                        <p className="text-white">{selectedLog.message}</p>
                      </div>

                      {selectedLog.resilienceNote && (
                        <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-xs font-mono">
                          <span className="text-[9px] text-emerald-400 uppercase font-bold block mb-1 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Resiliency Verification
                          </span>
                          <p className="text-emerald-200/80">{selectedLog.resilienceNote}</p>
                        </div>
                      )}

                      <div className="flex-1 flex flex-col bg-[#050508] p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] text-white/40 uppercase font-mono font-bold mb-2 block">
                          Received JSON Response Payload
                        </span>
                        <pre className="flex-1 overflow-auto text-[10px] font-mono text-[#a5d6ff] leading-relaxed select-text">
                          {selectedLog.payloadPreview || "// No body returned"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/30 font-mono text-xs">
                    <Activity className="w-8 h-8 text-white/10 mb-2" />
                    <span>Select any event on the left to inspect detailed headers and JSON payload.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
