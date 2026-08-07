import { User, Client } from "../types";
import { DEFAULT_USERS } from "../data";

export const DEVELOPMENT_CANONICAL_USERS: User[] = DEFAULT_USERS;
export const ROSTER_SCHEMA_VERSION = "v3_canonical_7";

export interface RosterDiagnosticsReport {
  rawCount: number;
  normalizedCount: number;
  duplicateIdsRemoved: number;
  duplicateEmailsRemoved: number;
  invalidRecordsRemoved: number;
  archivedCount: number;
  deletedCount: number;
  activeCount: number;
  source: string;
  users: User[];
}

const BLOCKED_EMAILS = new Set([
  "dacosta@gbkfinancial.ca",
  "sjenkins@gbkfinancial.ca"
]);

/**
 * Shared User Utilities & Canonical Accessors
 * 
 * Normalizes any user array against canonical development requirements:
 * - Deduplicates by stable ID
 * - Deduplicates by case-insensitive email
 * - Trims names and emails
 * - Normalizes email casing (lowercase)
 * - Removes invalid/empty user records
 * - Filters out deleted accounts, blocked emails (dacosta@gbkfinancial.ca, sjenkins@gbkfinancial.ca), and fake email users
 * - Guarantees David Acosta remains a protected Developer/Admin
 * - Ensures canonical users are present with default attributes if missing
 */
export function normalizeUserRoster(
  users: User[] | null | undefined,
  options: { includeArchived?: boolean; sourceName?: string } = {}
): User[] {
  const userMap = new Map<string, User>();
  const emailMap = new Map<string, string>(); // normEmail -> id

  // 1. Seed with DEVELOPMENT_CANONICAL_USERS
  DEVELOPMENT_CANONICAL_USERS.forEach(def => {
    const normEmail = (def.email || "").trim().toLowerCase();
    if (normEmail && BLOCKED_EMAILS.has(normEmail)) return;

    const trimmedDef: User = {
      ...def,
      first: (def.first || "").trim(),
      last: (def.last || "").trim(),
      email: normEmail,
      displayName: def.displayName ? def.displayName.trim() : `${(def.first || "").trim()} ${(def.last || "").trim()}`.trim()
    };
    userMap.set(def.id, trimmedDef);
    if (normEmail) {
      emailMap.set(normEmail, def.id);
    }
  });

  if (Array.isArray(users)) {
    users.forEach(u => {
      if (!u || !u.id) return;

      const normEmail = (u.email || "").trim().toLowerCase();

      // Filter out blocked emails, fake email placeholder users, or deleted users
      if (
        (normEmail && BLOCKED_EMAILS.has(normEmail)) ||
        u.userLabel === "email_user" ||
        u.role === "Email User" ||
        u.id.startsWith("email_") ||
        u.status === "deleted"
      ) {
        return;
      }

      let first = (u.first || "").trim();
      let last = (u.last || "").trim();

      if (!first && !last) {
        if (u.displayName && u.displayName.trim()) {
          const parts = u.displayName.trim().split(/\s+/);
          first = parts[0] || "";
          last = parts.slice(1).join(" ") || "";
        } else if (u.name && u.name.trim()) {
          const parts = u.name.trim().split(/\s+/);
          first = parts[0] || "";
          last = parts.slice(1).join(" ") || "";
        } else if (normEmail) {
          const prefix = normEmail.split("@")[0] || "";
          const parts = prefix.split(/[\._\-]/).filter(Boolean);
          if (parts.length >= 2) {
            first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
            last = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
          } else if (parts.length === 1) {
            first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
            last = "";
          }
        }
      }

      // Filter out invalid records
      if (!normEmail && !first && !last) return;

      const cleanedUser: User = {
        ...u,
        first: first || "User",
        last,
        email: normEmail || u.email,
        displayName: u.displayName ? u.displayName.trim() : `${first} ${last}`.trim()
      };

      // Check if this matches a canonical user ID or canonical email
      const canonicalDef = DEVELOPMENT_CANONICAL_USERS.find(d => 
        d.id === u.id || (d.email && d.email.trim().toLowerCase() === normEmail)
      );

      if (canonicalDef) {
        const canonicalId = canonicalDef.id;
        const existing = userMap.get(canonicalId) || canonicalDef;
        const isDavid = canonicalId === "u_david" || canonicalDef.email.toLowerCase() === "vdacosta247@gmail.com";

        userMap.set(canonicalId, {
          ...existing,
          ...cleanedUser,
          id: canonicalId,
          first: cleanedUser.first || canonicalDef.first,
          last: cleanedUser.last || canonicalDef.last,
          email: canonicalDef.email.toLowerCase(),
          role: isDavid ? "Developer/Admin" : (cleanedUser.role || canonicalDef.role),
          status: (isDavid ? "active" : (cleanedUser.status || canonicalDef.status)) as any,
          isProtected: isDavid ? true : (cleanedUser.isProtected ?? canonicalDef.isProtected),
          isOwner: isDavid ? true : (cleanedUser.isOwner ?? canonicalDef.isOwner),
          clearanceLevel: isDavid ? 6 : (cleanedUser.clearanceLevel || canonicalDef.clearanceLevel)
        });
        if (canonicalDef.email) {
          emailMap.set(canonicalDef.email.toLowerCase(), canonicalId);
        }
      } else {
        // Non-canonical user
        if (normEmail && emailMap.has(normEmail) && emailMap.get(normEmail) !== u.id) {
          // Duplicate email found, skip
          return;
        }

        if (!userMap.has(u.id)) {
          userMap.set(u.id, cleanedUser);
          if (normEmail) {
            emailMap.set(normEmail, u.id);
          }
        }
      }
    });
  }

  // Ensure David Acosta is strictly protected and active Developer/Admin
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

  let result = Array.from(userMap.values()).filter(u => {
    const email = (u.email || "").trim().toLowerCase();
    return !BLOCKED_EMAILS.has(email);
  });

  if (options.includeArchived === false) {
    return result.filter(u => u.status !== "archived");
  }

  return result;
}

