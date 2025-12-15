declare module 'whisper-node' {
    interface WhisperOptions {
        modelName?: string;
        whisperOptions?: any;
    }

    function whisper(filePath: string, options?: WhisperOptions): Promise<any>;
    export = whisper;
}
