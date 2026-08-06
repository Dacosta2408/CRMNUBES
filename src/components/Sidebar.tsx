import React, { useState, useEffect, useRef, memo } from "react";
import { 
  Users, Layers, BrainCircuit, Calculator, Globe, Calendar, 
  CheckSquare, MessageSquare, Mail, Heart, ShieldCheck, ShieldAlert,
  Settings, BarChart3, ChevronDown, ChevronUp,
  PanelLeftClose, PanelLeftOpen, X, Keyboard, LogOut, Lock, HelpCircle,
  User as UserIcon, Sliders
} from "lucide-react";
import { User, Client, Task, Event } from "../types";
import { Avatar } from "./Avatar";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

export interface SidebarProps {
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
  onOpenShortcutsModal?: () => void;
  onOpenHelp?: () => void;
  onSignOut?: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
  highlight?: boolean;
  alert?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = memo(({
  activeTab,
  setActiveTab,
  currentUser,
  clients,
  tasks,
  events,
  onOpenSettings,
  onLockApp,
  isOwner,
  onOpenProfileManager,
  onOpenShortcutsModal,
  onOpenHelp,
  onSignOut,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const shouldReduceMotion = useReducedMotion();
  const activeTasksCount = tasks.filter(t => t.status === "open").length;

  // Sidebar collapsed state (desktop)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("gbk_sidebar_collapsed") === "true";
  });

  // Collapsed state per group section
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Profile dropdown state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Tooltip hover state
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Sync isCollapsed to localStorage
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("gbk_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleGroupCollapse = (groupLabel: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

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

  const menuGroups: MenuGroup[] = [
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
        { 
          id: "tasks", 
          label: "Daily Tasks", 
          icon: CheckSquare,
          badge: activeTasksCount 
        },
      ]
    },
    {
      label: "Communication",
      items: [
        { id: "messages", label: "Team Channels", icon: MessageSquare },
        { id: "emails", label: "Email Hub", icon: Mail },
        { id: "calendar", label: "Calendar", icon: Calendar },
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
        { id: "lenders", label: "Lender Sheets", icon: Globe },
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
      ]
    },
    {
      label: "Tools & Analytics",
      items: [
        { id: "ai", label: "AI Assistant ✦", icon: BrainCircuit, highlight: true },
        { id: "calculators", label: "Calculators", icon: Calculator },
        ...((isOwner || currentUser.role === "Developer/Admin" || currentUser.role === "Admin")
          ? [{ id: "reports", label: "Reports & Stats", icon: BarChart3 }]
          : []),
      ]
    },
    {
      label: "Admin & System",
      items: [
        { id: "compliance", label: "Compliance", icon: ShieldCheck },
        ...((isOwner || currentUser.role === "Developer/Admin" || currentUser.role === "Admin") 
          ? [{ id: "admin", label: "Admin Panel", icon: ShieldAlert, alert: true }] 
          : []),
        { id: "settings", label: "Settings", icon: Settings },
      ]
    }
  ];

  // Content renderer for the sidebar interior
  const renderSidebarContent = (isMobileDrawer = false) => {
    const effectiveCollapsed = isMobileDrawer ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full w-full select-none overflow-hidden relative">
        {/* ── Header Block ── */}
        <div
          className={`h-16 flex items-center ${effectiveCollapsed ? "justify-center px-2" : "justify-between px-4"} relative overflow-hidden shrink-0 border-b border-[var(--color-sidebar-border)]`}
          style={{ background: "var(--grad-sidebar-header)" }}
        >
          {/* Subtle inner glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 20% 50%, rgba(249, 177, 122, 0.08) 0%, transparent 70%)"
            }}
          />

          <div className="flex items-center gap-2.5 z-10 min-w-0">
            {/* Shield logo mark */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setActiveTab("dashboard");
                if (isMobileDrawer && setIsMobileOpen) setIsMobileOpen(false);
              }}
              style={{
                background: "var(--grad-warm-highlight)",
                boxShadow: "0 3px 12px rgba(244, 163, 132, 0.25)"
              }}
              title="GBK Financial Dashboard"
            >
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>

