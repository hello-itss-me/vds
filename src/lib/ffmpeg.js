import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import ffmpeg from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

async function splitVideo(videoPath, fileName) {
  try {
    const outputDir = path.join(__dirname, '..', '..', 'uploads');
    const chunkDuration = 600; // 10 minutes in seconds
    const outputPattern = path.join(
      outputDir,
      `${fileName}-chunk-%03d.mp4`
    );

    const command = `"${ffmpeg}" -i "${videoPath}" -c copy -map 0 -segment_time ${chunkDuration} -f segment -reset_timestamps 1 "${outputPattern}"`;

    await execAsync(command);

    const files = await fs.promises.readdir(outputDir);
    const chunkPaths = files
      .filter((file) => file.startsWith(`${fileName}-chunk-`) && file.endsWith('.mp4'))
      .map((file) => path.join(outputDir, file));

    return chunkPaths;
  } catch (error) {
    console.error('Error splitting video:', error);
    throw error;
  }
}

export { splitVideo };
