export type UserRole = "Broker" | "Underwriter" | "Administrator" | "Admin" | "Developer/Admin" | "Agent" | "Compliance Manager";

export interface UserEntity {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: string;
  avatar_url?: string;
  timezone: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsEntity {
  id: string;
  user_id: string;
  theme: "dark" | "light";
  timezone: string;
  date_format: string;
  time_format: string;
  default_landing_page: string;
  notifications_enabled: boolean;
  auto_lock_minutes: number;
  audit_logging_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientEntity {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: string;
  stage?: string;
  assigned_to?: string;
  retention_owner?: string;
  referred_by?: string;
  lender?: string;
  source?: string;
  loan_amount?: number;
  property_value?: number;
  interest_rate?: number;
  beacon_score?: number;
  maturity_date?: string;
  notes?: string;
  retention_notes?: string;
  raw_data?: any;
  created_at: string;
  updated_at: string;
}

export interface ClientNoteEntity {
  id: string;
  client_id: string;
  author_id?: string;
  author_name: string;
  note_type: "internal" | "call" | "email" | "compliance" | "ai_summary";
  content: string;
  created_at: string;
}

export interface TaskEntity {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  related_client_id?: string;
  due_at?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  category?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EventEntity {
  id: string;
  title: string;
  description?: string;
  event_at: string;
  related_client_id?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerEntity {
  id: string;
  name: string;
  category: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  notes?: string;
  rating?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntity {
  id: string;
  user_id?: string;
  user_name: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface DocumentEntity {
  id: string;
  client_id: string;
  name: string;
  category: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  status: string;
  notes?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RenewalEntity {
  id: string;
  client_id: string;
  lender_name: string;
  current_rate?: number;
  maturity_date: string;
  loan_balance?: number;
  status: string;
  assigned_broker_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
