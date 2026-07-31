import React from "react";
import { 
  AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, UploadCloud, 
  Trash2, HelpCircle, Eye, CornerDownRight, ShieldCheck, RefreshCw, Sparkles 
} from "lucide-react";
import { Client } from "../../types";
import { EnhancedDocState } from "./types";
import { STATUS_STYLING } from "./constants";

interface DocChecklistCardProps {
  client: Client;
  doc: EnhancedDocState;
  onStatusChange: (clientId: string, docId: string, status: any) => void;
  onOpenUploadDrawer: (client: Client, docId: string, label: string, category: string) => void;
  onDeleteDocument: (clientId: string, docId: string, label: string) => void;
  isOwnerOrManager: boolean;
  currentUser: any;
}

export const DocChecklistCard: React.FC<DocChecklistCardProps> = ({
  client,
  doc,
  onStatusChange,
  onOpenUploadDrawer,
  onDeleteDocument,
  isOwnerOrManager,
  currentUser
}) => {
  const style = STATUS_STYLING[doc.status] || STATUS_STYLING.required;
  const lastFile = doc.files && doc.files.length > 0 ? doc.files[doc.files.length - 1] : null;

  // Render warning banners
  const renderWarning = () => {
    if (doc.warningTag === "expired" || doc.status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/25 text-[8px] font-black uppercase px-2 py-0.5 rounded-md animate-pulse">
          <AlertCircle className="h-2.5 w-2.5" /> Expired Document
        </span>
      );
    }
    if (doc.warningTag === "expires_soon") {
      return (
        <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
          <AlertTriangle className="h-2.5 w-2.5" /> Expires Soon
        </span>
      );
    }
    if (doc.warningTag === "stale" || doc.warningTag === "needs_refresh") {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-md" title="Documents must be under 45/60 days old for lender submissions">
          <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" /> Stale (Needs Refresh)
        </span>
      );
    }
    return null;
  };

  return (
    <div 
      className={`p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        doc.status === "approved" 
          ? "bg-[var(--color-success-subtle)] border-[var(--color-success)]/15" 
          : doc.status === "rejected" || doc.status === "missing_pages"
          ? "bg-[var(--color-error-subtle)] border-[var(--color-error)]/15"
          : doc.status === "waived"
          ? "bg-[var(--color-surface-2)]/60 border-[var(--color-border)]/50 opacity-70"
          : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30 hover:shadow-md"
      }`}
    >
      {/* 1. Details & Metas */}
      <div className="flex-grow min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h5 className="text-xs font-black text-[var(--color-text)] tracking-wide truncate">
            {doc.label}
          </h5>
          
          {doc.isCustom && (
            <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Sparkles className="h-2 w-2" /> Custom Lender Clause
            </span>
          )}

          {renderWarning()}

          {doc.files && doc.files.length > 0 && (
            <span className="bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
              v{doc.files.length} Secure Vaulted
            </span>
          )}

          {doc.files && doc.files.some((f: any) => f.syncStatus === "pending") && (
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/25 text-[8px] font-black uppercase px-1.5 py-0.5 rounded animate-pulse">
              Sync Pending
            </span>
          )}
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
          {doc.description}
        </p>

        {/* Notes & Audit Trails if present */}
        {doc.notes && (
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-2 rounded-lg text-[10px] text-[var(--color-text-muted)] flex items-start gap-1.5 mt-2">
            <CornerDownRight className="h-3 w-3 text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[var(--color-accent)]/80 uppercase font-black text-[8px] tracking-wider block">Underwriter Audit Comments:</span>
              <p className="italic text-[var(--color-text)] mt-0.5 whitespace-pre-line">{doc.notes}</p>
              {doc.reviewedBy && (
                <span className="block text-[8px] text-[var(--color-text-faint)] mt-1 font-mono">
                  By {doc.reviewedBy} on {doc.reviewedAt ? new Date(doc.reviewedAt).toLocaleDateString() : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Expiry & Dates */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-[var(--color-text-faint)] font-mono mt-1 pt-1 border-t border-[var(--color-divider)]">
          {doc.expiryDate && (
            <span className="text-[var(--color-accent)]">📅 Expiry Date: <strong className="text-[var(--color-text-muted)]">{doc.expiryDate}</strong></span>
          )}
          {lastFile && (
            <span>Last Active File: <strong className="text-[var(--color-text-muted)]">{lastFile.fileName}</strong> ({lastFile.fileSize})</span>
          )}
          {doc.dueDate && doc.status === "requested" && (
            <span className="text-orange-500 dark:text-orange-400">📩 Requested: Due <strong className="text-[var(--color-text-muted)]">{doc.dueDate}</strong></span>
          )}
        </div>
      </div>

      {/* 2. Interactive Control Center */}
      <div className="flex flex-wrap items-end gap-2 shrink-0 self-start md:self-center">
        
        {/* Status Dropdown Picker */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[7.5px] uppercase font-black text-[var(--color-text-faint)] tracking-wider">Compliance Status</label>
          <select 
            value={doc.status}
            onChange={(e) => onStatusChange(client.id, doc.id, e.target.value)}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-[10px] font-bold uppercase rounded p-1.5 text-[var(--color-text)] focus:outline-none cursor-pointer transition-colors h-[33px]"
          >
            {Object.keys(STATUS_STYLING).map(k => (
              <option key={k} value={k}>{STATUS_STYLING[k].label}</option>
            ))}
          </select>
        </div>

        {/* Quick Action: Fast-Track Approve */}
        {doc.status !== "approved" && doc.files.length > 0 && (
          <button
            onClick={() => onStatusChange(client.id, doc.id, "approved")}
            className="h-[33px] px-2.5 bg-[var(--color-success-subtle)] border border-[var(--color-success)]/20 hover:bg-[var(--color-success)]/10 text-[var(--color-success)] text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-colors"
            title="Fast approve document and clear conditions"
          >
            <CheckCircle2 className="h-3 w-3" /> Approve
          </button>
        )}

        {/* Quick Action: Waive Document */}
        {doc.status !== "waived" && (
          <button
            onClick={() => onStatusChange(client.id, doc.id, "waived")}
            className="h-[33px] px-2 bg-[var(--color-success-subtle)]/50 hover:bg-[var(--color-success-subtle)] border border-[var(--color-success)]/15 text-[var(--color-success)]/85 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-colors"
            title="Waive requirement for this client"
          >
            <ShieldCheck className="h-3 w-3" /> Waive
          </button>
        )}

        {/* View / Upload Secure Drawer */}
        <button 
          onClick={() => onOpenUploadDrawer(client, doc.id, doc.label || doc.id, doc.category || "Other")}
          className="h-[33px] px-3 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
          title="Manage Uploads, Add Versions and Comments"
        >
          <UploadCloud className="h-3.5 w-3.5" /> Secure Vault
        </button>

        {/* Wipe Item (Admin Only / If Custom) */}
        {isOwnerOrManager && (
          <button 
            onClick={() => onDeleteDocument(client.id, doc.id, doc.label || doc.id)}
            className="h-[33px] px-2.5 bg-[var(--color-error-subtle)] hover:bg-[var(--color-error-subtle)]/80 border border-[var(--color-error)]/10 text-[var(--color-error)] rounded-lg transition-colors"
            title="Wipe files & reset state to required"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

      </div>
    </div>
  );
};