            {!effectiveCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-extrabold text-white tracking-wide leading-tight truncate">
                  GBK Financial
                </span>
                <span
                  className="text-[9px] font-bold tracking-[1.2px] uppercase leading-tight mt-0.5"
                  style={{ color: "var(--color-text-sidebar-muted)" }}
                >
                  Mortgage CRM
                </span>
              </div>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {isMobileDrawer && setIsMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── Navigation List ── */}
        <nav 
          className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2.5 select-none scrollbar-thin"
          role="navigation"
          aria-label="Main Navigation"
        >
          {menuGroups.map((group, gIdx) => {
            const isGroupCollapsed = !!collapsedGroups[group.label];

            return (
              <div key={gIdx} className="flex flex-col gap-0.5">
                {/* Group label */}
                {!effectiveCollapsed ? (
                  <button
                    onClick={() => toggleGroupCollapse(group.label)}
                    className="flex items-center justify-between text-[10px] uppercase tracking-[1.3px] font-bold px-2 py-1 mt-1 text-[var(--color-text-sidebar-muted)] hover:text-white/80 transition-colors w-full text-left cursor-pointer group"
                  >
                    <span>{group.label}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {isGroupCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </span>
                  </button>
                ) : (
                  <div className="my-1 border-t border-white/10" />
                )}

                {/* Group items */}
                {!isGroupCollapsed && group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  const isHovered = hoveredItemId === item.id;

                  return (
                    <div key={item.id} className="relative">
                      <motion.button
                        onClick={() => {
                          setActiveTab(item.id);
                          if (isMobileDrawer && setIsMobileOpen) {
                            setIsMobileOpen(false);
                          }
                        }}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                        aria-label={item.label}
                        aria-current={isActive ? "page" : undefined}
                        className={`sidebar-nav-btn group relative flex items-center ${
                          effectiveCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
                        } text-xs font-semibold rounded-xl outline-none cursor-pointer w-full text-left transition-all`}
                        style={{
                          color: isActive ? "#FFFFFF" : "var(--color-text-sidebar)",
                          fontWeight: isActive ? 700 : 600,
                          background: isActive 
                            ? "rgba(255, 255, 255, 0.12)" 
                            : "transparent"
                        }}
                      >
                        {/* Active indicator line & glow */}
                        {isActive && (
                          <>
                            <motion.div
                              layoutId="sidebar-active-pill"
                              className="absolute inset-0 rounded-xl pointer-events-none"
                              style={{
                                background: item.id === "pipeline"
                                  ? "linear-gradient(135deg, rgba(255, 65, 108, 0.28) 0%, rgba(255, 179, 71, 0.18) 100%)"
                                  : item.id === "partners"
                                  ? "linear-gradient(135deg, rgba(86, 171, 47, 0.28) 0%, rgba(168, 224, 99, 0.18) 100%)"
                                  : "var(--color-sidebar-active)",
                                border: `1px solid ${iconColorMap[item.id] ?? "rgba(249,177,122,0.3)"}44`,
                                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)"
                              }}
                            />
                            {/* Left border accent line */}
                            <motion.div
                              layoutId="sidebar-active-accent"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 rounded-r-full z-20 pointer-events-none"
                              style={{
                                background: iconColorMap[item.id] ?? "var(--color-brand-peach)",
                                boxShadow: `0 0 10px ${iconColorMap[item.id] ?? "rgba(249,177,122,0.8)"}`
                              }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          </>
                        )}

                        <span className="flex items-center gap-2.5 z-10 min-w-0">
                          <Icon
                            className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
                            style={{
                              color: item.alert
                                ? "var(--color-error)"
                                : iconColorMap[item.id] ?? "var(--color-text-sidebar-muted)",
                              filter: isActive
                                ? `drop-shadow(0 0 6px ${iconColorMap[item.id] ?? "#ffffff"}aa)`
                                : "none"
                            }}
                          />
                          {!effectiveCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </span>

                        {/* Badge */}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`z-10 text-[9px] font-black px-1.5 py-0.5 rounded-full text-center ${
                              effectiveCollapsed ? "absolute top-1 right-1 px-1 py-0 text-[8px]" : ""
                            }`}
                            style={{
                              background: `${iconColorMap[item.id] ?? "var(--color-brand-peach)"}28`,
                              color: iconColorMap[item.id] ?? "var(--color-brand-peach)",
                              border: `1px solid ${iconColorMap[item.id] ?? "var(--color-brand-peach)"}55`
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </motion.button>

                      {/* Tooltip for collapsed sidebar view */}
                      {effectiveCollapsed && isHovered && (
                        <div 
                          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-2xl border border-white/15 bg-slate-900/95 text-white text-xs font-bold whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
                          style={{
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 198, 255, 0.15)"
                          }}
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ background: iconColorMap[item.id] ?? "#00C6FF" }}
                          />
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white text-[10px] rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── Footer: Collapse Toggle & Profile Section ── */}
        <div 
          className="p-2.5 flex flex-col gap-2 shrink-0 border-t border-[var(--color-sidebar-border)] relative"
          ref={profileMenuRef}
        >
          {/* User Profile Dropdown Menu */}
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`absolute bottom-full mb-2 ${
                  effectiveCollapsed ? "left-2 w-56" : "left-2 right-2"
                } bg-slate-900/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-1 text-xs`}
                style={{
                  boxShadow: "0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,198,255,0.15)"
                }}
              >
                {/* Header in popover */}
                <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2.5">
                  <Avatar 
                    src={currentUser.photo}
                    first={currentUser.first}
                    last={currentUser.last}
                    name={currentUser.displayName || currentUser.name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white truncate text-xs">
                      {currentUser.displayName || `${currentUser.first || ''} ${currentUser.last || ''}`.trim() || currentUser.name || "Broker Profile"}
                    </div>
                    <div className="text-[10px] text-white/60 truncate">
                      {currentUser.jobTitle || currentUser.role || currentUser.email || "Mortgage Broker"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfileManager();
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-white/10 text-white/90 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <UserIcon className="w-4 h-4 text-[#00C6FF]" />
                  <span>My Profile & Avatar</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-white/10 text-white/90 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <Sliders className="w-4 h-4 text-[#A855F7]" />
                  <span>Account Preferences</span>
                </button>

                {onOpenShortcutsModal && (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenShortcutsModal();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-white/10 text-white/90 hover:text-white flex items-center justify-between gap-2.5 transition-colors cursor-pointer font-medium"
                  >
                    <span className="flex items-center gap-2.5">
                      <Keyboard className="w-4 h-4 text-[#FF8800]" />
                      <span>Keyboard Shortcuts</span>
                    </span>
                    <kbd className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/70">?</kbd>
                  </button>
                )}

                {onOpenHelp && (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenHelp();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-white/10 text-white/90 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                  >
                    <HelpCircle className="w-4 h-4 text-[#56AB2F]" />
                    <span>Help & Support</span>
                  </button>
                )}

                <div className="border-t border-white/10 my-1" />

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLockApp();
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-500/20 text-red-300 hover:text-red-200 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                >
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>Lock Workstation</span>
                </button>

                {onSignOut && (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-500/20 text-red-300 hover:text-red-200 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Card Button */}
          <div
            onClick={() => setIsProfileMenuOpen(prev => !prev)}
            className={`cursor-pointer flex items-center ${effectiveCollapsed ? "justify-center p-2" : "gap-2.5 p-2.5"} rounded-2xl select-none relative group transition-all duration-200`}
            style={{
              background: "rgba(0, 198, 255, 0.10)",
              border: "1px solid rgba(0, 198, 255, 0.22)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              boxShadow: "0 0 16px rgba(0, 114, 255, 0.08)"
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 198, 255, 0.20)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 198, 255, 0.40)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0, 198, 255, 0.20)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 198, 255, 0.10)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 198, 255, 0.22)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(0, 114, 255, 0.08)";
            }}
            title={effectiveCollapsed ? `${currentUser.displayName || currentUser.name} - Profile & Options` : undefined}
          >
            <Avatar 
              src={currentUser.photo}
              first={currentUser.first}
              last={currentUser.last}
              name={currentUser.displayName || currentUser.name}
              size="sm"
            />

            {!effectiveCollapsed && (
              <div className="flex-1 min-w-0 pr-0.5">
                <div className="text-xs font-extrabold text-white truncate leading-tight">
                  {currentUser.displayName || `${currentUser.first || ''} ${currentUser.last || ''}`.trim() || currentUser.name || "Broker Profile"}
                </div>
                <div className="text-[10px] font-medium text-white/70 truncate mt-0.5">
                  {currentUser.jobTitle || currentUser.role || currentUser.email || "Mortgage Broker"}
                </div>
              </div>
            )}

            {!effectiveCollapsed && (
              <ChevronUp className={`w-4 h-4 text-white/60 transition-transform ${isProfileMenuOpen ? "rotate-180" : ""}`} />
            )}
          </div>

          {/* Desktop Sidebar Collapse Toggle Button */}
          {!isMobileDrawer && (
            <button
              onClick={toggleCollapse}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer text-xs font-semibold mt-0.5"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[var(--color-accent)]" />
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-white/60" />
                  <span className="text-[11px]">Collapse Sidebar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Desktop Permanent Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col h-full shrink-0 z-40 relative select-none transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
        style={{
          background: "var(--grad-sidebar)",
          boxShadow: "var(--shadow-sidebar)",
          borderRight: "1px solid var(--color-sidebar-border)"
        }}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* ── Mobile Sliding Drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] h-full z-10 shadow-2xl flex flex-col"
              style={{
                background: "var(--grad-sidebar)",
                borderRight: "1px solid var(--color-sidebar-border)"
              }}
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

Sidebar.displayName = "Sidebar";
