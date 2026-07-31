import { Client } from "../../types";

export const DOCUMENT_CATEGORIES = [
  "Identification",
  "Income",
  "Employment",
  "Banking",
  "Property",
  "Credit / liabilities",
  "Down payment",
  "Mortgage statements",
  "Tax documents",
  "Legal / compliance",
  "Other"
];

export const STATUS_STYLING: Record<string, { label: string; color: string; border: string; text: string }> = {
  required: { label: "Required", color: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-[var(--color-text-muted)]" },
  requested: { label: "Requested", color: "bg-[var(--color-info-subtle)]", border: "border-[var(--color-info)]/30", text: "text-[var(--color-info)]" },
  received: { label: "Received", color: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
  under_review: { label: "Under Review", color: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  approved: { label: "Approved", color: "bg-green-500/10", border: "border-green-500/20", text: "text-green-600 dark:text-green-400" },
  rejected: { label: "Rejected", color: "bg-red-500/10", border: "border-red-500/20", text: "text-red-600 dark:text-red-400" },
  missing_pages: { label: "Missing Pages", color: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400" },
  expired: { label: "Expired", color: "bg-red-500/10", border: "border-red-500/30", text: "text-red-600 dark:text-red-400" },
  follow_up: { label: "Needs Follow-Up", color: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400" },
  waived: { label: "Waived", color: "bg-emerald-500/5", border: "border-emerald-500/15", text: "text-emerald-600/80 dark:text-emerald-400/80" },
  na: { label: "N/A", color: "bg-[var(--color-surface-2)]/50", border: "border-[var(--color-border)]/50", text: "text-[var(--color-text-faint)]" }
};

export const ISSUE_CHECKBOXES = [
  { id: "blurry", label: "Blurry / Unreadable" },
  { id: "incomplete", label: "Incomplete Pages" },
  { id: "expired", label: "Expired Credential" },
  { id: "wrong_doc", label: "Incorrect Document Type" },
  { id: "missing_sign", label: "Signature Missing" },
  { id: "taxes_due", label: "CRA Tax Balance Owed" }
];

export interface ChecklistRule {
  id: string;
  label: string;
  category: string;
  description: string;
  req: boolean;
  evaluate: (client: Client) => boolean;
}

export const CHECKLIST_RULES: ChecklistRule[] = [
  {
    id: "photo_id",
    label: "Govt Photo ID (Driver's / Passport)",
    category: "Identification",
    description: "Primary government-issued photo ID required for AML (Anti-Money Laundering) check and KYC verification. Must not be expired.",
    req: true,
    evaluate: () => true
  },
  {
    id: "paystubs",
    label: "Stated Job Pay Stubs (last 3)",
    category: "Income",
    description: "Most recent 3 consecutive pay stubs displaying year-to-date (YTD) earnings, tax deductions, and employer name.",
    req: true,
    evaluate: (client) => {
      const emp = (client.emptype || "").toLowerCase();
      return emp === "salaried" || emp === "hourly" || emp === "commission" || !client.emptype;
    }
  },
  {
    id: "employment_letter",
    label: "Letter of Employment (Signed/Dated)",
    category: "Employment",
    description: "Job reference letter on company letterhead signed by HR or supervisor, stating job title, start date, salary, and guarantee of hours.",
    req: true,
    evaluate: (client) => {
      const emp = (client.emptype || "").toLowerCase();
      return emp === "salaried" || emp === "hourly" || emp === "commission" || emp === "contract" || !client.emptype;
    }
  },
  {
    id: "noa",
    label: "Notice of Assessment (NOA) - Last 2 Years",
    category: "Tax documents",
    description: "CRA (Canada Revenue Agency) Notice of Assessments showing declared income on line 15000 and zero taxes outstanding.",
    req: true,
    evaluate: (client) => {
      const emp = (client.emptype || "").toLowerCase();
      return emp === "self-employed" || emp === "commission" || emp === "contract" || emp === "retired" || emp === "salaried";
    }
  },
  {
    id: "business_license",
    label: "Business License / Articles of Incorporation",
    category: "Employment",
    description: "For self-employed applicants. Master Business License, corporate registry search, or incorporation certificates confirming active tenure.",
    req: true,
    evaluate: (client) => (client.emptype || "").toLowerCase() === "self-employed"
  },
  {
    id: "bank_statements",
    label: "90-Day Bank transaction ledger",
    category: "Banking",
    description: "Unedited 90-day statements matching the down payment account. Used to verify source of funds and rule out cash/unexplained deposits.",
    req: true,
    evaluate: () => true
  },
  {
    id: "aps",
    label: "Agreement of Purchase & Sale (APS)",
    category: "Property",
    description: "Full purchase agreement contract including schedules, signed by buyer and seller. Critical for active home acquisition files.",
    req: true,
    evaluate: (client) => (client.type || "").toLowerCase() === "purchase" || !client.type
  },
  {
    id: "mls_listing",
    label: "MLS Listing Sheet",
    category: "Property",
    description: "Multiple Listing Service (MLS) profile document showing property taxes, listing details, and heating descriptions.",
    req: false,
    evaluate: (client) => (client.type || "").toLowerCase() === "purchase"
  },
  {
    id: "mortgage_statement",
    label: "Existing Mortgage Statement",
    category: "Mortgage statements",
    description: "Most recent annual mortgage statement. Required to verify outstanding balance, interest rate, maturity date, and lender reference.",
    req: true,
    evaluate: (client) => {
      const t = (client.type || "").toLowerCase();
      return t === "refinance" || t === "renewal" || t === "heloc";
    }
  },
  {
    id: "property_tax",
    label: "Recent Property Tax Bill",
    category: "Tax documents",
    description: "Recent property tax statement verifying annual municipal charges and confirming no arrears are outstanding on title.",
    req: true,
    evaluate: (client) => {
      const t = (client.type || "").toLowerCase();
      return t === "refinance" || t === "renewal" || t === "heloc";
    }
  },
  {
    id: "co_photo_id",
    label: "Co-Applicant Govt Photo ID",
    category: "Identification",
    description: "Primary government photo ID for the secondary/joint borrower to satisfy KYC (Know Your Client) validation standards.",
    req: true,
    evaluate: (client) => !!client.co
  },
  {
    id: "co_paystubs",
    label: "Co-Applicant Paystubs (last 3)",
    category: "Income",
    description: "Most recent 3 pay stubs for the co-applicant to substantiate the combined debt-servicing capability (GDS/TDS) ratios.",
    req: true,
    evaluate: (client) => !!client.co && (client.emptype !== "self-employed")
  },
  {
    id: "void_cheque",
    label: "PAD Void Cheque",
    category: "Banking",
    description: "Pre-Authorized Debit (PAD) void check or stamped direct deposit authorization form for mortgage automatic monthly payment withdrawals.",
    req: true,
    evaluate: () => true
  }
];
