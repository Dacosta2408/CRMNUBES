import { Client, User as CRMUser } from "../types";
import { safeJsonParse } from "./json";

export interface FileNote {
  id: string;
  clientId: string;
  author: string;
  timestamp: string; // ISO format
  type: 
    | 'general' 
    | 'broker' 
    | 'manager' 
    | 'call' 
    | 'lender' 
    | 'underwriting' 
    | 'internal' 
    | 'lawyer' 
    | 'partner';
  content: string;
  tags?: string[];
  communicationDetails?: {
    type: 'phone_call' | 'voicemail' | 'email' | 'sms' | 'meeting' | 'lender_update' | 'client_chase' | 'solicitor' | 'brokerage';
    direction: 'incoming' | 'outgoing';
    nextActionNeeded?: string;
    nextActionDueDate?: string;
    status: 'unresolved' | 'resolved';
  };
  editHistory?: Array<{
    editor: string;
    timestamp: string;
    previousContent: string;
  }>;
}

export interface FileFollowUp {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  assignedOwner: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'completed' | 'overdue';
  createdTime: string;
  completedTime?: string;
  taskId?: string;
  eventId?: string;
  timeStart?: string;
  timeEnd?: string;
}

export interface ActivityEvent {
  id: string;
  clientId: string;
  clientName: string;
  eventType: 
    | 'stage_change' 
    | 'note_added' 
    | 'note_edited'
    | 'communication_logged' 
    | 'document_uploaded' 
    | 'document_reviewed' 
    | 'checklist_updated' 
    | 'readiness_changed' 
    | 'followup_added' 
    | 'followup_completed'
    | 'broker_assigned'
    | 'compliance_flagged'
    | 'client_created'
    | 'client_updated';
  user: string;
  timestamp: string; // ISO format
  description: string;
  details?: string;
  linkedContext?: {
    itemId?: string;
    docId?: string;
    stageFrom?: string;
    stageTo?: string;
  };
}

// 1. NOTES & COMMUNICATIONS HELPERS
export function getNotesForClient(client: Client): FileNote[] {
  // Try loading from localStorage specific key
  const saved = localStorage.getItem(`gbk_file_notes_${client.id}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing client notes", e);
    }
  }

  // Fallback: migrate notes from client's appData if existing
  let legacyNotes: FileNote[] = [];
  try {
    const listJson = client.appData?.notesListJson;
    if (listJson) {
      const parsedLegacy = JSON.parse(listJson);
      legacyNotes = parsedLegacy.map((n: any, idx: number) => ({
        id: `legacy_${idx}_${Date.now()}`,
        clientId: client.id,
        author: n.author || "Unknown Agent",
        timestamp: n.time || new Date().toISOString(),
        type: 'general',
        content: n.text || ""
      }));
    } else if (client.appData?.internalNotes) {
      legacyNotes = [{
        id: `legacy_init_${Date.now()}`,
        clientId: client.id,
        author: "System Importer / Admin",
        timestamp: client.updatedAt || new Date().toISOString(),
        type: 'general',
        content: client.appData.internalNotes
      }];
    }
  } catch (e) {
    console.error("Error migrating legacy notes", e);
  }

  return legacyNotes;
}

export function saveNotesForClient(clientId: string, notes: FileNote[]): void {
  localStorage.setItem(`gbk_file_notes_${clientId}`, JSON.stringify(notes));
  
  // Keep the appData synced too to keep original structure compatible!
  try {
    const savedClients = localStorage.getItem("gbk_clients");
    if (savedClients) {
      const clients: Client[] = JSON.parse(savedClients);
      const updated = clients.map(c => {
        if (c.id === clientId) {
          const legacyFormat = notes.map(n => ({
            text: n.content,
            author: n.author,
            time: n.timestamp
          }));
          return {
            ...c,
            appData: {
              ...(c.appData || {}),
              notesListJson: JSON.stringify(legacyFormat),
              internalNotes: notes.map(n => `[${n.type.toUpperCase()}] ${n.content}`).join("\n\n")
            },
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      });
      localStorage.setItem("gbk_clients", JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Error syncing legacy client record", e);
  }
}

// 2. TIMELINE ACTIVITY EVENT HELPERS
export function getActivitiesForClient(clientId: string): ActivityEvent[] {
  try {
    const saved = localStorage.getItem("gbk_doc_activities");
    if (saved) {
      const all: any[] = JSON.parse(saved);
      // Map legacy activities to ActivityEvent shape if needed, filter by client
      return all
        .filter(act => act.clientId === clientId)
        .map(act => {
          // Compatibility map
          const eventTypeMap: Record<string, ActivityEvent["eventType"]> = {
            "status_changed": "document_reviewed",
            "document_uploaded": "document_uploaded",
            "checklist_updated": "checklist_updated"
          };
          
          return {
            id: act.id || `act_${Date.now()}_${Math.random()}`,
            clientId: act.clientId,
            clientName: act.clientName || "",
            eventType: eventTypeMap[act.action] || "checklist_updated",
            user: act.user || "System",
            timestamp: act.timestamp || new Date().toISOString(),
            description: act.details || "",
            details: act.docName ? `Document: ${act.docName}` : undefined
          };
        });
    }
  } catch (e) {
    console.error("Error getting activities", e);
  }
  return [];
}

export function logActivityEvent(event: Omit<ActivityEvent, "id">): void {
  try {
    const saved = localStorage.getItem("gbk_doc_activities");
    const list = saved ? JSON.parse(saved) : [];
    
    // Map our neat ActivityEvent properties to the legacy array format to avoid breaking existing code
    const legacyEvent = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      clientId: event.clientId,
      clientName: event.clientName,
      docId: event.linkedContext?.docId || event.linkedContext?.itemId || "",
      docName: event.linkedContext?.docId ? "Document" : "Workflow",
      action: event.eventType === "document_reviewed" ? "status_changed" : event.eventType,
      user: event.user,
      timestamp: event.timestamp,
      details: event.description,
      extraDetails: event.details
    };

    localStorage.setItem("gbk_doc_activities", JSON.stringify([legacyEvent, ...list]));
    
    // Dispatch event to notify listeners
    window.dispatchEvent(new CustomEvent("activity-logged", { detail: { clientId: event.clientId } }));
  } catch (e) {
    console.error("Error logging activity event", e);
  }
}

// 3. FOLLOW-UPS HELPERS
export function getFollowUpsForClient(clientId: string): FileFollowUp[] {
  const saved = localStorage.getItem(`gbk_file_followups_${clientId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing followups", e);
    }
  }
  return [];
}

export function saveFollowUpsForClient(clientId: string, list: FileFollowUp[]): void {
  localStorage.setItem(`gbk_file_followups_${clientId}`, JSON.stringify(list));
  
  // Dispatch event for components to pick up
  window.dispatchEvent(new CustomEvent("followups-updated", { detail: { clientId } }));
}

export function getAllFollowUps(): FileFollowUp[] {
  const followUps: FileFollowUp[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("gbk_file_followups_")) {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = safeJsonParse<FileFollowUp[]>(val, []);
          if (Array.isArray(parsed)) {
            followUps.push(...parsed);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading all followups", e);
  }
  return followUps;
}
