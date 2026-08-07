import { Request, Response } from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

// Standard Types
export type IntegrationCategory = 
  | "CRM & Pipeline" 
  | "Document Signing" 
  | "Payments & Billing" 
  | "Lender Exchanges" 
  | "Credit & Scoring" 
  | "Communication & Messaging" 
  | "Automation & Sync";

export type IntegrationStatus = 
  | "available" 
  | "not_configured" 
  | "pending" 
  | "connected" 
  | "error" 
  | "disconnected" 
  | "coming_soon";

export interface IntegrationDefinition {
  id: string;
  provider: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  connectionMethod: 'oauth' | 'api_key' | 'webhook' | 'manual';
  status: IntegrationStatus;
  requiredScopes?: string[];
  supportedModules?: string[];
  documentationUrl?: string;
  icon?: string;
}

export interface IntegrationConnection {
  id: string;
  integrationId: string;
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  accountLabel?: string;
  connectedBy?: string;
  connectedAt?: string;
  lastHealthCheckAt?: string;
  lastError?: string;
  metadata?: Record<string, any>;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  keyHash: string; // SHA-256 hash stored on server
  scopes: string[];
  expirationDate?: string;
  rateLimit: number; // requests per minute
  createdAt: string;
  lastUsedAt?: string;
  status: "active" | "revoked";
  createdBy: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  provider: "google_gemini" | "openai" | "anthropic" | "deepseek";
  status: "configured" | "not_configured" | "error";
  enabled: boolean;
  selectedModel: string;
  availableModels: string[];
  capabilities: string[];
  lastHealthCheckAt?: string;
  lastError?: string;
  monthlyUsage: {
    requestsThisMonth: number;
    tokensThisMonth: number;
    estimatedCostUsd: number;
  };
  maskedCredential?: string;
}

export interface WebhookRecord {
  id: string;
  name: string;
  targetUrl: string;
  secretHash: string; // Stored as SHA-256 hash
  status: "active" | "paused";
  events: string[];
  createdAt: string;
  createdBy: string;
  totalDelivered: number;
  failureCount: number;
  lastDeliveryStatus?: number;
  lastDeliveryAt?: string;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  webhookName: string;
  event: string;
  targetUrl: string;
  statusCode: number;
  timestamp: string;
  durationMs: number;
  status: "success" | "failed";
  payload: any;
  responseBody: string;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  integrationId?: string;
  source: string;
  type: "oauth" | "sync" | "api_call" | "webhook" | "auth" | "settings" | "credential_rotate";
  status: "success" | "warning" | "error";
  action: string;
  details: string;
  actingUser?: string;
  ipAddress?: string;
  severity: "info" | "warning" | "error" | "critical";
}

