"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transcriber = void 0;
const whisper_node_1 = __importDefault(require("whisper-node"));
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
class Transcriber extends events_1.EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.isProcessing = false;
    }
    addToQueue(filePath) {
        this.queue.push(filePath);
        this.processQueue();
    }
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0)
            return;
        this.isProcessing = true;
        const filePath = this.queue.shift();
        if (filePath) {
            try {
                console.log(`Transcribing: ${path_1.default.basename(filePath)}...`);
                // whisper-node expects the file path.
                // It usually returns a promise with the result.
                // Note: The library API might vary slightly, treating it as the standard one here.
                // Assuming whisper(filePath, options)
                // For simplicity with this specific library wrapper:
                // often it's: const result = await whisper(filePath);
                // or similar. I'll stick to the common pattern.
                // If it fails, we catch it.
                const result = await (0, whisper_node_1.default)(filePath); // default model is usually 'tiny' or 'base'
                if (result && result.length > 0) {
                    // Result is often an array of segments or a string.
                    const text = typeof result === 'string' ? result : JSON.stringify(result);
                    const cleanText = this.cleanText(text);
                    if (cleanText) {
                        this.emit('transcription', {
                            text: cleanText,
                            audioFile: filePath,
                            timestamp: Date.now()
                        });
                    }
                }
                // Clean up file if needed? Or keep for archival?
                // Let's keep it for now or move to an 'archive' folder.
                // For this task, we can just leave it in temp.
            }
            catch (err) {
                console.error(`Transcription error on ${filePath}:`, err.message || err);
            }
            finally {
                this.isProcessing = false;
                // Process next item
                this.processQueue();
            }
        }
    }
    cleanText(text) {
        // Remove [SOUND], [BLANK], etc if whisper outputs them
        let t = text.replace(/\[.*?\]/g, '').trim();
        return t;
    }
}
exports.Transcriber = Transcriber;
