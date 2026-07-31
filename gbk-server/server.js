const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { safeWriteJsonFile } = require("./utils/jsonUtils");

const app = express();
const PORT = process.env.GBK_PORT || process.env.PORT || 3001;

// CORS setup to allow various origins
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));

// Handle invalid JSON in request body
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON payload in request body" });
  }
  next(err);
});

// Apply token-based auth middleware to protect endpoints
const authMiddleware = require("./middleware/auth");
app.use(authMiddleware);

// Path validation & auto-creation logic for ./gbk-crm-data
const rootPath = path.normalize(process.env.GBK_ROOT_PATH || "./gbk-crm-data");
let pathValid = true;

try {
  if (!fs.existsSync(rootPath)) {
    console.log(`[Bridge] Root directory ${rootPath} missing. Creating base data directory structure...`);
    fs.mkdirSync(rootPath, { recursive: true });
    
    // Create base directories
    ["Clients", "Lenders", "Templates", "System"].forEach(dir => {
      fs.mkdirSync(path.join(rootPath, dir), { recursive: true });
    });

    // Seed default system files if missing
    safeWriteJsonFile(path.join(rootPath, "System", "roster.json"), [
      {
        id: "owner-david",
        first: "David",
        last: "Acosta",
        email: "VDacosta247@gmail.com",
        role: "Owner / Master Admin",
        status: "active",
        phone: "+1 (416) 555-0199",
        pin: "1234",
        lastLogin: new Date().toISOString(),
        created: "2026-01-01",
        isOwner: true,
        displayName: "David Acosta",
        jobTitle: "Principal Broker"
      }
    ]);
    safeWriteJsonFile(path.join(rootPath, "Lenders", "lenders.json"), []);
    safeWriteJsonFile(path.join(rootPath, "Templates", "templates.json"), []);
    safeWriteJsonFile(path.join(rootPath, "System", "audit_logs.json"), []);
    safeWriteJsonFile(path.join(rootPath, "System", "broadcasts.json"), []);
  }
  pathValid = true;
} catch (err) {
  console.error(`[Bridge] Failed to verify or create root path ${rootPath}:`, err.message);
  pathValid = false;
}

global.pathValid = pathValid;

// Global path valid checker middleware for data routes
app.use((req, res, next) => {
  const isMetaRoute = req.path === "/api/health" || req.path === "/api/version" || req.path === "/health" || req.path === "/version";
  if (!isMetaRoute && !global.pathValid) {
    return res.status(503).json({ error: "Root path not accessible" });
  }
  next();
});

// Version Endpoint
app.get("/api/version", (req, res) => {
  res.json({
    version: "1.0.0",
    env: process.env.NODE_ENV || "development"
  });
});

// Routes Setup
const healthRouter = require("./routes/health");
const clientsRouter = require("./routes/clients");
const documentsRouter = require("./routes/documents");
const systemRouter = require("./routes/system");
const emailRouter = require("./routes/email");
const aiRouter = require("./routes/ai");

app.use("/api/health", healthRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/clients", documentsRouter); // Mounted on /api/clients so /api/clients/:id/documents works
app.use("/api/system", systemRouter);
app.use("/api/email", emailRouter);
app.use("/api/ai", aiRouter);

// 404 Handler - ensure valid JSON response
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found on GBK Bridge` });
});

// Global Error Handler - ensure valid JSON response
app.use((err, req, res, next) => {
  console.error(`[Bridge Error] Caught unhandled error on ${req.method} ${req.url}:`, err);
  if (!res.headersSent) {
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || "An unexpected server error occurred in GBK Bridge"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  const envLabel = process.env.NODE_ENV || "development";
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║   GBK Bridge Server v1.0.0          ║`);
  console.log(`║   Environment: ${envLabel.padEnd(21, ' ')}║`);
  console.log(`║   Root Path: ${rootPath.substring(0, 24).padEnd(24, ' ')}║`);
  console.log(`║   Port: ${String(PORT).padEnd(29, ' ')}║`);
  console.log(`║   Status: ONLINE                     ║`);
  console.log(`╚══════════════════════════════════════╝`);
});
