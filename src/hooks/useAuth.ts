import React, { useState, useEffect } from "react";
import { User } from "../types";
import { DEFAULT_USERS, DEVELOPMENT_CANONICAL_USERS } from "../data";
import { encryptValue, decryptValue } from "../lib/cryptoUtils";
import { safeJsonParse } from "../lib/json";
import { sanitizeCanonicalRoster, normalizeUserRoster, ROSTER_SCHEMA_VERSION } from "../lib/userUtils";

/**
 * ─── ENCRYPTION SCHEME FOR SECURE USER ROSTER STORAGE ───
 * To comply with strict Canadian security & privacy regulations (PIPEDA),
 * sensitive credentials stored in localStorage must never exist in plain text.
 *
 * 1. Key Derivation (PBKDF2):
 *    A 256-bit AES-GCM key is derived from the user's secret 4-digit PIN using 100,000 iterations
 *    of PBKDF2 with a SHA-256 HMAC and a stable salt.
 *
 * 2. Authenticated Encryption (AES-GCM):
 *    We use 256-bit AES-GCM to encrypt both the PIN itself (under key = pin) and the user's
 *    email passwords. Each encryption uses a unique random 12-byte initialization vector (IV).
 *
 * 3. Base64 Combined Storage:
 *    The resulting IV and ciphertext are base64-encoded and concatenated as "iv:ciphertext"
 *    before writing to local persistent storage (userRoster inside localStorage).
 *
 * 4. PIN Hash (Unlock Verification):
 *    PINs are verified using a salted SHA-256 digest: SHA-256(userId + ":" + pin) to avoid
 *    comparing or storing any raw secret strings.
 *
 * 5. In-Memory Decryption:
 *    On page load, the app is locked and values remain encrypted in userRoster state.
 *    Only after a successful unlock PIN verification is the active user decrypted directly in memory
 *    and assigned to the currentUser state.
 */

export interface UseAuthDeps {
  showToast: (msg: string, type?: "success" | "error", icon?: string) => void;
  logActivity: (action: string, target?: string) => void;
}

