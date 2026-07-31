import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Search, FileText, HardDrive, ArrowLeft, Download, Sparkles, 
  ChevronRight, FileCode, CheckCircle, Info, RefreshCw, Terminal, 
  Database, HelpCircle, UploadCloud
} from "lucide-react";

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
  const [selectedFile, setSelectedFile] = useState<ZDriveFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      isIntakeReady: false, // Optional intake!
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
      isIntakeReady: false, // Optional intake!
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
        isIntakeReady: true, // Default to true, can toggle off!
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
    // Reset file input value so same file can be loaded again
    event.target.value = "";
  };

  // Filter files by search query (checks name, author, or contents)
  const filteredFiles = pendingFiles.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendToAIIntake = (file: ZDriveFile) => {
    onSendToIntake(file.content, file.name);
    setSelectedFile(null);
    onClose();
    showToast(`Loaded "${file.name}" into the AI Application Intake pipeline!`, "success");
  };

  const handleRefreshDrive = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Z:\\ Drive connection refreshed. Found 5 unprocessed application files.", "info");
    }, 800);
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
        className="bg-[#0e0e12] border border-[#5d9bb1]/30 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        id="z-drive-panel-container"
      >
        {/* Banner header mimicking a secure local desktop hard drive connection */}
        <div className="bg-[#11191d] border-b border-[#5d9bb1]/20 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#5d9bb1]/10 rounded-xl border border-[#5d9bb1]/20 text-[#5d9bb1]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider font-sans">GBK Broker Desktop Network Drive (Z:\\)</h2>
                <span className="text-[9px] bg-[#5d9bb1]/20 text-[#5d9bb1] px-2 py-0.5 rounded font-mono font-bold border border-[#5d9bb1]/20">ACTIVE CONNECT</span>
              </div>
              <p className="text-[10px] text-[#8e95a3] mt-0.5">
                Secure internal drive of unprocessed client applications. Click any file to preview, audit, or send to the AI CRM intake.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[#8e95a3] hover:text-white transition-all"
            id="close-z-drive-panel-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-[#131318] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Breadcrumb Path & Disk usage */}
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
            {/* Search Input */}
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

            {/* Upload/Browse Local Hard Drive Button */}
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

            {/* Refresh Connection Button */}
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

        {/* Main Split Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Direct File Listing (Flat, No Folders Tree!) */}
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

            {/* Bottom Quick Help Info */}
            <div className="p-3 bg-[#0c0c10] border-t border-white/5 text-[10px] text-white/40 flex items-center gap-2 font-mono shrink-0">
              <Info className="w-3.5 h-3.5 text-[#5d9bb1] shrink-0" />
              <span>These are local network storage files waiting to be converted.</span>
            </div>
          </div>

          {/* Right Column: Direct Raw Content Preview Panel */}
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
                  {/* Preview Title & Quick Controls */}
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

                  {/* Document Raw Content Console */}
                  <div className="flex-1 p-5 overflow-y-auto bg-[#07070a] font-mono text-[11px] text-[#eeeef2] leading-relaxed whitespace-pre-wrap select-text selection:bg-[#5d9bb1]/20">
                    <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold border-b border-white/5 pb-2 mb-4 font-mono select-none">
                      === BEGIN RAW DESKTOP PARTITION DOCUMENT ===
                    </div>
                    {selectedFile.content}
                    <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold border-t border-white/5 pt-2 mt-4 font-mono select-none">
                      === END OF FILE ===
                    </div>
                  </div>

                  {/* Extraction CTA Area with Optional Intake Toggle */}
                  <div className="p-4 bg-[#121217] border-t border-white/5 flex flex-col gap-3 shrink-0">
                    {/* Toggle switch to make intake optional */}
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
                /* Empty/Select File State */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full mb-3 text-white/20">
                    <HardDrive className="w-8 h-8" />
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Raw File Preview Partition</h3>
                  <p className="text-[11px] text-white/40 max-w-xs leading-normal">
                    Select any unparsed application file on the left to inspect its raw contents and activate the AI integration engine.
                  </p>
                  
                  {/* Informative Help Box */}
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
      </motion.div>
    </div>
  );
};
