import React from "react";
import { Sparkles, ArrowRight, UserCheck, ShieldAlert, BadgeInfo } from "lucide-react";
import { Client, User } from "../../types";

interface IntakeOverviewProps {
  clients: Client[];
  currentUser: User;
  onOpenClient: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenAIIntake: () => void;
}

export const IntakeOverview: React.FC<IntakeOverviewProps> = ({
  clients,
  currentUser,
  onOpenClient,
  setActiveTab,
  onOpenAIIntake
}) => {
  const isAgent = currentUser.role === "Agent" || currentUser.role === "Senior Broker";
  const userFullName = `${currentUser.first} ${currentUser.last}`;

  // For Agents, show their leads. For managers, show all unassigned or new leads.
  const newIntakes = clients.filter(c => {
    const isNew = c.status === "lead" || c.status === "open";
    if (isAgent) {
      return isNew && c.agent === userFullName;
    }
    return isNew;
  }).slice(0, 5);

  const fd = (n: any) => {
    return "$" + Math.round(parseFloat(String(n).replace(/[$,\s]/g, "")) || 0).toLocaleString("en-CA");
  };

  return (
    <div className="glass-card p-4 flex flex-col h-[380px]" id="intake-overview">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 mb-3 shrink-0">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
            <span>📥 Intake Review Queue</span>
          </h4>
          <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
            New application intakes waiting for broker analysis
          </p>
        </div>
        <button
          onClick={onOpenAIIntake}
          className="flex items-center gap-1 text-[9px] font-bold text-[var(--color-accent)] hover:underline cursor-pointer"
        >
          <Sparkles className="w-2.5 h-2.5" /> AI Scanner
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {newIntakes.length > 0 ? (
          newIntakes.map((client) => {
            const mtgAmt = parseFloat(String(client.mtgamt).replace(/[$,\s]/g, "")) || 0;
            return (
              <div
                key={client.id}
                onClick={() => onOpenClient(client.id)}
                className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)]/70 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)] rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 group shadow-sm hover:shadow"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                      {client.first} {client.last}
                    </span>
                    <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">
                      {client.status}
                    </span>
                    {(!client.agent || client.agent.toLowerCase() === "unassigned") && (
                      <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse">
                        Unassigned
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-1">
                    {client.type || "Purchase"} • {client.agent || "Unassigned Lead"}
                  </p>
                  <p className="text-[9px] text-[var(--color-text-faint)] font-mono mt-0.5">
                    Submitted: {new Date(client.createdAt).toLocaleDateString("en-CA")}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-mono text-[var(--color-text)]/90">
                    {mtgAmt > 0 ? fd(mtgAmt) : "TBD"}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenClient(client.id);
                    }}
                    className="text-[9px] font-semibold text-[var(--color-accent)] group-hover:underline flex items-center gap-0.5 justify-end mt-1 cursor-pointer"
                  >
                    Assess <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <UserCheck className="w-8 h-8 text-[var(--color-text-faint)] mb-2" />
            <h5 className="text-xs font-semibold text-[var(--color-text-muted)]">Intake Queue Clear</h5>
            <p className="text-[9px] text-[var(--color-text-faint)] mt-0.5 max-w-[200px]">
              There are no new unreviewed leads at this time. Use the Quick Action buttons to log new borrowers.
            </p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[var(--color-divider)] mt-auto shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-[var(--color-text-faint)]">Showing {newIntakes.length} submissions</span>
        <button
          onClick={() => setActiveTab("clients")}
          className="text-[9px] text-[var(--color-accent)] font-semibold hover:underline cursor-pointer"
        >
          View Client Roster &rarr;
        </button>
      </div>
    </div>
  );
};
