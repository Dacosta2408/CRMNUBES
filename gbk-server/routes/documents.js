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

const getRootPath = () => path.normalize(process.env.GBK_ROOT_PATH || "./gbk-crm-data");

// GET /api/clients/all-documents - list all real uploaded files across all clients
router.get("/all-documents", (req, res) => {
  try {
    const root = getRootPath();
    const clientsDir = path.join(root, "Clients");
    const allFiles = [];

    if (!fs.existsSync(clientsDir)) {
      return res.json([]);
    }

    const letters = fs.readdirSync(clientsDir);
    for (const letter of letters) {
      const letterPath = path.join(clientsDir, letter);
      if (fs.statSync(letterPath).isDirectory()) {
        const clientFolders = fs.readdirSync(letterPath);
        for (const folder of clientFolders) {
          const clientFolderPath = path.join(letterPath, folder);
          if (fs.statSync(clientFolderPath).isDirectory()) {
            const clientJsonPath = path.join(clientFolderPath, "client.json");
            let clientData = null;
            if (fs.existsSync(clientJsonPath)) {
              try {
                clientData = JSON.parse(fs.readFileSync(clientJsonPath, "utf8"));
              } catch (e) {}
            }

            const clientId = clientData ? clientData.id : folder;
            const clientName = clientData 
              ? `${clientData.first || ""} ${clientData.last || ""}`.trim() || clientData.name || clientId
              : folder.replace(/_/g, " ");

            const docsDir = path.join(clientFolderPath, "documents");
            if (fs.existsSync(docsDir)) {
              const files = fs.readdirSync(docsDir);
              for (const file of files) {
                const filePath = path.join(docsDir, file);
                try {
                  const stat = fs.statSync(filePath);
                  if (stat.isFile()) {
                    const ext = path.extname(file).toLowerCase().replace(".", "");
                    allFiles.push({
                      id: `${clientId}_${file}`,
                      clientId: clientId,
                      clientName: clientName,
                      name: file,
                      filename: file,
                      size: stat.size,
                      sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
                      type: ext === "html" || ext === "htm" ? "html" : ext === "pdf" ? "pdf" : "txt",
                      updatedAt: stat.mtime.toISOString().replace("T", " ").substring(0, 16),
                      mtime: stat.mtime,
                      uploadedAt: stat.mtime.toISOString(),
                      uploadedBy: clientData?.assignedBroker || "Client Portal",
                      path: `/api/bridge/api/clients/${encodeURIComponent(clientId)}/documents/${encodeURIComponent(file)}`,
                      downloadUrl: `/api/bridge/api/clients/${encodeURIComponent(clientId)}/documents/${encodeURIComponent(file)}`
                    });
                  }
                } catch (e) {}
              }
            }
          }
        }
      }
    }

    allFiles.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
    return res.json(allFiles);
  } catch (err) {
    console.error("Error fetching all documents:", err);
    return res.status(500).json({ error: "Failed to fetch all documents", details: err.message });
  }
});

// GET /api/clients/:id/documents - list all documents for a client
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

// GET /api/clients/:id/documents/:filename - download/view a specific file
router.get("/:id/documents/:filename", (req, res) => {
  try {
    const id = req.params.id;
    const filename = sanitizeFilename(req.params.filename);
    const existing = findClientFolderPathAndDataById(id);
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    const filePath = path.join(existing.folderPath, "documents", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    if (req.query.download === "true") {
      return res.download(filePath, filename);
    }

    const ext = path.extname(filename).toLowerCase();
    if (ext === ".pdf") {
      res.setHeader("Content-Type", "application/pdf");
    } else if (ext === ".html" || ext === ".htm") {
      res.setHeader("Content-Type", "text/html");
    } else if (ext === ".json") {
      res.setHeader("Content-Type", "application/json");
    } else if (ext === ".txt") {
      res.setHeader("Content-Type", "text/plain");
    }

    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error("Error serving file:", err);
    res.status(500).json({ error: "Failed to serve file", details: err.message });
  }
});

// GET /api/clients/:id/documents/:filename/content - read text content of file
router.get("/:id/documents/:filename/content", (req, res) => {
  try {
    const id = req.params.id;
    const filename = sanitizeFilename(req.params.filename);
    const existing = findClientFolderPathAndDataById(id);
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    const filePath = path.join(existing.folderPath, "documents", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const content = fs.readFileSync(filePath, "utf8");
    return res.json({
      filename: filename,
      clientId: id,
      content: content
    });
  } catch (err) {
    console.error("Error reading file content:", err);
    res.status(500).json({ error: "Failed to read file content", details: err.message });
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