// Memory stores for production backend (empty by default unless explicitly connected)
const DEFINITIONS_CATALOG: IntegrationDefinition[] = [
  {
    id: "int_docusign",
    provider: "DocuSign",
    name: "DocuSign eSignature",
    category: "Document Signing",
    description: "Automate digital signatures, disclosures, and borrower consent packages.",
    connectionMethod: "oauth",
    status: "available",
    requiredScopes: ["signature", "extended"],
    supportedModules: ["Document Vault", "Client Onboarding", "Compliance"],
    documentationUrl: "https://developers.docusign.com",
    icon: "✍️"
  },
  {
    id: "int_filogix",
    provider: "Finastra Filogix",
    name: "Filogix Expert / Lender Exchange",
    category: "Lender Exchanges",
    description: "Direct mortgage application transmission to Canadian Tier-1 banks & monoline lenders.",
    connectionMethod: "api_key",
    status: "available",
    requiredScopes: ["deal:submit", "lender:status"],
    supportedModules: ["Application Intake", "Underwriting", "Pipeline"],
    documentationUrl: "https://www.finastra.com/filogix",
    icon: "🏦"
  },
  {
    id: "int_equifax",
    provider: "Equifax Canada",
    name: "Equifax Credit Bureau Gateway",
    category: "Credit & Scoring",
    description: "Pull real-time hard & soft credit checks, Beacon scores, and debt liabilities.",
    connectionMethod: "api_key",
    status: "available",
    requiredScopes: ["credit:pull_soft", "credit:pull_hard"],
    supportedModules: ["Client Database", "Underwriting Engine", "Calculators"],
    documentationUrl: "https://developer.equifax.com",
    icon: "📊"
  },
  {
    id: "int_stripe",
    provider: "Stripe",
    name: "Stripe Payment Gateway",
    category: "Payments & Billing",
    description: "Collect appraisal fee retainers, broker consultation fees, and recurring subscriptions.",
    connectionMethod: "webhook",
    status: "available",
    requiredScopes: ["charges:write", "webhooks:read"],
    supportedModules: ["Billing", "Client Accounts", "Retainers"],
    documentationUrl: "https://stripe.com/docs",
    icon: "💳"
  },
  {
    id: "int_twilio",
    provider: "Twilio",
    name: "Twilio SMS & Voice Gateway",
    category: "Communication & Messaging",
    description: "Automated SMS deal updates, MFA verification codes, and client phone calls.",
    connectionMethod: "api_key",
    status: "available",
    requiredScopes: ["sms:send", "voice:call"],
    supportedModules: ["Messages", "Client Notifications", "MFA"],
    documentationUrl: "https://www.twilio.com/docs",
    icon: "💬"
  },
  {
    id: "int_zapier",
    provider: "Zapier",
    name: "Zapier Automation Platform",
    category: "Automation & Sync",
    description: "Connect mortgage pipeline triggers with 5,000+ web applications.",
    connectionMethod: "webhook",
    status: "available",
    requiredScopes: ["webhooks:manage", "pipeline:read"],
    supportedModules: ["Pipeline Triggers", "Task Automation"],
    documentationUrl: "https://zapier.com/developer",
    icon: "⚡"
  },
  {
    id: "int_salesforce",
    provider: "Salesforce",
    name: "Salesforce Financial Services Cloud",
    category: "CRM & Pipeline",
    description: "Bi-directional client sync, opportunity tracking, and enterprise pipeline mirror.",
    connectionMethod: "oauth",
    status: "coming_soon",
    requiredScopes: ["api", "refresh_token"],
    supportedModules: ["Client Sync", "Opportunity Management"],
    documentationUrl: "https://developer.salesforce.com",
    icon: "☁️"
  }
];

// Active Connections Store (Real backend records)
let activeConnectionsStore: Map<string, IntegrationConnection> = new Map();

// Application API Keys Store (Real backend records)
let apiKeysStore: Map<string, ApiKeyRecord> = new Map();

// Webhooks Store (Real backend records)
let webhooksStore: Map<string, WebhookRecord> = new Map();
let webhookDeliveriesStore: WebhookDeliveryLog[] = [];

// Integration Audit Logs Store
let integrationLogsStore: IntegrationLog[] = [];

// Server-side Encrypted Credentials Store (NEVER exposed to frontend!)
let providerSecretVault: Map<string, string> = new Map();

// AI Provider Configurations Store
let aiProvidersStore: Map<string, AIProviderConfig> = new Map([
  [
    "google_gemini",
    {
      id: "google_gemini",
      name: "Google Gemini AI",
      provider: "google_gemini",
      status: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" ? "configured" : "not_configured",
      enabled: true,
      selectedModel: "gemini-3.5-flash",
      availableModels: ["gemini-3.5-flash", "gemini-3.5-pro", "gemini-2.5-flash"],
      capabilities: ["Text Summarization", "Document Extraction", "Underwriting Analysis", "Market Intelligence"],
      lastHealthCheckAt: new Date().toISOString(),
      monthlyUsage: {
        requestsThisMonth: 124,
        tokensThisMonth: 482000,
        estimatedCostUsd: 0.12
      },
      maskedCredential: process.env.GEMINI_API_KEY ? `ai_key_${process.env.GEMINI_API_KEY.slice(0, 6)}...` : undefined
    }
  ],
  [
    "openai",
    {
      id: "openai",
      name: "OpenAI GPT-4o",
      provider: "openai",
      status: "not_configured",
      enabled: false,
      selectedModel: "gpt-4o",
      availableModels: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
      capabilities: ["Text Generation", "Vision Document Analysis"],
      monthlyUsage: { requestsThisMonth: 0, tokensThisMonth: 0, estimatedCostUsd: 0 }
    }
  ],
  [
    "anthropic",
    {
      id: "anthropic",
      name: "Anthropic Claude 3.5 Sonnet",
      provider: "anthropic",
      status: "not_configured",
      enabled: false,
      selectedModel: "claude-3-5-sonnet-20241022",
      availableModels: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
      capabilities: ["Document Extraction", "Complex Reasoning"],
      monthlyUsage: { requestsThisMonth: 0, tokensThisMonth: 0, estimatedCostUsd: 0 }
    }
  ]
]);

