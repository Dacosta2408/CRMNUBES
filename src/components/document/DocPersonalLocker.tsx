import React, { useState } from "react";
import { Shield, Trash2, FileDown, Lock, Check, FileText } from "lucide-react";

interface ComplianceFile {
  id: string;
  name: string;
  type: string;
  date: string;
}

interface DocPersonalLockerProps {
  personalFiles: ComplianceFile[];
  onUploadPersonalFile: (type: string, fileInput: HTMLInputElement | null) => void;
  onDeletePersonalFile: (id: string, name: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info", icon?: string) => void;
}

export const DocPersonalLocker: React.FC<DocPersonalLockerProps> = ({
  personalFiles,
  onUploadPersonalFile,
  onDeletePersonalFile,
  showToast
}) => {
  const [docType, setDocType] = useState("FSRA Broker License");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById("personal-doc-file-input") as HTMLInputElement;
    onUploadPersonalFile(docType, fileInput);
    
    // reset input
    if (fileInput) fileInput.value = "";
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 space-y-6">
      
      <div className="border-b border-[var(--color-border)] pb-4">
        <h3 className="text-xs font-black uppercase text-[var(--color-text)] tracking-wider flex items-center gap-1.5">
          <Shield className="h-4.5 w-4.5 text-[var(--color-accent)]" /> Personal Compliance &amp; Credentials Locker
        </h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Upload and vault your licensing records and errors and omissions policy binders for internal audits</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Side: Upload Form */}
        <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-xl space-y-4 shadow-sm">
          <span className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider block border-b border-[var(--color-border)] pb-1.5">
            Vault New Credentials Record
          </span>
          
          <div className="space-y-1.5">
            <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Credential Category</label>
            <select 
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded-lg p-2.5 font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30"
            >
              <option value="FSRA Broker License">FSRA Broker License (M19XXXXXX)</option>
              <option value="E&amp;O Insurance Policy">Errors &amp; Omissions Insurance Policy Binder</option>
              <option value="Signed Brokerage Agreement">Signed Principal Brokerage Agreement</option>
              <option value="Compliance AML Training">AML Compliance Certification (CAMS/FSRA)</option>
              <option value="Driver's License / Passport">Personal Govt Photo ID Verification</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Upload Credentials (PDF/JPG)</label>
            <input 
              type="file" 
              id="personal-doc-file-input"
              accept=".pdf,.png,.jpg,.jpeg"
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs rounded-lg p-2 text-[var(--color-text-muted)] file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[var(--color-accent)]/15 file:text-[var(--color-accent)] hover:file:bg-[var(--color-accent)]/25 transition-colors cursor-pointer"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 font-black uppercase text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Vault Personal Credential File
          </button>
        </form>

        {/* Right Side: Vaulted List */}
        <div className="space-y-3">
          <span className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-widest block">
            VAULTED CREDENTIALS ({personalFiles.length})
          </span>
          
          {personalFiles.length === 0 ? (
            <div className="border border-dashed border-[var(--color-border)] p-8 rounded-xl text-center text-[var(--color-text-faint)] italic">
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-10" />
              No credentials vaulted under your profile.
            </div>
          ) : (
            <div className="space-y-2.5">
              {personalFiles.map(file => (
                <div key={file.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl flex items-center justify-between gap-4 hover:border-[var(--color-accent)]/20 transition-colors shadow-sm">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-black text-[var(--color-text)]">{file.type}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[280px] font-mono">{file.name}</div>
                    <div className="text-[8px] text-[var(--color-accent)] font-black uppercase tracking-wider font-mono">
                      Vault Status: Verified | Received {file.date}
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button 
                      onClick={() => showToast(`Downloading compliance credential: ${file.name}`, "info", "💾")}
                      className="p-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] rounded-md transition-colors"
                      title="Download Credential Document"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => onDeletePersonalFile(file.id, file.name)}
                      className="p-2 bg-[var(--color-error-subtle)] hover:bg-[var(--color-error-subtle)]/80 text-[var(--color-error)] rounded-md border border-[var(--color-error)]/10 transition-colors"
                      title="Delete Credential Document"
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

    </div>
  );
};
