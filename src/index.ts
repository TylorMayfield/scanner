import { config } from './config/config';
import { StreamHandler } from './core/stream-handler';
import { Transcriber } from './core/transcriber';
import { Logger } from './core/logger';
import path from 'path';

console.log('Police Scanner CLI starting...');
console.log(`Stream URL: ${config.streamUrl}`);
console.log(`Models Path: ${config.whisperModelPath}`);

const main = async () => {
    const logger = new Logger();
    const transcriber = new Transcriber();
    const streamHandler = new StreamHandler();

    // Wire up events
    streamHandler.on('audio-chunk', (filePath: string) => {
        // console.log(`[Main] chunk received: ${path.basename(filePath)}`);
        transcriber.addToQueue(filePath);
    });

    streamHandler.on('disconnect', () => {
        console.log('[Main] Stream handler reported disconnect.');
        // Reconnect logic is handled internally by StreamHandler, 
        // but we could notify or log here.
        logger.log({ text: 'SYSTEM: Stream disconnected' });
    });

    transcriber.on('transcription', (data: { text: string, audioFile: string, timestamp: number }) => {
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
