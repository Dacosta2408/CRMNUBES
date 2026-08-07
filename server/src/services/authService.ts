import crypto from "node:crypto";
import { dbService } from "./dbService.js";

export interface ServerUserCredential {
  userId: string;
  email: string;
  pinHash: string;
  pinSalt: string;
  passwordHash?: string;
  passwordSalt?: string;
  failedAttempts: number;
  lockedUntil: string | null;
  mustChangePassword: boolean;
  sessionRevokedAt: string | null;
  resetToken: string | null;
  resetTokenExpires: string | null;
}

export interface SessionInfo {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

// In-memory credential store (synced with dbService fallback)
const credentialsStore = new Map<string, ServerUserCredential>();
// In-memory active sessions store
const sessionsStore = new Map<string, SessionInfo>();

// Password strength validator
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character (!@#$%^&* etc.)." };
  }
  return { valid: true };
}

// PIN format validator
export function validatePinFormat(pin: string): { valid: boolean; message?: string } {
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return { valid: false, message: "PIN must be between 4 and 6 numeric digits." };
  }
  return { valid: true };
}

// Crypto helpers
export function hashPasswordServer(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(password, s, 100000, 64, "sha512");
  return { hash: derivedKey.toString("hex"), salt: s };
}

export function verifyPasswordServer(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  try {
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512");
    const targetBuf = Buffer.from(hash, "hex");
    if (targetBuf.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(targetBuf, derivedKey);
  } catch {
    return false;
  }
}

export function hashPinServer(pin: string, saltKey: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(`${saltKey}:${pin}`, s, 50000, 32, "sha256");
  return { hash: derivedKey.toString("hex"), salt: s };
}

export function verifyPinServer(pin: string, saltKey: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  try {
    const derivedKey = crypto.pbkdf2Sync(`${saltKey}:${pin}`, salt, 50000, 32, "sha256");
    const targetBuf = Buffer.from(hash, "hex");
    if (targetBuf.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(targetBuf, derivedKey);
  } catch {
    return false;
  }
}

// Default initial user seed PINs for server-side verification
const INITIAL_PINS: Record<string, string> = {
  u_david: "1234",
  u_timb: "2222",
  u_waynem: "3333",
  u_jeffb: "4444",
  u_jameyb: "5555",
  u_matthewb: "7777",
  u_jasonm: "8888"
};

// Seed credentials on startup
async function initCredentials() {
  const users = await dbService.getUsers();
  users.forEach((u: any) => {
    if (!credentialsStore.has(u.id)) {
      const initialPin = INITIAL_PINS[u.id] || "1234";
      const { hash: pinHash, salt: pinSalt } = hashPinServer(initialPin, u.id);
      const { hash: passwordHash, salt: passwordSalt } = hashPasswordServer("Gbk2026!#Secure");

      credentialsStore.set(u.id, {
        userId: u.id,
        email: (u.email || "").toLowerCase(),
        pinHash,
        pinSalt,
        passwordHash,
        passwordSalt,
        failedAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        sessionRevokedAt: null,
        resetToken: null,
        resetTokenExpires: null
      });
    }
  });
}

// Auto-initialize
initCredentials().catch(err => console.error("Error initializing auth credentials:", err));

export const authService = {
  // Ensure user credential record exists
  getOrCreateCredential(userId: string, email: string): ServerUserCredential {
    if (!credentialsStore.has(userId)) {
      const initialPin = INITIAL_PINS[userId] || "1234";
      const { hash: pinHash, salt: pinSalt } = hashPinServer(initialPin, userId);
      const { hash: passwordHash, salt: passwordSalt } = hashPasswordServer("Gbk2026!#Secure");

      credentialsStore.set(userId, {
        userId,
        email: email.toLowerCase(),
        pinHash,
        pinSalt,
        passwordHash,
        passwordSalt,
        failedAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        sessionRevokedAt: null,
        resetToken: null,
        resetTokenExpires: null
      });
    }
    return credentialsStore.get(userId)!;
  },

  // LOGIN
  async login(identifier: string, credentialInput: string): Promise<{ success: boolean; message?: string; user?: any; token?: string; mustChangePassword?: boolean; status?: number }> {
    if (!identifier || !credentialInput) {
      return { success: false, message: "Invalid email or password.", status: 401 };
    }

    const normId = identifier.trim().toLowerCase();
    const users = await dbService.getUsers();
    
    const matchedUser: any = users.find((u: any) => 
      (u.email || "").toLowerCase() === normId ||
      u.id === identifier ||
      `${u.first_name || u.first || ""} ${u.last_name || u.last || ""}`.trim().toLowerCase() === normId
    );

    if (!matchedUser) {
      // Generic failure response so user cannot enumerate valid emails
      return { success: false, message: "Invalid email or password.", status: 401 };
    }

    // Check account status
    const statusLower = (matchedUser.status || matchedUser.account_status || "active").toLowerCase();
    if (statusLower === "archived" || statusLower === "disabled" || statusLower === "deleted" || statusLower === "inactive") {
      return { success: false, message: "Account is locked or inactive. Contact administrator.", status: 403 };
    }

    const cred = this.getOrCreateCredential(matchedUser.id, matchedUser.email || normId);

    // Check account lockout
    if (cred.lockedUntil && new Date(cred.lockedUntil).getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((new Date(cred.lockedUntil).getTime() - Date.now()) / 60000);
      return { 
        success: false, 
        message: `Account is temporarily locked due to failed login attempts. Try again in ${remainingMinutes} minute(s) or contact an administrator.`, 
        status: 403 
      };
    }

    // Verify credential (PIN or Password)
    let isMatch = false;
    if (credentialInput.length <= 6 && /^\d+$/.test(credentialInput)) {
      // Test PIN
      isMatch = verifyPinServer(credentialInput, matchedUser.id, cred.pinHash, cred.pinSalt);
    }
    
    if (!isMatch && cred.passwordHash && cred.passwordSalt) {
      // Test Password
      isMatch = verifyPasswordServer(credentialInput, cred.passwordHash, cred.passwordSalt);
    }

    if (!isMatch) {
      // Protection for David Acosta: PIN attempts increment counter, but account owner is never permanently locked out
      const isDavid = matchedUser.id === "u_david" || (matchedUser.email || "").toLowerCase() === "vdacosta247@gmail.com";
      cred.failedAttempts += 1;

      if (cred.failedAttempts >= 5 && !isDavid) {
        cred.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-min lockout
        return { 
          success: false, 
          message: "Too many failed attempts. Account locked for 15 minutes.", 
          status: 403 
        };
      }

      return { success: false, message: "Invalid email or password.", status: 401 };
    }

    // Success: Reset failed attempts
    cred.failedAttempts = 0;
    cred.lockedUntil = null;

    // Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const sessionInfo: SessionInfo = {
      token,
      userId: matchedUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    sessionsStore.set(token, sessionInfo);

    // Prepare sanitized user response (NO credentials, NO hashes)
    const isDavid = matchedUser.id === "u_david" || (matchedUser.email || "").toLowerCase() === "vdacosta247@gmail.com";
    const sanitizedUser = {
      id: matchedUser.id,
      first: matchedUser.first || matchedUser.first_name || "David",
      last: matchedUser.last || matchedUser.last_name || "Acosta",
      email: matchedUser.email || normId,
      role: isDavid ? "Developer/Admin" : (matchedUser.role || "Broker"),
      status: "active",
      phone: matchedUser.phone || "",
      photo: matchedUser.photo || matchedUser.profilePhoto || null,
      clearanceLevel: isDavid ? 6 : (matchedUser.clearanceLevel || 3),
      isOwner: isDavid ? true : Boolean(matchedUser.isOwner),
      isProtected: isDavid ? true : Boolean(matchedUser.isProtected),
      mustChangePassword: cred.mustChangePassword,
      lastLogin: new Date().toISOString()
    };

    // Log login audit event
    await dbService.addAuditLog({
      user_id: matchedUser.id,
      user_name: `${sanitizedUser.first} ${sanitizedUser.last}`,
      action: "User Login",
      target_type: "Auth",
      target_name: sanitizedUser.role,
      details: "Authenticated successfully via secure backend authentication"
    });

    return {
      success: true,
      user: sanitizedUser,
      token,
      mustChangePassword: cred.mustChangePassword
    };
  },

  // GET CURRENT SESSION USER
  async validateSession(token: string): Promise<any | null> {
    if (!token) return null;
    const session = sessionsStore.get(token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      sessionsStore.delete(token);
      return null;
    }

    const cred = credentialsStore.get(session.userId);
    if (cred && cred.sessionRevokedAt) {
      if (new Date(session.createdAt).getTime() < new Date(cred.sessionRevokedAt).getTime()) {
        sessionsStore.delete(token);
        return null;
      }
    }

    const users = await dbService.getUsers();
    const matchedUser: any = users.find((u: any) => u.id === session.userId);
    if (!matchedUser) return null;

    const isDavid = matchedUser.id === "u_david" || (matchedUser.email || "").toLowerCase() === "vdacosta247@gmail.com";
    return {
      id: matchedUser.id,
      first: matchedUser.first || matchedUser.first_name || "David",
      last: matchedUser.last || matchedUser.last_name || "Acosta",
      email: matchedUser.email,
      role: isDavid ? "Developer/Admin" : (matchedUser.role || "Broker"),
      status: "active",
      phone: matchedUser.phone || "",
      photo: matchedUser.photo || matchedUser.profilePhoto || null,
      clearanceLevel: isDavid ? 6 : (matchedUser.clearanceLevel || 3),
      isOwner: isDavid ? true : Boolean(matchedUser.isOwner),
      isProtected: isDavid ? true : Boolean(matchedUser.isProtected),
      mustChangePassword: cred?.mustChangePassword || false,
      lastLogin: new Date().toISOString()
    };
  },

  // LOGOUT
  logout(token: string) {
    if (token) {
      sessionsStore.delete(token);
    }
  },

  // FORGOT PASSWORD REQUEST
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; simulationToken?: string }> {
    const normEmail = (email || "").trim().toLowerCase();
    const users = await dbService.getUsers();
    const matched: any = users.find((u: any) => (u.email || "").toLowerCase() === normEmail);

    let simulationToken: string | undefined = undefined;

    if (matched) {
      const cred = this.getOrCreateCredential(matched.id, matched.email);
      const token = crypto.randomBytes(32).toString("hex");
      cred.resetToken = token;
      cred.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      simulationToken = token;

      await dbService.addAuditLog({
        user_id: matched.id,
        user_name: `${matched.first || matched.first_name} ${matched.last || matched.last_name}`,
        action: "Requested Password Reset",
        target_type: "User",
        target_id: matched.id,
        target_name: matched.email,
        details: "Password reset token generated and email notification queued"
      });
    }

    // Always return generic message to avoid exposing email presence
    return {
      success: true,
      message: "If an account with that email exists, a password reset email has been sent.",
      simulationToken
    };
  },

  // VALIDATE RESET TOKEN
  validateResetToken(token: string): { valid: boolean; email?: string; message?: string } {
    if (!token) return { valid: false, message: "Token is required." };

    for (const cred of credentialsStore.values()) {
      if (cred.resetToken === token) {
        if (cred.resetTokenExpires && new Date(cred.resetTokenExpires).getTime() > Date.now()) {
          return { valid: true, email: cred.email };
        } else {
          return { valid: false, message: "Reset token has expired. Please request a new link." };
        }
      }
    }

    return { valid: false, message: "Invalid reset token." };
  },

  // EXECUTE RESET PASSWORD WITH TOKEN
  async executeResetPassword(token: string, newPassword?: string, newPin?: string): Promise<{ success: boolean; message: string }> {
    const val = this.validateResetToken(token);
    if (!val.valid) {
      return { success: false, message: val.message || "Invalid or expired reset token." };
    }

    let targetCred: ServerUserCredential | undefined = undefined;
    for (const cred of credentialsStore.values()) {
      if (cred.resetToken === token) {
        targetCred = cred;
        break;
      }
    }

    if (!targetCred) {
      return { success: false, message: "Invalid reset token." };
    }

    if (newPassword) {
      const passVal = validatePasswordStrength(newPassword);
      if (!passVal.valid) {
        return { success: false, message: passVal.message || "Invalid password format." };
      }
      const { hash, salt } = hashPasswordServer(newPassword);
      targetCred.passwordHash = hash;
      targetCred.passwordSalt = salt;
    }

    if (newPin) {
      const pinVal = validatePinFormat(newPin);
      if (!pinVal.valid) {
        return { success: false, message: pinVal.message || "Invalid PIN format." };
      }
      const { hash, salt } = hashPinServer(newPin, targetCred.userId);
      targetCred.pinHash = hash;
      targetCred.pinSalt = salt;
    }

    // Clear reset token & revoke old sessions
    targetCred.resetToken = null;
    targetCred.resetTokenExpires = null;
    targetCred.mustChangePassword = false;
    targetCred.sessionRevokedAt = new Date().toISOString();
    targetCred.failedAttempts = 0;
    targetCred.lockedUntil = null;

    await dbService.addAuditLog({
      user_id: targetCred.userId,
      user_name: targetCred.email,
      action: "Completed Password Reset",
      target_type: "User",
      target_id: targetCred.userId,
      target_name: targetCred.email,
      details: "Updated account credentials via valid reset token"
    });

    return { success: true, message: "Password and security PIN updated successfully." };
  },

  // ADMIN PASSWORD RESET
  async adminResetPassword(targetUserId: string, options: { temporaryPassword?: string; forceChangeOnNextLogin?: boolean; sendEmail?: boolean; revokeExistingSessions?: boolean; authorName?: string }): Promise<{ success: boolean; message: string; temporaryPassword?: string }> {
    const users = await dbService.getUsers();
    const matched: any = users.find((u: any) => u.id === targetUserId);
    if (!matched) {
      return { success: false, message: "User not found." };
    }

    const cred = this.getOrCreateCredential(targetUserId, matched.email || "");
    const tempPassword = options.temporaryPassword || `Gbk2026!#${Math.floor(1000 + Math.random() * 9000)}`;

    const passVal = validatePasswordStrength(tempPassword);
    if (!passVal.valid) {
      return { success: false, message: passVal.message || "Password does not meet complexity requirements." };
    }

    const { hash, salt } = hashPasswordServer(tempPassword);
    cred.passwordHash = hash;
    cred.passwordSalt = salt;
    cred.mustChangePassword = options.forceChangeOnNextLogin !== false;

    if (options.revokeExistingSessions) {
      cred.sessionRevokedAt = new Date().toISOString();
    }

    await dbService.addAuditLog({
      user_name: options.authorName || "Admin",
      action: "Admin Reset Password",
      target_type: "User",
      target_id: targetUserId,
      target_name: `${matched.first || matched.first_name} ${matched.last || matched.last_name}`,
      details: `Password reset by administrator. Must change password on next login: ${cred.mustChangePassword}`
    });

    return {
      success: true,
      message: "Password reset completed successfully.",
      temporaryPassword: tempPassword
    };
  },

  // ADMIN PIN RESET
  async adminResetPin(targetUserId: string, newPin: string, authorName?: string): Promise<{ success: boolean; message: string }> {
    const pinVal = validatePinFormat(newPin);
    if (!pinVal.valid) {
      return { success: false, message: pinVal.message || "PIN must be between 4 and 6 numeric digits." };
    }

    const users = await dbService.getUsers();
    const matched: any = users.find((u: any) => u.id === targetUserId);
    if (!matched) {
      return { success: false, message: "User not found." };
    }

    const cred = this.getOrCreateCredential(targetUserId, matched.email || "");
    const { hash, salt } = hashPinServer(newPin, targetUserId);
    cred.pinHash = hash;
    cred.pinSalt = salt;

    await dbService.addAuditLog({
      user_name: authorName || "Admin",
      action: "Admin Reset PIN",
      target_type: "User",
      target_id: targetUserId,
      target_name: `${matched.first || matched.first_name} ${matched.last || matched.last_name}`,
      details: "Updated security workstation access PIN"
    });

    return { success: true, message: "Workstation security PIN updated successfully." };
  },

  // ADMIN REVOKE SESSIONS
  async adminRevokeSessions(targetUserId: string, authorName?: string): Promise<{ success: boolean; message: string }> {
    const cred = credentialsStore.get(targetUserId);
    if (cred) {
      cred.sessionRevokedAt = new Date().toISOString();
    }

    // Delete active sessions for user
    for (const [token, session] of sessionsStore.entries()) {
      if (session.userId === targetUserId) {
        sessionsStore.delete(token);
      }
    }

    await dbService.addAuditLog({
      user_name: authorName || "Admin",
      action: "Admin Revoked Sessions",
      target_type: "User",
      target_id: targetUserId,
      target_name: targetUserId,
      details: "Invalidated all active user login sessions across web & desktop"
    });

    return { success: true, message: "All active sessions revoked successfully." };
  },

  // ADMIN UNLOCK USER
  async adminUnlockUser(targetUserId: string, authorName?: string): Promise<{ success: boolean; message: string }> {
    const cred = credentialsStore.get(targetUserId);
    if (cred) {
      cred.failedAttempts = 0;
      cred.lockedUntil = null;
    }

    await dbService.addAuditLog({
      user_name: authorName || "Admin",
      action: "Admin Unlocked User",
      target_type: "User",
      target_id: targetUserId,
      target_name: targetUserId,
      details: "Reset failed login attempts and unlocked workstation account"
    });

    return { success: true, message: "Account unlocked successfully." };
  }
};
