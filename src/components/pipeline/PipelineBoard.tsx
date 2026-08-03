import React, { useMemo } from "react";
import { 
  AlertCircle, ArrowUpDown, CheckCircle2, 
  Filter, Layers, TrendingUp 
} from "lucide-react";
import { Client } from "../../types";
import { 
  StageItem, analyzeClientStatus, calculatePipelineMetrics, fdShort, normalizeStatus, pn 
} from "../../lib/clientPipelineUtils";
import { PipelineColumn } from "./PipelineColumn";

interface PipelineBoardProps {
  clients: Client[];
  isAdmin: boolean;
  docVault?: Record<string, any>;
  agentNames: string[];
  stages: StageItem[];
  pipelineSortBy: 'updated' | 'amount' | 'beacon' | 'followUp';
  setPipelineSortBy: (val: 'updated' | 'amount' | 'beacon' | 'followUp') => void;
  pipelineAlertFilter: 'all' | 'attention' | 'overdue' | 'stalled' | 'missingDocs';
  setPipelineAlertFilter: (val: 'all' | 'attention' | 'overdue' | 'stalled' | 'missingDocs') => void;
  dragOverColumn: string | null;
  setDragOverColumn: (id: string | null) => void;
  onOpenClient: (id: string) => void;
  onUpdateClientStatus?: (id: string, status: any) => void;
  onUpdateClient?: (updatedClient: Client) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  clients,
  isAdmin,
  docVault,
  agentNames,
  stages,
  pipelineSortBy,
  setPipelineSortBy,
  pipelineAlertFilter,
  setPipelineAlertFilter,
  dragOverColumn,
  setDragOverColumn,
  onOpenClient,
  onUpdateClientStatus,
  onUpdateClient
}) => {
  // Global pipeline summary across all pipeline clients
  const metrics = useMemo(() => {
    return calculatePipelineMetrics(clients, docVault);
  }, [clients, docVault]);

  // Group clients by stage with status normalization & apply stage sorting
  const stageMap = useMemo(() => {
    const map: Record<string, Client[]> = {};
    stages.forEach(s => {
      map[s.id] = [];
    });

    clients.forEach(c => {
      const normStatus = normalizeStatus(c.status);
      if (map[normStatus]) {
        map[normStatus].push(c);
      } else {
        map["lead"].push(c);
      }
    });

    // Sort each stage
    Object.keys(map).forEach(st => {
      map[st].sort((a, b) => {
        if (pipelineSortBy === "updated") {
          const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return tB - tA;
        }
        if (pipelineSortBy === "amount") {
          return pn(b.mtgamt || b.mortgageAmount) - pn(a.mtgamt || a.mortgageAmount);
        }
        if (pipelineSortBy === "beacon") {
          return pn(b.beacon) - pn(a.beacon);
        }
        if (pipelineSortBy === "followUp") {
          if (!a.nextFollowUpDate) return 1;
          if (!b.nextFollowUpDate) return -1;
          return new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime();
        }
        return 0;
      });
    });

    return map;
  }, [clients, stages, pipelineSortBy]);

  return (
    <div className="flex flex-col gap-5 overflow-y-auto max-h-full pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      
      {/* TOP PIPELINE METRICS KPI HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        {/* Active Volume */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Pipeline Volume
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-mono font-black text-[var(--color-text)] tracking-tight">
              {fdShort(metrics.totalVolume)}
            </div>
            <div className="text-[10px] text-[var(--color-text-faint)] font-bold mt-0.5">
              {metrics.activeFilesCount} active mortgage files
            </div>
          </div>
        </div>

        {/* Approved / Funded Vol */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Approved & Funded
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--color-success-subtle)] text-[var(--color-success)]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-mono font-black text-[var(--color-success)] tracking-tight">
              {fdShort(metrics.approvedFundedVol)}
            </div>
            <div className="text-[10px] text-[var(--color-text-faint)] font-bold mt-0.5">
              Secured lender approvals
            </div>
          </div>
        </div>

        {/* Attention Needed */}
        <div className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between transition-colors ${
          metrics.attentionCount > 0 
            ? "bg-amber-500/5 border-amber-500/30" 
            : "bg-[var(--color-surface)] border border-[var(--color-border)]"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Attention Needed
            </span>
            <div className={`p-1.5 rounded-lg ${
              metrics.attentionCount > 0 ? "bg-amber-500/20 text-amber-500" : "bg-[var(--color-surface-2)] text-[var(--color-text-faint)]"
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-xl font-mono font-black tracking-tight ${metrics.attentionCount > 0 ? "text-amber-500" : "text-[var(--color-text)]"}`}>
              {metrics.attentionCount} Files
            </div>
            <div className="text-[10px] text-[var(--color-text-faint)] font-bold mt-0.5">
              Overdue, stalled, or missing docs
            </div>
          </div>
        </div>

        {/* Total Active Count */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Total Clients
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--color-info-subtle)] text-[var(--color-info)]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-mono font-black text-[var(--color-text)] tracking-tight">
              {clients.length} Records
            </div>
            <div className="text-[10px] text-[var(--color-text-faint)] font-bold mt-0.5">
              Matching search & advisor filters
            </div>
          </div>
        </div>

      </div>

      {/* PIPELINE TOOLBAR & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs">
        
        {/* Left: Quick Alert Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-extrabold uppercase text-[var(--color-text-faint)] tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Quick Filter:
          </span>

          <button
            onClick={() => setPipelineAlertFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              pipelineAlertFilter === 'all'
                ? "bg-[var(--color-accent)] text-white shadow-sm"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]"
            }`}
          >
            All Files
          </button>

          <button
            onClick={() => setPipelineAlertFilter('attention')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              pipelineAlertFilter === 'attention'
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-amber-500 border border-[var(--color-border)]"
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            Requires Attention
          </button>

          <button
            onClick={() => setPipelineAlertFilter('overdue')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              pipelineAlertFilter === 'overdue'
                ? "bg-red-500 text-white shadow-sm"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-red-500 border border-[var(--color-border)]"
            }`}
          >
            📅 Overdue
          </button>

          <button
            onClick={() => setPipelineAlertFilter('missingDocs')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              pipelineAlertFilter === 'missingDocs'
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-orange-500 border border-[var(--color-border)]"
            }`}
          >
            ⚠️ Missing Docs
          </button>

          <button
            onClick={() => setPipelineAlertFilter('stalled')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              pipelineAlertFilter === 'stalled'
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-amber-600 border border-[var(--color-border)]"
            }`}
          >
            ⏳ Idle 14d+
          </button>
        </div>

        {/* Right: Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase text-[var(--color-text-faint)] tracking-wider flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" /> Sort Cards:
          </span>
          <select
            value={pipelineSortBy}
            onChange={(e) => setPipelineSortBy(e.target.value as any)}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-1 text-xs font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
          >
            <option value="updated">Recently Updated</option>
            <option value="amount">Highest Mortgage Amount</option>
            <option value="beacon">Beacon Score (High-Low)</option>
            <option value="followUp">Next Follow-up Date</option>
          </select>
        </div>

      </div>

      {/* VERTICALLY STACKED STAGE SECTIONS */}
      <div className="flex flex-col gap-4">
        {stages.map((st) => (
          <PipelineColumn
            key={st.id}
            stage={st}
            clients={stageMap[st.id] || []}
            isAdmin={isAdmin}
            docVault={docVault}
            agentNames={agentNames}
            stages={stages}
            dragOverColumn={dragOverColumn}
            setDragOverColumn={setDragOverColumn}
            onOpenClient={onOpenClient}
            onUpdateClientStatus={onUpdateClientStatus}
            onUpdateClient={onUpdateClient}
            totalPipelineVolume={metrics.totalVolume}
          />
        ))}
      </div>

    </div>
  );
};
