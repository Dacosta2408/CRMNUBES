const express = require("express");
const router = express.Router();

// GET /api/health or /health or /
router.get(["/", "/api/health", "/health"], (req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    ok: true,
    status: "ok",
    pathValid: global.pathValid !== false,
    service: "gbk-bridge",
    path: process.env.GBK_ROOT_PATH || "./gbk-crm-data",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
