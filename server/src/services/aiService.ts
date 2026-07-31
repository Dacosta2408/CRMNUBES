import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    throw new Error("GEMINI_API_KEY environment variable is not configured in backend .env file.");
  }
  return new GoogleGenAI({ apiKey: key });
}

async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3, delayMs = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const isTransient = 
        err.status === 503 || 
        err.status === 429 ||
        err.statusCode === 503 ||
        err.statusCode === 429 ||
        (err.message && (
          err.message.includes("503") || 
          err.message.includes("429") || 
          err.message.includes("UNAVAILABLE") || 
          err.message.includes("high demand")
        ));
      
      if (isTransient && i < retries - 1) {
        console.log(`Transient Gemini API info (attempt ${i + 1}/${retries}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to generate content after retries.");
}

export const aiService = {
  /**
   * Generates a concise executive summary for a mortgage client
   */
  async summarizeClient(clientData: any): Promise<string> {
    try {
      const ai = getGeminiClient();
      const prompt = `As a Canadian Mortgage Underwriting AI Assistant at GBK Financial, generate a concise 3-paragraph executive summary for this client:

Name: ${clientData.first_name || clientData.first} ${clientData.last_name || clientData.last}
Status: ${clientData.status || "In Review"}
Stage: ${clientData.stage || "Initial Application"}
Lender: ${clientData.lender || "Not Selected"}
Loan Amount: $${clientData.loan_amount || clientData.mtgamt || 0}
Property Value: $${clientData.property_value || clientData.propval || 0}
Credit Score (Beacon): ${clientData.beacon_score || clientData.beacon || "N/A"}
Notes: ${clientData.notes || "None"}

Paragraph 1: Qualification & Key Ratios (LTV, Beacon, Income Fit)
Paragraph 2: File Strengths & Outstanding Conditions (NOAs, Paystubs, Appraisal)
Paragraph 3: Recommended Broker Action & Next Follow-Up`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { temperature: 0.3 }
      });

      return response.text || "Summary could not be generated.";
    } catch (err: any) {
      console.warn("AI Summarize Client fallback triggered:", err.message);
      return `[LOCAL SUMMARY] Client ${clientData.first_name || clientData.first} ${clientData.last_name || clientData.last} is currently at stage '${clientData.stage || "Initial"}'. Loan amount requested is $${(clientData.loan_amount || clientData.mtgamt || 0).toLocaleString()} against an estimated property value of $${(clientData.property_value || clientData.propval || 0).toLocaleString()}. Beacon score is ${clientData.beacon_score || clientData.beacon || "700+"}.`;
    }
  },

  /**
   * Generates a draft follow-up note or client email
   */
  async generateNote(purpose: string, clientName: string, details?: string): Promise<string> {
    try {
      const ai = getGeminiClient();
      const prompt = `Draft a professional, clear Canadian mortgage broker ${purpose} for client '${clientName}'.
Additional Context / Requirements: ${details || "Standard mortgage file update and condition reminder"}

Keep the tone expert, helpful, and concise.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { temperature: 0.5 }
      });

      return response.text || "Draft note could not be generated.";
    } catch (err: any) {
      console.warn("AI Generate Note fallback triggered:", err.message);
      return `[DRAFT NOTE - ${purpose.toUpperCase()}]\nRe: Mortgage Application for ${clientName}\n\nDear ${clientName},\n\nWe are currently reviewing your file conditions. Please provide your updated Notice of Assessment (NOA) and most recent paystub at your earliest convenience.\n\nBest regards,\nGBK Financial Team`;
    }
  }
};
