import { GoogleGenAI, Type } from "@google/genai";
import type { Category } from '../types.ts';

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
    'flammable', 'solvent', 'alcohol', 'disinfectant', 'pesticide'
  ],
  Fertilizer: [
    'fertilizer', 'n-p-k', 'plant food', 'soil', 'compost', 'urea', 'phosphate', 'potash'
  ],
  'Personal Care': [
    'shampoo', 'hair oil', 'soap', 'body wash', 'deodorant', 'toothpaste', 'face wash',
    'lotion', 'moisturizer', 'sunscreen', 'makeup', 'perfume', 'brush', 'comb'
  ],
  Household: [
    'bulb', 'battery', 'tissue', 'towel', 'cleaner', 'garbage bag', 'tool', 'hardware'
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
  
  const categories: Category[] = ['Medicine', 'Supplement', 'Food', 'Chemical', 'Fertilizer', 'Personal Care', 'Household', 'Other'];

  // 1. Keyword Check (Fast)
  for (const category of categories) {
    if (category === 'Other') continue;
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords && keywords.some(kw => combined.includes(kw))) {
      return category;
    }
  }
  
  // 2. AI Fallback (Optional/Smart)
  const client = getAI();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Classify this household item: "${name} ${description}". 
        Respond with exactly one label from these categories: ${categories.join(', ')}.`,
        config: {
          responseMimeType: "text/plain"
        }
      });
      
      const category = response.text?.trim() as Category;
      
      if (categories.includes(category)) {
        return category;
      }
    } catch (e) {
      console.error("AI Classification failed", e);
    }
  }
  
  return 'Other';
};
