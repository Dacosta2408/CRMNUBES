/**
 * Auto-Update Checker for Windows .exe distribution & Web Runtime
 */

export interface UpdateManifest {
  latestVersion: string;
  minRequiredVersion: string;
  releaseDate: string;
  releaseNotes: string;
  changelog: string[];
  downloadUrl: {
    exe: string;
    msi: string;
    web: string;
  };
  fileSizeMB: number;
  hash?: string;
  isMandatory?: boolean;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isMandatory: boolean;
  currentVersion: string;
  manifest: UpdateManifest | null;
  checkedAt: string;
  error?: string;
}

export interface UpdateSettings {
  autoCheck: boolean;
  autoDownload: boolean;
  installOnRestart: boolean;
  checkFrequency: "daily" | "weekly" | "monthly";
  lastChecked: string | null;
}

export interface UpdateHistoryEntry {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  title: string;
  changes: string[];
}

export const CURRENT_APP_VERSION = "1.0.0";
const SETTINGS_KEY = "gbk_update_settings";
const HISTORY_KEY = "gbk_update_history";

/**
 * Utility to compare semantic version numbers (e.g., "1.2.0" vs "1.0.0")
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split(".").map(n => parseInt(n, 10) || 0);
  const p2 = v2.split(".").map(n => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Get current update settings from localStorage
 */
export function getUpdateSettings(): UpdateSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed reading update settings:", e);
  }
  return {
    autoCheck: true,
    autoDownload: true,
    installOnRestart: true,
    checkFrequency: "daily",
    lastChecked: null
  };
}

/**
 * Save update settings to localStorage
 */
export function saveUpdateSettings(settings: UpdateSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed saving update settings:", e);
  }
}

/**
 * Mock/Remote update manifest fetcher
 */
export async function fetchRemoteUpdateManifest(): Promise<UpdateManifest> {
  try {
    const res = await fetch("/api/version", { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.latestVersion) {
        return data as UpdateManifest;
      }
    }
  } catch (err) {
    console.warn("Could not reach remote version endpoint, using embedded manifest fallback:", err);
  }

  // Fallback manifest representing upcoming version 1.2.0
  return {
    latestVersion: "1.2.0",
    minRequiredVersion: "1.0.0",
    releaseDate: "2026-08-05",
    releaseNotes: "Major performance upgrade, offline sync queue, and Windows desktop .exe distribution support.",
    changelog: [
      "Added offline mode with Service Worker caching and local data queue",
      "Integrated Windows .exe auto-updater framework",
      "Optimized Virtual Scroll for large client lists and pipeline cards",
      "Enhanced OSFI mortgage stress test calculation algorithms",
      "Added Z Drive Bridge network retry logic and health check monitoring"
    ],
    downloadUrl: {
      exe: "/downloads/GBK-CRM-Setup-1.2.0.exe",
      msi: "/downloads/GBK-CRM-Setup-1.2.0.msi",
      web: "/"
    },
    fileSizeMB: 68.4,
    hash: "a3f89012bce7812d44901efc99001122aaff987112001e3b",
    isMandatory: false
  };
}

/**
 * Check for application updates
 */
export async function checkForUpdates(force = false): Promise<UpdateCheckResult> {
  const settings = getUpdateSettings();
  const now = new Date();

  // If autoCheck disabled and not forced, return early
  if (!settings.autoCheck && !force) {
    return {
      hasUpdate: false,
      isMandatory: false,
      currentVersion: CURRENT_APP_VERSION,
      manifest: null,
      checkedAt: settings.lastChecked || now.toISOString()
    };
  }

  try {
    const manifest = await fetchRemoteUpdateManifest();
    const hasUpdate = compareVersions(manifest.latestVersion, CURRENT_APP_VERSION) > 0;
    const isMandatory = compareVersions(CURRENT_APP_VERSION, manifest.minRequiredVersion) < 0 || Boolean(manifest.isMandatory);

    // Update last checked time
    settings.lastChecked = now.toISOString();
    saveUpdateSettings(settings);

    return {
      hasUpdate,
      isMandatory,
      currentVersion: CURRENT_APP_VERSION,
      manifest,
      checkedAt: now.toISOString()
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      isMandatory: false,
      currentVersion: CURRENT_APP_VERSION,
      manifest: null,
      checkedAt: now.toISOString(),
      error: err?.message || "Failed to query update server"
    };
  }
}

/**
 * Get update changelog history
 */
export function getUpdateHistory(): UpdateHistoryEntry[] {
  return [
    {
      version: "1.2.0",
      date: "2026-08-05",
      type: "major",
      title: "Offline Mode & Windows Installer Auto-Updates",
      changes: [
        "Service Worker caching for static assets & offline mode indicator",
        "Windows .exe installer auto-update integration with background download",
        "Local IndexedDB / localStorage queue for offline client updates",
        "UI performance rendering optimizations and debounced search filters"
      ]
    },
    {
      version: "1.1.0",
      date: "2026-07-20",
      type: "minor",
      title: "Z Drive Bridge & Underwriting Assistant",
      changes: [
        "Integrated Local Z Drive File System Sync Bridge",
        "AI Underwriting Report Generator using Gemini 3.5 Flash",
        "Added Mortgage Stress Test & Qualification Calculators",
        "Custom Document Vault with PDF auto-generation"
      ]
    },
    {
      version: "1.0.0",
      date: "2026-06-01",
      type: "patch",
      title: "Initial GBK CRM Release",
      changes: [
        "Client pipeline kanban board and contact management",
        "Task scheduler and calendar event integration",
        "Lender rate matrix directory and client matcher"
      ]
    }
  ];
}
