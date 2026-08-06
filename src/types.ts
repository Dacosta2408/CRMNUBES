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
  closingDate?: string;
  notes?: string;
  stage?: string;
  rate?: string | number;
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
  type: 'client' | 'lender' | 'meeting' | 'personal' | 'holiday' | 'birthday' | 'doc_review' | 'follow_up' | 'rate_lock' | string;
  reminder?: string;
  clientId?: string | null;
  notes?: string;
  createdBy: string;
  status?: string;
  isPrivate?: boolean;
  duration?: number;
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
  isPreferred?: boolean;
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

export type PermissionLevel = 'none' | 'view' | 'create' | 'edit' | 'delete' | 'manage';

export interface ModulePermissions {
  dashboard: PermissionLevel;
  clients: PermissionLevel;
  pipeline: PermissionLevel;
  tasks: PermissionLevel;
  messages: PermissionLevel;
  email: PermissionLevel;
  calendar: PermissionLevel;
  documents: PermissionLevel;
  lenderSheets: PermissionLevel;
  partners: PermissionLevel;
  calculators: PermissionLevel;
  reports: PermissionLevel;
  aiAssistant: PermissionLevel;
  adminPanel: PermissionLevel;
  userManagement: PermissionLevel;
  exportData: boolean;
}

export interface OnboardingTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  required: boolean;
}

export interface ClearanceLevel {
  level: number;
  name: string;
  description: string;
  defaultModules: ModulePermissions;
}

export interface ClearanceMatrix {
  levels: ClearanceLevel[];
  modules: string[];
  permissions: Record<string, Record<string, PermissionLevel>>;
}

export interface User {
  id: string;
  name?: string;
  fullName?: string;
  first: string;
  last: string;
  email: string;
  role: 'Developer/Admin' | 'Admin' | 'Broker' | 'Agent' | 'Assistant' | string;
  status: 'active' | 'inactive' | 'pending' | 'Active' | 'Inactive' | 'Pending' | string;
  brokerage?: string;
  licenseNumber?: string;
  phone?: string;
  photo?: string | null;
  profilePhoto?: string | null;
  profilePhotoUrl?: string | null;
  pin?: string;
  pinHash?: string;
  lastLogin: string;
  lastActive?: string;
  created: string;
  createdAt?: string;
  updatedAt?: string;
  isOwner?: boolean;
  fsraNum?: string;
  fsraExpiry?: string;
  eoInsurer?: string;
  eoPolicy?: string;
  eoExpiry?: string;
  docsStatus?: string;
  clearanceLevel?: number; // 1-6
  permissions?: Partial<ModulePermissions>;
  specialPermissions?: Record<string, boolean>;
  permOverrides?: Record<string, boolean | string>;
  modulePermissions?: Record<string, string>;
  reportingTo?: string; // manager user ID or name
  onboardingCompleted?: boolean;
  onboardingTasks?: OnboardingTask[];
  onboardingStartDate?: string;
  probationPeriodDays?: number;
  mentorId?: string;
  commissionRate?: string;
  territory?: string;
  brokerTier?: string;
  adminNotes?: string;
  emailHost?: string;
  emailPort?: string;
  emailPassword?: string;
  emailUsername?: string;
  displayName?: string;
  jobTitle?: string;
  tags?: string[];
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

export type PlatformType = 'mac' | 'windows' | 'linux';

export type ShortcutCategory = 'Navigation' | 'Actions' | 'Application';

export interface Shortcut {
  id: string;
  keys: string[]; // e.g. ["Ctrl", "K"] or ["Cmd", "K"]
  macKeys?: string[]; // e.g. ["⌘", "K"]
  winKeys?: string[]; // e.g. ["Ctrl", "K"]
  description: string;
  category: ShortcutCategory;
  actionName?: string;
}

export interface MessageAttachment {
  name: string;
  size: string;
  type: string;
  url?: string;
}

export interface Message {
  id: string;
  channelId?: string;
  senderId?: string;
  authorId?: string;
  author: string;
  authorName?: string;
  authorAvatar?: string;
  initials?: string;
  role: string;
  senderChatColor?: string;
  content?: string;
  text: string;
  time: string;
  date: string;
  createdAt?: string;
  editedAt?: string;
  deletedAt?: string;
  deletedBy?: string;
  replyToId?: string;
  replies?: Message[];
  replyCount?: number;
  threadId?: string;
  status?: 'sending' | 'sent' | 'failed';
  clientTag?: string;
  clientId?: string;
  priority?: "urgent" | "blocked" | "lender_pending" | "client_pending" | "compliance" | "normal";
  pinned?: boolean;
  attachments?: MessageAttachment[];
  mentions?: string[];
  readBy?: string[];
  reactions?: Record<string, string[]>;
}

export interface ChannelInfo {
  id: string;
  name: string;
  description?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  lastMessage?: string;
  lastActivityAt?: string;
  unreadCount?: number;
  role?: string;
  status?: string;
  statusLabel?: string;
  color?: string;
  chatColor?: string;
  avatar?: string | null;
}

export interface SavedMessage {
  id: string;
  messageId: string;
  channelId: string;
  userId: string;
  savedAt: string;
}

export type MessageAction = 'edit' | 'delete' | 'save' | 'unsave' | 'reply';

export interface MessagePermission {
  canAccess?: boolean;
  canSend?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSave: boolean;
  canViewAttachment?: boolean;
}


