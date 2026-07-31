import { useState, useEffect } from "react";

/**
 * Utility functions for timezone-aware date and time formatting across GBK CRM.
 */

export const COMMON_TIMEZONES = [
  { value: "America/Toronto", label: "Eastern Time - Toronto / Montreal (America/Toronto)" },
  { value: "America/New_York", label: "Eastern Time - New York / Miami (America/New_York)" },
  { value: "America/Chicago", label: "Central Time - Chicago / Winnipeg (America/Chicago)" },
  { value: "America/Edmonton", label: "Mountain Time - Calgary / Edmonton (America/Edmonton)" },
  { value: "America/Denver", label: "Mountain Time - Denver / Phoenix (America/Denver)" },
  { value: "America/Vancouver", label: "Pacific Time - Vancouver (America/Vancouver)" },
  { value: "America/Los_Angeles", label: "Pacific Time - Los Angeles / Seattle (America/Los_Angeles)" },
  { value: "America/Halifax", label: "Atlantic Time - Halifax (America/Halifax)" },
  { value: "America/St_Johns", label: "Newfoundland Time - St. John's (America/St_Johns)" },
  { value: "America/Anchorage", label: "Alaska Time (America/Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Pacific/Honolulu)" },
  { value: "Europe/London", label: "GMT / BST - London (Europe/London)" },
  { value: "Europe/Paris", label: "CET - Paris / Berlin (Europe/Paris)" },
  { value: "Asia/Tokyo", label: "JST - Tokyo (Asia/Tokyo)" },
  { value: "UTC", label: "UTC - Coordinated Universal Time" },
];

export function getDetectedSystemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";
  } catch {
    return "America/Toronto";
  }
}

export function getUserTimeZone(): string {
  try {
    const saved = localStorage.getItem("gbk_pref_timezone");
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // fallback
  }
  return getDetectedSystemTimeZone();
}

export function setUserTimeZone(tz: string): void {
  try {
    localStorage.setItem("gbk_pref_timezone", tz);
    notifyTimeZoneChange();
  } catch (err) {
    console.error("Failed to set user time zone preference:", err);
  }
}

export function notifyTimeZoneChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("gbk_timezone_changed"));
  }
}

export function useUserTimeZone(): string {
  const [tz, setTz] = useState<string>(() => getUserTimeZone());

  useEffect(() => {
    const handleTzChange = () => {
      setTz(getUserTimeZone());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("gbk_timezone_changed", handleTzChange);
      window.addEventListener("storage", handleTzChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("gbk_timezone_changed", handleTzChange);
        window.removeEventListener("storage", handleTzChange);
      }
    };
  }, []);

  return tz;
}

export function getFormattedLiveTime(now: Date = new Date(), customTz?: string): { timeString: string; tzAbbrev: string; fullTz: string } {
  const timeZone = customTz || getUserTimeZone();
  try {
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone,
    });

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(now);

    const tzAbbrev = parts.find((p) => p.type === "timeZoneName")?.value || "";

    return {
      timeString,
      tzAbbrev,
      fullTz: timeZone,
    };
  } catch {
    return {
      timeString: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      tzAbbrev: "",
      fullTz: timeZone,
    };
  }
}

export function formatDateInTimeZone(
  dateInput: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  customTz?: string
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const timeZone = customTz || getUserTimeZone();
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
    ...options,
  };

  try {
    return new Intl.DateTimeFormat("en-US", defaultOptions).format(d);
  } catch {
    return d.toLocaleDateString("en-US", options);
  }
}

export function formatTimeInTimeZone(
  dateInput: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  customTz?: string
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const timeZone = customTz || getUserTimeZone();
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    ...options,
  };

  try {
    return new Intl.DateTimeFormat("en-US", defaultOptions).format(d);
  } catch {
    return d.toLocaleTimeString("en-US", options);
  }
}
