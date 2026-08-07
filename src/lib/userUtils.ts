import { User } from "../types";
import { DEFAULT_USERS } from "../data";

/**
 * Shared User Utilities & Canonical Accessors
 */

export function sanitizeCanonicalRoster(rawRoster: User[] | null | undefined): User[] {
  const userMap = new Map<string, User>();

  // Base map from DEFAULT_USERS
  DEFAULT_USERS.forEach(def => {
    userMap.set(def.id, { ...def });
  });

  if (Array.isArray(rawRoster)) {
    rawRoster.forEach(u => {
      if (!u || !u.id) return;

      // Skip fake email placeholder users
      if (u.userLabel === "email_user" || u.role === "Email User" || u.id.startsWith("email_")) {
        return;
      }

      // Check if canonical
      const canonicalDef = DEFAULT_USERS.find(d => 
        d.id === u.id || (d.email && u.email && d.email.trim().toLowerCase() === u.email.trim().toLowerCase())
      );

      if (canonicalDef) {
        const existing = userMap.get(canonicalDef.id) || canonicalDef;
        const isDavid = canonicalDef.id === "u_david" || canonicalDef.email === "vdacosta247@gmail.com";
        userMap.set(canonicalDef.id, {
          ...existing,
          ...u,
          id: canonicalDef.id,
          first: u.first || canonicalDef.first,
          last: u.last || canonicalDef.last,
          email: canonicalDef.email,
          role: isDavid ? "Developer/Admin" : (u.role || canonicalDef.role),
          status: (isDavid ? "active" : (u.status || canonicalDef.status)) as any,
          isProtected: isDavid ? true : (u.isProtected ?? canonicalDef.isProtected),
          isOwner: isDavid ? true : (u.isOwner ?? canonicalDef.isOwner),
          clearanceLevel: isDavid ? 6 : (u.clearanceLevel || canonicalDef.clearanceLevel)
        });
      } else {
        // Non-canonical user
        const normEmail = (u.email || "").trim().toLowerCase();
        let isDup = false;
        if (normEmail) {
          for (const existingVal of userMap.values()) {
            if ((existingVal.email || "").trim().toLowerCase() === normEmail) {
              isDup = true;
              break;
            }
          }
        }
        if (!isDup && u.status !== "deleted") {
          userMap.set(u.id, u);
        }
      }
    });
  }

  // Ensure David Acosta is strictly protected and active
  const david = userMap.get("u_david");
  if (david) {
    david.first = "David";
    david.last = "Acosta";
    david.email = "vdacosta247@gmail.com";
    david.role = "Developer/Admin";
    david.status = "active";
    david.isOwner = true;
    david.isProtected = true;
    david.clearanceLevel = 6;
  }

  return Array.from(userMap.values());
}

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
  | "user.deactivated"
  | "user.deleted"
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
