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
      `STRICT INSTRUCTIONS: Analyze the provided image. If it is NOT a Bingo card with a visible grid of numbers, return {"error": "not_a_bingo_card"}. If it IS a valid Bingo card, detect the exact grid size (rows and columns), then extract ALL visible numbers into a JSON object with this EXACT structure: {"rows": <number>, "cols": <number>, "grid": [[array of integers]]}. Use 0 for free spaces or empty cells. Return ONLY valid JSON, no additional text.` :
      `STRICT INSTRUCTIONS: Extract ALL numbers from this ${dimensions.rows}x${dimensions.cols} Bingo card grid. Return a JSON array of ${dimensions.rows} rows, each containing ${dimensions.cols} integers. Use 0 for free spaces or empty cells. If the image is not a valid Bingo card, return {"error": "not_a_bingo_card"}. Return ONLY valid JSON, no additional text.`;

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
    
    // Check if AI detected error
    if (parsed.error) {
      console.log('AI reported error:', parsed.error);
      return res.status(400).json({ error: parsed.error === 'not_a_bingo_card' ? 'La imagen no parece ser una cartilla de bingo válida. Por favor sube una foto clara de una cartilla.' : parsed.error });
    }

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
      console.error('unexpected AI response structure:', parsed);
      return res.status(500).json({ error: 'No se pudo interpretar la respuesta del modelo. Intenta con una foto más clara.' });
    }

    // Validate grid is not empty
    if (!rawGrid || rawGrid.length === 0 || !rows || !cols) {
      console.error('empty or invalid grid detected');
      return res.status(400).json({ error: 'No se detectó ninguna grilla válida en la imagen.' });
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
