import { Router } from "express";
import { crmController } from "../controllers/crmController.js";
import { authController } from "../controllers/authController.js";
import { integrationController } from "../controllers/integrationController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const crmRouter = Router();

// Health Check
crmRouter.get("/health", asyncHandler(crmController.getHealth));

// ─── AUTHENTICATION ENDPOINTS (Requirement 9) ───
crmRouter.post("/auth/login", asyncHandler(authController.login));
crmRouter.post("/auth/logout", asyncHandler(authController.logout));
crmRouter.get("/auth/me", asyncHandler(authController.getCurrentUser));
crmRouter.post("/auth/forgot-password", asyncHandler(authController.forgotPassword));
crmRouter.get("/auth/reset-password/validate", asyncHandler(async (req, res) => {
  const token = req.query.token as string;
  req.body = { token };
  return authController.validateResetToken(req, res);
}));
crmRouter.post("/auth/reset-password/validate", asyncHandler(authController.validateResetToken));
crmRouter.post("/auth/reset-password", asyncHandler(authController.executeResetPassword));

// ─── USER & CREDENTIAL MANAGEMENT ENDPOINTS (Requirement 9) ───
crmRouter.post("/users/:id/password-reset", asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { temporaryPassword, forceChangeOnNextLogin, sendEmail, revokeExistingSessions, author_name } = req.body;
  req.body = { targetUserId, temporaryPassword, forceChangeOnNextLogin, sendEmail, revokeExistingSessions, authorName: author_name };
  return authController.adminResetPassword(req, res);
}));

crmRouter.post("/users/:id/pin-reset", asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { newPin, author_name } = req.body;
  req.body = { targetUserId, newPin, authorName: author_name };
  return authController.adminResetPin(req, res);
}));

crmRouter.post("/users/:id/revoke-sessions", asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { author_name } = req.body;
  req.body = { targetUserId, authorName: author_name };
  return authController.adminRevokeSessions(req, res);
}));

crmRouter.post("/users/:id/unlock", asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { author_name } = req.body;
  req.body = { targetUserId, authorName: author_name };
  return authController.adminUnlockUser(req, res);
}));

// Users
crmRouter.get("/users", asyncHandler(crmController.getUsers));
crmRouter.get("/users/active", asyncHandler(crmController.getActiveUsers));
crmRouter.get("/users/archived", asyncHandler(crmController.getArchivedUsers));
crmRouter.get("/users/:userId/status", asyncHandler(crmController.getUserStatus));
crmRouter.put("/users/me/status", asyncHandler(crmController.updateMyStatus));
crmRouter.delete("/users/me/status", asyncHandler(crmController.clearMyStatus));
crmRouter.get("/users/:id/deletion-impact", asyncHandler(crmController.getUserDeletionImpact));
crmRouter.post("/users/:id/archive", asyncHandler(crmController.archiveUser));
crmRouter.delete("/users/:id/permanent", asyncHandler(crmController.deleteUserPermanently));
crmRouter.post("/users/:id/restore", asyncHandler(crmController.restoreUser));
crmRouter.get("/users/:id", asyncHandler(crmController.getUserById));
crmRouter.post("/users", asyncHandler(crmController.createUser));
crmRouter.put("/users/:id", asyncHandler(crmController.updateUser));

// Channels & Presence
crmRouter.get("/channels/:channelId/members", asyncHandler(crmController.getChannelMembers));
crmRouter.get("/presence", asyncHandler(crmController.getPresence));

// Settings
crmRouter.get("/settings/:userId", asyncHandler(crmController.getUserSettings));
crmRouter.put("/settings/:userId", asyncHandler(crmController.updateUserSettings));

// Clients
crmRouter.get("/clients", asyncHandler(crmController.getClients));
crmRouter.post("/clients", asyncHandler(crmController.createClient));
crmRouter.put("/clients/:id", asyncHandler(crmController.updateClient));

// Tasks
crmRouter.get("/tasks", asyncHandler(crmController.getTasks));
crmRouter.post("/tasks", asyncHandler(crmController.createTask));
crmRouter.put("/tasks/:id", asyncHandler(crmController.updateTask));

// Audit Logs
crmRouter.get("/audit-logs", asyncHandler(crmController.getAuditLogs));

// AI Backend Routes
crmRouter.post("/ai/summarize-client", asyncHandler(crmController.summarizeClient));
crmRouter.post("/ai/generate-note", asyncHandler(crmController.generateNote));

// ─── INTEGRATIONS & CONNECTIONS ENDPOINTS ───
crmRouter.get("/integrations/definitions", asyncHandler(integrationController.getDefinitions));
crmRouter.get("/integrations/connections", asyncHandler(integrationController.getConnections));
crmRouter.get("/integrations/:id/health", asyncHandler(integrationController.getConnectionHealth));
crmRouter.post("/integrations/:id/connect", asyncHandler(integrationController.connectIntegration));
crmRouter.post("/integrations/:id/disconnect", asyncHandler(integrationController.disconnectIntegration));
crmRouter.post("/integrations/:id/test", asyncHandler(integrationController.testIntegration));

// ─── APPLICATION API KEYS ENDPOINTS ───
crmRouter.get("/api-keys", asyncHandler(integrationController.getApiKeys));
crmRouter.post("/api-keys", asyncHandler(integrationController.createApiKey));
crmRouter.post("/api-keys/:id/revoke", asyncHandler(integrationController.revokeApiKey));
crmRouter.post("/api-keys/:id/rotate", asyncHandler(integrationController.rotateApiKey));
crmRouter.get("/api-keys/:id/audit", asyncHandler(integrationController.getApiKeyAudit));

// ─── AI PROVIDER CREDENTIALS & ABSTRACTION ───
crmRouter.get("/ai/providers", asyncHandler(integrationController.getAIProviders));
crmRouter.post("/ai/providers/:id/configure", asyncHandler(integrationController.configureAIProvider));
crmRouter.post("/ai/providers/:id/test", asyncHandler(integrationController.testAIProvider));
crmRouter.post("/ai/providers/:id/rotate", asyncHandler(integrationController.rotateAIProviderCredential));
crmRouter.post("/ai/providers/:id/disconnect", asyncHandler(integrationController.disconnectAIProvider));
crmRouter.post("/ai/completion", asyncHandler(integrationController.generateAICompletion));

// ─── WEBHOOK MANAGEMENT ENDPOINTS ───
crmRouter.get("/webhooks", asyncHandler(integrationController.getWebhooks));
crmRouter.post("/webhooks", asyncHandler(integrationController.createWebhook));
crmRouter.put("/webhooks/:id", asyncHandler(integrationController.updateWebhook));
crmRouter.delete("/webhooks/:id", asyncHandler(integrationController.deleteWebhook));
crmRouter.post("/webhooks/:id/test", asyncHandler(integrationController.testWebhook));
crmRouter.post("/webhooks/:id/rotate-secret", asyncHandler(integrationController.rotateWebhookSecret));
crmRouter.get("/webhooks/:id/deliveries", asyncHandler(integrationController.getWebhookDeliveries));

// ─── INTEGRATION LOGS ENDPOINTS ───
crmRouter.get("/integrations/logs", asyncHandler(integrationController.getIntegrationLogs));

