const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const getRootPath = () => {
  return path.normalize(process.env.GBK_ROOT_PATH || "./gbk-crm-data");
};

// Safe JSON Reader Helper
function readJsonFile(filePath, defaultVal = []) {
  if (!fs.existsSync(filePath)) {
    return defaultVal;
  }
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content || JSON.stringify(defaultVal));
  } catch (err) {
    console.error(`Error reading/parsing file at ${filePath}:`, err);
    return defaultVal;
  }
}

// Safe JSON Writer Helper
function writeJsonFile(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`Error writing file at ${filePath}:`, err);
    return false;
  }
}

// GET /api/system/roster
router.get("/roster", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "roster.json");
  const roster = readJsonFile(filePath, []);
  res.json(roster);
});

// PUT /api/system/roster
router.put("/roster", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "roster.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Roster updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update roster" });
  }
});

// GET /api/system/lenders
router.get("/lenders", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "Lenders", "lenders.json");
  const lenders = readJsonFile(filePath, []);
  res.json(lenders);
});

// PUT /api/system/lenders
router.put("/lenders", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "Lenders", "lenders.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Lenders updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update lenders" });
  }
});

// GET /api/system/audit
router.get("/audit", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "audit_logs.json");
  const logs = readJsonFile(filePath, []);
  res.json(logs);
});

// POST /api/system/audit
router.post("/audit", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "audit_logs.json");
  const logs = readJsonFile(filePath, []);
  
  const newLog = req.body;
  logs.push(newLog);
  
  const success = writeJsonFile(filePath, logs);
  if (success) {
    res.json({ success: true, log: newLog });
  } else {
    res.status(500).json({ error: "Failed to write audit log" });
  }
});

// PUT /api/system/audit
router.put("/audit", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "audit_logs.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Audit logs updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update audit logs" });
  }
});

// GET /api/system/partners
router.get("/partners", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "partners.json");
  const partners = readJsonFile(filePath, []);
  res.json(partners);
});

// PUT /api/system/partners
router.put("/partners", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "partners.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Partners updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update partners" });
  }
});

// GET /api/system/emails
router.get("/emails", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "emails.json");
  const emails = readJsonFile(filePath, []);
  res.json(emails);
});

// PUT /api/system/emails
router.put("/emails", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "emails.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Emails updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update emails" });
  }
});

// GET /api/system/messages
router.get("/messages", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "messages.json");
  const messages = readJsonFile(filePath, []);
  res.json(messages);
});

// PUT /api/system/messages
router.put("/messages", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "messages.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Messages updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update messages" });
  }
});

// GET /api/system/tasks
router.get("/tasks", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "tasks.json");
  const tasks = readJsonFile(filePath, []);
  res.json(tasks);
});

// PUT /api/system/tasks
router.put("/tasks", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "tasks.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Tasks updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update tasks" });
  }
});

// GET /api/system/broadcasts
router.get("/broadcasts", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "broadcasts.json");
  const broadcasts = readJsonFile(filePath, []);
  res.json(broadcasts);
});

// PUT /api/system/broadcasts
router.put("/broadcasts", (req, res) => {
  const root = getRootPath();
  const filePath = path.join(root, "System", "broadcasts.json");
  const success = writeJsonFile(filePath, req.body);
  if (success) {
    res.json({ success: true, message: "Broadcasts updated successfully" });
  } else {
    res.status(500).json({ error: "Failed to update broadcasts" });
  }
});

module.exports = router;
