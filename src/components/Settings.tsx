import React, { useState, useEffect, useRef } from "react";
import { 
  User as UserIcon, Bell, Shield, Sliders, Mail, Lock, Laptop, Smartphone,
  CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Trash2, Upload, Camera,
  RefreshCw, X, ShieldCheck, Info, Key, Eye, EyeOff, Globe,
  Briefcase, Building, Phone as PhoneIcon, BadgeCheck, Check, Clock, LogOut, ExternalLink, ShieldAlert,
  Keyboard, Bug, Activity, Download, ChevronUp, ChevronDown, Terminal, Cpu, WifiOff, Database, ArrowUpCircle, Sparkles
} from "lucide-react";
import { User, Client } from "../types";
import { Avatar } from "./Avatar";
import { encryptValue } from "../lib/cryptoUtils";
import { hashPin } from "../hooks/useAuth";
import { ErrorBoundary, ErrorLogEntry } from "./ErrorBoundary";
import { useServiceWorker } from "../hooks/useServiceWorker";
import { getStorageUsageEstimate, clearAppCache } from "../lib/syncQueue";
import { 
  CURRENT_APP_VERSION, 
  getUpdateSettings, 
  saveUpdateSettings, 
  checkForUpdates, 
  getUpdateHistory, 
  UpdateSettings, 
  UpdateCheckResult 
} from "../lib/updateChecker";
import { electronUpdater } from "../lib/electronUpdater";
import { 
  MAJOR_TIMEZONES, 
  DATE_FORMAT_OPTIONS, 
  getUserTimeZone, 
  setUserTimeZone, 
  getUserDateFormat, 
  setUserDateFormat, 
  getDetectedSystemTimeZone, 
  getCurrentTimeInTimezone, 
  formatDateInTimezone, 
  formatDateTime 
} from "../lib/timeUtils";

interface SettingsProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  userRoster: User[];
  setUserRoster: React.Dispatch<React.SetStateAction<User[]>>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onLockApp?: () => void;
  onOpenShortcutsModal?: () => void;
  clients: Client[];
  bridgeOnline: boolean;
}

const TestBuggyComponent: React.FC = () => {
  throw new Error("This is an intentional test rendering exception generated to verify that the ErrorBoundary functions properly.");
};

