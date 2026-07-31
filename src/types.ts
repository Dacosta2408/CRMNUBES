export interface Client {
  id: string;
  first: string;
  last: string;
  email: string;
  cell?: string;
  dob?: string;
  marital?: string;
  sin?: string;
  dep?: number | string;
  co?: string;
  coEmail?: string;
  income?: string | number;
  coIncome?: string | number;
  emptype?: string;
  beacon?: number | string;
  propval?: string | number;
  mtgamt?: string | number;
  debts?: string | number;
  tax?: string | number;
  condo?: string | number;
  heat?: string | number;
  addr?: string;
  proptype?: string;
  tenure?: string;
  lender?: string;
  source?: string;
  status: 'lead' | 'open' | 'working' | 'lender' | 'conditional' | 'approved' | 'funded' | 'closed';
  createdAt: string;
  updatedAt: string;
  fundedDate?: string;
  maturityDate?: string;
  referredBy?: string; // id of Partner
  appData?: Record<string, any>;
  aiSummary?: string;
  // Retention Fields (7.2)
  assignedBroker?: string;
  /** @deprecated Use assignedBroker instead */
  assignedTo?: string;
  /** @deprecated Use assignedBroker instead */
  retentionOwner?: string;
  lastContactedDate?: string;
  nextFollowUpDate?: string;
  retentionOutcome?: string;
  retentionNotes?: string;
  mortgageTerm?: string;          // e.g. "1", "2", "3", "5" (years as a string)
  renewalNotified?: string;       // ISO date string — last time a renewal outreach was logged
  birthdayAcknowledged?: string;  // ISO year-string e.g. "2026" — tracks if birthday was acknowledged this calendar year
  /** @deprecated Use assignedBroker instead */
  agent?: string;
  type?: string;
  purchasePrice?: string | number;
  mortgageAmount?: string | number;
  calcSnapshot?: {
    savedAt: string;
    stressTest?: {
      stressRate: number;
      maxQualifiedMortgage: number;
      maxPurchasePrice: number;
      estPaymentAtContract: number;
      income: number;
    };
    paymentCalc?: {
      loanAmount: number;
      rate: number;
      amortization: number;
      frequency: string;
      monthly: number;
      biweekly: number;
      accelBiweekly: number;
      totalInterest: number;
    };
    gdsTds?: {
      gds: number;
      tds: number;
      passed: boolean;
      income: number;
      payment: number;
    };
    cmhc?: {
      purchasePrice: number;
      downPayment: number;
      downPct: number;
      ltvRatio: number;
      premiumPct: number;
      premiumAmount: number;
      totalMortgage: number;
      warning?: string | null;
    };
    hourlyAnnual?: number;
    seAverage?: number;
    notes?: string;
  };
}

export interface Note {
  text: string;
  author: string;
  time: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'open' | 'done';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  clientId?: string;
  clientName?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  completedAt?: string | null;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'client' | 'lender' | 'meeting' | 'personal' | 'holiday' | 'birthday';
  reminder?: string;
  clientId?: string | null;
  notes?: string;
  createdBy: string;
}

export interface Email {
  id: string;
  from?: string;
  fromEmail?: string;
  to?: string;
  toEmail?: string;
  subject?: string;
  body?: string;
  preview?: string;
  time?: string;
  date?: string;
  unread: boolean;
  clientMatch?: string | null;
  scheduledFor?: string;
  clientId?: string;
  starred?: boolean;
  attachments?: Array<{
    id?: string;
    label?: string;
    name?: string;
    filename?: string;
    size?: string;
    extCode?: string;
    url?: string;
  }>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  desc: string;
  subject: string;
  body: string;
}

export interface PartnerTimelineEntry {
  id: string;
  date: string;
  type: 'call' | 'coffee' | 'rate_update' | 'birthday_holiday' | 'referral_received' | 'thank_you' | 'event_invite' | 'compliance' | 'co_marketing' | 'note';
  text: string;
  author: string;
}

export interface Partner {
  id: string;
  first: string;
  last: string;
  company?: string;
  type: 'Realtor' | 'Lawyer' | 'Accountant' | 'Financial' | 'Inspector' | 'Insurance' | 'Builder' | 'Other' | string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  addedAt: string;
  addedBy: string;
  
  // Extended fields for relationship management (6.3)
  role?: string;
  address?: string;
  preferredComm?: 'email' | 'phone' | 'sms' | 'meeting' | string;
  source?: string;
  assignedOwner?: string;
  status?: 'active' | 'warm' | 'dormant' | 'strategic' | 'inactive' | 'Active' | 'Preferred' | 'Occasional' | 'Inactive';
  personalityNotes?: string;
  referralTags?: string[];
  lastTouchDate?: string;
  nextTouchDate?: string;
  healthScore?: number; // 0-100 score
  timeline?: PartnerTimelineEntry[];
}

export interface Post {
  id: string;
  content: string;
  hashtags: string;
  platforms: string[];
  topic: string;
  tone: string;
  status: 'pending' | 'approved' | 'draft' | 'posted';
  scheduledFor?: string | null;
  createdBy: string;
  createdAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  postedAt?: string | null;
  reach?: number | null;
  engagement?: number | null;
}

export interface Lender {
  name: string;
  tier: 'A' | 'CU' | 'B' | 'P';
  rate?: string | number;
  bdm?: string;
  phone?: string;
  email?: string;
  products?: string;
  notes?: string;
}

export interface User {
  id: string;
  first: string;
  last: string;
  email: string;
  role: 'Developer/Admin' | 'Admin' | 'Broker';
  status: 'active' | 'inactive';
  phone?: string;
  photo?: string | null;
  pin?: string;
  pinHash?: string;
  lastLogin: string;
  created: string;
  isOwner?: boolean;
  fsraNum?: string;
  fsraExpiry?: string;
  eoInsurer?: string;
  eoPolicy?: string;
  eoExpiry?: string;
  docsStatus?: string;
  permOverrides?: Record<string, boolean>;
  emailHost?: string;
  emailPort?: string;
  emailPassword?: string;
  emailUsername?: string;
  displayName?: string;
  jobTitle?: string;
}

export interface ComplianceItem {
  status: 'pending' | 'complete' | 'na';
  date?: string | null;
  notes?: string;
}

export interface DocStatus {
  status: 'required' | 'requested' | 'received' | 'verified' | 'na' | 'waived';
  path?: string;
  notes?: string;
  receivedAt?: string | null;
}
