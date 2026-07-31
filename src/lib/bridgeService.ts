import { Client, Lender, User } from "../types";

export const BRIDGE_URL = (import.meta as any).env?.VITE_BRIDGE_URL || "http://localhost:3001";

const BRIDGE_TOKEN = (import.meta as any).env?.VITE_BRIDGE_TOKEN || "gbk-local-secret-2024";

function logError(message: string, err: any) {
  console.warn(message, err);
}

/**
 * Helper to build headers with authentication token
 */
function getHeaders(contentType?: string): HeadersInit {
  const headers: Record<string, string> = {
    "x-gbk-token": BRIDGE_TOKEN
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

/**
 * Checks if the bridge server is running and accessible.
 */
export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/health`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(2000) // 2s timeout for snappy check
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch (err) {
    console.warn("Z Drive Bridge connection failed (offline):", err);
    return false;
  }
}

/**
 * Fetches the version of the bridge server.
 */
export async function getBridgeVersion(): Promise<{ version: string; env: string } | null> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/version`, {
      method: "GET",
      headers: getHeaders(),
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch bridge version:", err);
    return null;
  }
}

/**
 * Clients CRUD
 */
export async function getAllClients(): Promise<Client[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/clients`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    logError("bridgeService.getAllClients error:", err);
    return [];
  }
}

export async function getClient(id: string): Promise<Client | null> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/clients/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logError(`bridgeService.getClient error for id ${id}:`, err);
    return null;
  }
}

export async function createClient(client: Client): Promise<Client | null> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/clients`, {
      method: "POST",
      headers: getHeaders("application/json"),
      body: JSON.stringify(client)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logError("bridgeService.createClient error:", err);
    return null;
  }
}

export async function updateClient(id: string, client: Client): Promise<Client | null> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/clients/${id}`, {
      method: "PUT",
      headers: getHeaders("application/json"),
      body: JSON.stringify(client)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logError(`bridgeService.updateClient error for id ${id}:`, err);
    return null;
  }
}

export async function deleteClient(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/clients/${id}`, {
      method: "DELETE",
      headers: getHeaders("application/json"),
      body: JSON.stringify({ confirmed: true })
    });
    return res.ok;
  } catch (err) {
    logError(`bridgeService.deleteClient error for id ${id}:`, err);
    return false;
  }
}

/**
 * Documents
 */
export interface ClientDocument {
  name: string;
  size: number;
  modified: string;
}

export async function getClientDocuments(id: string): Promise<ClientDocument[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/clients/${id}/documents`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    logError(`bridgeService.getClientDocuments error for id ${id}:`, err);
    return [];
  }
}

export async function uploadDocument(clientId: string, file: File): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BRIDGE_URL}/api/clients/${clientId}/documents`, {
      method: "POST",
      headers: {
        "x-gbk-token": BRIDGE_TOKEN
      },
      body: formData
    });
    return res.ok;
  } catch (err) {
    logError(`bridgeService.uploadDocument error for client ${clientId}:`, err);
    return false;
  }
}

export async function deleteDocument(clientId: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/clients/${clientId}/documents/${encodeURIComponent(filename)}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return res.ok;
  } catch (err) {
    logError(`bridgeService.deleteDocument error for client ${clientId}, file ${filename}:`, err);
    return false;
  }
}

/**
 * System Data
 */
export async function getRoster(): Promise<User[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/roster`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    logError("bridgeService.getRoster error:", err);
    return [];
  }
}

export async function updateRoster(roster: User[]): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/roster`, {
      method: "PUT",
      headers: getHeaders("application/json"),
      body: JSON.stringify(roster)
    });
    return res.ok;
  } catch (err) {
    logError("bridgeService.updateRoster error:", err);
    return false;
  }
}

export async function getLenders(): Promise<Lender[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/lenders`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    logError("bridgeService.getLenders error:", err);
    return [];
  }
}

export async function updateLenders(lenders: Lender[]): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/lenders`, {
      method: "PUT",
      headers: getHeaders("application/json"),
      body: JSON.stringify(lenders)
    });
    return res.ok;
  } catch (err) {
    logError("bridgeService.updateLenders error:", err);
    return false;
  }
}

export async function getAuditLogs(): Promise<any[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/audit`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    logError("bridgeService.getAuditLogs error:", err);
    return [];
  }
}

export async function addAuditLog(logEntry: any): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/audit`, {
      method: "POST",
      headers: getHeaders("application/json"),
      body: JSON.stringify(logEntry)
    });
    return res.ok;
  } catch (err) {
    logError("bridgeService.addAuditLog error:", err);
    return false;
  }
}

export async function getBroadcasts(): Promise<any[]> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/broadcasts`, {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    logError("bridgeService.getBroadcasts error:", err);
    return [];
  }
}

export async function updateBroadcasts(broadcasts: any[]): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/system/broadcasts`, {
      method: "PUT",
      headers: getHeaders("application/json"),
      body: JSON.stringify(broadcasts)
    });
    return res.ok;
  } catch (err) {
    logError("bridgeService.updateBroadcasts error:", err);
    return false;
  }
}

/**
 * Emails
 */
export async function sendEmail(payload: {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
  host: string;
  port: string;
  username: string;
  password: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/email/send`, {
      method: "POST",
      headers: getHeaders("application/json"),
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    logError("bridgeService.sendEmail error:", err);
    return false;
  }
}
