import React from "react";
import { AlertCircle, Layers } from "lucide-react";
import { Client } from "../../types";
import { StageItem, analyzeClientStatus, fdShort, normalizeStatus, pn } from "../../lib/clientPipelineUtils";
import { PipelineCard } from "./PipelineCard";

interface PipelineColumnProps {
  stage: StageItem;
  clients: Client[];
  isAdmin: boolean;
  docVault?: Record<string, any>;
  agentNames: string[];
  stages: StageItem[];
  dragOverColumn: string | null;
  setDragOverColumn: (id: string | null) => void;
  onOpenClient: (id: string) => void;
  onUpdateClientStatus?: (id: string, status: any) => void;
  onUpdateClient?: (updatedClient: Client) => void;
  totalPipelineVolume: number;
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({
  stage,
  clients: stageClients,
  isAdmin,
  docVault,
  agentNames,
  stages,
  dragOverColumn,
  setDragOverColumn,
  onOpenClient,
  onUpdateClientStatus,
  onUpdateClient,
  totalPipelineVolume
}) => {
  // Calculate column totals and attention metrics
  let totalVol = 0;
  let overdueCount = 0;
  let stalledCount = 0;
  let missingDocsCount = 0;

  stageClients.forEach(c => {
    totalVol += pn(c.mtgamt || c.mortgageAmount);
    const analysis = analyzeClientStatus(c, docVault);
    if (analysis.hasOverdueFollowUp) overdueCount++;
    if (analysis.isStalledActive) stalledCount++;
    if (analysis.isMissingDocs) missingDocsCount++;
  });

  const totalAttention = overdueCount + stalledCount + missingDocsCount;
  const volPct = totalPipelineVolume > 0 ? ((totalVol / totalPipelineVolume) * 100).toFixed(0) : "0";
  const isDropTarget = dragOverColumn === stage.id;

  return (
    <div
      onDragOver={(e) => {
        if (!isAdmin) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverColumn !== stage.id) {
          setDragOverColumn(stage.id);
        }
      }}
      onDragLeave={(e) => {
        if (!isAdmin) return;
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOverColumn(null);
      }}
      onDrop={(e) => {
        if (!isAdmin || !onUpdateClientStatus) return;
        e.preventDefault();
        setDragOverColumn(null);
        const clientId = e.dataTransfer.getData("text/plain");
        if (clientId) {
          onUpdateClientStatus(clientId, stage.id);
        }
      }}
      className={`w-full rounded-2xl border transition-all duration-200 bg-[var(--color-surface-2)]/30 p-4 ${
        isDropTarget 
          ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 bg-[var(--color-accent-subtle)]/30 shadow-md" 
          : "border-[var(--color-border)]/70 hover:border-[var(--color-border)]"
      }`}
    >
      {/* STAGE HEADER ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[var(--color-divider)]">
        
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <span 
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: stage.color }}
          />
          <h4 className="text-base font-extrabold text-[var(--color-text)] tracking-tight">
            {stage.label}
          </h4>

          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs font-mono font-black bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-full text-[var(--color-text)] shadow-2xs">
              {stageClients.length} {stageClients.length === 1 ? 'file' : 'files'}
            </span>

            {totalAttention > 0 && (
              <span 
                className="text-[10px] font-black bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
                title={`${totalAttention} files require attention in this stage`}
              >
                <AlertCircle className="w-3 h-3" />
                {totalAttention} Need Action
              </span>
            )}
          </div>
        </div>

        {/* Stage Volume & Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--color-surface)] px-3 py-1 rounded-xl border border-[var(--color-border)]/60 shadow-2xs">
            <span className="text-xs font-mono font-black text-[var(--color-accent)] tracking-tight">
              {fdShort(totalVol)}
            </span>
            <span className="text-[10px] text-[var(--color-text-faint)] font-bold border-l border-[var(--color-divider)] pl-2">
              {volPct}% vol
            </span>
          </div>

          {/* Attention Breakdown Badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            {overdueCount > 0 && (
              <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20" title={`${overdueCount} overdue follow-ups`}>
                📅 {overdueCount} Overdue
              </span>
            )}
            {missingDocsCount > 0 && (
              <span className="text-[9px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20" title={`${missingDocsCount} missing docs`}>
                ⚠️ {missingDocsCount} Missing Docs
              </span>
            )}
            {stalledCount > 0 && (
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20" title={`${stalledCount} stalled files (>14d)`}>
                ⏳ {stalledCount} Idle
              </span>
            )}
            {totalAttention === 0 && stageClients.length > 0 && (
              <span className="text-[9px] font-bold text-[var(--color-text-faint)] uppercase tracking-wider bg-[var(--color-surface)] px-2 py-0.5 rounded-lg border border-[var(--color-border)]/50">
                ✓ On Track
              </span>
            )}
          </div>
        </div>

      </div>

      {/* CARDS GRID: Stacked vertically stage-by-stage with responsive card grid */}
      <div>
        {stageClients.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-6 rounded-xl border border-dashed transition-all text-center py-8 ${
            isDropTarget 
              ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]/20 text-[var(--color-accent)]" 
              : "border-[var(--color-border)]/60 bg-[var(--color-surface)]/20 text-[var(--color-text-faint)]"
          }`}>
            <Layers className="w-5 h-5 mb-1 opacity-50" />
            <span className="text-xs font-bold">
              {isDropTarget ? "Release to move client to this stage" : `No files in ${stage.label}`}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {stageClients.map((c) => (
              <PipelineCard
                key={c.id}
                client={c}
                isAdmin={isAdmin}
                docVault={docVault}
                agentNames={agentNames}
                stages={stages}
                onOpenClient={onOpenClient}
                onUpdateClientStatus={onUpdateClientStatus}
                onUpdateClient={onUpdateClient}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
