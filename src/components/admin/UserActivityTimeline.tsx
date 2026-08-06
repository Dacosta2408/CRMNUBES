import React, { useState, useMemo } from "react";
import { 
  Clock, Filter, Search, User, Shield, Key, Eye, FileText, 
  UserX, Download, ArrowRight, Activity, Calendar, Tag, AlertCircle, CheckCircle2, ChevronRight, X
} from "lucide-react";
import { User as UserType } from "../../types";

export interface UserActivityEvent {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  category: "auth" | "permission" | "data" | "offboarding" | "system" | "compliance";
  details: string;
  timestamp: string;
  ipAddress?: string;
  location?: string;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, any>;
}

interface UserActivityTimelineProps {
  users: UserType[];
  selectedUser?: UserType | null;
  customEvents?: UserActivityEvent[];
  onClose?: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const UserActivityTimeline: React.FC<UserActivityTimelineProps> = ({
  users,
  selectedUser,
  customEvents = [],
  onClose,
  showToast
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>(selectedUser ? selectedUser.id : "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<UserActivityEvent | null>(null);

  // Generate realistic seed timeline events combined with custom logs
  const timelineEvents = useMemo<UserActivityEvent[]>(() => {
    const defaultEvents: UserActivityEvent[] = [];
    const now = new Date();

    users.forEach((u, uIdx) => {
      const uName = `${u.first} ${u.last}`;
      
      // Event 1: Recent login
      defaultEvents.push({
        id: `evt_login_${u.id}_1`,
        userId: u.id,
        userName: uName,
        userRole: u.role,
        action: "User Authentication",
        category: "auth",
        details: `Successful 2FA password login from workstation terminal (${192 + uIdx}.${168 + (uIdx % 5)}.${10 + uIdx}.${42}).`,
        timestamp: new Date(now.getTime() - (uIdx * 3600000 + 1200000)).toISOString(),
        ipAddress: `${192 + uIdx}.${168 + (uIdx % 5)}.${10 + uIdx}.${42}`,
        location: "Toronto, ON, Canada",
        severity: "info",
        metadata: { browser: "Chrome 122.0 / macOS", sessionDuration: "4h 12m" }
      });

      // Event 2: Data action
      defaultEvents.push({
        id: `evt_data_${u.id}_2`,
        userId: u.id,
        userName: uName,
        userRole: u.role,
        action: "Client Application Update",
        category: "data",
        details: `Modified income verification records and updated closing date on client mortgage file.`,
        timestamp: new Date(now.getTime() - (uIdx * 86400000 + 4300000)).toISOString(),
        ipAddress: `${192 + uIdx}.${168 + (uIdx % 5)}.${10 + uIdx}.${42}`,
        location: "Toronto, ON, Canada",
        severity: "info",
        metadata: { clientFileId: `cli_${uIdx + 101}`, fieldsUpdated: ["income", "closingDate"] }
      });

      // Event 3: Permission or Clearance change if level set
      if (u.clearanceLevel) {
        defaultEvents.push({
          id: `evt_perm_${u.id}_3`,
          userId: u.id,
          userName: uName,
          userRole: u.role,
          action: "Clearance Level Verification",
          category: "permission",
          details: `Security clearance verified at Level ${u.clearanceLevel} with active module permissions.`,
          timestamp: new Date(now.getTime() - (uIdx * 172800000 + 8600000)).toISOString(),
          ipAddress: "10.0.4.1 (Admin Gateway)",
          location: "Internal System",
          severity: "warning",
          metadata: { clearanceLevel: u.clearanceLevel, verifiedBy: "Admin Operator" }
        });
      }

      // Event 4: Status / Offboarding if inactive
      if (u.status === "inactive" || u.status === "Inactive") {
        defaultEvents.push({
          id: `evt_off_${u.id}_4`,
          userId: u.id,
          userName: uName,
          userRole: u.role,
          action: "Access Revoked / Account Deactivated",
          category: "offboarding",
          details: `User account deactivated during offboarding protocol. Clients reassigned.`,
          timestamp: new Date(now.getTime() - (uIdx * 259200000 + 12000000)).toISOString(),
          ipAddress: "10.0.4.1 (Admin Gateway)",
          location: "Internal System",
          severity: "critical",
          metadata: { revokedReason: "Offboarding Checklist", clientsReassigned: 4 }
        });
      }
    });

    const combined = [...customEvents, ...defaultEvents];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [users, customEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return timelineEvents.filter(evt => {
      if (categoryFilter !== "all" && evt.category !== categoryFilter) return false;
      if (userFilter !== "all" && evt.userId !== userFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchText = `${evt.userName} ${evt.action} ${evt.details} ${evt.userRole}`.toLowerCase();
        if (!matchText.includes(query)) return false;
      }
      return true;
    });
  }, [timelineEvents, categoryFilter, userFilter, searchTerm]);

  // Helper badge for categories
  const getCategoryBadge = (cat: UserActivityEvent["category"]) => {
    switch (cat) {
      case "auth":
        return { label: "Auth / Login", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Key };
      case "permission":
        return { label: "Permission", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: Shield };
      case "data":
        return { label: "Data / Client", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: FileText };
      case "offboarding":
        return { label: "Offboarding", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: UserX };
      case "compliance":
        return { label: "Compliance", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: CheckCircle2 };
      default:
        return { label: "System", color: "bg-gray-500/15 text-gray-400 border-gray-500/30", icon: Activity };
    }
  };

  const handleExportTimeline = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Timestamp,User,Role,Category,Action,Details,IP Address\n" +
      filteredEvents.map(e => `"${e.timestamp}","${e.userName}","${e.userRole}","${e.category}","${e.action}","${e.details.replace(/"/g, '""')}","${e.ipAddress || ''}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_activity_timeline_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast("Exported activity timeline CSV!", "success");
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-5 shadow-sm">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-xl border border-[var(--color-accent)]/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              User Activity Audit Timeline
              {selectedUser && (
                <span className="text-xs font-normal text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--color-accent)]/20">
                  {selectedUser.first} {selectedUser.last}
                </span>
              )}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Chronological log of staff system interactions, security events, and data changes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTimeline}
            className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Export CSV
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
          <input
            type="text"
            placeholder="Search action or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="all">All Event Categories</option>
            <option value="auth">Auth &amp; Logins</option>
            <option value="permission">Permissions &amp; Clearance</option>
            <option value="data">Data &amp; Client Files</option>
            <option value="offboarding">Offboarding &amp; Revocation</option>
            <option value="compliance">Compliance &amp; Audits</option>
          </select>
        </div>

        {/* User Filter */}
        <div>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="all">All Users ({users.length})</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.first} {u.last} ({u.role})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-border)] max-h-[500px] overflow-y-auto pr-2">
        {filteredEvents.map((evt) => {
          const badge = getCategoryBadge(evt.category);
          const IconComp = badge.icon;
          
          return (
            <div key={evt.id} className="relative group">
              {/* Node Icon on vertical line */}
              <div className={`absolute -left-6 top-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${badge.color}`}>
                <IconComp className="w-3 h-3" />
              </div>

              {/* Event Content Card */}
              <div
                onClick={() => setSelectedEvent(evt)}
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] p-3.5 rounded-xl transition-all cursor-pointer space-y-2 shadow-xs group-hover:border-[var(--color-accent)]/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text)]">
                      {evt.userName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                      {evt.userRole}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-[var(--color-text-faint)]">
                    {new Date(evt.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-xs font-semibold text-[var(--color-text)]">
                  {evt.action}
                </div>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {evt.details}
                </p>

                <div className="pt-1 flex items-center justify-between text-[10px] text-[var(--color-text-faint)] font-mono">
                  <span>IP: {evt.ipAddress || "192.168.1.1"} ({evt.location || "Local Terminal"})</span>
                  <span className="text-[var(--color-accent)] flex items-center gap-1 group-hover:underline font-bold">
                    View Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="py-12 text-center text-[var(--color-text-faint)] space-y-2">
            <Activity className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-xs font-bold text-[var(--color-text)]">No timeline events match filter</p>
            <p className="text-xs text-[var(--color-text-muted)]">Try selecting a different category or clearing search term.</p>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Timeline Event Payload Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[var(--color-surface-2)] p-3 rounded-xl border border-[var(--color-border)] space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--color-text-faint)]">Action:</span>
                  <span className="font-bold text-[var(--color-text)]">{selectedEvent.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--color-text-faint)]">User:</span>
                  <span className="text-[var(--color-text)]">{selectedEvent.userName} ({selectedEvent.userRole})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--color-text-faint)]">Timestamp:</span>
                  <span className="font-mono text-[var(--color-text)]">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--color-text-faint)]">Category:</span>
                  <span className="font-mono text-[var(--color-accent)] font-bold uppercase">{selectedEvent.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--color-text-faint)]">IP &amp; Location:</span>
                  <span className="font-mono text-[var(--color-text)]">{selectedEvent.ipAddress} - {selectedEvent.location}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] block mb-1">
                  Full Log Details
                </label>
                <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] text-[var(--color-text)] leading-relaxed font-mono text-[11px]">
                  {selectedEvent.details}
                </div>
              </div>

              {selectedEvent.metadata && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] block mb-1">
                    System Metadata
                  </label>
                  <pre className="p-3 bg-black/40 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto border border-[var(--color-border)]">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
