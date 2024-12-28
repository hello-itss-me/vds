import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const googleDrive = google.drive({ version: 'v3' });

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '..', '..', 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function createFolder(folderName) {
  try {
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const folder = await googleDrive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

async function uploadFile(filePath, fileName, parentFolderId) {
  try {
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const fileMetadata = {
      name: fileName,
      parents: [parentFolderId],
    };

    const media = {
      mimeType: 'video/mp4',
      body: await fs.readFile(filePath),
    };

    const file = await googleDrive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    return file.data.id;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export { uploadFile, createFolder };
