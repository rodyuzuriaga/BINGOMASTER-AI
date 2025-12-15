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
  dimensions?: GridDimensions
): Promise<{ grid: CellValue[][]; rows?: number; cols?: number }> => {
  try {
    const payload: any = { image: base64Image };
    if (dimensions) payload.dimensions = dimensions;

    const res = await fetch('/api/gemini/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Scan failed: ${txt}`);
    }

    const data = await res.json();
    return { grid: data.grid as CellValue[][], rows: data.rows, cols: data.cols };
  } catch (error) {
    console.error('Error scanning card (client):', error);
    throw error;
  }
};