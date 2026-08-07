import { Client } from "../types";

export interface StageItem {
  id: string;
  label: string;
  color: string;
  style: string;
}

export const STAGES: StageItem[] = [
  { 
    id: "lead", 
    label: "Leads", 
    color: "var(--color-primary)", 
    style: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 shadow-sm" 
  },
  { 
    id: "open", 
    label: "New/Open", 
    color: "var(--color-info)", 
    style: "bg-[var(--color-info-subtle)] text-[var(--color-info)] border border-[var(--color-info)]/20 shadow-sm" 
  },
  { 
    id: "working", 
    label: "Working", 
    color: "var(--color-warning)", 
    style: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[var(--color-warning)]/20 shadow-sm" 
  },
  { 
    id: "lender", 
    label: "Submissions", 
    color: "var(--color-primary-hover)", 
    style: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] border border-[var(--color-primary-hover)]/20 shadow-sm" 
  },
  { 
    id: "conditional", 
    label: "Conditional", 
    color: "var(--color-error)", 
    style: "bg-[var(--color-error-subtle)] text-[var(--color-error)] border border-[var(--color-error)]/20 shadow-sm" 
  },
  { 
    id: "approved", 
    label: "Approved", 
    color: "var(--color-success)", 
    style: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border border-[var(--color-success)]/20 shadow-sm" 
  },
  { 
    id: "funded", 
    label: "Funded", 
    color: "var(--color-accent)", 
    style: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-sm" 
  },
  {
    id: "closed",
    label: "Closed",
    color: "#64748b",
    style: "bg-slate-500/10 text-slate-500 border border-slate-500/20 shadow-sm"
  }
];

export const VALID_STAGE_IDS = new Set(STAGES.map(s => s.id));

export const normalizeStatus = (status?: string): string => {
  if (!status) return "lead";
  const s = String(status).trim().toLowerCase();
  
  if (VALID_STAGE_IDS.has(s)) return s;

  // Common aliases mapping
  if (s === "new") return "open";
  if (s === "intake" || s === "prospect" || s === "inquiry") return "lead";
  if (s === "submission" || s === "submitted" || s === "at lender" || s === "lender_review") return "lender";
  if (s === "condition" || s === "conditions") return "conditional";
  if (s === "approve" || s === "pre-approved" || s === "preapproved") return "approved";
  if (s === "fund" || s === "completed") return "funded";
  if (s === "close" || s === "archived" || s === "declined") return "closed";

  return "lead";
};

export const pn = (s: any): number => {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[$,\s]/g, "")) || 0;
};

export const fd = (n: number): string => {
  return "$" + Math.round(n).toLocaleString("en-CA");
};

export const fdShort = (val: number): string => {
  if (val >= 1000000) return "$" + (val / 1000000).toFixed(1) + "M";
  if (val >= 1000) return "$" + Math.round(val / 1000) + "k";
  return "$" + Math.round(val);
};

export const calculateRatios = (c: Client): number => {
  const inc = pn(c.income) + pn(c.coIncome);
  const mtg = pn(c.mtgamt || c.mortgageAmount);
  const pmt = mtg ? (mtg * (0.0525 / 12) * Math.pow(1 + 0.0525 / 12, 300)) / (Math.pow(1 + 0.0525 / 12, 300) - 1) : 0; 
  const tax = pn(c.tax) / 12;
  const condo = pn(c.condo);
  const heat = pn(c.heat) || 150;
  const gds = inc > 0 ? ((pmt + tax + condo + heat) / (inc / 12) * 100) : 0;
  return gds;
};

export interface ClientStatusAnalysis {
  daysStale: number;
  isStalledActive: boolean;
  hasOverdueFollowUp: boolean;
  approvedCount: number;
  reviewCount: number;
  hasDocs: boolean;
  isMissingDocs: boolean;
  primaryBadge: {
    label: string;
    type: 'overdue' | 'missingDocs' | 'stalled' | 'docsVerified' | 'followUp' | 'normal';
    bgClass: string;
    textClass: string;
    borderClass: string;
    icon: string;
  };
}

