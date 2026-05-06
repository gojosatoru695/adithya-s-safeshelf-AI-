import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Simple in-memory cache to prevent redundant calls in the same session
const aiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Utility for exponential backoff retry logic
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.message?.includes('429') || error.status === 429 || JSON.stringify(error).includes('429');
    
    if (isRateLimit && retries > 0) {
      console.warn(`Gemini Rate Limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

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
  // Elysia Logic: Risk & Safety with high-empathy clarity
  analyzeRisk: async (items: any[], mode: 'astra' | 'quantis' = 'astra'): Promise<RiskAnalysis> => {
    const cacheKey = `risk_${mode}_${JSON.stringify(items)}`;
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

    try {
      const persona = mode === 'astra' 
        ? "Elysia (SafeShelf Assistant): Focus on safety, elder-care clarity, and simple warnings. Use calm, helpful language."
        : "Quantis (Analytical Engine): Focus on data reliability, interaction probability, and precise risk scoring.";

      const data = await withRetry(async () => {
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
      });

      aiCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429 || JSON.stringify(error).includes('429')) {
        console.warn("Gemini Rate Limit Exhausted");
        return { score: 0, status: "Capacity Limit", alerts: ["AI analysis is momentarily paused due to high traffic."] };
      }
      console.error("Gemini Risk Analysis Error:", error);
      return { score: 100, status: "Analysis Error", alerts: ["Unable to verify safety protocols at this moment."] };
    }
  },

  // Elysia Logic: Review Summaries
  getReviewSummary: async (productName: string): Promise<any> => {
    const cacheKey = `review_${productName.toLowerCase()}`;
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

    try {
      const data = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Elysia Mode: Summarize product reviews for "${productName}" using the following structure. Search for recent real reviews to ensure accuracy. Use helpful, human-friendly summaries. Tags: Value for Money, Quality, Packaging, Delivery, Trust, Taste, User Satisfaction.`,
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
      });

      aiCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error: any) {
      console.error("Gemini Review Summary Error:", error);
      return null;
    }
  },

  // Quantis Logic: Market Comparison & Optimization
  getMarketComparison: async (productName: string): Promise<any> => {
    const cacheKey = `market_${productName.toLowerCase()}`;
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

    try {
      const data = await withRetry(async () => {
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
      });

      aiCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error: any) {
      console.error("Gemini Market Comparison Error:", error);
      return null;
    }
  },

  // Quantis Logic: Unified Refill Suggestions
  getRefillSuggestions: async (items: any[]): Promise<RefillSuggestion[]> => {
    if (!items || items.length === 0) return [];
    
    const cacheKey = `refills_${JSON.stringify(items.map(i => i.id + i.quantity))}`;
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

    try {
      const data = await withRetry(async () => {
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
      });

      aiCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error: any) {
      console.error("Gemini Refill Suggestions Error:", error);
      return [];
    }
  },

  // Elysia Logic: Prescription Analysis (Smart Intake)
  analyzePrescription: async (imageData: string): Promise<any[]> => {
    try {
      const response = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              inlineData: {
                data: imageData.split(',')[1],
                mimeType: "image/jpeg"
              }
            },
            {
              text: `Elysia Mode: Extract a list of medicines from this doctor's prescription. 
              For each medicine, identify:
              1. Name
              2. Dosage (e.g., 500mg, 1 cap)
              3. Timings (Morning, Afternoon, Evening, Night) - look for 1-0-1 or similar notations.
              4. Meal relation (Before Food, After Food, Empty Stomach, None)
              5. Duration (e.g., 5 days, 1 month)
              6. Notes
              
              Safety Rules: 
              - Return an empty list if no medicines are found.
              - Never guess. Only extract visible text. 
              - Return JSON array.`
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  timings: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING, enum: ["Morning", "Afternoon", "Evening", "Night"] } 
                  },
                  meal: { type: Type.STRING, enum: ["Before Food", "After Food", "Empty Stomach", "None"] },
                  duration: { type: Type.STRING },
                  notes: { type: Type.STRING }
                },
                required: ["name", "timings", "meal"]
              }
            }
          }
        });
        return JSON.parse(response.text || '[]');
      });
      return response;
    } catch (error) {
      console.error("Prescription Analysis Error:", error);
      return [];
    }
  },

  // Voice Action Logic: Intent Detection
  processVoiceCommand: async (transcript: string, medicines: any[], language: string = 'English'): Promise<{
    action: 'ADD_ITEM' | 'DELETE_ITEM' | 'QUERY_INVENTORY' | 'SET_REMINDER' | 'SCAN_PRESCRIPTION' | 'SHOW_ANALYTICS' | 'LOG_DOSE' | 'UPDATE_QUANTITY' | 'SEARCH' | 'LIST_EXPIRY' | 'SET_CUSTOM_ALARM' | 'NONE';
    target?: string;
    entities?: {
      item_name?: string;
      quantity?: number;
      time?: string;
      date?: string;
      unit?: string;
      message?: string;
    };
    message: string;
    confirmedRequired: boolean;
  }> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are Elysia, a fast, reliable medical voice assistant for the SafeShelf app. 
        Your goal is to parse user voice commands into structured actions.
        
        User Language: ${language}
        Transcript: "${transcript}"
        Active Inventory: ${JSON.stringify(medicines.map(m => ({ id: m.id, name: m.name, quantity: m.quantity })))}
        
        Intents Mapping:
        1. ADD_ITEM: "add crocin", "add 2 paracetamol" -> extract {item_name, quantity, unit}
        2. DELETE_ITEM: "delete crocin", "remove expired" -> extract {item_name}
        3. QUERY_INVENTORY: "show meds", "what do I have"
        4. SEARCH: "find crocin", "search for insulin" -> extract {item_name}
        5. SET_REMINDER: "remind me at 9 PM for dolo" -> extract {item_name, time: "21:00"}
        6. UPDATE_QUANTITY: "update crocin to 5" -> extract {item_name, quantity: 5}
        7. LIST_EXPIRY: "what expires this week", "show expired"
        8. SCAN_PRESCRIPTION: "scan paper", "add from prescription"
        9. SHOW_ANALYTICS: "show stock analytics", "refill priorities"
        10. LOG_DOSE: "I took my crocin 500" -> extract {item_name}
        11. SET_CUSTOM_ALARM: "set custom message for crocin take after food" -> extract {item_name, message}
        
        RULES:
        - confirmedRequired must be true for DELETE_ITEM or large quantity changes.
        - 'message' should be short, friendly, and in ${language} (e.g., "Crocin added", "Finding your insulin...").
        - Always prefer matching to existing items in inventory if names are similar.
        
        Return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ['ADD_ITEM', 'DELETE_ITEM', 'QUERY_INVENTORY', 'SET_REMINDER', 'SCAN_PRESCRIPTION', 'SHOW_ANALYTICS', 'LOG_DOSE', 'UPDATE_QUANTITY', 'SEARCH', 'LIST_EXPIRY', 'SET_CUSTOM_ALARM', 'NONE'] },
              target: { type: Type.STRING, description: "Medicine ID if matched" },
              entities: {
                type: Type.OBJECT,
                properties: {
                  item_name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  time: { type: Type.STRING },
                  date: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  message: { type: Type.STRING }
                }
              },
              message: { type: Type.STRING },
              confirmedRequired: { type: Type.BOOLEAN }
            },
            required: ["action", "message", "confirmedRequired"]
          }
        }
      });
      return JSON.parse(response.text || '{"action": "NONE", "message": "I didn\'t catch that.", "confirmedRequired": false}');
    } catch (error) {
      console.error("Elysia Parser Error:", error);
      return { action: 'NONE', message: "Processing error.", confirmedRequired: false };
    }
  },

  // Unified Chat: Routing based on Mode
  chatQuery: async (query: string, items: any[], mode: 'astra' | 'quantis' = 'astra'): Promise<string> => {
    try {
      const persona = mode === 'astra' 
        ? `Elysia: Helpful, calm, conversational companion with action-oriented intelligence. Focus on reminders, inventory health, and care instructions. 
           Multilingual Support: If asked in Hindi, Telugu, or Kannada, respond or confirm you understand.
           Identity: Household AI Assistant.`
        : `Quantis: Logical, concise, data-driven mathematical engine. Focus on cost optimization, forecast metrics, and trend analysis. 
           Response Style: Use tables, bulleted metrics, and logical explanations.
           Identity: Analytical Intelligence Engine.`;

      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `
            System Persona: ${persona}
            Context (User Inventory): ${JSON.stringify(items)}. 
            
            User Query: "${query}"
            
            Guidelines:
            - Never diagnose or change dosages.
            - Elysia: Use friendly formatting, markdown, and focus on "What, When, Who".
            - Quantis: Use tables, "Saving Potential", "Confidence Scores", and "Forecasting".
          `
        });
      });

      return response.text || 'I am processing your data. Please rephrase your request.';
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429 || JSON.stringify(error).includes('429')) {
        return "I'm temporarily over capacity. Please give me a second to process and try again!";
      }
      return "I'm having trouble connecting to my AI processor. Please try again later.";
    }
  }
};;

