import React from "react";
import { Calendar, Clock, ArrowRight, ShieldAlert } from "lucide-react";
import { Client, User } from "../../types";
import { formatDateInTimeZone, useUserTimeZone } from "../../lib/timeUtils";

interface UpcomingDeadlinesProps {
  clients: Client[];
  currentUser: User;
  onOpenClient: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({
  clients,
  currentUser,
  onOpenClient,
  setActiveTab
}) => {
  const userTz = useUserTimeZone();
  const isAgent = currentUser.role === "Agent" || currentUser.role === "Senior Broker";
  const userFullName = `${currentUser.first} ${currentUser.last}`;

  const targetClients = isAgent ? clients.filter(c => c.agent === userFullName) : clients;

  const deadlines: any[] = [];
  const today = new Date();

  targetClients.forEach(c => {
    // 1. Maturity Dates (Renewals)
    if (c.maturityDate) {
      const mDate = new Date(c.maturityDate);
      const diffTime = mDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= -10 && diffDays <= 90) { // from 10 days ago to 90 days out
        deadlines.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          type: "Maturity / Renewal",
          date: c.maturityDate,
          daysLeft: diffDays,
          color: diffDays <= 7 ? "text-[var(--color-error)]" : diffDays <= 30 ? "text-[var(--color-warning)]" : "text-[var(--color-info)]",
          statusColor: "bg-[var(--color-info-subtle)] border-[var(--color-info)]/15 text-[var(--color-info)]"
        });
      }
    }

    // 2. Projected Funding/Closing Dates
    if (c.fundedDate && c.status === "approved") {
      const fDate = new Date(c.fundedDate);
      const diffTime = fDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= -5 && diffDays <= 60) {
        deadlines.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          type: "Closing / Funding",
          date: c.fundedDate,
          daysLeft: diffDays,
          color: diffDays <= 7 ? "text-[var(--color-error)]" : "text-[var(--color-success)]",
          statusColor: "bg-[var(--color-success-subtle)] border-[var(--color-success)]/15 text-[var(--color-success)]"
        });
      }
    }

    // 3. Condition Removal Deadlines
    if (c.status === "conditional") {
      // Simulate condition date 7 days after creation or last touch, if not explicitly defined
      const creationDate = new Date(c.updatedAt || c.createdAt);
      const condDate = new Date(creationDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days condition period
      const diffTime = condDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= -5 && diffDays <= 30) {
        deadlines.push({
          clientId: c.id,
          clientName: `${c.first} ${c.last}`,
          type: "Condition Removal",
          date: condDate.toISOString().split("T")[0],
          daysLeft: diffDays,
          color: diffDays <= 3 ? "text-[var(--color-error)] blink" : "text-[var(--color-warning)]",
          statusColor: "bg-[var(--color-error-subtle)] border-[var(--color-error)]/15 text-[var(--color-error)]"
        });
      }
    }
  });

  // Sort deadlines chronologically (lowest positive days first, then negative at the bottom)
  const sortedDeadlines = deadlines.sort((a, b) => {
    if (a.daysLeft < 0 && b.daysLeft >= 0) return 1;
    if (b.daysLeft < 0 && a.daysLeft >= 0) return -1;
    return a.daysLeft - b.daysLeft;
  }).slice(0, 5);

  return (
    <div className="glass-card p-4 flex flex-col h-[380px]" id="upcoming-deadlines">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 mb-3 shrink-0">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
            <span>📅 Critical Dates & Deadlines</span>
          </h4>
          <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
            Key chronological dates for active loan files
          </p>
        </div>
        <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
        {sortedDeadlines.length > 0 ? (
          sortedDeadlines.map((dl, idx) => {
            return (
              <div
                key={idx}
                onClick={() => onOpenClient(dl.clientId)}
                className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)]/70 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)] rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group shadow-sm hover:shadow"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                    {dl.clientName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${dl.statusColor}`}>
                      {dl.type}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-faint)] font-mono">
                      {formatDateInTimeZone(dl.date, undefined, userTz)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {dl.daysLeft === 0 ? (
                    <span className="text-xs font-bold text-[var(--color-error)] font-mono">TODAY</span>
                  ) : dl.daysLeft === 1 ? (
                    <span className="text-xs font-bold text-[var(--color-error)] font-mono">TOMORROW</span>
                  ) : dl.daysLeft < 0 ? (
                    <span className="text-xs font-bold text-[var(--color-text-faint)] font-mono">Passed</span>
                  ) : (
                    <span className={`text-xs font-bold font-mono ${dl.color}`}>
                      {dl.daysLeft} days
                    </span>
                  )}
                  <p className="text-[8px] text-[var(--color-text-muted)]/70 truncate mt-0.5">
                    {dl.daysLeft >= 0 ? "Remaining" : "Overdue"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-[var(--color-border)]/60 rounded-xl bg-[var(--color-surface-2)]/25 text-center my-auto">
            <div className="w-9 h-9 rounded-full bg-[var(--color-surface-2)]/50 flex items-center justify-center border border-[var(--color-border)]/40 text-[var(--color-text-faint)] mb-2.5">
              <Clock className="w-4 h-4 text-[var(--color-accent)] opacity-80" />
            </div>
            <h5 className="text-[10px] font-black uppercase text-[var(--color-text)] tracking-wider">Schedule Uncluttered</h5>
            <p className="text-[9px] text-[var(--color-text-faint)] leading-relaxed mt-1 max-w-[210px] font-medium">
              No approaching mortgage term maturities, condition removal dates, or closing deadlines registered in the next 30 days.
            </p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[var(--color-divider)] mt-auto shrink-0 flex items-center justify-between text-[9px]">
        <span className="text-[var(--color-text-faint)]">Calendar coordination in sync</span>
        <button
          onClick={() => setActiveTab("calendar")}
          className="text-[var(--color-accent)] font-semibold hover:underline cursor-pointer"
        >
          View Calendar &rarr;
        </button>
      </div>
    </div>
  );
};
