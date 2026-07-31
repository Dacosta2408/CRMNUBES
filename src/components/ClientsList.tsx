import React, { useState } from "react";
import { 
  Plus, Search, ArrowRight, UserCheck, Calendar, Filter, 
  MapPin, Landmark, BadgePercent, ShieldAlert, BadgeInfo 
} from "lucide-react";
import { Client, Lender, User } from "../types";

interface ClientsListProps {
  clients: Client[];
  lenders: Lender[];
  onOpenClient: (id: string) => void;
  onAddClient: () => void;
  onOpenAIIntake: () => void;
  onOpenNewClientIntake: () => void;
  viewMode: 'database' | 'pipeline';
  setViewMode: (mode: 'database' | 'pipeline') => void;
  agentNames: string[];
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  docVault?: Record<string, any>;
  onUpdateClientStatus?: (id: string, status: any) => void;
  currentUser?: User;
  onUpdateClient?: (updatedClient: Client) => void;
}

export const ClientsList: React.FC<ClientsListProps> = ({
  clients,
  lenders,
  onOpenClient,
  onAddClient,
  onOpenAIIntake,
  onOpenNewClientIntake,
  viewMode,
  setViewMode,
  agentNames,
  searchQuery,
  onSearchQueryChange,
  docVault,
  onUpdateClientStatus,
  currentUser,
  onUpdateClient
}) => {
  const isAdmin = currentUser 
    ? (currentUser.role === "Developer/Admin" || currentUser.role === "Admin" || currentUser.isOwner === true) 
    : true;

  const [dbFilter, setDbFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [localSearchQuery, setLocalSearchQuery] = useState<string>("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const activeSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
  const handleSearchChange = onSearchQueryChange || setLocalSearchQuery;

  const pn = (s: any) => {
    if (!s) return 0;
    return parseFloat(String(s).replace(/[$,\s]/g, "")) || 0;
  };

  const fd = (n: number) => {
    return "$" + Math.round(n).toLocaleString("en-CA");
  };

  const fdShort = (val: number) => {
    if (val >= 1000000) return "$" + (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return "$" + Math.round(val / 1000) + "k";
    return "$" + Math.round(val);
  };

  const calculateRatios = (c: Client) => {
    const inc = pn(c.income) + pn(c.coIncome);
    const mtg = pn(c.mtgamt);
    const pmt = mtg ? (mtg * (0.0525 / 12) * Math.pow(1 + 0.0525 / 12, 300)) / (Math.pow(1 + 0.0525 / 12, 300) - 1) : 0; 
    const tax = pn(c.tax) / 12;
    const condo = pn(c.condo);
    const heat = pn(c.heat) || 150;
    const gds = inc > 0 ? ((pmt + tax + condo + heat) / (inc / 12) * 100) : 0;
    return gds;
  };

  const filterList = () => {
    let list = [...clients];
    if (dbFilter !== "all") {
      list = list.filter(c => c.status === dbFilter);
    }
    if (agentFilter) {
      list = list.filter(c => (c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner) === agentFilter);
    }
    if (activeSearchQuery.trim()) {
      const q = activeSearchQuery.toLowerCase();
      list = list.filter(c => 
        (c.first + " " + c.last).toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.cell || "").includes(q) ||
        (c.addr || "").toLowerCase().includes(q) ||
        (c.lender || "").toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredClients = filterList();

  const getPipelineClients = () => {
    let list = [...clients];
    if (agentFilter) {
      list = list.filter(c => (c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner) === agentFilter);
    }
    if (activeSearchQuery.trim()) {
      const q = activeSearchQuery.toLowerCase();
      list = list.filter(c => 
        (c.first + " " + c.last).toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.cell || "").includes(q) ||
        (c.addr || "").toLowerCase().includes(q) ||
        (c.lender || "").toLowerCase().includes(q)
      );
    }
    return list;
  };

  const STAGES = [
    { 
      id: "lead", 
      label: "Leads", 
      color: "var(--color-primary)", 
      style: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 shadow-sm" 
    },
    { 
      id: "open", 
      label: "New/Open", 
      color: "var(--color-info)", 
      style: "bg-[var(--color-info-subtle)] text-[var(--color-info)] border border-[var(--color-info)]/20 shadow-sm" 
    },
    { 
      id: "working", 
      label: "Working", 
      color: "var(--color-warning)", 
      style: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[var(--color-warning)]/20 shadow-sm" 
    },
    { 
      id: "lender", 
      label: "Submissions", 
      color: "var(--color-primary-hover)", 
      style: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] border border-[var(--color-primary-hover)]/20 shadow-sm" 
    },
    { 
      id: "conditional", 
      label: "Conditional", 
      color: "var(--color-error)", 
      style: "bg-[var(--color-error-subtle)] text-[var(--color-error)] border border-[var(--color-error)]/20 shadow-sm" 
    },
    { 
      id: "approved", 
      label: "Approved", 
      color: "var(--color-success)", 
      style: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border border-[var(--color-success)]/20 shadow-sm" 
    },
    { 
      id: "funded", 
      label: "Funded", 
      color: "var(--color-accent)", 
      style: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm" 
    },
    {
      id: "closed",
      label: "Closed",
      color: "#64748b",
      style: "bg-slate-500/10 text-slate-500 border border-slate-500/20 shadow-sm"
    }
  ];

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden select-none">
      
      {/* Header bar and sub tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="flex bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-full p-1 select-none self-start backdrop-blur-md">
          <button 
            onClick={() => setViewMode("database")}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-tight rounded-full transition-all duration-200 cursor-pointer ${viewMode === "database" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-blue-500/5"}`}
          >
            📋 Directory Table
          </button>
          <button 
            onClick={() => setViewMode("pipeline")}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-tight rounded-full transition-all duration-200 cursor-pointer ${viewMode === "pipeline" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-blue-500/5"}`}
          >
            📊 Stages
          </button>
        </div>

        {/* Global search */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          <div 
            className="px-3.5 py-1.5 flex items-center gap-2 w-full sm:w-60 transition-all duration-300 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 hover:border-[var(--color-accent)]/30 focus-within:border-[var(--color-accent)]/50 focus-within:shadow-[0_0_12px_var(--color-accent-subtle)]"
          >
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search clients, lender…" 
              value={activeSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-transparent border-none text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-90 focus:outline-none w-full font-medium"
            />
          </div>

          <div className="px-3.5 py-1.5 flex items-center gap-2 transition-all duration-300 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 hover:border-[var(--color-accent)]/30 focus-within:border-[var(--color-accent)]/50">
            <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <select 
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-[var(--color-text-muted)] focus:outline-none cursor-pointer font-bold"
            >
              <option value="" className="bg-[var(--color-surface-2)] text-[var(--color-text)]">All Advisors</option>
              {agentNames.map((name, i) => (
                <option key={`${name}-${i}`} value={name} className="bg-[var(--color-surface-2)] text-[var(--color-text)]">{name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={onOpenNewClientIntake}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 hover:bg-blue-500/5 hover:text-blue-600 hover:border-blue-500/20 text-[var(--color-text)] shadow-sm hover:shadow-md"
          >
            ✦ Intake (PDF)
          </button>

          <button 
            onClick={onOpenAIIntake}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full text-[var(--color-text-inverse)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
          >
            ✦ AI Extraction
          </button>

          <button 
            onClick={onAddClient}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-extrabold text-[var(--color-text-inverse)] transition-all cursor-pointer hover:shadow-md hover:opacity-95 active:scale-95 duration-200"
            style={{
              background: "var(--grad-warm-highlight)",
              borderRadius: "999px"
            }}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Client
          </button>
        </div>
      </div>

      {/* Database Mode View */}
      {viewMode === "database" ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden">
          
          {/* Quick Filters */}
          <div className="p-3 border-b flex flex-wrap items-center gap-1.5 bg-[var(--color-surface-2)]/95 backdrop-blur-sm select-none" style={{ borderBottomColor: "var(--color-divider)" }}>
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase font-extrabold tracking-widest pl-2">Filter Stage:</span>
            {[
              { id: "all", label: "All Files" },
              { id: "lead", label: "Leads" },
              { id: "open", label: "Open" },
              { id: "working", label: "Working" },
              { id: "lender", label: "At Lender" },
              { id: "conditional", label: "Conditional" },
              { id: "approved", label: "Approved" },
              { id: "funded", label: "Funded" },
              { id: "closed", label: "Closed" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDbFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
                  dbFilter === f.id 
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 shadow-sm font-extrabold" 
                    : "bg-transparent text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)] hover:bg-blue-500/5 dark:hover:bg-blue-400/5"
                }`}
              >
                {f.label}
              </button>
            ))}

            <span className="text-xs text-[var(--color-text-faint)] font-bold border-l border-[var(--color-divider)] pl-3 ml-auto mr-1">{filteredClients.length} clients</span>
          </div>

          {/* Grid table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-[var(--color-surface-2)]/95 backdrop-blur-md text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider sticky top-0 z-10" style={{ borderBottomColor: "var(--color-divider)" }}>
                  <th className="p-3.5 pl-6">Profile</th>
                  <th className="p-3.5">Goal Type</th>
                  <th className="p-3.5">Filing Stage</th>
                  <th className="p-3.5">Requested</th>
                  <th className="p-3.5">Lender</th>
                  <th className="p-3.5">Estimated LTV</th>
                  <th className="p-3.5">Beacon Credit</th>
                  <th className="p-3.5">Estimated GDS</th>
                  <th className="p-3.5">Lead Advisor</th>
                  <th className="p-3.5 text-right pr-6">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-divider)]">
                {filteredClients.length > 0 ? (
                  filteredClients.map((c, i) => {
                    const avatar = (c.first[0] + c.last[0]).toUpperCase();
                    const ltv = pn(c.propval) > 0 ? (pn(c.mtgamt) / pn(c.propval) * 100) : 0;
                    const gds = calculateRatios(c);
                    const matchingStage = STAGES.find(s => s.id === c.status);
                    
                    const updateTime = new Date(c.updatedAt || c.createdAt).getTime();
                    const staleThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
                    const isStale = (c.status !== "funded" && c.status !== "closed") && (updateTime < staleThreshold);

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => onOpenClient(c.id)}
                        className="transition-all duration-150 cursor-pointer group bg-transparent hover:bg-blue-500/5 dark:hover:bg-blue-400/10 border-b border-[var(--color-divider)]"
                      >
                        <td className="p-3.5 pl-6 flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] text-[var(--color-text-inverse)] shadow-sm"
                            style={{ background: "var(--color-primary)" }}
                          >
                            {avatar}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">{c.first} {c.last}</span>
                              {isStale && (
                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--color-warning)] text-[var(--color-text-inverse)] shadow-sm animate-pulse">
                                  Stale
                                </span>
                              )}
                              {(() => {
                                if (c.nextFollowUpDate) {
                                  const hasOverdueFollowUp = new Date(c.nextFollowUpDate) < new Date();
                                  if (hasOverdueFollowUp) {
                                    return (
                                      <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500 text-white shadow-sm animate-pulse" title={`Overdue follow-up was scheduled for ${c.nextFollowUpDate}`}>
                                        ⚠️ Overdue
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm" title={`Scheduled follow-up date`}>
                                        📅 {c.nextFollowUpDate}
                                      </span>
                                    );
                                  }
                                }
                                return null;
                              })()}
                            </div>
                            {c.cell && <div className="text-[10px] text-[var(--color-text-muted)] font-extrabold">{c.cell}</div>}
                          </div>
                        </td>
                        <td className="p-3.5 text-xs text-[var(--color-text-muted)] font-semibold">{c.type || "Purchase"}</td>
                        <td className="p-3.5 text-xs">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              matchingStage ? matchingStage.style : "bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-sm"
                             }`}>
                              {matchingStage ? matchingStage.label : c.status}
                            </span>
                            {/* Document counts / completeness derived if docVault is available */}
                            {docVault && (() => {
                              const clientDocs = docVault[c.id] || {};
                              const docs = Object.values(clientDocs) as any[];
                              const approvedCount = docs.filter(d => d.status === "approved" || d.status === "verified").length;
                              const reviewCount = docs.filter(d => d.status === "received").length;
                              if (approvedCount > 0 || reviewCount > 0) {
                                return (
                                  <div className="text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                                    <span className="text-green-500 font-bold">{approvedCount} Clear</span>
                                    {reviewCount > 0 && <span className="text-orange-400 font-bold">| {reviewCount} Review</span>}
                                  </div>
                                );
                              }
                              // Missing docs warning if client status is active (working, lender or conditional)
                              if (["working", "lender", "conditional"].includes(c.status)) {
                                return (
                                  <span className="text-[8px] text-red-400 font-black uppercase tracking-wider mt-0.5">
                                    ⚠️ Missing Files
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="p-3.5 text-xs font-mono font-bold text-[var(--color-text)]">{c.mtgamt ? fd(pn(c.mtgamt)) : "—"}</td>
                        <td className="p-3.5 text-xs text-[var(--color-text-muted)] font-semibold">{c.lender || "—"}</td>
                        <td className="p-3.5 text-xs font-mono text-[var(--color-text-muted)] font-bold">
                          {ltv > 0 ? `${ltv.toFixed(0)}%` : "—"}
                        </td>
                        <td className="p-3.5 text-xs font-mono font-bold">
                          <span className={pn(c.beacon) >= 680 ? "text-[var(--color-success)]" : pn(c.beacon) >= 600 ? "text-[var(--color-warning)]" : "text-[var(--color-error)]"}>
                            {c.beacon || "—"}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs font-mono font-bold">
                          <span className={gds <= 39 && gds > 0 ? "text-[var(--color-success)]" : gds > 39 ? "text-[var(--color-error)]" : "text-[var(--color-text-faint)]"}>
                            {gds > 0 ? `${gds.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-[var(--color-text-muted)] font-bold">{c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner || "Unassigned"}</td>
                        <td className="p-3.5 text-right text-xs text-[var(--color-text-faint)] font-mono pr-6 font-bold">
                          {new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-CA")}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto p-8 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] shadow-md space-y-5">
                        <div className="w-14 h-14 rounded-full bg-blue-500/5 flex items-center justify-center border border-blue-500/20 text-[var(--color-accent)] shadow-inner">
                          <Search className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-black uppercase text-[var(--color-text)] tracking-wider">No matching clients found</h4>
                          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-sans max-w-xs mx-auto">
                            We couldn't find any file matching your criteria. Try loosening your filter settings or search query.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 justify-center pt-2">
                          <button
                            onClick={() => {
                              handleSearchChange("");
                              setDbFilter("all");
                              setAgentFilter("");
                            }}
                            className="px-4 py-1.5 bg-[var(--color-surface-2)] hover:bg-blue-500/5 text-[var(--color-text-muted)] hover:text-blue-600 border border-[var(--color-border)] hover:border-blue-500/25 text-[10px] font-extrabold uppercase tracking-wider rounded-full cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            Reset filters
                          </button>
                          <button
                            onClick={onAddClient}
                            className="px-4 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-text-inverse)] text-[10px] font-extrabold uppercase tracking-wider rounded-full cursor-pointer transition-all active:scale-95 shadow-md"
                          >
                            + Onboard Client
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Board KanBan stages View */
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 select-none">
          <div className="flex gap-3 h-full min-w-[1240px]">
            {STAGES.map((s) => {
              const pipelineClients = getPipelineClients();
              const colClients = pipelineClients.filter(c => c.status === s.id);
              const colValue = colClients.reduce((sum, c) => sum + pn(c.mtgamt || c.mortgageAmount), 0);

              // Calculate stage-level counts for attention-needed indicators
              let stalledCount = 0;
              let missingDocsCount = 0;
              let overdueFollowUpCount = 0;

              colClients.forEach(c => {
                const daysStale = Math.floor((Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) / (24 * 3600 * 1000));
                const isStalledActive = (c.status !== "funded" && c.status !== "closed") && (daysStale > 14);
                if (isStalledActive) stalledCount++;

                const hasOverdueFollowUp = c.nextFollowUpDate && (new Date(c.nextFollowUpDate) < new Date());
                if (hasOverdueFollowUp) overdueFollowUpCount++;

                const clientDocs = docVault ? docVault[c.id] || {} : {};
                const docs = Object.values(clientDocs) as any[];
                const approvedCount = docs.filter(d => d.status === "approved" || d.status === "verified").length;
                const reviewCount = docs.filter(d => d.status === "received").length;
                const hasDocs = approvedCount > 0 || reviewCount > 0;
                const isActiveStage = ["working", "lender", "conditional"].includes(c.status);
                if (isActiveStage && !hasDocs) missingDocsCount++;
              });

              const isCrowded = colClients.length >= 5;
              const isEmpty = colClients.length === 0;

              return (
                <div 
                  key={s.id}
                  className={`w-80 h-full flex flex-col rounded-2xl max-h-full border transition-all duration-300 ${
                    isCrowded 
                      ? "border-amber-500/30 bg-[var(--color-surface)] shadow-md ring-1 ring-amber-500/10" 
                      : isEmpty 
                        ? "border-[var(--color-border)]/50 bg-[var(--color-surface)]/40 opacity-75 hover:opacity-90 hover:border-[var(--color-border)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
                  }`}
                >
                  {/* Column Header */}
                  <div 
                    className={`p-3.5 border-b flex flex-col gap-2 shrink-0 rounded-t-2xl transition-all duration-300 ${
                      isCrowded 
                        ? "bg-amber-500/[0.02]" 
                        : isEmpty 
                          ? "bg-[var(--color-surface-2)]/30" 
                          : "bg-[var(--color-surface-2)]/60"
                    }`}
                    style={{ borderColor: isCrowded ? "rgba(245, 158, 11, 0.2)" : "var(--color-divider)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2.5 h-2.5 rounded-full ${isCrowded ? "animate-pulse" : ""}`} 
                          style={{ 
                            backgroundColor: s.color, 
                            boxShadow: `0 0 6px ${s.color}` 
                          }}
                        ></div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                          {s.label}
                          {isCrowded && (
                            <span className="text-[9px] font-black tracking-normal normal-case bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded">
                              Crowded
                            </span>
                          )}
                        </h4>
                      </div>
                      <span className="text-xs font-bold font-mono text-[var(--color-accent)]">{fdShort(colValue)}</span>
                    </div>
                    
                    {/* Stage Metrics Summary Row */}
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className="bg-[var(--color-surface-3)] border border-[var(--color-border)]/40 px-2 py-0.5 rounded-md text-[10px]">
                          {colClients.length} {colClients.length === 1 ? "file" : "files"}
                        </span>
                        
                        {/* Summary Badges if any alerts exist */}
                        {(overdueFollowUpCount > 0 || stalledCount > 0 || missingDocsCount > 0) && (
                          <div className="flex items-center gap-1">
                            {overdueFollowUpCount > 0 && (
                              <span className="bg-red-500/10 text-red-500 border border-red-500/15 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5" title="Overdue follow-ups">
                                📅 {overdueFollowUpCount}
                              </span>
                            )}
                            {stalledCount > 0 && (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/15 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5" title="Stalled files">
                                ⏳ {stalledCount}
                              </span>
                            )}
                            {missingDocsCount > 0 && (
                              <span className="bg-orange-500/10 text-orange-500 border border-orange-500/15 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5" title="Missing documents">
                                ⚠️ {missingDocsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {colClients.length > 0 && (
                        <span className="text-[9px] text-[var(--color-text-faint)] font-medium">
                          Avg: {fdShort(colValue / colClients.length)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column Body Cards Area */}
                  <div 
                    onDragOver={(e) => {
                      if (!isAdmin) return;
                      e.preventDefault();
                    }}
                    onDragEnter={(e) => {
                      if (!isAdmin) return;
                      e.preventDefault();
                      setDragOverColumn(s.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverColumn === s.id) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      if (!isAdmin) return;
                      const clientId = e.dataTransfer.getData("text/plain");
                      if (clientId && onUpdateClientStatus) {
                        onUpdateClientStatus(clientId, s.id);
                      }
                    }}
                    className={`flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0 rounded-b-2xl transition-all duration-200 ${
                      dragOverColumn === s.id 
                        ? "bg-blue-500/10 ring-2 ring-blue-500/20 ring-inset" 
                        : isEmpty 
                          ? "bg-transparent" 
                          : "bg-[var(--color-surface-2)]/30"
                    }`}
                  >
                    {colClients.length > 0 ? colClients.map(c => {
                      const initials = (c.first[0] + c.last[0]).toUpperCase();
                      const daysStale = Math.floor((Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) / (24 * 3600 * 1000));
                      
                      // Stalled indicator for active stages
                      const isStalledActive = (c.status !== "funded" && c.status !== "closed") && (daysStale > 14);
                      const hasOverdueFollowUp = c.nextFollowUpDate && (new Date(c.nextFollowUpDate) < new Date());
                      
                      // Missing documents indicator
                      const clientDocs = docVault ? docVault[c.id] || {} : {};
                      const docs = Object.values(clientDocs) as any[];
                      const approvedCount = docs.filter(d => d.status === "approved" || d.status === "verified").length;
                      const reviewCount = docs.filter(d => d.status === "received").length;
                      const hasDocs = approvedCount > 0 || reviewCount > 0;
                      const isActiveStage = ["working", "lender", "conditional"].includes(c.status);
                      const isMissingDocs = isActiveStage && !hasDocs;
 
                      return (
                        <div
                          key={c.id}
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
                          className={`p-3 rounded-xl border border-[var(--color-border)]/60 border-l-4 transition-all duration-300 ease-out cursor-pointer shadow-sm relative group/card bg-[var(--color-surface)] hover:-translate-y-0.5 hover:shadow-md ${
                            hasOverdueFollowUp 
                              ? "border-l-red-500 hover:border-red-500/40" 
                              : isStalledActive 
                                ? "border-l-amber-500 hover:border-amber-500/40"
                                : isMissingDocs
                                  ? "border-l-orange-500 hover:border-orange-500/40"
                                  : "border-l-[var(--color-primary)] hover:border-[var(--color-accent)]/30"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2.5">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div 
                                className="w-7 h-7 rounded-lg text-[9px] font-black flex items-center justify-center text-[var(--color-text-inverse)] shadow-sm shrink-0 mt-0.5"
                                style={{ background: "var(--color-primary)" }}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-[var(--color-text)] truncate group-hover/card:text-[var(--color-accent)] transition-colors">
                                  {c.first} {c.last}
                                </h5>
                                <div className="text-[10px] text-[var(--color-text-muted)] font-bold truncate mt-0.5 uppercase tracking-wide">
                                  {c.type || "Purchase"}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs font-mono font-bold text-[var(--color-accent)] whitespace-nowrap shrink-0 mt-0.5">
                              {c.mtgamt ? fdShort(pn(c.mtgamt)) : "—"}
                            </div>
                          </div>
 
                          {/* Broker Workflow Cues */}
                          {(c.nextFollowUpDate || isStalledActive || hasDocs || isMissingDocs) && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {/* Overdue follow up */}
                              {c.nextFollowUpDate && (
                                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  hasOverdueFollowUp 
                                    ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                                    : "bg-teal-500/10 text-teal-500 border border-teal-500/10"
                                }`} title="Follow-up Date">
                                  📅 {hasOverdueFollowUp ? `Overdue` : `${c.nextFollowUpDate}`}
                                </span>
                              )}
 
                              {/* Stalled active */}
                              {isStalledActive && (
                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                                  ⏳ Idle {daysStale}d
                                </span>
                              )}
 
                              {/* Missing/Document Vault status */}
                              {(() => {
                                if (hasDocs) {
                                  return (
                                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
                                      📂 {approvedCount} Clr | {reviewCount} Rev
                                    </span>
                                  );
                                } else if (isMissingDocs) {
                                  return (
                                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center gap-1">
                                      ⚠️ Docs Needed
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
 
                          <div className="flex justify-between items-center text-[10px] border-t border-[var(--color-divider)] pt-2 mt-2.5">
                            <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                              {isAdmin && onUpdateClient ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider shrink-0">Broker:</span>
                                  <select
                                    value={c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner || ""}
                                    onChange={(e) => {
                                      onUpdateClient({ ...c, assignedBroker: e.target.value });
                                    }}
                                    className="text-[9px] font-black bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none cursor-pointer focus:border-[var(--color-accent)] transition-all font-sans max-w-[85px] truncate"
                                    title={`Assigned Advisor: ${c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner || 'Unassigned'}`}
                                  >
                                    <option value="">Unassigned</option>
                                    {agentNames.map((name, i) => (
                                      <option key={`${name}-${i}`} value={name}>{name.split(" ")[0]}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] font-bold text-[9px] truncate max-w-[80px]" title={`Lead Advisor: ${c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner || 'Unassigned'}`}>
                                  👤 {(c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner || "Unassigned").split(" ")[0]}
                                </span>
                              )}
                              
                              {/* Hover Indicator that Card opens Client File */}
                              <span className="text-[9px] font-bold text-[var(--color-accent)] opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 truncate shrink-0 ml-1">
                                Open ↗
                              </span>
                            </div>
                            
                            {/* Quick Move Selector (Admins Only) */}
                            {isAdmin && (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[8px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider shrink-0">Move:</span>
                                <select
                                  value={c.status}
                                  onChange={(e) => onUpdateClientStatus?.(c.id, e.target.value as any)}
                                  className="text-[9px] font-black bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none cursor-pointer focus:border-[var(--color-accent)] transition-all font-sans"
                                >
                                  {STAGES.map(st => (
                                    <option key={st.id} value={st.id}>{st.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex-1 flex flex-col items-center justify-center min-h-[140px] border border-dashed border-[var(--color-border)]/40 rounded-xl p-4 bg-transparent text-center m-1.5 select-none">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)]/30 flex items-center justify-center border border-[var(--color-border)]/10 text-[var(--color-text-faint)] mb-2">
                          <Landmark className="w-4 h-4 opacity-40 text-[var(--color-text-muted)]" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-[var(--color-text-faint)] tracking-wider">Empty Stage</span>
                        <p className="text-[9px] text-[var(--color-text-faint)] leading-tight mt-1 max-w-[150px] opacity-60">No active files are in this phase.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
