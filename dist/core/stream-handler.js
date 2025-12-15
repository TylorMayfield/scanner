"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamHandler = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const events_1 = require("events");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config/config");
class StreamHandler extends events_1.EventEmitter {
    constructor() {
        super();
        this.isRecording = false;
        this.buffer = [];
        this.silenceStart = null;
        this.speaking = false;
        this.command = null;
        this.reconnectTimer = null;
        this.ensureDirs();
    }
    ensureDirs() {
        const tempDir = path_1.default.join(process.cwd(), 'temp_chunks');
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
    }
    start() {
        if (!config_1.config.streamUrl) {
            console.error('No stream URL configured!');
            return;
        }
        console.log(`Connecting to stream: ${config_1.config.streamUrl}`);
        this.command = (0, fluent_ffmpeg_1.default)(config_1.config.streamUrl)
            .audioFrequency(16000)
            .audioChannels(1)
            .format('s16le') // Raw PCM 16-bit little endian
            .on('error', (err) => {
            console.error('Stream error:', err.message);
            this.handleDisconnect();
        })
            .on('end', () => {
            console.log('Stream ended');
            this.handleDisconnect();
        });
        const stream = this.command.pipe();
        stream.on('data', (chunk) => {
            this.processAudioData(chunk);
        });
        console.log('Stream connected and listening...');
    }
    handleDisconnect() {
        if (this.reconnectTimer)
            return;
        this.emit('disconnect');
        console.log('Attempting verify/reconnect in 5 seconds...');
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.start();
        }, 5000);
    }
    processAudioData(chunk) {
        // Calculate RMS of the chunk to detect volume
        const rms = this.calculateRMS(chunk);
        // Simple threshold check. PCM 16bit goes from -32768 to 32767.
        // Silence is usually near 0. Let's pick a threshold. 
        // 500 is roughly -36dB relative to full scale, conservative.
        // config.silenceThreshold is in dB, we might need to parse it or just use a raw number for now.
        const threshold = 300;
        if (rms > threshold) {
            // Sound detected
            this.speaking = true;
            this.silenceStart = null;
            this.buffer.push(chunk);
        }
        else {
            // Silence
            if (this.speaking) {
                if (!this.silenceStart) {
                    this.silenceStart = Date.now();
                }
                const silenceDuration = (Date.now() - this.silenceStart) / 1000;
                // Keep buffering during short pauses
                this.buffer.push(chunk);
                if (silenceDuration > config_1.config.silenceDuration) {
                    // Silence has lasted long enough, flush logic
                    this.flushBuffer();
                    this.speaking = false;
                    this.silenceStart = null;
                }
            }
        }
    }
    calculateRMS(buffer) {
        let sum = 0;
        // 16-bit audio, 2 bytes per sample
        for (let i = 0; i < buffer.length; i += 2) {
            const int = buffer.readInt16LE(i);
            sum += int * int;
        }
        const sampleCount = buffer.length / 2;
        return Math.sqrt(sum / sampleCount);
    }
    flushBuffer() {
        if (this.buffer.length === 0)
            return;
        const totalLength = this.buffer.reduce((acc, b) => acc + b.length, 0);
        // Basic check for min duration (16000 samples/sec * 2 bytes = 32000 bytes/sec)
        // If total bytes < minDuration * 32000, ignore (too short)
        if (totalLength < config_1.config.minDuration * 32000) {
            this.buffer = [];
            return;
        }
        const fullBuffer = Buffer.concat(this.buffer);
        this.buffer = [];
        // Save to WAV file
        const timestamp = Date.now();
        const filename = path_1.default.join(process.cwd(), 'temp_chunks', `chunk_${timestamp}.wav`);
        // We need to write a WAV header + PCM data. 
        // Or simply use ffmpeg to write it, but writing raw PCM + header manually is faster/easier for this snippet.
        // Actually, let's use a helper or just spawn ffmpeg to save it? 
        // Easiest is writing a valid WAV header helper.
        const wavData = this.addWavHeader(fullBuffer, 16000, 1);
        fs_1.default.writeFileSync(filename, wavData);
        console.log(`Saved audio chunk: ${filename} (${(totalLength / 32000).toFixed(1)}s)`);
        this.emit('audio-chunk', filename);
    }
    addWavHeader(samples, sampleRate, channels) {
        const buffer = Buffer.alloc(44 + samples.length);
        // RIFF chunk descriptor
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + samples.length, 4);
        buffer.write('WAVE', 8);
        // fmt sub-chunk
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
        buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
        buffer.writeUInt16LE(channels, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * channels * 2, 28); // ByteRate
        buffer.writeUInt16LE(channels * 2, 32); // BlockAlign
        buffer.writeUInt16LE(16, 34); // BitsPerSample
        // data sub-chunk
        buffer.write('data', 36);
        buffer.writeUInt32LE(samples.length, 40);
        samples.copy(buffer, 44);
        return buffer;
    }
}
exports.StreamHandler = StreamHandler;