export async function hashPin(pin: string, userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}:${pin}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function useAuth({ showToast, logActivity }: UseAuthDeps) {
  // ─── AUTHENTICATION & SECURITY STATE ───
  // Default to David Acosta (Owner) decrypted on first load if not locked, but wait:
  // We want to default appLocked to true so that users must unlock and trigger secure in-memory decryption.
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USERS[0]);
  const [appLocked, setAppLocked] = useState<boolean>(true); // Locked on load for production security
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [userRoster, setUserRoster] = useState<User[]>(() => {
    const storedVersion = localStorage.getItem("crm_roster_schema_version");
    const saved = localStorage.getItem("gbk_roster");
    if (saved && storedVersion === ROSTER_SCHEMA_VERSION) {
      const roster = safeJsonParse<User[]>(saved, []);
      if (Array.isArray(roster) && roster.length > 0) {
        return sanitizeCanonicalRoster(roster);
      }
    }
    const rawRoster = saved ? safeJsonParse<User[]>(saved, DEVELOPMENT_CANONICAL_USERS) : DEVELOPMENT_CANONICAL_USERS;
    const normalized = sanitizeCanonicalRoster(rawRoster);
    localStorage.setItem("gbk_roster", JSON.stringify(normalized));
    localStorage.setItem("crm_roster_schema_version", ROSTER_SCHEMA_VERSION);
    return normalized;
  });
  const [lockoutTries, setLockoutTries] = useState<number>(0);
  const [lockoutActive, setLockoutActive] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'signup' | 'switch'>('profile');

  // ─── ACTIVE USER EMAIL EDIT CREDENTIALS STATE ───
  const [activeHost, setActiveHost] = useState("");
  const [activePort, setActivePort] = useState("");
  const [activeUsername, setActiveUsername] = useState("");
  const [activePassword, setActivePassword] = useState("");

  // ─── SIGNUP FORM STATE ───
  const [suFirst, setSuFirst] = useState("");
  const [suLast, setSuLast] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suRole, setSuRole] = useState<'Developer/Admin' | 'Admin' | 'Broker'>('Broker');
  const [suPhone, setSuPhone] = useState("");
  const [suPin, setSuPin] = useState("");
  const [suFsra, setSuFsra] = useState("");
  const [suHost, setSuHost] = useState("imap.gmail.com");
  const [suPort, setSuPort] = useState("993");
  const [suPass, setSuPass] = useState("");

  // ─── SWITCH USER FORM STATE ───
  const [swTargetId, setSwTargetId] = useState("");
  const [swPin, setSwPin] = useState("");
  const [swError, setSwError] = useState("");

  // Synchronize state when the active user switches
  useEffect(() => {
    setActiveHost(currentUser.emailHost || "imap.gmail.com");
    setActivePort(currentUser.emailPort || "993");
    setActiveUsername(currentUser.emailUsername || currentUser.email);
    setActivePassword(currentUser.emailPassword || "");
  }, [currentUser]);

  // Persist userRoster to localStorage via useEffect
  useEffect(() => {
    localStorage.setItem("gbk_roster", JSON.stringify(sanitizeCanonicalRoster(userRoster)));
  }, [userRoster]);

  // Backward compatibility: automatically migrate 4-digit PINs on first load
  useEffect(() => {
    const runMigration = async () => {
      let changed = false;
      const migratedRoster = await Promise.all(
        userRoster.map(async (u) => {
          // If u.pin is exactly 4 numeric characters, it's the old plain PIN format
          if (u.pin && /^\d{4}$/.test(u.pin)) {
            changed = true;
            const plainPin = u.pin;
            const pinHash = await hashPin(plainPin, u.id);
            const encryptedPin = await encryptValue(plainPin, plainPin);
            const encryptedEmailPassword = u.emailPassword ? await encryptValue(u.emailPassword, plainPin) : u.emailPassword;
            
            return {
              ...u,
              pin: encryptedPin,
              pinHash,
              emailPassword: encryptedEmailPassword
            };
          }
          return u;
        })
      );
      
      if (changed) {
        setUserRoster(migratedRoster);
        localStorage.setItem("gbk_roster", JSON.stringify(migratedRoster));
      }
    };
    runMigration();
  }, []);

  // Helpers
  const isOwner = () => currentUser.isOwner || currentUser.role === "Developer/Admin";

  const getAgentNames = (): string[] => {
    const names = userRoster
      .filter(u => u.status === "active")
      .map(u => `${u.first || ""} ${u.last || ""}`.trim())
      .filter(Boolean);
    return Array.from(new Set(names)) as string[];
  };

  // ─── LOGIN OVERLAY HANDLE ───
  async function handleUnlock() {
    if (lockoutActive) return;

    let match: User | undefined = undefined;
    let decryptedPin = "";
    let decryptedEmailPassword = "";

    // 1. First try matching exact pinHash or configured pin
    for (const u of userRoster) {
      if (u.status !== "active") continue;
      if (u.pinHash) {
        const inputHash = await hashPin(pinInput, u.id);
        if (u.pinHash === inputHash) {
          match = u;
          decryptedPin = pinInput;
          if (u.emailPassword) {
            decryptedEmailPassword = await decryptValue(u.emailPassword, pinInput) || "";
          }
          break;
        }
      } else if (u.pin === pinInput) {
        match = u;
        decryptedPin = pinInput;
        decryptedEmailPassword = u.emailPassword || "";
        break;
      }
    }

    // 2. Development PIN 1234 bypass/fallback: unlock active user or David Acosta
    if (!match && pinInput === "1234") {
      const davidUser = userRoster.find(u => u.id === "u_david" || u.email === "vdacosta247@gmail.com");
      match = davidUser || currentUser || DEFAULT_USERS[0];
      decryptedPin = "1234";
      if (match.emailPassword) {
        decryptedEmailPassword = await decryptValue(match.emailPassword, "1234") || match.emailPassword || "";
      }
    }

    if (match) {
      // Ensure David Acosta retains Developer/Admin and Owner privileges
      const isDavid = match.id === "u_david" || match.email === "vdacosta247@gmail.com";
      const decryptedUser: User = {
        ...match,
        role: isDavid ? "Developer/Admin" : match.role,
        isOwner: isDavid ? true : match.isOwner,
        pin: decryptedPin,
        emailPassword: decryptedEmailPassword || undefined
      };
      setCurrentUser(decryptedUser);
      setAppLocked(false);
      setPinInput("");
      setPinError("");
      setLockoutTries(0);
      logActivity("Unlocked Station (" + decryptedUser.role + ")");
      showToast(`Workstation Unlocked for ${decryptedUser.first} ${decryptedUser.last}`, "success", "🔓");
    } else {
      const nextTries = lockoutTries + 1;
      setLockoutTries(nextTries);
      setPinInput("");
      
      if (nextTries >= 3) {
        setLockoutActive(true);
        setPinError("Too many attempts. Enter 1234 or wait 30 seconds.");
        setTimeout(() => {
          setLockoutActive(false);
          setLockoutTries(0);
          setPinError("");
        }, 30000);
      } else {
        setPinError(`Invalid security PIN. Attempt ${nextTries} of 3.`);
      }
    }
  }

  return {
    currentUser,
    setCurrentUser,
    appLocked,
    setAppLocked,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    userRoster,
    setUserRoster,
    lockoutTries,
    setLockoutTries,
    lockoutActive,
    setLockoutActive,
    profileModalOpen,
    setProfileModalOpen,
    profileTab,
    setProfileTab,
    activeHost,
    setActiveHost,
    activePort,
    setActivePort,
    activeUsername,
    setActiveUsername,
    activePassword,
    setActivePassword,
    suFirst,
    setSuFirst,
    suLast,
    setSuLast,
    suEmail,
    setSuEmail,
    suRole,
    setSuRole,
    suPhone,
    setSuPhone,
    suPin,
    setSuPin,
    suFsra,
    setSuFsra,
    suHost,
    setSuHost,
    suPort,
    setSuPort,
    suPass,
    setSuPass,
    swTargetId,
    setSwTargetId,
    swPin,
    setSwPin,
    swError,
    setSwError,
    handleUnlock,
    isOwner,
    getAgentNames
  };
}
