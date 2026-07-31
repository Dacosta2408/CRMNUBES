/**
 * GBK CRM Frontend API Client
 * Provides structured, typed access to local PostgreSQL backend service API endpoints
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

// Check backend health and PostgreSQL connection
export async function fetchApiHealth(): Promise<ApiHealthResponse | null> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Backend API /api/health check failed:", err);
    return null;
  }
}

// User Settings API
export async function fetchUserSettings(userId: string): Promise<UserSettingsDto | null> {
  try {
    const res = await fetch(`/api/settings/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Failed to fetch settings for user ${userId}:`, err);
    return null;
  }
}

export async function updateUserSettingsApi(userId: string, settings: Partial<UserSettingsDto>): Promise<UserSettingsDto | null> {
  try {
    const res = await fetch(`/api/settings/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Failed to update settings for user ${userId}:`, err);
    return null;
  }
}

// Clients API
export async function fetchClientsApi(): Promise<any[] | null> {
  try {
    const res = await fetch("/api/clients");
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch clients from API:", err);
    return null;
  }
}

export async function createClientApi(clientData: any): Promise<any | null> {
  try {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Failed to create client via API:", err);
    return null;
  }
}

export async function updateClientApi(id: string, updates: any): Promise<any | null> {
  try {
    const res = await fetch(`/api/clients/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Failed to update client ${id} via API:`, err);
    return null;
  }
}

// Tasks API
export async function fetchTasksApi(): Promise<any[] | null> {
  try {
    const res = await fetch("/api/tasks");
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch tasks from API:", err);
    return null;
  }
}

export async function createTaskApi(taskData: any): Promise<any | null> {
  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Failed to create task via API:", err);
    return null;
  }
}

export async function updateTaskApi(id: string, updates: any): Promise<any | null> {
  try {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Failed to update task ${id} via API:`, err);
    return null;
  }
}

// Audit Logs API
export async function fetchAuditLogsApi(): Promise<any[] | null> {
  try {
    const res = await fetch("/api/audit-logs");
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch audit logs from API:", err);
    return null;
  }
}

// AI Service API
export async function summarizeClientApi(clientData: any): Promise<string | null> {
  try {
    const res = await fetch("/api/ai/summarize-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientData })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.summary;
  } catch (err) {
    console.warn("AI summarize client request failed:", err);
    return null;
  }
}

export async function generateNoteApi(purpose: string, clientName: string, details?: string): Promise<string | null> {
  try {
    const res = await fetch("/api/ai/generate-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, clientName, details })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.draft;
  } catch (err) {
    console.warn("AI generate note request failed:", err);
    return null;
  }
}
