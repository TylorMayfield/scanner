import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { config } from '../config/config';

// Simple Mongoose Schema
const LogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    text: String,
    audioFile: String,
    streamUrl: String
});

const LogModel = mongoose.model('Log', LogSchema);

export class Logger {
    constructor() {
        // Connect to Mongo
        if (config.mongoUri) {
            mongoose.connect(config.mongoUri) // Removed options as they are often defaults/deprecated in new driver
                .then(() => console.log('MongoDB connected'))
                .catch(err => console.error('MongoDB connection error:', err));
        }

        // Ensure log directory
        const logDir = path.dirname(config.logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    public async log(data: { text: string; audioFile?: string; timestamp?: number }) {
        const time = new Date(data.timestamp || Date.now());
        const timestampStr = time.toISOString();
        const line = `[${timestampStr}] ${data.text}\n`;

        // 1. File Log
        try {
            fs.appendFileSync(config.logFilePath, line);
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }

        // 2. MongoDB Log
        if (mongoose.connection.readyState === 1) {
            try {
                await LogModel.create({
                    timestamp: time,
                    text: data.text,
                    audioFile: data.audioFile,
                    streamUrl: config.streamUrl
                });
            } catch (err) {
                console.error('Failed to save to MongoDB:', err);
            }
        }

        // Console Log
        console.log(`[RAW] ${data.text}`);
    }
}
