import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    streamUrl: process.env.STREAM_URL || 'https://broadcastify.cdnstream1.com/45512',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/police-scanner',
    logFilePath: process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'scanner.log'),
    whisperModelPath: process.env.WHISPER_MODEL_PATH || path.join(process.cwd(), 'models', 'ggml-base.en.bin'),
    minDuration: parseInt(process.env.MIN_DURATION || '1', 10), // Minimum duration in seconds to trigger processing
    silenceThreshold: process.env.SILENCE_THRESHOLD || '-30dB', // ffmpeg silence threshold
    silenceDuration: parseFloat(process.env.SILENCE_DURATION || '1.5'), // Duration of silence to mark end of segment
};
