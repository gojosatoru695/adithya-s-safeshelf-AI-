import { GoogleGenAI, Type } from "@google/genai";

export type Category = 'Medicine' | 'Food' | 'Supplement' | 'Chemical' | 'Other';

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Medicine: [
    'tablet', 'capsule', 'pill', 'syrup', 'mg', 'mcg', 'dose', 'prescription', 
    'antibiotic', 'painkiller', 'aspirin', 'paracetamol', 'ibuprofen', 'anti-inflammatory',
    'ointment', 'injection', 'vaccine', 'treatment', 'pharma', 'clinic'
  ],
  Food: [
    'milk', 'bread', 'cereal', 'flour', 'sugar', 'salt', 'oil', 'organic', 'fresh',
    'frozen', 'canned', 'juice', 'snack', 'drink', 'beverage', 'meat', 'dairy',
    'kcal', 'protein', 'fat', 'carb', 'nutrition'
  ],
  Supplement: [
    'vitamin', 'multivitamin', 'protein powder', 'creatine', 'omega-3', 'fish oil',
    'herbal', 'extract', 'magnesium', 'zinc', 'probiotic', 'fiber', 'collagen'
  ],
  Chemical: [
    'cleaner', 'bleach', 'detergent', 'acid', 'alkali', 'toxic', 'corrosive',
    'flammable', 'solvent', 'alcohol', 'disinfectant', 'pesticide', 'fertilizer'
  ],
  Other: []
};

// Lazy initialization of Gemini
let ai: any = null;
const getAI = () => {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

export const classifyItem = async (name: string, description: string = ''): Promise<Category> => {
  const combined = (name + ' ' + description).toLowerCase();
  
  // 1. Keyword Check (Fast)
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Other') continue;
    if (keywords.some(kw => combined.includes(kw))) {
      return category as Category;
    }
  }
  
  // 2. AI Fallback (Optional/Smart)
  const client = getAI();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Classify this household item: "${name} ${description}". 
        Respond with exactly one word from these categories: Medicine, Food, Supplement, Chemical, Other.`,
        config: {
          responseMimeType: "text/plain"
        }
      });
      
      const category = response.text?.trim() as Category;
      
      if (['Medicine', 'Food', 'Supplement', 'Chemical', 'Other'].includes(category)) {
        return category;
      }
    } catch (e) {
      console.error("AI Classification failed", e);
    }
  }
  
  return 'Other';
};
