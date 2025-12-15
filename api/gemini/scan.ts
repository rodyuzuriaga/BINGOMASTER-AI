import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// Handler for POST /api/gemini/scan
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, dimensions } = req.body ?? {};
  if (!image || !dimensions) return res.status(400).json({ error: 'Missing image or dimensions' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });

  try {
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
              mimeType: 'image/jpeg',
              data: image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
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
    if (!jsonText) throw new Error('No text returned from AI');

    const parsedData: number[][] = JSON.parse(jsonText);

    const normalizedData = parsedData.map((row: number[]) => row.map(num => (num === 0 ? null : num)));

    // Pad/cut to exact dimensions
    if (normalizedData.length < dimensions.rows) {
      const missingRows = dimensions.rows - normalizedData.length;
      for (let i = 0; i < missingRows; i++) normalizedData.push(Array(dimensions.cols).fill(null));
    }

    const finalGrid = normalizedData.slice(0, dimensions.rows).map((row: any[]) => {
      if (row.length < dimensions.cols) return [...row, ...Array(dimensions.cols - row.length).fill(null)];
      return row.slice(0, dimensions.cols);
    });

    res.status(200).json({ grid: finalGrid });
  } catch (error) {
    console.error('Server scan error:', error);
    res.status(500).json({ error: 'Failed to scan card' });
  }
}
