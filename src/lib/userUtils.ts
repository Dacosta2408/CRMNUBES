import { User } from "../types";

/**
 * Shared User Utilities & Canonical Accessors
 */

export function getUserFullName(user: Partial<User> | null | undefined): string {
  if (!user) return "Unknown User";
  if (user.displayName && user.displayName.trim()) return user.displayName.trim();
  const first = user.first || "";
  const last = user.last || "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (user.name && user.name.trim()) return user.name.trim();
  return user.email || "User";
}

export function getUserPhotoUrl(user: Partial<User> | null | undefined): string | null {
  if (!user) return null;
  const photo = user.profilePhotoUrl || user.profilePhoto || user.photo || null;
  if (!photo) return null;

  // Cache invalidation strategy using versioning/timestamp
  if (photo.startsWith("data:") || photo.startsWith("blob:")) {
    return photo;
  }

  if (user.updatedAt) {
    const versionParam = `v=${encodeURIComponent(user.updatedAt)}`;
    return photo.includes("?") ? `${photo}&${versionParam}` : `${photo}?${versionParam}`;
  }

  return photo;
}

// ─── Event Dispatcher for Real-Time & Cross-Component Sync ───
export type UserEventType =
  | "user.created"
  | "user.updated"
  | "user.profilePhotoUpdated"
  | "user.statusChanged"
  | "user.permissionsChanged";

export function dispatchUserEvent(eventType: UserEventType, payload: { user?: User; userId?: string; [key: string]: any }) {
  if (typeof window !== "undefined") {
    const customEvent = new CustomEvent(eventType, { detail: payload });
    window.dispatchEvent(customEvent);

    // Also dispatch a generic user event for subscribers
    window.dispatchEvent(new CustomEvent("user.changed", { detail: { type: eventType, ...payload } }));
  }
}
