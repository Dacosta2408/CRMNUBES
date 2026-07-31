import React from "react";
import { ListFilter, Shield, Mail, UserPlus, CheckCircle, RefreshCw, FileText, Settings } from "lucide-react";
import { formatDateInTimeZone, useUserTimeZone } from "../../lib/timeUtils";

interface RecentActivityFeedProps {
  auditLogs: any[];
  setActiveTab: (tab: string) => void;
  currentUser: any;
  onClearActivity?: () => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  auditLogs,
  setActiveTab,
  currentUser,
  onClearActivity
}) => {
  const userTz = useUserTimeZone();
  const isManager = ["Developer/Admin", "Admin"].includes(currentUser.role);

  const timeAgo = (isoStr: string) => {
    if (!isoStr) return "Some time ago";
    const seconds = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return formatDateInTimeZone(isoStr, undefined, userTz);
  };

  // Get color and left border based on action type
  const getActivityStyles = (action: string) => {
    const act = action.toLowerCase();
    
    // 1. Accent for new clients
    if (act.includes("onboard") || act.includes("client") || act.includes("add") || act.includes("intake")) {
      return {
        icon: UserPlus,
        borderColor: "var(--color-accent)", // --color-accent
        iconColor: "text-[var(--color-accent)]",
        bg: "var(--color-accent-subtle)"
      };
    }

    // 2. Soft warning color for alerts / configs
    if (act.includes("setting") || act.includes("config") || act.includes("lock") || act.includes("security") || act.includes("warning") || act.includes("overdue") || act.includes("alert")) {
      return {
        icon: Settings,
        borderColor: "var(--color-warning)",
        iconColor: "text-[var(--color-warning)]",
        bg: "var(--color-warning-subtle)"
      };
    }

    // 3. Muted blue/slate for updates
    return {
      icon: act.includes("email") || act.includes("mail") ? Mail : act.includes("doc") ? FileText : RefreshCw,
      borderColor: "var(--color-border)",
      iconColor: "text-[var(--color-text-muted)]",
      bg: "var(--color-primary-subtle)"
    };
  };

  return (
    <div className="glass-card shadow-md p-5 flex flex-col gap-4" id="recent-activity-feed">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[var(--color-primary-subtle)] rounded-lg text-[var(--color-text-muted)]">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-[var(--color-text)] tracking-wider">Activity Feed</h3>
            <p className="text-[10px] text-[var(--color-text-faint)] mt-0.5 font-bold leading-none">
              Chronological log of verified workstation actions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClearActivity && (
            <button
              onClick={onClearActivity}
              className="text-[9px] text-[var(--color-text-faint)] hover:text-[var(--color-error)] font-black uppercase tracking-wider transition-colors cursor-pointer px-2 py-0.5 rounded border border-[var(--color-border)]/50 hover:border-[var(--color-error)]/30"
            >
              Clear
            </button>
          )}
          {isManager && (
            <button
              onClick={() => setActiveTab("admin")}
              className="text-[10px] text-[var(--color-accent)] font-bold hover:underline tracking-tight uppercase"
            >
              Manage Audit &rarr;
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[300px] flex flex-col gap-2.5 pr-1">
        {auditLogs.length > 0 ? (
          auditLogs.map((log, idx) => {
            const styles = getActivityStyles(log.action || "");
            const Icon = styles.icon;
            return (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-xl transition-all duration-200"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderLeft: `3px solid ${styles.borderColor}`
                }}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${styles.iconColor}`} style={{ background: styles.bg }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[var(--color-text)] leading-relaxed">
                    <span className="font-extrabold text-[var(--color-accent)] mr-1">{log.user || "System"}</span>
                    <span className="text-[var(--color-text)] font-medium opacity-90">{log.action || ""}</span>
                    {log.target && (
                      <span className="font-bold text-[var(--color-info)] ml-1.5 bg-[var(--color-info-subtle)] px-1.5 py-0.5 rounded border border-[var(--color-info)]/20 text-[10px]">
                        {log.target}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-[var(--color-text-faint)] font-mono font-bold mt-1.5 flex items-center gap-1.5">
                    <span>{timeAgo(log.time)}</span>
                    <span>•</span>
                    <span className="uppercase tracking-wider text-[8px] opacity-75">Verified</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-[var(--color-border)]/60 rounded-xl bg-[var(--color-surface-2)]/25 text-center">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)]/50 flex items-center justify-center border border-[var(--color-border)]/40 text-[var(--color-text-faint)] mb-2.5">
              <Shield className="w-4 h-4 opacity-70 text-[var(--color-accent)]" />
            </div>
            <h5 className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">No recent actions</h5>
            <p className="text-[9px] text-[var(--color-text-faint)] leading-relaxed mt-1 max-w-[190px] font-medium">
              No workstation logs have been generated during your active dashboard session yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
