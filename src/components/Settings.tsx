import React, { useState, useEffect, useRef } from "react";
import { 
  User as UserIcon, Bell, Shield, Sliders, Mail, Lock, Laptop, Smartphone,
  CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Trash2, Upload, Camera,
  RefreshCw, X, ShieldCheck, Info, Key, Eye, EyeOff, Globe
} from "lucide-react";
import { User, Client } from "../types";
import { encryptValue } from "../lib/cryptoUtils";
import { hashPin } from "../hooks/useAuth";
import { COMMON_TIMEZONES, getUserTimeZone, setUserTimeZone, getDetectedSystemTimeZone } from "../lib/timeUtils";

interface SettingsProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  userRoster: User[];
  setUserRoster: React.Dispatch<React.SetStateAction<User[]>>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onLockApp?: () => void;
  clients: Client[];
  bridgeOnline: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  currentUser,
  setCurrentUser,
  userRoster,
  setUserRoster,
  showToast,
  onLockApp,
  clients,
  bridgeOnline
}) => {
  // Navigation tabs
  type SettingsTab = "profile" | "notifications" | "security" | "preferences" | "email";
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // --- 1. PROFILE STATE ---
  const [profileFirst, setProfileFirst] = useState(currentUser.first);
  const [profileLast, setProfileLast] = useState(currentUser.last);
  const [profileDisplayName, setProfileDisplayName] = useState(currentUser.displayName || `${currentUser.first} ${currentUser.last}`);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || "");
  const [profilePhoto, setProfilePhoto] = useState(currentUser.photo || "");
  const [profileJobTitle, setProfileJobTitle] = useState(currentUser.jobTitle || "Senior Mortgage Agent");

  // Local File Upload / Avatar State
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar Presets
  const avatarPresets = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
  ];

  // Sync profile values when currentUser changes
  useEffect(() => {
    setProfileFirst(currentUser.first);
    setProfileLast(currentUser.last);
    setProfileDisplayName(currentUser.displayName || `${currentUser.first} ${currentUser.last}`);
    setProfileEmail(currentUser.email);
    setProfilePhone(currentUser.phone || "");
    setProfilePhoto(currentUser.photo || "");
    setProfileJobTitle(currentUser.jobTitle || "Senior Mortgage Agent");
  }, [currentUser]);

  // Clean up object URLs on change/unmount
  useEffect(() => {
    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [objectUrlToRevoke]);

  // Handle local file selection for avatar photo
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      jobTitle: profileJobTitle
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
  const [userPin, setUserPin] = useState(currentUser.pin || "0000");
  const [showPin, setShowPin] = useState(false);
  const [requirePinForSin, setRequirePinForSin] = useState(() => {
    return localStorage.getItem("gbk_security_pin_sin") === "true";
  });
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

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
  const [prefLanding, setPrefLanding] = useState(() => localStorage.getItem("gbk_pref_landing") || "dashboard");
  const [prefDashboard, setPrefDashboard] = useState(() => localStorage.getItem("gbk_pref_dashboard_view") || "bento");
  const [prefLayout, setPrefLayout] = useState(() => localStorage.getItem("gbk_pref_layout_mode") || "table");
  const [prefDateFormat, setPrefDateFormat] = useState(() => localStorage.getItem("gbk_pref_date_format") || "YYYY-MM-DD");
  const [prefTimeFormat, setPrefTimeFormat] = useState(() => localStorage.getItem("gbk_pref_time_format") || "12");
  const [prefTimeZone, setPrefTimeZone] = useState(() => getUserTimeZone());

  const handleSavePreferences = () => {
    localStorage.setItem("gbk_pref_landing", prefLanding);
    localStorage.setItem("gbk_pref_dashboard_view", prefDashboard);
    localStorage.setItem("gbk_pref_layout_mode", prefLayout);
    localStorage.setItem("gbk_pref_date_format", prefDateFormat);
    localStorage.setItem("gbk_pref_time_format", prefTimeFormat);
    setUserTimeZone(prefTimeZone);
    
    showToast("Personal workspace preferences saved!", "success", "⚙️");
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
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)] font-sans flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[var(--color-accent)]" /> Personal Account Settings
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
            onClick={() => setActiveTab("security")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "security" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" /> Security &amp; Access PIN
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
            onClick={() => setActiveTab("email")}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
              activeTab === "email" 
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50"
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" /> Email &amp; SMTP
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
            <div className="max-w-2xl space-y-6">
              
              {/* Profile Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[var(--color-accent)]" /> My Profile &amp; Photo
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Update your display details, contact numbers, job title, and profile picture avatar.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  
                  {/* Avatar Upload Card Section */}
                  <div className="bg-[var(--color-surface-2)]/70 p-4 rounded-xl border border-[var(--color-border)]/80 space-y-4">
                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                      Profile Avatar Photo
                    </label>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      {/* Avatar Preview */}
                      <div className="relative group shrink-0">
                        {profilePhoto ? (
                          <img 
                            src={profilePhoto} 
                            alt="Profile Avatar" 
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-accent)] shadow-md"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-[var(--color-accent)]/15 border-2 border-[var(--color-accent)]/40 flex items-center justify-center font-black text-2xl text-[var(--color-accent)] shadow-inner">
                            {profileFirst[0] || ""}{profileLast[0] || ""}
                          </div>
                        )}
                      </div>

                      {/* File Controls */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
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

                          {/* Trigger Button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {profilePhoto ? "Change Photo" : "Upload Photo"}
                          </button>

                          {/* Remove Photo Button */}
                          {profilePhoto && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="px-3.5 py-1.5 bg-[var(--color-surface-2)] hover:bg-red-500/10 text-red-500 hover:text-red-400 border border-red-500/20 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove Photo
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          Upload a JPG, PNG, WEBP, or GIF image from your computer (max 5 MB).
                        </p>

                        {/* Inline Error Message if file is invalid or oversized */}
                        {avatarError && (
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-500 font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {avatarError}
                          </div>
                        )}

                        {/* Optional Presets */}
                        <div className="pt-2 border-t border-[var(--color-border)]/50 flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-[var(--color-text-faint)]">Or select preset avatar:</span>
                          <div className="flex gap-1.5">
                            {avatarPresets.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setProfilePhoto(preset);
                                  setAvatarError(null);
                                }}
                                className="w-6 h-6 rounded-full overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                                title={`Preset avatar ${idx + 1}`}
                              >
                                <img src={preset} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                        First Name
                      </label>
                      <input 
                        type="text"
                        value={profileFirst}
                        onChange={(e) => setProfileFirst(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                        Last Name
                      </label>
                      <input 
                        type="text"
                        value={profileLast}
                        onChange={(e) => setProfileLast(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                        Display Name
                      </label>
                      <input 
                        type="text"
                        value={profileDisplayName}
                        onChange={(e) => setProfileDisplayName(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                        Job Title
                      </label>
                      <input 
                        type="text"
                        value={profileJobTitle}
                        onChange={(e) => setProfileJobTitle(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input 
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                        Cellular Phone
                      </label>
                      <input 
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="e.g. 416-555-0199"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                    </div>
                  </div>

                  {/* Role Info Box */}
                  <div className="bg-[var(--color-surface-2)] p-3.5 rounded-lg border border-[var(--color-border)]/70 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
                        Assigned Broker Role
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-text)] mt-0.5 block">
                        {currentUser.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      Managed by system admin
                    </span>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-lg hover:bg-[var(--color-accent-hover)] transition-all uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Profile Changes
                  </button>
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

          {/* TAB 3: SECURITY */}
          {activeTab === "security" && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--color-accent)]" /> Personal Security Preferences
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Configure workstation access codes, security PIN, and multi-factor setup.</p>
                </div>

                <div className="space-y-5">
                  {/* Access PIN */}
                  <div className="bg-[var(--color-surface-2)] p-4 rounded-lg border border-[var(--color-border)]/70 space-y-3">
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
                        className="bg-[var(--color-surface-3)] border border-[var(--color-border)]/70 rounded px-3 py-1.5 text-center text-sm font-mono tracking-widest text-[var(--color-text)] w-28 focus:outline-none focus:border-[var(--color-accent)]/40"
                      />
                      <span className="text-[10px] text-[var(--color-text-muted)]">Used for session unlocking and profile switches.</span>
                    </div>
                  </div>

                  {/* Password Reset */}
                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/50 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Account Password Reset</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Send a password reset email link to {currentUser.email}.</span>
                    </div>
                    <button 
                      type="button"
                      onClick={handleSimulateResetPassword}
                      className="px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-xs font-bold text-[var(--color-text)] rounded-lg border border-[var(--color-border)]/70 transition-all cursor-pointer"
                    >
                      Reset Password
                    </button>
                  </div>

                  {/* Require PIN for SIN Audit */}
                  <div className="flex items-center justify-between bg-[var(--color-surface-2)]/50 p-4 rounded-lg border border-[var(--color-border)]/70">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Audit SIN Access Verification</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Require manual PIN reentry before viewing sensitive borrower SIN fields.</span>
                    </div>
                    <button onClick={() => setRequirePinForSin(!requirePinForSin)} className="shrink-0 text-[var(--color-accent)] cursor-pointer">
                      {requirePinForSin ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-[var(--color-text-faint)]/40" />}
                    </button>
                  </div>

                  {/* Multi Factor Authentication */}
                  <div className="bg-[var(--color-surface-2)]/50 p-4 rounded-lg border border-[var(--color-border)]/70 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[var(--color-text)] block">Two-Factor Authentication (2FA)</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Enhance account protection with an authenticator app.</span>
                      </div>
                      {mfaEnabled ? (
                        <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                          Active (2FA Secured)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowMfaSetup(true)}
                          className="px-3 py-1.5 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 text-xs font-bold text-[var(--color-accent)] rounded-lg transition-all cursor-pointer"
                        >
                          Enable 2FA
                        </button>
                      )}
                    </div>

                    {showMfaSetup && (
                      <div className="bg-[var(--color-surface-3)] p-3 rounded-lg border border-[var(--color-border)]/70 space-y-3">
                        <div className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                          Enter the 6-digit confirmation code from your authenticator app (Use <strong>123456</strong> for testing).
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="000000"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                            className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded px-2.5 py-1 text-xs font-mono tracking-widest text-[var(--color-text)] w-28 text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyMfa}
                            className="px-3 py-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-bold rounded cursor-pointer"
                          >
                            Verify &amp; Activate
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMfaSetup(false)}
                            className="px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Session Logs */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Active Workspace Device Sessions</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)]/70 text-xs text-[var(--color-text-muted)]">
                        <Laptop className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-[var(--color-text)]">Current Web Session</div>
                          <div className="text-[10px] mt-0.5">Primary Browser • Ontario, Canada</div>
                        </div>
                        <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active Now</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveSecurity}
                    className="w-full py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-lg hover:bg-[var(--color-accent-hover)] transition-all uppercase tracking-wider mt-2 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Security Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERSONAL PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[var(--color-accent)]" /> Personal Preferences
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Configure landing views, dashboard layout preferences, and date formatting.</p>
                </div>

                <div className="space-y-4">
                  {/* Landing Screen */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Default Landing Page</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">The CRM view displayed immediately after unlock.</span>
                    </div>
                    <select
                      value={prefLanding}
                      onChange={(e) => setPrefLanding(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50 w-full sm:w-48 cursor-pointer"
                    >
                      <option value="dashboard">Dashboard Overview</option>
                      <option value="clients">Client Database</option>
                      <option value="pipeline">Pipeline Board</option>
                      <option value="ai">AI Intake Console</option>
                    </select>
                  </div>

                  {/* Dashboard View */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Preferred Dashboard Style</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Visual layout style for the primary dashboard.</span>
                    </div>
                    <select
                      value={prefDashboard}
                      onChange={(e) => setPrefDashboard(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50 w-full sm:w-48 cursor-pointer"
                    >
                      <option value="bento">Bento Grid Dashboard</option>
                      <option value="summary">Summary Focus Cards</option>
                      <option value="metrics">Metric Trends &amp; Charts</option>
                    </select>
                  </div>

                  {/* Client Layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Default Client Directory Layout</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Preferred display style in the clients database.</span>
                    </div>
                    <select
                      value={prefLayout}
                      onChange={(e) => setPrefLayout(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50 w-full sm:w-48 cursor-pointer"
                    >
                      <option value="table">Table List View</option>
                      <option value="cards">Interactive Cards Grid</option>
                    </select>
                  </div>

                  {/* Date Formats */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Date Format</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Display format for dates throughout the app.</span>
                    </div>
                    <select
                      value={prefDateFormat}
                      onChange={(e) => setPrefDateFormat(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50 w-full sm:w-48 cursor-pointer"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-06-24)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (24/06/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (06/24/2026)</option>
                    </select>
                  </div>

                  {/* Time Zone Selection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/70 pb-4">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Time Zone
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block max-w-sm">
                        Used for dashboard time, calendar events, reminders, and deadlines.
                      </span>
                      <span className="text-[9px] text-[var(--color-text-faint)] mt-0.5 block">
                        Detected system timezone: <strong className="font-mono text-[var(--color-text)]">{getDetectedSystemTimeZone()}</strong>
                      </span>
                    </div>
                    <select
                      value={prefTimeZone}
                      onChange={(e) => setPrefTimeZone(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50 w-full sm:w-64 cursor-pointer font-sans"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time format */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text)] block">Time Format</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block">Clock format for calendar appointments and timestamps.</span>
                    </div>
                    <select
                      value={prefTimeFormat}
                      onChange={(e) => setPrefTimeFormat(e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50 w-full sm:w-48 cursor-pointer"
                    >
                      <option value="12">12-hour (AM / PM)</option>
                      <option value="24">24-hour scale</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleSavePreferences}
                    className="w-full py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-lg hover:bg-[var(--color-accent-hover)] transition-all uppercase tracking-wider mt-4 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
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

        </section>

      </div>
    </div>
  );
};
