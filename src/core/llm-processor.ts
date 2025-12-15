import axios from 'axios';
import { config } from '../config/config';

export interface ProcessedTranscription {
    original: string;
    cleaned: string;
    tags: string[];
    sentiment?: string;
}

export class LLMProcessor {
    private baseUrl: string;
    private model: string;

    constructor() {
        this.baseUrl = config.ollamaUrl;
        this.model = config.ollamaModel;
        console.log(`[LLM] Initialized. Connecting to ${this.baseUrl} using model ${this.model}`);
        this.ensureModel();
    }

    private async ensureModel() {
        try {
            // Check if model is loaded/available
            await axios.post(`${this.baseUrl}/api/show`, { name: this.model });
            console.log(`[LLM] Model ${this.model} is ready.`);
        } catch (e) {
            console.log(`[LLM] Model ${this.model} not found. Pulling... (this may take a while)`);
            try {
                // Trigger pull
                // Note: This is an async stream, we just kick it off.
                // For a real prod app we'd wait for it.
                await axios.post(`${this.baseUrl}/api/pull`, { name: this.model });
                console.log(`[LLM] Pull verification initiated for ${this.model}.`);
            } catch (pullErr: any) {
                console.error(`[LLM] Failed to pull model: ${pullErr.message}`);
            }
        }
    }

    public async process(text: string): Promise<ProcessedTranscription> {
        if (!text || text.trim().length === 0) {
            return { original: text, cleaned: text, tags: [] };
        }

        const prompt = `
You are a police radio transcription assistant. Your job is to format and tag the following raw text transcript.
Raw Text: "${text}"

Rules:
1. Fix capitalization and punctuation.
2. Remove hallucinated phrases (like "Thank you for watching").
3. Identify the type of communication (TAGS): "DISPATCH", "TRAFFIC_STOP", "EMS", "FIRE", "ARREST", "INFO", "ALERT", "ADVERTISEMENT" (if it sounds like a radio ad), "NOISE" (if unintelligible).
4. Return ONLY a JSON object with keys: "cleaned_text" (string) and "tags" (array of strings). Do not include markdown formatting.
`;

        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false,
                format: 'json'
            }, { timeout: 10000 }); // 10s timeout to avoid blocking too long

            if (response.data && response.data.response) {
                try {
                    const result = JSON.parse(response.data.response);
                    return {
                        original: text,
                        cleaned: result.cleaned_text || text,
                        tags: result.tags || []
                    };
                } catch (parseError) {
                    console.error('[LLM] Failed to parse JSON response:', response.data.response);
                }
            }
        } catch (error: any) {
            console.error(`[LLM] Processing failed: ${error.message}`);
        }

        // Fallback
        return { original: text, cleaned: text, tags: [] };
    }
}
