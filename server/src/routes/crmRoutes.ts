import { Router } from "express";
import { crmController } from "../controllers/crmController.js";
import { authController } from "../controllers/authController.js";
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
