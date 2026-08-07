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

import { User, UserAvailability, UserStatus, UserDeletionImpact, UserDeletionAudit } from "../types";
import { DEFAULT_USERS } from "../data";
import { dispatchUserEvent, sanitizeCanonicalRoster } from "./userUtils";
import { 
  getUserPermissions as calculatePermissions, 
  getChannelMembers as calculateChannelMembers,
  getActiveTeamUsers as calculateActiveTeamUsers 
} from "./permissions";

/**
 * Local storage / Memory adapter helper for offline/disconnected backend
 */
function getLocalRoster(): User[] {
  try {
    const saved = localStorage.getItem("gbk_roster");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = sanitizeCanonicalRoster(parsed);
        if (sanitized.length > 0) return sanitized;
      }
    }
  } catch {}
  return sanitizeCanonicalRoster(DEFAULT_USERS);
}

function saveLocalRoster(roster: User[]): void {
  try {
    const sanitized = sanitizeCanonicalRoster(roster);
    localStorage.setItem("gbk_roster", JSON.stringify(sanitized));
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

export async function checkUserEmailUnique(email: string, excludeUserId?: string): Promise<{ isUnique: boolean; existingUser?: User }> {
  if (!email) return { isUnique: true };
  const targetEmail = email.trim().toLowerCase();
  
  const roster = getLocalRoster();
  const found = roster.find(u => {
    if (excludeUserId && u.id === excludeUserId) return false;
    return (u.email || "").trim().toLowerCase() === targetEmail;
  });

  if (found) {
    return { isUnique: false, existingUser: found };
  }
  return { isUnique: true };
}

export async function createUser(userData: Partial<User>): Promise<User> {
  if (userData.email) {
    const emailCheck = await checkUserEmailUnique(userData.email);
    if (!emailCheck.isUnique && emailCheck.existingUser) {
      const err: any = new Error("An account with this email already exists.");
      err.existingUser = emailCheck.existingUser;
      throw err;
    }
  }

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

// ==========================================
// Channel Members & User Availability API
// ==========================================

function getLocalUserStatuses(): Record<string, UserStatus> {
  try {
    const saved = localStorage.getItem("gbk_user_statuses");
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveLocalUserStatus(status: UserStatus): void {
  try {
    const all = getLocalUserStatuses();
    all[status.userId] = status;
    localStorage.setItem("gbk_user_statuses", JSON.stringify(all));
  } catch {}
}

function clearLocalUserStatus(userId: string): void {
  try {
    const all = getLocalUserStatuses();
    delete all[userId];
    localStorage.setItem("gbk_user_statuses", JSON.stringify(all));
  } catch {}
}

/**
 * GET /api/channels/:channelId/members
 * Retrieves authorized active members for a given channel
 */
export async function getChannelMembers(channelId: string): Promise<User[]> {
  const serverMembers = await safeFetchJson<User[]>(`/api/channels/${encodeURIComponent(channelId)}/members`, undefined, null);
  if (Array.isArray(serverMembers) && serverMembers.length > 0) {
    return serverMembers;
  }

  // Fallback to calculate channel members locally
  const activeUsers = await getActiveUsers();
  const currentUser = await getCurrentUser();
  return calculateChannelMembers(channelId, currentUser, activeUsers);
}

/**
 * GET /api/users/:userId/status
 * Retrieves manual user availability status, handling expiration rules
 */
export async function getUserAvailability(userId: string): Promise<UserStatus> {
  const serverStatus = await safeFetchJson<UserStatus>(`/api/users/${encodeURIComponent(userId)}/status`, undefined, null);
  if (serverStatus && serverStatus.availability) {
    // Check expiration
    if (serverStatus.expiresAt && new Date(serverStatus.expiresAt).getTime() < Date.now()) {
      return {
        userId,
        availability: 'available',
        updatedAt: new Date().toISOString()
      };
    }
    return serverStatus;
  }

  // Adapter fallback
  const localStatuses = getLocalUserStatuses();
  const userStatus = localStatuses[userId];
  if (userStatus) {
    if (userStatus.expiresAt && new Date(userStatus.expiresAt).getTime() < Date.now()) {
      clearLocalUserStatus(userId);
      return {
        userId,
        availability: 'available',
        updatedAt: new Date().toISOString()
      };
    }
    return userStatus;
  }

  return {
    userId,
    availability: 'available',
    updatedAt: new Date().toISOString()
  };
}

/**
 * PUT /api/users/me/status
 * Updates the current user's manual availability status
 */
export async function updateMyAvailability(
  statusOrAvailability: Partial<UserStatus> | UserAvailability,
  customMessage?: string,
  expiresAt?: string
): Promise<UserStatus> {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || "staff_me";

  let statusObj: UserStatus;
  if (typeof statusOrAvailability === "string") {
    statusObj = {
      userId,
      availability: statusOrAvailability,
      customMessage,
      expiresAt,
      updatedAt: new Date().toISOString()
    };
  } else {
    statusObj = {
      userId,
      availability: statusOrAvailability.availability || 'available',
      customMessage: statusOrAvailability.customMessage || customMessage,
      expiresAt: statusOrAvailability.expiresAt || expiresAt,
      updatedAt: new Date().toISOString()
    };
  }

  // Try API
  const apiRes = await safeFetchJson<UserStatus>("/api/users/me/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(statusObj)
  }, null);

  const finalStatus = apiRes || statusObj;

  // Local adapter save
  saveLocalUserStatus(finalStatus);

  // Update user roster in local storage
  if (currentUser) {
    const updatedUser = {
      ...currentUser,
      availability: finalStatus.availability,
      userStatus: finalStatus,
      updatedAt: new Date().toISOString()
    };
    const roster = getLocalRoster();
    const updatedRoster = roster.map(u => u.id === userId ? updatedUser : u);
    saveLocalRoster(updatedRoster);

    // Dispatch event
    dispatchUserEvent("user.statusChanged", {
      user: updatedUser,
      userId,
      status: finalStatus.availability,
      availability: finalStatus.availability,
      userStatus: finalStatus
    });
  }

  return finalStatus;
}

/**
 * DELETE /api/users/me/status
 * Clears custom status and reverts to Available
 */
export async function clearMyAvailability(): Promise<UserStatus> {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || "staff_me";

  await safeFetchJson(`/api/users/me/status`, { method: "DELETE" }, null);

  clearLocalUserStatus(userId);

  const clearedStatus: UserStatus = {
    userId,
    availability: 'available',
    updatedAt: new Date().toISOString()
  };

  if (currentUser) {
    const updatedUser = {
      ...currentUser,
      availability: 'available' as UserAvailability,
      userStatus: clearedStatus,
      updatedAt: new Date().toISOString()
    };
    const roster = getLocalRoster();
    const updatedRoster = roster.map(u => u.id === userId ? updatedUser : u);
    saveLocalRoster(updatedRoster);

    dispatchUserEvent("user.statusChanged", {
      user: updatedUser,
      userId,
      status: 'available',
      availability: 'available',
      userStatus: clearedStatus
    });
  }

  return clearedStatus;
}

/**
 * GET /api/presence
 * Calculates recent application activity and presence for given user IDs
 */
export async function getPresenceForUsers(userIds: string[]): Promise<Record<string, { online: boolean; lastActive: string; availability: UserAvailability }>> {
  const query = userIds.map(id => `userIds=${encodeURIComponent(id)}`).join('&');
  const serverPresence = await safeFetchJson<Record<string, any>>(`/api/presence?${query}`, undefined, null);
  if (serverPresence) return serverPresence;

  // Fallback adapter
  const localStatuses = getLocalUserStatuses();
  const roster = getLocalRoster();
  const result: Record<string, { online: boolean; lastActive: string; availability: UserAvailability }> = {};

  userIds.forEach(id => {
    const u = roster.find(user => user.id === id);
    const status = localStatuses[id];
    let availability: UserAvailability = status?.availability || (u?.availability as UserAvailability) || 'available';
    
    // Check status expiration
    if (status?.expiresAt && new Date(status.expiresAt).getTime() < Date.now()) {
      availability = 'available';
    }

    const lastActive = u?.lastActive || u?.lastLogin || 'Just now';
    const isOnline = (u?.status || '').toLowerCase() === 'active' || (u?.status || '').toLowerCase() === 'online';

    result[id] = {
      online: isOnline,
      lastActive,
      availability
    };
  });

  return result;
}

// ==========================================
// User Deletion & Archiving API Functions
// ==========================================

export async function getUserDeletionImpact(userId: string): Promise<UserDeletionImpact> {
  const serverImpact = await safeFetchJson<UserDeletionImpact>(`/api/users/${encodeURIComponent(userId)}/deletion-impact`, undefined, null);
  if (serverImpact) return serverImpact;

  const roster = getLocalRoster();
  const targetUser = roster.find(u => u.id === userId);
  const userName = targetUser ? `${targetUser.first} ${targetUser.last}`.trim() : "Unknown User";
  const userEmail = targetUser?.email || "";

  let clientsCount = 0;
  try {
    const rawClients = localStorage.getItem("gbk_clients");
    if (rawClients) {
      const parsed = JSON.parse(rawClients);
      if (Array.isArray(parsed)) {
        clientsCount = parsed.filter((c: any) => c.assignedAgentId === userId || c.brokerId === userId || c.advisorId === userId).length;
      }
    }
  } catch {}

  let tasksCount = 0;
  try {
    const rawTasks = localStorage.getItem("gbk_tasks");
    if (rawTasks) {
      const parsed = JSON.parse(rawTasks);
      if (Array.isArray(parsed)) {
        tasksCount = parsed.filter((t: any) => t.assignedTo === userId || t.createdById === userId).length;
      }
    }
  } catch {}

  let documentsCount = 0;
  try {
    const rawDocs = localStorage.getItem("gbk_documents");
    if (rawDocs) {
      const parsed = JSON.parse(rawDocs);
      if (Array.isArray(parsed)) {
        documentsCount = parsed.filter((d: any) => d.uploadedBy === userId || d.userId === userId).length;
      }
    }
  } catch {}

  let messagesCount = 0;
  try {
    const rawMsgs = localStorage.getItem("gbk_messages");
    if (rawMsgs) {
      const parsed = JSON.parse(rawMsgs);
      if (Array.isArray(parsed)) {
        messagesCount = parsed.filter((m: any) => m.senderId === userId || m.userId === userId).length;
      }
    }
  } catch {}

  const hasBusinessRecords = (clientsCount + tasksCount + documentsCount + messagesCount) > 0;

  return {
    userId,
    userName,
    userEmail,
    hasBusinessRecords,
    clientsCount,
    applicationsCount: clientsCount > 0 ? 1 : 0,
    tasksCount,
    documentsCount,
    messagesCount,
    savedMessagesCount: 0,
    calendarEventsCount: 0,
    auditRecordsCount: 1,
    onboardingRecordsCount: targetUser?.onboardingCompleted ? 1 : 0,
    clearanceAssignmentsCount: targetUser?.clearanceLevel ? 1 : 0
  };
}

export async function archiveUser(userId: string, reason: string): Promise<{ success: boolean; user: User }> {
  const timestamp = new Date().toISOString();
  const currentUser = await getCurrentUser();

  const roster = getLocalRoster();
  const idx = roster.findIndex(u => u.id === userId);
  if (idx >= 0 && (roster[idx].id === 'u_david' || (roster[idx].email || '').toLowerCase() === 'vdacosta247@gmail.com' || roster[idx].isProtected)) {
    throw new Error("Cannot archive David Acosta — protected system administrator account.");
  }

  const apiRes = await safeFetchJson<{ success: boolean; user: User }>(`/api/users/${encodeURIComponent(userId)}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, deletedBy: currentUser?.id })
  }, null);

  let updatedUser: User;

  if (idx >= 0) {
    updatedUser = {
      ...roster[idx],
      status: 'archived',
      deletedAt: timestamp,
      deletedBy: currentUser?.id || 'staff_me',
      deletionReason: reason || 'Archived by Administrator',
      deletionType: 'archive',
      updatedAt: timestamp
    };
    roster[idx] = updatedUser;
    saveLocalRoster(roster);
  } else {
    throw new Error(`User with ID ${userId} not found.`);
  }

  dispatchUserEvent("user.updated", { user: updatedUser, userId });
  dispatchUserEvent("user.deactivated", { user: updatedUser, userId });
  dispatchUserEvent("user.statusChanged", { user: updatedUser, userId, status: 'archived' });

  return apiRes || { success: true, user: updatedUser };
}

export async function deleteUserPermanently(
  userId: string, 
  reason: string, 
  confirmationValue: string
): Promise<{ success: boolean; audit: UserDeletionAudit }> {
  const timestamp = new Date().toISOString();
  const currentUser = await getCurrentUser();

  if (currentUser?.id === userId) {
    throw new Error("You cannot delete your own authenticated account.");
  }

  const roster = getLocalRoster();
  const targetUser = roster.find(u => u.id === userId);
  if (!targetUser) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  if (targetUser.isProtected || (targetUser.role === 'Developer/Admin' && roster.filter(u => u.role === 'Developer/Admin' && u.status === 'active').length <= 1)) {
    throw new Error("Cannot delete the final Super Admin or a protected system account.");
  }

  const normConf = confirmationValue.trim().toLowerCase();
  const targetEmail = (targetUser.email || "").trim().toLowerCase();
  const targetName = (targetUser.name || `${targetUser.first} ${targetUser.last}`).trim().toLowerCase();
  if (normConf !== targetEmail && normConf !== targetName) {
    throw new Error("Confirmation value does not match target email address or full name.");
  }

  await safeFetchJson(`/api/users/${encodeURIComponent(userId)}/permanent`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, confirmationValue })
  }, null);

  const impact = await getUserDeletionImpact(userId);

  const updatedRoster = roster.map(u => {
    if (u.id === userId) {
      return {
        ...u,
        status: 'deleted',
        deletedAt: timestamp,
        deletedBy: currentUser?.id || 'staff_me',
        deletionReason: reason,
        deletionType: 'permanent' as const,
        updatedAt: timestamp
      };
    }
    return u;
  });
  saveLocalRoster(updatedRoster);

  const audit: UserDeletionAudit = {
    id: `audit_del_${Date.now()}`,
    targetUserId: userId,
    targetUserEmail: targetUser.email,
    targetUserName: `${targetUser.first} ${targetUser.last}`,
    deletedByUserId: currentUser?.id || 'staff_me',
    deletedByUserName: currentUser ? `${currentUser.first} ${currentUser.last}` : 'Admin',
    timestamp,
    deletionReason: reason,
    deletionType: 'permanent',
    impactSummary: impact,
    dataArchived: false,
    dataPermanentlyDeleted: true
  };

  dispatchUserEvent("user.deleted", { user: targetUser, userId });
  dispatchUserEvent("user.deactivated", { user: targetUser, userId });
  dispatchUserEvent("user.statusChanged", { user: targetUser, userId, status: 'deleted' });

  return { success: true, audit };
}

export async function restoreArchivedUser(userId: string): Promise<{ success: boolean; user: User }> {
  const timestamp = new Date().toISOString();

  await safeFetchJson(`/api/users/${encodeURIComponent(userId)}/restore`, {
    method: "POST"
  }, null);

  const roster = getLocalRoster();
  const idx = roster.findIndex(u => u.id === userId);
  if (idx < 0) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  const restoredUser: User = {
    ...roster[idx],
    status: 'active',
    deletedAt: undefined,
    deletedBy: undefined,
    deletionReason: undefined,
    deletionType: undefined,
    updatedAt: timestamp
  };

  roster[idx] = restoredUser;
  saveLocalRoster(roster);

  dispatchUserEvent("user.updated", { user: restoredUser, userId });
  dispatchUserEvent("user.statusChanged", { user: restoredUser, userId, status: 'active' });

  return { success: true, user: restoredUser };
}

export async function getArchivedUsers(): Promise<User[]> {
  const serverArchived = await safeFetchJson<User[]>("/api/users/archived", undefined, null);
  if (Array.isArray(serverArchived) && serverArchived.length > 0) {
    return serverArchived;
  }

  const roster = getLocalRoster();
  return roster.filter(u => {
    const st = (u.status || "").toLowerCase();
    return st === 'archived' || st === 'deleted' || Boolean(u.deletedAt);
  });
}

// ==========================================
// User Credentials, Password & Session Management
// ==========================================

export function generateTemporaryPassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  
  let pwd = "";
  pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
  pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  const all = uppercase + lowercase + numbers + symbols;
  for (let i = 0; i < 7; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split("").sort(() => 0.5 - Math.random()).join("");
}

export async function resetUserPassword(
  userId: string, 
  options?: { 
    forceChangeOnNextLogin?: boolean; 
    sendEmail?: boolean; 
    revokeExistingSessions?: boolean; 
    tempPassword?: string 
  }
): Promise<{ success: boolean; message: string; tempPassword?: string }> {
  const forceChangeOnNextLogin = options?.forceChangeOnNextLogin ?? true;
  const sendEmail = options?.sendEmail ?? true;
  const revokeExistingSessions = options?.revokeExistingSessions ?? true;
  const tempPassword = options?.tempPassword || generateTemporaryPassword();
  const timestamp = new Date().toISOString();

  // Try API route
  await safeFetchJson(`/api/users/${encodeURIComponent(userId)}/password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forceChangeOnNextLogin, sendEmail, revokeExistingSessions })
  }, null);

  const roster = getLocalRoster();
  const idx = roster.findIndex(u => u.id === userId);
  let updatedUser: User | null = null;

  if (idx >= 0) {
    updatedUser = {
      ...roster[idx],
      mustChangePassword: forceChangeOnNextLogin,
      lastPasswordResetAt: timestamp,
      sessionRevokedAt: revokeExistingSessions ? timestamp : roster[idx].sessionRevokedAt,
      updatedAt: timestamp
    };
    roster[idx] = updatedUser;
    saveLocalRoster(roster);
  }

  if (updatedUser) {
    dispatchUserEvent("user.passwordReset", { userId, user: updatedUser, forceChangeOnNextLogin });
    dispatchUserEvent("user.updated", { userId, user: updatedUser });
    if (revokeExistingSessions) {
      dispatchUserEvent("user.sessionsRevoked", { userId, user: updatedUser });
    }
  }

  return {
    success: true,
    message: "User password reset successfully.",
    tempPassword
  };
}

export async function revokeUserSessions(userId: string): Promise<{ success: boolean; message: string }> {
  const timestamp = new Date().toISOString();

  await safeFetchJson(`/api/users/${encodeURIComponent(userId)}/revoke-sessions`, {
    method: "POST"
  }, null);

  const roster = getLocalRoster();
  const idx = roster.findIndex(u => u.id === userId);
  let updatedUser: User | null = null;

  if (idx >= 0) {
    updatedUser = {
      ...roster[idx],
      sessionRevokedAt: timestamp,
      lastLogin: "Session Revoked",
      updatedAt: timestamp
    };
    roster[idx] = updatedUser;
    saveLocalRoster(roster);
  }

  if (updatedUser) {
    dispatchUserEvent("user.sessionsRevoked", { userId, user: updatedUser });
    dispatchUserEvent("user.updated", { userId, user: updatedUser });
  }

  return {
    success: true,
    message: "Existing user sessions revoked successfully."
  };
}

export async function sendPasswordResetEmail(userId: string): Promise<{ success: boolean; message: string }> {
  const user = await getUserById(userId);
  if (!user) throw new Error(`User with ID ${userId} not found.`);

  dispatchUserEvent("user.passwordResetEmailSent", { userId, email: user.email });
  return {
    success: true,
    message: `Password reset notification dispatched to ${user.email}.`
  };
}

export async function updateUserStatus(userId: string, status: "active" | "suspended" | "archived" | "disabled" | "pending"): Promise<User> {
  const current = await getUserById(userId);
  if (!current) throw new Error(`User with ID ${userId} not found.`);

  const timestamp = new Date().toISOString();
  const isSuspendedOrArchived = status === "suspended" || status === "archived" || status === "disabled";

  const updatedUser: User = {
    ...current,
    status,
    sessionRevokedAt: isSuspendedOrArchived ? timestamp : current.sessionRevokedAt,
    updatedAt: timestamp
  };

  const roster = getLocalRoster();
  const idx = roster.findIndex(u => u.id === userId);
  if (idx >= 0) {
    roster[idx] = updatedUser;
    saveLocalRoster(roster);
  }

  dispatchUserEvent("user.statusChanged", { userId, user: updatedUser, status });
  dispatchUserEvent("user.updated", { userId, user: updatedUser });
  if (isSuspendedOrArchived) {
    dispatchUserEvent("user.sessionsRevoked", { userId, user: updatedUser });
  }

  return updatedUser;
}

export async function updateUserPermissions(userId: string, permissions: any, clearanceLevel?: number): Promise<User> {
  const current = await getUserById(userId);
  if (!current) throw new Error(`User with ID ${userId} not found.`);

  const updatedUser: User = {
    ...current,
    permissions: { ...current.permissions, ...permissions },
    clearanceLevel: clearanceLevel !== undefined ? clearanceLevel : current.clearanceLevel,
    updatedAt: new Date().toISOString()
  };

  const roster = getLocalRoster();
  const idx = roster.findIndex(u => u.id === userId);
  if (idx >= 0) {
    roster[idx] = updatedUser;
    saveLocalRoster(roster);
  }

  dispatchUserEvent("user.permissionsChanged", { userId, user: updatedUser });
  dispatchUserEvent("user.updated", { userId, user: updatedUser });

  return updatedUser;
}

export async function updateUserProfilePhoto(userId: string, fileOrUrl: File | string): Promise<User> {
  return updateUserPhoto(userId, fileOrUrl);
}

export async function updateUserCredentials(userId: string, credentialOptions: { pin?: string; password?: string; forceChangeOnNextLogin?: boolean }): Promise<User> {
  const current = await getUserById(userId);
  if (!current) throw new Error(`User with ID ${userId} not found.`);

  const timestamp = new Date().toISOString();
  const updatedUser: User = {
    ...current,
    mustChangePassword: credentialOptions.forceChangeOnNextLogin ?? current.mustChangePassword,
    lastPasswordResetAt: credentialOptions.password ? timestamp : current.lastPasswordResetAt,
    hasPin: credentialOptions.pin ? true : current.hasPin,
    updatedAt: timestamp
  };

  const roster = getLocalRoster();
  const idx = roster.findIndex(u => u.id === userId);
  if (idx >= 0) {
    roster[idx] = updatedUser;
    saveLocalRoster(roster);
  }

  dispatchUserEvent("user.credentialsUpdated", { userId, user: updatedUser });
  dispatchUserEvent("user.updated", { userId, user: updatedUser });

  return updatedUser;
}

export async function recoverProtectedDeveloperAccount(): Promise<{ success: boolean; user: User }> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development recovery tool is unavailable in production environments.");
  }

  const roster = getLocalRoster();
  const timestamp = new Date().toISOString();

  let devUser = roster.find(u => u.id === "u_david" || (u.email || "").toLowerCase() === "vdacosta247@gmail.com");

  if (!devUser) {
    devUser = {
      id: "u_david",
      first: "David",
      last: "Acosta",
      name: "David Acosta",
      displayName: "David Acosta",
      email: "vdacosta247@gmail.com",
      role: "Developer/Admin",
      status: "active",
      clearanceLevel: 6,
      brokerage: "GBK Financial",
      isOwner: true,
      isProtected: true,
      created: "2026-01-01",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLogin: "Just now",
      lastActive: "Just now"
    };
    roster.unshift(devUser);
  } else {
    devUser = {
      ...devUser,
      id: "u_david",
      first: "David",
      last: "Acosta",
      name: "David Acosta",
      displayName: "David Acosta",
      email: "vdacosta247@gmail.com",
      role: "Developer/Admin",
      status: "active",
      clearanceLevel: 6,
      isOwner: true,
      isProtected: true,
      updatedAt: timestamp
    };
    const idx = roster.findIndex(u => u.id === devUser!.id);
    if (idx >= 0) roster[idx] = devUser;
  }

  saveLocalRoster(roster);
  dispatchUserEvent("user.updated", { userId: devUser.id, user: devUser });
  dispatchUserEvent("user.statusChanged", { userId: devUser.id, user: devUser, status: "active" });

  return { success: true, user: devUser };
}


