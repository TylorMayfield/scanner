import fs from 'fs';
import path from 'path';
import https from 'https';

const modelsDir = path.join(process.cwd(), 'models');
const modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';
const modelPath = path.join(modelsDir, 'ggml-base.en.bin');

if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

if (fs.existsSync(modelPath)) {
    console.log('Model already exists at:', modelPath);
    process.exit(0);
}

console.log(`Downloading model from ${modelUrl}...`);
const download = (url: string, dest: string) => {
    https.get(url, (response) => {
        // Handle Redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
            if (response.headers.location) {
                console.log(`Redirecting to ${response.headers.location}`);
                download(response.headers.location, dest);
                return;
            }
        }

        if (response.statusCode !== 200) {
            console.error(`Failed to download model: status code ${response.statusCode}`);
            process.exit(1);
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log('Model downloaded successfully.');
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => { });
        console.error('Error downloading model:', err.message);
        process.exit(1);
    });
};

download(modelUrl, modelPath);
