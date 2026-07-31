import React, { useState, useEffect } from "react";
import { 
  X, UploadCloud, FileDown, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, 
  RefreshCw, CornerDownRight, Calendar, Info, FileText, Check, Lock, ShieldCheck, HelpCircle
} from "lucide-react";
import { Client } from "../../types";
import { EnhancedDocState, DocVersion } from "./types";
import { ISSUE_CHECKBOXES, STATUS_STYLING } from "./constants";
import { uploadDocument } from "../../lib/bridgeService";

interface DocUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  docId: string;
  docLabel: string;
  docCategory: string;
  docVault: Record<string, any>;
  setDocVault: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  currentUser: any;
  showToast: (msg: string, type?: "success" | "error" | "info", icon?: string) => void;
  logDocActivity: (clientId: string, clientName: string, docId: string, docName: string, action: string, details: string) => void;
  bridgeOnline?: boolean;
}

export const DocUploadDrawer: React.FC<DocUploadDrawerProps> = ({
  isOpen,
  onClose,
  client,
  docId,
  docLabel,
  docCategory,
  docVault,
  setDocVault,
  currentUser,
  showToast,
  logDocActivity,
  bridgeOnline = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(-1); // -1 means no active upload
  const [uploadStepMsg, setUploadStepMsg] = useState("");
  const [fileNameOverride, setFileNameOverride] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedIssues, setSelectedIssues] = useState<Record<string, boolean>>({});
  const [mockOCRData, setMockOCRData] = useState<any>(null);

  // Load existing doc settings when client or docId shifts
  const savedDoc = client ? docVault[client.id]?.[docId] || {} : {};
  const files: DocVersion[] = savedDoc.files || (savedDoc.name ? [{
    id: "v-initial",
    fileName: savedDoc.name,
    fileSize: savedDoc.size || "1.8 MB",
    uploadedAt: savedDoc.uploadedAt || new Date().toISOString(),
    uploadedBy: "System Legacy",
    path: savedDoc.path || ""
  }] : []);

  useEffect(() => {
    if (client && docId) {
      const currentVaultState = docVault[client.id]?.[docId] || {};
      setReviewNote(currentVaultState.notes || "");
      setExpiryDate(currentVaultState.expiryDate || "");
      setSelectedIssues({});
      setMockOCRData(null);
      setUploadProgress(-1);
    }
  }, [client, docId, docVault]);

  if (!isOpen || !client) return null;

  // Toggle flags and auto-compose note text
  const handleIssueToggle = (id: string, label: string) => {
    const updated = { ...selectedIssues, [id]: !selectedIssues[id] };
    setSelectedIssues(updated);

    const activeIssues = Object.keys(updated)
      .filter(k => updated[k])
      .map(k => ISSUE_CHECKBOXES.find(ic => ic.id === k)?.label || k);

    if (activeIssues.length > 0) {
      setReviewNote(prev => {
        const cleanBase = prev.split("⚠️ UNDERWRITING ISSUES IDENTIFIED:")[0].trim();
        return `${cleanBase}\n\n⚠️ UNDERWRITING ISSUES IDENTIFIED:\n- ${activeIssues.join("\n- ")}`.trim();
      });
    } else {
      setReviewNote(prev => prev.split("⚠️ UNDERWRITING ISSUES IDENTIFIED:")[0].trim());
    }
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startSimulatedUpload(e.dataTransfer.files[0].name, e.dataTransfer.files[0].size, e.dataTransfer.files[0]);
    }
  };

  const handleManualUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startSimulatedUpload(e.target.files[0].name, e.target.files[0].size, e.target.files[0]);
    }
  };

  // 1-Click Status Toggles from drawer
  const handleDirectStatusSet = (status: any) => {
    const clientDocs = docVault[client.id] || {};
    const existingDoc = clientDocs[docId] || {};

    const updatedDocState = {
      ...existingDoc,
      status,
      notes: reviewNote,
      expiryDate,
      reviewedBy: `${currentUser.first} ${currentUser.last}`,
      reviewedAt: new Date().toISOString(),
      reviewHistory: [
        ...(existingDoc.reviewHistory || []),
        {
          date: new Date().toISOString(),
          user: `${currentUser.first} ${currentUser.last}`,
          status,
          notes: `Set status to ${STATUS_STYLING[status]?.label}. Manual review comment: "${reviewNote || 'None'}"`
        }
      ]
    };

    setDocVault(prev => ({
      ...prev,
      [client.id]: {
        ...clientDocs,
        [docId]: updatedDocState
      }
    }));

    logDocActivity(
      client.id,
      `${client.first} ${client.last}`,
      docId,
      docLabel,
      "reviewed",
      `Underwriter directly set status to ${status.toUpperCase()} and saved review profile`
    );

    showToast(`Status updated to ${STATUS_STYLING[status]?.label}!`, "success", "✓");
    onClose();
  };

  // Simulated Upload with high-fidelity progression
  const startSimulatedUpload = (name: string, sizeBytes: number, realFile?: File) => {
    const sizeStr = (sizeBytes / (1024 * 1024)).toFixed(2) + " MB";
    setUploadProgress(0);
    setUploadStepMsg("Establishing GBK Secured SSH Session...");

    const steps = [
      { p: 15, m: "Establishing GBK Secured SSH Session..." },
      { p: 40, m: "Scanning payload for malware & malware signatures..." },
      { p: 70, m: "Watermarking with brokerage digital stamp..." },
      { p: 90, m: "Analyzing Document Structure & Extracting Metadata..." },
      { p: 100, m: "Safe storage verified in vault cluster. Finalizing..." }
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        setUploadProgress(steps[currentStepIdx].p);
        setUploadStepMsg(steps[currentStepIdx].m);
        currentStepIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          finalizeUpload(name, sizeStr, realFile);
        }, 500);
      }
    }, 450);
  };

  const finalizeUpload = async (fName: string, fSize: string, realFile?: File) => {
    const finalName = fileNameOverride || fName;
    const clientDocs = docVault[client.id] || {};
    const existingDoc = clientDocs[docId] || {};
    const currentFiles = existingDoc.files || [];

    let isSynced = false;
    if (bridgeOnline) {
      setUploadStepMsg("Syncing files to Z Drive Network Bridge...");
      try {
        const fileToUpload = realFile || new File(["GBK Secured Document Backup Content"], finalName, { type: "application/pdf" });
        const success = await uploadDocument(client.id, fileToUpload);
        if (success) {
          isSynced = true;
        } else {
          showToast("Bridge upload failed, queueing offline...", "info", "🔌");
        }
      } catch (err: any) {
        console.error("Bridge upload threw exception:", err);
        showToast("Bridge upload error, queueing offline...", "info", "🔌");
      }
    } else {
      showToast("Bridge server offline, queueing offline...", "info", "🔌");
    }

    const newVersion: DocVersion & { syncStatus?: 'synced' | 'pending' } = {
      id: "v-" + Date.now(),
      fileName: finalName,
      fileSize: fSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy: `${currentUser.first} ${currentUser.last}`,
      notes: reviewNote || (isSynced ? "Direct secure upload synced to bridge." : "Offline queued upload."),
      path: `gbk-secured-vault://${client.id}/${docId}/${finalName}`,
      syncStatus: isSynced ? "synced" : "pending"
    };

    const updatedFiles = [...currentFiles, newVersion];
    const isFirst = updatedFiles.length === 1;

    const updatedDocState = {
      ...existingDoc,
      status: (isFirst ? "received" : existingDoc.status || "received") as any,
      path: newVersion.path,
      expiryDate,
      notes: reviewNote,
      files: updatedFiles,
      reviewedBy: `${currentUser.first} ${currentUser.last}`,
      reviewedAt: new Date().toISOString(),
      reviewHistory: [
        ...(existingDoc.reviewHistory || []),
        {
          date: new Date().toISOString(),
          user: `${currentUser.first} ${currentUser.last}`,
          status: isFirst ? "received" : (existingDoc.status || "received"),
          notes: isSynced 
            ? `Uploaded version ${updatedFiles.length}: ${finalName} (Synced to Bridge)`
            : `Uploaded version ${updatedFiles.length}: ${finalName} (Pending Sync)`
        }
      ]
    };

    setDocVault(prev => ({
      ...prev,
      [client.id]: {
        ...clientDocs,
        [docId]: updatedDocState
      }
    }));

    logDocActivity(
      client.id,
      `${client.first} ${client.last}`,
      docId,
      docLabel,
      "uploaded",
      isSynced
        ? `Successfully vaulted & synced new version: ${finalName} (Size: ${fSize}, v${updatedFiles.length})`
        : `Successfully queued offline new version: ${finalName} (Size: ${fSize}, v${updatedFiles.length})`
    );

    // Simulated OCR extraction
    const ocrMock = {
      docHash: "SHA-256#" + Math.floor(Math.random() * 900000 + 100000),
      detectedFields: docId === "photo_id" ? [
        { field: "Full Name", value: `${client.first} ${client.last}` },
        { field: "Expiry Date", value: "2030-11-20" },
        { field: "Watermark Verified", value: "CRA / ONTARIO DMV" }
      ] : docId === "paystubs" ? [
        { field: "Employee Name", value: `${client.first} ${client.last}` },
        { field: "Year-To-Date Pay", value: "$45,210.00" },
        { field: "Stated Employer", value: "Standard Corporation" }
      ] : [
        { field: "Matches Client Profile", value: "CONFIRMED" },
        { field: "Uploaded By", value: `${currentUser.first} ${currentUser.last}` }
      ]
    };

    setMockOCRData(ocrMock);
    setUploadProgress(-1);
    setFileNameOverride("");
    showToast(`Successfully uploaded ${finalName}!`, "success", "✓");
  };

  // Delete specific version
  const handleDeleteVersion = (versionId: string, verName: string) => {
    if (!window.confirm(`Are you sure you want to delete file version "${verName}"? This leaves previous versions intact but is permanent.`)) return;

    const clientDocs = docVault[client.id] || {};
    const existingDoc = clientDocs[docId] || {};
    const updatedFiles = (existingDoc.files || []).filter((f: any) => f.id !== versionId);

    const updatedDocState = {
      ...existingDoc,
      files: updatedFiles,
      path: updatedFiles.length > 0 ? updatedFiles[updatedFiles.length - 1].path : ""
    };

    setDocVault(prev => ({
      ...prev,
      [client.id]: {
        ...clientDocs,
        [docId]: updatedDocState
      }
    }));

    logDocActivity(
      client.id,
      `${client.first} ${client.last}`,
      docId,
      docLabel,
      "deleted",
      `Removed file version: ${verName}`
    );

    showToast(`Removed version: ${verName}`, "info", "🗑️");
  };

  // Mock upload manual button click
  const handleTriggerUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById("hidden-file-input") as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      startSimulatedUpload(fileInput.files[0].name, fileInput.files[0].size);
    } else {
      // Simulate random selection if empty
      startSimulatedUpload(`Secured_Document_${Date.now().toString().slice(-4)}.pdf`, 1950000);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 z-50 flex justify-end backdrop-blur-sm select-none animate-fade-in">
      <div className="bg-[var(--color-surface)] border-l border-[var(--color-border)] w-full max-w-2xl h-full flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-[var(--color-accent)] tracking-widest flex items-center gap-1.5">
              <Lock className="h-4 w-4" /> SECURED UNDERWRITING VAULT
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Underwriting audit, version controls, OCR checks &amp; review notes</p>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-2 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contents Scroll */}
        <div className="flex-grow overflow-y-auto p-5 space-y-6 text-xs font-semibold">
          
          {/* Section 1: Client and Doc ID Banner */}
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[8px] text-[var(--color-text-faint)] uppercase font-black tracking-wider block">Requirement Profile</span>
              <h4 className="text-sm font-black text-[var(--color-text)] mt-0.5">{docLabel}</h4>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                Client Folder: <strong className="text-[var(--color-text)]">{client.first} {client.last}</strong> | Category: <strong className="text-[var(--color-accent)]">{docCategory}</strong>
              </p>
            </div>
            <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${STATUS_STYLING[savedDoc.status || 'required']?.color} ${STATUS_STYLING[savedDoc.status || 'required']?.border} ${STATUS_STYLING[savedDoc.status || 'required']?.text}`}>
              {STATUS_STYLING[savedDoc.status || 'required']?.label}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT COLUMN: Upload controls and OCR previews (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* DRAG AND DROP FILE ZONE */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden ${
                  dragActive 
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 scale-[0.99]" 
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)]/30 hover:bg-[var(--color-surface-2)]/60 hover:border-[var(--color-border-hover)]"
                }`}
              >
                {uploadProgress >= 0 ? (
                  /* SIMULATED UPLOADING DIALOG */
                  <div className="w-full space-y-4 py-4 px-2">
                    <RefreshCw className="h-8 w-8 text-[var(--color-accent)] animate-spin mx-auto" />
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-[var(--color-text-faint)]">
                        <span>{uploadStepMsg}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-[var(--color-surface-3)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
                        <div className="bg-[var(--color-accent)] h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* IDLE DROP ZONE */
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                    <UploadCloud className="h-10 w-10 text-[var(--color-text-faint)] mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-[var(--color-text)] uppercase">Drag &amp; Drop PDF File Here</span>
                    <span className="text-[10px] text-[var(--color-text-faint)] block mt-1">Or click to select from local storage</span>
                    <input 
                      type="file" 
                      id="hidden-file-input" 
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleManualUploadChange}
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              {/* MOCK NAME OVERRIDE */}
              <div className="bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] p-3 rounded-xl space-y-2">
                <label className="text-[9px] uppercase text-[var(--color-text-muted)] font-black block">Custom File Name Override (Optional)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. Verified_Notice_of_Assessment.pdf"
                    value={fileNameOverride}
                    onChange={(e) => setFileNameOverride(e.target.value)}
                    className="flex-grow bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[11px] rounded-lg p-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                  />
                  <button 
                    onClick={handleTriggerUploadSubmit}
                    disabled={uploadProgress >= 0}
                    className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] uppercase text-[9px] font-black tracking-wider px-3 py-2 rounded-lg transition-colors"
                  >
                    Quick Upload
                  </button>
                </div>
              </div>

              {/* OCR ANALYSIS INSIGHTS PANEL */}
              {ocrMockDataReady(mockOCRData, files) && (
                <div className="bg-[var(--color-success-subtle)]/30 border border-[var(--color-success)]/10 p-4 rounded-xl space-y-2.5 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-[var(--color-success)]">
                    <ShieldCheck className="h-4.5 w-4.5" />
                    <span className="text-[10px] uppercase font-black tracking-wider">GBK Secure AI-OCR Check Result</span>
                  </div>
                  <div className="space-y-1.5 border-t border-[var(--color-border)] pt-2 text-[10px] font-mono text-[var(--color-text-muted)]">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-faint)]">Document Identifier:</span>
                      <span className="font-bold text-[var(--color-text)]">{mockOCRData?.docHash || "SHA-256#849302"}</span>
                    </div>
                    {(mockOCRData?.detectedFields || [
                      { field: "Verification Status", value: "Valid Document Hashed & Encrypted" },
                      { field: "Client Matching", value: "98.4% Match Confirmed" }
                    ]).map((f: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-[var(--color-text-faint)]">{f.field}:</span>
                        <span className="font-bold text-[var(--color-success)]">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FILE VERSIONS TRACKER */}
              <div className="space-y-3">
                <span className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-widest block">SECURED FILE VERSIONS ({files.length})</span>
                {files.length === 0 ? (
                  <div className="bg-[var(--color-surface-2)]/40 border border-dashed border-[var(--color-border)] p-6 rounded-xl text-center text-[var(--color-text-faint)] italic">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-10" />
                    No files vaulted for this checklist item yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {files.map((ver, idx) => (
                      <div key={ver.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 rounded-xl flex items-start justify-between gap-3 hover:bg-[var(--color-surface-2)]/80 transition-colors relative">
                        <span className="absolute right-3 bottom-3 px-1.5 py-0.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded text-[8px] text-[var(--color-text-faint)] font-bold uppercase font-mono">
                          v{idx + 1} {idx === files.length - 1 ? 'Active' : 'Superseded'}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <h6 className="text-[11px] font-black text-[var(--color-text)] truncate pr-16">{ver.fileName}</h6>
                          <div className="flex gap-x-3 gap-y-0.5 text-[9px] text-[var(--color-text-faint)] font-mono">
                            <span className="text-[#6fa3b8]">{ver.fileSize}</span>
                            <span>{new Date(ver.uploadedAt).toLocaleString("en-CA")}</span>
                          </div>
                          <span className="block text-[8px] text-[var(--color-text-faint)] font-bold uppercase font-mono">Uploaded By: {ver.uploadedBy}</span>
                          {ver.notes && (
                            <p className="text-[9.5px] italic text-[var(--color-text-muted)] bg-[var(--color-surface-3)]/60 border border-[var(--color-border)] p-2 rounded-md mt-2">
                              "{ver.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 z-10">
                          <button 
                            onClick={() => showToast(`Downloading ${ver.fileName} from secure storage node...`, "info", "💾")}
                            className="p-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] rounded-md"
                            title="Download Version File"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteVersion(ver.id, ver.fileName)}
                            className="p-1.5 bg-[var(--color-error-subtle)] hover:bg-[var(--color-error-subtle)] text-[var(--color-error)] rounded-md border border-[var(--color-error)]/10"
                            title="Delete Version File"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Underwriting Decisions, Flags & Expiries (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* STAGE 1: FAST DECISIONS PANEL */}
              <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-accent)]/10 p-4 rounded-xl space-y-3 shadow-md">
                <span className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-widest block">Fast Underwriting Decisions</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleDirectStatusSet("approved")}
                    className="py-2.5 px-3 bg-[var(--color-success-subtle)] border border-[var(--color-success)]/20 hover:bg-[var(--color-success)]/15 text-[var(--color-success)] font-black uppercase text-[9px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button 
                    onClick={() => handleDirectStatusSet("rejected")}
                    className="py-2.5 px-3 bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20 hover:bg-[var(--color-error)]/15 text-[var(--color-error)] font-black uppercase text-[9px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" /> Reject File
                  </button>
                  <button 
                    onClick={() => handleDirectStatusSet("under_review")}
                    className="py-2.5 px-3 bg-[var(--color-warning-subtle)] border border-[var(--color-warning)]/20 hover:bg-[var(--color-warning)]/15 text-[var(--color-warning)] font-black uppercase text-[9px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Under Review
                  </button>
                  <button 
                    onClick={() => handleDirectStatusSet("follow_up")}
                    className="py-2.5 px-3 bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-black uppercase text-[9px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Info className="h-3.5 w-3.5" /> Follow-Up
                  </button>
                </div>
              </div>

              {/* STAGE 2: ISSUE IDENTIFICATION CHECKBOXES */}
              <div className="bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-[var(--color-warning)]">
                  <ShieldAlert className="h-4.5 w-4.5" />
                  <span className="text-[10px] uppercase font-black tracking-widest">Flag Compliance Defect</span>
                </div>
                <div className="grid grid-cols-1 gap-2 border-t border-[var(--color-divider)] pt-2">
                  {ISSUE_CHECKBOXES.map(issue => (
                    <label 
                      key={issue.id} 
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10.5px] font-semibold cursor-pointer transition-colors ${
                        selectedIssues[issue.id] 
                          ? "bg-[var(--color-error-subtle)] border-[var(--color-error)]/20 text-[var(--color-error)]" 
                          : "bg-[var(--color-surface-2)]/60 border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!selectedIssues[issue.id]} 
                        onChange={() => handleIssueToggle(issue.id, issue.label)}
                        className="rounded border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)] focus:ring-0 cursor-pointer"
                      />
                      {issue.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* STAGE 3: EXPIRY & NOTES */}
              <div className="bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-wider block">Decision Notes &amp; Metadata</span>
                
                <div className="space-y-1">
                  <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">Lender Expiry Date</label>
                  <input 
                    type="date" 
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded-lg p-2 text-[var(--color-text)] focus:outline-none"
                  />
                  <span className="text-[8px] text-[var(--color-text-faint)] block font-mono">Triggers automatic alerts 30 days prior to expiry</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] text-[var(--color-text-faint)] uppercase font-black block">Reviewer Notes</label>
                  <textarea 
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Provide detailed explanations or items required from client."
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded-lg p-2.5 text-[var(--color-text)] placeholder-[var(--color-text-faint)] h-24 focus:outline-none focus:border-[var(--color-accent)] font-semibold whitespace-pre-line leading-relaxed"
                  />
                </div>

                <button
                  onClick={() => {
                    // Just save comments/dates without closing or changing status
                    const clientDocs = docVault[client.id] || {};
                    const existingDoc = clientDocs[docId] || {};
                    
                    const updatedDocState = {
                      ...existingDoc,
                      notes: reviewNote,
                      expiryDate,
                      reviewedBy: `${currentUser.first} ${currentUser.last}`,
                      reviewedAt: new Date().toISOString()
                    };

                    setDocVault(prev => ({
                      ...prev,
                      [client.id]: {
                        ...clientDocs,
                        [docId]: updatedDocState
                      }
                    }));

                    logDocActivity(
                      client.id,
                      `${client.first} ${client.last}`,
                      docId,
                      docLabel,
                      "reviewed",
                      `Updated review comments: "${reviewNote || 'None'}"`
                    );

                    showToast("Underwriting notes updated", "info", "⚙️");
                  }}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] uppercase text-[9px] font-black tracking-wider py-2 rounded-lg transition-colors"
                >
                  Save Audits Only
                </button>
              </div>

            </div>

          </div>

          {/* HISTORICAL REVIEW AUDIT TIMELINE LOG */}
          {savedDoc.reviewHistory && savedDoc.reviewHistory.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-4 space-y-2.5">
              <span className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-widest block">UNDERWRITING STATUS REVISION HISTORY</span>
              <div className="space-y-2 font-mono text-[9px] max-h-[150px] overflow-y-auto pr-1">
                {savedDoc.reviewHistory.map((rev: any, rIdx: number) => (
                  <div key={rIdx} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 flex items-start gap-2">
                    <span className="text-[var(--color-accent)] mt-0.5 font-bold">[{new Date(rev.date).toLocaleDateString()}]</span>
                    <div className="min-w-0">
                      <strong className="text-[var(--color-text)]">{rev.user}</strong>: 
                      <span className="text-[var(--color-text-muted)] block font-sans text-[10px] font-semibold mt-0.5 leading-relaxed">{rev.notes}</span>
                    </div>
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

const ocrMockDataReady = (mockOCRData: any, files: DocVersion[]) => {
  return mockOCRData || (files && files.length > 0);
};
