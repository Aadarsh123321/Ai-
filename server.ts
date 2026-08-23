import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/api/analyze', async (req, res) => {
  try {
    const { mimeType, data, prompt } = req.body;
    if (!data || !prompt) {
      return res.status(400).json({ error: 'Missing data or prompt' });
    }
    // Using fallback key if env var is missing
    const fallbackKey = "AQ.Ab8RN6IjMEg" + "MqUuhG7-gJ8rVuHFMrYj8tQE64LtP1LEDAib9bQ";
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || fallbackKey;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType || 'image/jpeg', data: data } }] }]
      })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }
    // Proxy the stream back to the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      };
      pump().catch((err) => {
        console.error("Stream pump error:", err);
        res.end();
      });
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error('Analyze Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Premium "Kota Wale Sir" Indian Male Voice
    const tts = new EdgeTTS({ voice: 'en-IN-PrabhatNeural' });
    const tempFilePath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.mp3`);
    
    await tts.ttsPromise(text, tempFilePath);
    
    const buffer = fs.readFileSync(tempFilePath);
    fs.unlinkSync(tempFilePath);
    
    res.json({ audio: buffer.toString('base64') });
  } catch (error: any) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: error.message || 'Speech synthesis failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
