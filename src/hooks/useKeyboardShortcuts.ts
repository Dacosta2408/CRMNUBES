import { useEffect, useState } from "react";
import { Shortcut, ShortcutCategory, PlatformType } from "../types";

export function getDetectedPlatform(): PlatformType {
  if (typeof window === "undefined" || !navigator) return "windows";
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";
  if (/Mac|iPod|iPhone|iPad/i.test(ua) || /Mac/i.test(platform)) {
    return "mac";
  }
  if (/Linux/i.test(ua) || /Linux/i.test(platform)) {
    return "linux";
  }
  return "windows";
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    id: "nav-search",
    category: "Navigation",
    description: "Quick search",
    macKeys: ["⌘", "K"],
    winKeys: ["Ctrl", "K"],
    keys: ["Ctrl", "K"],
    actionName: "Focus quick search input"
  },
  {
    id: "nav-dashboard",
    category: "Navigation",
    description: "Go to Dashboard",
    macKeys: ["⌘", "G"],
    winKeys: ["Ctrl", "G"],
    keys: ["Ctrl", "G"],
    actionName: "Navigate to Dashboard tab"
  },
  {
    id: "nav-clients",
    category: "Navigation",
    description: "Go to Clients",
    macKeys: ["⌘", "C"],
    winKeys: ["Ctrl", "C"],
    keys: ["Ctrl", "C"],
    actionName: "Navigate to Clients tab"
  },
  {
    id: "nav-tasks",
    category: "Navigation",
    description: "Go to Tasks",
    macKeys: ["⌘", "T"],
    winKeys: ["Ctrl", "T"],
    keys: ["Ctrl", "T"],
    actionName: "Navigate to Tasks tab"
  },
  {
    id: "nav-pipeline",
    category: "Navigation",
    description: "Go to Pipeline",
    macKeys: ["⌘", "P"],
    winKeys: ["Ctrl", "P"],
    keys: ["Ctrl", "P"],
    actionName: "Navigate to Pipeline tab"
  },

  // Actions
  {
    id: "act-new-client",
    category: "Actions",
    description: "New client",
    macKeys: ["⌘", "N"],
    winKeys: ["Ctrl", "N"],
    keys: ["Ctrl", "N"],
    actionName: "Open New Client intake modal"
  },
  {
    id: "act-save",
    category: "Actions",
    description: "Save current form",
    macKeys: ["⌘", "S"],
    winKeys: ["Ctrl", "S"],
    keys: ["Ctrl", "S"],
    actionName: "Trigger save on active form"
  },
  {
    id: "act-edit",
    category: "Actions",
    description: "Edit current item",
    macKeys: ["⌘", "E"],
    winKeys: ["Ctrl", "E"],
    keys: ["Ctrl", "E"],
    actionName: "Toggle edit mode on open detail view"
  },
  {
    id: "act-delete",
    category: "Actions",
    description: "Delete current item",
    macKeys: ["⌘", "D"],
    winKeys: ["Ctrl", "D"],
    keys: ["Ctrl", "D"],
    actionName: "Prompt delete for active item"
  },
  {
    id: "act-page-search",
    category: "Actions",
    description: "Search within page",
    macKeys: ["⌘", "F"],
    winKeys: ["Ctrl", "F"],
    keys: ["Ctrl", "F"],
    actionName: "Focus page-level filter/search"
  },

  // Application
  {
    id: "app-settings",
    category: "Application",
    description: "Open Settings",
    macKeys: ["⌘", ","],
    winKeys: ["Ctrl", ","],
    keys: ["Ctrl", ","],
    actionName: "Navigate to Settings tab"
  },
  {
    id: "app-shortcuts-toggle",
    category: "Application",
    description: "Toggle this shortcuts help",
    macKeys: ["⌘", "/"],
    winKeys: ["Ctrl", "/"],
    keys: ["Ctrl", "/"],
    actionName: "Open or close shortcuts reference modal"
  },
  {
    id: "app-close",
    category: "Application",
    description: "Close modal/panel",
    macKeys: ["Esc"],
    winKeys: ["Esc"],
    keys: ["Esc"],
    actionName: "Close active dialog or drawer"
  },
  {
    id: "app-shortcuts-question",
    category: "Application",
    description: "Open this shortcuts modal",
    macKeys: ["?"],
    winKeys: ["?"],
    keys: ["?"],
    actionName: "Open shortcuts help modal"
  }
];

