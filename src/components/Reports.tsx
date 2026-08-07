import React, { useState, useMemo } from "react";
import { 
  BarChart3, Calendar, Users, Globe, TrendingUp, DollarSign, 
  Percent, FileText, Clock, ShieldAlert, Award, FileSpreadsheet, 
  Filter, RefreshCw, AlertTriangle, CheckCircle, PieChart, Info
} from "lucide-react";
import { Client, Lender, User, Task, Partner } from "../types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportsProps {
  clients: Client[];
  lenders: Lender[];
  userRoster: User[];
  currentUser: User;
  tasks: Task[];
  partners: Partner[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
}

type PeriodType = "month" | "quarter" | "year" | "all";

const MONTH_THEMES = [
  {
    gradId: "monthGrad0",
    gradFrom: "#FF512F",
    gradTo: "#DD2476",
    primary: "#FF512F",
    textDark: "#FF6B4A",
    textLight: "#E11D48",
    cap: "#FFD166",
    badgeBg: "bg-rose-500/10 border-rose-500/20 text-rose-500",
    name: "Coral Sunset"
  },
  {
    gradId: "monthGrad1",
    gradFrom: "#F59E0B",
    gradTo: "#D97706",
    primary: "#F59E0B",
    textDark: "#FBBF24",
    textLight: "#B45309",
    cap: "#FDE047",
    badgeBg: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    name: "Golden Amber"
  },
  {
    gradId: "monthGrad2",
    gradFrom: "#10B981",
    gradTo: "#047857",
    primary: "#10B981",
    textDark: "#34D399",
    textLight: "#047857",
    cap: "#6EE7B7",
    badgeBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
    name: "Emerald Mint"
  },
  {
    gradId: "monthGrad3",
    gradFrom: "#06B6D4",
    gradTo: "#0284C7",
    primary: "#06B6D4",
    textDark: "#38BDF8",
    textLight: "#0369A1",
    cap: "#67E8F9",
    badgeBg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
    name: "Sapphire Cyan"
  },
  {
    gradId: "monthGrad4",
    gradFrom: "#6366F1",
    gradTo: "#4338CA",
    primary: "#6366F1",
    textDark: "#818CF8",
    textLight: "#4338CA",
    cap: "#A5B4FC",
    badgeBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500",
    name: "Royal Violet"
  },
  {
    gradId: "monthGrad5",
    gradFrom: "#EC4899",
    gradTo: "#9333EA",
    primary: "#EC4899",
    textDark: "#F472B6",
    textLight: "#A21CAF",
    cap: "#F472B6",
    badgeBg: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-500",
    name: "Neon Fuchsia"
  }
];

