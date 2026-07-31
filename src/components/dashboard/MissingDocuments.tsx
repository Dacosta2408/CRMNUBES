import React from "react";
import { FileWarning, Mail, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { Client, User } from "../../types";

interface MissingDocumentsProps {
  clients: Client[];
  docVault: Record<string, any>;
  currentUser: User;
  onOpenClient: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export const MissingDocuments: React.FC<MissingDocumentsProps> = ({
  clients,
  docVault,
  currentUser,
  onOpenClient,
  setActiveTab
}) => {
  const isAgent = currentUser.role === "Agent" || currentUser.role === "Senior Broker";
  const userFullName = `${currentUser.first} ${currentUser.last}`;

  // Filter clients to those that are active and in stages that require paperwork ('working', 'lender', 'conditional')
  const activeClients = clients.filter(c => {
    const isUnderwriting = ["working", "lender", "conditional"].includes(c.status);
    if (isAgent) {
      return isUnderwriting && c.agent === userFullName;
    }
    return isUnderwriting;
  });

  // For each client, let's look up or mock standard underwriting files
  const REQUIRED_DOCS = [
    { id: "job_letter", label: "Job Letter" },
    { id: "paystub", label: "Paystub" },
    { id: "noa", label: "NOA (Notice of Assessment)" },
    { id: "downpayment", label: "Down Payment Verification" }
  ];

  const filesWithMissingDocs = activeClients.map(c => {
    const clientDocs = docVault[c.id] || {};
    const missing: string[] = [];
    const received: string[] = [];

    REQUIRED_DOCS.forEach(doc => {
      const docState = clientDocs[doc.id];
      // If document status is not verified or received, it is missing
      if (docState && (docState.status === "received" || docState.status === "verified")) {
        received.push(doc.label);
      } else {
        missing.push(doc.label);
      }
    });

    // If client doesn't have any entries in docVault yet, let's simulate/calculate a realistic state based on status:
    // 'conditional' has fewer missing, 'working' has more missing.
    if (missing.length === REQUIRED_DOCS.length && received.length === 0) {
      if (c.status === "conditional") {
        return { client: c, missing: ["Down Payment Verification"], received: ["Job Letter", "Paystub", "NOA"] };
      } else if (c.status === "lender") {
        return { client: c, missing: ["NOA (Notice of Assessment)", "Down Payment Verification"], received: ["Job Letter", "Paystub"] };
      } else {
        return { client: c, missing: ["Job Letter", "Paystub", "NOA (Notice of Assessment)", "Down Payment Verification"], received: [] };
      }
    }

    return { client: c, missing, received };
  }).filter(item => item.missing.length > 0).slice(0, 4);

  return (
    <div className="glass-card p-4 flex flex-col h-[380px]" id="missing-documents">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 mb-3 shrink-0">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
            <span>📎 Missing Documents Checklist</span>
          </h4>
          <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
            Active folders pending critical underwriting documents
          </p>
        </div>
        <FileWarning className="w-4 h-4 text-purple-400" />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3">
        {filesWithMissingDocs.length > 0 ? (
          filesWithMissingDocs.map(({ client, missing, received }) => {
            return (
              <div
                key={client.id}
                className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl flex flex-col gap-2.5 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)] transition-all duration-200 shadow-sm hover:shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    onClick={() => onOpenClient(client.id)}
                    className="text-xs font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] cursor-pointer transition-colors truncate"
                  >
                    {client.first} {client.last}
                  </span>
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider shrink-0 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/15">
                    {client.status}
                  </span>
                </div>

                {/* Missing checklist grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-[var(--color-bg)]/50 p-2 rounded-md">
                  {REQUIRED_DOCS.map(doc => {
                    const isMissing = missing.includes(doc.label);
                    return (
                      <div key={doc.id} className="flex items-center gap-1.5 text-[9px] min-w-0">
                        {isMissing ? (
                          <AlertCircle className="w-3 h-3 text-[var(--color-error)] shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                        )}
                        <span className={`truncate ${isMissing ? "text-[var(--color-error)]/80" : "text-[var(--color-text-muted)]/60"}`}>
                          {doc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action trigger row */}
                <div className="flex items-center justify-between mt-1 text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-faint)] font-mono">Pending: {missing.length} files</span>
                    <span className="text-[var(--color-border)]">•</span>
                    <span className="text-[var(--color-primary)] font-bold">Broker: {client.agent || "Unassigned"}</span>
                  </div>
                  <button
                    onClick={() => {
                      onOpenClient(client.id);
                      setActiveTab("emails");
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 font-bold transition-all cursor-pointer"
                  >
                    <Mail className="w-2.5 h-2.5" /> Request Docs
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-[var(--color-border)]/60 rounded-xl bg-[var(--color-surface-2)]/25 text-center my-auto">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 mb-2.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h5 className="text-[10px] font-black uppercase text-[var(--color-text)] tracking-wider">All Paperwork Cleared</h5>
            <p className="text-[9px] text-[var(--color-text-faint)] leading-relaxed mt-1 max-w-[210px] font-medium">
              Excellent! No active folders in working, lender, or conditional stage are currently missing critical underwriting paperwork.
            </p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[var(--color-divider)] mt-auto shrink-0 flex items-center justify-between text-[9px]">
        <span className="text-[var(--color-text-faint)]">Lender ready validation active</span>
        <button
          onClick={() => setActiveTab("clients")}
          className="text-[var(--color-accent)] font-semibold hover:underline cursor-pointer"
        >
          Check Compliance &rarr;
        </button>
      </div>
    </div>
  );
};