export const analyzeClientStatus = (c: Client, docVault?: Record<string, any>): ClientStatusAnalysis => {
  const daysStale = Math.floor((Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) / (24 * 3600 * 1000));
  const normStatus = normalizeStatus(c.status);
  const isStalledActive = (normStatus !== "funded" && normStatus !== "closed") && (daysStale > 14);
  const hasOverdueFollowUp = !!(c.nextFollowUpDate && (new Date(c.nextFollowUpDate) < new Date()));
  
  const clientDocs = docVault ? docVault[c.id] || {} : {};
  const docs = Object.values(clientDocs) as any[];
  const approvedCount = docs.filter(d => d.status === "approved" || d.status === "verified").length;
  const reviewCount = docs.filter(d => d.status === "received").length;
  const hasDocs = approvedCount > 0 || reviewCount > 0;
  const isActiveStage = ["working", "lender", "conditional"].includes(normStatus);
  const isMissingDocs = isActiveStage && !hasDocs;

  let primaryBadge: ClientStatusAnalysis['primaryBadge'];

  if (hasOverdueFollowUp) {
    primaryBadge = {
      label: 'Overdue Follow-up',
      type: 'overdue',
      bgClass: 'bg-red-500/10',
      textClass: 'text-red-500',
      borderClass: 'border-red-500/20',
      icon: '📅'
    };
  } else if (isMissingDocs) {
    primaryBadge = {
      label: 'Docs Needed',
      type: 'missingDocs',
      bgClass: 'bg-orange-500/10',
      textClass: 'text-orange-500',
      borderClass: 'border-orange-500/20',
      icon: '⚠️'
    };
  } else if (isStalledActive) {
    primaryBadge = {
      label: `Idle ${daysStale}d`,
      type: 'stalled',
      bgClass: 'bg-amber-500/10',
      textClass: 'text-amber-500',
      borderClass: 'border-amber-500/20',
      icon: '⏳'
    };
  } else if (hasDocs) {
    primaryBadge = {
      label: `${approvedCount} Clear | ${reviewCount} Review`,
      type: 'docsVerified',
      bgClass: 'bg-green-500/10',
      textClass: 'text-green-500',
      borderClass: 'border-green-500/20',
      icon: '📂'
    };
  } else if (c.nextFollowUpDate) {
    primaryBadge = {
      label: `Follow-up ${c.nextFollowUpDate}`,
      type: 'followUp',
      bgClass: 'bg-teal-500/10',
      textClass: 'text-teal-500',
      borderClass: 'border-teal-500/20',
      icon: '📅'
    };
  } else {
    primaryBadge = {
      label: 'On Track',
      type: 'normal',
      bgClass: 'bg-blue-500/5',
      textClass: 'text-[var(--color-text-muted)]',
      borderClass: 'border-blue-500/10',
      icon: '✓'
    };
  }

  return {
    daysStale,
    isStalledActive,
    hasOverdueFollowUp,
    approvedCount,
    reviewCount,
    hasDocs,
    isMissingDocs,
    primaryBadge
  };
};

export const filterDatabaseClients = (
  clients: Client[],
  dbFilter: string,
  agentFilter: string,
  searchQuery: string
): Client[] => {
  let list = [...clients];

  if (dbFilter !== "all") {
    list = list.filter(c => normalizeStatus(c.status) === dbFilter);
  }

  if (agentFilter) {
    const filterLower = agentFilter.toLowerCase();
    list = list.filter(c => 
      c.assignedBrokerId === agentFilter ||
      (c.assignedBrokerName && c.assignedBrokerName.toLowerCase() === filterLower) ||
      (c.assignedBroker && c.assignedBroker.toLowerCase() === filterLower) ||
      (c.agent && c.agent.toLowerCase() === filterLower) ||
      (c.assignedTo && c.assignedTo.toLowerCase() === filterLower) ||
      (c.retentionOwner && c.retentionOwner.toLowerCase() === filterLower)
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(c => 
      (c.first + " " + c.last).toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.cell || "").includes(q) ||
      (c.addr || "").toLowerCase().includes(q) ||
      (c.lender || "").toLowerCase().includes(q)
    );
  }

  return list;
};

