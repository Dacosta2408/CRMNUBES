/**
 * GBK CRM Frontend API Client
 * Provides structured, typed access to backend service API endpoints
 */

export interface ApiHealthResponse {
  status: string;
  server: string;
  timestamp: string;
  database: {
    connected: boolean;
    message: string;
    database?: string;
  };
  environment: string;
}

export interface UserSettingsDto {
  id?: string;
  user_id: string;
  theme: "dark" | "light";
  timezone: string;
  date_format: string;
  time_format: string;
  default_landing_page: string;
  notifications_enabled: boolean;
  auto_lock_minutes: number;
  audit_logging_enabled: boolean;
  updated_at?: string;
}

/**
 * Helper to safely fetch and parse JSON from API endpoints
 */
async function safeFetchJson<T>(url: string, options?: RequestInit, fallback: T = null as any): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return fallback;
    const text = await res.text();
    if (!text || !text.trim()) return fallback;
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return fallback;
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
}

// Check backend health and database connection
export async function fetchApiHealth(): Promise<ApiHealthResponse | null> {
  return safeFetchJson<ApiHealthResponse>("/api/health", undefined, null);
}

// User Settings API
export async function fetchUserSettings(userId: string): Promise<UserSettingsDto | null> {
  return safeFetchJson<UserSettingsDto>(`/api/settings/${encodeURIComponent(userId)}`, undefined, null);
}

export async function updateUserSettingsApi(userId: string, settings: Partial<UserSettingsDto>): Promise<UserSettingsDto | null> {
  return safeFetchJson<UserSettingsDto>(`/api/settings/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  }, null);
}

// Clients API
export async function fetchClientsApi(): Promise<any[] | null> {
  return safeFetchJson<any[]>("/api/clients", undefined, null);
}

export async function createClientApi(clientData: any): Promise<any | null> {
  return safeFetchJson<any>("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientData)
  }, null);
}

export async function updateClientApi(id: string, updates: any): Promise<any | null> {
  return safeFetchJson<any>(`/api/clients/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  }, null);
}

// Tasks API
export async function fetchTasksApi(): Promise<any[] | null> {
  return safeFetchJson<any[]>("/api/tasks", undefined, null);
}

export async function createTaskApi(taskData: any): Promise<any | null> {
  return safeFetchJson<any>("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(taskData)
  }, null);
}

export async function updateTaskApi(id: string, updates: any): Promise<any | null> {
  return safeFetchJson<any>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  }, null);
}

// Audit Logs API
export async function fetchAuditLogsApi(): Promise<any[] | null> {
  return safeFetchJson<any[]>("/api/audit-logs", undefined, null);
}

// AI Service API
export async function summarizeClientApi(clientData: any): Promise<string | null> {
  const data = await safeFetchJson<{ summary?: string }>("/api/ai/summarize-client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientData })
  }, null);
  return data?.summary || null;
}

export async function generateNoteApi(purpose: string, clientName: string, details?: string): Promise<string | null> {
  const data = await safeFetchJson<{ draft?: string }>("/api/ai/generate-note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, clientName, details })
  }, null);
  return data?.draft || null;
}
