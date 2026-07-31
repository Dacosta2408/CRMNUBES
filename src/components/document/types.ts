import { Client } from "../../types";

export interface DocVersion {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
  path: string;
}

export interface EnhancedDocState {
  id: string; // matches checklist item id
  clientId: string;
  status: 'required' | 'requested' | 'received' | 'under_review' | 'approved' | 'rejected' | 'missing_pages' | 'expired' | 'follow_up' | 'waived' | 'na';
  notes?: string;
  expiryDate?: string;
  requestDate?: string;
  dueDate?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewHistory?: Array<{
    date: string;
    user: string;
    status: string;
    notes: string;
  }>;
  files: DocVersion[];
  warningTag?: 'expires_soon' | 'expired' | 'stale' | 'needs_refresh' | null;
  label?: string;
  category?: string;
  description?: string;
  isCustom?: boolean;
}

export interface DocumentRequest {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  category: string;
  dateRequested: string;
  dueDate: string;
  assignedBroker: string;
  status: 'pending' | 'received' | 'overdue' | 'cancelled';
  notes?: string;
}

export interface DocActivityLog {
  id: string;
  clientId: string;
  clientName: string;
  docId: string;
  docName: string;
  action: string; // "requested" | "uploaded" | "reviewed" | "status_changed" | "expiry_updated" | "deleted" | "version_added"
  user: string;
  timestamp: string;
  details: string;
}

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  category: string;
  description: string;
  req: boolean;
  evaluate: (client: Client) => boolean;
}
