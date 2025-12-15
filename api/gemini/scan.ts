import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// Handler for POST /api/gemini/scan
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, dimensions } = req.body ?? {};
  if (!image) return res.status(400).json({ error: 'Missing image' });

  const apiKey = process.env.GEMINI_API_KEY;
  try {
    if (!apiKey) {
      // If no key, return mocked detection for development
      const rows = dimensions?.rows ?? 5;
      const cols = dimensions?.cols ?? 5;
      const grid = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ((r * cols + c + 1) % 75) + 1)
      ).map(row => row.map(n => (n === 0 ? null : n)));
      return res.status(200).json({ rows, cols, grid });
    }

    const ai = new GoogleGenAI({ apiKey });
    const detect = !dimensions;
    const prompt = detect ?
      `Detect the grid size (rows and columns) of the Bingo card in the provided image, then extract the numbers into a JSON object {"rows": <n>, "cols": <m>, "grid": [[...]]}. Use 0 for free spaces. Return ONLY the JSON object.` :
      `Analyze this image of a Bingo card. It should be a grid with ${dimensions.rows} rows and ${dimensions.cols} columns. Extract the numbers into a JSON 2D array (rows x cols). Use 0 for free spaces. Return ONLY the JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error('No text returned from AI');

    const parsed = JSON.parse(jsonText);
    // parsed can either be an array (grid) or an object {rows, cols, grid}
    let rows = dimensions?.rows;
    let cols = dimensions?.cols;
    let rawGrid: number[][];

    if (Array.isArray(parsed)) {
      rawGrid = parsed as number[][];
      rows = rows ?? rawGrid.length;
      cols = cols ?? (rawGrid[0]?.length ?? 0);
    } else if (parsed && parsed.grid) {
      rawGrid = parsed.grid as number[][];
      rows = parsed.rows ?? rawGrid.length;
      cols = parsed.cols ?? (rawGrid[0]?.length ?? 0);
    } else {
      throw new Error('Unexpected response from AI');
    }

    const normalized = rawGrid.map((row: number[]) => row.map(n => (n === 0 ? null : n)));

    // Ensure exact dimensions
    if (normalized.length < rows) {
      for (let i = normalized.length; i < rows; i++) normalized.push(Array(cols).fill(null));
    }
    const finalGrid = normalized.slice(0, rows).map(row => {
      if (row.length < cols) return [...row, ...Array(cols - row.length).fill(null)];
      return row.slice(0, cols);
    });

    return res.status(200).json({ rows, cols, grid: finalGrid });
  } catch (error) {
    console.error('Server scan error:', error);
    res.status(500).json({ error: 'Failed to scan card' });
  }
}
