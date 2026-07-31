import React, { useState } from "react";
import { X, Send, Calendar, Sparkles, HelpCircle } from "lucide-react";
import { Client } from "../../types";
import { CHECKLIST_RULES, DOCUMENT_CATEGORIES } from "./constants";

interface DocRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  currentUser: any;
  onCreateRequest: (clientId: string, name: string, category: string, dueDate: string, notes: string) => void;
}

export const DocRequestModal: React.FC<DocRequestModalProps> = ({
  isOpen,
  onClose,
  clients,
  currentUser,
  onCreateRequest
}) => {
  const [targetClient, setTargetClient] = useState("");
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState("Identification");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  // Autofill when standard document selected
  const handleStandardSelect = (ruleName: string) => {
    const match = CHECKLIST_RULES.find(r => r.label === ruleName);
    if (match) {
      setDocName(match.label);
      setCategory(match.category);
      setNotes(`Kindly upload a clear, legible digital copy of: ${match.label}. Note: ${match.description}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRequest(targetClient, docName, category, dueDate, notes);
    
    // reset form
    setTargetClient("");
    setDocName("");
    setNotes("");
    setDueDate("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none animate-fade-in">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--color-text-faint)] hover:text-[var(--color-text)] p-1 rounded bg-[var(--color-surface-2)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4">
          <h3 className="text-xs font-black uppercase text-[var(--color-accent)] tracking-wider flex items-center gap-1.5">
            <Send className="h-4.5 w-4.5" /> Issue Client Document Request
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Dispatches secure upload requests directly to applicant files</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          {/* Target Client File */}
          <div className="space-y-1">
            <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Client File Integration</label>
            <select 
              value={targetClient}
              onChange={(e) => setTargetClient(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
              required
            >
              <option value="">-- Choose Client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-[var(--color-surface)]">
                  {c.first} {c.last} ({c.type || 'Purchase'} | Assigned: {c.agent || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick-Autofill Helpers */}
          <div className="space-y-1">
            <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Quick Select Mortgage Template</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Govt Photo ID (Driver's / Passport)",
                "Stated Job Pay Stubs (last 3)",
                "Letter of Employment (Signed/Dated)",
                "Notice of Assessment (NOA) - Last 2 Years",
                "90-Day Bank transaction ledger",
                "Agreement of Purchase & Sale (APS)"
              ].map(tpl => (
                <button
                  type="button"
                  key={tpl}
                  onClick={() => handleStandardSelect(tpl)}
                  className="bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-[8.5px] font-black uppercase px-2 py-1 rounded"
                >
                  + {tpl.split(" (")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Document Request Name */}
          <div className="space-y-1">
            <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Document Name</label>
            <input 
              type="text" 
              placeholder="e.g. Current Mortgage Statement, Signed Form 10"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)] font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1">
              <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 font-bold text-[var(--color-text)] focus:outline-none"
              >
                {DOCUMENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-[var(--color-surface)]">{cat}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Delivery Due Date</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                required
              />
            </div>
          </div>

          {/* Broker Delivery Instructions */}
          <div className="space-y-1">
            <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Delivery Instructions for Applicant</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 'Must show all pages of Notice of Assessment including page 2 where outstanding balances are detailed.'"
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 text-[var(--color-text)] placeholder-[var(--color-text-faint)] h-20 focus:outline-none focus:border-[var(--color-accent)] font-semibold"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--color-accent)] text-black font-black uppercase text-xs tracking-widest py-3 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center justify-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" /> Dispatch Secure Upload Request
          </button>
        </form>
      </div>
    </div>
  );
};
