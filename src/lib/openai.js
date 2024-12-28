import OpenAI from 'openai';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeVideo(filePath) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: await fs.readFile(filePath),
      model: 'whisper-1',
    });
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing video:', error);
    throw error;
  }
}

export { transcribeVideo };
