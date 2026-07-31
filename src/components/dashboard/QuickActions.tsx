import React from "react";
import { 
  UserPlus, FileCheck, CheckSquare, Handshake, Calendar, Search, BrainCircuit 
} from "lucide-react";

interface QuickActionsProps {
  onAddClient: () => void;
  onOpenNewClientIntake: () => void;
  onOpenAIIntake: () => void;
  onAddTask: () => void;
  onAddPartner: () => void;
  setActiveTab: (tab: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddClient,
  onOpenNewClientIntake,
  onOpenAIIntake,
  onAddTask,
  onAddPartner,
  setActiveTab
}) => {
  const actions = [
    {
      label: "New Client File",
      desc: "Create client folder",
      icon: UserPlus,
      onClick: onAddClient,
      iconColor: "text-[var(--color-accent)]"
    },
    {
      label: "AI Assistant",
      desc: "Chat with Gemini AI",
      icon: BrainCircuit,
      onClick: () => setActiveTab("ai"),
      iconColor: "text-[var(--color-accent)]",
      isAI: true
    },
    {
      label: "Full Loan Intake",
      desc: "Detailed application",
      icon: FileCheck,
      onClick: onOpenNewClientIntake,
      iconColor: "text-[var(--color-info)]"
    },
    {
      label: "AI Smart Extractor",
      desc: "Extract from PDF / email",
      icon: Search,
      onClick: onOpenAIIntake,
      iconColor: "text-[var(--color-accent)]",
      isAI: true
    },
    {
      label: "Log Task / Action",
      desc: "Add to daily list",
      icon: CheckSquare,
      onClick: onAddTask,
      iconColor: "text-[var(--color-success)]"
    },
    {
      label: "Onboard Partner",
      desc: "Professional contact",
      icon: Handshake,
      onClick: onAddPartner,
      iconColor: "text-[var(--color-warning)]"
    },
    {
      label: "Open Calendar",
      desc: "Book client meeting",
      icon: Calendar,
      onClick: () => setActiveTab("calendar"),
      iconColor: "text-[var(--color-text-muted)]"
    }
  ];

  return (
    <div className="flex flex-col gap-2 select-none" id="quick-actions-bar">
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-extrabold">
        Quick Action Command Deck
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <button
              key={i}
              onClick={act.onClick}
              className="glass-card relative overflow-hidden flex items-center gap-3.5 p-3.5 rounded-2xl border border-[var(--color-border)] text-left transition-all duration-200 cursor-pointer hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)]/40 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.06)] group"
            >
              {/* Top ambient highlight reflection overlay */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

              <div className="p-2.5 rounded-xl bg-[var(--color-surface-3)]/45 border border-[var(--color-border)]/50 shrink-0 group-hover:bg-[var(--color-surface-3)]/75 group-hover:border-[var(--color-accent)]/20 transition-all duration-200 shadow-sm">
                <Icon className={`w-4 h-4 ${act.iconColor} group-hover:scale-105 transition-transform duration-200`} />
              </div>

              {act.isAI && (
                <span className="absolute top-1.5 right-1.5 text-[7px] font-black bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-1 py-0.5 rounded border border-[var(--color-accent)]/30 leading-none uppercase tracking-wide">
                  AI
                </span>
              )}

              <div className="min-w-0">
                <div className="text-xs font-black text-[var(--color-text)] truncate leading-tight group-hover:text-[var(--color-accent)] transition-colors">
                  {act.label}
                </div>
                <div className="text-[9px] text-[var(--color-text-faint)] truncate mt-0.5 font-bold">
                  {act.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
