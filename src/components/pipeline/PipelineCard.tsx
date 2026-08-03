import React from "react";
import { Building2, ChevronRight, UserCheck } from "lucide-react";
import { Client } from "../../types";
import { Avatar } from "../Avatar";
import { StageItem, analyzeClientStatus, fdShort, normalizeStatus, pn } from "../../lib/clientPipelineUtils";

interface PipelineCardProps {
  client: Client;
  isAdmin: boolean;
  docVault?: Record<string, any>;
  agentNames: string[];
  stages: StageItem[];
  onOpenClient: (id: string) => void;
  onUpdateClientStatus?: (id: string, status: any) => void;
  onUpdateClient?: (updatedClient: Client) => void;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({
  client: c,
  isAdmin,
  docVault,
  agentNames,
  stages,
  onOpenClient,
  onUpdateClientStatus,
  onUpdateClient
}) => {
  const analysis = analyzeClientStatus(c, docVault);
  const { primaryBadge, isStalledActive, hasOverdueFollowUp, isMissingDocs } = analysis;
  const beaconNum = pn(c.beacon);
  const currentBroker = c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner || "";
  const currentStageId = normalizeStatus(c.status);

  // Left accent border color based on urgency
  let borderLeftClass = "border-l-[var(--color-primary)] hover:border-[var(--color-accent)]/30";
  if (hasOverdueFollowUp) {
    borderLeftClass = "border-l-red-500 hover:border-red-500/40";
  } else if (isMissingDocs) {
    borderLeftClass = "border-l-orange-500 hover:border-orange-500/40";
  } else if (isStalledActive) {
    borderLeftClass = "border-l-amber-500 hover:border-amber-500/40";
  }

  return (
    <div
      onClick={() => onOpenClient(c.id)}
      draggable={isAdmin}
      onDragStart={(e) => {
        if (!isAdmin) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", c.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`p-3.5 rounded-xl border border-[var(--color-border)]/70 border-l-4 transition-all duration-200 ease-out cursor-pointer shadow-sm relative group/card bg-[var(--color-surface)] hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--color-border)] ${borderLeftClass}`}
    >
      {/* CARD TOP AREA */}
      <div className="flex justify-between items-start gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            first={c.first}
            last={c.last}
            name={`${c.first} ${c.last}`}
            size="sm"
            className="rounded-full shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-[var(--color-text)] truncate group-hover/card:text-[var(--color-accent)] transition-colors">
              {c.first} {c.last}
            </h5>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] text-[var(--color-text-muted)] font-extrabold truncate uppercase tracking-wider">
                {c.type || "Purchase"}
              </span>
              {c.lender && (
                <span className="text-[8px] font-bold text-blue-500/90 bg-blue-500/10 px-1.5 py-0.2 rounded flex items-center gap-0.5 truncate border border-blue-500/20" title={`Lender: ${c.lender}`}>
                  <Building2 className="w-2.5 h-2.5 shrink-0" /> {c.lender}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-xs font-mono font-black text-[var(--color-accent)] whitespace-nowrap shrink-0 mt-0.5">
          {(c.mtgamt || c.mortgageAmount) ? fdShort(pn(c.mtgamt || c.mortgageAmount)) : "—"}
        </div>
      </div>

      {/* CARD MIDDLE AREA: Single Primary Priority Badge + Credit/LTV Subrow */}
      <div className="mt-2.5 flex flex-col gap-1.5">
        {/* Primary Priority Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${primaryBadge.bgClass} ${primaryBadge.textClass} ${primaryBadge.borderClass}`}>
            <span>{primaryBadge.icon}</span>
            <span>{primaryBadge.label}</span>
          </span>

          {/* Beacon / LTV indicators */}
          {(c.beacon || c.propval) && (
            <div className="flex items-center gap-2 text-[9px] font-mono">
              {c.beacon && (
                <span className={`font-bold ${beaconNum >= 680 ? "text-[var(--color-success)]" : beaconNum >= 600 ? "text-[var(--color-warning)]" : "text-[var(--color-error)]"}`}>
                  B:{c.beacon}
                </span>
              )}
              {pn(c.propval) > 0 && (
                <span className="text-[var(--color-text-faint)] font-bold">
                  LTV:{((pn(c.mtgamt || c.mortgageAmount) / pn(c.propval)) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CARD LOWER AREA: Operational Controls */}
      <div className="flex justify-between items-center text-[10px] border-t border-[var(--color-divider)]/60 pt-2 mt-2.5">
        
        {/* Broker Reassignment */}
        <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          {isAdmin && onUpdateClient ? (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[8px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider shrink-0">Broker:</span>
              <select
                value={currentBroker}
                onChange={(e) => {
                  onUpdateClient({ ...c, assignedBroker: e.target.value });
                }}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] max-w-[90px] truncate"
              >
                <option value="">Unassigned</option>
                {agentNames.map((a, i) => (
                  <option key={i} value={a}>{a}</option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-[9px] text-[var(--color-text-muted)] font-semibold truncate flex items-center gap-1">
              <UserCheck className="w-2.5 h-2.5 text-[var(--color-accent)]" /> {currentBroker || "Unassigned"}
            </span>
          )}
        </div>

        {/* Quick Stage Change or Open Cue */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isAdmin && onUpdateClientStatus ? (
            <select
              value={currentStageId}
              onChange={(e) => onUpdateClientStatus(c.id, e.target.value)}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
            >
              {stages.map(st => (
                <option key={st.id} value={st.id}>{st.label}</option>
              ))}
            </select>
          ) : (
            <button 
              onClick={() => onOpenClient(c.id)}
              className="text-[9px] font-bold text-[var(--color-accent)] hover:underline flex items-center gap-0.5"
            >
              Open <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