export const Settings: React.FC<SettingsProps> = ({
  currentUser,
  setCurrentUser,
  userRoster,
  setUserRoster,
  showToast,
  onLockApp,
  onOpenShortcutsModal,
  clients,
  bridgeOnline
}) => {
  // Navigation tabs
  type SettingsTab = "profile" | "notifications" | "security" | "preferences" | "email" | "diagnostics" | "offline" | "updates";
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Software Update Settings State
  const [upSettings, setUpSettings] = useState<UpdateSettings>(getUpdateSettings());
  const [upCheckResult, setUpCheckResult] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUp, setIsCheckingUp] = useState<boolean>(false);
  const [upDownloadProgress, setUpDownloadProgress] = useState<number>(0);
  const [isDownloadingUp, setIsDownloadingUp] = useState<boolean>(false);

  const handleUpdateSettingChange = <K extends keyof UpdateSettings>(key: K, value: UpdateSettings[K]) => {
    const updated = { ...upSettings, [key]: value };
    setUpSettings(updated);
    saveUpdateSettings(updated);
    showToast("Update settings saved", "info", "⚙️");
  };

  const handleCheckUpdatesNow = async () => {
    setIsCheckingUp(true);
    showToast("Checking for software updates...", "info", "🔍");
    try {
      const res = await checkForUpdates(true);
      setUpCheckResult(res);
      setUpSettings(getUpdateSettings());
      if (res.hasUpdate) {
        showToast(`New update v${res.manifest?.latestVersion} available!`, "success", "✨");
      } else {
        showToast(`You are on the latest version (v${CURRENT_APP_VERSION})`, "success", "✅");
      }
    } catch (e: any) {
      showToast("Error checking for updates", "error");
    } finally {
      setIsCheckingUp(false);
    }
  };

  const handleManualDownloadUpdate = async () => {
    if (!upCheckResult?.manifest) return;
    setIsDownloadingUp(true);
    setUpDownloadProgress(0);
    showToast("Starting background update download...", "info", "⬇️");

    await electronUpdater.startDownload(upCheckResult.manifest, (pct) => {
      setUpDownloadProgress(pct);
    });

    setIsDownloadingUp(false);
    showToast("Update downloaded! Click Install & Restart to apply.", "success", "🎉");
  };

  // Service Worker & Offline Sync Hook
  const { 
    isOnline, 
    hasUpdate, 
    isSyncing, 
    pendingCount, 
    lastSyncedAt, 
    applyUpdate, 
    syncNow 
  } = useServiceWorker();

  const [offlineEnabled, setOfflineEnabled] = useState<boolean>(() => {
    return localStorage.getItem("gbk_offline_storage_enabled") !== "false";
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem("gbk_offline_auto_sync") !== "false";
  });
  const [storageEstimate, setStorageEstimate] = useState<{ usageMB: string; quotaMB: string }>({ usageMB: "0.00", quotaMB: "50" });

  useEffect(() => {
    getStorageUsageEstimate().then(setStorageEstimate);
  }, [activeTab, pendingCount]);

  const handleToggleOfflineEnabled = (val: boolean) => {
    setOfflineEnabled(val);
    localStorage.setItem("gbk_offline_storage_enabled", String(val));
    showToast(val ? "Offline storage enabled" : "Offline storage disabled", "info", "📶");
  };

  const handleToggleAutoSync = (val: boolean) => {
    setAutoSyncEnabled(val);
    localStorage.setItem("gbk_offline_auto_sync", String(val));
    showToast(val ? "Automatic background sync enabled" : "Automatic background sync disabled", "info", "🔄");
  };

  const handleClearCache = async () => {
    const success = await clearAppCache();
    if (success) {
      const est = await getStorageUsageEstimate();
      setStorageEstimate(est);
      showToast("App cache and offline storage cleared", "success", "🧹");
    } else {
      showToast("Failed clearing offline cache", "error");
    }
  };

  // --- DIAGNOSTICS & ERROR HANDLING STATE ---
  const [showDevErrorDetails, setShowDevErrorDetails] = useState<boolean>(() => {
    return localStorage.getItem("gbk_show_dev_error_details") !== "false";
  });

  const [autoReportErrors, setAutoReportErrors] = useState<boolean>(() => {
    return localStorage.getItem("gbk_auto_report_errors") === "true";
  });

  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>(() => {
    try {
      const str = localStorage.getItem("gbk_error_logs");
      return str ? JSON.parse(str) : [];
    } catch {
      return [];
    }
  });

  const [testErrorActive, setTestErrorActive] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleToggleDevDetails = (val: boolean) => {
    setShowDevErrorDetails(val);
    localStorage.setItem("gbk_show_dev_error_details", String(val));
    showToast(val ? "Detailed error messages enabled" : "Detailed error messages hidden", "info", "🐛");
  };

  const handleToggleAutoReport = (val: boolean) => {
    setAutoReportErrors(val);
    localStorage.setItem("gbk_auto_report_errors", String(val));
    showToast(val ? "Automatic error reporting enabled" : "Automatic error reporting disabled", "info", "🛡️");
  };

  const handleClearLogs = () => {
    localStorage.removeItem("gbk_error_logs");
    setErrorLogs([]);
    showToast("Error log cleared successfully", "success", "🧹");
  };

  const handleExportLogs = () => {
    if (errorLogs.length === 0) {
      showToast("No errors logged to export", "info");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(errorLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gbk_error_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Error log exported as JSON", "success", "📥");
  };

  // --- 1. PROFILE STATE ---
  const [profileFirst, setProfileFirst] = useState(currentUser.first);
  const [profileLast, setProfileLast] = useState(currentUser.last);
  const [profileDisplayName, setProfileDisplayName] = useState(currentUser.displayName || `${currentUser.first} ${currentUser.last}`);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || "");
  const [profilePhoto, setProfilePhoto] = useState(currentUser.photo || "");
  const [profileJobTitle, setProfileJobTitle] = useState(currentUser.jobTitle || "Senior Mortgage Agent");
  const [profileFsra, setProfileFsra] = useState(currentUser.fsraNum || "");
  const [profileEoPolicy, setProfileEoPolicy] = useState(currentUser.eoPolicy || "");

  // Local File Upload / Avatar State
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile values when currentUser changes
  useEffect(() => {
    setProfileFirst(currentUser.first);
    setProfileLast(currentUser.last);
    setProfileDisplayName(currentUser.displayName || `${currentUser.first} ${currentUser.last}`);
    setProfileEmail(currentUser.email);
    setProfilePhone(currentUser.phone || "");
    setProfilePhoto(currentUser.photo || "");
    setProfileJobTitle(currentUser.jobTitle || "Senior Mortgage Agent");
    setProfileFsra(currentUser.fsraNum || "");
    setProfileEoPolicy(currentUser.eoPolicy || "");
  }, [currentUser]);

  // Clean up object URLs on change/unmount
  useEffect(() => {
    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [objectUrlToRevoke]);

  // Process selected image file (for file input & drag and drop)
  const processSelectedFile = (file: File) => {
    setAvatarError(null);

    // Validate image MIME type
    if (!file.type.startsWith("image/")) {
      setAvatarError("Selected file is not an image. Please upload a JPG, PNG, WEBP, or GIF file.");
      return;
    }

    // Validate file size limit (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Selected file exceeds the 5 MB maximum size limit. Please choose a smaller image.");
      return;
    }

    // Revoke previous object URL if present
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }

    // Generate immediate object URL preview
    const tempUrl = URL.createObjectURL(file);
    setObjectUrlToRevoke(tempUrl);

    // Read file as base64 Data URL for persistent storage across reloads
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setProfilePhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Reset input value to allow re-selecting the same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Handle local file selection for avatar photo
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Remove photo avatar
  const handleRemovePhoto = () => {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
      setObjectUrlToRevoke(null);
    }
    setProfilePhoto("");
    setAvatarError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFirst || !profileLast || !profileEmail) {
      showToast("First name, last name, and email address are required.", "error");
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      first: profileFirst,
      last: profileLast,
      displayName: profileDisplayName,
      email: profileEmail,
      phone: profilePhone || undefined,
      photo: profilePhoto || null,
      jobTitle: profileJobTitle,
      fsraNum: profileFsra || undefined,
      eoPolicy: profileEoPolicy || undefined
    };

    // Update active user state
    setCurrentUser(updatedUser);

    // Update in roster and local storage
    const updatedRoster = userRoster.map(u => u.id === currentUser.id ? updatedUser : u);
    setUserRoster(updatedRoster);
    localStorage.setItem("gbk_roster", JSON.stringify(updatedRoster));

    showToast("Personal profile updated successfully!", "success", "👤");
  };

  // --- 2. NOTIFICATIONS STATE ---
  const [notifTaskReminders, setNotifTaskReminders] = useState(true);
  const [notifFileUpdates, setNotifFileUpdates] = useState(true);
  const [notifFollowUps, setNotifFollowUps] = useState(true);
  const [notifDocAlerts, setNotifDocAlerts] = useState(true);
  const [notifCommsAlerts, setNotifCommsAlerts] = useState(false);
  const [notifEmailDigest, setNotifEmailDigest] = useState(true);

  // Load notifications state
  useEffect(() => {
    const saved = localStorage.getItem(`gbk_notif_prefs_${currentUser.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifTaskReminders(parsed.tasks ?? true);
        setNotifFileUpdates(parsed.files ?? true);
        setNotifFollowUps(parsed.followups ?? true);
        setNotifDocAlerts(parsed.docs ?? true);
        setNotifCommsAlerts(parsed.comms ?? false);
        setNotifEmailDigest(parsed.emailDigest ?? true);
      } catch (e) {
        console.error("Failed loading notification preferences", e);
      }
    }
  }, [currentUser.id]);

  const handleSaveNotifications = () => {
    const prefs = {
      tasks: notifTaskReminders,
      files: notifFileUpdates,
      followups: notifFollowUps,
      docs: notifDocAlerts,
      comms: notifCommsAlerts,
      emailDigest: notifEmailDigest
    };
    localStorage.setItem(`gbk_notif_prefs_${currentUser.id}`, JSON.stringify(prefs));
    showToast("Notification preferences saved successfully!", "success", "🔔");
  };

  // --- 3. SECURITY STATE ---
  // Workstation PIN & MFA
  const [userPin, setUserPin] = useState(currentUser.pin || "0000");
  const [showPin, setShowPin] = useState(false);
  const [requirePinForSin, setRequirePinForSin] = useState(() => {
    return localStorage.getItem("gbk_security_pin_sin") === "true";
  });
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Password Requirements Validation
  const reqMinLength = newPassword.length >= 8;
  const reqHasUpper = /[A-Z]/.test(newPassword);
  const reqHasLower = /[a-z]/.test(newPassword);
  const reqHasNumber = /[0-9]/.test(newPassword);
  const reqHasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const reqMetCount = [reqMinLength, reqHasUpper, reqHasLower, reqHasNumber, reqHasSpecial].filter(Boolean).length;

  const getPasswordStrength = () => {
    if (newPassword.length === 0) {
      return { label: "Not Entered", color: "bg-[var(--color-border)]", width: "0%", textClass: "text-[var(--color-text-muted)]" };
    }
    if (reqMetCount <= 2) {
      return { label: "Weak", color: "bg-red-500", width: "33%", textClass: "text-red-500" };
    }
    if (reqMetCount <= 4) {
      return { label: "Medium", color: "bg-amber-500", width: "66%", textClass: "text-amber-500" };
    }
    return { label: "Strong", color: "bg-emerald-500", width: "100%", textClass: "text-emerald-500" };
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeFeedback(null);

    if (!currentPassword.trim()) {
      setPasswordChangeFeedback({ type: "error", msg: "Please enter your current account password." });
      showToast("Please enter your current password.", "error");
      return;
    }

    if (reqMetCount < 5) {
      setPasswordChangeFeedback({ type: "error", msg: "New password does not fulfill all 5 security strength criteria." });
      showToast("New password must meet all strength requirements.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeFeedback({ type: "error", msg: "New password and confirmation password do not match." });
      showToast("Confirm password does not match new password.", "error");
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChangeFeedback({ type: "success", msg: "Account password changed successfully! Your session remains secured." });
      showToast("Account password changed successfully!", "success", "🔐");
    }, 900);
  };

  // Active Device Sessions State
  const [activeSessions, setActiveSessions] = useState([
    { id: "sess-1", device: "Windows PC - Chrome 127.0", location: "Toronto, ON, Canada", lastActive: "Active now", ip: "192.168.1.**", isCurrent: true },
    { id: "sess-2", device: "iPhone 15 Pro - Safari Mobile", location: "Toronto, ON, Canada", lastActive: "2 hours ago", ip: "172.56.42.**", isCurrent: false },
    { id: "sess-3", device: "MacBook Pro - Firefox 128.0", location: "Vancouver, BC, Canada", lastActive: "Yesterday at 4:15 PM", ip: "24.114.88.**", isCurrent: false },
  ]);

  const handleSignOutSession = (sessionId: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    showToast("Session signed out successfully.", "success", "🚪");
  };

  const handleSignOutAllOtherSessions = () => {
    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast("Signed out of all other active sessions.", "success", "🔒");
  };

  // Security Toggles Settings
  const [requirePasswordForSensitive, setRequirePasswordForSensitive] = useState(() => {
    return localStorage.getItem("gbk_sec_req_pwd_sensitive") !== "false";
  });
  const [sessionTimeout, setSessionTimeout] = useState(() => {
    return localStorage.getItem("gbk_sec_session_timeout") || "30 min";
  });

  const handleToggleRequirePasswordSensitive = () => {
    const nextVal = !requirePasswordForSensitive;
    setRequirePasswordForSensitive(nextVal);
    localStorage.setItem("gbk_sec_req_pwd_sensitive", nextVal ? "true" : "false");
    showToast(`Sensitive actions password check ${nextVal ? "enabled" : "disabled"}.`, "info", "🛡️");
  };

  const handleChangeSessionTimeout = (val: string) => {
    setSessionTimeout(val);
    localStorage.setItem("gbk_sec_session_timeout", val);
    showToast(`Session timeout updated to ${val}.`, "info", "⏱️");
  };

  // Login History Mock Data
  const loginHistoryList = [
    { id: "lh1", dateTime: "Aug 5, 2026 - 06:42 PM", device: "Windows PC - Chrome", location: "Toronto, ON", status: "Success", ip: "192.168.1.**" },
    { id: "lh2", dateTime: "Aug 5, 2026 - 08:15 AM", device: "iPhone 15 Pro - Safari", location: "Toronto, ON", status: "Success", ip: "172.56.42.**" },
    { id: "lh3", dateTime: "Aug 4, 2026 - 11:30 PM", device: "Unknown Device - Linux", location: "Montreal, QC", status: "Failed", ip: "45.33.18.**" },
    { id: "lh4", dateTime: "Aug 3, 2026 - 02:10 PM", device: "MacBook Pro - Firefox", location: "Vancouver, BC", status: "Success", ip: "24.114.88.**" },
    { id: "lh5", dateTime: "Aug 1, 2026 - 09:05 AM", device: "Windows PC - Chrome", location: "Toronto, ON", status: "Success", ip: "192.168.1.**" },
  ];

  const handleSaveSecurity = async () => {
    if (userPin.length < 4 || isNaN(Number(userPin))) {
      showToast("Access PIN must be a 4-digit number.", "error");
      return;
    }

    const pinHash = await hashPin(userPin, currentUser.id);
    const encryptedPin = await encryptValue(userPin, userPin);

    const updatedUserForRoster: User = {
      ...currentUser,
      pin: encryptedPin,
      pinHash
    };

    const decryptedUser: User = {
      ...currentUser,
      pin: userPin
    };

    setCurrentUser(decryptedUser);

    const updatedRoster = userRoster.map(u => u.id === currentUser.id ? updatedUserForRoster : u);
    setUserRoster(updatedRoster);
    localStorage.setItem("gbk_roster", JSON.stringify(updatedRoster));
    localStorage.setItem("gbk_security_pin_sin", requirePinForSin ? "true" : "false");

    showToast("Personal security preferences updated!", "success", "🔒");
  };

  const handleSimulateResetPassword = () => {
    showToast("A reset password link has been sent to your email inbox.", "success", "✉️");
  };

  const handleVerifyMfa = () => {
    if (mfaCode === "123456" || mfaCode.length === 6) {
      setMfaEnabled(true);
      setShowMfaSetup(false);
      showToast("Two-factor authentication successfully enabled!", "success", "🔐");
    } else {
      showToast("Verification code is incorrect. Try 123456 for testing.", "error");
    }
  };

  // --- 4. PERSONAL PREFERENCES STATE ---
  // NOTE: Changes to timezone and date format will affect all date/time displays across the application.
  const [prefLanding, setPrefLanding] = useState(() => localStorage.getItem("gbk_pref_landing") || "dashboard");
  const [prefDashboard, setPrefDashboard] = useState(() => localStorage.getItem("gbk_pref_dashboard_view") || "bento");
  const [prefLayout, setPrefLayout] = useState(() => localStorage.getItem("gbk_pref_layout_mode") || "table");
  const [prefDateFormat, setPrefDateFormat] = useState(() => getUserDateFormat());
  const [prefTimeFormat, setPrefTimeFormat] = useState(() => localStorage.getItem("gbk_pref_time_format") || "12");
  const [prefTimeZone, setPrefTimeZone] = useState(() => getUserTimeZone());
  const [prefLanguage, setPrefLanguage] = useState(() => localStorage.getItem("gbk_pref_language") || "English");
  const [prefCurrency, setPrefCurrency] = useState(() => localStorage.getItem("gbk_pref_currency") || "USD ($)");
  const [showTestPreview, setShowTestPreview] = useState(false);

  const handleSavePreferences = () => {
    localStorage.setItem("gbk_pref_landing", prefLanding);
    localStorage.setItem("gbk_pref_dashboard_view", prefDashboard);
    localStorage.setItem("gbk_pref_layout_mode", prefLayout);
    localStorage.setItem("gbk_pref_time_format", prefTimeFormat);
    localStorage.setItem("gbk_pref_language", prefLanguage);
    localStorage.setItem("gbk_pref_currency", prefCurrency);
    setUserDateFormat(prefDateFormat);
    setUserTimeZone(prefTimeZone);
    
    showToast("Personal workspace preferences saved! Date/time displays updated across app.", "success", "⚙️");
  };

  // --- 5. EMAIL & SMTP CONFIGURATION STATE ---
  const [smtpHost, setSmtpHost] = useState<string>(() => localStorage.getItem("gbk_gmail_smtp_host") || "smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState<string>(() => localStorage.getItem("gbk_gmail_smtp_port") || "587");
  const [smtpUsername, setSmtpUsername] = useState<string>(() => localStorage.getItem("gbk_gmail_smtp_username") || currentUser.email || "");
  const [smtpPassword, setSmtpPassword] = useState<string>(() => localStorage.getItem("gbk_gmail_smtp_password") || "");
  const [isSmtpConfigured, setIsSmtpConfigured] = useState<boolean>(() => localStorage.getItem("gbk_gmail_smtp_configured") === "true");

  useEffect(() => {
    const savedHost = localStorage.getItem("gbk_gmail_smtp_host");
    const savedPort = localStorage.getItem("gbk_gmail_smtp_port");
    const savedUser = localStorage.getItem("gbk_gmail_smtp_username");
    const savedPass = localStorage.getItem("gbk_gmail_smtp_password");
    const savedConfigured = localStorage.getItem("gbk_gmail_smtp_configured") === "true";

    if (savedHost) setSmtpHost(savedHost);
    if (savedPort) setSmtpPort(savedPort);
    if (savedUser) setSmtpUsername(savedUser);
    if (savedPass) setSmtpPassword(savedPass);
    setIsSmtpConfigured(savedConfigured);
  }, [currentUser]);

  const autoDetectSmtpSettings = (email: string) => {
    if (!email || !email.includes("@")) return;
    const parts = email.split("@");
    const domain = parts[1]?.toLowerCase().trim();
    if (!domain) return;

    let host = "";
    let port = "587";

    if (domain === "gmail.com" || domain === "googlemail.com") {
      host = "smtp.gmail.com";
      port = "587";
    } else if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com" || domain === "office365.com") {
      host = "smtp.office365.com";
      port = "587";
    } else if (domain === "yahoo.com" || domain === "yahoo.ca") {
      host = "smtp.mail.yahoo.com";
      port = "587";
    } else if (domain === "icloud.com" || domain === "me.com") {
      host = "smtp.mail.me.com";
      port = "587";
    }

    if (host) {
      setSmtpHost(host);
      setSmtpPort(port);
    }
  };

  const handleSmtpUsernameChange = (val: string) => {
    setSmtpUsername(val);
    autoDetectSmtpSettings(val);
  };

  const handleSaveSmtpSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smtpHost || !smtpPort || !smtpUsername) {
      showToast("SMTP Host, Port, and Email Address are required.", "error");
      return;
    }

    localStorage.setItem("gbk_gmail_smtp_host", smtpHost);
    localStorage.setItem("gbk_gmail_smtp_port", smtpPort);
    localStorage.setItem("gbk_gmail_smtp_username", smtpUsername);
    if (smtpPassword) {
      localStorage.setItem("gbk_gmail_smtp_password", smtpPassword);
    }
    localStorage.setItem("gbk_gmail_smtp_configured", "true");
    setIsSmtpConfigured(true);

    showToast("Personal SMTP email settings saved!", "success", "✉️");
  };

  const handleClearSmtpSettings = () => {
    localStorage.removeItem("gbk_gmail_smtp_configured");
    localStorage.removeItem("gbk_gmail_smtp_host");
    localStorage.removeItem("gbk_gmail_smtp_port");
    localStorage.removeItem("gbk_gmail_smtp_username");
    localStorage.removeItem("gbk_gmail_smtp_password");

    setIsSmtpConfigured(false);
    setSmtpPassword("");
    showToast("SMTP email settings disconnected.", "info", "🧹");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Title Header */}
      <div className="p-6 border-b border-[var(--color-border)]/70 bg-[var(--color-surface)] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#B39DDB] font-sans flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#B39DDB]" /> Personal Account Settings
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Manage your personal broker profile, avatar photo, notifications, access code, and interface preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-1 rounded-lg">
            Signed in as: <strong className="text-[var(--color-text)]">{currentUser.first} {currentUser.last}</strong>
          </span>
          {onLockApp && (
            <button 
              onClick={onLockApp}
              className="text-xs font-semibold px-3 py-1.5 bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]/70 hover:bg-[var(--color-error-subtle)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> Lock Session
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Sub-Navigation Tabs */}
        <aside className="w-64 border-r border-[var(--color-border)]/70 bg-[var(--color-surface)]/40 shrink-0 flex flex-col p-4 gap-1 overflow-y-auto select-none">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[1.5px] font-bold px-3 py-1.5 mb-1">
            Personal Options
          </div>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "profile" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" /> My Profile &amp; Avatar
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "preferences" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" /> Personal Preferences
          </button>
          
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "security" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" /> Security
          </button>
          
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "notifications" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" /> Notifications
          </button>

          <button
            onClick={() => setActiveTab("email")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "email" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" /> Email &amp; SMTP
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between cursor-pointer ${
              activeTab === "diagnostics" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <span className="flex items-center gap-3">
              <Bug className="w-4 h-4 shrink-0 text-amber-400" /> Diagnostics &amp; Errors
            </span>
            {errorLogs.length > 0 && (
              <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                {errorLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("offline")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between cursor-pointer ${
              activeTab === "offline" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <span className="flex items-center gap-3">
              <WifiOff className="w-4 h-4 shrink-0 text-emerald-400" /> Offline Mode &amp; Sync
            </span>
            {pendingCount > 0 && (
              <span className="text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("updates")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between cursor-pointer ${
              activeTab === "updates" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <span className="flex items-center gap-3">
              <ArrowUpCircle className="w-4 h-4 shrink-0 text-blue-400" /> Software Updates &amp; .exe
            </span>
            <span className="text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded-full">
              v{CURRENT_APP_VERSION}
            </span>
          </button>

          <button
            onClick={() => onOpenShortcutsModal?.()}
            className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50 cursor-pointer border border-[var(--color-border)]/50 bg-[var(--color-surface-2)]/20 mt-1"
          >
            <span className="flex items-center gap-3">
              <Keyboard className="w-4 h-4 text-[var(--color-accent)] shrink-0" /> Keyboard Shortcuts
            </span>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] rounded text-[9px] font-mono font-bold">?</kbd>
          </button>

          <div className="mt-auto pt-4 border-t border-[var(--color-border)]/50">
            <div className="p-3 bg-[var(--color-surface-2)]/60 rounded-lg border border-[var(--color-border)]/60 text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              💡 <strong className="text-[var(--color-text)]">Note:</strong> Administrative controls (User management, team rosters, and corporate defaults) are located in the <strong className="text-[var(--color-accent)]">Admin Panel</strong>.
            </div>
          </div>
        </aside>

        {/* Right Content Workspace */}
        <section className="flex-1 bg-[var(--color-bg)] p-6 overflow-y-auto select-text">
          
          {/* TAB 1: MY PROFILE */}
          {activeTab === "profile" && (
            <div className="max-w-5xl space-y-6">
              
              {/* Profile Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
                <div className="border-b border-[var(--color-border)]/70 pb-4">
                  <h3 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-[var(--color-accent)]" /> My Profile &amp; Photo
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Update your personal profile details, contact information, professional credentials, and avatar photo.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  
                  {/* Two-Column Responsive Layout (1 col mobile, 12 cols desktop) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: Profile Photo Upload Area (4-5 cols on desktop) */}
                    <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center space-y-4 bg-[var(--color-surface-2)]/50 p-6 rounded-2xl border border-[var(--color-border)]/70">
                      <label className="w-full text-center text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Profile Photo
                      </label>

                      {/* Drag and Drop Zone with ~200x200px Preview */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative w-48 h-48 md:w-52 md:h-52 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer overflow-hidden group select-none ${
                          isDragging
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 scale-[1.02]"
                            : "border-[var(--color-border)] hover:border-[var(--color-accent)]/70 bg-[var(--color-surface)]"
                        }`}
                      >
                        {/* Hidden File Input */}
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*"
                          onChange={handleAvatarFileSelect}
                          className="hidden"
                          id="avatar-file-input"
                          aria-label="Upload profile photo file"
                        />

                        {profilePhoto ? (
                          <div className="relative w-full h-full rounded-xl overflow-hidden">
                            <img
                              src={profilePhoto}
                              alt={profileDisplayName}
                              className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-3">
                              <Camera className="w-8 h-8 mb-1.5 text-[var(--color-accent)]" />
                              <span className="text-xs font-bold">Change Photo</span>
                              <span className="text-[10px] text-gray-300 mt-1">Drag new image or click</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 space-y-2">
                            <div className="w-14 h-14 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)] mb-1 group-hover:scale-110 transition-transform">
                              <Upload className="w-7 h-7" />
                            </div>
                            <span className="text-xs font-bold text-[var(--color-text)]">
                              Drag &amp; drop photo
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)]">
                              or <span className="text-[var(--color-accent)] underline font-semibold">browse files</span>
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] pt-1">
                              JPG, PNG, WEBP, or GIF
                            </span>
                          </div>
                        )}
                      </div>

                      {/* File Limit Indicator */}
                      <div className="text-center">
                        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface)] px-3 py-1 rounded-full border border-[var(--color-border)]/60 inline-block">
                          Max file size: <strong className="text-[var(--color-text)]">5 MB</strong>
                        </span>
                      </div>

                      {/* Action Buttons for Photo */}
                      <div className="w-full space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {profilePhoto ? "Change Photo" : "Upload Photo"}
                        </button>

                        {profilePhoto && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="w-full px-4 py-2 bg-[var(--color-surface)] hover:bg-red-500/10 text-red-500 hover:text-red-400 border border-red-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove Photo
                          </button>
                        )}
                      </div>

                      {/* Inline Error Message */}
                      {avatarError && (
                        <div className="w-full p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-500 font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{avatarError}</span>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: Personal Information Form (7-8 cols on desktop) */}
                    <div className="md:col-span-7 lg:col-span-8 space-y-5">
                      <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-[var(--color-border)]/50">
                        <UserIcon className="w-4 h-4 text-[var(--color-accent)]" /> Personal Information
                      </h4>

                      {/* 1. Full Name Fields (First Name & Last Name Grid + Display Name) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-[var(--color-accent)]" /> First Name <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text"
                            value={profileFirst}
                            onChange={(e) => setProfileFirst(e.target.value)}
                            placeholder="First Name"
                            required
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-[var(--color-accent)]" /> Last Name <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text"
                            value={profileLast}
                            onChange={(e) => setProfileLast(e.target.value)}
                            placeholder="Last Name"
                            required
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <UserIcon className="w-3 h-3 text-[var(--color-accent)]" /> Display Name
                        </label>
                        <input 
                          type="text"
                          value={profileDisplayName}
                          onChange={(e) => setProfileDisplayName(e.target.value)}
                          placeholder="Display Name"
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>

                      {/* 2. Email Address & Phone Number Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-[var(--color-accent)]" /> Email Address <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            placeholder="email@domain.com"
                            required
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <PhoneIcon className="w-3 h-3 text-[var(--color-accent)]" /> Phone Number
                          </label>
                          <input 
                            type="text"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            placeholder="e.g. 416-555-0199"
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      </div>

                      {/* 3. Role/Position & Brokerage/Company Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-[var(--color-accent)]" /> Role / Position
                          </label>
                          <input 
                            type="text"
                            value={profileJobTitle}
                            onChange={(e) => setProfileJobTitle(e.target.value)}
                            placeholder="e.g. Senior Mortgage Agent"
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Building className="w-3 h-3 text-[var(--color-accent)]" /> Brokerage / Company
                          </label>
                          <input 
                            type="text"
                            value={profileEoPolicy}
                            onChange={(e) => setProfileEoPolicy(e.target.value)}
                            placeholder="e.g. Dominion Lending / Marsh"
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      </div>

                      {/* 4. License Number (Own Row) */}
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <BadgeCheck className="w-3 h-3 text-[var(--color-accent)]" /> License Number
                        </label>
                        <input 
                          type="text"
                          value={profileFsra}
                          onChange={(e) => setProfileFsra(e.target.value)}
                          placeholder="e.g. M12003456"
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                        />
                      </div>

                      {/* Assigned System Role Info Box */}
                      <div className="bg-[var(--color-surface-2)]/60 p-3.5 rounded-xl border border-[var(--color-border)]/70 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
                            Assigned System Access Role
                          </span>
                          <span className="text-xs font-bold text-[var(--color-accent)] mt-0.5 block">
                            {currentUser.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                          Managed by System Admin
                        </span>
                      </div>

                      {/* Save Profile Button */}
                      <div className="pt-2">
                        <button 
                          type="submit"
                          className="w-full py-3 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] transition-all uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Save Profile Changes
                        </button>
                      </div>

                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="max-w-2xl space-y-6">
              
              {/* Active System Status Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Info className="w-4 h-4 text-[var(--color-accent)]" /> System Alerts &amp; Connection Status
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Real-time status updates and storage connection alerts.</p>
                </div>

                <div className="space-y-3">
                  {!bridgeOnline ? (
                    <div 
                      className="p-4 rounded-lg border flex items-start gap-3 select-none bg-[var(--color-error-subtle)]"
                      style={{ borderColor: "rgba(224,92,110,0.35)" }}
                    >
                      <div className="text-xl shrink-0 mt-0.5">🔌</div>
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-[var(--color-error)] uppercase tracking-wider block">
                          Z Drive Storage Notice
                        </span>
                        <span className="text-[11px] text-[var(--color-text)] font-semibold block leading-normal">
                          Z Drive Offline — Operating in local sandbox storage mode. All changes automatically sync when the bridge reconnects.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="p-4 rounded-lg border flex items-start gap-3 select-none"
                      style={{
                        background: "rgba(16,185,129,0.06)",
                        borderColor: "rgba(16,185,129,0.3)",
                      }}
                    >
                      <div className="text-xl shrink-0 mt-0.5 text-emerald-500">🟢</div>
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-emerald-500 uppercase tracking-wider block">
                          Z Drive Operational
                        </span>
                        <span className="text-[11px] text-[var(--color-text)] font-semibold block leading-normal">
                          All connection nodes active. Local storage bridge is synchronized and operational.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[var(--color-accent)]" /> Notification Triggers
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Choose which automated alerts and activity notifications you wish to receive.</p>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-[var(--color-text)] block">Daily Task Reminders</label>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Notify me of uncompleted tasks assigned to me daily.</span>
                    </div>
                    <button onClick={() => setNotifTaskReminders(!notifTaskReminders)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {notifTaskReminders ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-[var(--color-text)] block">Client Assigned Alerts</label>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Notify me when an active file is assigned to my client roster.</span>
                    </div>
                    <button onClick={() => setNotifFileUpdates(!notifFileUpdates)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {notifFileUpdates ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-[var(--color-text)] block">Retention &amp; Renewal Triggers</label>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Notify me when a client's mortgage renewal approaches threshold.</span>
                    </div>
                    <button onClick={() => setNotifFollowUps(!notifFollowUps)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {notifFollowUps ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-[var(--color-text)] block">Document Vault Submissions</label>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Notify me when a client uploads checklist files in the portal.</span>
                    </div>
                    <button onClick={() => setNotifDocAlerts(!notifDocAlerts)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {notifDocAlerts ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-[var(--color-text)] block">Team Mentions Alerts</label>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Notify me when mentioned in internal channel discussions.</span>
                    </div>
                    <button onClick={() => setNotifCommsAlerts(!notifCommsAlerts)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {notifCommsAlerts ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/60 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-[var(--color-text)] block">Weekly Activity Digest</label>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">Receive a weekly summary email of pipeline metrics.</span>
                    </div>
                    <button onClick={() => setNotifEmailDigest(!notifEmailDigest)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {notifEmailDigest ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>

                  <button 
                    onClick={handleSaveNotifications}
                    className="w-full py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-lg hover:bg-[var(--color-accent-hover)] transition-all uppercase tracking-wider mt-4 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Notification Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY */}
          {activeTab === "security" && (
            <div className="max-w-4xl space-y-6">
              
              {/* SECTION 1: CHANGE ACCOUNT PASSWORD */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-5">
                <div className="border-b border-[var(--color-border)]/70 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                      <Key className="w-4 h-4 text-[var(--color-accent)]" /> Change Account Password
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      Update your account password with a strong combination of letters, numbers, and symbols.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-md border border-[var(--color-border)]">
                    Password Protected
                  </span>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {/* Feedback Banner if any */}
                  {passwordChangeFeedback && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                      passwordChangeFeedback.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                        : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                    }`}>
                      {passwordChangeFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{passwordChangeFeedback.msg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current Password */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-xs font-bold text-[var(--color-text)]">
                        Current Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 pr-10 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--color-text)]">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 pr-10 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--color-text)]">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 pr-10 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1">Passwords do not match</p>
                      )}
                      {confirmPassword && newPassword === confirmPassword && (
                        <p className="text-[10px] text-emerald-500 font-semibold mt-1">Passwords match</p>
                      )}
                    </div>
                  </div>

                  {/* Password Strength Meter & Requirements Panel */}
                  <div className="bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--color-text)]">Password Strength:</span>
                      <span className={`font-bold ${getPasswordStrength().textClass}`}>
                        {getPasswordStrength().label}
                      </span>
                    </div>

                    {/* Strength Bar */}
                    <div className="w-full h-2 bg-[var(--color-surface-3)] rounded-full overflow-hidden border border-[var(--color-border)]/50">
                      <div
                        className={`h-full transition-all duration-300 ${getPasswordStrength().color}`}
                        style={{ width: getPasswordStrength().width }}
                      />
                    </div>

                    {/* Requirements Checklist */}
                    <div className="pt-1">
                      <span className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-2">
                        Password Requirements:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className={`flex items-center gap-1.5 ${reqMinLength ? "text-emerald-500 font-semibold" : "text-[var(--color-text-muted)]"}`}>
                          {reqMinLength ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-current mx-1 shrink-0" />}
                          Minimum 8 characters
                        </div>
                        <div className={`flex items-center gap-1.5 ${reqHasUpper ? "text-emerald-500 font-semibold" : "text-[var(--color-text-muted)]"}`}>
                          {reqHasUpper ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-current mx-1 shrink-0" />}
                          At least one uppercase letter (A-Z)
                        </div>
                        <div className={`flex items-center gap-1.5 ${reqHasLower ? "text-emerald-500 font-semibold" : "text-[var(--color-text-muted)]"}`}>
                          {reqHasLower ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-current mx-1 shrink-0" />}
                          At least one lowercase letter (a-z)
                        </div>
                        <div className={`flex items-center gap-1.5 ${reqHasNumber ? "text-emerald-500 font-semibold" : "text-[var(--color-text-muted)]"}`}>
                          {reqHasNumber ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-current mx-1 shrink-0" />}
                          At least one number (0-9)
                        </div>
                        <div className={`flex items-center gap-1.5 sm:col-span-2 ${reqHasSpecial ? "text-emerald-500 font-semibold" : "text-[var(--color-text-muted)]"}`}>
                          {reqHasSpecial ? <Check className="w-3.5 h-3.5 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-current mx-1 shrink-0" />}
                          At least one special character (!@#$%^&*)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isChangingPassword ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Updating Password...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" /> Change Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 2: WORKSTATION PIN & SENSITIVE VERIFICATION */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
                <div className="border-b border-[var(--color-border)]/70 pb-3">
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--color-accent)]" /> Workstation PIN &amp; Sensitive Data Protection
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    Configure your 4-digit quick access PIN and sensitive client data verification settings.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Access PIN */}
                  <div className="bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-[var(--color-text)] block">Workstation Access PIN</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] block">4-digit security code used to unlock your workstation session.</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPin ? "Hide Code" : "Reveal Code"}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type={showPin ? "text" : "password"}
                        value={userPin}
                        maxLength={4}
                        onChange={(e) => setUserPin(e.target.value.replace(/\D/g, ""))}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-lg px-3 py-1.5 text-center text-sm font-mono tracking-widest text-[var(--color-text)] w-28 focus:outline-none focus:border-[var(--color-accent)]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveSecurity}
                        className="px-3.5 py-1.5 bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Save PIN
                      </button>
                    </div>
                  </div>

                  {/* Audit SIN Access Verification */}
                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Audit SIN Access Verification</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Require manual PIN reentry before viewing sensitive borrower SIN fields.</span>
                    </div>
                    <button onClick={() => setRequirePinForSin(!requirePinForSin)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {requirePinForSin ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SECURITY SETTINGS */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
                <div className="border-b border-[var(--color-border)]/70 pb-3">
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[var(--color-accent)]" /> Security Settings &amp; Authentication Preferences
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    Configure multi-factor authentication, action confirmation requirements, and session timeout durations.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {/* Two-Factor Authentication Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text)]">Two-Factor Authentication (2FA)</span>
                        <span className="text-[9px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Coming Soon
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">
                        Protect your account by requiring an authenticator app code during sign in.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                      <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40 shrink-0" />
                    </div>
                  </div>

                  {/* Require Password for Sensitive Actions Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[var(--color-text)] block">Require Password for Sensitive Actions</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">
                        Ask for account password confirmation before executing high-risk operations (e.g. deleting clients, bulk exports).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleRequirePasswordSensitive}
                      className="shrink-0 text-[var(--color-accent)] cursor-pointer"
                    >
                      {requirePasswordForSensitive ? (
                        <ToggleRight className="w-9 h-9" />
                      ) : (
                        <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />
                      )}
                    </button>
                  </div>

                  {/* Session Timeout Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[var(--color-text)] block">Session Timeout</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">
                        Automatically lock your workstation session after a set period of inactivity.
                      </span>
                    </div>
                    <select
                      value={sessionTimeout}
                      onChange={(e) => handleChangeSessionTimeout(e.target.value)}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-48 cursor-pointer font-sans"
                    >
                      <option value="15 min">15 minutes</option>
                      <option value="30 min">30 minutes</option>
                      <option value="1 hour">1 hour</option>
                      <option value="4 hours">4 hours</option>
                      <option value="Never">Never (Keep Active)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ACTIVE SESSIONS */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
                <div className="border-b border-[var(--color-border)]/70 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-[var(--color-accent)]" /> Active Sessions
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      Manage devices and browser sessions currently logged into your account.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    {activeSessions.length} Active {activeSessions.length === 1 ? "Session" : "Sessions"}
                  </span>
                </div>

                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--color-surface-2)]/60 rounded-xl border border-[var(--color-border)]/70 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-lg shrink-0 mt-0.5">
                          {session.device.toLowerCase().includes("iphone") || session.device.toLowerCase().includes("mobile") ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--color-text)] flex items-center gap-2">
                            {session.device}
                            {session.isCurrent && (
                              <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Current Device
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>{session.location}</span>
                            <span>•</span>
                            <span>IP: <code className="font-mono">{session.ip}</code></span>
                            <span>•</span>
                            <span className="text-[var(--color-text-faint)]">Last active: {session.lastActive}</span>
                          </div>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleSignOutSession(session.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold rounded-lg transition-all cursor-pointer self-end sm:self-center shrink-0 flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Sign Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {activeSessions.filter((s) => !s.isCurrent).length > 0 && (
                  <div className="pt-2 border-t border-[var(--color-border)]/60 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSignOutAllOtherSessions}
                      className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" /> Sign Out All Other Sessions
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 5: LOGIN HISTORY */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-4">
                <div className="border-b border-[var(--color-border)]/70 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--color-accent)]" /> Login History
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      Review recent account sign-in attempts and security events.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider bg-[var(--color-surface-2)]/40">
                        <th className="py-2.5 px-3 font-bold">Date / Time</th>
                        <th className="py-2.5 px-3 font-bold">Device / Browser</th>
                        <th className="py-2.5 px-3 font-bold">Location &amp; IP</th>
                        <th className="py-2.5 px-3 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/50">
                      {loginHistoryList.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--color-surface-2)]/30 transition-colors">
                          <td className="py-2.5 px-3 text-[var(--color-text)] font-medium whitespace-nowrap">
                            {item.dateTime}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--color-text-muted)] whitespace-nowrap">
                            {item.device}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--color-text-muted)] whitespace-nowrap">
                            {item.location} <span className="text-[var(--color-text-faint)] font-mono text-[10px]">({item.ip})</span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {item.status === "Success" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                <AlertCircle className="w-3 h-3" /> Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)]/60 flex justify-between items-center text-xs">
                  <span className="text-[10px] text-[var(--color-text-muted)]">Showing last 5 login attempts</span>
                  <button
                    type="button"
                    onClick={() => showToast("Full historical security logs archive is accessible in the Admin Panel.", "info", "📜")}
                    className="text-[var(--color-accent)] font-bold hover:underline flex items-center gap-1 text-xs cursor-pointer"
                  >
                    View All Login History <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: PERSONAL PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[var(--color-accent)]" /> Personal Preferences &amp; Regional Formatting
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Configure landing views, dashboard layout preferences, currency, and global timezone &amp; date formatting.
                  </p>
                </div>

                {/* Global Synchronization Note */}
                <div className="p-3 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-xl text-xs text-[var(--color-text)] flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>System Note:</strong> Changes to timezone and date format will automatically affect all date/time displays across the application, including dashboard charts, client timelines, and task schedules.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* 1. Time Zone Selection */}
                  <div className="bg-[var(--color-surface-2)]/50 p-4 rounded-xl border border-[var(--color-border)]/70 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-[var(--color-accent)]" /> Preferred Time Zone
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">
                          Select your local operational timezone.
                        </span>
                      </div>
                      <select
                        value={prefTimeZone}
                        onChange={(e) => setPrefTimeZone(e.target.value)}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-72 cursor-pointer font-sans"
                      >
                        {MAJOR_TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Live Current Time Display */}
                    <div className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                        Current time: <strong className="text-[var(--color-accent)] font-mono">{getCurrentTimeInTimezone(prefTimeZone)}</strong> in <span className="text-[var(--color-text)] font-semibold">{prefTimeZone}</span>
                      </span>
                      <span className="text-[10px] text-[var(--color-text-faint)] font-mono hidden sm:inline">
                        Detected: {getDetectedSystemTimeZone()}
                      </span>
                    </div>
                  </div>

                  {/* 2. Date Format Field */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Date Format</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">
                        Display format for calendar dates and timelines throughout the app.
                      </span>
                    </div>
                    <select
                      value={prefDateFormat}
                      onChange={(e) => setPrefDateFormat(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-64 cursor-pointer"
                    >
                      {DATE_FORMAT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Test Time Display Button & Live Preview Box */}
                  <div className="bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[var(--color-text)] block">Time &amp; Date Formatting Preview</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">
                          Test how timestamps will look with your current timezone and format selections.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTestPreview(!showTestPreview)}
                        className="px-3.5 py-1.5 bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${showTestPreview ? "animate-spin" : ""}`} />
                        {showTestPreview ? "Refresh Preview" : "Test Time Display"}
                      </button>
                    </div>

                    {showTestPreview && (
                      <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-accent)]/30 rounded-xl space-y-2 animate-fadeIn">
                        <div className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-wider">
                          Live Formatting Example
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)]/60">
                            <span className="text-[10px] text-[var(--color-text-muted)] block">Formatted Sample Date (e.g. Aug 5, 2026 3:45 PM):</span>
                            <span className="font-bold text-[var(--color-text)] text-sm block mt-1 font-mono">
                              {formatDateTime(new Date(2026, 7, 5, 15, 45, 0), prefTimeZone, prefDateFormat)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)]/60">
                            <span className="text-[10px] text-[var(--color-text-muted)] block">Current Live System Timestamp:</span>
                            <span className="font-bold text-[var(--color-accent)] text-sm block mt-1 font-mono">
                              {formatDateTime(new Date(), prefTimeZone, prefDateFormat)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Language Field */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Language</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">
                        System language interface setting.
                      </span>
                    </div>
                    <select
                      value={prefLanguage}
                      onChange={(e) => setPrefLanguage(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-64 cursor-pointer"
                    >
                      <option value="English">English (US / Canada)</option>
                      <option value="English_UK">English (UK)</option>
                      <option value="French">Français (French)</option>
                      <option value="Spanish">Español (Spanish)</option>
                    </select>
                  </div>

                  {/* 5. Currency Field */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Currency</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">
                        Default currency symbol for pipeline mortgage volumes and fees.
                      </span>
                    </div>
                    <select
                      value={prefCurrency}
                      onChange={(e) => setPrefCurrency(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-64 cursor-pointer"
                    >
                      <option value="USD ($)">USD ($) - US Dollar</option>
                      <option value="CAD ($)">CAD ($) - Canadian Dollar</option>
                      <option value="EUR (€)">EUR (€) - Euro</option>
                      <option value="GBP (£)">GBP (£) - British Pound</option>
                    </select>
                  </div>

                  {/* Landing Screen */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Default Landing Page</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">The CRM view displayed immediately after unlock.</span>
                    </div>
                    <select
                      value={prefLanding}
                      onChange={(e) => setPrefLanding(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-64 cursor-pointer"
                    >
                      <option value="dashboard">Dashboard Overview</option>
                      <option value="clients">Client Database</option>
                      <option value="pipeline">Pipeline Board</option>
                      <option value="ai">AI Intake Console</option>
                    </select>
                  </div>

                  {/* Dashboard View */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Preferred Dashboard Style</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Visual layout style for the primary dashboard.</span>
                    </div>
                    <select
                      value={prefDashboard}
                      onChange={(e) => setPrefDashboard(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-64 cursor-pointer"
                    >
                      <option value="bento">Bento Grid Dashboard</option>
                      <option value="summary">Summary Focus Cards</option>
                      <option value="metrics">Metric Trends &amp; Charts</option>
                    </select>
                  </div>

                  {/* Client Layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Default Client Directory Layout</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Preferred display style in the clients database.</span>
                    </div>
                    <select
                      value={prefLayout}
                      onChange={(e) => setPrefLayout(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-64 cursor-pointer"
                    >
                      <option value="table">Table List View</option>
                      <option value="cards">Interactive Cards Grid</option>
                    </select>
                  </div>

                  {/* Time format */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Time Format</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Clock format for calendar appointments and timestamps.</span>
                    </div>
                    <select
                      value={prefTimeFormat}
                      onChange={(e) => setPrefTimeFormat(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] w-full sm:w-64 cursor-pointer"
                    >
                      <option value="12">12-hour (AM / PM)</option>
                      <option value="24">24-hour scale</option>
                    </select>
                  </div>

                  {/* Keyboard Shortcuts Card */}
                  <div className="bg-[var(--color-surface-2)]/60 p-4 rounded-xl border border-[var(--color-border)]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-[var(--color-text)] flex items-center gap-2">
                        <Keyboard className="w-4 h-4 text-[var(--color-accent)]" /> Global Keyboard Shortcuts
                      </span>
                      <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                        Use hotkeys to quickly search (<kbd className="font-mono bg-[var(--color-surface-3)] px-1 rounded">Cmd+K</kbd>), switch tabs (<kbd className="font-mono bg-[var(--color-surface-3)] px-1 rounded">Cmd+G/C/T/P</kbd>), or create clients (<kbd className="font-mono bg-[var(--color-surface-3)] px-1 rounded">Cmd+N</kbd>).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenShortcutsModal?.()}
                      className="px-4 py-2 bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2"
                    >
                      <Keyboard className="w-4 h-4" /> View All Shortcuts
                    </button>
                  </div>

                  <button 
                    onClick={handleSavePreferences}
                    className="w-full py-3 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] transition-all uppercase tracking-wider mt-4 cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Personal Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EMAIL & SMTP */}
          {activeTab === "email" && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[var(--color-accent)]" /> Personal Email &amp; SMTP Configuration
                      </h3>
                      {isSmtpConfigured ? (
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          SMTP Connected
                        </span>
                      ) : (
                        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Not Configured
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                      Configure your personal outbound email credentials for sending client communications directly.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSmtpSettings} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                        Outbound Email Address (Username)
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. agent@gbkfinancial.ca"
                        value={smtpUsername}
                        onChange={(e) => handleSmtpUsernameChange(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                      <span className="text-[9px] text-[var(--color-text-faint)] mt-1 block">
                        Auto-detects host and port based on domain.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                        Email App Password / Token
                      </label>
                      <input
                        type="password"
                        placeholder="App password or secret"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        placeholder="smtp.gmail.com"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="text"
                        placeholder="587"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClearSmtpSettings}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect SMTP
                    </button>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Save SMTP Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: DIAGNOSTICS & ERROR HANDLING */}
          {activeTab === "diagnostics" && (
            <div className="max-w-3xl space-y-6">
              {/* System Health Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-5">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/60 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" /> System Health &amp; Runtime Overview
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                      Live status of core application subsystems, React runtime version, and Error Boundary shield coverage.
                    </p>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Systems Operational
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Error Boundary</div>
                    <div className="text-xs font-extrabold text-emerald-400 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Active (100%)
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">React Version</div>
                    <div className="text-xs font-mono font-bold text-[var(--color-text)] mt-1 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-sky-400" /> {React.version || "18.3.1"}
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">App Version</div>
                    <div className="text-xs font-mono font-bold text-[var(--color-text)] mt-1 flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-amber-400" /> v2.4.0
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-2)] p-3.5 rounded-xl border border-[var(--color-border)]/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Bridge Status</div>
                    <div className="text-xs font-bold text-[var(--color-text)] mt-1 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${bridgeOnline ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                      {bridgeOnline ? "Connected" : "Local Mode"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Boundary Settings */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[var(--color-accent)]" /> Error Boundary Configuration
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    Control how React rendering exceptions are handled and reported across the platform.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Toggle 1 */}
                  <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]/50">
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text)]">Show detailed error stack traces</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        Displays developer stack traces and component trees in the Error Boundary fallback UI.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDevDetails(!showDevErrorDetails)}
                      className="cursor-pointer text-[var(--color-accent)] transition-transform active:scale-95"
                    >
                      {showDevErrorDetails ? (
                        <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                  </div>

                  {/* Toggle 2 */}
                  <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]/50">
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text)]">Automatically report errors to support</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        Logs uncaught rendering exceptions to the local diagnostic store for automatic diagnostic retrieval.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoReport(!autoReportErrors)}
                      className="cursor-pointer text-[var(--color-accent)] transition-transform active:scale-95"
                    >
                      {autoReportErrors ? (
                        <ToggleRight className="w-8 h-8 text-[var(--color-accent)]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                  </div>

                  {/* Test Error Boundary Button */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Bug className="w-4 h-4 text-amber-400" /> Test Error Boundary Verification
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          Triggers an intentional test rendering exception to verify that the Error Boundary catches exceptions without crashing the workspace.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTestErrorActive(prev => !prev)}
                        className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        {testErrorActive ? "Reset Test Trigger" : "Test Error Boundary"}
                      </button>
                    </div>

                    {/* Test Error Playground area */}
                    {testErrorActive && (
                      <div className="mt-2 pt-3 border-t border-amber-500/20">
                        <ErrorBoundary name="Test Diagnostics Boundary">
                          <TestBuggyComponent />
                        </ErrorBoundary>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Log Display */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/60 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-400" /> Uncaught Error History Log ({errorLogs.length})
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                      Recent exceptions caught by Error Boundaries in this workstation session.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {errorLogs.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleExportLogs}
                          className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          Export JSON
                        </button>

                        <button
                          type="button"
                          onClick={handleClearLogs}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear Log
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Last Error Highlight */}
                {errorLogs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted)] mb-1">
                          <span className="font-bold text-red-400 uppercase">Most Recent Exception:</span>
                          <span>{new Date(errorLogs[0].timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-xs font-mono text-red-200 font-bold truncate">
                          {errorLogs[0].message}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                          Boundary Scope: <code className="text-amber-300 font-mono">{errorLogs[0].boundaryName || "App Boundary"}</code>
                        </div>
                      </div>
                    </div>

                    {/* Detailed List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {errorLogs.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        return (
                          <div 
                            key={log.id} 
                            className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-xl space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.2 rounded">
                                    {log.boundaryName || "Boundary"}
                                  </span>
                                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-xs font-mono font-bold text-[var(--color-text)] mt-1.5">
                                  {log.message}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="text-[10px] font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer shrink-0 mt-1"
                              >
                                {isExpanded ? "Hide Details" : "View Stack"}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-[var(--color-border)]/50 space-y-2 text-[10px] font-mono">
                                {log.stack && (
                                  <div>
                                    <div className="text-amber-400 font-bold mb-1">Stack Trace:</div>
                                    <pre className="p-2 bg-slate-950 text-slate-300 rounded border border-slate-800 overflow-x-auto text-[9.5px] leading-relaxed">
                                      {log.stack}
                                    </pre>
                                  </div>
                                )}
                                {log.componentStack && (
                                  <div>
                                    <div className="text-sky-400 font-bold mb-1">Component Stack:</div>
                                    <pre className="p-2 bg-slate-950 text-slate-300 rounded border border-slate-800 overflow-x-auto text-[9.5px] leading-relaxed">
                                      {log.componentStack}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[var(--color-surface-2)]/50 border border-dashed border-[var(--color-border)] rounded-xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                    <div className="text-xs font-bold text-[var(--color-text)]">No Uncaught Errors Logged</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] max-w-sm mx-auto">
                      All rendering boundaries are running cleanly with zero exception events recorded in this session.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. OFFLINE MODE & DATA SYNC TAB */}
          {activeTab === "offline" && (
            <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                  <WifiOff className="w-5 h-5 text-emerald-400" /> Offline Mode &amp; Local Data Storage
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Manage Service Worker offline caching, background synchronization, and local storage usage for seamless working without an active internet connection.
                </p>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                !isOnline
                  ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                  : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${!isOnline ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>Network Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        !isOnline ? "bg-amber-500/30 text-amber-300" : "bg-emerald-500/30 text-emerald-300"
                      }`}>
                        {!isOnline ? "Offline Mode Active" : "Online & Connected"}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Last synchronized with cloud: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never synced in this session"}
                    </div>
                  </div>
                </div>

                {isOnline && (
                  <button
                    type="button"
                    onClick={syncNow}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                )}
              </div>

              {/* Offline Controls */}
              <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                  Sync &amp; Storage Preferences
                </h3>

                <div className="space-y-4 divide-y divide-[var(--color-border)]/50">
                  {/* Toggle 1 */}
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text)]">Enable Offline Mode &amp; Caching</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Cache app shell, static assets, and client data locally for access without internet.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleOfflineEnabled(!offlineEnabled)}
                      className="cursor-pointer"
                    >
                      {offlineEnabled ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                  </div>

                  {/* Toggle 2 */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-[var(--color-text)]">Auto-sync when online</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Automatically push queued offline draft actions as soon as connection is restored.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoSync(!autoSyncEnabled)}
                      className="cursor-pointer"
                    >
                      {autoSyncEnabled ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Offline Actions & Storage Usage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pending Actions */}
                <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text)]">Pending Offline Actions</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-bold">
                      {pendingCount} Item{pendingCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Changes made while offline are saved safely in your local queue and synchronized automatically.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={syncNow}
                      disabled={!isOnline || pendingCount === 0 || isSyncing}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Syncing Queue..." : "Process Sync Queue Now"}
                    </button>
                  </div>
                </div>

                {/* Storage Usage */}
                <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text)] flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-400" /> Cached Storage Size
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      {storageEstimate.usageMB} MB
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Estimated local cache size storing client files, documents, and application assets.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear Offline Cache
                    </button>
                  </div>
                </div>
              </div>

              {/* Offline Capabilities Overview */}
              <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                  Offline Capabilities Matrix
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[var(--color-surface-2)]/60 rounded-xl flex items-center gap-2 text-[var(--color-text)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>View Client Files &amp; Active Pipelines</span>
                  </div>
                  <div className="p-2.5 bg-[var(--color-surface-2)]/60 rounded-xl flex items-center gap-2 text-[var(--color-text)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Draft Tasks, Notes &amp; Queue Sync</span>
                  </div>
                  <div className="p-2.5 bg-[var(--color-surface-2)]/60 rounded-xl flex items-center gap-2 text-[var(--color-text)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mortgage &amp; Stress Test Calculators</span>
                  </div>
                  <div className="p-2.5 bg-[var(--color-surface-2)]/60 rounded-xl flex items-center gap-2 text-[var(--color-text)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Access Lender Rate Sheets &amp; Contacts</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 8. SOFTWARE UPDATES & WINDOWS .EXE DISTRIBUTION TAB */}
          {activeTab === "updates" && (
            <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-blue-400" /> Software Updates &amp; Desktop Distribution
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Configure automatic updates, download Windows .exe setup packages, and review version changelog history.
                </p>
              </div>

              {/* Version Banner & Quick Check */}
              <div className="p-5 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Installed Version</span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-mono font-extrabold text-[11px]">
                      v{CURRENT_APP_VERSION}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                      Stable Channel
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    Last Checked: {upSettings.lastChecked ? new Date(upSettings.lastChecked).toLocaleString() : "Not checked in this session"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCheckUpdatesNow}
                    disabled={isCheckingUp}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUp ? "animate-spin" : ""}`} />
                    {isCheckingUp ? "Checking..." : "Check for Updates Now"}
                  </button>
                </div>
              </div>

              {/* New Available Update Prompt (If check result found update) */}
              {upCheckResult?.hasUpdate && upCheckResult.manifest && (
                <div className="p-5 bg-amber-950/20 border border-amber-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Update v{upCheckResult.manifest.latestVersion} Available!</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400">
                      {upCheckResult.manifest.fileSizeMB} MB
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {upCheckResult.manifest.releaseNotes}
                  </p>

                  {/* Download Progress Bar */}
                  {isDownloadingUp && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-blue-300 font-bold">
                        <span>Downloading Windows .exe Package...</span>
                        <span>{upDownloadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-150 rounded-full"
                          style={{ width: `${upDownloadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleManualDownloadUpdate}
                      disabled={isDownloadingUp}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isDownloadingUp ? `Downloading (${upDownloadProgress}%)` : "Download & Install (.exe)"}
                    </button>
                    <a
                      href={upCheckResult.manifest.downloadUrl.exe}
                      download
                      className="px-3.5 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      Direct Download Link <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Preferences Form */}
              <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                  Update Automation Preferences
                </h3>

                <div className="space-y-4 divide-y divide-[var(--color-border)]/50 text-xs">
                  {/* Toggle 1 */}
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-[var(--color-text)]">Automatically check for updates</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Query the remote update server periodically for new releases.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateSettingChange("autoCheck", !upSettings.autoCheck)}
                      className="cursor-pointer"
                    >
                      {upSettings.autoCheck ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                  </div>

                  {/* Toggle 2 */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-[var(--color-text)]">Download updates automatically</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Fetch new version installer packages in background without interrupting work.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateSettingChange("autoDownload", !upSettings.autoDownload)}
                      className="cursor-pointer"
                    >
                      {upSettings.autoDownload ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                  </div>

                  {/* Toggle 3 */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-[var(--color-text)]">Install updates on restart</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Automatically apply pending updates next time GBK CRM launches.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateSettingChange("installOnRestart", !upSettings.installOnRestart)}
                      className="cursor-pointer"
                    >
                      {upSettings.installOnRestart ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-[var(--color-text-muted)]" />
                      )}
                    </button>
                  </div>

                  {/* Frequency Dropdown */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-[var(--color-text)]">Check Frequency</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        How often the application polls for software updates.
                      </div>
                    </div>
                    <select
                      value={upSettings.checkFrequency}
                      onChange={(e) => handleUpdateSettingChange("checkFrequency", e.target.value as any)}
                      className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl font-bold cursor-pointer"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Version History & Changelog */}
              <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] flex items-center justify-between">
                  <span>Version History &amp; Release Notes</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">Windows .exe &amp; Web</span>
                </h3>

                <div className="space-y-4">
                  {getUpdateHistory().map((rel) => (
                    <div key={rel.version} className="p-4 bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-xs text-blue-400">v{rel.version}</span>
                          <span className="text-xs font-bold text-[var(--color-text)]">{rel.title}</span>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{rel.date}</span>
                      </div>
                      <ul className="space-y-1 pt-1">
                        {rel.changes.map((ch, idx) => (
                          <li key={idx} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                            <span className="text-blue-400 font-bold">•</span>
                            <span>{ch}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </section>

      </div>
    </div>
  );
};
