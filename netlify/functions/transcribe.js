import { transcribeVideo } from '../../src/lib/openai.js';
    import { uploadFile, createFolder } from '../../src/lib/google-drive.js';
    import { splitVideo } from '../../src/lib/ffmpeg.js';
    import path from 'path';
    import { fileURLToPath } from 'url';
    import fs from 'fs/promises';
    import { Readable } from 'stream';
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    export const handler = async (event) => {
      try {
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, body: 'Method Not Allowed' };
        }
    
        const boundary = event.headers['content-type'].match(/boundary=(.*)$/)[1];
        const body = Buffer.from(event.body, 'base64').toString('binary');
    
        const parts = body.split(`--${boundary}`);
        const filePart = parts.find((part) => part.includes('filename='));
    
        if (!filePart) {
          return { statusCode: 400, body: 'No file uploaded.' };
        }
    
        const filenameMatch = filePart.match(/filename="([^"]+)"/);
        const fileName = filenameMatch ? filenameMatch[1] : 'uploaded-file';
    
        const fileDataMatch = filePart.match(/Content-Type: video\/(mp4|webm|x-msvideo)\r\n\r\n([\s\S]*)/);
        if (!fileDataMatch) {
          return { statusCode: 400, body: 'Invalid file format' };
        }
    
        const fileData = Buffer.from(fileDataMatch[2], 'binary');
        const videoPath = path.join(__dirname, '..', '..', 'uploads', fileName);
        await fs.writeFile(videoPath, fileData);
    
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
    
        let progress = 0;
        const totalChunks = transcriptionPromises.length;
    
        const transcriptions = [];
        for (const [index, promise] of transcriptionPromises.entries()) {
          try {
            const transcriptionResult = await promise;
            progress = Math.round(((index + 1) / totalChunks) * 100);
            transcriptions.push(transcriptionResult);
          } catch (error) {
            console.error('Error during transcription:', error);
            return {
              statusCode: 500,
              body: JSON.stringify({ error: String(error) }),
            };
          }
        }
    
        // Combine transcriptions and upload to Google Drive
        const combinedTranscription = transcriptions.join('\n');
    
        const transcriptionFileName = `${fileName}-transcription.txt`;
        const transcriptionPath = path.join(
          __dirname,
          '..',
          '..',
          'uploads',
          transcriptionFileName
        );
        await fs.writeFile(transcriptionPath, combinedTranscription);
    
        await uploadFile(
          transcriptionPath,
          transcriptionFileName,
          transcriptionsFolderId
        );
    
        // Clean up temporary files
        await fs.unlink(videoPath);
        await fs.unlink(transcriptionPath);
        for (const chunkPath of chunkPaths) {
          await fs.unlink(chunkPath);
        }
    
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Transcription completed',
            transcriptions,
            uploadedVideo,
          }),
        };
      } catch (error) {
        console.error('Error during transcription:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: String(error) }),
        };
      }
    };
