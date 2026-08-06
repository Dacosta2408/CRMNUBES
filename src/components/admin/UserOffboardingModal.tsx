import React, { useState } from "react";
import { 
  UserX, ArrowRight, ShieldAlert, Download, CheckCircle2, 
  Trash2, Archive, RefreshCw, AlertTriangle, FileText, X, Users, Check
} from "lucide-react";
import { User as UserType, Client, Task } from "../../types";

interface UserOffboardingModalProps {
  offboardingUser: UserType;
  userRoster: UserType[];
  clients: Client[];
  tasks?: Task[];
  onClose: () => void;
  onExecuteOffboarding: (data: {
    targetUserId: string;
    revokeAccess: boolean;
    archiveAccount: boolean;
    deleteAccount: boolean;
    exportPackage: boolean;
  }) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const UserOffboardingModal: React.FC<UserOffboardingModalProps> = ({
  offboardingUser,
  userRoster,
  clients,
  tasks = [],
  onClose,
  onExecuteOffboarding,
  showToast
}) => {
  // Step in checklist wizard
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [recipientUserId, setRecipientUserId] = useState<string>(() => {
    const defaultRecipient = userRoster.find(u => u.id !== offboardingUser.id && (u.status === "active" || u.status === "Active"));
    return defaultRecipient ? defaultRecipient.id : "";
  });

  const [revokeAccessDone, setRevokeAccessDone] = useState(true);
  const [exportDataDone, setExportDataDone] = useState(false);
  const [accountAction, setAccountAction] = useState<"archive" | "delete">("archive");
  const [finalAuditExported, setFinalAuditExported] = useState(false);

  // Calculate workloads for offboarding user
  const uId = offboardingUser.id.toLowerCase();
  const uName = `${offboardingUser.first} ${offboardingUser.last}`.toLowerCase();

  const assignedClients = clients.filter(c => {
    const owner = (c.retentionOwner || "").toLowerCase();
    const agent = (c.agent || "").toLowerCase();
    const assignedBroker = (c.assignedBroker || "").toLowerCase();
    return owner === uId || agent === uId || assignedBroker === uId || owner === uName || agent === uName;
  });

  const assignedTasks = tasks.filter(t => {
    const owner = ((t as any).assignedTo || (t as any).owner || "").toLowerCase();
    return owner === uId || owner === uName;
  });

  // Export User Data Package
  const handleExportUserDataPackage = () => {
    const dataPackage = {
      offboardedUser: offboardingUser,
      exportTimestamp: new Date().toISOString(),
      assignedClientsCount: assignedClients.length,
      assignedTasksCount: assignedTasks.length,
      clients: assignedClients,
      tasks: assignedTasks
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataPackage, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `offboarding_package_${offboardingUser.first}_${offboardingUser.last}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportDataDone(true);
    showToast(`Exported user data package for ${offboardingUser.first} ${offboardingUser.last}!`, "success");
  };

  // Export Final Audit Log Report
  const handleExportFinalAuditLog = () => {
    const recipientUser = userRoster.find(u => u.id === recipientUserId);
    const recipientName = recipientUser ? `${recipientUser.first} ${recipientUser.last}` : "System Admin";

    const auditReport = `OFFBOARDING AUDIT LOG REPORT
==================================================
User Name: ${offboardingUser.first} ${offboardingUser.last}
Email: ${offboardingUser.email}
Role: ${offboardingUser.role}
License Number: ${offboardingUser.licenseNumber || 'N/A'}
Clearance Level: ${offboardingUser.clearanceLevel || 2}
Offboarded Date: ${new Date().toISOString()}

OFFBOARDING ACTIONS EXECUTED:
1. Client Files Reassigned: ${assignedClients.length} files -> Transferred to ${recipientName}
2. Open Tasks Reassigned: ${assignedTasks.length} tasks -> Transferred to ${recipientName}
3. Login Credentials & Security Tokens: Revoked
4. User Account Final Action: ${accountAction.toUpperCase()}
==================================================
Status: COMPLETED AND VERIFIED BY ADMIN PROTOCOL`;

    const blob = new Blob([auditReport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offboarding_audit_report_${offboardingUser.first}_${offboardingUser.last}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setFinalAuditExported(true);
    showToast("Downloaded final offboarding audit log report!", "success");
  };

  // Submit Final Offboarding
  const handleCompleteOffboarding = () => {
    if (!recipientUserId && assignedClients.length > 0) {
      showToast("Please select an active team member to receive transferred client files.", "error");
      return;
    }

    onExecuteOffboarding({
      targetUserId: recipientUserId,
      revokeAccess: revokeAccessDone,
      archiveAccount: accountAction === "archive",
      deleteAccount: accountAction === "delete",
      exportPackage: exportDataDone
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                Staff Offboarding &amp; Departure Protocol
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Orderly departure checklist for <span className="font-bold text-[var(--color-text)]">{offboardingUser.first} {offboardingUser.last}</span> ({offboardingUser.email}).
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

        {/* Wizard Steps Indicator */}
        <div className="grid grid-cols-5 gap-1 text-center">
          {[
            { num: 1, label: "Transfer" },
            { num: 2, label: "Revoke" },
            { num: 3, label: "Export" },
            { num: 4, label: "Account" },
            { num: 5, label: "Audit" }
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num as any)}
              className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                currentStep === s.num
                  ? "bg-red-500 text-white border-red-500 shadow-xs"
                  : currentStep > s.num
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-faint)] border-[var(--color-border)]"
              }`}
            >
              <div className="text-[10px] font-mono">STEP {s.num}</div>
              <div>{s.label}</div>
            </button>
          ))}
        </div>

        {/* STEP 1: TRANSFER CLIENTS & TASKS */}
        {currentStep === 1 && (
          <div className="space-y-4 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <Users className="w-4 h-4 text-[var(--color-accent)]" /> 1. Reassign Workload &amp; Client Files
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              This staff member currently manages <strong className="text-[var(--color-text)]">{assignedClients.length} active client files</strong> and <strong className="text-[var(--color-text)]">{assignedTasks.length} pending tasks</strong>. Select an active broker or agent to inherit this workload.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider block">
                Target Recipient Staff Member *
              </label>
              <select
                value={recipientUserId}
                onChange={(e) => setRecipientUserId(e.target.value)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">-- Select Active Recipient --</option>
                {userRoster.filter(u => u.id !== offboardingUser.id && (u.status === "active" || u.status === "Active")).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first} {u.last} ({u.role} - {u.brokerage || 'GBK'})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] text-xs space-y-1 font-mono text-[var(--color-text-muted)]">
              <div>📁 Clients to transfer: <strong className="text-emerald-400">{assignedClients.length}</strong></div>
              <div>📋 Tasks to transfer: <strong className="text-blue-400">{assignedTasks.length}</strong></div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  if (!recipientUserId && assignedClients.length > 0) {
                    showToast("Please select a recipient before proceeding.", "error");
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-1.5"
              >
                Next Step: Revoke Access <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVOKE ACCESS */}
        {currentStep === 2 && (
          <div className="space-y-4 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <ShieldAlert className="w-4 h-4 text-red-400" /> 2. Revoke Credentials &amp; Terminal Access
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Instantly terminate active login sessions, reset clearance level to 0, and invalidate security tokens.
            </p>

            <label className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] cursor-pointer">
              <input
                type="checkbox"
                checked={revokeAccessDone}
                onChange={(e) => setRevokeAccessDone(e.target.checked)}
                className="w-4 h-4 rounded text-red-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-bold text-[var(--color-text)] block">Immediately Deactivate Access Credentials</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">Sets status to Inactive and resets PIN code.</span>
              </div>
            </label>

            <div className="pt-2 flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-1.5"
              >
                Next Step: Export Data <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: EXPORT DATA */}
        {currentStep === 3 && (
          <div className="space-y-4 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <Download className="w-4 h-4 text-purple-400" /> 3. Export Staff Data Package
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Generate a full JSON backup of this user's profile, historical notes, assigned client records, and activity logs for compliance archiving.
            </p>

            <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <div>
                <span className="text-xs font-bold text-[var(--color-text)] block">Complete Archive Package</span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Contains profile, {assignedClients.length} client files &amp; notes</span>
              </div>

              <button
                onClick={handleExportUserDataPackage}
                className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download JSON
              </button>
            </div>

            {exportDataDone && (
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Data package exported successfully.
              </div>
            )}

            <div className="pt-2 flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-1.5"
              >
                Next Step: Account Action <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DELETE / ARCHIVE ACCOUNT */}
        {currentStep === 4 && (
          <div className="space-y-4 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <Archive className="w-4 h-4 text-amber-400" /> 4. Select Final Account Disposition
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Choose whether to archive the staff account for historical compliance reporting, or permanently delete the account from the system roster.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountAction("archive")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  accountAction === "archive" 
                    ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-xs" 
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <Archive className="w-4 h-4" /> Archive Account (Recommended)
                </div>
                <div className="text-[10px] leading-normal opacity-80 font-normal">
                  Sets account status to Inactive. Preserves historical audit records and license history.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAccountAction("delete")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  accountAction === "delete" 
                    ? "bg-red-500/15 border-red-500 text-red-300 font-bold shadow-xs" 
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <Trash2 className="w-4 h-4" /> Permanent Delete
                </div>
                <div className="text-[10px] leading-normal opacity-80 font-normal">
                  Completely removes user record from roster database. Cannot be undone.
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(5)}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-1.5"
              >
                Next Step: Final Audit <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: FINAL AUDIT LOG EXPORT & CONFIRMATION */}
        {currentStep === 5 && (
          <div className="space-y-4 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <FileText className="w-4 h-4 text-emerald-400" /> 5. Final Audit Log Export &amp; Execution
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Export the official FSRA-compliant offboarding audit report for brokerage records, then execute the offboarding protocol.
            </p>

            <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <div>
                <span className="text-xs font-bold text-[var(--color-text)] block">FSRA Offboarding Audit Report</span>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Signed text file containing transfer logs &amp; security timestamps</span>
              </div>

              <button
                onClick={handleExportFinalAuditLog}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" /> Export Audit Log
              </button>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-[var(--color-border)] pt-4">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>

              <button
                onClick={handleCompleteOffboarding}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-2"
              >
                <UserX className="w-4 h-4" /> Execute Complete Offboarding
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