export interface UseKeyboardShortcutsOptions {
  onToggleShortcutsModal?: () => void;
  onFocusSearch?: () => void;
  onNavigate?: (tab: string) => void;
  onNewClient?: () => void;
  onSaveForm?: () => void;
  onEditItem?: () => void;
  onDeleteItem?: () => void;
  onPageSearch?: () => void;
  onCloseModal?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onToggleShortcutsModal,
  onFocusSearch,
  onNavigate,
  onNewClient,
  onSaveForm,
  onEditItem,
  onDeleteItem,
  onPageSearch,
  onCloseModal,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const [platform, setPlatform] = useState<PlatformType>("windows");

  useEffect(() => {
    setPlatform(getDetectedPlatform());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = platform === "mac";
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      const keyLower = e.key.toLowerCase();

      const activeElem = document.activeElement;
      const isInputFocused =
        activeElem instanceof HTMLInputElement ||
        activeElem instanceof HTMLTextAreaElement ||
        activeElem instanceof HTMLSelectElement ||
        (activeElem instanceof HTMLElement && activeElem.isContentEditable);

      // 1. Esc key - Close Modal/Panel
      if (e.key === "Escape") {
        if (onCloseModal) {
          onCloseModal();
        }
        return;
      }

      // 2. '?' key (Shift + / without modifier) - Toggle shortcuts modal when not typing in text field
      if (e.key === "?" && !modKey && !isInputFocused) {
        e.preventDefault();
        onToggleShortcutsModal?.();
        return;
      }

      // 3. Modifier shortcuts (Ctrl/Cmd + Key)
      if (modKey) {
        // Ctrl/Cmd + / -> Toggle shortcuts modal
        if (e.key === "/") {
          e.preventDefault();
          onToggleShortcutsModal?.();
          return;
        }

        // Ctrl/Cmd + K -> Quick Search Focus
        if (keyLower === "k") {
          e.preventDefault();
          onFocusSearch?.();
          return;
        }

        // Ctrl/Cmd + G -> Dashboard
        if (keyLower === "g") {
          e.preventDefault();
          onNavigate?.("dashboard");
          return;
        }

        // Ctrl/Cmd + C -> Clients (Only prevent default if not selecting text or in input without shift? Or prevent to navigate)
        // Note: To make Ctrl+C work for navigation without breaking copy when text is selected:
        const hasTextSelection = window.getSelection()?.toString().length;
        if (keyLower === "c" && !hasTextSelection && !isInputFocused) {
          e.preventDefault();
          onNavigate?.("clients");
          return;
        }

        // Ctrl/Cmd + T -> Tasks
        if (keyLower === "t") {
          e.preventDefault();
          onNavigate?.("tasks");
          return;
        }

        // Ctrl/Cmd + P -> Pipeline
        if (keyLower === "p") {
          e.preventDefault();
          onNavigate?.("pipeline");
          return;
        }

        // Ctrl/Cmd + N -> New Client
        if (keyLower === "n") {
          e.preventDefault();
          onNewClient?.();
          return;
        }

        // Ctrl/Cmd + S -> Save Form
        if (keyLower === "s") {
          e.preventDefault();
          onSaveForm?.();
          return;
        }

        // Ctrl/Cmd + E -> Edit Item
        if (keyLower === "e") {
          e.preventDefault();
          onEditItem?.();
          return;
        }

        // Ctrl/Cmd + D -> Delete Item
        if (keyLower === "d") {
          e.preventDefault();
          onDeleteItem?.();
          return;
        }

        // Ctrl/Cmd + F -> Search within Page
        if (keyLower === "f") {
          e.preventDefault();
          if (onPageSearch) {
            onPageSearch();
          } else {
            onFocusSearch?.();
          }
          return;
        }

        // Ctrl/Cmd + , -> Settings
        if (e.key === ",") {
          e.preventDefault();
          onNavigate?.("settings");
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    platform,
    enabled,
    onToggleShortcutsModal,
    onFocusSearch,
    onNavigate,
    onNewClient,
    onSaveForm,
    onEditItem,
    onDeleteItem,
    onPageSearch,
    onCloseModal,
  ]);

  return {
    platform,
    isMac: platform === "mac",
    shortcuts: DEFAULT_SHORTCUTS,
  };
}
