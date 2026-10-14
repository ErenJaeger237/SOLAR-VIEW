import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK with standard User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Celestial Night Sky Vantage & Google Maps Grounding API
 * Uses gemini-3.8-flash with the googleMaps tool to locate nearby
 * astronomical observatories, planetariums, and dark sky spots,
 * providing verified Google Maps URLs and viewing coordinates.
 */
app.post('/api/sky-vantage', async (req, res) => {
  try {
    const { latitude, longitude, locationName } = req.body;

    const lat = typeof latitude === 'number' ? latitude : 37.7749; // Default San Francisco / user location
    const lng = typeof longitude === 'number' ? longitude : -122.4194;
    const locLabel = locationName || 'User Geographical Location';

    const prompt = `From the geographical location "${locLabel}" (coordinates: latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)}), provide recommendations for astronomical observatories, planetariums, and dark-sky parks or stargazing spots nearby on Google Maps. Explain how an observer standing at these Earth coordinates can spot the planets (Venus, Mars, Jupiter, Saturn) in the sky at this time of year (October 2026). Include advice on azimuth and horizon visibility.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      success: true,
      text,
      groundingChunks,
      coordinates: { latitude: lat, longitude: lng },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Maps Grounding Error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch Google Maps vantage data'
    });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 3000, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Solar System Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
