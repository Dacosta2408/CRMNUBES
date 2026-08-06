import React, { useState, useEffect, useMemo } from "react";
import { 
  Layers, Globe, Key, Webhook, Activity, CheckCircle2, AlertTriangle, X, 
  RefreshCw, Plus, Trash2, Copy, Check, Eye, EyeOff, Play, Send, Search, 
  Filter, Settings, Power, Lock, Shield, Sliders, BarChart3, Clock, 
  Zap, CreditCard, FileText, MessageSquare, Building, Database, Sparkles, 
  Download, ArrowUpRight, HelpCircle, AlertCircle
} from "lucide-react";
import { User } from "../../types";

interface IntegrationsViewProps {
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  logActivity?: (action: string, details: string) => void;
}

// Data Interfaces
export interface IntegrationApp {
  id: string;
  name: string;
  category: "CRM & Pipeline" | "Document Signing" | "Payments & Billing" | "Lender Exchanges" | "Credit & Scoring" | "Communication & Messaging" | "Automation & Sync";
  description: string;
  icon: string; // Emoji or visual representation
  status: "connected" | "disconnected" | "error";
  lastSyncTime?: string;
  syncFrequency: string;
  apiVersion: string;
  apiKeyName?: string;
  webhookUrl?: string;
  environment: "production" | "sandbox";
  docsUrl: string;
  settingsFields?: { key: string; label: string; value: string; type: "text" | "password" | "select" }[];
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
  status: "active" | "revoked";
  createdReason?: string;
}

export interface WebhookRecord {
  id: string;
  name: string;
  targetUrl: string;
  secret: string;
  status: "active" | "paused";
  events: string[];
  createdAt: string;
  totalDelivered: number;
  failureCount: number;
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
  source: string;
  type: "sync" | "api_call" | "webhook" | "auth" | "settings";
  status: "success" | "warning" | "error";
  action: string;
  details: string;
  ipAddress?: string;
}