export const filterPipelineClients = (
  clients: Client[],
  agentFilter: string,
  searchQuery: string,
  pipelineAlertFilter: 'all' | 'attention' | 'overdue' | 'stalled' | 'missingDocs',
  docVault?: Record<string, any>
): Client[] => {
  let list = [...clients];

  if (agentFilter) {
    const filterLower = agentFilter.toLowerCase();
    list = list.filter(c => 
      c.assignedBrokerId === agentFilter ||
      (c.assignedBrokerName && c.assignedBrokerName.toLowerCase() === filterLower) ||
      (c.assignedBroker && c.assignedBroker.toLowerCase() === filterLower) ||
      (c.agent && c.agent.toLowerCase() === filterLower) ||
      (c.assignedTo && c.assignedTo.toLowerCase() === filterLower) ||
      (c.retentionOwner && c.retentionOwner.toLowerCase() === filterLower)
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(c => 
      (c.first + " " + c.last).toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.cell || "").includes(q) ||
      (c.addr || "").toLowerCase().includes(q) ||
      (c.lender || "").toLowerCase().includes(q)
    );
  }

  if (pipelineAlertFilter !== "all") {
    list = list.filter(c => {
      const analysis = analyzeClientStatus(c, docVault);
      if (pipelineAlertFilter === "attention") {
        return analysis.hasOverdueFollowUp || analysis.isStalledActive || analysis.isMissingDocs;
      }
      if (pipelineAlertFilter === "overdue") return analysis.hasOverdueFollowUp;
      if (pipelineAlertFilter === "stalled") return analysis.isStalledActive;
      if (pipelineAlertFilter === "missingDocs") return analysis.isMissingDocs;
      return true;
    });
  }

  return list;
};

// Backwards compatibility export
export const filterClients = (
  clients: Client[],
  dbFilter: string,
  agentFilter: string,
  searchQuery: string,
  pipelineAlertFilter: 'all' | 'attention' | 'overdue' | 'stalled' | 'missingDocs',
  docVault?: Record<string, any>
): Client[] => {
  let list = filterDatabaseClients(clients, dbFilter, agentFilter, searchQuery);
  if (pipelineAlertFilter !== "all") {
    list = list.filter(c => {
      const analysis = analyzeClientStatus(c, docVault);
      if (pipelineAlertFilter === "attention") {
        return analysis.hasOverdueFollowUp || analysis.isStalledActive || analysis.isMissingDocs;
      }
      if (pipelineAlertFilter === "overdue") return analysis.hasOverdueFollowUp;
      if (pipelineAlertFilter === "stalled") return analysis.isStalledActive;
      if (pipelineAlertFilter === "missingDocs") return analysis.isMissingDocs;
      return true;
    });
  }
  return list;
};

export const calculatePipelineMetrics = (clients: Client[], docVault?: Record<string, any>) => {
  let totalVolume = 0;
  let approvedFundedVol = 0;
  let attentionCount = 0;
  let activeFilesCount = 0;

  clients.forEach(c => {
    const normStatus = normalizeStatus(c.status);
    const amt = pn(c.mtgamt || c.mortgageAmount);
    if (normStatus !== "closed") {
      totalVolume += amt;
      activeFilesCount++;
    }
    if (normStatus === "approved" || normStatus === "funded") {
      approvedFundedVol += amt;
    }

    const analysis = analyzeClientStatus(c, docVault);
    if (analysis.isStalledActive || analysis.hasOverdueFollowUp || analysis.isMissingDocs) {
      attentionCount++;
    }
  });

  return {
    totalVolume,
    activeFilesCount,
    approvedFundedVol,
    attentionCount
  };
};
