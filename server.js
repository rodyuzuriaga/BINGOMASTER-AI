import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/api/gemini/scan', async (req, res) => {
  const { image, dimensions } = req.body ?? {};
  console.log('[api/scan] request received - dimensions:', dimensions ? `${dimensions.rows}x${dimensions.cols}` : 'missing');
  if (!image) return res.status(400).json({ error: 'Missing image' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Development fallback: return a mock detection for quick testing
    console.log('[api/scan] no GEMINI_API_KEY present; returning mocked detection for dev');
    const rows = dimensions?.rows ?? 5;
    const cols = dimensions?.cols ?? 5;
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ((r * cols + c + 1) % 75) + 1)
    ).map(row => row.map(n => (n === 0 ? null : n)));
    return res.json({ rows, cols, grid });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const detect = !dimensions;
    const prompt = detect ?
      `Detect the grid size (rows and columns) of the Bingo card in the provided image, then extract the numbers into a JSON object {"rows": <n>, "cols": <m>, "grid": [[...]]}. Use 0 for free spaces. Return ONLY the JSON object.` :
      `Extract a ${dimensions.rows}x${dimensions.cols} bingo grid from the image and return a JSON array of integers (0 for free). Return ONLY JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: { type: Type.ARRAY }
      }
    });

    const parsed = JSON.parse(response.text);
    let rows = dimensions?.rows;
    let cols = dimensions?.cols;
    let rawGrid;

    if (Array.isArray(parsed)) {
      rawGrid = parsed;
      rows = rows ?? rawGrid.length;
      cols = cols ?? (rawGrid[0]?.length ?? 0);
    } else if (parsed && parsed.grid) {
      rawGrid = parsed.grid;
      rows = parsed.rows ?? rawGrid.length;
      cols = parsed.cols ?? (rawGrid[0]?.length ?? 0);
    } else {
      throw new Error('Unexpected response from AI');
    }

    const normalized = rawGrid.map((row) => row.map((n) => (n === 0 ? null : n)));
    // Ensure exact dims
    if (normalized.length < rows) {
      for (let i = normalized.length; i < rows; i++) normalized.push(Array(cols).fill(null));
    }
    const finalGrid = normalized.slice(0, rows).map(row => {
      if (row.length < cols) return [...row, ...Array(cols - row.length).fill(null)];
      return row.slice(0, cols);
    });

    res.json({ rows, cols, grid: finalGrid });
  } catch (err) {
    console.error('API scan error:', err);
    res.status(500).json({ error: 'scan-failed' });
  }
});

const port = process.env.API_PORT || 3001;
app.listen(port, () => console.log(`Dev API listening on http://localhost:${port}`));
