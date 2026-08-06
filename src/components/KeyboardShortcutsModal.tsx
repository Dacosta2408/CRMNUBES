import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Keyboard, Copy, Check, Command, Sparkles } from "lucide-react";
import { DEFAULT_SHORTCUTS, getDetectedPlatform } from "../hooks/useKeyboardShortcuts";
import { Shortcut, ShortcutCategory, PlatformType } from "../types";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
  onNewClient?: () => void;
  onFocusSearch?: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info", icon?: string) => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onNewClient,
  onFocusSearch,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<PlatformType>("windows");

  useEffect(() => {
    setPlatform(getDetectedPlatform());
  }, []);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setCopiedId(null);
    }
  }, [isOpen]);

  // Handle Escape key inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const isMac = platform === "mac";

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return DEFAULT_SHORTCUTS;

    const q = searchQuery.toLowerCase().trim();
    return DEFAULT_SHORTCUTS.filter((sc) => {
      const descMatch = sc.description.toLowerCase().includes(q);
      const catMatch = sc.category.toLowerCase().includes(q);
      const keysMatch = (isMac ? sc.macKeys : sc.winKeys)?.some((k) => k.toLowerCase().includes(q));
      const actionMatch = sc.actionName?.toLowerCase().includes(q);
      return descMatch || catMatch || keysMatch || actionMatch;
    });
  }, [searchQuery, isMac]);

  // Group by category
  const categories: ShortcutCategory[] = ["Navigation", "Actions", "Application"];

  const handleCopyShortcut = (sc: Shortcut, e: React.MouseEvent) => {
    e.stopPropagation();
    const keysList = isMac ? sc.macKeys || sc.keys : sc.winKeys || sc.keys;
    const str = `${keysList.join(" + ")} - ${sc.description}`;

    navigator.clipboard?.writeText(str);
    setCopiedId(sc.id);
    if (showToast) {
      showToast(`Copied shortcut: ${keysList.join(" + ")}`, "info", "📋");
    }
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleTriggerShortcutAction = (sc: Shortcut) => {
    if (sc.id === "nav-dashboard") onNavigate?.("dashboard");
    else if (sc.id === "nav-clients") onNavigate?.("clients");
    else if (sc.id === "nav-tasks") onNavigate?.("tasks");
    else if (sc.id === "nav-pipeline") onNavigate?.("pipeline");
    else if (sc.id === "app-settings") onNavigate?.("settings");
    else if (sc.id === "act-new-client") onNewClient?.();
    else if (sc.id === "nav-search") onFocusSearch?.();
    else return;

    onClose();
  };

  // Helper to render key badges
  const renderKeyBadges = (sc: Shortcut) => {
    const keys = isMac ? sc.macKeys || sc.keys : sc.winKeys || sc.keys;

    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {keys.map((k, idx) => (
          <React.Fragment key={idx}>
            <kbd className="px-2 py-1 bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] rounded-md shadow-xs text-[11px] font-mono font-bold tracking-tight inline-flex items-center justify-center min-w-[24px]">
              {k === "⌘" ? <Command className="w-3 h-3 inline-block" /> : k}
            </kbd>
            {idx < keys.length - 1 && (
              <span className="text-[10px] text-[var(--color-text-faint)] font-bold">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Helper to highlight matching text in search
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--color-text)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)]/80 flex items-center justify-between bg-[var(--color-surface-2)]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-xl border border-[var(--color-accent)]/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[var(--color-text)] flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--color-accent)]/20 uppercase">
                  {isMac ? "macOS" : "Windows / Linux"}
                </span>
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Press key combinations from anywhere in GBK CRM to trigger quick actions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] rounded-lg transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[var(--color-border)]/60 bg-[var(--color-surface)] shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts by name, action, or keys (e.g. Cmd+K, Clients, New)..."
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-10 pr-9 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] font-sans"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Keyboard className="w-10 h-10 text-[var(--color-text-faint)] mx-auto opacity-50" />
              <p className="text-xs font-bold text-[var(--color-text-muted)]">No matching keyboard shortcuts found</p>
              <p className="text-[11px] text-[var(--color-text-faint)]">Try searching with a different keyword like "Dashboard", "Save", or "Ctrl".</p>
            </div>
          ) : (
            categories.map((category) => {
              const items = filteredShortcuts.filter((s) => s.category === category);
              if (items.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {category}
                    </h3>
                    <div className="flex-1 h-px bg-[var(--color-border)]/60" />
                  </div>

                  <div className="grid grid-cols-1 divide-y divide-[var(--color-border)]/40 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface-2)]/30 overflow-hidden">
                    {items.map((sc) => {
                      const isClickable = ["nav-dashboard", "nav-clients", "nav-tasks", "nav-pipeline", "app-settings", "act-new-client", "nav-search"].includes(sc.id);

                      return (
                        <div
                          key={sc.id}
                          onClick={() => isClickable && handleTriggerShortcutAction(sc)}
                          className={`p-3.5 flex items-center justify-between gap-4 transition-colors group ${
                            isClickable ? "hover:bg-[var(--color-accent)]/5 cursor-pointer" : "hover:bg-[var(--color-surface-2)]/60"
                          }`}
                        >
                          {/* Left: Description & Action */}
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                              {highlightText(sc.description, searchQuery)}
                            </div>
                            {sc.actionName && (
                              <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                                {highlightText(sc.actionName, searchQuery)}
                              </div>
                            )}
                          </div>

                          {/* Right: Key Badges & Copy Button */}
                          <div className="flex items-center gap-3">
                            {renderKeyBadges(sc)}

                            <button
                              type="button"
                              onClick={(e) => handleCopyShortcut(sc, e)}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                              title="Copy shortcut string"
                            >
                              {copiedId === sc.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--color-border)]/80 bg-[var(--color-surface-2)]/50 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
            <span>
              Tip: Press <kbd className="px-1.5 py-0.5 bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] rounded text-[10px] font-mono font-bold">?</kbd> anywhere in the CRM to open this guide.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
