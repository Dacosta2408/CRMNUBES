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

// ==========================================
// Messages & User Access API Service Layer
// ==========================================

import { User } from "../types";
import { DEFAULT_USERS } from "../data";
import { dispatchUserEvent } from "./userUtils";
import { getUserPermissions as calculatePermissions } from "./permissions";

/**
 * Local storage / Memory adapter helper for offline/disconnected backend
 */
function getLocalRoster(): User[] {
  try {
    const saved = localStorage.getItem("gbk_roster");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_USERS;
}

function saveLocalRoster(roster: User[]): void {
  try {
    localStorage.setItem("gbk_roster", JSON.stringify(roster));
  } catch {}
}

export async function getCurrentUser(): Promise<User | null> {
  const serverUser = await safeFetchJson<User>("/api/users/me", undefined, null);
  if (serverUser) return serverUser;

  // Adapter fallback
  const roster = getLocalRoster();
  return roster[0] || DEFAULT_USERS[0];
}

export async function getActiveUsers(): Promise<User[]> {
  const serverUsers = await safeFetchJson<User[]>("/api/users/active", undefined, null);
  if (Array.isArray(serverUsers) && serverUsers.length > 0) {
    return serverUsers.filter(u => (u.status || '').toLowerCase() === 'active');
  }

  // Adapter fallback: filter active users from local roster
  const roster = getLocalRoster();
  return roster.filter(u => {
    const st = (u.status || '').toLowerCase();
    return st === 'active' || st === 'online';
  });
}
export const getActiveUsersApi = getActiveUsers;

export async function getUserById(userId: string): Promise<User | null> {
  if (!userId) return null;
  const serverUser = await safeFetchJson<User>(`/api/users/${encodeURIComponent(userId)}`, undefined, null);
  if (serverUser) return serverUser;

  // Adapter fallback
  const roster = getLocalRoster();
  return roster.find(u => u.id === userId) || null;
}

export async function createUser(userData: Partial<User>): Promise<User> {
  const timestamp = new Date().toISOString();
  const newId = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const first = userData.first || "New";
  const last = userData.last || "User";
  const fullName = userData.fullName || userData.displayName || `${first} ${last}`.trim();
  const photo = userData.profilePhotoUrl || userData.profilePhoto || userData.photo || null;

  const newUser: User = {
    id: newId,
    first,
    last,
    name: fullName,
    fullName,
    displayName: fullName,
    email: userData.email || `user_${newId}@gbkfinancial.ca`,
    role: userData.role || "Agent",
    status: userData.status || "active",
    brokerage: userData.brokerage || "GBK Financial",
    licenseNumber: userData.licenseNumber || "",
    phone: userData.phone || "(705) 555-0199",
    photo: photo,
    profilePhoto: photo,
    profilePhotoUrl: photo,
    clearanceLevel: userData.clearanceLevel || 2,
    permissions: userData.permissions,
    created: timestamp.split("T")[0],
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLogin: "Never",
    lastActive: "Just now",
    ...(userData as any)
  };

  // Try API
  const apiRes = await safeFetchJson<User>("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newUser)
  }, null);

  const finalUser = apiRes || newUser;

  // Update local adapter roster
  const roster = getLocalRoster();
  const existingIdx = roster.findIndex(u => u.id === finalUser.id);
  let updatedRoster: User[];
  if (existingIdx >= 0) {
    updatedRoster = roster.map((u, i) => i === existingIdx ? finalUser : u);
  } else {
    updatedRoster = [finalUser, ...roster];
  }
  saveLocalRoster(updatedRoster);

  // Dispatch real-time events
  dispatchUserEvent("user.created", { user: finalUser, userId: finalUser.id });
  if (finalUser.status === 'inactive' || finalUser.status === 'disabled') {
    dispatchUserEvent("user.statusChanged", { user: finalUser, userId: finalUser.id, status: finalUser.status });
  }

  return finalUser;
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
  const timestamp = new Date().toISOString();
  const current = await getUserById(userId);
  if (!current) throw new Error(`User with ID ${userId} not found.`);

  const photo = userData.profilePhotoUrl !== undefined ? userData.profilePhotoUrl : 
                userData.profilePhoto !== undefined ? userData.profilePhoto : 
                userData.photo !== undefined ? userData.photo : current.photo;

  const first = userData.first !== undefined ? userData.first : current.first;
  const last = userData.last !== undefined ? userData.last : current.last;
  const fullName = userData.fullName || userData.displayName || `${first} ${last}`.trim();

  const updatedUser: User = {
    ...current,
    ...userData,
    first,
    last,
    name: fullName,
    fullName,
    displayName: fullName,
    photo,
    profilePhoto: photo,
    profilePhotoUrl: photo,
    updatedAt: timestamp
  };

  // Try API
  const apiRes = await safeFetchJson<User>(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedUser)
  }, null);

  const finalUser = apiRes || updatedUser;

  // Update local adapter roster
  const roster = getLocalRoster();
  const updatedRoster = roster.map(u => u.id === userId ? finalUser : u);
  saveLocalRoster(updatedRoster);

  // Dispatch real-time events
  dispatchUserEvent("user.updated", { user: finalUser, userId: finalUser.id });
  if (userData.status && userData.status !== current.status) {
    dispatchUserEvent("user.statusChanged", { user: finalUser, userId: finalUser.id, status: userData.status });
  }
  if (userData.permissions || userData.clearanceLevel) {
    dispatchUserEvent("user.permissionsChanged", { user: finalUser, userId: finalUser.id });
  }
  if (photo !== current.photo) {
    dispatchUserEvent("user.profilePhotoUpdated", { user: finalUser, userId: finalUser.id, photoUrl: photo });
  }

  return finalUser;
}

