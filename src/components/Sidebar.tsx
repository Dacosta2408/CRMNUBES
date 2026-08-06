import React from "react";
import { 
  Users, Layers, BrainCircuit, Calculator, Globe, Calendar, 
  CheckSquare, MessageSquare, Mail, Heart, ShieldCheck, ShieldAlert,
  Settings, BarChart3
} from "lucide-react";
import { User, Client, Task, Event } from "../types";
import { Avatar } from "./Avatar";
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

  React.useEffect(() => {
    document.querySelectorAll<HTMLElement>(".sidebar-nav-btn").forEach(el => {
      el.style.background = "";
      el.style.color = "";
    });
  }, [activeTab]);

  const iconColorMap: Record<string, string> = {
    dashboard:     "#00C6FF",
    clients:       "#56AB2F",
    pipeline:      "#FF416C",
    ai:            "#A855F7",
    calculators:   "#FF8800",
    lenders:       "#00FFFF",
    calendar:      "#8360C3",
    tasks:         "#FF7E5F",
    messages:      "#FF00CC",
    emails:        "#0072FF",
    retention:     "#FFB347",
    partners:      "#56AB2F",
    reports:       "#FCEE21",
    compliance:    "#0077FF",
    file_readiness:"#FEB47B",
    admin:         "var(--color-error)",
    settings:      "#FF8FBF",
  };

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
          icon: (props: React.ComponentProps<"svg">) => (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
              <defs>
                <linearGradient id="pipeline-sunset-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF416C" />
                  <stop offset="100%" stopColor="#FFB347" />
                </linearGradient>
              </defs>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="url(#pipeline-sunset-grad)" />
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
          icon: (props: React.ComponentProps<"svg">) => (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
              <defs>
                <linearGradient id="partners-nature-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#56AB2F" />
                  <stop offset="100%" stopColor="#A8E063" />
                </linearGradient>
              </defs>
              <g stroke="url(#partners-nature-grad)">
                <circle cx="18" cy="18" r="3"/>
                <circle cx="12" cy="7" r="4"/>
                <path d="M12 12c-2.3 0-5.3 1.1-6.1 3.5"/>
              </g>
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
          icon: (props: React.ComponentProps<"svg">) => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
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
                  className="sidebar-nav-btn group relative flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg outline-none cursor-pointer w-full text-left"
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
                      (e.currentTarget as HTMLElement).style.background = "";
                      (e.currentTarget as HTMLElement).style.color = "";
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
                          background: item.id === "pipeline"
                            ? "linear-gradient(135deg, rgba(255, 65, 108, 0.28) 0%, rgba(255, 179, 71, 0.18) 100%)"
                            : item.id === "partners"
                            ? "linear-gradient(135deg, rgba(86, 171, 47, 0.28) 0%, rgba(168, 224, 99, 0.18) 100%)"
                            : "var(--color-sidebar-active)",
                          border: item.id === "pipeline"
                            ? "1px solid rgba(255, 65, 108, 0.50)"
                            : item.id === "partners"
                            ? "1px solid rgba(86, 171, 47, 0.50)"
                            : `1px solid ${iconColorMap[item.id] ?? "rgba(249,177,122,0.20)"}33`,
                          boxShadow: item.id === "pipeline"
                            ? "0 4px 16px rgba(255, 65, 108, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
                            : item.id === "partners"
                            ? "0 4px 16px rgba(86, 171, 47, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
                            : "0 4px 12px rgba(0, 0, 0, 0.2)"
                        }}
                      />
                      {/* Slim rounded left-side active indicator */}
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-[6px] h-[26px] rounded-full z-20 pointer-events-none"
                        style={{
                          background: item.id === "pipeline"
                            ? "linear-gradient(180deg, #FF416C 0%, #FFB347 100%)"
                            : item.id === "partners"
                            ? "linear-gradient(180deg, #56AB2F 0%, #A8E063 100%)"
                            : iconColorMap[item.id] ?? "var(--color-brand-peach)",
                          boxShadow: item.id === "pipeline"
                            ? "0 0 12px 3px rgba(255, 65, 108, 0.75)"
                            : item.id === "partners"
                            ? "0 0 12px 3px rgba(86, 171, 47, 0.75)"
                            : `0 0 10px 3px ${iconColorMap[item.id] ?? "rgba(249,177,122,0.6)"}88,
                               0 0 4px 1px ${iconColorMap[item.id] ?? "rgba(249,177,122,0.4)"}bb`,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    </>
                  )}

                  <span className="flex items-center gap-2.5 z-10">
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{
                        color: item.alert
                          ? "var(--color-error)"
                          : iconColorMap[item.id] ?? "var(--color-text-sidebar-muted)",
                        filter: isActive
                          ? `drop-shadow(0 0 5px ${iconColorMap[item.id] ?? "#ffffff"}99)`
                          : "none",
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
                        background: `${iconColorMap[item.id] ?? "var(--color-brand-peach)"}22`,
                        color: iconColorMap[item.id] ?? "var(--color-brand-peach)",
                        border: `1px solid ${iconColorMap[item.id] ?? "var(--color-brand-peach)"}55`,
                        boxShadow: `0 0 6px ${iconColorMap[item.id] ?? "var(--color-brand-peach)"}44`
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
        {/* Profile card - Pill format with Ocean Breeze glass styling */}
        <div
          onClick={onOpenProfileManager}
          className="cursor-pointer flex items-center gap-2 p-2 rounded-full select-none"
          style={{
            background: "rgba(0, 198, 255, 0.12)",
            border: "1px solid rgba(0, 198, 255, 0.25)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            boxShadow: "0 0 16px rgba(0, 114, 255, 0.10)",
            transition: "var(--transition-smooth)"
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(0, 198, 255, 0.20)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 198, 255, 0.40)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0, 198, 255, 0.25)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(0, 198, 255, 0.12)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 198, 255, 0.25)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(0, 114, 255, 0.10)";
          }}
        >
          {/* Avatar */}
          <Avatar 
            src={currentUser.photo}
            first={currentUser.first}
            last={currentUser.last}
            name={currentUser.displayName || currentUser.name}
            size="sm"
          />

          <div className="flex-1 min-w-0 pr-1">
            <div className="text-xs font-semibold text-white truncate">
              {currentUser.displayName || `${currentUser.first || ''} ${currentUser.last || ''}`.trim() || currentUser.name || "Broker Profile"}
            </div>
            <div className="text-[10px] text-white/70 truncate">
              {currentUser.jobTitle || currentUser.role || currentUser.email || "Mortgage Broker"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
