import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ShieldCheck, ShieldAlert, Download, Trash2, FileText, ChevronDown, Calendar, AlertTriangle, UserCheck } from "lucide-react";
import { Client, User, Lender, Task, Event } from "../types";
import { ApplicationDetailsForm } from "./ApplicationDetailsForm";
import { DocumentManager } from "./DocumentManager";
import { MortgageChecklist } from "./MortgageChecklist";
import { MortgageActivityTracker } from "./MortgageActivityTracker";
import { getClientDocuments } from "../lib/bridgeService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CHECKLIST_RULES } from "./document/constants";
import {
  getAssignableStaff,
  canAssignClient,
  resolveClientBrokerAssignment,
  dispatchClientAssignmentEvent,
  getUserFullName
} from "../lib/userUtils";
import { updateClientAssignmentApi } from "../lib/api";
import { logActivityEvent } from "../lib/activityEngine";

export interface ClientDetailPanelProps {
  currentClient: Client | null;
  currentUser: User;
  userRoster?: User[];
  clients: Client[];
  lenders: Lender[];
  docVault: Record<string, any>;
  setDocVault: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  detailTab: string;
  setDetailTab: (tab: string) => void;
  closeDetail: () => void;
  openClient: (id: string, initialTab?: string) => void;
  handleUpdateClient: (updatedClient: Client) => void;
  handleUpdateClientStatus: (id: string, status: any) => void;
  triggerUnderwritingAnalysis: (client: Client) => void;
  underwritingLoading?: boolean;
  underwritingError?: string | null;
  getAgentNames: () => string[];
  showToast: (msg: string, type?: "success" | "error", icon?: string) => void;
  bridgeOnline?: boolean;
  handleDeleteClient: (id: string) => Promise<void>;
  onNavigateToCalculators?: (clientId: string) => void;
  onScheduleClientActivity?: (clientId: string) => void;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  events?: Event[];
  setEvents?: React.Dispatch<React.SetStateAction<Event[]>>;
}

function fd(n: any) {
  if (n === null || n === undefined || isNaN(Number(n))) return "$0";
  return "$" + Math.round(Number(n)).toLocaleString("en-CA");
}

function pn(s: any) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[$,\s]/g, "")) || 0;
}

