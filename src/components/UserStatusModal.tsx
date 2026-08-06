import React, { useState, useEffect } from "react";
import { UserAvailability, UserStatus } from "../types";
import { updateMyAvailability, clearMyAvailability, getUserAvailability } from "../lib/api";
import { Check, Clock, X, Circle, Sparkles } from "lucide-react";

export interface UserStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onStatusUpdated?: (newStatus: UserStatus) => void;
}

const AVAILABILITY_OPTIONS: { id: UserAvailability; label: string; icon: string; colorClass: string }[] = [
  { id: "available", label: "Available", icon: "🟢", colorClass: "text-emerald-500" },
  { id: "busy", label: "Busy", icon: "🔴", colorClass: "text-rose-500" },
  { id: "in_meeting", label: "In a meeting", icon: "📅", colorClass: "text-purple-500" },
  { id: "on_call", label: "On a call", icon: "📞", colorClass: "text-blue-500" },
  { id: "do_not_disturb", label: "Do not disturb", icon: "⛔", colorClass: "text-rose-600" },
  { id: "away", label: "Away", icon: "🟡", colorClass: "text-amber-500" },
  { id: "offline", label: "Offline", icon: "⚪", colorClass: "text-slate-400" },
];

const EXPIRATION_OPTIONS = [
  { label: "Do not clear automatically", value: "none" },
  { label: "30 minutes", value: "30m" },
  { label: "1 hour", value: "1h" },
  { label: "2 hours", value: "2h" },
  { label: "Today", value: "today" },
];

export const UserStatusModal: React.FC<UserStatusModalProps> = ({
  isOpen,
  onClose,
  currentUserId = "staff_me",
  onStatusUpdated
}) => {
  const [availability, setAvailability] = useState<UserAvailability>("available");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [expirationChoice, setExpirationChoice] = useState<string>("none");
  const [customExpiresAt, setCustomExpiresAt] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getUserAvailability(currentUserId).then((st) => {
        if (st) {
          setAvailability(st.availability || "available");
          setCustomMessage(st.customMessage || "");
        }
      });
    }
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const calculateExpiresAtIso = (): string | undefined => {
    if (expirationChoice === "none") return undefined;
    const now = new Date();
    if (expirationChoice === "30m") {
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    }
    if (expirationChoice === "1h") {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
    if (expirationChoice === "2h") {
      return new Date(now.getTime() + 120 * 60 * 1000).toISOString();
    }
    if (expirationChoice === "today") {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      return endOfToday.toISOString();
    }
    if (expirationChoice === "custom" && customExpiresAt) {
      return new Date(customExpiresAt).toISOString();
    }
    return undefined;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const expiresAt = calculateExpiresAtIso();
      const updated = await updateMyAvailability(availability, customMessage.trim(), expiresAt);
      if (onStatusUpdated) onStatusUpdated(updated);
      onClose();
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const cleared = await clearMyAvailability();
      setAvailability("available");
      setCustomMessage("");
      if (onStatusUpdated) onStatusUpdated(cleared);
      onClose();
    } catch (err) {
      console.error("Failed to clear status", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface-1)] border border-[var(--color-border)] shadow-2xl p-6 text-[var(--color-text)] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
          <h3 className="text-base font-bold">Set Availability Status</h3>
        </div>

        {/* Status Selection list */}
        <div className="space-y-1.5 mb-4 max-h-56 overflow-y-auto pr-1">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const isSelected = availability === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAvailability(opt.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                    : "hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[var(--color-accent)]" />}
              </button>
            );
          })}
        </div>

        {/* Custom Status Message */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
            Custom Status Message (optional)
          </label>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="e.g. In client meeting until 3 PM"
            className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text)]"
          />
        </div>

        {/* Status Expiration */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Clear status after
          </label>
          <select
            value={expirationChoice}
            onChange={(e) => setExpirationChoice(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            {EXPIRATION_OPTIONS.map((exp) => (
              <option key={exp.value} value={exp.value}>
                {exp.label}
              </option>
            ))}
          </select>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            Clear Status
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-accent)] text-white hover:opacity-90 shadow-sm transition-all"
            >
              {saving ? "Saving..." : "Save Status"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
