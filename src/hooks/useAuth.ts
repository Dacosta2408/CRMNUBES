import React, { useState, useEffect } from "react";
import { User } from "../types";
import { DEFAULT_USERS, DEVELOPMENT_CANONICAL_USERS } from "../data";
import { safeJsonParse } from "../lib/json";
import { sanitizeCanonicalRoster, ROSTER_SCHEMA_VERSION } from "../lib/userUtils";

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

  // Persist userRoster to localStorage without plaintext PINs/passwords
  useEffect(() => {
    const sanitized = userRoster.map(({ pin, emailPassword, pinHash, ...rest }) => rest as User);
    localStorage.setItem("gbk_roster", JSON.stringify(sanitized));
  }, [userRoster]);

  // Check active session on initial load
  useEffect(() => {
    const checkSession = async () => {
      const token = sessionStorage.getItem("gbk_session_token");
      if (token) {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            setCurrentUser(data.user);
            setAppLocked(false);
          }
        } catch {
          // Keep workstation locked on error
        }
      }
    };
    checkSession();
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

  // ─── BACKEND AUTHORITATIVE UNLOCK HANDLE ───
  async function handleUnlock() {
    if (lockoutActive) return;

    if (!pinInput.trim()) {
      setPinError("Please enter your PIN or password.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: currentUser.email || "vdacosta247@gmail.com",
          credentialInput: pinInput.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        if (data.token) {
          sessionStorage.setItem("gbk_session_token", data.token);
        }
        setCurrentUser(data.user);
        setAppLocked(false);
        setPinInput("");
        setPinError("");
        setLockoutTries(0);
        logActivity("Unlocked Station (" + data.user.role + ")");
        showToast(`Workstation Unlocked for ${data.user.first} ${data.user.last}`, "success", "🔓");
      } else {
        const nextTries = lockoutTries + 1;
        setLockoutTries(nextTries);
        setPinInput("");

        if (res.status === 403) {
          setLockoutActive(true);
          setPinError(data.message || "Account locked due to failed attempts.");
        } else {
          setPinError(data.message || `Invalid credentials. Attempt ${nextTries} of 5.`);
        }
      }
    } catch {
      setPinError("Authentication server unreachable. Please try again.");
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