export async function updateUserProfile(userId: string, profileData: Partial<User>): Promise<User> {
  return updateUser(userId, profileData);
}

export async function updateUserPhoto(userId: string, photoFileOrUrl: File | string): Promise<User> {
  let photoUrl = "";
  if (typeof photoFileOrUrl === "string") {
    photoUrl = photoFileOrUrl;
  } else {
    // Convert file to Data URL
    photoUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(photoFileOrUrl);
    });
  }

  const updated = await updateUser(userId, {
    photo: photoUrl,
    profilePhoto: photoUrl,
    profilePhotoUrl: photoUrl
  });

  dispatchUserEvent("user.profilePhotoUpdated", { user: updated, userId, photoUrl });
  return updated;
}

export async function getUserPermissions(userId: string): Promise<any> {
  const user = await getUserById(userId);
  return calculatePermissions(user);
}

export async function getAccessibleChannels(userId: string): Promise<any[] | null> {
  return safeFetchJson<any[]>(`/api/channels/accessible?userId=${encodeURIComponent(userId)}`, undefined, null);
}
export const getAccessibleChannelsApi = getAccessibleChannels;

export async function getMessages(channelId: string, cursor?: string): Promise<{ messages: any[]; nextCursor?: string } | null> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return safeFetchJson<{ messages: any[]; nextCursor?: string }>(`/api/channels/${encodeURIComponent(channelId)}/messages${query}`, undefined, null);
}

export async function sendMessage(channelId: string, content: any): Promise<{ success: boolean; message?: any } | null> {
  const body = typeof content === 'string' ? { content } : content;
  return safeFetchJson<{ success: boolean; message?: any }>(`/api/channels/${encodeURIComponent(channelId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, null);
}

export async function updateMessage(messageId: string, content: string): Promise<{ success: boolean; editedAt?: string } | null> {
  return safeFetchJson<{ success: boolean; editedAt?: string }>(`/api/messages/${encodeURIComponent(messageId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, editedAt: new Date().toISOString() })
  }, null);
}
export const updateMessageApi = updateMessage;

export async function softDeleteMessage(messageId: string, userId?: string): Promise<{ success: boolean; deletedAt?: string } | null> {
  return safeFetchJson<{ success: boolean; deletedAt?: string }>(`/api/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deletedBy: userId || 'unknown', deletedAt: new Date().toISOString() })
  }, null);
}
export const softDeleteMessageApi = softDeleteMessage;

export async function saveMessage(messageId: string, userId: string, channelId?: string): Promise<{ success: boolean } | null> {
  return safeFetchJson<{ success: boolean }>(`/api/messages/${encodeURIComponent(messageId)}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, channelId: channelId || '', savedAt: new Date().toISOString() })
  }, null);
}
export const saveMessageApi = saveMessage;

export async function unsaveMessage(messageId: string, userId: string): Promise<{ success: boolean } | null> {
  return safeFetchJson<{ success: boolean }>(`/api/messages/${encodeURIComponent(messageId)}/save`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId })
  }, null);
}
export const unsaveMessageApi = unsaveMessage;

export async function markChannelRead(channelId: string, userId: string): Promise<{ success: boolean } | null> {
  return safeFetchJson<{ success: boolean }>(`/api/channels/${encodeURIComponent(channelId)}/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, readAt: new Date().toISOString() })
  }, null);
}

export async function searchMessages(params: {
  query?: string;
  sender?: string;
  startDate?: string;
  endDate?: string;
  hasAttachments?: boolean;
  isSaved?: boolean;
  channelId?: string;
  userId?: string;
}): Promise<any[] | null> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.set("q", params.query);
  if (params.sender) queryParams.set("sender", params.sender);
  if (params.startDate) queryParams.set("startDate", params.startDate);
  if (params.endDate) queryParams.set("endDate", params.endDate);
  if (params.hasAttachments) queryParams.set("hasAttachments", "true");
  if (params.isSaved) queryParams.set("isSaved", "true");
  if (params.channelId) queryParams.set("channelId", params.channelId);
  if (params.userId) queryParams.set("userId", params.userId);

  return safeFetchJson<any[]>(`/api/messages/search?${queryParams.toString()}`, undefined, null);
}

export async function getSavedMessagesApi(userId: string): Promise<any[] | null> {
  return safeFetchJson<any[]>(`/api/users/${encodeURIComponent(userId)}/saved-messages`, undefined, null);
}