// Initial Mock Seed Data
const INITIAL_INTEGRATIONS: IntegrationApp[] = [
  {
    id: "int_docusign",
    name: "DocuSign eSignature",
    category: "Document Signing",
    description: "Automate digital signatures, disclosures, and borrower consent packages.",
    icon: "✍️",
    status: "connected",
    lastSyncTime: new Date(Date.now() - 25 * 60000).toISOString(),
    syncFrequency: "Real-time (Webhooks)",
    apiVersion: "v2.1 REST API",
    apiKeyName: "DocuSign Production OAuth Client",
    environment: "production",
    docsUrl: "https://developers.docusign.com",
    settingsFields: [
      { key: "accountId", label: "Account ID", value: "98a4f210-449e-4a11", type: "text" },
      { key: "clientId", label: "Integration Key (Client ID)", value: "3a88c7f9-2210-490b", type: "text" },
      { key: "rsaKey", label: "RSA Private Key", value: "••••••••••••••••••••", type: "password" }
    ]
  },
  {
    id: "int_filogix",
    name: "Filogix Expert / Lender Exchange",
    category: "Lender Exchanges",
    description: "Direct mortgage application transmission to Canadian Tier-1 banks & monoline lenders.",
    icon: "🏦",
    status: "connected",
    lastSyncTime: new Date(Date.now() - 2 * 3600000).toISOString(),
    syncFrequency: "On Demand / Automated",
    apiVersion: "v4.0 XML Protocol",
    apiKeyName: "Filogix Gateway Broker ID",
    environment: "production",
    docsUrl: "https://www.finastra.com/filogix",
    settingsFields: [
      { key: "brokerCode", label: "Brokerage Code", value: "GBK-ONT-99412", type: "text" },
      { key: "firmId", label: "Firm ID", value: "8841029", type: "text" },
      { key: "passcode", label: "Transmission Password", value: "••••••••••••", type: "password" }
    ]
  },
  {
    id: "int_equifax",
    name: "Equifax Credit Bureau Gateway",
    category: "Credit & Scoring",
    description: "Pull real-time hard & soft credit checks, Beacon scores, and debt liabilities.",
    icon: "📊",
    status: "connected",
    lastSyncTime: new Date(Date.now() - 45 * 60000).toISOString(),
    syncFrequency: "Real-time Query",
    apiVersion: "CreditConnect REST API v3",
    apiKeyName: "Equifax Production Member Token",
    environment: "production",
    docsUrl: "https://developer.equifax.com",
    settingsFields: [
      { key: "memberNumber", label: "Member Number", value: "990EQX7721", type: "text" },
      { key: "securityCode", label: "Security Code", value: "EQX-PROD-SEC", type: "text" }
    ]
  },
  {
    id: "int_stripe",
    name: "Stripe Payment Gateway",
    category: "Payments & Billing",
    description: "Collect appraisal fee retainers, broker consultation fees, and recurring subscriptions.",
    icon: "💳",
    status: "connected",
    lastSyncTime: new Date(Date.now() - 10 * 60000).toISOString(),
    syncFrequency: "Real-time Webhooks",
    apiVersion: "2023-10-16 API",
    apiKeyName: "Stripe Live Secret Key",
    environment: "production",
    docsUrl: "https://stripe.com/docs",
    settingsFields: [
      { key: "publishableKey", label: "Publishable Key", value: "pk_live_51M0...9a12", type: "text" },
      { key: "secretKey", label: "Secret Key", value: "sk_live_51M0...x92A", type: "password" },
      { key: "webhookSecret", label: "Webhook Signing Secret", value: "whsec_9918a...22bc", type: "password" }
    ]
  },
  {
    id: "int_twilio",
    name: "Twilio SMS & Voice Gateway",
    category: "Communication & Messaging",
    description: "Automated SMS deal updates, MFA verification codes, and client phone calls.",
    icon: "💬",
    status: "connected",
    lastSyncTime: new Date(Date.now() - 5 * 60000).toISOString(),
    syncFrequency: "Real-time",
    apiVersion: "2010-04-01 REST API",
    apiKeyName: "Twilio Production Account SID",
    environment: "production",
    docsUrl: "https://www.twilio.com/docs",
    settingsFields: [
      { key: "accountSid", label: "Account SID", value: "AC99182374a0192841bc", type: "text" },
      { key: "authToken", label: "Auth Token", value: "••••••••••••••••••••", type: "password" },
      { key: "fromPhone", label: "Sender Phone Number", value: "+1 (888) 555-0192", type: "text" }
    ]
  },
  {
    id: "int_zapier",
    name: "Zapier Automation Platform",
    category: "Automation & Sync",
    description: "Connect mortgage pipeline triggers with 5,000+ web applications.",
    icon: "⚡",
    status: "connected",
    lastSyncTime: new Date(Date.now() - 15 * 60000).toISOString(),
    syncFrequency: "Real-time Hooks",
    apiVersion: "Zapier CLI App v1.4",
    apiKeyName: "Zapier Partner Key",
    environment: "production",
    docsUrl: "https://zapier.com/developer",
    settingsFields: [
      { key: "webhookEndpoint", label: "Webhook Catch Endpoint", value: "https://hooks.zapier.com/hooks/catch/99182/a0921", type: "text" }
    ]
  },
  {
    id: "int_salesforce",
    name: "Salesforce Financial Services Cloud",
    category: "CRM & Pipeline",
    description: "Bi-directional client sync, opportunity pipeline mirror, and enterprise analytics.",
    icon: "☁️",
    status: "disconnected",
    syncFrequency: "Every 15 Minutes",
    apiVersion: "v58.0 REST API",
    environment: "sandbox",
    docsUrl: "https://developer.salesforce.com",
    settingsFields: [
      { key: "instanceUrl", label: "Salesforce Instance URL", value: "https://yourinstance.my.salesforce.com", type: "text" },
      { key: "consumerKey", label: "Connected App Consumer Key", value: "", type: "text" },
      { key: "consumerSecret", label: "Consumer Secret", value: "", type: "password" }
    ]
  },
  {
    id: "int_hubspot",
    name: "HubSpot Marketing Hub",
    category: "CRM & Pipeline",
    description: "Automated email drip campaigns, lead scoring, and web form capture sync.",
    icon: "🟧",
    status: "disconnected",
    syncFrequency: "Real-time",
    apiVersion: "v3 OAuth API",
    environment: "sandbox",
    docsUrl: "https://developers.hubspot.com",
    settingsFields: [
      { key: "portalId", label: "HubSpot Portal ID", value: "", type: "text" },
      { key: "privateAppToken", label: "Private App Access Token", value: "", type: "password" }
    ]
  },
  {
    id: "int_slack",
    name: "Slack Team Notifications",
    category: "Communication & Messaging",
    description: "Real-time deal approvals, underwriting alerts, and team notification channels.",
    icon: "📢",
    status: "disconnected",
    syncFrequency: "Real-time Hooks",
    apiVersion: "Slack Web API v2",
    environment: "production",
    docsUrl: "https://api.slack.com",
    settingsFields: [
      { key: "botToken", label: "Bot User OAuth Token", value: "", type: "password" },
      { key: "channelId", label: "Default Channel ID", value: "#deals-underwriting", type: "text" }
    ]
  }
];

const INITIAL_API_KEYS: ApiKeyRecord[] = [
  {
    id: "key_prod_001",
    name: "Production Webhook Integrator",
    prefix: "gbk_live_",
    maskedKey: "gbk_live_94f8••••••••••••3a91",
    scopes: ["read:clients", "write:clients", "read:documents"],
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    status: "active",
    createdReason: "Primary API key for automated server-to-server synchronization."
  },
  {
    id: "key_dev_002",
    name: "Zapier Automated Pipeline Trigger",
    prefix: "gbk_live_",
    maskedKey: "gbk_live_12c9••••••••••••88d0",
    scopes: ["read:clients", "read:webhooks"],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 35 * 60000).toISOString(),
    status: "active",
    createdReason: "Zapier webhook polling trigger."
  },
  {
    id: "key_legacy_003",
    name: "Legacy Reporting Export Token",
    prefix: "gbk_test_",
    maskedKey: "gbk_test_55e1••••••••••••1100",
    scopes: ["read:clients"],
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    status: "revoked",
    createdReason: "Rotated during Q2 security compliance audit."
  }
];

const INITIAL_WEBHOOKS: WebhookRecord[] = [
  {
    id: "wh_001",
    name: "Zapier Client Deal Approved Listener",
    targetUrl: "https://hooks.zapier.com/hooks/catch/99182/a0921",
    secret: "whsec_zap_88a912c0921a88b12",
    status: "active",
    events: ["client.created", "client.updated", "loan.approved"],
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    totalDelivered: 1420,
    failureCount: 2
  },
  {
    id: "wh_002",
    name: "DocuSign Signature Status Webhook",
    targetUrl: "https://api.goldbookmortgage.ca/api/webhooks/docusign",
    secret: "whsec_doc_11928371928301928",
    status: "active",
    events: ["document.uploaded", "document.signed"],
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    totalDelivered: 890,
    failureCount: 0
  },
  {
    id: "wh_003",
    name: "Stripe Retainer Fee Payment Gateway",
    targetUrl: "https://api.goldbookmortgage.ca/api/webhooks/stripe",
    secret: "whsec_str_99281726351423322",
    status: "active",
    events: ["payment.succeeded", "payment.failed"],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    totalDelivered: 312,
    failureCount: 1
  }
];

