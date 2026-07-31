const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  const { message, history = [], clientContext = "" } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.status(400).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add your Gemini API Key in the Settings panel."
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // System instruction to guide the assistant's behavior
    const systemInstruction = `You are the GBK Financial AI Mortgage Assistant — an expert Canadian mortgage advisor helping brokers at GBK Financial in Barrie, Ontario.
You have deep knowledge of OSFI stress test guidelines, CMHC rules, Ontario mortgage regulations, lender underwriting criteria, and best practices.

Be concise, practical, and highly professional. Use Canadian terminology (e.g., GDS/TDS, amortization, high-ratio, conventional, stress test, Monoline lenders).
Always suggest adjustments if qualification GDS/TDS ratios are borderline.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const contents = [];

    // Map history to Google Generative AI chat history format
    if (Array.isArray(history)) {
      history.forEach((h) => {
        const role = h.role === "assistant" || h.role === "model" ? "model" : "user";
        const text = h.content || h.text || "";
        if (text) {
          contents.push({
            role: role,
            parts: [{ text: text }]
          });
        }
      });
    }

    // Combine current client context and user message for the active turn
    let combinedMessage = "";
    if (clientContext) {
      combinedMessage += `Current Client Context:\n${clientContext}\n\n`;
    }
    combinedMessage += `User Message: ${message}`;

    contents.push({
      role: "user",
      parts: [{ text: combinedMessage }]
    });

    const result = await model.generateContent({
      contents: contents,
      generationConfig: {
        temperature: 0.7,
      }
    });

    const reply = result.response.text() || "No response generated.";
    res.json({ reply });
  } catch (err) {
    console.error("AI chat error in bridge server:", err);
    res.status(500).json({ error: err.message || "Failed to generate response from Gemini." });
  }
});

module.exports = router;
