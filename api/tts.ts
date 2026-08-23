import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        const tts = new EdgeTTS({ voice: 'en-IN-PrabhatNeural' });
        const tempFilePath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.mp3`);
        
        await tts.ttsPromise(text, tempFilePath);
        
        const buffer = fs.readFileSync(tempFilePath);
        fs.unlinkSync(tempFilePath);
        
        res.status(200).json({ audio: buffer.toString('base64') });
    } catch (error: any) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: error.message || 'Speech synthesis failed' });
    }
}