const INITIAL_WEBHOOK_LOGS: WebhookDeliveryLog[] = [
  {
    id: "whlog_991",
    webhookId: "wh_001",
    webhookName: "Zapier Client Deal Approved Listener",
    event: "loan.approved",
    targetUrl: "https://hooks.zapier.com/hooks/catch/99182/a0921",
    statusCode: 200,
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    durationMs: 142,
    status: "success",
    payload: {
      event: "loan.approved",
      clientId: "client_994",
      borrowerName: "David Miller",
      approvedAmount: 650000,
      lender: "TD Canada Trust",
      timestamp: new Date(Date.now() - 12 * 60000).toISOString()
    },
    responseBody: '{"status":"success","id":"zap_exec_99120"}'
  },
  {
    id: "whlog_992",
    webhookId: "wh_002",
    webhookName: "DocuSign Signature Status Webhook",
    event: "document.signed",
    targetUrl: "https://api.goldbookmortgage.ca/api/webhooks/docusign",
    statusCode: 200,
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    durationMs: 98,
    status: "success",
    payload: {
      event: "document.signed",
      envelopeId: "env_docusign_8812a",
      signerEmail: "borrower@example.com",
      status: "completed"
    },
    responseBody: '{"status":"processed","envelope":"env_docusign_8812a"}'
  },
  {
    id: "whlog_993",
    webhookId: "wh_003",
    webhookName: "Stripe Retainer Fee Payment Gateway",
    event: "payment.succeeded",
    targetUrl: "https://api.goldbookmortgage.ca/api/webhooks/stripe",
    statusCode: 200,
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    durationMs: 210,
    status: "success",
    payload: {
      event: "payment.succeeded",
      chargeId: "ch_3M021...",
      amount: 45000,
      currency: "CAD",
      customer: "cus_99182a"
    },
    responseBody: '{"received":true}'
  }
];

