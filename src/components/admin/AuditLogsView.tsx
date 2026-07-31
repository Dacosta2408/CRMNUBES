import React, { useState, useMemo } from "react";
import { 
  Terminal, Search, Filter, Download, Trash2, Calendar, 
  RefreshCw, FileText, CheckCircle2, AlertTriangle, ShieldAlert,
  ChevronLeft, ChevronRight, Clock, UserCheck, AlertCircle, X, Check
} from "lucide-react";
import { User } from "../../types";

interface AuditLogsViewProps {
  auditLogs: any[];
  setAuditLogs: React.Dispatch<React.SetStateAction<any[]>>;
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  auditLogs,
  setAuditLogs,
  currentUser,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmPurge, setShowConfirmPurge] = useState(false);
  const logsPerPage = 15;

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const searchStr = `${log.action || ""} ${log.user || ""} ${log.details || ""} ${log.operator || ""}`.toLowerCase();
      const matchSearch = searchStr.includes(searchTerm.toLowerCase());

      const category = (log.category || log.type || "system").toLowerCase();
      const matchCategory = categoryFilter === "all" || category === categoryFilter.toLowerCase();

      const severity = (log.severity || "info").toLowerCase();
      const matchSeverity = severityFilter === "all" || severity === severityFilter.toLowerCase();

      return matchSearch && matchCategory && matchSeverity;
    });
  }, [auditLogs, searchTerm, categoryFilter, severityFilter]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * logsPerPage;
    return filteredLogs.slice(startIndex, startIndex + logsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;

  // Simulate CSV export download
  const handleExportCSV = () => {
    if (auditLogs.length === 0) {
      showToast("Compliance Alert: No audit logs present to export.", "error");
      return;
    }

    try {
      const headers = ["ID", "Timestamp", "Category", "Action", "Operator", "Details", "Severity"];
      const rows = auditLogs.map(log => [
        log.id || "N/A",
        log.timestamp || new Date().toISOString(),
        log.category || log.type || "System",
        log.action || log.event || "Audit Event",
        log.user || log.operator || "System Daemon",
        (log.details || log.summary || "").replace(/,/g, ";"),
        log.severity || "info"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `gbk_crm_immutable_audit_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Immutable compliance audit logs downloaded successfully.", "success");
    } catch (err) {
      showToast("Export failed: Storage disk inaccessible.", "error");
    }
  };

  const hasFilter = searchTerm.trim() !== "" || categoryFilter !== "all" || severityFilter !== "all";

  // Perform a real purge of audit trajectory records
  const handlePurgeTrajectory = () => {
    if (filteredLogs.length === 0) {
      showToast("No trajectory records available to purge.", "error");
      setShowConfirmPurge(false);
      return;
    }

    const operatorName = `${currentUser.first || ""} ${currentUser.last || ""}`.trim() || currentUser.name || "Administrative Operator";
    const purgedCount = filteredLogs.length;

    const signatureLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      category: "Security",
      action: "Purge Audit Trajectory",
      operator: operatorName,
      user: operatorName,
      details: hasFilter 
        ? `Administrative operator purged ${purgedCount} filtered trajectory records (Search: "${searchTerm || 'none'}", Category: "${categoryFilter}", Severity: "${severityFilter}"). Trailing signature generated.`
        : `Administrative operator purged all ${auditLogs.length} historical trajectory records. Trailing signature generated.`,
      severity: "high"
    };

    if (hasFilter) {
      const filteredIds = new Set(filteredLogs.map(l => l.id));
      const remainingLogs = auditLogs.filter(l => !filteredIds.has(l.id));
      setAuditLogs([signatureLog, ...remainingLogs]);
    } else {
      setAuditLogs([signatureLog]);
    }

    setCurrentPage(1);
    setShowConfirmPurge(false);
    showToast(`Successfully purged ${purgedCount} trajectory record${purgedCount === 1 ? '' : 's'}.`, "success");
  };

  return (
    <div className="space-y-6" id="audit-logs-view">
      
      {/* Filtering Header bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg px-2.5 py-1.5 flex items-center gap-2 w-full sm:w-64 focus-within:border-[var(--color-accent)]/30 transition-all">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
            <input 
              type="text" 
              placeholder="Search actions, operators, payloads..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)] outline-none w-full"
            />
          </div>

          {/* Category Filter */}
          <select 
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 text-xs text-[var(--color-text)] px-2.5 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-[var(--color-surface-3)] transition-all"
          >
            <option value="all">All Categories</option>
            <option value="security">Security Policy</option>
            <option value="user">User Management</option>
            <option value="system">System Integrations</option>
            <option value="clients">Client Dossier</option>
            <option value="compliance">Compliance</option>
          </select>

          {/* Severity Filter */}
          <select 
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 text-xs text-[var(--color-text)] px-2.5 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-[var(--color-surface-3)] transition-all"
          >
            <option value="all">All Severities</option>
            <option value="high">High Risk 🔴</option>
            <option value="medium">Medium Alert 🟡</option>
            <option value="info">Info / Normal 🟢</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          {!showConfirmPurge ? (
            <button
              onClick={() => {
                if (filteredLogs.length === 0) {
                  showToast("No trajectory records available to purge.", "error");
                  return;
                }
                setShowConfirmPurge(true);
              }}
              disabled={filteredLogs.length === 0}
              className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold uppercase px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Purge trajectory logs"
            >
              <Trash2 className="w-4 h-4" /> Purge Trajectory
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/25 p-2 rounded-lg flex flex-col sm:flex-row items-center gap-2">
              <span className="text-[11px] font-semibold text-red-700 dark:text-red-300 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                Purge {hasFilter ? `${filteredLogs.length} filtered` : `all ${auditLogs.length}`} log(s)?
              </span>
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <button
                  onClick={handlePurgeTrajectory}
                  className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <Check className="w-3 h-3" /> Confirm Purge
                </button>
                <button
                  onClick={() => setShowConfirmPurge(false)}
                  className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-bold uppercase px-2.5 py-1 rounded flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold uppercase px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV Logs
          </button>
        </div>

      </div>

      {/* Audit Logs Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl overflow-hidden shadow-md" id="audit-table-holder">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]/50 bg-[var(--color-surface-2)] text-[10px] text-[var(--color-text-faint)] uppercase font-black tracking-wider select-none">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Action Description</th>
                <th className="px-5 py-3">Operator</th>
                <th className="px-5 py-3">Details Summary</th>
                <th className="px-5 py-3 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/40 text-xs">
              {paginatedLogs.map((log, idx) => {
                const category = log.category || log.type || "System";
                const severity = log.severity || "info";
                const details = log.details || log.summary || "No secondary payload captured.";
                const timestampStr = log.timestamp 
                  ? new Date(log.timestamp).toLocaleString("en-US", { hour12: true }) 
                  : new Date().toLocaleString("en-US", { hour12: true });

                return (
                  <tr key={log.id || idx} className="hover:bg-[var(--color-surface-2)]/30 transition-all">
                    
                    {/* Timestamp */}
                    <td className="px-5 py-3.5 text-[var(--color-text-faint)] font-mono text-[10px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timestampStr}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]/50">
                        {category}
                      </span>
                    </td>

                    {/* Action Description */}
                    <td className="px-5 py-3.5 font-bold text-[var(--color-text)] whitespace-nowrap">
                      {log.action || log.event || "Audit Event"}
                    </td>

                    {/* Operator */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />
                        <span className="font-semibold text-[var(--color-text-muted)]">{log.user || log.operator || "System Daemon"}</span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)]/80 max-w-sm truncate" title={details}>
                      {details}
                    </td>

                    {/* Severity */}
                    <td className="px-5 py-3.5 text-right">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                        severity.toLowerCase() === "high"
                          ? "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error)]/20"
                          : severity.toLowerCase() === "medium"
                          ? "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {severity}
                      </span>
                    </td>

                  </tr>
                );
              })}

              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[var(--color-text-faint)]">
                    <Terminal className="w-10 h-10 mx-auto mb-2 stroke-1" />
                    <p className="italic">No operational audit logs met the active filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-[var(--color-surface-2)] px-5 py-3 border-t border-[var(--color-border)]/50 flex items-center justify-between select-none">
            <span className="text-[10px] text-[var(--color-text-faint)] font-semibold">
              Showing logs {(currentPage - 1) * logsPerPage + 1}-{Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length}
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 hover:bg-[var(--color-surface-3)] rounded border border-[var(--color-border)]/50 text-[var(--color-text-muted)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs text-[var(--color-text)] font-mono font-bold px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 hover:bg-[var(--color-surface-3)] rounded border border-[var(--color-border)]/50 text-[var(--color-text-muted)] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
