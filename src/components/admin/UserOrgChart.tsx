import React, { useState, useMemo } from "react";
import { 
  Building2, Users, ChevronDown, ChevronRight, User, Shield, 
  Briefcase, Mail, Phone, Search, Sparkles, Tag, CheckCircle2
} from "lucide-react";
import { User as UserType, Client } from "../../types";
import { Avatar } from "../Avatar";

interface UserOrgChartProps {
  users: UserType[];
  clients?: Client[];
  onSelectUser?: (u: UserType) => void;
}

interface TreeNode {
  user: UserType;
  reports: TreeNode[];
}

export const UserOrgChart: React.FC<UserOrgChartProps> = ({
  users,
  clients = [],
  onSelectUser
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (userId: string) => {
    setCollapsedNodes(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Build hierarchical tree
  const treeData = useMemo<TreeNode[]>(() => {
    const userMap = new Map<string, UserType>();
    users.forEach(u => userMap.set(u.id, u));

    // Map by full name or ID for reportingTo
    const nameToUser = new Map<string, UserType>();
    users.forEach(u => {
      const full = `${u.first || ""} ${u.last || ""}`.trim().toLowerCase();
      if (full) nameToUser.set(full, u);
      if (u.first) nameToUser.set(u.first.toLowerCase(), u);
    });

    const childrenMap = new Map<string, UserType[]>();
    const rootUsers: UserType[] = [];

    users.forEach(u => {
      let manager: UserType | undefined;
      if (u.reportingTo) {
        const mgrKey = u.reportingTo.toLowerCase();
        manager = userMap.get(u.reportingTo) || nameToUser.get(mgrKey);
      }

      if (manager && manager.id !== u.id) {
        const existing = childrenMap.get(manager.id) || [];
        childrenMap.set(manager.id, [...existing, u]);
      } else {
        rootUsers.push(u);
      }
    });

    // Helper recursive build
    const buildNode = (u: UserType): TreeNode => {
      const reports = (childrenMap.get(u.id) || []).map(buildNode);
      return { user: u, reports };
    };

    return rootUsers.map(buildNode);
  }, [users]);

  // Helper to calculate client count
  const getClientCount = (u: UserType) => {
    const uId = (u.id || "").toLowerCase();
    const uName = `${u.first || ""} ${u.last || ""}`.trim().toLowerCase();
    return clients.filter(c => {
      const owner = (c.retentionOwner || "").toLowerCase();
      const agent = (c.agent || "").toLowerCase();
      const assignedBroker = (c.assignedBroker || "").toLowerCase();
      return owner === uId || agent === uId || assignedBroker === uId || (uName && (owner === uName || agent === uName));
    }).length;
  };

  // Render recursive node
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const { user, reports } = node;
    const isCollapsed = !!collapsedNodes[user.id];
    const clientCount = getClientCount(user);

    // Filter check
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const nameMatch = `${user.first || ""} ${user.last || ""}`.toLowerCase().includes(query) || (user.role || "").toLowerCase().includes(query);
      if (!nameMatch && reports.length === 0) return null;
    }

    return (
      <div key={user.id} className="relative pl-6 my-3 border-l-2 border-[var(--color-border)] transition-all">
        {/* Node Card */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/60 rounded-2xl p-4 transition-all shadow-xs space-y-3 max-w-md">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar first={user.first} last={user.last} src={user.photo || user.profilePhoto} size="md" />
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  {user.first} {user.last}
                  {user.status === "active" || user.status === "Active" ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-red-400" title="Inactive" />
                  )}
                </h4>
                <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {user.role} {user.brokerage ? `• ${user.brokerage}` : ""}
                </p>
              </div>
            </div>

            {reports.length > 0 && (
              <button
                onClick={() => toggleNode(user.id)}
                className="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer text-[10px] font-bold flex items-center gap-1"
              >
                {reports.length} Direct Reports {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Details Row */}
          <div className="pt-2 border-t border-[var(--color-border)]/60 flex flex-wrap items-center justify-between text-[10px] text-[var(--color-text-muted)] font-mono gap-2">
            <div>Clearance: <strong className="text-[var(--color-accent)]">Level {user.clearanceLevel || 2}</strong></div>
            <div>Assigned Clients: <strong className="text-emerald-400">{clientCount} Files</strong></div>
          </div>

          {/* Tags */}
          {user.tags && user.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {user.tags.map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-[9px] font-bold">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          {onSelectUser && (
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => onSelectUser(user)}
                className="text-[10px] font-bold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                View Full Profile &rarr;
              </button>
            </div>
          )}

        </div>

        {/* Render Child Reports */}
        {!isCollapsed && reports.length > 0 && (
          <div className="ml-2 space-y-2">
            {reports.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-5 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              Organizational Structure &amp; Hierarchy
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Visual reporting structure from Managing Brokers down to Agents and Assistants.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
          <input
            type="text"
            placeholder="Search hierarchy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Org Tree Container */}
      <div className="overflow-x-auto py-2 pr-4">
        {treeData.map(node => renderNode(node, 0))}

        {treeData.length === 0 && (
          <div className="py-12 text-center text-[var(--color-text-faint)] text-xs">
            No organizational hierarchy records found.
          </div>
        )}
      </div>

    </div>
  );
};
