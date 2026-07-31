const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { findClientFolderPathAndDataById } = require("./clients");

/**
 * Sanitizes an uploaded file name to only allow alphanumeric characters,
 * dots, underscores, and dashes to prevent path traversal or injection.
 */
function sanitizeFilename(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanExt = ext.replace(/[^a-zA-Z0-9_.-]/g, "");
  return cleanBase + cleanExt;
}

// Define multer storage with dynamic destination based on client ID and sanitized names
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const clientId = req.params.id;
    const existing = findClientFolderPathAndDataById(clientId);
    if (!existing) {
      return cb(new Error("Client not found"), null);
    }
    const docsDir = path.join(existing.folderPath, "documents");
    fs.mkdirSync(docsDir, { recursive: true });
    cb(null, docsDir);
  },
  filename: function (req, file, cb) {
    const cleanName = sanitizeFilename(file.originalname);
    cb(null, cleanName);
  }
});

// Configure upload limits (10MB)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/clients/:id/documents - list all documents
router.get("/:id/documents", (req, res) => {
  try {
    const id = req.params.id;
    const existing = findClientFolderPathAndDataById(id);
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    const docsDir = path.join(existing.folderPath, "documents");
    if (!fs.existsSync(docsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(docsDir);
    const result = [];
    
    for (const file of files) {
      const filePath = path.join(docsDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          result.push({
            name: file,
            size: stat.size,
            modified: stat.mtime
          });
        }
      } catch (err) {
        // Skip unreadable files
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Error fetching documents:", err);
    res.status(500).json({ error: "Failed to fetch documents", details: err.message });
  }
});

// POST /api/clients/:id/documents - upload a file with limits and error handling
router.post("/:id/documents", (req, res, next) => {
  upload.single("file")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File exceeds the maximum size limit of 10MB." });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      success: true,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ error: "Failed to upload file", details: err.message });
  }
});

// DELETE /api/clients/:id/documents/:filename - delete a specific file
router.delete("/:id/documents/:filename", (req, res) => {
  try {
    const id = req.params.id;
    // Sanitize parameters to avoid path traversal
    const filename = sanitizeFilename(req.params.filename);
    const existing = findClientFolderPathAndDataById(id);
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    const filePath = path.join(existing.folderPath, "documents", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: "File deleted successfully" });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ error: "Failed to delete file", details: err.message });
  }
});

module.exports = router;