export function sanitizeCanonicalRoster(rawRoster: User[] | null | undefined): User[] {
  return normalizeUserRoster(rawRoster, { includeArchived: true });
}

export function getRosterDiagnostics(
  rawRoster: User[] | null | undefined,
  sourceName: string = "localStorage"
): RosterDiagnosticsReport {
  const rawList = Array.isArray(rawRoster) ? rawRoster : [];
  const rawCount = rawList.length;

  let duplicateIdsRemoved = 0;
  let duplicateEmailsRemoved = 0;
  let invalidRecordsRemoved = 0;
  let deletedCount = 0;
  let archivedCount = 0;

  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  rawList.forEach(u => {
    if (!u || !u.id) {
      invalidRecordsRemoved++;
      return;
    }
    const email = (u.email || "").trim().toLowerCase();
    if (u.userLabel === "email_user" || u.role === "Email User" || u.id.startsWith("email_")) {
      invalidRecordsRemoved++;
      return;
    }
    if (u.status === "deleted") {
      deletedCount++;
      return;
    }
    if (u.status === "archived") {
      archivedCount++;
    }
    if (seenIds.has(u.id)) {
      duplicateIdsRemoved++;
      return;
    }
    seenIds.add(u.id);

    if (email) {
      if (seenEmails.has(email)) {
        duplicateEmailsRemoved++;
        return;
      }
      seenEmails.add(email);
    }
  });

  const normalized = sanitizeCanonicalRoster(rawRoster);
  const activeUsers = normalized.filter(u => u.status === "active");

  return {
    rawCount,
    normalizedCount: normalized.length,
    duplicateIdsRemoved,
    duplicateEmailsRemoved,
    invalidRecordsRemoved,
    archivedCount,
    deletedCount,
    activeCount: activeUsers.length,
    source: sourceName,
    users: normalized
  };
}

