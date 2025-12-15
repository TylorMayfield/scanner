import { Transcriber } from '../core/transcriber';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const testDir = path.join(process.cwd(), 'test_data');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

const wavPath = path.join(testDir, 'test_beep.wav');

// Create a simple WAV file using ffmpeg (beep)
try {
    console.log('Generating test WAV file...');
    execSync(`ffmpeg -y -f lavfi -i "sine=frequency=1000:duration=2" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`, { stdio: 'ignore' });
} catch (e) {
    console.error('Failed to generate test WAV with ffmpeg. Is ffmpeg in PATH?');
    process.exit(1);
}

const run = async () => {
    console.log('Initializing Transcriber...');
    const transcriber = new Transcriber();

    console.log('Queueing test file...');

    // Listen for transcription
    transcriber.on('transcription', (data: { text: string }) => {
        console.log('✅ TEST PASSED: Transcription received!');
        console.log('Text:', data.text);
        process.exit(0);
    });

    transcriber.addToQueue(wavPath);

    // Timeout
    setTimeout(() => {
        console.error('❌ TEST FAILED: Timeout waiting for transcription.');
        process.exit(1);
    }, 10000);
};

run();
