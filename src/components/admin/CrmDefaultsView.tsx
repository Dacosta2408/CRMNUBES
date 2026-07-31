import React, { useState } from "react";
import { Sliders, Settings2, CheckCircle2, ToggleLeft, ToggleRight, FileText, UserCheck, ShieldCheck } from "lucide-react";
import { User } from "../../types";
import { safeJsonParse } from "../../lib/json";

interface CrmDefaultsViewProps {
  userRoster: User[];
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  logActivity?: (action: string, details: string) => void;
}

export const CrmDefaultsView: React.FC<CrmDefaultsViewProps> = ({
  userRoster,
  currentUser,
  showToast,
  logActivity
}) => {
  const [pipelineLabels, setPipelineLabels] = useState(() => {
    const saved = localStorage.getItem("gbk_pipeline_labels");
    return safeJsonParse(saved, {
      lead: "New Leads / Ingestion",
      open: "Active Files / Drafting",
      working: "Broker Audit & GDS/TDS Check",
      lender: "Submitted to Lender",
      conditional: "Conditional Approval",
      approved: "Approved & Commitment",
      funded: "Funded Transactions",
      closed: "Archived / Closed"
    });
  });

  const [defaultSource, setDefaultSource] = useState(() => localStorage.getItem("gbk_default_source") || "AI Ingestion Portal");
  const [defaultAgentId, setDefaultAgentId] = useState(() => localStorage.getItem("gbk_default_agent_id") || currentUser.id);
  const [require90DayBank, setRequire90DayBank] = useState(() => localStorage.getItem("gbk_require_90_day_bank") !== "false");
  const [requireTaxBill, setRequireTaxBill] = useState(() => localStorage.getItem("gbk_require_tax_bill") !== "false");
  const [requireApsPurchase, setRequireApsPurchase] = useState(() => localStorage.getItem("gbk_require_aps_purchase") !== "false");

  const handlePipelineLabelChange = (stageKey: string, val: string) => {
    setPipelineLabels((prev: any) => ({
      ...prev,
      [stageKey]: val
    }));
  };

  const handleSaveCRMDefaults = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem("gbk_pipeline_labels", JSON.stringify(pipelineLabels));
    localStorage.setItem("gbk_default_source", defaultSource);
    localStorage.setItem("gbk_default_agent_id", defaultAgentId);
    localStorage.setItem("gbk_require_90_day_bank", require90DayBank ? "true" : "false");
    localStorage.setItem("gbk_require_tax_bill", requireTaxBill ? "true" : "false");
    localStorage.setItem("gbk_require_aps_purchase", requireApsPurchase ? "true" : "false");

    if (logActivity) {
      logActivity("Updated CRM Defaults", "Modified pipeline stage labels and document intake requirements.");
    }

    showToast("CRM organizational configurations updated globally!", "success", "⚙️");
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[var(--color-accent)]" /> CRM Pipeline &amp; Intake Defaults
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Configure global brokerage default stage labels, default assigned agents, ingestion sources, and document checklist rules.
          </p>
        </div>

        <div className="space-y-6">
          {/* Pipeline Stage Renaming */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              Pipeline Board Stage Labels
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
              {Object.keys(pipelineLabels).map((key) => (
                <div key={key}>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                    {key} Stage Label
                  </label>
                  <input
                    type="text"
                    value={pipelineLabels[key]}
                    onChange={(e) => handlePipelineLabelChange(key, e.target.value)}
                    className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Ingestion & Allocation Defaults */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              Ingestion &amp; Allocation Defaults
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
              <div>
                <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Default Assigned Broker
                </label>
                <select
                  value={defaultAgentId}
                  onChange={(e) => setDefaultAgentId(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 cursor-pointer"
                >
                  {userRoster.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first} {u.last} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider mb-1">
                  Default Ingestion Source Label
                </label>
                <input
                  type="text"
                  value={defaultSource}
                  onChange={(e) => setDefaultSource(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                />
              </div>
            </div>
          </div>

          {/* Checklist Rules Defaults */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              Intake Document Rules Checklist
            </span>
            <div className="bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70 space-y-3.5 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[var(--color-text)] block">Require 90-Day Bank Statement Ledger</span>
                  <span className="text-[9px] block">Include down payment ledger trigger on all new purchases automatically.</span>
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
                  <span className="text-[9px] block">Trigger property tax bill verification for all refinance intakes.</span>
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
                  <span className="text-[9px] block">Enforce APS document slot immediately on purchase client setup.</span>
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
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSaveCRMDefaults()}
            className="w-full py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-lg hover:bg-[var(--color-accent-hover)] transition-all uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Save Corporate Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
