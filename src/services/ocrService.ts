import { createWorker } from 'tesseract.js';

export interface OCRResult {
  name: string;
  expiryDate: string;
  confidence: number;
  rawText: string;
}

export const ocrService = {
  processImage: async (imageFile: File): Promise<OCRResult> => {
    const worker = await createWorker('eng');
    
    try {
      const { data: { text, confidence } } = await worker.recognize(imageFile);
      await worker.terminate();

      const parsed = ocrService.parseExtractedText(text);
      
      return {
        ...parsed,
        confidence: Math.round(confidence),
        rawText: text
      };
    } catch (error) {
      await worker.terminate();
      throw error;
    }
  },

  parseExtractedText: (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Date Patterns
    // 1. DD/MM/YYYY or MM/DD/YYYY
    // 2. YYYY-MM-DD
    // 3. MM/YYYY
    // 4. DD-MM-YYYY
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      /(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/,
      /(\d{1,2})[\/\-](\d{4})/,
      /(\d{1,2})[-](\d{1,2})[-](\d{4})/
    ];

    let detectedExpiry = '';
    
    // Heuristic for name: Usually the longest non-date line in the top half
    // or the FIRST line that doesn't look like code/date.
    let detectedName = '';

    for (const line of lines) {
      if (!detectedExpiry) {
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match) {
            detectedExpiry = match[0];
            break;
          }
        }
      }
    }

    const cleanedLines = lines.filter(line => {
      const isDate = datePatterns.some(p => p.test(line));
      const hasTooManySymbols = (line.match(/[^a-zA-Z0-9\s]/g) || []).length > line.length * 0.3;
      return !isDate && !hasTooManySymbols && line.length > 2;
    });

    if (cleanedLines.length > 0) {
      // Sort by length or position. Usually the name is prominent (longer or starts with caps)
      detectedName = cleanedLines[0];
      // If the first line is very short, maybe the second line is the name
      if (detectedName.length < 5 && cleanedLines[1]) {
        detectedName = cleanedLines[1];
      }
    } else {
      detectedName = 'Unknown Product';
    }

    return {
      name: detectedName,
      expiryDate: detectedExpiry
    };
  }
};
