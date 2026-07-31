import React, { useState } from "react";
import { 
  AlertTriangle, CheckSquare, Cake, CalendarClock, UserMinus, 
  Sparkles, Check, ArrowRight, Filter, Users 
} from "lucide-react";
import { Client, Task, User } from "../../types";

interface DailyActionQueueProps {
  clients: Client[];
  tasks: Task[];
  currentUser: User;
  onOpenClient: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onCompleteTask?: (taskId: string) => void;
}

export const DailyActionQueue: React.FC<DailyActionQueueProps> = ({
  clients,
  tasks,
  currentUser,
  onOpenClient,
  setActiveTab,
  onCompleteTask
}) => {
  const isManager = ["Developer/Admin", "Admin"].includes(currentUser.role);
  const userFullName = `${currentUser.first} ${currentUser.last}`;

  const [queueMode, setQueueMode] = useState<"personal" | "team">(isManager ? "team" : "personal");
  const [filterType, setFilterType] = useState<"all" | "task" | "stale" | "incomplete" | "dates">("all");

  // Determine active users we're pulling for
  const filterByOwner = queueMode === "personal";

  // 1. Get Tasks
  const rawTasks = filterByOwner ? tasks.filter(t => t.assignedTo === userFullName) : tasks;
  const activeTasks = rawTasks.filter(t => t.status === "open");

  // 2. Get Clients
  const rawClients = filterByOwner ? clients.filter(c => c.agent === userFullName) : clients;
  const activeClients = rawClients.filter(c => c.status !== "closed" && c.status !== "funded");

  const queueItems: any[] = [];

  // Generate Task Items
  activeTasks.forEach(t => {
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
    const isHighPriority = t.priority === "high";
    if (isOverdue || isHighPriority) {
      queueItems.push({
        id: `task-${t.id}`,
        type: "task",
        category: "Tasks",
        title: t.title,
        desc: t.notes || (t.clientName ? `Task regarding client ${t.clientName}` : "General task"),
        badge: isOverdue ? "Overdue" : "High Priority",
        badgeColor: isOverdue ? "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error)]/20" : "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/20",
        date: t.dueDate ? `Due: ${t.dueDate}` : "Immediate Action",
        owner: t.assignedTo || "Unassigned",
        icon: CheckSquare,
        iconColor: "text-[var(--color-info)]",
        actionLabel: "Complete Task",
        onAction: () => {
          if (onCompleteTask) {
            onCompleteTask(t.id);
          } else {
            setActiveTab("tasks");
          }
        },
        onNavigate: () => {
          if (t.clientId) {
            onOpenClient(t.clientId);
          } else {
            setActiveTab("tasks");
          }
        }
      });
    }
  });

  // Generate Stale File Items (Inactive for 30+ days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  activeClients.forEach(c => {
    const lastTouch = new Date(c.updatedAt || c.createdAt).getTime();
    if (lastTouch < thirtyDaysAgo) {
      const inactiveDays = Math.floor((Date.now() - lastTouch) / (24 * 60 * 60 * 1000));
      queueItems.push({
        id: `stale-${c.id}`,
        type: "stale",
        category: "Stale Files",
        title: `${c.first} ${c.last}`,
        desc: `No updates on this ${c.status.toUpperCase()} file for ${inactiveDays} days.`,
        badge: `${inactiveDays}d Inactive`,
        badgeColor: "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error)]/20",
        date: `Last Touch: ${new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-CA")}`,
        owner: c.agent || "Unassigned Agent",
        icon: UserMinus,
        iconColor: "text-[var(--color-error)]",
        actionLabel: "Open File",
        onAction: () => onOpenClient(c.id),
        onNavigate: () => onOpenClient(c.id)
      });
    }
  });

  // Generate Incomplete Underwriting Profiles
  activeClients.forEach(c => {
    const missingFields: string[] = [];
    if (!c.beacon || c.beacon === "" || parseInt(String(c.beacon)) === 0) missingFields.push("Credit Score");
    if (!c.income || parseFloat(String(c.income).replace(/[$,\s]/g, "")) === 0) missingFields.push("Income Details");
    if (!c.mtgamt || parseFloat(String(c.mtgamt).replace(/[$,\s]/g, "")) === 0) missingFields.push("Mortgage Amt");
    if (!c.propval || parseFloat(String(c.propval).replace(/[$,\s]/g, "")) === 0) missingFields.push("Property Value");

    if (missingFields.length > 0 && ["open", "working"].includes(c.status)) {
      queueItems.push({
        id: `incomplete-${c.id}`,
        type: "incomplete",
        category: "Missing Underwriting",
        title: `${c.first} ${c.last}`,
        desc: `Missing critical files: ${missingFields.join(", ")}.`,
        badge: `${missingFields.length} Missing Fields`,
        badgeColor: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/20",
        date: "Incomplete Profile",
        owner: c.agent || "Unassigned Agent",
        icon: AlertTriangle,
        iconColor: "text-[var(--color-warning)]",
        actionLabel: "Complete Profile",
        onAction: () => onOpenClient(c.id),
        onNavigate: () => onOpenClient(c.id)
      });
    }
  });

  // Generate Birthdays & Upcoming Maturities
  rawClients.forEach(c => {
    // Birthdays in next 7 days
    if (c.dob) {
      const bDate = new Date(c.dob);
      const bMonth = bDate.getMonth();
      const bDay = bDate.getDate();
      const today = new Date();
      const currentYearBD = new Date(today.getFullYear(), bMonth, bDay);
      const diffMs = currentYearBD.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 3600 * 1000));
      
      if (diffDays >= 0 && diffDays <= 7) {
        queueItems.push({
          id: `bday-${c.id}`,
          type: "dates",
          category: "Upcoming Dates",
          title: `Birthday: ${c.first} ${c.last}`,
          desc: `Client's birthday is in ${diffDays} days (${bDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}). Send an outreach card!`,
          badge: "Birthday 🎂",
          badgeColor: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]/20",
          date: `Birthday in ${diffDays}d`,
          owner: c.agent || "Unassigned Agent",
          icon: Cake,
          iconColor: "text-[var(--color-accent)]",
          actionLabel: "Client Outreach",
          onAction: () => onOpenClient(c.id),
          onNavigate: () => onOpenClient(c.id)
        });
      }
    }

    // Maturity Date Approaching (next 60 days)
    if (c.maturityDate) {
      const mDate = new Date(c.maturityDate);
      const today = new Date();
      const diffMs = mDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (24 * 3600 * 1000));

      if (diffDays >= 0 && diffDays <= 60) {
        queueItems.push({
          id: `maturity-${c.id}`,
          type: "dates",
          category: "Maturities",
          title: `Maturity: ${c.first} ${c.last}`,
          desc: `Mortgage term maturing in ${diffDays} days (${c.maturityDate}). High retention value renewal opportunity!`,
          badge: `Renewal in ${diffDays}d`,
          badgeColor: "bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[var(--color-info)]/20",
          date: `Matures: ${c.maturityDate}`,
          owner: c.agent || "Unassigned Agent",
          icon: CalendarClock,
          iconColor: "text-[var(--color-info)]",
          actionLabel: "Secure Renewal",
          onAction: () => onOpenClient(c.id),
          onNavigate: () => onOpenClient(c.id)
        });
      }
    }
  });

  // Sort queue items so that Stale/Overdue are at the top
  const sortedQueue = queueItems.sort((a, b) => {
    if (a.badge === "Overdue" && b.badge !== "Overdue") return -1;
    if (b.badge === "Overdue" && a.badge !== "Overdue") return 1;
    return 0;
  });

  // Filter items
  const filteredItems = sortedQueue.filter(item => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  return (
    <div className="glass-card flex flex-col h-[480px]" id="daily-action-queue">
      {/* Queue Header */}
      <div className="p-4 border-b border-[var(--color-divider)] bg-[var(--color-primary-subtle)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[var(--color-accent-subtle)] rounded-lg text-[var(--color-accent)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              My Daily Action Queue 
              <span className="text-[10px] bg-[var(--color-error-subtle)] text-[var(--color-error)] px-2 py-0.5 rounded-full border border-[var(--color-error)]/15">
                {queueItems.length} alerts
              </span>
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              Personalized operational tasks requiring broker attention today
            </p>
          </div>
        </div>

        {/* Toggles and Filter controls */}
        <div className="flex items-center gap-2">
          {isManager && (
            <div className="bg-[var(--color-surface-3)]/30 border border-[var(--color-border)] rounded-lg p-0.5 flex">
              <button
                onClick={() => setQueueMode("personal")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${queueMode === "personal" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                My Queue
              </button>
              <button
                onClick={() => setQueueMode("team")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${queueMode === "team" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                <Users className="w-3 h-3" /> Team Queue
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-[var(--color-surface-3)]/30 border border-[var(--color-border)] rounded-lg p-0.5">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${filterType === "all" ? "bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/50" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("task")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${filterType === "task" ? "bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/50" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
            >
              Tasks
            </button>
            <button
              onClick={() => setFilterType("stale")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${filterType === "stale" ? "bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/50" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
            >
              Stale
            </button>
            <button
              onClick={() => setFilterType("incomplete")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${filterType === "incomplete" ? "bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/50" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
            >
              Profiles
            </button>
            <button
              onClick={() => setFilterType("dates")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${filterType === "dates" ? "bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/50" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
            >
              Dates
            </button>
          </div>
        </div>
      </div>

      {/* Queue Body list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gradient-to-b from-transparent to-[var(--color-bg)]/40">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                className="flex items-center justify-between p-4 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)]/70 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)]/75 rounded-2xl transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className={`p-2.5 rounded-xl bg-[var(--color-surface-3)]/60 border border-[var(--color-border)]/60 ${item.iconColor} shrink-0 mt-0.5 transition-transform duration-200`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 
                        onClick={item.onNavigate}
                        className="text-xs font-black text-[var(--color-text)] hover:text-[var(--color-accent)] cursor-pointer transition-colors truncate"
                      >
                        {item.title}
                      </h4>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${item.badgeColor} shadow-inner`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed max-w-xl">
                      {item.desc}
                    </p>
                    <div className="text-[9px] text-[var(--color-text-faint)] font-mono mt-2 flex flex-wrap items-center gap-1.5 font-bold">
                      <span className="bg-[var(--color-surface-3)]/40 px-1.5 py-0.5 rounded border border-[var(--color-border)]/30">{item.category}</span>
                      <span className="text-[var(--color-border)]">•</span>
                      <span>{item.date}</span>
                      <span className="text-[var(--color-border)]">•</span>
                      <span className="text-[var(--color-primary)] font-extrabold uppercase tracking-wide">Broker: {item.owner}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-4">
                  <button
                    onClick={item.onAction}
                    className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold bg-[var(--color-accent-subtle)] border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[var(--color-border)]/60 rounded-2xl bg-[var(--color-surface-2)]/25 text-center my-auto">
            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3.5 shadow-sm">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h4 className="text-xs font-black uppercase text-[var(--color-text)] tracking-wider">Operational Queue Clear</h4>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 max-w-xs leading-relaxed font-medium">
              Excellent work! There are no critical tasks, stale folders, or urgent calendar alerts matching your active filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
