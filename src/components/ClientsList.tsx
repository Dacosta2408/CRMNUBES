import React, { useState, useMemo, memo } from "react";
import { 
  Plus, Search, Filter, Sparkles
} from "lucide-react";
import { Client, Lender, User } from "../types";
import { Avatar } from "./Avatar";
import { 
  STAGES, calculateRatios, fd, filterDatabaseClients, filterPipelineClients, normalizeStatus, pn 
} from "../lib/clientPipelineUtils";
import { PipelineBoard } from "./pipeline/PipelineBoard";
import { useDebounce } from "../hooks/useDebounce";

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

export const ClientsList: React.FC<ClientsListProps> = memo(({
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

  // Pipeline sorting & alert filter states
  const [pipelineSortBy, setPipelineSortBy] = useState<'updated' | 'amount' | 'beacon' | 'followUp'>('updated');
  const [pipelineAlertFilter, setPipelineAlertFilter] = useState<'all' | 'attention' | 'overdue' | 'stalled' | 'missingDocs'>('all');

  const activeSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
  const handleSearchChange = onSearchQueryChange || setLocalSearchQuery;

  // ✦ Performance Optimization: Debounce search query to reduce expensive array filter operations ✦
  const debouncedSearchQuery = useDebounce(activeSearchQuery, 250);

  // Separate dataset for the Directory Table View (respects dbFilter, agentFilter, debounced search)
  const databaseClients = useMemo(() => {
    return filterDatabaseClients(
      clients,
      dbFilter,
      agentFilter,
      debouncedSearchQuery
    );
  }, [clients, dbFilter, agentFilter, debouncedSearchQuery]);

  // Separate dataset for the Pipeline Board View (ignores dbFilter, respects debounced search, agentFilter, pipelineAlertFilter)
  const pipelineClients = useMemo(() => {
    return filterPipelineClients(
      clients,
      agentFilter,
      debouncedSearchQuery,
      pipelineAlertFilter,
      docVault
    );
  }, [clients, agentFilter, debouncedSearchQuery, pipelineAlertFilter, docVault]);

  return (
    <div className="flex flex-col gap-5 h-full select-none">
      
      {/* Header bar and view toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="flex bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-full p-1 select-none self-start backdrop-blur-md">
          <button 
            onClick={() => setViewMode("database")}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-tight rounded-full transition-all duration-200 cursor-pointer ${
              viewMode === "database" 
                ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-blue-500/5"
            }`}
          >
            📋 Directory Table
          </button>
          <button 
            onClick={() => setViewMode("pipeline")}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-tight rounded-full transition-all duration-200 cursor-pointer ${
              viewMode === "pipeline" 
                ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-blue-500/5"
            }`}
          >
            📊 Pipeline Board
          </button>
        </div>

        {/* Global search, filters, and intake actions */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          <div className="px-3.5 py-1.5 flex items-center gap-2 w-full sm:w-60 transition-all duration-300 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 hover:border-[var(--color-accent)]/30 focus-within:border-[var(--color-accent)]/50">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search clients, lender…" 
              value={activeSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-transparent border-none text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none w-full font-medium"
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
            className="rounded-full px-4 py-2 text-xs flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "rgba(0, 114, 255, 0.08)",
              color: "#ffffff",
              fontWeight: "600",
              border: "1.5px solid #0072FF",
              boxShadow: "0 0 12px rgba(0, 114, 255, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)"
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 114, 255, 0.18)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(0, 114, 255, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.25)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 114, 255, 0.08)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(0, 114, 255, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
            }}
          >
            <Sparkles className="w-4 h-4 text-[#0072FF]" />
            <span>AI Extraction</span>
          </button>

          <button 
            onClick={onAddClient}
            className="rounded-full px-4 py-2 text-xs flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "rgba(0, 114, 255, 0.08)",
              color: "#ffffff",
              fontWeight: "600",
              border: "1.5px solid #0072FF",
              boxShadow: "0 0 12px rgba(0, 114, 255, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)"
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 114, 255, 0.18)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(0, 114, 255, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.25)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 114, 255, 0.08)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(0, 114, 255, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
            }}
          >
            <Plus className="w-4 h-4 text-[#0072FF]" />
            <span>+ Add Client</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE DIRECTORY TABLE vs PIPELINE BOARD */}
      {viewMode === "database" ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden">
          
          {/* Stage Filter Header */}
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

            <span className="text-xs text-[var(--color-text-faint)] font-bold border-l border-[var(--color-divider)] pl-3 ml-auto mr-1">
              {databaseClients.length} clients
            </span>
          </div>

          {/* Directory Table */}
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                {databaseClients.length > 0 ? (
                  databaseClients.map((c) => {
                    const ltv = pn(c.propval) > 0 ? (pn(c.mtgamt || c.mortgageAmount) / pn(c.propval) * 100) : 0;
                    const gds = calculateRatios(c);
                    const normStatus = normalizeStatus(c.status);
                    const matchingStage = STAGES.find(s => s.id === normStatus);
                    
                    const updateTime = new Date(c.updatedAt || c.createdAt).getTime();
                    const staleThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
                    const isStale = (normStatus !== "funded" && normStatus !== "closed") && (updateTime < staleThreshold);

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => onOpenClient(c.id)}
                        className="transition-all duration-150 cursor-pointer group bg-transparent hover:bg-blue-500/5 dark:hover:bg-blue-400/10 border-b border-[var(--color-divider)]"
                      >
                        <td className="p-3.5 pl-6 flex items-center gap-3">
                          <Avatar
                            first={c.first}
                            last={c.last}
                            name={`${c.first} ${c.last}`}
                            size="md"
                            className="rounded-full shadow-sm"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                                {c.first} {c.last}
                              </span>
                              {isStale && (
                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--color-warning)] text-[var(--color-text-inverse)] shadow-sm animate-pulse">
                                  Stale
                                </span>
                              )}
                              {c.nextFollowUpDate && (
                                new Date(c.nextFollowUpDate) < new Date() ? (
                                  <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500 text-white shadow-sm animate-pulse" title={`Overdue follow-up was scheduled for ${c.nextFollowUpDate}`}>
                                    ⚠️ Overdue
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm" title="Scheduled follow-up date">
                                    📅 {c.nextFollowUpDate}
                                  </span>
                                )
                              )}
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
                              if (["working", "lender", "conditional"].includes(normStatus)) {
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
                        <td className="p-3.5 text-xs font-mono font-bold text-[var(--color-text)]">
                          {(c.mtgamt || c.mortgageAmount) ? fd(pn(c.mtgamt || c.mortgageAmount)) : "—"}
                        </td>
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
                        <td className="p-3.5 text-xs text-[var(--color-text-muted)] font-bold">
                          {c.assignedBroker || c.agent || c.assignedTo || c.retentionOwner || "Unassigned"}
                        </td>
                        <td className="p-3.5 text-right text-xs text-[var(--color-text-faint)] font-mono pr-6 font-bold">
                          {new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-CA")}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-16 text-center">
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
        /* Vertical Stacked Pipeline Board View */
        <PipelineBoard
          clients={pipelineClients}
          isAdmin={isAdmin}
          docVault={docVault}
          agentNames={agentNames}
          stages={STAGES}
          pipelineSortBy={pipelineSortBy}
          setPipelineSortBy={setPipelineSortBy}
          pipelineAlertFilter={pipelineAlertFilter}
          setPipelineAlertFilter={setPipelineAlertFilter}
          dragOverColumn={dragOverColumn}
          setDragOverColumn={setDragOverColumn}
          onOpenClient={onOpenClient}
          onUpdateClientStatus={onUpdateClientStatus}
          onUpdateClient={onUpdateClient}
        />
      )}

    </div>
  );
});

ClientsList.displayName = "ClientsList";