const INITIAL_INTEGRATION_LOGS: IntegrationLog[] = [
  {
    id: "intlog_01",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    source: "Twilio SMS Gateway",
    type: "api_call",
    status: "success",
    action: "Send SMS Notification",
    details: "Dispatched deal stage update SMS to borrower (+1 416-555-0198). Response time: 180ms.",
    ipAddress: "192.168.1.10"
  },
  {
    id: "intlog_02",
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    source: "Stripe Payment Gateway",
    type: "webhook",
    status: "success",
    action: "Payment Event Processed",
    details: "Successfully validated Stripe webhook signature (whsec_991...). Ledger updated with $450.00 CAD retainer fee.",
    ipAddress: "54.187.205.1"
  },
  {
    id: "intlog_03",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    source: "DocuSign eSignature",
    type: "sync",
    status: "success",
    action: "Envelope Status Poll",
    details: "Polled 4 active signature envelopes. 1 marked Completed, downloaded signed PDF package.",
    ipAddress: "10.0.4.12"
  },
  {
    id: "intlog_04",
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    source: "Equifax Credit Bureau Gateway",
    type: "api_call",
    status: "success",
    action: "Credit Score Query",
    details: "Pulled soft credit score inquiry for borrower ID: client_881. Beacon Score: 784.",
    ipAddress: "192.168.1.10"
  },
  {
    id: "intlog_05",
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    source: "Filogix Expert / Lender Exchange",
    type: "sync",
    status: "warning",
    action: "Application Transmission Retry",
    details: "First attempt timed out after 5000ms. Retried automatically and completed on second attempt.",
    ipAddress: "10.0.2.1"
  }
];

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  currentUser,
  showToast,
  logActivity
}) => {
  // State initialization
  const [integrations, setIntegrations] = useState<IntegrationApp[]>(() => {
    const saved = localStorage.getItem("gbk_admin_integrations");
    return saved ? JSON.parse(saved) : INITIAL_INTEGRATIONS;
  });

  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(() => {
    const saved = localStorage.getItem("gbk_admin_api_keys");
    return saved ? JSON.parse(saved) : INITIAL_API_KEYS;
  });

  const [webhooks, setWebhooks] = useState<WebhookRecord[]>(() => {
    const saved = localStorage.getItem("gbk_admin_webhooks");
    return saved ? JSON.parse(saved) : INITIAL_WEBHOOKS;
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>(() => {
    const saved = localStorage.getItem("gbk_admin_webhook_logs");
    return saved ? JSON.parse(saved) : INITIAL_WEBHOOK_LOGS;
  });

  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>(() => {
    const saved = localStorage.getItem("gbk_admin_integration_logs");
    return saved ? JSON.parse(saved) : INITIAL_INTEGRATION_LOGS;
  });

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"marketplace" | "active" | "api" | "webhooks" | "logs">("marketplace");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Rate limit state
  const [rateLimits, setRateLimits] = useState({
    maxRequestsPerMin: 120,
    maxBurstRequests: 300,
    ipWhitelist: "192.168.1.0/24, 10.0.0.0/16",
    enableRateLimiting: true
  });

  // Modal States
  const [configuringApp, setConfiguringApp] = useState<IntegrationApp | null>(null);
  const [appSettingsForm, setAppSettingsForm] = useState<Record<string, string>>({});
  const [syncingAppId, setSyncingAppId] = useState<string | null>(null);

  // New API Key Modal
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyReason, setNewKeyReason] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read:clients"]);
  const [generatedSecretKey, setGeneratedSecretKey] = useState<string | null>(null);

  // New Webhook Modal
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(["client.created", "loan.approved"]);
  const [testingWebhook, setTestingWebhook] = useState<WebhookRecord | null>(null);
  const [testWebhookResult, setTestWebhookResult] = useState<any | null>(null);
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<WebhookDeliveryLog | null>(null);

  // Persist local storage on updates
  useEffect(() => {
    localStorage.setItem("gbk_admin_integrations", JSON.stringify(integrations));
  }, [integrations]);

  useEffect(() => {
    localStorage.setItem("gbk_admin_api_keys", JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem("gbk_admin_webhooks", JSON.stringify(webhooks));
  }, [webhooks]);

  useEffect(() => {
    localStorage.setItem("gbk_admin_webhook_logs", JSON.stringify(webhookLogs));
  }, [webhookLogs]);

  useEffect(() => {
    localStorage.setItem("gbk_admin_integration_logs", JSON.stringify(integrationLogs));
  }, [integrationLogs]);

  // Helper to append log
  const pushIntegrationLog = (source: string, type: IntegrationLog["type"], status: IntegrationLog["status"], action: string, details: string) => {
    const newLog: IntegrationLog = {
      id: `intlog_${Date.now()}`,
      timestamp: new Date().toISOString(),
      source,
      type,
      status,
      action,
      details,
      ipAddress: "192.168.1.10"
    };
    setIntegrationLogs(prev => [newLog, ...prev.slice(0, 99)]);
  };

  // --- HANDLERS: INTEGRATIONS MARKETPLACE & ACTIVE ---
  const handleOpenConfigureModal = (app: IntegrationApp) => {
    setConfiguringApp(app);
    const initialForm: Record<string, string> = {};
    if (app.settingsFields) {
      app.settingsFields.forEach(f => {
        initialForm[f.key] = f.value;
      });
    }
    setAppSettingsForm(initialForm);
  };

  const handleSaveIntegrationConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringApp) return;

    setIntegrations(prev => prev.map(item => {
      if (item.id === configuringApp.id) {
        const updatedFields = item.settingsFields?.map(f => ({
          ...f,
          value: appSettingsForm[f.key] !== undefined ? appSettingsForm[f.key] : f.value
        }));
        return {
          ...item,
          status: "connected",
          lastSyncTime: new Date().toISOString(),
          settingsFields: updatedFields
        };
      }
      return item;
    }));

    pushIntegrationLog(configuringApp.name, "settings", "success", "Configuration Saved", `Updated connection parameters for ${configuringApp.name}`);
    if (logActivity) logActivity("Integration Configured", `Updated connection parameters for ${configuringApp.name}`);
    showToast(`${configuringApp.name} connected and credentials verified!`, "success", "🔌");
    setConfiguringApp(null);
  };

  const handleDisconnectIntegration = (app: IntegrationApp) => {
    if (window.confirm(`Are you sure you want to disconnect ${app.name}? Active workflows using this connection may pause.`)) {
      setIntegrations(prev => prev.map(item => item.id === app.id ? { ...item, status: "disconnected" } : item));
      pushIntegrationLog(app.name, "auth", "warning", "Integration Disconnected", `Disconnected ${app.name} from CRM pipeline.`);
      if (logActivity) logActivity("Integration Disconnected", `Disconnected ${app.name}`);
      showToast(`${app.name} has been disconnected.`, "info");
    }
  };

  const handleSyncNow = (app: IntegrationApp) => {
    setSyncingAppId(app.id);
    showToast(`Initiating data sync with ${app.name}...`, "info", "🔄");

    setTimeout(() => {
      setIntegrations(prev => prev.map(item => {
        if (item.id === app.id) {
          return { ...item, lastSyncTime: new Date().toISOString(), status: "connected" };
        }
        return item;
      }));

      setSyncingAppId(null);
      pushIntegrationLog(app.name, "sync", "success", "Manual Sync Completed", `Synchronized records with ${app.name}. 0 errors reported.`);
      showToast(`Data sync with ${app.name} completed successfully!`, "success", "✅");
    }, 1200);
  };

  // --- HANDLERS: API KEYS ---
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showToast("Please provide an API key name.", "warning");
      return;
    }

    const randomBytes = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const rawSecret = `gbk_live_${randomBytes}`;
    const masked = `gbk_live_${randomBytes.substring(0, 4)}••••••••••••${randomBytes.substring(randomBytes.length - 4)}`;

    const newRecord: ApiKeyRecord = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      prefix: "gbk_live_",
      maskedKey: masked,
      scopes: newKeyScopes,
      createdAt: new Date().toISOString(),
      lastUsedAt: "Never",
      status: "active",
      createdReason: newKeyReason.trim() || "Generated by Administrator"
    };

    setApiKeys(prev => [newRecord, ...prev]);
    setGeneratedSecretKey(rawSecret);
    pushIntegrationLog("API Management", "api_call", "success", "API Key Generated", `Generated new key "${newKeyName}" with scopes: [${newKeyScopes.join(", ")}]`);
    if (logActivity) logActivity("Generated API Key", `Created key "${newKeyName}"`);
    showToast("API Key created successfully! Copy your key now.", "success", "🔑");
  };

  const handleRevokeApiKey = (keyId: string, name: string) => {
    if (window.confirm(`Revoke API Key "${name}"? Applications using this token will immediately lose access.`)) {
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: "revoked" } : k));
      pushIntegrationLog("API Management", "auth", "warning", "API Key Revoked", `Revoked access token "${name}".`);
      if (logActivity) logActivity("Revoked API Key", `Revoked key "${name}"`);
      showToast(`API Key "${name}" has been revoked.`, "info");
    }
  };

  const handleSaveRateLimits = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("API rate limit configuration saved!", "success", "⚙️");
    pushIntegrationLog("API Gateway", "settings", "success", "Rate Limits Updated", `Set max requests per minute to ${rateLimits.maxRequestsPerMin}`);
  };

  // --- HANDLERS: WEBHOOKS ---
  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      showToast("Please fill in both Webhook Name and Target URL.", "warning");
      return;
    }

    const randomSecret = `whsec_${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    const newHook: WebhookRecord = {
      id: `wh_${Date.now()}`,
      name: newWebhookName.trim(),
      targetUrl: newWebhookUrl.trim(),
      secret: randomSecret,
      status: "active",
      events: newWebhookEvents,
      createdAt: new Date().toISOString(),
      totalDelivered: 0,
      failureCount: 0
    };

    setWebhooks(prev => [newHook, ...prev]);
    setShowCreateWebhookModal(false);
    setNewWebhookName("");
    setNewWebhookUrl("");
    pushIntegrationLog("Webhook Manager", "webhook", "success", "Webhook Registered", `Registered new endpoint "${newHook.name}" (${newHook.targetUrl})`);
    showToast(`Webhook "${newHook.name}" created!`, "success", "⚓");
  };

  const handleTestWebhook = (hook: WebhookRecord) => {
    setTestingWebhook(hook);
    setTestWebhookResult(null);

    setTimeout(() => {
      const mockResult = {
        statusCode: 200,
        statusText: "OK",
        durationMs: 124,
        timestamp: new Date().toISOString(),
        requestHeaders: {
          "Content-Type": "application/json",
          "X-GBK-Signature": "sha256=9f82c091a2..."
        },
        payloadSent: {
          event: hook.events[0] || "client.created",
          testMode: true,
          crmInstance: "GoldBook Mortgage CRM",
          sampleData: {
            clientId: "client_test_991",
            borrower: "Jane Doe",
            loanAmount: 520000,
            status: "Pre-Approved"
          }
        },
        responseBody: '{"status":"received","processed_at":"2026-08-06T14:21:00Z"}'
      };

      setTestWebhookResult(mockResult);

      // Append to logs
      const newLog: WebhookDeliveryLog = {
        id: `whlog_${Date.now()}`,
        webhookId: hook.id,
        webhookName: hook.name,
        event: hook.events[0] || "test.ping",
        targetUrl: hook.targetUrl,
        statusCode: 200,
        timestamp: new Date().toISOString(),
        durationMs: 124,
        status: "success",
        payload: mockResult.payloadSent,
        responseBody: mockResult.responseBody
      };
      setWebhookLogs(prev => [newLog, ...prev]);
      showToast(`Test payload delivered to ${hook.name}! (200 OK)`, "success", "🚀");
    }, 800);
  };

  const handleDeleteWebhook = (id: string, name: string) => {
    if (window.confirm(`Delete webhook "${name}"?`)) {
      setWebhooks(prev => prev.filter(w => w.id !== id));
      pushIntegrationLog("Webhook Manager", "webhook", "warning", "Webhook Deleted", `Deleted webhook "${name}"`);
      showToast(`Webhook "${name}" removed.`, "info");
    }
  };

  // Filtered Integrations for Marketplace
  const filteredMarketplaceApps = useMemo(() => {
    return integrations.filter(app => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
      const matchCat = categoryFilter === "all" || app.category === categoryFilter;
      const matchStatus = statusFilter === "all" || app.status === statusFilter;
      return matchQ && matchCat && matchStatus;
    });
  }, [integrations, searchQuery, categoryFilter, statusFilter]);

  const activeIntegrationsList = useMemo(() => {
    return integrations.filter(a => a.status === "connected");
  }, [integrations]);

  // Categories list
  const categoriesList = [
    "CRM & Pipeline",
    "Document Signing",
    "Payments & Billing",
    "Lender Exchanges",
    "Credit & Scoring",
    "Communication & Messaging",
    "Automation & Sync"
  ];

  return (
    <div className="space-y-6" id="integrations-management-view">
      
      {/* HEADER CARD */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
              System Integrations &amp; API Hub
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Manage external service connections, active OAuth apps, API tokens, webhook listeners, and transmission logs.
            </p>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[var(--color-text)]">{activeIntegrationsList.length} Connected Apps</span>
          </div>
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[var(--color-text)]">{apiKeys.filter(k => k.status === "active").length} Active API Keys</span>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("marketplace")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "marketplace"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Globe className="w-4 h-4" /> Integration Marketplace ({integrations.length})
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "active"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Activity className="w-4 h-4" /> Active Connections ({activeIntegrationsList.length})
        </button>

        <button
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "api"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Key className="w-4 h-4" /> API Management ({apiKeys.length})
        </button>

        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "webhooks"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Webhook className="w-4 h-4" /> Webhook Management ({webhooks.length})
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-[var(--color-accent)] text-white shadow-md"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <Clock className="w-4 h-4" /> Integration Logs ({integrationLogs.length})
        </button>
      </div>

      {/* ─── TAB 1: INTEGRATION MARKETPLACE ─── */}
      {activeTab === "marketplace" && (
        <div className="space-y-6">
          
          {/* Controls & Filter Bar */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search integrations, apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--color-text)] focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categoriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--color-text)] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
              </select>
            </div>

          </div>

          {/* Grid of Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarketplaceApps.map(app => {
              const isConnected = app.status === "connected";
              return (
                <div 
                  key={app.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between hover:border-[var(--color-accent)]/50 transition-all"
                >
                  <div className="space-y-3">
                    
                    {/* Top Row: Icon + Name + Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl p-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
                          {app.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[var(--color-text)]">{app.name}</h3>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block">
                            {app.category}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        isConnected
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-gray-500/15 text-[var(--color-text-muted)] border-gray-500/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`}></span>
                        {isConnected ? "CONNECTED" : "DISCONNECTED"}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      {app.description}
                    </p>

                    {/* Specs / Meta */}
                    <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] space-y-1 text-[11px] font-mono text-[var(--color-text-faint)]">
                      <div className="flex justify-between">
                        <span>Sync Protocol:</span>
                        <span className="text-[var(--color-text)] font-semibold">{app.syncFrequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API Version:</span>
                        <span className="text-[var(--color-text)] font-semibold">{app.apiVersion}</span>
                      </div>
                      {isConnected && app.lastSyncTime && (
                        <div className="flex justify-between">
                          <span>Last Active:</span>
                          <span className="text-emerald-400 font-semibold">{new Date(app.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                    <a
                      href={app.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[var(--color-accent)] font-bold hover:underline flex items-center gap-1"
                    >
                      Docs <ArrowUpRight className="w-3 h-3" />
                    </a>

                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => handleSyncNow(app)}
                            disabled={syncingAppId === app.id}
                            className="p-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer text-xs font-bold flex items-center gap-1"
                            title="Sync Now"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingAppId === app.id ? "animate-spin text-[var(--color-accent)]" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleOpenConfigureModal(app)}
                            className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer text-xs font-bold flex items-center gap-1"
                          >
                            <Settings className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Configure
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenConfigureModal(app)}
                          className="px-4 py-1.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Power className="w-3.5 h-3.5" /> Connect App
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ─── TAB 2: ACTIVE CONNECTIONS ─── */}
      {activeTab === "active" && (
        <div className="space-y-6">
          
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Active Service Integrations
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Live connected endpoints processing data syncs, digital signatures, credit pulls, and webhooks.
                </p>
              </div>

              <button
                onClick={() => {
                  activeIntegrationsList.forEach(a => handleSyncNow(a));
                }}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Sync All Active Services
              </button>
            </div>

            {/* Active Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-2)]">
                    <th className="py-3 px-4">Integration App</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                  {activeIntegrationsList.map(app => (
                    <tr key={app.id} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[var(--color-text)] flex items-center gap-3">
                        <span className="text-xl">{app.icon}</span>
                        <div>
                          <span>{app.name}</span>
                          <span className="text-[10px] text-[var(--color-text-faint)] block font-mono font-normal">
                            {app.apiVersion}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[var(--color-text-muted)]">
                        {app.category}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-purple-500/10 text-purple-300 border-purple-500/20">
                          {app.environment}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[var(--color-text-faint)]">
                        {app.lastSyncTime ? new Date(app.lastSyncTime).toLocaleString() : "Pending"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          HEALTHY
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSyncNow(app)}
                            disabled={syncingAppId === app.id}
                            className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingAppId === app.id ? "animate-spin text-[var(--color-accent)]" : ""}`} /> Sync
                          </button>

                          <button
                            onClick={() => handleOpenConfigureModal(app)}
                            className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer flex items-center gap-1"
                          >
                            <Settings className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Config
                          </button>

                          <button
                            onClick={() => handleDisconnectIntegration(app)}
                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 cursor-pointer flex items-center gap-1"
                          >
                            <Power className="w-3.5 h-3.5" /> Disconnect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {activeIntegrationsList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--color-text-faint)]">
                        No active service connections found. Browse the marketplace to connect services.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ─── TAB 3: API MANAGEMENT ─── */}
      {activeTab === "api" && (
        <div className="space-y-6">
          
          {/* API Keys Table Header Card */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" /> API Access Keys
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Generate secure tokens for custom integrations, Zapier workflows, and external server requests.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCreateKeyModal(true);
                  setGeneratedSecretKey(null);
                }}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Generate New API Key
              </button>
            </div>

            {/* Keys Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-2)]">
                    <th className="py-3 px-4">Key Name</th>
                    <th className="py-3 px-4">Token Key Token</th>
                    <th className="py-3 px-4">Scopes</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Last Used</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                  {apiKeys.map(k => (
                    <tr key={k.id} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">
                        <span>{k.name}</span>
                        {k.createdReason && (
                          <span className="text-[10px] text-[var(--color-text-faint)] block font-normal">
                            {k.createdReason}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[var(--color-text-muted)]">
                        {k.maskedKey}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[var(--color-text-faint)]">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[var(--color-text-faint)]">
                        {k.lastUsedAt.includes("Z") ? new Date(k.lastUsedAt).toLocaleString() : k.lastUsedAt}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          k.status === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border-red-500/30"
                        }`}>
                          {k.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {k.status === "active" && (
                          <button
                            onClick={() => handleRevokeApiKey(k.id, k.name)}
                            className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* API Usage Statistics & Rate Limits Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Stats Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                <BarChart3 className="w-4 h-4 text-blue-400" /> API Usage Statistics (24 Hours)
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] text-center">
                  <span className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase block">Total Requests</span>
                  <span className="text-xl font-extrabold text-[var(--color-text)]">28,410</span>
                </div>
                <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] text-center">
                  <span className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase block">Avg Latency</span>
                  <span className="text-xl font-extrabold text-emerald-400">112 ms</span>
                </div>
                <div className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] text-center">
                  <span className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase block">Success Rate</span>
                  <span className="text-xl font-extrabold text-blue-400">99.92%</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">Top Endpoint Consumption</span>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mb-1">
                      <span>GET /api/v1/clients</span>
                      <span>14,200 req (50%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[50%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mb-1">
                      <span>POST /api/v1/webhooks</span>
                      <span>8,910 req (31%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[31%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mb-1">
                      <span>POST /api/v1/documents</span>
                      <span>5,300 req (19%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-[19%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Limits Config Card */}
            <form onSubmit={handleSaveRateLimits} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
                <Sliders className="w-4 h-4 text-purple-400" /> API Gateway Rate Limits &amp; IP Protection
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block mb-1">
                    Requests per Minute (Per Key)
                  </label>
                  <input
                    type="number"
                    value={rateLimits.maxRequestsPerMin}
                    onChange={(e) => setRateLimits({ ...rateLimits, maxRequestsPerMin: parseInt(e.target.value) || 60 })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block mb-1">
                    Burst Request Limit
                  </label>
                  <input
                    type="number"
                    value={rateLimits.maxBurstRequests}
                    onChange={(e) => setRateLimits({ ...rateLimits, maxBurstRequests: parseInt(e.target.value) || 100 })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block mb-1">
                    Allowed IP Whitelist (CIDR / Ranges)
                  </label>
                  <input
                    type="text"
                    value={rateLimits.ipWhitelist}
                    onChange={(e) => setRateLimits({ ...rateLimits, ipWhitelist: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
                >
                  Save Gateway Rules
                </button>
              </div>
            </form>

          </div>

        </div>
      )}

      {/* ─── TAB 4: WEBHOOK MANAGEMENT ─── */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          
          {/* Registered Webhooks Card */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-cyan-400" /> Outbound Webhook Subscribers
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Dispatch real-time HTTP POST events when client pipeline stages, documents, or deals update.
                </p>
              </div>

              <button
                onClick={() => setShowCreateWebhookModal(true)}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create Webhook Endpoint
              </button>
            </div>

            {/* Webhooks Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-2)]">
                    <th className="py-3 px-4">Webhook Name</th>
                    <th className="py-3 px-4">Target URL</th>
                    <th className="py-3 px-4">Subscribed Events</th>
                    <th className="py-3 px-4">Delivered</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                  {webhooks.map(w => (
                    <tr key={w.id} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">
                        <span>{w.name}</span>
                        <span className="text-[10px] text-[var(--color-text-faint)] font-mono block">
                          Secret: {w.secret.substring(0, 10)}...
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[var(--color-text-muted)] max-w-xs truncate">
                        {w.targetUrl}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {w.events.map(ev => (
                            <span key={ev} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[var(--color-text-faint)]">
                        {w.totalDelivered} ({w.failureCount} errors)
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          {w.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTestWebhook(w)}
                            className="px-3 py-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3 h-3 text-cyan-400" /> Test Ping
                          </button>

                          <button
                            onClick={() => handleDeleteWebhook(w.id, w.name)}
                            className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Webhook Delivery Logs Table */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <Clock className="w-4 h-4 text-cyan-400" /> Webhook Delivery Transmission Logs
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-2)]">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Webhook Name</th>
                    <th className="py-3 px-4">Trigger Event</th>
                    <th className="py-3 px-4">HTTP Status</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs font-mono">
                  {webhookLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[var(--color-surface-2)]/50">
                      <td className="py-3 px-4 text-[var(--color-text-faint)]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>

                      <td className="py-3 px-4 font-sans font-bold text-[var(--color-text)]">
                        {log.webhookName}
                      </td>

                      <td className="py-3 px-4 text-cyan-300">
                        {log.event}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.statusCode === 200 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {log.statusCode} OK
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[var(--color-text-faint)]">
                        {log.durationMs} ms
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayloadLog(log)}
                          className="px-2.5 py-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[10px] font-sans font-bold text-[var(--color-accent)] hover:underline cursor-pointer"
                        >
                          Inspect JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 5: INTEGRATION AUDIT LOGS ─── */}
      {activeTab === "logs" && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Integration Activity &amp; Audit Trail
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Real-time ledger of external API queries, token authentications, webhooks, and sync cycles.
              </p>
            </div>

            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(integrationLogs, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `integration_logs_${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("Exported integration audit log package.", "info");
              }}
              className="px-3 py-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-3)] cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Log JSON
            </button>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-2)]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Source System</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-xs">
                {integrationLogs.map(l => (
                  <tr key={l.id} className="hover:bg-[var(--color-surface-2)]/50">
                    <td className="py-3.5 px-4 font-mono text-[var(--color-text-faint)] whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">
                      {l.source}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        {l.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[var(--color-text)]">
                      {l.action}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--color-text-muted)] max-w-md truncate">
                      {l.details}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        l.status === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                        l.status === "warning" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                        "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CONFIGURE INTEGRATION SETTINGS ─── */}
      {configuringApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveIntegrationConfig} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{configuringApp.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Configure {configuringApp.name}</h3>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{configuringApp.apiVersion}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfiguringApp(null)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {configuringApp.settingsFields?.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={appSettingsForm[field.key] || ""}
                    onChange={(e) => setAppSettingsForm({ ...appSettingsForm, [field.key]: e.target.value })}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                    placeholder={`Enter ${field.label}...`}
                  />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-faint)] font-mono">
                Environment: {configuringApp.environment.toUpperCase()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringApp(null)}
                  className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl hover:bg-[var(--color-surface-3)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
                >
                  Save &amp; Connect App
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* ─── MODAL 2: GENERATE API KEY ─── */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> Generate API Access Token
              </h3>
              <button
                onClick={() => setShowCreateKeyModal(false)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedSecretKey ? (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                    Key Identifier / Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zapier Production Hook Token"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                    Purpose / Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Automated loan pipeline sync"
                    value={newKeyReason}
                    onChange={(e) => setNewKeyReason(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                    Select Scopes
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {["read:clients", "write:clients", "read:documents", "read:webhooks", "admin:all"].map(scope => (
                      <label key={scope} className="flex items-center gap-2 p-2 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(scope)}
                          onChange={(e) => {
                            if (e.target.checked) setNewKeyScopes([...newKeyScopes, scope]);
                            else setNewKeyScopes(newKeyScopes.filter(s => s !== scope));
                          }}
                          className="rounded text-[var(--color-accent)]"
                        />
                        <span className="font-mono text-[11px]">{scope}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateKeyModal(false)}
                    className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl hover:bg-[var(--color-surface-3)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
                  >
                    Generate Key
                  </button>
                </div>

              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-emerald-400 block">Copy your API Secret Key Now!</span>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    This key will never be shown again. Store it securely in your client application.
                  </p>
                  <div className="p-3 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] font-mono text-xs text-[var(--color-text)] break-all flex items-center justify-between gap-2">
                    <span>{generatedSecretKey}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSecretKey);
                        showToast("API Secret copied to clipboard!", "success");
                      }}
                      className="p-1.5 bg-[var(--color-surface-3)] rounded text-[var(--color-accent)] hover:underline shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCreateKeyModal(false);
                    setGeneratedSecretKey(null);
                  }}
                  className="w-full py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── MODAL 3: CREATE WEBHOOK ─── */}
      {showCreateWebhookModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateWebhook} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                <Webhook className="w-4 h-4 text-cyan-400" /> Create Webhook Listener
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateWebhookModal(false)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                Webhook Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Zapier Deal Approved Webhook"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                Target Endpoint URL
              </label>
              <input
                type="url"
                required
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
                Events to Trigger On
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["client.created", "client.updated", "document.uploaded", "document.signed", "loan.approved", "payment.succeeded"].map(ev => (
                  <label key={ev} className="flex items-center gap-2 p-2 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWebhookEvents.includes(ev)}
                      onChange={(e) => {
                        if (e.target.checked) setNewWebhookEvents([...newWebhookEvents, ev]);
                        else setNewWebhookEvents(newWebhookEvents.filter(x => x !== ev));
                      }}
                      className="rounded text-[var(--color-accent)]"
                    />
                    <span className="font-mono text-[11px]">{ev}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateWebhookModal(false)}
                className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl hover:bg-[var(--color-surface-3)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
              >
                Register Webhook
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ─── MODAL 4: TEST WEBHOOK RESULT ─── */}
      {testingWebhook && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" /> Webhook Ping Test
              </h3>
              <button
                onClick={() => setTestingWebhook(null)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {testWebhookResult ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-emerald-400">HTTP {testWebhookResult.statusCode} OK</span>
                  <span className="text-[var(--color-text-faint)]">{testWebhookResult.durationMs} ms</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase font-sans">Payload Sent</span>
                  <pre className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] overflow-x-auto text-[11px] text-[var(--color-text)]">
                    {JSON.stringify(testWebhookResult.payloadSent, null, 2)}
                  </pre>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase font-sans">Target Response Body</span>
                  <pre className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] overflow-x-auto text-[11px] text-emerald-400">
                    {testWebhookResult.responseBody}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[var(--color-accent)] animate-spin mx-auto" />
                <p className="text-xs text-[var(--color-text-muted)] font-bold">Transmitting test payload signature to {testingWebhook.targetUrl}...</p>
              </div>
            )}

            <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
              <button
                onClick={() => setTestingWebhook(null)}
                className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: INSPECT PAYLOAD LOG ─── */}
      {selectedPayloadLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text)] font-mono">
                {selectedPayloadLog.event} ({selectedPayloadLog.statusCode})
              </h3>
              <button
                onClick={() => setSelectedPayloadLog(null)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase font-sans block">Payload Content</span>
              <pre className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] overflow-x-auto text-[11px] text-[var(--color-text)] max-h-60">
                {JSON.stringify(selectedPayloadLog.payload, null, 2)}
              </pre>

              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase font-sans block">Response Body</span>
              <pre className="p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] overflow-x-auto text-[11px] text-emerald-400">
                {selectedPayloadLog.responseBody}
              </pre>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
              <button
                onClick={() => setSelectedPayloadLog(null)}
                className="px-4 py-2 bg-[var(--color-surface-2)] text-[var(--color-text)] font-bold text-xs rounded-xl hover:bg-[var(--color-surface-3)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
