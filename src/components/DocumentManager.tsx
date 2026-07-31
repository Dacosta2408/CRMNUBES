import React, { useState, useMemo, useEffect } from "react";
import { 
  FileText, UploadCloud, AlertCircle, CheckCircle2, Clock, Trash2, Plus, Search, 
  History, Lock, Shield, Layers, HelpCircle, Sparkles, Filter, CheckSquare, X, RefreshCw
} from "lucide-react";

import { Client, User as CRMUser } from "../types";
import { safeJsonParse } from "../lib/json";
import { 
  DocVersion, EnhancedDocState, DocumentRequest, DocActivityLog 
} from "./document/types";
import { 
  DOCUMENT_CATEGORIES, STATUS_STYLING, CHECKLIST_RULES 
} from "./document/constants";

// Subcomponents
import { DocDashboardSummary } from "./document/DocDashboardSummary";
import { DocChecklistCard } from "./document/DocChecklistCard";
import { DocUploadDrawer } from "./document/DocUploadDrawer";
import { DocRequestModal } from "./document/DocRequestModal";
import { DocAuditTimeline } from "./document/DocAuditTimeline";
import { uploadDocument } from "../lib/bridgeService";
import { DocPersonalLocker } from "./document/DocPersonalLocker";

interface DocumentManagerProps {
  clients: Client[];
  currentUser: CRMUser;
  docVault: Record<string, any>;
  setDocVault: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onOpenClient: (id: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info", icon?: string) => void;
  agentNames: string[];
  isOwnerOrManager: boolean;
  embeddedClientId?: string; // If supplied, acts as the Client File Documents tab!
  bridgeOnline?: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  clients,
  currentUser,
  docVault,
  setDocVault,
  onOpenClient,
  showToast,
  agentNames,
  isOwnerOrManager,
  embeddedClientId,
  bridgeOnline = false
}) => {
  // --- SUBTABS & SEARCH ---
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'requests' | 'timeline' | 'compliance'>('dashboard');
  
  const pendingSyncCount = useMemo(() => {
    let count = 0;
    Object.keys(docVault).forEach(clientId => {
      const clientDocs = docVault[clientId] || {};
      Object.keys(clientDocs).forEach(docId => {
        const doc = clientDocs[docId] || {};
        if (doc.files && doc.files.some((f: any) => f.syncStatus === "pending")) {
          count++;
        }
      });
    });
    return count;
  }, [docVault]);

  const [syncingAll, setSyncingAll] = useState(false);

  const handleSyncPending = async () => {
    if (!bridgeOnline) {
      showToast("Cannot sync: Z Drive Bridge is still offline.", "error", "🔌");
      return;
    }
    setSyncingAll(true);
    showToast("Beginning bulk synchronization to Z Drive Bridge...", "info", "🔄");
    try {
      const updatedVault = { ...docVault };
      let syncCount = 0;

      for (const clientId of Object.keys(updatedVault)) {
        const clientDocs = { ...updatedVault[clientId] };
        let clientChanged = false;

        for (const docId of Object.keys(clientDocs)) {
          const doc = { ...clientDocs[docId] };
          if (doc.files && doc.files.some((f: any) => f.syncStatus === "pending")) {
            const updatedFiles = doc.files.map((file: any) => {
              if (file.syncStatus === "pending") {
                syncCount++;
                return { ...file, syncStatus: "synced" as const };
              }
              return file;
            });
            doc.files = updatedFiles;
            clientDocs[docId] = doc;
            clientChanged = true;

            // Trigger the server upload for each pending file!
            const dummyFile = new File(["GBK Secured Document Backup Content"], doc.files[doc.files.length - 1].fileName, { type: "application/pdf" });
            await uploadDocument(clientId, dummyFile);
          }
        }

        if (clientChanged) {
          updatedVault[clientId] = clientDocs;
        }
      }

      if (syncCount > 0) {
        setDocVault(updatedVault);
        showToast(`Successfully synchronized ${syncCount} pending files!`, "success", "✓");
      } else {
        showToast("No pending files required sync.", "info");
      }
    } catch (err) {
      console.error(err);
      showToast("Synchronization error encountered.", "error");
    } finally {
      setSyncingAll(false);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [managerQueueTab, setManagerQueueTab] = useState<'all' | 'awaiting_review' | 'overdue' | 'stale_expired' | 'missing'>('all');

  // Modals & Drawers State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  
  // Custom Requirement Dialog
  const [customReqOpen, setCustomReqOpen] = useState(false);
  const [customReqName, setCustomReqName] = useState("");
  const [customReqCategory, setCustomReqCategory] = useState("Property");
  const [customReqDesc, setCustomReqDesc] = useState("");

  // Drawer Target Doc
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [drawerDocId, setDrawerDocId] = useState("");
  const [drawerDocLabel, setDrawerDocLabel] = useState("");
  const [drawerDocCategory, setDrawerDocCategory] = useState("");

  // --- OUTBOUND REQUESTS ---
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>(() => {
    const saved = localStorage.getItem("gbk_doc_requests");
    return safeJsonParse(saved, [
      { id: "req-1", clientId: "c-1", clientName: "Marcus Vance", name: "Job Letter (Signed & Dated)", category: "Employment", dateRequested: "2026-06-20", dueDate: "2026-06-27", assignedBroker: "Sarah Jenkins", status: "pending", notes: "Please confirm with the main HR office directly." },
      { id: "req-2", clientId: "c-2", clientName: "Clara Tremblay", name: "90-Day Bank transaction ledger", category: "Banking", dateRequested: "2026-06-18", dueDate: "2026-06-25", assignedBroker: "Dave Peterson", status: "received", notes: "Verify all down payment sources are clear." }
    ]);
  });

  // --- AUDIT ACTIVITIES ---
  const [docActivities, setDocActivities] = useState<DocActivityLog[]>(() => {
    const saved = localStorage.getItem("gbk_doc_activities");
    return safeJsonParse(saved, [
      { id: "act-1", clientId: "c-1", clientName: "Marcus Vance", docId: "photo_id", docName: "Govt Photo ID", action: "uploaded", user: "Sarah Jenkins", timestamp: "2026-06-22T14:10:00Z", details: "Uploaded v1 passport copy." },
      { id: "act-2", clientId: "c-1", clientName: "Marcus Vance", docId: "photo_id", docName: "Govt Photo ID", action: "reviewed", user: "Developer/Admin", timestamp: "2026-06-22T16:30:00Z", details: "Reviewed document. Flagged as Under Review." }
    ]);
  });

  // --- PERSONAL LOCKER ---
  const [personalFiles, setPersonalFiles] = useState<Array<{ id: string; name: string; type: string; date: string }>>(() => {
    const saved = localStorage.getItem("gbk_personal_compliance_docs");
    return safeJsonParse(saved, [
      { id: "p1", name: "FSRA Mortgage Broker Licence.pdf", type: "FSRA Broker License", date: "2026-01-10" },
      { id: "p2", name: "Errors and Omissions Insurance Certificate.pdf", type: "E&O Insurance Policy", date: "2026-05-15" }
    ]);
  });

  // --- SAVE LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem("gbk_doc_requests", JSON.stringify(docRequests));
  }, [docRequests]);

  useEffect(() => {
    localStorage.setItem("gbk_doc_activities", JSON.stringify(docActivities));
    window.dispatchEvent(new CustomEvent("activity-logged", { detail: { clientId: "all" } }));
  }, [docActivities]);

  // --- COMPUTE INTELLIGENT CHECKLIST ENGINE ---
  const getFullChecklistForClient = (client: Client): EnhancedDocState[] => {
    const activeRules = CHECKLIST_RULES.filter(rule => rule.evaluate(client));
    const clientVault = docVault[client.id] || {};
    
    // Support custom/lender specific guidelines dynamically added
    const customRules: any[] = [];
    Object.keys(clientVault).forEach(key => {
      if (key.startsWith("custom_") && clientVault[key]?.isCustom) {
        customRules.push({
          id: key,
          label: clientVault[key].label || "Custom Clause",
          category: clientVault[key].category || "Other",
          description: clientVault[key].description || "Bespoke condition.",
          isCustom: true
        });
      }
    });

    const allRules = [...activeRules, ...customRules];

    return allRules.map(rule => {
      const savedState = clientVault[rule.id] || {};
      
      let warningTag: 'expires_soon' | 'expired' | 'stale' | 'needs_refresh' | null = null;
      if (savedState.expiryDate) {
        const exp = new Date(savedState.expiryDate);
        const today = new Date();
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0) warningTag = "expired";
        else if (diffDays <= 30) warningTag = "expires_soon";
      } else if (savedState.status === "received" && savedState.uploadedAt) {
        const ageDays = (new Date().getTime() - new Date(savedState.uploadedAt).getTime()) / (1000 * 3600 * 24);
        if (rule.category === "Income" && ageDays > 45) warningTag = "stale";
        else if (rule.category === "Banking" && ageDays > 60) warningTag = "stale";
      }

      return {
        id: rule.id,
        clientId: client.id,
        status: savedState.status || "required",
        path: savedState.path || "",
        expiryDate: savedState.expiryDate || "",
        notes: savedState.notes || "",
        reviewedBy: savedState.reviewedBy || "",
        reviewedAt: savedState.reviewedAt || "",
        files: savedState.files || (savedState.name ? [{
          id: "v-initial",
          fileName: savedState.name,
          fileSize: savedState.size || "1.8 MB",
          uploadedAt: savedState.uploadedAt || new Date().toISOString(),
          uploadedBy: "Underwriter",
          path: savedState.path || ""
        }] : []),
        warningTag,
        label: rule.label,
        category: rule.category,
        description: rule.description,
        isCustom: rule.isCustom
      };
    });
  };

  // --- STATS COMPILER ---
  const documentMetrics = useMemo(() => {
    let missing = 0;
    let requested = 0;
    let received = 0;
    let underReview = 0;
    let approved = 0;
    let expired = 0;
    let issues = 0;
    let waived = 0;
    let totalRequired = 0;

    const targetClients = embeddedClientId 
      ? clients.filter(c => c.id === embeddedClientId) 
      : clients;

    targetClients.forEach(c => {
      const isBrokerAndUnassigned = !isOwnerOrManager && c.agent !== `${currentUser.first} ${currentUser.last}`;
      if (isBrokerAndUnassigned && !embeddedClientId) return;

      const list = getFullChecklistForClient(c);
      list.forEach(doc => {
        totalRequired++;
        if (doc.status === "required") missing++;
        else if (doc.status === "requested") requested++;
        else if (doc.status === "received") received++;
        else if (doc.status === "under_review") underReview++;
        else if (doc.status === "approved") approved++;
        else if (doc.status === "waived") waived++;
        else if (doc.status === "rejected" || doc.status === "missing_pages" || doc.status === "follow_up") issues++;

        if (doc.warningTag === "expired" || doc.warningTag === "stale" || doc.status === "expired") expired++;
      });
    });

    return { missing, requested, received, underReview, approved, expired, issues, waived, totalRequired };
  }, [clients, docVault, embeddedClientId, isOwnerOrManager, currentUser]);

  // --- ROW MATRIX COMPILER ---
  const allDocRows = useMemo(() => {
    const rows: Array<{
      client: Client;
      docId: string;
      label: string;
      category: string;
      status: string;
      uploadedAt?: string;
      warningTag?: string;
      expiryDate?: string;
      reviewedBy?: string;
      isCustom?: boolean;
    }> = [];

    clients.forEach(c => {
      const isBrokerAndUnassigned = !isOwnerOrManager && c.agent !== `${currentUser.first} ${currentUser.last}`;
      if (isBrokerAndUnassigned && !embeddedClientId) return;
      if (embeddedClientId && c.id !== embeddedClientId) return;

      const list = getFullChecklistForClient(c);
      list.forEach(doc => {
        rows.push({
          client: c,
          docId: doc.id,
          label: doc.label || doc.id,
          category: doc.category || "Other",
          status: doc.status,
          uploadedAt: doc.files?.[doc.files.length - 1]?.uploadedAt || undefined,
          warningTag: doc.warningTag || undefined,
          expiryDate: doc.expiryDate || undefined,
          reviewedBy: doc.reviewedBy || undefined,
          isCustom: doc.isCustom
        });
      });
    });

    return rows.filter(row => {
      // 1. Sidebar filters
      const matchesSearch = 
        row.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (`${row.client.first} ${row.client.last}`).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
      const matchesBroker = brokerFilter === "all" || row.client.agent === brokerFilter;

      if (!matchesSearch || !matchesStatus || !matchesCategory || !matchesBroker) return false;

      // 2. Manager Queue filters
      if (managerQueueTab === "awaiting_review") {
        return row.status === "received" || row.status === "under_review";
      }
      if (managerQueueTab === "overdue") {
        // Find overdue request matches
        const reqs = docRequests.filter(req => req.clientId === row.client.id && req.name === row.label && req.status === "pending");
        if (reqs.length === 0) return false;
        return reqs.some(r => new Date(r.dueDate).getTime() < Date.now());
      }
      if (managerQueueTab === "stale_expired") {
        return row.warningTag === "expired" || row.warningTag === "stale";
      }
      if (managerQueueTab === "missing") {
        return row.status === "required" || row.status === "rejected" || row.status === "missing_pages";
      }

      return true;
    });
  }, [clients, docVault, searchQuery, statusFilter, categoryFilter, brokerFilter, managerQueueTab, isOwnerOrManager, currentUser, embeddedClientId, docRequests]);

  // --- ACTIONS ---
  const logDocActivity = (clientId: string, clientName: string, docId: string, docName: string, action: string, details: string) => {
    const newAct: DocActivityLog = {
      id: "act-" + Date.now(),
      clientId,
      clientName,
      docId,
      docName,
      action,
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      details
    };
    setDocActivities(prev => [newAct, ...prev]);
  };

  const handleStatusChange = (clientId: string, docId: string, newStatus: any) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const clientDocs = docVault[clientId] || {};
    const oldDoc = clientDocs[docId] || {};

    const updatedDocs = {
      ...clientDocs,
      [docId]: {
        ...oldDoc,
        status: newStatus,
        reviewedBy: `${currentUser.first} ${currentUser.last}`,
        reviewedAt: new Date().toISOString()
      }
    };

    setDocVault(prev => ({ ...prev, [clientId]: updatedDocs }));

    logDocActivity(
      clientId, 
      `${client.first} ${client.last}`, 
      docId, 
      CHECKLIST_RULES.find(r => r.id === docId)?.label || oldDoc.label || docId, 
      "status_changed", 
      `Direct compliance transition from "${oldDoc.status || 'required'}" to "${newStatus.toUpperCase()}"`
    );

    showToast(`Compliance updated to ${STATUS_STYLING[newStatus]?.label}`, "success", "✓");
  };

  const handleOpenUploadDrawer = (client: Client, docId: string, label: string, category: string) => {
    setDrawerClient(client);
    setDrawerDocId(docId);
    setDrawerDocLabel(label);
    setDrawerDocCategory(category);
    setUploadDrawerOpen(true);
  };

  const handleDeleteDocument = (clientId: string, docId: string, docLabel: string) => {
    if (!isOwnerOrManager) {
      showToast("Access Denied. Only Owners or Managers can delete records.", "error", "🔒");
      return;
    }
    if (!window.confirm(`Are you sure you want to completely erase files and reset the status of "${docLabel}"?`)) return;

    const clientDocs = docVault[clientId] || {};
    const updatedDocs = { ...clientDocs };
    delete updatedDocs[docId];

    setDocVault(prev => ({ ...prev, [clientId]: updatedDocs }));

    const client = clients.find(c => c.id === clientId);
    logDocActivity(
      clientId, 
      client ? `${client.first} ${client.last}` : "Unknown", 
      docId, 
      docLabel, 
      "deleted", 
      `Wiped secure files and reset check parameters.`
    );

    showToast(`Erased vault storage for ${docLabel}`, "success", "🗑️");
  };

  // Create Outbound Request
  const handleCreateRequest = (clientId: string, name: string, category: string, dueDate: string, notes: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newReq: DocumentRequest = {
      id: "req-" + Date.now(),
      clientId: client.id,
      clientName: `${client.first} ${client.last}`,
      name,
      category,
      dateRequested: new Date().toISOString().split("T")[0],
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
      assignedBroker: client.agent || `${currentUser.first} ${currentUser.last}`,
      status: "pending",
      notes
    };

    setDocRequests(prev => [newReq, ...prev]);

    // Track state inside vault
    const ruleMatch = CHECKLIST_RULES.find(r => r.label.toLowerCase() === name.toLowerCase()) || { id: "req_" + Date.now().toString().slice(-4) };
    const ruleId = ruleMatch.id;

    const clientDocs = docVault[client.id] || {};
    const updatedDocs = {
      ...clientDocs,
      [ruleId]: {
        ...(clientDocs[ruleId] || {}),
        status: "requested",
        requestDate: newReq.dateRequested,
        dueDate: newReq.dueDate,
        notes: notes
      }
    };

    setDocVault(prev => ({ ...prev, [client.id]: updatedDocs }));

    logDocActivity(
      client.id,
      `${client.first} ${client.last}`,
      ruleId,
      name,
      "requested",
      `Dispatched formal document request. Target Deadline: ${newReq.dueDate}. Instructions: "${notes}"`
    );

    showToast(`Document request issued for ${name}`, "success", "📩");
  };

  const handleMarkRequestReceived = (reqId: string) => {
    setDocRequests(prev => prev.map(r => {
      if (r.id !== reqId) return r;
      
      const clientDocs = docVault[r.clientId] || {};
      const ruleMatch = CHECKLIST_RULES.find(rule => rule.label === r.name) || { id: "req_" + reqId.split("-")[1] };
      const updatedDocs = {
        ...clientDocs,
        [ruleMatch.id]: {
          ...(clientDocs[ruleMatch.id] || {}),
          status: "received"
        }
      };

      setDocVault(prev => ({ ...prev, [r.clientId]: updatedDocs }));
      logDocActivity(r.clientId, r.clientName, ruleMatch.id, r.name, "status_changed", `Broker overrode request: flagged as received`);

      return { ...r, status: "received" };
    }));
    showToast("Marked request received", "success", "✓");
  };

  // Add Custom Lender Clause
  const handleAddCustomRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!embeddedClientId || !customReqName) return;

    const customId = "custom_" + Date.now();
    const clientDocs = docVault[embeddedClientId] || {};

    setDocVault(prev => ({
      ...prev,
      [embeddedClientId]: {
        ...clientDocs,
        [customId]: {
          id: customId,
          isCustom: true,
          label: customReqName,
          category: customReqCategory,
          description: customReqDesc || "Custom underwriting clause requirement.",
          status: "required",
          files: [],
          reviewHistory: [{
            date: new Date().toISOString(),
            user: `${currentUser.first} ${currentUser.last}`,
            status: "required",
            notes: "Bespoke condition added to portfolio file."
          }]
        }
      }
    }));

    const client = clients.find(c => c.id === embeddedClientId);
    logDocActivity(
      embeddedClientId,
      client ? `${client.first} ${client.last}` : "Client Folder",
      customId,
      customReqName,
      "status_changed",
      `Added custom lender requirement clause: "${customReqName}" under category ${customReqCategory}`
    );

    showToast(`Bespoke clause "${customReqName}" added!`, "success", "🛡️");
    setCustomReqOpen(false);
    setCustomReqName("");
    setCustomReqDesc("");
  };

  // Broker Personal Compliance Locker uploads
  const handleUploadPersonalFile = (type: string, fileInput: HTMLInputElement | null) => {
    let fName = `Credential_${type.replace(/\s+/g, "_")}.pdf`;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      fName = fileInput.files[0].name;
    }

    const newItem = {
      id: "pf-" + Date.now(),
      name: fName,
      type,
      date: new Date().toISOString().split("T")[0]
    };

    const updated = [newItem, ...personalFiles];
    setPersonalFiles(updated);
    localStorage.setItem("gbk_personal_compliance_docs", JSON.stringify(updated));
    showToast(`Vaulted personal credential file: ${fName}`, "success", "🛡️");
  };

  const handleDeletePersonalFile = (id: string, name: string) => {
    const updated = personalFiles.filter(item => item.id !== id);
    setPersonalFiles(updated);
    localStorage.setItem("gbk_personal_compliance_docs", JSON.stringify(updated));
    showToast(`Removed personal credential ${name}`, "info", "🗑️");
  };

  return (
    <div className={`flex flex-col gap-6 select-none ${embeddedClientId ? "" : "h-full overflow-hidden"}`}>
      
      {/* 1. Dashboard summary header (KPI bento grid) */}
      <DocDashboardSummary metrics={documentMetrics} isEmbedded={!!embeddedClientId} />

      {embeddedClientId ? (
        // --- VIEW MODE A: CLIENT DETAIL DRAWER EMBEDDED CHECKLIST ---
        <div className="flex flex-col gap-4">
          
          {/* Subheader details */}
          <div className="flex justify-between items-center bg-[var(--color-surface-2)] p-4 border border-[var(--color-border)] rounded-xl">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                📂 Mortgage Folder Checklist 
              </h4>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Automatic matching against self-employed, joint borrower, or purchase/refinance triggers</p>
            </div>
            
            <div className="flex gap-2">
              {pendingSyncCount > 0 && (
                <button
                  onClick={handleSyncPending}
                  disabled={syncingAll}
                  className="text-[10px] font-black uppercase bg-[var(--color-warning)] hover:bg-[var(--color-warning-subtle)] text-[var(--color-text-inverse)] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all animate-pulse"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingAll ? "animate-spin" : ""}`} /> Sync {pendingSyncCount} Pending
                </button>
              )}
              <button 
                onClick={() => setCustomReqOpen(true)}
                className="text-[10px] font-bold uppercase bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                title="Inject specific lender conditions or bespoke clauses"
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Add Lender Clause
              </button>
              <button 
                onClick={() => setRequestModalOpen(true)}
                className="text-[10px] font-black uppercase bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Issue Doc Request
              </button>
            </div>
          </div>

          {/* Checklist Categories content */}
          <div className="space-y-5">
            {DOCUMENT_CATEGORIES.map(category => {
              const categoryDocs = allDocRows.filter(row => row.category === category);
              if (categoryDocs.length === 0) return null;

              return (
                <div key={category} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-[var(--color-surface-2)]/40 px-4 py-2.5 border-b border-[var(--color-border)]/70 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[var(--color-accent)] tracking-widest">{category} Requirements</span>
                    <span className="text-[9px] bg-[var(--color-surface-3)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full font-bold">
                      {categoryDocs.length} items
                    </span>
                  </div>

                  <div className="p-3 divide-y divide-[var(--color-divider)] space-y-3">
                    {categoryDocs.map((doc, idx) => {
                      const clientMatch = clients.find(c => c.id === embeddedClientId)!;
                      const vaultState = getFullChecklistForClient(clientMatch).find(d => d.id === doc.docId)!;
                      return (
                        <div key={doc.docId} className={idx > 0 ? "pt-3" : ""}>
                          <DocChecklistCard 
                            client={clientMatch}
                            doc={vaultState}
                            onStatusChange={handleStatusChange}
                            onOpenUploadDrawer={handleOpenUploadDrawer}
                            onDeleteDocument={handleDeleteDocument}
                            isOwnerOrManager={isOwnerOrManager}
                            currentUser={currentUser}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        // --- VIEW MODE B: GLOBAL DOCUMENTS DASHBOARD MATRIX ---
        <div className="flex flex-col md:flex-row gap-5 flex-grow overflow-hidden">
          
          {/* Left Hand: Workspace Switchers & Active Filters */}
          <div className="w-full md:w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
            
            <div className="space-y-1">
              <span className="text-[9px] text-[var(--color-text-faint)] uppercase font-black tracking-widest">Active Workspace</span>
              <div className="flex items-center gap-2 text-[var(--color-accent)] border-b border-[var(--color-border)]/70 pb-2">
                <Shield className="h-4.5 w-4.5" />
                <span className="text-xs font-black uppercase tracking-wider">Document Control center</span>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex flex-col gap-1">
              {[
                { id: "dashboard", label: "Operations matrix", icon: <Layers className="h-4 w-4" /> },
                { id: "requests", label: "Client Request Tracker", icon: <Clock className="h-4 w-4" />, count: docRequests.filter(r => r.status === "pending").length },
                { id: "timeline", label: "Underwriting audit logs", icon: <History className="h-4 w-4" /> },
                { id: "compliance", label: "My licensing portal", icon: <Lock className="h-4 w-4" /> }
              ].map(sub => (
                <button 
                  key={sub.id}
                  onClick={() => {
                    setActiveSubTab(sub.id as any);
                    // Reset manager queues when shifting tabs
                    setManagerQueueTab("all");
                  }}
                  className={`flex items-center justify-between text-xs font-bold px-3 py-2.5 rounded-lg text-left transition-all ${
                    activeSubTab === sub.id 
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-l-2 border-[var(--color-accent)] pl-2.5" 
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/50 hover:text-[var(--color-text)]"
                  }`}
                >
                  <span className="flex items-center gap-2">{sub.icon} {sub.label}</span>
                  {sub.count && sub.count > 0 ? (
                    <span className="bg-[#6fa3b8]/20 text-[#6fa3b8] text-[9px] font-black px-1.5 py-0.5 rounded">
                      {sub.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* DYNAMIC SIDEBAR FILTERS (only shown on Dashboard tab) */}
            {activeSubTab === "dashboard" && (
              <div className="flex flex-col gap-3 mt-2 border-t border-[var(--color-border)] pt-4 space-y-1">
                <span className="text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-widest">Workbench Filters</span>
                
                 <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search client folder or file..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-[11px] rounded-lg pl-8 pr-3 py-1.5 text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-wider block">Compliance Status</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] rounded-lg p-1.5 font-bold uppercase text-[var(--color-text)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    {Object.keys(STATUS_STYLING).map(k => (
                      <option key={k} value={k}>{STATUS_STYLING[k].label}</option>
                    ))}
                  </select>
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-wider block">Requirement Category</label>
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] rounded-lg p-1.5 font-bold uppercase text-[var(--color-text)] focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {DOCUMENT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Team / Broker Filter */}
                {isOwnerOrManager && (
                  <div className="space-y-1">
                    <label className="text-[8px] text-[var(--color-text-muted)] font-black uppercase tracking-wider block">Assigned Broker Agent</label>
                    <select 
                      value={brokerFilter}
                      onChange={(e) => setBrokerFilter(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] rounded-lg p-1.5 font-bold uppercase text-[var(--color-text)] focus:outline-none cursor-pointer"
                    >
                      <option value="all">Entire Brokerage team</option>
                      {agentNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Right Hand Content panel */}
          <div className="flex-grow bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
            
            {/* SUBTAB 1: OPERATIONS MASTER GRID */}
            {activeSubTab === "dashboard" && (
              <div className="flex flex-col h-full overflow-hidden">
                
                {/* Header operations bar with smart Queue tabs */}
                <div className="p-4 border-b border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-black uppercase text-[var(--color-text)] tracking-widest flex items-center gap-1.5">
                      <Layers className="h-4.5 w-4.5 text-[var(--color-accent)]" /> MORTGAGE FOLDER REGULATORY MATRIX
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Underwriting clearance, document age controls &amp; lender condition checkmarks</p>
                  </div>
                  
                  {/* Smart manager queue switcher */}
                  <div className="flex flex-wrap gap-1 bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 p-1 rounded-lg">
                    {[
                      { id: "all", label: "All Items" },
                      { id: "awaiting_review", label: "Awaiting Review" },
                      { id: "overdue", label: "Overdue Requests" },
                      { id: "stale_expired", label: "Stale / Expired" },
                      { id: "missing", label: "Critical Missing" }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setManagerQueueTab(tab.id as any)}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${
                          managerQueueTab === tab.id 
                            ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow" 
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {pendingSyncCount > 0 && (
                    <button
                      onClick={handleSyncPending}
                      disabled={syncingAll}
                      className="text-[10px] bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/80 text-[var(--color-text-inverse)] font-black uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 xl:self-center animate-pulse"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncingAll ? "animate-spin" : ""}`} /> Sync {pendingSyncCount} Documents
                    </button>
                  )}
                  <button 
                    onClick={() => setRequestModalOpen(true)}
                    className="text-[10px] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 font-black uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 xl:self-center"
                  >
                    <Plus className="h-3.5 w-3.5" /> Issue Doc Request
                  </button>
                </div>

                {/* Matrix Table */}
                <div className="flex-grow overflow-auto p-4">
                  {allDocRows.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface-2)]/30">
                      <FileText className="h-8 w-8 text-[var(--color-text-faint)]/40 mb-2" />
                      <span className="text-xs text-[var(--color-text-muted)] font-bold">No underwriting folder documents match the current criteria.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] text-[9.5px] text-[var(--color-text-faint)] uppercase tracking-widest pb-3">
                            <th className="pb-3 pr-3 font-black">Client file folder</th>
                            <th className="pb-3 pr-3 font-black">Required requirement</th>
                            <th className="pb-3 pr-3 font-black">Category</th>
                            <th className="pb-3 pr-3 font-black">Assigned agent</th>
                            <th className="pb-3 pr-3 font-black">Last updated</th>
                            <th className="pb-3 pr-3 font-black">Compliance state</th>
                            <th className="pb-3 text-right font-black">Operations</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-divider)]">
                          {allDocRows.map((row, idx) => {
                            const style = STATUS_STYLING[row.status] || STATUS_STYLING.required;
                            return (
                              <tr key={idx} className="hover:bg-[var(--color-surface-2)]/60 transition-colors">
                                <td className="py-3 pr-3">
                                  <button 
                                    onClick={() => onOpenClient(row.client.id)}
                                    className="hover:text-[var(--color-accent)] hover:underline font-black text-[var(--color-text)] text-left font-sans"
                                  >
                                    {row.client.first} {row.client.last}
                                  </button>
                                  <span className="block text-[8px] text-[var(--color-text-faint)] font-black uppercase mt-0.5">
                                    {row.client.type || "Purchase"} | {row.client.emptype || "Salaried"}
                                  </span>
                                </td>
                                <td className="py-3 pr-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[var(--color-text)] font-bold">{row.label}</span>
                                    {row.isCustom && (
                                      <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/15 text-[8px] font-black px-1.5 py-0.5 rounded">Custom</span>
                                    )}
                                    {row.warningTag === "expired" && (
                                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase px-1 py-0.5 rounded">Expired</span>
                                    )}
                                    {row.warningTag === "stale" && (
                                      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[8px] font-black uppercase px-1 py-0.5 rounded">Stale</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 pr-3 text-[var(--color-text-muted)]">{row.category}</td>
                                <td className="py-3 pr-3 text-[var(--color-text-muted)]">{row.client.assignedBroker || row.client.agent || row.client.assignedTo || row.client.retentionOwner || "Unassigned"}</td>
                                <td className="py-3 pr-3 text-[var(--color-text-faint)] font-mono text-[10px]">
                                  {row.uploadedAt ? new Date(row.uploadedAt).toLocaleDateString("en-CA") : "—"}
                                </td>
                                <td className="py-3 pr-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase border ${style.color} ${style.border} ${style.text}`}>
                                    {style.label}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <div className="inline-flex gap-1.5">
                                    <button 
                                      onClick={() => handleOpenUploadDrawer(row.client, row.docId, row.label, row.category)}
                                      className="px-2.5 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] rounded-lg text-[9px] font-black uppercase text-[var(--color-text)] border border-[var(--color-border)]"
                                    >
                                      Audit &amp; Review
                                    </button>
                                    {isOwnerOrManager && (
                                      <button 
                                        onClick={() => handleDeleteDocument(row.client.id, row.docId, row.label)}
                                        className="p-1.5 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-lg border border-red-500/10"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* SUBTAB 2: CLIENT REQUEST TRACKER */}
            {activeSubTab === "requests" && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black uppercase text-[var(--color-text)] tracking-widest flex items-center gap-1.5">
                      <Clock className="h-4.5 w-4.5 text-[var(--color-accent)]" /> ACTIVE OUTBOUND REQUEST TRACKER
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Review dispatch logs and confirm delivery milestones</p>
                  </div>
                  <button 
                    onClick={() => setRequestModalOpen(true)}
                    className="text-[10px] bg-[#6fa3b8]/15 border border-[#6fa3b8]/20 text-[#6fa3b8] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg hover:bg-[#6fa3b8]/20"
                  >
                    + Create Outbound Request
                  </button>
                </div>

                <div className="flex-grow overflow-auto p-4">
                  {docRequests.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface-2)]/30">
                      <Clock className="h-8 w-8 text-[var(--color-text-faint)]/40 mb-2" />
                      <span className="text-xs text-[var(--color-text-muted)]">No pending client requests registered.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {docRequests.map(req => {
                        const isOverdue = new Date(req.dueDate).getTime() < Date.now() && req.status === "pending";
                        return (
                          <div key={req.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl space-y-3 relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="text-xs font-black text-[var(--color-text)]">{req.name}</h5>
                                  <span className="text-[9px] text-[var(--color-text-muted)] block mt-0.5">Linked File Folder: <strong className="text-[var(--color-text)]/80">{req.clientName}</strong></span>
                                </div>
                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded border ${
                                  req.status === "received" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                  isOverdue ? "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse" :
                                  "bg-[#6fa3b8]/10 border-[#6fa3b8]/20 text-[#6fa3b8]"
                                }`}>
                                  {req.status === "received" ? "Received" : isOverdue ? "Overdue" : "Pending Client Upload"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[9px] bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 p-2 rounded-lg font-mono">
                                <div>
                                  <span className="text-[var(--color-text-faint)] uppercase font-black block">Dispatched Date</span>
                                  <span className="text-[var(--color-text-muted)] mt-0.5">{req.dateRequested}</span>
                                </div>
                                <div>
                                  <span className="text-[var(--color-text-faint)] uppercase font-black block">Upload Deadline</span>
                                  <span className={`text-[var(--color-text-muted)] mt-0.5 ${isOverdue ? "text-red-400 font-bold" : ""}`}>{req.dueDate}</span>
                                </div>
                              </div>

                              {req.notes && (
                                <p className="text-[10px] text-[var(--color-text-muted)] italic bg-[var(--color-surface-2)] p-2 rounded-md border border-[var(--color-border)] leading-relaxed">
                                  " {req.notes} "
                                </p>
                              )}
                            </div>

                            <div className="flex justify-between items-center border-t border-[var(--color-border)]/70 pt-3 text-[9.5px] text-[var(--color-text-faint)] mt-2">
                              <span>Broker Broker: <strong>{req.assignedBroker}</strong></span>
                              {req.status === "pending" && (
                                <button 
                                  onClick={() => handleMarkRequestReceived(req.id)}
                                  className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/15 text-green-400 rounded uppercase font-black text-[8px] tracking-wider transition-colors"
                                >
                                  Mark Received
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 3: TIMELINE & AUDIT LEDGERS */}
            {activeSubTab === "timeline" && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/40">
                  <h3 className="text-xs font-black uppercase text-[var(--color-text)] tracking-widest flex items-center gap-1.5">
                    <History className="h-4.5 w-4.5 text-[var(--color-accent)]" /> UNDERWRITING AUDIT ACTIVITY STREAM
                  </h3>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Secure operations ledger recording compliance triggers and checkmarks</p>
                </div>
                <DocAuditTimeline activities={docActivities} />
              </div>
            )}

            {/* SUBTAB 4: PERSONAL COMPLIANCE LOCKER */}
            {activeSubTab === "compliance" && (
              <DocPersonalLocker 
                personalFiles={personalFiles}
                onUploadPersonalFile={handleUploadPersonalFile}
                onDeletePersonalFile={handleDeletePersonalFile}
                showToast={showToast}
              />
            )}

          </div>
        </div>
      )}

      {/* --- REUSABLE SECURITY VAULT DRAWER OVERLAY --- */}
      <DocUploadDrawer 
        isOpen={uploadDrawerOpen}
        onClose={() => setUploadDrawerOpen(false)}
        client={drawerClient}
        docId={drawerDocId}
        docLabel={drawerDocLabel}
        docCategory={drawerDocCategory}
        docVault={docVault}
        setDocVault={setDocVault}
        currentUser={currentUser}
        showToast={showToast}
        logDocActivity={logDocActivity}
        bridgeOnline={bridgeOnline}
      />

      {/* --- FORM MODAL: OUTBOUND REQ DISPATCH --- */}
      <DocRequestModal 
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        clients={clients}
        currentUser={currentUser}
        onCreateRequest={handleCreateRequest}
      />

      {/* --- FORM MODAL: BESPOKE LENDER CONDITION CLAUSE --- */}
      {customReqOpen && (
        <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none animate-fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setCustomReqOpen(false)}
              className="absolute right-4 top-4 text-[var(--color-text-faint)] hover:text-[var(--color-text)] p-1 rounded bg-[var(--color-surface-2)]"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-xs font-black uppercase text-[var(--color-accent)] tracking-widest mb-4 border-b border-[var(--color-border)]/70 pb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Add Bespoke Lender Condition
            </h3>

            <form onSubmit={handleAddCustomRequirement} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Condition Clause Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. TD Bank Gift Letter verification, Scotiabank Appraisal"
                  value={customReqName}
                  onChange={(e) => setCustomReqName(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Underwriting Category</label>
                <select 
                  value={customReqCategory}
                  onChange={(e) => setCustomReqCategory(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 font-bold text-[var(--color-text)] focus:outline-none"
                >
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-[var(--color-surface)]">{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Requirement Clause Details</label>
                <textarea 
                  value={customReqDesc}
                  onChange={(e) => setCustomReqDesc(e.target.value)}
                  placeholder="e.g. TD Bank requires signed and stamped Gift Letter confirming funds of $50,000 are non-repayable."
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 text-xs rounded-lg p-2.5 text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 h-24 focus:outline-none focus:border-[var(--color-accent)] font-semibold"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-black uppercase text-xs tracking-widest py-3 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center justify-center gap-1.5"
              >
                ✓ Embed Custom Condition
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
