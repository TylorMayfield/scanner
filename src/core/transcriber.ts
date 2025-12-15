import fs from 'fs';
import { EventEmitter } from 'events';
import path from 'path';
import { spawn } from 'child_process';
import { config } from '../config/config';
import os from 'os';

export class Transcriber extends EventEmitter {
    private queue: string[] = [];
    private isProcessing: boolean = false;
    private binaryPath: string;

    constructor() {
        super();
        // Determine binary path
        const isWin = os.platform() === 'win32';
        // Look for 'main' or 'main.exe' in 'bin' folder, or fallback to global 'main'
        const localBin = path.join(process.cwd(), 'bin', isWin ? 'main.exe' : 'main');

        if (fs.existsSync(localBin)) {
            this.binaryPath = localBin;
        } else {
            this.binaryPath = 'whisper'; // Expect it in PATH if not found locally
        }

        console.log(`Using Whisper binary: ${this.binaryPath}`);
    }

    public addToQueue(filePath: string) {
        this.queue.push(filePath);
        this.processQueue();
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const filePath = this.queue.shift();

        if (filePath && fs.existsSync(filePath)) {
            try {
                // console.log(`Transcribing: ${path.basename(filePath)}...`);
                const text = await this.runWhisper(filePath);

                if (text && text.trim().length > 0) {
                    this.emit('transcription', {
                        text: text.trim(),
                        audioFile: filePath,
                        timestamp: Date.now()
                    });
                }
            } catch (err: any) {
                console.error(`Transcription error on ${filePath}:`, err.message || err);
            } finally {
                // Cleanup temp file
                try {
                    fs.unlinkSync(filePath);
                } catch (e) { }

                this.isProcessing = false;
                this.processQueue();
            }
        } else {
            this.isProcessing = false;
            this.processQueue();
        }
    }

    private runWhisper(audioPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // Command arguments for whisper.cpp
            // -m <model> -f <file> -nt (no timestamps)

            const args = [
                '-m', config.whisperModelPath,
                '-f', audioPath,
                '--no-timestamps',
                '-bs', config.whisperBeamSize.toString(),
                '-bo', config.whisperBestOf.toString(),
                '--output-txt',
                // Note: whisper.cpp args might vary by version. 
                // '-nt' is common shorthand for no timestamps. 
                // For safety we'll use long form if known, or parse output.
            ];

            console.log(`[Transcriber] Spawning: ${this.binaryPath} ${args.join(' ')}`);

            const child = spawn(this.binaryPath, args);

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    // Filter stdout to just get the text if possible.
                    resolve(this.cleanOutput(stdout));
                } else {
                    // Sometimes code 0 is returned but output is in stderr?
                    // whisper.cpp prints info to stderr. Text to stdout.
                    // If stdout is empty but code is 0, maybe silence?
                    if (stdout.length === 0) {
                        console.log("[Transcriber Warning] No stdout. Stderr:", stderr);
                    }
                    resolve(this.cleanOutput(stdout));
                }
            });

            child.on('error', (err) => {
                reject(err);
            });
        });
    }

    private cleanOutput(output: string): string {
        // Remove timestamps like [00:00:00.000 --> 00:00:05.000]
        let cleaned = output.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/g, '');
        // Remove individual timestamps if different format
        return cleaned.replace(/\s+/g, ' ').trim();
    }
}
