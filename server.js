import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

// Load local env file for development (not committed)
dotenv.config({ path: '.env.local' });

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
        responseMimeType: 'application/json',
        responseSchema: { type: Type.ARRAY }
      }
    });

    if (process.env.DEBUG_AI_RESPONSE === 'true') {
      console.log('[api/scan] raw AI response:', response.text);
    }

    // Helper: try to extract JSON object or array from a mixed response
    const extractJSON = (text) => {
      text = text.trim();
      if (!text) return null;
      // If looks like pure JSON, return it
      if ((text[0] === '{' && text[text.length - 1] === '}') || (text[0] === '[' && text[text.length - 1] === ']')) {
        return text;
      }
      // Try to locate first { ... } or [ ... ] block
      const firstObj = text.indexOf('{');
      const firstArr = text.indexOf('[');
      let start = -1, end = -1;
      if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
        start = firstObj;
        end = text.lastIndexOf('}');
      } else if (firstArr !== -1) {
        start = firstArr;
        end = text.lastIndexOf(']');
      }
      if (start !== -1 && end !== -1 && end > start) return text.substring(start, end + 1);
      return null;
    };

    const raw = extractJSON(response.text);
    if (!raw) {
      if (process.env.DEBUG_AI_RESPONSE === 'true') console.error('[api/scan] could not extract JSON from AI response');
      throw new Error('No JSON found in AI response');
    }
    const parsed = JSON.parse(raw);
    
    // Check if AI detected error
    if (parsed.error) {
      console.log('[api/scan] AI reported error:', parsed.error);
      return res.status(400).json({ error: parsed.error === 'not_a_bingo_card' ? 'La imagen no parece ser una cartilla de bingo válida. Por favor sube una foto clara de una cartilla.' : parsed.error });
    }

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
      console.error('[api/scan] unexpected AI response structure:', parsed);
      return res.status(500).json({ error: 'No se pudo interpretar la respuesta del modelo. Intenta con una foto más clara.' });
    }

    // Validate grid is not empty
    if (!rawGrid || rawGrid.length === 0 || !rows || !cols) {
      console.error('[api/scan] empty or invalid grid detected');
      return res.status(400).json({ error: 'No se detectó ninguna grilla válida en la imagen.' });
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
