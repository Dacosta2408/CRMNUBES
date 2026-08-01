import React from "react";
import { 
  Users, Layers, BrainCircuit, Calculator, Globe, Calendar, 
  CheckSquare, MessageSquare, Mail, Heart, ShieldCheck, ShieldAlert,
  Settings, BarChart3
} from "lucide-react";
import { User, Client, Task, Event } from "../types";
import { motion, useReducedMotion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  clients: Client[];
  tasks: Task[];
  events: Event[];
  onOpenSettings: () => void;
  onLockApp: () => void;
  isOwner: boolean;
  onOpenProfileManager: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  clients,
  tasks,
  events,
  onOpenSettings,
  onLockApp,
  isOwner,
  onOpenProfileManager
}) => {
  const shouldReduceMotion = useReducedMotion();
  const activeTasksCount = tasks.filter(t => t.status === "open").length;

  const menuGroups = [
    {
      label: "Main",
      items: [
        { id: "dashboard", label: "Dashboard", icon: Layers },
        { 
          id: "clients", 
          label: "Client Database", 
          icon: Users,
          badge: clients.length 
        },
        { 
          id: "pipeline", 
          label: "Pipeline Board", 
          icon: () => (
            <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          ) 
        },
      ]
    },
    {
      label: "Tools & AI",
      items: [
        { id: "ai", label: "AI Assistant ✦", icon: BrainCircuit, highlight: true },
        { id: "calculators", label: "Calculators", icon: Calculator },
        { id: "lenders", label: "Lender Sheets", icon: Globe },
      ]
    },
    {
      label: "Team & Comms",
      items: [
        { id: "calendar", label: "Calendar", icon: Calendar },
        { 
          id: "tasks", 
          label: "Daily Tasks", 
          icon: CheckSquare,
          badge: activeTasksCount 
        },
        { id: "messages", label: "Team Channels", icon: MessageSquare },
        { id: "emails", label: "Email", icon: Mail },
      ]
    },
    {
      label: "Operations",
      items: [
        { id: "retention", label: "CRM Retention", icon: Heart },
        { 
          id: "partners", 
          label: "Partner Network", 
          icon: () => (
            <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3"/>
              <circle cx="12" cy="7" r="4"/>
              <path d="M12 12c-2.3 0-5.3 1.1-6.1 3.5"/>
            </svg>
          ) 
        },
        ...((isOwner || currentUser.role === "Developer/Admin" || currentUser.role === "Admin")
          ? [{ id: "reports", label: "Reports", icon: BarChart3 }]
          : []),
        { id: "compliance", label: "Compliance", icon: ShieldCheck },
        { 
          id: "file_readiness", 
          label: "File Readiness", 
          icon: () => (
            <svg className="h-4 w-4 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="m9 15 2 2 4-4"/>
            </svg>
          ) 
        },
        ...((isOwner || currentUser.role === "Developer/Admin" || currentUser.role === "Admin") 
          ? [{ id: "admin", label: "Admin Panel", icon: ShieldAlert, alert: true }] 
          : []),
        { id: "settings", label: "Settings", icon: Settings },
      ]
    }
  ];

  return (
    <aside
      className="w-56 flex flex-col h-full shrink-0 z-40 relative select-none"
      style={{
        background: "var(--grad-sidebar)",
        boxShadow: "var(--shadow-sidebar)",
        borderRight: "1px solid var(--color-sidebar-border)"
      }}
    >
      {/* ── Header Block ── */}
      <div
        className="h-20 flex flex-col justify-center px-4 relative overflow-hidden shrink-0"
        style={{
          background: "var(--grad-sidebar-header)",
          borderBottom: "1px solid var(--color-sidebar-border)"
        }}
      >
        {/* Subtle inner glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(249, 177, 122, 0.08) 0%, transparent 70%)"
          }}
        />

        <div className="flex items-center gap-2.5 z-10">
          {/* Shield logo mark */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "var(--grad-warm-highlight)",
              boxShadow: "0 3px 10px rgba(244, 163, 132, 0.2)"
            }}
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-white tracking-wide leading-tight">
              GBK Financial
            </span>
            <span
              className="text-[9px] font-bold tracking-[1.5px] uppercase leading-tight mt-0.5"
              style={{ color: "var(--color-text-sidebar-muted)" }}
            >
              Ontario Mortgage CRM
            </span>
          </div>
        </div>
      </div>

      {/* ── Nav List ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3.5 flex flex-col gap-3 select-none">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="flex flex-col gap-0.5">
            {/* Group label */}
            <div
              className="text-[10px] uppercase tracking-[1.5px] font-bold px-3 py-1 mb-1"
              style={{ color: "var(--color-text-sidebar-muted)" }}
            >
              {group.label}
            </div>

            {group.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  whileHover={{}}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  className="group relative flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg outline-none cursor-pointer w-full text-left"
                  style={{
                    color: isActive
                      ? "#FFFFFF"
                      : "var(--color-text-sidebar)",
                    fontWeight: isActive ? 700 : 600,
                    transition: "var(--transition-fast)"
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "var(--color-sidebar-hover)";
                      (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-sidebar)";
                    }
                  }}
                >
                  {/* Active slide indicator (refined to be card-like/pill highlight) */}
                  {isActive && (
                    <>
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          background: "var(--color-sidebar-active)",
                          border: "1px solid rgba(249, 177, 122, 0.20)",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
                        }}
                      />
                      {/* Slim rounded left-side active indicator */}
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute left-1.5 top-1.5 bottom-1.5 w-[3px] rounded-full z-20 pointer-events-none"
                        style={{
                          background: "var(--color-brand-peach)"
                        }}
                      />
                    </>
                  )}

                  <span className="flex items-center gap-2.5 z-10">
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{
                        color: isActive
                          ? "var(--color-brand-peach)"
                          : item.highlight
                            ? "var(--color-brand-peach)"
                            : item.alert
                              ? "var(--color-error)"
                              : "var(--color-text-sidebar-muted)",
                        transition: "var(--transition-fast)"
                      }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="z-10 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-4 text-center"
                      style={{
                        background: "var(--color-brand-peach)",
                        color: "var(--color-brand-slate-darker)"
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom User Area ── */}
      <div
        className="p-3 flex flex-col gap-3 shrink-0"
        style={{ borderTop: "1px solid var(--color-sidebar-border)" }}
      >
        {/* Profile card */}
        <div
          onClick={onOpenProfileManager}
          className="p-2.5 cursor-pointer rounded-xl flex items-center gap-2.5 select-none"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--color-sidebar-border)",
            transition: "var(--transition-smooth)"
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-sidebar-active)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(103, 111, 157, 0.3)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-sidebar-border)";
          }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
            style={{
              background: "var(--grad-warm-highlight)",
              boxShadow: "0 2px 8px rgba(244, 163, 132, 0.3)"
            }}
          >
            {currentUser.name
              ? currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase()
              : "U"}
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-black truncate"
              style={{ color: "#FFFFFF" }}
            >
              {currentUser.name || `${currentUser.first || ''} ${currentUser.last || ''}`.trim() || currentUser.displayName || "User Profile"}
            </div>
            <div
              className="text-[10px] truncate font-semibold leading-none mt-0.5"
              style={{ color: "var(--color-text-sidebar-muted)" }}
            >
              {currentUser.role || "Mortgage Broker"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
