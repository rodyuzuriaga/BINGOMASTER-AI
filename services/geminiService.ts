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
    const res = await fetch('/api/gemini/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, dimensions })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Scan failed: ${txt}`);
    }

    const data = await res.json();
    return data.grid as CellValue[][];
  } catch (error) {
    console.error('Error scanning card (client):', error);
    throw error;
  }
};