import React, { useState } from "react";
import { Client, User } from "../types";

export interface UseAIDeps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error", icon?: string) => void;
  logActivity: (action: string, target?: string) => void;
  setCurrentClient: React.Dispatch<React.SetStateAction<Client | null>>;
  setNewClientOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentClient: Client | null;
}

// Helper utilities replicated inside the hook
function fd(n: any) {
  if (n === null || n === undefined || isNaN(Number(n))) return "$0";
  return "$" + Math.round(Number(n)).toLocaleString("en-CA");
}

function pn(s: any) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[$,\s]/g, "")) || 0;
}

export function useAI({
  clients,
  setClients,
  currentUser,
  showToast,
  logActivity,
  setCurrentClient,
  setNewClientOpen,
  currentClient
}: UseAIDeps) {
  // ─── AI CHAT & UNDERWRITE STATES ───
  const [aiClientId, setAiClientId] = useState<string>("");
  const [aiSelectedClient, setAiSelectedClient] = useState<Client | null>(null);
  const [aiHistory, setAiHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [aiInputText, setAiInputText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [underwritingLoading, setUnderwritingLoading] = useState<boolean>(false);
  const [underwritingError, setUnderwritingError] = useState<string | null>(null);

  // ─── APPLICATION INTAKE MODAL & QUICK EXTRACT STATES ───
  const [aiIntakeOpen, setAiIntakeOpen] = useState<boolean>(false);
  const [applicationIntakeOpen, setApplicationIntakeOpen] = useState<boolean>(false);
  const [aiIntakeEditingId, setAiIntakeOpenEditId] = useState<string | null>(null);
  const [aiIntakeText, setAiIntakeText] = useState<string>("");
  const [aiIntakeLoading, setAiIntakeLoading] = useState<boolean>(false);
  const [aiIntakeFields, setAiIntakeFields] = useState<Record<string, string>>({});
  const [highlightedAiFields, setHighlightedAiFields] = useState<string[]>([]);
  const [intakePreloadedText, setIntakePreloadedText] = useState<string>("");
  const [intakePreloadedFileName, setIntakePreloadedFileName] = useState<string>("");

  // ─── AI ASSISTANT FUNCTIONS ───
  async function runGeneralAIChat() {
    if (!aiInputText.trim()) return;
    setAiLoading(true);
    const userMsg = aiInputText;
    setAiInputText("");

    const newHistory = [...aiHistory, { role: "user" as const, content: userMsg }];
    setAiHistory(newHistory);

    try {
      const clientCtx = aiSelectedClient ? `
Client: ${aiSelectedClient.first} ${aiSelectedClient.last} ${aiSelectedClient.co ? `& Co-App: ${aiSelectedClient.co}` : ""}
Property: ${aiSelectedClient.addr || "Not specified"} | Value: ${fd(aiSelectedClient.propval)}
Income: ${fd(pn(aiSelectedClient.income) + pn(aiSelectedClient.coIncome))}/yr | credit score: ${aiSelectedClient.beacon || "N/A"}
Mortgage Requested: ${fd(aiSelectedClient.mtgamt)} | Status: ${aiSelectedClient.status}
` : "";

      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: aiHistory,
          clientContext: clientCtx
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to contact Gemini");

      setAiHistory([...newHistory, { role: "assistant", content: data.reply }]);
      logActivity("Invoked AI general assistant", aiSelectedClient ? aiSelectedClient.first : "General");
    } catch (err: any) {
      setAiHistory([...newHistory, { role: "assistant", content: `⚠️ Error: ${err.message}` }]);
      showToast(err.message, "error", "⚠️");
    } finally {
      setAiLoading(false);
    }
  }

  async function triggerUnderwritingAnalysis(client: Client) {
    setUnderwritingLoading(true);
    setUnderwritingError(null);
    showToast("Generating AI underwriting assessment...", "success", "✦");
    try {
      const resp = await fetch("/api/ai/underwrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientData: client })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to make underwriting report");

      const updated = clients.map(c => c.id === client.id ? { ...c, aiSummary: data.reply, updatedAt: new Date().toISOString() } : c);
      setClients(updated);
      if (currentClient && currentClient.id === client.id) {
        setCurrentClient({ ...currentClient, aiSummary: data.reply, updatedAt: new Date().toISOString() });
      }
      logActivity("Generated AI Underwriting Analysis", client.first + " " + client.last);
      showToast("Underwriting summary completed!", "success", "✓");
    } catch (err: any) {
      setUnderwritingError(err.message || "Failed to contact Gemini");
      showToast(err.message, "error", "⚠️");
    } finally {
      setUnderwritingLoading(false);
    }
  }

  async function triggerAIIntakeExtract() {
    if (!aiIntakeText.trim()) {
      showToast("Please enter broker notes or application text first.", "error", "⚠️");
      return;
    }
    setAiIntakeLoading(true);
    try {
      const resp = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiIntakeText })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "AI Intake extract failed");

      const newFields: Record<string, string> = {};
      const fieldsToHighlight: string[] = [];
      Object.entries(data).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          newFields[key] = String(val);
          fieldsToHighlight.push(key);
        }
      });

      setAiIntakeFields(newFields);
      setHighlightedAiFields(fieldsToHighlight);
      showToast("Information successfully extracted by AI!", "success", "✦");
      logActivity("Extracted application data with AI");
    } catch (err: any) {
      showToast(err.message, "error", "⚠️");
    } finally {
      setAiIntakeLoading(false);
    }
  }

  function handleSaveAIIntake(targetStatus: 'lead' | 'open') {
    const first = aiIntakeFields.app_first || "";
    const last = aiIntakeFields.app_last || "";
    const email = aiIntakeFields.app_email || "";
    const agent = aiIntakeFields.in_agent || currentUser.first + " " + currentUser.last;

    if (!first || !last) {
      showToast("First Name and Last Name are required to save client.", "error", "⚠️");
      return;
    }

    const newId = aiIntakeEditingId || "c_" + Date.now();
    const finalClient: Client = {
      id: newId,
      first,
      last,
      email,
      cell: aiIntakeFields.app_cell || "",
      dob: aiIntakeFields.app_dob || "",
      marital: aiIntakeFields.app_marital || "",
      sin: aiIntakeFields.app_sin || "",
      dep: aiIntakeFields.app_dependents || "",
      co: aiIntakeFields.co_first ? `${aiIntakeFields.co_first} ${aiIntakeFields.co_last || ""}` : "",
      coEmail: aiIntakeFields.co_email || "",
      income: aiIntakeFields.app_emp1_income || "",
      coIncome: aiIntakeFields.co_emp1_income || "",
      emptype: aiIntakeFields.app_emp1_status || "",
      beacon: aiIntakeFields.beacon || "",
      propval: aiIntakeFields.prop_value || aiIntakeFields.propval || "",
      mtgamt: aiIntakeFields.mtg_requested || "",
      debts: aiIntakeFields.debts || "",
      tax: aiIntakeFields.prop_tax || "",
      condo: aiIntakeFields.prop_condo_fees || "",
      heat: aiIntakeFields.prop_heat || "150",
      addr: aiIntakeFields.prop_addr || "",
      proptype: aiIntakeFields.prop_type || "",
      tenure: aiIntakeFields.prop_tenure || "",
      lender: aiIntakeFields.mtg1_holder || "",
      source: "AI Intake Platform",
      status: targetStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appData: aiIntakeFields
    };

    if (aiIntakeEditingId) {
      setClients(prev => prev.map(c => c.id === aiIntakeEditingId ? finalClient : c));
      logActivity("Updated client with AI application", first + " " + last);
      showToast("File successfully upgraded and re-saved!", "success");
    } else {
      setClients(prev => [finalClient, ...prev]);
      logActivity("Created new file via AI Application", first + " " + last);
      showToast(`New ${targetStatus === "lead" ? "Lead" : "Active File"} created!`, "success");
    }

    setAiIntakeOpen(false);
    setAiIntakeOpenEditId(null);
    setAiIntakeText("");
    setAiIntakeFields({});
    setHighlightedAiFields([]);
  }

  function openApplicationIntake() {
    setNewClientOpen(false);
    setApplicationIntakeOpen(true);
  }

  function openManualIntake() {
    setApplicationIntakeOpen(false);
    setNewClientOpen(true);
  }

  return {
    aiClientId,
    setAiClientId,
    aiSelectedClient,
    setAiSelectedClient,
    aiHistory,
    setAiHistory,
    aiInputText,
    setAiInputText,
    aiLoading,
    setAiLoading,
    aiIntakeOpen,
    setAiIntakeOpen,
    applicationIntakeOpen,
    setApplicationIntakeOpen,
    aiIntakeEditingId,
    setAiIntakeOpenEditId,
    aiIntakeText,
    setAiIntakeText,
    aiIntakeLoading,
    setAiIntakeLoading,
    aiIntakeFields,
    setAiIntakeFields,
    highlightedAiFields,
    setHighlightedAiFields,
    intakePreloadedText,
    setIntakePreloadedText,
    intakePreloadedFileName,
    setIntakePreloadedFileName,
    runGeneralAIChat,
    triggerUnderwritingAnalysis,
    underwritingLoading,
    underwritingError,
    triggerAIIntakeExtract,
    handleSaveAIIntake,
    openApplicationIntake,
    openManualIntake
  };
}
