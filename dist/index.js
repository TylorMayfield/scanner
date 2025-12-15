"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config/config");
const stream_handler_1 = require("./core/stream-handler");
const transcriber_1 = require("./core/transcriber");
const logger_1 = require("./core/logger");
console.log('Police Scanner CLI starting...');
console.log(`Stream URL: ${config_1.config.streamUrl}`);
console.log(`Models Path: ${config_1.config.whisperModelPath}`);
const main = async () => {
    const logger = new logger_1.Logger();
    const transcriber = new transcriber_1.Transcriber();
    const streamHandler = new stream_handler_1.StreamHandler();
    // Wire up events
    streamHandler.on('audio-chunk', (filePath) => {
        // console.log(`[Main] chunk received: ${path.basename(filePath)}`);
        transcriber.addToQueue(filePath);
    });
    streamHandler.on('disconnect', () => {
        console.log('[Main] Stream handler reported disconnect.');
        // Reconnect logic is handled internally by StreamHandler, 
        // but we could notify or log here.
        logger.log({ text: 'SYSTEM: Stream disconnected' });
    });
    transcriber.on('transcription', (data) => {
        logger.log(data);
    });
    // Start everything
    streamHandler.start();
    // Handle converting signals
    process.on('SIGINT', () => {
        console.log('Stopping...');
        process.exit(0);
    });
};
main().catch(err => console.error(err));
