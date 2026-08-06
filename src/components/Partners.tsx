import React, { useState, useMemo, useEffect } from "react";
import { 
  Users, Plus, MapPin, Award, CheckCircle, Search, Filter, ShieldAlert,
  ArrowRight, Mail, Phone, ExternalLink, Calendar, Star, LayoutDashboard, Database, RefreshCw, ArrowUpDown, FileText
} from "lucide-react";
import { Partner, Client, Task, User, PartnerTimelineEntry } from "../types";

// Import modular sub-components
import { 
  PARTNER_CATEGORIES, 
  PARTNER_STATUSES, 
  ONTARIO_REGIONS, 
  ExtendedPartner, 
  SEED_PARTNERS 
} from "./partners/constants";
import { PartnerList } from "./partners/PartnerList";
import { PartnerDetail } from "./partners/PartnerDetail";
import { PartnerModal } from "./partners/PartnerModal";

interface PartnersProps {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  clients: Client[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentUser: User;
  userRoster: User[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onOpenComposeEmail?: (to: string, subject: string, body: string) => void;
}

export const Partners: React.FC<PartnersProps> = ({
  partners,
  setPartners,
  clients,
  tasks,
  setTasks,
  currentUser,
  userRoster = [],
  showToast,
  onOpenComposeEmail
}) => {
  // 1. Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const [preferredOnly, setPreferredOnly] = useState<boolean>(false);

  // 2. Sorting States (alphabetically by default)
  const [sortBy, setSortBy] = useState<"name" | "company" | "health" | "added">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 3. Selection State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  // 4. Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ExtendedPartner | null>(null);

  // 5. More menu open state
  const [moreOpen, setMoreOpen] = useState(false);

  // Versioned Seeding: Populate with rich simulated partners if previously unseeded
  useEffect(() => {
    const hasSeeded = localStorage.getItem("gbk_partners_v2_seeded");
    if (!hasSeeded) {
      setPartners(SEED_PARTNERS);
      localStorage.setItem("gbk_partners", JSON.stringify(SEED_PARTNERS));
      localStorage.setItem("gbk_partners_v2_seeded", "true");
      if (SEED_PARTNERS.length > 0) {
        setSelectedPartnerId(SEED_PARTNERS[0].id);
      }
      showToast("Registered premium Ontario mortgage partner network.", "success");
    } else if (partners.length > 0 && !selectedPartnerId) {
      setSelectedPartnerId(partners[0].id);
    }
  }, [partners, setPartners, selectedPartnerId, showToast]);

  // Reset Filters Helper
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedStatus("All");
    setSelectedCity("All");
    setPreferredOnly(false);
    setSortBy("name");
    setSortOrder("asc");
    showToast("Search filters restored to default.", "info");
  };

  // Filter & Sort Logic (Separated into a clean selector as required)
  const filteredAndSortedPartners = useMemo(() => {
    let result = [...partners] as ExtendedPartner[];

    // Apply Search Term Matcher (covers name, company, email, phone, city, or specialty)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(p => {
        const nameMatch = `${p.first} ${p.last}`.toLowerCase().includes(term);
        const companyMatch = (p.company || "").toLowerCase().includes(term);
        const categoryMatch = (p.type || "").toLowerCase().includes(term);
        const emailMatch = (p.email || "").toLowerCase().includes(term);
        const phoneMatch = (p.phone || "").toLowerCase().includes(term);
        const cityMatch = (p.city || p.address || "").toLowerCase().includes(term);
        const specialtyMatch = (p.referralTags || []).some(t => t.toLowerCase().includes(term)) || 
                             (p.notes || "").toLowerCase().includes(term) ||
                             (p.role || "").toLowerCase().includes(term);
        
        return nameMatch || companyMatch || categoryMatch || emailMatch || phoneMatch || cityMatch || specialtyMatch;
      });
    }

    // Apply Dropdown Filters
    if (selectedCategory !== "All") {
      result = result.filter(p => p.type === selectedCategory);
    }

    if (selectedStatus !== "All") {
      result = result.filter(p => p.status === selectedStatus);
    }

