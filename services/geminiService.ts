import { GoogleGenAI, Type } from "@google/genai";
import { GridDimensions, CellValue } from "../types";

// Helper to convert blob/file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const scanBingoCard = async (
  base64Image: string, 
  dimensions: GridDimensions
): Promise<CellValue[][]> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process.env?.API_KEY as string | undefined) : undefined);
    if (!apiKey) throw new Error("Missing Gemini API key. Set VITE_GEMINI_API_KEY in your .env");
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Analyze this image of a Bingo card. It should be a grid with ${dimensions.rows} rows and ${dimensions.cols} columns.
      Extract the numbers into a JSON 2D array (rows x cols).
      - If a cell is a "Free Space", star, or empty, use the value 0.
      - Ensure the output is strictly a ${dimensions.rows}x${dimensions.cols} array of integers.
      - Return ONLY the JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg/png, standardizing request
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.INTEGER
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text returned from AI");

    const parsedData: number[][] = JSON.parse(jsonText);

    // Validate structure and convert 0 to null (internal representation for FREE)
    const normalizedData: CellValue[][] = parsedData.map(row => 
      row.map(num => (num === 0 ? null : num))
    );

    // Basic validation of dimensions (allow slight flexibility if AI returns close enough, but strictly pad/cut for safety)
    if (normalizedData.length < dimensions.rows) {
       // Pad rows if missing
       const missingRows = dimensions.rows - normalizedData.length;
       for(let i=0; i<missingRows; i++) {
         normalizedData.push(Array(dimensions.cols).fill(null));
       }
    }
    
    // Ensure exact columns
    const finalGrid = normalizedData.slice(0, dimensions.rows).map(row => {
        if (row.length < dimensions.cols) {
            return [...row, ...Array(dimensions.cols - row.length).fill(null)];
        }
        return row.slice(0, dimensions.cols);
    });

    return finalGrid;

  } catch (error) {
    console.error("Error scanning card:", error);
    throw error;
  }
};