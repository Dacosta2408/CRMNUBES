const express = require("express");
const router = express.Router();

// GET /api/health
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    path: process.env.GBK_ROOT_PATH || ""
  });
});

module.exports = router;
