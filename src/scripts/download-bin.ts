import fs from 'fs';
import path from 'path';
import https from 'https';
import os from 'os';
import { execSync } from 'child_process';

const binDir = path.join(process.cwd(), 'bin');
const platform = os.platform();

if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

const baseUrl = 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4';

const getUrl = () => {
    if (platform === 'win32') {
        return `${baseUrl}/whisper-bin-x64.zip`;
    } else {
        // For Linux/Docker, we might prefer building from source or finding a static binary.
        // But for simplicity in this script, let's assume we handle Linux via build in Dockerfile 
        // OR we can try to download a binary if available. 
        // The release usually contains a zip with main.exe for Windows.
        // For Linux, it's often better to just `make` in the docker container.
        return null;
    }
};

const url = getUrl();

if (!url && platform !== 'win32') {
    console.log('Not on Windows. Skipping binary download. Ensure "ffmpeg" and "main" (whisper) are in PATH or built manually.');
    process.exit(0);
}

if (!url) process.exit(0);

const destZip = path.join(binDir, 'whisper_bin.zip');
const exeName = platform === 'win32' ? 'main.exe' : 'main';
const finalExePath = path.join(binDir, exeName);

if (fs.existsSync(finalExePath)) {
    console.log('Whisper binary already exists.');
    process.exit(0);
}

const download = (url: string, dest: string) => {
    https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
            if (response.headers.location) {
                download(response.headers.location, dest);
                return;
            }
        }
        if (response.statusCode !== 200) {
            console.error(`Failed: ${response.statusCode}`);
            process.exit(1);
        }
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
            file.close((err) => {
                if (err) console.error('Error closing file:', err);
                console.log('Downloaded zip. Starting extraction...');
                // aggressive garbage collection or delay to ensure handle release on Windows
                setTimeout(() => extract(dest), 1000);
            });
        });
    }).on('error', err => {
        console.error(err);
        process.exit(1);
    });
};

const extract = (zipPath: string) => {
    console.log('Extracting...');
    try {
        // Using tar on Windows (tar -xf works in modern Windows 10/11 for zip too usually, or use 7z/powershell)
        // PowerShell Expand-Archive is safer
        if (platform === 'win32') {
            execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binDir}' -Force"`);
        } else {
            execSync(`unzip -o ${zipPath} -d ${binDir}`);
        }

        fs.unlinkSync(zipPath); // Cleanup zip
        console.log('Extraction complete.');
    } catch (e: any) {
        console.error('Extraction failed:', e.message);
    }
};

console.log(`Downloading Whisper binary from ${url}...`);
download(url, destZip);
