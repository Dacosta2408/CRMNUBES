import React, { useState, useMemo } from "react";
import { 
  FileSpreadsheet, Download, FileUp, CheckCircle2, AlertCircle, 
  X, Check, AlertTriangle, RefreshCw, Layers
} from "lucide-react";
import { User as UserType } from "../../types";

interface UserBulkImportModalProps {
  existingUsers: UserType[];
  onClose: () => void;
  onImportUsers: (newUsers: UserType[]) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

interface ParsedRecord {
  id: string;
  first: string;
  last: string;
  email: string;
  phone?: string;
  role: string;
  licenseNumber?: string;
  brokerage?: string;
  clearanceLevel: number;
  tags?: string[];
  status: "valid" | "duplicate_email" | "invalid_data";
  errorMessage?: string;
}

export const UserBulkImportModal: React.FC<UserBulkImportModalProps> = ({
  existingUsers,
  onClose,
  onImportUsers,
  showToast
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Input/Upload, 2: Field Mapping & Validation, 3: Success
  const [csvText, setCsvText] = useState<string>(`first,last,email,phone,role,licenseNumber,brokerage,clearanceLevel,tags
Michael,Scott,m.scott@gbkfinancial.ca,(416) 555-0182,Broker,M22004812,GBK Financial,3,Senior Broker;GTA East
Pam,Beesly,p.beesly@gbkfinancial.ca,(416) 555-0183,Agent,M22004813,GBK Financial,2,Commercial;VIP
Dwight,Schrute,d.schrute@gbkfinancial.ca,(416) 555-0184,Agent,M22004814,GBK Financial,2,High Performer`);

  const [fieldMap, setFieldMap] = useState<Record<string, string>>({
    first: "first",
    last: "last",
    email: "email",
    phone: "phone",
    role: "role",
    licenseNumber: "licenseNumber",
    brokerage: "brokerage",
    clearanceLevel: "clearanceLevel",
    tags: "tags"
  });

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const headers = "first,last,email,phone,role,licenseNumber,brokerage,clearanceLevel,tags\n";
    const sampleRows = "Sarah,Connor,s.connor@gbkfinancial.ca,(416) 555-0921,Agent,M22009876,GBK Financial,2,Senior Broker;GTA\nJohn,Doe,j.doe@gbkfinancial.ca,(416) 555-0922,Broker,M22009877,GBK Financial,3,Commercial\n";
    
    const blob = new Blob([headers + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gbk_user_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Downloaded sample CSV import template!", "success");
  };

  // Parse CSV text into validated records
  const parsedRecords = useMemo<ParsedRecord[]>(() => {
    if (!csvText.trim()) return [];

    const lines = csvText.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

    const records: ParsedRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map(cell => cell.trim().replace(/^["']|["']$/g, ''));
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const getVal = (colKey: string) => {
        const headerIdx = headers.indexOf(colKey.toLowerCase());
        return headerIdx !== -1 && row[headerIdx] ? row[headerIdx] : "";
      };

      const first = getVal(fieldMap.first) || row[0] || "";
      const last = getVal(fieldMap.last) || row[1] || "";
      const email = getVal(fieldMap.email) || row[2] || "";
      const phone = getVal(fieldMap.phone) || row[3] || "(416) 555-0199";
      const role = getVal(fieldMap.role) || row[4] || "Agent";
      const licenseNumber = getVal(fieldMap.licenseNumber) || row[5] || "";
      const brokerage = getVal(fieldMap.brokerage) || row[6] || "GBK Financial";
      const clearanceStr = getVal(fieldMap.clearanceLevel) || row[7] || "2";
      const tagsStr = getVal(fieldMap.tags) || row[8] || "";

      const clearanceLevel = parseInt(clearanceStr, 10) || 2;
      const tags = tagsStr ? tagsStr.split(";").map(t => t.trim()).filter(Boolean) : [];

      let status: ParsedRecord["status"] = "valid";
      let errorMessage = "";

      if (!first || !last || !email) {
        status = "invalid_data";
        errorMessage = "Missing required fields (First name, Last name, or Email)";
      } else if (existingEmails.has(email.toLowerCase())) {
        status = "duplicate_email";
        errorMessage = "Email already exists in staff roster";
      }

      records.push({
        id: `imp_usr_${Date.now()}_${i}`,
        first,
        last,
        email,
        phone,
        role,
        licenseNumber,
        brokerage,
        clearanceLevel,
        tags,
        status,
        errorMessage
      });
    }

    return records;
  }, [csvText, fieldMap, existingUsers]);

  const validCount = parsedRecords.filter(r => r.status === "valid").length;
  const duplicateCount = parsedRecords.filter(r => r.status === "duplicate_email").length;
  const errorCount = parsedRecords.filter(r => r.status === "invalid_data").length;

  // Execute Import
  const handleExecuteImport = () => {
    const validRecords = parsedRecords.filter(r => r.status === "valid");

    if (validRecords.length === 0) {
      showToast("No valid records to import. Please fix duplicate or invalid rows.", "error");
      return;
    }

    const newUsers: UserType[] = validRecords.map(r => ({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      first: r.first,
      last: r.last,
      email: r.email,
      phone: r.phone || "(416) 555-0199",
      role: r.role,
      brokerage: r.brokerage || "GBK Financial",
      licenseNumber: r.licenseNumber,
      status: "active",
      clearanceLevel: r.clearanceLevel,
      created: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      lastLogin: "Never",
      lastActive: "Imported via CSV",
      jobTitle: r.role,
      displayName: `${r.first} ${r.last}`,
      tags: r.tags || [],
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      specialPermissions: {
        canExport: true,
        canManageUsers: false,
        canAccessAdmin: false,
        canViewReports: true
      }
    }));

    onImportUsers(newUsers);
    showToast(`Successfully imported ${newUsers.length} staff accounts!`, "success");
    setStep(3);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                Bulk CSV Staff Import Engine
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Parse, validate, and import multiple team members into the central roster.
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

        {/* STEP 1: CSV INPUT & TEMPLATE */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider">
                1. Paste Raw CSV Content or Upload File
              </label>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Sample Template (.csv)
              </button>
            </div>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="first,last,email,phone,role,licenseNumber,brokerage,clearanceLevel,tags..."
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] leading-relaxed"
            />

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  if (!csvText.trim()) {
                    showToast("Please enter or paste CSV text.", "error");
                    return;
                  }
                  setStep(2);
                }}
                className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
              >
                Validate &amp; Preview Import <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VALIDATION PREVIEW & FIELD MAPPING */}
        {step === 2 && (
          <div className="space-y-4">
            
            {/* Validation Breakdown Pills */}
            <div className="grid grid-cols-3 gap-3 text-xs font-bold font-mono">
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center justify-between">
                <span>Valid Records:</span>
                <span className="text-base">{validCount}</span>
              </div>
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 flex items-center justify-between">
                <span>Duplicate Emails:</span>
                <span className="text-base">{duplicateCount}</span>
              </div>
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-between">
                <span>Invalid Format:</span>
                <span className="text-base">{errorCount}</span>
              </div>
            </div>

            {/* Validation Table */}
            <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-xl overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] font-bold text-[10px] uppercase text-[var(--color-text-faint)] sticky top-0">
                    <th className="p-2.5 pl-3">Status</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Clearance</th>
                    <th className="p-2.5">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {parsedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--color-surface-3)]/30">
                      <td className="p-2.5 pl-3">
                        {r.status === "valid" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        )}
                        {r.status === "duplicate_email" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max" title={r.errorMessage}>
                            <AlertTriangle className="w-3 h-3" /> Duplicate
                          </span>
                        )}
                        {r.status === "invalid_data" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-max" title={r.errorMessage}>
                            <AlertCircle className="w-3 h-3" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-[var(--color-text)]">{r.first} {r.last}</td>
                      <td className="p-2.5 font-mono text-[var(--color-text-muted)]">{r.email}</td>
                      <td className="p-2.5 font-mono">{r.role}</td>
                      <td className="p-2.5 font-mono text-center">Level {r.clearanceLevel}</td>
                      <td className="p-2.5 text-[10px]">
                        {(r.tags && r.tags.length > 0) ? r.tags.join(", ") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs rounded-xl cursor-pointer"
              >
                Back to CSV Input
              </button>

              <button
                onClick={handleExecuteImport}
                disabled={validCount === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Import {validCount} Valid Accounts
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 3 && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--color-text)]">Bulk Staff Accounts Successfully Imported!</h3>
            <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto">
              The new team members have been assigned security credentials and added to the central staff roster.
            </p>
            <div className="pt-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
