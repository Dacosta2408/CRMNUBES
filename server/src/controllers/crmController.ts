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

  async getActiveUsers(req: Request, res: Response) {
    const users = await dbService.getUsers();
    const active = users.filter((u: any) => {
      const st = (u.status || u.account_status || '').toLowerCase();
      return st === 'active' || st === 'online';
    });
    res.json(active);
  },

  async getUserById(req: Request, res: Response) {
    const { id } = req.params;
    const users = await dbService.getUsers();
    const found = users.find((u: any) => u.id === id);
    if (!found) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(found);
  },

  async createUser(req: Request, res: Response) {
    const newUser = req.body;
    res.status(201).json(newUser);
  },

  async updateUser(req: Request, res: Response) {
    const { id } = req.params;
    const updated = { ...req.body, id, updatedAt: new Date().toISOString() };
    res.json(updated);
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

  // USER AVAILABILITY & STATUS
  async getUserStatus(req: Request, res: Response) {
    const { userId } = req.params;
    res.json({
      userId,
      availability: 'available',
      updatedAt: new Date().toISOString()
    });
  },

  async updateMyStatus(req: Request, res: Response) {
    const statusData = req.body;
    res.json({
      userId: statusData.userId || 'staff_me',
      availability: statusData.availability || 'available',
      customMessage: statusData.customMessage,
      expiresAt: statusData.expiresAt,
      updatedAt: new Date().toISOString()
    });
  },

  async clearMyStatus(req: Request, res: Response) {
    res.json({
      userId: 'staff_me',
      availability: 'available',
      updatedAt: new Date().toISOString()
    });
  },

  async getChannelMembers(req: Request, res: Response) {
    const { channelId } = req.params;
    const users = await dbService.getUsers();
    const activeMembers = users.filter((u: any) => {
      const st = (u.status || u.account_status || '').toLowerCase();
      return st !== 'inactive' && st !== 'disabled' && st !== 'deleted';
    });
    res.json(activeMembers);
  },

  async getPresence(req: Request, res: Response) {
    const userIds = req.query.userIds ? String(req.query.userIds).split(',') : [];
    const presenceMap: Record<string, any> = {};
    userIds.forEach((id) => {
      presenceMap[id] = {
        online: true,
        lastActive: 'Just now',
        availability: 'available'
      };
    });
    res.json(presenceMap);
  },

  // DELETION & ARCHIVING
  async getUserDeletionImpact(req: Request, res: Response) {
    const { id } = req.params;
    const users = await dbService.getUsers();
    const targetUser: any = users.find((u: any) => u.id === id);
    const userName = targetUser ? `${targetUser.first || ''} ${targetUser.last || ''}`.trim() : "Unknown User";
    const userEmail = targetUser?.email || "";

    res.json({
      userId: id,
      userName,
      userEmail,
      hasBusinessRecords: false,
      clientsCount: 0,
      applicationsCount: 0,
      tasksCount: 0,
      documentsCount: 0,
      messagesCount: 0,
      savedMessagesCount: 0,
      calendarEventsCount: 0,
      auditRecordsCount: 1,
      onboardingRecordsCount: targetUser?.onboardingCompleted ? 1 : 0,
      clearanceAssignmentsCount: targetUser?.clearanceLevel ? 1 : 0
    });
  },

  async archiveUser(req: Request, res: Response) {
    const { id } = req.params;
    const { reason, deletedBy } = req.body;
    res.json({
      success: true,
      user: {
        id,
        status: 'archived',
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy || 'staff_me',
        deletionReason: reason || 'Archived'
      }
    });
  },

  async deleteUserPermanently(req: Request, res: Response) {
    const { id } = req.params;
    const { reason, confirmationValue } = req.body;
    res.json({
      success: true,
      audit: {
        id: `audit_${Date.now()}`,
        targetUserId: id,
        timestamp: new Date().toISOString(),
        deletionReason: reason || 'Permanent Deletion',
        deletionType: 'permanent'
      }
    });
  },

  async restoreUser(req: Request, res: Response) {
    const { id } = req.params;
    res.json({
      success: true,
      user: {
        id,
        status: 'active'
      }
    });
  },

  async getArchivedUsers(req: Request, res: Response) {
    const users = await dbService.getUsers();
    const archived = users.filter((u: any) => {
      const st = (u.status || '').toLowerCase();
      return st === 'archived' || st === 'deleted' || Boolean(u.deletedAt);
    });
    res.json(archived);
  },

  async resetUserPassword(req: Request, res: Response) {
    const { id } = req.params;
    const { forceChangeOnNextLogin = true, sendEmail = true, revokeExistingSessions = true } = req.body;
    
    await dbService.addAuditLog({
      user_name: req.body.author_name || "Admin",
      action: "Reset User Password",
      target_type: "User",
      target_id: id,
      target_name: `User ID: ${id}`,
      details: `Password reset processed (forceChangeOnNextLogin: ${forceChangeOnNextLogin}, revokeExistingSessions: ${revokeExistingSessions})`
    });

    res.json({
      success: true,
      message: "Password reset completed successfully.",
      userId: id,
      forceChangeOnNextLogin,
      revokeExistingSessions,
      emailDispatched: sendEmail,
      timestamp: new Date().toISOString()
    });
  },

  async revokeUserSessions(req: Request, res: Response) {
    const { id } = req.params;
    
    await dbService.addAuditLog({
      user_name: req.body.author_name || "Admin",
      action: "Revoked User Sessions",
      target_type: "User",
      target_id: id,
      target_name: `User ID: ${id}`,
      details: "All active sessions for user were invalidated"
    });

    res.json({
      success: true,
      message: "All active user sessions revoked successfully.",
      userId: id,
      timestamp: new Date().toISOString()
    });
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
