"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config/config");
// Simple Mongoose Schema
const LogSchema = new mongoose_1.default.Schema({
    timestamp: { type: Date, default: Date.now },
    text: String,
    audioFile: String,
    streamUrl: String
});
const LogModel = mongoose_1.default.model('Log', LogSchema);
class Logger {
    constructor() {
        // Connect to Mongo
        if (config_1.config.mongoUri) {
            mongoose_1.default.connect(config_1.config.mongoUri) // Removed options as they are often defaults/deprecated in new driver
                .then(() => console.log('MongoDB connected'))
                .catch(err => console.error('MongoDB connection error:', err));
        }
        // Ensure log directory
        const logDir = path_1.default.dirname(config_1.config.logFilePath);
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
    }
    async log(data) {
        const time = new Date(data.timestamp || Date.now());
        const timestampStr = time.toISOString();
        const line = `[${timestampStr}] ${data.text}\n`;
        // 1. File Log
        try {
            fs_1.default.appendFileSync(config_1.config.logFilePath, line);
        }
        catch (err) {
            console.error('Failed to write to log file:', err);
        }
        // 2. MongoDB Log
        if (mongoose_1.default.connection.readyState === 1) {
            try {
                await LogModel.create({
                    timestamp: time,
                    text: data.text,
                    audioFile: data.audioFile,
                    streamUrl: config_1.config.streamUrl
                });
            }
            catch (err) {
                console.error('Failed to save to MongoDB:', err);
            }
        }
        // Console Log
        console.log(`[RAW] ${data.text}`);
    }
}
exports.Logger = Logger;