function cPmt(P: number, rPct: number, yrs: number) {
  if (!P || !rPct || !yrs) return 0;
  const r = rPct / 100 / 12;
  const n = yrs * 12;
  if (r === 0) return P / n;
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function ClientDetailPanel({
  currentClient,
  currentUser,
  userRoster,
  clients,
  lenders,
  docVault,
  setDocVault,
  detailTab,
  setDetailTab,
  closeDetail,
  openClient,
  handleUpdateClient,
  handleUpdateClientStatus,
  triggerUnderwritingAnalysis,
  underwritingLoading = false,
  underwritingError = null,
  getAgentNames,
  showToast,
  bridgeOnline = false,
  handleDeleteClient,
  onNavigateToCalculators,
  onScheduleClientActivity,
  tasks,
  setTasks,
  events,
  setEvents
}: ClientDetailPanelProps) {
  if (!currentClient) return null;

  const isAdmin = ["Developer/Admin", "Admin"].includes(currentUser.role) || currentUser.isOwner === true;
  const canAssign = canAssignClient(currentUser);
  const resolvedAssignment = resolveClientBrokerAssignment(currentClient, userRoster || []);
  const assignableStaff = getAssignableStaff(currentUser, userRoster, resolvedAssignment.assignedBrokerId || undefined);

  const handleAssignmentChange = async (selectedUserId: string) => {
    if (!canAssign) {
      showToast("You do not have permission to reassign clients.", "error");
      return;
    }

    let selectedUser = assignableStaff.find(u => u.id === selectedUserId);
    if (!selectedUser && userRoster) {
      selectedUser = userRoster.find(u => u.id === selectedUserId);
    }

    const newBrokerName = selectedUser ? getUserFullName(selectedUser) : (selectedUserId ? selectedUserId : "Unassigned");
    const updatedClient: Client = {
      ...currentClient,
      assignedBrokerId: selectedUserId || undefined,
      assignedBrokerName: newBrokerName,
      assignedBroker: newBrokerName,
      agent: newBrokerName,
      retentionOwner: newBrokerName,
      assignedBrokerUpdatedAt: new Date().toISOString(),
      assignedBrokerUpdatedBy: currentUser.id || currentUser.email
    };

    handleUpdateClient(updatedClient);

    try {
      await updateClientAssignmentApi(currentClient.id, {
        assignedBrokerId: selectedUserId || null,
        assignedBrokerName: newBrokerName,
        updatedBy: currentUser.id || currentUser.email
      });
    } catch (err) {
      console.warn("Backend assignment sync deferred or offline:", err);
    }

    dispatchClientAssignmentEvent(currentClient.id, selectedUserId || null, currentUser, updatedClient);

    logActivityEvent({
      clientId: currentClient.id,
      clientName: `${currentClient.first} ${currentClient.last}`,
      eventType: 'broker_assigned',
      user: getUserFullName(currentUser),
      timestamp: new Date().toISOString(),
      description: `Assigned broker updated to ${newBrokerName}`,
      details: `Reassigned by ${getUserFullName(currentUser)} (${currentUser.email || currentUser.id})`
    });

    showToast(`Assigned broker updated to ${newBrokerName}`, "success", "✓");
  };

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = React.useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

  const handleExportData = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      showToast("Preparing client PDF export...", "success");
      
      let docsList: any[] = [];
      try {
        const fetched = await getClientDocuments(currentClient.id);
        if (Array.isArray(fetched)) {
          docsList = fetched;
        }
      } catch (err) {
        console.error("Failed to fetch documents via bridge, falling back to local vault:", err);
      }

      const doc = new jsPDF();
      const marginX = 15;
      let posY = 15;

      const drawSectionHeader = (title: string) => {
        if (posY > 240) {
          doc.addPage();
          posY = 15;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); // Primary Slate
        doc.text(title.toUpperCase(), marginX, posY);
        
        // Underline bar
        doc.setDrawColor(217, 119, 6); // Golden Amber
        doc.setLineWidth(0.8);
        doc.line(marginX, posY + 2, marginX + 35, posY + 2);
        
        doc.setDrawColor(226, 232, 240); // Soft grey across the page
        doc.setLineWidth(0.2);
        doc.line(marginX + 35, posY + 2, 210 - marginX, posY + 2);
        
        posY += 8;
      };

      // Header Accent Bar
      doc.setFillColor(30, 41, 59); // Dark navy/slate
      doc.rect(0, 0, 210, 26, "F");

      // Header light accent
      doc.setFillColor(217, 119, 6); // Amber
      doc.rect(0, 26, 210, 2, "F");

      // Title text on Dark Background
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("GBK CRM — CLIENT FILE DOSSIER", marginX, 17);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const timestampStr = new Date().toLocaleString("en-CA");
      doc.text(`EXPORTED AT: ${timestampStr}`, 210 - marginX, 12, { align: "right" });
      doc.text(`BY ADVISOR: ${currentUser.first} ${currentUser.last} (${currentUser.role})`, 210 - marginX, 16, { align: "right" });
      doc.text(`COMPLIANCE: PIPEDA COMPLIANT SINGLE-CLIENT EXPORT`, 210 - marginX, 20, { align: "right" });

      posY = 38;

      // Section 1: Client Summary
      drawSectionHeader("Borrower Profile & File Metadata");

      const rawCreated = currentClient.createdAt;
      const rawUpdated = currentClient.updatedAt || currentClient.createdAt;
      
      const createdDate = rawCreated ? new Date(rawCreated) : new Date();
      const updatedDate = rawUpdated ? new Date(rawUpdated) : new Date();
      
      const filingDateStr = isNaN(createdDate.getTime()) ? new Date().toLocaleDateString("en-CA") : createdDate.toLocaleDateString("en-CA");
      const lastActivityStr = isNaN(updatedDate.getTime()) ? filingDateStr : updatedDate.toLocaleDateString("en-CA");

      const summaryData = [
        ["Full Name:", `${currentClient.first} ${currentClient.last}`, "Email Address:", currentClient.email || "—"],
        ["File Type / Goal:", currentClient.type || "Purchase File", "Cell Phone:", currentClient.cell || "—"],
        ["Current Stage:", (currentClient.status || "Lead").toUpperCase(), "Lender Partner:", currentClient.lender || "—"],
        ["Lead Advisor:", currentClient.assignedBroker || currentClient.agent || currentClient.assignedTo || currentClient.retentionOwner || "Unassigned", "Date of Birth:", currentClient.dob || "—"],
        ["Filing Date:", filingDateStr, "Last Activity:", lastActivityStr]
      ];

      autoTable(doc, {
        startY: posY,
        head: [],
        body: summaryData,
        theme: "plain",
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          textColor: [51, 65, 85], // Slate 700
          font: "helvetica"
        },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 35 },
          1: { cellWidth: 55 },
          2: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 35 },
          3: { cellWidth: 55 }
        },
        margin: { left: marginX, right: marginX }
      });

      posY = (doc as any).lastAutoTable.finalY + 8;

      // Section 2: Mortgage & Financial Details
      drawSectionHeader("Financial Profile & Deal Parameters");

      const mtg = pn(currentClient.mtgamt);
      const prop = pn(currentClient.propval);
      const purchase = pn(currentClient.purchasePrice || currentClient.propval); // fallback
      const ltv = prop > 0 ? ((mtg / prop) * 100) : 0;

      const financialData = [
        ["Requested Mortgage:", fd(mtg), "Estimated LTV Ratio:", ltv > 0 ? `${ltv.toFixed(1)}%` : "0.0%"],
        ["Estimated Property Value:", fd(prop), "Purchase Price:", purchase > 0 ? fd(purchase) : "—"],
        ["Beacon Credit Score:", currentClient.beacon || "—", "Borrower Monthly Income:", currentClient.income ? fd(pn(currentClient.income)) : "—"],
        ["Co-Borrower Monthly Income:", currentClient.coIncome ? fd(pn(currentClient.coIncome)) : "—", "Borrower Monthly Debts:", currentClient.debts ? fd(pn(currentClient.debts)) : "—"],
        ["Annual Property Tax:", currentClient.tax ? fd(pn(currentClient.tax)) : "—", "Monthly Condo / Heat Fees:", `${currentClient.condo ? fd(pn(currentClient.condo)) : "—"} / ${currentClient.heat ? fd(pn(currentClient.heat)) : "—"}`]
      ];

      autoTable(doc, {
        startY: posY,
        head: [],
        body: financialData,
        theme: "plain",
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          textColor: [51, 65, 85],
          font: "helvetica"
        },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 45 },
          1: { cellWidth: 45 },
          2: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 45 },
          3: { cellWidth: 45 }
        },
        margin: { left: marginX, right: marginX }
      });

      posY = (doc as any).lastAutoTable.finalY + 8;

      // Section 3: Debt Servicing & Qualification
      drawSectionHeader("Qualification & Debt Service Ratios");

      const inc = pn(currentClient.income) + pn(currentClient.coIncome);
      const mtgVal = pn(currentClient.mtgamt);
      const monthlyMtg = cPmt(mtgVal, 5.25, 25);
      const tax = pn(currentClient.tax) / 12;
      const condo = pn(currentClient.condo);
      const heat = pn(currentClient.heat) || 150;
      const gds = inc > 0 ? ((monthlyMtg + tax + condo + heat) / (inc / 12) * 100) : 0;
      const debts = pn(currentClient.debts);
      const tds = inc > 0 ? ((monthlyMtg + tax + condo + heat + debts) / (inc / 12) * 100) : 0;

      const ratioData = [
        ["Gross Debt Service (GDS):", `${gds > 0 ? gds.toFixed(2) : "0.00"}%`, "Benchmark Limit:", "< 39.00%", gds > 39 ? "FAIL (LIMIT EXCEEDED)" : "PASS (COMPLIANT)"],
        ["Total Debt Service (TDS):", `${tds > 0 ? tds.toFixed(2) : "0.00"}%`, "Benchmark Limit:", "< 44.00%", tds > 44 ? "FAIL (LIMIT EXCEEDED)" : "PASS (COMPLIANT)"]
      ];

      autoTable(doc, {
        startY: posY,
        head: [],
        body: ratioData,
        theme: "striped",
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          textColor: [51, 65, 85],
          font: "helvetica"
        },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 50 },
          1: { fontStyle: "bold", cellWidth: 25 },
          2: { textColor: [100, 116, 139], cellWidth: 35 },
          3: { textColor: [100, 116, 139], cellWidth: 25 },
          4: { fontStyle: "bold", cellWidth: 45 }
        },
        didParseCell: (data) => {
          if (data.column.index === 4) {
            if (data.cell.text[0].startsWith("FAIL")) {
              data.cell.styles.textColor = [220, 38, 38] as any; // Red
            } else if (data.cell.text[0].startsWith("PASS")) {
              data.cell.styles.textColor = [22, 163, 74] as any; // Green
            }
          }
        },
        margin: { left: marginX, right: marginX }
      });

      posY = (doc as any).lastAutoTable.finalY + 8;

      // Section 4: Application details section
      drawSectionHeader("Comprehensive Application Details");

      const detailFields: [string, string][] = [
        ["First Name", String(currentClient.first || "")],
        ["Last Name", String(currentClient.last || "")],
        ["Email Address", String(currentClient.email || "")],
        ["Cell Phone", String(currentClient.cell || "")],
        ["Date of Birth", String(currentClient.dob || "")],
        ["Marital Status", String(currentClient.marital || "")],
        ["Social Insurance Number (SIN)", currentClient.sin ? "●●●-●●●-●●● (Protected)" : ""],
        ["Dependents", String(currentClient.dep !== undefined && currentClient.dep !== null && currentClient.dep !== "" ? currentClient.dep : "")],
        ["Co-Borrower Name", String(currentClient.co || "")],
        ["Co-Borrower Email", String(currentClient.coEmail || "")],
        ["Employment Type", String(currentClient.emptype || "")],
        ["Beacon Credit Score", String(currentClient.beacon || "")],
        ["Assigned Broker / Advisor", String(currentClient.assignedBroker || currentClient.agent || currentClient.assignedTo || currentClient.retentionOwner || "")],
        ["Lender Partner", String(currentClient.lender || "")],
        ["Deal Lead Source", String(currentClient.source || "")],
        ["Referred By", String(currentClient.referredBy || "")],
        ["Funded Date", String(currentClient.fundedDate || "")],
        ["Maturity Date", String(currentClient.maturityDate || "")],
        ["Retention Owner", String(currentClient.retentionOwner || "")],
        ["Last Contacted", String(currentClient.lastContactedDate || "")],
        ["Next Follow-Up", String(currentClient.nextFollowUpDate || "")],
        ["Retention Outcome", String(currentClient.retentionOutcome || "")],
        ["Retention Notes", String(currentClient.retentionNotes || "")]
      ];

      // Skip empty values
      const activeDetails = detailFields.filter(([_, val]) => {
        const v = val ? val.trim() : "";
        return v.length > 0 && v !== "—" && v !== "undefined";
      });

      // Render in 2 columns
      const detailRows: any[] = [];
      for (let i = 0; i < activeDetails.length; i += 2) {
        const item1 = activeDetails[i];
        const item2 = activeDetails[i + 1] || ["", ""];
        detailRows.push([
          item1[0], item1[1],
          item2[0], item2[1]
        ]);
      }

      autoTable(doc, {
        startY: posY,
        head: [],
        body: detailRows,
        theme: "plain",
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [51, 65, 85],
          font: "helvetica"
        },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 45 },
          1: { cellWidth: 45 },
          2: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 45 },
          3: { cellWidth: 45 }
        },
        margin: { left: marginX, right: marginX }
      });

      posY = (doc as any).lastAutoTable.finalY + 8;

      // Section 5: Documents section
      drawSectionHeader("Document Verification & Checklist");

      const clientVault = (docVault && docVault[currentClient.id]) || {};
      const activeRules = CHECKLIST_RULES.filter(rule => rule.evaluate(currentClient));

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
      const docRows: any[] = [];

      allRules.forEach(rule => {
        const savedState = clientVault[rule.id] || {};
        const status = savedState.status || "required";
        const category = rule.category || "Other";
        const label = rule.label || "Document Slot";
        const notes = savedState.notes || "—";
        
        let filesCount = 0;
        if (savedState.files) {
          filesCount = savedState.files.length;
        } else if (savedState.name) {
          filesCount = 1;
        }
        
        const expiry = savedState.expiryDate || "—";
        
        docRows.push({
          label,
          category,
          status: status.toUpperCase(),
          filesCount,
          expiry,
          notes
        });
      });

      docsList.forEach(bridgeDoc => {
        const alreadyTracked = docRows.some(row => row.label.toLowerCase() === bridgeDoc.name.toLowerCase());
        if (!alreadyTracked) {
          docRows.push({
            label: bridgeDoc.name,
            category: "Bridge File",
            status: "RECEIVED",
            filesCount: 1,
            expiry: "—",
            notes: `Bridge size: ${(bridgeDoc.size / (1024 * 1024)).toFixed(2)} MB. Modified: ${new Date(bridgeDoc.modified).toLocaleDateString("en-CA")}`
          });
        }
      });

      const docTableBody = docRows.map(row => [
        row.label,
        row.category,
        row.status,
        row.filesCount > 0 ? `${row.filesCount} files` : "0 files",
        row.notes
      ]);

      autoTable(doc, {
        startY: posY,
        head: [["Document Name", "Category", "Status", "Files", "Notes / Remarks"]],
        body: docTableBody,
        theme: "striped",
        headStyles: {
          fillColor: [30, 41, 59], // Slate 800
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold"
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          font: "helvetica"
        },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { fontStyle: "bold", cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 70 }
        },
        didParseCell: (data) => {
          if (data.column.index === 2 && data.row.index >= 0) {
            const txt = String(data.cell.text[0]);
            if (txt === "APPROVED" || txt === "RECEIVED") {
              data.cell.styles.textColor = [22, 163, 74] as any; // Green
            } else if (txt === "REQUIRED") {
              data.cell.styles.textColor = [100, 116, 139] as any; // Gray
            } else if (txt === "REJECTED" || txt === "EXPIRED") {
              data.cell.styles.textColor = [220, 38, 38] as any; // Red
            } else {
              data.cell.styles.textColor = [217, 119, 6] as any; // Orange
            }
          }
        },
        margin: { left: marginX, right: marginX }
      });

      posY = (doc as any).lastAutoTable.finalY + 10;

      // Section 6: Compliance / Audit Footer
      if (posY > 255) {
        doc.addPage();
        posY = 15;
      }

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(marginX, posY, 210 - marginX, posY);

      posY += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("COMPLIANCE & AUDIT TRAIL FOOTER", marginX, posY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      posY += 4;
      doc.text(`This document serves as an official single-client dossier snapshot for file #${currentClient.id}.`, marginX, posY);
      posY += 4;
      doc.text(`Generated under strict regulatory compliance parameters. Export authorized and executed by broker ${currentUser.first} ${currentUser.last} (${currentUser.role}).`, marginX, posY);
      posY += 4;
      doc.text("CONFIDENTIALITY NOTICE: The information contained in this dossier is private, legally privileged, and protected under the Personal Information Protection and Electronic Documents Act (PIPEDA).", marginX, posY);

      doc.save(`gbkcrm_file_${currentClient.last}_${currentClient.first}.pdf`);
      showToast("Client PDF exported successfully!", "success", "✓");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to export client PDF", "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/30 dark:bg-slate-950/50 z-50 backdrop-blur-[4px]"
        onClick={closeDetail}
      >
        <motion.div 
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-full max-w-[1050px] border-l flex flex-col shadow-2xl h-full select-none"
          style={{
            background: "var(--color-surface)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "var(--color-divider)"
          }}
        >
          {/* Header */}
          <div className="p-5 border-b flex justify-between items-center shrink-0" style={{ borderColor: "var(--color-divider)" }}>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg font-black text-sm text-[var(--color-text-inverse)] flex items-center justify-center shadow-inner"
                style={{ background: "var(--grad-warm-highlight)" }}
              >
                {currentClient.first[0]}{currentClient.last[0]}
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--color-text)]">{currentClient.first} {currentClient.last}</h3>
                <p className="text-[10px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">{currentClient.type || "Purchase File"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Assigned Broker / Lead Advisor Field */}
              <div 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm ${
                  resolvedAssignment.isInactive || resolvedAssignment.isMissing
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    : ""
                }`}
                style={{
                  background: resolvedAssignment.isInactive || resolvedAssignment.isMissing ? undefined : "var(--glass-bg)",
                  borderColor: resolvedAssignment.isInactive || resolvedAssignment.isMissing ? undefined : "var(--glass-border)"
                }}
              >
                <span className="text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-widest leading-none">Broker:</span>
                {canAssign ? (
                  <select
                    value={resolvedAssignment.assignedBrokerId || ""}
                    onChange={(e) => handleAssignmentChange(e.target.value)}
                    className="bg-transparent border-none text-[10px] font-black uppercase text-[var(--color-accent)] focus:outline-none cursor-pointer pr-1 max-w-[170px] truncate"
                  >
                    <option value="" className="bg-[var(--color-surface)] text-[var(--color-text)] font-bold">Unassigned</option>
                    {assignableStaff.map(s => {
                      const sName = getUserFullName(s);
                      const isInactive = (s.status || "active").toLowerCase() === "inactive" || (s.status || "active").toLowerCase() === "suspended";
                      return (
                        <option key={s.id} value={s.id} className="bg-[var(--color-surface)] text-[var(--color-text)] font-bold uppercase">
                          {sName} ({s.role || "Broker"}){isInactive ? " [INACTIVE]" : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <span className="text-[10px] font-black uppercase text-[var(--color-text)] px-1">
                    {resolvedAssignment.assignedBrokerName || "Unassigned"}
                  </span>
                )}
                {(resolvedAssignment.isInactive || resolvedAssignment.isMissing) && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-600/40 shrink-0" title="Assigned broker is inactive or missing. Reassignment recommended.">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {resolvedAssignment.isMissing ? "Missing" : "Inactive"}
                  </span>
                )}
              </div>

              {/* Stage Select Field */}
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm"
                style={{
                  background: "var(--glass-bg)",
                  borderColor: "var(--glass-border)"
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse shadow-[0_0_8px_var(--color-accent)]" />
                <span className="text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-widest leading-none">Stage:</span>
                {isAdmin ? (
                  <select
                    value={currentClient.status}
                    onChange={(e) => handleUpdateClientStatus(currentClient.id, e.target.value)}
                    className="bg-transparent border-none text-[10px] font-black uppercase text-[var(--color-accent)] focus:outline-none cursor-pointer pr-1"
                  >
                    {["lead", "open", "working", "lender", "conditional", "approved", "funded", "closed"].map(st => (
                      <option key={st} value={st} className="bg-[var(--color-surface)] text-[var(--color-text)] font-bold uppercase">{st}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] font-black uppercase text-[var(--color-accent)] px-1">
                    {currentClient.status}
                  </span>
                )}
              </div>

              {onScheduleClientActivity && (
                <button
                  onClick={() => onScheduleClientActivity(currentClient.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Schedule Activity
                </button>
              )}

              <button
                onClick={handleExportData}
                disabled={isExportingPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-black uppercase tracking-wider text-[var(--color-text)] bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--color-surface-2)]/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                {isExportingPDF ? "Generating PDF..." : "Export PDF"}
              </button>
              
              <button 
                onClick={closeDetail} 
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-2 rounded-full hover:bg-[var(--color-surface-2)]/80 transition-all cursor-pointer border border-transparent hover:border-[var(--color-border)]"
              >
                ✕
              </button>
            </div>
          </div>

          {/* TABS SELECT */}
          <div 
            className="flex border-b text-xs py-1.5 select-none overflow-x-auto shrink-0 px-3.5 gap-1.5 scrollbar-thin"
            style={{ 
              borderColor: "var(--color-divider)",
              background: "rgba(255, 255, 255, 0.01)"
            }}
          >
            {["Overview", "Application Details", "Documents", "Checklist", "Notes", "Activity", "AI Analysis", "Compliance"].map(tab => {
              const isSelected = detailTab === tab.toLowerCase();
              return (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab.toLowerCase())}
                  className={`px-3.5 py-1.5 font-bold tracking-tight text-[11px] rounded-full transition-all duration-200 shrink-0 cursor-pointer ${
                    isSelected 
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-md font-black" 
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/80"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT PANEL */}
          <div className="flex-grow overflow-y-auto p-6 scrollbar-thin">
            
            {/* 1. OVERVIEW TAB */}
            {detailTab === "overview" && (
              (() => {
                const inc = pn(currentClient.income) + pn(currentClient.coIncome);
                const mtg = pn(currentClient.mtgamt);
                const prop = pn(currentClient.propval);
                const monthlyMtg = cPmt(mtg, 5.25, 25);
                const tax = pn(currentClient.tax) / 12;
                const condo = pn(currentClient.condo);
                const heat = pn(currentClient.heat) || 150;
                const gds = inc > 0 ? ((monthlyMtg + tax + condo + heat) / (inc / 12) * 100) : 0;
                const debts = pn(currentClient.debts);
                const tds = inc > 0 ? ((monthlyMtg + tax + condo + heat + debts) / (inc / 12) * 100) : 0;

                const clientVault = (docVault && docVault[currentClient.id]) || {};
                const activeRules = CHECKLIST_RULES.filter(rule => rule.evaluate(currentClient));
                const totalRequired = activeRules.length;
                const approvedCount = activeRules.filter(rule => {
                  const saved = clientVault[rule.id] || {};
                  return saved.status === "approved" || saved.status === "verified";
                }).length;
                const completenessPercent = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 100;
                const missingCount = activeRules.filter(rule => {
                  const saved = clientVault[rule.id] || {};
                  return !saved.status || saved.status === "required";
                }).length;

                return (
                  <div className="flex flex-col gap-5">
                    {/* Rich Client Summary Header Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="glass-card p-4 flex flex-col justify-between">
                        <div>
                          <div className="text-[9px] text-[var(--color-text-muted)] uppercase font-extrabold tracking-wider">Mortgage Requested</div>
                          <div className="text-xl font-black text-[var(--color-text)] mt-1">{fd(mtg)}</div>
                        </div>
                        <div className="text-[9px] text-[var(--color-text-faint)] font-bold mt-2.5 border-t border-[var(--color-border)] pt-2">
                          Amortization: 25 Years @ 5.25% (Qualifying)
                        </div>
                      </div>
                      
                      <div className="glass-card p-4 flex flex-col justify-between">
                        <div>
                          <div className="text-[9px] text-[var(--color-text-muted)] uppercase font-extrabold tracking-wider">Property Value</div>
                          <div className="text-xl font-black text-[var(--color-text)] mt-1">{fd(prop)}</div>
                        </div>
                        <div className="text-[9px] text-[var(--color-text-faint)] font-bold mt-2.5 border-t border-[var(--color-border)] pt-2">
                          LTV Ratio: <span className="font-extrabold text-[var(--color-accent)]">{prop > 0 ? ((mtg / prop) * 100).toFixed(1) : "0.0"}%</span>
                        </div>
                      </div>

                      <div className="glass-card p-4 flex flex-col justify-between">
                        <div>
                          <div className="text-[9px] text-[var(--color-text-muted)] uppercase font-extrabold tracking-wider">File Completeness</div>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-xl font-black text-[var(--color-text)]">{completenessPercent}%</span>
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)]">({approvedCount}/{totalRequired} docs)</span>
                          </div>
                        </div>
                        <div className="mt-2.5 border-t border-[var(--color-border)] pt-2 flex flex-col gap-1">
                          <div className="w-full bg-[var(--color-surface-2)] h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${completenessPercent}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
                            {missingCount > 0 ? `${missingCount} required files missing` : "All compliance files submitted"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* GDS / TDS Debt Ratios */}
                    <div className="glass-card p-4.5">
                      <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2">
                        <h4 className="text-[9px] uppercase font-black tracking-widest text-[var(--color-accent)]">Debt Service Ratios</h4>
                        <span className="text-[8px] text-[var(--color-text-faint)] uppercase font-black tracking-wide">Qualifying benchmarks: GDS &lt; 39% | TDS &lt; 44%</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-[var(--color-text-muted)] font-bold">Gross Debt Service (GDS)</span>
                            <span className={`font-mono font-black ${gds > 39 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}>{gds > 0 ? `${gds.toFixed(1)}%` : "0.0%"}</span>
                          </div>
                          <div className="h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${gds > 39 ? "bg-[var(--color-error)]" : "bg-[var(--color-success)]"}`} 
                              style={{ width: `${Math.min(gds, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-[var(--color-text-muted)] font-bold">Total Debt Service (TDS)</span>
                            <span className={`font-mono font-black ${tds > 44 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}>{tds > 0 ? `${tds.toFixed(1)}%` : "0.0%"}</span>
                          </div>
                          <div className="h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${tds > 44 ? "bg-[var(--color-error)]" : "bg-[var(--color-success)]"}`} 
                              style={{ width: `${Math.min(tds, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculator Snapshot Section */}
                    {currentClient.calcSnapshot && (
                      <div className="glass-card p-4.5 border border-amber-500/10 bg-amber-500/[0.01]">
                        <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2">
                          <h4 className="text-[9px] uppercase font-black tracking-widest text-amber-400 flex items-center gap-1.5">
                            <span>📊</span> Calculator Snapshot
                          </h4>
                          <span className="text-[8px] text-[var(--color-text-muted)] font-bold italic">
                            Saved on {new Date(currentClient.calcSnapshot.savedAt).toLocaleDateString()} {new Date(currentClient.calcSnapshot.savedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <div className="bg-[var(--color-surface-2)]/40 p-3 rounded-lg border border-[var(--color-border)]">
                            <span className="text-[8px] uppercase font-bold text-[var(--color-text-muted)]">Max Qualified Mortgage</span>
                            <div className="text-sm font-black text-[var(--color-text)] mt-1">
                              {currentClient.calcSnapshot.stressTest ? fd(currentClient.calcSnapshot.stressTest.maxQualifiedMortgage) : "—"}
                            </div>
                            {currentClient.calcSnapshot.stressTest?.maxPurchasePrice ? (
                              <span className="text-[8px] text-[var(--color-text-faint)] mt-1 block">
                                Est. Max Purchase: {fd(currentClient.calcSnapshot.stressTest.maxPurchasePrice)}
                              </span>
                            ) : null}
                          </div>

                          <div className="bg-[var(--color-surface-2)]/40 p-3 rounded-lg border border-[var(--color-border)]">
                            <span className="text-[8px] uppercase font-bold text-[var(--color-text-muted)]">Debt Service (GDS / TDS)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              {currentClient.calcSnapshot.gdsTds ? (
                                <>
                                  <span className={`text-xs font-mono font-bold ${currentClient.calcSnapshot.gdsTds.passed ? "text-emerald-400" : "text-rose-400"}`}>
                                    {currentClient.calcSnapshot.gdsTds.gds.toFixed(1)}% / {currentClient.calcSnapshot.gdsTds.tds.toFixed(1)}%
                                  </span>
                                  <span className={`text-[8px] px-1.5 py-0.5 font-bold uppercase rounded ${
                                    currentClient.calcSnapshot.gdsTds.passed 
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  }`}>
                                    {currentClient.calcSnapshot.gdsTds.passed ? "Pass" : "Fail"}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-[var(--color-text-muted)]">—</span>
                              )}
                            </div>
                          </div>

                          <div className="bg-[var(--color-surface-2)]/40 p-3 rounded-lg border border-[var(--color-border)]">
                            <span className="text-[8px] uppercase font-bold text-[var(--color-text-muted)]">Monthly Payment</span>
                            <div className="text-sm font-black text-[var(--color-text)] mt-1">
                              {currentClient.calcSnapshot.paymentCalc 
                                ? fd(currentClient.calcSnapshot.paymentCalc.monthly) 
                                : currentClient.calcSnapshot.stressTest?.estPaymentAtContract
                                  ? fd(currentClient.calcSnapshot.stressTest.estPaymentAtContract)
                                  : "—"
                              }
                            </div>
                            {currentClient.calcSnapshot.paymentCalc?.frequency && (
                              <span className="text-[8px] text-[var(--color-text-faint)] mt-1 block uppercase font-bold">
                                Freq: {currentClient.calcSnapshot.paymentCalc.frequency} @ {currentClient.calcSnapshot.paymentCalc.rate}%
                              </span>
                            )}
                          </div>
                        </div>

                        {currentClient.calcSnapshot.cmhc && (
                          <div className="mb-4 p-2.5 bg-amber-500/[0.02] border border-amber-500/10 rounded-lg text-[9px] text-[var(--color-text-muted)] flex flex-wrap gap-x-4 gap-y-1">
                            <div>
                              <span className="font-bold">Purchase:</span> {fd(currentClient.calcSnapshot.cmhc.purchasePrice)}
                            </div>
                            <div>
                              <span className="font-bold">Down Payment:</span> {fd(currentClient.calcSnapshot.cmhc.downPayment)} ({currentClient.calcSnapshot.cmhc.downPct?.toFixed(1) || "0.0"}%)
                            </div>
                            <div>
                              <span className="font-bold">CMHC Premium:</span> {fd(currentClient.calcSnapshot.cmhc.premiumAmount)} ({currentClient.calcSnapshot.cmhc.premiumPct?.toFixed(2) || "0.00"}%)
                            </div>
                            <div>
                              <span className="font-bold">Total Mortgage:</span> {fd(currentClient.calcSnapshot.cmhc.totalMortgage)}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--color-border)]">
                          <span className="text-[8px] text-[var(--color-text-faint)] font-bold uppercase tracking-wider">
                            Snapshot contains stress, payments, GDS/TDS, and CMHC values
                          </span>
                          {onNavigateToCalculators && (
                            <button
                              onClick={() => onNavigateToCalculators(currentClient.id)}
                              className="text-[9px] uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 font-black px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              Recalculate in Calculators ➔
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quick Link Button to Application Details */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDetailTab("application details")}
                        className="text-[10px] uppercase tracking-wider bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 font-black px-4 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        📝 Go to Application Details
                      </button>
                    </div>

                    {/* Action & Timeline panel */}
                    <div className="glass-card p-4.5 bg-gradient-to-r from-[var(--color-surface-2)]/20 to-[var(--color-surface-2)]/40 rounded-xl border border-[var(--color-border)]">
                      <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)] pb-2 flex-wrap gap-2">
                        <h4 className="text-[9px] uppercase font-black tracking-widest text-[var(--color-accent)]">File Action Plan & Stamp</h4>
                        {currentClient.updatedAt && (
                          <span className="text-[8px] text-[var(--color-text-faint)] font-mono font-black uppercase">
                            LAST UPDATED: {new Date(currentClient.updatedAt).toLocaleString("en-CA")}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col justify-between">
                          <div className="text-[9px] text-[var(--color-text-muted)] uppercase font-extrabold tracking-wider">Next Follow-Up Action</div>
                          {currentClient.nextFollowUpDate ? (() => {
                            const isOverdue = new Date(currentClient.nextFollowUpDate) < new Date();
                            return (
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${isOverdue ? "bg-red-500 text-white animate-pulse" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"}`}>
                                  {isOverdue ? "⚠️ Overdue" : "📅 Scheduled"}
                                </span>
                                <span className="text-xs font-bold text-[var(--color-text)]">
                                  {currentClient.nextFollowUpDate}
                                </span>
                              </div>
                            );
                          })() : (
                            <span className="text-xs font-bold text-[var(--color-text-faint)] italic mt-2 block">No follow-up date scheduled</span>
                          )}
                        </div>

                        <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--color-border)] pt-3 md:pt-0 md:pl-4">
                          <div className="text-[9px] text-[var(--color-text-muted)] uppercase font-extrabold tracking-wider">File Health Check</div>
                          <div className="mt-2 flex items-center gap-2">
                            {missingCount > 0 ? (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                <span className="text-xs font-bold text-[var(--color-text)]">Attention Required ({missingCount} Missing Files)</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-xs font-bold text-[var(--color-text)]">Fully Compliant & Complete</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* General Borrower Details Grid */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="p-3.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl">
                        <div className="text-[9px] text-[var(--color-text-faint)] uppercase font-extrabold tracking-wider">Borrower Name</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-1">{currentClient.first} {currentClient.last}</div>
                      </div>
                      <div className="p-3.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl">
                        <div className="text-[9px] text-[var(--color-text-faint)] uppercase font-extrabold tracking-wider">Email Address</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-1 truncate">{currentClient.email || "—"}</div>
                      </div>
                      <div className="p-3.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl">
                        <div className="text-[9px] text-[var(--color-text-faint)] uppercase font-extrabold tracking-wider">Cell Phone</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-1">{currentClient.cell || "—"}</div>
                      </div>
                      <div className="p-3.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl">
                        <div className="text-[9px] text-[var(--color-text-faint)] uppercase font-extrabold tracking-wider">Employment Type</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-1 uppercase tracking-wide">{currentClient.emptype || "Salaried"}</div>
                      </div>
                      <div className="p-3.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl">
                        <div className="text-[9px] text-[var(--color-text-faint)] uppercase font-extrabold tracking-wider">Assigned Broker</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-1">{currentClient.assignedBroker || currentClient.agent || currentClient.assignedTo || currentClient.retentionOwner || "Unassigned"}</div>
                      </div>
                      <div className="p-3.5 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl">
                        <div className="text-[9px] text-[var(--color-text-faint)] uppercase font-extrabold tracking-wider">Lender Partner</div>
                        <div className="text-xs font-bold text-[var(--color-text)] mt-1">{currentClient.lender || "Not submitted"}</div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* 2. APPLICATION DETAILS TAB (INTERACTIVE SAVING FORM) */}
            {detailTab === "application details" && (
              <ApplicationDetailsForm 
                key={currentClient.id}
                client={currentClient}
                currentUser={currentUser}
                onUpdateClient={handleUpdateClient}
                agentNames={getAgentNames()}
                lenders={lenders}
                showToast={showToast}
              />
            )}

            {/* 4. DOCUMENTS VAULT TAB */}
            {detailTab === "documents" && (
              <div className="flex flex-col gap-4">
                <DocumentManager 
                  key={currentClient.id}
                  clients={clients}
                  currentUser={currentUser}
                  docVault={docVault}
                  setDocVault={setDocVault}
                  onOpenClient={openClient}
                  showToast={showToast}
                  agentNames={getAgentNames()}
                  isOwnerOrManager={currentUser.role === 'Developer/Admin' || currentUser.role === 'Admin'}
                  embeddedClientId={currentClient.id}
                  bridgeOnline={bridgeOnline}
                />
              </div>
            )}

            {/* 5. CHECKLIST STATUS MANAGER TAB */}
            {detailTab === "checklist" && (
              <MortgageChecklist
                key={currentClient.id}
                client={currentClient}
                currentUser={currentUser}
                docVault={docVault}
                setDocVault={setDocVault}
                agentNames={getAgentNames()}
                showToast={showToast}
              />
            )}

            {/* 6. INTERNAL NOTES TAB */}
            {detailTab === "notes" && (
              <MortgageActivityTracker
                key={currentClient.id}
                client={currentClient}
                currentUser={currentUser}
                onUpdateClient={handleUpdateClient}
                agentNames={getAgentNames()}
                activeSubTab="notes"
                showToast={showToast}
                tasks={tasks}
                setTasks={setTasks}
                events={events}
                setEvents={setEvents}
              />
            )}

            {/* 7. ACTIVITY AUDIT TIMELINE TAB */}
            {detailTab === "activity" && (
              <MortgageActivityTracker
                key={currentClient.id}
                client={currentClient}
                currentUser={currentUser}
                onUpdateClient={handleUpdateClient}
                agentNames={getAgentNames()}
                activeSubTab="activity"
                showToast={showToast}
                tasks={tasks}
                setTasks={setTasks}
                events={events}
                setEvents={setEvents}
              />
            )}

            {/* 8. AI ANALYSIS / DEEP UNDERWRITE TAB */}
            {detailTab === "ai analysis" && (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => triggerUnderwritingAnalysis(currentClient)}
                  disabled={underwritingLoading}
                  className="w-full text-[var(--color-text-inverse)] disabled:opacity-50 font-black uppercase text-[10px] tracking-wider py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(200, 146, 42, 0.2)]"
                  style={{ background: "var(--grad-warm-highlight)" }}
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" /> {underwritingLoading ? "Analyzing File..." : "Run Deep Underwrite Analysis (Gemini)"}
                </button>

                {underwritingLoading ? (
                  <div className="glass-card p-4 flex flex-col gap-3.5 animate-pulse">
                    <div className="text-[10px] font-black text-[var(--color-accent)] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Formulating Automated Underwriter Report...
                    </div>
                    <div className="h-4 bg-[var(--color-surface-2)] rounded w-3/4"></div>
                    <div className="h-4 bg-[var(--color-surface-2)] rounded w-5/6"></div>
                    <div className="h-4 bg-[var(--color-surface-2)] rounded w-2/3"></div>
                    <div className="h-4 bg-[var(--color-surface-2)] rounded w-1/2"></div>
                  </div>
                ) : underwritingError ? (
                  <div className="p-4 bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20 rounded-xl flex flex-col gap-2">
                    <div className="text-[9px] font-black text-[var(--color-error)] uppercase tracking-widest flex items-center gap-1.5">
                      ⚠️ Diagnostics Error
                    </div>
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-sans bg-[var(--color-surface-2)] p-2.5 rounded border border-[var(--color-error)]/15 font-mono">
                      {underwritingError}
                    </p>
                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold">
                      Please check bridge server console logs, verify network Z drive connectivity, or configure VITE_GEMINI_API_KEY.
                    </p>
                  </div>
                ) : (
                  <div className="glass-card p-4">
                    <div className="text-[9px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-3 pb-2 border-b border-[var(--color-border)]">Automated AI Underwriter Dossier</div>
                    <div className="text-xs leading-relaxed text-[var(--color-text)] whitespace-pre-wrap font-medium">
                      {currentClient.aiSummary || "No dossier report has been compiled yet. Click the button above to initiate deep Gemini engine analysis."}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 9. COMPLIANCE & PIPEDA TAB */}
            {detailTab === "compliance" && (
              <div className="flex flex-col gap-6">
                <div className="glass-card p-5 flex flex-col gap-3.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[var(--color-success-subtle)] rounded-xl text-[var(--color-success)] mt-0.5 animate-pulse">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">PIPEDA Portability & Archive Right</h4>
                      <p className="text-[10px] text-[var(--color-text-muted)] font-semibold leading-relaxed mt-1">
                        Under personal electronic portability standards (PIPEDA), clients have a legal "Right to Portability". You can export a comprehensive single-client backup archive containing all personal assets, checklists, and metadata.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[var(--color-border)] pt-3.5 mt-1 flex justify-end">
                    <button
                      onClick={handleExportData}
                      disabled={isExportingPDF}
                      className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] font-black uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5" /> {isExportingPDF ? "Generating PDF..." : "Export Client Dossier"}
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--color-error-subtle)]/30 border border-[var(--color-error)]/20 rounded-xl p-5 flex flex-col gap-3.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[var(--color-error-subtle)] rounded-xl text-[var(--color-error)] mt-0.5">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[var(--color-error)] uppercase tracking-wider">Absolute Erasure under PIPEDA</h4>
                      <p className="text-[10px] text-[var(--color-text-muted)] font-semibold leading-relaxed mt-1">
                        Permanently destroy this client folder, including all uploaded electronic assets, checklist states, and logs from local storage. This erasure is binding, permanent, and completely irreversible.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[var(--color-error)]/15 pt-3.5 mt-1 flex justify-end">
                    <button
                      onClick={() => setShowDeleteConfirmModal(true)}
                      className="bg-[var(--color-error-subtle)] hover:bg-[var(--color-error-subtle)]/80 text-[var(--color-error)] border border-[var(--color-error)]/25 font-black uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Request Absolute erasure
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Absolute PIPEDA Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/30 dark:bg-slate-950/50 z-[60] flex items-center justify-center p-4 backdrop-blur-[4px]">
          <div className="panel-card border border-[var(--color-error)]/20 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setDeleteConfirmInput("");
              }} 
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-full hover:bg-[var(--color-surface-2)] transition-all cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 text-[var(--color-error)] font-black text-xs uppercase tracking-wider mb-2">
              <ShieldAlert className="w-4 h-4" /> Absolute Deletion Request
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] font-semibold leading-relaxed mb-4">
              This erasure operation is <span className="text-[var(--color-error)] font-bold">PERMANENT and IRREVERSIBLE</span>. All personal records, uploaded mortgage documents, checklist states, and notes associated with <strong>{currentClient.first} {currentClient.last}</strong> will be wiped forever.
            </p>
            
            <div className="bg-[var(--color-error-subtle)] border border-[var(--color-error)]/15 rounded-xl p-3.5 mb-4 text-[11px] text-[var(--color-error)] font-bold">
              To authorize this request, please type the client's full name exactly: <strong className="text-[var(--color-text)] select-all">{currentClient.first} {currentClient.last}</strong>
            </div>

            <input 
              type="text" 
              placeholder="Type client's full name to authorize"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-error)]/25 rounded-xl px-4 py-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-error)]/50 mb-4 text-center font-bold tracking-wide"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmInput("");
                }}
                className="flex-1 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput !== `${currentClient.first} ${currentClient.last}` || isDeleting}
                onClick={async () => {
                  if (deleteConfirmInput !== `${currentClient.first} ${currentClient.last}`) return;
                  setIsDeleting(true);
                  try {
                    await handleDeleteClient(currentClient.id);
                    showToast(`Client dossier for ${currentClient.first} ${currentClient.last} deleted under PIPEDA.`, "success", "🗑️");
                    closeDetail();
                  } catch (err) {
                    showToast("Failed to delete client dossier.", "error");
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirmModal(false);
                    setDeleteConfirmInput("");
                  }
                }}
                className="flex-1 bg-[var(--color-error)] hover:opacity-90 disabled:opacity-30 text-white font-black uppercase text-[10px] tracking-wider py-3 rounded-xl transition-all cursor-pointer"
              >
                {isDeleting ? "Processing Erasure..." : "Absolute Erasure"}
              </button>
            </div>
          </div>
        </div>
      )}

    </AnimatePresence>
  );
}
