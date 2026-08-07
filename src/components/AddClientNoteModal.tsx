import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Search, X, Check, AlertCircle, Sparkles, User, 
  StickyNote, Tag, Flag, ArrowRight, RefreshCw, Folder
} from "lucide-react";
import { Client, User as CRMUser } from "../types";
import { FileNote, getNotesForClient, saveNotesForClient, logActivityEvent } from "../lib/activityEngine";

interface AddClientNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: {
    id: string;
    sender: string;
    senderName?: string;
    text: string;
    timestamp: string;
    channel?: string;
    linkedClientId?: string;
  } | null;
  clients: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
  currentUser: CRMUser;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  defaultClientId?: string | null;
}

const NOTE_TYPES: { id: FileNote["type"]; label: string; icon: string; color: string }[] = [
  { id: "general", label: "General Note", icon: "📌", color: "text-slate-300" },
  { id: "underwriting", label: "Underwriting", icon: "📝", color: "text-purple-400" },
  { id: "broker", label: "Broker Note", icon: "💼", color: "text-blue-400" },
  { id: "call", label: "Call Log", icon: "📞", color: "text-emerald-400" },
  { id: "lender", label: "Lender Comm", icon: "🏦", color: "text-amber-400" },
  { id: "lawyer", label: "Lawyer / Solicitor", icon: "⚖️", color: "text-sky-400" },
  { id: "internal", label: "Internal Confidential", icon: "🔒", color: "text-rose-400" }
];

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  { id: "medium", label: "Medium", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  { id: "high", label: "High", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  { id: "critical", label: "Urgent", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" }
];

export const AddClientNoteModal: React.FC<AddClientNoteModalProps> = ({
  isOpen,
  onClose,
  message,
  clients,
  setClients,
  currentUser,
  showToast,
  defaultClientId
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState<string>("");
  const [noteType, setNoteType] = useState<FileNote["type"]>("underwriting");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setClientSearch("");
      
      // Auto-determine target client if available
      const initialClient = defaultClientId || message?.linkedClientId || (clients.length > 0 ? clients[0].id : "");
      setSelectedClientId(initialClient || "");

      const senderName = message?.senderName || message?.sender || "Team Member";
      setNoteTitle(`Chat Note via ${senderName}`);
      setNoteContent(message?.text || "");
      setNoteType("underwriting");
      setPriority("medium");
    }
  }, [isOpen, message, defaultClientId, clients]);

  // Filter client database live
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c => {
      const name = `${c.first} ${c.last}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const stage = (c.stage || c.status || "").toLowerCase();
      const lender = (c.lender || "").toLowerCase();
      return name.includes(q) || email.includes(q) || stage.includes(q) || lender.includes(q);
    });
  }, [clients, clientSearch]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  if (!isOpen) return null;

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedClient) {
      setErrorMsg("Please select a client application from the Client Database.");
      return;
    }

    if (!noteContent.trim()) {
      setErrorMsg("Note content cannot be empty.");
      return;
    }

    setIsSaving(true);

    try {
      const authorName = `${currentUser.first} ${currentUser.last}`.trim() || currentUser.displayName || "Broker";
      const timestamp = new Date().toISOString();

      // Formatted content containing priority and sender provenance
      const formattedHeader = `[PRIORITY: ${priority.toUpperCase()}] ${noteTitle.trim()}`;
      const fullNoteBody = `${formattedHeader}\n\n${noteContent.trim()}\n\n— Logged from Team Chat by ${authorName} on ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      const newNote: FileNote = {
        id: `note_chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        clientId: selectedClient.id,
        author: authorName,
        timestamp,
        type: noteType,
        content: fullNoteBody,
        tags: ["team_chat", priority, noteType]
      };

      // Load existing notes for client and prepend
      const existingNotes = getNotesForClient(selectedClient);
      const updatedNotes = [newNote, ...existingNotes];

      // Persist to Client File in local storage / database
      saveNotesForClient(selectedClient.id, updatedNotes);

      // Audit activity log
      logActivityEvent({
        clientId: selectedClient.id,
        clientName: `${selectedClient.first} ${selectedClient.last}`,
        eventType: "note_added",
        user: authorName,
        timestamp,
        description: `Logged chat note [Priority: ${priority.toUpperCase()}, Type: ${noteType}]: "${noteTitle || noteContent.substring(0, 50)}"`
      });

      // Update parent clients state if available
      if (setClients) {
        setClients(prevClients => 
          prevClients.map(c => {
            if (c.id === selectedClient.id) {
              const legacyFormat = updatedNotes.map(n => ({
                text: n.content,
                author: n.author,
                time: n.timestamp
              }));
              return {
                ...c,
                appData: {
                  ...(c.appData || {}),
                  notesListJson: JSON.stringify(legacyFormat),
                  internalNotes: updatedNotes.map(n => `[${n.type.toUpperCase()}] ${n.content}`).join("\n\n")
                },
                updatedAt: timestamp
              };
            }
            return c;
          })
        );
      }

      // Dispatch global events so client database components re-render immediately
      window.dispatchEvent(new CustomEvent("activity-logged"));
      window.dispatchEvent(new CustomEvent("checklist-updated"));

      if (showToast) {
        showToast(
          `Note successfully logged into ${selectedClient.first} ${selectedClient.last}'s client file!`,
          "success",
          "📝"
        );
      }

      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error("Error saving note to client file:", err);
      setIsSaving(false);
      setErrorMsg("Failed to save note to Client Database. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative text-left flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-2)]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                Add Note to Client File
              </h3>
              <p className="text-[10px] text-[var(--color-text-faint)] font-bold">
                Logs directly into Client Database & Application Folder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Form */}
        <form onSubmit={handleSaveNote} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Source Chat Message Box */}
          {message && (
            <div className="p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border)]/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-faint)] font-bold">
                <span className="flex items-center gap-1 text-[var(--color-accent)]">
                  <Sparkles className="w-3 h-3" /> Selected Chat Message
                </span>
                <span>{message.senderName || message.sender}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] italic line-clamp-2 bg-black/20 p-2 rounded-lg border border-white/5 font-mono">
                "{message.text}"
              </p>
            </div>
          )}

          {/* 1. CLIENT SEARCH & SELECTION FROM CLIENT DATABASE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Search & Select Client File
              </span>
              {selectedClient && (
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  ✓ {selectedClient.first} {selectedClient.last} ({selectedClient.stage || "Active"})
                </span>
              )}
            </label>

            {/* Client Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-faint)] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Client Database by Name, Email, Stage..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              {clientSearch && (
                <button
                  type="button"
                  onClick={() => setClientSearch("")}
                  className="absolute right-2.5 top-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Client Select Dropdown List */}
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-xs font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="" disabled>-- Select a Client File from Database ({filteredClients.length} matches) --</option>
              {filteredClients.map(c => {
                const stageTag = c.stage || c.status || c.lender || "Active File";
                return (
                  <option key={c.id} value={c.id}>
                    📁 {c.first} {c.last} — [{stageTag}] {c.email ? `(${c.email})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. NOTE TYPE & PRIORITY SELECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Note Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Type of Note
              </label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as FileNote["type"])}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                {NOTE_TYPES.map(nt => (
                  <option key={nt.id} value={nt.id}>
                    {nt.icon} {nt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Note Priority */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Priority Level
              </label>
              <div className="grid grid-cols-4 gap-1">
                {PRIORITY_OPTIONS.map(p => {
                  const isSelected = priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as any)}
                      className={`px-2 py-1.5 rounded-lg text-[10.5px] font-black border text-center transition-all cursor-pointer ${
                        isSelected 
                          ? `${p.color} ring-1 ring-current shadow-sm` 
                          : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. NOTE TITLE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase">
              Note Headline / Subject
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Underwriting update regarding income docs"
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
            />
          </div>

          {/* 4. NOTE CONTENT AREA */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center justify-between">
              <span>Note Details & Content</span>
              <span className="text-[10px] text-[var(--color-text-faint)] font-normal">Editable before saving</span>
            </label>
            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter comprehensive notes, underwriting decisions, or communication details..."
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedClient || !noteContent.trim()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Note...
                </>
              ) : (
                <>
                  Log to Client Database <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
