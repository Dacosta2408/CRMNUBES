import { Router } from "express";
import { integrationController } from "../controllers/integrationController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const integrationRouter = Router();

// Marketplace Catalog & Connections
integrationRouter.get("/definitions", asyncHandler(integrationController.getDefinitions));
integrationRouter.get("/connections", asyncHandler(integrationController.getConnections));
integrationRouter.get("/:id/health", asyncHandler(integrationController.getConnectionHealth));
integrationRouter.post("/:id/connect", asyncHandler(integrationController.connectIntegration));
integrationRouter.post("/:id/disconnect", asyncHandler(integrationController.disconnectIntegration));
integrationRouter.post("/:id/test", asyncHandler(integrationController.testIntegration));

// Application API Key Management
integrationRouter.get("/api-keys/all", asyncHandler(integrationController.getApiKeys));
integrationRouter.post("/api-keys/create", asyncHandler(integrationController.createApiKey));
integrationRouter.post("/api-keys/:id/revoke", asyncHandler(integrationController.revokeApiKey));
integrationRouter.post("/api-keys/:id/rotate", asyncHandler(integrationController.rotateApiKey));
integrationRouter.get("/api-keys/:id/audit", asyncHandler(integrationController.getApiKeyAudit));

// AI Providers
integrationRouter.get("/ai-providers/all", asyncHandler(integrationController.getAIProviders));
integrationRouter.post("/ai-providers/:id/configure", asyncHandler(integrationController.configureAIProvider));
integrationRouter.post("/ai-providers/:id/test", asyncHandler(integrationController.testAIProvider));
integrationRouter.post("/ai-providers/:id/rotate", asyncHandler(integrationController.rotateAIProviderCredential));
integrationRouter.post("/ai-providers/:id/disconnect", asyncHandler(integrationController.disconnectAIProvider));

// Central AI Completion Proxy
integrationRouter.post("/ai-completion", asyncHandler(integrationController.generateAICompletion));

// Webhooks
integrationRouter.get("/webhooks/all", asyncHandler(integrationController.getWebhooks));
integrationRouter.post("/webhooks/create", asyncHandler(integrationController.createWebhook));
integrationRouter.put("/webhooks/:id", asyncHandler(integrationController.updateWebhook));
integrationRouter.delete("/webhooks/:id", asyncHandler(integrationController.deleteWebhook));
integrationRouter.post("/webhooks/:id/test", asyncHandler(integrationController.testWebhook));
integrationRouter.post("/webhooks/:id/rotate-secret", asyncHandler(integrationController.rotateWebhookSecret));
integrationRouter.get("/webhooks/:id/deliveries", asyncHandler(integrationController.getWebhookDeliveries));

// Integration Audit Logs
integrationRouter.get("/logs/all", asyncHandler(integrationController.getIntegrationLogs));
