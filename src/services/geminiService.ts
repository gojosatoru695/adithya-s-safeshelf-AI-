import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface RiskAnalysis {
  score: number;
  status: string;
  alerts: string[];
}

export interface RefillSuggestion {
  name: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

export const geminiService = {
  analyzeRisk: async (items: any[]): Promise<RiskAnalysis> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these medications for risks, interactions, and expiry. Items: ${JSON.stringify(items)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              status: { type: Type.STRING },
              alerts: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["score", "status", "alerts"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
        console.warn("Gemini Rate Limit Reached");
        return { score: 0, status: "Rate Limited", alerts: ["AI analysis is temporarily unavailable due to high usage. Please try again in a few minutes."] };
      }
      console.error("Gemini Risk Analysis Error:", error);
      throw error;
    }
  },

  getRefillSuggestions: async (items: any[]): Promise<RefillSuggestion[]> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on these medicines, suggest refills for low stock or soon-to-expire items. Items: ${JSON.stringify(items)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
                urgency: { 
                  type: Type.STRING,
                  enum: ["low", "medium", "high"]
                }
              },
              required: ["name", "reason", "urgency"]
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
        console.warn("Gemini Rate Limit Reached");
        return [];
      }
      console.error("Gemini Refill Suggestions Error:", error);
      throw error;
    }
  },

  voiceQuery: async (query: string, items: any[]): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context (Inventory): ${JSON.stringify(items)}. User asks: "${query}". Answer concisely as a medical inventory assistant.`
      });

      return response.text || 'No response from assistant.';
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
        return "The AI is currently busy with multiple requests. Please try again in a moment.";
      }
      console.error("Gemini Voice Query Error:", error);
      throw error;
    }
  },

  chatQuery: async (query: string, items: any[]): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          System: You are the SafeShelf AI Assistant. 
          Inventory Context: ${JSON.stringify(items)}. 
          
          User Query: "${query}"
          
          Guidelines:
          - If they ask about expiring items, list them and their dates.
          - If they ask about refills or low stock, identify items with low quantity or status 'low-stock'.
          - If they ask for a summary, provide a breakdown of Total items, Expiring soon, and Low stock.
          - Be helpful, professional, and concise.
          - Use markdown for formatting (bullet points, bold text).
        `
      });

      return response.text || 'I couldn\'t process that request right now.';
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
        return "I'm temporarily over capacity. Please give me a minute to breathe and try again!";
      }
      console.error("Gemini Chat Query Error:", error);
      return "I'm having trouble connecting to my AI processor. Please try again later.";
    }
  }
};
