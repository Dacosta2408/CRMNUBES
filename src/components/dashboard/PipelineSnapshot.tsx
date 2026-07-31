import React, { useState } from "react";
import { TrendingUp, BarChart3, Layers, DollarSign, Filter, Users } from "lucide-react";
import { Client, User } from "../../types";

interface PipelineSnapshotProps {
  clients: Client[];
  currentUser: User;
  setActiveTab: (tab: string) => void;
  onOpenClient: (id: string) => void;
}

const STAGES = [
  { id: "open", label: "New/Open", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", progressColor: "bg-blue-500" },
  { id: "working", label: "Working", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", progressColor: "bg-purple-500" },
  { id: "lender", label: "At Lender", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", progressColor: "bg-orange-500" },
  { id: "conditional", label: "Conditional", color: "bg-red-500/10 text-red-400 border-red-500/20", progressColor: "bg-red-500" },
  { id: "approved", label: "Approved", color: "bg-green-500/10 text-green-400 border-green-500/20", progressColor: "bg-green-500" },
  { id: "funded", label: "Funded", color: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20", progressColor: "bg-[var(--color-accent)]" }
];

export const PipelineSnapshot: React.FC<PipelineSnapshotProps> = ({
  clients,
  currentUser,
  setActiveTab,
  onOpenClient
}) => {
  const isManager = ["Developer/Admin", "Admin"].includes(currentUser.role);
  const userFullName = `${currentUser.first} ${currentUser.last}`;

  const [pipelineMode, setPipelineMode] = useState<"personal" | "team">(isManager ? "team" : "personal");

  const targetClients = pipelineMode === "personal" 
    ? clients.filter(c => c.agent === userFullName) 
    : clients;

  const activeFiles = targetClients.filter(c => c.status !== "closed");
  const totalPipelineVolume = activeFiles.reduce((sum, c) => sum + (parseFloat(String(c.mtgamt).replace(/[$,\s]/g, "")) || 0), 0);

  const fdShort = (n: number) => {
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
    return "$" + n;
  };

  const fd = (n: any) => {
    return "$" + Math.round(parseFloat(String(n).replace(/[$,\s]/g, "")) || 0).toLocaleString("en-CA");
  };

  const highValueDeals = [...activeFiles]
    .filter(c => c.status !== "funded")
    .sort((a, b) => {
      const volA = parseFloat(String(a.mtgamt).replace(/[$,\s]/g, "")) || 0;
      const volB = parseFloat(String(b.mtgamt).replace(/[$,\s]/g, "")) || 0;
      return volB - volA;
    })
    .slice(0, 4);

  const clearedLender = targetClients.filter(c => ["conditional", "approved", "funded"].includes(c.status)).length;
  const totalActive = targetClients.filter(c => c.status !== "closed").length;
  const progressionRate = totalActive > 0 ? Math.round((clearedLender / totalActive) * 100) : 0;

  return (
    <div className="glass-card shadow-md p-5 flex flex-col gap-5 select-none" id="pipeline-snapshot">
      
      {/* Header section styled with deep gradient bar */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/10 shadow-inner"
        style={{ background: "var(--grad-sidebar)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/5 rounded-lg text-white">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Pipeline progression overview</h3>
            <p className="text-[10px] text-white/60 mt-0.5 font-bold leading-none">
              Live progression of active broker folders and team volume metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right shrink-0">
            <div className="text-[9px] text-white/55 uppercase tracking-wider font-extrabold leading-none">Total Pipeline Vol</div>
            <div className="text-xs font-black text-white font-mono mt-1">{fd(totalPipelineVolume)}</div>
          </div>

          {isManager && (
            <div className="bg-[var(--color-bg)]/50 border border-[var(--color-border)] rounded-full p-0.5 flex">
              <button
                onClick={() => setPipelineMode("personal")}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all duration-200 cursor-pointer ${pipelineMode === "personal" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "text-white/60 hover:text-white"}`}
              >
                My Volume
              </button>
              <button
                onClick={() => setPipelineMode("team")}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all duration-200 cursor-pointer flex items-center gap-1 ${pipelineMode === "team" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "text-white/60 hover:text-white"}`}
              >
                <Users className="w-3 h-3" /> Team
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: left part (the progress bars), right part (top deals checklist) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stages Visualization (Left 2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {STAGES.map((s) => {
              const stageFiles = targetClients.filter(c => c.status === s.id);
              const stageValue = stageFiles.reduce((sum, c) => sum + (parseFloat(String(c.mtgamt).replace(/[$,\s]/g, "")) || 0), 0);
              const percent = totalPipelineVolume > 0 ? (stageValue / totalPipelineVolume) * 100 : 0;
              
              return (
                <div 
                  key={s.id}
                  onClick={() => {
                    localStorage.setItem("gbk_pipeline_filter_stage", s.id);
                    setActiveTab("pipeline");
                  }}
                  className="glass-card p-3 flex flex-col justify-between hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)]/45 transition-all duration-200 cursor-pointer relative overflow-hidden group shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border self-start ${s.color}`}>
                      {s.label}
                    </span>
                    <span className="text-xl font-black mt-1 text-[var(--color-text)] group-hover:text-[var(--color-accent)] origin-left transition-colors duration-200">
                      {stageFiles.length}
                    </span>
                  </div>
                  
                  <div className="mt-2.5">
                    <div className="text-[10px] font-bold font-mono text-[var(--color-text-muted)]">
                      {fdShort(stageValue)}
                    </div>
                    <div className="text-[9px] text-[var(--color-text-faint)] mt-0.5 font-bold">
                      {percent.toFixed(0)}% of total
                    </div>
                  </div>

                  {/* Micro bottom progress bar bar */}
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/5">
                    <div 
                       className={`h-full ${s.progressColor}`} 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple funnel progression analytics indicator */}
          <div 
            className="rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)"
            }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[var(--color-text)] font-bold">Active Loan Progression Index:</span>
              <span className="text-[var(--color-text-muted)] font-medium">{progressionRate}% of active files have cleared lender submission stage.</span>
            </div>
            <button 
              onClick={() => setActiveTab("pipeline")}
              className="text-[10px] font-black text-[var(--color-accent)] hover:underline uppercase tracking-tight shrink-0"
            >
              Pipeline Board &rarr;
            </button>
          </div>
        </div>

        {/* High Value Target Deals (Right col) */}
        <div className="glass-card p-4.5 flex flex-col justify-between gap-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
              <span>💎 High-Value Active Targets</span>
            </h4>
            <p className="text-[9px] text-[var(--color-text-faint)] mt-0.5 font-bold">
              Top financial files currently under progression
            </p>
          </div>

          <div className="flex flex-col gap-2.5 flex-1 mt-1">
            {highValueDeals.length > 0 ? (
              highValueDeals.map((deal) => {
                const mtgAmt = parseFloat(String(deal.mtgamt).replace(/[$,\s]/g, "")) || 0;
                return (
                  <div 
                    key={deal.id}
                    onClick={() => onOpenClient(deal.id)}
                    className="p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between gap-2 group hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)]/50"
                    style={{
                      background: "var(--glass-bg)",
                      border: "1px solid var(--glass-border)"
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                        {deal.first} {deal.last}
                      </div>
                      <div className="text-[9px] text-[var(--color-text-faint)] truncate mt-0.5 font-bold uppercase tracking-wider">
                        {deal.status} • {deal.agent || "Unassigned"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[var(--color-text)] font-mono">{fd(mtgAmt)}</div>
                      <div className="text-[8px] text-[var(--color-text-faint)] truncate uppercase tracking-wider font-extrabold">{deal.type || "Purchase"}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-xs text-[var(--color-text-faint)] italic font-bold">
                No active files in pipeline
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