    if (selectedCity !== "All") {
      result = result.filter(p => p.city === selectedCity);
    }

    if (preferredOnly) {
      result = result.filter(p => p.isPreferred || p.status === "Preferred");
    }

    // Apply Sorting Controls
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        const nameA = `${a.first} ${a.last}`.toLowerCase();
        const nameB = `${b.first} ${b.last}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === "company") {
        const compA = (a.company || "").toLowerCase();
        const compB = (b.company || "").toLowerCase();
        comparison = compA.localeCompare(compB);
      } else if (sortBy === "health") {
        comparison = (a.healthScore || 0) - (b.healthScore || 0);
      } else if (sortBy === "added") {
        const dateA = new Date(a.addedAt || 0).getTime();
        const dateB = new Date(b.addedAt || 0).getTime();
        comparison = dateA - dateB;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [partners, searchTerm, selectedCategory, selectedStatus, selectedCity, preferredOnly, sortBy, sortOrder]);

  // Lookup selected partner with fallback to the first matched entry
  const selectedPartner = useMemo(() => {
    const found = partners.find(p => p.id === selectedPartnerId) as ExtendedPartner | undefined;
    return found || (filteredAndSortedPartners[0] as ExtendedPartner | undefined) || null;
  }, [partners, selectedPartnerId, filteredAndSortedPartners]);

  // Overall Statistics Panel Calculations
  const customCategories = useMemo(() => {
    const allTypes = partners.map(p => p.type).filter(Boolean);
    return [...new Set(allTypes)].filter(t => !PARTNER_CATEGORIES.includes(t as any));
  }, [partners]);

  const metricsSummary = useMemo(() => {
    const totalCount = partners.length;
    const preferredCount = partners.filter(p => p.isPreferred || p.status === "Preferred").length;
    const activeCount = partners.filter(p => p.status === "Active").length;
    const averageHealth = totalCount > 0 
      ? Math.round(partners.reduce((sum, p) => sum + (p.healthScore || 85), 0) / totalCount)
      : 85;

    // Estimate total leads passed from these partners
    const totalReferredClients = clients.filter(c => c.referredBy).length;

    return {
      totalCount,
      preferredCount,
      activeCount,
      averageHealth,
      totalReferredClients
    };
  }, [partners, clients]);

  // Toggle Preferred Flag directly
  const handleTogglePreferred = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPartners(prev => prev.map(p => {
      if (p.id === id) {
        const ext = p as ExtendedPartner;
        const currentPreferred = ext.isPreferred || ext.status === "Preferred";
        const nextPreferred = !currentPreferred;
        return {
          ...ext,
          isPreferred: nextPreferred,
          status: nextPreferred ? "Preferred" : "Active"
        };
      }
      return p;
    }));
    showToast("Preferred partner flag updated.", "success");
  };

  // Remove Partner Record
  const handleDeletePartner = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPartners(prev => prev.filter(p => p.id !== id));
    if (selectedPartnerId === id) {
      setSelectedPartnerId(null);
    }
    showToast("Partner removed from internal directories.", "info");
  };

  // Trigger modal in Edit mode
  const handleEditPartner = (partner: ExtendedPartner, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPartner(partner);
    setIsModalOpen(true);
  };

  // Trigger modal in Add mode
  const handleAddPartner = () => {
    setEditingPartner(null);
    setIsModalOpen(true);
  };

  // Save changes from Modal form (combines add and edit safely)
  const handleSavePartner = (updates: Partial<ExtendedPartner>) => {
    if (updates.id) {
      // Edit mode
      setPartners(prev => prev.map(p => {
        if (p.id === updates.id) {
          return {
            ...p,
            ...updates,
            // Sync status if isPreferred was updated
            status: updates.isPreferred ? "Preferred" : (updates.status === "Preferred" ? "Active" : updates.status)
          };
        }
        return p;
      }));
      showToast(`Partner profile updated.`, "success");
    } else {
      // Add mode
      const partnerId = `part_${Date.now()}`;
      const newPartner: ExtendedPartner = {
        id: partnerId,
        first: updates.first || "",
        last: updates.last || "",
        company: updates.company,
        type: updates.type || "Lawyers",
        role: updates.role,
        phone: updates.phone,
        email: updates.email,
        website: updates.website,
        address: updates.address,
        city: updates.city || "Barrie",
        assignedOwner: updates.assignedOwner || `${currentUser.first} ${currentUser.last}`,
        status: updates.isPreferred ? "Preferred" : (updates.status || "Active") as any,
        isPreferred: updates.isPreferred || updates.status === "Preferred",
        notes: updates.notes,
        healthScore: updates.healthScore ?? 85,
        referralTags: updates.referralTags || [],
        addedAt: new Date().toISOString(),
        addedBy: `${currentUser.first} ${currentUser.last}`,
        timeline: [
          {
            id: `t_log_init_${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            type: "note",
            text: `Partner profile registered under category [${updates.type}] by ${currentUser.first} ${currentUser.last}.`,
            author: `${currentUser.first} ${currentUser.last}`
          }
        ]
      };
      setPartners(prev => [newPartner, ...prev]);
      setSelectedPartnerId(partnerId);
      showToast("Strategic partner onboarded successfully.", "success");
    }
    setIsModalOpen(false);
  };

  // Append Timeline Logging Note
  const handleAddTimelineEntry = (id: string, entry: PartnerTimelineEntry) => {
    setPartners(prev => prev.map(p => {
      if (p.id === id) {
        const ext = p as ExtendedPartner;
        const currentTimeline = ext.timeline || [];
        return {
          ...ext,
          timeline: [entry, ...currentTimeline].sort((a, b) => b.date.localeCompare(a.date)),
          lastTouchDate: entry.date
        };
      }
      return p;
    }));
  };

  // Append related follow up task
  const handleAddRelatedTask = (title: string, dueDate: string, priority: 'high' | 'medium' | 'low') => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title,
      status: "open",
      priority,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: `${currentUser.first} ${currentUser.last}`,
      assignedTo: `${currentUser.first} ${currentUser.last}`
    };

    setTasks(prev => [newTask, ...prev]);
  };

  // Helper for escaping HTML strings
  const escapeHtml = (str: string): string => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Export PDF functionality
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Unable to open print window. Please allow popups.", "error");
      return;
    }

    // Active filters summary
    const filterParts: string[] = [];
    if (selectedCategory && selectedCategory !== "All") filterParts.push(`Category: ${selectedCategory}`);
    if (selectedStatus && selectedStatus !== "All") filterParts.push(`Status: ${selectedStatus}`);
    if (selectedCity && selectedCity !== "All") filterParts.push(`City: ${selectedCity}`);
    if (preferredOnly) filterParts.push("Preferred Only");
    if (searchTerm.trim()) filterParts.push(`Search: "${searchTerm.trim()}"`);

    const activeFiltersText = filterParts.length > 0 ? filterParts.join(" | ") : "All Partners";
    const generatedDate = new Date().toLocaleDateString("en-CA");

    const cardsHtml = filteredAndSortedPartners.map((p) => {
      // Most recent timeline entry
      let recentTimelineText = "No activity logged";
      if (p.timeline && p.timeline.length > 0) {
        const sortedTimeline = [...p.timeline].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
        const latest = sortedTimeline[0];
        recentTimelineText = `${latest.date || "Date unrecorded"} — ${latest.text || ""}`;
      }

      const tagsText = p.referralTags && p.referralTags.length > 0 ? p.referralTags.join(", ") : "None";

      return `
        <div class="partner-card">
          <div class="card-header">
            <div>
              <div class="partner-name">${escapeHtml(p.first || "")} ${escapeHtml(p.last || "")}</div>
              <div class="partner-company">${escapeHtml(p.company || "Independent")}${p.role ? ` • ${escapeHtml(p.role)}` : ""}</div>
            </div>
            <span class="status-badge">${escapeHtml(p.status || "Active")}</span>
          </div>

          <div class="card-grid">
            <div><span class="label">Category:</span> ${escapeHtml(p.type || "General")}</div>
            <div><span class="label">Status:</span> ${escapeHtml(p.status || "Active")}</div>
            <div><span class="label">City:</span> ${escapeHtml(p.city || "Ontario")}</div>
            <div><span class="label">Phone:</span> ${escapeHtml(p.phone || "N/A")}</div>
            <div><span class="label">Email:</span> ${escapeHtml(p.email || "N/A")}</div>
            <div><span class="label">Website:</span> ${escapeHtml(p.website || "N/A")}</div>
            <div><span class="label">Health Score:</span> ${p.healthScore ?? 0}%</div>
            <div><span class="label">Assigned Owner:</span> ${escapeHtml(p.assignedOwner || "David Acosta")}</div>
          </div>

          <div><span class="label">Referral Tags:</span> ${escapeHtml(tagsText)}</div>

          <div class="card-notes"><span class="label">Notes:</span> ${escapeHtml(p.notes || "None")}</div>

          <div class="card-timeline"><span class="label">Most Recent Activity:</span> ${escapeHtml(recentTimelineText)}</div>
        </div>
      `;
    }).join("");

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Partner Network Directory — GBK Financial</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
      @bottom-center {
        content: "GBK Financial — Confidential";
        font-size: 8pt;
        color: #666;
        font-family: Arial, sans-serif;
      }
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, system-ui, -apple-system, sans-serif;
      background-color: #ffffff;
      color: #111111;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #222;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .logo {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #000;
      text-transform: uppercase;
    }
    .report-title {
      font-size: 14px;
      font-weight: 800;
      color: #333;
      margin-top: 2px;
    }
    .meta-info {
      text-align: right;
      font-size: 10px;
      color: #555;
    }
    .meta-info div {
      margin-bottom: 2px;
    }
    .summary-bar {
      background: #f5f5f7;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .partners-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .partner-card {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 12px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #eee;
      padding-bottom: 6px;
    }
    .partner-name {
      font-size: 12px;
      font-weight: 800;
      color: #111;
    }
    .partner-company {
      font-size: 10px;
      color: #555;
      font-weight: 600;
    }
    .status-badge {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 10px;
      border: 1px solid #ccc;
      background: #f0f0f0;
      color: #333;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 8px;
      font-size: 9.5px;
    }
    .label {
      font-weight: 700;
      color: #555;
    }
    .card-notes {
      font-size: 9px;
      color: #444;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      padding: 4px 6px;
      border-radius: 4px;
    }
    .card-timeline {
      font-size: 9px;
      color: #555;
      border-top: 1px dashed #eee;
      padding-top: 4px;
    }
    .print-footer {
      text-align: center;
      font-size: 8pt;
      color: #666;
      margin-top: 24px;
      border-top: 1px solid #eee;
      padding-top: 8px;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">GBK Financial</div>
      <div class="report-title">Partner Network Directory</div>
    </div>
    <div class="meta-info">
      <div><strong>Date:</strong> ${generatedDate}</div>
      <div><strong>Total Partners:</strong> ${filteredAndSortedPartners.length}</div>
    </div>
  </div>

  <div class="summary-bar">
    <div><strong>Active Filters:</strong> ${escapeHtml(activeFiltersText)}</div>
    <div><strong>Count:</strong> ${filteredAndSortedPartners.length} Record${filteredAndSortedPartners.length === 1 ? '' : 's'}</div>
  </div>

  <div class="partners-grid">
    ${cardsHtml}
  </div>

  <div class="print-footer">
    GBK Financial — Confidential
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden select-none" id="partner-network-workspace">
      
      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        
        {/* Header Ribbon & Control Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-[#56AB2F]" />
              <span className="bg-gradient-to-r from-[#56AB2F] to-[#A8E063] bg-clip-text text-transparent">
                Partner Network
              </span>
            </h1>
            <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">
              Browse, filter, coordinate, and review active lawyers, appraisers, realtors, and inspectors
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleExportPDF}
              className="bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-accent)]/50 text-xs font-black uppercase px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export Partner Network Directory as PDF"
            >
              <FileText className="w-4 h-4 text-[var(--color-accent)]" /> Export PDF
            </button>

            <button
              onClick={handleAddPartner}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black text-xs font-black uppercase px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Strategic Partner
            </button>
          </div>
        </div>

        {/* 1. Category Tab Navigation Bar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] pb-2" id="partner-category-tabs">
          {[
            { id: "All", label: "All Partners" },
            { id: "Lawyers", label: "Lawyers" },
            { id: "Realtors", label: "Realtors" },
            { id: "Appraisers", label: "Appraisers" },
            { id: "Home Inspectors", label: "Home Inspectors" },
            { id: "Insurance Brokers", label: "Insurance Brokers" },
            { id: "Financial Advisors", label: "Financial Advisors" }
          ].map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id);
                  setMoreOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                  isActive
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/30 shadow-sm shadow-[var(--color-accent)]/5 font-bold"
                    : "bg-[var(--color-surface)] border-[var(--color-border)]/70 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          
          {/* More Categories Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 border ${
                [
                  "Accountants",
                  "Contractors / Renovation",
                  "Mortgage Agents / Brokers",
                  "Private Lenders",
                  "B Lenders",
                  "Credit / Debt Specialists",
                  ...customCategories
                ].includes(selectedCategory)
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/30 font-bold"
                  : "bg-[var(--color-surface)] border-[var(--color-border)]/70 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <span>
                {[
                  "Accountants",
                  "Contractors / Renovation",
                  "Mortgage Agents / Brokers",
                  "Private Lenders",
                  "B Lenders",
                  "Credit / Debt Specialists",
                  ...customCategories
                ].includes(selectedCategory) 
                  ? `More: ${selectedCategory}` 
                  : "More Categories"}
              </span>
              <span className="text-[8px] opacity-60">▼</span>
            </button>
            
            {moreOpen && (
              <div className="absolute left-0 mt-1.5 w-56 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 py-1.5">
                {[
                  "Accountants",
                  "Contractors / Renovation",
                  "Mortgage Agents / Brokers",
                  "Private Lenders",
                  "B Lenders",
                  "Credit / Debt Specialists"
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setMoreOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[var(--color-surface-3)] ${
                      selectedCategory === cat ? "text-[var(--color-accent)] font-bold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                {customCategories.length > 0 && (
                  <>
                    <div className="border-t border-[var(--color-border)]/50 my-1" />
                    <p className="px-4 py-1 text-[10px] uppercase font-black text-[var(--color-text-faint)] tracking-wider">Custom</p>
                    {customCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setMoreOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[var(--color-surface-3)] ${
                          selectedCategory === cat ? "text-[var(--color-accent)] font-bold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Compact Search and Filtering Controls */}
        <div className="flex flex-col lg:flex-row items-center gap-3 bg-[var(--color-surface-2)]/30 border border-[var(--color-border)]/70 rounded-xl p-3" id="partner-compact-filter-bar">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, company, email, or keyword..."
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg pl-9 pr-8 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-medium"
            />
            <Search className="h-3.5 w-3.5 text-[var(--color-text-faint)] absolute left-3 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-start lg:justify-end">
            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold cursor-pointer"
            >
              <option value="All" className="bg-[var(--color-surface)]">All Statuses</option>
              {PARTNER_STATUSES.map(status => (
                <option key={status} value={status} className="bg-[var(--color-surface)]">{status}</option>
              ))}
            </select>

            {/* City Dropdown */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold cursor-pointer"
            >
              <option value="All" className="bg-[var(--color-surface)]">All Cities</option>
              {ONTARIO_REGIONS.map(region => (
                <option key={region} value={region} className="bg-[var(--color-surface)]">{region}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold cursor-pointer"
            >
              <option value="name" className="bg-[var(--color-surface)]">Sort: Name</option>
              <option value="company" className="bg-[var(--color-surface)]">Sort: Company</option>
              <option value="health" className="bg-[var(--color-surface)]">Sort: Health</option>
              <option value="added" className="bg-[var(--color-surface)]">Sort: Added</option>
            </select>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg p-2 text-xs text-[var(--color-text)] hover:border-[var(--color-accent)]/20 transition-all"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            </button>

            {/* Preferred Only Button */}
            <button
              onClick={() => setPreferredOnly(!preferredOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                preferredOnly
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)]/70 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <Star className={`w-3 h-3 ${preferredOnly ? "fill-current" : ""}`} />
              <span>Preferred</span>
            </button>

            {/* Reset Filter Button */}
            {(searchTerm || selectedCategory !== "All" || selectedStatus !== "All" || selectedCity !== "All" || preferredOnly) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-[var(--color-text-muted)] hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-[var(--color-border)]/70 hover:border-red-500/10 transition-all flex items-center gap-1"
                title="Reset Filters"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Results Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider">
              Directory Results ({filteredAndSortedPartners.length} Found)
            </span>
            <span className="text-[10px] text-[var(--color-text-faint)] italic">Click row to inspect full dossier</span>
          </div>
          
          {filteredAndSortedPartners.length === 0 ? (
            <div className="bg-[var(--color-surface-2)]/50 border border-dashed border-[var(--color-border)]/70 rounded-xl p-12 text-center" id="empty-partner-results">
              <MapPin className="h-10 w-10 text-[var(--color-accent)] opacity-60 mx-auto mb-3 stroke-1 animate-pulse" />
              <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">No Partners Located</h3>
              <p className="text-[10px] font-sans font-semibold text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
                No external professional partners match the current search filters or region constraints.
              </p>
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  onClick={handleResetFilters}
                  className="px-3.5 py-1.5 border border-[var(--color-border)] hover:border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] font-bold text-[10px] uppercase rounded-lg transition-all"
                >
                  Clear Filters
                </button>
                <button
                  onClick={handleAddPartner}
                  className="px-3.5 py-1.5 bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-hover)] font-bold text-[10px] uppercase rounded-lg transition-all"
                >
                  Add Strategic Partner
                </button>
              </div>
            </div>
          ) : (
            <PartnerList
              partners={filteredAndSortedPartners}
              clients={clients}
              selectedPartnerId={selectedPartner?.id || null}
              onSelectPartner={setSelectedPartnerId}
              onTogglePreferred={handleTogglePreferred}
              onDeletePartner={handleDeletePartner}
              onEditPartner={handleEditPartner}
              onQuickEmail={(email) => {
                if (onOpenComposeEmail) {
                  onOpenComposeEmail(email, "Mortgage Market Update", "");
                } else {
                  window.open(`mailto:${email}`);
                }
              }}
            />
          )}
        </div>

        {/* 3. Detailed Dossier View (Active Partner Workspace Detail panel) */}
        {selectedPartner && (
          <div className="space-y-3.5 pt-4 border-t border-[var(--color-border)]/70 animate-slideUp">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase text-[var(--color-accent)] tracking-wider">
                🔬 Active Partner Dossier Workspace
              </span>
              <span className="text-[10px] text-[var(--color-text-faint)] font-semibold uppercase">
                ID: {selectedPartner.id}
              </span>
            </div>

            <PartnerDetail
              partner={selectedPartner}
              clients={clients}
              userRoster={userRoster}
              currentUser={currentUser}
              onUpdatePartnerField={(id, updates) => {
                setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
                showToast("Dossier intelligence synchronized.", "success");
              }}
              onDeletePartner={handleDeletePartner}
              onEditPartner={handleEditPartner}
              onAddTimelineEntry={handleAddTimelineEntry}
              onAddRelatedTask={handleAddRelatedTask}
              onOpenComposeEmail={onOpenComposeEmail}
              showToast={showToast}
            />
          </div>
        )}

      </div>

      {/* 4. Add/Edit Dialog form overlay */}
      <PartnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSavePartner={handleSavePartner}
        editingPartner={editingPartner}
        userRoster={userRoster}
        currentUser={currentUser}
      />

    </div>
  );
};
