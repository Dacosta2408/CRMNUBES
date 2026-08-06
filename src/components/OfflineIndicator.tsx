import React, { useState } from "react";
import { 
  WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpCircle, X 
} from "lucide-react";
import { useServiceWorker } from "../hooks/useServiceWorker";

export const OfflineIndicator: React.FC = () => {
  const { 
    isOnline, 
    hasUpdate, 
    isSyncing, 
    pendingCount, 
    applyUpdate, 
    syncNow 
  } = useServiceWorker();

  const [dismissedUpdateBanner, setDismissedUpdateBanner] = useState(false);

  // If online, no pending changes, and no SW update waiting -> render nothing
  if (isOnline && pendingCount === 0 && (!hasUpdate || dismissedUpdateBanner) && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full px-4 sm:px-0 pointer-events-none">
      
      {/* 1. SW Update Banner */}
      {hasUpdate && !dismissedUpdateBanner && (
        <div className="pointer-events-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 px-4 rounded-xl shadow-2xl border border-blue-400/30 flex items-center justify-between gap-3 text-xs font-medium animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5">
            <ArrowUpCircle className="w-4 h-4 text-blue-200 shrink-0 animate-pulse" />
            <span>A new version of GBK CRM is available!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyUpdate}
              className="px-3 py-1 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-lg transition shadow-sm text-[11px] whitespace-nowrap"
            >
              Update Now
            </button>
            <button
              onClick={() => setDismissedUpdateBanner(true)}
              className="p-1 hover:bg-white/10 rounded-md transition text-blue-200"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Offline Mode or Pending Sync Banner */}
      {(!isOnline || pendingCount > 0 || isSyncing) && (
        <div
          className={`pointer-events-auto p-3 px-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-center justify-between gap-3 text-xs font-medium transition-all duration-300 animate-in slide-in-from-bottom-3 ${
            !isOnline
              ? "bg-amber-950/90 text-amber-100 border-amber-500/40 shadow-amber-950/20"
              : pendingCount > 0
              ? "bg-blue-950/90 text-blue-100 border-blue-500/40 shadow-blue-950/20"
              : "bg-emerald-950/90 text-emerald-100 border-emerald-500/40"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {!isOnline ? (
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            ) : isSyncing ? (
              <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
            ) : pendingCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-blue-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}

            <div className="flex flex-col">
              <span className="font-bold">
                {!isOnline
                  ? "Working in Offline Mode"
                  : isSyncing
                  ? "Syncing Local Changes..."
                  : `${pendingCount} Change${pendingCount > 1 ? "s" : ""} Pending Sync`}
              </span>
              <span className="text-[10px] opacity-80">
                {!isOnline
                  ? pendingCount > 0
                    ? `${pendingCount} action${pendingCount > 1 ? "s" : ""} saved locally. Will sync when reconnected.`
                    : "Data is cached locally. Network connection lost."
                  : isSyncing
                  ? "Uploading pending offline mutations to server..."
                  : "Click sync to push saved changes to the cloud."}
              </span>
            </div>
          </div>

          {/* Sync Button */}
          {isOnline && pendingCount > 0 && !isSyncing && (
            <button
              onClick={syncNow}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Sync Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};