export function getUserFullName(user: Partial<User> | null | undefined): string {
  if (!user) return "Unknown User";
  if (user.displayName && user.displayName.trim()) return user.displayName.trim();
  const first = (user.first || "").trim();
  const last = (user.last || "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (user.name && user.name.trim()) return user.name.trim();
  if (user.email) {
    const prefix = user.email.split("@")[0] || "";
    const parts = prefix.split(/[\._\-]/).filter(Boolean);
    if (parts.length > 0) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
    }
    return user.email;
  }
  return "User";
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
  | "user.profileUpdated"
  | "user.profilePhotoUpdated"
  | "user.statusChanged"
  | "user.permissionsChanged"
  | "user.emailChanged"
  | "user.passwordReset"
  | "user.credentialsUpdated"
  | "user.sessionsRevoked"
  | "user.passwordResetEmailSent";

export function dispatchUserEvent(eventType: UserEventType, payload: { user?: User; userId?: string; [key: string]: any }) {
  if (typeof window !== "undefined") {
    const customEvent = new CustomEvent(eventType, { detail: payload });
    window.dispatchEvent(customEvent);

    // Also dispatch a generic user event for subscribers
    window.dispatchEvent(new CustomEvent("user.changed", { detail: { type: eventType, ...payload } }));
  }
}

// ─── CLIENT ASSIGNMENT PERMISSION & ROSTER HELPERS ───

export function canAssignClient(currentUser: User | null | undefined): boolean {
  if (!currentUser) return false;
  const role = (currentUser.role || "").toLowerCase();
  if (
    currentUser.isOwner ||
    currentUser.isProtected ||
    role.includes("developer") ||
    role.includes("admin") ||
    role.includes("manager") ||
    role.includes("owner") ||
    (currentUser.clearanceLevel !== undefined && currentUser.clearanceLevel >= 4) ||
    (currentUser.permissions as any)?.canAssignClients === true ||
    (currentUser.specialPermissions && currentUser.specialPermissions.canAssignClients === true)
  ) {
    return true;
  }
  if (currentUser.permOverrides && currentUser.permOverrides["assign_clients"] === true) {
    return true;
  }
  return false;
}

export function canAssignUserToClient(
  currentUser: User | null | undefined,
  targetUser: User | null | undefined
): boolean {
  if (!canAssignClient(currentUser)) return false;
  if (!targetUser || !targetUser.id) return false;
  const status = (targetUser.status || "active").toLowerCase();
  if (status === "deleted" || status === "archived") return false;
  if (status === "inactive" || status === "suspended") return false;
  return true;
}

export function canViewClientAssignment(
  currentUser: User | null | undefined,
  client: Client | null | undefined
): boolean {
  return !!currentUser;
}

export function getAssignableStaff(
  currentUser: User | null | undefined,
  userRoster: User[] | null | undefined,
  currentAssignedBrokerId?: string
): User[] {
  const normalizedRoster = normalizeUserRoster(userRoster || DEFAULT_USERS, { includeArchived: true });
  const seenIds = new Set<string>();

  const assignable = normalizedRoster.filter(u => {
    if (!u || !u.id) return false;
    if (seenIds.has(u.id)) return false;

    const status = (u.status || "active").toLowerCase();

    // Always exclude deleted accounts or email users
    if (status === "deleted" || u.userLabel === "email_user" || u.role === "Email User" || u.id.startsWith("email_")) {
      return false;
    }

    // Always exclude archived
    if (status === "archived") return false;

    // Inactive / suspended users excluded UNLESS they currently own the assignment
    if (status === "inactive" || status === "suspended") {
      if (currentAssignedBrokerId && u.id === currentAssignedBrokerId) {
        seenIds.add(u.id);
        return true;
      }
      return false;
    }

    // Include Brokers, Agents, Admins, Developers, Underwriters, Advisors
    const role = (u.role || "").toLowerCase();
    const isBrokerRole =
      role.includes("broker") ||
      role.includes("agent") ||
      role.includes("advisor") ||
      role.includes("sales") ||
      role.includes("underwriter") ||
      role.includes("originator");

    const isAdminRole = role.includes("admin") || role.includes("manager") || role.includes("owner");
    const isDevRole = role.includes("developer");

    const clearance = u.clearanceLevel || 1;
    const isEligible = isBrokerRole || (isAdminRole && clearance >= 3) || isDevRole;

    if (isEligible) {
      seenIds.add(u.id);
      return true;
    }

    return false;
  });

  return assignable.sort((a, b) => getUserFullName(a).localeCompare(getUserFullName(b)));
}

export interface ResolvedBrokerAssignment {
  assignedBrokerId: string | null;
  assignedBrokerName: string;
  isFallback: boolean;
  isMissing: boolean;
  isInactive: boolean;
  user: User | null;
}

export function resolveClientBrokerAssignment(client: Client, userRoster: User[]): ResolvedBrokerAssignment {
  const normalized = normalizeUserRoster(userRoster || DEFAULT_USERS, { includeArchived: true });

  // 1. Primary Check: assignedBrokerId
  if (client.assignedBrokerId) {
    const matchedUser = normalized.find(u => u.id === client.assignedBrokerId);
    if (matchedUser) {
      const status = (matchedUser.status || "active").toLowerCase();
      const isInactive = status === "inactive" || status === "suspended" || status === "archived" || status === "deleted";
      return {
        assignedBrokerId: matchedUser.id,
        assignedBrokerName: getUserFullName(matchedUser),
        isFallback: false,
        isMissing: false,
        isInactive,
        user: matchedUser
      };
    } else {
      return {
        assignedBrokerId: client.assignedBrokerId,
        assignedBrokerName: client.assignedBrokerName || client.assignedBroker || "Assigned broker unavailable",
        isFallback: false,
        isMissing: true,
        isInactive: true,
        user: null
      };
    }
  }

  // 2. Legacy Name Matching Fallback
  const candidateName = (
    client.assignedBroker ||
    client.assignedBrokerName ||
    client.agent ||
    client.retentionOwner ||
    client.assignedTo ||
    ""
  ).trim();

  if (candidateName) {
    const candidateLower = candidateName.toLowerCase();

    let match = normalized.find(u => u.id.toLowerCase() === candidateLower);

    if (!match) {
      match = normalized.find(u => getUserFullName(u).toLowerCase() === candidateLower);
    }

    if (!match) {
      match = normalized.find(u => {
        const full = `${u.first || ""} ${u.last || ""}`.trim().toLowerCase();
        return full && (full.includes(candidateLower) || candidateLower.includes(full));
      });
    }

    if (match) {
      const status = (match.status || "active").toLowerCase();
      const isInactive = status === "inactive" || status === "suspended" || status === "archived" || status === "deleted";
      return {
        assignedBrokerId: match.id,
        assignedBrokerName: getUserFullName(match),
        isFallback: true,
        isMissing: false,
        isInactive,
        user: match
      };
    }
  }

  return {
    assignedBrokerId: null,
    assignedBrokerName: candidateName || "Unassigned",
    isFallback: true,
    isMissing: !!candidateName,
    isInactive: false,
    user: null
  };
}

export interface ClientMigrationReport {
  totalClients: number;
  alreadyHadId: number;
  successfullyMappedByName: number;
  unassignedCount: number;
  missingOrInactiveBrokerCount: number;
  ambiguousCount: number;
  details: Array<{
    clientId: string;
    clientName: string;
    prevBroker: string;
    resolvedId: string | null;
    resolvedName: string;
    status: string;
  }>;
}

export function migrateClientBrokerAssignments(
  clients: Client[],
  userRoster: User[]
): { clients: Client[]; report: ClientMigrationReport } {
  let alreadyHadId = 0;
  let successfullyMappedByName = 0;
  let unassignedCount = 0;
  let missingOrInactiveBrokerCount = 0;
  let ambiguousCount = 0;
  const details: ClientMigrationReport["details"] = [];

  const migratedClients = clients.map(client => {
    const rawBroker = client.assignedBroker || client.agent || client.retentionOwner || client.assignedTo || "";
    const resolved = resolveClientBrokerAssignment(client, userRoster);

    if (client.assignedBrokerId) {
      alreadyHadId++;
      if (resolved.isInactive || resolved.isMissing) {
        missingOrInactiveBrokerCount++;
      }
      details.push({
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        prevBroker: rawBroker,
        resolvedId: resolved.assignedBrokerId,
        resolvedName: resolved.assignedBrokerName,
        status: resolved.isMissing ? "missing_broker" : resolved.isInactive ? "inactive_broker" : "valid_id"
      });
      return {
        ...client,
        assignedBrokerId: resolved.assignedBrokerId || client.assignedBrokerId,
        assignedBrokerName: resolved.assignedBrokerName,
        assignedBroker: resolved.assignedBrokerName,
        agent: resolved.assignedBrokerName,
        retentionOwner: resolved.assignedBrokerName
      };
    }

    if (resolved.assignedBrokerId) {
      successfullyMappedByName++;
      if (resolved.isInactive) missingOrInactiveBrokerCount++;
      details.push({
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        prevBroker: rawBroker,
        resolvedId: resolved.assignedBrokerId,
        resolvedName: resolved.assignedBrokerName,
        status: resolved.isInactive ? "mapped_inactive" : "mapped_name"
      });
      return {
        ...client,
        assignedBrokerId: resolved.assignedBrokerId,
        assignedBrokerName: resolved.assignedBrokerName,
        assignedBroker: resolved.assignedBrokerName,
        agent: resolved.assignedBrokerName,
        retentionOwner: resolved.assignedBrokerName
      };
    }

    if (!rawBroker) {
      unassignedCount++;
      details.push({
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        prevBroker: "",
        resolvedId: null,
        resolvedName: "Unassigned",
        status: "unassigned"
      });
    } else {
      ambiguousCount++;
      missingOrInactiveBrokerCount++;
      details.push({
        clientId: client.id,
        clientName: `${client.first} ${client.last}`,
        prevBroker: rawBroker,
        resolvedId: null,
        resolvedName: rawBroker,
        status: "ambiguous_or_missing"
      });
    }

    return client;
  });

  const report: ClientMigrationReport = {
    totalClients: clients.length,
    alreadyHadId,
    successfullyMappedByName,
    unassignedCount,
    missingOrInactiveBrokerCount,
    ambiguousCount,
    details
  };

  return { clients: migratedClients, report };
}

export function dispatchClientAssignmentEvent(clientId: string, assignedBrokerId: string | null, updatedBy: User, client: Client) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("client.updated", {
        detail: { client }
      })
    );
    window.dispatchEvent(
      new CustomEvent("client-assigned", {
        detail: {
          clientId,
          assignedBrokerId,
          assignedBrokerName: client.assignedBrokerName,
          updatedBy: updatedBy.id,
          timestamp: new Date().toISOString()
        }
      })
    );
  }
}

