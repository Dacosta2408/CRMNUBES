import { ClearanceLevel, ModulePermissions, PermissionLevel } from "../types";

export const DEFAULT_MODULE_KEYS = [
  { key: "dashboard", name: "Operations Dashboard", description: "Brokerage stats, tasks, and system overview" },
  { key: "clients", name: "Client Database & Borrower SIN", description: "Borrower records, credit ratings, financial details" },
  { key: "pipeline", name: "Underwriting Pipeline", description: "Mortgage loan stages from intake to funded" },
  { key: "tasks", name: "Task Management", description: "Underwriting checklist and team action items" },
  { key: "messages", name: "Team Chat & Workspace", description: "Internal channels and real-time chat" },
  { key: "email", name: "Connected Email Workspace", description: "Client emails, IMAP/SMTP synchronization" },
  { key: "calendar", name: "Events & Deadlines Calendar", description: "Loan commitment dates, maturity trackers" },
  { key: "documents", name: "Secure Document Vault", description: "Legal docs, income verifications, tax stubs" },
  { key: "lenderSheets", name: "Lender Rate Sheets", description: "Lender matrices, rate calculators, guidelines" },
  { key: "partners", name: "Partners & Referral Directory", description: "Real estate agents, lawyers, appraisers" },
  { key: "calculators", name: "Mortgage Calculators", description: "GDS/TDS stress test & qualifying calculators" },
  { key: "reports", name: "Analytics & KPI Reports", description: "Brokerage performance, conversion rates, audit logs" },
  { key: "aiAssistant", name: "AI Intake & Document Processing", description: "Gemini document OCR and underwriting assistance" },
  { key: "adminPanel", name: "Admin Control Center", description: "System administration and security settings" },
  { key: "userManagement", name: "User Management & Roster", description: "Manage staff accounts, roles, clearance levels" }
];

export const DEFAULT_CLEARANCE_LEVELS: ClearanceLevel[] = [
  {
    level: 1,
    name: "Level 1 - View Only",
    description: "Read-only access to standard CRM views. Cannot edit or delete records.",
    defaultModules: {
      dashboard: "view",
      clients: "view",
      pipeline: "view",
      tasks: "view",
      messages: "view",
      email: "view",
      calendar: "view",
      documents: "view",
      lenderSheets: "view",
      partners: "view",
      calculators: "view",
      reports: "none",
      aiAssistant: "none",
      adminPanel: "none",
      userManagement: "none",
      exportData: false
    }
  },
  {
    level: 2,
    name: "Level 2 - Basic User",
    description: "Standard agent access. Can create and edit own clients and pipeline deals.",
    defaultModules: {
      dashboard: "view",
      clients: "edit",
      pipeline: "edit",
      tasks: "edit",
      messages: "edit",
      email: "edit",
      calendar: "edit",
      documents: "edit",
      lenderSheets: "view",
      partners: "view",
      calculators: "edit",
      reports: "none",
      aiAssistant: "view",
      adminPanel: "none",
      userManagement: "none",
      exportData: false
    }
  },
  {
    level: 3,
    name: "Level 3 - Power User",
    description: "Experienced agent / broker. Access to AI intake tools and advanced reporting.",
    defaultModules: {
      dashboard: "manage",
      clients: "manage",
      pipeline: "manage",
      tasks: "manage",
      messages: "manage",
      email: "manage",
      calendar: "manage",
      documents: "manage",
      lenderSheets: "edit",
      partners: "edit",
      calculators: "manage",
      reports: "view",
      aiAssistant: "manage",
      adminPanel: "none",
      userManagement: "none",
      exportData: true
    }
  },
  {
    level: 4,
    name: "Level 4 - Manager",
    description: "Managing broker / team lead. Can view team reports, assign leads, manage agents.",
    defaultModules: {
      dashboard: "manage",
      clients: "manage",
      pipeline: "manage",
      tasks: "manage",
      messages: "manage",
      email: "manage",
      calendar: "manage",
      documents: "manage",
      lenderSheets: "manage",
      partners: "manage",
      calculators: "manage",
      reports: "manage",
      aiAssistant: "manage",
      adminPanel: "none",
      userManagement: "view",
      exportData: true
    }
  },
  {
    level: 5,
    name: "Level 5 - Admin",
    description: "Full administrative control over user roster, permissions, and system settings.",
    defaultModules: {
      dashboard: "manage",
      clients: "manage",
      pipeline: "manage",
      tasks: "manage",
      messages: "manage",
      email: "manage",
      calendar: "manage",
      documents: "manage",
      lenderSheets: "manage",
      partners: "manage",
      calculators: "manage",
      reports: "manage",
      aiAssistant: "manage",
      adminPanel: "manage",
      userManagement: "manage",
      exportData: true
    }
  },
  {
    level: 6,
    name: "Level 6 - Super Admin",
    description: "Unrestricted master access including system architecture, security logs, and developer options.",
    defaultModules: {
      dashboard: "manage",
      clients: "manage",
      pipeline: "manage",
      tasks: "manage",
      messages: "manage",
      email: "manage",
      calendar: "manage",
      documents: "manage",
      lenderSheets: "manage",
      partners: "manage",
      calculators: "manage",
      reports: "manage",
      aiAssistant: "manage",
      adminPanel: "manage",
      userManagement: "manage",
      exportData: true
    }
  }
];

export const ROLE_PRESETS: Record<string, { clearanceLevel: number; description: string }> = {
  "New Agent": { clearanceLevel: 1, description: "Level 1 - View Only during initial onboarding" },
  "Experienced Agent": { clearanceLevel: 2, description: "Level 2 - Basic User for standard deal creation" },
  "Broker": { clearanceLevel: 3, description: "Level 3 - Power User with AI processing and export rights" },
  "Admin Assistant": { clearanceLevel: 2, description: "Level 2 - Basic User with document processing rights" },
  "Admin": { clearanceLevel: 5, description: "Level 5 - Admin with full user roster and system management" },
  "Developer": { clearanceLevel: 6, description: "Level 6 - Super Admin with full developer clearance" }
};
