import React, { useState, useEffect } from "react";
import { Calendar, Clock, AlertTriangle, FileText, UserCheck, CheckSquare } from "lucide-react";
import { Client, Task, Event, User as UserType } from "../types";
import { getFormattedLiveTime, formatDateInTimeZone, useUserTimeZone } from "../lib/timeUtils";

// Import modular sub-components
import { KPICards } from "./dashboard/KPICards";
import { QuickActions } from "./dashboard/QuickActions";
import { DailyActionQueue } from "./dashboard/DailyActionQueue";
import { PipelineSnapshot } from "./dashboard/PipelineSnapshot";
import { IntakeOverview } from "./dashboard/IntakeOverview";
import { MissingDocuments } from "./dashboard/MissingDocuments";
import { UpcomingDeadlines } from "./dashboard/UpcomingDeadlines";
import { RecentActivityFeed } from "./dashboard/RecentActivityFeed";
import { MortgageUpdates } from "./dashboard/MortgageUpdates";
import { ClosingThisMonth } from "./dashboard/ClosingThisMonth";

interface DashboardProps {
  clients: Client[];
  tasks: Task[];
  events: Event[];
  auditLogs: any[];
  currentUser: UserType;
  docVault?: Record<string, any>;
  onOpenClient: (id: string) => void;
  onAddClient: () => void;
  onOpenNewClientIntake?: () => void;
  onOpenAIIntake?: () => void;
  onAddTask?: () => void;
  onAddPartner?: () => void;
  onAddEvent: () => void;
  setActiveTab: (tab: string) => void;
  onCompleteTask?: (taskId: string) => void;
  onClearLogs?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  clients,
  tasks,
  events,
  auditLogs,
  currentUser,
  docVault = {},
  onOpenClient,
  onAddClient,
  onOpenNewClientIntake = () => {},
  onOpenAIIntake = () => {},
  onAddTask = () => {},
  onAddPartner = () => {},
  onAddEvent,
  setActiveTab,
  onCompleteTask,
  onClearLogs
}) => {
  const userTz = useUserTimeZone();
  const [liveTime, setLiveTime] = useState<string>("");
  const [timeZoneName, setTimeZoneName] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const { timeString, tzAbbrev } = getFormattedLiveTime(new Date(), userTz);
      setLiveTime(timeString);
      setTimeZoneName(tzAbbrev);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [userTz]);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return `Good morning, ${currentUser.first}! 👋`;
    if (hrs < 17) return `Good afternoon, ${currentUser.first}!`;
    return `Good evening, ${currentUser.first}! 🌙`;
  };

  const getFormattedDate = () => {
    return formatDateInTimeZone(new Date(), { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    }, userTz);
  };

  // User-scoped metrics for "Today at a glance"
  const userFullName = `${currentUser.first} ${currentUser.last}`;
  const isAgent = currentUser.role === "Agent" || currentUser.role === "Senior Broker";
  const myClients = isAgent ? clients.filter(c => c.agent === userFullName) : clients;

  const todayStr = new Date().toISOString().split("T")[0];
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  const myTasks = isAgent ? tasks.filter(t => t.assignedTo?.trim().toLowerCase() === userFullName.trim().toLowerCase()) : tasks;
  const overdueTasksCount = myTasks.filter(t => t.status === "open" && t.dueDate && t.dueDate < todayStr).length;

  const todayEventsCount = events.filter(e => e.date === todayStr).length;

  let pendingDocsCount = 0;
  myClients.forEach(c => {
    const clientDocs = docVault[c.id] || {};
    Object.values(clientDocs).forEach((doc: any) => {
      if (doc && (doc.status === "required" || doc.status === "requested" || doc.status === "pending")) {
        pendingDocsCount++;
      }
    });
  });

  const newLeadsCount = myClients.filter(c => c.status === "lead" || c.status === "open").length;

  const closingsThisMonthCount = myClients.filter(c => 
    c.closingDate && c.closingDate.startsWith(thisMonthStr) && c.status !== "closed"
  ).length;

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6 text-sans" id="gbk-crm-dashboard">
      
      {/* Dynamic Executive Console Header Section */}
      <div className="greeting-glass-panel relative overflow-visible isolate rounded-2xl p-6 space-y-4">
        {/* Subtle upper light reflection bar */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] rounded-t-2xl bg-gradient-to-r from-white/25 via-white/10 to-transparent pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] font-sans">{getGreeting()}</h2>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] font-medium flex flex-wrap items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
              <span>{getFormattedDate()}</span>
              <span className="text-[var(--color-border)]">•</span>
              <span className="font-mono text-[var(--color-accent)] font-bold tracking-wide bg-[var(--color-surface-3)]/40 px-2 py-0.5 rounded border border-[var(--color-border)]/50">
                {liveTime} {timeZoneName}
              </span>
              {todayEventsCount > 0 && (
                <>
                  <span className="text-[var(--color-border)]">•</span>
                  <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                    <Clock className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                    {todayEventsCount} event{todayEventsCount !== 1 ? "s" : ""} today
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Portfolio Metrics & Control Panel */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-[var(--color-surface-3)]/30 border border-[var(--color-border)]/70 rounded-xl text-right shrink-0 shadow-sm backdrop-blur-sm">
              <span className="text-[8px] text-[var(--color-text-muted)] uppercase tracking-widest font-black block">
                {isAgent ? "My Portfolio" : "Total Asset Portfolio"}
              </span>
              <div className="text-sm font-black text-[var(--color-text)] font-mono mt-0.5">
                {myClients.length} Active Accounts
              </div>
            </div>
          </div>
        </div>

        {/* Today at a Glance Priority Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-[var(--color-border)]/50">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
              overdueTasksCount > 0
                ? "bg-[var(--color-error-subtle)] border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                : "bg-[var(--color-surface-3)]/30 border-[var(--color-border)]/60 text-[var(--color-text)] hover:bg-[var(--color-surface-3)]/60"
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${overdueTasksCount > 0 ? "bg-[var(--color-error)]/15" : "bg-[var(--color-surface-2)]"}`}>
              <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight truncate">
                {overdueTasksCount} Overdue
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">Tasks Pending</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className="p-2.5 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-3)]/30 text-[var(--color-text)] hover:bg-[var(--color-surface-3)]/60 flex items-center gap-2.5 transition-all cursor-pointer text-left"
          >
            <div className="p-1.5 rounded-lg bg-[var(--color-surface-2)] shrink-0">
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight truncate">
                {todayEventsCount} Scheduled
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">Events Today</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("clients")}
            className="p-2.5 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-3)]/30 text-[var(--color-text)] hover:bg-[var(--color-surface-3)]/60 flex items-center gap-2.5 transition-all cursor-pointer text-left"
          >
            <div className="p-1.5 rounded-lg bg-[var(--color-surface-2)] shrink-0">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight truncate">
                {pendingDocsCount} Pending
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">Vault Checklist Docs</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("clients")}
            className="p-2.5 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-3)]/30 text-[var(--color-text)] hover:bg-[var(--color-surface-3)]/60 flex items-center gap-2.5 transition-all cursor-pointer text-left"
          >
            <div className="p-1.5 rounded-lg bg-[var(--color-surface-2)] shrink-0">
              <UserCheck className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight truncate">
                {newLeadsCount} Leads
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">Active Ingestion Files</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className="p-2.5 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-3)]/30 text-[var(--color-text)] hover:bg-[var(--color-surface-3)]/60 flex items-center gap-2.5 transition-all cursor-pointer text-left"
          >
            <div className="p-1.5 rounded-lg bg-[var(--color-surface-2)] shrink-0">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight truncate">
                {closingsThisMonthCount} Closings
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">Targeted This Month</div>
            </div>
          </button>
        </div>
      </div>

      {/* Row 1: KPI Stats Summary Deck */}
      <KPICards 
        clients={clients}
        tasks={tasks}
        docVault={docVault}
        currentUser={currentUser}
        setActiveTab={setActiveTab}
      />

      {/* Row 2: Quick Command shortcut deck */}
      <QuickActions 
        onAddClient={onAddClient}
        onOpenNewClientIntake={onOpenNewClientIntake}
        onOpenAIIntake={onOpenAIIntake}
        onAddTask={onAddTask}
        onAddPartner={onAddPartner}
        setActiveTab={setActiveTab}
      />

      {/* Row 3 (Split): Left part (My Daily Action Queue), Right part (Session Activity Logs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DailyActionQueue 
            clients={clients}
            tasks={tasks}
            currentUser={currentUser}
            onOpenClient={onOpenClient}
            setActiveTab={setActiveTab}
            onCompleteTask={onCompleteTask}
          />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityFeed 
            auditLogs={auditLogs}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            onClearActivity={onClearLogs}
          />
        </div>
      </div>

      {/* Row 4: Pipeline board Snapshot overview with distributions */}
      <PipelineSnapshot 
        clients={clients}
        currentUser={currentUser}
        setActiveTab={setActiveTab}
        onOpenClient={onOpenClient}
      />

      {/* Row 4.5: Closing This Month */}
      <ClosingThisMonth
        clients={clients}
        currentUser={currentUser}
        onOpenClient={onOpenClient}
        setActiveTab={setActiveTab}
      />

      {/* Row 5: 3-column Operational Grid (Intake Review, Missing Documents, Upcoming dates/Deadlines) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <IntakeOverview 
          clients={clients}
          currentUser={currentUser}
          onOpenClient={onOpenClient}
          setActiveTab={setActiveTab}
          onOpenAIIntake={onOpenAIIntake}
        />
        
        <MissingDocuments 
          clients={clients}
          docVault={docVault}
          currentUser={currentUser}
          onOpenClient={onOpenClient}
          setActiveTab={setActiveTab}
        />

        <UpcomingDeadlines 
          clients={clients}
          currentUser={currentUser}
          onOpenClient={onOpenClient}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* Row 6: AI-powered Mortgage & Industry intel Crawler Updates */}
      <MortgageUpdates />

    </div>
  );
};
