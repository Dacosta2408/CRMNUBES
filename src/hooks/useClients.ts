import { useState, useEffect } from "react";
import { Client, User } from "../types";
import { DEFAULT_CLIENTS } from "../data";
import { checkBridgeHealth, getAllClients, createClient, updateClient, deleteClient } from "../lib/bridgeService";
import { safeJsonParse } from "../lib/json";

export interface UseClientsDeps {
  currentUser: User;
  logActivity: (action: string, target?: string) => void;
  showToast: (msg: string, type?: "success" | "error", icon?: string) => void;
  setDetailTab: (tab: string) => void;
  logActivityEvent: (event: any) => void;
}

export function useClients({
  currentUser,
  logActivity,
  showToast,
  setDetailTab,
  logActivityEvent
}: UseClientsDeps) {
  // ─── STATE MANAGEMENT ───
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem("gbk_clients");
    return safeJsonParse(saved, DEFAULT_CLIENTS);
  });

  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [clientViewMode, setClientViewMode] = useState<'database' | 'pipeline'>("database");

  // Load clients from bridge server on mount if online
  useEffect(() => {
    async function loadInitialClients() {
      const online = await checkBridgeHealth();
      if (online) {
        const bridgeClients = await getAllClients();
        if (bridgeClients && bridgeClients.length > 0) {
          setClients(bridgeClients);
        }
      }
    }
    loadInitialClients();
  }, []);

  // Sync clients state to localstorage (always written as backup)
  useEffect(() => {
    localStorage.setItem("gbk_clients", JSON.stringify(clients));
  }, [clients]);

  // Keep currentClient in sync with the clients master list to prevent stale state
  useEffect(() => {
    if (currentClient) {
      const latest = clients.find(c => c.id === currentClient.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(currentClient)) {
        setCurrentClient(latest);
      }
    }
  }, [clients, currentClient]);

  // Double click or context opener
  function openClient(id: string, initialTab?: string) {
    const target = clients.find(cl => cl.id === id);
    if (target) {
      setCurrentClient(target);
      setDetailTab(initialTab || "overview");
      logActivity("Viewed client file folder", target.first + " " + target.last);
    }
  }

  function closeDetail() {
    setCurrentClient(null);
  }

  async function handleUpdateClientStatus(id: string, s: any) {
    const updated = clients.map(c => c.id === id ? { ...c, status: s, updatedAt: new Date().toISOString() } : c);
    setClients(updated);
    const updatedCl = updated.find(x => x.id === id);
    if (updatedCl) {
      setCurrentClient(updatedCl);
      logActivityEvent({
        clientId: id,
        clientName: `${updatedCl.first} ${updatedCl.last}`,
        eventType: "stage_change",
        user: `${currentUser.first} ${currentUser.last}`,
        timestamp: new Date().toISOString(),
        description: `Transitioned mortgage file folder stage to [${s.toUpperCase()}]`
      });

      const online = await checkBridgeHealth();
      if (online) {
        await updateClient(id, updatedCl);
      }
    }
    showToast("Status updated successfully!", "success");
    logActivity("Updated client status", `${updatedCl?.first} ${updatedCl?.last} → ${s}`);
  }

  async function handleUpdateClient(updatedClient: Client) {
    const updatedClientWithTime = {
      ...updatedClient,
      updatedAt: updatedClient.updatedAt || new Date().toISOString()
    };
    const updated = clients.map(c => c.id === updatedClientWithTime.id ? updatedClientWithTime : c);
    setClients(updated);
    if (currentClient && currentClient.id === updatedClientWithTime.id) {
      setCurrentClient(updatedClientWithTime);
    }
    
    logActivity("Updated client details", `${updatedClientWithTime.first} ${updatedClientWithTime.last}`);
    logActivityEvent({
      clientId: updatedClientWithTime.id,
      clientName: `${updatedClientWithTime.first} ${updatedClientWithTime.last}`,
      eventType: "client_update",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Updated complete mortgage application file sections`
    });

    const online = await checkBridgeHealth();
    if (online) {
      await updateClient(updatedClientWithTime.id, updatedClientWithTime);
    }
  }

  async function handleCreateClient(newClient: Client) {
    setClients(prev => [newClient, ...prev]);
    
    logActivity("Created new client file", `${newClient.first} ${newClient.last}`);
    logActivityEvent({
      clientId: newClient.id,
      clientName: `${newClient.first} ${newClient.last}`,
      eventType: "client_created",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Created new client file folder: ${newClient.first} ${newClient.last}`
    });

    const online = await checkBridgeHealth();
    if (online) {
      await createClient(newClient);
    }
  }

  async function handleDeleteClient(id: string) {
    const target = clients.find(c => c.id === id);
    const clientName = target ? `${target.first} ${target.last}` : "Unknown Client";
    setClients(prev => prev.filter(c => c.id !== id));
    if (currentClient && currentClient.id === id) {
      setCurrentClient(null);
    }

    logActivity("Deleted client file", clientName);
    logActivityEvent({
      clientId: id,
      clientName: clientName,
      eventType: "client_deleted",
      user: `${currentUser.first} ${currentUser.last}`,
      timestamp: new Date().toISOString(),
      description: `Permanently deleted client folder: ${clientName}`
    });

    const online = await checkBridgeHealth();
    if (online) {
      await deleteClient(id);
    }
  }

  return {
    clients,
    setClients,
    currentClient,
    setCurrentClient,
    clientViewMode,
    setClientViewMode,
    openClient,
    closeDetail,
    handleUpdateClient,
    handleUpdateClientStatus,
    handleCreateClient,
    handleDeleteClient
  };
}

