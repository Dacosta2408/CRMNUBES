const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

/**
 * Recursively strips out any HTML tags from text inputs to prevent XSS.
 */
function sanitizeInput(obj) {
  if (typeof obj === "string") {
    return obj.replace(/<[^>]*>/g, "");
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

const getRootPath = () => {
  return path.normalize(process.env.GBK_ROOT_PATH || "./gbk-crm-data");
};

// Helper to find client folder path and parsed client.json data by client ID
function findClientFolderPathAndDataById(id) {
  const root = getRootPath();
  const clientsDir = path.join(root, "Clients");
  if (!fs.existsSync(clientsDir)) return null;

  try {
    const letters = fs.readdirSync(clientsDir);
    for (const letter of letters) {
      const letterPath = path.join(clientsDir, letter);
      if (fs.statSync(letterPath).isDirectory()) {
        const clientFolders = fs.readdirSync(letterPath);
        for (const folder of clientFolders) {
          const clientFolderPath = path.join(letterPath, folder);
          if (fs.statSync(clientFolderPath).isDirectory()) {
            const clientJsonPath = path.join(clientFolderPath, "client.json");
            if (fs.existsSync(clientJsonPath)) {
              try {
                const data = JSON.parse(fs.readFileSync(clientJsonPath, "utf8"));
                if (data.id === id) {
                  return {
                    folderPath: clientFolderPath,
                    jsonPath: clientJsonPath,
                    data: data
                  };
                }
              } catch (e) {
                // Ignore parse errors on individual file read, skip
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in findClientFolderPathAndDataById:", err);
  }
  return null;
}

// GET /api/clients - scans all letter folders
router.get("/", (req, res) => {
  try {
    const root = getRootPath();
    const clientsDir = path.join(root, "Clients");
    
    if (!fs.existsSync(clientsDir)) {
      return res.json([]);
    }

    const allClients = [];
    const letters = fs.readdirSync(clientsDir);
    for (const letter of letters) {
      const letterPath = path.join(clientsDir, letter);
      if (fs.statSync(letterPath).isDirectory()) {
        const clientFolders = fs.readdirSync(letterPath);
        for (const folder of clientFolders) {
          const clientFolderPath = path.join(letterPath, folder);
          if (fs.statSync(clientFolderPath).isDirectory()) {
            const clientJsonPath = path.join(clientFolderPath, "client.json");
            if (fs.existsSync(clientJsonPath)) {
              try {
                const data = JSON.parse(fs.readFileSync(clientJsonPath, "utf8"));
                allClients.push(data);
              } catch (e) {
                console.error(`Error parsing client.json at ${clientJsonPath}:`, e);
              }
            }
          }
        }
      }
    }
    res.json(allClients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ error: "Failed to fetch clients", details: err.message });
  }
});

// GET /api/clients/:id - returns single client.json
router.get("/:id", (req, res) => {
  try {
    const id = req.params.id;
    const existing = findClientFolderPathAndDataById(id);
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(existing.data);
  } catch (err) {
    console.error("Error fetching client by ID:", err);
    res.status(500).json({ error: "Failed to fetch client", details: err.message });
  }
});

// POST /api/clients - creates a new client folder
router.post("/", (req, res) => {
  try {
    const client = sanitizeInput(req.body);
    if (!client || !client.first || !client.last) {
      return res.status(400).json({ error: "Client first and last name are required" });
    }

    // Ensure ID is present
    if (!client.id) {
      const { v4: uuidv4 } = require("uuid");
      client.id = uuidv4();
    }

    const root = getRootPath();
    const letter = client.last[0].toUpperCase();
    const folderName = `${client.last} ${client.first}`;
    const clientFolderPath = path.join(root, "Clients", letter, folderName);

    // Create directory recursively
    fs.mkdirSync(clientFolderPath, { recursive: true });

    // Write client.json, notes.json (empty array), tasks.json (empty array)
    fs.writeFileSync(path.join(clientFolderPath, "client.json"), JSON.stringify(client, null, 2), "utf8");
    fs.writeFileSync(path.join(clientFolderPath, "notes.json"), JSON.stringify([], null, 2), "utf8");
    fs.writeFileSync(path.join(clientFolderPath, "tasks.json"), JSON.stringify([], null, 2), "utf8");

    // Also create documents subfolder
    fs.mkdirSync(path.join(clientFolderPath, "documents"), { recursive: true });

    res.status(201).json(client);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ error: "Failed to create client", details: err.message });
  }
});

// PUT /api/clients/:id - updates an existing client's client.json
router.put("/:id", (req, res) => {
  try {
    const id = req.params.id;
    const updatedClient = sanitizeInput(req.body);
    if (!updatedClient || !updatedClient.first || !updatedClient.last) {
      return res.status(400).json({ error: "Client first and last name are required" });
    }

    const existing = findClientFolderPathAndDataById(id);
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    const root = getRootPath();
    const newLetter = updatedClient.last[0].toUpperCase();
    const newFolderName = `${updatedClient.last} ${updatedClient.first}`;
    const newFolderPath = path.join(root, "Clients", newLetter, newFolderName);

    let finalFolderPath = existing.folderPath;

    // If the name changed (which changes the folder name or letter folder), rename
    if (path.normalize(existing.folderPath) !== path.normalize(newFolderPath)) {
      fs.mkdirSync(path.dirname(newFolderPath), { recursive: true });
      fs.renameSync(existing.folderPath, newFolderPath);
      finalFolderPath = newFolderPath;
    }

    const finalJsonPath = path.join(finalFolderPath, "client.json");
    fs.writeFileSync(finalJsonPath, JSON.stringify(updatedClient, null, 2), "utf8");

    res.json(updatedClient);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Failed to update client", details: err.message });
  }
});

// DELETE /api/clients/:id - deletes a client's entire folder
router.delete("/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({ error: "Confirmation flag is required to delete a client" });
    }

    const existing = findClientFolderPathAndDataById(id);
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Delete client folder recursively
    fs.rmSync(existing.folderPath, { recursive: true, force: true });

    res.json({ success: true, message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Failed to delete client", details: err.message });
  }
});

module.exports = router;
module.exports.findClientFolderPathAndDataById = findClientFolderPathAndDataById;
