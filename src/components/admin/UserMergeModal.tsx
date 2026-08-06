import React, { useState, useMemo } from "react";
import { 
  Users, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, X, 
  Shield, Key, FileText, Check, Tag
} from "lucide-react";
import { User as UserType, Client, Task } from "../../types";

interface UserMergeModalProps {
  userRoster: UserType[];
  clients: Client[];
  tasks?: Task[];
  onClose: () => void;
  onExecuteMerge: (mergedPrimaryUser: UserType, duplicateUserIdToRemove: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const UserMergeModal: React.FC<UserMergeModalProps> = ({
  userRoster,
  clients,
  tasks = [],
  onClose,
  onExecuteMerge,
  showToast
}) => {
  // Step in Merge wizard
  const [primaryUserId, setPrimaryUserId] = useState<string>("");
  const [duplicateUserId, setDuplicateUserId] = useState<string>("");

  const primaryUser = useMemo(() => userRoster.find(u => u.id === primaryUserId), [userRoster, primaryUserId]);
  const duplicateUser = useMemo(() => userRoster.find(u => u.id === duplicateUserId), [userRoster, duplicateUserId]);

  // Field selections for merged profile: "primary" or "duplicate"
  const [fieldSelections, setFieldSelections] = useState<Record<string, "primary" | "duplicate">>({
    first: "primary",
    last: "primary",
    email: "primary",
    phone: "primary",
    licenseNumber: "primary",
    role: "primary",
    clearanceLevel: "primary",
    brokerage: "primary"
  });

  const toggleField = (field: string, source: "primary" | "duplicate") => {
    setFieldSelections(prev => ({ ...prev, [field]: source }));
  };

  // Calculate workloads
  const getWorkloads = (u: UserType | undefined) => {
    if (!u) return { clientsCount: 0, tasksCount: 0 };
    const uId = u.id.toLowerCase();
    const uName = `${u.first} ${u.last}`.toLowerCase();

    const clCount = clients.filter(c => {
      const owner = (c.retentionOwner || "").toLowerCase();
      const agent = (c.agent || "").toLowerCase();
      const assignedBroker = (c.assignedBroker || "").toLowerCase();
      return owner === uId || agent === uId || assignedBroker === uId || owner === uName || agent === uName;
    }).length;

    const tkCount = tasks.filter(t => {
      const owner = ((t as any).assignedTo || (t as any).owner || "").toLowerCase();
      return owner === uId || owner === uName;
    }).length;

    return { clientsCount: clCount, tasksCount: tkCount };
  };

  const primaryWorkload = getWorkloads(primaryUser);
  const duplicateWorkload = getWorkloads(duplicateUser);

  // Submit Merge
  const handleConfirmMerge = () => {
    if (!primaryUser || !duplicateUser) {
      showToast("Please select both a Primary and Duplicate account.", "error");
      return;
    }

    if (primaryUser.id === duplicateUser.id) {
      showToast("Primary and Duplicate accounts cannot be the same user.", "error");
      return;
    }

    // Merge tags
    const combinedTags = Array.from(new Set([
      ...(primaryUser.tags || []),
      ...(duplicateUser.tags || [])
    ]));

    // Build merged primary user object
    const mergedUser: UserType = {
      ...primaryUser,
      first: fieldSelections.first === "primary" ? primaryUser.first : duplicateUser.first,
      last: fieldSelections.last === "primary" ? primaryUser.last : duplicateUser.last,
      email: fieldSelections.email === "primary" ? primaryUser.email : duplicateUser.email,
      phone: fieldSelections.phone === "primary" ? (primaryUser.phone || duplicateUser.phone) : (duplicateUser.phone || primaryUser.phone),
      licenseNumber: fieldSelections.licenseNumber === "primary" ? (primaryUser.licenseNumber || duplicateUser.licenseNumber) : (duplicateUser.licenseNumber || primaryUser.licenseNumber),
      role: fieldSelections.role === "primary" ? primaryUser.role : duplicateUser.role,
      clearanceLevel: fieldSelections.clearanceLevel === "primary" ? primaryUser.clearanceLevel : duplicateUser.clearanceLevel,
      brokerage: fieldSelections.brokerage === "primary" ? (primaryUser.brokerage || duplicateUser.brokerage) : (duplicateUser.brokerage || primaryUser.brokerage),
      tags: combinedTags
    };

    onExecuteMerge(mergedUser, duplicateUser.id);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                Duplicate Account Merge &amp; Reconciliation Tool
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Consolidate duplicate staff records, merge client assignments, and unify account data.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Primary Account Selector */}
          <div className="p-4 bg-[var(--color-surface-2)]/80 border border-emerald-500/40 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> 1. Target Primary Account (To Keep)
            </div>

            <select
              value={primaryUserId}
              onChange={(e) => setPrimaryUserId(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">-- Select Primary User --</option>
              {userRoster.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first} {u.last} ({u.email} - {u.role})
                </option>
              ))}
            </select>

            {primaryUser && (
              <div className="text-xs space-y-1 font-mono text-[var(--color-text-muted)] bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                <div>Clearance: <strong className="text-[var(--color-text)]">Level {primaryUser.clearanceLevel || 2}</strong></div>
                <div>Assigned Clients: <strong className="text-emerald-400">{primaryWorkload.clientsCount}</strong></div>
                <div>Open Tasks: <strong className="text-blue-400">{primaryWorkload.tasksCount}</strong></div>
              </div>
            )}
          </div>

          {/* Duplicate Account Selector */}
          <div className="p-4 bg-[var(--color-surface-2)]/80 border border-red-500/40 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-red-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" /> 2. Duplicate Account (To Dissolve)
            </div>

            <select
              value={duplicateUserId}
              onChange={(e) => setDuplicateUserId(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">-- Select Duplicate User --</option>
              {userRoster.filter(u => u.id !== primaryUserId).map(u => (
                <option key={u.id} value={u.id}>
                  {u.first} {u.last} ({u.email} - {u.role})
                </option>
              ))}
            </select>

            {duplicateUser && (
              <div className="text-xs space-y-1 font-mono text-[var(--color-text-muted)] bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                <div>Clearance: <strong className="text-[var(--color-text)]">Level {duplicateUser.clearanceLevel || 2}</strong></div>
                <div>Assigned Clients: <strong className="text-emerald-400">{duplicateWorkload.clientsCount}</strong></div>
                <div>Open Tasks: <strong className="text-blue-400">{duplicateWorkload.tasksCount}</strong></div>
              </div>
            )}
          </div>

        </div>

        {/* Data Field Resolution Table */}
        {primaryUser && duplicateUser && (
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider block">
              3. Field Data Resolution (Select source value to retain in unified profile)
            </label>

            <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] font-bold text-[10px] uppercase text-[var(--color-text-faint)]">
                    <th className="p-2.5 pl-3">Field</th>
                    <th className="p-2.5 text-center text-emerald-400">Primary: {primaryUser.first} {primaryUser.last}</th>
                    <th className="p-2.5 text-center text-red-400">Duplicate: {duplicateUser.first} {duplicateUser.last}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  
                  {[
                    { key: "first", label: "First Name", valP: primaryUser.first, valD: duplicateUser.first },
                    { key: "last", label: "Last Name", valP: primaryUser.last, valD: duplicateUser.last },
                    { key: "email", label: "Email Address", valP: primaryUser.email, valD: duplicateUser.email },
                    { key: "phone", label: "Phone Number", valP: primaryUser.phone || "N/A", valD: duplicateUser.phone || "N/A" },
                    { key: "licenseNumber", label: "License Number", valP: primaryUser.licenseNumber || "N/A", valD: duplicateUser.licenseNumber || "N/A" },
                    { key: "role", label: "Role & Designation", valP: primaryUser.role, valD: duplicateUser.role },
                    { key: "clearanceLevel", label: "Clearance Level", valP: `Level ${primaryUser.clearanceLevel || 2}`, valD: `Level ${duplicateUser.clearanceLevel || 2}` }
                  ].map(row => {
                    const selectedSource = fieldSelections[row.key] || "primary";

                    return (
                      <tr key={row.key} className="hover:bg-[var(--color-surface-3)]/30 transition-all">
                        <td className="p-2.5 pl-3 font-semibold text-[var(--color-text)]">{row.label}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleField(row.key, "primary")}
                            className={`px-3 py-1 rounded-lg font-mono text-[11px] border transition-all cursor-pointer ${
                              selectedSource === "primary"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 font-bold"
                                : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] opacity-60"
                            }`}
                          >
                            {row.valP}
                          </button>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleField(row.key, "duplicate")}
                            className={`px-3 py-1 rounded-lg font-mono text-[11px] border transition-all cursor-pointer ${
                              selectedSource === "duplicate"
                                ? "bg-red-500/20 text-red-400 border-red-500 font-bold"
                                : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] opacity-60"
                            }`}
                          >
                            {row.valD}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>

            {/* Merge Summary Banner */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs space-y-1 font-sans">
              <div className="font-bold text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Merge Execution Actions
              </div>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                Merging will transfer <strong className="text-[var(--color-text)]">{duplicateWorkload.clientsCount} clients</strong> and <strong className="text-[var(--color-text)]">{duplicateWorkload.tasksCount} tasks</strong> from <span className="text-red-400 font-bold">{duplicateUser.first} {duplicateUser.last}</span> to <span className="text-emerald-400 font-bold">{primaryUser.first} {primaryUser.last}</span>. The duplicate account will then be safely removed.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmMerge}
            disabled={!primaryUser || !duplicateUser}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Execute Complete Merge
          </button>
        </div>

      </div>
    </div>
  );
};
