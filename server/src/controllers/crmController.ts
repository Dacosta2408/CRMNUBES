import { Request, Response } from "express";
import { dbService } from "../services/dbService.js";
import { aiService } from "../services/aiService.js";
import { checkDbConnection } from "../db.js";

export const crmController = {
  // GET /api/health
  async getHealth(req: Request, res: Response) {
    const dbStatus = await checkDbConnection();
    res.json({
      status: "ok",
      server: "GBK CRM PostgreSQL Backend API",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || "development"
    });
  },

  // USERS
  async getUsers(req: Request, res: Response) {
    const users = await dbService.getUsers();
    res.json(users);
  },

  // USER SETTINGS
  async getUserSettings(req: Request, res: Response) {
    const { userId } = req.params;
    const settings = await dbService.getUserSettings(userId);
    res.json(settings);
  },

  async updateUserSettings(req: Request, res: Response) {
    const { userId } = req.params;
    const updated = await dbService.updateUserSettings(userId, req.body);
    res.json(updated);
  },

  // CLIENTS
  async getClients(req: Request, res: Response) {
    const clients = await dbService.getClients();
    res.json(clients);
  },

  async createClient(req: Request, res: Response) {
    const newClient = await dbService.createClient(req.body);
    
    // Add audit log entry
    await dbService.addAuditLog({
      user_name: req.body.author_name || "GBK Broker",
      action: "Created Client File",
      target_type: "Client",
      target_id: newClient.id,
      target_name: `${newClient.first_name} ${newClient.last_name}`,
      details: `Created new mortgage client file with status [${newClient.status}]`
    });

    res.status(201).json(newClient);
  },

  async updateClient(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await dbService.updateClient(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Client record not found" });
    }

    await dbService.addAuditLog({
      user_name: req.body.author_name || "GBK Broker",
      action: "Updated Client File",
      target_type: "Client",
      target_id: id,
      target_name: `${updated.first_name} ${updated.last_name}`,
      details: `Updated client details and stage [${updated.stage}]`
    });

    res.json(updated);
  },

  // TASKS
  async getTasks(req: Request, res: Response) {
    const tasks = await dbService.getTasks();
    res.json(tasks);
  },

  async createTask(req: Request, res: Response) {
    const newTask = await dbService.createTask(req.body);
    res.status(201).json(newTask);
  },

  async updateTask(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await dbService.updateTask(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(updated);
  },

  // AUDIT LOGS
  async getAuditLogs(req: Request, res: Response) {
    const logs = await dbService.getAuditLogs();
    res.json(logs);
  },

  // AI ENDPOINTS
  async summarizeClient(req: Request, res: Response) {
    const { clientData } = req.body;
    if (!clientData) {
      return res.status(400).json({ error: "clientData is required in request body" });
    }
    const summary = await aiService.summarizeClient(clientData);
    res.json({ summary });
  },

  async generateNote(req: Request, res: Response) {
    const { purpose = "follow-up email", clientName = "Valued Client", details = "" } = req.body;
    const draft = await aiService.generateNote(purpose, clientName, details);
    res.json({ draft });
  }
};
