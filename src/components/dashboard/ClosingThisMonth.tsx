import React from "react";
import { CalendarCheck, ArrowRight } from "lucide-react";
import { Client, User } from "../../types";

interface ClosingThisMonthProps {
  clients: Client[];
  currentUser: User;
  onOpenClient: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

interface ExtendedClient extends Client {
  closingDate?: string;
}

export const ClosingThisMonth: React.FC<ClosingThisMonthProps> = ({ clients, currentUser, onOpenClient, setActiveTab }) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const isAgent = currentUser.role === "Agent" || currentUser.role === "Senior Broker";
  const userFullName = `${currentUser.first} ${currentUser.last}`;
  const scopedClients = isAgent ? clients.filter(c => c.agent === userFullName) : clients;

  const closingClients = (scopedClients as ExtendedClient[])
    .filter(c => {
      if (!c.closingDate) return false;
      const d = new Date(c.closingDate);
      return d.getMonth() === currentMonth &&
             d.getFullYear() === currentYear &&
             c.status !== "funded" &&
             c.status !== "closed";
    })
    .sort((a, b) => {
      const dateA = new Date(a.closingDate!).getTime();
      const dateB = new Date(b.closingDate!).getTime();
      return dateA - dateB;
    });

  return (
    <div className="glass-card p-4 flex flex-col gap-3" id="closing-this-month">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarCheck className="w-4 h-4 text-[var(--color-accent)]" />
          <h4 className="text-sm font-semibold text-[var(--color-text)]">
            Closing This Month
          </h4>
        </div>
        <span className="text-[9px] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] px-2 py-0.5 rounded-full border border-[var(--color-accent)]/20 font-black">
          {closingClients.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {closingClients.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-faint)] italic">
            No closings scheduled this month.
          </div>
        ) : (
          closingClients.map((c) => {
            const clientName = `${c.first} ${c.last}`;
            const lenderName = c.lender || "TBD";
            const formattedDate = c.closingDate
              ? new Date(c.closingDate).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                })
              : "";

            return (
              <div
                key={c.id}
                onClick={() => onOpenClient(c.id)}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/60 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface-2)]/40 cursor-pointer transition-all duration-150 group"
              >
                <div>
                  <div className="text-xs font-black text-[var(--color-text)]">
                    {clientName}
                  </div>
                  <div className="text-[9px] text-[var(--color-text-faint)]">
                    {lenderName}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-black text-[var(--color-accent)]">
                    {formattedDate}
                  </span>
                  <ArrowRight className="w-3 h-3 text-[var(--color-text-faint)] group-hover:text-[var(--color-accent)] transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