export const Reports: React.FC<ReportsProps> = ({
  clients,
  lenders,
  userRoster = [],
  currentUser,
  tasks,
  partners,
  showToast
}) => {
  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("year");
  const [selectedAgent, setSelectedAgent] = useState<string>("All");

  // Permission Checks:
  // Owners, Master Admins, Super Admins, and Senior Brokers see overall performance.
  // Agents can only see their own reports (or they see a banner stating their scope is filtered to their ownership).
  const isPrivileged = useMemo(() => {
    const normalizedRole = (currentUser.role || "").toLowerCase().trim();
    return ["developer/admin", "admin"].includes(normalizedRole) || !!currentUser.isOwner;
  }, [currentUser]);

  const activeAgentFilter = useMemo(() => {
    if (!isPrivileged) {
      return `${currentUser.first} ${currentUser.last}`;
    }
    return selectedAgent;
  }, [isPrivileged, currentUser, selectedAgent]);

  // Filter clients based on Date Period & Assigned Agent
  const filteredClients = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return clients.filter(c => {
      // 1. Agent Filter (Assigned broker or creator)
      const clientOwner = c.assignedTo || c.source || "David Acosta";
      
      const matchesAgent = activeAgentFilter === "All" || 
                           clientOwner.toLowerCase().includes(activeAgentFilter.toLowerCase());

      if (!matchesAgent) return false;

      // 2. Period Filter
      const clientDate = c.fundedDate ? new Date(c.fundedDate) : new Date(c.createdAt || now);
      
      if (selectedPeriod === "month") {
        return clientDate >= startOfMonth;
      } else if (selectedPeriod === "quarter") {
        return clientDate >= startOfQuarter;
      } else if (selectedPeriod === "year") {
        return clientDate >= startOfYear;
      }
      
      return true; // "all"
    });
  }, [clients, selectedPeriod, activeAgentFilter]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalCount = filteredClients.length;
    
    // 1. Funded Volume (sum of mtgamt for 'funded' status)
    const fundedFiles = filteredClients.filter(c => c.status === "funded");
    const fundedVolume = fundedFiles.reduce((sum, c) => sum + Number(c.mtgamt || 0), 0);
    const fundedCount = fundedFiles.length;

    // 2. Active Pipeline Value (all except lead, funded, closed)
    const activeFiles = filteredClients.filter(c => !["lead", "funded", "closed"].includes(c.status));
    const activeVolume = activeFiles.reduce((sum, c) => sum + Number(c.mtgamt || 0), 0);
    const activeCount = activeFiles.length;

    // 3. Conversion Rate (% of non-lead clients that became funded/closed)
    const qualifiedClients = filteredClients.filter(c => c.status !== "lead");
    const convertedFiles = qualifiedClients.filter(c => ["funded", "closed", "approved"].includes(c.status));
    const conversionRate = qualifiedClients.length > 0
      ? Math.round((convertedFiles.length / qualifiedClients.length) * 100)
      : 0;

    // 4. Average Deal Size (Average mtgamt of funded files or active files)
    const filesWithMtg = filteredClients.filter(c => Number(c.mtgamt || 0) > 0);
    const avgDealSize = filesWithMtg.length > 0
      ? Math.round(filesWithMtg.reduce((sum, c) => sum + Number(c.mtgamt || 0), 0) / filesWithMtg.length)
      : 0;

    return {
      fundedVolume,
      fundedCount,
      activeVolume,
      activeCount,
      conversionRate,
      avgDealSize,
      totalCount
    };
  }, [filteredClients]);

  // Trend Chart: Funded Volume by Month (Simulated last 6 months based on database dates)
  const monthlyFundedTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    
    // Get last 6 months
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6.push({
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        label: `${months[d.getMonth()]} '${d.getFullYear().toString().substring(2)}`,
        volume: 0,
        count: 0
      });
    }

    // Allocate client data (filter by selected agent if active)
    const relevantClients = clients.filter(c => {
      const owner = c.retentionOwner || c.assignedTo || c.source || `${currentUser.first} ${currentUser.last}`;
      return activeAgentFilter === "All" || owner.toLowerCase().includes(activeAgentFilter.toLowerCase());
    });

    relevantClients.forEach(c => {
      if (c.status === "funded" || c.status === "closed") {
        const dateStr = c.fundedDate || c.updatedAt || c.createdAt;
        if (dateStr) {
          const fd = new Date(dateStr);
          if (!isNaN(fd.getTime())) {
            const idx = last6.findIndex(m => m.monthNum === fd.getMonth() && m.year === fd.getFullYear());
            if (idx !== -1) {
              last6[idx].volume += Number(c.mtgamt || 0);
              last6[idx].count += 1;
            }
          }
        }
      }
    });

    return last6;
  }, [clients, activeAgentFilter, currentUser]);

  const trendSummary = useMemo(() => {
    const totalVolume = monthlyFundedTrend.reduce((sum, m) => sum + m.volume, 0);
    const totalDeals = monthlyFundedTrend.reduce((sum, m) => sum + m.count, 0);
    const avgMonthlyVol = Math.round(totalVolume / 6);
    const peakMonth = monthlyFundedTrend.reduce((max, m) => (m.volume > max.volume ? m : max), monthlyFundedTrend[0]);
    return { totalVolume, totalDeals, avgMonthlyVol, peakMonth };
  }, [monthlyFundedTrend]);

  // Stage Breakdown calculation
  const stageDistribution = useMemo(() => {
    const stages: Record<string, { count: number; volume: number; color: string }> = {
      "lead": { count: 0, volume: 0, color: "bg-slate-500" },
      "working": { count: 0, volume: 0, color: "bg-blue-500" },
      "lender": { count: 0, volume: 0, color: "bg-purple-500" },
      "conditional": { count: 0, volume: 0, color: "bg-orange-500" },
      "approved": { count: 0, volume: 0, color: "bg-teal-500" },
      "funded": { count: 0, volume: 0, color: "bg-emerald-500" }
    };

    filteredClients.forEach(c => {
      const st = c.status === "open" ? "working" : c.status;
      if (stages[st]) {
        stages[st].count += 1;
        stages[st].volume += Number(c.mtgamt || 0);
      }
    });

    return Object.entries(stages).map(([name, data]) => ({
      stage: name.charAt(0).toUpperCase() + name.slice(1),
      count: data.count,
      volume: data.volume,
      color: data.color
    }));
  }, [filteredClients]);

  // Lead Source breakdown
  const sourceDistribution = useMemo(() => {
    const sources: Record<string, number> = {};
    filteredClients.forEach(c => {
      const src = c.source || "Organic / Direct";
      // Normalize realtor referrals
      let normalized = src;
      if (src.toLowerCase().includes("realtor") || src.toLowerCase().includes("sarah") || src.toLowerCase().includes("johnson")) {
        normalized = "Realtor Referrals";
      } else if (src.toLowerCase().includes("google") || src.toLowerCase().includes("seo") || src.toLowerCase().includes("web")) {
        normalized = "Google / SEO";
      } else if (src.toLowerCase().includes("client") || src.toLowerCase().includes("advocate") || src.toLowerCase().includes("claire")) {
        normalized = "Past Client Referral";
      } else if (src.toLowerCase().includes("lawyer") || src.toLowerCase().includes("fletcher")) {
        normalized = "Solicitor Referrals";
      } else if (src.toLowerCase().includes("builder") || src.toLowerCase().includes("bob")) {
        normalized = "Builder Strategic Network";
      } else if (src.toLowerCase().includes("retention") || src.toLowerCase().includes("renew")) {
        normalized = "CRM Renewals";
      }
      sources[normalized] = (sources[normalized] || 0) + 1;
    });

    return Object.entries(sources)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredClients]);

  // Dynamic Agent Performance grid
  const agentPerformance = useMemo(() => {
    return userRoster.map(u => {
      const fullName = `${u.first} ${u.last}`;
      const fullNameLower = fullName.toLowerCase();
      const brokerClients = clients.filter(c => 
        c.assignedBrokerId === u.id ||
        (c.assignedBrokerName && c.assignedBrokerName.toLowerCase() === fullNameLower) ||
        (c.assignedBroker && c.assignedBroker.toLowerCase() === fullNameLower) ||
        (c.agent && c.agent.toLowerCase() === fullNameLower) ||
        (c.assignedTo && c.assignedTo.toLowerCase() === fullNameLower) ||
        (c.retentionOwner && c.retentionOwner.toLowerCase() === fullNameLower)
      );

      const funded = brokerClients.filter(c => c.status === "funded");
      const active = brokerClients.filter(c => !["lead", "funded", "closed"].includes(c.status));
      const totalVolume = funded.reduce((sum, c) => sum + Number(c.mtgamt || 0), 0);
      const qualified = brokerClients.filter(c => c.status !== "lead");
      const converted = qualified.filter(c => ["funded", "closed", "approved"].includes(c.status));
      const convRate = qualified.length > 0 ? Math.round((converted.length / qualified.length) * 100) : 0;

      return {
        name: fullName,
        role: u.role,
        totalFiles: brokerClients.length,
        fundedCount: funded.length,
        fundedVolume: totalVolume,
        activeCount: active.length,
        conversionRate: convRate
      };
    });
  }, [clients, userRoster]);

  // Lender Usage breakdown
  const lenderUsage = useMemo(() => {
    const breakdown: Record<string, { count: number; volume: number; tier: string }> = {};
    
    // Seed default lenders if empty
    lenders.forEach(l => {
      breakdown[l.name] = { count: 0, volume: 0, tier: l.tier };
    });

    clients.forEach(c => {
      if (c.lender && breakdown[c.lender]) {
        breakdown[c.lender].count += 1;
        breakdown[c.lender].volume += Number(c.mtgamt || 0);
      } else if (c.lender) {
        breakdown[c.lender] = { count: 1, volume: Number(c.mtgamt || 0), tier: "A" };
      }
    });

    return Object.entries(breakdown)
      .map(([name, data]) => ({
        name,
        tier: data.tier,
        count: data.count,
        volume: data.volume
      }))
      .filter(l => l.count > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [clients, lenders]);

  // Aging Analysis
  const fileAging = useMemo(() => {
    const now = Date.now();
    let stale30 = 0;
    let stale60 = 0;
    let stale90 = 0;

    filteredClients.forEach(c => {
      if (!["funded", "closed"].includes(c.status)) {
        const updateDate = new Date(c.updatedAt || c.createdAt).getTime();
        const diffDays = Math.floor((now - updateDate) / (24 * 3600000));
        
        if (diffDays >= 90) stale90 += 1;
        else if (diffDays >= 60) stale60 += 1;
        else if (diffDays >= 30) stale30 += 1;
      }
    });

    return { stale30, stale60, stale90 };
  }, [filteredClients]);

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = "ID,First,Last,Status,Mortgage Amount,Lender,Source,Funded Date\n";
    const rows = filteredClients.map(c => {
      return `"${c.id}","${c.first}","${c.last}","${c.status}",${c.mtgamt},"${c.lender || "None"}","${c.source || "Organic"}",${c.fundedDate || "N/A"}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gbk_crm_intelligence_report_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("CSV Intelligence Report downloaded successfully!", "success");
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Page styling / margins
      const margin = 14;
      let currentY = 15;

      // Header Banner
      doc.setFillColor(20, 20, 24); // Dark background
      doc.rect(margin, currentY, 182, 32, "F");
      
      doc.setTextColor(181, 166, 66); // Golden color
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("GBK EXECUTIVE INTELLIGENCE REPORT", margin + 6, currentY + 12);
      
      doc.setTextColor(240, 240, 242);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Period: ${selectedPeriod.toUpperCase()}  |  Agent Scope: ${activeAgentFilter}`, margin + 6, currentY + 20);
      doc.text(`Generated: ${new Date().toLocaleString("en-CA")}`, margin + 6, currentY + 25);
      
      currentY += 40;

      // 1. KPIs Section
      doc.setTextColor(20, 20, 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("1. CORE KEY PERFORMANCE INDICATORS", margin, currentY);
      currentY += 5;

      const kpiData = [
        ["Closed Funded Volume", `$${kpis.fundedVolume.toLocaleString()} CAD`, "Funded Files Count", `${kpis.fundedCount}`],
        ["Active Pipeline Value", `$${kpis.activeVolume.toLocaleString()} CAD`, "Working Files Count", `${kpis.activeCount}`],
        ["File Conversion Rate", `${kpis.conversionRate}%`, "Average Deal Size", `$${kpis.avgDealSize.toLocaleString()} CAD`],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metric Indicator", "Performance", "Operational Support", "Count"]],
        body: kpiData,
        theme: "striped",
        headStyles: { fillColor: [181, 166, 66], textColor: [20, 20, 24], fontStyle: "bold" },
        styles: { fontSize: 8.5 },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // 2. Pipeline Stage Distribution Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("2. PIPELINE BALANCE SHEET", margin, currentY);
      currentY += 5;

      const stageRows = stageDistribution.map(st => [
        st.stage,
        `${st.count} files`,
        `$${st.volume.toLocaleString()} CAD`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Pipeline Stage Status", "File Allocations", "Current Volume Value"]],
        body: stageRows,
        theme: "grid",
        headStyles: { fillColor: [30, 30, 36], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5 },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // 3. Agent Performance Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("3. AGENT PERFORMANCE SUMMARY", margin, currentY);
      currentY += 5;

      const agentRows = agentPerformance.map(item => [
        item.name,
        item.role,
        `${item.totalFiles} files`,
        `${item.fundedCount} files`,
        `$${item.fundedVolume.toLocaleString()}`,
        `${item.conversionRate}%`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Agent Name", "Designation", "Total", "Funded", "Closed Volume", "Conversion %"]],
        body: agentRows,
        theme: "striped",
        headStyles: { fillColor: [181, 166, 66], textColor: [20, 20, 24], fontStyle: "bold" },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });

      // Add a second page for Lender Placement
      doc.addPage();
      currentY = 15;

      // 4. Lender Placement Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 24);
      doc.text("4. LENDER PLACEMENT SHARES", margin, currentY);
      currentY += 5;

      const lenderRows = lenderUsage.map(item => {
        const totalCrmVolume = lenderUsage.reduce((sum, l) => sum + l.volume, 0) || 1;
        const placementPct = Math.round((item.volume / totalCrmVolume) * 100);
        return [
          item.name,
          `Tier ${item.tier}`,
          `${item.count} cases`,
          `$${item.volume.toLocaleString()} CAD`,
          `${placementPct}%`
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["Lender Institution", "Lending Class", "Allocated Deals", "Placed Volume", "Placement Share"]],
        body: lenderRows,
        theme: "striped",
        headStyles: { fillColor: [30, 30, 36], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5 },
        margin: { left: margin, right: margin }
      });

      // Footer signature/disclaimer at the end of page 2
      currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text("CONFIDENTIALITY & SECURITY COMPLIANCE DISCLOSURE:", margin, currentY);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.text("This intelligence ledger is generated directly from the GBKCRM active database.", margin, currentY + 4.5);
      doc.text("All client dossier files, debt analysis, and mortgage allocations remain proprietary corporate data.", margin, currentY + 8);
      doc.text("Unauthorized external replication, distribution, or transport is strictly prohibited by security policies.", margin, currentY + 11.5);

      doc.save(`gbk_executive_intelligence_report_${selectedPeriod}.pdf`);
      showToast("PDF Intelligence Report downloaded successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to generate PDF Report. Please check logs.", "error");
    }
  };

  const normalizedRole = (currentUser.role || "").toLowerCase().trim();
  if (!["developer/admin", "admin"].includes(normalizedRole) && !currentUser.isOwner) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-12">
        <ShieldAlert className="h-12 w-12 text-red-400" />
        <h2 className="text-base font-black uppercase tracking-widest text-[var(--color-text)]">Access Restricted</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md">The Executive Intelligence Reports module is restricted to Admin and Developer roles only. Contact your brokerage administrator for access.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden" id="reports-module-root">
      
      {/* Top filter dashboard controls */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="reports-controls-bar">
        <div>
          <h2 className="text-sm font-black uppercase text-[var(--color-accent)] tracking-widest flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> CRM Executive Intelligence Centre
          </h2>
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">Live broker pipeline health, lender shares, and conversion audits</p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Period Filter Buttons */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-1 rounded-lg flex">
            {(["month", "quarter", "year", "all"] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                  selectedPeriod === p 
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-extrabold" 
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : p === "year" ? "This Year" : "All Time"}
              </button>
            ))}
          </div>

          {/* Broker Filter Dropdown */}
          {isPrivileged ? (
            <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded-lg text-xs">
              <Filter className="h-3 w-3 text-[var(--color-accent)]" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-transparent border-none text-[11px] text-[var(--color-text)] focus:outline-none font-bold"
              >
                <option value="All" className="bg-[var(--color-bg)]">All GBK Agents</option>
                {userRoster.map(u => {
                  const fullName = `${u.first} ${u.last}`;
                  return (
                    <option key={u.id || fullName} value={fullName} className="bg-[var(--color-bg)]">
                      {fullName}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[10px] text-[var(--color-accent)] font-black uppercase px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> Agent Scope: Self-Ledger
            </div>
          )}

          {/* Export Buttons */}
          <button
            onClick={handleExportPDF}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text)] text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Export PDF Report
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text)] text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Export CSV
          </button>
        </div>
      </div>

      {/* Main reporting canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Security / Agent level boundary message if applicable */}
        {!isPrivileged && (
          <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-xl p-3 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-[var(--color-text)] block">Role Compliance Filter Active</span>
              <span className="text-[var(--color-text-muted)]">In compliance with brokerage data segregation regulations, your access is configured to view only personal deal flows, active client pipelines, and referred sources.</span>
            </div>
          </div>
        )}

        {/* KPI Cards section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="reports-kpi-grid">
          
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-wider">Funded Volume Closed</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-black font-sans text-emerald-400">${kpis.fundedVolume.toLocaleString()}</span>
              <div className="flex justify-between text-[10px] text-[var(--color-text-faint)] font-semibold mt-1">
                <span>Funded files: {kpis.fundedCount}</span>
                <span>CAD</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-wider">Active Pipeline Value</span>
              <TrendingUp className="h-4 w-4 text-[#6fa3b8]" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-black font-sans text-[#6fa3b8]">${kpis.activeVolume.toLocaleString()}</span>
              <div className="flex justify-between text-[10px] text-[var(--color-text-faint)] font-semibold mt-1">
                <span>Working files: {kpis.activeCount}</span>
                <span>Pending Clearance</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-wider">File Conversion Rate</span>
              <Percent className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-black font-sans text-amber-300">{kpis.conversionRate}%</span>
              <div className="flex justify-between text-[10px] text-[var(--color-text-faint)] font-semibold mt-1">
                <span>Funded vs Total Leads</span>
                <span>Closed Rate</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-black tracking-wider">Average Deal Size</span>
              <FileText className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-black font-sans text-[var(--color-text)]">${kpis.avgDealSize.toLocaleString()}</span>
              <div className="flex justify-between text-[10px] text-[var(--color-text-faint)] font-semibold mt-1">
                <span>Average GDS/TDS size</span>
                <span>Funded Average</span>
              </div>
            </div>
          </div>

        </div>

        {/* Trend Charts Section (High Fidelity Custom SVG Charts) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" id="reports-charts-grid">
          
          {/* Trend: Funded Volume last 6 months */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col justify-between shadow-sm min-h-[380px]">
            {/* Card Header & Title with Explanatory Guide */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3 pb-3 border-b border-[var(--color-border)] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--color-accent)]" />
                  <h3 className="text-sm font-extrabold text-[var(--color-text)] uppercase tracking-wider">
                    6-Month Closed Volume Trends
                  </h3>
                  <span className="text-[10px] font-bold text-[var(--color-accent)] bg-[var(--color-accent-subtle)] border border-[var(--color-accent-border)] px-2 py-0.5 rounded-full">
                    Funded Deals
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
                  <span>Tracks 6-month performance. <strong>Volume represents Funded Mortgage Amount in CAD.</strong></span>
                </p>
              </div>

              {/* Quick Summary Badges */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-1 rounded-lg text-right">
                  <div className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">6-Mo Total (CAD)</div>
                  <div className="text-xs font-black text-[var(--color-accent)] font-mono">
                    ${(trendSummary.totalVolume / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-1 rounded-lg text-right">
                  <div className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">Avg / Month</div>
                  <div className="text-xs font-black text-amber-400 font-mono">
                    ${Math.round(trendSummary.avgMonthlyVol / 1000).toLocaleString()}k
                  </div>
                </div>
              </div>
            </div>

            {/* SVG Bar Chart Area */}
            <div className="flex-1 w-full relative min-h-[220px] flex items-end">
              <svg className="w-full h-[220px]" viewBox="0 0 600 220" preserveAspectRatio="none">
                <defs>
                  {/* Per-Month Linear Gradients */}
                  {MONTH_THEMES.map((t, i) => (
                    <linearGradient key={i} id={`monthGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.gradFrom} stopOpacity="0.95" />
                      <stop offset="100%" stopColor={t.gradTo} stopOpacity="0.80" />
                    </linearGradient>
                  ))}

                  {/* Recessed Column Track Gradient for Light & Dark Mode */}
                  <linearGradient id="trackSlotGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-surface-2)" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="var(--color-surface-2)" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Grid Lines & Y-Axis Scale Labels */}
                {(() => {
                  const maxVol = Math.max(...monthlyFundedTrend.map(m => m.volume), 500000);
                  const yTop = `$${maxVol >= 1000000 ? (maxVol / 1000000).toFixed(1) + "M" : Math.round(maxVol / 1000) + "k"}`;
                  const yMid = `$${(maxVol / 2) >= 1000000 ? ((maxVol / 2) / 1000000).toFixed(1) + "M" : Math.round((maxVol / 2) / 1000) + "k"}`;

                  return (
                    <g>
                      {/* Top Gridline & Label */}
                      <line x1="60" y1="25" x2="580" y2="25" stroke="var(--color-border)" strokeDasharray="3 3" opacity="0.6" />
                      <text x="52" y="28" textAnchor="end" fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">{yTop}</text>

                      {/* Mid Gridline & Label */}
                      <line x1="60" y1="100" x2="580" y2="100" stroke="var(--color-border)" strokeDasharray="3 3" opacity="0.4" />
                      <text x="52" y="103" textAnchor="end" fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">{yMid}</text>

                      {/* Baseline Gridline & Label */}
                      <line x1="60" y1="175" x2="580" y2="175" stroke="var(--color-border)" strokeWidth="1.5" />
                      <text x="52" y="178" textAnchor="end" fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">$0</text>
                    </g>
                  );
                })()}

                {/* Month Columns & Bars */}
                {monthlyFundedTrend.map((item, idx) => {
                  const maxVolume = Math.max(...monthlyFundedTrend.map(m => m.volume), 500000);
                  const theme = MONTH_THEMES[idx % MONTH_THEMES.length];
                  const x = 95 + idx * 88;
                  const barWidth = 42;
                  const barLeft = x - barWidth / 2;
                  const maxBarH = 142; // Height from y=175 up to y=33
                  
                  const rawBarH = item.volume > 0 ? (item.volume / maxVolume) * maxBarH : 0;
                  const barH = item.volume > 0 ? Math.max(rawBarH, 18) : 16; // Guaranteed visible bar in both light and dark mode
                  const y = 175 - barH;

                  return (
                    <g key={idx} className="group cursor-pointer">
                      <title>{`${item.label}: $${item.volume.toLocaleString()} CAD (${item.count} funded deal${item.count === 1 ? '' : 's'}) — Funded Mortgage Amount in CAD`}</title>

                      {/* Recessed Track Container */}
                      <rect
                        x={barLeft}
                        y="25"
                        width={barWidth}
                        height="150"
                        fill="url(#trackSlotGrad)"
                        rx="8"
                        stroke="var(--color-border)"
                        strokeWidth="1"
                      />

                      {/* Per-Month Gradient Fill Bar */}
                      <rect
                        x={barLeft}
                        y={y}
                        width={barWidth}
                        height={barH}
                        fill={`url(#monthGrad${idx})`}
                        rx="6"
                        stroke={theme.primary}
                        strokeWidth="1"
                        opacity={item.volume > 0 ? "1" : "0.85"}
                        className="transition-all duration-300 group-hover:brightness-125"
                      />

                      {/* High-Contrast Top Cap */}
                      <rect
                        x={barLeft}
                        y={y}
                        width={barWidth}
                        height="4"
                        fill={theme.cap}
                        rx="2"
                      />

                      {/* Top Volume Amount Label in theme color with bold font */}
                      <text
                        x={x}
                        y={Math.max(y - 6, 18)}
                        textAnchor="middle"
                        fill={theme.primary}
                        fontSize="11"
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        ${item.volume >= 1000000 
                          ? `${(item.volume / 1000000).toFixed(1)}M` 
                          : item.volume > 0 
                          ? `${Math.round(item.volume / 1000)}k` 
                          : "0"}
                      </text>

                      {/* Count Badge inside bar when tall enough */}
                      {barH >= 38 && (
                        <text
                          x={x}
                          y={y + barH / 2 + 3}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="800"
                          opacity="0.95"
                        >
                          {item.count} {item.count === 1 ? "deal" : "deals"}
                        </text>
                      )}

                      {/* Month Label below X Axis */}
                      <text
                        x={x}
                        y="198"
                        textAnchor="middle"
                        fill="var(--color-text)"
                        fontSize="11"
                        fontWeight="800"
                      >
                        {item.label}
                      </text>

                      {/* Subtext: Deal count */}
                      {(item.volume === 0 || barH < 38) && (
                        <text
                          x={x}
                          y="212"
                          textAnchor="middle"
                          fill="var(--color-text-muted)"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          {item.count} {item.count === 1 ? "deal" : "deals"}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Footer Legend & Explanatory Guide */}
            <div className="flex flex-wrap items-center justify-between text-[10px] text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2.5 mt-2 gap-2 shrink-0">
              <div className="flex items-center gap-3 overflow-x-auto py-0.5">
                {MONTH_THEMES.map((t, i) => (
                  <div key={i} className="flex items-center gap-1 font-bold text-[10px] shrink-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-sm inline-block border border-black/10" 
                      style={{ background: `linear-gradient(to bottom, ${t.gradFrom}, ${t.gradTo})` }}
                    ></span>
                    <span className="text-[var(--color-text)]">
                      {monthlyFundedTrend[i]?.label || `M${i+1}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="font-bold text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-2.5 py-0.5 rounded border border-[var(--color-accent-border)]">
                Volume represents Funded Mortgage Amount in CAD
              </div>
            </div>
          </div>

          {/* Trend: Stage Distribution */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col h-[300px]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-wider">Broker Pipeline Balance</h3>
              <span className="text-[9px] text-[#6fa3b8] font-semibold bg-[#6fa3b8]/5 border border-[#6fa3b8]/10 px-1.5 py-0.5 rounded">Active Pipeline</span>
            </div>

            <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
              {stageDistribution.map((st, idx) => {
                const maxCount = Math.max(...stageDistribution.map(s => s.count), 1);
                const widthPercent = Math.max((st.count / maxCount) * 100, 3);
                
                return (
                  <div key={idx} className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-[var(--color-text)]">{st.stage}</span>
                      <div className="flex gap-2 text-[10px] font-bold text-[var(--color-text-faint)]">
                        <span>{st.count} files</span>
                        <span>•</span>
                        <span className="text-amber-500 dark:text-amber-300 font-mono">${(st.volume).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full ${
                          st.stage === "Funded" ? "bg-emerald-500" :
                          st.stage === "Approved" ? "bg-teal-500" :
                          st.stage === "Conditional" ? "bg-orange-400" :
                          st.stage === "Lender" ? "bg-purple-500" :
                          st.stage === "Working" ? "bg-[#6fa3b8]" : "bg-slate-500"
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Row: Agent and Lender tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" id="reports-tables-grid">
          
          {/* Table: Agent performance */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col h-[320px] overflow-hidden">
            <h3 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-wider border-b border-[var(--color-border)] pb-2 mb-3.5 flex justify-between items-center shrink-0">
              <span>Agent Performance Metrics</span>
              <span className="text-[9px] text-emerald-500 font-semibold uppercase">Brokerage Audited</span>
            </h3>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[var(--color-text-faint)] border-b border-[var(--color-border)] font-bold">
                    <th className="pb-2">GBK Agent</th>
                    <th className="pb-2 text-center">Total Files</th>
                    <th className="pb-2 text-center">Funded</th>
                    <th className="pb-2 text-right">Funded Vol</th>
                    <th className="pb-2 text-center">Active</th>
                    <th className="pb-2 text-right">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/30">
                  {agentPerformance.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface-2)]/30">
                      <td className="py-2.5">
                        <span className="font-bold text-[var(--color-text)] block">{item.name}</span>
                        <span className="text-[9.5px] text-[var(--color-text-faint)] block font-semibold">{item.role}</span>
                      </td>
                      <td className="py-2.5 text-center font-bold text-[var(--color-text-muted)]">{item.totalFiles}</td>
                      <td className="py-2.5 text-center font-bold text-emerald-500">{item.fundedCount}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-500 font-mono">${(item.fundedVolume).toLocaleString()}</td>
                      <td className="py-2.5 text-center font-bold text-[#6fa3b8]">{item.activeCount}</td>
                      <td className="py-2.5 text-right font-black text-amber-500 dark:text-amber-300 font-mono">{item.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table: Lender Usage shares */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col h-[320px] overflow-hidden">
            <h3 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-wider border-b border-[var(--color-border)] pb-2 mb-3.5 flex justify-between items-center shrink-0">
              <span>Lender Placement Distribution</span>
              <span className="text-[9px] text-[var(--color-accent)] font-semibold uppercase">Underwriting Shares</span>
            </h3>

            <div className="flex-1 overflow-y-auto">
              {lenderUsage.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[var(--color-text-faint)]">
                  No lender allocations logged in client folders.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[var(--color-text-faint)] border-b border-[var(--color-border)] font-bold">
                      <th className="pb-2">Institution</th>
                      <th className="pb-2 text-center">Tier</th>
                      <th className="pb-2 text-center">Allocated Files</th>
                      <th className="pb-2 text-right">Volume share</th>
                      <th className="pb-2 text-right">Placement %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/30">
                    {lenderUsage.map((item, idx) => {
                      const totalCrmVolume = lenderUsage.reduce((sum, l) => sum + l.volume, 0) || 1;
                      const placementPct = Math.round((item.volume / totalCrmVolume) * 100);

                      return (
                        <tr key={idx} className="hover:bg-[var(--color-surface-2)]/30">
                          <td className="py-2.5 font-bold text-[var(--color-text)]">{item.name}</td>
                          <td className="py-2.5 text-center">
                            <span className="bg-[var(--color-surface-2)] text-[var(--color-accent)] border border-[var(--color-accent)]/25 font-bold text-[9px] px-1.5 py-0.5 rounded">
                              Tier {item.tier}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-bold text-[var(--color-text-muted)]">{item.count}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-500 font-mono">${(item.volume).toLocaleString()}</td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-bold">
                              <span className="font-mono text-[#6fa3b8]">{placementPct}%</span>
                              <div className="w-12 bg-[var(--color-surface-2)] h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-[#6fa3b8] h-full" style={{ width: `${placementPct}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Operational Indicators and Health row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="reports-health-indicators">
          
          {/* File Aging analysis */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-wider border-b border-[var(--color-border)] pb-2 mb-3 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Pipeline Aging Analysis
              </h3>
              <p className="text-[10px] text-[var(--color-text-faint)] font-semibold leading-relaxed mb-4">Underwriting delays decrease closing conversions. Monitor stagnation levels of conditional and working files.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-lg p-2">
                <span className="text-[9px] text-orange-400 block font-black uppercase">30+ Days</span>
                <span className="text-lg font-black text-[var(--color-text)] mt-1 block">{fileAging.stale30}</span>
                <span className="text-[8px] text-[var(--color-text-faint)] uppercase font-bold">Stagnant</span>
              </div>
              <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-lg p-2">
                <span className="text-[9px] text-red-400 block font-black uppercase">60+ Days</span>
                <span className="text-lg font-black text-[var(--color-text)] mt-1 block">{fileAging.stale60}</span>
                <span className="text-[8px] text-[var(--color-text-faint)] uppercase font-bold">Delayed</span>
              </div>
              <div className="bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-lg p-2">
                <span className="text-[9px] text-rose-500 block font-black uppercase">90+ Days</span>
                <span className="text-lg font-black text-rose-400 mt-1 block">{fileAging.stale90}</span>
                <span className="text-[8px] text-[var(--color-text-faint)] uppercase font-bold">CRITICAL</span>
              </div>
            </div>
          </div>

          {/* Source distribution mix */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-wider border-b border-[var(--color-border)] pb-2 mb-3 flex items-center gap-1.5">
                <PieChart className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Lead Acquisition Mix
              </h3>
              <p className="text-[10px] text-[var(--color-text-faint)] font-semibold leading-relaxed mb-3">Revenue attribution mapping of closed files. Balances independent web marketing vs professional referrals.</p>
            </div>

            <div className="space-y-1.5 max-h-[120px] overflow-y-auto text-xs font-bold text-[var(--color-text-muted)]">
              {sourceDistribution.slice(0, 4).map((src, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-[var(--color-border)]/20">
                  <span className="truncate max-w-[160px] text-[var(--color-text-muted)] font-semibold">{src.name}</span>
                  <span className="text-[var(--color-accent)] font-mono">{src.count} cases</span>
                </div>
              ))}
              {sourceDistribution.length === 0 && (
                <div className="text-center text-[10px] text-[var(--color-text-faint)] py-4">No referrers logged.</div>
              )}
            </div>
          </div>

          {/* Operational statistics (Events & Tasks completions) */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase text-[var(--color-text-muted)] tracking-wider border-b border-[var(--color-border)] pb-2 mb-3 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> CRM Operational Activity
              </h3>
              <p className="text-[10px] text-[var(--color-text-faint)] font-semibold leading-relaxed mb-4">Tracking task-clearance velocities and broker actions. High operational volumes correlate to positive closing quarters.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs text-[var(--color-text-muted)] font-semibold">
              <div className="bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-lg p-2.5 flex items-center justify-between">
                <span>Task Clear</span>
                <span className="font-mono text-emerald-500 font-bold">
                  {tasks.filter(t => t.status === "done").length} / {tasks.length}
                </span>
              </div>
              <div className="bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-lg p-2.5 flex items-center justify-between">
                <span>Strategic Partners</span>
                <span className="font-mono text-[var(--color-accent)] font-bold">{partners.length} registered</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
