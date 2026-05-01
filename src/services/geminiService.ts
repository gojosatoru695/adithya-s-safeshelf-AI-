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
  // Astra Logic: Risk & Safety with high-empathy clarity
  analyzeRisk: async (items: any[], mode: 'astra' | 'quantis' = 'astra'): Promise<RiskAnalysis> => {
    try {
      const persona = mode === 'astra' 
        ? "Astra (SafeShelf Assistant): Focus on safety, elder-care clarity, and simple warnings. Use calm, helpful language."
        : "Quantis (Analytical Engine): Focus on data reliability, interaction probability, and precise risk scoring.";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `System: Use persona: ${persona}. 
          Analyze these medications for risks, interactions, and expiry. 
          Return JSON. Safety Rule: Never diagnose. Never change dosage.
          Items: ${JSON.stringify(items)}`,
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
        return { score: 0, status: "Rate Limited", alerts: ["AI analysis is temporarily unavailable."] };
      }
      console.error("Gemini Risk Analysis Error:", error);
      return { score: 100, status: "System error", alerts: ["Unable to perform AI risk check."] };
    }
  },

  // Astra Logic: Review Summaries
  getReviewSummary: async (productName: string): Promise<any> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Astra Mode: Summarize product reviews for "${productName}" using the following structure. Search for recent real reviews to ensure accuracy. Use helpful, human-friendly summaries. Tags: Value for Money, Quality, Packaging, Delivery, Trust, Taste, User Satisfaction.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              summary: {
                type: Type.OBJECT,
                properties: {
                  valueForMoney: { type: Type.STRING },
                  quality: { type: Type.STRING },
                  packaging: { type: Type.STRING },
                  delivery: { type: Type.STRING },
                  trust: { type: Type.STRING },
                  taste: { type: Type.STRING },
                  userSatisfaction: { type: Type.STRING }
                }
              },
              reliabilityScore: { type: Type.NUMBER }
            },
            required: ["productName", "summary", "reliabilityScore"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      console.error("Gemini Review Summary Error:", error);
      return null;
    }
  },

  // Quantis Logic: Market Comparison & Optimization
  getMarketComparison: async (productName: string): Promise<any> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Quantis Mode: Compare real current prices and delivery times for "${productName}" across: Blinkit, Tata 1mg, PharmEasy, and Netmeds. Focus on data precision. Return JSON.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              deals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    store: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    eta: { type: Type.STRING },
                    availability: { type: Type.BOOLEAN },
                    offer: { type: Type.STRING },
                    isBestDeal: { type: Type.BOOLEAN },
                    isFastest: { type: Type.BOOLEAN }
                  },
                  required: ["store", "price", "eta", "availability"]
                }
              }
            },
            required: ["productName", "deals"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      console.error("Gemini Market Comparison Error:", error);
      return null;
    }
  },

  // Quantis Logic: Unified Refill Suggestions
  getRefillSuggestions: async (items: any[]): Promise<RefillSuggestion[]> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Quantis Mode: Review these medicine items and suggest which ones need to be refilled soon based on quantity and usage. Return JSON array of RefillSuggestion.
          Items: ${JSON.stringify(items)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
                urgency: { type: Type.STRING, enum: ["low", "medium", "high"] }
              },
              required: ["name", "reason", "urgency"]
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error: any) {
      console.error("Gemini Refill Suggestions Error:", error);
      return [];
    }
  },

  // Unified Chat: Routing based on Mode
  chatQuery: async (query: string, items: any[], mode: 'astra' | 'quantis' = 'astra'): Promise<string> => {
    try {
      const persona = mode === 'astra' 
        ? `Astra: Helpful, calm, conversational companion. Focus on reminders, inventory health, and care instructions. 
           Multilingual Support: If asked in Hindi, Telugu, or Kannada, respond or confirm you understand.
           Identity: Household AI Assistant.`
        : `Quantis: Logical, concise, data-driven mathematical engine. Focus on cost optimization, forecast metrics, and trend analysis. 
           Response Style: Use tables, bulleted metrics, and logical explanations.
           Identity: Analytical Intelligence Engine.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          System Persona: ${persona}
          Context (User Inventory): ${JSON.stringify(items)}. 
          
          User Query: "${query}"
          
          Guidelines:
          - Never diagnose or change dosages.
          - Astra: Use friendly formatting, markdown, and focus on "What, When, Who".
          - Quantis: Use tables, "Saving Potential", "Confidence Scores", and "Forecasting".
        `
      });

      return response.text || 'I am processing your data. Please rephrase your request.';
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429) {
        return "I'm temporarily over capacity. Please give me a minute to breathe and try again!";
      }
      return "I'm having trouble connecting to my AI processor. Please try again later.";
    }
  }
};;

