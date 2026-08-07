import { query, getIsPgConnected } from "../db.js";
import { 
  UserEntity, 
  UserSettingsEntity, 
  ClientEntity, 
  ClientNoteEntity, 
  TaskEntity, 
  PartnerEntity, 
  AuditLogEntity 
} from "../types/index.js";

// In-memory fallback cache when PostgreSQL is offline/bootstrapping
let memoryUsers: UserEntity[] = [
  {
    id: "u_david",
    first_name: "David",
    last_name: "Acosta",
    email: "vdacosta247@gmail.com",
    role: "Developer/Admin",
    status: "Active",
    timezone: "America/Toronto",
    phone: "(705) 555-0192",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u_timb",
    first_name: "Tim",
    last_name: "Brown",
    email: "timb@gbkfinancial.ca",
    role: "Admin",
    status: "Active",
    timezone: "America/Toronto",
    phone: "(705) 555-0144",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u_waynem",
    first_name: "Wayne",
    last_name: "MacLeod",
    email: "waynem@gbkfinancial.ca",
    role: "Admin",
    status: "Active",
    timezone: "America/Toronto",
    phone: "(705) 555-0188",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u_jeffb",
    first_name: "Jeff",
    last_name: "Brown",
    email: "jeffb@gbkfinancial.ca",
    role: "Broker",
    status: "Active",
    timezone: "America/Toronto",
    phone: "(705) 555-0122",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u_jameyb",
    first_name: "Jamey",
    last_name: "Brown",
    email: "jameyb@gbkfinancial.ca",
    role: "Broker",
    status: "Active",
    timezone: "America/Toronto",
    phone: "(705) 555-0155",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u_matthewb",
    first_name: "Matt",
    last_name: "Brown",
    email: "mattie@gbkfinancial.ca",
    role: "Broker",
    status: "Active",
    timezone: "America/Toronto",
    phone: "(705) 555-0177",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u_jasonm",
    first_name: "Jason",
    last_name: "Myszkowski",
    email: "jasonm@gbkfinancial.ca",
    role: "Broker",
    status: "Active",
    timezone: "America/Toronto",
    phone: "(705) 555-0166",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let memorySettings: Record<string, UserSettingsEntity> = {
  "usr-1": {
    id: "set-1",
    user_id: "usr-1",
    theme: "dark",
    timezone: "America/Toronto",
    date_format: "YYYY-MM-DD",
    time_format: "12h",
    default_landing_page: "dashboard",
    notifications_enabled: true,
    auto_lock_minutes: 10,
    audit_logging_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

let memoryClients: ClientEntity[] = [
  {
    id: "c-1",
    first_name: "Marcus",
    last_name: "Vance",
    email: "marcus.vance@example.com",
    phone: "705-721-8899",
    status: "A-Lender Approved",
    stage: "Commitment Issued",
    assigned_to: "usr-1",
    lender: "First National",
    source: "Direct Referral",
    loan_amount: 540000,
    property_value: 720000,
    interest_rate: 4.89,
    beacon_score: 742,
    maturity_date: "2029-08-15",
    notes: "High-net-worth applicant. Self-employed BFS file verified with NOAs.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "c-2",
    first_name: "Clara",
    last_name: "Tremblay",
    email: "clara.tremblay@example.com",
    phone: "416-992-3401",
    status: "Underwriting",
    stage: "Lender Review",
    assigned_to: "usr-2",
    lender: "Equitable Bank",
    source: "Online Portal",
    loan_amount: 410000,
    property_value: 520000,
    interest_rate: 5.24,
    beacon_score: 680,
    maturity_date: "2029-09-01",
    notes: "Purchase plus improvements file in Barrie.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let memoryTasks: TaskEntity[] = [
  {
    id: "tsk-1",
    title: "Request 90-day Bank Statement for Marcus Vance",
    description: "Verify down payment funds source per CMHC guidelines",
    assigned_to: "usr-1",
    related_client_id: "c-1",
    due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: "pending",
    priority: "high",
    category: "Document Request",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let memoryAuditLogs: AuditLogEntity[] = [
  {
    id: "aud-1",
    user_id: "usr-1",
    user_name: "David Acosta",
    action: "User Login",
    target_type: "System",
    target_name: "CRM Packager Portal",
    details: "Logged in successfully from local workstation",
    created_at: new Date().toISOString()
  }
];

export const dbService = {
  // USERS
  async getUsers(): Promise<UserEntity[]> {
    if (getIsPgConnected()) {
      try {
        const res = await query("SELECT * FROM users ORDER BY first_name ASC");
        return res.rows;
      } catch (err) {
        console.warn("PostgreSQL getUsers query failed, serving memory fallback:", err);
      }
    }
    return memoryUsers;
  },

  // USER SETTINGS
  async getUserSettings(userId: string): Promise<UserSettingsEntity> {
    if (getIsPgConnected()) {
      try {
        const res = await query("SELECT * FROM user_settings WHERE user_id = $1", [userId]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (err) {
        console.warn("PostgreSQL getUserSettings failed, using memory fallback:", err);
      }
    }
    return memorySettings[userId] || {
      id: `set-${userId}`,
      user_id: userId,
      theme: "dark",
      timezone: "America/Toronto",
      date_format: "YYYY-MM-DD",
      time_format: "12h",
      default_landing_page: "dashboard",
      notifications_enabled: true,
      auto_lock_minutes: 10,
      audit_logging_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  async updateUserSettings(userId: string, settings: Partial<UserSettingsEntity>): Promise<UserSettingsEntity> {
    const current = await this.getUserSettings(userId);
    const updated: UserSettingsEntity = {
      ...current,
      ...settings,
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    if (getIsPgConnected()) {
      try {
        const res = await query(
          `INSERT INTO user_settings (user_id, theme, timezone, date_format, time_format, default_landing_page, notifications_enabled, auto_lock_minutes, audit_logging_enabled, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (user_id) DO UPDATE SET
             theme = EXCLUDED.theme,
             timezone = EXCLUDED.timezone,
             date_format = EXCLUDED.date_format,
             time_format = EXCLUDED.time_format,
             default_landing_page = EXCLUDED.default_landing_page,
             notifications_enabled = EXCLUDED.notifications_enabled,
             auto_lock_minutes = EXCLUDED.auto_lock_minutes,
             audit_logging_enabled = EXCLUDED.audit_logging_enabled,
             updated_at = EXCLUDED.updated_at
           RETURNING *`,
          [
            userId,
            updated.theme,
            updated.timezone,
            updated.date_format,
            updated.time_format,
            updated.default_landing_page,
            updated.notifications_enabled,
            updated.auto_lock_minutes,
            updated.audit_logging_enabled,
            updated.updated_at
          ]
        );
        return res.rows[0];
      } catch (err) {
        console.warn("PostgreSQL updateUserSettings failed, updating memory cache:", err);
      }
    }

    memorySettings[userId] = updated;
    return updated;
  },

  // CLIENTS
  async getClients(): Promise<ClientEntity[]> {
    if (getIsPgConnected()) {
      try {
        const res = await query("SELECT * FROM clients ORDER BY created_at DESC");
        return res.rows;
      } catch (err) {
        console.warn("PostgreSQL getClients query failed, returning memory fallback:", err);
      }
    }
    return memoryClients;
  },

  async createClient(clientData: Partial<ClientEntity>): Promise<ClientEntity> {
    const id = clientData.id || `c-${Date.now()}`;
    const newClient: ClientEntity = {
      id,
      first_name: clientData.first_name || "New",
      last_name: clientData.last_name || "Applicant",
      email: clientData.email || "",
      phone: clientData.phone || "",
      status: clientData.status || "In Review",
      stage: clientData.stage || "Initial Application",
      assigned_to: clientData.assigned_to || undefined,
      retention_owner: clientData.retention_owner || undefined,
      referred_by: clientData.referred_by || undefined,
      lender: clientData.lender || undefined,
      source: clientData.source || "Direct Referral",
      loan_amount: clientData.loan_amount || 0,
      property_value: clientData.property_value || 0,
      interest_rate: clientData.interest_rate || 0,
      beacon_score: clientData.beacon_score || 0,
      maturity_date: clientData.maturity_date || undefined,
      notes: clientData.notes || "",
      retention_notes: clientData.retention_notes || "",
      raw_data: clientData.raw_data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (getIsPgConnected()) {
      try {
        const res = await query(
          `INSERT INTO clients (id, first_name, last_name, email, phone, status, stage, assigned_to, lender, source, loan_amount, property_value, interest_rate, beacon_score, notes, retention_notes, raw_data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           RETURNING *`,
          [
            newClient.id, newClient.first_name, newClient.last_name, newClient.email, newClient.phone,
            newClient.status, newClient.stage, newClient.assigned_to, newClient.lender, newClient.source,
            newClient.loan_amount, newClient.property_value, newClient.interest_rate, newClient.beacon_score,
            newClient.notes, newClient.retention_notes, JSON.stringify(newClient.raw_data), newClient.created_at, newClient.updated_at
          ]
        );
        return res.rows[0];
      } catch (err) {
        console.warn("PostgreSQL createClient failed, writing to memory fallback:", err);
      }
    }

    memoryClients.unshift(newClient);
    return newClient;
  },

  async updateClient(id: string, updates: Partial<ClientEntity>): Promise<ClientEntity | null> {
    const existingList = await this.getClients();
    const existing = existingList.find(c => c.id === id);
    if (!existing) return null;

    const updated: ClientEntity = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (getIsPgConnected()) {
      try {
        const res = await query(
          `UPDATE clients SET 
             first_name = $1, last_name = $2, email = $3, phone = $4, status = $5, stage = $6, 
             assigned_to = $7, lender = $8, source = $9, loan_amount = $10, property_value = $11, 
             interest_rate = $12, beacon_score = $13, notes = $14, retention_notes = $15, updated_at = $16
           WHERE id = $17 RETURNING *`,
          [
            updated.first_name, updated.last_name, updated.email, updated.phone, updated.status, updated.stage,
            updated.assigned_to, updated.lender, updated.source, updated.loan_amount, updated.property_value,
            updated.interest_rate, updated.beacon_score, updated.notes, updated.retention_notes, updated.updated_at, id
          ]
        );
        return res.rows[0];
      } catch (err) {
        console.warn("PostgreSQL updateClient failed, updating memory cache:", err);
      }
    }

    memoryClients = memoryClients.map(c => c.id === id ? updated : c);
    return updated;
  },

  // TASKS
  async getTasks(): Promise<TaskEntity[]> {
    if (getIsPgConnected()) {
      try {
        const res = await query("SELECT * FROM tasks ORDER BY due_at ASC NULLS LAST");
        return res.rows;
      } catch (err) {
        console.warn("PostgreSQL getTasks query failed, using memory fallback:", err);
      }
    }
    return memoryTasks;
  },

  async createTask(taskData: Partial<TaskEntity>): Promise<TaskEntity> {
    const newTask: TaskEntity = {
      id: taskData.id || `tsk-${Date.now()}`,
      title: taskData.title || "New Task",
      description: taskData.description || "",
      assigned_to: taskData.assigned_to || undefined,
      related_client_id: taskData.related_client_id || undefined,
      due_at: taskData.due_at || new Date().toISOString(),
      status: taskData.status || "pending",
      priority: taskData.priority || "medium",
      category: taskData.category || "General",
      notes: taskData.notes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (getIsPgConnected()) {
      try {
        const res = await query(
          `INSERT INTO tasks (id, title, description, assigned_to, related_client_id, due_at, status, priority, category, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            newTask.id, newTask.title, newTask.description, newTask.assigned_to, newTask.related_client_id,
            newTask.due_at, newTask.status, newTask.priority, newTask.category, newTask.notes, newTask.created_at, newTask.updated_at
          ]
        );
        return res.rows[0];
      } catch (err) {
        console.warn("PostgreSQL createTask failed, writing to memory cache:", err);
      }
    }

    memoryTasks.unshift(newTask);
    return newTask;
  },

  async updateTask(id: string, updates: Partial<TaskEntity>): Promise<TaskEntity | null> {
    const existingList = await this.getTasks();
    const existing = existingList.find(t => t.id === id);
    if (!existing) return null;

    const updated: TaskEntity = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (getIsPgConnected()) {
      try {
        const res = await query(
          `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, category = $5, notes = $6, updated_at = $7
           WHERE id = $8 RETURNING *`,
          [updated.title, updated.description, updated.status, updated.priority, updated.category, updated.notes, updated.updated_at, id]
        );
        return res.rows[0];
      } catch (err) {
        console.warn("PostgreSQL updateTask failed, updating memory cache:", err);
      }
    }

    memoryTasks = memoryTasks.map(t => t.id === id ? updated : t);
    return updated;
  },

  // AUDIT LOGS
  async getAuditLogs(): Promise<AuditLogEntity[]> {
    if (getIsPgConnected()) {
      try {
        const res = await query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
        return res.rows;
      } catch (err) {
        console.warn("PostgreSQL getAuditLogs query failed, returning memory fallback:", err);
      }
    }
    return memoryAuditLogs;
  },

  async addAuditLog(entry: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const logItem: AuditLogEntity = {
      id: entry.id || `aud-${Date.now()}`,
      user_id: entry.user_id || undefined,
      user_name: entry.user_name || "System User",
      action: entry.action || "System Action",
      target_type: entry.target_type || "System",
      target_id: entry.target_id || undefined,
      target_name: entry.target_name || "",
      details: entry.details || "",
      ip_address: entry.ip_address || "127.0.0.1",
      created_at: new Date().toISOString()
    };

    if (getIsPgConnected()) {
      try {
        const res = await query(
          `INSERT INTO audit_logs (id, user_id, user_name, action, target_type, target_id, target_name, details, ip_address, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            logItem.id, logItem.user_id, logItem.user_name, logItem.action,
            logItem.target_type, logItem.target_id, logItem.target_name, logItem.details,
            logItem.ip_address, logItem.created_at
          ]
        );
        return res.rows[0];
      } catch (err) {
        console.warn("PostgreSQL addAuditLog failed, updating memory cache:", err);
      }
    }

    memoryAuditLogs.unshift(logItem);
    return logItem;
  }
};
