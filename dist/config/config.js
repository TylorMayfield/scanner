"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    streamUrl: process.env.STREAM_URL || '',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/police-scanner',
    logFilePath: process.env.LOG_FILE_PATH || path_1.default.join(process.cwd(), 'logs', 'scanner.log'),
    whisperModelPath: process.env.WHISPER_MODEL_PATH || path_1.default.join(process.cwd(), 'models', 'ggml-base.en.bin'),
    minDuration: parseInt(process.env.MIN_DURATION || '1', 10), // Minimum duration in seconds to trigger processing
    silenceThreshold: process.env.SILENCE_THRESHOLD || '-30dB', // ffmpeg silence threshold
    silenceDuration: parseFloat(process.env.SILENCE_DURATION || '1.5'), // Duration of silence to mark end of segment
};
