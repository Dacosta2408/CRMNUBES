const fs = require("fs");
const path = require("path");

/**
 * Safely parses a JSON string.
 * Returns defaultVal if string is empty, null, undefined, or invalid JSON.
 */
function safeParseJson(str, defaultVal = null) {
  if (str === null || str === undefined) return defaultVal;
  if (typeof str !== "string") return defaultVal;

  const trimmed = str.trim();
  if (!trimmed) return defaultVal;

  // Check if string looks like JSON (starts with { or [)
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return defaultVal;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed !== null && parsed !== undefined ? parsed : defaultVal;
  } catch (err) {
    console.warn("[jsonUtils] JSON parse error:", err.message);
    return defaultVal;
  }
}

/**
 * Safely writes a data object to a JSON file.
 * Creates parent directories automatically.
 */
function safeWriteJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonStr, "utf8");
    return true;
  } catch (err) {
    console.error(`[jsonUtils] Failed writing file at ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Safely reads and parses a JSON file.
 * If file does not exist, is empty, or contains invalid JSON:
 * - logs the issue safely
 * - overwrites/recreates the file with valid JSON (defaultVal)
 * - returns defaultVal
 */
function safeReadJsonFile(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) {
      safeWriteJsonFile(filePath, defaultVal);
      return defaultVal;
    }

    const content = fs.readFileSync(filePath, "utf8");
    if (!content || !content.trim()) {
      console.warn(`[jsonUtils] Empty file at ${filePath}. Re-initializing with valid default.`);
      safeWriteJsonFile(filePath, defaultVal);
      return defaultVal;
    }

    const parsed = safeParseJson(content, null);
    if (parsed === null) {
      console.warn(`[jsonUtils] Corrupted JSON at ${filePath}. Re-initializing with valid default.`);
      safeWriteJsonFile(filePath, defaultVal);
      return defaultVal;
    }

    return parsed;
  } catch (err) {
    console.error(`[jsonUtils] Error reading file at ${filePath}:`, err.message);
    safeWriteJsonFile(filePath, defaultVal);
    return defaultVal;
  }
}

module.exports = {
  safeParseJson,
  safeWriteJsonFile,
  safeReadJsonFile
};
