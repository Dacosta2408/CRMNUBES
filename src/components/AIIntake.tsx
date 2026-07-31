import React from "react";
import { Sparkles, HelpCircle, AlertTriangle, Play } from "lucide-react";

interface AIIntakeProps {
  appLocked: boolean;
  aiIntakeText: string;
  setAiIntakeText: (val: string) => void;
  aiIntakeLoading: boolean;
  onTriggerAIIntakeExtract: () => void;
  aiIntakeFields: Record<string, string>;
  setAiIntakeFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  highlightedAiFields: string[];
  onSubmitAIIntake: (status: 'lead' | 'open') => void;
  onClose: () => void;
  agentNames: string[];
  apiKeySet: boolean;
}

export const AIIntake: React.FC<AIIntakeProps> = ({
  appLocked,
  aiIntakeText,
  setAiIntakeText,
  aiIntakeLoading,
  onTriggerAIIntakeExtract,
  aiIntakeFields,
  setAiIntakeFields,
  highlightedAiFields,
  onSubmitAIIntake,
  onClose,
  agentNames,
  apiKeySet
}) => {

  const handleFieldChange = (key: string, val: string) => {
    setAiIntakeFields(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 z-40 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
        
        {/* Head */}
        <div className="p-5 border-b border-[var(--color-border)]/70 flex items-center justify-between shrink-0 bg-[var(--color-surface-2)]/30 mr-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">AI Full Application Intake</h2>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Paste broker notes, phone transcripts, or intake forms to instantly generate a CRM client file</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] p-1 hover:bg-white/5 rounded-lg transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          
          {/* AI Intake Text pasting segment */}
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Paste Application Notes
              </h4>
              {!apiKeySet && (
                <span className="text-[10px] badge-warning border border-[var(--color-warning)]/10 px-2.5 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3" /> API Key Missing
                </span>
              )}
            </div>

            <textarea 
              rows={4}
              value={aiIntakeText}
              onChange={(e) => setAiIntakeText(e.target.value)}
              placeholder="Example: Client John Miller, cell (705) 555-9014, marital Single. Salaried manager earning $110,000/yr. Looking to buy a detached house at 24 Oak St Barrie for $580,000 with a $464,000 mortgage required. No debts, Beacon is 720. Assigned to Wayne MacLeod..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-lg p-3 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]/40 line-normal"
            />

            <button 
              onClick={onTriggerAIIntakeExtract}
              disabled={aiIntakeLoading || !apiKeySet}
              className="py-2.5 bg-gradient-to-r from-[var(--color-accent)] to-[#6fa3b8] disabled:opacity-40 text-black font-semibold text-xs rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              {aiIntakeLoading ? "✦ Extracting Information..." : "✦ Extract with AI (Claude Sonnet)"}
            </button>
          </div>

          {/* Extracted Roster Forms */}
          <div className="border-t border-[var(--color-border)]/70 pt-4">
            <h3 className="text-sm font-semibold mb-4 text-[var(--color-text)]">Personal Roster Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Applicant Name */}
              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("app_first") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">First Name *</label>
                <input 
                  type="text"
                  value={aiIntakeFields.app_first || ""}
                  onChange={(e) => handleFieldChange("app_first", e.target.value)}
                  placeholder="e.g. John"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("app_last") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Last Name *</label>
                <input 
                  type="text"
                  value={aiIntakeFields.app_last || ""}
                  onChange={(e) => handleFieldChange("app_last", e.target.value)}
                  placeholder="e.g. Smith"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              {/* Email & Cell */}
              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("app_email") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Email *</label>
                <input 
                  type="email"
                  value={aiIntakeFields.app_email || ""}
                  onChange={(e) => handleFieldChange("app_email", e.target.value)}
                  placeholder="john.smith@gmail.com"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("app_cell") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Cell Phone</label>
                <input 
                  type="text"
                  value={aiIntakeFields.app_cell || ""}
                  onChange={(e) => handleFieldChange("app_cell", e.target.value)}
                  placeholder="(705) 555-0100"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              {/* GDS financials */}
              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("app_emp1_income") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Annual salary / Income</label>
                <input 
                  type="text"
                  value={aiIntakeFields.app_emp1_income || ""}
                  onChange={(e) => handleFieldChange("app_emp1_income", e.target.value)}
                  placeholder="$115,000"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("beacon") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Beacon Credit score</label>
                <input 
                  type="text"
                  value={aiIntakeFields.beacon || ""}
                  onChange={(e) => handleFieldChange("beacon", e.target.value)}
                  placeholder="e.g. 740"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              {/* Target Deal */}
              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("prop_value") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Estimated Purchase price / value</label>
                <input 
                  type="text"
                  value={aiIntakeFields.prop_value || aiIntakeFields.propval || ""}
                  onChange={(e) => handleFieldChange("prop_value", e.target.value)}
                  placeholder="$580,000"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              <div className={`p-3 rounded-lg bg-[var(--color-surface-2)] border transition-colors ${highlightedAiFields.includes("mtg_requested") ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5" : "border-[var(--color-border)]/70"}`}>
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Financing requested (mortgage size)</label>
                <input 
                  type="text"
                  value={aiIntakeFields.mtg_requested || ""}
                  onChange={(e) => handleFieldChange("mtg_requested", e.target.value)}
                  placeholder="$464,000"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

              {/* Advisors and Co */}
              <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]/70">
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Assigned Agent</label>
                <select
                  value={aiIntakeFields.in_agent || ""}
                  onChange={(e) => handleFieldChange("in_agent", e.target.value)}
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none border-none pr-3"
                >
                  <option value="" className="bg-[var(--color-surface)]">Select advisor</option>
                  {agentNames.map((name, i) => <option key={`${name}-${i}`} value={name} className="bg-[var(--color-surface)]">{name}</option>)}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]/70">
                <label className="block text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">Co-Applicant first/last</label>
                <input 
                  type="text"
                  value={aiIntakeFields.co_first ? `${aiIntakeFields.co_first} ${aiIntakeFields.co_last || ""}` : ""}
                  onChange={(e) => {
                    const parts = e.target.value.split(" ");
                    handleFieldChange("co_first", parts[0]);
                    handleFieldChange("co_last", parts.slice(1).join(" "));
                  }}
                  placeholder="Maria Smith (optional)"
                  className="w-full bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
              </div>

            </div>
          </div>

        </div>

        {/* Foot actions */}
        <div className="p-4 border-t border-[var(--color-border)]/70 shrink-0 flex items-center justify-between bg-[var(--color-surface-2)]/30 select-none mr-1.5">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-[var(--color-border)]/70 text-[var(--color-text-muted)] text-xs font-semibold rounded-lg hover:bg-white/5"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => onSubmitAIIntake("lead")}
              className="px-4 py-2 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-semibold rounded-lg hover:bg-[var(--color-accent)]/10 transition-colors"
            >
              Parse as Lead Only
            </button>
            <button 
              onClick={() => onSubmitAIIntake("open")}
              className="px-5 py-2 bg-[var(--color-accent)] text-black text-xs font-semibold rounded-lg hover:bg-[var(--color-accent-hover)] transition-all"
            >
              Create Active Client
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
