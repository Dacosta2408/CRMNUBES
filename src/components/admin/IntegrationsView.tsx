/**
 * ARCHITECTURE DECISION REFERENCE:
 * For a comprehensive comparison between PostgreSQL and Supabase,
 * please consult /SUPABASE_EVALUATION.md in the project root directory.
 * Standard GBK Financial CRM architecture preserves the dedicated PostgreSQL database
 * and Node.js Express server backend for offline desktop compliance and data integrity.
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Layers, Globe, Key, Webhook, Activity, CheckCircle2, AlertTriangle, X, 
  RefreshCw, Plus, Trash2, Copy, Check, Eye, EyeOff, Play, Send, Search, 
  Filter, Settings, Power, Lock, Shield, Sliders, BarChart3, Clock, 
  Zap, CreditCard, FileText, MessageSquare, Building, Database, Sparkles, 
  Download, ArrowUpRight, HelpCircle, AlertCircle, Cpu, Radio, ShieldCheck
} from "lucide-react";
import { User } from "../../types";
import {
  fetchIntegrationDefinitions,
  fetchActiveConnections,
  fetchIntegrationHealth,
  connectIntegrationApi,
  disconnectIntegrationApi,
  testIntegrationApi,
  fetchApiKeys,
  createApiKeyApi,
  revokeApiKeyApi,
  rotateApiKeyApi,
  fetchApiKeyAudit,
  fetchAIProviders,
  configureAIProviderApi,
  testAIProviderApi,
  rotateAIProviderApi,
  disconnectAIProviderApi,
  fetchWebhooks,
  createWebhookApi,
  updateWebhookApi,
  deleteWebhookApi,
  testWebhookApi,
  rotateWebhookSecretApi,
  fetchWebhookDeliveries,
  fetchIntegrationLogs
} from "../../lib/api";

interface IntegrationsViewProps {
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  logActivity?: (action: string, details: string) => void;
}

// ─── DOMAIN TYPES ───

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
  scopes: string[];
  expirationDate?: string;
  rateLimit: number;
  createdAt: string;
  lastUsedAt?: string;
  status: "active" | "revoked";
  createdBy?: string;
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
  monthlyUsage?: {
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
  status: "active" | "paused";
  events: string[];
  createdAt: string;
  createdBy?: string;
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
  source: string;
  integrationId?: string;
  type: "oauth" | "sync" | "api_call" | "webhook" | "auth" | "settings" | "credential_rotate";
  status: "success" | "warning" | "error";
  action: string;
  details: string;
  actingUser?: string;
  severity?: "info" | "warning" | "error" | "critical";
}

const AVAILABLE_SCOPES = [
  { key: "clients:read", label: "View Client Profiles & Applications" },
  { key: "clients:write", label: "Create & Update Client Records" },
  { key: "messages:read", label: "Read Internal Messages" },
  { key: "messages:write", label: "Send Messages & Broadcasts" },
  { key: "reports:read", label: "Access Analytics & Reports" },
  { key: "files:read", label: "Download Vault Documents" },
  { key: "files:write", label: "Upload Documents & Declarations" },
  { key: "webhooks:manage", label: "Manage Webhook Subscriptions" }
];

const WEBHOOK_EVENTS = [
  "client.created",
  "client.updated",
  "client.assigned",
  "task.created",
  "document.uploaded",
  "message.created",
  "user.created",
  "user.updated",
  "user.statusChanged"
];

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  currentUser,
  showToast,
  logActivity
}) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<"marketplace" | "active" | "api" | "webhooks" | "logs">("marketplace");
  const [apiSubTab, setApiSubTab] = useState<"keys" | "ai">("keys");

  // Real Backend Data States
  const [definitions, setDefinitions] = useState<IntegrationDefinition[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [aiProviders, setAIProviders] = useState<AIProviderConfig[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [logTypeFilter, setLogTypeFilter] = useState<string>("all");

  // Modals & Action States
  const [selectedCatalogApp, setSelectedCatalogApp] = useState<IntegrationDefinition | null>(null);
  const [connectionFormLabel, setConnectionFormLabel] = useState("");
  const [connectionFormCred, setConnectionFormCred] = useState("");
  const [isSubmittingConnect, setIsSubmittingConnect] = useState(false);

  const [disconnectingConnection, setDisconnectingConnection] = useState<IntegrationConnection | null>(null);

  // Application API Key Creation Modal
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["clients:read"]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(120);
  const [newKeyExpiration, setNewKeyExpiration] = useState("");
  const [createdKeySecret, setCreatedKeySecret] = useState<{ rawSecret: string; name: string } | null>(null);

  // AI Provider Modal
  const [editingAIProvider, setEditingAIProvider] = useState<AIProviderConfig | null>(null);
  const [aiProviderFormModel, setAIProviderFormModel] = useState("");
  const [aiProviderFormKey, setAIProviderFormKey] = useState("");
  const [aiProviderFormEnabled, setAIProviderFormEnabled] = useState(true);

  // Webhook Modals
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(["client.created", "client.updated"]);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<{ rawSecret: string; name: string } | null>(null);
  const [selectedWebhookDeliveries, setSelectedWebhookDeliveries] = useState<{ webhookName: string; deliveries: WebhookDeliveryLog[] } | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Developer / Demo Toggle (Defaults strictly to FALSE in production)
  const [isDevDemoMode, setIsDevDemoMode] = useState(false);

  // Load backend state on mount or refresh
  const loadAllBackendData = async () => {
    setIsLoading(true);
    try {
      const [defs, conns, keys, providers, whs, logs] = await Promise.all([
        fetchIntegrationDefinitions(),
        fetchActiveConnections(),
        fetchApiKeys(),
        fetchAIProviders(),
        fetchWebhooks(),
        fetchIntegrationLogs()
      ]);

      setDefinitions(defs);
      setConnections(conns);
      setApiKeys(keys);
      setAIProviders(providers);
      setWebhooks(whs);
      setIntegrationLogs(logs);
    } catch (err) {
      console.error("Error loading integrations backend data:", err);
      showToast("Error synchronizing backend integration state.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllBackendData();
  }, []);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast(`${label} copied to clipboard!`, "info");
    setTimeout(() => setCopiedText(null), 2500);
  };

  // ─── ACTIONS ───

  // Connect catalog integration
  const handleConnectCatalogApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogApp) return;

    setIsSubmittingConnect(true);
    try {
      const res = await connectIntegrationApi(selectedCatalogApp.id, {
        accountLabel: connectionFormLabel || `${selectedCatalogApp.name} Connection`,
        credentials: connectionFormCred,
        connectedBy: currentUser.name || currentUser.displayName || currentUser.email
      });

      if (res && res.ok) {
        showToast(`Successfully connected ${selectedCatalogApp.name}!`, "success", "CheckCircle2");
        if (logActivity) logActivity("Connected Integration", `Connected ${selectedCatalogApp.name}`);
        setSelectedCatalogApp(null);
        setConnectionFormLabel("");
        setConnectionFormCred("");
        await loadAllBackendData();
      } else {
        showToast("Connection failed. Check credentials and retry.", "error");
      }
    } catch (err) {
      showToast("Error executing connection request.", "error");
    } finally {
      setIsSubmittingConnect(false);
    }
  };

  // Disconnect connection
  const handleConfirmDisconnect = async () => {
    if (!disconnectingConnection) return;
    try {
      const res = await disconnectIntegrationApi(disconnectingConnection.integrationId);
      if (res && res.ok) {
        showToast("Integration connection revoked and disconnected.", "info");
        if (logActivity) logActivity("Disconnected Integration", `Revoked ${disconnectingConnection.integrationId}`);
        setDisconnectingConnection(null);
        await loadAllBackendData();
      } else {
        showToast("Failed to disconnect connection.", "error");
      }
    } catch {
      showToast("Error revoking integration connection.", "error");
    }
  };

  // Test connection
  const handleTestConnection = async (integrationId: string) => {
    showToast("Testing connection ping...", "info");
    try {
      const res = await testIntegrationApi(integrationId);
      if (res && res.ok) {
        showToast(res.message || "Connection health test passed!", "success", "Zap");
        await loadAllBackendData();
      } else {
        showToast("Connection test failed. Endpoint unresponsive.", "error");
      }
    } catch {
      showToast("Connection health test error.", "error");
    }
  };

  // Create Application API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showToast("Please enter an API Key name.", "warning");
      return;
    }

    try {
      const res = await createApiKeyApi({
        name: newKeyName.trim(),
        scopes: newKeyScopes,
        rateLimit: newKeyRateLimit,
        expirationDate: newKeyExpiration || undefined,
        createdBy: currentUser.name || currentUser.displayName || currentUser.email
      });

      if (res && res.rawSecret) {
        setCreatedKeySecret({
          rawSecret: res.rawSecret,
          name: newKeyName.trim()
        });
        setShowCreateKeyModal(false);
        setNewKeyName("");
        setNewKeyScopes(["clients:read"]);
        showToast("Application API Key generated securely!", "success", "Key");
        if (logActivity) logActivity("Created API Key", `Generated API Key '${newKeyName}'`);
        await loadAllBackendData();
      } else {
        showToast("Failed to create API key.", "error");
      }
    } catch {
      showToast("Error generating API key.", "error");
    }
  };

  // Revoke API Key
  const handleRevokeApiKey = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to revoke API Key '${name}'? Any connected client app will immediately lose access.`)) {
      return;
    }
    try {
      const res = await revokeApiKeyApi(id);
      if (res && res.ok) {
        showToast(`API Key '${name}' revoked.`, "warning");
        if (logActivity) logActivity("Revoked API Key", `Revoked key '${name}'`);
        await loadAllBackendData();
      }
    } catch {
      showToast("Error revoking API key.", "error");
    }
  };

  // Rotate API Key
  const handleRotateApiKey = async (id: string, name: string) => {
    if (!window.confirm(`Rotate secret credentials for API Key '${name}'? The previous secret will stop working immediately.`)) {
      return;
    }
    try {
      const res = await rotateApiKeyApi(id);
      if (res && res.newRawSecret) {
        setCreatedKeySecret({
          rawSecret: res.newRawSecret,
          name: `${name} (Rotated)`
        });
        showToast(`API Key '${name}' credentials rotated.`, "success", "RefreshCw");
        if (logActivity) logActivity("Rotated API Key", `Rotated key secret for '${name}'`);
        await loadAllBackendData();
      }
    } catch {
      showToast("Error rotating API key credentials.", "error");
    }
  };

  // Configure AI Provider
  const handleSaveAIProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAIProvider) return;

    try {
      const res = await configureAIProviderApi(editingAIProvider.id, {
        enabled: aiProviderFormEnabled,
        selectedModel: aiProviderFormModel,
        credential: aiProviderFormKey.trim() || undefined
      });

      if (res && res.ok) {
        showToast(`AI Provider '${editingAIProvider.name}' updated.`, "success", "Sparkles");
        if (logActivity) logActivity("Updated AI Provider", `Configured ${editingAIProvider.name}`);
        setEditingAIProvider(null);
        setAIProviderFormKey("");
        await loadAllBackendData();
      } else {
        showToast("Failed to update AI provider.", "error");
      }
    } catch {
      showToast("Error configuring AI provider.", "error");
    }
  };

  // Test AI Provider
  const handleTestAIProvider = async (id: string, name: string) => {
    showToast(`Testing AI Provider authentication for ${name}...`, "info");
    try {
      const res = await testAIProviderApi(id);
      if (res && res.ok) {
        showToast(res.message, "success", "Sparkles");
        await loadAllBackendData();
      } else {
        showToast(res.error || "AI Provider test failed. Check key.", "error");
      }
    } catch {
      showToast("Error testing AI provider.", "error");
    }
  };

  // Disconnect AI Provider
  const handleDisconnectAIProvider = async (id: string, name: string) => {
    if (!window.confirm(`Disconnect and clear credentials for ${name}?`)) return;
    try {
      const res = await disconnectAIProviderApi(id);
      if (res && res.ok) {
        showToast(`Cleared configuration for ${name}.`, "info");
        await loadAllBackendData();
      }
    } catch {
      showToast("Error disconnecting AI provider.", "error");
    }
  };

  // Create Webhook
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      showToast("Please enter a name and target URL.", "warning");
      return;
    }

    try {
      const res = await createWebhookApi({
        name: newWebhookName.trim(),
        targetUrl: newWebhookUrl.trim(),
        events: newWebhookEvents,
        createdBy: currentUser.name || currentUser.displayName || currentUser.email
      });

      if (res && res.rawSecret) {
        setCreatedWebhookSecret({
          rawSecret: res.rawSecret,
          name: newWebhookName.trim()
        });
        setShowCreateWebhookModal(false);
        setNewWebhookName("");
        setNewWebhookUrl("");
        showToast("Webhook endpoint registered successfully!", "success", "Webhook");
        if (logActivity) logActivity("Created Webhook", `Registered webhook '${newWebhookName}'`);
        await loadAllBackendData();
      } else {
        showToast("Failed to register webhook.", "error");
      }
    } catch {
      showToast("Error registering webhook.", "error");
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id: string, name: string) => {
    if (!window.confirm(`Delete webhook '${name}'?`)) return;
    try {
      const res = await deleteWebhookApi(id);
      if (res && res.ok) {
        showToast(`Webhook '${name}' deleted.`, "info");
        await loadAllBackendData();
      }
    } catch {
      showToast("Error deleting webhook.", "error");
    }
  };

  // Test Webhook
  const handleTestWebhook = async (id: string, name: string) => {
    showToast(`Dispatching test payload to webhook '${name}'...`, "info");
    try {
      const res = await testWebhookApi(id);
      if (res && res.ok) {
        showToast(res.message, "success", "Send");
        await loadAllBackendData();
      } else {
        showToast("Webhook test failed.", "error");
      }
    } catch {
      showToast("Error testing webhook delivery.", "error");
    }
  };

  // View Webhook Deliveries
  const handleViewWebhookDeliveries = async (id: string, name: string) => {
    try {
      const deliveries = await fetchWebhookDeliveries(id);
      setSelectedWebhookDeliveries({
        webhookName: name,
        deliveries
      });
    } catch {
      showToast("Error fetching webhook deliveries.", "error");
    }
  };

  // Filtered Catalog
  const filteredDefinitions = useMemo(() => {
    return definitions.filter(def => {
      const matchesSearch = 
        def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === "all" || def.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [definitions, searchQuery, categoryFilter]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return integrationLogs.filter(log => {
      const matchesType = logTypeFilter === "all" || log.type === logTypeFilter;
      const matchesSearch = 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.source.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [integrationLogs, logTypeFilter, searchQuery]);

  return (
    <div className="space-y-6" id="integrations-management-view">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00C6FF]/20 to-[#0072FF]/20 border border-[#00C6FF]/30 flex items-center justify-center text-[#00C6FF]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Integrations & API Infrastructure</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#00C6FF]/10 text-[#00C6FF] border border-[#00C6FF]/20">
                Enterprise Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage third-party marketplace endpoints, application API keys, AI provider credentials, and webhook delivery streams.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={loadAllBackendData}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 flex items-center gap-2 transition-all cursor-pointer"
            title="Refresh backend status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#00C6FF]" : ""}`} />
            <span>Sync Status</span>
          </button>

          {/* Dev Demo Mode Toggle */}
          <button
            onClick={() => {
              setIsDevDemoMode(prev => !prev);
              showToast(`Development Mode ${!isDevDemoMode ? "Enabled" : "Disabled"}`, "info");
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isDevDemoMode 
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300" 
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isDevDemoMode ? "Dev Mode ON" : "Production Mode"}</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("marketplace")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "marketplace"
              ? "bg-[#00C6FF]/15 text-[#00C6FF] border border-[#00C6FF]/30 shadow-lg shadow-[#00C6FF]/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Marketplace</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-white/80">
            {definitions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "active"
              ? "bg-[#00C6FF]/15 text-[#00C6FF] border border-[#00C6FF]/30 shadow-lg shadow-[#00C6FF]/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Active Connections</span>
          <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            connections.length > 0 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-slate-400"
          }`}>
            {connections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "api"
              ? "bg-[#00C6FF]/15 text-[#00C6FF] border border-[#00C6FF]/30 shadow-lg shadow-[#00C6FF]/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API & AI Management</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-white/80">
            {apiKeys.length + aiProviders.filter(p => p.status === "configured").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "webhooks"
              ? "bg-[#00C6FF]/15 text-[#00C6FF] border border-[#00C6FF]/30 shadow-lg shadow-[#00C6FF]/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Webhook Subscriptions</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-white/80">
            {webhooks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-[#00C6FF]/15 text-[#00C6FF] border border-[#00C6FF]/30 shadow-lg shadow-[#00C6FF]/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Integration Logs</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-white/80">
            {integrationLogs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: INTEGRATION MARKETPLACE */}
      {activeTab === "marketplace" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search catalog, provider, category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C6FF]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
              >
                <option value="all">All Categories</option>
                <option value="Document Signing">Document Signing</option>
                <option value="Lender Exchanges">Lender Exchanges</option>
                <option value="Credit & Scoring">Credit & Scoring</option>
                <option value="Payments & Billing">Payments & Billing</option>
                <option value="Communication & Messaging">Communication & Messaging</option>
                <option value="Automation & Sync">Automation & Sync</option>
                <option value="CRM & Pipeline">CRM & Pipeline</option>
              </select>
            </div>
          </div>

          {/* Grid of Catalog Definitions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDefinitions.map(app => {
              const activeConn = connections.find(c => c.integrationId === app.id);
              const isConnected = activeConn?.status === "connected";

              return (
                <div 
                  key={app.id} 
                  className={`bg-white/5 rounded-2xl p-5 border transition-all flex flex-col justify-between group ${
                    isConnected 
                      ? "border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" 
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl border border-white/10">
                          {app.icon || "🔌"}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-[#00C6FF] transition-colors">
                            {app.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {app.provider}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Connection State Badge */}
                      {app.status === "coming_soon" ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          Coming Soon
                        </span>
                      ) : isConnected ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/15">
                          Not Connected
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300/80 line-clamp-2 leading-relaxed">
                      {app.description}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Category:</span>
                        <span className="text-slate-200 font-medium">{app.category}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Connection Method:</span>
                        <span className="text-[#00C6FF] font-medium uppercase text-[10px] tracking-wider">
                          {app.connectionMethod}
                        </span>
                      </div>
                      {app.supportedModules && app.supportedModules.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {app.supportedModules.map((mod, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                              {mod}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
                    {app.documentationUrl && (
                      <a 
                        href={app.documentationUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        Docs <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}

                    {app.status === "coming_soon" ? (
                      <button disabled className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-500 text-xs font-semibold cursor-not-allowed">
                        Unavailable
                      </button>
                    ) : isConnected ? (
                      <button 
                        onClick={() => setDisconnectingConnection(activeConn!)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setSelectedCatalogApp(app);
                          setConnectionFormLabel(`${app.name} Primary Account`);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Install / Configure</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE CONNECTIONS */}
      {activeTab === "active" && (
        <div className="space-y-6">
          {connections.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center backdrop-blur-xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <Globe className="w-8 h-8 text-slate-500" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white">No active connections</h3>
                <p className="text-xs text-slate-400">
                  No live third-party integrations are currently configured on this CRM instance. Select an application from the Marketplace to establish a real endpoint connection.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("marketplace")}
                className="px-4 py-2 rounded-xl bg-[#0072FF] text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 hover:bg-[#0072FF]/80 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                <span>Browse Marketplace</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map(conn => {
                const catalogDef = definitions.find(d => d.id === conn.integrationId);

                return (
                  <div key={conn.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl text-emerald-400">
                        {catalogDef?.icon || "🔌"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{catalogDef?.name || conn.integrationId}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Connected
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Label: <span className="font-semibold text-white">{conn.accountLabel || "Primary Endpoint"}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
                          <span>Connected by: {conn.connectedBy || "Admin"}</span>
                          <span>Connected date: {conn.connectedAt ? new Date(conn.connectedAt).toLocaleDateString() : "N/A"}</span>
                          <span>Last Health Check: {conn.lastHealthCheckAt ? new Date(conn.lastHealthCheckAt).toLocaleTimeString() : "Pending"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleTestConnection(conn.integrationId)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Test Connection</span>
                      </button>

                      <button
                        onClick={() => setDisconnectingConnection(conn)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: API & AI MANAGEMENT */}
      {activeTab === "api" && (
        <div className="space-y-6">
          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
            <button
              onClick={() => setApiSubTab("keys")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                apiSubTab === "keys" ? "bg-[#00C6FF] text-black shadow-md font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Application API Keys
            </button>
            <button
              onClick={() => setApiSubTab("ai")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                apiSubTab === "ai" ? "bg-[#00C6FF] text-black shadow-md font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              AI Provider Credentials
            </button>
          </div>

          {/* Subtab 1: Application API Keys */}
          {apiSubTab === "keys" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-xl">
                <div>
                  <h3 className="text-sm font-bold text-white">GBK CRM Application API Keys</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Keys used by external software or custom webhooks to query and submit data to GBK Financial CRM.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateKeyModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Application API Key</span>
                </button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center backdrop-blur-xl space-y-3">
                  <Key className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No application API keys</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No external system tokens exist on this server. Click "Create Application API Key" to provision a restricted token with explicit scopes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map(key => (
                    <div key={key.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{key.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            key.status === "active" 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}>
                            {key.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                          <span className="text-slate-500">Key Mask:</span>
                          <span className="bg-black/40 px-2.5 py-1 rounded border border-white/10 text-[#00C6FF]">
                            {key.maskedKey}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {key.scopes.map((s, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 font-mono">
                              {s}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                          <span>Rate Limit: {key.rateLimit} req/min</span>
                          <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                          {key.lastUsedAt && <span>Last Used: {new Date(key.lastUsedAt).toLocaleString()}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => handleRotateApiKey(key.id, key.name)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Rotate Secret</span>
                        </button>

                        {key.status === "active" && (
                          <button
                            onClick={() => handleRevokeApiKey(key.id, key.name)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subtab 2: AI Provider Credentials */}
          {apiSubTab === "ai" && (
            <div className="space-y-6">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-xl space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#00C6FF]" />
                  <span>Central AI Provider Credentials & Model Abstraction</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Configure server-side API keys for Gemini, OpenAI, Anthropic, and other foundation models. Keys remain strictly server-side and never reach browser client state.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {aiProviders.map(provider => (
                  <div key={provider.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{provider.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          provider.status === "configured"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          {provider.status === "configured" ? "Configured" : "Not Configured"}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Active Model:</span>
                          <span className="text-white font-mono">{provider.selectedModel}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>State:</span>
                          <span className={provider.enabled ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                            {provider.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        {provider.maskedCredential && (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Credential:</span>
                            <span className="font-mono text-slate-300 text-[11px]">{provider.maskedCredential}</span>
                          </div>
                        )}
                      </div>

                      {provider.capabilities && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-white/10">
                          {provider.capabilities.map((cap, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleTestAIProvider(provider.id, provider.name)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                      >
                        Test Health
                      </button>

                      <button
                        onClick={() => {
                          setEditingAIProvider(provider);
                          setAIProviderFormModel(provider.selectedModel);
                          setAIProviderFormEnabled(provider.enabled);
                          setAIProviderFormKey("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 transition-all cursor-pointer"
                      >
                        Configure Key
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WEBHOOK SUBSCRIPTIONS */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-xl">
            <div>
              <h3 className="text-sm font-bold text-white">Outgoing Webhook Endpoints</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch signed HTTPS POST notifications to external services when client profiles, deals, or tasks change.
              </p>
            </div>
            <button
              onClick={() => setShowCreateWebhookModal(true)}
              className="px-4 py-2 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Webhook</span>
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center backdrop-blur-xl space-y-3">
              <Webhook className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No configured webhooks</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No webhook listeners are registered. Click "Create Webhook" to dispatch real-time event notifications with HMAC signing secrets.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map(wh => (
                <div key={wh.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{wh.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        wh.status === "active" 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                          : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                      }`}>
                        {wh.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-[#00C6FF] bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 w-fit max-w-xl truncate">
                      {wh.targetUrl}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {wh.events.map((ev, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Total Delivered: {wh.totalDelivered}</span>
                      <span>Failures: {wh.failureCount}</span>
                      {wh.lastDeliveryAt && <span>Last Delivery: {new Date(wh.lastDeliveryAt).toLocaleString()}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleTestWebhook(wh.id, wh.name)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-[#00C6FF]" />
                      <span>Test Payload</span>
                    </button>

                    <button
                      onClick={() => handleViewWebhookDeliveries(wh.id, wh.name)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                    >
                      Logs
                    </button>

                    <button
                      onClick={() => handleDeleteWebhook(wh.id, wh.name)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: INTEGRATION LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit actions, sources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C6FF]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={logTypeFilter}
                onChange={e => setLogTypeFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
              >
                <option value="all">All Types</option>
                <option value="oauth">OAuth</option>
                <option value="sync">Sync</option>
                <option value="api_call">API Calls</option>
                <option value="webhook">Webhooks</option>
                <option value="credential_rotate">Credential Rotation</option>
              </select>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center backdrop-blur-xl space-y-3">
              <Activity className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No integration activity yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No integration events or API calls have been executed yet. Logs will populate dynamically upon performing API queries or webhook deliveries.
              </p>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {log.source}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-white/10 text-[#00C6FF] border border-white/10">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-medium">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-md truncate">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.actingUser || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}

      {/* MODAL 1: INSTALL / CONFIGURE MARKETPLACE INTEGRATION */}
      {selectedCatalogApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCatalogApp.icon || "🔌"}</span>
                <div>
                  <h3 className="text-base font-bold text-white">Configure {selectedCatalogApp.name}</h3>
                  <p className="text-xs text-slate-400">Connection Method: {selectedCatalogApp.connectionMethod.toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCatalogApp(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectCatalogApp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Connection Label</label>
                <input
                  type="text"
                  required
                  value={connectionFormLabel}
                  onChange={e => setConnectionFormLabel(e.target.value)}
                  placeholder="e.g. DocuSign Production Account"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
                />
              </div>

              {selectedCatalogApp.connectionMethod === "oauth" && (
                <div className="p-3.5 rounded-xl bg-[#00C6FF]/10 border border-[#00C6FF]/20 text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00C6FF]" /> OAuth 2.0 Flow Required
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Clicking Connect will establish an OAuth session handshake with {selectedCatalogApp.provider} via server proxy.
                  </p>
                </div>
              )}

              {(selectedCatalogApp.connectionMethod === "api_key" || selectedCatalogApp.connectionMethod === "webhook" || selectedCatalogApp.connectionMethod === "manual") && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">API Secret / Endpoint Credential</label>
                  <input
                    type="password"
                    required
                    value={connectionFormCred}
                    onChange={e => setConnectionFormCred(e.target.value)}
                    placeholder="Enter secret token or private key..."
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF] font-mono"
                  />
                  <p className="text-[10px] text-slate-400 pt-0.5">Stored securely on server vault and never exposed in browser logs.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedCatalogApp(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConnect}
                  className="px-4 py-2 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingConnect && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Establish Connection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DISCONNECT */}
      {disconnectingConnection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Revoke Connection?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to disconnect <span className="font-semibold text-white">{disconnectingConnection.accountLabel || disconnectingConnection.integrationId}</span>? Live syncs will stop immediately and server secret tokens will be invalidated.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDisconnectingConnection(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE APPLICATION API KEY */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#00C6FF]" />
                <span>Create Application API Key</span>
              </h3>
              <button onClick={() => setShowCreateKeyModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Key Identifier Name</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="e.g. Zapier Deal Intake Webhook"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Assign Scopes</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {AVAILABLE_SCOPES.map(sc => (
                    <label key={sc.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(sc.key)}
                        onChange={e => {
                          if (e.target.checked) setNewKeyScopes([...newKeyScopes, sc.key]);
                          else setNewKeyScopes(newKeyScopes.filter(k => k !== sc.key));
                        }}
                        className="rounded border-white/20 bg-black text-[#00C6FF] focus:ring-0"
                      />
                      <span className="font-mono text-[11px] text-[#00C6FF]">{sc.key}</span>
                      <span className="text-slate-400 text-[10px]">({sc.label})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Rate Limit (req/min)</label>
                  <input
                    type="number"
                    value={newKeyRateLimit}
                    onChange={e => setNewKeyRateLimit(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={newKeyExpiration}
                    onChange={e => setNewKeyExpiration(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 cursor-pointer"
                >
                  Generate Key Secret
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATED SECRET DISPLAY (SHOWN ONCE) */}
      {createdKeySecret && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Secret Credential Provisioned</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Below is the raw secret for <span className="font-bold text-white">{createdKeySecret.name}</span>. Copy it now. For security, this secret will <span className="text-amber-400 font-semibold">never be displayed again</span>.
            </p>

            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Secret Key</span>
                <button
                  onClick={() => handleCopy(createdKeySecret.rawSecret, "API Secret")}
                  className="text-xs text-[#00C6FF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText === createdKeySecret.rawSecret ? "Copied!" : "Copy Secret"}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-emerald-300 break-all bg-black/40 p-2.5 rounded border border-emerald-500/20">
                {createdKeySecret.rawSecret}
              </p>
            </div>

            <button
              onClick={() => setCreatedKeySecret(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              I Have Saved This Secret
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIGURE AI PROVIDER */}
      {editingAIProvider && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white">Configure {editingAIProvider.name}</h3>
              <button onClick={() => setEditingAIProvider(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAIProvider} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs font-semibold text-white">Enable Provider</span>
                <input
                  type="checkbox"
                  checked={aiProviderFormEnabled}
                  onChange={e => setAIProviderFormEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00C6FF] bg-black border-white/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Selected Model Alias</label>
                <select
                  value={aiProviderFormModel}
                  onChange={e => setAIProviderFormModel(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
                >
                  {editingAIProvider.availableModels.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Update API Secret Key</label>
                <input
                  type="password"
                  value={aiProviderFormKey}
                  onChange={e => setAIProviderFormKey(e.target.value)}
                  placeholder={editingAIProvider.maskedCredential || "Enter new API key string..."}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF] font-mono"
                />
                <p className="text-[10px] text-slate-400">Stored strictly server-side in memory/vault.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingAIProvider(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 cursor-pointer"
                >
                  Save Provider Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: CREATE WEBHOOK */}
      {showCreateWebhookModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Webhook className="w-4 h-4 text-[#00C6FF]" />
                <span>Register Webhook Endpoint</span>
              </h3>
              <button onClick={() => setShowCreateWebhookModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Endpoint Identifier Name</label>
                <input
                  type="text"
                  required
                  value={newWebhookName}
                  onChange={e => setNewWebhookName(e.target.value)}
                  placeholder="e.g. DocuSign Disclosures Collector"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">HTTPS Destination URL</label>
                <input
                  type="url"
                  required
                  value={newWebhookUrl}
                  onChange={e => setNewWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/api/webhook"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C6FF] font-mono text-[11px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Subscribed Events</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {WEBHOOK_EVENTS.map((ev, i) => (
                    <label key={i} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWebhookEvents.includes(ev)}
                        onChange={e => {
                          if (e.target.checked) setNewWebhookEvents([...newWebhookEvents, ev]);
                          else setNewWebhookEvents(newWebhookEvents.filter(k => k !== ev));
                        }}
                        className="rounded border-white/20 bg-black text-[#00C6FF] focus:ring-0"
                      />
                      <span className="font-mono text-[10px]">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateWebhookModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0072FF] hover:bg-[#0072FF]/80 text-white text-xs font-semibold shadow-lg shadow-[#0072FF]/20 cursor-pointer"
                >
                  Register Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: CREATED WEBHOOK SECRET DISPLAY */}
      {createdWebhookSecret && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <Webhook className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Webhook Signing Secret</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Secret generated for <span className="font-bold text-white">{createdWebhookSecret.name}</span>. Use this secret to verify HMAC signatures on incoming POST requests. This secret will <span className="text-amber-400 font-semibold">never be displayed again</span>.
            </p>

            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Signing Secret</span>
                <button
                  onClick={() => handleCopy(createdWebhookSecret.rawSecret, "Webhook Secret")}
                  className="text-xs text-[#00C6FF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText === createdWebhookSecret.rawSecret ? "Copied!" : "Copy Secret"}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-emerald-300 break-all bg-black/40 p-2.5 rounded border border-emerald-500/20">
                {createdWebhookSecret.rawSecret}
              </p>
            </div>

            <button
              onClick={() => setCreatedWebhookSecret(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              I Have Saved This Signing Secret
            </button>
          </div>
        </div>
      )}

      {/* MODAL 8: WEBHOOK DELIVERIES LOG */}
      {selectedWebhookDeliveries && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white">
                Delivery History: {selectedWebhookDeliveries.webhookName}
              </h3>
              <button onClick={() => setSelectedWebhookDeliveries(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedWebhookDeliveries.deliveries.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No delivery attempts recorded for this webhook.</p>
              ) : (
                selectedWebhookDeliveries.deliveries.map(d => (
                  <div key={d.id} className="bg-white/5 border border-white/10 p-3.5 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#00C6FF] font-bold">{d.event}</span>
                      <span className={d.statusCode === 200 ? "text-emerald-400 font-bold" : "text-rose-400"}>
                        HTTP {d.statusCode}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{d.timestamp} ({d.durationMs}ms)</p>
                    <div className="bg-black/50 p-2 rounded border border-white/5 font-mono text-[10px] text-slate-300">
                      Response: {d.responseBody}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedWebhookDeliveries(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold cursor-pointer"
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
