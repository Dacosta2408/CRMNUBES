import { Router } from "express";
import { crmController } from "../controllers/crmController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const crmRouter = Router();

// Health Check
crmRouter.get("/health", asyncHandler(crmController.getHealth));

// Users
crmRouter.get("/users", asyncHandler(crmController.getUsers));
crmRouter.get("/users/active", asyncHandler(crmController.getActiveUsers));
crmRouter.get("/users/:id", asyncHandler(crmController.getUserById));
crmRouter.post("/users", asyncHandler(crmController.createUser));
crmRouter.put("/users/:id", asyncHandler(crmController.updateUser));

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
