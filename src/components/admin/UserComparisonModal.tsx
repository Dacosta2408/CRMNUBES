import React, { useState, useMemo } from "react";
import { 
  Users, Check, X, Shield, Key, Eye, AlertCircle, FileText, 
  Sparkles, Layers, CheckCircle2, User, Briefcase, Tag, Search
} from "lucide-react";
import { User as UserType, Client, Task } from "../../types";
import { DEFAULT_MODULE_KEYS } from "../../lib/clearanceMatrixDefaults";

interface UserComparisonModalProps {
  users: UserType[];
  initialSelectedUserIds?: string[];
  clients?: Client[];
  tasks?: Task[];
  onClose: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const UserComparisonModal: React.FC<UserComparisonModalProps> = ({
  users,
  initialSelectedUserIds = [],
  clients = [],
  tasks = [],
  onClose,
  showToast
}) => {
  // State for selected user IDs (limit 2 or 3)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedUserIds.length >= 2) return initialSelectedUserIds.slice(0, 3);
    if (users.length >= 2) return [users[0].id, users[1].id];
    return users.map(u => u.id).slice(0, 3);
  });

  // Highlight differences toggle
  const [highlightDiffs, setHighlightDiffs] = useState<boolean>(true);

  // Selected user objects
  const selectedUsers = useMemo(() => {
    return selectedIds.map(id => users.find(u => u.id === id)).filter(Boolean) as UserType[];
  }, [selectedIds, users]);

  // Helper to toggle user selection
  const toggleUserSelection = (userId: string) => {
    if (selectedIds.includes(userId)) {
      if (selectedIds.length <= 2) {
        if (showToast) showToast("At least 2 users must be selected for comparison.", "warning");
        return;
      }
      setSelectedIds(prev => prev.filter(id => id !== userId));
    } else {
      if (selectedIds.length >= 3) {
        if (showToast) showToast("You can compare up to 3 users at a time.", "info");
        return;
      }
      setSelectedIds(prev => [...prev, userId]);
    }
  };

  // Helper to get client count
  const getUserClientCount = (u: UserType) => {
    const uId = u.id.toLowerCase();
    const name = `${u.first} ${u.last}`.toLowerCase();
    return clients.filter(c => {
      const owner = (c.retentionOwner || "").toLowerCase();
      const agent = (c.agent || "").toLowerCase();
      const assignedBroker = (c.assignedBroker || "").toLowerCase();
      return owner === uId || agent === uId || assignedBroker === uId || owner === name || agent === name;
    }).length;
  };

  // Helper to check if a row has differences across selected users
  const isRowDifferent = (getter: (u: UserType) => any) => {
    if (selectedUsers.length < 2) return false;
    const firstVal = JSON.stringify(getter(selectedUsers[0]));
    return selectedUsers.some(u => JSON.stringify(getter(u)) !== firstVal);
  };

  // Modules list
  const modulesList = DEFAULT_MODULE_KEYS;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-5xl w-full p-6 space-y-6 shadow-2xl my-8">
        
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                User &amp; Permission Side-by-Side Comparison
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Comparing permissions, clearance levels, module access, and workloads across staff accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Highlight Differences Toggle */}
            <button
              onClick={() => setHighlightDiffs(!highlightDiffs)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                highlightDiffs 
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-xs" 
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {highlightDiffs ? "Highlight Diffs: ON" : "Highlight Diffs: OFF"}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Picker Row */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider block">
            Select Staff Members to Compare ({selectedUsers.length} / 3)
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map(u => {
              const isSelected = selectedIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUserSelection(u.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected 
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)] shadow-xs"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  {u.first} {u.last} ({u.role})
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="p-3 font-bold uppercase text-[10px] text-[var(--color-text-faint)] tracking-wider w-1/4">
                  Attribute / Permission
                </th>
                {selectedUsers.map(u => (
                  <th key={u.id} className="p-3 font-bold text-sm text-[var(--color-text)] text-center w-1/3 border-l border-[var(--color-border)]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-extrabold">{u.first} {u.last}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                        {u.role}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 font-sans">
              
              {/* SECTION: GENERAL METRICS */}
              <tr className="bg-[var(--color-surface-3)]/40 font-bold text-[10px] uppercase text-[var(--color-text-faint)] tracking-wider">
                <td colSpan={selectedUsers.length + 1} className="p-2 pl-3">
                  Account Profile &amp; Clearance
                </td>
              </tr>

              {/* Status Row */}
              <tr className={highlightDiffs && isRowDifferent(u => u.status) ? "bg-amber-500/10" : ""}>
                <td className="p-3 font-semibold text-[var(--color-text)] flex items-center justify-between">
                  <span>Account Status</span>
                  {highlightDiffs && isRowDifferent(u => u.status) && (
                    <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Diff</span>
                  )}
                </td>
                {selectedUsers.map(u => (
                  <td key={u.id} className="p-3 text-center border-l border-[var(--color-border)]">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.status === "active" || u.status === "Active" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Clearance Level Row */}
              <tr className={highlightDiffs && isRowDifferent(u => u.clearanceLevel) ? "bg-amber-500/10" : ""}>
                <td className="p-3 font-semibold text-[var(--color-text)] flex items-center justify-between">
                  <span>Clearance Level</span>
                  {highlightDiffs && isRowDifferent(u => u.clearanceLevel) && (
                    <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Diff</span>
                  )}
                </td>
                {selectedUsers.map(u => (
                  <td key={u.id} className="p-3 text-center border-l border-[var(--color-border)] font-mono font-bold text-[var(--color-accent)]">
                    Level {u.clearanceLevel || 2}
                  </td>
                ))}
              </tr>

              {/* Brokerage & License Row */}
              <tr className={highlightDiffs && isRowDifferent(u => u.licenseNumber) ? "bg-amber-500/10" : ""}>
                <td className="p-3 font-semibold text-[var(--color-text)] flex items-center justify-between">
                  <span>Brokerage / License #</span>
                  {highlightDiffs && isRowDifferent(u => u.licenseNumber) && (
                    <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Diff</span>
                  )}
                </td>
                {selectedUsers.map(u => (
                  <td key={u.id} className="p-3 text-center border-l border-[var(--color-border)]">
                    <div>{u.brokerage || "GBK Financial"}</div>
                    <div className="text-[10px] font-mono text-[var(--color-text-faint)]">{u.licenseNumber || "N/A"}</div>
                  </td>
                ))}
              </tr>

              {/* Tags Row */}
              <tr className={highlightDiffs && isRowDifferent(u => (u.tags || []).join(",")) ? "bg-amber-500/10" : ""}>
                <td className="p-3 font-semibold text-[var(--color-text)] flex items-center justify-between">
                  <span>Assigned Tags</span>
                  {highlightDiffs && isRowDifferent(u => (u.tags || []).join(",")) && (
                    <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Diff</span>
                  )}
                </td>
                {selectedUsers.map(u => (
                  <td key={u.id} className="p-3 text-center border-l border-[var(--color-border)]">
                    <div className="flex flex-wrap justify-center gap-1">
                      {(u.tags && u.tags.length > 0) ? u.tags.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-[10px] font-bold">
                          {t}
                        </span>
                      )) : <span className="text-[var(--color-text-faint)] italic">No tags</span>}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Active Clients Workload */}
              <tr className={highlightDiffs && isRowDifferent(u => getUserClientCount(u)) ? "bg-amber-500/10" : ""}>
                <td className="p-3 font-semibold text-[var(--color-text)] flex items-center justify-between">
                  <span>Assigned Clients</span>
                  {highlightDiffs && isRowDifferent(u => getUserClientCount(u)) && (
                    <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Diff</span>
                  )}
                </td>
                {selectedUsers.map(u => (
                  <td key={u.id} className="p-3 text-center border-l border-[var(--color-border)] font-mono font-bold text-[var(--color-text)]">
                    {getUserClientCount(u)} Files
                  </td>
                ))}
              </tr>

              {/* SECTION: MODULE PERMISSIONS */}
              <tr className="bg-[var(--color-surface-3)]/40 font-bold text-[10px] uppercase text-[var(--color-text-faint)] tracking-wider">
                <td colSpan={selectedUsers.length + 1} className="p-2 pl-3">
                  System Module Access
                </td>
              </tr>

              {modulesList.map((mObj) => {
                const mKey = mObj.key;
                const getModuleAccess = (u: UserType) => {
                  if (u.permissions && u.permissions[mKey as keyof typeof u.permissions] !== undefined) {
                    return u.permissions[mKey as keyof typeof u.permissions];
                  }
                  // Fallback by role / clearance
                  const level = u.clearanceLevel || (u.role.includes("Admin") ? 5 : u.role === "Broker" ? 3 : 2);
                  return level >= 3 ? "full" : "write";
                };

                const isDiff = isRowDifferent(getModuleAccess);

                return (
                  <tr key={mKey} className={highlightDiffs && isDiff ? "bg-amber-500/10" : ""}>
                    <td className="p-2.5 pl-3 font-medium text-[var(--color-text)] capitalize flex items-center justify-between">
                      <span>{mObj.name}</span>
                      {highlightDiffs && isDiff && (
                        <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Diff</span>
                      )}
                    </td>
                    {selectedUsers.map(u => {
                      const access = getModuleAccess(u);
                      return (
                        <td key={u.id} className="p-2.5 text-center border-l border-[var(--color-border)] font-mono text-[11px]">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            access === "full" ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" : access === "write" ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "bg-gray-500/15 text-gray-400"
                          }`}>
                            {access}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* SECTION: SPECIAL PERMISSIONS */}
              <tr className="bg-[var(--color-surface-3)]/40 font-bold text-[10px] uppercase text-[var(--color-text-faint)] tracking-wider">
                <td colSpan={selectedUsers.length + 1} className="p-2 pl-3">
                  Administrative Capabilities
                </td>
              </tr>

              {[
                { key: "canExport", label: "Can Export Data" },
                { key: "canManageUsers", label: "Can Manage Users" },
                { key: "canAccessAdmin", label: "Can Access Admin Panel" },
                { key: "canViewReports", label: "Can View Advanced Analytics" }
              ].map(spec => {
                const getSpecPerm = (u: UserType) => {
                  return !!(u.specialPermissions && u.specialPermissions[spec.key]);
                };
                const isDiff = isRowDifferent(getSpecPerm);

                return (
                  <tr key={spec.key} className={highlightDiffs && isDiff ? "bg-amber-500/10" : ""}>
                    <td className="p-2.5 pl-3 font-medium text-[var(--color-text)] flex items-center justify-between">
                      <span>{spec.label}</span>
                      {highlightDiffs && isDiff && (
                        <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Diff</span>
                      )}
                    </td>
                    {selectedUsers.map(u => {
                      const hasPerm = getSpecPerm(u);
                      return (
                        <td key={u.id} className="p-2.5 text-center border-l border-[var(--color-border)]">
                          {hasPerm ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <Check className="w-4 h-4" /> Allowed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[var(--color-text-faint)]">
                              <X className="w-4 h-4" /> Restricted
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)] font-mono">
            Comparing {selectedUsers.length} active staff accounts.
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Done Comparing
          </button>
        </div>

      </div>
    </div>
  );
};
