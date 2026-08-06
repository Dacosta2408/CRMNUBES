import { useState, useEffect } from "react";

/**
 * Utility functions for timezone-aware date and time formatting across GBK CRM.
 */

export interface TimeZoneOption {
  value: string;
  label: string;
}

export const MAJOR_TIMEZONES: TimeZoneOption[] = [
  { value: "America/New_York", label: "America/New_York (Eastern Time)" },
  { value: "America/Chicago", label: "America/Chicago (Central Time)" },
  { value: "America/Denver", label: "America/Denver (Mountain Time)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific Time)" },
  { value: "America/Anchorage", label: "America/Anchorage (Alaska Time)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (Hawaii Time)" },
  { value: "America/Toronto", label: "America/Toronto (Eastern Time - Canada)" },
  { value: "America/Vancouver", label: "America/Vancouver (Pacific Time - Canada)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST)" },
];

export const DATE_FORMAT_OPTIONS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g., 08/05/2026)", example: "08/05/2026" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g., 05/08/2026)", example: "05/08/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g., 2026-08-05)", example: "2026-08-05" },
  { value: "MMMM D, YYYY", label: "MMMM D, YYYY (e.g., August 5, 2026)", example: "August 5, 2026" },
  { value: "D MMMM YYYY", label: "D MMMM YYYY (e.g., 5 August 2026)", example: "5 August 2026" },
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

export function getUserDateFormat(): string {
  try {
    const saved = localStorage.getItem("gbk_pref_dateformat") || localStorage.getItem("gbk_pref_date_format");
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // fallback
  }
  return "MM/DD/YYYY";
}

export function setUserDateFormat(fmt: string): void {
  try {
    localStorage.setItem("gbk_pref_dateformat", fmt);
    localStorage.setItem("gbk_pref_date_format", fmt);
    notifyTimeZoneChange();
  } catch (err) {
    console.error("Failed to set user date format preference:", err);
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

export function useUserDateFormat(): string {
  const [fmt, setFmt] = useState<string>(() => getUserDateFormat());

  useEffect(() => {
    const handleTzChange = () => {
      setFmt(getUserDateFormat());
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

  return fmt;
}

export function getCurrentTimeInTimezone(timezone?: string): string {
  const tz = timezone || getUserTimeZone();
  try {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
  } catch {
    return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
}

export function convertToUserTimezone(date: Date, timezone?: string): Date {
  const tz = timezone || getUserTimeZone();
  try {
    const timeString = date.toLocaleString("en-US", { timeZone: tz });
    return new Date(timeString);
  } catch {
    return date;
  }
}

export function formatDateInTimezone(
  dateInput: Date | string | number,
  timezone?: string,
  formatStr?: string
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const tz = timezone || getUserTimeZone();
  const fmt = formatStr || getUserDateFormat();

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";

    const monthLong = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long" }).format(d);
    const dayNumeric = parseInt(day, 10).toString();

    switch (fmt) {
      case "DD/MM/YYYY":
        return `${day}/${month}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "MMMM D, YYYY":
        return `${monthLong} ${dayNumeric}, ${year}`;
      case "D MMMM YYYY":
        return `${dayNumeric} ${monthLong} ${year}`;
      case "MM/DD/YYYY":
      default:
        return `${month}/${day}/${year}`;
    }
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatDateTime(
  dateInput: Date | string | number = new Date(),
  timezone?: string,
  formatStr?: string
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const dateFormatted = formatDateInTimezone(d, timezone, formatStr);
  const timeFormatted = getCurrentTimeInTimezone(timezone);

  return `${dateFormatted} ${timeFormatted}`;
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
  optionsOrTz?: Intl.DateTimeFormatOptions | string,
  customTz?: string
): string {
  if (typeof optionsOrTz === "string") {
    return formatDateInTimezone(dateInput, optionsOrTz);
  }
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const timeZone = customTz || getUserTimeZone();
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
    ...optionsOrTz,
  };

  try {
    return new Intl.DateTimeFormat("en-US", defaultOptions).format(d);
  } catch {
    return d.toLocaleDateString("en-US", optionsOrTz);
  }
}
