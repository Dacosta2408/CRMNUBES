import { useState, useEffect, useCallback } from "react";
import { 
  subscribeSyncQueue, 
  processSyncQueue, 
  getPendingQueueCount, 
  getLastSyncTime, 
  OfflineAction 
} from "../lib/syncQueue";

export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(getPendingQueueCount());
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Connection listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync queue on reconnect
      syncNow();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync queue subscription
  useEffect(() => {
    const unsubscribe = subscribeSyncQueue((queue: OfflineAction[], lastSync: string | null) => {
      const count = queue.filter(a => a.status === "pending" || a.status === "failed").length;
      setPendingCount(count);
      setLastSyncedAt(lastSync);
    });

    return () => unsubscribe();
  }, []);

  // Service Worker Registration & Update Detection
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => {
          console.log("[useServiceWorker] Registered with scope:", reg.scope);

          // If a worker is already waiting to activate
          if (reg.waiting) {
            setHasUpdate(true);
            setWaitingWorker(reg.waiting);
          }

          // Check if a new service worker is installing
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[useServiceWorker] New version available!");
                setHasUpdate(true);
                setWaitingWorker(newWorker);
              }
            });
          });
        })
        .catch((err) => {
          console.warn("[useServiceWorker] Registration failed:", err);
        });

      // Reload page when new service worker takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  // Manual Trigger to Skip Waiting and Reload
  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  // Trigger manual sync
  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await processSyncQueue();
    } catch (e) {
      console.error("[useServiceWorker] Manual sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return {
    isOnline,
    hasUpdate,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    applyUpdate,
    syncNow
  };
}