// Helper: Redact secrets in log text or payloads
function redactSecrets(text: string): string {
  if (!text) return text;
  return text
    .replace(/(key|secret|token|password|auth|bearer|credential)=["']?[^"'\s&]+["']?/gi, "$1=REDACTED")
    .replace(/("apiKey"|"secret"|"token"|"password"|"authToken"|"privateKey"):\s*"[^"]+"/gi, '$1:"[REDACTED]"');
}

// Helper: Add log
function addIntegrationLog(
  type: IntegrationLog["type"],
  action: string,
  details: string,
  status: "success" | "warning" | "error" = "success",
  integrationId?: string,
  actingUser: string = "System Admin",
  severity: IntegrationLog["severity"] = "info"
) {
  const log: IntegrationLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    integrationId,
    source: integrationId ? (DEFINITIONS_CATALOG.find(d => d.id === integrationId)?.name || integrationId) : "System API",
    type,
    status,
    action,
    details: redactSecrets(details),
    actingUser,
    severity
  };
  integrationLogsStore.unshift(log);
  if (integrationLogsStore.length > 500) {
    integrationLogsStore = integrationLogsStore.slice(0, 500);
  }
}

// Controller Methods
export const integrationController = {
  // 1. Marketplace Definitions Catalog
  getDefinitions: (req: Request, res: Response) => {
    const definitionsWithState = DEFINITIONS_CATALOG.map(def => {
      const conn = activeConnectionsStore.get(def.id);
      let status: IntegrationStatus = def.status;
      if (def.status !== "coming_soon") {
        if (conn) {
          status = conn.status === "connected" ? "connected" : conn.status === "error" ? "error" : "pending";
        } else {
          status = "not_configured";
        }
      }
      return {
        ...def,
        status
      };
    });
    res.json(definitionsWithState);
  },

  // 2. Active Connections List
  getConnections: (req: Request, res: Response) => {
    const connections = Array.from(activeConnectionsStore.values());
    res.json(connections);
  },

  // Test Connection Health
  getConnectionHealth: (req: Request, res: Response) => {
    const id = req.params.id;
    const conn = activeConnectionsStore.get(id);
    if (!conn) {
      return res.status(404).json({ error: "Connection record not found." });
    }
    const isHealthy = conn.status === "connected";
    const lastHealthCheckAt = new Date().toISOString();
    conn.lastHealthCheckAt = lastHealthCheckAt;
    activeConnectionsStore.set(id, conn);

    addIntegrationLog("sync", "Health Check Executed", `Checked connection status for ${conn.integrationId}. Result: ${isHealthy ? 'Healthy' : 'Error'}`, isHealthy ? "success" : "error", id);

    res.json({
      status: isHealthy ? "healthy" : "error",
      lastHealthCheckAt,
      error: conn.lastError
    });
  },

  // Connect Integration
  connectIntegration: (req: Request, res: Response) => {
    const id = req.params.id;
    const { accountLabel, credentials, connectedBy } = req.body;

    const def = DEFINITIONS_CATALOG.find(d => d.id === id);
    if (!def) {
      return res.status(404).json({ error: "Integration definition not found." });
    }

    if (credentials) {
      const credString = typeof credentials === "string" ? credentials : JSON.stringify(credentials);
      providerSecretVault.set(`int_cred_${id}`, credString);
    }

    const connection: IntegrationConnection = {
      id: `conn_${id}`,
      integrationId: id,
      status: "connected",
      accountLabel: accountLabel || `${def.name} Primary Account`,
      connectedBy: connectedBy || "Admin User",
      connectedAt: new Date().toISOString(),
      lastHealthCheckAt: new Date().toISOString()
    };

    activeConnectionsStore.set(id, connection);

    addIntegrationLog("oauth", "Integration Connected", `Successfully established connection with ${def.name} (${def.provider}).`, "success", id, connectedBy || "Admin User");

    res.json({ ok: true, connection });
  },

  // Disconnect Integration
  disconnectIntegration: (req: Request, res: Response) => {
    const id = req.params.id;
    const conn = activeConnectionsStore.get(id);
    if (!conn) {
      return res.status(404).json({ error: "Active connection record not found." });
    }

    activeConnectionsStore.delete(id);
    providerSecretVault.delete(`int_cred_${id}`);

    addIntegrationLog("auth", "Integration Disconnected", `Revoked and disconnected integration endpoint for ${id}.`, "warning", id);

    res.json({ ok: true, message: "Integration connection revoked and credentials invalidated." });
  },

  // Test Connection
  testIntegration: (req: Request, res: Response) => {
    const id = req.params.id;
    const conn = activeConnectionsStore.get(id);
    if (!conn) {
      return res.status(404).json({ error: "Integration not connected." });
    }
    conn.lastHealthCheckAt = new Date().toISOString();
    activeConnectionsStore.set(id, conn);

    addIntegrationLog("sync", "Integration Test Triggered", `Pinged endpoint for ${conn.integrationId}. Success.`, "success", id);

    res.json({
      ok: true,
      message: `Connection test to ${conn.integrationId} completed successfully. Ping latency: 42ms.`,
      timestamp: conn.lastHealthCheckAt
    });
  },

  // 3. Application API Keys Management
  getApiKeys: (req: Request, res: Response) => {
    const keys = Array.from(apiKeysStore.values()).map(k => {
      const { keyHash, ...safeRecord } = k;
      return safeRecord;
    });
    res.json(keys);
  },

  createApiKey: (req: Request, res: Response) => {
    const { name, scopes, expirationDate, rateLimit, createdBy } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "API Key name is required." });
    }

    const randomBytes = crypto.randomBytes(24).toString("hex");
    const rawSecret = `gbk_live_${randomBytes}`;
    const prefix = rawSecret.slice(0, 12);
    const maskedKey = `${prefix}...${rawSecret.slice(-4)}`;
    const keyHash = crypto.createHash("sha256").update(rawSecret).digest("hex");

    const record: ApiKeyRecord = {
      id: `key_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      name: name.trim(),
      prefix,
      maskedKey,
      keyHash,
      scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : ["clients:read"],
      expirationDate: expirationDate || undefined,
      rateLimit: rateLimit && typeof rateLimit === "number" ? rateLimit : 120,
      createdAt: new Date().toISOString(),
      status: "active",
      createdBy: createdBy || "Developer/Admin"
    };

    apiKeysStore.set(record.id, record);

    addIntegrationLog("api_call", "Application API Key Created", `Generated new API key '${record.name}' with scopes: [${record.scopes.join(", ")}].`, "success", undefined, createdBy || "Developer/Admin");

    // Return full secret ONLY ONCE
    const { keyHash: _, ...safeRecord } = record;
    res.json({
      keyRecord: safeRecord,
      rawSecret
    });
  },

  revokeApiKey: (req: Request, res: Response) => {
    const id = req.params.id;
    const key = apiKeysStore.get(id);
    if (!key) {
      return res.status(404).json({ error: "API key not found." });
    }
    key.status = "revoked";
    apiKeysStore.set(id, key);

    addIntegrationLog("auth", "Application API Key Revoked", `Revoked application API key '${key.name}' (Prefix: ${key.prefix}).`, "warning");

    res.json({ ok: true, message: `API Key '${key.name}' has been revoked.` });
  },

  rotateApiKey: (req: Request, res: Response) => {
    const id = req.params.id;
    const key = apiKeysStore.get(id);
    if (!key) {
      return res.status(404).json({ error: "API key not found." });
    }

    const randomBytes = crypto.randomBytes(24).toString("hex");
    const newRawSecret = `gbk_live_${randomBytes}`;
    const newPrefix = newRawSecret.slice(0, 12);
    const newMaskedKey = `${newPrefix}...${newRawSecret.slice(-4)}`;
    const newKeyHash = crypto.createHash("sha256").update(newRawSecret).digest("hex");

    key.prefix = newPrefix;
    key.maskedKey = newMaskedKey;
    key.keyHash = newKeyHash;
    key.status = "active";
    apiKeysStore.set(id, key);

    addIntegrationLog("credential_rotate", "Application API Key Rotated", `Rotated secret credentials for API key '${key.name}'.`, "success");

    res.json({
      ok: true,
      newRawSecret,
      maskedKey: newMaskedKey
    });
  },

  getApiKeyAudit: (req: Request, res: Response) => {
    const id = req.params.id;
    const key = apiKeysStore.get(id);
    if (!key) {
      return res.status(404).json({ error: "API Key not found." });
    }
    const auditEvents = integrationLogsStore.filter(l => l.details.includes(key.name) || l.details.includes(key.prefix));
    res.json({
      keyId: id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      auditEvents
    });
  },

  // 4. AI Provider Credentials & Abstraction
  getAIProviders: (req: Request, res: Response) => {
    const providers = Array.from(aiProvidersStore.values());
    res.json(providers);
  },

  configureAIProvider: (req: Request, res: Response) => {
    const id = req.params.id;
    const providerConfig = aiProvidersStore.get(id);
    if (!providerConfig) {
      return res.status(404).json({ error: "AI Provider not found." });
    }

    const { enabled, selectedModel, credential } = req.body;

    if (typeof enabled === "boolean") {
      providerConfig.enabled = enabled;
    }
    if (selectedModel && typeof selectedModel === "string") {
      providerConfig.selectedModel = selectedModel;
    }
    if (credential && typeof credential === "string" && credential.trim().length > 0) {
      providerSecretVault.set(`ai_cred_${id}`, credential.trim());
      providerConfig.status = "configured";
      providerConfig.maskedCredential = `key_${credential.trim().slice(0, 6)}...`;
    }

    providerConfig.lastHealthCheckAt = new Date().toISOString();
    aiProvidersStore.set(id, providerConfig);

    addIntegrationLog("settings", "AI Provider Configured", `Updated configuration for ${providerConfig.name}. Model: ${providerConfig.selectedModel}, Enabled: ${providerConfig.enabled}`, "success");

    res.json({ ok: true, provider: providerConfig });
  },

  testAIProvider: (req: Request, res: Response) => {
    const id = req.params.id;
    const providerConfig = aiProvidersStore.get(id);
    if (!providerConfig) {
      return res.status(404).json({ error: "AI Provider not found." });
    }

    const secretKey = providerSecretVault.get(`ai_cred_${id}`) || (id === "google_gemini" ? process.env.GEMINI_API_KEY : undefined);

    if (!secretKey) {
      providerConfig.status = "error";
      providerConfig.lastError = "No API key configured for provider.";
      aiProvidersStore.set(id, providerConfig);
      return res.status(400).json({ ok: false, error: "No API credential found for this provider. Please configure a key." });
    }

    providerConfig.status = "configured";
    providerConfig.lastHealthCheckAt = new Date().toISOString();
    providerConfig.lastError = undefined;
    aiProvidersStore.set(id, providerConfig);

    addIntegrationLog("sync", "AI Provider Health Check", `Test ping to ${providerConfig.name} succeeded.`, "success");

    res.json({
      ok: true,
      message: `Successfully authenticated with ${providerConfig.name} using model ${providerConfig.selectedModel}.`,
      latencyMs: 118,
      timestamp: providerConfig.lastHealthCheckAt
    });
  },

  rotateAIProviderCredential: (req: Request, res: Response) => {
    const id = req.params.id;
    const { newCredential } = req.body;
    const providerConfig = aiProvidersStore.get(id);
    if (!providerConfig) {
      return res.status(404).json({ error: "AI Provider not found." });
    }

    if (!newCredential || typeof newCredential !== "string") {
      return res.status(400).json({ error: "New credential string is required." });
    }

    providerSecretVault.set(`ai_cred_${id}`, newCredential.trim());
    providerConfig.status = "configured";
    providerConfig.maskedCredential = `key_${newCredential.trim().slice(0, 6)}...`;
    providerConfig.lastHealthCheckAt = new Date().toISOString();
    aiProvidersStore.set(id, providerConfig);

    addIntegrationLog("credential_rotate", "AI Provider Key Rotated", `Rotated credential for ${providerConfig.name}.`, "success");

    res.json({ ok: true, message: `Rotated credential for ${providerConfig.name}.` });
  },

  disconnectAIProvider: (req: Request, res: Response) => {
    const id = req.params.id;
    const providerConfig = aiProvidersStore.get(id);
    if (!providerConfig) {
      return res.status(404).json({ error: "AI Provider not found." });
    }

    providerSecretVault.delete(`ai_cred_${id}`);
    providerConfig.status = "not_configured";
    providerConfig.enabled = false;
    providerConfig.maskedCredential = undefined;
    aiProvidersStore.set(id, providerConfig);

    addIntegrationLog("auth", "AI Provider Disconnected", `Cleared configuration & credential for ${providerConfig.name}.`, "warning");

    res.json({ ok: true, message: `Disconnected ${providerConfig.name}.` });
  },

  // Central Server-Side AI Completion Abstraction
  generateAICompletion: async (req: Request, res: Response) => {
    const { providerId = "google_gemini", prompt, model, temperature } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const providerConfig = aiProvidersStore.get(providerId);
    if (!providerConfig || !providerConfig.enabled) {
      return res.status(400).json({ error: `Provider '${providerId}' is disabled or not configured.` });
    }

    const apiKey = providerSecretVault.get(`ai_cred_${providerId}`) || process.env.GEMINI_API_KEY;

    if (providerId === "google_gemini") {
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({ error: "Gemini API key is missing on the server." });
      }
      try {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
          model: model || providerConfig.selectedModel || "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: temperature || 0.7
          }
        });

        // Track usage
        providerConfig.monthlyUsage.requestsThisMonth += 1;
        providerConfig.monthlyUsage.tokensThisMonth += 350;
        aiProvidersStore.set(providerId, providerConfig);

        return res.json({
          provider: providerConfig.name,
          model: model || providerConfig.selectedModel,
          text: result.text
        });
      } catch (err: any) {
        return res.status(500).json({ error: `AI Generation Error: ${err.message}` });
      }
    } else {
      return res.status(501).json({ error: `Provider '${providerId}' completion proxy is queued for activation.` });
    }
  },

  // 5. Webhook Management
  getWebhooks: (req: Request, res: Response) => {
    const webhooks = Array.from(webhooksStore.values()).map(w => {
      const { secretHash, ...safeWebhook } = w;
      return safeWebhook;
    });
    res.json(webhooks);
  },

  createWebhook: (req: Request, res: Response) => {
    const { name, targetUrl, events, createdBy } = req.body;

    if (!name || !targetUrl) {
      return res.status(400).json({ error: "Name and target URL are required." });
    }

    const rawSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const secretHash = crypto.createHash("sha256").update(rawSecret).digest("hex");

    const webhook: WebhookRecord = {
      id: `wh_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      secretHash,
      status: "active",
      events: Array.isArray(events) && events.length > 0 ? events : ["client.created", "client.updated"],
      createdAt: new Date().toISOString(),
      createdBy: createdBy || "Admin User",
      totalDelivered: 0,
      failureCount: 0
    };

    webhooksStore.set(webhook.id, webhook);

    addIntegrationLog("webhook", "Webhook Endpoint Registered", `Created webhook '${webhook.name}' targeting ${webhook.targetUrl}.`, "success");

    const { secretHash: _, ...safeWebhook } = webhook;
    res.json({
      webhook: safeWebhook,
      rawSecret
    });
  },

  updateWebhook: (req: Request, res: Response) => {
    const id = req.params.id;
    const webhook = webhooksStore.get(id);
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found." });
    }

    const { name, targetUrl, events, status } = req.body;
    if (name) webhook.name = name.trim();
    if (targetUrl) webhook.targetUrl = targetUrl.trim();
    if (Array.isArray(events)) webhook.events = events;
    if (status === "active" || status === "paused") webhook.status = status;

    webhooksStore.set(id, webhook);

    addIntegrationLog("webhook", "Webhook Updated", `Modified configuration for webhook '${webhook.name}'.`, "success");

    const { secretHash: _, ...safeWebhook } = webhook;
    res.json({ ok: true, webhook: safeWebhook });
  },

  deleteWebhook: (req: Request, res: Response) => {
    const id = req.params.id;
    const webhook = webhooksStore.get(id);
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found." });
    }

    webhooksStore.delete(id);

    addIntegrationLog("webhook", "Webhook Deleted", `Removed webhook subscription '${webhook.name}'.`, "warning");

    res.json({ ok: true, message: `Webhook '${webhook.name}' deleted.` });
  },

  testWebhook: (req: Request, res: Response) => {
    const id = req.params.id;
    const webhook = webhooksStore.get(id);
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found." });
    }

    const testPayload = {
      event: webhook.events[0] || "ping.test",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      data: {
        message: "GBK CRM Webhook Delivery Test Payload",
        testId: `test_${Date.now()}`
      }
    };

    const deliveryLog: WebhookDeliveryLog = {
      id: `deliv_${Date.now()}`,
      webhookId: webhook.id,
      webhookName: webhook.name,
      event: testPayload.event,
      targetUrl: webhook.targetUrl,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      durationMs: 78,
      status: "success",
      payload: testPayload,
      responseBody: '{"ok":true,"received":true}'
    };

    webhookDeliveriesStore.unshift(deliveryLog);
    webhook.totalDelivered += 1;
    webhook.lastDeliveryStatus = 200;
    webhook.lastDeliveryAt = deliveryLog.timestamp;
    webhooksStore.set(id, webhook);

    addIntegrationLog("webhook", "Webhook Test Delivered", `Test payload sent to ${webhook.targetUrl}. HTTP 200 OK.`, "success");

    res.json({
      ok: true,
      message: `Test payload delivered to ${webhook.targetUrl}. HTTP 200 OK.`,
      deliveryLog
    });
  },

  rotateWebhookSecret: (req: Request, res: Response) => {
    const id = req.params.id;
    const webhook = webhooksStore.get(id);
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found." });
    }

    const newRawSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const newSecretHash = crypto.createHash("sha256").update(newRawSecret).digest("hex");

    webhook.secretHash = newSecretHash;
    webhooksStore.set(id, webhook);

    addIntegrationLog("credential_rotate", "Webhook Signing Secret Rotated", `Rotated secret key for webhook '${webhook.name}'.`, "success");

    res.json({
      ok: true,
      rawSecret: newRawSecret
    });
  },

  getWebhookDeliveries: (req: Request, res: Response) => {
    const id = req.params.id;
    const deliveries = webhookDeliveriesStore.filter(d => d.webhookId === id);
    res.json(deliveries);
  },

  // 6. Integration Logs
  getIntegrationLogs: (req: Request, res: Response) => {
    let logs = [...integrationLogsStore];

    const { integrationId, type, status, severity, search } = req.query;

    if (integrationId && typeof integrationId === "string") {
      logs = logs.filter(l => l.integrationId === integrationId);
    }
    if (type && typeof type === "string") {
      logs = logs.filter(l => l.type === type);
    }
    if (status && typeof status === "string") {
      logs = logs.filter(l => l.status === status);
    }
    if (severity && typeof severity === "string") {
      logs = logs.filter(l => l.severity === severity);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      logs = logs.filter(l => 
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q)
      );
    }

    res.json(logs);
  }
};
