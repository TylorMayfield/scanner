"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const modelsDir = path_1.default.join(process.cwd(), 'models');
const modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';
const modelPath = path_1.default.join(modelsDir, 'ggml-base.en.bin');
if (!fs_1.default.existsSync(modelsDir)) {
    fs_1.default.mkdirSync(modelsDir, { recursive: true });
}
if (fs_1.default.existsSync(modelPath)) {
    console.log('Model already exists at:', modelPath);
    process.exit(0);
}
console.log(`Downloading model from ${modelUrl}...`);
const download = (url, dest) => {
    https_1.default.get(url, (response) => {
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
        const file = fs_1.default.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('Model downloaded successfully.');
        });
    }).on('error', (err) => {
        fs_1.default.unlink(dest, () => { });
        console.error('Error downloading model:', err.message);
        process.exit(1);
    });
};
download(modelUrl, modelPath);
