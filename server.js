import express from 'express';
import dotenv from 'dotenv';
import { transcribeVideo } from './src/lib/openai.js';
import { uploadFile, createFolder } from './src/lib/google-drive.js';
import { splitVideo } from './src/lib/ffmpeg.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

dotenv.config();

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(express.json());

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const videoPath = req.file.path;
    const fileName = req.file.originalname;

    // Create folders in Google Drive
    const videoFolderId = await createFolder('videos');
    const chunksFolderId = await createFolder('chunks');
    const transcriptionsFolderId = await createFolder('transcriptions');

    // Upload original video to Google Drive
    const uploadedVideo = await uploadFile(
      videoPath,
      fileName,
      videoFolderId
    );

    // Split video into chunks
    const chunkPaths = await splitVideo(videoPath, fileName);

    // Upload chunks to Google Drive and transcribe
    const transcriptionPromises = chunkPaths.map(async (chunkPath, index) => {
      const chunkName = `${fileName}-chunk-${index + 1}.mp4`;
      const uploadedChunk = await uploadFile(
        chunkPath,
        chunkName,
        chunksFolderId
      );
      const transcription = await transcribeVideo(chunkPath);
      return {
        chunkName,
        transcription,
      };
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let progress = 0;
    const totalChunks = transcriptionPromises.length;

    for (const [index, promise] of transcriptionPromises.entries()) {
      try {
        const transcriptionResult = await promise;
        progress = Math.round(((index + 1) / totalChunks) * 100);
        res.write(`data: ${JSON.stringify({ progress, transcriptionResult })}\n\n`);
      } catch (error) {
        console.error('Error during transcription:', error);
        res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
      }
    }

    // Combine transcriptions and upload to Google Drive
    const combinedTranscription = (await Promise.all(transcriptionPromises))
      .map((item) => item.transcription)
      .join('\n');

    const transcriptionFileName = `${fileName}-transcription.txt`;
    const transcriptionPath = path.join(
      __dirname,
      'uploads',
      transcriptionFileName
    );
    await fs.writeFile(transcriptionPath, combinedTranscription);

    await uploadFile(
      transcriptionPath,
      transcriptionFileName,
      transcriptionsFolderId
    );

    res.write(`data: ${JSON.stringify({ message: 'Transcription completed', uploadedVideo })}\n\n`);
    res.end();

    // Clean up temporary files
    await fs.unlink(videoPath);
    await fs.unlink(transcriptionPath);
    for (const chunkPath of chunkPaths) {
      await fs.unlink(chunkPath);
    }
  } catch (error) {
    console.error('Error during transcription:', error);
    res.status(500).send('Transcription failed.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
